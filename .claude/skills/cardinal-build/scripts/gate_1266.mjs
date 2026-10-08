/* gate_1266.mjs — New inspection report, guided, step 2: photos + the assistant.
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
  if(u.startsWith('https://sentinel.test/api/inspect-assist')){
    let b={}; try{ b=JSON.parse(r.request().postData()||'{}'); }catch(_){}
    calls.push(b);
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

/* A */
const a=await page.evaluate(()=>({ tiles:document.querySelectorAll('#insgSheet .ig-ph').length,
  chat:(document.getElementById('insgChat')||{}).textContent||'',
  btns:[...document.querySelectorAll('#insgSheet .ig-foot button')].map(b=>b.textContent.trim()) }));
need('A  after the checklist: the photo + assistant screen with the job’s three photos', a.tiles===3, JSON.stringify(a));
need('A  …a greeting, and Start without AI / Write report', /Check the photos/.test(a.chat) && JSON.stringify(a.btns)==='["Start without AI","Write report"]', JSON.stringify(a));

/* B */
await click('#insgSheet [data-ph="ph1"]'); await click('#insgSheet [data-ph="ph3"]');
need('B  two checked → "2 of 16"', /2 of 16/.test(await txt('#insgPicN')), await txt('#insgPicN'));

/* C */
await page.evaluate(()=>{ const t=document.getElementById('insgSay'); if(t) t.value='Homeowner says it leaks in the front bedroom when it rains hard.'; });
await click('#insgSheet [data-ig="send"]');
await page.waitForTimeout(700);
const c0=calls.find(x=>x.mode==='chat')||{};
need('C  a CHAT request with the two checked photos as signed URLs', JSON.stringify((c0.photos||[]).map(p=>p.id))==='["ph1","ph3"]' && (c0.photos||[]).every(p=>/^blob:mock\/projects\/p1\//.test(p.url)), JSON.stringify(c0.photos));
need('C  …carrying the checklist facts and the rep’s words', c0.facts && c0.facts['Decking type']==='Plywood' && (c0.history||[]).some(m=>m.role==='me'&&/front bedroom/.test(m.text)), JSON.stringify({f:c0.facts,h:c0.history}));
need('C  …and the reply shows in the chat', /How long has it been leaking\?/.test(await txt('#insgChat')), await txt('#insgChat'));

/* D */
await mark();
await click('#insgSheet [data-ig="write"]');
await page.waitForTimeout(900);
need('D  a failed Write says so and makes no report', /not written/.test(await txt('#insgErr')) && (await W('inspection_reports')).length===0 && await page.evaluate(()=>!!document.querySelector('#insgSheet.open')), await txt('#insgErr'));

/* E */
failWrite=false; await mark(); const d0=dialogs;
await click('#insgSheet [data-ig="write"]');
await page.waitForTimeout(3500);
const wq=calls.filter(x=>x.mode==='write').pop()||{};
need('E  a WRITE request with sections 3–8 and life_by "ai"', JSON.stringify((wq.sections||[]).map(s=>s.num))==='[3,4,5,6,7,8]' && wq.life_by==='ai', JSON.stringify({s:wq.sections,l:wq.life_by}));
const reps=await W('inspection_reports');
const ins=reps.filter(x=>x.op==='insert').map(x=>x.row);
need('E  ONE report, titled without asking', ins.length===1 && ins[0].title==='Mark Diamond — 7990 Germantown Pike' && dialogs===d0, JSON.stringify({n:ins.length,t:ins[0]&&ins[0].title,dialogs:dialogs-d0}));
const html=String((reps.filter(x=>x.op==='update'&&x.row.html).pop()||{row:{}}).row.html||'');
const doc=await page.evaluate((h)=>{ const d=new DOMParser().parseFromString(h,'text/html');
  const sec=(n)=>{ const hs=[...d.querySelectorAll('h2.sec')]; const h0=hs.find(x=>(x.querySelector('.num')||{}).textContent===String(n)); const out=[]; let e=h0&&h0.nextElementSibling; while(e&&!(e.tagName==='H2'&&e.classList.contains('sec'))){ out.push(e); e=e.nextElementSibling; } return out; };
  const imgsIn=(n)=>sec(n).flatMap(e=>[...e.querySelectorAll('img')]).map(i=>i.getAttribute('src'));
  const textIn=(n)=>sec(n).map(e=>e.textContent).join(' ').replace(/\s+/g,' ');
  const sum=d.querySelector('[data-ai-summary]');
  return { s5:imgsIn(5), s8:imgsIn(8), t5:textIn(5), t8:textIn(8), t9:textIn(9), sum:sum?sum.textContent:'' }; }, html);
need('E  …ph1 in section 5 and ph3 in section 8, unchecked ph2 left out', doc.s5.includes('blob:mock/projects/p1/ph1.jpg') && doc.s8.includes('blob:mock/projects/p1/ph3.jpg') && !html.includes('ph2.jpg'), JSON.stringify({s5:doc.s5,s8:doc.s8}));
need('E  …with the captions and the HIGH / MODERATE tags', doc.t5.includes('Granule loss across the field.') && doc.t5.includes('HIGH') && doc.t8.includes('Stained decking in the attic.') && doc.t8.includes('MODERATE'), doc.t5.slice(0,200));
need('E  …the section write-ups', doc.t5.includes('Granule loss is widespread') && doc.t8.includes('consistent with past leaks'), doc.t8.slice(0,200));
need('E  …the overall condition, and numbered recommendations', doc.sum.startsWith('The roof covering is at the end') && doc.t9.includes('1. Full tear-off') && doc.t9.includes('2. Add ridge vent'), JSON.stringify({sum:doc.sum,t9:doc.t9.slice(0,120)}));
const pw=(await W('projects')).map(x=>x.row).filter(r=>r.checklist).pop()||{};
let ck={}; try{ ck=JSON.parse(pw.checklist); }catch(_){}
need('E  …and the life estimate is in the checklist as an AI estimate', ck.life_left==='AI estimate: About 1–3 years of service life left' && ck.life_by==='ai', ck.life_left);
need('E  …the sheet closed and the editor opened', await page.evaluate(()=>!document.querySelector('#insgSheet.open') && !!document.getElementById('reportFrame')));

await browser.close();
console.log((fails.length?'GATE 1266 RED':'GATE 1266 GREEN')+' — '+passes+' passed, '+fails.length+' failed');
process.exit(fails.length?1:0);
