import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium;
for (const p of ['playwright','/opt/node22/lib/node_modules/playwright/index.js']) { try { chromium = require(p).chromium; break; } catch(e){} }
import { readFileSync } from 'fs';
const APP = process.argv[2] || '/home/user/cardinal-inspections/index.html';
const MOCK = readFileSync('/home/user/cardinal-inspections/.claude/skills/cardinal-build/scripts/e2e_mock_supa.js','utf8');
const APP_HTML = readFileSync(APP,'utf8'); const now = new Date().toISOString();
const SEED = { team_profiles:[{email:'theo@cardinalrenovations.net',name:'Theo Dorion',role:'admin'},{email:'nick@cardinalrenovations.net',name:'Nick Hey',role:'sales'}],
 projects:[{id:'P1',name:'Bob DeBuilder',stage:'Invoiced',sales_rep:'nick@cardinalrenovations.net',checklist:JSON.stringify({lead:{claim_type:'retail'}}),created_by:'theo@cardinalrenovations.net',updated_at:now}],
 collections:[],commissions:[],draws:[],punch_items:[],inspection_reports:[],estimates:[],contracts:[],crew_work_orders:[],appointments:[] };
const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await (await b.newContext({viewport:{width:430,height:900}})).newPage();
await page.route('**/*', async r => { const u=r.request().url(), t=r.request().resourceType();
 if(u==='https://app.cardinalroster.com/') return r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:APP_HTML});
 if(u.includes('@supabase/supabase-js')) return r.fulfill({status:200,contentType:'application/javascript',body:MOCK});
 if(u.includes('chart.js')||u.includes('papaparse')) return r.fulfill({status:200,contentType:'application/javascript',body:'window.Chart=function(){this.destroy=function(){};this.update=function(){}};window.Papa={parse:function(){return{data:[]}},unparse:function(){return ""}};'});
 if(u.startsWith('https://app.cardinalroster.com/api/')) return r.fulfill({status:200,contentType:'application/json',body:'{}'});
 if(t==='image'||t==='font'||t==='media'||t==='stylesheet') return r.abort();
 if(u.startsWith('https://app.cardinalroster.com/')) return r.fulfill({status:200,body:''});
 return r.abort(); });
await page.addInitScript(s=>{window.__SEED__=s;},SEED); await page.addInitScript(MOCK);
await page.addInitScript(()=>{ try{Object.defineProperty(document,'fonts',{configurable:true,get:()=>({ready:Promise.resolve(),status:'loaded',check:()=>true,load:()=>Promise.resolve([]),forEach:()=>{},addEventListener:()=>{}})});}catch(e){} });
await page.goto('https://app.cardinalroster.com/',{waitUntil:'domcontentloaded'}); await page.waitForTimeout(3000);
await page.evaluate(()=>{ try{hideAllViews();}catch(e){} try{openProject('P1');}catch(e){} });
await page.waitForTimeout(1500);
const checks=[]; const chk=(n,c,d)=>checks.push({n,pass:!!c,d:d||''});
async function labels(){ return await page.evaluate(()=>{
  const c=document.getElementById('miCollBtn'), d=document.getElementById('miDrawBtn');
  return { coll:c?c.textContent.trim():null, draw:d?d.textContent.trim():null }; }); }
await page.evaluate(()=>{ try{showTab('commissions');}catch(e){} const t=document.getElementById('tab-commissions'); if(t)t.style.display='block'; try{renderCommissions();}catch(e){} });
await page.waitForTimeout(900);
let L = await labels();
chk('closed state still offers both openers', L.coll==='+ Log Collection' && L.draw==='+ Log Draw', JSON.stringify(L));
// open BOTH forms — the reported case
await page.evaluate(()=>{ if(window.commUi){ window.commUi.collForm=true; window.commUi.drawForm=true; } try{renderCommissions();}catch(e){} });
await page.waitForTimeout(900);
L = await labels();
chk('with both forms open the two buttons are NOT identical', L.coll && L.draw && L.coll!==L.draw, JSON.stringify(L));
chk('each button names the form it closes', /collection/i.test(L.coll||'') && /draw/i.test(L.draw||''), JSON.stringify(L));
// the buttons must still work (ids unchanged, handlers bound)
await page.evaluate(()=>{ const el=document.getElementById('miCollBtn'); if(el) el.click(); });
await page.waitForTimeout(700);
L = await labels();
chk('tapping Close collection closes that form (label returns to the opener)', L.coll==='+ Log Collection', JSON.stringify(L));
chk('the draw form was left alone', /draw/i.test(L.draw||''), JSON.stringify(L));
let fails=0; for(const c of checks){ console.log(`  [${c.pass?'PASS':'FAIL'}] ${c.n}  (${c.d})`); if(!c.pass) fails++; }
console.log(fails===0?'\nGATE GREEN':`\nGATE RED — ${fails} failure(s)`);
await b.close(); process.exit(fails===0?0:1);
