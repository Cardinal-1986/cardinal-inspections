/* gate_1026.mjs — build 1026: the estimate lanes tell the truth.
 * Proves in a REAL engine, on the seeded walk (sentinel_setup_estimates.js:
 * e1 accepted $14,400 EST-2026-0896 · e2 sent $3,150 · e3 draft $14,400 ·
 * e4 declined $850) plus ONE bogus-status row injected here (never in the
 * shared seed):
 *   [lanes] EST-2026-0896 sits in ACCEPTED (not UNSENT); DECLINED exists,
 *           is thin (grid-column 1/-1), holds 1 card ($850); UNSENT holds
 *           only the draft; the bogus row renders under UNRECOGNIZED STATUS
 *           and NOT inside UNSENT.
 *   [sums]  footer says showing 5 · open pipeline $17,550 · accepted $14,400
 *           · declined $850 (open = drafts+sent only).
 *   [ink]   DECLINED title computes #e35c63 dark / #9c1822 light.
 *   [rail]  the status filter group offers Declined.
 *   [text]  the editor's Delete passes state.project.id, not state.project_id.
 * Run:  node gate_1026.mjs <artifact> [--control <prev>]
 * The control run must go RED with named failures — a gate never seen red
 * proves nothing (skill law).
 */
import { readFileSync, existsSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium;
for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright/index.js']) {
  try { chromium = require(p).chromium; break; } catch (e) {}
}
if (!chromium) { console.error('gate_1026: playwright not found'); process.exit(2); }

const argv = process.argv.slice(2);
const FILE = argv.find(a => !a.startsWith('--'));
const ci = argv.indexOf('--control');
const CONTROL = ci !== -1 ? argv[ci + 1] : null;
if (!FILE || !existsSync(FILE)) { console.error('usage: node gate_1026.mjs <index.html> [--control prev]'); process.exit(2); }

const SKILL = new URL('.', import.meta.url).pathname;
const SETUP_JS = ['sentinel_setup_cardinal.js', 'sentinel_setup_estimates.js', 'e2e_mock_supa.js']
  .map(f => readFileSync(SKILL + f, 'utf8')).join('\n;\n');
/* the bogus-status row rides in AFTER the seed — the shared walk stays clean.
   status 'wat' is claimed by no lane in any build; $99 keeps the sums distinct. */
const BOGUS_JS = `(function(){
  var t = window.__SEED__ && window.__SEED__.estimates;
  if (!t) throw new Error('gate_1026: __SEED__.estimates missing — inject AFTER the setups');
  t.push({ id: 'e-bogus', estimate_number: 'EST-2026-0999', title: 'Bogus status row',
    status: 'wat', total: 99, archived: false, created_at: '2026-08-01T12:00:00Z',
    updated_at: '2026-08-01T12:00:00Z', created_by: 'theo@cardinalrenovations.net',
    project_id: 'p2', line_items: [], photos: [], itemized: false });
})();`;
const PNG1 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

async function sweep(html, light) {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' })
    .catch(() => chromium.launch());
  const ctx = await browser.newContext({ viewport: { width: 1194, height: 834 } });
  const page = await ctx.newPage();
  await page.route('**/*', r => {
    const u = r.request().url();
    if (u.startsWith('https://sentinel.test/')) return r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: html });
    if (/\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(u)) return r.fulfill({ status: 200, contentType: 'image/png', body: PNG1 });
    return r.fulfill({ status: 200, body: '' });
  });
  await page.addInitScript(SETUP_JS);
  await page.addInitScript(BOGUS_JS);
  if (light) await page.addInitScript(`try{ localStorage.setItem('cardinal.theme.rb','1'); }catch(e){}`);
  await page.goto('https://sentinel.test/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(900);

  /* state 0 = eslist — the standalone Estimates walls */
  await page.evaluate(`Promise.resolve(window.__sentinelStates[0].run())`);
  await page.waitForTimeout(800);
  const out = await page.evaluate(`(function(){
    var r = { lanes: [] };
    document.querySelectorAll('[data-cre-lanes] .cre-lane').forEach(function(l){
      var gt = l.querySelector('.gt'), gn = l.querySelector('.gn');
      var cs = getComputedStyle(l);
      r.lanes.push({
        title: gt ? gt.textContent.trim() : '',
        ink: gt ? getComputedStyle(gt).color : 'MISSING',
        count: gn ? gn.textContent.trim() : '',
        thin: l.classList.contains('thin'),
        gridCol: cs.gridColumnStart + ' / ' + cs.gridColumnEnd,
        cards: Array.prototype.map.call(l.querySelectorAll('.cre-card .po'), function(x){ return x.textContent.trim(); }),
        moneys: Array.prototype.map.call(l.querySelectorAll('.cre-card .money'), function(x){ return x.textContent.trim(); }),
      });
    });
    var sum = document.querySelector('[data-cre-sum]');
    r.sum = sum ? sum.textContent.trim() : 'MISSING';
    var rail = document.querySelector('[data-cre-rail]');
    r.railHasDeclined = rail ? /Declined/.test(rail.textContent) : false;
    return r;
  })()`);
  await browser.close();
  return out;
}

function judge(html, dark, lite) {
  const fails = [];
  const lane = (o, t) => o.lanes.find(l => l.title === t);
  const acc = lane(dark, 'ACCEPTED'), dec = lane(dark, 'DECLINED'),
        uns = lane(dark, 'UNSENT — DRAFTS'), lost = lane(dark, 'UNRECOGNIZED STATUS');
  if (!acc) fails.push('no ACCEPTED lane rendered');
  else if (!acc.cards.includes('EST-2026-0896')) fails.push(`accepted estimate not in ACCEPTED (cards: ${acc.cards.join(',') || 'none'})`);
  if (!dec) fails.push('no DECLINED lane rendered');
  else {
    if (dec.count !== '1') fails.push(`DECLINED count ${dec.count} (want 1)`);
    if (!dec.moneys.includes('$850')) fails.push(`DECLINED moneys ${dec.moneys.join(',')} (want $850)`);
    if (!dec.thin) fails.push('DECLINED lane is not .thin');
    if (dec.gridCol !== '1 / -1') fails.push(`DECLINED grid-column ${dec.gridCol} (want 1 / -1)`);
    if (dec.ink !== 'rgb(227, 92, 99)') fails.push(`DECLINED title ink dark ${dec.ink} (want rgb(227, 92, 99))`);
  }
  if (!uns) fails.push('no UNSENT lane rendered');
  else {
    if (uns.count !== '1') fails.push(`UNSENT count ${uns.count} (want 1 — only the draft)`);
    if (uns.cards.includes('EST-2026-0896')) fails.push('accepted estimate still masquerading in UNSENT');
    if (uns.cards.includes('EST-2026-0999')) fails.push('bogus-status row masquerading in UNSENT');
  }
  if (!lost) fails.push('no UNRECOGNIZED STATUS safety-net lane for the bogus row');
  else if (!lost.cards.includes('EST-2026-0999')) fails.push(`safety net missing the bogus row (cards: ${lost.cards.join(',')})`);
  if (!/showing 5/.test(dark.sum)) fails.push(`sum "showing": ${dark.sum.slice(0, 40)} (want showing 5)`);
  if (!/open pipeline\s*\$17,550/.test(dark.sum)) fails.push(`open pipeline wrong: ${dark.sum} (want $17,550 = drafts+sent only)`);
  if (!/accepted\s*\$14,400/.test(dark.sum)) fails.push(`accepted sum wrong: ${dark.sum}`);
  if (!/declined\s*\$850/.test(dark.sum)) fails.push(`declined sum missing: ${dark.sum}`);
  if (!dark.railHasDeclined) fails.push('status filter rail does not offer Declined');
  const ldec = lite.lanes.find(l => l.title === 'DECLINED');
  if (!ldec) fails.push('no DECLINED lane in light theme');
  else if (ldec.ink !== 'rgb(156, 24, 34)') fails.push(`DECLINED title ink light ${ldec.ink} (want rgb(156, 24, 34))`);
  if (!html.includes('projectId: state.project && state.project.id')) fails.push('editor Delete still passes the undefined state.project_id');
  return fails;
}

const html = readFileSync(FILE, 'utf8');
const dark = await sweep(html, false);
const lite = await sweep(html, true);
const fails = judge(html, dark, lite);
for (const f of fails) console.log('  FAIL ' + f);
console.log(fails.length ? `GATE 1026 RED — ${fails.length} failure(s)` : 'GATE 1026 GREEN — lanes, sums, inks, rail, delete-site');

if (CONTROL) {
  const chtml = readFileSync(CONTROL, 'utf8');
  const cd = await sweep(chtml, false);
  const cl = await sweep(chtml, true);
  const cfails = judge(chtml, cd, cl);
  console.log(`CONTROL (${CONTROL.split('/').pop()}): ${cfails.length} named failure(s) — ${cfails.length ? 'RED as expected' : 'UNEXPECTEDLY CLEAN'}`);
  for (const f of cfails.slice(0, 8)) console.log('    control-fail ' + f);
  if (!cfails.length) { console.log('a control that cannot fail proves nothing'); process.exit(1); }
}
process.exit(fails.length ? 1 : 0);
