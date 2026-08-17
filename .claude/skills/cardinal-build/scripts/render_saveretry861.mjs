/* Build 861 gate — punch-card save() retries a dropped network request.
 *  A) transient "Load failed" x2 then success -> save succeeds, NO alert (3 update calls)
 *  B) a real refusal (ok:false) -> NOT retried, alert shown (1 update call)
 *  C) persistent "Load failed" -> gives up after 3 tries, alert shown (3 update calls)
 * v860 has no retry -> A alerts and calls update once -> RED.
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
const TAG = FILE.includes('860') ? '860' : '861';
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
  const r = await page.evaluate(async () => {
    try { if (window.CardinalPunch && window.CardinalPunch.reload) await window.CardinalPunch.reload(); } catch(e){}
    window.currentUser = { email: 'curtis@cardinalrenovations.net' };
    window.CardinalPunchCard.open('pi1', { back: 'none' });
    await new Promise(r => setTimeout(r, 350));
    // capture alerts
    var alerts = []; window.alert = function(m){ alerts.push(String(m)); };
    var card = document.getElementById('cr-pk');
    async function sendMsg(text){
      var inp = card.querySelector('[data-f="msg"]');
      inp.value = text;
      var before = alerts.length;
      card.querySelector('[data-act="send"]').click();
      // wait for the retry chain to settle (max ~1.5s)
      await new Promise(r => setTimeout(r, 1700));
      return alerts.length - before;
    }
    var out = {};
    // A) transient: fail twice then succeed
    var calls = 0;
    window.CardinalPunch.update = function(){ calls++; if (calls < 3) return Promise.reject(new TypeError('Load failed')); return Promise.resolve({ ok: true }); };
    var aA = await sendMsg('transient one');
    out.A_calls = calls; out.A_alerts = aA;

    // B) refusal: never retried
    calls = 0;
    window.CardinalPunch.update = function(){ calls++; return Promise.resolve({ ok: false, error: 'write refused' }); };
    var aB = await sendMsg('refused one');
    out.B_calls = calls; out.B_alerts = aB;

    // C) persistent network failure: give up after 3
    calls = 0;
    window.CardinalPunch.update = function(){ calls++; return Promise.reject(new TypeError('Load failed')); };
    var aC = await sendMsg('persistent one');
    out.C_calls = calls; out.C_alerts = aC;
    return out;
  });
  ok('A: transient blip retried to success (3 update calls)', r.A_calls === 3, r.A_calls);
  ok('A: no error alert on transient recovery', r.A_alerts === 0, r.A_alerts);
  ok('B: a real refusal is NOT retried (1 update call)', r.B_calls === 1, r.B_calls);
  ok('B: refusal surfaces an alert', r.B_alerts === 1, r.B_alerts);
  ok('C: persistent failure gives up after 3 tries', r.C_calls === 3, r.C_calls);
  ok('C: persistent failure alerts once', r.C_alerts === 1, r.C_alerts);
  console.log(`\n${fail === 0 ? 'GREEN' : 'RED'} — ${pass} passed, ${fail} failed   ${errs.length ? '(pageerrors: ' + errs.slice(0,2).join(' | ') + ')' : ''}`);
} catch (e) { console.log('HARNESS ERROR: ' + String(e).slice(0,200)); console.log(errs.slice(0,3).join(' | ')); fail++; } finally { await browser.close(); }
process.exit(fail === 0 ? 0 : 1);
