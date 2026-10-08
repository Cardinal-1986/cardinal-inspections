/* gate_1264.mjs — the Community job page in Retail's order (Theo).
   Real Chromium, as Theo, on a seeded Habitat job at Estimate Submitted.
     A  the page: name card, Job Value, the stage bar in Community words, Job
        Details with Partnership Organization (no Lead Source), Homeowner & Site,
        Assigned To — and no pin, no Thread|Estimate tabs
     B  Communication opens the Thread in place, with a way back; Estimates
        opens the priced estimate
     C  Work Type and a Trade chip write the flat keys the reports read
     D  › from Estimate Submitted asks, then writes bid.awarded_amount/_at and
        moves the stage to Approved (Awarded) — checklist BEFORE stage
     E  ⋮ → Not Awarded asks why, writes lead.not_awarded_reason, stage Lost
   usage: node gate_1264.mjs [file.html] — RED on 1263, never a crash */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium; for (const p of ['playwright','/opt/node22/lib/node_modules/playwright/index.js']){try{chromium=require(p).chromium;break;}catch(e){}}
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
const HERE=dirname(fileURLToPath(import.meta.url));
const APP=readFileSync(process.argv[2]||join(HERE,'../../../../index.html'),'utf8');
const SETUP=readFileSync(join(HERE,'sentinel_setup_cardinal.js'),'utf8')+'\n;\n'+readFileSync(join(HERE,'e2e_mock_supa.js'),'utf8');
let fails=[], passes=0;
function need(n, ok, d){ if(ok){passes++;console.log('  PASS  '+n);} else {fails.push(n);console.log('  FAIL  '+n+(d!==undefined?'  → '+d:''));} }
setTimeout(()=>{ console.log('GATE TIMEOUT'); process.exit(3); }, 200000).unref();
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
const p=await b.newPage({viewport:{width:390,height:844}});
const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.route('**/*', r=>{const u=r.request().url(); return u.startsWith('https://sentinel.test/')?r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:APP}):r.fulfill({status:200,body:''});});
await p.addInitScript(SETUP);
await p.addInitScript(()=>{ const S=window.__SEED__; if(!S) return;
  S.community_partners=[{id:'cp1',name:'Habitat for Humanity of Greater Dayton',kind:'program'}];
  S.projects.push({ id:'p9', name:'Dorothy Hayes — Habitat', address:'412 Wroe Ave', stage:'Prospect', crm:'community', created_by:'theo@cardinalrenovations.net',
    created_at:'2026-09-20T10:00:00Z', updated_at:'2026-10-06T10:00:00Z', stage_since:'2026-10-01T10:00:00Z',
    checklist: JSON.stringify({ po:1110, job_category:'Residential', lead:{ claim_type:'community', partner_id:'cp1', partner_name:'Habitat for Humanity of Greater Dayton',
      homeowner_name:'Dorothy Hayes', homeowner_phone:'937-555-0190', work_type:'Repair', bid_amount:'14850', bid_due_at:'2026-10-15', assigned:['nick@cardinalrenovations.net'] } }) }); });
await p.goto('https://sentinel.test/',{waitUntil:'domcontentloaded'}); await p.waitForTimeout(1800);
await p.evaluate(()=>{ ['landingView','loginView'].forEach(x=>{const e=document.getElementById(x); if(e) e.style.display='none';}); location.hash='#p/p9'; });
await p.waitForTimeout(3000);
const txt=()=>p.evaluate(()=>((document.getElementById('cr-cc')||{}).textContent||'').replace(/\s+/g,' '));
const ask=async(pick)=>{ for(let i=0;i<40;i++){ const ok=await p.evaluate(pk=>{ const n=document.querySelector('#crAsk.open'); if(!n) return false; const b=pk?n.querySelector('[data-pick="'+pk+'"]'):n.querySelector('.askgo'); if(b){ b.click(); return true; } return false; }, pick); if(ok){ await p.waitForTimeout(900); return true; } await p.waitForTimeout(100);} return false; };
const writes=()=>p.evaluate(()=>(window.__WRITES__||[]).filter(x=>x.table==='projects'&&x.op!=='select'&&x.payload).map(x=>Array.isArray(x.payload)?x.payload[0]:x.payload));
const ckOf=w=>w.filter(r=>r.checklist).map(r=>{ try{ return JSON.parse(r.checklist); }catch(_){ return {}; } });

/* A */
let t=await txt();
need('A  name card, Job Value and the stage in Community words', /Dorothy Hayes/.test(t) && /Job Value/.test(t) && /ESTIMATE SUBMITTED/.test(t), t.slice(0,160));
need('A  Job Details has Partnership Organization and no Lead Source', /Job Details/.test(t) && /Partnership Organization/.test(t) && !/Lead Source/.test(t));
need('A  Homeowner & Site and Assigned To are there', /Homeowner & Site/.test(t) && /Assigned To/.test(t));
need('A  the old pin and Thread|Estimate tabs are gone', await p.evaluate(()=>!document.querySelector('#cr-cc .pin') && !document.querySelector('#cr-cc .tabbar')));
/* B */
await p.evaluate(()=>{ const b=document.querySelector('#cr-cc .cc-jmb[data-jm="comms"]'); if(b) b.click(); }); await p.waitForTimeout(500);
t=await txt();
need('B  Communication opens the Thread in place', /Communication/.test(t) && /Messages & notes/.test(t) && !/Job Details/.test(t), t.slice(0,140));
await p.evaluate(()=>{ const b=document.querySelector('#cr-cc [data-cc2="back"]'); if(b) b.click(); }); await p.waitForTimeout(400);
need('B  …and back returns to the page', /Job Details/.test(await txt()));
await p.evaluate(()=>{ const b=document.querySelector('#cr-cc .cc-jmb[data-jm="estimates"]'); if(b) b.click(); }); await p.waitForTimeout(500);
t=await txt();
need('B  Estimates opens the priced estimate in place', /Estimate/.test(t) && !/Job Details/.test(t), t.slice(0,140));
await p.evaluate(()=>{ const b=document.querySelector('#cr-cc [data-cc2="back"]'); if(b) b.click(); }); await p.waitForTimeout(400);
/* C */
await p.evaluate(()=>{ window.__WRITES__=[]; const s=document.querySelector('#cr-cc [data-cc2f="wt"]'); if(s){ s.value='New'; s.dispatchEvent(new Event('change')); } }); await p.waitForTimeout(900);
let c1=ckOf(await writes()).pop()||{};
need('C  Work Type writes flat work_type and the lead copy', c1.work_type==='New' && (c1.lead||{}).work_type==='New', JSON.stringify({w:c1.work_type,l:(c1.lead||{}).work_type}));
await p.evaluate(()=>{ window.__WRITES__=[]; const b=document.querySelector('#cr-cc [data-cc2t="Gutters"]'); if(b) b.click(); }); await p.waitForTimeout(900);
c1=ckOf(await writes()).pop()||{};
need('C  a Trade chip writes checklist.trades', Array.isArray(c1.trades) && c1.trades.includes('Gutters'), JSON.stringify(c1.trades));
/* D */
await p.evaluate(()=>{ window.__WRITES__=[]; const b=document.querySelector('#cr-cc [data-cc2="next"]'); if(b) b.click(); });
const askedD=await ask(null);
const wD=await writes();
const ckD=ckOf(wD), stD=wD.map(r=>r.stage).filter(Boolean);
const iAw=wD.findIndex(r=>r.checklist && /awarded_amount/.test(r.checklist)), iSt=wD.findIndex(r=>r.stage==='Approved');
need('D  › asks before moving', askedD);
need('D  …records the awarded amount and date', ckD.some(c=>c.bid && Number(c.bid.awarded_amount)===14850 && c.bid.awarded_at), JSON.stringify(ckD.map(c=>c.bid)));
need('D  …then moves the stage to Approved, checklist first', stD.includes('Approved') && iAw !== -1 && iAw < iSt, JSON.stringify({stD,iAw,iSt}));
await p.waitForTimeout(800);
need('D  the bar now reads AWARDED', /AWARDED/.test(await txt()));
/* E */
await p.evaluate(()=>{ window.__WRITES__=[]; const b=document.querySelector('#cr-cc [data-cc2="more"]'); if(b) b.click(); });
await ask('lost'); await ask('Not funded');
const wE=await writes();
need('E  Not Awarded asks why and records it', ckOf(wE).some(c=>(c.lead||{}).not_awarded_reason==='Not funded'), JSON.stringify(ckOf(wE).map(c=>(c.lead||{}).not_awarded_reason)));
need('E  …and moves the stage to Lost', wE.some(r=>r.stage==='Lost'));
need('no page errors', errs.length===0, JSON.stringify(errs.slice(0,3)));
await b.close();
console.log((fails.length?'GATE 1264 RED':'GATE 1264 GREEN')+' — '+passes+' passed, '+fails.length+' failed');
process.exit(fails.length?1:0);
