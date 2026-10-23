import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'fs';
const S='/home/user/cardinal-inspections/.claude/skills/cardinal-build/scripts/';
const HTML=fs.readFileSync(process.env.DESKFILE||'/home/user/cardinal-inspections/supplement.html','utf8');
const MOCK=fs.readFileSync(S+'e2e_mock_supa.js','utf8');
const iso=d=>new Date(Date.now()+d*86400000).toISOString();
const SEED={
 insurance_claims:[
  {id:'cA000000-0000-4000-8000-000000000001',project_id:'pA',homeowner_name:'Sample Alpha',property_address:'1 Main St, Dayton, OH 45402',carrier:'Sample Mutual',claim_number:'A-1',adjuster_name:'Adj A',adjuster_email:'adj-a@example.com',approved_rcv:1000,created_at:iso(-1)},
  {id:'cB000000-0000-4000-8000-000000000002',project_id:'pB',homeowner_name:'Sample Bravo',property_address:'2 Oak St, Kettering, OH 45429',carrier:'Sample Casualty',claim_number:'B-2',adjuster_name:'Adj B',adjuster_email:'adj-b@example.com',approved_rcv:2000,created_at:iso(-2)}],
 projects:[{id:'pA',name:'Sample Alpha',address:'1 Main St',checklist:JSON.stringify({meas:{sq:30,eave:120,rake:80,ridge:40}})},{id:'pB',name:'Sample Bravo',address:'2 Oak St',checklist:JSON.stringify({meas:{sq:20,eave:90}})}],
 inspection_reports:[{id:'rA',project_id:'pA',title:'Insurance Doc [scope]: Scope A',created_at:iso(-1),html:JSON.stringify({file:true,name:'a.pdf',mime:'application/pdf',data:'data:application/pdf;base64,JVBERi0xLjQK'})},
                     {id:'rB',project_id:'pB',title:'Insurance Doc [scope]: Scope B',created_at:iso(-1),html:JSON.stringify({file:true,name:'b.pdf',mime:'application/pdf',data:'data:application/pdf;base64,JVBERi0xLjQK'})}],
 project_photos:[{id:'phA1',project_id:'pA',storage_path:'pA/one.jpg',created_at:iso(-3)},{id:'phA2',project_id:'pA',storage_path:null,data:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',created_at:iso(-2)},
                 {id:'phB1',project_id:'pB',storage_path:'pB/bravo.jpg',created_at:iso(-3)}],
 itel_lab_reports:[{claim_id:'cA000000-0000-4000-8000-000000000001',control_number:'ITEL-A',verdict:'no match',report_date:'2026-09-01'}],
 claim_notes:[], insurance_supplements:[], code_letters:[]
};
export async function boot({apiPlan={}, slow=null, width=390}={}){
 const browser=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
 const page=await (await browser.newContext({viewport:{width,height:844}})).newPage();
 const apiCalls=[];
 await page.route('**/*', async route=>{ const url=route.request().url();
  if(url==='https://app.cardinalroster.com/supplement.html') return route.fulfill({status:200,contentType:'text/html',body:HTML});
  if(url.includes('supabase-js')) return route.fulfill({status:200,contentType:'application/javascript',body:'/*mock preloaded*/'});
  if(url.includes('/api/')) { const body=route.request().postDataJSON(); apiCalls.push(body); const key=url.split('/api/')[1]+':'+(body&&body.mode||'');
     const p=apiPlan[key]||{status:200,body:{ok:true}}; return route.fulfill({status:p.status,contentType:p.ct||'application/json',body:typeof p.body==='string'?p.body:JSON.stringify(p.body)}); }
  if(url.includes('supabase.co/storage')) { await new Promise(r=>setTimeout(r,400)); return route.fulfill({status:200,contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==','base64')}); }
  if(url.startsWith('https://fonts')) return route.abort();
  return route.abort(); });
 await page.addInitScript(([seed])=>{ window.__SEED__=seed; },[SEED]);
 await page.addInitScript(MOCK);
 await page.addInitScript(()=>{ const oc=window.supabase.createClient; window.supabase.createClient=function(){ const c=oc.apply(this,arguments); const of=c.from.bind(c); c.rpc=function(n){ return Promise.resolve({data: n==='is_cardinal_admin'||n==='is_full_access' ? true : null, error:null}); };
   c.from=function(t){ const q=of(t); const d=(window.__SLOW__||{})[t]; if(d){ const ot=q.then.bind(q); q.then=(a,b)=>new Promise(r=>setTimeout(r,d)).then(()=>ot(a,b)); } return q; };
   const sf=c.storage.from.bind(c.storage); c.storage.from=function(b){ const k=sf(b);
     k.createSignedUrls=ps=>Promise.resolve({data:(ps||[]).map(p=>({path:p,signedUrl:'https://yipslubcptjoarblzbpl.supabase.co/storage/v1/object/sign/photos/'+p+'?token=t'})),error:null});
     k.createSignedUrl=p=>Promise.resolve({data:{signedUrl:'https://yipslubcptjoarblzbpl.supabase.co/storage/v1/object/sign/photos/'+p+'?token=s'},error:null}); return k; };
   return c; }; 
   window.__printLog=[]; window.print=function(){ const imgs=[...document.querySelectorAll('#printArea img')]; window.__printLog.push({n:imgs.length,complete:imgs.map(i=>i.complete&&i.naturalWidth>0), srcs:imgs.map(i=>i.getAttribute('src')||''), html:document.getElementById('printArea').innerHTML.slice(0,400)}); };
   window.__confirms=[]; window.confirm=m=>{window.__confirms.push(m); return true;}; window.__alerts=[]; window.alert=m=>window.__alerts.push(m);
 });
 const errs=[]; page.on('pageerror',e=>errs.push(String(e)));
 await page.goto('https://app.cardinalroster.com/supplement.html'); await page.waitForTimeout(800);
 return {browser,page,apiCalls,errs};
}
