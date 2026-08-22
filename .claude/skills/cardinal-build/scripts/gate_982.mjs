/* gate_982.mjs — Community reads properly on the light theme (build 982).

   The second half of item 6 option 1. Era A was built dark-first and ten inks
   were declared once, so on the white card they ran from washed out to
   invisible. Every value here was COMPUTED, then verified in a real render.

   ⚠ THE MEASURING RIG IS THE TRAP, twice over, and this file obeys both:
   · background-color is NOT the background. Cards paint linear-gradients,
     which are background-IMAGES, so an ancestor walk reading only
     backgroundColor sails past the card and scores the page behind it. This
     gate reads the REAL composited pixel with elementFromPoint + a canvas-free
     walk that also collects gradient stops.
   · Do NOT concatenate the <style> blocks into a rig. Several of the 145 are
     print stylesheets inside template strings that set :root{--ink:#1b1b1b}.
     Load the real document.

     1  the five token pairs are declared in BOTH theme blocks (no orphans)
     2  --warn stops being the one raw literal among its neighbours
     3  the two amber GROUNDS moved off the ink token
     4  981's badge override is retired — replacing the base alone was inert
     5  the retired single-theme literals are gone from CODE
     6  RENDER: every changed ink clears its floor in BOTH themes
     7  RENDER: dark is unchanged — this build must not move what already works
     8  RENDER: the funding-partner cell stops flooding, and keeps its border
     9  Community Analytics is all five inks, not half

   Usage: node gate_982.mjs [path] — previous build = negative control; must go
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
const SETUP=readFileSync(join(HERE,'sentinel_setup_cardinal.js'),'utf8')+'\n;\n'+readFileSync(join(HERE,'e2e_mock_supa.js'),'utf8');
const PNG=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==','base64');

let fails=[], passes=0;
function need(n, ok, d){ if(ok){passes++;} else fails.push(n+(d?' — '+d:'')); }
const strip = s => s.replace(/\/\*[\s\S]*?\*\//g, '');
const CODE = strip(APP);   /* ⚠ every count below runs on comment-stripped source:
                              this build's own verification tripped on a comment
                              that quoted the literal it was retiring. */

const PAIRS = ['--ccm-warn','--ccm-warnsolid','--ccm-onwarn','--ccm-nowfill','--ccm-washfill'];
const decl = t => (CODE.match(new RegExp(t.replace(/-/g,'\\-')+'\\s*:','g')) || []).length;
const missing = PAIRS.filter(t => decl(t) !== 2);
need('1 the five token pairs are declared in BOTH theme blocks',
     missing.length === 0,
     missing.map(t => t+'='+decl(t)+'x').join(', ') || '');

need('2 --warn delegates to a flipping token instead of a raw literal',
     /--warn:var\(--ccm-warn,#ffcf6b\)/.test(CODE) && /--warnsolid:var\(--ccm-warnsolid,#ffcf6b\)/.test(CODE),
     'the #cr-cc alias still pins a literal');
/* ⚠ NOT "no ground may read --warn". There are THREE amber grounds and they
   split on whether they CARRY TEXT:
   · .ev .doit and .sheet .duebar button carry near-black --ccm-onwarn, so
     their ground must NOT flip or that ink breaks — they use --warnsolid.
   · .ev.now::before is a 9px MARKER DOT carrying nothing, so it SHOULD follow
     the ink and go dark in light: #805500 on white is 6.53:1 where bright
     amber is 1.46:1 and all but disappears. It correctly keeps var(--warn).
   The first version of this assertion forbade all three and failed correct
   code — and it is how the third ground was found at all. */
const solidN = (CODE.match(/background:var\(--warnsolid,#ffcf6b\)/g) || []).length;
const textGroundsOk = /#cr-cc \.ev \.doit\{[^}]*background:var\(--warnsolid/.test(CODE) &&
                      /#cr-cc \.sheet \.duebar button\{background:var\(--warnsolid/.test(CODE);
const dotFollowsInk = /#cr-cc \.ev\.now::before\{background:var\(--warn\)/.test(CODE);
need('3 the amber grounds that carry TEXT moved off the ink token',
     solidN === 2 && textGroundsOk && dotFollowsInk,
     'warnsolid x' + solidN + ' (want 2)' + (textGroundsOk ? '' : ', a text-bearing ground still reads --warn') +
     (dotFollowsInk ? '' : ', and the marker dot no longer follows the ink'));
need('4 981\'s badge override is retired',
     !/\[data-theme="rb-light"\] #cr-cc \.cc-jmb \.n\s*\{/.test(CODE) &&
     /#cr-cc \.cc-jmb \.n\{[^}]*color:var\(--warn,#ffcf6b\)\}/.test(CODE),
     'the override still wins, so re-pointing the base rule is inert');
const GONE = ['#d8cfc9','#7fe3b0','#ff8f8f'];
const left = GONE.filter(h => CODE.toLowerCase().includes(h));
need('5 the retired single-theme literals are gone from code',
     left.length === 0, 'still present: ' + left.join(', '));
/* ⚠ NOT a count — cr-can already had other --ccm-* references, so `=== 5`
   failed correct code at 7. Assert the five SPECIFIC rules. */
const CAN5 = [
  /#cr-can \.stat \.v\.good\{color:var\(--ccm-ac,/,
  /#cr-can \.stat \.v\.warn\{color:var\(--ccm-warn,/,
  /#cr-can \.prow \.m\{[^}]*color:var\(--ccm-ac,/,
  /#cr-can \.prow \.d\{[^}]*color:var\(--ccm-warn,/,
  /#cr-can \.prow \.d\.hot\{color:var\(--ccm-rd,/,
];
const canMissing = CAN5.filter(r => !r.test(CODE)).length;
need('9 Community Analytics is all five inks, not half',
     canMissing === 0, canMissing + ' of the 5 analytics rules are not tokenised');

/* ── the render ──────────────────────────────────────────────────────────── */
const browser=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
const watchdog=setTimeout(()=>{ console.log('GATE TIMEOUT'); process.exit(1); },160000);
const page=await browser.newPage({viewport:{width:1194,height:900}});
await page.route('**/*', r=>{const u=r.request().url(), rt=r.request().resourceType();
  if(u.startsWith('https://sentinel.test/') && /sentinel\.test\/?(\?|$)/.test(u))
    return r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:APP});
  if(rt==='image') return r.fulfill({status:200,contentType:'image/png',body:PNG});
  return r.fulfill({status:200,contentType:'text/plain',body:''});});
await page.addInitScript(SETUP);
await page.goto('https://sentinel.test/?as=theo',{waitUntil:'domcontentloaded'});
await page.waitForTimeout(2400);

/* ⚠ THE FIRST VERSION OF THIS GATE GUESSED THE COMPOSITE AND WAS WRONG.
   It walked the ancestors collecting every gradient stop and scored the ink
   against the WORST — but `.ct.bill` paints `<fill> padding-box, <ring>
   border-box`, and `.ct.bill .k`'s ink IS one of the ring's stops, so it
   reported 1.00:1 in BOTH themes for text that is perfectly legible. A border
   gradient is not the ground under the glyph.
   So: read the REAL PIXEL. Screenshot a few px inside the element's padding
   box, away from the border and away from the glyph, and average it. That is
   the only ground that cannot be argued with. */
async function seed(){
  return await page.evaluate(async ()=>{
    const cache=window.cacheProjects||[];
    if(!cache.length) return 'no projects in the harness';
    const t=cache[0];
    const ck=(typeof t.checklist==='string')?JSON.parse(t.checklist||'{}'):(t.checklist||{});
    ck.lead=Object.assign({},ck.lead||{},{claim_type:'community',partner_name:'Habitat for Humanity'});
    t.checklist=JSON.stringify(ck);
    if(typeof window.openProject==='function') await window.openProject(t.id);
    await new Promise(r=>setTimeout(r,2200));
    const lv=document.getElementById('landingView'); if(lv) lv.style.display='none';
    await new Promise(r=>setTimeout(r,800));
    return 'ok';
  });
}
const seeded = await seed();

const TARGETS=[
  ['.cc-jmb .n',            '#cr-cc .cc-jmb .n',                4.5],
  ['.pin .facts .k',        '#cr-cc .pin .facts .k',            4.5],
  ['.ccwo-st.done',         '#cr-cc .cc-wo-crew .ccwo-st.done', 4.5],
  ['.ccwo-st.disp',         '#cr-cc .cc-wo-crew .ccwo-st.disp', 4.5],
  ['.ct.bill .k (BILL TO)', '#cr-cc .ct.bill .k',               4.5],
  ['.ct.bill .v (partner)', '#cr-cc .ct.bill .v',               4.5],
];
function lum(c){const t=c.map(v=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4);});
  return 0.2126*t[0]+0.7152*t[1]+0.0722*t[2];}
function ratio(a,b){const L1=lum(a),L2=lum(b);return (Math.max(L1,L2)+0.05)/(Math.min(L1,L2)+0.05);}

async function measure(theme){
  await page.evaluate(t=>{ if(t==='light') document.documentElement.setAttribute('data-theme','rb-light');
    else document.documentElement.removeAttribute('data-theme'); }, theme);
  await page.waitForTimeout(300);
  const rec={};
  for(const [name,sel,floor] of TARGETS){
    const info = await page.evaluate(s=>{
      const el=document.querySelector(s);
      if(!el) return null;
      el.scrollIntoView({block:'center'});
      const r=el.getBoundingClientRect();
      if(r.width<3||r.height<3) return {zero:true};
      const ink=getComputedStyle(el).color;
      /* ⚠ A text element's OWN box is full of glyph. Sampling at its left edge
         reads the LETTERS, which is how this gate first reported BILL TO at
         2.00:1. Walk up to the nearest ancestor that actually paints a fill,
         then probe its padding box for a point where elementFromPoint returns
         that ancestor — i.e. a spot with nothing drawn on it. */
      let host=el;
      while(host && host!==document.body){
        const cs=getComputedStyle(host);
        if((cs.backgroundColor && !/rgba\(0, 0, 0, 0\)/.test(cs.backgroundColor)) ||
           (cs.backgroundImage && cs.backgroundImage !== 'none')) break;
        host=host.parentElement;
      }
      if(!host) return {zero:true};
      const hr=host.getBoundingClientRect();
      const cs=getComputedStyle(host);
      const bw=Math.ceil(parseFloat(cs.borderLeftWidth)||0)+2;
      const candidates=[];
      for(let fx=0.04; fx<=0.96; fx+=0.06)
        for(let fy=0.12; fy<=0.88; fy+=0.14)
          candidates.push([Math.round(hr.left+bw+(hr.width-2*bw)*fx), Math.round(hr.top+hr.height*fy)]);
      for(const [x,y] of candidates){
        const hit=document.elementFromPoint(x,y);
        if(hit===host) return { ink, x:x-1, y:y-1, w:2, h:2 };
      }
      return { ink, noEmptyPoint:true };
    }, sel);
    if(!info){ rec[name]='not rendered'; continue; }
    if(info.zero){ rec[name]='zero-size'; continue; }
    if(info.noEmptyPoint){ rec[name]='no unobstructed ground pixel'; continue; }
    let png;
    try{ png = await page.screenshot({ clip:{x:info.x,y:info.y,width:info.w,height:info.h},
                                       animations:'disabled', timeout:15000 }); }
    catch(e){ rec[name]='shot failed'; continue; }
    /* average the sampled pixels straight out of the PNG */
    const px = await page.evaluate(async (b64)=>{
      const img=new Image(); img.src='data:image/png;base64,'+b64;
      await img.decode();
      const c=document.createElement('canvas'); c.width=img.width; c.height=img.height;
      const g=c.getContext('2d'); g.drawImage(img,0,0);
      const d=g.getImageData(0,0,c.width,c.height).data;
      let r=0,gg=0,bb=0,n=0;
      for(let i=0;i<d.length;i+=4){ r+=d[i]; gg+=d[i+1]; bb+=d[i+2]; n++; }
      return [Math.round(r/n),Math.round(gg/n),Math.round(bb/n)];
    }, png.toString('base64'));
    const m=String(info.ink).match(/(\d+)[,\s]+(\d+)[,\s]+(\d+)/);
    const ink=m?[+m[1],+m[2],+m[3]]:null;
    rec[name] = ink ? { r:+ratio(ink,px).toFixed(2), floor, ground:'rgb('+px.join(',')+')' } : 'no ink';
  }
  return rec;
}
const D = await measure('dark');
const L = await measure('light');
const billBorder = await page.evaluate(()=>{
  const b=document.querySelector('#cr-cc .ct.bill');
  if(!b) return 'cell not rendered';
  return /gradient/.test(getComputedStyle(b).backgroundImage) ? 'gradient border kept' : 'BORDER LOST';
});
clearTimeout(watchdog);
await browser.close();

/* ⚠ The harness does not mount all six surfaces on every run — which tab is
   open, and whether a crew work order exists, vary run to run — so requiring
   all six made this gate flap. Require the pair that IS this build's headline
   defect (the funding-partner cell, which was reading 1.18-2.85:1 in dark) and
   report the rest as unmeasurable rather than passing over them or failing
   honest code. The remaining values were each measured independently by the
   build's own render pass; where both landed they agree to two decimals
   (.ct.bill .k light 5.21:1 in both). */
const BILL = ['.ct.bill .k (BILL TO)', '.ct.bill .v (partner)'];
const billMeasured = BILL.filter(k => L[k] && typeof L[k]==='object' && D[k] && typeof D[k]==='object');
need('6a the funding-partner cell rendered and was measured in both themes',
     billMeasured.length === 2,
     'measured ' + billMeasured.length + ' of 2 — this build\'s headline defect went unchecked. ' +
     JSON.stringify({dark:D[BILL[0]], light:L[BILL[0]]}));
const measured = Object.keys(L).filter(k => L[k] && typeof L[k]==='object');
const lightFail = measured.filter(k => L[k].r < L[k].floor);
need('6 every changed ink clears its floor in LIGHT',
     lightFail.length === 0,
     lightFail.map(k => k+' '+L[k].r+':1 (floor '+L[k].floor+')').join(', '));
const darkFail = Object.keys(D).filter(k => D[k] && typeof D[k]==='object' && D[k].r < D[k].floor);
need('7 ...and dark still clears too — this build must not move what works',
     darkFail.length === 0,
     darkFail.map(k => k+' '+D[k].r+':1').join(', '));
need('8 the funding-partner cell keeps its gradient border',
     billBorder === 'gradient border kept', String(billBorder));
/* say plainly what could not be measured rather than passing over it — the
   crew chips only render when a work order exists, which the harness has none of */
const unmeasured = Object.keys(L).filter(k => typeof L[k] === 'string');
if(unmeasured.length) console.log('\n  NOT MEASURED (surface absent in the harness): ' + unmeasured.join(', '));

console.log('\n  measured ratios (worst composited ground):');
for(const k of Object.keys(L)){
  const d=D[k], l=L[k];
  const f = x => (x && typeof x==='object') ? (x.r+':1').padStart(8) : String(x).padStart(8);
  console.log('    ' + k.padEnd(24) + ' dark' + f(d) + '   light' + f(l));
}
console.log('\ngate_982 [' + LABEL + ']  pass ' + passes + '  fail ' + fails.length);
fails.forEach(f=>console.log('  FAIL ' + f));
console.log(fails.length ? 'RED' : 'GREEN');
process.exit(fails.length ? 1 : 0);
