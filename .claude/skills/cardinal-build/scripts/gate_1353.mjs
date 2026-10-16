// gate_1353 — on a wide screen (1700px) the job page's right column keeps its order when a card grows.
// 1351's dense grid re-sorted it: Job Details grew (Trade Type chips) and Assigned To / History jumped above Location.
// node gate_1353.mjs [index.html]   (1352 = RED)
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
const ctx = await b.newContext({ viewport: { width: 1700, height: 1000 } });
const p = await ctx.newPage();
await p.route('**/*', r => r.request().url().startsWith('https://sentinel.test/') ? r.fulfill({ status: 200, contentType: 'text/html', body: APP }) : r.fulfill({ status: 200, body: '' }));
await p.addInitScript(SETUP); await p.goto('https://sentinel.test/', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(3000);
const r = await p.evaluate(async () => {
  const pause = ms => new Promise(r => setTimeout(r, ms));
  window.openProject('p1'); await pause(2200);
  const m = document.querySelector('#projectView #acxMount');
  const order = () => [...m.children].filter(e => e.offsetParent && getComputedStyle(e).gridColumnStart !== '1' && e.getBoundingClientRect().left > window.innerWidth / 2)
    .map(e => ({ k: e.getAttribute('data-cr-ord') || e.id || (e.className || '').toString().split(' ')[0], top: Math.round(e.getBoundingClientRect().top) }))
    .sort((a, b) => a.top - b.top).map(x => x.k);
  const before = order();
  /* make cards grow by different amounts — Job Details opening its Trade Type chips, the Payments card
     loading its rows — and require the right column's ORDER to hold at every size */
  const jd = m.querySelector(':scope > [data-cr-ord="jd"]');
  const stack = m.querySelector(':scope > .crji-stack') || m.querySelector('.crjp-card');
  const seen = [];
  for (const [a, s] of [[60, 0], [140, 0], [0, 300], [60, 600], [220, 900]]) {
    m.querySelectorAll('.g1353pad').forEach(x => x.remove());
    if (jd && a) { const d = document.createElement('div'); d.className = 'g1353pad'; d.style.height = a + 'px'; jd.appendChild(d); }
    if (stack && s) { const d = document.createElement('div'); d.className = 'g1353pad'; d.style.height = s + 'px'; stack.appendChild(d); }
    await pause(120);
    seen.push(order());
  }
  const after = seen.find(o => JSON.stringify(o) !== JSON.stringify(before)) || seen[seen.length - 1];
  return { before, after, jd: !!jd, flow: getComputedStyle(m).gridAutoFlow, display: getComputedStyle(m).display };
});
ok(r.jd, 'found Job Details');
ok(r.display === 'grid' && !/dense/.test(r.flow || ''), 'the wide-screen grid is not dense-packed (dense is what lets a later card jump ahead of an earlier one)', JSON.stringify({ display: r.display, flow: r.flow }));
ok(r.before.length >= 3, 'the right column has its cards', JSON.stringify(r.before));
ok(JSON.stringify(r.before) === JSON.stringify(r.after), 'a growing card does not reshuffle the right column', JSON.stringify({ before: r.before, after: r.after }));
await b.close();
console.log(fail ? 'GATE 1353 RED — ' + fail + ' failing' : 'GATE 1353 GREEN');
process.exit(fail ? 1 : 0);
