/* gate_1067 — three CRM-scoped inks clear the floor in BOTH themes, and the
 * deliberate insurance pins they were copied from are untouched.
 *
 * ⚠ THREE THINGS THIS GATE DOES THAT A NAIVE ONE WOULD NOT, each of which
 * already produced a wrong answer during this build:
 *
 * 1. IT COMPOSITES ALPHA GROUNDS. The map tab bar is rgba(16,18,24,.85), not
 *    opaque. Over the light page it composites to #34363b. Scoring against the
 *    raw rgba flatters the link by 1.3 points — my first rig printed 3.77:1
 *    where the true value is 2.45:1.
 *
 * 2. IT PROVES THE THEME ACTUALLY TOOK. cr-rbtheme-toggle-script REMOVES a bare
 *    data-theme at boot unless localStorage['cardinal.theme.rb'] is '1', and
 *    sentinel_setup_cardinal.js sets that key by reading window.__sentinelTheme.
 *    Set the attribute alone and the "light" run is a second DARK run wearing a
 *    light name — which is exactly what my first rig did, reporting all three
 *    sites as passing. A gate that cannot tell which theme it measured is worse
 *    than no gate, so a vacuous run is a FAILURE here, not a pass.
 *
 * 3. IT GUARDS THE DECISIONS IT COPIED FROM. #46701E and #FF8A80 are insurance's
 *    own measured pins, each with a comment explaining why. This build reuses
 *    those VALUES in retail; it must not disturb the insurance RULES. A colour
 *    fix that quietly restyles another CRM is this project's most expensive
 *    recurring shape.
 *
 *   node gate_1067.mjs [index.html]
 *
 * Exit 0 = every ink clears its floor in both themes and every fence holds.
 * Point it at the previous build as a negative control: 3 light checks go red.
 */
import { chromium } from 'playwright';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const FILE = process.argv[2] || 'index.html';
if (!existsSync(FILE)) { console.error('gate_1067: no such file: ' + FILE); process.exit(2); }
const HTML = readFileSync(FILE, 'utf8');
const SETUP = ['sentinel_setup_cardinal.js', 'e2e_mock_supa.js']
  .map(f => readFileSync(join(HERE, f), 'utf8')).join('\n;\n');

const FLOOR = 4.5;
const TARGETS = [
  { state: 'client', sel: '#projectView .dbmoney b.db-paid', what: 'the paid figure' },
  { state: 'client', sel: '#projectView .dbmtabs .dbmdir',   what: 'the Directions link' },
  { state: 'leads',  sel: '.ljsummary h3',                   what: 'the Job Summary heading' },
];

let pass = 0; const fails = [];
const ok  = (n, d) => { pass++; console.log(`  PASS  ${n}  — ${d}`); };
const bad = (n, d) => { fails.push(n + ': ' + d); console.log(`  FAIL  ${n}  — ${d}`); };

/* ── the source fences, checked before a browser is even started ────────── */
console.log(`gate_1067 — ${FILE}\n`);
for (const [needle, why] of [
  ['body.claim-insurance #projectView .dbmoney b.db-paid{color:#46701E;}',
   "insurance's docket green (its author measured 5.51:1 on cream)"],
  ['body.claim-insurance #projectView .dbmtabs .dbmdir{color:#FF8A80;}',
   "insurance's pinned light red for the non-flipping map bar"],
  ['#projectView .dbmoney b.db-due{color:#C8202E}',
   '.db-due, which was already correct on both grounds'],
]) {
  HTML.split(needle).length - 1 === 1
    ? ok('fence intact', why)
    : bad('fence intact', `${why} — expected exactly 1, found ${HTML.split(needle).length - 1}`);
}

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
}).catch(() => chromium.launch());

async function measure(theme, width) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 } });
  const page = await ctx.newPage();
  await page.route('**/*', r => {
    const u = r.request().url();
    if (u.startsWith('https://g67.test/'))
      return r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: HTML });
    if (/\.(woff2?|ttf|otf)(\?|$)/i.test(u)) return r.abort();
    return r.fulfill({ status: 200, body: '' });
  });
  /* ⚠ __sentinelTheme FIRST — see note 2 in the header. */
  if (theme !== 'default')
    await page.addInitScript(
      `window.__sentinelTheme=${JSON.stringify(theme)};` +
      `(function put(){var r=document.documentElement;` +
      ` if(r){r.setAttribute('data-theme',${JSON.stringify(theme)});return;}` +
      ` new MutationObserver(function(_,o){if(document.documentElement){o.disconnect();put();}})` +
      `  .observe(document,{childList:true});})();`);
  await page.addInitScript(SETUP);
  await page.goto('https://g67.test/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(900);

  const names = await page.evaluate(`(window.__sentinelStates||[]).map(s=>s.name)`);
  const out = [];
  for (const t of TARGETS) {
    const i = names.indexOf(t.state);
    if (i < 0) { out.push({ ...t, err: `state "${t.state}" missing from the walk` }); continue; }
    await page.evaluate(`Promise.resolve(window.__sentinelStates[${i}].run())`);
    await page.waitForTimeout(500);
    out.push(await page.evaluate(({ sel, what, state }) => {
      const el = document.querySelector(sel);
      const themeSeen = document.documentElement.getAttribute('data-theme') || '(none)';
      if (!el) return { sel, what, state, themeSeen, err: 'element not found' };
      const num = c => (c.match(/[-\d.]+/g) || []).map(Number);
      const rel = ([r, g, b]) => {
        const f = c => (c /= 255) <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
        return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
      };
      const ratio = (a, b) => {
        const la = rel(a), lb = rel(b);
        return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
      };
      /* Collect every layer an ancestor paints, nearest first, then composite
         from the FARTHEST opaque layer forward. A translucent bar is not a
         ground on its own — that is the whole point of this gate. */
      const layers = [];
      for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
        const cs = getComputedStyle(n);
        const bi = cs.backgroundImage || '';
        for (const m of bi.matchAll(/rgba?\([^)]+\)/g)) layers.push(num(m[0]));
        const bc = num(cs.backgroundColor || '');
        if (bc.length >= 3 && !(bc.length === 4 && bc[3] === 0)) layers.push(bc);
      }
      const html = num(getComputedStyle(document.documentElement).backgroundColor || '');
      layers.push(html.length >= 3 && !(html.length === 4 && html[3] === 0) ? html : [255, 255, 255]);
      /* walk back-to-front, compositing */
      let ground = layers[layers.length - 1].slice(0, 3);
      for (let k = layers.length - 2; k >= 0; k--) {
        const L = layers[k], a = L.length === 4 ? L[3] : 1;
        ground = [0, 1, 2].map(j => a * L[j] + (1 - a) * ground[j]);
      }
      const cs = getComputedStyle(el);
      const fg = num(cs.color).slice(0, 3);
      const size = parseFloat(cs.fontSize) || 16;
      const bold = (parseInt(cs.fontWeight, 10) || 400) >= 700;
      const floor = (size >= 24 || (size >= 18.66 && bold)) ? 3.0 : 4.5;
      return { sel, what, state, themeSeen, floor,
               color: cs.color,
               ground: 'rgb(' + ground.map(Math.round).join(', ') + ')',
               ratio: Math.round(ratio(fg, ground) * 100) / 100 };
    }, { sel: t.sel, what: t.what, state: t.state }));
  }
  await ctx.close();
  return out;
}

for (const theme of ['default', 'rb-light']) {
  const label = theme === 'default' ? 'dark ' : 'light';
  for (const width of [390, 1194]) {
    for (const r of await measure(theme, width)) {
      const name = `${label} ${String(width).padStart(4)}px  ${r.what}`;
      if (r.err) { bad(name, r.err); continue; }
      /* note 2: a run that never entered the theme proves nothing */
      if (theme === 'rb-light' && r.themeSeen !== 'rb-light') {
        bad(name, `VACUOUS — data-theme is "${r.themeSeen}", this is not a light run`);
        continue;
      }
      r.ratio >= r.floor
        ? ok(name, `${r.ratio}:1  (${r.color} on ${r.ground}, floor ${r.floor})`)
        : bad(name, `${r.ratio}:1 is under the ${r.floor} floor  (${r.color} on ${r.ground})`);
    }
  }
}

await browser.close();
console.log('');
if (fails.length) {
  console.log(`❌ FAIL — ${pass} passed, ${fails.length} failed`);
  fails.forEach(f => console.log('   ' + f));
  process.exit(1);
}
console.log(`✅ PASS — ${pass}/${pass}, both themes, both widths, fences intact`);
process.exit(0);
