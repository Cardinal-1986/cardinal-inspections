/* gate_1048.mjs — build 1048: the morning strip ("Where things stand").
 * Rig, admin (Theo), retail home. Injects a job that is Approved with no build
 * day, then:
 *   [count]  the strip renders and the "need a build date" chip counts that job;
 *   [agree]  the approvals chip equals window.crApprovalsPending().length AND
 *            the card's own rendered row count — one predicate, two readers;
 *   [door]   clicking the build-date chip opens the Production board;
 *   [zero]   with every count forced to zero the strip hides itself;
 *   [role]   as CURTIS (production, non-admin) the strip never renders.
 * Run:  node gate_1048.mjs <artifact> [--control <index_1047>]
 * The control must go RED (#crMorning does not exist).
 */
import { readFileSync, existsSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium;
for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright/index.js']) {
  try { chromium = require(p).chromium; break; } catch (e) {}
}
if (!chromium) { console.error('gate_1048: playwright not found'); process.exit(2); }

const argv = process.argv.slice(2);
const FILE = argv.find(a => !a.startsWith('--'));
const ci = argv.indexOf('--control');
const CONTROL = ci !== -1 ? argv[ci + 1] : null;
if (!FILE || !existsSync(FILE)) { console.error('usage: node gate_1048.mjs <index.html> [--control prev]'); process.exit(2); }

const SKILL = new URL('.', import.meta.url).pathname;
const CARDINAL_JS = readFileSync(SKILL + 'sentinel_setup_cardinal.js', 'utf8');
const MOCK_JS = readFileSync(SKILL + 'e2e_mock_supa.js', 'utf8');
const UNSCHED = `(function(){
  if(!window.__SEED__) return;
  window.__SEED__.projects.push({ id:'pm1', name:'Dell Rowan', address:'40 Vine Ct', city:'Dayton',
    state:'OH', zip:'45402', stage:'Approved', created_by:'theo@cardinalrenovations.net',
    sales_rep:null, checklist: JSON.stringify({ po:1095, lead:{ assigned:[] } }), phone:null,
    email:null, crm:'retail', created_at:'2026-08-18T10:00:00Z', updated_at:'2026-08-22T10:00:00Z',
    stage_since:'2026-08-22T10:00:00Z' });
})();`;
const PNG1 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

async function boot(browser, html, persona) {
  const ctx = await browser.newContext({ viewport: { width: 1194, height: 834 } });
  const page = await ctx.newPage();
  await page.route('**/*', r => {
    const u = r.request().url();
    if (u.startsWith('https://sentinel.test/') && !/\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(u))
      return r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: html });
    if (/\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(u)) return r.fulfill({ status: 200, contentType: 'image/png', body: PNG1 });
    return r.fulfill({ status: 200, body: '' });
  });
  await page.addInitScript(CARDINAL_JS);
  await page.addInitScript(UNSCHED);
  await page.addInitScript(MOCK_JS);
  await page.goto('https://sentinel.test/' + (persona ? '?as=' + persona : ''), { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  /* the home row repaints through renderActivity, which the rig's boot does not
     fire (the same reason gate_1045 enters this way) */
  await page.evaluate(`(function(){
    try{ if(typeof renderApprovals === 'function') renderApprovals(); }catch(e){}
    try{ if(typeof window.renderMorningStrip === 'function') window.renderMorningStrip(); }catch(e){}
  })()`);
  await page.waitForTimeout(400);
  return { ctx, page };
}

async function sweep(html) {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' })
    .catch(() => chromium.launch());
  const out = {};
  {
    const { ctx, page } = await boot(browser, html, null);
    out.admin = await page.evaluate(`(function(){
      var host = document.getElementById('crMorning');
      if(!host) return { noStrip: true };
      var chips = {};
      host.querySelectorAll('.mchip').forEach(function(c){
        chips[c.dataset.m] = Number((c.querySelector('.n') || {}).textContent || 0);
      });
      var card = document.getElementById('approvalsCard');
      return {
        shown: host.style.display !== 'none',
        chips: chips,
        pendFn: (typeof window.crApprovalsPending === 'function') ? window.crApprovalsPending().length : -1,
        cardRows: card ? card.querySelectorAll('#approvalsList > *').length : -1,
        cardShown: !!(card && card.style.display !== 'none')
      };
    })()`);
    if (!out.admin.noStrip && out.admin.chips.date) {
      await page.evaluate(`document.querySelector('#crMorning .mchip[data-m="date"]').click()`);
      await page.waitForTimeout(900);
      out.door = await page.evaluate(`(function(){
        var pb = document.getElementById('cr-pb');
        return !!(pb && pb.classList.contains('open'));
      })()`);
    }
    /* force every count to zero -> the strip must hide itself */
    out.zero = await page.evaluate(`(function(){
      var host = document.getElementById('crMorning');
      if(!host) return 'NOSTRIP';
      window.crApprovalsPending = function(){ return []; };
      window.cacheProjects = [];
      window.cacheAppts = [];
      if(window.CardinalPunch) window.CardinalPunch.rows = function(){ return []; };
      if(window.CardinalTruthHome) window.CardinalTruthHome.chase = function(){ return []; };
      window.renderMorningStrip();
      return host.style.display === 'none';
    })()`);
    await ctx.close();
  }
  {
    const { ctx, page } = await boot(browser, html, 'curtis');
    out.curtis = await page.evaluate(`(function(){
      var host = document.getElementById('crMorning');
      if(!host) return { noStrip: true };
      return { shown: host.style.display !== 'none', chips: host.querySelectorAll('.mchip').length };
    })()`);
    await ctx.close();
  }
  await browser.close();
  return out;
}

function judge(r) {
  const fails = [];
  if (r.admin.noStrip) return ['#crMorning does not exist — no morning strip'];
  if (!r.admin.shown) fails.push('the strip did not render for an admin with work waiting');
  if (!r.admin.chips.date) fails.push('the unscheduled Approved job produced no "need a build date" chip');
  if (r.admin.pendFn < 0) fails.push('crApprovalsPending is not exposed — chip and card cannot share a predicate');
  else if (r.admin.pendFn > 0) {
    if (r.admin.chips.appr !== r.admin.pendFn) fails.push(`approvals chip ${r.admin.chips.appr} != predicate ${r.admin.pendFn}`);
    if (r.admin.cardShown && r.admin.cardRows !== r.admin.pendFn)
      fails.push(`the card renders ${r.admin.cardRows} rows for a predicate of ${r.admin.pendFn} — they disagree`);
  }
  if (r.door !== true) fails.push(`the build-date chip did not open the Production board (${r.door})`);
  if (r.zero !== true) fails.push(`with every count zero the strip stayed visible (${r.zero})`);
  if (!r.curtis.noStrip && r.curtis.shown) fails.push('the strip rendered for Curtis — it is admin-only');
  return fails;
}

const html = readFileSync(FILE, 'utf8');
const fails = judge(await sweep(html));
for (const f of fails) console.log('  FAIL ' + f);
console.log(fails.length ? `GATE 1048 RED — ${fails.length} failure(s)` : 'GATE 1048 GREEN — counts agree with their screens, doors work, hides at zero, admin-only');

if (CONTROL) {
  const cfails = judge(await sweep(readFileSync(CONTROL, 'utf8')));
  console.log(`CONTROL (${CONTROL.split('/').pop()}): ${cfails.length} named failure(s) — ${cfails.length ? 'RED as expected' : 'UNEXPECTEDLY CLEAN'}`);
  for (const f of cfails.slice(0, 3)) console.log('    control-fail ' + f);
  if (!cfails.length) { console.log('a control that cannot fail proves nothing'); process.exit(1); }
}
process.exit(fails.length ? 1 : 0);
