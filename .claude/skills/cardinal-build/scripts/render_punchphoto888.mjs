/*
 * Build 888 gate (was 876; rebased onto main@887) — punch-out photos upload the
 * REAL file, not the CardinalSolUpload.prepare() wrapper.
 * Boots the REAL app, opens a punch card, drives pickPhoto for real:
 *   - stubs prepare() to return the WRAPPER { file: <5000-byte File> } (its true contract),
 *   - captures the body handed to storage.upload,
 *   - picks a file through the filechooser the app opens.
 * PASS when upload receives a Blob/File of the prepared bytes (5000), NOT the
 * wrapper object that serialises to the 11-byte {"file":{}}.
 * v887 uploads the wrapper -> body is a plain object -> RED.
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
const TAG = FILE.includes('887') ? '887' : '888';
const SEED = {
  team_profiles: [{ email: 'curtis@cardinalrenovations.net', name: 'Curtis', role: 'production' }],
  punch_items: [{ id: 'pi1', title: 'Reattach fascia', project_id: 'p2', assigned_to: 'curtis@cardinalrenovations.net', status: 'open', priority: 'high', photos: [], steps: [], comments: [] }],
  projects: [{ id: 'p2', name: 'Marcus Cole', address: '88 Oak', stage: 'Approved', checklist: {} }],
  crews: [], crew_work_orders: [], crew_rates: [], pricing_items: [], appointments: [], inspection_reports: [], estimates: [], insurance_claims: [], project_photos: [],
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
const ok = (l, c, extra) => { if (c) { pass++; console.log('  PASS ' + l); } else { fail++; console.log('  FAIL ' + l + (extra !== undefined ? '  -> ' + JSON.stringify(extra) : '')); } };
console.log(`artifact : ${FILE}  (build ${TAG})`);
page.on('filechooser', async fc => { try { await fc.setFiles({ name: 'camera.jpg', mimeType: 'image/jpeg', buffer: Buffer.from(new Uint8Array(1234)) }); } catch (e) {} });
try {
  await page.goto('https://app.cardinalroster.com/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.CardinalPunchCard && window.CardinalPunchCard.open, { timeout: 20000 });
  await page.evaluate(async () => {
    try { if (window.CardinalPunch && window.CardinalPunch.reload) await window.CardinalPunch.reload(); } catch (e) {}
    window.currentUser = { email: 'curtis@cardinalrenovations.net' };
    window.alert = function () {};
    window.CardinalSolUpload = { prepare: async function () { return { file: new File([new Uint8Array(5000)], 'prepared.jpg', { type: 'image/jpeg' }) }; } };
    window.__up = null;
    window.sb.storage.from = function (b) {
      return {
        upload: function (path, body, opts) {
          window.__up = { path: path, isBlob: (typeof Blob !== 'undefined' && body instanceof Blob), size: body && body.size, ctor: body && body.constructor && body.constructor.name };
          return Promise.resolve({ data: { path: path }, error: null });
        },
        getPublicUrl: function (p) { return { data: { publicUrl: 'blob:mock/' + p } }; },
      };
    };
    window.CardinalPunchCard.open('pi1', { back: 'none' });
    await new Promise(r => setTimeout(r, 350));
  });
  const card = await page.evaluate(() => ({ open: !!document.querySelector('#cr-pk .pkslot'), slots: document.querySelectorAll('#cr-pk [data-slot]').length }));
  ok('punch card open with photo slots', card.open && card.slots > 0, card);
  await page.click('#cr-pk [data-slot="0"]');
  await page.waitForFunction(() => window.__up !== null, { timeout: 8000 }).catch(() => {});
  const up = await page.evaluate(() => window.__up);
  ok('storage.upload was called', !!up, up);
  ok('upload body is a Blob/File (not the wrapper object)', !!(up && up.isBlob), up);
  ok('upload body carries the prepared bytes (5000), not 11', !!(up && up.size === 5000), up && up.size);
  ok('upload body is not a plain Object', !!(up && up.ctor !== 'Object'), up && up.ctor);
  console.log(`\n${fail === 0 ? 'GREEN' : 'RED'} — ${pass} passed, ${fail} failed   ${errs.length ? '(pageerrors: ' + errs.slice(0, 2).join(' | ') + ')' : ''}`);
} catch (e) { console.log('HARNESS ERROR: ' + String(e).slice(0, 200)); console.log(errs.slice(0, 3).join(' | ')); fail++; } finally { await browser.close(); }
process.exit(fail === 0 ? 0 : 1);
