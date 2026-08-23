/* gate_1006.mjs — stage arrows: one tap + 5s Undo, deferred commit.

   THE CHANGE. The profile stage arrows used to confirm('are you sure?') then
   commit immediately. 1006 replaces that with crStageDefer: the move shows at
   once but is DEFERRED for a 5s Undo window — the commit (setStage / acxAdvance,
   which is what writes the row AND emails the team on Approved/Completed) does
   not run until the window closes, and Undo cancels it entirely. So an
   accidental tap undone in time never writes and never buzzes Curtis.

   Two checks: the arrows are wired through crStageDefer (source), and the helper
   defers/cancels/commits correctly (Chromium). Control: the previous build, where
   crStageDefer does not exist and the confirm() is still there.

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

/* --- source-level wiring checks --- */
need('both arrows wired through crStageDefer', APP.includes('crStageDefer(pr, pvStage') && APP.includes('crStageDefer(pr, nx'),
     'the stage arrows do not call crStageDefer');
need('the up-front advance confirm is gone', !APP.includes("if(!confirm('Advance ' + (pr.name || 'this job') + ' to ' + nx"),
     'the old confirm() is still on the forward arrow');
need('crStageDefer is defined', APP.includes('function crStageDefer('), 'helper missing');

/* --- Chromium mechanism check --- */
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
  // isolate: stub renders + undo, no real project view needed
  window.currentProject = null;
  window.renderOverview = () => {};
  window.renderPipeline = () => {};
  let undoFn = null;
  window.CardinalUndo = { enqueue: (msg, fn) => { undoFn = fn; }, dismiss: () => {} };
  const pr = { id: 'gate-p1', stage: 'Lead', name: 'Gate Job' };
  window.cacheProjects = [pr];

  // 1) tap: optimistic move, commit deferred
  let commits = 0;
  crStageDefer(pr, 'Prospect', () => { commits++; return Promise.resolve(); });
  out.afterTap = { stage: pr.stage, commits, hasUndo: typeof undoFn === 'function' };

  // 2) undo before the window closes: revert, never commit
  if (undoFn) undoFn();
  await new Promise(r => setTimeout(r, 200));
  out.afterUndo = { stage: pr.stage, commits };

  // 3) fresh tap, let the 5s window elapse: commits once
  let commits2 = 0;
  const pr2 = { id: 'gate-p2', stage: 'Lead', name: 'Gate Job 2' };
  window.cacheProjects = [pr2];
  crStageDefer(pr2, 'Prospect', () => { commits2++; return Promise.resolve(); });
  const midCommits = commits2;                 // should still be 0 right after the tap
  await new Promise(r => setTimeout(r, 5300));
  out.afterTimeout = { mid: midCommits, commits: commits2 };
  return out;
});
await browser.close();

need('helper present in Chromium', res.hasFn, 'crStageDefer not defined at runtime');
if (res.hasFn) {
  need('tap shows the target stage at once', res.afterTap.stage === 'Prospect', JSON.stringify(res.afterTap));
  need('tap does NOT commit immediately', res.afterTap.commits === 0, JSON.stringify(res.afterTap));
  need('tap raises an Undo toast', res.afterTap.hasUndo === true, JSON.stringify(res.afterTap));
  need('Undo reverts to the original stage', res.afterUndo.stage === 'Lead', JSON.stringify(res.afterUndo));
  need('Undo means it NEVER commits (no write, no Curtis email)', res.afterUndo.commits === 0, JSON.stringify(res.afterUndo));
  need('still uncommitted right after a fresh tap', res.afterTimeout.mid === 0, JSON.stringify(res.afterTimeout));
  need('commits once the 5s window closes', res.afterTimeout.commits === 1, JSON.stringify(res.afterTimeout));
}

if (fails.length) { console.log('gate_1006 FAIL  ' + passes + ' pass / ' + fails.length + ' fail'); fails.forEach(f => console.log('  ✗ ' + f)); process.exit(1); }
console.log('gate_1006 PASS  ' + passes + '/' + passes);
