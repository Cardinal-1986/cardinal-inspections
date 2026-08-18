/* Build 894 gate — the client-list CRM filter bar is one row, flush above #pwaNav.
 * Injects the 4 real chips into #cdCrmBar, shows the directory at phone width, and
 * measures wrap + vertical position. v893 wraps (Community 2nd row) at bottom:104px -> RED. */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium; for (const p of ['playwright','/opt/node22/lib/node_modules/playwright/index.js','playwright-core']) { try { chromium = require(p).chromium; break; } catch(e){} }
import { readFileSync } from 'fs';
const FILE = process.argv[2] || '/home/user/cardinal-inspections/index.html';
const APP = readFileSync(FILE,'utf8');
const MOCK = readFileSync(new URL('./e2e_mock_supa.js', import.meta.url),'utf8');
const TAG = FILE.includes('893') ? '893' : '894';
const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
const pg = await (await b.newContext({viewport:{width:390,height:844}})).newPage();
const errs=[]; pg.on('pageerror',e=>errs.push(String(e.message||e)));
await pg.route('**/*', async r => { const u=r.request().url(), rt=r.request().resourceType();
  if(u==='https://app.cardinalroster.com/') return r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:APP});
  if(u.includes('@supabase/supabase-js')) return r.fulfill({status:200,contentType:'application/javascript',body:MOCK});
  if(u.includes('chart.js')||u.includes('papaparse')) return r.fulfill({status:200,contentType:'application/javascript',body:'window.Chart=function(){};window.Papa={parse:()=>({data:[]}),unparse:()=>""};'});
  if(u.startsWith('https://app.cardinalroster.com/api/')) return r.fulfill({status:200,body:'{}'});
  if(rt==='image'||rt==='font'||rt==='stylesheet'||rt==='media') return r.abort();
  if(u.startsWith('https://app.cardinalroster.com/')) return r.fulfill({status:200,body:''}); return r.abort(); });
await pg.addInitScript(s=>{window.__SEED__=s;}, {projects:[],team_profiles:[]});
await pg.addInitScript(MOCK);
let pass=0,fail=0; const ok=(l,c,x)=>{ if(c){pass++;console.log('  PASS '+l);} else {fail++;console.log('  FAIL '+l+(x!==undefined?'  -> '+JSON.stringify(x):''));} };
console.log(`artifact : ${FILE} (build ${TAG})`);
try {
  await pg.goto('https://app.cardinalroster.com/',{waitUntil:'domcontentloaded'});
  await pg.waitForFunction(()=>document.getElementById('cdCrmBar')!==null,{timeout:20000});
  const r = await pg.evaluate(()=>{
    document.body.classList.remove('cr-lnav-on');   // phone, not desktop rail
    document.body.classList.add('standalone');       // show #pwaNav
    var cv = document.getElementById('clientsView'); if(cv) cv.style.display='block';
    var bar = document.getElementById('cdCrmBar');
    bar.innerHTML =
      '<span class="cd-crmchip on" data-crm="All">All <b>38</b></span>' +
      '<span class="cd-crmchip" data-crm="Retail"><span class="cd-dot" style="background:#c9a227"></span>Retail <b>21</b></span>' +
      '<span class="cd-crmchip" data-crm="Claims"><span class="cd-dot" style="background:#3fb6a8"></span>Claims <b>2</b></span>' +
      '<span class="cd-crmchip" data-crm="Community"><span class="cd-dot" style="background:#4a90d9"></span>Community <b>15</b></span>';
    var chips = [...bar.querySelectorAll('.cd-crmchip')];
    var tops = chips.map(c=>Math.round(c.getBoundingClientRect().top));
    var oneRow = new Set(tops).size === 1;
    var cs = getComputedStyle(bar);
    var barBottomGap = Math.round(window.innerHeight - bar.getBoundingClientRect().bottom);
    var nav = document.getElementById('pwaNav');
    var navH = nav ? Math.round(nav.getBoundingClientRect().height) : null;
    var gapToNav = (nav ? Math.round(nav.getBoundingClientRect().top - bar.getBoundingClientRect().bottom) : null);
    return { rows:new Set(tops).size, oneRow, flexWrap:cs.flexWrap, barBottomGap, navH, gapToNav, visible: bar.getBoundingClientRect().height>0 };
  });
  ok('bar renders', r.visible, r);
  ok('all 4 chips on ONE row', r.oneRow, {rows:r.rows});
  ok('flex-wrap is nowrap', r.flexWrap === 'nowrap', r.flexWrap);
  ok('bar sits ~62px above viewport bottom (flush on nav)', r.barBottomGap >= 58 && r.barBottomGap <= 70, r.barBottomGap);
  ok('no dead gap between bar and nav (<=6px)', r.gapToNav !== null && r.gapToNav <= 6, r.gapToNav);
  ok('no page errors', errs.length===0, errs.slice(0,2));
  console.log(`\n${fail===0?'GREEN':'RED'} — ${pass} passed, ${fail} failed`);
} catch(e){ console.log('HARNESS ERROR: '+String(e).slice(0,200)); fail++; } finally { await b.close(); }
process.exit(fail===0?0:1);
