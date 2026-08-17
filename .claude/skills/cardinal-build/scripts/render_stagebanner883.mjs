import { createRequire } from 'module';
const require=createRequire(import.meta.url);
let chromium; for(const p of ['playwright','/opt/node22/lib/node_modules/playwright/index.js','playwright-core']){try{chromium=require(p).chromium;break;}catch(e){}}
import { readFileSync } from 'fs';
const FILE=process.argv[2]||'/home/user/cardinal-inspections/index.html';
const APP=readFileSync(FILE,'utf8');
const MOCK=readFileSync(new URL('./e2e_mock_supa.js',import.meta.url),'utf8');
const now='2026-08-15T12:00:00Z';
const SEED={team_profiles:[{email:'theo@cardinalrenovations.net',name:'Theo',role:'admin'}],
 projects:[{id:'p1',name:'Karen Duffy',address:'1 Test Way, Dayton OH',stage:'Lead',claim_type:'retail',checklist:JSON.stringify({stage_since:now}),created_by:'theo@cardinalrenovations.net',created_at:now,updated_at:now}],
 inspection_reports:[],appointments:[],estimates:[],insurance_claims:[],punch_items:[],crews:[],crew_work_orders:[],crew_rates:[],pricing_items:[],collections:[],contracts:[],project_photos:[]};
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
await page.waitForFunction(()=>typeof openProject==='function'&&window.supabase,{timeout:20000});
const out=await page.evaluate(async()=>{
 window.currentUser={email:'theo@cardinalrenovations.net'}; window.confirm=()=>true; window.alert=()=>{}; window.prompt=()=>'';
 try{await reload();}catch(e){}
 try{await openProject('p1');}catch(e){return 'openProject threw '+e.message;}
 await new Promise(r=>setTimeout(r,400));
 const bannerStage=()=>{ const el=document.querySelector('.dbstgmid b'); return el?el.textContent.trim():'(no banner)'; };
 const before=bannerStage();
 const btn=document.getElementById('contactedBtn');
 const btnVisible=btn && btn.offsetParent!==null;
 if(btn) btn.click();
 await new Promise(r=>setTimeout(r,500));
 const after=bannerStage();
 return { before, after, btnVisible, stage: (window.currentProject||{}).stage };
},);
console.log(FILE.split('/').pop(), JSON.stringify(out));
const ok = out.before==='LEAD' && out.after==='PROSPECT';
console.log(ok?'  PASS: banner LEAD -> PROSPECT immediately':'  FAIL: banner stayed '+out.after);
process.exitCode=ok?0:1;
await b.close();
