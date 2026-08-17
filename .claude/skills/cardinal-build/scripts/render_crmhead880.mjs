import { createRequire } from 'module';
const require=createRequire(import.meta.url);
let chromium; for(const p of ['playwright','/opt/node22/lib/node_modules/playwright/index.js','playwright-core']){try{chromium=require(p).chromium;break;}catch(e){}}
import { readFileSync } from 'fs';
const FILE=process.argv[2];
const APP=readFileSync(FILE,'utf8');
const MOCK=readFileSync(new URL('./e2e_mock_supa.js',import.meta.url),'utf8');
const now='2026-08-15T12:00:00Z';
// retail/lead client with BLANK claim_type (the bug trigger)
const SEED={team_profiles:[{email:'theo@cardinalrenovations.net',name:'Theo',role:'admin'}],
 projects:[{id:'pR',name:'Test Retail Lead',address:'1 Main St Dayton OH',stage:'Lead',checklist:'{}',created_by:'theo@cardinalrenovations.net',created_at:now,updated_at:now,stage_since:now},
   {id:'pI',name:'Adam Gunn Insurance',address:'5 Pine Rd',stage:'Scheduled',checklist:JSON.stringify({lead:{claim_type:'insurance'}}),created_by:'theo@cardinalrenovations.net',created_at:now,updated_at:now,stage_since:now}],
 inspection_reports:[],appointments:[],estimates:[],insurance_claims:[],punch_items:[],crews:[],crew_work_orders:[],crew_rates:[],pricing_items:[],collections:[],contracts:[],project_photos:[],community_partners:[]};
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
const page=await (await b.newContext({viewport:{width:1194,height:834}})).newPage();
await page.route('**/*',async r=>{const u=r.request().url(),t=r.request().resourceType();
 if(u.endsWith('.com/')||u.endsWith('index.html'))return r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:APP});
 if(u.includes('supabase-js'))return r.fulfill({status:200,contentType:'application/javascript',body:MOCK});
 if(u.includes('chart')||u.includes('papa')||u.includes('leaflet')||u.includes('xlsx'))return r.fulfill({status:200,contentType:'application/javascript',body:'window.Chart=function(){this.destroy=()=>{};this.update=()=>{};};window.Papa={parse:()=>({data:[]}),unparse:()=>""};window.L={};'});
 if(u.includes('/api/'))return r.fulfill({status:200,contentType:'application/json',body:'{}'});
 if(t==='image'||t==='font'||t==='media'||t==='stylesheet')return r.abort();
 if(u.startsWith('https://app.cardinalroster.com/'))return r.fulfill({status:200,body:''});
 return r.abort();});
// seed sticky portal = insurance BEFORE app boots
await page.addInitScript(()=>{ try{ localStorage.setItem('cardinal.portal','insurance'); }catch(e){} });
await page.addInitScript(s=>{window.__SEED__=s;},SEED); await page.addInitScript(MOCK);
await page.goto('https://app.cardinalroster.com/',{waitUntil:'domcontentloaded'});
await page.waitForFunction(()=>typeof openProject==='function'&&typeof showMain==='function'&&window.supabase,{timeout:20000});
const out=await page.evaluate(async()=>{
 window.currentUser={email:'theo@cardinalrenovations.net'};
 try{ localStorage.setItem('cardinal.portal.theo@cardinalrenovations.net','insurance'); }catch(e){}
 try{await reload();}catch(e){}
 try{showMain('theo@cardinalrenovations.net');}catch(e){}
 const res={};
 // open the RETAIL lead client
 try{ await openProject('pR'); }catch(e){ return 'openProject threw '+e.message; }
 await new Promise(r=>setTimeout(r,500));
 try{ if(typeof skin==='function') skin(); }catch(e){}
 res.sticky = (window.CardinalPortal&&window.CardinalPortal.get)?window.CardinalPortal.get():'?';
 res.projopen = document.body.classList.contains('projopen');
 res.retailClient_crmHead = document.body.dataset.crmHead;
 res.retailClient_title = (document.getElementById('brandTitle')||{}).textContent||'';
 // now open the INSURANCE client — should be insurance
 try{ await openProject('pI'); }catch(e){}
 await new Promise(r=>setTimeout(r,500));
 try{ if(typeof skin==='function') skin(); }catch(e){}
 res.insClient_crmHead = document.body.dataset.crmHead;
 return res;
});
console.log(FILE.split('/').pop());
console.log(JSON.stringify(out,null,1));
if(typeof out==='object'){
  const ok = out.retailClient_crmHead==='retail' && out.insClient_crmHead==='insurance';
  console.log(ok?'  PASS: retail client -> retail header, insurance client -> insurance header':'  FAIL: retail client header = '+out.retailClient_crmHead+' (sticky='+out.sticky+')');
  process.exitCode = ok?0:1;
}
await b.close();
