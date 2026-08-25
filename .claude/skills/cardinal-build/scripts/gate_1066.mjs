/* gate_1066 — the Photo Album's three inks clear the floor in BOTH themes.
 *
 * A real Chromium render that scores each element against the ground the
 * browser actually composites, because this whole build exists because a
 * screen looked fine in the theme somebody happened to look at.
 *
 * ⚠ THIS GATE MUST CHECK LIGHT, AND THAT IS THE POINT. I nearly dismissed the
 * finding that produced this build by comparing it against a DARK screenshot —
 * the sentinel had flagged it under `rb-light` and I checked the wrong theme.
 * A one-theme gate would have "confirmed" the fix on the theme that was never
 * broken.
 *
 * ⚠ AND IT MUST CHECK DARK TOO. Build 527 fixed a dark ink with a computed
 * literal, applied it unconditionally, and broke light at 2.30:1. The reverse
 * is just as easy. Both directions or nothing.
 *
 *   node gate_1066.mjs [index.html]
 *
 * Exit 0 = every ink clears its floor in both themes.
 */
import { chromium } from 'playwright';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const FILE = process.argv[2] || 'index.html';
if (!existsSync(FILE)) { console.error('gate_1066: no such file: ' + FILE); process.exit(2); }
const HTML = readFileSync(FILE, 'utf8');
const SETUP = ['sentinel_setup_cardinal.js', 'e2e_mock_supa.js']
  .map(f => readFileSync(join(HERE, f), 'utf8')).join('\n;\n');

const FLOOR = 4.5;
const TARGETS = [
  { sel: '#galClient', what: 'the client name' },
  { sel: '#galHint',   what: 'the screen\'s explanatory paragraph' },
  { sel: '.galempty',  what: 'the empty-state line' },
];

let pass = 0; const fails = [];
const ok  = (n, d) => { pass++; console.log(`  PASS  ${n}  — ${d}`); };
const bad = (n, d) => { fails.push(n + ': ' + d); console.log(`  FAIL  ${n}  — ${d}`); };

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
}).catch(() => chromium.launch());

async function measure(theme) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await page.route('**/*', r => {
    const u = r.request().url();
    if (u.startsWith('https://g66.test/'))
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
  await page.goto('https://g66.test/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(900);
  const names = await page.evaluate(`(window.__sentinelStates||[]).map(s=>s.name)`);
  const i = names.indexOf('album');
  if (i < 0) { await ctx.close(); return { err: 'no album state' }; }
  await page.evaluate(`Promise.resolve(window.__sentinelStates[${i}].run())`);
  await page.waitForTimeout(600);

  const res = await page.evaluate((targets) => {
    const num = c => (c.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
    const rel = rgb => {
      const [r, g, b] = rgb.map(v => v / 255);
      const f = c => c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    };
    const ratio = (a, b) => {
      const la = rel(a), lb = rel(b);
      return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
    };
    /* ⚠ The ground is the first ancestor that actually PAINTS one — a
       transparent parent is not the ground. This is the walk the project's own
       rig traps are about. */
    const groundOf = el => {
      for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
        const bg = getComputedStyle(n).backgroundColor;
        if (bg && bg !== 'rgba(0, 0, 0, 0)' && !/,\s*0\)$/.test(bg)) return bg;
      }
      return getComputedStyle(document.documentElement).backgroundColor;
    };
    const out = [];
    for (const t of targets) {
      const el = document.querySelector(t.sel);
      if (!el) { out.push({ ...t, missing: true }); continue; }
      const cs = getComputedStyle(el);
      const g = groundOf(el);
      out.push({ ...t, color: cs.color, ground: g,
                 ratio: Math.round(ratio(num(cs.color), num(g)) * 100) / 100 });
    }
    return out;
  }, TARGETS);
  await ctx.close();
  return { res };
}

console.log(`gate_1066 — ${FILE}\n`);
for (const theme of ['default', 'rb-light']) {
  const label = theme === 'default' ? 'dark ' : 'light';
  const { res, err } = await measure(theme);
  if (err) { bad(`${label} — album opens`, err); continue; }
  for (const r of res) {
    const name = `${label}  ${r.sel.padEnd(11)} ${r.what}`;
    if (r.missing) { bad(name, 'element not found — the gate cannot prove anything'); continue; }
    if (r.ratio >= FLOOR) ok(name, `${r.ratio}:1  (${r.color} on ${r.ground})`);
    else bad(name, `${r.ratio}:1 is under the ${FLOOR} floor  (${r.color} on ${r.ground})`);
  }
}

await browser.close();
console.log('');
if (fails.length) {
  console.log(`❌ FAIL — ${pass} passed, ${fails.length} failed`);
  fails.forEach(f => console.log('   ' + f));
  process.exit(1);
}
console.log(`✅ PASS — ${pass}/${pass}, both themes`);
process.exit(0);
