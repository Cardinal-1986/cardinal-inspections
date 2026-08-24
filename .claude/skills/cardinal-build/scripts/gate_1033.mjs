/* gate_1033.mjs — build 1033: the AI-estimate arm is deleted, whole.
 * Proves the app still stands with ~49 KB of machinery gone:
 *   [alive]  all five sentinel states run with ZERO pageerrors; the walls
 *            render their lanes; "+ New estimate" is the door; the editor
 *            opens and still carries 1028's ai-assist button; the profile
 *            renders with #pEstMenu intact.
 *   [gone]   showAICreate / showOutput / normalizeAI / '/api/estimate' /
 *            cr-tmpl-ai-* / forEstimate / checkAI appear ONLY inside 1033
 *            tombstone comments; api/estimate.js is deleted; vercel.json has
 *            no entry for it; estimate-to-contract refuses ai_estimate_id.
 * Run:  node gate_1033.mjs <artifact> [--control <prev>]
 * The control run must go RED with named failures (skill law).
 */
import { readFileSync, existsSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium;
for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright/index.js']) {
  try { chromium = require(p).chromium; break; } catch (e) {}
}
if (!chromium) { console.error('gate_1033: playwright not found'); process.exit(2); }

const argv = process.argv.slice(2);
const FILE = argv.find(a => !a.startsWith('--'));
const ci = argv.indexOf('--control');
const CONTROL = ci !== -1 ? argv[ci + 1] : null;
if (!FILE || !existsSync(FILE)) { console.error('usage: node gate_1033.mjs <index.html> [--control prev]'); process.exit(2); }

const SKILL = new URL('.', import.meta.url).pathname;
const REPO = new URL('../../../../', import.meta.url).pathname;
const SETUP_JS = ['sentinel_setup_cardinal.js', 'sentinel_setup_estimates.js', 'e2e_mock_supa.js']
  .map(f => readFileSync(SKILL + f, 'utf8')).join('\n;\n');
const PNG1 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

async function sweep(html) {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' })
    .catch(() => chromium.launch());
  const ctx = await browser.newContext({ viewport: { width: 1194, height: 900 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e).slice(0, 200)));
  await page.route('**/*', r => {
    const u = r.request().url();
    if (u.startsWith('https://sentinel.test/') && !/\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(u))
      return r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: html });
    if (/\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(u)) return r.fulfill({ status: 200, contentType: 'image/png', body: PNG1 });
    return r.fulfill({ status: 200, body: '' });
  });
  await page.addInitScript(SETUP_JS);
  await page.goto('https://sentinel.test/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  const out = { errs, states: {} };
  for (let s = 0; s < 5; s++) {
    try {
      await page.evaluate(`Promise.resolve(window.__sentinelStates[${s}].run())`);
      await page.waitForTimeout(650);
      out.states[s] = 'ok';
    } catch (e) { out.states[s] = String(e).slice(0, 120); }
    if (s === 0) {
      Object.assign(out, await page.evaluate(`(function(){
        var m = document.getElementById('cr-estimates-mount');
        return {
          lanes: m ? m.querySelectorAll('[data-cre-lanes] .cre-lane').length : 0,
          door: !!(m && m.querySelector('[data-act="new-manual"]')),
        };
      })()`));
    }
    if (s === 1) {
      out.aiAssistBtnStyle = await page.evaluate(
        `!!document.querySelector('#cr-est-view [data-act="pick-photos"]')`);
    }
    if (s === 4) {
      out.estMenu = await page.evaluate(`!!document.getElementById('pEstMenu')`);
    }
  }
  await browser.close();
  return out;
}

function contextOK(html, name) {
  /* every occurrence must sit within 300 chars after a '1033' tombstone */
  let ok = true;
  let i = -1;
  while ((i = html.indexOf(name, i + 1)) !== -1) {
    if (!html.slice(Math.max(0, i - 300), i).includes('1033')) { ok = false; break; }
  }
  return ok;
}

function judge(html, o) {
  const fails = [];
  for (let s = 0; s < 5; s++) if (o.states[s] !== 'ok') fails.push(`state ${s} failed: ${o.states[s]}`);
  if (o.errs.length) fails.push(`pageerrors: ${o.errs.slice(0, 2).join(' | ')}`);
  if (o.lanes < 4) fails.push(`walls lanes ${o.lanes} (want >=4)`);
  if (!o.door) fails.push('no + New estimate door');
  if (!o.aiAssistBtnStyle) fails.push('editor photos controls missing');
  if (!o.estMenu) fails.push('#pEstMenu missing from the profile');
  for (const name of ['showAICreate', 'showOutput', 'normalizeAI', 'cr-tmpl-ai-create',
                      'cr-tmpl-ai-output', "'/api/estimate'", 'forEstimate', 'checkAI',
                      'generateEstimate'])
    if (!contextOK(html, name)) fails.push(`live reference survives: ${name}`);
  return fails;
}

const html = readFileSync(FILE, 'utf8');
const o = await sweep(html);
const fails = judge(html, o);
/* repo-side checks (artifact leg only) */
if (existsSync(REPO + 'api/estimate.js')) fails.push('api/estimate.js still exists');
const vj = readFileSync(REPO + 'vercel.json', 'utf8');
if (vj.includes('api/estimate.js')) fails.push('vercel.json still lists api/estimate.js');
const e2c = readFileSync(REPO + 'api/estimate-to-contract.js', 'utf8');
if (!e2c.includes('retired at build 1033')) fails.push('estimate-to-contract still accepts ai_estimate_id');
for (const f of fails) console.log('  FAIL ' + f);
console.log(fails.length ? `GATE 1033 RED — ${fails.length} failure(s)` : 'GATE 1033 GREEN — five states clean, arm gone, api gone');

if (CONTROL) {
  const chtml = readFileSync(CONTROL, 'utf8');
  const co = await sweep(chtml);
  const cfails = judge(chtml, co);
  console.log(`CONTROL (${CONTROL.split('/').pop()}): ${cfails.length} named failure(s) — ${cfails.length ? 'RED as expected' : 'UNEXPECTEDLY CLEAN'}`);
  for (const f of cfails.slice(0, 6)) console.log('    control-fail ' + f);
  if (!cfails.length) { console.log('a control that cannot fail proves nothing'); process.exit(1); }
}
process.exit(fails.length ? 1 : 0);
