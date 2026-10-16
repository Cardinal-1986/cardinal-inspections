// gate_1356 — Back goes where you were (Theo: "it takes me to random places instead of where I was at").
// A: Production → client A → Estimates → A/R → Sales Floor → client B → Board; Back ×7 walks it exactly in reverse
//    (1355: the Sales Floor step came back as client A — the 1259 hashchange router reopened the stale fragment).
// B: Team → Production → Back is Team (1355: navSetView replaced the Team entry, Back skipped it).
// C: tab flips on a client still cost one Back (1037), and a tab flip never rewrites another screen's entry.
// D: an alert link (fragment change, no state) while the app is open still opens that client (1259).
// node gate_1356.mjs [index.html]   (1355 = RED)
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
async function fresh() {
  const ctx = await b.newContext({ viewport: { width: 1500, height: 1000 } });
  const p = await ctx.newPage();
  await p.route('**/*', r => r.request().url().startsWith('https://sentinel.test/') ? r.fulfill({ status: 200, contentType: 'text/html', body: APP }) : r.fulfill({ status: 200, body: '' }));
  await p.addInitScript(SETUP); await p.goto('https://sentinel.test/', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(3500);
  return { ctx, p };
}
/* what is on screen, as one word */
const where = p => p.evaluate(() => {
  const on = id => { const e = document.getElementById(id); if (!e) return false; const c = getComputedStyle(e); return c.display !== 'none' && c.visibility !== 'hidden' && e.getBoundingClientRect().height > 200; };
  for (const [id, k] of [['cr-sf', 'salesfloor'], ['cr-ar-view', 'ar'], ['cr-estimates-mount', 'estimates'], ['cr-pb', 'production'], ['boardView', 'board'], ['teamView', 'team'], ['clientsView', 'clients']]) if (on(id)) return k;
  if (on('projectView')) return 'client:' + ((window.currentProject || {}).id || '?');
  if (on('mainView')) return 'home';
  return 'other';
});
const go = async (p, fn) => { await p.evaluate(fn); await p.waitForTimeout(1600); return where(p); };
const back = async p => { await p.goBack({ waitUntil: 'commit' }).catch(() => {}); await p.waitForTimeout(1600); return where(p); };

/* A */
{
  const { ctx, p } = await fresh();
  const steps = ["window.CardinalProduction.open()", "window.openProject('p1')", "window.CardinalEstimates.open()", "openAR()",
                 "window.CardinalSalesFloor.open()", "window.openProject('p2')", "openScheduleBoard()"];
  const seen = [await where(p)];
  for (const s of steps) seen.push(await go(p, new Function(s)));
  const backs = []; for (let i = 0; i < steps.length; i++) backs.push(await back(p));
  const want = seen.slice(0, -1).reverse();
  ok(JSON.stringify(seen) === '["home","production","client:p1","estimates","ar","salesfloor","client:p2","board"]', 'the drive reached every screen', JSON.stringify(seen));
  ok(JSON.stringify(backs) === JSON.stringify(want), 'Back walks the same screens in reverse', JSON.stringify(backs));
  ok(backs[1] === 'salesfloor', 'Back from a client lands on Sales Floor, not the last client', backs[1]);
  await ctx.close();
}
/* B */
{
  const { ctx, p } = await fresh();
  const t = await go(p, () => window.openTeamView());
  const pr = await go(p, () => window.CardinalProduction.open());
  const bk = await back(p);
  ok(t === 'team' && pr === 'production' && bk === 'team', 'Team → Production → Back is Team', JSON.stringify([t, pr, bk]));
  await ctx.close();
}
/* C */
{
  const { ctx, p } = await fresh();
  await go(p, () => window.openClientsDirectory());
  await go(p, () => window.openProject('p1'));
  await go(p, () => window.showTab('photos')); await go(p, () => window.showTab('docs'));
  const r1 = await p.evaluate(() => JSON.stringify(history.state));
  const bk = await back(p);
  ok(bk === 'clients', 'tab flips still cost one Back (1037)', bk + ' ' + r1);
  await go(p, () => window.openProject('p1'));
  await go(p, () => openAR());
  const before = await p.evaluate(() => JSON.stringify(history.state));
  await p.evaluate(() => window.showTab('photos')); await p.waitForTimeout(300);
  const after = await p.evaluate(() => JSON.stringify(history.state));
  ok(before === after && /"ar"/.test(after), 'a tab flip never rewrites another screen\'s entry', after);
  await ctx.close();
}
/* D */
{
  const { ctx, p } = await fresh();
  await go(p, () => window.openClientsDirectory());
  await p.evaluate(() => { location.hash = '#p/p2'; }); await p.waitForTimeout(2500);
  ok((await where(p)) === 'client:p2', 'an alert link while the app is open still opens the client (1259)', await where(p));
  await ctx.close();
}
await b.close();
console.log(fail ? 'GATE 1356 RED — ' + fail + ' failing' : 'GATE 1356 GREEN');
process.exit(fail ? 1 : 0);
