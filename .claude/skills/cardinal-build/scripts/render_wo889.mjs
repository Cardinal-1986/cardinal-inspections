/*
 * Build 889 gate — the rebuilt crew Roofing Work Order.
 * Boots the REAL app and drives the SHIPPED woBody()/buildEstimate() with a
 * synthetic inspected roofing job, then asserts on the generated document HTML:
 *   - the new sections render (Measurements board, Tear-Off, Decking & Wood
 *     Replacement, Colors, Notes to Crew)
 *   - autofill: squares called out, layers from the checklist, satellite dish
 *     Yes pre-ticked from checklist.sat, the inspected decking type pre-ticked
 *   - colors carried from opts (shingle/drip) print
 *   - the estimate cover is STRIPPED for a work order (no "Estimate #",
 *     "Valid Through", "Prepared For", property photo, client-acceptance footer)
 *   - the New-work-order picker renders the shingle/drip color inputs
 * v888 has the old woBody and no isWO strip -> RED.
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
const TAG = FILE.includes('888') ? '888' : '889';
const SEED = {
  crews: [{ id: 'c1', trade: 'Roofing', name: 'Betos Home Improvements', legal_name: 'Betos Home Improvements', contact_name: 'Alberto', contact_phone: '(937) 555-0193', contact_email: '', archived: false }],
  projects: [{ id: 'p1', name: 'Marcus Cole', address: '88 Oak St, Dayton OH 45402', phone: '(937) 555-0148', stage: 'Approved', checklist: '{}' }],
  team_profiles: [{ email: 'theo@cardinalrenovations.net', name: 'Theo', role: 'admin' }],
  crew_rates: [], pricing_items: [], inspection_reports: [], appointments: [], estimates: [], insurance_claims: [], project_photos: [], crew_work_orders: [],
};
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
const ok = (l, c, extra) => { if (c) { pass++; console.log('  PASS ' + l); } else { fail++; console.log('  FAIL ' + l + (extra !== undefined ? '  -> ' + JSON.stringify(extra).slice(0, 200) : '')); } };
console.log(`artifact : ${FILE}  (build ${TAG})`);

try {
  await page.goto('https://app.cardinalroster.com/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof woBody === 'function' && typeof buildEstimate === 'function', { timeout: 20000 });

  // ---- build a real work-order document from an inspected roofing job ----
  const doc = await page.evaluate(() => {
    const pr = {
      name: 'Marcus Cole', address: '88 Oak St, Dayton OH 45402', phone: '(937) 555-0148', id: 'p1',
      checklist: JSON.stringify({
        structure: 'House', layers: '2', decking: 'OSB', deckcond: 'Fair',
        rooftype: 'Architectural asphalt', pitch: '6/12', sat: 'Dish on south slope',
        notes: 'Dogs on site — keep gate closed.',
        meas: { sq: '24.3', pitch: '6/12', ridge: '42', valley: '38', eave: '96', rake: '64', source: 'Roofr' }
      })
    };
    const crew = { trade: 'Roofing', name: 'Betos Home Improvements', legal_name: 'Betos Home Improvements', contact_name: 'Alberto', contact_phone: '(937) 555-0193', contact_email: '' };
    const opts = { wo_number: 'WO-1042', issued: 'Aug 17, 2026', scheduled_on: '2026-08-19', scope: 'Tear off to deck.', shingle: 'Estate Gray', drip: 'White' };
    return buildEstimate('WORK <span>ORDER</span>', woBody(pr, crew, null, {}, opts), (typeof WO_TERMS === 'string' ? WO_TERMS : ''));
  });

  // new sections present
  ok('Measurements section', /<h2 class="sec"><span class="num">\d+<\/span>Measurements<\/h2>/.test(doc));
  ok('Tear-Off section', /Tear-Off<\/h2>/.test(doc));
  ok('Decking & Wood Replacement section', /Decking &amp; Wood Replacement<\/h2>/.test(doc));
  ok('Colors section', /Colors &#8212; confirm before install<\/h2>/.test(doc));
  ok('Notes to Crew section', /Notes to Crew<\/h2>/.test(doc));

  // autofill
  ok('squares called out big (24.3)', doc.includes('>24.3</div>') && doc.includes('Squares</div>'));
  ok('measurement rows carry LF values', doc.includes('42 lf') && doc.includes('96 lf'));
  ok('existing layers autofilled (2)', /Existing layers to remove<\/td><td[^>]*>2</.test(doc), doc.match(/Existing layers to remove[\s\S]{0,60}/));
  /* 890 replaced the Yes/No satellite with Detach & Reset / Remove / None; a dish
     from the inspection is now flagged "dish present" rather than pre-ticking Yes. */
  ok('satellite dish flagged from inspection', /dish present/.test(doc) && doc.includes('data-group="wo-sat"'));
  ok('inspected decking type (OSB) pre-ticked', /☑<\/span> OSB/.test(doc) && doc.includes('data-group="wo-deck"'));
  ok('condition autofilled (Fair)', doc.includes('<b>Fair</b>'));
  ok('re-deck and sheets are fill-in', doc.includes('data-group="wo-redeck"') && /Sheets replaced/.test(doc));
  ok('structures Home/Garage/Shed present', doc.includes('Home') && doc.includes('Garage') && doc.includes('Shed'));

  // colors carried
  ok('shingle color carried (Estate Gray)', /Shingle color<\/td><td[^>]*><b>Estate Gray<\/b>/.test(doc));
  ok('drip edge color carried (White)', /Drip edge color<\/td><td[^>]*><b>White<\/b>/.test(doc));

  // notes autofill
  ok('notes carried from inspection', doc.includes('Dogs on site'));

  // estimate cover STRIPPED for a work order
  ok('no "Estimate #" on the work order', !/Estimate #/.test(doc), doc.match(/Estimate #/));
  ok('no "Valid Through"', !/Valid Through/.test(doc));
  ok('no "Prepared For" cover row', !/Prepared For/.test(doc));
  ok('no PROPERTY PHOTO block', !/PROPERTY PHOTO/.test(doc));
  ok('no client-acceptance "valid through" note', !/This estimate is valid through/.test(doc));
  ok('no "Client Acceptance" footer', !/Client Acceptance/.test(doc));

  // ---- the picker renders the color inputs ----
  const picker = await page.evaluate(async () => {
    window.currentProject = { id: 'p1', name: 'Marcus Cole', address: '88 Oak St', phone: '', checklist: '{}' };
    try { await openWorkOrderPicker(window.currentProject); } catch (e) { return { err: String(e) }; }
    await new Promise(r => setTimeout(r, 400));
    return { shingle: !!document.getElementById('woShingle'), drip: !!document.getElementById('woDrip'), scope: !!document.getElementById('woScope') };
  });
  ok('picker has Shingle color input', picker.shingle, picker);
  ok('picker has Drip edge color input', picker.drip, picker);

  console.log(`\n${fail === 0 ? 'GREEN' : 'RED'} — ${pass} passed, ${fail} failed   ${errs.length ? '(pageerrors: ' + errs.slice(0, 2).join(' | ') + ')' : ''}`);
} catch (e) { console.log('HARNESS ERROR: ' + String(e).slice(0, 300)); console.log(errs.slice(0, 3).join(' | ')); fail++; } finally { await browser.close(); }
process.exit(fail === 0 ? 0 : 1);
