/* Build 1098 — prove the assembly UI is readable in a real engine: the picker
 * cards (name, meta, group label, Squares input, Insert), and the two new
 * buttons (+ Assembly, Save as Assembly) all clear the contrast floor on their
 * porcelain grounds, and Insert / + Assembly are Cardinal red.
 *
 *   NODE_PATH=/opt/node22/lib/node_modules node render_estasm1098.mjs [index.html]
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

// the assembly picker (open, assembly mode) + an items head + a section head
const DOM = `
<div id="cr-est-view" style="position:fixed;inset:0">
  <div class="cr-est-body"><div class="cr-est-main">
    <div class="cr-est-items-head"><h3>Line Items</h3>
      <button class="add-section" data-act="add-section">+ Section</button>
      <button class="add-assembly" data-act="add-assembly">+ Assembly</button></div>
    <div class="cr-est-section"><div class="cr-est-sechead" data-sid="sc_a">
      <input class="sec-title" value="Tear-Off &amp; Decking"/>
      <span class="sec-subtotal">$2,500</span>
      <button class="sec-saveasm" data-act="sec-saveasm">Save as Assembly</button>
      <button class="sec-addline" data-act="sec-addline">+ Line</button>
    </div></div>
  </div></div>
</div>
<div id="cr-est-picker" class="open" data-pick="assembly"><div class="box">
  <div class="box-head"><h3>Insert an Assembly</h3><button data-act="close">&#10005;</button></div>
  <div class="box-search"><input type="search" placeholder="Search assemblies&#8230;"/></div>
  <div class="box-list">
    <div class="asm-group"><div class="asm-grouphd">Roofing <span class="asm-groupn">2</span></div>
      <div class="asm-card" data-aid="def-shingle">
        <div class="top"><div class="name">Full Shingle Replacement</div></div>
        <div class="asm-meta">11 lines &#183; scales by squares</div>
        <div class="asm-act"><input type="number" class="asm-sq" placeholder="Squares (optional)"/><button class="asm-insert">Insert</button></div>
      </div>
    </div>
    <div class="asm-group"><div class="asm-grouphd">Saved <span class="asm-groupn">1</span></div>
      <div class="asm-card" data-aid="c1">
        <div class="top"><div class="name">My porch package</div><button class="asm-del">&#10005;</button></div>
        <div class="asm-meta">4 lines</div>
        <div class="asm-act"><button class="asm-insert">Insert</button></div>
      </div>
    </div>
  </div>
</div></div>`;

const TARGETS = [
  ['+ Assembly button',      '.cr-est-items-head .add-assembly',     4.5],
  ['Save as Assembly',       '.cr-est-sechead .sec-saveasm',         4.5],
  ['picker title',           '#cr-est-picker .box-head h3',          4.5],
  ['group label',            '#cr-est-picker .asm-grouphd',          4.5],
  ['assembly name',          '#cr-est-picker .asm-card .name',       4.5],
  ['assembly meta',          '#cr-est-picker .asm-card .asm-meta',   4.5],
  ['Squares input',          '#cr-est-picker .asm-card .asm-sq',     4.5],
  ['Insert button',          '#cr-est-picker .asm-card .asm-insert', 4.5],
  ['delete (custom)',        '#cr-est-picker .asm-card .asm-del',    4.5],
];

function compositeSrc(){
  return function ground(el){
    const layers=[]; let n=el;
    while(n && n!==document.documentElement){ const b=getComputedStyle(n).backgroundColor;
      if(b && !/rgba\(0, 0, 0, 0\)|transparent/.test(b)){ const m=b.match(/[\d.]+/g).map(Number); layers.push({r:m[0],g:m[1],b:m[2],a:(m[3]==null?1:m[3])}); }
      n=n.parentElement; }
    layers.push({r:255,g:255,b:255,a:1}); let base=layers[layers.length-1];
    for(let i=layers.length-2;i>=0;i--){const t=layers[i],a=t.a; base={r:t.r*a+base.r*(1-a),g:t.g*a+base.g*(1-a),b:t.b*a+base.b*(1-a),a:1};}
    return `rgb(${Math.round(base.r)}, ${Math.round(base.g)}, ${Math.round(base.b)})`;
  };
}

const br = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome' }).catch(()=>chromium.launch());
let bad = 0; const fail=(m)=>{console.log('  FAIL '+m);bad++;}; const okp=(m)=>console.log('  ok   '+m);

for (const vw of [390, 1200]){
  const p = await br.newPage({ viewport:{ width:vw, height:900 } });
  await p.setContent(`<!doctype html><html><head><style>${cssOf(html)}</style></head><body>${DOM}</body></html>`);
  console.log(`\n=== viewport ${vw}px ===`);
  const R = await p.evaluate((args) => {
    const { TARGETS, gsrc } = args; const ground = eval('('+gsrc+')')();
    const out = TARGETS.map(([name, sel]) => { const el = document.querySelector(sel); if (!el) return { name, missing:true };
      const cs = getComputedStyle(el); return { name, fg: cs.color, bg: ground(el) }; });
    const ins = document.querySelector('.asm-insert'), add = document.querySelector('.add-assembly');
    return { out, insBg: ground(ins), addBg: ground(add) };
  }, { TARGETS, gsrc: compositeSrc.toString() });
  for (let t=0;t<TARGETS.length;t++){ const [name,,floor]=TARGETS[t], r=R.out[t];
    if (r.missing){ fail('MISSING '+name); continue; }
    let v; try { v = ratio(r.fg, r.bg); } catch { v = NaN; }
    (v>=floor?okp:fail)(`${name.padEnd(20)} ${v.toFixed(2)}:1  ink ${r.fg}  on ${r.bg}`);
  }
  (/rgb\(200, 32, 46\)/.test(R.insBg) ? okp : fail)(`Insert button is Cardinal red — ${R.insBg}`);
  (/rgb\(200, 32, 46\)/.test(R.addBg) ? okp : fail)(`+ Assembly button is Cardinal red — ${R.addBg}`);
  await p.close();
}
await br.close();
console.log(bad ? `\nRENDER RED — ${bad} problem(s)` : '\nRENDER GREEN — assembly picker & buttons readable, Insert / + Assembly are Cardinal red');
process.exit(bad ? 1 : 0);
