import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium;
for (const p of ['playwright','/opt/node22/lib/node_modules/playwright/index.js']) { try { chromium = require(p).chromium; break; } catch(e){} }
import { readFileSync } from 'fs';
const APP = process.argv[2] || '/home/user/cardinal-inspections/index.html';
const MOCK = readFileSync(new URL('./e2e_mock_supa.js', import.meta.url), 'utf8');
const APP_HTML = readFileSync(APP,'utf8');
const now = new Date().toISOString();
const SEED = { team_profiles:[{email:'theo@cardinalrenovations.net',name:'Theo Dorion',role:'admin'}],
 projects:[{id:'P1',name:'Bob DeBuilder',stage:'Completed',address:'1 Test Way',phone:'937-000-0000',checklist:JSON.stringify({lead:{claim_type:'retail'}}),created_by:'theo@cardinalrenovations.net',updated_at:now}],
 punch_items:[{id:'PI1',project_id:'P1',title:'Warranty Inspection',detail:'Leak from the fireplace',kind:'punch',priority:'high',status:'open',assigned_to:'curtis@cardinalrenovations.net',created_at:now,photos:[],comments:[]}],
 inspection_reports:[],estimates:[],contracts:[],collections:[],commissions:[],crew_work_orders:[],appointments:[] };
const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await (await b.newContext({ viewport:{width:430,height:900} })).newPage();
await page.route('**/*', async r => { const u=r.request().url(), t=r.request().resourceType();
 if(u==='https://app.cardinalroster.com/') return r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:APP_HTML});
 if(u.includes('@supabase/supabase-js')) return r.fulfill({status:200,contentType:'application/javascript',body:MOCK});
 if(u.includes('chart.js')||u.includes('papaparse')) return r.fulfill({status:200,contentType:'application/javascript',body:'window.Chart=function(){this.destroy=function(){};this.update=function(){}};window.Papa={parse:function(){return{data:[]}},unparse:function(){return ""}};'});
 if(u.startsWith('https://app.cardinalroster.com/api/')) return r.fulfill({status:200,contentType:'application/json',body:'{}'});
 if(t==='image'||t==='font'||t==='media'||t==='stylesheet') return r.abort();
 if(u.startsWith('https://app.cardinalroster.com/')) return r.fulfill({status:200,body:''});
 return r.abort(); });
await page.addInitScript(s=>{window.__SEED__=s;}, SEED);
await page.addInitScript(MOCK);
await page.addInitScript(()=>{ try{Object.defineProperty(document,'fonts',{configurable:true,get:()=>({ready:Promise.resolve(),status:'loaded',check:()=>true,load:()=>Promise.resolve([]),forEach:()=>{},addEventListener:()=>{}})});}catch(e){} });
await page.goto('https://app.cardinalroster.com/',{waitUntil:'domcontentloaded'});
await page.waitForTimeout(3000);
const checks=[]; const chk=(n,c,d)=>checks.push({n,pass:!!c,d:d||''});

// capture popups
const dialogs=[];
page.on('dialog', async d => { dialogs.push(d.message()); await d.dismiss(); });

await page.evaluate(()=>{ try{hideAllViews();}catch(e){} try{showHome();}catch(e){} const lv=document.getElementById('landingView'); if(lv) lv.style.display='none'; });
await page.waitForTimeout(1000);
await page.evaluate(async()=>{ try{ if(window.CardinalPunch&&window.CardinalPunch.reload) await window.CardinalPunch.reload(); }catch(e){} try{ window.renderPunchStrips&&window.renderPunchStrips(); }catch(e){} });
await page.waitForTimeout(1200);

// scroll guard
const guard = await page.evaluate(()=>{ const d=document.getElementById('puDetail'); const cs=getComputedStyle(d);
  return { ob: cs.overscrollBehavior || cs.overscrollBehaviorY, oy: cs.overflowY }; });
chk('the punch sheet contains its own scroll (no chaining into the page)', /contain/.test(guard.ob||''), 'overscroll-behavior=' + guard.ob + ' overflow-y=' + guard.oy);
chk('the punch sheet is still its own scroller', guard.oy === 'auto' || guard.oy === 'scroll', guard.oy);

// open the sheet from the home strip
await page.evaluate(()=>{ const t=document.querySelector('#kpPunchStrip .pu-card .pu-t'); if(t){ t.scrollIntoView({block:'center'}); t.click(); } });
await page.waitForTimeout(800);
chk('sheet opens from the home strip (724 still good)', await page.evaluate(()=>{ const d=document.getElementById('puDetail'); return d && d.classList.contains('open') && d.innerHTML.length>0; }));

// try to close it with 0 photos -> must POPUP, not a hidden line at the bottom
const msgBefore = await page.evaluate(()=>{ const m=document.getElementById('puMsg'); return m?m.textContent.trim():'(none)'; });
await page.evaluate(()=>{ const c=document.querySelector('#puDetail [data-pud="status"]'); if(c) c.click(); });
await page.waitForTimeout(600);
const msgAfter = await page.evaluate(()=>{ const m=document.getElementById('puMsg'); return m?m.textContent.trim():'(none)'; });
chk('closing with too few photos raises a POPUP', dialogs.length===1 && /photos before closing/i.test(dialogs[0]||''), JSON.stringify(dialogs[0]||'none'));
chk('the popup says how many it has and how many more are needed', /has 0/.test(dialogs[0]||'') && /5 more/.test(dialogs[0]||''), dialogs[0]||'');
chk('no invisible refusal is left at the bottom of the sheet', msgAfter === msgBefore || msgAfter === '', 'before=' + JSON.stringify(msgBefore) + ' after=' + JSON.stringify(msgAfter));
chk('the item was NOT closed (rule still enforced)', await page.evaluate(()=>{
  const w=(window.__WRITES__||[]).filter(x=>x.table==='punch_items'&&x.op==='update'); return w.length===0; }));

let fails=0;
for(const c of checks){ console.log(`  [${c.pass?'PASS':'FAIL'}] ${c.n}${c.d?'  ('+c.d+')':''}`); if(!c.pass) fails++; }
console.log(fails===0?'\nGATE GREEN':`\nGATE RED — ${fails} failure(s)`);
await b.close(); process.exit(fails===0?0:1);
