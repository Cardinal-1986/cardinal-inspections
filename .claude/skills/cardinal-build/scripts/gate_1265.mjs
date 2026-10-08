/* gate_1265.mjs — New inspection report, guided (step 1). Theo, 8 Oct.
   Real Chromium, signed in as nick, on Mark Diamond (p1).
     A  Inspections has ONE "+ New inspection report"; it opens a LIGHT sheet
        offering General inspection + Roof, Siding, Gutters, Fascia, Soffit,
        Windows, Doors
     B  Next with nothing checked refuses
     C  Roof + Gutters → one checklist: the roof's dropdowns (decking type,
        current ventilation, intake type, blocked, life expectancy) and a
        Gutters card; nothing for the unchecked trades
     D  Save with roof answers missing refuses and writes nothing
     E  filled in: intake "None" hides "blocked"; life expectancy is worked
        out; Save writes the roof answers INTO THE SAME checklist keys
        (structure, decking, pitch, stories, soffit derived "No"), the gutter
        rating into general.gutters, then a ROOF report whose Structure reads
        "Single Family · 2 stories" and whose Age carries the life expectancy
     F  General only → Skip checklist → an EXTERIOR report, no checklist write
   usage: node gate_1265.mjs [file.html] — RED on 1264, never a crash
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

const browser=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:390,height:844}});
page.on('dialog', d=>d.accept());
await page.route('**/*', async r=>{const u=r.request().url();
  if(u.startsWith('https://sentinel.test/')) return r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:APP});
  return r.fulfill({status:200,body:''});});
await page.addInitScript(SETUP);
await page.goto('https://sentinel.test/?as=nick',{waitUntil:'domcontentloaded'});
await page.waitForTimeout(1800);
await page.evaluate(()=>{ ['landingView','loginView'].forEach(id=>{const e=document.getElementById(id); if(e) e.style.display='none';}); location.hash='#p/p1'; });
await page.waitForTimeout(1800);
await page.evaluate(()=>{ try{ showTab('inspections'); }catch(_){} });
await page.waitForTimeout(400);
const mark=()=>page.evaluate(()=>{ window.__WRITES__=[]; });
const W=(t)=>page.evaluate((t)=>(window.__WRITES__||[]).filter(x=>x.table===t&&x.op!=='select'&&x.payload).map(x=>({op:x.op,row:Array.isArray(x.payload)?x.payload[0]:x.payload})),t);
const err=()=>page.evaluate(()=>(document.getElementById('insgErr')||{}).textContent||'');
const click=(sel)=>page.evaluate((sel)=>{ const b=document.querySelector(sel); if(b){ b.click(); return true; } return false; },sel);

/* A */
const a=await page.evaluate(()=>{
  const btns=[...document.querySelectorAll('#tab-inspections button')].map(b=>b.textContent.trim()).filter(t=>/^\+ New/.test(t));
  const b=document.getElementById('pNewReportBtn'); if(b) b.click();
  const s=document.getElementById('insgSheet');
  return { btns, open:!!(s&&s.classList.contains('open')), bg:s?getComputedStyle(s).backgroundColor:'',
    boxes:s?[...s.querySelectorAll('.ig-tbox')].map(l=>{ const c=l.cloneNode(true); c.querySelectorAll('small').forEach(x=>x.remove()); return c.textContent.replace(/\s+/g,' ').trim(); }):[] }; });
need('A  one "+ New" button on Inspections, and it opens the guide', !!a && a.btns.length===1 && a.open, JSON.stringify(a));
need('A  …a LIGHT sheet', a.bg==='rgb(244, 244, 246)', a.bg);
need('A  …offering General inspection and the seven trades', JSON.stringify(a.boxes)===JSON.stringify(['General inspection','Roof','Siding','Gutters','Fascia','Soffit','Windows','Doors']), JSON.stringify(a.boxes));

/* B */
await page.evaluate(()=>{ document.querySelectorAll('#insgSheet input[type=checkbox]').forEach(c=>{ if(c.checked){ c.checked=false; c.dispatchEvent(new Event('change',{bubbles:true})); } }); });
await click('#insgSheet [data-ig="next"]');
need('B  Next with nothing checked refuses', /at least one/i.test(await err()) && await page.evaluate(()=>!!document.querySelector('#insgSheet [data-gen]')), await err());

/* C */
await page.evaluate(()=>{ ['Roof','Gutters'].forEach(t=>{ const c=document.querySelector('#insgSheet [data-t="'+t+'"]'); if(!c) return; c.checked=true; c.dispatchEvent(new Event('change',{bubbles:true})); }); });
await click('#insgSheet [data-ig="next"]');
const c=await page.evaluate(()=>({ cards:[...document.querySelectorAll('#insgSheet .ig-card h3')].map(h=>h.textContent),
  have:['decking','vent_types','intake_types','baffles','life_by','stories','residential','pitch'].filter(k=>document.getElementById('insg_'+k)),
  selects:document.querySelectorAll('#insgSheet .ig-card select').length,
  buttons:document.querySelectorAll('#insgSheet .ig-card button').length }));
need('C  one checklist: Roof and Gutters only', JSON.stringify(c.cards)===JSON.stringify(['Roof','Gutters']), JSON.stringify(c.cards));
need('C  …roof has decking type, ventilation, intake type, blocked, life expectancy, stories, residential, pitch', c.have.length===8, JSON.stringify(c.have));
need('C  …as dropdowns, not rows of buttons', c.selects>=17 && c.buttons===0, JSON.stringify(c));

/* D */
await mark();
await click('#insgSheet [data-ig="save"]');
await page.waitForTimeout(300);
need('D  missing roof answers: it says which, and writes nothing', /Still needed for the roof/.test(await err()) && (await W('projects')).length===0, await err());

/* E */
await page.evaluate(()=>{
  const set=(k,v)=>{ const e=document.getElementById('insg_'+k); if(!e) return; e.value=v; e.dispatchEvent(new Event('change',{bubbles:true})); };
  set('method','Visual, non-invasive; roof surface accessed directly'); set('structure','Single Family'); set('stories','2');
  set('rooftype','Asphalt shingle'); set('layers','1 Layer'); set('decking','Plywood'); set('pitch','6/12'); set('age','18');
  set('condition','Fair'); set('attic','Yes'); try{ set('general_gutters', GC_OPTS[2]); }catch(_){} set('insp_gutter_size','5"');
  const it=document.getElementById('insg_intake_types'); if(it) [...it.options].forEach(o=>o.selected=(o.value==='None')); if(it) it.dispatchEvent(new Event('change',{bubbles:true}));
});
const e1=await page.evaluate(()=>{ const b=document.querySelector('#insgSheet [data-f="baffles"]'); return { blk:b?getComputedStyle(b).display:'missing', life:(document.getElementById('insgLife')||{}).textContent||'' }; });
need('E  intake "None" hides "is the intake blocked?"', e1.blk==='none', e1.blk);
need('E  life expectancy is worked out (asphalt, 18 yrs, Fair → about 2–5 years)', /About 2–5 years of service life left/.test(e1.life), e1.life);
await mark();
await click('#insgSheet [data-ig="save"]');
await page.waitForTimeout(2500);
const pw=(await W('projects')).map(x=>x.row).find(r=>r.checklist);
let ck={}; try{ ck=JSON.parse(pw.checklist); }catch(_){}
need('E  saved into the SAME checklist keys', ck.structure==='Single Family' && ck.decking==='Plywood' && ck.pitch==='6/12' && ck.age==='18' && ck.stories==='2' && !!ck.completed_at, JSON.stringify({s:ck.structure,d:ck.decking,p:ck.pitch,a:ck.age,st:ck.stories}));
need('E  …intake None → soffit "No", so the existing findings rule still fires', ck.intake_types==='None' && ck.soffit==='No', JSON.stringify({it:ck.intake_types,so:ck.soffit}));
need('E  …gutters rated into general.gutters; insp remembers Roof + Gutters', ck.general && ck.general.gutters===await page.evaluate(()=>{ try{ return GC_OPTS[2]; }catch(_){ return '?'; } }) && JSON.stringify((ck.insp||{}).types)==='["Roof","Gutters"]', JSON.stringify({g:ck.general,i:ck.insp}));
const rep=(await W('inspection_reports')).filter(x=>x.op==='insert').map(x=>x.row)[0]||{};
const html=String(rep.html||'');
need('E  …then a ROOF report', /Roof Inspection Report/.test(html), String(rep.title||'none'));
/* the template's placeholders carry title= attributes, so the fill happens in
   the LIVE editor document (resyncChecklist, 1069) — read it there. */
await page.waitForTimeout(1200);
const live=await page.evaluate(()=>{ const f=document.getElementById('reportFrame'); const d=f&&f.contentDocument; return d?d.body.textContent.replace(/\s+/g,' '):''; });
need('E  …the open report reads "Single Family · 2 stories" and its Age carries the life expectancy', live.includes('Single Family \u00B7 2 stories') && live.includes('18 years (estimated) \u00B7 About 2\u20135 years of service life left'), (live.match(/Structure.{0,50}/)||[''])[0]+' | '+(live.match(/Estimated Roof Age.{0,70}/)||[''])[0]);
need('E  …and the sheet is closed', await page.evaluate(()=>!document.querySelector('#insgSheet.open')));

/* F */
await page.evaluate(async()=>{ try{ await closeEditor(); }catch(_){} try{ showTab('inspections'); }catch(_){} });
await page.waitForTimeout(700);
await mark();
await page.evaluate(()=>{ const b=document.getElementById('pNewReportBtn'); if(b) b.click();
  document.querySelectorAll('#insgSheet input[type=checkbox]').forEach(c=>{ c.checked = !!c.getAttribute('data-gen'); c.dispatchEvent(new Event('change',{bubbles:true})); }); });
await click('#insgSheet [data-ig="next"]');
const gcard=await page.evaluate(()=>[...document.querySelectorAll('#insgSheet .ig-card h3')].map(h=>h.textContent));
need('F  General only → a General inspection card rating seven parts, Doors included', JSON.stringify(gcard)==='["General inspection"]' && await page.evaluate(()=>document.querySelectorAll('#insgSheet .ig-card select').length===7 && !!document.getElementById('insg_general_doors')), JSON.stringify(gcard));
await click('#insgSheet [data-ig="skip"]');
await page.waitForTimeout(2500);
const rep2=(await W('inspection_reports')).filter(x=>x.op==='insert').map(x=>x.row)[0]||{};
need('F  Skip checklist → an EXTERIOR report, and no checklist write', /Exterior Inspection Report/.test(String(rep2.html||'')) && (await W('projects')).filter(x=>x.row.checklist).length===0, String(rep2.title||'none'));

await browser.close();
console.log((fails.length?'GATE 1265 RED':'GATE 1265 GREEN')+' — '+passes+' passed, '+fails.length+' failed');
process.exit(fails.length?1:0);
