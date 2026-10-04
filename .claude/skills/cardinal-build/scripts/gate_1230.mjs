/* gate_1230.mjs — build 1230: polish round one, from the 4 Oct audit.

   Theo: "Follow the settings. Let's fix this stuff."
     A. MOON: the light/dark button never floats over content — on six screens
        at 390 it is either inside the header row or not shown at all.
     B. APPEARANCE: the menu drawer carries Dark / Light, each ≥44px; Light
        sets the app theme, Dark clears it, aria-pressed follows. On insurance
        the same row flips the insurance palette instead.
     C. CREAM BAND: with the PHONE in light mode and the app dark, the page root
        is not cream behind an app screen — and IS still cream while the
        landing is up (the rule kept its job).
     D. MONEY: a claim shows $18,922.10, not $18,922.1; whole dollars stay $1,000.
     E. INK: the labels this build darkened clear 4.5:1 in the theme they failed.
   ⚠ RED on 1229 rather than crash (BUG_CLASSES 37).
   usage:  node gate_1230.mjs [file.html]
*/
import { readFileSync, existsSync } from 'fs';
import { dirname, resolve } from 'path';
import { createRequire } from 'module';
const require_ = createRequire(import.meta.url);
const here = dirname(new URL(import.meta.url).pathname);
const artifact = resolve(process.argv[2] || resolve(here, '../../../../index.html'));
const PW_SANDBOX = '/opt/node22/lib/node_modules/playwright/index.js';
const { chromium } = require_(existsSync(PW_SANDBOX) ? PW_SANDBOX : 'playwright');
const { launchChromium } = require_(resolve(here, 'chromium_launch.cjs'));
let pass = 0, fail = 0;
const ok = (c, m, d = '') => { console.log((c ? '  PASS  ' : '  FAIL  ') + m + (d !== '' ? '  → ' + d : '')); c ? pass++ : fail++; };
setTimeout(() => { console.log('GATE TIMEOUT'); process.exit(3); }, 560000).unref();

const browser = await launchChromium(chromium);
async function at(state, theme = 'dark', vw = 390, colorScheme = 'light') {
  const p = await browser.newPage({ viewport: { width: vw, height: 844 }, colorScheme });
  await p.route('**/api/companycam-job', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, linked: false, photos: [] }) }));
  await p.addInitScript(t => { window.__sentinelTheme = t; }, theme);
  for (const f of ['sentinel_setup_cardinal.js', 'e2e_mock_supa.js']) await p.addInitScript(readFileSync(resolve(here, f), 'utf8'));
  await p.goto('file://' + artifact, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(2600);
  await p.evaluate(n => { const s = (window.__sentinelStates || []).find(s => s.name === n); return s && s.run(); }, state).catch(() => {});
  await p.waitForTimeout(1600);
  return p;
}
const lum = c => { const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }; return .2126 * f(c[0]) + .7152 * f(c[1]) + .0722 * f(c[2]); };
const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };

console.log('\n── A. the moon ─────────────────────────');
for (const st of ['home', 'client', 'production', 'why', 'crews', 'estimates']) {
  const p = await at(st);
  const m = await p.evaluate(() => {
    const b = document.getElementById('cr-dark-toggle'); if (!b) return { absent: true };
    const shown = b.getClientRects().length > 0 && getComputedStyle(b).display !== 'none';
    const row = document.getElementById('cr-hd2-srch');
    return { shown, inRow: !!(row && row.contains(b)), floating: shown && getComputedStyle(b).position === 'fixed' };
  }).catch(e => ({ err: String(e) }));
  ok(!m.err && !m.floating, st + ' — the light/dark button does not float over the page', JSON.stringify(m));
  await p.close();
}

console.log('\n── B. Appearance in the drawer ─────────');
{
  const p = await at('nav');
  const r = await p.evaluate(async () => {
    const bs = [...document.querySelectorAll('#navMenu [data-cr-appear]')];
    if (bs.length !== 2) return { n: bs.length };
    const h = bs.map(b => Math.round(Math.min(b.getBoundingClientRect().height, b.getBoundingClientRect().width)));
    const light = bs.find(b => b.dataset.crAppear === 'light'), dark = bs.find(b => b.dataset.crAppear === 'dark');
    light.click(); await new Promise(z => setTimeout(z, 200));
    const afterLight = { theme: document.documentElement.getAttribute('data-theme'), pressed: light.getAttribute('aria-pressed') };
    dark.click(); await new Promise(z => setTimeout(z, 200));
    const afterDark = { theme: document.documentElement.getAttribute('data-theme'), pressed: dark.getAttribute('aria-pressed') };
    return { n: bs.length, h, afterLight, afterDark };
  }).catch(e => ({ err: String(e) }));
  ok(r.n === 2 && r.h && Math.min(...r.h) >= 44, 'the drawer has Dark and Light, both ≥44px', JSON.stringify(r.h || r));
  ok(r.afterLight && r.afterLight.theme === 'rb-light' && r.afterLight.pressed === 'true', 'Light turns the app light and shows as chosen', JSON.stringify(r.afterLight));
  ok(r.afterDark && r.afterDark.theme === null && r.afterDark.pressed === 'true', 'Dark turns it back and shows as chosen', JSON.stringify(r.afterDark));
  await p.close();
}
{
  const p = await at('truth');
  const r = await p.evaluate(async () => {
    const b = [...document.querySelectorAll('[data-cr-appear]')]; if (!b.length) return { none: true };
    const before = document.documentElement.getAttribute('data-rltheme') || (window.CardinalInsTheme && window.CardinalInsTheme.get());
    const other = b.find(x => x.getAttribute('aria-pressed') !== 'true'); if (!other) return { noOther: true };
    other.click(); await new Promise(z => setTimeout(z, 300));
    const after = document.documentElement.getAttribute('data-rltheme') || (window.CardinalInsTheme && window.CardinalInsTheme.get());
    return { crm: document.body.dataset.crm, before, after, appTheme: document.documentElement.getAttribute('data-theme') };
  }).catch(e => ({ err: String(e) }));
  ok(r.crm === 'insurance' && r.before && r.after && r.before !== r.after, 'on Insurance the same row flips the insurance palette', JSON.stringify(r));
  await p.close();
}

console.log('\n── C. the cream band ───────────────────');
{
  const p = await at('leads', 'dark', 390, 'light');
  const r = await p.evaluate(() => ({ mode: document.documentElement.getAttribute('data-mode'), html: getComputedStyle(document.documentElement).backgroundColor, body: getComputedStyle(document.body).backgroundColor }));
  ok(r.mode === 'light' && r.html !== 'rgb(247, 245, 242)', 'phone light + app dark: the root behind Leads is not cream', JSON.stringify(r));
  const l = await p.evaluate(async () => { const v = document.getElementById('landingView'); v.style.display = 'block'; await new Promise(z => setTimeout(z, 100)); return getComputedStyle(document.documentElement).backgroundColor; });
  ok(l === 'rgb(247, 245, 242)', 'and while the landing is up the root is still its light ground', l);
  await p.close();
}

console.log('\n── D. money ────────────────────────────');
{
  const p = await at('claimdetail');
  const r = await p.evaluate(() => { const t = document.body.innerText; return { one: (t.match(/\$[\d,]+\.\d(?!\d)/g) || []).slice(0, 4), ten: /\$18,922\.10\b/.test(t), whole: /\$1,000(?![.\d])/.test(t) }; });
  ok(r.one.length === 0, 'no amount on the claim prints one decimal', JSON.stringify(r.one));
  ok(r.ten && r.whole, '$18,922.10 keeps its zero; $1,000 stays whole', JSON.stringify(r));
  await p.close();
}

console.log('\n── E. ink ──────────────────────────────');
const INK = JSON.parse(readFileSync(resolve(here, 'gate_1230_ink.json'), 'utf8'));
for (const t of INK) {
  const p = await at(t.state, t.theme);
  const r = await p.evaluate(sel => {
    const els = [...document.querySelectorAll(sel)].filter(e => e.getClientRects().length);
    if (!els.length) return { n: 0 };
    const parse = c => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const v = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); return [v[0], v[1], v[2], v.length > 3 ? v[3] : 1]; };
    const out = [];
    for (const el of els) {
      let e = el, stack = [];
      while (e) { const c = parse(getComputedStyle(e).backgroundColor); if (c && c[3] > 0) stack.push(c); if (c && c[3] >= .95) break; e = e.parentElement; }
      let g = parse(getComputedStyle(document.body).backgroundColor) || [255, 255, 255, 1];
      for (let i = stack.length - 1; i >= 0; i--) { const c = stack[i]; g = [0, 1, 2].map(k => c[k] * c[3] + g[k] * (1 - c[3])); }
      const ink = parse(getComputedStyle(el).color); const a = ink[3];
      out.push({ ink: [0, 1, 2].map(k => ink[k] * a + g[k] * (1 - a)), g });
    }
    return { n: els.length, out };
  }, t.sel).catch(e => ({ err: String(e) }));
  const worst = r.out ? Math.min(...r.out.map(o => ratio(o.ink, o.g))) : 0;
  ok(r.n > 0 && worst >= (t.floor || 4.5), t.state + ' (' + t.theme + ') — ' + t.what, r.n ? worst.toFixed(2) + ':1' : 'not found');
  await p.close();
}
await browser.close();
console.log('\n' + (fail ? 'GATE 1230 RED' : 'GATE 1230 GREEN') + ' — ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
