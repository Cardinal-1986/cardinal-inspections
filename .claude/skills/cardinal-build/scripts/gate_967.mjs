/* gate_967.mjs — a refused write is held, not thrown away (build 967).

   Drives the REAL CardinalOutbox in a REAL browser with a stubbed transport,
   so every assertion is about the shipped module, not a re-implementation.

     1  a server REFUSAL keeps the row (it used to be deleted)
     2  ...and the refusal is counted separately from what is still syncing
     3  the badge goes red and names the count
     4  the green "All changes synced" does NOT fire on a flush that dropped
     5  ...but a clean flush still earns it
     6  tapping the red chip opens the panel
     7  the panel names the record, the fields, and the server's reason
     8  Discard removes it
     9  Try again re-queues it (dead flag cleared)
    10  an EXPIRED TOKEN is retried, not buried
    11  a NETWORK error still just waits — the row stays live, never dead
    12  a held refusal is not re-sent on the next tick, and does not overlay reads

   Usage: node gate_967.mjs [path] — previous build = negative control; must go
   RED with named failures and MUST NOT crash (BUG_CLASSES 37). */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium; for (const p of ['playwright','/opt/node22/lib/node_modules/playwright/index.js']){try{chromium=require(p).chromium;break;}catch(e){}}
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
const HERE=dirname(fileURLToPath(import.meta.url));
const FILE=process.argv[2]||join(HERE,'../../../../index.html');
const LABEL=process.argv[3]||'SHIPPED';
const APP=readFileSync(FILE,'utf8');
const SETUP=readFileSync(join(HERE,'sentinel_setup_cardinal.js'),'utf8')+'\n;\n'+readFileSync(join(HERE,'e2e_mock_supa.js'),'utf8');

let fails=[], passes=0;
function need(name, ok, detail){ if(ok){passes++;} else fails.push(name+(detail?' — '+detail:'')); }

const browser=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:390,height:844}});
await page.route('**/*', async r=>{const u=r.request().url();
  if(u.startsWith('https://sentinel.test/')) return r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:APP});
  if(/\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(u)) return r.fulfill({status:200,contentType:'image/png',
    body:Buffer.from('iVBORw0KGgoAAAABAAAAAQAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==','base64')});
  return r.fulfill({status:200,body:''});});
await page.addInitScript(SETUP);
const watchdog=setTimeout(()=>{ console.log('GATE TIMEOUT'); process.exit(1); },120000);
await page.goto('https://sentinel.test/?as=theo',{waitUntil:'domcontentloaded'});
await page.waitForTimeout(1800);

/* Install a transport we control. Every assertion below is about what the
   shipped module DOES with the answer, so the answer has to be scriptable. */
await page.evaluate(()=>{
  window.__MODE__ = 'ok';                       /* ok | refuse | auth | net */
  window.__TRIES__ = 0;
  const err = () => {
    if(window.__MODE__==='refuse') return { code:'42501', message:'new row violates row-level security policy for table "punch_items"' };
    if(window.__MODE__==='auth')   return { code:'PGRST301', message:'JWT expired' };
    if(window.__MODE__==='net')    return { message:'Load failed' };
    return null;
  };
  const q = () => {
    const o = {};
    ['update','upsert','insert','eq','select','match','order','limit'].forEach(k=>{ o[k]=()=>o; });
    o.then = (res,rej)=>{ window.__TRIES__++; return Promise.resolve({ data:null, error:err() }).then(res,rej); };
    return o;
  };
  const realFrom = window.sb.from.bind(window.sb);
  window.sb.from = (t) => (t==='punch_items' ? q() : realFrom(t));
});

const has = await page.evaluate(()=> !!(window.CardinalOutbox && window.CardinalOutbox.queue));
if(!has){ need('CardinalOutbox present', false, 'module missing — cannot drive anything'); }

/* helper: run a scenario without ever throwing into the harness */
async function scenario(mode, patch){
  return await page.evaluate(async ({mode, patch})=>{
    const out = { err:null };
    try{
      const O = window.CardinalOutbox;
      if(O.clear) await O.clear(); await new Promise(r=>setTimeout(r,120));
      window.__MODE__ = mode; window.__TRIES__ = 0;
      await O.queue({ table:'punch_items', match:{ col:'id', val:'i1' }, patch:patch });
      await O.flush(); await new Promise(r=>setTimeout(r,400));
      out.tries   = window.__TRIES__;
      out.counts  = (typeof O.counts === 'function') ? await O.counts() : null;
      out.pending = (typeof O.pending === 'function') ? await O.pending() : null;
      out.stuck   = (typeof O.stuck === 'function') ? (await O.stuck()) : null;
      const b = document.getElementById('cr-outbox-badge');
      out.badgeText = b ? (b.textContent||'').trim() : null;
      out.badgeBg   = b ? getComputedStyle(b).backgroundColor : null;
      out.badgeShown= b ? getComputedStyle(b).display !== 'none' : false;
    }catch(e){ out.err = String(e && e.message || e); }
    return out;
  }, {mode, patch});
}

/* ---- 1,2,3,4: a refusal is held, counted, and painted red ---- */
const refused = await scenario('refuse', { status:'done', done_by:'theo@cardinalrenovations.net' });
need('1 refusal keeps the row', refused.stuck !== null && refused.stuck.length === 1,
     refused.err ? ('threw: '+refused.err) : ('stuck=' + JSON.stringify(refused.stuck && refused.stuck.length)));
need('2 refusal counted apart from live', refused.counts && refused.counts.dead === 1 && refused.counts.live === 0,
     'counts=' + JSON.stringify(refused.counts));
need('3 badge red and names the count',
     !!(refused.badgeShown && /could not sync/i.test(refused.badgeText||'') && /^rgb\(58, 15, 18\)$/.test(refused.badgeBg||'')),
     'text=' + JSON.stringify(refused.badgeText) + ' bg=' + refused.badgeBg);
need('4 no green "All changes synced" after a drop', !/all changes synced/i.test(refused.badgeText||''),
     'text=' + JSON.stringify(refused.badgeText));

/* ---- 7,6,8,9: the panel ---- */
const panel = await page.evaluate(async ()=>{
  const out = { err:null };
  try{
    const b = document.getElementById('cr-outbox-badge');
    if(b) b.click();
    await new Promise(r=>setTimeout(r,350));
    const p = document.getElementById('cr-outbox-stuck');
    out.open = !!(p && p.parentNode);
    out.text = p ? (p.textContent||'') : '';
    const btns = p ? Array.from(p.querySelectorAll('button')).map(x=>(x.textContent||'').trim()) : [];
    out.btns = btns;
    /* every control on a screen you tap with a glove */
    out.small = p ? Array.from(p.querySelectorAll('button')).filter(x=>x.getBoundingClientRect().height < 44).map(x=>(x.textContent||'').trim()) : [];
    /* Discard: confirm() must be auto-accepted */
    window.confirm = () => true;
    const dis = p ? Array.from(p.querySelectorAll('button')).find(x=>/discard/i.test(x.textContent||'')) : null;
    if(dis) dis.click();
    await new Promise(r=>setTimeout(r,400));
    const O = window.CardinalOutbox;
    out.afterDiscard = (typeof O.counts==='function') ? await O.counts() : null;
  }catch(e){ out.err = String(e && e.message || e); }
  return out;
});
need('6 tapping the red chip opens the panel', panel.open === true, panel.err ? ('threw: '+panel.err) : 'not opened');
need('7 panel names record, fields and the server reason',
     /Punch-out/.test(panel.text) && /Changed:/.test(panel.text) && /row-level security/i.test(panel.text),
     JSON.stringify((panel.text||'').slice(0,160)));
need('7b panel offers Try again and Discard',
     panel.btns.some(b=>/try again/i.test(b)) && panel.btns.some(b=>/discard/i.test(b)),
     JSON.stringify(panel.btns));
need('7c panel controls meet the 44px floor', Array.isArray(panel.small) && panel.small.length === 0,
     'under-floor: ' + JSON.stringify(panel.small));
need('8 Discard removes the held change', panel.afterDiscard && panel.afterDiscard.dead === 0,
     JSON.stringify(panel.afterDiscard));

/* 9: Try again clears the dead flag and re-sends when the server accepts */
const retried = await page.evaluate(async ()=>{
  const out={err:null};
  try{
    const O = window.CardinalOutbox;
    if(O.clear) await O.clear(); await new Promise(r=>setTimeout(r,120));
    window.__MODE__='refuse';
    await O.queue({ table:'punch_items', match:{col:'id',val:'i1'}, patch:{ status:'done' } });
    await O.flush(); await new Promise(r=>setTimeout(r,400));
    const before = (typeof O.counts==='function') ? await O.counts() : null;
    if(O.openStuck) O.openStuck();
    await new Promise(r=>setTimeout(r,300));
    window.__MODE__='ok';                       /* the reason is fixed */
    const p = document.getElementById('cr-outbox-stuck');
    const again = p ? Array.from(p.querySelectorAll('button')).find(x=>/try again/i.test(x.textContent||'')) : null;
    if(again) again.click();
    await new Promise(r=>setTimeout(r,700));
    out.before = before;
    out.after  = (typeof O.counts==='function') ? await O.counts() : null;
  }catch(e){ out.err=String(e&&e.message||e); }
  return out;
});
need('9 Try again re-sends once the reason is fixed',
     retried.before && retried.before.dead === 1 && retried.after && retried.after.dead === 0 && retried.after.live === 0,
     retried.err ? ('threw: '+retried.err) : ('before=' + JSON.stringify(retried.before) + ' after=' + JSON.stringify(retried.after)));

/* ---- 10: an expired token is retried, not buried ---- */
const authCase = await page.evaluate(async ()=>{
  const out={err:null};
  try{
    const O=window.CardinalOutbox;
    if(O.clear) await O.clear(); await new Promise(r=>setTimeout(r,120));
    window.__MODE__='auth'; window.__TRIES__=0;
    await O.queue({ table:'punch_items', match:{col:'id',val:'i1'}, patch:{ status:'open' } });
    await O.flush(); await new Promise(r=>setTimeout(r,400));
    out.tries=window.__TRIES__;
    out.counts=(typeof O.counts==='function')?await O.counts():null;
  }catch(e){ out.err=String(e&&e.message||e); }
  return out;
});
need('10 an expired token is retried before it counts as a refusal',
     authCase.tries >= 2, authCase.err ? ('threw: '+authCase.err) : ('tries=' + authCase.tries));

/* ---- 11: a network error still just waits ---- */
const netCase = await scenario('net', { status:'open' });
need('11 a network error keeps the row LIVE, never dead',
     netCase.counts && netCase.counts.live === 1 && netCase.counts.dead === 0,
     'counts=' + JSON.stringify(netCase.counts));

/* ---- 12: a held refusal is not retried on the next tick, nor overlaid on reads ---- */
const quiet = await page.evaluate(async ()=>{
  const out={err:null};
  try{
    const O=window.CardinalOutbox;
    if(O.clear) await O.clear(); await new Promise(r=>setTimeout(r,120));
    window.__MODE__='refuse';
    await O.queue({ table:'punch_items', match:{col:'id',val:'i1'}, patch:{ status:'done' } });
    await O.flush(); await new Promise(r=>setTimeout(r,400));
    const t1=window.__TRIES__;
    window.__TRIES__=0;
    await O.flush(); await new Promise(r=>setTimeout(r,400));                      /* the 30s tick */
    out.triesOnSecondFlush=window.__TRIES__;
    out.firstTries=t1;
    out.overlay=(typeof O.patchesFor==='function') ? (await O.patchesFor('punch_items')).length : null;
  }catch(e){ out.err=String(e&&e.message||e); }
  return out;
});
need('12 a held refusal is not re-sent on the next tick',
     quiet.triesOnSecondFlush === 0, quiet.err ? ('threw: '+quiet.err) : ('tries=' + quiet.triesOnSecondFlush));
need('12b a held refusal does not overlay a fresh read',
     quiet.overlay === 0, 'patchesFor len=' + quiet.overlay);

/* ---- 5: a clean flush still earns the green ---- */
const clean = await page.evaluate(async ()=>{
  const out={err:null};
  try{
    const O=window.CardinalOutbox;
    if(O.clear) await O.clear(); await new Promise(r=>setTimeout(r,120));
    window.__MODE__='ok';
    await O.queue({ table:'punch_items', match:{col:'id',val:'i1'}, patch:{ status:'done' } });
    await O.flush(); await new Promise(r=>setTimeout(r,400));
    await new Promise(r=>setTimeout(r,250));
    const b=document.getElementById('cr-outbox-badge');
    out.text=b?(b.textContent||'').trim():null;
    out.shown=b?getComputedStyle(b).display!=='none':false;
  }catch(e){ out.err=String(e&&e.message||e); }
  return out;
});
need('5 a clean flush still says "All changes synced"',
     clean.shown && /all changes synced/i.test(clean.text||''),
     clean.err ? ('threw: '+clean.err) : ('text=' + JSON.stringify(clean.text)));

clearTimeout(watchdog);
await browser.close();
console.log('\ngate_967 [' + LABEL + ']  pass ' + passes + '  fail ' + fails.length);
fails.forEach(f=>console.log('  FAIL ' + f));
console.log(fails.length ? 'RED' : 'GREEN');
process.exit(fails.length ? 1 : 0);
