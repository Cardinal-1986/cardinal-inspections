/* gate_985.mjs — two Community greens made readable on the light theme (985).

   THE DEFECT. Two rules carried a raw #34D399 — a green chosen for the dark
   screen — with no light value:
     .cr-pcard.community .t{ color:#34D399 }                     1.81:1 light
     body[data-crm=community] #commsView #commsCli{...}           1.71:1 light
   Both are fine in dark (8.37 / 9.93) and both are far under the 4.5 floor in
   light.

   WHY A TOKEN PAIR AND NOT A COMPUTED LITERAL. Measured on the real grounds:
       ground                #34D399   #047857
       light #f7f8f7           1.81      5.15
       light #f1f2f1           1.71      4.89
       dark  #161918           9.21      3.23
   NEITHER literal clears the floor in both themes. Only --ccm-ac does, because
   it IS #34D399 in dark and #047857 in light. This is the repo's own rule —
   prefer an existing token PAIR to a computed literal — and here it is not a
   style preference, it is the only thing that works.

   ⚠ THE TRAP, AND WHY ASSERTION 4 IS THE LOAD-BEARING ONE. #commsCli sets BOTH
   `color` and `-webkit-text-fill-color`. Proven in a 4-case Chromium control:
   whenever -webkit-text-fill-color is set it paints the glyphs and `color` does
   not — even `color:… !important` loses to it. So a patch that changed `color`
   alone would pass every CSS-text check and render EXACTLY as before. Assertion
   4 samples the PAINTED PIXEL, not the declaration.

   ⚠ The !important must stay: it beats an inline style="color:#9c1822" on the
   span, which is the RETAIL red. Assertion 6 guards that.

     1  both rules reference --ccm-ac with a literal fallback
     2  #commsCli moved BOTH properties, not just color
     3  --ccm-ac is a real pair — declared in dark AND light
     4  PAINTED: the light-theme ink is #047857, sampled from the pixel  ← load-bearing
     5  PAINTED: the dark-theme ink is unchanged at #34D399
     6  the !important survived, so the inline retail red is still beaten
     7  no raw #34D399 remains in either rule
     8  the sibling .viewhead rule is untouched

   Usage: node gate_985.mjs [path] — previous build = negative control; must go
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
function need(name, ok, detail){ if(ok){passes++;} else fails.push(name+(detail?' — '+detail:'')); }

/* ── static ───────────────────────────────────────────────────────────────── */
function ruleAt(needle){
  const i = APP.indexOf(needle);
  if(i === -1) return '';
  const close = APP.indexOf('}', i);
  return APP.slice(i, close === -1 ? i+400 : close+1);
}
const PCARD = ruleAt('.cr-pcard.community .t{');
const CLI   = ruleAt('body[data-crm="community"] #commsView #commsCli{');

need('0 both rules were located', !!PCARD && !!CLI,
     'pcard:' + (PCARD?'ok':'MISSING') + ' cli:' + (CLI?'ok':'MISSING'));
need('1 both reference --ccm-ac with a literal fallback',
     /var\(--ccm-ac,\s*#34D399\)/.test(PCARD) && /var\(--ccm-ac,\s*#34D399\)/.test(CLI),
     'pcard: ' + PCARD.slice(0,90) + ' || cli: ' + CLI.slice(0,110));
/* ⚠ 2 is the one a naive patch fails. Both properties, or it ships inert. */
const cliDecls = CLI.replace(/\/\*[\s\S]*?\*\//g,'');
need('2 #commsCli moved BOTH color and -webkit-text-fill-color',
     /(^|[;{])\s*color:\s*var\(--ccm-ac/.test(cliDecls) &&
     /-webkit-text-fill-color:\s*var\(--ccm-ac/.test(cliDecls),
     'declarations: ' + cliDecls.slice(0,190));
const acDark  = /--ccm-ac:\s*#34D399/i.test(APP);
const acLight = /--ccm-ac:\s*#047857/i.test(APP);
need('3 --ccm-ac is a real pair, declared in both themes',
     acDark && acLight, 'dark #34D399:' + acDark + '  light #047857:' + acLight);
need('6 the !important survived — it beats the inline retail red',
     /!important/.test(CLI) && APP.indexOf('style="color:#9c1822;"') !== -1,
     'important in rule: ' + /!important/.test(CLI) +
     ', inline retail red still present: ' + (APP.indexOf('style="color:#9c1822;"') !== -1));
need('7 no raw #34D399 survives as a VALUE in either rule',
     !/color:\s*#34D399/.test(PCARD.replace(/\/\*[\s\S]*?\*\//g,'')) &&
     !/color:\s*#34D399/.test(cliDecls),
     'pcard: ' + PCARD.slice(0,80) + ' || cli: ' + cliDecls.slice(0,120));
need('8 the sibling .viewhead rule is untouched',
     APP.indexOf('body[data-crm="community"] #commsView .viewhead{color:var(--ccm-ac,#34D399);') !== -1,
     'the .viewhead rule changed or moved');

/* ── PAINTED: the only test that can tell a real fix from an inert one ────── */
const browser=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
const watchdog=setTimeout(()=>{ console.log('GATE TIMEOUT'); process.exit(1); },150000);

/* Build a minimal page carrying the two rules AS THE FILE DECLARES THEM plus
   the real --ccm-ac declarations, then sample the painted glyph. Extracting the
   shipped text (never re-typing it) is what makes this a test of the artifact
   rather than of my own re-implementation. */
const acDarkVal  = (APP.match(/--ccm-ac:\s*(#[0-9a-f]{6})/i)||[])[1] || '#34D399';
const acLightVal = (APP.match(/--ccm-ac:\s*#047857/i) ? '#047857' : null);

async function painted(theme){
  const page=await browser.newPage({viewport:{width:500,height:300}});
  const ac = theme==='light' ? acLightVal : acDarkVal;
  const ground = theme==='light' ? '#f1f2f1' : '#161918';
  await page.setContent(`<!doctype html><style>
    :root{--ccm-ac:${ac}}
    body{margin:0;background:${ground};font:900 48px/1.3 Arial}
    /* the SHIPPED rules, lifted verbatim from the artifact */
    ${PCARD.replace('.cr-pcard.community .t{','#pc{')}
    ${CLI.replace('body[data-crm="community"] #commsView #commsCli{','#cli{')}
    #pc,#cli{display:block;padding:6px 12px}
  </style>
  <span id="pc">ABC</span><span id="cli" style="color:#9c1822;">ABC</span>`);
  await page.waitForTimeout(250);
  const out={};
  for(const id of ['pc','cli']){
    const b=await page.evaluate(i=>{const r=document.getElementById(i).getBoundingClientRect();
      return {x:Math.round(r.left),y:Math.round(r.top),w:Math.round(r.width),h:Math.round(r.height)};}, id);
    const png=await page.screenshot({clip:{x:b.x,y:b.y,width:b.w,height:b.h}});
    out[id]=await page.evaluate(async (b64)=>{
      const img=new Image(); img.src='data:image/png;base64,'+b64; await img.decode();
      const c=document.createElement('canvas'); c.width=img.width; c.height=img.height;
      const g=c.getContext('2d'); g.drawImage(img,0,0);
      const d=g.getImageData(0,0,c.width,c.height).data;
      /* the most-saturated / most-distinct pixel is the glyph ink */
      const counts={};
      for(let i=0;i<d.length;i+=4){ if(d[i+3]<250) continue;
        const k=d[i]+','+d[i+1]+','+d[i+2]; counts[k]=(counts[k]||0)+1; }
      const keys=Object.keys(counts).sort((a,b)=>counts[b]-counts[a]);
      /* [0] is the ground (most pixels); the ink is the next most common */
      return keys[1] || keys[0];
    }, png.toString('base64'));
  }
  await page.close();
  return out;
}
const hex = rgb => rgb ? '#'+rgb.split(',').map(n=>(+n).toString(16).padStart(2,'0')).join('') : 'none';
let light={}, dark={};
try{ light = await painted('light'); }catch(e){ /* BUG_CLASSES 37 — record, never crash */ }
try{ dark  = await painted('dark');  }catch(e){}

const lp=hex(light.pc), lc=hex(light.cli), dp=hex(dark.pc), dc=hex(dark.cli);
need('4 PAINTED: light-theme ink is #047857 on BOTH sites',
     acLightVal === '#047857' && lp === '#047857' && lc === '#047857',
     'pcard painted ' + lp + ', commsCli painted ' + lc +
     ' (a naive `color`-only patch paints #34d399 here and this is the assertion that catches it)');
need('5 PAINTED: dark-theme ink unchanged at #34d399',
     dp === '#34d399' && dc === '#34d399',
     'pcard painted ' + dp + ', commsCli painted ' + dc);

clearTimeout(watchdog);
await browser.close();
console.log(`gate_985 [${LABEL}]  pass ${passes}  fail ${fails.length}`);
fails.forEach(f=>console.log('  FAIL ' + f));
console.log(fails.length ? 'RED' : 'GREEN');
process.exit(fails.length ? 1 : 0);
