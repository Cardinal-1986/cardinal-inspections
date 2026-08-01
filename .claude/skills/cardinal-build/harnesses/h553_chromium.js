/* Build 553 gate — the right side of Crews.
 *
 * The claims are about RENDERING, so computed styles alone are not enough.
 * This walks the luma profile of ACTUAL PIXELS down the body half's face,
 * 552 beside 553, averaged across the card's width.
 *
 * IT ALSO ASSERTS A CLAIM I GOT WRONG, on purpose. I first reported a
 * drop-shadow smear at the seam — the top half's `0 14px 28px` landing on the
 * body half's face. It does not happen: the body half is a later sibling with
 * an opaque background and paints over that shadow. What I had really measured
 * was the first document row's own border, 14px down. The "no shadow smear
 * existed to fix" assertion pins that down so the wrong diagnosis cannot come
 * back as a future fix.
 *
 * A note on method, because the obvious version of this test is worthless in
 * dark: `.crw-card` carries a radial gradient, so the card's own face is
 * darker near its top whatever the shadow does. An earlier version compared
 * each row against "clean" further down and dutifully reported an identical
 * -5.14 for both builds — it was measuring the gradient. Reading the same row
 * in both builds cancels anything the card draws itself.
 *
 * What IS real, and is measured here:
 *   · dark drew a white bevel line across the middle of the panel (luma 53.0
 *     against the card's own 30.2) — `.crw-card`'s inset top highlight on a
 *     half that has no top edge
 *   · light's panel was 10px-cornered against the nav's 14px
 *   · the file input rendered as a raw UA control in both themes
 *
 * 552 is run through every measurement as the negative control.
 */
const fs = require('fs');
const { execSync } = require('child_process');
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const SC = '/tmp/claude-0/-home-user-cardinal-inspections/39dffed8-e57b-5dc7-bbf7-dd9d3909112a/scratchpad';

const build = (file) => {
  const src = fs.readFileSync(`${SC}/app/${file}`, 'utf8');
  const styles = [];
  for (let i = 0; ;) {
    const a = src.indexOf('<style', i); if (a < 0) break;
    const o = src.indexOf('>', a), b = src.indexOf('</style>', o); if (b < 0) break;
    styles.push(src.slice(o + 1, b)); i = b + 8;
  }
  return { styles, script: src.slice(src.indexOf('<script id="cr-crew-script">') + 28,
    src.indexOf('</script>', src.indexOf('<script id="cr-crew-script">'))) };
};

const CREWS = [
  { id: 'c1', name: 'Ramirez Roofing', trade: 'Roofing', contact_name: 'Luis Ramirez',
    contact_phone: '937-555-0142', archived: false },
  { id: 'c2', name: 'Delgado Exteriors', trade: 'Siding', archived: false },
  { id: 'c3', name: 'Novak Gutter Co', trade: 'Gutters', archived: false },
];
/* expires_on — the real column. An earlier fixture used expires_at and every
   COI read "no expiry", which looked like a bug and was the fixture's fault. */
const DOCS = [
  { id: 'd1', crew_id: 'c1', kind: 'w9', storage_path: 'a.pdf', expires_on: null },
  { id: 'd2', crew_id: 'c1', kind: 'gl', storage_path: 'b.pdf', expires_on: '2027-03-14',
    carrier: 'Westfield', coverage_limits: '$1M / $2M' },
  { id: 'd3', crew_id: 'c1', kind: 'wc', storage_path: 'c.pdf', expires_on: '2026-08-20' },
];
const STUB = `
window.TEAM = true;
window.currentUser = { email:'theo@cardinalrenovations.net' };
window.ADMIN_EMAILS = ['theo@cardinalrenovations.net'];
window.isAdminUser = function(){ return true; };
const _D = { crews:${JSON.stringify(CREWS)}, crew_docs:${JSON.stringify(DOCS)},
  crew_notes:[], pricing_items:[], crew_rates:[] };
function _q(t){ const a={_r:(_D[t]||[]).slice(),select(){return a},eq(){return a},order(){return a},
  then(f){return Promise.resolve({data:a._r,error:null}).then(f)}}; return a; }
window.supa={from:_q,storage:{from:()=>({upload:async()=>({error:null}),
  createSignedUrl:async()=>({data:{signedUrl:'about:blank'},error:null}),remove:async()=>({error:null})})}};
window.showHome=function(){};
`;

let pass = 0, fail = 0;
const ok = (n, c, d) => { c ? (pass++, console.log('  PASS  ' + n))
                            : (fail++, console.log('  FAIL  ' + n + (d ? '  <' + d + '>' : ''))); };

(async () => {
  const br = await chromium.launch();

  const page = async (file, light) => {
    const { styles, script } = build(file);
    const p = await br.newPage({ viewport: { width: 1400, height: 1000 }, deviceScaleFactor: 1 });
    await p.setContent(`<html${light ? ' data-theme="rb-light"' : ''}><head>` +
      styles.map(s => `<style>${s}</style>`).join('') + `</head><body style="margin:0">
      <div id="crewsView" style="display:none;position:fixed;inset:0;z-index:156;overflow-y:auto;"></div>
      <script>${STUB}<\/script><script>${script}<\/script></body></html>`, { waitUntil: 'load' });
    await p.evaluate(async () => { await window.CardinalCrews.open(); });
    await p.waitForSelector('.crw-tab', { timeout: 5000 });
    return p;
  };

  const shoot = async (file, light, tag) => {
    const p = await page(file, light);
    const geo = await p.evaluate(() => {
      const g = (el) => {
        const r = el.getBoundingClientRect(), s = getComputedStyle(el);
        return { top: Math.round(r.top), bottom: Math.round(r.bottom),
                 left: Math.round(r.left), right: Math.round(r.right),
                 radius: s.borderTopLeftRadius, shadow: s.boxShadow,
                 borderTop: s.borderTopWidth + ' ' + s.borderTopColor };
      };
      const cards = [...document.querySelectorAll('#crewsView .crw-card')];
      const fi = document.querySelector('input[type=file]');
      return { nav: g(document.querySelector('.crw-nav')), top: g(cards[0]), bot: g(cards[1]),
        n: cards.length, edges: cards.map(el => g(el).borderTop),
        fileBorder: fi ? getComputedStyle(fi).borderTopWidth : null,
        fileRadius: fi ? getComputedStyle(fi).borderTopLeftRadius : null };
    });
    const path = `${SC}/seam_${tag}.png`;
    await p.screenshot({ path });
    await p.close();
    return { geo, path };
  };

  /* the same row, in both builds, averaged across the card's width */
  const rows = (pngA, pngB, geo) => {
    const x0 = geo.bot.left + 40, x1 = geo.bot.right - 40, y = geo.bot.top;
    const out = execSync(`python3 - <<'PY'
from PIL import Image
a = Image.open("${pngA}").convert("RGB"); b = Image.open("${pngB}").convert("RGB")
def lum(p): return 0.2126*p[0] + 0.7152*p[1] + 0.0722*p[2]
def row(im, yy):
    v = [lum(im.getpixel((xx, yy))) for xx in range(${x0}, ${x1}, 7)]
    return round(sum(v)/len(v), 2)
for dy in range(0, 13):
    print('%d,%s,%s' % (dy, row(a, ${y}+dy), row(b, ${y}+dy)))
PY`, { encoding: 'utf8' }).trim().split('\n');
    const r = out.map(l => { const [dy, before, after] = l.split(',').map(Number);
                             return { dy, before, after }; });
    /* a truncated profile once made this test pass vacuously on Math.max of an
       empty array (-Infinity < 2.0). Never again. */
    if (r.length !== 13 || r.some(v => !isFinite(v.before) || !isFinite(v.after)))
      throw new Error('profile did not parse: ' + JSON.stringify(r));
    return r;
  };

  for (const light of [true, false]) {
    const theme = light ? 'LIGHT' : 'DARK';
    console.log('\n' + '='.repeat(70) + `\n  ${theme}\n` + '='.repeat(70));

    const b = await shoot('index_v552.html', light, `552_${theme}`);
    const a = await shoot('index_v553.html', light, `553_${theme}`);
    console.log(`\n        top half ends y=${b.geo.top.bottom}, body starts y=${b.geo.bot.top}`);

    console.log('\nTHE SEAM — luma down the body half\'s face, 552 against 553');
    const prof = rows(b.path, a.path, a.geo);
    prof.slice(0, 4).forEach(r => console.log(
      `        dy=${String(r.dy).padStart(2)}   552 ${String(r.before).padStart(6)}   553 ${String(r.after).padStart(6)}`));

    /* dy 1-9 only. The body half's 14px padding puts the first document row's
       own border at dy≈14 and its antialiasing is measurable by dy 12 — that
       border is exactly what I mistook for a shadow, so letting it into the
       window would be the same error twice. A `0 14px 28px` shadow would
       dominate this span if it reached the face. */
    const flat = prof.filter(r => r.dy >= 1 && r.dy <= 9);
    const spread = Math.max(...flat.map(r => r.before)) - Math.min(...flat.map(r => r.before));
    ok(`no shadow smear existed to fix — 552's face is flat over dy 1-9 (spread ${spread.toFixed(2)} luma)`,
       spread < 2.0, spread.toFixed(2));

    if (!light) {
      const seam = prof.find(r => r.dy === 0), face = prof.find(r => r.dy === 5);
      console.log(`        the bevel line at dy=0: ${seam.before} → ${seam.after} (card face ≈ ${face.after})`);
      ok(`dark drew a white line across the middle; 553 removes it (${seam.before} → ${seam.after})`,
         seam.before - seam.after >= 15, `${seam.before} → ${seam.after}`);
      ok('  …down to the card\'s own face, not merely dimmed',
         Math.abs(seam.after - face.after) < 2, `${seam.after} vs ${face.after}`);
    } else {
      ok('light never had the bevel line — nothing to remove, and nothing moved',
         prof.filter(r => r.dy >= 0 && r.dy <= 9).every(r => Math.abs(r.after - r.before) < 0.5));
    }

    console.log('\nNO CARDINAL EDGE ACROSS THE MIDDLE');
    console.log(`        top half: ${a.geo.edges[0]}\n        body half: ${a.geo.edges[1]}`);
    ok('the body half draws no top border at all', a.geo.edges[1].startsWith('0px'), a.geo.edges[1]);
    ok('  …while the top half keeps the edge', !a.geo.edges[0].startsWith('0px'), a.geo.edges[0]);

    console.log('\nGEOMETRY');
    ok(`the panel is still two cards butted together (${a.geo.n})`, a.geo.n === 2, String(a.geo.n));
    ok(`  they still touch exactly: ${a.geo.top.bottom} = ${a.geo.bot.top}`,
       Math.abs(a.geo.top.bottom - a.geo.bot.top) <= 1, `${a.geo.top.bottom} vs ${a.geo.bot.top}`);
    ok(`corners match the crew list: nav ${a.geo.nav.radius}, panel ${a.geo.top.radius}`,
       a.geo.nav.radius === a.geo.top.radius, `${a.geo.nav.radius} vs ${a.geo.top.radius}`);
    if (!light) {
      ok(`  dark keeps its 10px, unchanged from 552 (${b.geo.top.radius} → ${a.geo.top.radius})`,
         b.geo.top.radius === a.geo.top.radius && a.geo.top.radius === '10px', a.geo.top.radius);
      ok('  and the dark nav well is still recessed', /inset/.test(a.geo.nav.shadow), a.geo.nav.shadow);
    } else {
      ok(`  light went 10px → 14px to match the nav (${b.geo.top.radius} → ${a.geo.top.radius})`,
         b.geo.top.radius === '10px' && a.geo.top.radius === '14px',
         `${b.geo.top.radius} → ${a.geo.top.radius}`);
    }

    console.log('\nTHE FILE INPUT');
    ok(`552 rendered a raw UA control (border ${b.geo.fileBorder}, radius ${b.geo.fileRadius})`,
       b.geo.fileBorder === '0px' || b.geo.fileRadius === '0px',
       `${b.geo.fileBorder} / ${b.geo.fileRadius}`);
    ok(`553 styles it like every other field (border ${a.geo.fileBorder}, radius ${a.geo.fileRadius})`,
       a.geo.fileBorder !== '0px' && a.geo.fileRadius !== '0px',
       `${a.geo.fileBorder} / ${a.geo.fileRadius}`);
  }

  console.log('\n' + '='.repeat(70) + '\n  ' + pass + ' passed, ' + fail + ' failed\n' + '='.repeat(70));
  await br.close();
  process.exit(fail ? 1 : 0);
})();
