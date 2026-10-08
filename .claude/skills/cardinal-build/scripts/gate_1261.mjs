/* gate_1261.mjs — only Theo, Joan and Curtis schedule punch work; Warranty is
   a Work Type everywhere.
   Real Chromium against the seeded mock. i4 is Scottie's (no date), i1 is
   Curtis's. The database half (punch_schedule_guard.sql) was proven on
   production inside a rolled-back transaction — see the build log; this gate
   proves the app never offers, and never sends, what that rule refuses.
     A  as SCOTTIE in "+ New": no date or time field, "Curtis schedules it", and
        filing a job inserts a row with no scheduled_at / scheduled_time
     B  as SCOTTIE checking out of an unfinished card: the question is "Tell
        Curtis it needs another day?" (Tell Curtis / Not now); YES writes the
        closed visit plus a 'needday' message and NO date, and buzzes Curtis and
        Theo with "Needs another day"
     C  as SCOTTIE, NOT NOW: only the closed visit is written; nobody is buzzed
     D  as SCOTTIE, putting it on hold still moves it to its look-again day
        (scheduled_at === hold_until, time cleared) — the rule's hold exception
     E  as CURTIS: "+ New" keeps the date and time fields; checking out asks
        "Back on this tomorrow?" and yes moves the date to the next working day
     F  the Edit form and Job Details both offer Warranty, and a lead saved as
        Warranty shows it selected in Job Details
     G  a lead saved with a legacy Work Type (Retail) opens in the Edit form as
        Retail, labelled legacy, and saving the form keeps it — before 1261 the
        select fell to "not set" and the save wrote null over it
   usage: node gate_1261.mjs [file.html] — RED on 1260, never a crash
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
  /* F: Mark Diamond (p1) was saved with Work Type = Warranty */
  await page.addInitScript(()=>{ const S=(window.__SEED__||{}).projects; if(!S) return;
    const pr=S.find(x=>x.id==='p1'); if(!pr) return;
    try{ const c=JSON.parse(pr.checklist||'{}'); c.work_type='Warranty'; c.job_category='Residential'; pr.checklist=JSON.stringify(c); }catch(_){}
    /* G: Kathy May (p2) was saved with a legacy Work Type, Retail */
    const p2=S.find(x=>x.id==='p2');
    if(p2){ try{ const c2=JSON.parse(p2.checklist||'{}'); c2.work_type='Retail'; p2.checklist=JSON.stringify(c2); }catch(_){} } });
  await page.goto('https://sentinel.test/?as='+as,{waitUntil:'domcontentloaded'});
  await page.waitForTimeout(1700);
  await page.evaluate(async ()=>{
    ['landingView','loginView'].forEach(id=>{const e=document.getElementById(id); if(e){e.style.display='none';}});
    window.__NTF=[];
    window.notifyTeam=async function(to,s){ window.__NTF.push({to:to,s:s}); return {ok:true,sent:1,subs:1}; };
    if(window.CardinalPunch&&window.CardinalPunch.reload) await window.CardinalPunch.reload();
  });
  return page;
}
const punchWrites=p=>p.evaluate(()=>(window.__WRITES__||[]).filter(x=>x.table==='punch_items'&&x.op!=='select'&&x.payload)
  .map(x=>({op:x.op, row:Array.isArray(x.payload)?x.payload[0]:x.payload})));
const lastPatch=async p=>{ const w=await punchWrites(p); return w.length?w[w.length-1].row:null; };
const openCard=async (p,id)=>{ await p.evaluate(id=>window.CardinalPunchCard&&window.CardinalPunchCard.open(id),id); await p.waitForTimeout(600); };
const closeCard=p=>p.evaluate(()=>window.CardinalPunchCard&&window.CardinalPunchCard.close&&window.CardinalPunchCard.close(false));
/* BUG_CLASSES 37: on the control a control may be missing — record it, never crash */
async function tap(p, sel){
  const hit=await p.evaluate(s=>{ const b=document.querySelector(s); if(!b) return false; b.click(); return true; }, sel).catch(()=>false);
  if(!hit) console.log('        (nothing to tap at '+sel+')');
  return hit;
}
/* crAsk is the app's own sheet (#crAsk.open), not window.confirm — answer it there */
async function answer(p, yes){
  for(let i=0;i<40;i++){
    const q=await p.evaluate(()=>{ const n=document.querySelector('#crAsk.open'); if(!n) return null;
      const t=s=>((n.querySelector(s)||{}).textContent||'').trim();
      return { q:t('.askq'), why:t('.askwhy'), go:t('.askgo'), no:t('.askno') }; }).catch(()=>null);
    if(q){ await p.evaluate(y=>{ const b=document.querySelector('#crAsk.open '+(y?'.askgo':'.askno')); if(b) b.click(); }, yes); await p.waitForTimeout(700); return q; }
    await p.waitForTimeout(100);
  }
  return null;
}
async function composer(p){
  await p.evaluate(()=>{ const P=window.CardinalProduction; if(P&&P.newPunch) P.newPunch(null); }); await p.waitForTimeout(700);
  return p.evaluate(()=>{ const m=[...document.querySelectorAll('[data-f="title"]')].map(e=>e.closest('.sheet')||e.parentElement).filter(Boolean)[0];
    if(!m) return null;
    return { when:!!m.querySelector('[data-f="when"]'), time:!!m.querySelector('[data-f="whentime"]'), txt:m.textContent }; });
}
async function fileOne(p){
  return p.evaluate(async ()=>{
    const t=document.querySelector('[data-f="title"]'); const m=t&&(t.closest('.sheet')||t.parentElement); if(!m) return 'no form';
    t.value='Gate 1261: ridge cap lifting';
    const j=m.querySelector('[data-f="project"]'); if(j){ const o=[...j.options].find(o=>o.value==='p1')||[...j.options].find(o=>o.value); if(o) j.value=o.value; }
    window.__WRITES__=[];
    const b=m.querySelector('[data-act="save"]'); if(!b) return 'no save';
    b.click(); await new Promise(r=>setTimeout(r,900)); return 'ok';
  });
}

/* A–D as Scottie */
const s=await boot('scottie');
const sc=await composer(s);
need('A  Scottie: "+ New" has no date or time field', !!sc && !sc.when && !sc.time, JSON.stringify(sc&&{when:sc.when,time:sc.time}));
need('A  …and says "Curtis schedules it"', !!sc && /Curtis schedules it/.test(sc.txt));
const filed=await fileOne(s);
const ins=(await punchWrites(s)).filter(x=>x.op==='insert').map(x=>x.row);
need('A  filing it inserts one row with no date and no time', filed==='ok' && ins.length===1 && !ins[0].scheduled_at && !ins[0].scheduled_time,
  filed+' '+JSON.stringify(ins.map(r=>({a:r.scheduled_at,t:r.scheduled_time}))));

await s.evaluate(()=>{ document.querySelectorAll('.pbmodal.open, .sheet.open').forEach(e=>e.classList.remove('open')); });
await openCard(s,'i4');
await tap(s,'#cr-pk [data-act="cin"]'); await s.waitForTimeout(500);
await s.evaluate(()=>{ window.__WRITES__=[]; window.__NTF=[]; });
await tap(s,'#cr-pk [data-act="cout"]');
const qB=await answer(s,true);
need('B  Scottie checking out is asked "Tell Curtis it needs another day?"', !!qB && /Tell Curtis it needs another day\?/.test(qB.why) && /Not finished/.test(qB.q), JSON.stringify(qB));
need('B  …with buttons that say what happens: Tell Curtis / Not now', !!qB && qB.go==='Tell Curtis' && qB.no==='Not now', qB&&(qB.go+' / '+qB.no));
const pB=await lastPatch(s), cB=pB&&Array.isArray(pB.comments)?pB.comments[pB.comments.length-1]:null;
need('B  YES writes the closed visit and NO date', !!pB && Array.isArray(pB.visits) && pB.visits.length>0 && !!pB.visits[pB.visits.length-1].out && !('scheduled_at' in pB) && !('scheduled_time' in pB),
  pB?Object.keys(pB).join(','):'no write');
need('B  …plus a message on the job, flagged needday', !!cB && cB.flag==='needday' && /needs another day/.test(cB.text||'') && cB.by==='scottie@cardinalrenovations.net', JSON.stringify(cB));
const nB=(await s.evaluate(()=>window.__NTF))||[];
need('B  Curtis and Theo are buzzed: "Needs another day"', nB.length===1 && nB[0].to.includes('curtis@cardinalrenovations.net') && nB[0].to.includes('theo@cardinalrenovations.net') && /^Needs another day/.test(nB[0].s||''),
  JSON.stringify(nB));

await tap(s,'#cr-pk [data-act="cin"]'); await s.waitForTimeout(500);
await s.evaluate(()=>{ window.__WRITES__=[]; window.__NTF=[]; });
await tap(s,'#cr-pk [data-act="cout"]');
const qC=await answer(s,false);
const pC=await lastPatch(s);
need('C  NOT NOW: only the closed visit is written', !!qC && !!pC && Object.keys(pC).join(',')==='visits', pC?Object.keys(pC).join(','):'no write');
need('C  …and nobody is buzzed', ((await s.evaluate(()=>window.__NTF))||[]).length===0);

await s.evaluate(()=>{ window.__WRITES__=[]; });
await tap(s,'#cr-pk [data-act="hold"]'); await s.waitForTimeout(300);
await tap(s,'#cr-pk [data-hr="materials"]'); await s.waitForTimeout(200);
const dayK=await s.evaluate(()=>{ const d=[...document.querySelectorAll('#cr-pk .pkhs-d')][3]; return d?d.getAttribute('data-hd'):null; });
if(dayK) await tap(s,'#cr-pk [data-hd="'+dayK+'"]'); await s.waitForTimeout(200);
await tap(s,'#cr-pk [data-act="holdgo"]'); await s.waitForTimeout(600);
const pD=await lastPatch(s);
need('D  Scottie can still hold it, and it moves to the look-again day', !!pD && !!dayK && pD.hold_until===dayK && pD.scheduled_at===dayK && pD.scheduled_time===null,
  JSON.stringify(pD&&{hold_until:pD.hold_until, at:pD.scheduled_at, time:pD.scheduled_time}));
await closeCard(s);
await s.close();

/* E as Curtis */
const k=await boot('curtis');
const kc=await composer(k);
need('E  Curtis: "+ New" keeps the date and time fields', !!kc && kc.when && kc.time && !/Curtis schedules it/.test(kc.txt), JSON.stringify(kc&&{when:kc.when,time:kc.time}));
await k.evaluate(()=>{ document.querySelectorAll('.pbmodal.open, .sheet.open').forEach(e=>e.classList.remove('open')); });
await openCard(k,'i1');
await tap(k,'#cr-pk [data-act="cin"]'); await k.waitForTimeout(500);
await k.evaluate(()=>{ window.__WRITES__=[]; });
await tap(k,'#cr-pk [data-act="cout"]');
const qE=await answer(k,true);
const pE=await lastPatch(k);
const todayKey=await k.evaluate(()=>{ const d=new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); });
need('E  Curtis is asked "Back on this tomorrow?"', !!qE && /Back on this tomorrow\?/.test(qE.why), JSON.stringify(qE));
need('E  …and yes moves the date to a later working day, never a Sunday', !!pE && /^\d{4}-\d{2}-\d{2}$/.test(pE.scheduled_at||'') && pE.scheduled_at>todayKey && new Date(pE.scheduled_at+'T12:00:00').getDay()!==0,
  JSON.stringify(pE&&{at:pE.scheduled_at, today:todayKey}));
await closeCard(k);

/* F Work Type */
const pf=await k.evaluate(()=>{ const s=document.getElementById('pfWorkType'); return s?[...s.options].map(o=>o.textContent):null; });
need('F  the Edit form offers Warranty', !!pf && pf.includes('Warranty'), JSON.stringify(pf));
await k.evaluate(()=>{ location.hash='#p/p1'; }); await k.waitForTimeout(1500);
const acx=await k.evaluate(()=>{ const s=document.getElementById('acxWt'); return s?{opts:[...s.options].map(o=>o.textContent), v:s.value}:null; });
need('F  Job Details offers Warranty and shows the saved one', !!acx && acx.opts.includes('Warranty') && acx.v==='Warranty', JSON.stringify(acx));

/* G the Edit form keeps a legacy Work Type through a save */
const g=await k.evaluate(async ()=>{
  const pr=(window.__SEED__.projects||[]).find(x=>x.id==='p2');
  if(typeof window.openProjModal!=='function' || !pr) return { err:'no openProjModal' };
  window.openProjModal(pr); await new Promise(r=>setTimeout(r,400));
  const sel=document.getElementById('pfWorkType'); const opt=sel&&sel.options[sel.selectedIndex];
  const shown={ v:sel?sel.value:null, t:opt?opt.textContent:null };
  window.__WRITES__=[];
  const b=document.getElementById('pfSave'); if(b) b.click(); await new Promise(r=>setTimeout(r,1200));
  const pw=(window.__WRITES__||[]).filter(x=>x.table==='projects'&&x.op!=='select'&&x.payload).map(x=>Array.isArray(x.payload)?x.payload[0]:x.payload);
  const cks=pw.map(r=>{ try{ return typeof r.checklist==='string'?JSON.parse(r.checklist):(r.checklist||null); }catch(_){ return null; } }).filter(Boolean);
  return { shown, saved: cks.length?cks[cks.length-1].work_type:'(no checklist write)', n:pw.length };
});
need('G  the Edit form shows a lead saved as Retail as Retail, labelled legacy', !!g.shown && g.shown.v==='Retail' && /legacy/.test(g.shown.t||''), JSON.stringify(g.shown||g));
need('G  …and saving the form keeps Retail instead of writing null', g.saved==='Retail', JSON.stringify(g));
await k.close();

await browser.close();
console.log((fails.length?'GATE 1261 RED':'GATE 1261 GREEN')+' — '+passes+' passed, '+fails.length+' failed');
process.exit(fails.length?1:0);
