/* gate_987.mjs — the amber warning colour is readable again (build 987).

   FIVE failures, not the one the open item recorded. The item said "light half
   #C87A00 at 3.37:1 on white"; measured, that describes ONE site.

     light  six pill inks on --cr-amber-tint #FBEFDA      2.96 -> 5.46
     light  claims `partial` ink on white                 3.37 -> 6.21
     light  .cr-p-save-status.saving, white ink on amber  3.37 -> 6.21
     DARK   estimates ink on its dark tint                3.93 -> 5.88
     DARK   .cr-p-save-status.saving, white on amber      2.25 -> STILL OPEN

   ⚠ WHY THIS IS NOT A ONE-LINE TOKEN CHANGE. Deepening --cr-amber's light half
   helps every site where it is INK on a pale ground — and HURTS the one site
   where it is the GROUND under dark ink. .cr-chrome-badge is that site:
   #1a1a1a on #8a5500 is 2.80:1 against 5.17:1 on #C87A00. It is pinned per-site
   rather than sweeping the token, following build 942's precedent (which had
   already done exactly this for #cr-pricing-mount .lock, at the same #8a5500).

   ⚠ AND ESTIMATES HAD NO PAIR AT ALL — one unscoped literal used in BOTH
   themes, while its own --cr-amber-tint delegated to --rbe-ambertint and
   flipped correctly. An asymmetry, not a design. That is a DARK defect the
   "light half" framing hid completely.

     1  all five light declarations are #8a5500 (4 siblings + estimates' new one)
     2  the four DARK declarations are byte-identical — untouched
     3  estimates has a real pair now: dark base + light-scoped rule
     4  the badge is pinned, and pinned per-site not by sweeping the token
     5  RESOLVED: --cr-amber computes to #8a5500 in light, #e0a13a in dark  ← load-bearing
     6  RESOLVED: the badge ground stays #C87A00 in light
     7  ...and that test CAN fail — unpin the badge and it goes red
     8  no colour was invented: #8a5500 is build 942's own shipped value

   Usage: node gate_987.mjs [path] — previous build = negative control; must go
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

/* ── static. Count DECLARATIONS, not mentions: this build's own comments quote
   both hex values, and a bare count of "#8a5500" would find them. Anchor on the
   `--cr-amber:` property form instead. ── */
const light = (APP.match(/--cr-amber:\s*#8a5500/g)||[]).length;
const dark  = (APP.match(/--cr-amber:\s*#e0a13a/g)||[]).length;
const oldLt = (APP.match(/--cr-amber:\s*#C87A00/gi)||[]).length;

/* ⚠ FIVE, not four. Four sibling modules (pricing/claims/adj/coach) were
   deepened, and estimates GAINED a light-scoped rule it never had — so light
   and dark must both come to 5, symmetric. The first version of this assertion
   said 4: a number from my own mental model of the change rather than from the
   change itself, and the gate caught it. */
need('1 all five light declarations resolve to the deepened value', light === 5,
     'found ' + light + ' `--cr-amber:#8a5500` declarations (expect 5: 4 siblings + estimates)');
/* ⚠ 2 is the half that must NOT move. Four sibling modules were dark-correct
   already; 987 is a light-side repair plus one estimates pair. */
need('2 the dark declarations are untouched, plus estimates gains one', dark === 5,
     'found ' + dark + ' `--cr-amber:#e0a13a` (expect 4 originals + 1 new estimates base)');
need('8 no colour invented — #C87A00 survives ONLY as the pinned badge ground',
     oldLt === 0, oldLt + ' `--cr-amber:#C87A00` declarations remain; all should be gone');
need('3 estimates has a real pair now',
     /--cr-amber:\s*#e0a13a/.test(APP.slice(APP.indexOf('#cr-estimates-mount {'), APP.indexOf('#cr-estimates-mount {')+700)) &&
     APP.indexOf(':root[data-theme="rb-light"] #cr-estimates-mount{--cr-amber:#8a5500}') !== -1,
     'estimates base is not dark, or the light-scoped rule is missing');
need('4 the badge is pinned per-site, not by sweeping the token',
     APP.indexOf(':root[data-theme="rb-light"] .cr-chrome-badge{background:#C87A00}') !== -1,
     'the badge override is missing — light ink would sit at 2.80:1');

/* ── resolved in a real engine. A token can be declared and still not reach the
   element; only getComputedStyle settles it. ── */
const browser=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
const watchdog=setTimeout(()=>{ console.log('GATE TIMEOUT'); process.exit(1); },150000);

/* Lift the real declarations out of the artifact rather than re-typing them —
   that is what makes this a test of the file and not of my own copy. */
function blockOf(id){
  const i=APP.indexOf('<style id="'+id+'"');
  return i===-1 ? '' : APP.slice(APP.indexOf('>',i)+1, APP.indexOf('</style>',i));
}
const EST = blockOf('cr-estimates-styles');

async function resolve(theme){
  const page=await browser.newPage({viewport:{width:900,height:400}});
  await page.setContent(`<!doctype html><style>${EST}</style>
    <div id="cr-estimates-mount"><div class="cr-chrome-badge"><span class="dot"></span>X</div></div>`);
  await page.evaluate(t=>{ if(t==='light') document.documentElement.setAttribute('data-theme','rb-light');
                           else document.documentElement.removeAttribute('data-theme'); }, theme);
  await page.waitForTimeout(220);
  const out = await page.evaluate(()=>{
    const m=document.getElementById('cr-estimates-mount');
    const b=document.querySelector('.cr-chrome-badge');
    return { amber:getComputedStyle(m).getPropertyValue('--cr-amber').trim(),
             badgeBg:b?getComputedStyle(b).backgroundColor:'none' };
  });
  await page.close(); return out;
}
let L={},D={};
try{ L=await resolve('light'); }catch(e){ L={err:String(e).slice(0,90)}; }
try{ D=await resolve('dark');  }catch(e){ D={err:String(e).slice(0,90)}; }

need('5 RESOLVED: --cr-amber is #8a5500 in light and #e0a13a in dark',
     /#8a5500/i.test(L.amber||'') && /#e0a13a/i.test(D.amber||''),
     'light resolved "' + (L.amber||L.err) + '", dark resolved "' + (D.amber||D.err) + '"');
need('6 RESOLVED: the badge ground stays #C87A00 in light',
     (L.badgeBg||'') === 'rgb(200, 122, 0)',
     'badge painted ' + (L.badgeBg||L.err) + ' (expect rgb(200, 122, 0)); ' +
     'if this is rgb(138, 85, 0) the pin was lost and dark ink drops to 2.80:1');

/* 7 — the negative control for 6, on a copy with the pin removed. */
const unpinned = EST.replace(':root[data-theme="rb-light"] .cr-chrome-badge{background:#C87A00}','');
let unpinnedBg='(not run)';
if(unpinned !== EST){
  try{
    const p=await browser.newPage({viewport:{width:900,height:400}});
    await p.setContent(`<!doctype html><style>${unpinned}</style>
      <div id="cr-estimates-mount"><div class="cr-chrome-badge">X</div></div>`);
    await p.evaluate(()=>document.documentElement.setAttribute('data-theme','rb-light'));
    await p.waitForTimeout(220);
    unpinnedBg = await p.evaluate(()=>getComputedStyle(document.querySelector('.cr-chrome-badge')).backgroundColor);
    await p.close();
  }catch(e){ unpinnedBg='harness: '+String(e).slice(0,70); }
}
need('7 ...and that test CAN fail — unpinning the badge changes what it paints',
     unpinned !== EST && unpinnedBg === 'rgb(138, 85, 0)',
     'with the pin removed the badge painted ' + unpinnedBg + ' (expect rgb(138, 85, 0) = #8a5500)');

clearTimeout(watchdog);
await browser.close();
console.log(`gate_987 [${LABEL}]  pass ${passes}  fail ${fails.length}`);
fails.forEach(f=>console.log('  FAIL ' + f));
console.log(fails.length ? 'RED' : 'GREEN');
process.exit(fails.length ? 1 : 0);
