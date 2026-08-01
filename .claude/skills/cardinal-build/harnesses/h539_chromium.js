/* Build 538 gate + preview.
 *
 * This build has a JS half and a CSS half, so both are executed rather than
 * read:
 *
 *   JS  — stripEmoji(), iconKey() and the item-render statement are EXTRACTED
 *         FROM THE SHIPPED FILE and run. The labels they run against are the
 *         real .navopt labels pulled out of the same file, emoji entities and
 *         all — not a fixture anyone typed. So the assertion is "does the
 *         shipped code emit data-k=cardinaltruth", not "would it".
 *
 *   CSS — the source cr-lnav-styles, 536's cr-lnav-a-styles and the new block
 *         are ALL in the page, so every assertion answers which rule won.
 *         Contrast is recomputed from the RENDERED colour against the RENDERED
 *         background, not from the numbers in the patch comment.
 */
const fs = require('fs');
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const SC = '/tmp/claude-0/-home-user-cardinal-inspections/39dffed8-e57b-5dc7-bbf7-dd9d3909112a/scratchpad';
const now = fs.readFileSync(SC + '/app/index_v539.html', 'utf8');
const prev = fs.readFileSync(SC + '/app/index_v538.html', 'utf8');

/* ---- extract, then PRINT WHAT THE EXTRACTOR CAUGHT ------------------------ */
const styleBody = (src, id) => {
  const a = src.indexOf('<style id="' + id + '">');
  if (a < 0) throw new Error('no style block ' + id);
  return src.slice(src.indexOf('>', a) + 1, src.indexOf('</style>', a));
};
const fn = (src, name) => {
  const i = src.indexOf('function ' + name + '(');
  if (i < 0) throw new Error('no function ' + name);
  let d = 0, j = src.indexOf('{', i);
  for (let k = j; k < src.length; k++) {
    if (src[k] === '{') d++;
    else if (src[k] === '}' && !--d) return src.slice(i, k + 1);
  }
  throw new Error('unbalanced ' + name);
};

const LNAV = styleBody(now, 'cr-lnav-styles');
const A536 = styleBody(now, 'cr-lnav-a-styles');
const INK = styleBody(now, 'cr-lnav-ink-styles');
const SRC_FNS = [fn(now, 'stripEmoji'), fn(now, 'iconKey'), fn(now, 'lnavIcon'), fn(now, 'esc')];

/* the shipped render statement, lifted whole */
const RSTART = now.indexOf('return \'<button type="button" class="lnav-item\'');
const RENDER = now.slice(RSTART, now.indexOf(';', now.indexOf('</button>\'', RSTART)) + 1);

/* the icon sets the shipped lnavIcon closes over */
const objLit = (name) => {
  const m = now.match(new RegExp('var ' + name + '\\s*=\\s*\\{'));
  let i = m.index + m[0].length - 1, d = 0;
  for (let k = i; k < now.length; k++) {
    if (now[k] === '{') d++;
    else if (now[k] === '}' && !--d) return now.slice(i, k + 1);
  }
};
const I2 = objLit('I2'), I5 = objLit('I5');

/* the REAL labels, out of the real menu markup — kept as RAW innerHTML, because
   that is what the browser is handed; the page decodes them the way the app does */
const LABELS = [];
for (const m of now.matchAll(/<button class="navopt" data-nav="([a-z0-9-]+)"[^>]*>([^<]+)</g))
  LABELS.push({ nav: m[1], raw: m[2] });
const chm = now.match(/makeOpt\('cr-nav-communityhub',\s*'((?:[^'\\]|\\.)*)'/);
if (!chm) throw new Error('Community Hub option not found');
/* makeOpt does b.innerHTML = html, and that html is a JS string literal whose
   \uXXXX escapes the engine resolves before assignment — so resolve them here */
LABELS.push({ nav: '(runtime, no data-nav)', raw: JSON.parse('"' + chm[1] + '"') });

console.log(`  captured ${LABELS.length} real menu labels`);
console.log(`  captured render statement: ${RENDER.length} chars`);
console.log(`  captured INK block: ${INK.length} chars, ` +
            `${(INK.match(/{/g) || []).length}/${(INK.match(/}/g) || []).length} braces`);
if ((INK.match(/{/g) || []).length !== (INK.match(/}/g) || []).length)
  throw new Error('INK extraction unbalanced');
if (!RENDER.includes('data-k=')) throw new Error('render statement has no data-k — wrong capture');
if (styleBody(prev, 'cr-lnav-a-styles').length < 100) throw new Error('bad prev capture');

const page = `<style>
:root{--lnav-w:238px;--lnav-top:0px;--lnav-crmc:#c8202e;--rbe-ink:#cfd6df;--rbe-head:#fff;
      --rbe-mute:#8b9199;--rbe-mute2:#6d747e;--rbe-line:#232329;--rbe-panel:#16161B;
      --rbe-panelbd:#24242c;--rbe-railbg:#0E0E12}
:root[data-theme="rb-light"]{--rbe-ink:#161616;--rbe-head:#161616;--rbe-mute:#6d747e}
</style>
<style>${LNAV}</style>
<style>${A536}</style>
<style>${INK}</style>
<style>
#cr-lnav{position:relative !important;top:0 !important;bottom:auto !important;height:470px}
body{margin:0;display:flex;background:#09090C}
:root[data-theme="rb-light"] body{background:#eceef0}
.pg{padding:20px 24px;flex:1;font:600 12px 'Segoe UI',Arial,sans-serif;color:#7d8695}
:root[data-theme="rb-light"] .pg{color:#8a8a8a}
</style>
<nav id="cr-lnav"></nav><div class="pg">desktop rail — three labels colour-coded</div>
<script>
var I2 = ${I2}, I5 = ${I5};
${SRC_FNS.join('\n')}
/* the shipped render statement, wrapped so it can be called per item */
function renderItem(it, ii, id){ ${RENDER} }
window.__labels = ${JSON.stringify(LABELS)};
var SEC = [
  { id:'DAILY', items:['landing','clients','leads','board'] },
  { id:'CRMS',  items:['cardinaltruth','(runtime, no data-nav)'] }
];
/* The rail reads label = (el.textContent || '').trim() off the mirrored
   .navopt — DECODED DOM text. Feeding it the raw source instead made every
   slug come out as 128737655039cardinaltruth, and the first run of this
   harness failed on correct code because of it. So build the real element and
   read it back exactly the way the app does. */
window.__labels.forEach(function(l){
  var el = document.createElement('button');
  el.className = 'navopt';
  el.innerHTML = l.raw;
  l.label = (el.textContent || '').trim();
  l.el = el;
});
var html = '';
SEC.forEach(function(s){
  html += '<button type="button" class="lnav-sec"><span class="chev">▼</span>' +
          '<span>' + s.id + '</span><span class="cnt">' + s.items.length + '</span></button>' +
          '<div class="lnav-body">';
  s.items.forEach(function(nav, ii){
    var rec = window.__labels.filter(function(l){ return l.nav === nav; })[0];
    rec.el.className = 'navopt' + (nav === 'clients' ? ' on' : '');
    html += renderItem({ el: rec.el, label: rec.label }, ii, s.id);
  });
  html += '</div>';
});
document.getElementById('cr-lnav').innerHTML = html;
/* #cr-lnav is display:none !important until body.cr-lnav-on is set — the app's
   own single declaration of "desktop only". Without it every assertion here
   still passes (getComputedStyle reads hidden elements happily) and the
   screenshot comes back empty, which is exactly how the first run went. */
document.body.classList.add('cr-lnav-on');
</script>`;

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1220, height: 500 }  /* the rail is 0px below the 1100px breakpoint — test it at a desktop width */, deviceScaleFactor: 2 });
  let pass = 0, fail = 0;
  const ok = (n, c, d) => { c ? (pass++, console.log('  PASS  ' + n))
                              : (fail++, console.log('  FAIL  ' + n + (d ? '  <' + d + '>' : ''))); };
  await p.setContent(page, { waitUntil: 'load' });

  console.log('\nVISIBILITY — assert it before trusting a single colour reading');
  const vis = await p.evaluate(() => {
    const n = document.getElementById('cr-lnav');
    const r = n.getBoundingClientRect();
    const t = document.querySelector('.lnav-item[data-k="landing"] .lnav-tx');
    const tr = t.getBoundingClientRect();
    return { navDisplay: getComputedStyle(n).display, w: r.width, h: r.height,
             txW: tr.width, txH: tr.height };
  });
  ok('the rail is actually painting, not just computing',
     vis.navDisplay !== 'none' && vis.w > 100 && vis.h > 100, JSON.stringify(vis));
  ok('  and a label has real box area', vis.txW > 30 && vis.txH > 8, JSON.stringify(vis));

  console.log('\nJS — the shipped code, run against the real menu labels');
  const slugs = await p.evaluate(() =>
    window.__labels.map(l => ({ ...l, slug: iconKey(stripEmoji(l.label)) })));
  for (const want of ['cardinaltruth', 'communityhub', 'landing']) {
    const hit = slugs.find(s => s.slug === want);
    ok(`shipped stripEmoji+iconKey give "${want}"`, !!hit,
       'no real label slugs to ' + want);
    if (hit) console.log(`        from ${JSON.stringify(hit.label)}   (data-nav: ${hit.nav})`);
  }
  ok('  Community Hub really has no data-nav — which is why data-k exists',
     slugs.find(s => s.slug === 'communityhub').nav.startsWith('(runtime'));
  const attrs = await p.evaluate(() =>
    [...document.querySelectorAll('.lnav-item')].map(n => n.getAttribute('data-k')));
  ok('every rendered item carries data-k', attrs.every(Boolean), JSON.stringify(attrs));
  ok('  and data-i / data-sec survive the insertion',
     await p.evaluate(() => [...document.querySelectorAll('.lnav-item')]
       .every(n => n.hasAttribute('data-i') && n.hasAttribute('data-sec'))));

  /* contrast recomputed from what is actually PAINTED */
  const probe = async () => p.evaluate(() => {
    const lum = (rgb) => {
      const [r, g, bl] = rgb.match(/\d+(\.\d+)?/g).slice(0, 3).map(Number).map(v => {
        v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
    };
    const ratio = (a, b) => {
      const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
      return (x + 0.05) / (y + 0.05);
    };
    const ground = (el) => {
      for (let n = el; n; n = n.parentElement) {
        const bg = getComputedStyle(n).backgroundColor;
        if (bg && !/rgba\(0, 0, 0, 0\)/.test(bg)) return bg;
      }
      return 'rgb(0,0,0)';
    };
    const out = {};
    for (const k of ['cardinaltruth', 'communityhub', 'landing']) {
      const item = document.querySelector(`.lnav-item[data-k="${k}"]`);
      const tx = item.querySelector('.lnav-tx');
      const ic = item.querySelector('.lnav-ic .i2');
      out[k] = {
        text: getComputedStyle(tx).color,
        icon: getComputedStyle(ic).fill,
        bg: ground(item),
        ratio: ratio(getComputedStyle(tx).color, ground(item)),
      };
    }
    out.plain = getComputedStyle(document.querySelector('.lnav-item[data-k="clients"] .lnav-tx')).color;
    out.plainRow = getComputedStyle(document.querySelector('.lnav-item[data-k="clients"]')).color;
    out.mute = getComputedStyle(document.documentElement).getPropertyValue('--rbe-mute').trim();
    return out;
  });

  for (const [mode, want] of [['DARK', { cardinaltruth: 'rgb(239, 107, 107)',
                                         communityhub: 'rgb(52, 211, 153)',
                                         landing: 'rgb(240, 198, 81)' }],
                              ['LIGHT', { cardinaltruth: 'rgb(200, 32, 46)',
                                          communityhub: 'rgb(4, 120, 87)',
                                          landing: 'rgb(240, 198, 81)' }]]) {
    if (mode === 'LIGHT') {
      await p.evaluate(() => document.documentElement.setAttribute('data-theme', 'rb-light'));
      await p.waitForTimeout(130);
    }
    console.log(`\n${mode} — the three labels, and nothing else`);
    const r = await probe();
    /* 539: Landing in LIGHT is the one sanctioned exemption — literal yellow at
       Theo's explicit call, with the measurement in front of him. Named, not
       skipped: every other value still has to clear 4.5:1 here. */
    const EXEMPT = mode === 'LIGHT' ? ['landing'] : [];
    for (const k of Object.keys(want)) {
      ok(`${k} label is ${want[k]}`, r[k].text === want[k], r[k].text);
      if (EXEMPT.includes(k)) {
        ok(`  ${(r[k].ratio).toFixed(2)}:1 — knowingly under the floor, Theo's call`,
           r[k].ratio < 4.5, 'it now PASSES — the exemption is stale, delete it');
      } else {
        ok(`  ${(r[k].ratio).toFixed(2)}:1 on the ground it is actually painted on`,
           r[k].ratio >= 4.5, r[k].ratio.toFixed(2) + ' vs ' + r[k].bg);
      }
    }
    ok('the ICON is untouched — still the nav\'s muted grey',
       Object.keys(want).every(k => r[k].icon === r[k === 'landing' ? 'landing' : k].icon)
       && r.cardinaltruth.icon === r.landing.icon && r.cardinaltruth.icon === r.communityhub.icon,
       r.cardinaltruth.icon + ' / ' + r.communityhub.icon + ' / ' + r.landing.icon);
    ok('  an untouched item keeps 536\'s row colour', r.plain === r.plainRow,
       r.plain + ' vs ' + r.plainRow);
    await p.screenshot({ path: SC + `/lnav539-${mode.toLowerCase()}.png`, fullPage: true });
  }

  console.log('\nTHE COLOUR SURVIVES THE ROW STATES 536 SET');
  await p.evaluate(() => document.documentElement.removeAttribute('data-theme'));
  await p.waitForTimeout(120);
  const states = await p.evaluate(async () => {
    const item = document.querySelector('.lnav-item[data-k="cardinaltruth"]');
    const tx = item.querySelector('.lnav-tx');
    const base = getComputedStyle(tx).color;
    item.classList.add('on');
    const on = getComputedStyle(tx).color;
    const rowOn = getComputedStyle(item).color;
    item.classList.remove('on');
    return { base, on, rowOn };
  });
  ok('active row: the label stays red, though the row itself goes white',
     states.on === states.base && states.rowOn === 'rgb(255, 255, 255)',
     states.on + ' / row ' + states.rowOn);

  console.log('\n' + '='.repeat(58) + '\n  ' + pass + ' passed, ' + fail + ' failed\n' + '='.repeat(58));
  await b.close();
  process.exit(fail ? 1 : 0);
})();
