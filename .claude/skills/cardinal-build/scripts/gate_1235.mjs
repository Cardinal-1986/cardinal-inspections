/* gate_1235.mjs — build 1235: the top-level pages take the Production header (1233).
   Leads & Jobs and Photo Activity are reached from the nav strip, so they get NO back button:
   the title on the left in Georgia on one line with its red second half, the count line as the
   monospace eyebrow under it. Insurance Clients keeps its back, now the 44px square.
   390px, BOTH themes:
     A. Leads / Photo Activity: Georgia title, one line, left-aligned with the search box; the
        eyebrow under it in uppercase monospace; no button in the header row; title, red half
        and eyebrow clear their floors.
     B. Insurance Clients: a 44x44 icon back labelled Back; Georgia title on one line; red half.
     C. the older, fully-overridden .ljtitle rule was deleted.
   RED on 1234 rather than crash (BUG_CLASSES 37).
   usage:  node gate_1235.mjs [file.html]
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

const CON = () => {
  const parse = c => { const m = String(c).match(/rgba?\(([^)]+)\)/); if (!m) return null; const v = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); return [v[0], v[1], v[2], v.length > 3 ? v[3] : 1]; };
  const lum = c => { const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }; return .2126 * f(c[0]) + .7152 * f(c[1]) + .0722 * f(c[2]); };
  const ground = el => { let e = el, st = []; while (e) { const c = parse(getComputedStyle(e).backgroundColor); if (c && c[3] > 0) st.push(c); if (c && c[3] >= .95) break; e = e.parentElement; }
    let g = [255,255,255]; for (let i = st.length - 1; i >= 0; i--) { const c = st[i]; g = [0,1,2].map(k => c[k]*c[3] + g[k]*(1-c[3])); } return g; };
  window.__ratio = el => { const i = parse(getComputedStyle(el).color), g = ground(el); const c = [0,1,2].map(k => i[k]*i[3] + g[k]*(1-i[3])); const a = lum(c), b = lum(g); return (Math.max(a,b)+.05)/(Math.min(a,b)+.05); };
};

const src = readFileSync(artifact, 'utf8');
ok(!src.includes(".ljtitle{\n  text-align:center;\n  font:800 23px Georgia"), 'C  the dead .ljtitle rule is gone');
const LJ = (view) => {
  const v = document.getElementById(view); if (!v) return { none: true };
  const h = v.querySelector('.ljhead'), t = v.querySelector('.ljtitle'), sub = v.querySelector('.ljsub'), srch = v.querySelector('input[type=search]');
  if (!t) return { none: true };
  const R = e => e.getBoundingClientRect(); const tr = R(t), cs = getComputedStyle(t), span = t.querySelector('span');
  return { font: cs.fontFamily, align: cs.textAlign, th: Math.round(tr.height), tl: Math.round(tr.left), sl: srch ? Math.round(R(srch).left) : null,
    btns: h ? h.querySelectorAll('button').length : -1, subTop: sub ? Math.round(R(sub).top) : -1, tBottom: Math.round(tr.bottom),
    subTT: sub ? getComputedStyle(sub).textTransform : '', subFont: sub ? getComputedStyle(sub).fontFamily : '',
    rT: +window.__ratio(t).toFixed(2), rS: span ? +window.__ratio(span).toFixed(2) : 0, rSub: sub ? +window.__ratio(sub).toFixed(2) : 0 };
};
for (const [st, view] of [['leads', 'leadsView'], ['photoactivity', 'photoView']]) for (const th of ['dark', 'rb-light']) {
  const p = await at(st, th); await p.evaluate(CON);
  let r = await p.evaluate(LJ, view).catch(e => ({ err: String(e) }));
  if (r.none) r = await p.evaluate(() => { const t = [...document.querySelectorAll('.ljtitle')].find(e => e.getClientRects().length); return t ? t.closest('[id]').id : 'none'; }).then(id => p.evaluate(LJ, id));
  await p.close();
  ok(/Georgia/.test(r.font || '') && r.th < 40 && r.align !== 'center' && r.sl != null && Math.abs(r.tl - r.sl) <= 2, 'A  ' + th + ' ' + st + ': Georgia title, one line, left with the search box', JSON.stringify([r.font && r.font.slice(0, 8), r.th, r.align, r.tl, r.sl]));
  ok(r.btns === 0, 'A  ' + th + ' ' + st + ': no back button on a top-level page', r.btns);
  ok(r.subTop >= r.tBottom - 2 && r.subTT === 'uppercase' && /mono|Menlo|SF Mono/i.test(r.subFont), 'A  ' + th + ' ' + st + ': the count line is the eyebrow under the title', JSON.stringify([r.subTop, r.tBottom, r.subTT]));
  ok(r.rT >= 3 && r.rS >= 3 && r.rSub >= 4.5, 'A  ' + th + ' ' + st + ': title, red half and eyebrow clear their floors', [r.rT, r.rS, r.rSub].join(' / '));
}
for (const th of ['dark', 'rb-light']) {
  const p = await at('insclients', th); await p.evaluate(CON);
  const r = await p.evaluate(() => { const b = document.querySelector('#cr-ic-bar'); if (!b) return { none: true };
    const n = b.querySelector('button.nav'), h = b.querySelector('h2'); const nr = n.getBoundingClientRect(), hr = h.getBoundingClientRect();
    return { nw: Math.round(nr.width), nh: Math.round(nr.height), aria: n.getAttribute('aria-label'), svg: !!n.querySelector('svg'),
      font: getComputedStyle(h).fontFamily, hh: Math.round(hr.height), span: !!h.querySelector('span'), rT: +window.__ratio(h).toFixed(2), rB: +window.__ratio(n).toFixed(2) }; }).catch(e => ({ err: String(e) }));
  await p.close();
  ok(r.nw === 44 && r.nh === 44 && r.svg && r.aria === 'Back', 'B  ' + th + ' Insurance Clients: back is a 44x44 icon labelled Back', JSON.stringify(r).slice(0, 120));
  ok(/Georgia/.test(r.font || '') && r.hh < 40 && r.span && r.rT >= 3 && r.rB >= 3, 'B  ' + th + ' Insurance Clients: Georgia title on one line with its red half, readable', JSON.stringify([r.hh, r.span, r.rT, r.rB]));
}
await browser.close();
console.log((fail ? 'GATE 1235 RED' : 'GATE 1235 GREEN') + ' — ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
