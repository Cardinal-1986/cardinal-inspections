/* gate_945.mjs — Punch & Repairs becomes The Line (build 945).
   Drives the REAL page against the seeded mock (i3 queue / i4 assigned /
   i5 active-on-site / i1 scheduled / i2 closed) and asserts:
     1. the pinned queue renders the unassigned item with an Assign button
     2. the four tabs exist and their counts match the buckets
     3. the ACTIVE tab carries the check-in truth (ON SITE chip from i5's
        open visit, stamped with today's LOCAL day key)
     4. the ASSIGNED tab shows No-day-set
     5. the Assign flow END TO END: sheet opens, person picked (load shown),
        day picked, Go writes assigned_to + scheduled_at through the mock
        (window.__WRITES__) and notifies EXACTLY ONCE through notifyTeam
     6. the queue shrinks after the assign (render happened)
     7. the map contract holds (#puList .pu-card[data-pu]) and the one-tap
        tick (data-putoggle) is untouched
     8. every new control meets the build-944 44px floor
   Usage: node gate_945.mjs [path]   — point at the previous build for the
   negative control; failures are NAMED, never crashes (BUG_CLASSES 37). */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium; for (const p of ['playwright','/opt/node22/lib/node_modules/playwright/index.js']){try{chromium=require(p).chromium;break;}catch(e){}}
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
const HERE=dirname(fileURLToPath(import.meta.url));
const FILE=process.argv[2]||join(HERE,'../../../../index.html');
const LABEL=process.argv[3]||(/v9\d\d/.test(FILE)?'CONTROL':'SHIPPED');
const APP=readFileSync(FILE,'utf8');
const SETUP=readFileSync(join(HERE,'sentinel_setup_cardinal.js'),'utf8')+'\n;\n'+readFileSync(join(HERE,'e2e_mock_supa.js'),'utf8');

const browser=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:390,height:844}});
await page.route('**/*', async r=>{const u=r.request().url();
  if(u.startsWith('https://sentinel.test/')) return r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:APP});
  if(/\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(u)) return r.fulfill({status:200,contentType:'image/png',
    body:Buffer.from('iVBORw0KGgoAAAABAAAAAQAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==','base64')});
  return r.fulfill({status:200,body:''});});
await page.addInitScript(SETUP);
/* ⚠ RIG REPAIR 29 Aug 2026 (triage at build 1121): the shared seed pins i1's
   scheduled_at to the LITERAL '2026-08-27' — future when 945 shipped (20 Aug),
   past nine days later, so i1 drifted from SCHEDULED into ACTIVE and a correct
   app failed a correct assertion (active=2, scheduled=0). The seed's own crews
   rows already COMPUTE their dates for exactly this reason. Recompute i1's day
   to +3 here rather than editing the shared seed; the contract — a future-
   dated, assigned item buckets as SCHEDULED — is unchanged. */
await page.addInitScript(()=>{
  const it=((window.__SEED__||{}).punch_items||[]).find(x=>x.id==='i1');
  if(it){ const d=new Date(); d.setDate(d.getDate()+3);
    it.scheduled_at=d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2); }
});
await page.goto('https://sentinel.test/?as=theo',{waitUntil:'domcontentloaded'});
await page.waitForTimeout(1700);

let fails=[], passes=0;
function need(name, ok, detail){ if(ok){passes++;} else fails.push(name+(detail?' — '+detail:'')); }
async function tap(sel, why){
  const el=await page.$(sel);
  if(!el){ fails.push('no '+sel+' to tap ('+why+')'); return false; }
  await el.click().catch(e=>fails.push('tap failed on '+sel+': '+e.message.slice(0,50)));
  return true;
}

await page.evaluate(()=>{
  ['landingView','loginView'].forEach(id=>{const e=document.getElementById(id); if(e){e.style.display='none';}});
  window.__NTF=[];
  const real=window.notifyTeam;
  window.notifyTeam=async function(to,s,b){ window.__NTF.push({to:to,s:s}); return {ok:true,sent:1,subs:1}; };
  if(typeof window.openPunchView==='function') window.openPunchView();
});
await page.waitForTimeout(900);

/* 1 — the pinned queue */
const q=await page.evaluate(()=>{
  const cards=[...document.querySelectorAll('#puQueue .pu-card')];
  return { n:cards.length,
           first:cards[0]?(cards[0].querySelector('.pu-qt')||{}).textContent||'':'',
           btn:!!document.querySelector('#puQueue [data-puassign-open]'),
           age:(document.querySelector('#puQueue .pu-age')||{}).textContent||'' };
});
need('queue renders the unassigned item', q.n>=1, 'cards='+q.n);
need('queue is oldest-first (i3 Downspout leads)', /Downspout/.test(q.first), 'first="'+q.first+'"');
need('queue card carries an Assign button', q.btn);
need('queue card states its age', /waiting \d+ day/.test(q.age), '"'+q.age+'"');

/* 2 — four tabs with bucket counts */
const tabs=await page.evaluate(()=>{
  const t=[...document.querySelectorAll('#puTabs [data-putab]')].map(b=>b.getAttribute('data-putab'));
  const n=id=>parseInt((document.getElementById(id)||{}).textContent||'-1',10);
  return { t, act:n('puNActive'), asg:n('puNAssigned'), sch:n('puNSched'), dn:n('puNDone') };
});
need('four tabs incl. assigned', tabs.t.join(',')==='active,assigned,scheduled,completed', tabs.t.join(','));
need('active count = 1 (i5)', tabs.act===1, 'got '+tabs.act);
need('assigned count = 1 (i4)', tabs.asg===1, 'got '+tabs.asg);
need('scheduled count = 1 (i1 future)', tabs.sch===1, 'got '+tabs.sch);
need('closed count = 1 (i2)', tabs.dn===1, 'got '+tabs.dn);

/* 3 — check-in truth on ACTIVE */
const act=await page.evaluate(()=>({
  onsite:(document.querySelector('#puList .pu-st.on')||{}).textContent||'',
  tick:!!document.querySelector('#puList [data-putoggle]'),
  mapcard:!!document.querySelector('#puList .pu-card[data-pu]') }));
need('ACTIVE shows ON SITE since (i5 open visit, local day)', /On site since/.test(act.onsite), '"'+act.onsite+'"');
need('one-tap tick untouched (data-putoggle)', act.tick);
need('map contract holds (#puList .pu-card[data-pu])', act.mapcard);

/* 4 — ASSIGNED tab */
await tap('#puTabs [data-putab="assigned"]','switch to assigned');
await page.waitForTimeout(300);
const asg=await page.evaluate(()=>({
  noday:(document.querySelector('#puList .pu-st.idle')||{}).textContent||'',
  card:(document.querySelector('#puList .pu-t')||{}).textContent||'' }));
need('ASSIGNED shows i4 (Soffit vent swap)', /Soffit/.test(asg.card), '"'+asg.card+'"');
need('ASSIGNED card says No day set', /No day set/.test(asg.noday), '"'+asg.noday+'"');

/* 5 — the Assign flow end to end */
await tap('#puTabs [data-putab="active"]','back to active');
await page.waitForTimeout(200);
await tap('#puQueue [data-puassign-open]','open the assign sheet');
await page.waitForTimeout(300);
const sheet=await page.evaluate(()=>({
  open:document.getElementById('puShAssign')?.classList.contains('open')||false,
  rows:document.querySelectorAll('#puAsgWho .pu-asgrow').length,
  load:(document.querySelector('#puAsgWho .pu-asgrow .load')||{}).textContent||'',
  days:document.querySelectorAll('#puAsgDays .pu-dayb').length }));
need('assign sheet opens', sheet.open);
need('person rows render (roster)', sheet.rows>=2, 'rows='+sheet.rows);
need('person row shows real load', /\d+ open/.test(sheet.load), '"'+sheet.load+'"');
need('day chips render (4 workdays + no-day)', sheet.days===5, 'days='+sheet.days);
await tap('#puAsgWho .pu-asgrow','pick the first person (Curtis — production first)');
await page.waitForTimeout(200);
await tap('#puAsgDays .pu-dayb','pick TODAY');
await page.waitForTimeout(200);
const goTxt=await page.evaluate(()=>(document.getElementById('puAsgGo')||{}).textContent||'');
need('Go button names the pick', /Assign to Curtis/.test(goTxt), '"'+goTxt+'"');
await tap('#puAsgGo','commit the assignment');
await page.waitForTimeout(800);
const after=await page.evaluate(()=>{
  const w=(window.__WRITES__||[]).filter(x=>x.table==='punch_items'&&x.op!=='select');
  const upd=w.filter(x=>x.payload&&x.payload.assigned_to==='curtis@cardinalrenovations.net');
  return { upd:upd.length, patch:upd[0]?upd[0].payload:null,
           ntf:(window.__NTF||[]).length, ntfTo:((window.__NTF||[])[0]||{}).to||[],
           qn:document.querySelectorAll('#puQueue .pu-card').length,
           sheetOpen:document.getElementById('puShAssign')?.classList.contains('open')||false };
});
need('assign wrote through the one pipeline', after.upd>=1, JSON.stringify(after.patch||{}).slice(0,80));
need('write carries scheduled_at (TODAY picked)', !!(after.patch&&after.patch.scheduled_at), JSON.stringify(after.patch||{}).slice(0,80));
need('notified exactly once', after.ntf===1, 'ntf='+after.ntf);
need('notified the assignee', String(after.ntfTo)==='curtis@cardinalrenovations.net', String(after.ntfTo));
need('queue shrank after assign (render ran)', after.qn===q.n-1, q.n+' -> '+after.qn);
need('sheet closed after assign', !after.sheetOpen);

/* 8 — the 44px floor on the new controls */
const floor=await page.evaluate(()=>{
  const out=[];
  document.querySelectorAll('#puQueue [data-puassign-open], #puTabs .pu-tab').forEach(e=>{
    const b=e.getBoundingClientRect();
    if(b.width&&b.height&&b.height<43.5) out.push(e.className+' '+Math.round(b.height));
  });
  return out;
});
need('new controls meet the 44px floor', floor.length===0, floor.join(' | '));

await browser.close();
console.log('');
console.log('GATE 945 ['+LABEL+'] — '+passes+' passed, '+fails.length+' failed');
fails.forEach(f=>console.log('  ✗ '+f));
console.log(fails.length? 'GATE 945 RED' : 'GATE 945 GREEN — The Line works end to end');
process.exit(fails.length?1:0);
