/* gate_1025.mjs — build 1025: the obsidian estimates screens, finished.
 * Proves in a REAL engine (computed styles, not stylesheet text):
 *   [dark]  the Total + deposit amount are white; the DEPOSIT label #f0a3a9;
 *           the desktop nav head #8a95a9; Blank-estimate flat red w/ white label;
 *           the template menu is the dark panel; Balance Due (due) is rose on
 *           the dark band; Saved Estimates heading #9aa0a8.
 *   [light] UNSENT lane title #6d747d; profile subnote #5c5c5c; money captions
 *           #6c655e; Balance Due back to cardinal red.
 *   [text]  zero #e8ba15 / #c88a0f / red→gold gradients anywhere.
 * Run:  node gate_1025.mjs <artifact> [--control <prev>]
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
if (!chromium) { console.error('gate_1025: playwright not found'); process.exit(2); }

const argv = process.argv.slice(2);
const FILE = argv.find(a => !a.startsWith('--'));
const ci = argv.indexOf('--control');
const CONTROL = ci !== -1 ? argv[ci + 1] : null;
if (!FILE || !existsSync(FILE)) { console.error('usage: node gate_1025.mjs <index.html> [--control prev]'); process.exit(2); }

const SKILL = new URL('.', import.meta.url).pathname;
const SETUP_JS = ['sentinel_setup_cardinal.js', 'sentinel_setup_estimates.js', 'e2e_mock_supa.js']
  .map(f => readFileSync(SKILL + f, 'utf8')).join('\n;\n');
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
  if (light) await page.addInitScript(`try{ localStorage.setItem('cardinal.theme.rb','1'); }catch(e){}`);
  await page.goto('https://sentinel.test/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(900);
  const out = {};

  /* editor (state 1 = esteditor on the seeded draft) */
  await page.evaluate(`Promise.resolve(window.__sentinelStates[1].run())`);
  await page.waitForTimeout(500);
  Object.assign(out, await page.evaluate(`(function(){
    var g = s => { var e = document.querySelector(s); return e ? getComputedStyle(e).color : 'MISSING'; };
    return {
      grand: g('#cr-est-view .cr-est-totals .grand-val'),
      depAmt: g('#cr-est-view .cr-est-totals .deposit .amt'),
      depLbl: g('#cr-est-view .cr-est-totals .deposit span[style]'),
      navhead: g('#cr-est-view .cr-est-nav .navhead'),
    };
  })()`));

  /* standalone list (state 0 = eslist) — lane title ink */
  await page.evaluate(`Promise.resolve(window.__sentinelStates[0].run())`);
  await page.waitForTimeout(700);
  out.laneTitle = await page.evaluate(
    `(function(){ var e = document.querySelector('[data-cre-lanes] .gt'); return e ? getComputedStyle(e).color : 'MISSING'; })()`);

  /* profile (state 4 = estprofile) — button, menu, band, saved head, subnote */
  await page.evaluate(`Promise.resolve(window.__sentinelStates[4].run())`);
  await page.waitForTimeout(800);
  Object.assign(out, await page.evaluate(`(function(){
    var r = {};
    var b = document.getElementById('cr-est-new-btn');
    r.newBtnBg = b ? getComputedStyle(b).backgroundImage + '|' + getComputedStyle(b).backgroundColor : 'MISSING';
    r.newBtnInk = b ? getComputedStyle(b).color : 'MISSING';
    var m = document.getElementById('pEstMenu');
    if (m) m.style.display = 'block';
    r.menuBg = m ? getComputedStyle(m).backgroundColor : 'MISSING';
    var opt = m ? m.querySelector('.estopt') : null;
    r.optInk = opt ? getComputedStyle(opt).color : 'MISSING';
    if (m) m.style.display = 'none';
    var due = document.querySelector('#projectView .dbmoney b.db-due, #projectView .dbmoney b[style]');
    r.due = due ? getComputedStyle(due).color : 'MISSING';
    r.dueIsClass = !!document.querySelector('#projectView .dbmoney b.db-due');
    var h = document.querySelector('.cr-est-saved-list .head');
    r.savedHead = h ? getComputedStyle(h).color : 'MISSING';
    var sn = document.querySelector('#projectView .subnote');
    r.subnote = sn ? getComputedStyle(sn).color : 'MISSING';
    var sm = document.querySelector('#projectView .dbmoney small');
    r.moneySmall = sm ? getComputedStyle(sm).color : 'MISSING';
    return r;
  })()`));
  await browser.close();
  return out;
}

function judge(html, dark, lite) {
  const fails = [];
  const eq = (name, got, want) => { if (got !== want) fails.push(`${name}: ${got} (want ${want})`); };
  eq('Total ink (dark)', dark.grand, 'rgb(255, 255, 255)');
  eq('deposit amount (dark)', dark.depAmt, 'rgb(255, 255, 255)');
  eq('DEPOSIT label (dark)', dark.depLbl, 'rgb(240, 163, 169)');
  eq('navhead (dark)', dark.navhead, 'rgb(138, 149, 169)');
  eq('Blank-estimate ink', dark.newBtnInk, 'rgb(255, 255, 255)');
  if (dark.newBtnBg.includes('gradient')) fails.push('Blank-estimate still a gradient: ' + dark.newBtnBg.slice(0, 60));
  eq('template menu panel', dark.menuBg, 'rgb(30, 32, 39)');
  eq('menu option ink', dark.optInk, 'rgb(232, 230, 225)');
  eq('Balance Due (dark band)', dark.due, 'rgb(240, 138, 144)');
  if (!dark.dueIsClass) fails.push('Balance Due still inline-styled, not .db-due');
  eq('Saved Estimates head', dark.savedHead, 'rgb(154, 160, 168)');
  eq('UNSENT lane title (light)', lite.laneTitle, 'rgb(109, 116, 125)');
  eq('profile subnote (light)', lite.subnote, 'rgb(92, 92, 92)');
  eq('money caption (light)', lite.moneySmall, 'rgb(108, 101, 94)');
  eq('Balance Due (light)', lite.due, 'rgb(200, 32, 46)');
  for (const hex of ['#e8ba15', '#c88a0f']) {
    const n = (html.match(new RegExp(hex, 'gi')) || []).length;
    if (n) fails.push(`${hex} still present x${n}`);
  }
  return fails;
}

const html = readFileSync(FILE, 'utf8');
const dark = await sweep(html, false);
const lite = await sweep(html, true);
const fails = judge(html, dark, lite);
for (const f of fails) console.log('  FAIL ' + f);
console.log(fails.length ? `GATE 1025 RED — ${fails.length} failure(s)` : 'GATE 1025 GREEN — 16 checks');

if (CONTROL) {
  const chtml = readFileSync(CONTROL, 'utf8');
  const cd = await sweep(chtml, false);
  const cl = await sweep(chtml, true);
  const cfails = judge(chtml, cd, cl);
  console.log(`CONTROL (${CONTROL.split('/').pop()}): ${cfails.length} named failure(s) — ${cfails.length ? 'RED as expected' : 'UNEXPECTEDLY CLEAN'}`);
  for (const f of cfails.slice(0, 6)) console.log('    control-fail ' + f);
  if (!cfails.length) { console.log('a control that cannot fail proves nothing'); process.exit(1); }
}
process.exit(fails.length ? 1 : 0);
