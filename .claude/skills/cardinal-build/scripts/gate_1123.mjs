/* gate_1123.mjs — a REAL Chromium render of the Labor Rate Schedule's two
   screens, in the dark Theo asked for.

   jsdom proved the data: the trade rule, the crew_rates join, and that a save
   never writes the shared catalog. Only an engine answers the rest —
     1. does the dark actually paint, on BOTH screens, or did a rule lose?
     2. is every ink above its floor against the ground it is composited on?
     3. is "not set" READABLE, or a faint dash you would scroll past — it is the
        one state that means "we have not agreed a price with this crew";
     4. are the crew rows 44px tap targets, and does nothing scroll sideways
        at a phone width?

   ⚠ Written to go RED on 1122 rather than crash (BUG_CLASSES 37): 1122 has no
   crew list at all, so every probe is guarded and the control SAYS so.

   usage:  node gate_1123.mjs <file.html>
*/
import { chromium } from 'playwright';
import { readFileSync } from 'fs';
const S = '.claude/skills/cardinal-build/scripts/';
const FILE = process.argv[2] || 'index.html';
const URL_ = 'file://' + (FILE.startsWith('/') ? FILE : process.cwd() + '/' + FILE);

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  PASS  ' + m); }
                       else { fail++; console.log('  FAIL  ' + m); } };

const lum = ([r, g, b]) => {
  const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
/* ⚠ Chromium returns two colour forms on DIFFERENT scales — rgb() is 0-255 and
   color(srgb …) is 0-1. gate_1115 shipped a reader that missed this and
   produced a plausible, confident, wrong ratio on a dark ground. */
const rgb = s => {
  s = String(s || '');
  const c = /color\(\s*srgb\s+([\d.eE+-]+)\s+([\d.eE+-]+)\s+([\d.eE+-]+)/.exec(s);
  if (c) return [c[1], c[2], c[3]].map(v => Math.round(Math.min(1, Math.max(0, parseFloat(v))) * 255));
  const m = /(-?[\d.]+)[,\s]+(-?[\d.]+)[,\s]+(-?[\d.]+)/.exec(s);
  return m ? [+m[1], +m[2], +m[3]] : null;
};

const MOCK = `
window.__lrsMock = (function(){
  var CREWS = [
    { id:'c-s', name:'Santiago Gutierrez', trade:'Roofing', archived:false },
    { id:'c-d', name:'Daniel Sarceno',     trade:'Roofing', archived:false },
    { id:'c-r', name:'Ronaldo',            trade:'Siding',  archived:false },
    { id:'c-c', name:'Cameron Deaton',     trade:'Windows', archived:true  }
  ];
  var CAT = [
    { id:'p1', category:'Shingle Installation', name:'Tear off and haul existing', description:'per square', unit:'sq', rate:45, sort_order:10 },
    { id:'p2', category:'Shingle Installation', name:'Install architectural shingle', description:null, unit:'sq', rate:95, sort_order:20 },
    { id:'p3', category:'Ventilation and Flashing', name:'Ridge vent', description:null, unit:'lf', rate:5, sort_order:30 },
    { id:'p4', category:'Chimney Flashing (priced by perimeter)', name:'Note',
      description:'Measured around the base, not the flue.', unit:'note', rate:0, sort_order:40 }
  ];
  var RATES = [
    { id:'r1', crew_id:'c-s', pricing_item_id:'p1', custom_name:null, custom_unit:null, rate:45 },
    { id:'r2', crew_id:'c-s', pricing_item_id:'p2', custom_name:null, custom_unit:null, rate:95 }
  ];
  function qb(t){
    var b={_t:t,_f:{}};
    b.select=function(){return b;}; b.order=function(){return b;};
    b.eq=function(k,v){b._f[k]=v;return b;};
    b.then=function(res){ return Promise.resolve().then(function(){
      if(t==='crews') return res({data:CREWS.slice(),error:null});
      if(t==='pricing_items') return res({data:CAT.slice(),error:null});
      if(t==='crew_rates'){ var c=b._f.crew_id;
        return res({data:(c?RATES.filter(function(r){return r.crew_id===c;}):RATES).slice(),error:null}); }
      return res({data:[],error:null});
    }); };
    return b;
  }
  return { from:qb };
})();`;

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 844 } });
for (const f of ['sentinel_setup_cardinal.js', 'e2e_mock_supa.js'])
  await p.addInitScript(readFileSync(S + f, 'utf8'));
await p.addInitScript(MOCK);
await p.goto(URL_, { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(2600);

/* drive it through the app's own door, with the LRS pointed at the mock */
const opened = await p.evaluate(() => {
  try {
    window.sb = window.__lrsMock; window.supa = window.__lrsMock;
    window.is_admin = () => true;
    if (!window.CardinalLRS) return 'no CardinalLRS';
    window.CardinalLRS.open();
    return 'ok';
  } catch (e) { return String(e.message || e); }
});
ok(opened === 'ok', 'the Labor Rate Schedule opens through its own export (' + opened + ')');
await p.waitForTimeout(700);

const probe = `(() => {
  const opaque = c => { const m = /rgba?\\(([^)]+)\\)/.exec(c||''); if(!m) return false;
    const q = m[1].split(',').map(x=>parseFloat(x)); return q.length<4 || q[3]>=0.999; };
  const groundOf = el => {
    for (let e = el; e; e = e.parentElement) {
      const s = getComputedStyle(e);
      const stops = [...(s.backgroundImage||'').matchAll(/rgba?\\([^)]+\\)/g)].map(m=>m[0]).filter(c=>!/,\\s*0\\)$/.test(c));
      const bc = s.backgroundColor;
      const here = stops.concat(!bc || /rgba\\(0, 0, 0, 0\\)|transparent/.test(bc) ? [] : [bc]);
      if (here.some(opaque)) return here;
      if (here.length) return here;
    }
    return [];
  };
  const ink = els => [...els].filter(e => (e.textContent||'').trim()).map(e => {
    const s = getComputedStyle(e), r = e.getBoundingClientRect();
    return { t:(e.textContent||'').trim().slice(0,40), cls:e.className,
             color:s.color, size:parseFloat(s.fontSize), weight:s.fontWeight,
             w:Math.round(r.width), h:Math.round(r.height), ground:groundOf(e) };
  });
  const v = document.getElementById('cr-lrs-view');
  return {
    shown: v ? getComputedStyle(v).display : 'none',
    viewBg: v ? getComputedStyle(v).backgroundColor : null,
    crews: [...document.querySelectorAll('[data-lrs-crew]')].map(el => {
      const r = el.getBoundingClientRect(); return { w:Math.round(r.width), h:Math.round(r.height) }; }),
    trades: [...document.querySelectorAll('#cr-lrs-view .lrs-trade')].map(e=>e.textContent.trim()),
    docs: document.querySelectorAll('#cr-lrs-view .lrs-doc').length,
    rows: document.querySelectorAll('#cr-lrs-view .lrs-row').length,
    notes: document.querySelectorAll('#cr-lrs-view .lrs-note').length,
    text: (document.getElementById('lrs-body')||{}).textContent || '',
    title: (document.querySelector('#cr-lrs-view .lrs-ttl')||{}).textContent || '',
    inks: ink(document.querySelectorAll('#cr-lrs-view .lrs-cname, #cr-lrs-view .lrs-ccount, #cr-lrs-view .lrs-trade, #cr-lrs-view .lrs-lead, #cr-lrs-view .lrs-name, #cr-lrs-view .lrs-rate, #cr-lrs-view .lrs-band, #cr-lrs-view .lrs-h, #cr-lrs-view .lrs-sub, #cr-lrs-view .lrs-note, #cr-lrs-view .lrs-empty, #cr-lrs-view .lrs-ttl')),
    bodyOver: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    viewOver: v ? v.scrollWidth > v.clientWidth + 1 : null,
    btns: [...document.querySelectorAll('#cr-lrs-view .lrs-tb')].filter(e=>getComputedStyle(e).display!=='none')
            .map(e => { const r = e.getBoundingClientRect(); return { id:e.id, h:Math.round(r.height) }; })
  };
})()`;

function scoreInks(inks, label) {
  let worst = null, tooSmall = [];
  for (const i of inks) {
    if (i.size && i.size < 11) tooSmall.push(i.t + ' @' + i.size + 'px');
    const c = rgb(i.color); if (!c) continue;
    const floor = (i.size >= 18 || (i.size >= 14 && Number(i.weight) >= 700)) ? 3.0 : 4.5;
    for (const g of i.ground) {
      const gr = rgb(g); if (!gr) continue;
      const v = ratio(c, gr);
      if (!worst || (v - floor) < (worst.v - worst.floor)) worst = { v, floor, t:i.t, cls:i.cls, g };
    }
  }
  ok(worst && worst.v >= worst.floor,
     label + ': every ink clears its floor' +
     (worst ? ' (worst ' + worst.v.toFixed(2) + ':1 vs ' + worst.floor + ' — "' + worst.t + '")' : ' — nothing read'));
  ok(tooSmall.length === 0,
     label + ': nothing is under the 11px floor' + (tooSmall.length ? ' — ' + tooSmall.join(', ') : ''));
}

/* ── screen 1: the crew list ─────────────────────────────────────────── */
const L = await p.evaluate(probe).catch(e => ({ err:String(e.message || e) }));
if (L.err) { ok(false, 'list probe threw: ' + L.err); }
else {
  ok(L.shown === 'block', 'the view is displayed');
  const bg = rgb(L.viewBg);
  ok(bg && lum(bg) < 0.06, 'it renders DARK (' + L.viewBg + ')');
  ok(L.crews.length === 4, 'every crew is on screen (' + L.crews.length + ')');
  ok(L.docs === 0, 'and it is a list, not a document — no .lrs-doc on screen');
  ok(L.trades.join('|') === 'Roofing|Siding', 'grouped by trade, in order (' + L.trades.join(', ') + ')');
  ok(/Archived/.test(L.text), 'archived crews are shown under their own heading');
  ok(/2 rates/.test(L.text) && /no rates yet/.test(L.text), 'each row says whether that crew has rates');
  const short = L.crews.filter(c => c.h < 44);
  ok(short.length === 0, 'every crew row is a 44px tap target (shortest ' + Math.min(...L.crews.map(c=>c.h)) + 'px)');
  ok(!L.bodyOver && L.viewOver === false, 'nothing scrolls sideways at 390px');
  scoreInks(L.inks, 'list');
}

/* ── screen 2: one crew's sheet ──────────────────────────────────────── */
await p.evaluate(() => {
  const b = document.querySelector('[data-lrs-crew]');
  if (b) b.dispatchEvent(new MouseEvent('click', { bubbles:true }));
});
await p.waitForTimeout(600);
const D = await p.evaluate(probe).catch(e => ({ err:String(e.message || e) }));
if (D.err) { ok(false, 'sheet probe threw: ' + D.err); }
else {
  ok(D.docs === 1, 'tapping a crew renders their sheet');
  ok(D.title === 'Santiago Gutierrez', 'the topbar names the crew (' + D.title + ')');
  ok(/SANTIAGO GUTIERREZ/.test(D.text), 'the document heads with the crew, not a hardcoded name');
  ok(D.rows === 3, 'the three rate lines render (' + D.rows + ')');
  ok(D.notes === 1 && /Measured around the base/.test(D.text), 'the catalog note renders as prose');
  ok(/not set/.test(D.text), 'an unpriced line says "not set"');
  ok(!/\$5\s*\/\s*LF/.test(D.text), 'and does NOT borrow the catalog price for it');
  ok(!D.bodyOver && D.viewOver === false, 'the sheet does not scroll sideways at 390px');
  const short = D.btns.filter(x => x.h < 44);
  ok(short.length === 0, 'every visible topbar control is 44px (' + D.btns.map(x=>x.id+':'+x.h).join(' ') + ')');
  scoreInks(D.inks, 'sheet');

  /* the state that costs money if it is quiet */
  const ns = D.inks.find(i => /not set/.test(i.t));
  ok(!!ns, '"not set" is a real rendered element, not a pseudo-element you cannot read');
  if (ns) {
    const c = rgb(ns.color); let worst = null;
    for (const g of ns.ground) { const gr = rgb(g); if (!gr) continue;
      const v = ratio(c, gr); if (!worst || v < worst) worst = v; }
    ok(worst >= 4.5, '"not set" clears the body-text floor — it is a decision, not a smudge ('
       + (worst ? worst.toFixed(2) : '?') + ':1)');
  }
}

await b.close();
console.log('\n' + (fail ? 'RED — ' + fail + ' failed, ' + pass + ' passed'
                         : 'GREEN — all ' + pass + ' checks passed'));
process.exit(fail ? 1 : 0);
