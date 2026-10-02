/* gate_1226.mjs — build 1226: Lead is lemon in Leads & Jobs and Recent Leads.

   Theo, 2 Oct, after 1220 shipped: "The lead color didn't change?" 1220 changed
   STAGE_COLORS and the pipeline strip; the Leads & Jobs list keeps its OWN maps
   (LJ_SPINE / LJ_SOLID) and still painted Lead grey (#8a93a1) with a near-white
   spine (#dbe7f7). Real Chromium render, both themes, phone width:
     - a Lead card's pill/letter ground is #FFE600 and its letter clears 4.5:1
     - a Lead card's spine is #FFE600
     - Recent Leads (home) Lead row: the stripe var is lemon, and the stage
       label clears 4.5:1 against what it sits on
   ⚠ Written to go RED on 1225 rather than crash (BUG_CLASSES 37).
   usage:  node gate_1226.mjs [file.html]
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
const LEMON = [255, 230, 0];
const same = (a, b) => a && b && a.slice(0, 3).every((v, i) => Math.abs(v - b[i]) <= 2);
const browser = await launchChromium(chromium);
for (const theme of ['dark', 'rb-light']) {
  const tag = theme === 'dark' ? 'dark' : 'light';
  console.log('\n── ' + tag + ' @390 ' + '─'.repeat(40));
  const p = await browser.newPage({ viewport: { width: 390, height: 900 } });
  await p.addInitScript(t => { window.__sentinelTheme = t; }, theme);
  for (const f of ['sentinel_setup_cardinal.js', 'e2e_mock_supa.js']) await p.addInitScript(readFileSync(resolve(here, f), 'utf8'));
  await p.goto('file://' + artifact, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(2600);
  /* home first: Recent Leads */
  await p.evaluate(() => { try { window.renderKpHomeRow && window.renderKpHomeRow(); } catch (e) {} });
  await p.waitForTimeout(500);
  const home = await p.evaluate(() => {
    const rows = [...document.querySelectorAll('.kplrow')].filter(r => r.getClientRects().length && /^\s*Lead\s*$/.test((r.querySelector('.stc') || {}).textContent || ''));
    if (!rows.length) return { n: 0 };
    const r = rows[0], st = r.querySelector('.stc'), cs = getComputedStyle(st);
    const grounds = []; for (let x = st; x; x = x.parentElement) { const c = getComputedStyle(x); (c.backgroundImage.match(/rgba?\([^)]*\)/g) || []).forEach(g => grounds.push(g)); grounds.push(c.backgroundColor); const m = /rgba?\(([^)]*)\)/.exec(c.backgroundColor); if (m && (m[1].split(',')[3] === undefined || +m[1].split(',')[3] > .95)) break; }
    return { n: rows.length, sc: r.style.getPropertyValue('--sc').trim(), ink: cs.color, grounds };
  }).catch(e => ({ err: String(e) }));
  if (home.err || !home.n) ok(false, tag + ' — Recent Leads shows a Lead row', home.err || 'none found');
  else {
    ok(/#ffe600/i.test(home.sc), tag + ' — the Recent Leads stripe for Lead is lemon', home.sc);
    const ink = P(home.ink), gs = home.grounds.map(P).filter(g => g && g[3] > .05);
    const w = gs.length ? Math.min(...gs.map(g => ratio(ink, g))) : 0;
    ok(w >= 4.5, tag + ' — its "Lead" label reads at ≥4.5:1', home.ink + ' · ' + w.toFixed(2) + ':1');
  }
  /* Leads & Jobs */
  await p.evaluate(() => { try { openLeadsView(); } catch (e) {} });
  await p.waitForTimeout(1500);
  const lj = await p.evaluate(() => {
    const cards = [...document.querySelectorAll('#leadsView .ljcard[title="Lead"]')].filter(c => c.getClientRects().length);
    if (!cards.length) return { n: 0 };
    const c = cards[0], mc = c.querySelector('.ljmc'), cs = mc ? getComputedStyle(mc) : null;
    return { n: cards.length, spn: c.style.getPropertyValue('--spn').trim(), slc: c.style.getPropertyValue('--slc').trim(),
      mcBg: cs && cs.backgroundColor, mcInk: cs && cs.color };
  }).catch(e => ({ err: String(e) }));
  if (lj.err || !lj.n) { ok(false, tag + ' — Leads & Jobs shows a Lead card', lj.err || 'none found'); await p.close(); continue; }
  ok(/#ffe600/i.test(lj.spn) && /#ffe600/i.test(lj.slc), tag + ' — a Lead card carries lemon for its spine and badge', 'spine ' + lj.spn + ' · badge ' + lj.slc);
  const bg = P(lj.mcBg), ink = P(lj.mcInk);
  ok(same(bg, LEMON), tag + ' — the Lead letter circle paints lemon', lj.mcBg);
  ok(bg && ink && ratio(ink, bg) >= 4.5, tag + ' — its letter reads at ≥4.5:1', lj.mcInk + ' · ' + (bg && ink ? ratio(ink, bg).toFixed(2) : '?') + ':1');
  await p.close();
}
await browser.close();
console.log('\n' + (fail ? 'GATE 1226 RED' : 'GATE 1226 GREEN') + ' — ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
