/* 887: signature picker is tapped buttons, not prompt("type 1/2/3").
   Opens a contract doc with buyer+contractor signature slots, clicks Sign,
   asserts a chooser overlay with a [data-who="buyer"] button appears and that
   picking it opens the pad with __sigWho=buyer. If the page ever fell back to a
   native prompt, page.on('dialog') would fire — we fail if it does.
   Negative control: pre-887 fires a prompt dialog instead. */
import { createRequire } from 'module';
const require=createRequire(import.meta.url);
let chromium; for(const p of ['playwright','/opt/node22/lib/node_modules/playwright/index.js','playwright-core']){try{chromium=require(p).chromium;break;}catch(e){}}
import { readFileSync } from 'fs';
const FILE=process.argv[2]||'/home/user/cardinal-inspections/index.html';
const APP=readFileSync(FILE,'utf8');
const MOCK=readFileSync(new URL('./e2e_mock_supa.js',import.meta.url),'utf8');
const now='2026-08-16T10:00:00Z';
const DOCHTML='<html><body><div class="sign"><span data-sig="buyer"></span><span data-sigdate="buyer"></span><span data-sig="contractor"></span><span data-sigdate="contractor"></span></div></body></html>';
const SEED={team_profiles:[{email:'theo@cardinalrenovations.net',name:'Theo',role:'admin'}],
 projects:[{id:'p1',name:'Karen Duffy',address:'1 Test Way',stage:'Approved',claim_type:'retail',checklist:JSON.stringify({stage_since:now}),created_by:'theo@cardinalrenovations.net',created_at:now,updated_at:now}],
 inspection_reports:[{id:'c1',title:'Contract — Roofing — Karen',project_id:'p1',status:'sent',sent_at:now,signed_at:null,created_at:now,updated_at:now,html:DOCHTML}],
 appointments:[],estimates:[],insurance_claims:[],punch_items:[],crews:[],crew_work_orders:[],crew_rates:[],pricing_items:[],collections:[],contracts:[],project_photos:[]};
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
const page=await (await b.newContext({viewport:{width:390,height:844}})).newPage();
let dialogFired=false;
page.on('dialog',async d=>{ dialogFired=true; try{await d.dismiss();}catch(e){} });
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
await page.waitForFunction(()=>typeof openEditor==='function'&&window.supabase,{timeout:20000});
const out=await page.evaluate(async()=>{
 window.currentUser={email:'theo@cardinalrenovations.net'};
 try{await reload();}catch(e){}
 try{await openEditor('c1');}catch(e){return {err:'openEditor '+e.message};}
 await new Promise(r=>setTimeout(r,600));   // let the iframe srcdoc load
 document.getElementById('sigBtn').click();
 await new Promise(r=>setTimeout(r,250));
 const buyerBtn=document.querySelector('[data-who="buyer"]');
 const hasChooser=!!buyerBtn;
 const hasContractor=!!document.querySelector('[data-who="contractor"]');
 // pick buyer
 if(buyerBtn) buyerBtn.click();
 await new Promise(r=>setTimeout(r,150));
 const sigVisible=getComputedStyle(document.getElementById('sigModal')).display!=='none';
 const who=window.__sigWho;
 return { hasChooser, hasContractor, sigVisible, who };
});
console.log(FILE.split('/').pop(), JSON.stringify({...out, dialogFired}));
const ok = !dialogFired && out.hasChooser && out.hasContractor && out.sigVisible && out.who==='buyer';
console.log(ok?'  PASS: tapped chooser (buyer/contractor), no native prompt; pad opens with __sigWho=buyer':'  FAIL');
process.exitCode=ok?0:1;
await b.close();
