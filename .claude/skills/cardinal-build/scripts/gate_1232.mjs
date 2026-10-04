/* gate_1232.mjs — build 1232: dark pieces gone from light pages.

   From the 4 Oct design audit. Two screens, both themes:
     A. Claim Financials: in light the card's ground is light (lum > .75) and every
        text in it clears its floor; in dark it is still the dark slab.
     B. WAIVED is a class, not an inline style (no theme rule can reach an inline colour).
     C. Crew Dispatch in light: no crew tag, trade strip or job magnet casts a shadow
        darker than alpha .2; in dark the original heavy shadows are still there.
   Not in scope, on purpose: the Leads call/text/email buttons are grey raised boxes
   with white glyphs because Theo asked for exactly that (cr-nvl-styles), and the
   header + colour is the header chrome's own per-section accent (--hac).
   RED on 1231 rather than crash (BUG_CLASSES 37).
   usage:  node gate_1232.mjs [file.html]
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
  const scope = root;
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


const src = readFileSync(artifact, 'utf8');
ok(!/<small style="[^"]*#7cd18d[^"]*">WAIVED/.test(src) && /class="cr-c-waived">WAIVED/.test(src), 'B  WAIVED carries a class, not an inline colour');

for (const th of ['rb-light', 'dark']) {
  const p = await at('claimdetail', th);
  const r = await p.evaluate(PROBE, '#cr-claims-mount .cr-c-fin').catch(e => ({ err: String(e) }));
  await p.close();
  if (th === 'rb-light') {
    ok(r.rootLum > .75, 'A  light: Financials ground is light', JSON.stringify(r).slice(0, 160));
    ok(r.nBad === 0, 'A  light: every Financials text clears its floor', (r.bad || []).join(' | '));
  } else ok(r.rootLum < .08, 'A  dark: Financials is still the dark slab', r.rootLum);
}

const SH = () => {
  const out = [];
  for (const el of document.querySelectorAll('#cr-disp .crewc > div, #cr-disp .dband .bl, #cr-disp .job, #cr-disp .drail')) {
    if (!el.getClientRects().length) continue;
    const a = [...getComputedStyle(el).boxShadow.matchAll(/rgba?\(([^)]+)\)/g)].map(m => m[1].split(/[ ,\/]+/).filter(Boolean).map(Number))
      .filter(v => v[0] < 60 && v[1] < 60 && v[2] < 60).map(v => v.length > 3 ? v[3] : 1);
    out.push(a.length ? Math.max(...a) : 0);
  }
  return out;
};
for (const th of ['rb-light', 'dark']) {
  const p = await at('dispatch', th);
  const a = await p.evaluate(SH).catch(() => []);
  await p.close();
  if (th === 'rb-light') ok(a.length >= 6 && Math.max(...a) <= .2, 'C  light: Dispatch cards cast only a soft shadow', a.length + ' els, max alpha ' + Math.max(0, ...a));
  else ok(a.length >= 6 && Math.max(...a) >= .5, 'C  dark: the heavy shadows are still there', a.length + ' els, max alpha ' + Math.max(0, ...a));
}
await browser.close();
console.log((fail ? 'GATE 1232 RED' : 'GATE 1232 GREEN') + ' — ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
