/* gate_1035.mjs — build 1035: the Landing label reads in light mode.
 * Computed ink of the left rail's Landing label, both themes, at desktop width:
 * dark stays the true yellow #f0c651; light is 538's amber #8a6100 (the
 * obsidian-tiles pattern: same hue deepened, never swapped).
 * Run:  node gate_1035.mjs <artifact> [--control <prev>]
 * The control must go RED (yellow computed in light too).
 */
import { readFileSync, existsSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium;
for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright/index.js']) {
  try { chromium = require(p).chromium; break; } catch (e) {}
}
if (!chromium) { console.error('gate_1035: playwright not found'); process.exit(2); }

const argv = process.argv.slice(2);
const FILE = argv.find(a => !a.startsWith('--'));
const ci = argv.indexOf('--control');
const CONTROL = ci !== -1 ? argv[ci + 1] : null;
if (!FILE || !existsSync(FILE)) { console.error('usage: node gate_1035.mjs <index.html> [--control prev]'); process.exit(2); }

const SKILL = new URL('.', import.meta.url).pathname;
const SETUP_JS = ['sentinel_setup_cardinal.js', 'sentinel_setup_estimates.js', 'e2e_mock_supa.js']
  .map(f => readFileSync(SKILL + f, 'utf8')).join('\n;\n');
const PNG1 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

async function probe(html, light) {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' })
    .catch(() => chromium.launch());
  const ctx = await browser.newContext({ viewport: { width: 1194, height: 834 } });
  const page = await ctx.newPage();
  await page.route('**/*', r => {
    const u = r.request().url();
    if (u.startsWith('https://sentinel.test/') && !/\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(u))
      return r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: html });
    if (/\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(u)) return r.fulfill({ status: 200, contentType: 'image/png', body: PNG1 });
    return r.fulfill({ status: 200, body: '' });
  });
  await page.addInitScript(SETUP_JS);
  if (light) await page.addInitScript(`try{ localStorage.setItem('cardinal.theme.rb','1'); }catch(e){}`);
  await page.goto('https://sentinel.test/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  /* the rail mounts after the landing is left — run a sentinel state first */
  await page.evaluate(`Promise.resolve(window.__sentinelStates[0].run())`);
  await page.waitForTimeout(700);
  const ink = await page.evaluate(`(function(){
    /* 1299: the row is the SAME row (data-nav="landing"), but 1165 renamed its
       label to "Switch portal", and the rail keys data-k off the LABEL — so the
       rules on data-k="landing" stopped matching anything and the colour Theo
       chose at 539 silently fell off. Read the row by what it does, not by a
       name that moved. */
    var el = document.querySelector('#cr-lnav .lnav-item[data-k="switchportal"] .lnav-tx');
    /* J16: and a NORMAL row beside it, to compare against */
    var nb = document.querySelector('#cr-lnav .lnav-item[data-k="clients"] .lnav-tx');
    return (el ? getComputedStyle(el).color : 'MISSING') + '|' + (nb ? getComputedStyle(nb).color : 'MISSING');
  })()`);
  await browser.close();
  return ink;
}

/* J16 (judge 16 polish) — DELIBERATELY CHANGED. 539 painted the Landing door literal
   yellow (1035 deepened it to amber in light). "Switch portal" is a row now, not a
   door, and the judge read the gold as stray; the coordinator's brief sends it to the
   rail's NORMAL ink in both themes. So the row must match its neighbour (Clients)
   and must not be the yellow or the amber. */
function judge(dark, lite) {
  const fails = [];
  const [d, dn] = String(dark).split('|'), [l, ln] = String(lite).split('|');
  if (d === 'MISSING' || d !== dn || d === 'rgb(240, 198, 81)') fails.push(`Switch portal dark ${d} (want the normal rail ink ${dn}, not the yellow)`);
  if (l === 'MISSING' || l !== ln || l === 'rgb(138, 97, 0)') fails.push(`Switch portal light ${l} (want the normal rail ink ${ln}, not the amber)`);
  return fails;
}

const html = readFileSync(FILE, 'utf8');
const fails = judge(await probe(html, false), await probe(html, true));
for (const f of fails) console.log('  FAIL ' + f);
console.log(fails.length ? `GATE 1035 RED — ${fails.length} failure(s)` : 'GATE 1035 GREEN — Switch portal wears the normal rail ink in both themes (J16)');

if (CONTROL) {
  const chtml = readFileSync(CONTROL, 'utf8');
  const cfails = judge(await probe(chtml, false), await probe(chtml, true));
  console.log(`CONTROL (${CONTROL.split('/').pop()}): ${cfails.length} named failure(s) — ${cfails.length ? 'RED as expected' : 'UNEXPECTEDLY CLEAN'}`);
  for (const f of cfails.slice(0, 3)) console.log('    control-fail ' + f);
  if (!cfails.length) { console.log('a control that cannot fail proves nothing'); process.exit(1); }
}
process.exit(fails.length ? 1 : 0);
