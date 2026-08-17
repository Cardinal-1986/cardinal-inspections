/* Verifies the S1-Intake audit finding "44 fields, 0 required".
   Counts fields two ways: the driver's way (getComputedStyle(el).display, which
   ignores hidden ANCESTORS) vs. the honest way (offsetParent!==null, which does
   not). Also reports how many essentials carry a visual "*" and whether the
   insurance block is hidden on a retail/default lead. */
import { createRequire } from 'module';
const require=createRequire(import.meta.url);
let chromium; for(const p of ['playwright','/opt/node22/lib/node_modules/playwright/index.js','playwright-core']){try{chromium=require(p).chromium;break;}catch(e){}}
import { readFileSync } from 'fs';
const FILE=process.argv[2]||'/home/user/cardinal-inspections/index.html';
const APP=readFileSync(FILE,'utf8');
const MOCK=readFileSync(new URL('./e2e_mock_supa.js',import.meta.url),'utf8');
const now='2026-08-15T12:00:00Z';
const SEED={team_profiles:[{email:'theo@cardinalrenovations.net',name:'Theo',role:'admin'}],
 projects:[],inspection_reports:[],appointments:[],estimates:[],insurance_claims:[],punch_items:[],crews:[],crew_work_orders:[],crew_rates:[],pricing_items:[],collections:[],contracts:[],project_photos:[]};
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
const page=await (await b.newContext({viewport:{width:390,height:844}})).newPage();
await page.route('**/*',async r=>{const u=r.request().url(),t=r.request().resourceType();
 if(u.endsWith('.com/')||u.endsWith('index.html'))return r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:APP});
 if(u.includes('supabase-js'))return r.fulfill({status:200,contentType:'application/javascript',body:MOCK});
 if(u.includes('chart')||u.includes('papa')||u.includes('leaflet')||u.includes('xlsx'))return r.fulfill({status:200,contentType:'application/javascript',body:'window.Chart=function(){this.destroy=()=>{};this.update=()=>{};};window.Papa={parse:()=>({data:[]}),unparse:()=>""};window.L={};'});
 if(u.includes('/api/'))return r.fulfill({status:200,contentType:'application/json',body:'{}'});
 if(t==='image'||t==='font'||t==='media'||t==='stylesheet')return r.abort();
 if(u.startsWith('https://app.cardinalroster.com/'))return r.fulfill({status:200,body:''});
 return r.abort();});
await page.addInitScript(s=>{window.__SEED__=s;},SEED); await page.addInitScript(MOCK);
await page.goto('https://app.cardinalroster.com/',{waitUntil:'domcontentloaded'});
await page.waitForFunction(()=>typeof openLeadForm==='function'&&window.supabase,{timeout:20000});
const out=await page.evaluate(async()=>{
 window.currentUser={email:'theo@cardinalrenovations.net'};
 try{await reload();}catch(e){}
 openLeadForm();
 await new Promise(r=>setTimeout(r,300));
 const m=document.getElementById('leadFormModal');
 const all=[...m.querySelectorAll('input,select,textarea')].filter(el=>el.type!=='hidden');
 // driver's flawed method
 const driverVisible=all.filter(el=>getComputedStyle(el).display!=='none');
 // honest method
 const trulyVisible=all.filter(el=>el.offsetParent!==null);
 // essentials carrying a "*" in their label text
 const starred=trulyVisible.filter(el=>{ const l=el.closest('label'); return l && /\*/.test(l.textContent); });
 const insBox=document.getElementById('ldInsBox');
 const insHidden=!insBox || getComputedStyle(insBox).display==='none';
 // reveal the "More detail" expander and re-count
 const mb=document.getElementById('ldMoreBtn'); if(mb) mb.click();
 await new Promise(r=>setTimeout(r,200));
 const expandedVisible=all.filter(el=>el.offsetParent!==null).length;
 return { driverCount:driverVisible.length, trulyVisibleCount:trulyVisible.length,
   starredCount:starred.length, insHiddenOnDefault:insHidden, expandedVisible };
});
console.log(FILE.split('/').pop(), JSON.stringify(out,null,0));
console.log(`  driver counted ${out.driverCount} "visible" (ignores hidden ancestors)`);
console.log(`  actually visible on open: ${out.trulyVisibleCount}, of which ${out.starredCount} starred required`);
console.log(`  insurance block hidden on default/retail lead: ${out.insHiddenOnDefault}`);
console.log(`  after "More detail" expander: ${out.expandedVisible} visible`);
const ok = out.trulyVisibleCount < 20 && out.starredCount >= 4 && out.insHiddenOnDefault;
console.log(ok?'  RESULT: progressive disclosure + required markers already in place (audit finding = census artifact)':'  RESULT: genuine gap');
process.exitCode=ok?0:1;
await b.close();
