/* 884: a signed document must read SIGNED, not UNSENT. Exercises the two shipped
   functions directly — docRowHtml (documents list) and setEditorStatus (editor
   chip) — on a signed-but-unsent row. Negative control: pre-884 shows UNSENT. */
import { createRequire } from 'module';
const require=createRequire(import.meta.url);
let chromium; for(const p of ['playwright','/opt/node22/lib/node_modules/playwright/index.js','playwright-core']){try{chromium=require(p).chromium;break;}catch(e){}}
import { readFileSync } from 'fs';
const FILE=process.argv[2]||'/home/user/cardinal-inspections/index.html';
const APP=readFileSync(FILE,'utf8');
const MOCK=readFileSync(new URL('./e2e_mock_supa.js',import.meta.url),'utf8');
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
await page.waitForFunction(()=>typeof docRowHtml==='function',{timeout:20000});
const out=await page.evaluate(async()=>{
 const now='2026-08-16T10:00:00Z';
 const signedUnsent={ id:'d1', title:'Estimate — Roofing — Karen', status:'unsent', signed_at:now, sent_at:null, created_at:now, updated_at:now, project_id:null };
 const plainUnsent={ id:'d2', title:'Estimate — Roofing — Bob', status:'unsent', signed_at:null, sent_at:null, created_at:now, updated_at:now, project_id:null };
 const rowSigned=docRowHtml(signedUnsent);
 const rowPlain=docRowHtml(plainUnsent);
 // editor chip
 let chipTxt='', chipCls='';
 try{ setEditorStatus('unsent', null, now);
   const c=document.getElementById('editorStatusChip'); chipTxt=c.textContent; chipCls=c.className; }catch(e){ chipTxt='ERR:'+e.message; }
 return {
   signedRowHasSIGNED: /class="chip signed">SIGNED</.test(rowSigned),
   signedRowHasUNSENT: /UNSENT/.test(rowSigned),
   plainRowHasUNSENT: /UNSENT/.test(rowPlain),
   editorChipTxt:chipTxt, editorChipCls:chipCls
 };
});
console.log(FILE.split('/').pop(), JSON.stringify(out));
const ok = out.signedRowHasSIGNED && !out.signedRowHasUNSENT && out.plainRowHasUNSENT && out.editorChipTxt==='SIGNED' && /signed/.test(out.editorChipCls);
console.log(ok?'  PASS: signed doc reads SIGNED (list + editor); a plain unsent doc still reads UNSENT':'  FAIL');
process.exitCode=ok?0:1;
await b.close();
