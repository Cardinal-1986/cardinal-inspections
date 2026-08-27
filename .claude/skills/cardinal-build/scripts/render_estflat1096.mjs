/* Build 1096 — prove the per-line Detailed/Flat toggle in a REAL engine:
 *   · the toggle's active segment is Cardinal red with legible white text,
 *     the inactive segment's label clears the 4.5:1 floor on its own ground;
 *   · a Flat row collapses to a single right-aligned amount (no qty/unit box);
 *   · on a phone the number cells take the compact pad + subtle 1px inset,
 *     and on desktop they keep the deep neumorphic inset.
 * Real app CSS injected, real editor DOM, Chromium, both viewports.
 *
 *   NODE_PATH=/opt/node22/lib/node_modules node render_estflat1096.mjs [index.html]
 */
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';

const path = process.argv[2] || 'index.html';
const html = readFileSync(path, 'utf8');
const cssOf = (h) => { const out = []; let i = 0;
  while ((i = h.indexOf('<style', i)) !== -1) { const s = h.indexOf('>', i) + 1, e = h.indexOf('</style>', s);
    if (e === -1) break; out.push(h.slice(s, e)); i = e; } return out.join('\n'); };

const lum = (c) => { const x = c.match(/\d+(\.\d+)?/g).slice(0,3).map(Number).map(v => v/255)
  .map(v => v <= .03928 ? v/12.92 : Math.pow((v+.055)/1.055, 2.4)); return .2126*x[0]+.7152*x[1]+.0722*x[2]; };
const ratio = (a,b) => { const A = lum(a), B = lum(b), h = Math.max(A,B), l = Math.min(A,B); return (h+.05)/(l+.05); };

// One detailed line (Detailed active) and one flat line (Flat active) — the exact
// markup renderLine() emits at build 1096, including the .cr-est-rowmode toggle.
const DOM = `
<div id="cr-est-view" style="display:flex;position:fixed;inset:0;flex-direction:column">
  <div class="cr-est-body">
    <div class="cr-est-main">
      <div class="cr-est-lineitem" data-lid="a">
        <input type="text" class="name-input" data-lf="name" value="Duration shingles"/>
        <textarea class="desc-input" data-lf="description">OC Duration, incl. starter &amp; cap</textarea>
        <div class="cr-est-rowmode" role="group" aria-label="Line pricing mode">
          <button type="button" tabindex="-1" data-act="mode-detailed" class="on" aria-pressed="true">Detailed</button>
          <button type="button" tabindex="-1" data-act="mode-flat" aria-pressed="false">Flat</button>
        </div>
        <div class="pricing">
          <input type="number" data-lf="qty" value="26"/>
          <select class="unit-sel" data-lf="unit"><option>SQ</option></select>
          <input type="number" data-lf="unit_price" value="345"/>
          <div class="amount" data-slot="amount">$8,970</div>
        </div>
      </div>
      <div class="cr-est-lineitem" data-lid="b">
        <input type="text" class="name-input" data-lf="name" value="Permit &amp; city inspection"/>
        <textarea class="desc-input" data-lf="description">Pulled &amp; scheduled</textarea>
        <div class="cr-est-rowmode" role="group" aria-label="Line pricing mode">
          <button type="button" tabindex="-1" data-act="mode-detailed" aria-pressed="false">Detailed</button>
          <button type="button" tabindex="-1" data-act="mode-flat" class="on" aria-pressed="true">Flat</button>
        </div>
        <div class="pricing lump">
          <span class="lump-lbl">Amount</span>
          <input type="number" data-lf="amount" value="250"/>
        </div>
      </div>
    </div>
  </div>
</div>`;

const br = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome' }).catch(()=>chromium.launch());
let bad = 0;
const fail = (m) => { console.log('  FAIL ' + m); bad++; };
const okp  = (m) => console.log('  ok   ' + m);

for (const vw of [390, 1200]){
  const p = await br.newPage({ viewport:{ width:vw, height:900 } });
  await p.setContent(`<!doctype html><html><head><style>${cssOf(html)}</style></head><body>${DOM}</body></html>`);
  console.log(`\n=== viewport ${vw}px ===`);

  const R = await p.evaluate(() => {
    const val = {};
    const g = (sel) => { const el = document.querySelector(sel); return el ? getComputedStyle(el) : null; };
    // composite a ground by walking ancestors, blending alpha, white underneath
    function ground(el){
      const layers = []; let n = el;
      while (n && n !== document.documentElement){
        const b = getComputedStyle(n).backgroundColor;
        if (b && !/rgba\(0, 0, 0, 0\)|transparent/.test(b)){ const m = b.match(/[\d.]+/g).map(Number); layers.push({r:m[0],g:m[1],b:m[2],a:(m[3]==null?1:m[3])}); }
        n = n.parentElement;
      }
      layers.push({r:255,g:255,b:255,a:1});
      let base = layers[layers.length-1];
      for (let i=layers.length-2;i>=0;i--){ const t=layers[i],a=t.a; base={r:t.r*a+base.r*(1-a),g:t.g*a+base.g*(1-a),b:t.b*a+base.b*(1-a),a:1}; }
      return `rgb(${Math.round(base.r)}, ${Math.round(base.g)}, ${Math.round(base.b)})`;
    }
    const onBtn  = document.querySelector('.cr-est-rowmode button.on');
    const offBtn = document.querySelector('.cr-est-rowmode button:not(.on)');
    val.onFg = getComputedStyle(onBtn).color;
    val.onBg = ground(onBtn);
    val.offFg = getComputedStyle(offBtn).color;
    val.offBg = ground(offBtn);
    // flat row collapse: the lump .pricing has exactly one input and no qty/unit_price
    const lump = document.querySelector('.cr-est-lineitem[data-lid="b"] .pricing.lump');
    val.lumpInputs = lump ? lump.querySelectorAll('input').length : -1;
    val.lumpHasQty = !!document.querySelector('.cr-est-lineitem[data-lid="b"] [data-lf="qty"]');
    const lumpInput = document.querySelector('.cr-est-lineitem[data-lid="b"] .pricing.lump input');
    val.lumpAlign = lumpInput ? getComputedStyle(lumpInput).textAlign : '';
    // the number cell — padding + box-shadow (mobile-compact vs deep neumorphic)
    const numCell = document.querySelector('.cr-est-lineitem[data-lid="a"] .pricing input[data-lf="qty"]');
    val.numPad = getComputedStyle(numCell).padding;
    val.numShadow = getComputedStyle(numCell).boxShadow;
    return val;
  });

  // 1. toggle contrast
  const onR = ratio(R.onFg, R.onBg), offR = ratio(R.offFg, R.offBg);
  (onR >= 4.5 ? okp : fail)(`toggle active label ${onR.toFixed(2)}:1 (white on ${R.onBg})`);
  (offR >= 4.5 ? okp : fail)(`toggle inactive label ${offR.toFixed(2)}:1 (${R.offFg} on ${R.offBg})`);
  // active segment must actually be Cardinal red
  (/rgb\(200, 32, 46\)/.test(R.onBg) ? okp : fail)(`active segment is Cardinal red — got ${R.onBg}`);

  // 2. flat collapse
  (R.lumpInputs === 1 ? okp : fail)(`flat row shows exactly one price input (got ${R.lumpInputs})`);
  (!R.lumpHasQty ? okp : fail)('flat row has no qty field');
  (R.lumpAlign === 'right' ? okp : fail)(`flat price is right-aligned (${R.lumpAlign})`);

  // 3. mobile-compact vs desktop neumorphic inset on the number cell
  if (vw === 390){
    // Chromium serializes as "rgba(0, 0, 0, 0.08) 0px 1px 2px 0px inset"
    (/4px 8px/.test(R.numPad) ? okp : fail)(`phone: compact pad 4px 8px (got ${R.numPad})`);
    (/0px 1px 2px/.test(R.numShadow) && /inset/.test(R.numShadow) && /0\.08/.test(R.numShadow) ? okp : fail)(`phone: subtle 1px inset (got ${R.numShadow.slice(0,52)}…)`);
    (!/9px/.test(R.numShadow) ? okp : fail)('phone: the deep 9px neumorphic inset is NOT used');
  } else {
    (/9px/.test(R.numShadow) ? okp : fail)(`desktop: deep neumorphic inset kept (got ${R.numShadow.slice(0,48)}…)`);
  }
  await p.close();
}
await br.close();
console.log(bad ? `\nRENDER RED — ${bad} problem(s)` : '\nRENDER GREEN — toggle legible & red, flat row collapses, insets adapt to viewport');
process.exit(bad ? 1 : 0);
