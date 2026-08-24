/* gate_1039.mjs — build 1039: the production ink pass, proven on the cascade.
 * Boots the rig as Curtis, walks punchlist / punchcard / dispatch / prodcal in
 * BOTH themes, and reads the computed ink of each fixed element from a probe
 * node inside its real container — so specificity and theme scoping decide,
 * not the stylesheet text. Exact-rgb asserts (the gate_1035 pattern).
 * Run:  node gate_1039.mjs <artifact> [--control <index_1038>]
 * The control must go RED (old inks compute).
 */
import { readFileSync, existsSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium;
for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright/index.js']) {
  try { chromium = require(p).chromium; break; } catch (e) {}
}
if (!chromium) { console.error('gate_1039: playwright not found'); process.exit(2); }

const argv = process.argv.slice(2);
const FILE = argv.find(a => !a.startsWith('--'));
const ci = argv.indexOf('--control');
const CONTROL = ci !== -1 ? argv[ci + 1] : null;
if (!FILE || !existsSync(FILE)) { console.error('usage: node gate_1039.mjs <index.html> [--control prev]'); process.exit(2); }

const SKILL = new URL('.', import.meta.url).pathname;
const SETUP_JS = ['sentinel_setup_cardinal.js', 'sentinel_setup_production.js', 'e2e_mock_supa.js']
  .map(f => readFileSync(SKILL + f, 'utf8')).join('\n;\n');
const PNG1 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

/* container, tag+classes, css property, expected dark, expected light */
const PROBES = [
  ['#punchView',        'span.pu-tag.prio-normal', 'color',           'rgb(240, 169, 98)', 'rgb(138, 85, 0)'],
  ['#punchView',        'span.pu-tag.crm-retail',  'color',           'rgb(236, 112, 118)','rgb(143, 22, 32)'],
  ['#punchView',        'span.pu-st.on',           'color',           'rgb(63, 174, 106)', 'rgb(35, 116, 74)'],
  ['#cr-pk',            'button.pkvb.in',          'background-color','rgb(200, 32, 46)',  'rgb(143, 22, 32)'],
  ['#cr-disp .dcol',    'div.c.sun',               'color',           'rgb(131, 140, 153)','rgb(101, 108, 119)'],
  ['#cr-pb .pbday',     'span.cch.build',          'color',           'rgb(232, 109, 115)','rgb(143, 22, 32)'],
  ['#cr-pb .pbday',     'span.cch.punch',          'color',           'rgb(229, 134, 109)','rgb(168, 63, 36)'],
  ['#cr-pb .pbday',     'span.cch.done',           'color',           'rgb(108, 185, 143)','rgb(39, 107, 73)'],
];
const STATE_FOR = { '#punchView': 'punchlist', '#cr-pk': 'punchcard', '#cr-disp .dcol': 'dispatch', '#cr-pb .pbday': 'prodcal' };

async function sweep(html, light) {
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
  await page.goto('https://sentinel.test/?as=curtis', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);

  const byState = {};
  for (const [container] of PROBES) (byState[STATE_FOR[container]] = byState[STATE_FOR[container]] || []).push(container);
  const out = {};
  for (const [state, containers] of Object.entries(byState)) {
    await page.evaluate(`(function(){
      var s = (window.__sentinelStates || []).filter(function(x){ return x.name === '${state}'; })[0];
      return s ? s.run() : Promise.reject(new Error('state ${state} missing'));
    })()`);
    await page.waitForTimeout(900);
    for (const [container, spec, prop] of PROBES.filter(p => containers.includes(p[0]))) {
      out[container + '|' + spec] = await page.evaluate(`(function(){
        var host = document.querySelector(${JSON.stringify(container)});
        if(!host) return 'NOCONTAINER';
        var parts = ${JSON.stringify(spec)}.split('.');
        var el = document.createElement(parts[0]);
        el.className = parts.slice(1).join(' ');
        host.appendChild(el);
        var v = getComputedStyle(el).getPropertyValue(${JSON.stringify(prop)});
        el.remove();
        return v.trim();
      })()`);
    }
  }
  await ctx.close();
  await browser.close();
  return out;
}

function judge(dark, lite) {
  const fails = [];
  for (const [container, spec, prop, wantD, wantL] of PROBES) {
    const k = container + '|' + spec;
    if (dark[k] !== wantD) fails.push(`${spec} dark ${prop} = ${dark[k]} (want ${wantD})`);
    if (lite[k] !== wantL) fails.push(`${spec} light ${prop} = ${lite[k]} (want ${wantL})`);
  }
  return fails;
}

const html = readFileSync(FILE, 'utf8');
const fails = judge(await sweep(html, false), await sweep(html, true));
for (const f of fails) console.log('  FAIL ' + f);
console.log(fails.length ? `GATE 1039 RED — ${fails.length} failure(s)` : 'GATE 1039 GREEN — all 8 inks compute to the audited fixes in both themes');

if (CONTROL) {
  const chtml = readFileSync(CONTROL, 'utf8');
  const cfails = judge(await sweep(chtml, false), await sweep(chtml, true));
  console.log(`CONTROL (${CONTROL.split('/').pop()}): ${cfails.length} named failure(s) — ${cfails.length ? 'RED as expected' : 'UNEXPECTEDLY CLEAN'}`);
  for (const f of cfails.slice(0, 8)) console.log('    control-fail ' + f);
  if (!cfails.length) { console.log('a control that cannot fail proves nothing'); process.exit(1); }
}
process.exit(fails.length ? 1 : 0);
