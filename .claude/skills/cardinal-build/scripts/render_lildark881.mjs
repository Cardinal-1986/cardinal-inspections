import { createRequire } from 'module';
const require=createRequire(import.meta.url);
let chromium; for(const p of ['playwright','/opt/node22/lib/node_modules/playwright/index.js','playwright-core']){try{chromium=require(p).chromium;break;}catch(e){}}
import { readFileSync } from 'fs';
const FILE=process.argv[2]||'/home/user/cardinal-inspections/index.html';
const TAG=process.argv[3]||'after';
const LIGHT=process.argv[4]==='light';
const APP=readFileSync(FILE,'utf8');
const MOCK=readFileSync(new URL('./e2e_mock_supa.js',import.meta.url),'utf8');
const SEED={team_profiles:[{email:'theo@cardinalrenovations.net',name:'Theo',role:'admin'}],
 pricing_items:[
   {id:'i1',name:'Architectural Shingles',category:'roofing',unit:'sq',price:385,description:'OC Duration, installed per square incl. underlayment.'},
   {id:'i2',name:'Ridge Vent',category:'roofing',unit:'lf',price:12,description:'Shingle-over ridge vent.'},
   {id:'i3',name:'Gutter 5" K-style',category:'gutters',unit:'lf',price:9,description:'Seamless aluminum.'}],
 projects:[],inspection_reports:[],appointments:[],estimates:[],insurance_claims:[],punch_items:[],crews:[],crew_work_orders:[],crew_rates:[],collections:[],contracts:[],project_photos:[],community_partners:[]};
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
const page=await (await b.newContext({viewport:{width:1194,height:834},deviceScaleFactor:2})).newPage();
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
await page.waitForFunction(()=>window.CardinalLineItems&&typeof showMain==='function'&&window.supabase,{timeout:20000});
const info=await page.evaluate(async(light)=>{
 window.currentUser={email:'theo@cardinalrenovations.net'};
 if(light) document.documentElement.setAttribute('data-theme','rb-light'); else document.documentElement.removeAttribute('data-theme');
 try{await reload();}catch(e){}
 try{ await window.CardinalLineItems.load(); }catch(e){}
 try{ window.CardinalLineItems.open(); }catch(e){ return 'open threw '+e.message; }
 await new Promise(r=>setTimeout(r,500));
 const v=document.getElementById('cr-lil-view');
 const cs=el=>el?getComputedStyle(el):null;
 const bg=el=>{ const s=cs(el); return s?s.backgroundColor:'-'; };
 const col=el=>{ const s=cs(el); return s?s.color:'-'; };
 const row=document.querySelector('.cr-lil-row');
 return { open: v&&getComputedStyle(v).display!=='none', viewBg:bg(v),
   rowName: col(document.querySelector('.cr-lil-row .name')),
   listBg: bg(document.querySelector('.cr-lil-list')),
   rows: document.querySelectorAll('.cr-lil-row').length };
},LIGHT);
console.log(FILE.split('/').pop(), LIGHT?'[LIGHT]':'[DARK]', JSON.stringify(info));
function lum(c){ const m=/rgb\((\d+), (\d+), (\d+)/.exec(c||''); if(!m) return 1; const f=v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)}; return .2126*f(+m[1])+.7152*f(+m[2])+.0722*f(+m[3]); }
if(typeof info==='object'){
  const L=lum(info.viewBg);
  const ok = LIGHT ? (L>0.6) : (L<0.1);
  console.log(ok ? ('  PASS: '+(LIGHT?'light theme stays cream':'dark theme is dark')+' (view lum '+L.toFixed(3)+')') : ('  FAIL: view lum '+L.toFixed(3)+' bg '+info.viewBg));
  process.exitCode = ok?0:1;
}
await b.close();
