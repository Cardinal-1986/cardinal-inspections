/*
 * Build 891 gate — WO field polish.
 * Boots the REAL app and drives the shipped woBody() to assert:
 *   - Job block address resolves from pr.location and checklist.lead.location when
 *     the pr.address column is empty (the reported blank-address bug)
 *   - layers is a <select data-wo> (1-4) pre-selected from the inspection
 *   - condition is a <select data-wo> (Good/Fair/Poor) pre-selected
 *   - shingle/drip colors are <select data-crsel occ|trim> carrying data-crsel-value
 *   - Scheduled is a date <input> when unset, formatted text when set
 *   - the Crew sign-off row is gone; the Cardinal one stays
 *   - wireWoFields exists and is a function; 890 features still intact
 * v890 has text layers/condition, bold-text colors, and a crew sign-off -> RED.
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
const TAG = FILE.includes('890') ? '890' : '891';
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
const ok = (l, c, extra) => { if (c) { pass++; console.log('  PASS ' + l); } else { fail++; console.log('  FAIL ' + l + (extra !== undefined ? '  -> ' + JSON.stringify(extra).slice(0, 180) : '')); } };
console.log(`artifact : ${FILE}  (build ${TAG})`);

try {
  await page.goto('https://app.cardinalroster.com/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof woBody === 'function', { timeout: 20000 });

  const r = await page.evaluate(() => {
    const crew = { trade: 'Roofing', name: 'Betos', legal_name: 'Betos', contact_name: 'A', contact_phone: '', contact_email: '' };
    const insp = { structure: 'House', layers: '2', decking: 'OSB', deckcond: 'Fair', rooftype: 'Asphalt', jacks: '3', vent_types: 'Ridge Vent', meas: { ridge: '42' } };
    // address only in pr.location (lead-created client, empty pr.address)
    const prLoc = { name: 'Marcus Cole', address: '', phone: '', id: 'p1', location: { street: '88 Oak St', city: 'Dayton', state: 'OH', zip: '45402' }, checklist: JSON.stringify(insp) };
    // address only in checklist.lead.location
    const prLead = { name: 'Jane Doe', address: '', phone: '', id: 'p2', checklist: JSON.stringify(Object.assign({ lead: { location: { street: '5 Elm', city: 'Kettering', state: 'OH', zip: '45409' }, phones: ['(937) 555-0000'] } }, insp)) };
    const o = { wo_number: 'WO-1', issued: 'x', scope: 's', shingle: 'Estate Gray', drip: 'White' };
    return {
      loc: woBody(prLoc, crew, null, {}, Object.assign({ scheduled_on: null, closeout: false }, o)),
      lead: woBody(prLead, crew, null, {}, Object.assign({ scheduled_on: null }, o)),
      dated: woBody(prLoc, crew, null, {}, Object.assign({ scheduled_on: '2026-08-19' }, o)),
      hasWireWo: typeof wireWoFields === 'function',
    };
  });
  const L = r.loc, LE = r.lead, D = r.dated;

  // --- address autofill ---
  ok('address composed from pr.location', L.includes('88 Oak St, Dayton, OH 45402'), L.match(/Address[\s\S]{0,80}/));
  ok('address composed from checklist.lead.location', LE.includes('5 Elm, Kettering, OH 45409'));
  ok('homeowner name present (Marcus Cole)', /Homeowner<\/td><td[^>]*>[^<]*Marcus Cole/.test(L) || L.includes('Marcus Cole'));
  ok('phone from lead.phones when column empty', LE.includes('(937) 555-0000'));

  // --- layers dropdown ---
  ok('layers is a <select data-wo>', /Existing layers to remove<\/td><td[^>]*><select data-wo class="crsel" contenteditable="false">/.test(L), L.match(/Existing layers[\s\S]{0,90}/));
  ok('layers has options 1-4', /<option value="1"/.test(L) && /<option value="4"/.test(L));
  ok('layers pre-selects the inspection value (2)', /<option value="2" selected>/.test(L));

  // --- condition dropdown ---
  ok('condition is a <select data-wo> Good/Fair/Poor', /Condition at inspection<\/td><td[^>]*><select data-wo/.test(L) && /<option value="Good"/.test(L) && /<option value="Poor"/.test(L));
  ok('condition pre-selects Fair', /<option value="Fair" selected>/.test(L));

  // --- color dropdowns ---
  ok('shingle color is a crsel occ dropdown carrying the contract value', /data-crsel="occ" contenteditable="false" data-crsel-value="Estate Gray"/.test(L));
  ok('drip edge color is a crsel trim dropdown carrying the value', /data-crsel="trim" contenteditable="false" data-crsel-value="White"/.test(L));

  // --- scheduled date picker ---
  ok('scheduled unset -> date input', /Scheduled<\/td><td[^>]*><input type="date" data-wo/.test(L), L.match(/Scheduled[\s\S]{0,80}/));
  ok('scheduled set -> formatted text, no date input', /Aug 19, 2026/.test(D) && !/<input type="date"/.test(D));

  // --- sign-off ---
  ok('crew sign-off row removed', !/Crew accepted by/.test(L));
  ok('cardinal sign-off kept', /Cardinal<\/td>/.test(L));

  // --- persistence hook + 890 features intact ---
  ok('wireWoFields is a function (parsed + global)', r.hasWireWo);
  ok('components section still present', /New Roof &#8212; Components<\/h2>/.test(L));
  ok('satellite still three-state', /<\/span> Detach &amp; Reset/.test(L) && L.includes('data-group="wo-sat"'));
  ok('still no estimate cover', !/Estimate #/.test(L) && !/Valid Through/.test(L));

  console.log(`\n${fail === 0 ? 'GREEN' : 'RED'} — ${pass} passed, ${fail} failed   ${errs.length ? '(pageerrors: ' + errs.slice(0, 2).join(' | ') + ')' : ''}`);
} catch (e) { console.log('HARNESS ERROR: ' + String(e).slice(0, 300)); console.log(errs.slice(0, 3).join(' | ')); fail++; } finally { await browser.close(); }
process.exit(fail === 0 ? 0 : 1);
