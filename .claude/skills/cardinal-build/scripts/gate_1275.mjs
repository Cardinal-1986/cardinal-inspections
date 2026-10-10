/* gate_1275.mjs — Publish checks the lines first (Theo, 10 Oct, pick #1: Jacob's
   $5,000 "Item" line and the roof write-up with no price).
   Real Chromium, the estimate builder, Publish. The builder's save() is stood in
   for so the estimate carries Jacob's exact lines; the check under test is the
   shipped Publish handler.
     A  Jacob's lines: Publish asks before anything is written, naming line 1
        (price, no name → "Item") and line 2 (no price)
     B  "Fix it" publishes nothing
     C  "Publish anyway" publishes
     D  a clean estimate publishes with no question
   usage: node gate_1275.mjs [file.html] — RED on 1274, never a crash
*/
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium; for (const p of ['playwright','/opt/node22/lib/node_modules/playwright/index.js']){try{chromium=require(p).chromium;break;}catch(e){}}
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
const HERE=dirname(fileURLToPath(import.meta.url));
const FILE=process.argv[2]||join(HERE,'../../../../index.html');
const APP=readFileSync(FILE,'utf8');
const SETUP=readFileSync(join(HERE,'sentinel_setup_cardinal.js'),'utf8')+'\n;\n'+readFileSync(join(HERE,'e2e_mock_supa.js'),'utf8');
let fails=[], passes=0;
function need(name, ok, detail){ if(ok){passes++; console.log('  PASS  '+name);} else { fails.push(name); console.log('  FAIL  '+name+(detail!==undefined?'  → '+detail:'')); } }
setTimeout(()=>{ console.log('GATE TIMEOUT'); process.exit(3); }, 220000).unref();
const browser=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:390,height:844}});
page.on('dialog', d=>d.accept());
await page.route('**/*', r=>r.request().url().startsWith('https://sentinel.test/')?r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:APP}):r.fulfill({status:200,body:''}));
await page.addInitScript(SETUP);
await page.goto('https://sentinel.test/?as=nick',{waitUntil:'domcontentloaded'}); await page.waitForTimeout(2600);
await page.evaluate(async()=>{ const s=(window.__sentinelStates||[]).find(x=>x.name==='estbuilder'); try{ await s.run(); }catch(_){} });
await page.waitForTimeout(1500);
const JACOB=[ { name:'', qty:1, unit_price:5000 }, { name:'Ohio Codes & Manufacturer Installation', description:'Remove existing layers of shingles…', qty:1, unit:'LS' } ];
const CLEAN=[ { name:'Roof replacement', description:'Owens Corning Duration', qty:20, unit:'SQ', unit_price:450 }, { name:'Debris haul-away', flat:true, amount:300 } ];
async function publishWith(lines){
  await page.evaluate((lines)=>{ window.__WRITES__=[]; const E=window.CardinalEstimates;
    E.save=async function(){ return { id:'e-g1275', project_id:'p1', estimate_number:'EST-2026-0999', title:'Estimate', status:'draft', itemized:true,
      line_items:lines, subtotal:0, discount:0, total:0, deposit_pct:30, valid_through:'2026-11-08', photos:[] }; };
    try{ if(typeof closeEditor==='function') {} }catch(_){}
    const b=document.getElementById('cr-epub-btn'); if(b) b.click(); }, lines);
  await page.waitForTimeout(1500); }
const asked=()=>page.evaluate(()=>{ const a=document.querySelector('#crAsk.open'); return a?a.textContent.replace(/\s+/g,' '):''; });
const inserts=()=>page.evaluate(()=>(window.__WRITES__||[]).filter(x=>x.table==='inspection_reports'&&x.op==='insert').length);
const reopen=async()=>{ for(let i=0;i<3;i++){ const ok=await page.evaluate(async()=>{ try{ await closeEditor(); }catch(_){}
    await new Promise(r=>setTimeout(r,600)); const s=(window.__sentinelStates||[]).find(x=>x.name==='estbuilder'); try{ await s.run(); }catch(_){}
    return !!document.querySelector('#cr-est-view.open'); }); await page.waitForTimeout(800); if(ok) return true; } return false; };

/* A + B */
await publishWith(JACOB);
const a=await asked();
need('A  Jacob’s lines: Publish asks first', !!a, 'no question');
need('A  …naming line 1 (a price, no name → “Item”) and line 2 (no price)', /Line 1 has a price \(\$5,000(\.00)?\) but no name/.test(a) && /Line 2 \(“Ohio Codes & Manufacturer Installation”\) has no price/.test(a), a.slice(0,240));
need('A  …before anything is written', (await inserts())===0);
await page.evaluate(()=>{ const n=document.querySelector('#crAsk.open .askno'); if(n) n.click(); });
await page.waitForTimeout(1500);
need('B  “Fix it” publishes nothing', (await inserts())===0 && !(await asked()), String(await inserts()));

/* C */
await publishWith(JACOB);
await page.evaluate(()=>{ const g=document.querySelector('#crAsk.open .askgo'); if(g) g.click(); });
await page.waitForTimeout(3500);
need('C  “Publish anyway” publishes', (await inserts())===1, String(await inserts()));

/* D — first close the app's own "Estimate published — send it?" from C */
await page.evaluate(()=>{ const n=document.querySelector('#crAsk.open .askno'); if(n) n.click(); });
await page.waitForTimeout(800);
need('D  setup  the builder is open again', await reopen());
await publishWith(CLEAN);
const d=await asked();
await page.waitForTimeout(2500);
need('D  a clean estimate publishes with no question', !/Check these lines/.test(d) && (await inserts())===1, JSON.stringify({d:d.slice(0,80), n:await inserts()}));

await browser.close();
console.log((fails.length?'GATE 1275 RED':'GATE 1275 GREEN')+' — '+passes+' passed, '+fails.length+' failed');
process.exit(fails.length?1:0);
