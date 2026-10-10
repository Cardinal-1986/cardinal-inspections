/* gate_1233.mjs — build 1233: one module header (Theo's pick "1", the Production header).
   Invoices & AR and the Labor Rate Schedule adopt the shared .cr-mhd (cr-mhd-styles).
   For each, in BOTH themes at 390px:
     A. the back control is a 44x44 square (not a pill), the title is Georgia on ONE line,
        and the title and back clear their contrast floors on the screen's own ground.
     B. AR has at most one action on the right; its title no longer wraps (was three lines).
     C. Labor Rates on a crew's sheet: back + title fill row one and every visible sheet
        button sits on row two, together (none beside the title).
     D. the modules' own back/title rules were deleted, not overridden.
   RED on 1232 rather than crash (BUG_CLASSES 37).
   usage:  node gate_1233.mjs [file.html]
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
ok(src.includes('<style id="cr-mhd-styles">'), 'D  the shared header stylesheet exists');
ok(!/#cr-ar-view \.crar-close\{/.test(src) && !/#cr-ar-view \.crar-ttl\{/.test(src) && !/#cr-ar-view \.crar-refresh\{/.test(src), 'D  AR\'s own back/title/refresh rules are gone');

const HP = (sel) => {
  const parse = c => { const m = String(c).match(/rgba?\(([^)]+)\)/); if (!m) return null; const v = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); return [v[0], v[1], v[2], v.length > 3 ? v[3] : 1]; };
  const lum = c => { const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }; return .2126 * f(c[0]) + .7152 * f(c[1]) + .0722 * f(c[2]); };
  const ground = el => { let e = el, st = []; while (e) { const c = parse(getComputedStyle(e).backgroundColor); if (c && c[3] > 0) st.push(c); if (c && c[3] >= .95) break; e = e.parentElement; }
    let g = parse(getComputedStyle(document.body).backgroundColor) || [255,255,255,1]; for (let i = st.length - 1; i >= 0; i--) { const c = st[i]; g = [0,1,2].map(k => c[k]*c[3] + g[k]*(1-c[3])); } return g; };
  const ratio = el => { const cs = getComputedStyle(el); const i = parse(cs.color), g = ground(el); const c = [0,1,2].map(k => i[k]*i[3] + g[k]*(1-i[3])); const a = lum(c), b = lum(g); return (Math.max(a,b)+.05)/(Math.min(a,b)+.05); };
  const bar = document.querySelector(sel); if (!bar || !bar.getClientRects().length) return { none: true };
  const back = bar.querySelector('.cr-mhd-back'), t = bar.querySelector('.cr-mhd-t');
  if (!back || !t) return { none: true, html: bar.outerHTML.slice(0, 200) };
  const br = back.getBoundingClientRect(), tr = t.getBoundingClientRect();
  const acts = [...bar.querySelectorAll('button')].filter(b => b !== back && b.getClientRects().length && getComputedStyle(b).display !== 'none');
  return { bw: Math.round(br.width), bh: Math.round(br.height), font: getComputedStyle(t).fontFamily, th: Math.round(tr.height), tTop: Math.round(tr.top), tBottom: Math.round(tr.bottom),
    rT: +ratio(t).toFixed(2), rB: +ratio(back).toFixed(2), nAct: acts.length, actTops: acts.map(a => Math.round(a.getBoundingClientRect().top)) };
};
for (const th of ['dark', 'rb-light']) {
  const p = await at('ar', th); const r = await p.evaluate(HP, '#cr-ar-view .crar-top').catch(e => ({ err: String(e) })); await p.close();
  ok(!r.none && r.bw === 44 && r.bh === 44, 'A  ' + th + ' AR: back is a 44x44 square', JSON.stringify(r).slice(0, 140));
  /* 1287: dark retail took Georgia off every title on Theo's pick (drawer style, option B); light keeps it.
     The contract that matters is ONE line — the face is asserted per theme. */
  ok((th === 'dark' ? /Segoe UI/.test(r.font || '') : /Georgia/.test(r.font || '')) && r.th < 40, 'A  ' + th + ' AR: title on one line (' + (th === 'dark' ? 'drawer sans' : 'Georgia') + ')', (r.font || '').slice(0, 20) + ' h=' + r.th);
  ok(r.rT >= 3 && r.rB >= 3, 'A  ' + th + ' AR: title and back clear their floors', r.rT + ' / ' + r.rB);
  ok(r.nAct <= 1, 'B  ' + th + ' AR: at most one action on the right', r.nAct);
}
for (const th of ['dark', 'rb-light']) {
  const p = await at('lrs', th); const r = await p.evaluate(HP, '#cr-lrs-view .lrs-topbar').catch(e => ({ err: String(e) }));
  ok(!r.none && r.bw === 44 && r.bh === 44, 'A  ' + th + ' Labor Rates: back is a 44x44 square', JSON.stringify(r).slice(0, 140));
  /* 1287: dark retail took Georgia off every title on Theo's pick (drawer style, option B); light keeps it.
     The contract that matters is ONE line — the face is asserted per theme. */
  ok((th === 'dark' ? /Segoe UI/.test(r.font || '') : /Georgia/.test(r.font || '')) && r.th < 40, 'A  ' + th + ' Labor Rates: title on one line (' + (th === 'dark' ? 'drawer sans' : 'Georgia') + ')', (r.font || '').slice(0, 20) + ' h=' + r.th);
  ok(r.rT >= 3 && r.rB >= 3, 'A  ' + th + ' Labor Rates: title and back clear their floors', r.rT + ' / ' + r.rB);
  await p.evaluate(() => { const c = document.querySelector('#cr-lrs-view .lrs-crew, #cr-lrs-view [data-crew]'); if (c) c.click(); }).catch(() => {});
  await p.waitForTimeout(900);
  const s = await p.evaluate(HP, '#cr-lrs-view .lrs-topbar').catch(e => ({ err: String(e) })); await p.close();
  ok(s.nAct >= 2 && s.actTops.every(t => t >= s.tBottom - 2), 'C  ' + th + ' Labor Rates sheet: every button on row two, none beside the title', 'title bottom ' + s.tBottom + ', buttons at ' + (s.actTops || []).join(','));
}
await browser.close();
console.log((fail ? 'GATE 1233 RED' : 'GATE 1233 GREEN') + ' — ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
