/* gate_1252.mjs — only Theo, Joan and Curtis assign or close punch work.
   Real Chromium against the seeded mock; i4 is Scottie's, given five photos so
   it is ready to close.
     A  window.isPunchBoss is true for theo/joan/curtis, false for scottie/nick
     B  as SCOTTIE: the queue has no Assign button; the home strip's tick is locked
     C  as SCOTTIE on his ready card: no Assign dropdown; the button reads
        "Tell Curtis it's finished"; tapping it writes a message (no status)
        and buzzes Curtis and Theo
     D  as SCOTTIE on a closed card (i2): no Reopen button
     E  as SCOTTIE in "+ New": no Assign-to dropdown ("Curtis assigns it"); the
        Kind list says Repair, not Ticket
     F  as CURTIS: the queue's Assign button, the card's Close button and the
        composer's Assign-to dropdown are all there
   usage: node gate_1252.mjs [file.html] — RED on 1251, never a crash
*/
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium; for (const p of ['playwright','/opt/node22/lib/node_modules/playwright/index.js']){try{chromium=require(p).chromium;break;}catch(e){}}
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
const HERE=dirname(fileURLToPath(import.meta.url));
const FILE=process.argv[2]||join(HERE,'../../../../index.html');
const APP=readFileSync(FILE,'utf8');
const SETUP=readFileSync(join(HERE,'sentinel_setup_cardinal.js'),'utf8')+'\n;\n'+readFileSync(join(HERE,'e2e_mock_supa.js'),'utf8');
let fails=[], passes=0;
function need(name, ok, detail){ if(ok){passes++; console.log('  PASS  '+name);} else { fails.push(name); console.log('  FAIL  '+name+(detail!==undefined?'  → '+detail:'')); } }
setTimeout(()=>{ console.log('GATE TIMEOUT'); process.exit(3); }, 240000).unref();
const browser=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
async function boot(as){
  const page=await browser.newPage({viewport:{width:390,height:844}});
  await page.route('**/*', async r=>{const u=r.request().url();
    if(u.startsWith('https://sentinel.test/')) return r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:APP});
    return r.fulfill({status:200,body:''});});
  await page.addInitScript(SETUP);
  await page.addInitScript(()=>{ const S=(window.__SEED__||{}).punch_items; if(!S) return;
    const it=S.find(x=>x.id==='i4'); if(it){ it.photos=[1,2,3,4,5].map(n=>({u:'https://x.test/p'+n+'.jpg',by:'scottie@cardinalrenovations.net',at:new Date().toISOString()})); it.steps=[]; } });
  await page.goto('https://sentinel.test/?as='+as,{waitUntil:'domcontentloaded'});
  await page.waitForTimeout(1700);
  await page.evaluate(async ()=>{
    ['landingView','loginView'].forEach(id=>{const e=document.getElementById(id); if(e){e.style.display='none';}});
    window.__NTF=[]; window.__TELL=[];
    window.notifyTeam=async function(to,s){ window.__NTF.push({to:to,s:s}); return {ok:true,sent:1,subs:1}; };
    window.crTell=function(m){ window.__TELL.push(String(m)); };
    if(window.CardinalPunch&&window.CardinalPunch.reload) await window.CardinalPunch.reload();
  });
  return page;
}
const writes=p=>p.evaluate(()=>(window.__WRITES__||[]).filter(x=>x.table==='punch_items'&&x.op!=='select'&&x.payload).map(x=>x.payload));
const openCard=async (p,id)=>{ await p.evaluate(id=>window.CardinalPunchCard&&window.CardinalPunchCard.open(id),id); await p.waitForTimeout(600); };
const closeCard=p=>p.evaluate(()=>window.CardinalPunchCard&&window.CardinalPunchCard.close&&window.CardinalPunchCard.close(false));
const composer=async p=>{ await p.evaluate(()=>{ const P=window.CardinalProduction; if(P&&P.newPunch) P.newPunch(null); }); await p.waitForTimeout(700);
  return p.evaluate(()=>{ const m=[...document.querySelectorAll('[data-f="title"]')].map(e=>e.closest('.sheet')||e.parentElement).filter(Boolean)[0];
    if(!m) return null; return { sel:!!m.querySelector('[data-f="assigned"]'), txt:m.textContent, kinds:[...m.querySelectorAll('[data-f="kind"] option')].map(o=>o.textContent).join(',') }; }); };

/* A */
const p0=await boot('theo');
const roles=await p0.evaluate(()=>{ const out={}; const real=window.currentUser;
  for(const e of ['theo','joan','curtis','scottie','nick']){ window.currentUser=Object.assign({},real||{},{email:e+'@cardinalrenovations.net'}); out[e]=typeof window.isPunchBoss==='function'?window.isPunchBoss():null; }
  window.currentUser=real; return out; });
need('A  bosses are theo, joan, curtis — not scottie or nick', roles.theo===true&&roles.joan===true&&roles.curtis===true&&roles.scottie===false&&roles.nick===false, JSON.stringify(roles));
await p0.close();

/* B–E as Scottie */
const s=await boot('scottie');
await s.evaluate(()=>window.openPunchView&&window.openPunchView()); await s.waitForTimeout(800);
need('B  Scottie: the queue has no Assign button', await s.evaluate(()=>!!document.querySelector('#puQueue .pu-card')&&!document.querySelector('#puQueue [data-puassign-open]')));
const strip=await s.evaluate(()=>{ const d=document.createElement('div'); d.innerHTML=window.CardinalPunchStrip?window.CardinalPunchStrip.html('retail'):''; const b=d.querySelector('[data-putoggle]'); return b?b.classList.contains('locked'):'none'; });
need('B  Scottie: the home strip tick is locked', strip===true, String(strip));
await openCard(s,'i4');
const c=await s.evaluate(()=>{ const b=document.querySelector('#cr-pk .pkclose'); return { sel:!!document.querySelector('#cr-pk [data-f="assigned"]'), act:b?b.getAttribute('data-act'):null, txt:b?b.textContent:'' }; });
need('C  Scottie: no Assign dropdown on the card', !c.sel);
need('C  Scottie: the ready card says "Tell Curtis it’s finished"', c.act==='askclose' && /Tell Curtis/.test(c.txt), JSON.stringify(c));
await s.evaluate(()=>{ window.__WRITES__=[]; window.__NTF=[]; });
await s.evaluate(()=>{ const b=document.querySelector('#cr-pk [data-act="askclose"]'); if(b) b.click(); }); await s.waitForTimeout(700);
const w=await writes(s), last=w[w.length-1]||{};
need('C  it writes a message, never a status', w.length>=1 && w.every(x=>!('status' in x)) && Array.isArray(last.comments) && /ready for Curtis to close/.test((last.comments.slice(-1)[0]||{}).text||''), JSON.stringify(w).slice(0,200));
const to=((await s.evaluate(()=>window.__NTF))[0]||{}).to||[];
need('C  Curtis and Theo are buzzed', to.includes('curtis@cardinalrenovations.net') && to.includes('theo@cardinalrenovations.net'), JSON.stringify(to));
await closeCard(s); await openCard(s,'i2');
need('D  Scottie: no Reopen on a closed card', await s.evaluate(()=>!document.querySelector('#cr-pk [data-act="reopen"]') && /Closed/.test((document.querySelector('#cr-pk .pkclose')||{}).textContent||'')));
await closeCard(s);
const sc=await composer(s);
need('E  Scottie: "+ New" has no Assign-to dropdown', sc && !sc.sel && /Curtis assigns it/.test(sc.txt), JSON.stringify(sc&&{sel:sc.sel}));
need('E  the Kind list says Repair, not Ticket', sc && /Repair/.test(sc.kinds) && !/Ticket/.test(sc.kinds), sc&&sc.kinds);
await s.close();

/* F as Curtis */
const k=await boot('curtis');
await k.evaluate(()=>window.openPunchView&&window.openPunchView()); await k.waitForTimeout(800);
need('F  Curtis: the queue has the Assign button', await k.evaluate(()=>!!document.querySelector('#puQueue [data-puassign-open]')));
await openCard(k,'i4');
need('F  Curtis: the card has Close', await k.evaluate(()=>(document.querySelector('#cr-pk .pkclose')||{}).getAttribute?.('data-act')==='close'));
await closeCard(k);
const kc=await composer(k);
need('F  Curtis: "+ New" has the Assign-to dropdown', kc && kc.sel, JSON.stringify(kc&&{sel:kc.sel}));
await k.close();

await browser.close();
console.log((fails.length?'GATE 1252 RED':'GATE 1252 GREEN')+' — '+passes+' passed, '+fails.length+' failed');
process.exit(fails.length?1:0);
