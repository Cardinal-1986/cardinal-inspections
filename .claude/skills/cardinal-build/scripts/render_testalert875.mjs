/*
 * Build 875 gate — the "Send a test alert to myself" button.
 * Boots the REAL app, stubs window.notifyTeam (the existing /api/notify caller) and
 * clicks #testAlertBtn:
 *   - notifyTeam is called with ONLY the current user's email (never anyone else)
 *   - all-channels response -> readout shows Push sent / Email sent / Text sent
 *   - nothing-configured response -> readout says each channel is "not set up yet"
 *   - no-push-device response -> "no device enabled here yet"
 * v874 has no button -> RED.
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
const TAG = FILE.includes('874') ? '874' : '875';
const SEED = { projects: [], team_profiles: [], inspection_reports: [], appointments: [], estimates: [], contracts: [], collections: [], crew_work_orders: [], punch_items: [], crews: [], crew_rates: [], pricing_items: [], insurance_claims: [], project_photos: [] };
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
const ME = 'theo@cardinalrenovations.net';

async function clickWith(resp) {
  return page.evaluate(async (args) => {
    window.currentUser = { email: args.me };
    window.__notifyArgs = null;
    window.notifyTeam = function (to, subject, html) { window.__notifyArgs = { to: to, subject: subject, html: html }; return Promise.resolve(args.resp); };
    var btn = document.getElementById('testAlertBtn');
    if (!btn) return { present: false };
    btn.click();
    await new Promise(r => setTimeout(r, 250));
    var st = document.getElementById('testAlertStatus');
    return { present: true, args: window.__notifyArgs, status: st ? st.textContent : '' };
  }, { me: ME, resp });
}

try {
  await page.goto('https://app.cardinalroster.com/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.getElementById('pushEnableBtn') !== null, { timeout: 20000 });

  const exists = await page.evaluate(() => ({ btn: !!document.getElementById('testAlertBtn'), status: !!document.getElementById('testAlertStatus') }));
  ok('the "Send a test alert" button exists', exists.btn, exists);
  ok('the status line exists', exists.status);

  // Scenario 1: all channels succeed
  const r1 = await clickWith({ ok: true, sent: 2, mailed: 1, texted: 1, subs: 2, env: { resend: true, sms: true } });
  ok('button was present and clicked', r1.present);
  ok('notifyTeam called with ONLY the current user', r1.args && Array.isArray(r1.args.to) && r1.args.to.length === 1 && r1.args.to[0] === ME, r1.args && r1.args.to);
  ok('all-ok: push reported sent', /Push sent to 2 devices/.test(r1.status), r1.status);
  ok('all-ok: email reported sent', /Email sent to/.test(r1.status), r1.status);
  ok('all-ok: text reported sent', /Text sent/.test(r1.status), r1.status);

  // Scenario 2: nothing configured
  const r2 = await clickWith({ ok: true, sent: 0, mailed: 0, texted: 0, subs: 0, env: { resend: false, sms: false } });
  ok('unconfigured: push says no device enabled', /no device enabled/i.test(r2.status), r2.status);
  ok('unconfigured: email says not set up', /Email: not set up yet/.test(r2.status), r2.status);
  ok('unconfigured: text says not set up', /Text: not set up yet/.test(r2.status), r2.status);

  // Scenario 3: email works, no push device, sms off
  const r3 = await clickWith({ ok: true, sent: 0, mailed: 1, texted: 0, subs: 0, env: { resend: true, sms: false } });
  ok('mixed: push says no device enabled', /no device enabled/i.test(r3.status), r3.status);
  ok('mixed: email reported sent', /Email sent to/.test(r3.status), r3.status);

  console.log(`\n${fail === 0 ? 'GREEN' : 'RED'} — ${pass} passed, ${fail} failed   ${errs.length ? '(pageerrors: ' + errs.slice(0, 2).join(' | ') + ')' : ''}`);
} catch (e) { console.log('HARNESS ERROR: ' + String(e).slice(0, 200)); console.log(errs.slice(0, 3).join(' | ')); fail++; } finally { await browser.close(); }
process.exit(fail === 0 ? 0 : 1);
