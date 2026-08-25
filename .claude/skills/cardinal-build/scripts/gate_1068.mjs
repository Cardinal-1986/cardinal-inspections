/* gate_1068 — the eight remaining under-floor inks clear the floor everywhere
 * they appear, in BOTH themes and at BOTH widths.
 *
 * Ten findings across eight elements: three of them fail in both themes, so a
 * one-theme gate would "confirm" half this build.
 *
 * ⚠ IT WALKS EVERY STATE TO FIND EACH TARGET rather than trusting a state
 * name. During recon, looking for "Inspection" in the `album` state matched
 * `#galHint` — an element build 1066 had already fixed — and the run reported
 * it as PASSING. A gate that finds the wrong element is worse than no gate,
 * so each target here is pinned by a SELECTOR wherever one exists, and only
 * the two inline-styled spans are found by text.
 *
 * ⚠ IT PROVES THE THEME TOOK. cr-rbtheme-toggle-script removes a bare
 * data-theme at boot unless localStorage says otherwise; setting the attribute
 * alone yields a second dark run wearing a light name. Vacuous => FAIL.
 *
 * ⚠ IT COMPOSITES ALPHA GROUNDS back-to-front. A translucent chip over a red
 * tab is not a ground on its own — target 4 sits on rgba(0,0,0,.22) over
 * #c8202e, and reading the rgba raw would flatter it badly.
 *
 *   node gate_1068.mjs [index.html]
 *
 * Exit 0 = every target clears its floor. Point it at 1067 as a control.
 */
import { chromium } from 'playwright';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const FILE = process.argv[2] || 'index.html';
if (!existsSync(FILE)) { console.error('gate_1068: no such file: ' + FILE); process.exit(2); }
const HTML = readFileSync(FILE, 'utf8');
const SETUP = ['sentinel_setup_cardinal.js', 'e2e_mock_supa.js']
  .map(f => readFileSync(join(HERE, f), 'utf8')).join('\n;\n');

const TARGETS = [
  { key: 'rvflip',    sel: '#rvLeftSwitch',                            what: 'the review switch' },
  { key: 'byline',    text: '(from client profile)',                   what: 'the checklist byline' },
  /* ⚠ :not(.active) IS LOAD-BEARING. The first version of this gate selected
     `#cr-pae-tabs button` and matched the ACTIVE tab — white on cardinal red,
     5.67:1 — reporting a comfortable PASS for a target whose cream sibling was
     the thing under test. It is the same wrong-element fault the header warns
     about, committed inside the gate written to prevent it. */
  { key: 'paetabs',   sel: '#cr-pae-tabs button:not(.active)',           what: "the photo editor's tab strip" },
  { key: 'paecount',  sel: '#cr-pae-tabs button.active .count',          what: "the photo editor's count badge" },
  { key: 'lilcount',  sel: '.cr-lil-tabs button.active .count',        what: "the open tab's count badge" },
  { key: 'nodesc',    text: 'no description',                          what: 'the no-description placeholder' },
  { key: 'convertins',sel: '.convertins .cvtxt small',                 what: 'the Convert to Insurance caption' },
  { key: 'phnote',    sel: '.phnote',                                   what: 'the empty-state note' },
  { key: 'navempty',  sel: '#cr-est-view .cr-est-nav .navempty',        what: "the estimate rail's empty line" },
];

let pass = 0; const fails = []; const seenAt = {};
const ok  = (n, d) => { pass++; console.log(`  PASS  ${n}  — ${d}`); };
const bad = (n, d) => { fails.push(n + ': ' + d); console.log(`  FAIL  ${n}  — ${d}`); };

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
}).catch(() => chromium.launch());

async function run(theme, width) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 } });
  const page = await ctx.newPage();
  await page.route('**/*', r => {
    const u = r.request().url();
    if (u.startsWith('https://g68.test/'))
      return r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: HTML });
    if (/\.(woff2?|ttf|otf)(\?|$)/i.test(u)) return r.abort();
    return r.fulfill({ status: 200, body: '' });
  });
  if (theme !== 'default')
    await page.addInitScript(
      `window.__sentinelTheme=${JSON.stringify(theme)};` +
      `(function put(){var r=document.documentElement;` +
      ` if(r){r.setAttribute('data-theme',${JSON.stringify(theme)});return;}` +
      ` new MutationObserver(function(_,o){if(document.documentElement){o.disconnect();put();}})` +
      `  .observe(document,{childList:true});})();`);
  await page.addInitScript(SETUP);
  await page.goto('https://g68.test/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(900);

  const names = await page.evaluate(`(window.__sentinelStates||[]).map(s=>s.name)`);
  const got = {};
  for (let i = 0; i < names.length; i++) {
    if (Object.keys(got).length === TARGETS.length) break;
    await page.evaluate(`Promise.resolve(window.__sentinelStates[${i}].run())`);
    await page.waitForTimeout(300);
    const found = await page.evaluate(({ targets, done }) => {
      const num = c => (c.match(/[-\d.]+/g) || []).map(Number);
      const rel = ([r, g, b]) => {
        const f = c => (c /= 255) <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
        return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
      };
      const ratio = (a, b) => {
        const la = rel(a), lb = rel(b);
        return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
      };
      const own = el => [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join('').trim();
      const shown = el => {
        const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
        return r.width > 1 && r.height > 1 && cs.visibility !== 'hidden' && cs.display !== 'none';
      };
      const out = {};
      for (const t of targets) {
        if (done.includes(t.key)) continue;
        let el = null;
        if (t.sel) { for (const c of document.querySelectorAll(t.sel)) if (shown(c)) { el = c; break; } }
        else { for (const c of document.querySelectorAll('span,small,div,em,i')) {
                 if (own(c).includes(t.text) && shown(c)) { el = c; break; } } }
        if (!el) continue;
        /* composite every painted layer, back to front */
        const layers = [];
        for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
          const cs = getComputedStyle(n);
          for (const m of (cs.backgroundImage || '').matchAll(/rgba?\([^)]+\)/g)) layers.push(num(m[0]));
          const bc = num(cs.backgroundColor || '');
          if (bc.length >= 3 && !(bc.length === 4 && bc[3] === 0)) layers.push(bc);
        }
        const h = num(getComputedStyle(document.documentElement).backgroundColor || '');
        layers.push(h.length >= 3 && !(h.length === 4 && h[3] === 0) ? h : [255, 255, 255]);
        let g = layers[layers.length - 1].slice(0, 3);
        for (let k = layers.length - 2; k >= 0; k--) {
          const L = layers[k], a = L.length === 4 ? L[3] : 1;
          g = [0, 1, 2].map(j => a * L[j] + (1 - a) * g[j]);
        }
        const cs = getComputedStyle(el);
        const size = parseFloat(cs.fontSize) || 16;
        const bold = (parseInt(cs.fontWeight, 10) || 400) >= 700;
        const floor = (size >= 24 || (size >= 18.66 && bold)) ? 3.0 : 4.5;
        out[t.key] = { color: cs.color, floor,
                       ground: 'rgb(' + g.map(Math.round).join(', ') + ')',
                       ratio: Math.round(ratio(num(cs.color).slice(0, 3), g) * 100) / 100 };
      }
      return out;
    }, { targets: TARGETS.map(t => ({ key: t.key, sel: t.sel, text: t.text })), done: Object.keys(got) });
    Object.assign(got, found);
    for (const k of Object.keys(found)) (seenAt[k] ||= new Set()).add(names[i]);
  }
  const themeSeen = await page.evaluate(`document.documentElement.getAttribute('data-theme')||'(none)'`);
  await ctx.close();
  return { got, themeSeen, states: names.length };
}

console.log(`gate_1068 — ${FILE}\n`);
for (const theme of ['default', 'rb-light']) {
  const label = theme === 'default' ? 'dark ' : 'light';
  for (const width of [390, 1194]) {
    const { got, themeSeen } = await run(theme, width);
    if (theme === 'rb-light' && themeSeen !== 'rb-light') {
      bad(`${label} ${width}px`, `VACUOUS — data-theme is "${themeSeen}"; this is not a light run`);
      continue;
    }
    for (const t of TARGETS) {
      const name = `${label} ${String(width).padStart(4)}px  ${t.what}`;
      const r = got[t.key];
      /* Not every target renders at every width — the estimate rail is desktop
         only. Absence is reported, never silently counted as a pass. */
      if (!r) { console.log(`  ----  ${name}  — not on screen at this width`); continue; }
      r.ratio >= r.floor
        ? ok(name, `${r.ratio}:1  (${r.color} on ${r.ground}, floor ${r.floor})`)
        : bad(name, `${r.ratio}:1 is under the ${r.floor} floor  (${r.color} on ${r.ground})`);
    }
  }
}

/* ⚠ A FLOOR ON COVERAGE. Without this, a target that stops being findable in
   every run silently drops out and the gate stays green on fewer checks —
   CLAUDE.md's assertion-fault #2, a test that loses a check and says nothing. */
const missing = TARGETS.filter(t => !seenAt[t.key]);
missing.length
  ? bad('coverage floor', `never found in ANY state: ${missing.map(t => t.key).join(', ')}`)
  : ok('coverage floor', `all ${TARGETS.length} targets were located and scored`);

await browser.close();
console.log('');
if (fails.length) {
  console.log(`❌ FAIL — ${pass} passed, ${fails.length} failed`);
  fails.forEach(f => console.log('   ' + f));
  process.exit(1);
}
console.log(`✅ PASS — ${pass}/${pass}, both themes, both widths`);
process.exit(0);
