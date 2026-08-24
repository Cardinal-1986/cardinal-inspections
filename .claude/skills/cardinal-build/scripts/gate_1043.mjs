/* gate_1043.mjs — build 1043 (audit O1, pick B): the board's desktop fold.
 * Rig as Curtis, prodhome state, three widths:
 *   1440 + 1194 : .pbwrap computes display:grid and .pbmonth sits BESIDE
 *                 .pbtiles (month's right edge <= tiles' left edge), with the
 *                 tiles' top at-or-above the month's top — the work no longer
 *                 starts below a full-viewport calendar;
 *   1920        : the ultrawide grid still applies (unchanged);
 *   390         : single column untouched — month ABOVE tiles, no grid.
 * Run:  node gate_1043.mjs <artifact> [--control <index_1042>]
 * Control must go RED at 1440/1194 (block layout, month above tiles).
 */
import { readFileSync, existsSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium;
for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright/index.js']) {
  try { chromium = require(p).chromium; break; } catch (e) {}
}
if (!chromium) { console.error('gate_1043: playwright not found'); process.exit(2); }

const argv = process.argv.slice(2);
const FILE = argv.find(a => !a.startsWith('--'));
const ci = argv.indexOf('--control');
const CONTROL = ci !== -1 ? argv[ci + 1] : null;
if (!FILE || !existsSync(FILE)) { console.error('usage: node gate_1043.mjs <index.html> [--control prev]'); process.exit(2); }

const SKILL = new URL('.', import.meta.url).pathname;
const SETUP_JS = ['sentinel_setup_cardinal.js', 'sentinel_setup_production.js', 'e2e_mock_supa.js']
  .map(f => readFileSync(SKILL + f, 'utf8')).join('\n;\n');
const PNG1 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

async function probeAt(browser, html, w, h) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  const page = await ctx.newPage();
  await page.route('**/*', r => {
    const u = r.request().url();
    if (u.startsWith('https://sentinel.test/') && !/\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(u))
      return r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: html });
    if (/\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(u)) return r.fulfill({ status: 200, contentType: 'image/png', body: PNG1 });
    return r.fulfill({ status: 200, body: '' });
  });
  await page.addInitScript(SETUP_JS);
  await page.goto('https://sentinel.test/?as=curtis', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);
  await page.evaluate(`window.__sentinelStates[0].run()`);
  await page.waitForTimeout(900);
  const out = await page.evaluate(`(function(){
    var wrap = document.querySelector('#cr-pb .pbwrap');
    var mon = document.querySelector('#cr-pb .pbmonth');
    var tiles = document.querySelector('#cr-pb .pbtiles');
    if(!wrap || !mon || !tiles) return { missing: true };
    var m = mon.getBoundingClientRect(), t = tiles.getBoundingClientRect();
    return { disp: getComputedStyle(wrap).display,
             beside: m.right <= t.left + 1 && Math.abs(m.top - t.top) < 200,
             monthAboveTiles: m.bottom <= t.top + 1 };
  })()`);
  await ctx.close();
  return out;
}

async function sweep(html) {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' })
    .catch(() => chromium.launch());
  const out = {
    d1440: await probeAt(browser, html, 1440, 900),
    d1194: await probeAt(browser, html, 1194, 834),
    d1920: await probeAt(browser, html, 1920, 1000),
    phone: await probeAt(browser, html, 390, 844),
  };
  await browser.close();
  return out;
}

function judge(r) {
  const fails = [];
  for (const k of ['d1440', 'd1194', 'd1920', 'phone'])
    if (!r[k] || r[k].missing) return [`${k}: board elements missing (rig fault — proves nothing)`];
  for (const k of ['d1440', 'd1194']) {
    if (r[k].disp !== 'grid') fails.push(`${k}: .pbwrap display=${r[k].disp} (want grid)`);
    if (!r[k].beside) fails.push(`${k}: the month is not beside the boxes — the work still starts at the fold`);
  }
  if (r.d1920.disp !== 'grid' || !r.d1920.beside) fails.push('1920: the ultrawide grid regressed');
  if (r.phone.disp === 'grid') fails.push('390: the phone caught the desktop grid — must stay single column');
  if (!r.phone.monthAboveTiles) fails.push('390: phone order changed (month must stay above the tiles)');
  return fails;
}

const html = readFileSync(FILE, 'utf8');
const fails = judge(await sweep(html));
for (const f of fails) console.log('  FAIL ' + f);
console.log(fails.length ? `GATE 1043 RED — ${fails.length} failure(s)` : 'GATE 1043 GREEN — side-by-side at 1194/1440, ultrawide and phone untouched');

if (CONTROL) {
  const cfails = judge(await sweep(readFileSync(CONTROL, 'utf8')));
  console.log(`CONTROL (${CONTROL.split('/').pop()}): ${cfails.length} named failure(s) — ${cfails.length ? 'RED as expected' : 'UNEXPECTEDLY CLEAN'}`);
  for (const f of cfails.slice(0, 4)) console.log('    control-fail ' + f);
  if (!cfails.length) { console.log('a control that cannot fail proves nothing'); process.exit(1); }
}
process.exit(fails.length ? 1 : 0);
