/* Gate for 941 — Suppliers stops being a nav trap. Optional path arg = control.
   Drives the app's REAL drawer handler, not module APIs. */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium; for (const p of ['playwright','/opt/node22/lib/node_modules/playwright/index.js']){try{chromium=require(p).chromium;break;}catch(e){}}
import { readFileSync } from 'fs';
const S='/home/user/cardinal-inspections/.claude/skills/cardinal-build/scripts/';
const APP_PATH=process.argv[2]||'/home/user/cardinal-inspections/index.html';
const LABEL=process.argv[3]||(/v9\d\d/.test(APP_PATH)?'CONTROL':'SHIPPED');
const APP=readFileSync(APP_PATH,'utf8');
const SETUP=readFileSync(S+'sentinel_setup_cardinal.js','utf8')+'\n;\n'+readFileSync(S+'e2e_mock_supa.js','utf8');
let fails=0; const ok=(c,m)=>{ if(!c){fails++;console.log('  ✗ '+m);} else console.log('  ✓ '+m); };
const browser=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
const ctx=await browser.newContext({viewport:{width:390,height:844},colorScheme:'dark'});
const page=await ctx.newPage();
await page.route('**/*', async r=>{const u=r.request().url();
  if(u.startsWith('https://sentinel.test/')) return r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:APP});
  return r.fulfill({status:200,body:''});});
await page.addInitScript(SETUP);
await page.goto('https://sentinel.test/?as=theo',{waitUntil:'domcontentloaded'});
await page.waitForTimeout(1600);
await page.evaluate(()=>{['landingView','loginView'].forEach(id=>{const e=document.getElementById(id); if(e){e.style.display='none';e.classList&&e.classList.remove('open');}});});
const owner = () => page.evaluate(()=>{
  const own=p=>{ let n=document.elementFromPoint(p[0],p[1]);
    while(n&&n!==document.body){ if(n.id) return n.id; n=n.parentElement; } return '?'; };
  return [...new Set([[195,300],[195,500],[300,650]].map(own))].join(',');
});
const nav = n => page.evaluate(x=>{ const b=document.querySelector('[data-nav="'+x+'"]');
  if(!b) return false; b.click(); return true; }, n);

console.log('\n=== suppliers nav trap ('+LABEL+') — '+APP_PATH+' ===');
ok(await nav('suppliers'), 'menu opens Suppliers');
await page.waitForTimeout(600);
const a=await owner();
ok(/cr-abc/.test(a), 'Suppliers is genuinely in front ('+a+')');

ok(await nav('clients'), 'then the menu opens Clients');
await page.waitForTimeout(600);
const b=await owner();
ok(/cliList|clientsView|cd/.test(b) && !/cr-abc/.test(b),
   'and Clients actually REACHES THE FRONT — Suppliers closed ('+b+')');

// crews too — a Cardinal*.open destination rather than a legacy view
ok(await nav('suppliers'), 're-open Suppliers'); await page.waitForTimeout(500);
ok(await nav('crews'), 'then Crews'); await page.waitForTimeout(600);
const c=await owner();
ok(/crewsView|crw/.test(c) && !/cr-abc/.test(c), 'Crews reaches the front too ('+c+')');

// the back gesture: opening suppliers must RECORD the view
await nav('suppliers'); await page.waitForTimeout(500);
const nvOK=await page.evaluate(()=>{
  // navSetView records into history/state — read whichever the app exposes
  try{ const st=history.state; if(st && JSON.stringify(st).includes('suppliers')) return 'history.state'; }catch(e){}
  return null;
});
ok(!!nvOK, 'opening Suppliers records the view for the back gesture ('+nvOK+')');

// and hideAllViews itself now closes it
const hv=await page.evaluate(()=>{ try{ hideAllViews(); }catch(e){}
  const el=document.getElementById('cr-abc');
  return el?getComputedStyle(el).display:'absent'; });
ok(hv!=='flex', 'hideAllViews() closes Suppliers directly ('+hv+')');

await browser.close();
console.log(fails?('\nRED — '+fails+' failed'):'\nGREEN — Suppliers behaves like every other full screen');
process.exit(fails?1:0);
