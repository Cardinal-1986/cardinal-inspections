#!/usr/bin/env node
/* gate_1305 — Buttons A on Claims, Pricing and Coach, measured in a real render.
     A  every main (.primary) button is solid Cardinal red #c8202e, in dark AND light
     B  every other button is an outline: no fill
     C  every button's label clears 4.5:1 against what it actually sits on
     D  red WORDS keep the readable --cr-red (pink #ff6b6b in dark) — the token is untouched
   Floors: at least 3 main and 6 other buttons seen, or the sweep proved nothing.
   Usage: node gate_1305.mjs [index.html] — control: the 1304 tree (A, B RED) */
import { createRequire } from 'module'; const require = createRequire(import.meta.url);
import { readFileSync } from 'fs'; import { dirname, join } from 'path'; import { fileURLToPath } from 'url';
let chromium; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright/index.js']) { try { chromium = require(p).chromium; break; } catch (e) {} }
const HERE = dirname(fileURLToPath(import.meta.url));
const APP = readFileSync(process.argv[2] || join(HERE, '../../../../index.html'), 'utf8');
const SETUP = readFileSync(join(HERE, 'sentinel_setup_cardinal.js'), 'utf8') + '\n;\n' + readFileSync(join(HERE, 'e2e_mock_supa.js'), 'utf8');
setTimeout(() => { console.log('GATE TIMEOUT'); process.exit(3); }, 240000).unref();
let pass = 0, fail = 0; const ok = (c, m, d = '') => { console.log((c ? '  PASS  ' : '  FAIL  ') + m + (d ? '  → ' + d : '')); c ? pass++ : fail++; };
const SEL = '.cr-p-tool-btn,.cr-p-modal-btn,.cr-c-btn,.cr-c-h-btn,.cr-c-modal-btn,.cr-k-btn,.cr-k-modal-btn';
const SCREENS = [['claims', 'hideAllViews(); window.crOpenClaims();', '#cr-claims-mount'],
                 ['pricing', 'hideAllViews(); window.crOpenPricing();', '#cr-pricing-mount'],
                 ['coach', 'hideAllViews(); window.CardinalCoach.open();', '#cr-coach-mount']];
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const all = { dark: [], light: [] }, red = {};
for (const light of [false, true]) {
  const th = light ? 'light' : 'dark';
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } }); const p = await ctx.newPage();
  await p.route('**/*', r => r.request().url().startsWith('https://sentinel.test/') ? r.fulfill({ status: 200, contentType: 'text/html', body: APP }) : r.fulfill({ status: 200, body: '' }));
  if (light) await p.addInitScript(() => { try { localStorage.setItem('cardinal.theme.rb', '1'); } catch (e) {} });
  await p.addInitScript(SETUP); await p.goto('https://sentinel.test/?as=theo', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(3200);
  for (const [k, js, mount] of SCREENS) {
    await p.evaluate(js).catch(() => {}); await p.waitForTimeout(1400);
    const got = await p.evaluate(([SEL, mount]) => {
      const P = c => { const m = String(c).match(/rgba?\(([^)]+)\)/); if (!m) return null; const v = m[1].split(',').map(x => parseFloat(x)); return { r: v[0], g: v[1], b: v[2], a: v.length > 3 ? v[3] : 1 }; };
      const L = c => { const f = x => { x /= 255; return x <= .03928 ? x / 12.92 : Math.pow((x + .055) / 1.055, 2.4); }; return .2126 * f(c.r) + .7152 * f(c.g) + .0722 * f(c.b); };
      const over = (t, b) => ({ r: t.r * t.a + b.r * (1 - t.a), g: t.g * t.a + b.g * (1 - t.a), b: t.b * t.a + b.b * (1 - t.a), a: 1 });
      const ground = el => { const st = []; for (let e = el; e; e = e.parentElement) { const c = P(getComputedStyle(e).backgroundColor); if (c && c.a > 0) { st.push(c); if (c.a >= 1) break; } } let g = { r: 255, g: 255, b: 255, a: 1 }; for (let i = st.length - 1; i >= 0; i--) g = over(st[i], g); return g; };
      const M = document.querySelector(mount); if (!M) return { none: true };
      const vis = e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden'; };
      const btns = [...M.querySelectorAll(SEL)].filter(vis).map(b => {
        const cs = getComputedStyle(b), bg = P(cs.backgroundColor), fg = P(cs.color), gr = ground(b);
        const a = L(over(fg, gr)), c = L(gr); const cr = (Math.max(a, c) + .05) / (Math.min(a, c) + .05);
        return { t: (b.textContent || '').trim().slice(0, 18), primary: b.classList.contains('primary'), bg: cs.backgroundColor, alpha: bg ? bg.a : 1, cr: Math.round(cr * 100) / 100 };
      });
      return { btns, red: getComputedStyle(M).getPropertyValue('--cr-red').trim() };
    }, [SEL, mount]).catch(e => ({ err: String(e) }));
    (got.btns || []).forEach(b => all[th].push(Object.assign({ screen: k }, b)));
    red[th + ':' + k] = got.red;
  }
  await ctx.close();
}
await browser.close();
for (const th of ['dark', 'light']) {
  const pri = all[th].filter(b => b.primary), oth = all[th].filter(b => !b.primary);
  ok(pri.length >= 3 && oth.length >= 6, `${th}: the sweep saw enough buttons (${pri.length} main, ${oth.length} other)`);
  const badP = pri.filter(b => b.bg !== 'rgb(200, 32, 46)');
  ok(pri.length && !badP.length, `A  ${th}: every main button is solid #c8202e`, badP.length ? JSON.stringify(badP.slice(0, 3)) : '');
  const badO = oth.filter(b => b.alpha > 0);
  ok(oth.length && !badO.length, `B  ${th}: every other button is an outline (no fill)`, badO.length ? JSON.stringify(badO.slice(0, 3)) : '');
  const lowC = all[th].filter(b => b.cr < 4.5);
  ok(all[th].length && !lowC.length, `C  ${th}: every button label clears 4.5:1`, lowC.length ? JSON.stringify(lowC.slice(0, 3)) : 'min ' + Math.min(...all[th].map(b => b.cr)));
}
ok(red['dark:claims'] === '#ff6b6b' && red['light:claims'] === '#D9282A', 'D  red words keep --cr-red (dark #ff6b6b, light #D9282A)', JSON.stringify(red));
console.log(`GATE 1305 ${fail ? 'RED' : 'GREEN'} — ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
