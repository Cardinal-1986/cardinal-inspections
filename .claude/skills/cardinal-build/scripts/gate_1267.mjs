/* gate_1267.mjs — guided report, step 3: Change the report / Add a note / edit by hand.
   Builds an AI draft through the 1266 flow (stubbed route), then:
     A  the editor opens with the Assistant panel OPEN in "Change the report"
     B  "shorter summary" sends an EDIT request with the report's parts (the
        summary, write-ups, recommendations, captions); the stub rewrites the
        summary; the live report shows it and it is SAVED
     C  Undo puts the old summary back and saves again
     D  "Add a note" still goes to /api/organize, the old intake, untouched
     E  a plain (non-AI) report opens the panel in "Add a note"
   usage: node gate_1267.mjs [file.html] — RED on 1266, never a crash
   ---- the 1266 setup, reused: ----
   Real Chromium, signed in as nick, on Mark Diamond (p1), with three seeded photos
   and /api/inspect-assist answered by a recording stub (no model call).
     A  after the checklist saves, the photo + assistant screen: three photos,
        a greeting, "Start without AI" and "Write report"
     B  checking two photos reads "2 of 16"
     C  Send: a CHAT request carrying the two photos (signed URLs), the checklist
        facts and the rep's words; the reply shows in the chat
     D  a failed Write says so and makes NO report
     E  Write: a WRITE request with sections 3–8 and life_by "ai"; ONE report,
        titled without a prompt; its saved html has both photos in the sections
        the assistant chose, the captions, the HIGH tag, the section write-up,
        the overall condition and numbered recommendations; the life estimate
        lands in the checklist as "AI estimate: …"
   usage: node gate_1266.mjs [file.html] — RED on 1265, never a crash
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
setTimeout(()=>{ console.log('GATE TIMEOUT'); process.exit(3); }, 200000).unref();

const WRITE_ANSWER = {
  summary:'The roof covering is at the end of its service life; full replacement is recommended.',
  sections:[{num:5,narrative:'Granule loss is widespread across the field of the roof.'},{num:8,narrative:'Staining on the decking is consistent with past leaks.'}],
  photos:[{id:'ph1',section:5,caption:'Granule loss across the field.',severity:'high'},{id:'ph3',section:8,caption:'Stained decking in the attic.',severity:'mod'}],
  recommendations:['Full tear-off and replacement with Owens Corning Duration shingles.','Add ridge vent with balanced soffit intake.'],
  life_estimate:'About 1–3 years of service life left'
};
const calls=[]; let failWrite=true, dialogs=0;
const browser=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:390,height:844}});
page.on('dialog', d=>{ dialogs++; d.accept(); });
await page.route('**/*', async r=>{const u=r.request().url();
  if(u.startsWith('https://sentinel.test/api/organize')){
    let b={}; try{ b=JSON.parse(r.request().postData()||'{}'); }catch(_){}
    calls.push(Object.assign({route:'organize'},b));
    return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({section:7,sentence:'The chimney crown is cracked.'})});
  }
  if(u.startsWith('https://sentinel.test/api/inspect-assist')){
    let b={}; try{ b=JSON.parse(r.request().postData()||'{}'); }catch(_){}
    calls.push(b);
    if(b.mode==='edit'){ const sb=(b.blocks||[]).find(x=>x.kind==='summary');
      return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({reply:'Shortened the summary.',edits: sb?[{id:sb.id,text:'Short summary: replace the roof.'}]:[]})}); }
    if(b.mode==='chat') return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({reply:'How long has it been leaking?',ready:false})});
    if(failWrite) return r.fulfill({status:502,contentType:'application/json',body:JSON.stringify({error:'The assistant could not answer',retryable:true})});
    return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(WRITE_ANSWER)});
  }
  if(u.startsWith('https://sentinel.test/')) return r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:APP});
  return r.fulfill({status:200,body:''});});
await page.addInitScript(SETUP);
await page.goto('https://sentinel.test/?as=nick',{waitUntil:'domcontentloaded'});
await page.waitForTimeout(1800);
await page.evaluate(()=>{
  ['ph1','ph2','ph3'].forEach((id,i)=>window.__SEED__.project_photos.push({ id, project_id:'p1', data:'', storage_path:'projects/p1/'+id+'.jpg', created_at:'2026-10-0'+(i+1)+'T12:00:00Z', section:null, caption:null }));
  ['landingView','loginView'].forEach(id=>{const e=document.getElementById(id); if(e) e.style.display='none';}); location.hash='#p/p1'; });
await page.waitForTimeout(1800);
await page.evaluate(()=>{ try{ showTab('inspections'); }catch(_){} });
await page.waitForTimeout(300);
const mark=()=>page.evaluate(()=>{ window.__WRITES__=[]; });
const W=(t)=>page.evaluate((t)=>(window.__WRITES__||[]).filter(x=>x.table===t&&x.op!=='select'&&x.payload).map(x=>({op:x.op,row:Array.isArray(x.payload)?x.payload[0]:x.payload})),t);
const click=(sel)=>page.evaluate((sel)=>{ const b=document.querySelector(sel); if(b){ b.click(); return true; } return false; },sel);
const txt=(sel)=>page.evaluate((sel)=>{ const e=document.querySelector(sel); return e?e.textContent.replace(/\s+/g,' ').trim():''; },sel);

/* the checklist, roof only, life expectancy left to the AI */
await page.evaluate(()=>{ const b=document.getElementById('pNewReportBtn'); if(b) b.click(); });
await click('#insgSheet [data-ig="next"]');
await page.evaluate(()=>{
  const set=(k,v)=>{ const e=document.getElementById('insg_'+k); if(!e) return; e.value=v; e.dispatchEvent(new Event('change',{bubbles:true})); };
  set('method','Visual, non-invasive; roof surface accessed directly'); set('structure','Single Family'); set('rooftype','Asphalt shingle');
  set('layers','1 Layer'); set('decking','Plywood'); set('pitch','6/12'); set('age','22'); set('condition','Poor'); set('attic','Yes'); set('life_by','ai'); });
await click('#insgSheet [data-ig="save"]');
await page.waitForTimeout(1500);

await click('#insgSheet [data-ph="ph1"]');
failWrite=false;
await click('#insgSheet [data-ig="write"]');
await page.waitForTimeout(4000);

/* A */
const a=await page.evaluate(()=>{ const p=document.getElementById('assistantPanel'); const e=document.getElementById('assistModeEdit');
  return { open:!!(p&&p.classList.contains('open')), edit:e?e.getAttribute('aria-pressed'):null, msgs:(document.getElementById('assistMsgs')||{}).textContent||'' }; });
need('A  the AI draft opens with the Assistant panel open, in "Change the report"', a.open && a.edit==='true' && /Your draft is written/.test(a.msgs), JSON.stringify(a).slice(0,200));

/* B */
await mark();
await page.evaluate(()=>{ const t=document.getElementById('assistText'); t.value='shorter summary'; document.getElementById('assistSend').click(); });
await page.waitForTimeout(1800);
const eq=calls.filter(x=>x.mode==='edit').pop()||{};
const kinds=[...new Set((eq.blocks||[]).map(b=>b.kind))].sort();
need('B  an EDIT request with the instruction and the report’s parts', eq.instruction==='shorter summary' && kinds.includes('summary') && kinds.includes('write-up') && kinds.includes('recommendations') && kinds.includes('photo caption'), JSON.stringify(kinds));
const live=()=>page.evaluate(()=>{ const d=document.getElementById('reportFrame').contentDocument; const h=d&&d.querySelector('[data-cardinal-summary-heading]'); let e=h&&h.nextElementSibling; while(e&&e.tagName!=='P') e=e.nextElementSibling; return e?e.textContent:''; });
need('B  the live report shows the new summary', (await live())==='Short summary: replace the roof.', await live());
const saved=()=>W('inspection_reports').then(w=>String((w.filter(x=>x.op==='update'&&x.row.html).pop()||{row:{}}).row.html||''));
need('B  …and it was saved', (await saved()).includes('Short summary: replace the roof.'));
need('B  …with an Undo', await page.evaluate(()=>!!document.querySelector('#assistMsgs .ae-undo')));

/* C */
await mark();
await page.evaluate(()=>{ const b=[...document.querySelectorAll('#assistMsgs .ae-undo')].pop(); if(b) b.click(); });
await page.waitForTimeout(1200);
need('C  Undo puts the old summary back and saves', (await live()).startsWith('The roof covering is at the end') && (await saved()).includes('The roof covering is at the end'), await live());

/* D */
const n0=calls.filter(x=>x.route==='organize').length;
await page.evaluate(()=>{ const b=document.getElementById('assistModeNote'); if(b) b.click(); const t=document.getElementById('assistText'); t.value='Chimney crown cracked'; document.getElementById('assistSend').click(); });
await page.waitForTimeout(1200);
need('D  "Add a note" still goes to /api/organize', calls.filter(x=>x.route==='organize').length===n0+1 && /Added to/.test(await page.evaluate(()=>document.getElementById('assistMsgs').textContent)), String(calls.filter(x=>x.route==='organize').length-n0));

/* E */
await page.evaluate(async()=>{ try{ await closeEditor(); }catch(_){} });
await page.waitForTimeout(600);
await page.evaluate(()=>{ try{ showTab('inspections'); }catch(_){} const b=document.getElementById('pNewReportBtn'); if(b) b.click(); });
await mark();
await click('#insgSheet [data-ig="next"]'); await page.waitForTimeout(300);
await click('#insgSheet [data-ig="skip"]'); await page.waitForTimeout(800);
await click('#insgSheet [data-ig="plain"]'); await page.waitForTimeout(2500);
const plainIns=(await W('inspection_reports')).filter(x=>x.op==='insert').length;
const e=await page.evaluate(()=>{ const p=document.getElementById('assistantPanel'); if(p) p.classList.remove('open'); const b=document.getElementById('assistantBtn'); if(b) b.click();
  const m=document.getElementById('assistModeNote'); return { open:!!(p&&p.classList.contains('open')), note:m?m.getAttribute('aria-pressed'):null }; });
need('E  a plain report (just created, no AI) opens the panel in "Add a note"', plainIns===1 && e.open && e.note==='true', JSON.stringify(Object.assign({plainIns},e)));

await browser.close();
console.log((fails.length?'GATE 1267 RED':'GATE 1267 GREEN')+' — '+passes+' passed, '+fails.length+' failed');
process.exit(fails.length?1:0);
