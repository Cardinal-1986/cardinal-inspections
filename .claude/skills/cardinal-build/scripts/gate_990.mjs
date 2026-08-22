/* gate_990.mjs — Magnet Board: jobs no longer show through the crew column (990).

   THE DEFECT, from Theo's screenshot. The crew column is pinned to the left edge
   so it stays put while the days pan sideways:

     #cr-disp .crewc { position:sticky; left:0; z-index:4; background:transparent }

   A sticky cell slides OVER the columns as they pan — but it only MASKS them if
   it paints something. Transparent, the job cards underneath show straight
   through it. In the screenshot a "Needs a crew" card sat on top of the Curtis
   and Scottie chips with its text clipped at the left edge ("Veeds new",
   "49 Harriet" with the leading digit gone).

   ⚠ ITS SIBLING IS THE PROOF THIS IS A DEFECT AND NOT A CHOICE.
   #cr-disp .dcol .c.rail is the same sticky-left-z4 construction and has always
   carried background:var(--disp-panel,#101216). 990 copies that value rather
   than inventing one — and the board ground (.dspmap) is the same token, so
   nothing changes at rest.

   ⚠ AND THE MECHANISM WAS PROVEN IN A RENDER, WHICH TOOK TWO TRIES.
   The first synthetic repro reported "masked correctly" for BOTH cases, because
   a sticky cell does not overlap anything until the container is actually
   SCROLLED — at scrollLeft 0 it sits in its natural position with nothing
   beneath it. Assertion 4 below pans before it measures, for that reason.

     1  the crew cell paints the panel token, with a literal fallback
     2  it matches its sibling rail exactly — same value, not a new colour
     3  the sticky pinning is untouched (left:0, z-index:4 still there)
     4  RENDERED+PANNED: content beneath the cell is masked        ← load-bearing
     5  ...and that CAN fail — make it transparent again and it bleeds through

   Usage: node gate_990.mjs [path] — previous build = negative control; must go
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

function ruleAt(needle){
  const i=APP.indexOf(needle);
  if(i===-1) return '';
  return APP.slice(i, APP.indexOf('}', i)+1);
}
const CREWC = ruleAt('#cr-disp .crewc{');
const RAIL  = ruleAt('#cr-disp .dcol .c.rail{');
/* strip comments before reading declarations — 990's own note quotes the words
   "transparent" and "background", and this file has paid repeatedly for a count
   that matched its own prose. */
const decls = s => s.replace(/\/\*[\s\S]*?\*\//g, '');

need('0 both sticky rules were located', !!CREWC && !!RAIL,
     'crewc:' + (CREWC?'ok':'MISSING') + ' rail:' + (RAIL?'ok':'MISSING'));
need('1 the crew cell paints the panel token with a fallback',
     /background:\s*var\(--disp-panel,\s*#101216\)/.test(decls(CREWC)),
     'declarations: ' + decls(CREWC).slice(0,150));
need('2 it matches its sibling rail — same value, no new colour',
     /background:\s*var\(--disp-panel,\s*#101216\)/.test(decls(RAIL)) &&
     /background:\s*var\(--disp-panel,\s*#101216\)/.test(decls(CREWC)),
     'rail: ' + (decls(RAIL).match(/background:[^;]*/)||['none'])[0] +
     ' | crewc: ' + (decls(CREWC).match(/background:[^;]*/)||['none'])[0]);
need('3 the sticky pinning is untouched',
     /position:\s*sticky/.test(decls(CREWC)) && /left:\s*0/.test(decls(CREWC)) &&
     /z-index:\s*4/.test(decls(CREWC)),
     'the cell stopped being pinned: ' + decls(CREWC).slice(0,150));

/* ── rendered. Build the sticky construction from the SHIPPED declarations
   rather than re-typing them, so this tests the artifact and not my copy. ── */
const browser=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
const watchdog=setTimeout(()=>{ console.log('GATE TIMEOUT'); process.exit(1); },120000);

async function bleeds(cellCss){
  const page=await browser.newPage({viewport:{width:420,height:200}});
  await page.setContent(`<!doctype html><style>
    :root{--disp-panel:#101216}
    body{margin:0;background:#08090b}
    .scroll{overflow-x:auto;width:400px;background:#101216}
    .row{display:grid;grid-template-columns:150px repeat(6,120px);align-items:center;height:70px}
    .cell{height:60px;display:flex;align-items:center;${cellCss}}
    .job{background:#3a0d12;border:2px solid #e5484d;color:#ff8a8a;
         font:700 12px sans-serif;padding:8px;grid-column:2/5}
  </style>
  <div class="scroll"><div class="row">
    <div class="cell"><span style="color:#fff;font:700 12px monospace">CURTIS</span></div>
    <div class="job">Needs new crew</div>
  </div></div>`);
  /* ⚠ pan FIRST. Sticky does not overlap at scrollLeft 0 — that is why the
     first version of this proof passed for both cases. */
  await page.evaluate(()=>{ document.querySelector('.scroll').scrollLeft = 260; });
  await page.waitForTimeout(220);
  const box = await page.evaluate(()=>{
    const c=document.querySelector('.cell').getBoundingClientRect();
    return {x:Math.round(c.right-30), y:Math.round(c.top+c.height/2)};
  });
  const png = await page.screenshot({clip:{x:box.x,y:box.y,width:4,height:4}});
  const px = await page.evaluate(async b64=>{
    const i=new Image(); i.src='data:image/png;base64,'+b64; await i.decode();
    const c=document.createElement('canvas'); c.width=i.width;c.height=i.height;
    const g=c.getContext('2d'); g.drawImage(i,0,0);
    const d=g.getImageData(0,0,c.width,c.height).data;
    return [d[0],d[1],d[2]];
  }, png.toString('base64'));
  await page.close();
  /* the job card is a dark RED; the panel is a neutral near-black. A red
     channel meaningfully above the others means the card bled through. */
  return { px, bled: px[0] - Math.max(px[1],px[2]) > 12 };
}

const shipped = decls(CREWC).replace('#cr-disp .crewc{','').replace(/}$/,'');
let ok={}, ctl={};
try{ ok  = await bleeds(shipped); }catch(e){ ok={err:String(e).slice(0,90)}; }
try{ ctl = await bleeds(shipped.replace(/background:[^;]*;/, 'background:transparent;')); }
catch(e){ ctl={err:String(e).slice(0,90)}; }

need('4 RENDERED+PANNED: content beneath the pinned cell is masked',
     ok.bled === false,
     'painted rgb(' + (ok.px||[]).join(', ') + ')' + (ok.err?' — '+ok.err:'') +
     ' — a red-dominant pixel means the job card showed through');
need('5 ...and that CAN fail — transparent again and it bleeds through',
     ctl.bled === true,
     'with background:transparent restored the same probe painted rgb(' +
     (ctl.px||[]).join(', ') + ')' + (ctl.err?' — '+ctl.err:'') +
     ' — expected the red card to show');

clearTimeout(watchdog);
await browser.close();
console.log(`gate_990 [${LABEL}]  pass ${passes}  fail ${fails.length}`);
fails.forEach(f=>console.log('  FAIL ' + f));
console.log(fails.length ? 'RED' : 'GREEN');
process.exit(fails.length ? 1 : 0);
