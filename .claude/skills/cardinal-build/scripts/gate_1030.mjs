/* gate_1030.mjs — build 1030: documents classify by their link, not their name.
 * Chromium rig. Injects (gate-side only) a published-estimate document titled
 * "Roof Replacement — Mark Diamond" — a title isEstimateTitle() rejects — plus
 * the estimates row whose doc_id points at it. Proves:
 *   [bucket]  the client profile files it under Estimates, NOT Inspections;
 *   [helper]  isEstimateDoc(): link true / bare same title false / plain
 *             "Estimate —" title true;
 *   [approve] both approvals legs test isEstimateDoc (static x2);
 *   [teach]   the editor's title placeholder is "Estimate — Jane Smith";
 *   [cruft]   wireStats/wireManualRows are gone and the page loads clean.
 * Run:  node gate_1030.mjs <artifact> [--control <prev>]
 * The control run must go RED with named failures (skill law).
 */
import { readFileSync, existsSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium;
for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright/index.js']) {
  try { chromium = require(p).chromium; break; } catch (e) {}
}
if (!chromium) { console.error('gate_1030: playwright not found'); process.exit(2); }

const argv = process.argv.slice(2);
const FILE = argv.find(a => !a.startsWith('--'));
const ci = argv.indexOf('--control');
const CONTROL = ci !== -1 ? argv[ci + 1] : null;
if (!FILE || !existsSync(FILE)) { console.error('usage: node gate_1030.mjs <index.html> [--control prev]'); process.exit(2); }

const SKILL = new URL('.', import.meta.url).pathname;
const SETUP_JS = ['sentinel_setup_cardinal.js', 'sentinel_setup_estimates.js', 'e2e_mock_supa.js']
  .map(f => readFileSync(SKILL + f, 'utf8')).join('\n;\n');
const PNG1 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const RENAMED = 'Roof Replacement — Mark Diamond';

const INJECT = `(function(){
  window.__SEED__.inspection_reports.push({
    id: 'd2', project_id: 'p1', project_name: 'Mark Diamond', title: ${JSON.stringify(RENAMED)},
    html: '<!doctype html><html><body><p>doc</p></body></html>', status: 'sent',
    signed_at: '2026-08-20T12:00:00Z', total: 5000,
    created_at: '2026-08-19T15:00:00Z', updated_at: '2026-08-20T12:00:00Z',
    created_by: 'theo@cardinalrenovations.net' });
  window.__SEED__.estimates.push({
    id: 'e5', project_id: 'p1', estimate_number: 'EST-2026-0912', title: ${JSON.stringify(RENAMED)},
    status: 'sent', total: 5000, archived: false, itemized: true, line_items: [], photos: [],
    created_at: '2026-08-19T15:00:00Z', updated_at: '2026-08-20T12:00:00Z',
    created_by: 'theo@cardinalrenovations.net', doc_id: 'd2', contract_doc_id: null,
    projects: { name: 'Mark Diamond', address: '7990 Germantown Pike' } });
})();`;

async function sweep(html) {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' })
    .catch(() => chromium.launch());
  const ctx = await browser.newContext({ viewport: { width: 1194, height: 900 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e).slice(0, 160)));
  await page.route('**/*', r => {
    const u = r.request().url();
    if (u.startsWith('https://sentinel.test/') && !/\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(u))
      return r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: html });
    if (/\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(u)) return r.fulfill({ status: 200, contentType: 'image/png', body: PNG1 });
    return r.fulfill({ status: 200, body: '' });
  });
  await page.addInitScript(SETUP_JS);
  await page.addInitScript(INJECT);
  await page.goto('https://sentinel.test/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1100);

  const out = { errs };
  /* profile docs buckets (state 4 = estprofile on p1) */
  await page.evaluate(`Promise.resolve(window.__sentinelStates[4].run())`);
  await page.waitForTimeout(700);
  Object.assign(out, await page.evaluate(`(function(){
    var est = document.getElementById('estDocsMount');
    var insp = document.getElementById('inspDocsMount');
    return {
      inEst: !!(est && est.textContent.indexOf(${JSON.stringify(RENAMED)}) !== -1),
      inInsp: !!(insp && insp.textContent.indexOf(${JSON.stringify(RENAMED)}) !== -1),
      helper: (function(){
        if (typeof isEstimateDoc !== 'function') return 'MISSING';
        return [
          isEstimateDoc({ id: 'd2', title: ${JSON.stringify(RENAMED)} }),
          isEstimateDoc({ id: 'nope', title: ${JSON.stringify(RENAMED)} }),
          isEstimateDoc({ id: 'nope', title: 'Estimate — Somebody' }),
        ].join(',');
      })(),
    };
  })()`));

  /* editor placeholder (state 1) */
  await page.evaluate(`Promise.resolve(window.__sentinelStates[1].run())`);
  await page.waitForTimeout(500);
  out.placeholder = await page.evaluate(`(function(){
    var t = document.querySelector('#cr-est-view [data-f="title"]');
    return t ? t.getAttribute('placeholder') : 'MISSING';
  })()`);
  await browser.close();
  return out;
}

function judge(html, o) {
  const fails = [];
  if (!o.inEst) fails.push('renamed published estimate NOT in the Estimates bucket');
  if (o.inInsp) fails.push('renamed published estimate misfiled under Inspections');
  if (o.helper !== 'true,false,true') fails.push(`isEstimateDoc truth-table: ${o.helper} (want true,false,true)`);
  if (o.placeholder !== 'Estimate — Jane Smith') fails.push(`title placeholder: ${JSON.stringify(o.placeholder)}`);
  const approveLegs = (html.match(/isEstimateDoc\(r\) && r\.signed_at/g) || []).length;
  if (approveLegs !== 2) fails.push(`approvals legs on the link: ${approveLegs} (want 2)`);
  if (html.includes('function wireStats(')) fails.push('wireStats survives in cr-eaf');
  if (html.includes('function wireManualRows(')) fails.push('wireManualRows survives in cr-eaf');
  const wireErr = o.errs.filter(e => /wireStats|wireManualRows/.test(e));
  if (wireErr.length) fails.push('page errors from the removed wiring: ' + wireErr[0]);
  return fails;
}

const html = readFileSync(FILE, 'utf8');
const o = await sweep(html);
const fails = judge(html, o);
for (const f of fails) console.log('  FAIL ' + f);
console.log(fails.length ? `GATE 1030 RED — ${fails.length} failure(s)` : 'GATE 1030 GREEN — bucket, helper, approvals, placeholder, cruft');

if (CONTROL) {
  const chtml = readFileSync(CONTROL, 'utf8');
  const co = await sweep(chtml);
  const cfails = judge(chtml, co);
  console.log(`CONTROL (${CONTROL.split('/').pop()}): ${cfails.length} named failure(s) — ${cfails.length ? 'RED as expected' : 'UNEXPECTEDLY CLEAN'}`);
  for (const f of cfails.slice(0, 6)) console.log('    control-fail ' + f);
  if (!cfails.length) { console.log('a control that cannot fail proves nothing'); process.exit(1); }
}
process.exit(fails.length ? 1 : 0);
