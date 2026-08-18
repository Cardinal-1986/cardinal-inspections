/*
 * Build 890 gate — components list, 3-state satellite, optional post-job closeout.
 * Boots the REAL app and drives the shipped woBody() three ways:
 *   A) inspected roofing job WITH a dish + closeout ON
 *   B) inspected roofing job with NO dish, closeout OFF
 *   C) NO inspection at all
 * Asserts the New Roof components autofill, the satellite three-state logic, the
 * optional closeout, and the weather-permitting note.
 * v889 has Yes/No satellite, no components, no closeout -> RED.
 */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium;
for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright/index.js', 'playwright-core']) { try { chromium = require(p).chromium; break; } catch (e) {} }
if (!chromium) { console.error('playwright not found'); process.exit(2); }
import { readFileSync } from 'fs';
const FILE = process.argv[2] || '/home/user/cardinal-inspections/index.html';
const APP_HTML = readFileSync(FILE, 'utf8');
const MOCK = readFileSync(new URL('./e2e_mock_supa.js', import.meta.url), 'utf8');
const TAG = FILE.includes('889') ? '889' : '890';
const SEED = { crews: [], projects: [], team_profiles: [{ email: 'theo@cardinalrenovations.net', name: 'Theo', role: 'admin' }], crew_rates: [], pricing_items: [], inspection_reports: [], appointments: [], estimates: [], insurance_claims: [], project_photos: [], crew_work_orders: [] };
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 900 } });
const page = await ctx.newPage();
const errs = []; page.on('pageerror', e => errs.push(String(e.message || e)));
await page.route('**/*', async route => {
  const url = route.request().url(), rt = route.request().resourceType();
  if (url === 'https://app.cardinalroster.com/' || url === 'https://app.cardinalroster.com/index.html') return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: APP_HTML });
  if (url.includes('@supabase/supabase-js')) return route.fulfill({ status: 200, contentType: 'application/javascript', body: MOCK });
  if (url.includes('chart.js') || url.includes('papaparse')) return route.fulfill({ status: 200, contentType: 'application/javascript', body: 'window.Chart=function(){};window.Papa={parse:()=>({data:[]}),unparse:()=>""};' });
  if (url.startsWith('https://app.cardinalroster.com/api/')) return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  if (rt === 'image' || rt === 'font' || rt === 'media' || rt === 'stylesheet') return route.abort();
  if (url.startsWith('https://app.cardinalroster.com/')) return route.fulfill({ status: 200, body: '' });
  return route.abort();
});
await page.addInitScript(seed => { window.__SEED__ = seed; }, SEED);
await page.addInitScript(MOCK);
let pass = 0, fail = 0;
const ok = (l, c, extra) => { if (c) { pass++; console.log('  PASS ' + l); } else { fail++; console.log('  FAIL ' + l + (extra !== undefined ? '  -> ' + JSON.stringify(extra).slice(0, 160) : '')); } };
console.log(`artifact : ${FILE}  (build ${TAG})`);

try {
  await page.goto('https://app.cardinalroster.com/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof woBody === 'function', { timeout: 20000 });

  const docs = await page.evaluate(() => {
    const crew = { trade: 'Roofing', name: 'Betos', legal_name: 'Betos', contact_name: 'A', contact_phone: '', contact_email: '' };
    const insp = (over) => Object.assign({
      structure: 'House', layers: '2', decking: 'OSB', deckcond: 'Fair', rooftype: 'Asphalt',
      jacks: '3', boot: 'Yes', flash: 'Yes', bathvents: '2', kitchvents: '1',
      vent_types: 'Ridge Vent, Box Vents / Turtles', notes: 'Dogs on site',
      meas: { sq: '24.3', ridge: '42', valley: '38', eave: '96', rake: '64', source: 'Roofr' }
    }, over || {});
    const prWithDish = { name: 'A', address: 'x', phone: '', id: 'p1', checklist: JSON.stringify(insp({ sat: 'Dish on south slope' })) };
    const prNoDish = { name: 'A', address: 'x', phone: '', id: 'p2', checklist: JSON.stringify(insp({ sat: '' })) };
    const prNoInsp = { name: 'A', address: 'x', phone: '', id: 'p3', checklist: '{}' };
    const o = { wo_number: 'WO-1', issued: 'x', scheduled_on: '2026-08-19', scope: 's' };
    return {
      A: woBody(prWithDish, crew, null, {}, Object.assign({ closeout: true }, o)),
      B: woBody(prNoDish, crew, null, {}, Object.assign({ closeout: false }, o)),
      C: woBody(prNoInsp, crew, null, {}, Object.assign({ closeout: false }, o)),
    };
  });
  const A = docs.A, B = docs.B, C = docs.C;
  const box = (on) => on ? '&#9745;|\\u2611|☑' : '';

  // --- Components section ---
  ok('A: New Roof — Components section present', /New Roof &#8212; Components<\/h2>/.test(A));
  ok('A: pipe jacks autofilled (3)', /Pipe jacks<\/td><td[^>]*>3</.test(A), A.match(/Pipe jacks[\s\S]{0,40}/));
  ok('A: box vents ticked (vent_types has box)', /Box vents \/ turtles<\/td><td[^>]*><span class="cbx">(&#9745;|☑)/.test(A));
  ok('A: power vent NOT ticked (not in vent_types)', /Power vent<\/td><td[^>]*><span class="cbx">(&#9744;|☐)/.test(A));
  ok('A: ridge vent ticked + length from meas (42 lf)', /Ridge vent<\/td><td[^>]*><span class="cbx">(&#9745;|☑)<\/span>[\s\S]*?42 lf/.test(A));
  ok('A: bath/kitchen vents autofilled (2 / 1)', /2 bath[\s\S]*?1 kitchen/.test(A));
  ok('A: chimney flashing S/M/L fill-in', /Chimney flashing<\/td>[\s\S]*?data-group="wo-chim"/.test(A));

  // --- Satellite three-state ---
  ok('A: satellite has Detach & Reset / Remove / None', /<\/span> Detach &amp; Reset/.test(A) && /<\/span> Remove/.test(A) && /<\/span> None/.test(A) && A.includes('data-group="wo-sat"'));
  ok('A: dish present flagged', /dish present/.test(A));
  ok('A: with a dish, None is NOT pre-ticked', /(&#9745;|☑)<\/span> None/.test(A) === false, A.match(/[^ ]* None/));
  ok('B: no dish -> None pre-ticked', /(&#9745;|☑)<\/span> None/.test(B));
  ok('B: no dish -> not flagged as present', !/dish present/.test(B));
  ok('C: no inspection -> nothing pre-ticked (blank)', !/(&#9745;|☑)<\/span> None/.test(C) && !/dish present/.test(C));

  // --- Optional closeout ---
  ok('A: closeout ON -> Post-Job Closeout section present', /Post-Job Closeout<\/h2>/.test(A) && /Non-returnable/.test(A) && /Lot#/.test(A));
  ok('B: closeout OFF -> no closeout section', !/Post-Job Closeout/.test(B));

  // --- Weather note ---
  ok('A: weather-permitting note present', /weather permitting/i.test(A));

  // --- 889 features still intact ---
  ok('A: measurement board still present', /24\.3<\/div>/.test(A) && /Squares<\/div>/.test(A));
  ok('A: colors section still present', /Colors &#8212; confirm before install<\/h2>/.test(A));
  ok('A: still no estimate cover', !/Estimate #/.test(A) && !/Valid Through/.test(A));

  console.log(`\n${fail === 0 ? 'GREEN' : 'RED'} — ${pass} passed, ${fail} failed   ${errs.length ? '(pageerrors: ' + errs.slice(0, 2).join(' | ') + ')' : ''}`);
} catch (e) { console.log('HARNESS ERROR: ' + String(e).slice(0, 300)); console.log(errs.slice(0, 3).join(' | ')); fail++; } finally { await browser.close(); }
process.exit(fail === 0 ? 0 : 1);
