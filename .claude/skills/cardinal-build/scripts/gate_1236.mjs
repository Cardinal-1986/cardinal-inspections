/* gate_1236.mjs — build 1236: Why Cardinal and Colors take the one header (1233), and both say
   Cardinal is an Owens Corning Roofing Preferred Contractor — in WORDS, never a mark
   (OC_BRAND_RULES: the lockup needs official artwork; gate_1160 still forbids an <img>).
   390px, BOTH themes:
     A. Why: a 44x44 drawn back labelled Close; Georgia title on one line with its red half;
        the eyebrow in uppercase monospace under the top row; the Preferred badge reads as
        text and clears 4.5:1.
     B. Colors: a 44x44 drawn back labelled Back; Georgia title; the badge shows on the lines
        list, and is HIDDEN one level down (a line) and two down (a colour).
     C. Source: the badge claims Preferred, never Platinum, and carries no image.
   RED on 1235 rather than crash (BUG_CLASSES 37).
   usage:  node gate_1236.mjs [file.html]
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
const CLAIM = 'Owens Corning\u2122 Roofing Preferred Contractor';
const badges = src.match(/class="(why|occ)-pref"[^]{0,200}?<\/(div|em)>/g) || [];
ok(badges.length === 2, 'C  both Preferred badges are in the source', badges.length);
ok(badges.every(b => b.includes(CLAIM) && !/platinum/i.test(b) && !/<img|<svg|url\(/i.test(b)), 'C  the badges claim Preferred, in words, with no image');

for (const th of ['dark', 'rb-light']) {
  const p = await at('why', th); await p.evaluate(CON);
  const r = await p.evaluate(() => { const v = document.getElementById('cr-why'); if (!v) return { none: true };
    const x = v.querySelector('.why-x'), h = v.querySelector('.why-h'), eb = v.querySelector('.why-eyebrow'), pf = v.querySelector('.why-pref');
    if (!x || !h || !pf) return { none: true, x: !!x, h: !!h, pf: !!pf };
    const xr = x.getBoundingClientRect(), hr = h.getBoundingClientRect(), er = eb ? eb.getBoundingClientRect() : null;
    return { xw: Math.round(xr.width), xh: Math.round(xr.height), svg: !!x.querySelector('svg'), aria: x.getAttribute('aria-label'),
      font: getComputedStyle(h).fontFamily, hh: Math.round(hr.height), fs: parseFloat(getComputedStyle(h).fontSize), span: !!h.querySelector('span'),
      rH: +window.__ratio(h).toFixed(2), rS: h.querySelector('span') ? +window.__ratio(h.querySelector('span')).toFixed(2) : 0,
      ebBelow: er ? er.top >= Math.min(xr.bottom, hr.bottom) - 2 : false, ebTT: eb ? getComputedStyle(eb).textTransform : '', ebFont: eb ? getComputedStyle(eb).fontFamily : '',
      pfTxt: pf.textContent, pfVis: pf.getClientRects().length > 0, rP: +window.__ratio(pf).toFixed(2) }; }).catch(e => ({ err: String(e) }));
  await p.close();
  ok(r.xw === 44 && r.xh === 44 && r.svg && r.aria === 'Close', 'A  ' + th + ' Why: back is a 44x44 drawn icon labelled Close', JSON.stringify(r).slice(0, 140));
  ok(/Georgia/.test(r.font || '') && r.fs >= 26 && r.hh < 48 && r.span && r.rH >= 4.5 && r.rS >= 3, 'A  ' + th + ' Why: Georgia title, one line, red half readable', JSON.stringify([r.fs, r.hh, r.rH, r.rS]));
  ok(r.ebBelow && r.ebTT === 'uppercase' && /mono|Menlo|SF Mono/i.test(r.ebFont), 'A  ' + th + ' Why: the eyebrow sits under the top row in monospace capitals', JSON.stringify([r.ebBelow, r.ebTT]));
  ok(r.pfVis && (r.pfTxt || '').includes(CLAIM) && r.rP >= 4.5, 'A  ' + th + ' Why: the Preferred badge shows and clears 4.5:1', JSON.stringify([r.pfVis, r.rP]));
}

for (const th of ['dark', 'rb-light']) {
  const p = await at('colors', th); await p.evaluate(CON);
  const hub = await p.evaluate(() => { const v = document.getElementById('cr-occ'); if (!v) return { none: true };
    const b = v.querySelector('#occBack'), t = v.querySelector('#occTitle'), pf = v.querySelector('.occ-pref');
    if (!b || !t || !pf) return { none: true, b: !!b, pf: !!pf };
    const br = b.getBoundingClientRect();
    return { bw: Math.round(br.width), bh: Math.round(br.height), svg: !!b.querySelector('svg'), aria: b.getAttribute('aria-label'),
      font: getComputedStyle(t).fontFamily, fs: parseFloat(getComputedStyle(t).fontSize), rT: +window.__ratio(t).toFixed(2),
      pfVis: pf.getClientRects().length > 0, pfTxt: pf.textContent, rP: +window.__ratio(pf).toFixed(2),
      lines: v.querySelectorAll('.occ-line[data-line]').length }; }).catch(e => ({ err: String(e) }));
  ok(hub.bw === 44 && hub.bh === 44 && hub.svg && hub.aria === 'Back', 'B  ' + th + ' Colors: back is a 44x44 drawn icon labelled Back', JSON.stringify(hub).slice(0, 140));
  ok(/Georgia/.test(hub.font || '') && hub.fs >= 26 && hub.rT >= 4.5, 'B  ' + th + ' Colors: Georgia title, readable', JSON.stringify([hub.fs, hub.rT]));
  ok(hub.pfVis && (hub.pfTxt || '').includes(CLAIM) && hub.rP >= 4.5, 'B  ' + th + ' Colors: the Preferred badge shows on the lines list and clears 4.5:1', JSON.stringify([hub.pfVis, hub.rP]));
  const lv = await p.evaluate(async () => { const v = document.getElementById('cr-occ'); const L = v && v.querySelector('.occ-line[data-line]'); if (!L) return { none: true };
    L.click(); await new Promise(r => setTimeout(r, 900));
    const line = { cls: v.className, vis: v.querySelector('.occ-pref').getClientRects().length > 0 };
    const c = v.querySelector('.occ-card[data-slug]'); let det = null;
    /* the mock carries no colour cards inside a line, so when there is none to tap the view is
       put in its detail state directly — that is the class showColor() sets, and the CSS rule
       keyed on it is what this check is about. Says which path it took. */
    if (c) c.click(); else v.classList.add('detail');
    await new Promise(r => setTimeout(r, 900));
    det = { via: c ? 'tap' : 'class', cls: v.className, vis: v.querySelector('.occ-pref').getClientRects().length > 0 };
    return { line, det }; }).catch(e => ({ err: String(e) }));
  await p.close();
  ok(lv.line && /\bline\b/.test(lv.line.cls) && lv.line.vis === false, 'B  ' + th + ' Colors: the badge is hidden inside a line', JSON.stringify(lv).slice(0, 140));
  ok(lv.det && /\bdetail\b/.test(lv.det.cls) && lv.det.vis === false, 'B  ' + th + ' Colors: the badge is hidden on a colour', JSON.stringify(lv.det));
}
await browser.close();
console.log((fail ? 'GATE 1236 RED' : 'GATE 1236 GREEN') + ' — ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
