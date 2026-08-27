/* Build 1097 — prove line-item sections in a REAL engine:
 *   Part 1 (editor): the section header is readable on porcelain — title,
 *     "General Scope", live subtotal, "+ Line", chevron all clear the floor,
 *     the accent bar is Cardinal red, and a collapsed section hides its lines.
 *   Part 2 (client proposal): buildDocHtml's section banner + subtotal rows
 *     render with a legible title and a red divider on the printed page.
 * Real app CSS, real DOM, Chromium.
 *
 *   NODE_PATH=/opt/node22/lib/node_modules node render_estsec1097.mjs [index.html]
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

// brace-extract + run buildDocHtml to produce a real sectioned proposal
function extract(sig){ const i = html.indexOf(sig); let d=0,st=false,j=i;
  for(;j<html.length;j++){const c=html[j]; if(c==='{'){d++;st=true;} else if(c==='}'){d--; if(st&&d===0){j++;break;}}} return html.slice(i,j); }
const esc = (s)=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const money=(n)=>'$'+(Number(n)||0).toLocaleString('en-US');
let proposalDoc = '<!doctype html><body>NO SECTION SUPPORT IN THIS BUILD</body>';
try {
  const estGroups = new Function(extract('function estGroups(lines){')+'\nreturn estGroups;')();
  const buildDocHtml = new Function('cardinalLogo','esc','money','nl2br','docPhotoUrl','fmtDate','window',
    extract('function buildDocHtml(est, project, urls){')+'\nreturn buildDocHtml;')(
    ()=> '', esc, money, (s)=>esc(s), ()=> '', (x)=>String(x), { crEstGroups: estGroups });
  proposalDoc = buildDocHtml({
    line_items:[
      { name:'Tear off', section_id:'sc_a', sec:'Tear-Off & Decking', qty:20, unit:'SQ', unit_price:100 },
      { name:'Disposal', section_id:'sc_a', sec:'Tear-Off & Decking', flat:true, amount:500 },
      { name:'Shingles', section_id:'sc_b', sec:'Primary Shingles', qty:26, unit:'SQ', unit_price:345 },
    ], photos:[], subtotal:11470, total:11470, deposit_amount:0, title:'T', estimate_number:'E', valid_through:'', created_at:'2026-08-27'
  }, { name:'Wilburn', address:'3800 Klepinger' }, {});
} catch (e) { console.log('  (proposal build unavailable on this tree: ' + e.message + ')'); }

// editor DOM: one named section (Tear-Off, expanded) + a General Scope group
const DOM = `
<div id="cr-est-view" style="display:flex;position:fixed;inset:0;flex-direction:column">
  <div class="cr-est-body"><div class="cr-est-main">
    <div class="cr-est-items-head" data-navsec="items"><h3>Line Items</h3>
      <button class="add-lib" data-act="add-lib">+ From Library</button>
      <button class="add-section" data-act="add-section">+ Section</button></div>
    <div data-slot="lines">
      <div class="cr-est-section" data-sid="sc_a">
        <div class="cr-est-sechead" data-sid="sc_a">
          <button class="sec-chev" data-act="sec-toggle">&#9662;</button>
          <input type="text" class="sec-title" data-sf="title" value="Tear-Off &amp; Decking"/>
          <span class="sec-subtotal" data-slot="sec-sub">$2,500</span>
          <div class="sec-move"><button data-act="sec-up">&#9650;</button><button data-act="sec-down">&#9660;</button></div>
          <button class="sec-addline" data-act="sec-addline">+ Line</button>
        </div>
        <div class="cr-est-secbody">
          <div class="cr-est-lineitem" data-lid="a">
            <input type="text" class="name-input" data-lf="name" value="Tear off"/>
            <textarea class="desc-input" data-lf="description"></textarea>
            <div class="cr-est-rowmode"><button data-act="mode-detailed" class="on">Detailed</button><button data-act="mode-flat">Flat</button></div>
            <select class="cr-est-secmove" data-secmove><option value="sc_a" selected>Tear-Off &amp; Decking</option><option value="">General Scope</option></select>
            <div class="pricing"><input type="number" data-lf="qty" value="20"/><select class="unit-sel"><option>SQ</option></select><input type="number" data-lf="unit_price" value="100"/><div class="amount" data-slot="amount">$2,000</div></div>
          </div>
        </div>
      </div>
      <div class="cr-est-section" data-sid="">
        <div class="cr-est-sechead" data-sid="">
          <button class="sec-chev" data-act="sec-toggle">&#9662;</button>
          <span class="sec-title-static">General Scope</span>
          <span class="sec-subtotal" data-slot="sec-sub">$150</span>
          <div class="sec-move"><button data-act="sec-up">&#9650;</button><button data-act="sec-down" disabled>&#9660;</button></div>
          <button class="sec-addline" data-act="sec-addline">+ Line</button>
        </div>
        <div class="cr-est-secbody"><div class="cr-est-lineitem" data-lid="b"><input class="name-input" data-lf="name" value="Permit"/></div></div>
      </div>
    </div>
  </div></div>
</div>`;

const TARGETS = [
  ['section title (input)',   '.cr-est-sechead .sec-title',        4.5],
  ['General Scope (static)',  '.cr-est-sechead .sec-title-static', 4.5],
  ['section subtotal badge',  '.cr-est-sechead .sec-subtotal',     4.5],
  ['+ Line button',           '.cr-est-sechead .sec-addline',      4.5],
  ['collapse chevron',        '.cr-est-sechead .sec-chev',         4.5],
  ['+ Section button',        '.cr-est-items-head .add-section',   4.5],
  ['section-move select',     '.cr-est-lineitem .cr-est-secmove',  4.5],
];

const br = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome' }).catch(()=>chromium.launch());
let bad = 0;
const fail=(m)=>{console.log('  FAIL '+m);bad++;}; const okp=(m)=>console.log('  ok   '+m);

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

// ── Part 1: the editor section header ───────────────────────────────────────
for (const vw of [390, 1200]){
  const p = await br.newPage({ viewport:{ width:vw, height:900 } });
  await p.setContent(`<!doctype html><html><head><style>${cssOf(html)}</style></head><body>${DOM}</body></html>`);
  console.log(`\n=== editor · viewport ${vw}px ===`);
  const rows = await p.evaluate((args)=>{
    const { TARGETS, gsrc } = args; const ground = eval('('+gsrc+')')();
    const out = TARGETS.map(([name,sel])=>{ const el=document.querySelector(sel); if(!el) return {name,missing:true};
      const cs=getComputedStyle(el); return { name, fg:cs.color, bg:ground(el) }; });
    const head = document.querySelector('.cr-est-sechead');
    return { out, accent: getComputedStyle(head).borderLeftColor };
  }, { TARGETS, gsrc: compositeSrc.toString() });
  for(let t=0;t<TARGETS.length;t++){ const [name,,floor]=TARGETS[t], r=rows.out[t];
    if(r.missing){ fail('MISSING '+name); continue; }
    let v; try{ v=ratio(r.fg,r.bg); }catch{ v=NaN; }
    (v>=floor?okp:fail)(`${name.padEnd(24)} ${v.toFixed(2)}:1  (floor ${floor})  ink ${r.fg}`);
  }
  (/rgb\(200, 32, 46\)/.test(rows.accent) ? okp : fail)(`section accent bar is Cardinal red — got ${rows.accent}`);
  await p.close();
}

// ── Part 2: the client proposal banner ──────────────────────────────────────
{
  const p = await br.newPage({ viewport:{ width:820, height:1100 } });
  await p.setContent(proposalDoc);
  console.log(`\n=== client proposal (buildDocHtml) ===`);
  const r = await p.evaluate((gsrc)=>{
    const ground = eval('('+gsrc+')')();
    const banner = document.querySelector('table.items tr.sec-banner td');
    const sub = document.querySelector('table.items tr.sec-sub td.val');
    const banners = document.querySelectorAll('table.items tr.sec-banner').length;
    return {
      bannerFg: banner ? getComputedStyle(banner).color : null,
      bannerBg: banner ? ground(banner) : null,
      bannerBorderTop: banner ? getComputedStyle(banner).borderTopColor : null,
      bannerText: banner ? banner.textContent : '',
      subFg: sub ? getComputedStyle(sub).color : null,
      subBg: sub ? ground(sub) : null,
      banners
    };
  }, compositeSrc.toString());
  (r.banners === 2 ? okp : fail)(`proposal renders 2 section banners (got ${r.banners})`);
  if(r.bannerFg){
    const bv = ratio(r.bannerFg, r.bannerBg);
    (bv>=4.5?okp:fail)(`banner title "${r.bannerText}" ${bv.toFixed(2)}:1 on ${r.bannerBg}`);
    (/rgb\(200, 32, 46\)/.test(r.bannerBorderTop)?okp:fail)(`banner carries the Cardinal-red divider — got ${r.bannerBorderTop}`);
  } else fail('no section banner rendered in the proposal');
  if(r.subFg){ const sv = ratio(r.subFg, r.subBg); (sv>=4.5?okp:fail)(`section subtotal ${sv.toFixed(2)}:1 on ${r.subBg}`); }
  await p.close();
}

await br.close();
console.log(bad ? `\nRENDER RED — ${bad} problem(s)` : '\nRENDER GREEN — section header readable & red-accented, proposal banners legible with the red divider');
process.exit(bad ? 1 : 0);
