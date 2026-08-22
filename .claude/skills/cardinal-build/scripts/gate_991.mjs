/* gate_991.mjs — Magnet Board: a long title no longer stretches its row (991).

   Theo: "Maybe just a rule about how long the title is? It says needs new
   aluminum gable vent installed."

   Measured in the REAL grid track — .drow is
   `grid-template-columns:118px repeat(var(--dcols,7),minmax(96px,1fr))` and
   .dcell pads 4px, so ~104px of text — against a 52px row minimum:

     title                                        repH   jobH   lines
     "Repair"                                       43     45      1
     "Replace fascia board"                         58     60      2
     "needs new aluminum gable vent installed"      88     90      4   <- Theo's
     ...  "and flashing resealed"                  118    120      6

   One long title inflated its whole row. Two lines is the floor that still fits
   an ordinary title — "Replace fascia board" already needed 2.

   ⚠ BOTH CARDS, NOT ONE. .rep and .job measured within 2px of each other at
   every length, so clamping only the repair card would have been the partial
   pass this repo keeps paying for — half fixed reads as done and removes the
   tell.

   ⚠ THE CLAMP CANNOT GO ON .job .t. That element is display:flex so the pip and
   the drag grip sit right via margin-left:auto; -webkit-box would throw the
   layout away. The name was a bare text node with nothing to hang a rule on, so
   991 wraps it in <span class="nm"> and clamps that, with min-width:0 — without
   it a flex item will not shrink below its content and a long title widens the
   track instead of wrapping.

   ⚠ NOT A NEW MECHANISM: the app already had six -webkit-line-clamp rules.

     1  the repair title clamps to 2 lines
     2  the job title clamps on .nm, and .t is still flex
     3  the markup actually emits <span class="nm">
     4  RENDERED: a long title caps at 2 lines / <=60px      ← load-bearing
     5  RENDERED: short titles are UNCHANGED — this is not a blanket shrink
     6  ...and that CAN fail — remove the clamp and the tall card returns

   Usage: node gate_991.mjs [path] — previous build = negative control; must go
   RED with named failures and MUST NOT crash (BUG_CLASSES 37). */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium; for (const p of ['playwright','/opt/node22/lib/node_modules/playwright/index.js']){try{chromium=require(p).chromium;break;}catch(e){}}
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
const HERE=dirname(fileURLToPath(import.meta.url));
const FILE=process.argv[2]||join(HERE,'../../../../index.html');
const LABEL=process.argv[3]||'SHIPPED';
const APP=readFileSync(FILE,'utf8');

let fails=[], passes=0;
function need(n,ok,d){ if(ok){passes++;} else fails.push(n+(d?' — '+d:'')); }
const decls = s => s.replace(/\/\*[\s\S]*?\*\//g,'');
function ruleAt(needle){
  const i=APP.indexOf(needle);
  return i===-1 ? '' : APP.slice(i, APP.indexOf('}', i)+1);
}
const REP = ruleAt('#cr-disp .rep .t{');
const NM  = ruleAt('#cr-disp .job .t .nm{');
const JT  = ruleAt('#cr-disp .job .t{');

need('1 the repair title clamps to 2 lines',
     /-webkit-line-clamp:\s*2/.test(decls(REP)) && /-webkit-box/.test(decls(REP)),
     'rule: ' + decls(REP).slice(0,140));
need('2 the job title clamps on .nm, and .t is still flex',
     /-webkit-line-clamp:\s*2/.test(decls(NM)) && /min-width:\s*0/.test(decls(NM)) &&
     /display:\s*flex/.test(decls(JT)),
     'nm: ' + decls(NM).slice(0,110) + ' | .t flex: ' + /display:\s*flex/.test(decls(JT)));
need('3 the markup emits the span the rule needs',
     APP.indexOf('<div class="t"><span class="nm">') !== -1,
     'the .nm span is missing from the generated card — the rule would match nothing');

/* ── rendered, in the SHIPPED stylesheet and the REAL grid track ─────────── */
const i = APP.indexOf('<style id="cr-disp-styles"');
const CSS = i === -1 ? '' : APP.slice(APP.indexOf('>',i)+1, APP.indexOf('</style>',i));
const browser=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
const watchdog=setTimeout(()=>{ console.log('GATE TIMEOUT'); process.exit(1); },120000);

const SHORT = 'Repair';
const LONG  = 'needs new aluminum gable vent installed and flashing resealed';

async function heights(css, useSpan){
  const page=await browser.newPage({viewport:{width:390,height:700}});
  const nm = t => useSpan ? `<span class="nm">${t}</span>` : t;
  /* ⚠ #cr-disp needs .open — it is display:none otherwise, and a probe without
     it measures 0 for everything and reads as a pass. */
  await page.setContent(`<!doctype html><style>${css}
     body{margin:0;background:#08090b} .probe{width:900px}</style>
    <div id="cr-disp" class="open"><div class="drow probe">
      <div class="dcell" id="rs"><div class="rep"><div class="t">${SHORT}</div><div class="a">149 Harriet</div></div></div>
      <div class="dcell" id="rl"><div class="rep"><div class="t">${LONG}</div><div class="a">149 Harriet</div></div></div>
      <div class="dcell" id="js"><div class="job"><div class="t">${nm(SHORT)}<span class="pip"></span></div><div class="a">149 Harriet</div></div></div>
      <div class="dcell" id="jl"><div class="job"><div class="t">${nm(LONG)}<span class="pip"></span></div><div class="a">149 Harriet</div></div></div>
    </div></div>`);
  await page.waitForTimeout(260);
  const out = await page.evaluate(()=>{
    const h = (id,sel) => { const e=document.querySelector('#'+id+' '+sel);
      return e ? Math.round(e.getBoundingClientRect().height) : -1; };
    const cell = document.getElementById('rs');
    return { repShort:h('rs','.rep'), repLong:h('rl','.rep'),
             jobShort:h('js','.job'), jobLong:h('jl','.job'),
             cellW: cell ? Math.round(cell.getBoundingClientRect().width) : -1 };
  });
  await page.close(); return out;
}

let now={}, ctl={};
try{ now = await heights(CSS, true); }catch(e){ now={err:String(e).slice(0,90)}; }
/* the control: strip the clamp declarations out of the shipped sheet */
const stripped = CSS.replace(/-webkit-line-clamp:\s*2;/g, '').replace(/-webkit-box-orient:\s*vertical;/g,'')
                    .replace(/display:-webkit-box;/g,'');
try{ ctl = await heights(stripped, true); }catch(e){ ctl={err:String(e).slice(0,90)}; }

need('0 the probe actually laid out', now.cellW > 40,
     'cell width ' + now.cellW + ' — #cr-disp needs .open or everything measures 0');
need('4 RENDERED: a long title caps at two lines',
     now.repLong > 0 && now.repLong <= 62 && now.jobLong > 0 && now.jobLong <= 64,
     'repair ' + now.repLong + 'px, job ' + now.jobLong + 'px (want <=62 / <=64; unclamped they were 118 / 120)');
need('5 RENDERED: short titles are unchanged — not a blanket shrink',
     now.repShort >= 40 && now.repShort <= 48 && now.jobShort >= 42 && now.jobShort <= 50,
     'repair ' + now.repShort + 'px, job ' + now.jobShort + 'px (want the untouched 43 / 45)');
need('6 ...and that CAN fail — without the clamp the tall card returns',
     ctl.repLong > 80 && ctl.jobLong > 80,
     'with the clamp stripped: repair ' + ctl.repLong + 'px, job ' + ctl.jobLong +
     'px (expect >80 — they measured 118 / 120 on 990)');

clearTimeout(watchdog);
await browser.close();
console.log(`gate_991 [${LABEL}]  pass ${passes}  fail ${fails.length}`);
fails.forEach(f=>console.log('  FAIL ' + f));
console.log(fails.length ? 'RED' : 'GREEN');
process.exit(fails.length ? 1 : 0);
