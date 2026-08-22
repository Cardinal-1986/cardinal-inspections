/* gate_988.mjs — the Saving / Saved / Error pills were invisible in dark (988).

   `--cr-black` is a SURFACE token. It is #1a1a1a in light and **#f2f4f7 —
   near-white — in dark**, which is right for a card and wrong for a solid pill.
   Three floating status pills used it as a GROUND under a hardcoded white ink:

     #cr-pricing-mount .cr-p-save-status     white on #f2f4f7 = 1.10:1
     #cr-claims-mount  .cr-c-toast           white on #f2f4f7 = 1.10:1
     #cr-coach-mount   (its toast)           white on #f2f4f7 = 1.10:1

   All three in the app's DEFAULT theme. And in pricing the state classes only
   swap the ground, so every state failed too: .saving 2.25, .saved 2.07,
   .error 2.78 — the base at 1.10 being literally invisible.

   THE FIX is one ink token that flips WITH the ground — the shape build 982
   shipped as --ccm-onwarn. #1a1a1a in dark (grounds are pale there), #ffffff in
   light (grounds are deep). One token covers all four states because the four
   grounds all flip together.

   ⚠ ONE SITE MUST NOT MOVE. `.cr-chrome-top, .cr-chrome-bottom` in
   cr-estimates-styles carries the IDENTICAL declaration text — and is correct,
   because estimates' --cr-black is #1a1a1a in BOTH themes (17.40:1). A
   file-wide substitution would have changed a passing element. Assertion 4
   guards it, and the patch spliced per style block for that reason.

     1  all three pills take the flipping ink token
     2  --cr-onsolid is a real pair in all three modules
     3  RESOLVED: the ink computes dark in dark and white in light  ← load-bearing
     4  the estimates chrome bar was NOT touched — it was already correct
     5  ...and the fix can fail — pin the ink back to white and dark goes red
     6  every pricing state clears 4.5:1 in BOTH themes

   Usage: node gate_988.mjs [path] — previous build = negative control; must go
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
function blockOf(id){
  const i=APP.indexOf('<style id="'+id+'"');
  return i===-1 ? '' : APP.slice(APP.indexOf('>',i)+1, APP.indexOf('</style>',i));
}
function lum(c){const t=c.map(v=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4);});
  return 0.2126*t[0]+0.7152*t[1]+0.0722*t[2];}
function ratio(a,b){const L1=lum(a),L2=lum(b);return (Math.max(L1,L2)+0.05)/(Math.min(L1,L2)+0.05);}
const rgb = s => (s.match(/\d+/g)||[]).slice(0,3).map(Number);

const MODS=['cr-pricing-styles','cr-claims-styles','cr-coach-styles'];
need('1 all three pills take the flipping ink token',
     MODS.every(m => /color:\s*var\(--cr-onsolid,#fff\)/.test(blockOf(m))),
     MODS.map(m=>m+':'+(/color:\s*var\(--cr-onsolid,#fff\)/.test(blockOf(m))?'ok':'MISSING')).join(' '));
need('2 --cr-onsolid is a real pair in all three modules',
     (APP.match(/--cr-onsolid:#1a1a1a/g)||[]).length === 3 &&
     (APP.match(/--cr-onsolid:#ffffff/g)||[]).length === 3,
     'dark ' + (APP.match(/--cr-onsolid:#1a1a1a/g)||[]).length +
     ', light ' + (APP.match(/--cr-onsolid:#ffffff/g)||[]).length + ' (expect 3 and 3)');
/* ⚠ 4 — the site that must NOT have moved. */
need('4 the estimates chrome bar was left alone — it was already correct',
     /\.cr-chrome-top,\s*\.cr-chrome-bottom\s*\{[^}]*color:\s*white/.test(blockOf('cr-estimates-styles')),
     'the chrome bar lost its literal white ink; its --cr-black is #1a1a1a in BOTH themes (17.40:1) ' +
     'and a file-wide substitution is the only way this changes');

const browser=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
const watchdog=setTimeout(()=>{ console.log('GATE TIMEOUT'); process.exit(1); },150000);
const PRICE = blockOf('cr-pricing-styles');

async function measure(theme, css){
  const page=await browser.newPage({viewport:{width:900,height:500}});
  await page.setContent(`<!doctype html><style>${css}</style>
    <div id="cr-pricing-mount">
      <div class="cr-p-save-status show" id="s0">BASE</div>
      <div class="cr-p-save-status show saving" id="s1">SAVING</div>
      <div class="cr-p-save-status show saved"  id="s2">SAVED</div>
      <div class="cr-p-save-status show error"  id="s3">ERROR</div>
    </div>`);
  await page.evaluate(t=>{ if(t==='light') document.documentElement.setAttribute('data-theme','rb-light');
                           else document.documentElement.removeAttribute('data-theme'); }, theme);
  await page.waitForTimeout(220);
  const out = await page.evaluate(()=>{
    const r={};
    for(const id of ['s0','s1','s2','s3']){
      const e=document.getElementById(id); const cs=getComputedStyle(e);
      r[id]={ ink:cs.color, bg:cs.backgroundColor };
    }
    return r;
  });
  await page.close(); return out;
}
let D={}, L={};
try{ D=await measure('dark', PRICE); }catch(e){ D={err:String(e).slice(0,90)}; }
try{ L=await measure('light', PRICE); }catch(e){ L={err:String(e).slice(0,90)}; }

function worst(set){
  let w=99, detail=[];
  for(const k of ['s0','s1','s2','s3']){
    if(!set[k]) return {w:0, detail:['unmeasured']};
    const v=ratio(rgb(set[k].ink), rgb(set[k].bg));
    detail.push(k+' '+v.toFixed(2));
    if(v<w) w=v;
  }
  return {w, detail};
}
const wd=worst(D), wl=worst(L);
need('3 RESOLVED: the ink flips — dark ink in dark, white ink in light',
     /rgb\(26, 26, 26\)/.test((D.s0||{}).ink||'') && /rgb\(255, 255, 255\)/.test((L.s0||{}).ink||''),
     'dark ink "' + ((D.s0||{}).ink || D.err) + '", light ink "' + ((L.s0||{}).ink || L.err) + '"');
need('6 every pricing state clears 4.5:1 in BOTH themes',
     wd.w >= 4.5 && wl.w >= 4.5,
     'dark  [' + wd.detail.join(' ') + ']   light [' + wl.detail.join(' ') + ']');

/* 5 — the control for 3/6: pin the ink back to white and dark must go red. */
const pinned = PRICE.replace(/color:\s*var\(--cr-onsolid,#fff\)/, 'color: white');
let pd={w:-1,detail:['not run']};
if(pinned !== PRICE){ try{ pd = worst(await measure('dark', pinned)); }catch(e){ pd={w:-1,detail:['harness']}; } }
need('5 ...and that CAN fail — pinning the ink back to white breaks dark again',
     pinned !== PRICE && pd.w < 4.5,
     'with white ink restored, worst dark ratio was ' + (pd.w<0?pd.detail[0]:pd.w.toFixed(2)) +
     ' (expect under 4.5 — it was 1.10 on the shipped 987)');

clearTimeout(watchdog);
await browser.close();
console.log(`gate_988 [${LABEL}]  pass ${passes}  fail ${fails.length}`);
fails.forEach(f=>console.log('  FAIL ' + f));
console.log(fails.length ? 'RED' : 'GREEN');
process.exit(fails.length ? 1 : 0);
