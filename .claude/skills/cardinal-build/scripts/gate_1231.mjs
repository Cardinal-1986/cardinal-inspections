/* gate_1231.mjs — build 1231: light mode reaches every screen.

   Theo, 4 Oct: "Follow the settings" (Why Cardinal, The Appointment), then "1" —
   the Labor Rate Schedule follows it too, replacing the 28 Aug "dark mode only".
   Six screens, each rendered in BOTH themes:
     A. In light the screen's own ground is light; in dark it is still dark.
     B. In light, every visible text on it clears its floor (4.5:1, 3:1 at 24px+
        or 18.66px bold), scored against the ground it sits on.
     C. The builder's Preview / Options / -> Contract read dark red in light
        (each has its own #id rule; a class rule alone lost to them).
     D. No light-era cream (#fdfcf7) is left on the Line Item Library.
   ⚠ RED on 1230 rather than crash (BUG_CLASSES 37).
   usage:  node gate_1231.mjs [file.html]
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

const SCREENS = [
  { st: 'storm', root: '#cr-storm' },
  { st: 'lrs', root: '#cr-lrs-view' },
  { st: 'why', root: '#cr-why' },
  { st: 'appt', root: '#cr-appt' },
  { st: 'estbuilder', root: '#cr-est-view .cr-est-head' },
  { st: 'lineitems', root: '#cr-lil-view .cr-lil-head' },
];
const browser = await launchChromium(chromium);
async function at(state, theme) {
  const p = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await p.addInitScript(t => { window.__sentinelTheme = t; }, theme);
  for (const f of ['sentinel_setup_cardinal.js', 'e2e_mock_supa.js']) await p.addInitScript(readFileSync(resolve(here, f), 'utf8'));
  await p.goto('file://' + artifact, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(2600);
  await p.evaluate(n => { const s = (window.__sentinelStates || []).find(s => s.name === n); return s && s.run(); }, state).catch(() => {});
  await p.waitForTimeout(1500);
  return p;
}
const PROBE = sel => {
  const parse = c => { const m = String(c).match(/rgba?\(([^)]+)\)/); if (!m) return null; const v = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); return [v[0], v[1], v[2], v.length > 3 ? v[3] : 1]; };
  const lum = c => { const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }; return .2126 * f(c[0]) + .7152 * f(c[1]) + .0722 * f(c[2]); };
  const ground = el => { let e = el, stack = []; while (e) { const c = parse(getComputedStyle(e).backgroundColor); if (c && c[3] > 0) stack.push(c); if (c && c[3] >= .95) break; e = e.parentElement; }
    let g = parse(getComputedStyle(document.body).backgroundColor) || [255, 255, 255, 1];
    for (let i = stack.length - 1; i >= 0; i--) { const c = stack[i]; g = [0, 1, 2].map(k => c[k] * c[3] + g[k] * (1 - c[3])); } return g; };
  const root = document.querySelector(sel);
  if (!root || !root.getClientRects().length) return { none: true };
  const rootLum = lum(ground(root));
  const bad = [];
  const scope = root.closest('#cr-est-view, #cr-lil-view') || root;
  for (const el of scope.querySelectorAll('*')) {
    if (!el.getClientRects().length) continue;
    const r = el.getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight) continue;
    const own = [...el.childNodes].filter(n => n.nodeType === 3 && n.textContent.trim().length > 1);
    if (!own.length) continue;
    if (el.closest('.ap-light, .wf-ph, img')) continue;
    const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || +cs.opacity === 0) continue;
    const ink = parse(cs.color); const g = ground(el); const a = ink[3];
    const c = [0, 1, 2].map(k => ink[k] * a + g[k] * (1 - a));
    const L1 = lum(c), L2 = lum(g), ratio = (Math.max(L1, L2) + .05) / (Math.min(L1, L2) + .05);
    const fs = parseFloat(cs.fontSize), floor = (fs >= 24 || (fs >= 18.66 && +cs.fontWeight >= 700)) ? 3 : 4.5;
    if (ratio < floor - .01) bad.push(own[0].textContent.trim().slice(0, 24) + ' ' + ratio.toFixed(2));
  }
  return { rootLum: +rootLum.toFixed(3), bad: bad.slice(0, 5), nBad: bad.length };
};

for (const sc of SCREENS) {
  const pl = await at(sc.st, 'rb-light');
  const l = await pl.evaluate(PROBE, sc.root).catch(e => ({ err: String(e) }));
  await pl.close();
  const pd = await at(sc.st, 'dark');
  const d = await pd.evaluate(PROBE, sc.root).catch(e => ({ err: String(e) }));
  await pd.close();
  ok(!l.none && !l.err && l.rootLum > .75, sc.st + ' — A: light mode paints it light', JSON.stringify({ light: l.rootLum }));
  ok(!d.none && !d.err && d.rootLum < .08, sc.st + ' — A: dark mode still paints it dark', JSON.stringify({ dark: d.rootLum }));
  ok(!l.none && !l.err && l.nBad === 0, sc.st + ' — B: every text clears its floor in light', l.nBad ? l.bad.join(' · ') : 'all pass');
}

{
  const p = await at('estbuilder', 'rb-light');
  const r = await p.evaluate(() => ['cr-epub-preview-btn', 'cr-gbb-btn', 'cr-e2c-btn'].map(id => { const e = document.getElementById(id); return e ? getComputedStyle(e).color : 'none'; }));
  /* 1234 superseded "dark red": Theo's pick A put these three in the header's own ink, as plain
     outline buttons. What 1231 guarded still holds: in light they are NOT the dark-mode pink. */
  ok(r.every(c => c !== 'none' && c !== 'rgb(240, 138, 144)'), 'C: Preview / Options / Contract are not left in the dark-mode pink in light', r.join(' | '));
  await p.close();
}
{
  const p = await at('lineitems', 'rb-light');
  const r = await p.evaluate(() => [...document.querySelectorAll('#cr-lil-view, #cr-lil-view *')].filter(e => e.getClientRects().length).filter(e => { const cs = getComputedStyle(e); return /253, 252, 247|240, 232, 208/.test(cs.backgroundColor + cs.borderBottomColor); }).length);
  ok(r === 0, 'D: no light-era cream left on the Line Item Library', r + ' element(s)');
  await p.close();
}
await browser.close();
console.log('\n' + (fail ? 'GATE 1231 RED' : 'GATE 1231 GREEN') + ' — ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
