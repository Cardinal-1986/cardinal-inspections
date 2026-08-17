/* 886: the outbound crew work order shows on the Community black card.
   Seeds a community project + a crew WO doc (inspection_reports) + its
   crew_work_orders dispatch row; opens the project; asserts #cr-cc-wo lists the
   WO with a Dispatched chip. Negative control: pre-886 renders no crew rows. */
import { createRequire } from 'module';
const require=createRequire(import.meta.url);
let chromium; for(const p of ['playwright','/opt/node22/lib/node_modules/playwright/index.js','playwright-core']){try{chromium=require(p).chromium;break;}catch(e){}}
import { readFileSync } from 'fs';
const FILE=process.argv[2]||'/home/user/cardinal-inspections/index.html';
const APP=readFileSync(FILE,'utf8');
const MOCK=readFileSync(new URL('./e2e_mock_supa.js',import.meta.url),'utf8');
const now='2026-08-16T10:00:00Z';
const ck=JSON.stringify({stage_since:now, lead:{claim_type:'community', partner_name:'Habitat For Humanity'}});
const SEED={team_profiles:[{email:'theo@cardinalrenovations.net',name:'Theo',role:'admin'}],
 projects:[{id:'pc1',name:'Community House',address:'5 Elm St, Dayton OH',stage:'Approved',claim_type:'community',checklist:ck,created_by:'theo@cardinalrenovations.net',created_at:now,updated_at:now}],
 inspection_reports:[{id:'wo1',title:'Work Order — Roofing — Ace Crew',project_id:'pc1',status:'sent',sent_at:now,signed_at:null,created_at:now,updated_at:now,html:'<html></html>'}],
 crew_work_orders:[{id:'cwo1',report_id:'wo1',status:'sent',sent_at:now,completed_on:null}],
 appointments:[],estimates:[],insurance_claims:[],punch_items:[],crews:[],crew_rates:[],pricing_items:[],collections:[],contracts:[],project_photos:[],community_partners:[]};
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
const page=await (await b.newContext({viewport:{width:390,height:844}})).newPage();
await page.route('**/*',async r=>{const u=r.request().url(),t=r.request().resourceType();
 if(u.endsWith('.com/')||u.endsWith('index.html'))return r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:APP});
 if(u.includes('supabase-js'))return r.fulfill({status:200,contentType:'application/javascript',body:MOCK});
 if(u.includes('chart')||u.includes('papa')||u.includes('leaflet')||u.includes('xlsx'))return r.fulfill({status:200,contentType:'application/javascript',body:'window.Chart=function(){this.destroy=()=>{};this.update=()=>{};};window.Papa={parse:()=>({data:[]}),unparse:()=>""};window.L={tileLayer:()=>({addTo:()=>{}}),map:()=>({setView:()=>({}),remove:()=>{}}),marker:()=>({addTo:()=>({})})};'});
 if(u.includes('/api/'))return r.fulfill({status:200,contentType:'application/json',body:'{}'});
 if(t==='image'||t==='font'||t==='media'||t==='stylesheet')return r.abort();
 if(u.startsWith('https://app.cardinalroster.com/'))return r.fulfill({status:200,body:''});
 return r.abort();});
await page.addInitScript(s=>{window.__SEED__=s;},SEED); await page.addInitScript(MOCK);
await page.goto('https://app.cardinalroster.com/',{waitUntil:'domcontentloaded'});
await page.waitForFunction(()=>typeof openProject==='function'&&window.supabase,{timeout:20000});
const out=await page.evaluate(async()=>{
 window.currentUser={email:'theo@cardinalrenovations.net'}; window.confirm=()=>true; window.alert=()=>{};
 try{await reload();}catch(e){}
 try{await openProject('pc1');}catch(e){return {err:'openProject '+e.message};}
 // give the community render loop time to take over and run woSync
 await new Promise(r=>setTimeout(r,1800));
 const box=document.getElementById('cr-cc-wo');
 const head=document.getElementById('cr-cc-wo-h');
 const inCc=document.body.classList.contains('cr-cc-open');
 const html=box?box.innerHTML:'(no box)';
 return {
   inCc,
   headVisible: head ? getComputedStyle(head).display!=='none' : false,
   boxVisible: box ? getComputedStyle(box).display!=='none' : false,
   hasCrewList: /cc-wo-crew/.test(html),
   hasTitle: /Work Order — Roofing — Ace Crew/.test(html),
   hasDispatched: /ccwo-st disp">Dispatched/.test(html),
   hasManageBtn: /data-cc-wo-manage/.test(html)
 };
});
console.log(FILE.split('/').pop(), JSON.stringify(out));
const ok = out.inCc && out.headVisible && out.boxVisible && out.hasCrewList && out.hasTitle && out.hasDispatched && out.hasManageBtn;
console.log(ok?'  PASS: community card lists the crew work order (Dispatched) with a tap-through':'  FAIL');
process.exitCode=ok?0:1;
await b.close();
