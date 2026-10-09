/* gate_1274.mjs — an estimate's price table reads on a phone SCREEN (Theo, 9 Oct:
   the email link on his iPhone, "Estimate still looks bad"). Real Chromium at 390px.
     A  a NEW published estimate, opened at 390px: each line's description spans
        the row (≥ 90% of the table), its amount sits at the right edge
     B  an OLD estimate (published before 1274, no phone rule inside it) served
        through the SHIPPED api/share.js gets the same layout
     C  at desktop width (1100px) the table is still the five-column table
   usage: node gate_1274.mjs [index.html] [api/share.js] — RED on 1273, never a crash
*/
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium; for (const p of ['playwright','/opt/node22/lib/node_modules/playwright/index.js']){try{chromium=require(p).chromium;break;}catch(e){}}
import { readFileSync, writeFileSync, mkdtempSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { tmpdir } from 'os';
const HERE=dirname(fileURLToPath(import.meta.url));
const FILE=process.argv[2]||join(HERE,'../../../../index.html');
const SHARE=process.argv[3]||join(HERE,'../../../../api/share.js');
const APP=readFileSync(FILE,'utf8');
const SETUP=readFileSync(join(HERE,'sentinel_setup_cardinal.js'),'utf8')+'\n;\n'+readFileSync(join(HERE,'e2e_mock_supa.js'),'utf8');
let fails=[], passes=0;
function need(name, ok, detail){ if(ok){passes++; console.log('  PASS  '+name);} else { fails.push(name); console.log('  FAIL  '+name+(detail!==undefined?'  → '+detail:'')); } }
setTimeout(()=>{ console.log('GATE TIMEOUT'); process.exit(3); }, 220000).unref();
const browser=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});

/* publish an estimate in the app and take the stored document */
const ctx=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
const page=await ctx.newPage(); page.on('dialog',d=>d.accept());
await page.route('**/*', r=>r.request().url().startsWith('https://sentinel.test/')?r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:APP}):r.fulfill({status:200,body:''}));
await page.addInitScript(SETUP);
await page.goto('https://sentinel.test/?as=nick',{waitUntil:'domcontentloaded'}); await page.waitForTimeout(2600);
await page.evaluate(async()=>{ const s=(window.__sentinelStates||[]).find(x=>x.name==='estbuilder'); try{ await s.run(); }catch(_){} });
await page.waitForTimeout(1500);
/* Jacob's own estimate, 9 Oct: a $5,000 "Item" line, then the long roof write-up at 1 LS
   with no price, plus a flat lump line — built by the SHIPPED document builder. */
const docHtml=await page.evaluate(()=>{ const B=window.CardinalEstimatePublish; if(!B||!B.buildDocHtml) return '';
  const long='Remove existing layers of shingles and dispose of them. Inspect wood decking for damages. If damage is found, replace each 4x8 Sheet of OSB for $50/Sheet. Install a new Owens Corning roofing system with the proper intake and exhaust. New roof will be installed in accordance with Ohio codes and manufacturer installation.';
  const est={ estimate_number:'EST-2026-0912', title:'Estimate', itemized:true, subtotal:5500, discount:0, total:5500, deposit_pct:30, valid_through:'2026-11-08',
    line_items:[ { name:'Item', qty:1, unit_price:5000 }, { name:'Ohio Codes & Manufacturer Installation', description:long, qty:1, unit:'LS' }, { name:'Debris haul-away', flat:true, amount:500 } ], photos:[] };
  try{ return B.buildDocHtml(est, { name:'Dave McCoy', address:'5226 Kellenberger, Huber Heights, OH 45424', phone:'(425) 444-1076', email:'dave@dsmccoy.com' }, {}); }catch(e){ return 'ERR '+e.message; } });
await ctx.close();
need('setup  Jacob’s estimate built by the shipped builder, five columns', /table class="items"/.test(docHtml) && /<th[^>]*>Unit Price<\/th>/.test(docHtml), docHtml.slice(0,80));

async function measure(html, w){
  const p=await browser.newPage({viewport:{width:w,height:900}});
  await p.route('**/*', r=>r.fulfill({status:200,body:''}));
  await p.setContent(html,{waitUntil:'domcontentloaded'}); await p.waitForTimeout(300);
  const m=await p.evaluate(()=>{ const t=document.querySelector('table.items'); if(!t) return {err:'no table'};
    const rows=t.querySelectorAll('tbody tr'); const tb=t.getBoundingClientRect();
    /* the long write-up (row 2) for the description; the $5,000 "Item" (row 1) for the amount */
    const d=rows[1]&&rows[1].children[0].getBoundingClientRect(), a=rows[0]&&rows[0].lastElementChild.getBoundingClientRect();
    return { table:Math.round(tb.width), desc:d?Math.round(d.width):0, amtRight:a?Math.round(tb.right-a.right):-1, cols:t.querySelectorAll('thead th').length,
      headShown:getComputedStyle(t.querySelector('thead')||t).display!=='none', overflow:document.documentElement.scrollWidth>innerWidth+1 }; });
  await p.close(); return m; }

/* A */
const a=await measure(docHtml, 390);
need('A  new estimate at 390px: the description spans the line', a.desc>=a.table*0.9, JSON.stringify(a));
need('A  …its amount sits at the right edge, and nothing scrolls sideways', a.amtRight>=0 && a.amtRight<=12 && !a.overflow, JSON.stringify(a));

/* B: an old document — the same estimate with any 1274 rule taken out — through share.js */
const oldHtml=docHtml.replace(/@media screen and \(max-width:560px\)\{table\.items thead\{display:none\}[^\n]*?\}\}/,'');
const dir=mkdtempSync(join(tmpdir(),'g1274-'));
writeFileSync(join(dir,'share.mjs'), readFileSync(SHARE,'utf8'));
process.env.SUPABASE_SERVICE_ROLE_KEY='test-not-real';
globalThis.fetch=async (u)=>{ u=String(u);
  if(u.includes('/inspection_reports?share_token')) return { ok:true, json:async()=>[{ id:'d1', project_id:'p1', project:'Mark Diamond', html:oldHtml, title:'EST-2026-0001 — Estimate — Mark Diamond', total:null, signed_at:null }] };
  return { ok:true, json:async()=>[], text:async()=>'' }; };
let served='';
try{ const mod=await import(pathToFileURL(join(dir,'share.mjs')).href);
  await new Promise(async res=>{ const r={ _s:200, headers:{}, setHeader(k,v){ this.headers[k]=v; }, status(s){ this._s=s; return this; }, send(b){ served=String(b); res(); }, json(j){ served=JSON.stringify(j); res(); } };
    await mod.default({ method:'GET', query:{ t:'0123456789abcdef0123456789abcdef' }, headers:{} }, r); });
}catch(e){ served=''; console.log('  (share.js threw: '+e.message+')'); }
need('B  setup  the old document really has no phone rule', !/table\.items thead\{display:none\}/.test(oldHtml) && served.length>1000, JSON.stringify({len:served.length}));
const b=await measure(served, 390);
need('B  an estimate sent BEFORE this build, opened from its link, stacks too', b.desc>=b.table*0.9 && b.amtRight>=0 && b.amtRight<=12, JSON.stringify(b));

/* C */
const c=await measure(docHtml, 1100);
need('C  on a computer it is still the five-column table', c.cols===5 && c.headShown && c.desc < c.table*0.7, JSON.stringify(c));

await browser.close();
console.log((fails.length?'GATE 1274 RED':'GATE 1274 GREEN')+' — '+passes+' passed, '+fails.length+' failed');
process.exit(fails.length?1:0);
