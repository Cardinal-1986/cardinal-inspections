/* Build 893 gate — the Production Calendar card is removed, Team Calendar stays,
 * and renderTeamCal() no longer references the removed prodCalInst. v892 -> RED. */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium; for (const p of ['playwright','/opt/node22/lib/node_modules/playwright/index.js','playwright-core']) { try { chromium = require(p).chromium; break; } catch(e){} }
import { readFileSync } from 'fs';
const FILE = process.argv[2] || '/home/user/cardinal-inspections/index.html';
const APP = readFileSync(FILE,'utf8');
const MOCK = readFileSync(new URL('./e2e_mock_supa.js', import.meta.url),'utf8');
const TAG = FILE.includes('892') ? '892' : '893';
const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
const pg = await (await b.newContext({viewport:{width:390,height:900}})).newPage();
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
  await pg.waitForFunction(()=>typeof renderTeamCal==='function',{timeout:20000});
  const r = await pg.evaluate(()=>{
    let threw=null; try{ renderTeamCal(); }catch(e){ threw=String(e.message||e); }
    return {
      team: !!document.getElementById('teamCalMount'),
      prod: !!document.getElementById('prodCalMount'),
      prodCard: !!document.querySelector('.pipecard.prodcal'),
      prodCalInstDefined: (typeof prodCalInst !== 'undefined'),
      renderThrew: threw,
    };
  });
  ok('Team Calendar card still present', r.team);
  ok('Production Calendar mount is gone', !r.prod, r);
  ok('Production Calendar card (.prodcal) is gone', !r.prodCard);
  ok('prodCalInst is no longer defined', !r.prodCalInstDefined);
  ok('renderTeamCal() runs without throwing', r.renderThrew === null, r.renderThrew);
  ok('no page errors during boot', errs.length === 0, errs.slice(0,2));
  console.log(`\n${fail===0?'GREEN':'RED'} — ${pass} passed, ${fail} failed`);
} catch(e){ console.log('HARNESS ERROR: '+String(e).slice(0,200)); fail++; } finally { await b.close(); }
process.exit(fail===0?0:1);
