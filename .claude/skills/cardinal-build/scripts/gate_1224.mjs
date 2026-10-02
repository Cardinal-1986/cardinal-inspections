/* gate_1224.mjs — build 1224: no Job Menu label breaks a word in half.

   Theo, from the phone: the tiles read "Communi / cation", "Notificatio / ns",
   "Measurem / ents", "Appointm / ents", "Inspection / s". 1203 replaced an
   ellipsis with wrapping, and a label given 69px of a 153px tile can only wrap
   a 103px word by splitting it. 1224 gives the label its own full-width row.

   THE CHECK: for every visible .jabox label, each WORD is measured with a DOM
   Range; a word whose client rects sit on more than one line was split. A label
   whose content is wider than its box is also a failure (overflow instead of a
   split is not a fix). Swept at 360 / 390 / 430 x Normal / Larger(1.15) /
   Largest(1.3) x dark / light.

   ⚠ Written to go RED on 1223 rather than crash (BUG_CLASSES 37), and it
   carries a coverage floor: fewer than 14 labels found is itself a failure.
   usage:  node gate_1224.mjs [file.html]
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
for (const theme of ['dark', 'rb-light']) for (const width of [360, 390, 430]) for (const size of ['md', 'lg', 'xl']) {
  const at = (theme === 'dark' ? 'dark' : 'light') + ' @' + width + ' ' + size;
  const p = await browser.newPage({ viewport: { width, height: 900 } });
  await p.addInitScript(([t, z]) => { window.__sentinelTheme = t;
    try { if (z !== 'md') localStorage.setItem('cr-textsize', z); else localStorage.removeItem('cr-textsize'); } catch (e) {} }, [theme, size]);
  for (const f of ['sentinel_setup_cardinal.js', 'e2e_mock_supa.js']) await p.addInitScript(readFileSync(resolve(here, f), 'utf8'));
  await p.goto('file://' + artifact, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(2600);
  await p.evaluate(() => { const s = (window.__sentinelStates || []).find(s => s.name === 'client'); return s && s.run(); }).catch(() => {});
  await p.waitForTimeout(1400);
  const r = await p.evaluate(() => {
    const labs = [...document.querySelectorAll('#projectView .jabox .jbl')].filter(e => e.getClientRects().length);
    const split = [], over = [];
    for (const l of labs) {
      const tn = [...l.childNodes].find(n => n.nodeType === 3); if (!tn) continue;
      const txt = tn.textContent; const re = /\S+/g; let m;
      while ((m = re.exec(txt))) {
        const rg = document.createRange(); rg.setStart(tn, m.index); rg.setEnd(tn, m.index + m[0].length);
        const tops = new Set([...rg.getClientRects()].filter(x => x.width > 0.5).map(x => Math.round(x.top)));
        if (tops.size > 1) split.push(m[0]);
      }
      if (l.scrollWidth > l.clientWidth + 1) over.push(txt.trim());
    }
    return { n: labs.length, split, over };
  }).catch(e => ({ err: String(e) }));
  if (r.err) { ok(false, at + ' — probe ran', r.err); await p.close(); continue; }
  ok(r.n >= 14, at + ' — the Job Menu rendered (coverage floor 14)', r.n + ' labels');
  ok(r.split.length === 0, at + ' — no label splits a word', r.split.length ? r.split.join(', ') : 'none');
  ok(r.over.length === 0, at + ' — no label overflows its tile', r.over.length ? r.over.join(', ') : 'none');
  await p.close();
}
await browser.close();
console.log('\n' + (fail ? 'GATE 1224 RED' : 'GATE 1224 GREEN') + ' — ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
