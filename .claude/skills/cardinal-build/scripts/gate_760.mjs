/* gate_760 — BUG_CLASSES 43, third instance: .kptrow .ti2 is an inline span whose
   ellipsis is inert, so a long appointment title overflows the Today row.
   Asserts display + the element's OWN right edge (never scrollWidth: an inline
   box reports 0 and the check passes vacuously — that is how 758 nearly shipped
   half-fixed). */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium;
for (const p of ['playwright','/opt/node22/lib/node_modules/playwright/index.js']) { try { chromium=require(p).chromium; break; } catch(e){} }
import { readFileSync } from 'fs';
const APP=readFileSync(process.argv[2]||'/home/user/cardinal-inspections/index.html','utf8');
const MOCK=readFileSync('/home/user/cardinal-inspections/.claude/skills/cardinal-build/scripts/e2e_mock_supa.js','utf8');
const today=new Date().toISOString().slice(0,10);
const SEED={team_profiles:[{email:'theo@cardinalrenovations.net',name:'Theo',role:'admin'}],
 projects:[{id:'p1',name:'Betty Mann',stage:'Scheduled',crm:'retail',checklist:'{}',address:'1 Main St',created_at:'2026-08-01T12:00:00Z',stage_since:'2026-08-01T12:00:00Z'}],
 appointments:[
  {id:'a1',project_id:'p1',title:'Full roof inspection and gutter measurement with the adjuster on site',appt_date:today,appt_time:'09:00',notes:null,created_at:'2026-08-01T12:00:00Z'},
  {id:'a2',project_id:'p1',title:'Short call',appt_date:today,appt_time:'14:00',notes:null,created_at:'2026-08-01T12:00:00Z'}],
 estimates:[],contracts:[],inspection_reports:[],project_photos:[],punch_items:[],collections:[]};
const browser=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const checks=[]; const chk=(n,c,d)=>checks.push({n,pass:!!c,d:d===undefined?'':String(d)});
for(const w of [390,430]){
 const ctx=await browser.newContext({viewport:{width:w,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
 const page=await ctx.newPage();
 await page.route('**/*',async r=>{const u=r.request().url(),t=r.request().resourceType();
  if(u==='https://app.cardinalroster.com/')return r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:APP});
  if(u.includes('@supabase/supabase-js'))return r.fulfill({status:200,contentType:'application/javascript',body:MOCK});
  if(u.includes('chart.js')||u.includes('papaparse'))return r.fulfill({status:200,contentType:'application/javascript',body:'window.Chart=function(){this.destroy=function(){}};window.Papa={parse:function(){return{data:[]}},unparse:function(){return ""}};'});
  if(t==='font'||t==='media')return r.abort();
  if(u.startsWith('https://app.cardinalroster.com/'))return r.fulfill({status:200,body:''});
  return r.abort();});
 await page.addInitScript(s=>{window.__SEED__=s;},SEED);
 await page.addInitScript(MOCK);
 await page.goto('https://app.cardinalroster.com/',{waitUntil:'domcontentloaded'});
 await page.waitForTimeout(3300);
 const go=async(c,ms)=>{try{await page.evaluate(c);}catch(e){}await page.waitForTimeout(ms||900);};
 await go(`(()=>{const c=document.querySelector('.cr-lr-course');if(c)c.click();else if(window.showHome)showHome();})()`);
 await go(`window.showHome()`,1800);
 let r;
 try{ r=await page.evaluate(`(()=>{
   const rows=[...document.querySelectorAll('.kptrow')];
   if(!rows.length) return {none:true};
   return rows.map(row=>{const ti=row.querySelector('.ti2'); if(!ti) return {missing:true};
     const tb=ti.getBoundingClientRect(), rb=row.getBoundingClientRect();
     return { display:getComputedStyle(ti).display,
              within: Math.round(tb.right)<=Math.round(rb.right),
              overhang: Math.round(tb.right)-Math.round(rb.right),
              text:(ti.textContent||'').slice(0,26) };});
 })()`); }catch(e){ r={__err:String(e).split('\n')[0].slice(0,80)}; }
 const tag=w+'px';
 chk(`${tag}: the Today rows rendered`, Array.isArray(r)&&r.length>0, r&&r.none?'no .kptrow':(r&&r.__err)||'ok');
 if(Array.isArray(r)){
  chk(`${tag}: the title is a block`, r.every(x=>x.display==='block'), JSON.stringify(r.map(x=>x.display)));
  chk(`${tag}: LONG TITLE STAYS INSIDE ITS ROW`, r.every(x=>x.within), JSON.stringify(r.map(x=>x.overhang)));
 }
 await page.close(); await ctx.close();
}
await browser.close();
let f=0; for(const c of checks){console.log(`  [${c.pass?'PASS':'FAIL'}] ${c.n}${c.d?'  ('+c.d+')':''}`); if(!c.pass)f++;}
console.log(f===0?`\nGATE GREEN — ${checks.length} checks`:`\nGATE RED — ${f} of ${checks.length} failed`);
process.exit(f===0?0:1);
