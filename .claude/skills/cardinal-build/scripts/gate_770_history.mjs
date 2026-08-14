/* gate_770_history.mjs — Theo's requirement, proven in a browser:
 * a CLOSED punch-out is not deleted, it becomes the client's repair history.
 * Negative control: run against the build-768 artifact and it goes RED,
 * because CardinalPunch.rows is a FUNCTION and the array-shaped read threw
 * straight into a catch that hid it.
 *   node gate_770_history.mjs [path/to/index.html]
 */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
import { readFileSync } from 'fs';
const APP=readFileSync(process.argv[2]||'index.html','utf8'), MOCK=readFileSync('.claude/skills/cardinal-build/scripts/e2e_mock_supa.js','utf8');
const ISO=o=>{const d=new Date();d.setDate(d.getDate()+o);return d.toISOString();};
const SEED={team_profiles:[{email:'curtis@cardinalrenovations.net',name:'Curtis',role:'production'}],
 projects:[{id:'j-tac',name:'R. Tackett',address:'418 Wilmington Pk',stage:'Prospect',checklist:'{}',created_at:ISO(-10)}],
 punch_items:[{id:'p9',project_id:'j-tac',title:'Garage ceiling stain',kind:'punch',status:'done',done_by:'curtis@cardinalrenovations.net',done_at:ISO(-2),created_at:ISO(-8),photos:[],comments:[],steps:[]}],
 appointments:[],estimates:[],inspection_reports:[],crew_work_orders:[],collections:[],commissions:[],ai_estimates:[],contracts:[],insurance_claims:[],crews:[],pricing_items:[],pricing_categories:[]};
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const page=await (await b.newContext({viewport:{width:1280,height:900}})).newPage();
await page.route('**/*',async r=>{const u=r.request().url(),t=r.request().resourceType();
 if(u==='https://app.cardinalroster.com/')return r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:APP});
 if(u.includes('@supabase/supabase-js'))return r.fulfill({status:200,contentType:'application/javascript',body:MOCK});
 if(u.includes('chart.js')||u.includes('papaparse'))return r.fulfill({status:200,contentType:'application/javascript',body:'window.Chart=function(){this.destroy=()=>{};this.update=()=>{};};window.Papa={parse:()=>({data:[]}),unparse:()=>""};'});
 if(u.startsWith('https://app.cardinalroster.com/api/'))return r.fulfill({status:200,contentType:'application/json',body:'{}'});
 if(t==='image'||t==='font'||t==='media'||t==='stylesheet')return r.abort();
 if(u.startsWith('https://app.cardinalroster.com/'))return r.fulfill({status:200,body:''});
 return r.abort();});
await page.addInitScript(s=>{window.__SEED__=s;},SEED);
await page.addInitScript(MOCK);
await page.goto('https://app.cardinalroster.com/',{waitUntil:'domcontentloaded'});
await page.waitForTimeout(3000);
const res = await page.evaluate(async ()=>{
  if(window.CardinalPunch && window.CardinalPunch.reload) await window.CardinalPunch.reload();
  const ev = window.buildActivityEvents ? window.buildActivityEvents() : (typeof buildActivityEvents==='function'?buildActivityEvents():null);
  if(!ev) return {err:'buildActivityEvents not reachable'};
  const closed = ev.filter(e=>/closed/i.test(e.label||''));
  return { total: ev.length, closed: closed.map(e=>({label:e.label, detail:e.detail, who:e.who, pid:e.pid})) };
});
const ok = res && Array.isArray(res.closed) && res.closed.length === 1
  && /Repair closed/.test(res.closed[0].label || '')
  && /Garage ceiling stain/.test(res.closed[0].detail || '')
  && res.closed[0].pid === 'j-tac';
console.log(JSON.stringify(res, null, 1));
console.log(ok
  ? 'RESULT: 1 passed, 0 failed  ->  GREEN (a closed punch-out reaches the client history)'
  : 'RESULT: 0 passed, 1 failed  ->  RED (closed punch-outs are NOT reaching the client history)');
await b.close();
process.exit(ok ? 0 : 1);
