/* gate_1223.mjs — build 1223, pass 2 of the ONE button system, plus Theo's
   "2" (2 Oct): Insurance's palette red (--ct-red, #C4180F docket / #CE0E18
   siren) becomes the app's one red, #C8202E.

     PRIMARY  red, 12px:  the estimate builder's Publish, + From Library and
                          + Assembly; Line Items' + Add; the photo editor's Save;
                          Crews' + New crew; Punch Outs' + New
     INSURANCE:           the selected filter chip on Insurance Clients, and the
                          header + in the Insurance CRM, are #C8202E with white ink

   ⚠ Written to go RED on 1222 rather than crash (BUG_CLASSES 37).
   usage:  node gate_1223.mjs [file.html]
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
  { state: 'estbuilder', kind: 'primary', label: "the estimate builder's Publish", css: '#cr-est-view .cr-est-phonebar button.primary' },
  { state: 'estbuilder', kind: 'primary', label: "the estimate builder's + From Library", css: '#cr-est-view .cr-est-items-head .add-lib:not(.ai-assist)' },
  { state: 'estbuilder', kind: 'primary', label: "the estimate builder's + Assembly", css: '#cr-est-view .cr-est-items-head .add-assembly' },
  { state: 'lineitems', kind: 'primary', label: "Line Items' + Add", css: '.cr-lil-head button.primary' },
  { state: 'photoeditor', kind: 'primary', label: "the photo editor's Save", css: '.cr-ped-head button.primary' },
  { state: 'crews', kind: 'primary', label: "Crews' + New crew", css: '#crewsView .crw-btn.primary' },
  { state: 'punch', kind: 'primary', label: "Punch Outs' + New", css: '#puNewBtn' },
  { state: 'insclients', kind: 'insred', label: "Insurance Clients' selected chip", css: '.cr-ic-chips button.on' },
  { state: 'insclients', kind: 'insred', label: "the Insurance header +", css: '#addProjectBtn' },
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
      ok(r.h >= 44, at + ' clears the 44px tap floor', r.h + 'px');
    } else if (t.kind === 'insred') {
      ok(same(bg, RED), at + ' is the one red #C8202E', r.bg);
      const ink = P(r.ink), w = bg ? ratio(ink, bg) : 0;
      ok(w >= 4.5, at + ' ink reads at ≥4.5:1 on it', w.toFixed(2) + ':1');
    }
  }
  await p.close();
}
const src = readFileSync(artifact, 'utf8');
console.log('\n── source ' + '─'.repeat(40));
ok(!/--ct-red:#(C4180F|CE0E18)/i.test(src), "Insurance's palette no longer declares its own red, in either theme");
ok(!/var\(--ct-(red|mark),#C4180F\)/.test(src), 'no --ct-red / --ct-mark fallback still names the old red');
await browser.close();
console.log('\n' + (fail ? 'GATE 1223 RED' : 'GATE 1223 GREEN') + ' — ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
