import { createRequire } from 'module';
const require=createRequire(import.meta.url);
let chromium; for(const p of ['playwright','/opt/node22/lib/node_modules/playwright/index.js','playwright-core']){try{chromium=require(p).chromium;break;}catch(e){}}
import { readFileSync } from 'fs';
const FILE=process.argv[2]||'/home/user/cardinal-inspections/index.html';
const APP=readFileSync(FILE,'utf8');
const MOCK=readFileSync(new URL('./e2e_mock_supa.js',import.meta.url),'utf8');
const now='2026-08-15T12:00:00Z';
const SEED={team_profiles:[{email:'theo@cardinalrenovations.net',name:'Theo',role:'admin'}],
 projects:[{id:'p1',name:'Karen Duffy',address:'1 Test Way, Dayton OH',stage:'Lead',claim_type:'retail',checklist:'{}',created_by:'theo@cardinalrenovations.net',created_at:now,updated_at:now,stage_since:now}],
 punch_items:[],inspection_reports:[],appointments:[],estimates:[],insurance_claims:[],crews:[],crew_work_orders:[],crew_rates:[],pricing_items:[],collections:[],contracts:[],project_photos:[]};
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
await page.waitForFunction(()=>window.CardinalProduction&&window.CardinalProduction.addFor&&window.supabase,{timeout:20000});
const out=await page.evaluate(async()=>{
 window.currentUser={email:'theo@cardinalrenovations.net'};
 window.alert=()=>{}; window.confirm=()=>true; window.prompt=()=>'';
 try{await reload();}catch(e){}
 window.CardinalProduction.addFor('p1');
 await new Promise(r=>setTimeout(r,400));
 const modal=[...document.querySelectorAll('.sheet')].map(s=>s.closest('*')).find(Boolean) && document;
 const q=s=>document.querySelector(s);
 const hasTime = !!q('[data-f="whentime"]');
 // fill
 const title=q('[data-f="title"]'); if(title){ title.value='Dryer Vents'; title.dispatchEvent(new Event('input',{bubbles:true})); }
 const proj=q('[data-f="project"]'); if(proj){ proj.value='p1'; proj.dispatchEvent(new Event('change',{bubbles:true})); }
 const wd=q('[data-f="when"]'); if(wd){ wd.value='2026-08-17'; wd.dispatchEvent(new Event('change',{bubbles:true})); }
 const wt=q('[data-f="whentime"]'); if(wt){ wt.value='14:30'; wt.dispatchEvent(new Event('change',{bubbles:true})); }
 const before=(window.__WRITES__||[]).length;
 const saveBtn=[...document.querySelectorAll('[data-act="save"]')].find(x=>/add it/i.test(x.textContent)) || q('[data-act="save"]');
 if(saveBtn) saveBtn.click();
 await new Promise(r=>setTimeout(r,600));
 const ins=(window.__WRITES__||[]).filter(w=>w.table==='punch_items'&&w.op==='insert');
 const last=ins[ins.length-1];
 return { hasTimeInput:hasTime, insertHappened: ins.length>0, wrote_scheduled_at: last&&last.payload&&last.payload.scheduled_at, wrote_scheduled_time: last&&last.payload&&last.payload.scheduled_time };
});
console.log(FILE.split('/').pop(), JSON.stringify(out));
const ok = out.hasTimeInput && out.insertHappened && out.wrote_scheduled_at==='2026-08-17' && out.wrote_scheduled_time==='14:30';
console.log(ok?'  PASS: time input present and scheduled_time written':'  FAIL');
process.exitCode=ok?0:1;
await b.close();
