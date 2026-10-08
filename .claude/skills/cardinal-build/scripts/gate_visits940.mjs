/* Gate for 940 — check in / check out. Optional path arg = negative control.
   Drives the REAL punch card as Scottie and reads the writes the app actually
   makes, not a re-implementation.
   ⚠ 1261: this gate had been RED since crAsk (the app's own question sheet,
   #crAsk) replaced window.confirm — it answered with page.on('dialog'), which
   never fires, so check-out never finished and its "saying NO" check passed
   only because a SECOND ask is refused while one is open. It now answers the
   sheet itself. And at 1261 the check-out contract changed on purpose: only
   Theo, Joan and Curtis schedule, so Scottie is asked "Tell Curtis it needs
   another day?" and his yes leaves a message, never a date. Curtis's "Back on
   this tomorrow?" (and the never-a-Sunday rule) is gate_1261 E. */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium; for (const p of ['playwright','/opt/node22/lib/node_modules/playwright/index.js']){try{chromium=require(p).chromium;break;}catch(e){}}
import { readFileSync } from 'fs';
const S='/home/user/cardinal-inspections/.claude/skills/cardinal-build/scripts/';
const APP_PATH=process.argv[2]||'/home/user/cardinal-inspections/index.html';
const LABEL=process.argv[3]||(/v9\d\d/.test(APP_PATH)?'CONTROL':'SHIPPED');
const APP=readFileSync(APP_PATH,'utf8');
const SETUP=readFileSync(S+'sentinel_setup_cardinal.js','utf8')+'\n;\n'+readFileSync(S+'e2e_mock_supa.js','utf8');
let fails=0; const ok=(c,m)=>{ if(!c){fails++;console.log('  ✗ '+m);} else console.log('  ✓ '+m); };
/* ⚠ BUG_CLASSES 37 — the control has no buttons, so every click is a null
   dereference. A crash reads as "not green" while proving nothing. */
async function tap(page, act){
  const hit = await page.evaluate(a=>{
    const b=document.querySelector('#cr-pk [data-act="'+a+'"]'); if(!b) return false;
    b.click(); return true; }, act).catch(()=>false);
  if(!hit){ fails++; console.log('  ✗ no [data-act="'+act+'"] control on this build to tap'); }
  return hit;
}
const state = page => page.evaluate(()=>{
  const w=(window.__WRITES__||[]).filter(x=>x.table==='punch_items');
  const last=w[w.length-1]||null;
  const el=document.getElementById('cr-pk');
  const strip=el&&el.querySelector('.pkvis');
  return { writes:w.length, patch:last?last.payload:null,
           strip: !!strip, stripText: strip?strip.textContent.trim().slice(0,70):null,
           hasIn: !!(el&&el.querySelector('[data-act="cin"]')),
           hasOut:!!(el&&el.querySelector('[data-act="cout"]')),
           dayChip: (()=>{const c=el&&el.querySelector('.pkchip.day2'); return c?c.textContent.trim():null;})() };
});

const browser=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
const ctx=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,hasTouch:true,isMobile:true});
const page=await ctx.newPage();
await page.route('**/*', async r=>{const u=r.request().url();
  if(u.startsWith('https://sentinel.test/')) return r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:APP});
  if(/\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(u)) return r.fulfill({status:200,contentType:'image/png',
    body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==','base64')});
  return r.fulfill({status:200,body:''});});
await page.addInitScript(SETUP);
page.on('dialog', async d => { await d.accept(); });     /* only if crAsk falls back to confirm() */
/* crAsk is #crAsk.open — answer it there, and report what it asked */
async function answer(yes){
  for(let i=0;i<40;i++){
    const q=await page.evaluate(()=>{ const n=document.querySelector('#crAsk.open'); if(!n) return null;
      return ((n.querySelector('.askq')||{}).textContent||'')+' '+((n.querySelector('.askwhy')||{}).textContent||''); }).catch(()=>null);
    if(q){ await page.evaluate(y=>{ const b=document.querySelector('#crAsk.open '+(y?'.askgo':'.askno')); if(b) b.click(); }, yes); return q.trim(); }
    await page.waitForTimeout(100);
  }
  return null;
}
await page.goto('https://sentinel.test/?as=scottie',{waitUntil:'domcontentloaded'});
await page.waitForTimeout(1600);

console.log('\n=== check in / check out ('+LABEL+') — '+APP_PATH+' ===');
const opened = await page.evaluate(()=>{
  ['landingView','loginView'].forEach(id=>{const e=document.getElementById(id); if(e){e.style.display='none';e.classList&&e.classList.remove('open');}});
  if(!window.CardinalPunchCard||!window.CardinalPunchCard.open) return null;
  window.CardinalPunchCard.open('i1'); return 'i1';
});
await page.waitForTimeout(700);
ok(!!opened, 'the punch card opens ('+opened+')');

const a=await state(page);
ok(a.strip, 'the check-in strip renders on the card');
ok(a.hasIn && !a.hasOut, 'it offers Check IN and not Check out to start — "'+a.stripText+'"');

if(await tap(page,'cin')){
  await page.waitForTimeout(500);
  const b=await state(page);
  const v=b.patch&&b.patch.visits;
  ok(Array.isArray(v)&&v.length===1, 'checking in writes exactly one visit ('+(v?v.length:'none')+')');
  ok(v&&v[0].in&&v[0].out===null, 'with an arrival time and out still null — still on site');
  ok(v&&/^\d{4}-\d{2}-\d{2}$/.test(v[0].day||''), 'and a LOCAL day key, not a UTC slice ('+(v?v[0].day:'')+')');
  ok(v&&v[0].by==='scottie@cardinalrenovations.net', 'stamped with who ('+(v?v[0].by:'')+')');
  ok(b.hasOut&&!b.hasIn, 'and the control flips to Check out — "'+b.stripText+'"');
  /* tapping check-in twice must NOT open a second visit */
  const before=b.writes;
  await page.evaluate(()=>{ const el=document.getElementById('cr-pk');
    const btn=el&&el.querySelector('[data-act="cin"]'); if(btn) btn.click(); });
  await page.waitForTimeout(350);
  const c=await state(page);
  ok(c.writes===before, 'a second check-in while already on site writes nothing ('+before+' -> '+c.writes+')');
}

if(await tap(page,'cout')){
  const asked=await answer(true);
  await page.waitForTimeout(600);
  const d=await state(page);
  const v=d.patch&&d.patch.visits;
  const last=d.patch&&Array.isArray(d.patch.comments)?d.patch.comments[d.patch.comments.length-1]:null;
  ok(/Tell Curtis it needs another day\?/.test(asked||''), 'checking out of unfinished work asks "Tell Curtis it needs another day?" ('+asked+')');
  ok(v&&v[0].out, 'checking out closes the visit');
  ok(d.patch && !('scheduled_at' in d.patch),
     'and Scottie\u2019s yes moves NO date — only Theo, Joan and Curtis schedule (patch keys: '+(d.patch?Object.keys(d.patch).join(','):'none')+')');
  ok(last && last.flag==='needday', 'it leaves a "needs another day" message on the job instead ('+(last?last.text:'none')+')');
  ok(d.hasIn&&!d.hasOut, 'and it offers Check in again — "'+d.stripText+'"');
}

/* declining must leave the date alone — the whole point of asking */
page.removeAllListeners('dialog');
page.on('dialog', async dl => { await dl.dismiss(); });
const before2 = await page.evaluate(()=>{
  const w=(window.__WRITES__||[]).filter(x=>x.table==='punch_items');
  return w.length; });
if(await tap(page,'cin')){ await page.waitForTimeout(400); }
if(await tap(page,'cout')){
  await answer(false);
  await page.waitForTimeout(600);
  const e=await state(page);
  ok(e.patch && Object.keys(e.patch).join(',')==='visits',
     'saying NOT NOW writes the closed visit and nothing else (patch keys: '+(e.patch?Object.keys(e.patch).join(','):'none')+')');
  /* ⚠ This assertion was written BACKWARDS on the first run and failed correct
     code: it demanded a "Day 2" chip after two check-ins on the SAME day. One
     day worked twice is one day — counting distinct LOCAL days rather than
     visits is the entire reason dayCount() exists, and a man who nips out for
     materials and comes back has not been there two days. */
  ok(e.dayChip===null && /1 day on site/.test(e.stripText||''),
     'two check-ins on ONE day still read as one day, and raise no Day-2 flag (chip: '+e.dayChip+', strip: "'+e.stripText+'")');
}

await ctx.close(); await browser.close();
console.log(fails?('\nRED — '+fails+' failed'):'\nGREEN — the visit loop works, and the crew\u2019s check-out never moves the date');
process.exit(fails?1:0);
