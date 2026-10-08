/* gate_1263.mjs — Leads & Jobs opens Newest first, and can go Oldest first.
   Seeds three leads with known created_at, opens the Leads circle, reads the
   card order. usage: node gate_1263.mjs [file.html] — RED on 1262 */
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
setTimeout(()=>{ console.log('GATE TIMEOUT'); process.exit(3); }, 120000).unref();
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
const p=await b.newPage({viewport:{width:390,height:844}});
await p.route('**/*', r=>{const u=r.request().url(); return u.startsWith('https://sentinel.test/')?r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:APP}):r.fulfill({status:200,body:''});});
await p.addInitScript(SETUP);
await p.addInitScript(()=>{ const S=window.__SEED__; if(!S) return;
  const ck=JSON.stringify({ lead:{ assigned:[], claim_type:'retail' } });
  [['n1','Old Lead','2026-08-01T10:00:00Z','2026-10-07T10:00:00Z'],['n2','Newest Lead','2026-10-07T10:00:00Z','2026-10-01T10:00:00Z'],['n3','Middle Lead','2026-09-10T10:00:00Z','2026-09-20T10:00:00Z']]
    .forEach(([id,name,c,ss])=>S.projects.push({id,name,stage:'Lead',crm:'retail',created_by:'theo@cardinalrenovations.net',created_at:c,updated_at:c,stage_since:ss,checklist:JSON.stringify({lead:{assigned:[],claim_type:'retail'},stage_since:ss})})); });
await p.goto('https://sentinel.test/',{waitUntil:'domcontentloaded'}); await p.waitForTimeout(1800);
const order=()=>p.evaluate(()=>{ const t=document.getElementById('leadsView').textContent; return ['Newest Lead','Middle Lead','Old Lead'].map(n=>[n,t.indexOf(n)]).filter(x=>x[1]>=0).sort((a,b)=>a[1]-b[1]).map(x=>x[0]); });
await p.evaluate(()=>{ ['landingView','loginView'].forEach(id=>{const e=document.getElementById(id); if(e) e.style.display='none';}); openLeadsView('Lead'); });
await p.waitForTimeout(800);
const o1=await order();
need('opening Leads lists newest first', JSON.stringify(o1)===JSON.stringify(['Newest Lead','Middle Lead','Old Lead']), JSON.stringify(o1));
need('the sort chip says Newest first', await p.evaluate(()=>document.getElementById('ljSortChip').textContent.trim()==='Newest first'));
const opts=await p.evaluate(()=>[...document.querySelectorAll('#ljSortList [data-sort]')].map(e=>e.getAttribute('data-sort')));
need('Sort by offers Newest first and Oldest first', opts.includes('newest') && opts.includes('oldest'), JSON.stringify(opts));
await p.evaluate(()=>{ const r=document.querySelector('#ljSortList [data-sort="oldest"]'); if(r) r.click(); });
await p.waitForTimeout(500);
const o2=await order();
need('Oldest first reverses it', JSON.stringify(o2)===JSON.stringify(['Old Lead','Middle Lead','Newest Lead']), JSON.stringify(o2));
await p.evaluate(()=>{ const r=document.querySelector('#ljSortList [data-sort="status"]'); if(r) r.click(); });
await p.waitForTimeout(500);
need('Age in Status still works (oldest stage_since first)', (await order())[0]==='Middle Lead', JSON.stringify(await order()));
await b.close();
console.log((fails.length?'GATE 1263 RED':'GATE 1263 GREEN')+' — '+passes+' passed, '+fails.length+' failed');
process.exit(fails.length?1:0);
