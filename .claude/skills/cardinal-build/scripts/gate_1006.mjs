/* gate_1006.mjs — stage arrows: one tap + Undo, DEFERRED and race-free (builds 1006 + 1008).

   1006 introduced crStageDefer (optimistic move, commit after a 5s Undo window). 1008 rewrote it to
   fix two regressions: (a) a single pending slot dropped the first move when a second arrow was tapped
   (same or other job) with no commit and no revert; (b) closing/backgrounding the app inside the window
   lost the move. New contract: exactly one pending move; a superseding tap or the page hiding COMMITS it;
   the target stage is captured and committed via setStage(target) directly.

   This drives the shipped crStageDefer in Chromium, spying window.setStage (non-module top-level fn, so
   the reassignment is picked up by the bare call inside _crStageCommit). Control: build 1007 (old design,
   commitFn signature + single-timer drop) — the supersede/hide assertions fail named, no crash.

   Usage: node gate_1006.mjs [path] */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium;
for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright/index.js']) {
  try { chromium = require(p).chromium; break; } catch (e) {}
}
if (!chromium) { console.error('gate_1006: playwright not found'); process.exit(2); }
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
const HERE = dirname(fileURLToPath(import.meta.url));
const FILE = process.argv[2] || join(HERE, '../../../../index.html');
const APP  = readFileSync(FILE, 'utf8');
const SETUP = readFileSync(join(HERE, 'sentinel_setup_cardinal.js'), 'utf8')
            + '\n;\n' + readFileSync(join(HERE, 'e2e_mock_supa.js'), 'utf8');

let fails = [], passes = 0;
const need = (n, ok, d) => { if (ok) passes++; else fails.push(n + (d ? ' — ' + d : '')); };

/* source-level shape: the new race-free primitives exist, the old single-timer drop is gone */
need('crStageDefer takes (pr, target) — commitFn dropped', /function crStageDefer\(pr, target\)\{/.test(APP) || APP.includes('function crStageDefer(pr, target){'),
     'signature not updated');
need('a pending move is committed, not dropped, on supersede', APP.includes('if(_crStagePending) _crStageCommit(_crStagePending);'),
     'no commit-on-supersede');
need('page-hide flush registered', APP.includes("document.addEventListener('visibilitychange'") && APP.includes("_crStageCommit(_crStagePending)"),
     'no hide flush');

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'],
}).catch(() => chromium.launch());
const ctx = await browser.newContext({ viewport: { width: 414, height: 896 } });
const page = await ctx.newPage();
page.on('pageerror', () => {});
await page.route('**/*', async r => {
  const u = r.request().url();
  if (u.startsWith('https://sentinel.test/'))
    return r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: APP });
  if (/\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(u))
    return r.fulfill({ status: 200, contentType: 'image/png',
      body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64') });
  return r.fulfill({ status: 200, body: '' });
});
await page.addInitScript(SETUP);
await page.goto('https://sentinel.test/?as=theo', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1500);

const res = await page.evaluate(async () => {
  const out = { hasFn: typeof crStageDefer === 'function' };
  if (!out.hasFn) return out;
  window.currentProject = null;
  window.renderOverview = () => {}; window.renderPipeline = () => {};
  const calls = [];
  window.setStage = async (id, v) => { calls.push([id, v]); const p = (window.cacheProjects || []).find(x => x.id === id); if (p) p.stage = v; };
  let undoFn = null;
  window.CardinalUndo = { enqueue: (m, fn) => { undoFn = fn; }, dismiss: () => {} };
  const wait = ms => new Promise(r => setTimeout(r, ms));

  // S1 — a tap defers (optimistic paint, no commit yet, undo offered)
  const pA = { id: 'A', stage: 'Lead' }; window.cacheProjects = [pA];
  crStageDefer(pA, 'Prospect');
  out.s1 = { stage: pA.stage, calls: calls.length, hasUndo: typeof undoFn === 'function' };

  // S2 — undo reverts and never commits
  if (undoFn) undoFn();
  await wait(40);
  out.s2 = { stage: pA.stage, calls: calls.length };

  // S4 — supersede across jobs: tap A2 then B in the window → A2 COMMITS (not dropped), B still deferred
  calls.length = 0; undoFn = null;
  const pA2 = { id: 'A2', stage: 'Lead' }, pB = { id: 'B', stage: 'Lead' }; window.cacheProjects = [pA2, pB];
  crStageDefer(pA2, 'Prospect');
  crStageDefer(pB, 'Approved');
  await wait(40);
  out.s4 = { a2 : calls.some(c => c[0] === 'A2' && c[1] === 'Prospect'),
             bNotYet: !calls.some(c => c[0] === 'B') };
  if (undoFn) undoFn();   // clear pending B

  // S5 — page hide flushes the pending move
  calls.length = 0; undoFn = null;
  const pC = { id: 'C', stage: 'Lead' }; window.cacheProjects = [pC];
  crStageDefer(pC, 'Prospect');
  window.dispatchEvent(new Event('pagehide'));
  await wait(40);
  out.s5 = { committed: calls.some(c => c[0] === 'C' && c[1] === 'Prospect') };

  // S3 — natural 5s timeout commits exactly the captured target
  calls.length = 0; undoFn = null;
  const pD = { id: 'D', stage: 'Lead' }; window.cacheProjects = [pD];
  crStageDefer(pD, 'Prospect');
  out.s3mid = calls.filter(c => c[0] === 'D').length;
  await wait(5300);
  out.s3 = { committed: calls.filter(c => c[0] === 'D' && c[1] === 'Prospect').length };
  return out;
});
await browser.close();

need('crStageDefer present at runtime', res.hasFn, 'not defined');
if (res.hasFn) {
  need('S1 tap shows target optimistically', res.s1.stage === 'Prospect', JSON.stringify(res.s1));
  need('S1 tap does not commit yet', res.s1.calls === 0, JSON.stringify(res.s1));
  need('S1 raises an Undo', res.s1.hasUndo === true);
  need('S2 undo reverts to original', res.s2.stage === 'Lead', JSON.stringify(res.s2));
  need('S2 undo never commits', res.s2.calls === 0, JSON.stringify(res.s2));
  need('S4 superseded move is COMMITTED, not dropped', res.s4.a2 === true, JSON.stringify(res.s4));
  need('S4 the new move is still deferred', res.s4.bNotYet === true, JSON.stringify(res.s4));
  need('S5 page-hide flushes the pending move', res.s5.committed === true, JSON.stringify(res.s5));
  need('S3 uncommitted right after tap', res.s3mid === 0, JSON.stringify({ mid: res.s3mid }));
  need('S3 commits once after the window', res.s3.committed === 1, JSON.stringify(res.s3));
}

if (fails.length) { console.log('gate_1006 FAIL  ' + passes + ' pass / ' + fails.length + ' fail'); fails.forEach(f => console.log('  ✗ ' + f)); process.exit(1); }
console.log('gate_1006 PASS  ' + passes + '/' + passes);
