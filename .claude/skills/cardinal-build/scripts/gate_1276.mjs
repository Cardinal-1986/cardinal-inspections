/* gate_1276.mjs — a retail estimate is Description + Price (Theo, 10 Oct, pick #4 A).
   Real Chromium; the SHIPPED CardinalEstimatePublish.buildDocHtml, one estimate,
   three kinds of job.
     A  retail: two columns, headed Description / Price — no Qty, Unit or Unit Price
     B  …each line shows its own price (28 SQ x $425 → $11,900.00; 42 LF x $9 → $378.00;
        a flat $722 line → $722.00), and the total is unchanged ($13,000.00)
     C  a job with no type recorded is treated as retail
     D  insurance and community keep the five-column table
   usage: node gate_1276.mjs [file.html] — RED on 1275, never a crash
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
setTimeout(()=>{ console.log('GATE TIMEOUT'); process.exit(3); }, 150000).unref();
const browser=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:1100,height:900}});
await page.route('**/*', r=>r.request().url().startsWith('https://sentinel.test/')?r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:APP}):r.fulfill({status:200,body:''}));
await page.addInitScript(SETUP);
await page.goto('https://sentinel.test/?as=nick',{waitUntil:'domcontentloaded'}); await page.waitForTimeout(2600);
const r=await page.evaluate(()=>{ const B=window.CardinalEstimatePublish; if(!B||!B.buildDocHtml) return { err:'no builder' };
  const est={ estimate_number:'EST-2026-0999', itemized:true, subtotal:13000, discount:0, total:13000, deposit_pct:30, deposit_amount:3900, valid_through:'2026-11-08',
    line_items:[ { name:'OC Duration roof replacement', description:'Tear off to the deck.', qty:28, unit:'SQ', unit_price:425 },
                 { name:'Ridge vent', qty:42, unit:'LF', unit_price:9 }, { name:'Debris haul-away', flat:true, amount:722 } ], photos:[] };
  const pr=(t)=>Object.assign({ name:'Dave McCoy', address:'5226 Kellenberger' }, t ? { checklist: JSON.stringify({ lead:{ claim_type:t } }) } : {});
  const read=(html)=>{ const d=new DOMParser().parseFromString(html,'text/html'); const t=d.querySelector('table.items'); if(!t) return null;
    return { th:[...t.querySelectorAll('thead th')].map(e=>e.textContent.trim()), rows:[...t.querySelectorAll('tbody tr')].map(tr=>[...tr.children].map(c=>c.textContent.replace(/\s+/g,' ').trim())),
      total:(t.querySelector('tr.grand td.val')||{}).textContent||'' }; };
  try{ return { retail:read(B.buildDocHtml(est, pr('retail'), {})), none:read(B.buildDocHtml(est, pr(''), {})), ins:read(B.buildDocHtml(est, pr('insurance'), {})), com:read(B.buildDocHtml(est, pr('community'), {})) }; }
  catch(e){ return { err:e.message }; } });
const R=r.retail||{th:[],rows:[]};
need('A  retail: two columns, Description / Price', JSON.stringify(R.th)==='["Description","Price"]', JSON.stringify(r.err||R.th));
const amts=(R.rows||[]).map(x=>x[x.length-1]);
need('B  …each line shows its own price', JSON.stringify(amts)==='["$11,900.00","$378.00","$722.00"]', JSON.stringify(amts));
need('B  …and the total is unchanged', R.total.trim()==='$13,000.00', R.total);
need('C  a job with no type recorded reads as retail', r.none && JSON.stringify(r.none.th)==='["Description","Price"]', JSON.stringify(r.none&&r.none.th));
need('D  insurance keeps the five-column table', r.ins && r.ins.th.length===5 && r.ins.th.includes('Unit Price'), JSON.stringify(r.ins&&r.ins.th));
need('D  community keeps the five-column table', r.com && r.com.th.length===5, JSON.stringify(r.com&&r.com.th));
await browser.close();
console.log((fails.length?'GATE 1276 RED':'GATE 1276 GREEN')+' — '+passes+' passed, '+fails.length+' failed');
process.exit(fails.length?1:0);
