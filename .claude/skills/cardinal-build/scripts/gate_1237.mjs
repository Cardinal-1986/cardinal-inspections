/* gate_1237.mjs — build 1237: what you type in the header search can be read in light mode.
   Theo's screenshot (desktop, light): the search row under the header is painted --bnbg, the
   nav-strip colour, which is DARK in both themes; the typed text used --hin, the header's ink,
   which goes dark in rb-light — #2B3D4F on #101620, 1.63:1.
   1600px, both themes, all three strip colours (retail / insurance / community):
     A. the typed text in #headSearch clears 4.5:1 on the row's own ground.
     B. source: the ink is no longer tied to --hin, and the placeholder stays #8d8781
        (4.76:1 or better on every strip).
   RED on 1236 rather than crash (BUG_CLASSES 37).
   usage:  node gate_1237.mjs [file.html]
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
  const p = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  await p.addInitScript(t => { window.__sentinelTheme = t; }, theme);
  for (const f of ['sentinel_setup_cardinal.js', 'e2e_mock_supa.js']) await p.addInitScript(readFileSync(resolve(here, f), 'utf8'));
  await p.goto('file://' + artifact, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(2600);
  await p.evaluate(n => { const s = (window.__sentinelStates || []).find(s => s.name === n); return s && s.run(); }, state).catch(() => {});
  await p.waitForTimeout(1500);
  return p;
}

const CON = () => {
  const parse = c => { const m = String(c).match(/rgba?\(([^)]+)\)/); if (!m) return null; const v = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); return [v[0], v[1], v[2], v.length > 3 ? v[3] : 1]; };
  const lum = c => { const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }; return .2126 * f(c[0]) + .7152 * f(c[1]) + .0722 * f(c[2]); };
  const ground = el => { let e = el, st = []; while (e) { const c = parse(getComputedStyle(e).backgroundColor); if (c && c[3] > 0) st.push(c); if (c && c[3] >= .95) break; e = e.parentElement; }
    let g = [255,255,255]; for (let i = st.length - 1; i >= 0; i--) { const c = st[i]; g = [0,1,2].map(k => c[k]*c[3] + g[k]*(1-c[3])); } return g; };
  window.__ratio = el => { const i = parse(getComputedStyle(el).color), g = ground(el); const c = [0,1,2].map(k => i[k]*i[3] + g[k]*(1-i[3])); const a = lum(c), b = lum(g); return (Math.max(a,b)+.05)/(Math.min(a,b)+.05); };
};



const src = readFileSync(artifact, 'utf8');
const rule = (src.match(/#cr-hd2-srch #headSearch\{display:block !important;[^}]*\}/) || [''])[0];
ok(rule && !/var\(--hin/.test(rule) && /color:#fff;/.test(rule), 'B  the search row ink is pinned light, not the header ink', rule.slice(0, 60));
ok(src.includes('#cr-hd2-srch #headSearch::placeholder{color:#8d8781}'), 'B  the placeholder is unchanged (#8d8781)');

for (const th of ['dark', 'rb-light']) {
  const p = await at('home', th); await p.evaluate(CON);
  for (const head of ['retail', 'insurance', 'community']) {
    const r = await p.evaluate(h => {
      document.body.classList.add('cr-srch-open'); document.body.setAttribute('data-crm-head', h);
      const i = document.getElementById('headSearch'), row = document.getElementById('cr-hd2-srch');
      if (!i || !row || !row.contains(i)) return { none: true, row: !!row, i: !!i };
      i.value = 'fdsfsdffgdf';
      return { vis: i.getClientRects().length > 0, ink: getComputedStyle(i).color, bg: getComputedStyle(row).backgroundColor, r: +window.__ratio(i).toFixed(2) };
    }, head).catch(e => ({ err: String(e) }));
    ok(r.vis && r.r >= 4.5, 'A  ' + th + ' ' + head + ': typed search text clears 4.5:1 on the row', JSON.stringify(r));
  }
  await p.close();
}
await browser.close();
console.log((fail ? 'GATE 1237 RED' : 'GATE 1237 GREEN') + ' — ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
