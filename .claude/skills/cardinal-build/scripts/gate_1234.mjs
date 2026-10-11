/* gate_1234.mjs — build 1234: the estimate builder and the Line Item Library take the
   Production header (1233), the builder laid out as Theo's pick "A" (tools on their own row).
   390px, BOTH themes:
     A. builder (new estimate): a 44x44 icon back with aria-label "Close"; the Georgia title on
        ONE line beside it; the estimate number under the title; Preview / Options / -> Contract
        on ONE row under that, each >= 44px and in sentence case; every header text clears 4.5:1.
     B. builder (saved estimate): Delete and Duplicate follow the tools, borderless (quiet).
     C. Line Item Library: back first, 44x44; Georgia title on one line; + Add the one action.
     D. the injected buttons' own uppercase/red id rules were deleted, not overridden.
   RED on 1233 rather than crash (BUG_CLASSES 37).
   usage:  node gate_1234.mjs [file.html]
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

const src = readFileSync(artifact, 'utf8');
ok(!/#cr-gbb-btn\{background/.test(src) && !/#cr-e2c-btn\{background/.test(src) && !/#cr-epub-preview-btn\{background/.test(src) && !/#cr-epub-btn\{background/.test(src),
   'D  the injected buttons carry no look of their own');

const CON = () => {
  const parse = c => { const m = String(c).match(/rgba?\(([^)]+)\)/); if (!m) return null; const v = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); return [v[0], v[1], v[2], v.length > 3 ? v[3] : 1]; };
  const lum = c => { const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }; return .2126 * f(c[0]) + .7152 * f(c[1]) + .0722 * f(c[2]); };
  const ground = el => { let e = el, st = []; while (e) { const c = parse(getComputedStyle(e).backgroundColor); if (c && c[3] > 0) st.push(c); if (c && c[3] >= .95) break; e = e.parentElement; }
    let g = [255,255,255]; for (let i = st.length - 1; i >= 0; i--) { const c = st[i]; g = [0,1,2].map(k => c[k]*c[3] + g[k]*(1-c[3])); } return g; };
  window.__ratio = el => { const i = parse(getComputedStyle(el).color), g = ground(el); const c = [0,1,2].map(k => i[k]*i[3] + g[k]*(1-i[3])); const a = lum(c), b = lum(g); return (Math.max(a,b)+.05)/(Math.min(a,b)+.05); };
};
const box = el => { const r = el.getBoundingClientRect(); return { t: Math.round(r.top), b: Math.round(r.bottom), l: Math.round(r.left), w: Math.round(r.width), h: Math.round(r.height) }; };

const BUILDER = () => {
  const head = document.querySelector('#cr-est-view .cr-est-head'); if (!head) return { none: true };
  const vis = e => e && e.getClientRects().length && getComputedStyle(e).display !== 'none';
  const B = e => { const r = e.getBoundingClientRect(); return { t: Math.round(r.top), b: Math.round(r.bottom), w: Math.round(r.width), h: Math.round(r.height), txt: (e.textContent || '').trim(), tt: getComputedStyle(e).textTransform, border: getComputedStyle(e).borderTopColor, ratio: +window.__ratio(e).toFixed(2) }; };
  const close = head.querySelector('[data-act="close"]'), h2 = head.querySelector('h2'), num = head.querySelector('.estnum');
  const tools = ['cr-epub-preview-btn', 'cr-gbb-btn', 'cr-e2c-btn'].map(id => document.getElementById(id)).filter(vis).map(B);
  const quiet = ['del', 'dup'].map(a => head.querySelector('[data-act="' + a + '"]')).filter(vis).map(B);
  return { close: close && Object.assign(B(close), { aria: close.getAttribute('aria-label'), svg: !!close.querySelector('svg') }),
    h2: Object.assign(B(h2), { font: getComputedStyle(h2).fontFamily }), num: vis(num) ? B(num) : null, tools, quiet };
};
for (const th of ['dark', 'rb-light']) {
  const p = await at('estbuilder', th); await p.evaluate(CON);
  const r = await p.evaluate(BUILDER).catch(e => ({ err: String(e) }));
  await p.close();
  const c = r.close || {}, h = r.h2 || {}, t = r.tools || [];
  ok(c.w === 44 && c.h === 44 && c.svg && c.aria === 'Close', 'A  ' + th + ' builder: back is a 44x44 icon labelled Close', JSON.stringify(c).slice(0, 120));
  /* 1287: dark retail app screens take the drawer's sans (Theo: option B); light followed at 1290. */
  ok(/Segoe UI/.test(h.font || '') && h.h < 40 && h.t >= c.t - 4 && h.b <= c.b + 4, 'A  ' + th + ' builder: Georgia title on one line beside the back', JSON.stringify(h).slice(0, 120));
  ok(r.num && r.num.t >= h.b - 6, 'A  ' + th + ' builder: the estimate number sits under the title', JSON.stringify(r.num));
  ok(t.length === 3 && t.every(x => x.t === t[0].t && x.t >= (r.num ? r.num.b : h.b) - 2 && x.h >= 44 && x.tt === 'none'), 'A  ' + th + ' builder: Preview / Options / Contract on one row under the title, 44px, sentence case', JSON.stringify(t.map(x => [x.txt, x.t, x.h, x.tt])));
  ok([c, h, ...t].every(x => x.ratio >= 4.5), 'A  ' + th + ' builder: every header text clears 4.5:1', [c, h, ...t].map(x => x.ratio).join(' '));
}
for (const th of ['dark', 'rb-light']) {
  const p = await at('estbuilder', th); await p.evaluate(CON);
  await p.evaluate(async () => { const E = window.CardinalEstimates; const pr = (window.cacheProjects || window.projects || [])[0] || { id: 'p1', name: 'Mark Diamond' }; try { E.close(); } catch (e) {} await E.openEditor(pr, { id: 'e1', project_id: pr.id, estimate_number: 'EST-1042', title: 'Estimate', status: 'draft', line_items: [], photos: [] }); }).catch(() => {});
  await p.waitForTimeout(1200);
  const r = await p.evaluate(BUILDER).catch(e => ({ err: String(e) }));
  await p.close();
  const t = r.tools || [], q = r.quiet || [];
  ok(q.length === 2 && t.length === 3 && q.every(x => x.t >= t[0].t && /rgba\(0, 0, 0, 0\)|transparent/.test(x.border) && x.ratio >= 4.5), 'B  ' + th + ' saved estimate: Delete and Duplicate follow the tools, borderless, readable', JSON.stringify(q.map(x => [x.txt, x.t, x.border, x.ratio])));
}
for (const th of ['dark', 'rb-light']) {
  const p = await at('lineitems', th); await p.evaluate(CON);
  const r = await p.evaluate(() => { const hd = document.querySelector('#cr-lil-view .cr-lil-head'); if (!hd) return { none: true };
    const kids = [...hd.children]; const cl = hd.querySelector('[data-act="close"]'), h2 = hd.querySelector('h2'), add = hd.querySelector('[data-act="add"]');
    const R = e => { const r = e.getBoundingClientRect(); return { l: Math.round(r.left), w: Math.round(r.width), h: Math.round(r.height), ratio: +window.__ratio(e).toFixed(2) }; };
    return { first: kids[0] === cl, nBtn: hd.querySelectorAll('button').length, cl: R(cl), h2: Object.assign(R(h2), { font: getComputedStyle(h2).fontFamily }), add: R(add) }; }).catch(e => ({ err: String(e) }));
  await p.close();
  ok(r.first && r.cl && r.cl.w === 44 && r.cl.h === 44, 'C  ' + th + ' Line Items: back first, 44x44', JSON.stringify(r).slice(0, 140));
  /* 1287: dark retail app screens take the drawer's sans (Theo: option B); light followed at 1290. */
  ok(r.h2 && /Segoe UI/.test(r.h2.font || '') && r.h2.h < 40 && r.nBtn === 2 && r.add.l > r.h2.l, 'C  ' + th + ' Line Items: Georgia title on one line, + Add the one action', JSON.stringify(r.h2) + ' buttons=' + r.nBtn);
  ok(r.cl.ratio >= 3 && r.h2.ratio >= 4.5, 'C  ' + th + ' Line Items: back and title clear their floors', r.cl.ratio + ' / ' + r.h2.ratio);
}
await browser.close();
console.log((fail ? 'GATE 1234 RED' : 'GATE 1234 GREEN') + ' — ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
