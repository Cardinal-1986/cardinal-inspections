/* gate_1222.mjs — build 1222, pass 1 of ONE button system (design programme
   item 2; Theo's pick B, "Outline back"). A REAL Chromium render, both themes.

     PRIMARY  red, 12px:   the editor's Save, the album's Take photo, Estimates' + New
     OUTLINE  12px:        the editor's Print/PDF, the album's Back and Add photos,
                           the Pre-Install Guide's Email to client
     CHIP     pill:        the Photo Album's section tabs; selected = red

   For every outline/chip it also scores the INK against the ground it actually
   composites over (worst gradient stop wins), because the outline's whole risk
   is light text on a light ground or dark on dark.

   ⚠ Written to go RED on 1221 rather than crash (BUG_CLASSES 37).
   usage:  node gate_1222.mjs [file.html]
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
setTimeout(() => { console.log('GATE TIMEOUT'); process.exit(3); }, 400000).unref();

const P = s => { const m = /(-?[\d.]+)[,\s]+(-?[\d.]+)[,\s]+(-?[\d.]+)(?:[,\s/]+([\d.]+))?/.exec(s || ''); return m ? [+m[1], +m[2], +m[3], m[4] === undefined ? 1 : +m[4]] : null; };
const lum = ([r, g, b]) => { const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }; return .2126 * f(r) + .7152 * f(g) + .0722 * f(b); };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + .05) / (y + .05); };
const RED = [200, 32, 46];
const same = (a, b) => a && b && a.slice(0, 3).every((v, i) => Math.abs(v - b[i]) <= 2);

const TARGETS = [
  { state: 'doceditor', kind: 'primary', label: "the editor's Save", text: 'Save' },
  { state: 'doceditor', kind: 'outline', label: "the editor's Print / PDF", text: 'Print' },
  { state: 'album', kind: 'outline', label: "the album's Back to client profile", css: '#galBackBtn' },
  { state: 'album', kind: 'outline', label: "the album's + Add from phone", css: '#galAddBtn' },
  { state: 'album', kind: 'primary', label: "the album's Take photos", css: '#galCamBtn' },
  /* 1229: the six section chips became one dropdown + Select (Theo, 4 Oct) */
  { state: 'album', kind: 'outline', label: "the album's All photos dropdown", css: '#cr-pae-tabs .pae-dd' },
  { state: 'album', kind: 'outline', label: "the album's Select", css: '#cr-pae-tabs .pae-sel' },
  { state: 'estimates', kind: 'primary', label: "Estimates' + New estimate", css: '.cr-btn.primary' },
  { state: 'client', kind: 'outline', label: "the Pre-Install Guide's Email to client", text: 'Email to client' },
];

const browser = await launchChromium(chromium);
for (const theme of ['dark', 'rb-light']) {
  const tag = theme === 'dark' ? 'dark' : 'light';
  console.log('\n── ' + tag + ' @390 ' + '─'.repeat(44));
  const p = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await p.addInitScript(t => { window.__sentinelTheme = t; }, theme);
  for (const f of ['sentinel_setup_cardinal.js', 'e2e_mock_supa.js']) await p.addInitScript(readFileSync(resolve(here, f), 'utf8'));
  await p.goto('file://' + artifact, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(2600);
  const names = await p.evaluate(() => (window.__sentinelStates || []).map(s => s.name));
  let cur = null;
  for (const t of TARGETS) {
    if (t.state !== cur) {
      await p.evaluate(`Promise.resolve(window.__sentinelStates[${names.indexOf(t.state)}].run())`).catch(() => {});
      await p.waitForTimeout(800); cur = t.state;
    }
    const r = await p.evaluate(t => {
      let els = t.css ? [...document.querySelectorAll(t.css)]
        : [...document.querySelectorAll('button,a,[role=button]')].filter(e => (e.textContent || '').trim().replace(/^\W+/, '').startsWith(t.text));
      els = els.filter(e => e.getClientRects().length && e.getBoundingClientRect().width > 8);
      if (!els.length) return null;
      const e = els[0], c = getComputedStyle(e);
      const grounds = [];
      for (let x = e.parentElement; x; x = x.parentElement) {
        const cs = getComputedStyle(x);
        (cs.backgroundImage.match(/rgba?\([^)]*\)/g) || []).forEach(s => grounds.push(s));
        grounds.push(cs.backgroundColor);
        const m = /rgba?\(([^)]*)\)/.exec(cs.backgroundColor); const a = m ? (m[1].split(',')[3] === undefined ? 1 : +m[1].split(',')[3]) : 0;
        if (a > 0.95) break;
      }
      return { bg: c.backgroundColor, rad: c.borderTopLeftRadius, ink: c.color, bd: c.borderTopWidth + ' ' + c.borderTopStyle, h: Math.round(e.getBoundingClientRect().height), grounds };
    }, t).catch(e => ({ err: String(e) }));
    const at = tag + ' — ' + t.label;
    if (!r || r.err) { ok(false, at + ' renders', r ? r.err : 'not found'); continue; }
    const bg = P(r.bg), ink = P(r.ink);
    if (t.kind === 'primary') {
      ok(same(bg, RED) && r.rad === '12px', at + ' is the red primary at 12px', r.bg + ' · ' + r.rad);
    } else if (t.kind === 'outline' || t.kind === 'chip') {
      const want = t.kind === 'chip' ? '999px' : '12px';
      ok(bg && bg[3] < 0.05 && /solid/.test(r.bd) && r.rad === want, at + ' is ' + (t.kind === 'chip' ? 'a pill chip' : 'an outline at 12px'), r.bg + ' · ' + r.bd + ' · ' + r.rad);
      const gs = r.grounds.map(P).filter(g => g && g[3] > 0.05);
      const worst = gs.length ? Math.min(...gs.map(g => ratio(ink, g))) : 0;
      ok(worst >= 4.5, at + ' reads at ≥4.5:1 on its ground', worst.toFixed(2) + ':1');
    } else if (t.kind === 'chipon') {
      ok(same(bg, RED) && r.rad === '999px', at + ' is red and pill-shaped', r.bg + ' · ' + r.rad);
    }
    if (t.kind !== 'chip' && t.kind !== 'chipon') ok(r.h >= 44, at + ' clears the 44px tap floor', r.h + 'px');
  }
  await p.close();
}
const src = readFileSync(artifact, 'utf8');
console.log('\n── source ' + '─'.repeat(40));
ok(!src.includes('.toolbar .btn.dark{background:#555;}'), "the editor's grey-slab rule is deleted at source, not out-specified");
ok(!src.includes('--cr-red: #D9282A'), 'Estimates no longer carries a second red');
await browser.close();
console.log('\n' + (fail ? 'GATE 1222 RED' : 'GATE 1222 GREEN') + ' — ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
