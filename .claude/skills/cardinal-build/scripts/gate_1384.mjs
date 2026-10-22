/* gate_1384 — one card, one button, one heading (consistency pass, Option A).
 * On Home, Jobs, the client page, Schedule and Invoices & Payments, at 390px, dark AND light:
 *   1 every card (painted, >=250x48, corners 8–20px) has 12px corners
 *   2 every card with ordinary padding (8–20px) has 14px padding
 *   3 every button with rounded corners (4–20px) has 10px corners — except the two sanctioned designs:
 *     the obsidian Activity tiles (.actbox) and the pipeline segments (.pipebtn)
 *   4 card titles (.pipetitle) and the header title are weight 800
 * Tabs (square) and pills (fully round) are outside the rule and are not measured.
 * Arg: [index.html] -> negative control (1383 must go RED). */
import { createRequire } from 'module'; const require = createRequire(import.meta.url);
import { readFileSync } from 'fs';
const here = new URL('.', import.meta.url).pathname;
const chromium = require('playwright').chromium;
const { launchChromium } = require(here + 'chromium_launch.cjs');
const APP = readFileSync(process.argv[2] || here + '../../../../index.html', 'utf8');
const SETUP = readFileSync(here + 'sentinel_setup_cardinal.js', 'utf8') + '\n;\n' + readFileSync(here + 'e2e_mock_supa.js', 'utf8');
let fail = 0, pass = 0;
const ok = (c, m, d) => { console.log((c ? '  PASS  ' : '  FAIL  ') + m + (d !== undefined ? '  → ' + d : '')); c ? pass++ : fail++; };
const SCREENS = [['Home', `try{CardinalHeader.goHome()}catch(e){}`], ['Jobs', `openLeadsView()`], ['Client page', `openProject(cacheProjects[0].id)`],
  ['Schedule', `openScheduleBoard()`], ['Invoices', `openAR()`]];
const b = await launchChromium(chromium);
for (const theme of ['dark', 'light']) for (const [sn, go] of SCREENS) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const p = await ctx.newPage(); p.on('dialog', d => d.dismiss().catch(() => {}));
  await p.route('**/*', r => r.request().url().startsWith('https://sentinel.test/') ? r.fulfill({ status: 200, contentType: 'text/html', body: APP }) : r.fulfill({ status: 200, body: '' }));
  if (theme === 'light') await p.addInitScript('window.__sentinelTheme = "rb-light";');
  await p.addInitScript(SETUP);
  await p.goto('https://sentinel.test/', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(2600);
  await p.evaluate(go => { try { (0, eval)(go); } catch (e) {} }, go);
  await p.waitForTimeout(1800);
  const r = await p.evaluate(() => {
    const vis = e => { const r = e.getBoundingClientRect(); const c = getComputedStyle(e); return r.width > 0 && r.height > 0 && c.display !== 'none' && c.visibility !== 'hidden' && r.top < 6000; };
    const name = e => e.tagName.toLowerCase() + (e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\s+/).join('.') : '');
    const out = { cards: 0, badCard: [], badPad: [], btns: 0, badBtn: [], titles: [] };
    for (const e of [...document.querySelectorAll('body *')].filter(vis)) {
      const c = getComputedStyle(e), r = e.getBoundingClientRect();
      const painted = c.backgroundColor !== 'rgba(0, 0, 0, 0)' || c.backgroundImage !== 'none';
      const rad = parseFloat(c.borderTopLeftRadius), pt = parseFloat(c.paddingTop), pl = parseFloat(c.paddingLeft);
      if (painted && r.width >= 250 && r.height >= 48 && e.tagName !== 'BUTTON' && rad >= 8 && rad <= 20) {
        out.cards++; if (rad !== 12) out.badCard.push(name(e) + ' ' + rad);
        if (pt >= 8 && pt <= 20 && pl >= 8 && pl <= 20 && (pt !== 14 || pl !== 14)) out.badPad.push(name(e) + ' ' + pt + '/' + pl);
      }
      if ((e.tagName === 'BUTTON' || e.getAttribute('role') === 'button') && r.width > 30 && rad >= 4 && rad <= 20 && !e.matches('.actbox, .pipebtn')) {
        out.btns++; if (rad !== 10) out.badBtn.push(name(e) + ' ' + rad);
      }
      if (e.matches('#mainView .pipetitle, #brandTitle h1')) out.titles.push(name(e) + ' ' + c.fontWeight);
    }
    return out;
  });
  const tag = sn + ' (' + theme + ')';
  ok(r.cards > 0 && !r.badCard.length, tag + ': every card has 12px corners', r.cards + ' cards' + (r.badCard.length ? ' · off: ' + [...new Set(r.badCard)].slice(0, 4).join(', ') : ''));
  ok(!r.badPad.length, tag + ': every card has 14px padding', r.badPad.length ? [...new Set(r.badPad)].slice(0, 4).join(', ') : 'ok');
  ok(r.btns > 0 && !r.badBtn.length, tag + ': every rounded button has 10px corners', r.btns + ' buttons' + (r.badBtn.length ? ' · off: ' + [...new Set(r.badBtn)].slice(0, 4).join(', ') : ''));
  const t = r.titles.filter(x => !/ 800$/.test(x));
  ok(!t.length, tag + ': card titles and the header title are weight 800', t.length ? [...new Set(t)].join(', ') : r.titles.length + ' titles');
  await ctx.close();
}
await b.close();
console.log(fail ? `GATE 1384 RED — ${pass} passed, ${fail} failed` : `GATE 1384 GREEN — ${pass} passed`);
process.exit(fail ? 1 : 0);
