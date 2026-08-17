import { createRequire } from 'module';
const require=createRequire(import.meta.url);
let chromium; for(const p of ['playwright','/opt/node22/lib/node_modules/playwright/index.js','playwright-core']){try{chromium=require(p).chromium;break;}catch(e){}}
import { readFileSync } from 'fs';
const FILE=process.argv[2], TAG=process.argv[3];
const APP=readFileSync(FILE,'utf8');
const MOCK=readFileSync(new URL('./e2e_mock_supa.js',import.meta.url),'utf8');
const now='2026-08-15T12:00:00Z';
const SEED={team_profiles:[{email:'theo@cardinalrenovations.net',name:'Theo',role:'admin'}],
 projects:[{id:'p1',name:'Alton James — Habitat for Humanity',address:'948 Huron Ave Dayton Ohio 45402',phone:'9375550100',stage:'Lead',claim_type:'community',checklist:'{}',created_by:'theo@cardinalrenovations.net',created_at:now,updated_at:now,stage_since:'2026-07-26T12:00:00Z'}],
 inspection_reports:[],appointments:[],estimates:[],insurance_claims:[],punch_items:[],crews:[],crew_work_orders:[],crew_rates:[],pricing_items:[],collections:[],contracts:[],project_photos:[],community_partners:[]};
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
const page=await (await b.newContext({viewport:{width:1280,height:960},deviceScaleFactor:2})).newPage();
await page.route('**/*',async r=>{const u=r.request().url(),t=r.request().resourceType();
 if(u.endsWith('.com/')||u.endsWith('index.html'))return r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:APP});
 if(u.includes('supabase-js'))return r.fulfill({status:200,contentType:'application/javascript',body:MOCK});
 if(u.includes('chart')||u.includes('papa')||u.includes('leaflet')||u.includes('xlsx'))return r.fulfill({status:200,contentType:'application/javascript',body:'window.Chart=function(){this.destroy=()=>{};this.update=()=>{};};window.Papa={parse:()=>({data:[]}),unparse:()=>""};window.L={};'});
 if(u.includes('maps.google.com'))return r.fulfill({status:200,contentType:'text/html',body:'<div style="width:100%;height:100%;background:repeating-linear-gradient(45deg,#556347,#556347 16px,#4c5a3f 16px,#4c5a3f 32px)"></div>'});
 if(u.includes('/api/'))return r.fulfill({status:200,contentType:'application/json',body:'{}'});
 if(t==='image')return r.fulfill({status:200,contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==','base64')});
 if(t==='font'||t==='media'||t==='stylesheet')return r.abort();
 if(u.startsWith('https://app.cardinalroster.com/'))return r.fulfill({status:200,body:''});
 return r.abort();});
await page.addInitScript(s=>{window.__SEED__=s;},SEED); await page.addInitScript(MOCK);
await page.goto('https://app.cardinalroster.com/',{waitUntil:'domcontentloaded'});
await page.waitForFunction(()=>typeof openLeadsView==='function'&&typeof renderLjPane==='function'&&window.supabase,{timeout:20000});
await page.evaluate(async()=>{
 window.currentUser={email:'theo@cardinalrenovations.net'};
 document.documentElement.removeAttribute('data-theme');
 try{await reload();}catch(e){}
 try{ openLeadsView(); ljState.sel='p1'; ljState.tab='map'; renderLjPane(); }catch(e){}
 await new Promise(r=>setTimeout(r,400));
 // isolate: hide every other top-level view + landing so nothing bleeds through
 document.querySelectorAll('body > *').forEach(el=>{ if(el.id!=='leadsView' && /View$|landing/i.test(el.id||'')) el.style.display='none'; });
 const lv=document.getElementById('leadsView'); if(lv){ lv.style.display='block'; lv.style.background='#0b0b0e'; lv.style.position='relative'; lv.style.zIndex='9999'; }
 document.body.style.background='#0b0b0e';
});
await new Promise(r=>setTimeout(r,300));
const geo=await page.evaluate(()=>{ const t=document.querySelector('#ljPane .ljmaptabs'), f=document.querySelector('#ljPane .ljmapframe'); if(!t||!f) return null; const T=t.getBoundingClientRect(),F=f.getBoundingClientRect(); return {tabsBottom:Math.round(T.bottom),frameTop:Math.round(F.top),frameH:Math.round(F.height),overlaps:!(T.bottom<=F.top+1)}; });
const el=await page.$('#ljPane');
if(el) await el.screenshot({path:`/home/user/cardinal-inspections/.claude/skills/cardinal-build/scripts/_ljshot_${TAG}.png`});
console.log(TAG, JSON.stringify(geo));
if(geo){ if(geo.overlaps) console.log('  RESULT: tabs OVERLAP the map (bar sits on it)'); else console.log('  RESULT: tabs ABOVE the map (no overlap), map height='+geo.frameH); }
await b.close();
