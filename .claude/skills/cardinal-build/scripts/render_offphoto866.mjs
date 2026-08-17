/* Build 866 gate — offline photo capture on the punch-out card.
 *  offline: _queuePhoto stores the blob -> _pendingPhotos()>=1, the card shows .pkpnote
 *  online : _flushPhotos uploads + appends -> pending drains to 0, the item gains a photo
 * v865 has no _queuePhoto -> RED.
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
const TAG = FILE.includes('865') ? '865' : '866';
const SEED = {
  team_profiles: [{ email: 'curtis@cardinalrenovations.net', name: 'Curtis', role: 'production' }],
  projects: [{ id: 'p2', name: 'Marcus Cole', address: '88 Oak', stage: 'Approved', checklist: {} }],
  punch_items: [{ id: 'pi1', title: 'Reattach fascia', project_id: 'p2', assigned_to: 'curtis@cardinalrenovations.net', status: 'open', priority: 'high', photos: [], steps: [], comments: [] }],
  crews: [], crew_work_orders: [], crew_rates: [], pricing_items: [], appointments: [], inspection_reports: [], estimates: [], insurance_claims: [],
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
try {
  await page.goto('https://app.cardinalroster.com/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.CardinalPunchCard && window.CardinalPunchCard.open && window.CardinalPunch, { timeout: 20000 });
  await page.evaluate(async () => {
    try { if (window.CardinalPunch && window.CardinalPunch.reload) await window.CardinalPunch.reload(); } catch(e){}
    window.currentUser = { email: 'curtis@cardinalrenovations.net' };
    window.CardinalPunchCard.open('pi1', { back: 'none' });
    await new Promise(r => setTimeout(r, 350));
  });
  const hasHooks = await page.evaluate(() => !!(window.CardinalPunchCard && window.CardinalPunchCard._queuePhoto));
  ok('offline-photo hooks present', hasHooks);

  // OFFLINE capture (queue the blob)
  const q = await page.evaluate(async () => {
    if (!window.CardinalPunchCard._queuePhoto) return { pend: -1, note: false };
    var blob = new Blob([new Uint8Array([1,2,3,4])], { type: 'image/jpeg' });
    await window.CardinalPunchCard._queuePhoto('pi1', blob);
    await new Promise(r => setTimeout(r, 150));
    var pend = await window.CardinalPunchCard._pendingPhotos();
    var card = document.getElementById('cr-pk');
    return { pend: pend, note: !!(card && card.querySelector('.pkpnote')) };
  });
  ok('offline photo was queued on the device (pending >= 1)', q.pend >= 1, q.pend);
  ok('the card shows the "saved on your phone" note', q.note);

  // ONLINE flush (upload + append)
  const f = await page.evaluate(async () => {
    if (!window.CardinalPunchCard._flushPhotos) return { pend: -1, photos: -1 };
    await window.CardinalPunchCard._flushPhotos();
    await new Promise(r => setTimeout(r, 300));
    var pend = await window.CardinalPunchCard._pendingPhotos();
    var cx = window.sb || window.supa;
    var cur = await cx.from('punch_items').select('photos').eq('id', 'pi1').single();
    var photos = (cur && cur.data && Array.isArray(cur.data.photos)) ? cur.data.photos.length : -1;
    var card = document.getElementById('cr-pk');
    return { pend: pend, photos: photos, noteGone: !(card && card.querySelector('.pkpnote')) };
  });
  ok('back online: the photo queue drained to 0', f.pend === 0, f.pend);
  ok('the photo was uploaded and APPENDED to the item', f.photos === 1, f.photos);
  ok('the "saved on your phone" note cleared', f.noteGone);

  console.log(`\n${fail === 0 ? 'GREEN' : 'RED'} — ${pass} passed, ${fail} failed   ${errs.length ? '(pageerrors: ' + errs.slice(0,2).join(' | ') + ')' : ''}`);
} catch (e) { console.log('HARNESS ERROR: ' + String(e).slice(0,200)); console.log(errs.slice(0,3).join(' | ')); fail++; } finally { await browser.close(); }
process.exit(fail === 0 ? 0 : 1);
