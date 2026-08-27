/* Build 1095 — prove the porcelain estimate builder is readable, and that the
 * neumorphic number cells hit Theo's two asks: crisp charcoal text, and a red
 * focus ring. Real CSS injected, real editor DOM, Chromium, both viewports.
 *
 *   NODE_PATH=/opt/node22/lib/node_modules node render_estlight1095.mjs [index.html]
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

// faithful editor DOM: head (dark) + body(nav + main: clientcard, items-head, a
// detailed line, a flat line, totals). Matches renderLine / renderTotals output.
const DOM = `
<div id="cr-est-view" style="display:flex;position:fixed;inset:0;flex-direction:column">
  <div class="cr-est-head"><button data-act="close">&#10005;</button><span class="estnum">auto &#8470;</span><h2>Roof — Wilburn</h2><button data-act="save" class="primary">Save</button></div>
  <div class="cr-est-body">
    <aside class="cr-est-nav"><div class="navhead">This estimate</div>
      <button class="navsec"><span class="chev">&#9662;</span><span class="lbl">Line items</span><span class="cnt">2</span></button>
      <div class="navbody"><button class="navitem on"><span class="ix">1</span><span class="tx">Duration shingles</span></button></div>
    </aside>
    <div class="cr-est-main">
      <div class="cr-est-clientcard"><div class="name">Bonita Wilburn</div><div class="addr">3800 Klepinger Rd, Dayton OH</div>
        <label>Estimate Title</label><input type="text" data-f="title" value="Full roof replacement"/>
        <div class="cr-est-row3"><div><label>Status</label><select><option>Draft</option></select></div><div><label>Valid</label><input type="date"/></div><div><label>Deposit</label><input type="number" value="30"/></div></div>
      </div>
      <div class="cr-est-items-head"><h3>Line Items</h3>
        <label class="cr-est-itemchk"><input type="checkbox" checked/> <span>Qty / unit</span></label>
        <button class="add-lib">+ From Library</button><button class="add-custom">+ Custom</button><button class="add-abc">+ ABC Supply</button></div>
      <div data-slot="lines">
        <div class="cr-est-lineitem" data-lid="a">
          <div class="cr-est-move"><button>&#9650;</button><button>&#9660;</button></div><button class="del">&#10005;</button>
          <input type="text" class="name-input" value="Duration shingles — Brownwood"/>
          <textarea class="desc-input">OC Duration, incl. starter &amp; cap</textarea>
          <div class="pricing"><span class="lbl">Qty</span><input type="number" data-lf="qty" value="26"/>
            <select class="unit-sel"><option>SQ</option></select>
            <input type="number" data-lf="unit_price" value="345"/><div class="amount">$8,970</div></div>
        </div>
        <div class="cr-est-lineitem flat" data-lid="b">
          <div class="cr-est-move"><button>&#9650;</button><button>&#9660;</button></div><button class="del">&#10005;</button>
          <input type="text" class="name-input" value="Permit &amp; city inspection"/>
          <textarea class="desc-input">Pulled &amp; scheduled</textarea>
          <div class="pricing lump"><span class="lump-lbl">Amount</span><input type="number" data-lf="amount" value="250"/></div>
        </div>
      </div>
      <div class="cr-est-totals" data-slot="totals">
        <span class="lbl">Subtotal</span><span class="val" data-t="subtotal">$9,220</span>
        <span class="lbl">Discount</span><span class="val"><input type="number" data-f="discount" value="0"/></span>
        <span class="rule"></span><span class="grand-lbl">Total</span><span class="grand-val" data-t="total">$9,220</span>
        <div class="deposit"><span style="font:800 11px 'Segoe UI',Arial,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:#c8202e;">Deposit</span>
          <input type="number" class="pct" data-f="deposit_pct" value="30"/><span class="amt" data-t="deposit">$2,766</span></div>
      </div>
    </div>
  </div>
</div>
<div id="cr-est-picker"><div class="box">
  <div class="box-head"><h3>Add from Library</h3><button>&#10005;</button></div>
  <div class="box-search"><input type="text" placeholder="Search items…"/></div>
  <div class="box-list">
    <div class="cat-header"><span class="cc">Roofing</span></div>
    <div class="p-item"><div><div class="name">OC Duration — Brownwood</div><div class="desc">Architectural shingle, per square</div></div><div class="price">$345</div></div>
    <div class="p-item"><div><div class="name">Synthetic underlayment</div><div class="desc">per square</div></div><div class="price">$18</div></div>
  </div>
</div></div>`;

const TARGETS = [
  ['number cell · Qty',        '.cr-est-lineitem .pricing input[data-lf="qty"]',        4.5],
  ['number cell · Unit $',     '.cr-est-lineitem .pricing input[data-lf="unit_price"]', 4.5],
  ['number cell · Flat price', '.cr-est-lineitem.flat .pricing.lump input',             4.5],
  ['number cell · Discount',   '.cr-est-totals .val input[data-f="discount"]',          4.5],
  ['number cell · Deposit %',  '.cr-est-totals .deposit input',                         4.5],
  ['money · line amount',      '.cr-est-lineitem .pricing .amount',                     4.5],
  ['money · Total',            '.cr-est-totals .grand-val',                             4.5],
  ['label · Qty lbl',          '.cr-est-lineitem .pricing .lbl',                        4.5],
  ['label · field label',      '.cr-est-clientcard label',                              4.5],
  ['client name',              '.cr-est-clientcard .name',                              4.5],
  ['desc input',               '.cr-est-lineitem .desc-input',                          4.5],
  ['deposit label',            '.cr-est-totals .deposit span',                          4.0],
  ['add-abc (green)',          '.cr-est-items-head .add-abc',                           4.5],
  ['nav item',                 '.cr-est-nav .navitem',                                  4.5],
  ['picker · title',           '#cr-est-picker .box-head h3',                           4.5],
  ['picker · category',        '#cr-est-picker .cat-header .cc',                        4.5],
  ['picker · item name',       '#cr-est-picker .p-item .name',                          4.5],
  ['picker · item desc',       '#cr-est-picker .p-item .desc',                          4.5],
  ['picker · price',           '#cr-est-picker .p-item .price',                         4.5],
];

function composite(el){                 // walk up, BLENDING every semi-transparent layer
  function parse(c){ const m = c.match(/[\d.]+/g).map(Number); return { r:m[0], g:m[1], b:m[2], a:(m[3]==null?1:m[3]) }; }
  const layers = [];
  let n = el;
  while (n && n !== document.documentElement){
    const b = getComputedStyle(n).backgroundColor;
    if (b && !/rgba\(0, 0, 0, 0\)|transparent/.test(b)) layers.push(parse(b));
    n = n.parentElement;
  }
  layers.push({ r:255, g:255, b:255, a:1 });          // white under everything
  let base = layers[layers.length - 1];
  for (let i = layers.length - 2; i >= 0; i--){
    const t = layers[i], a = t.a;
    base = { r:t.r*a+base.r*(1-a), g:t.g*a+base.g*(1-a), b:t.b*a+base.b*(1-a), a:1 };
  }
  return `rgb(${Math.round(base.r)}, ${Math.round(base.g)}, ${Math.round(base.b)})`;
}

const br = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome' }).catch(()=>chromium.launch());
let bad = 0;
for (const vw of [390, 1200]){
  const p = await br.newPage({ viewport:{ width:vw, height:900 } });
  await p.setContent(`<!doctype html><html><head><style>${cssOf(html)}</style></head><body>${DOM}</body></html>`);
  console.log(`\n=== viewport ${vw}px ===`);
  const rows = await p.evaluate((args) => {
    const { TARGETS, compositeSrc } = args;
    const composite = eval('(' + compositeSrc + ')');
    return TARGETS.map(([name, sel]) => {
      const el = document.querySelector(sel);
      if (!el) return { name, missing:true };
      const cs = getComputedStyle(el);
      return { name, fg: cs.color, bg: composite(el) };
    });
  }, { TARGETS, compositeSrc: composite.toString() });
  for (let t = 0; t < TARGETS.length; t++){
    const [name,, floor] = TARGETS[t], r = rows[t];
    if (r.missing){ console.log(`  MISSING  ${name}`); bad++; continue; }
    let v; try { v = ratio(r.fg, r.bg); } catch { v = NaN; }
    const fail = !(v >= floor);
    if (fail) bad++;
    console.log(`  ${fail?'FAIL':'ok  '} ${name.padEnd(24)} ${v.toFixed(2)}:1  (floor ${floor})  ink ${r.fg}`);
  }
  // the red focus ring on a number cell — Theo's second ask
  const foc = await p.evaluate(() => {
    const el = document.querySelector('.cr-est-lineitem .pricing input[data-lf="qty"]');
    el.focus();
    const cs = getComputedStyle(el);
    return { shadow: cs.boxShadow, border: cs.borderColor };
  });
  const redRing = /200,\s*32,\s*46/.test(foc.shadow) || /200,\s*32,\s*46/.test(foc.border);
  console.log(`  ${redRing?'ok  ':'FAIL'} focus ring is Cardinal red   shadow=${foc.shadow.slice(0,60)}…`);
  if (!redRing) bad++;
  await p.close();
}
await br.close();
console.log(bad ? `\nRENDER RED — ${bad} problem(s)` : '\nRENDER GREEN — porcelain editor readable, number cells crisp, focus ring red');
process.exit(bad ? 1 : 0);
