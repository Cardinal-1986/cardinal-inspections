// gate_1373 — five clutter fixes on the phone (Theo: "all 5").
// 1 no visible 0 count on the Job Menu; a real count still shows
// 2 phone: the header Work Orders button is not shown on an open job; wide screen: it still is
// 3 phone: the Roof Pre-Install Guide row sits BELOW the Job Menu
// 4 phone: Ask is a round button (<= 56px wide, label hidden, accessible name kept); wide screen: the word shows
// 5 Home: no "--" in the pipeline money or Accounts Receivable; $0 instead
// node gate_1373.mjs [index.html]   (1372 = RED)
import { createRequire } from 'module'; const require = createRequire(import.meta.url);
import { readFileSync } from 'fs';
const here = new URL('.', import.meta.url).pathname;
const chromium = require('playwright').chromium;
const { launchChromium } = require(here + 'chromium_launch.cjs');
const APP = readFileSync(process.argv[2] || here + '../../../../index.html', 'utf8');
const SETUP = readFileSync(here + 'sentinel_setup_cardinal.js', 'utf8') + '\n;\n' + readFileSync(here + 'e2e_mock_supa.js', 'utf8');
let fail = 0;
const ok = (c, m, d) => { console.log((c ? '  PASS  ' : '  FAIL  ') + m + (d !== undefined ? '  → ' + d : '')); if (!c) fail++; };
const b = await launchChromium(chromium);
async function open(w, h) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: w < 700, hasTouch: true });
  const p = await ctx.newPage(); p.on('dialog', d => d.dismiss().catch(() => {}));
  await p.route('**/*', r => r.request().url().startsWith('https://sentinel.test/') ? r.fulfill({ status: 200, contentType: 'text/html', body: APP }) : r.fulfill({ status: 200, body: '' }));
  await p.addInitScript(SETUP);
  await p.goto('https://sentinel.test/', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(2600);
  return { ctx, p };
}
const vis = `(e => { if (!e) return false; const r = e.getBoundingClientRect(), c = getComputedStyle(e); return r.width > 0 && r.height > 0 && c.visibility !== 'hidden' && c.display !== 'none'; })`;
{
  const { ctx, p } = await open(390, 844);
  await p.evaluate(() => { try { CardinalHeader.goHome(); } catch (e) {} }); await p.waitForTimeout(900);
  const home = await p.evaluate(() => ({ pm: [...document.querySelectorAll('#pipeRow .pmoney')].map(e => e.textContent.trim()), ar: ((document.querySelector('#arWrap .arbig') || {}).firstChild || {}).textContent }));
  ok(home.pm.length && !home.pm.some(t => t === '--') && home.ar && home.ar.trim() !== '--', '5: Home shows no "--" for nothing', JSON.stringify(home));
  ok(home.pm.includes('$0') && /^\$0/.test((home.ar || '').trim()), '5: it shows $0', JSON.stringify(home));
  await p.evaluate(() => openProject(cacheProjects[0].id)); await p.waitForTimeout(1800);
  const r = await p.evaluate(v => { const V = (0, eval)(v);
    const zeros = [...document.querySelectorAll('#acxMount .jabox .jan.zero')], nz = [...document.querySelectorAll('#acxMount .jabox .jan:not(.zero)')].filter(e => /\d/.test(e.textContent));
    const g = document.querySelector('#acxMount > .db-guiderow'), m = document.querySelector('#acxMount > .ja-menu'), f = document.getElementById('cr-ai-fab'), lbl = f && f.querySelector('.cr-ai-lbl');
    return { zeros: zeros.length, zerosShown: zeros.filter(V).length, nzShown: nz.filter(V).length, nz: nz.length,
      wo: V(document.getElementById('woQuick')), guideBelow: g && m ? g.getBoundingClientRect().top > m.getBoundingClientRect().top : null,
      fabW: f ? Math.round(f.getBoundingClientRect().width) : null, fabOn: !!(f && V(f)), lblShown: lbl ? V(lbl) : 'no-span', name: f && f.getAttribute('aria-label') }; }, vis);
  ok(r.zeros > 0 && r.zerosShown === 0, '1: no 0 count is visible on the Job Menu', JSON.stringify(r));
  ok(r.nz === 0 || r.nzShown === r.nz, '1: a real count still shows', JSON.stringify({ nz: r.nz, shown: r.nzShown }));
  ok(r.wo === false, '2: phone: the header Work Orders button is gone', r.wo);
  ok(r.guideBelow === true, '3: phone: the guide row is below the Job Menu', r.guideBelow);
  ok(!r.fabOn || (r.fabW <= 56 && r.lblShown === false && r.name === 'Ask the assistant'), '4: phone: Ask is a round star with its accessible name', JSON.stringify({ w: r.fabW, on: r.fabOn, lbl: r.lblShown, name: r.name }));
  await ctx.close();
}
{
  const { ctx, p } = await open(1280, 900);
  await p.evaluate(() => openProject(cacheProjects[0].id)); await p.waitForTimeout(1800);
  const r = await p.evaluate(v => { const V = (0, eval)(v); const f = document.getElementById('cr-ai-fab'), lbl = f && f.querySelector('.cr-ai-lbl');
    return { wo: V(document.getElementById('woQuick')), fabOn: !!(f && V(f)), fabW: f ? Math.round(f.getBoundingClientRect().width) : null, lbl: lbl ? V(lbl) : 'no-span' }; }, vis);
  ok(r.wo === true, '2: wide screen: the header Work Orders button stays', r.wo);
  ok(!r.fabOn || (r.fabW > 60 && r.lbl === true), '4: wide screen: the Ask pill keeps its word', JSON.stringify(r));
  await ctx.close();
}
await b.close();
console.log(fail ? 'GATE 1373 RED — ' + fail + ' failing' : 'GATE 1373 GREEN');
process.exit(fail ? 1 : 0);
