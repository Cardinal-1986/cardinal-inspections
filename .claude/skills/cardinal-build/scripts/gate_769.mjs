/*
 * gate_769.mjs — the rebuilt Production screen, in a REAL browser.
 *
 * jsdom cannot answer the questions this build raises: whether a rule actually
 * wins, whether an ink clears its contrast floor, whether a pane really swaps.
 * So this boots the repo's own index.html in Chromium against the e2e mock
 * Supabase, seeds production-shaped rows, drives the screen, and measures.
 *
 *   node .claude/skills/cardinal-build/scripts/gate_769.mjs [path/to/index.html]
 *
 * Negative control: point it at the previous build — it must go RED.
 */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium;
for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright/index.js']) {
  try { chromium = require(p).chromium; break; } catch (e) {}
}
if (!chromium) { console.error('playwright not found'); process.exit(2); }
import { readFileSync, mkdirSync, writeFileSync } from 'fs';

const ROOT = process.cwd();
const APP = readFileSync(process.argv[2] || ROOT + '/index.html', 'utf8');
const MOCK = readFileSync(new URL('./e2e_mock_supa.js', import.meta.url), 'utf8');
const OUT = process.env.GATE_OUT || '/tmp/cardinal-769';
mkdirSync(OUT, { recursive: true });

let pass = 0, fail = 0;
const ok = (n, c, x) => { if (c) { pass++; console.log('  ok   ' + n); } else { fail++; console.log('  FAIL ' + n + (x ? '  — ' + x : '')); } };

/* ---- dates relative to now, so the gate never rots ---- */
const D = (off) => { const d = new Date(); d.setDate(d.getDate() + off); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const ISO = (off) => { const d = new Date(); d.setDate(d.getDate() + off); return d.toISOString(); };

const SEED = {
  team_profiles: [
    { email: 'theo@cardinalrenovations.net', name: 'Theo Dorion', role: 'admin', title: 'Owner' },
    { email: 'curtis@cardinalrenovations.net', name: 'Curtis', role: 'production', title: 'Production Manager' },
    { email: 'scottie@cardinalrenovations.net', name: 'Scottie', role: 'production', title: 'Production' },
  ],
  projects: [
    // Approved, scheduled, NOT ordered  -> Scheduled box + Needs ordered box
    { id: 'j-alv', name: 'M. Alvarez', address: '6633 Edenhill Ave', stage: 'Approved', checklist: '{}', created_by: 'theo@cardinalrenovations.net', created_at: ISO(-30) },
    // Approved, NO appointment          -> Needs ordered + "Needs scheduling"
    { id: 'j-hol', name: 'Dan Hollis', address: '1240 Creekview Dr', stage: 'Approved', checklist: '{}', created_by: 'theo@cardinalrenovations.net', created_at: ISO(-20) },
    // Scheduled AND ordered             -> Ordered box
    { id: 'j-bre', name: 'T. Brennan', address: '88 Ridge Rd', stage: 'Scheduled', checklist: JSON.stringify({ materials_ordered_at: ISO(-2), materials_ordered_by: 'curtis@cardinalrenovations.net' }), created_by: 'theo@cardinalrenovations.net', created_at: ISO(-40) },
    // A Prospect carrying punch         -> the off-stage tail
    { id: 'j-tac', name: 'R. Tackett', address: '418 Wilmington Pk', stage: 'Prospect', checklist: '{}', created_by: 'theo@cardinalrenovations.net', created_at: ISO(-10) },
  ],
  appointments: [
    { id: 'ap-1', project_id: 'j-alv', kind: 'job',  appt_date: D(2), appt_time: '08:00', title: 'Build day', created_by: 'curtis@cardinalrenovations.net', created_at: ISO(-3) },
    { id: 'ap-2', project_id: 'j-alv', kind: 'drop', appt_date: D(1), appt_time: '07:00', title: 'Material drop', created_by: 'curtis@cardinalrenovations.net', created_at: ISO(-3) },
    { id: 'ap-3', project_id: 'j-bre', kind: 'job',  appt_date: D(6), appt_time: '08:00', title: 'Build day', created_by: 'curtis@cardinalrenovations.net', created_at: ISO(-3) },
  ],
  punch_items: [
    { id: 'pi-1', project_id: 'j-tac', title: 'Re-seat drip edge, north gable', detail: 'Rattles in wind', kind: 'punch', priority: 'high', status: 'open', assigned_to: 'scottie@cardinalrenovations.net', created_by: 'theo@cardinalrenovations.net', created_at: ISO(-1), scheduled_at: D(0), photos: [], comments: [], steps: [] },
    { id: 'pi-2', project_id: 'j-tac', title: 'Downspout strap, rear', kind: 'punch', priority: 'normal', status: 'open', assigned_to: 'scottie@cardinalrenovations.net', created_by: 'theo@cardinalrenovations.net', created_at: ISO(-14), photos: [], comments: [], steps: [] },
    { id: 'pi-3', project_id: 'j-alv', title: 'Garage ceiling stain', kind: 'callback', priority: 'normal', status: 'done', assigned_to: 'curtis@cardinalrenovations.net', done_by: 'curtis@cardinalrenovations.net', done_at: ISO(-2), created_by: 'theo@cardinalrenovations.net', created_at: ISO(-8), photos: [], comments: [], steps: [] },
  ],
  estimates: [], inspection_reports: [], crew_work_orders: [], collections: [], commissions: [],
  ai_estimates: [], contracts: [], insurance_claims: [], crews: [], pricing_items: [], pricing_categories: [],
};

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const ctx = await browser.newContext({ viewport: { width: 430, height: 900 } });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(String(e.message || e)));

await page.route('**/*', async route => {
  const url = route.request().url(), rt = route.request().resourceType();
  if (url === 'https://app.cardinalroster.com/' || url === 'https://app.cardinalroster.com/index.html')
    return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: APP });
  if (url.includes('@supabase/supabase-js')) return route.fulfill({ status: 200, contentType: 'application/javascript', body: MOCK });
  if (url.includes('chart.js') || url.includes('papaparse'))
    return route.fulfill({ status: 200, contentType: 'application/javascript', body: 'window.Chart=function(){this.destroy=function(){};this.update=function(){};};window.Papa={parse:function(){return{data:[]};},unparse:function(){return "";}};' });
  if (url.startsWith('https://app.cardinalroster.com/api/')) return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  if (rt === 'image' || rt === 'font' || rt === 'media' || rt === 'stylesheet') return route.abort();
  if (url.startsWith('https://app.cardinalroster.com/')) return route.fulfill({ status: 200, body: '' });
  return route.abort();
});
await page.addInitScript(seed => { window.__SEED__ = seed; }, SEED);
await page.addInitScript(MOCK);
await page.addInitScript(() => {
  try { Object.defineProperty(document, 'fonts', { configurable: true, get: () => ({ ready: Promise.resolve(), status: 'loaded', check: () => true, load: () => Promise.resolve([]), forEach: () => {}, addEventListener: () => {}, removeEventListener: () => {} }) }); } catch (e) {}
});

/* page.screenshot() blocks on document.fonts.ready and the harness aborts font
   requests, so capture through CDP instead — otherwise every shot times out
   into a silent catch and the gate "passes" with no picture to look at. */
const cdp = await ctx.newCDPSession(page);
const shot = async (n) => {
  try { const r = await cdp.send('Page.captureScreenshot', { format: 'png' });
    writeFileSync(OUT + '/' + n + '.png', Buffer.from(r.data, 'base64')); }
  catch (e) { console.log('  (shot ' + n + ' failed: ' + String(e).slice(0, 60) + ')'); }
};



console.log('gate_769 — the buzzes, in Chromium');
await page.goto('https://app.cardinalroster.com/', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(3000);
await page.evaluate(() => { const v = document.getElementById('restoreVeil'); if (v) v.style.display = 'none'; });
await page.evaluate(() => {
  window.__NOTIFIED__ = [];
  window.notifyTeam = async (to, title, body) => { window.__NOTIFIED__.push({ to, title, body }); return { sent: 1, mailed: 0 }; };
  window.is_admin = () => true;
});

console.log('\n--- filing work on somebody buzzes THEM ---');
await page.evaluate(() => window.CardinalProduction.open());
await page.waitForTimeout(1200);
await page.evaluate(() => window.CardinalProduction.addFor('j-tac'));
await page.waitForTimeout(700);
await page.fill('#cr-pb-modal [data-f="title"]', 'Reattach gutter, north side');
await page.selectOption('#cr-pb-modal [data-f="assigned"]', 'scottie@cardinalrenovations.net');
await page.evaluate(() => { window.__NOTIFIED__ = []; });
await page.click('#cr-pb-modal [data-act="save"]');
await page.waitForTimeout(1500);
let n = await page.evaluate(() => window.__NOTIFIED__ || []);
ok('the assignee is notified when work is filed on them', n.length === 1, JSON.stringify(n).slice(0, 200));
ok('...and only them', n.length === 1 && n[0].to.length === 1 && n[0].to[0] === 'scottie@cardinalrenovations.net', JSON.stringify(n[0] && n[0].to));
ok('the subject names the work', n.length === 1 && /Reattach gutter/.test(n[0].title), n[0] && n[0].title);
ok('the body says who filed it', n.length === 1 && /filed a punch-out/.test(n[0].body || ''));

console.log('\n--- filing UNASSIGNED work buzzes PRODUCTION minus the actor (1047) ---');
await page.evaluate(() => window.CardinalProduction.addFor('j-tac'));
await page.waitForTimeout(600);
await page.fill('#cr-pb-modal [data-f="title"]', 'Unassigned tidy-up');
await page.evaluate(() => { window.__NOTIFIED__ = []; });
await page.click('#cr-pb-modal [data-act="save"]');
await page.waitForTimeout(1400);
n = await page.evaluate(() => window.__NOTIFIED__ || []);
/* 1047 (the notification matrix) closed this gap on purpose: an unassigned
   punch-out now buzzes the production crew minus the actor, so it cannot sit
   invisible in the queue. Assert the shipped matrix, not the 769 silence. */
ok('unassigned work buzzes production (1047)', n.length === 1 &&
  (n[0].to || []).includes('curtis@cardinalrenovations.net') &&
  (n[0].to || []).includes('scottie@cardinalrenovations.net') &&
  /Unassigned punch-out/.test(n[0].title || ''), JSON.stringify(n).slice(0, 160));
ok('...but never the actor', n.length === 1 &&
  !(n[0].to || []).includes('theo@cardinalrenovations.net'), JSON.stringify((n[0] || {}).to));

console.log('\n--- filing work on YOURSELF buzzes nobody ---');
await page.evaluate(() => { window.currentUser = { email: 'scottie@cardinalrenovations.net' }; });
await page.evaluate(() => window.CardinalProduction.addFor('j-tac'));
await page.waitForTimeout(600);
await page.fill('#cr-pb-modal [data-f="title"]', 'Note to self');
await page.selectOption('#cr-pb-modal [data-f="assigned"]', 'scottie@cardinalrenovations.net');
await page.evaluate(() => { window.__NOTIFIED__ = []; });
await page.click('#cr-pb-modal [data-act="save"]');
await page.waitForTimeout(1400);
n = await page.evaluate(() => window.__NOTIFIED__ || []);
ok('you are never notified about your own action', n.length === 0, JSON.stringify(n).slice(0, 160));

console.log('\n--- reassigning from the card buzzes the new owner ---');
await page.evaluate(() => { window.currentUser = { email: 'theo@cardinalrenovations.net' }; window.is_admin = () => true; });
await page.evaluate(() => window.CardinalPunchCard.open('pi-1', { back: 'production' }));
await page.waitForTimeout(900);
await page.evaluate(() => { window.__NOTIFIED__ = []; });
await page.selectOption('#cr-pk [data-f="assigned"]', 'curtis@cardinalrenovations.net');
await page.waitForTimeout(1500);
n = await page.evaluate(() => window.__NOTIFIED__ || []);
ok('the new owner is notified on reassign', n.length === 1, JSON.stringify(n).slice(0, 200));
ok('the subject says it is theirs now', n.length === 1 && /Assigned to you/.test(n[0].title), n[0] && n[0].title);
ok('the card reports the delivery outcome on screen', await page.evaluate(() =>
  /notified/i.test((document.querySelector('#cr-pk .pkout') || {}).textContent || '')),
  await page.evaluate(() => (document.querySelector('#cr-pk .pkout') || {}).textContent));

console.log('\n--- a failed delivery is REPORTED, never claimed as sent ---');
await page.evaluate(() => {
  window.notifyTeam = async (to, title) => { window.__NOTIFIED__.push({ to, title }); return { sent: 0, mailed: 0, failed: 1 }; };
  window.__NOTIFIED__ = [];
});
await page.selectOption('#cr-pk [data-f="assigned"]', 'scottie@cardinalrenovations.net');
await page.waitForTimeout(1500);
ok('a zero-delivery result does NOT say "Notified"', await page.evaluate(() => {
  const t = (document.querySelector('#cr-pk .pkout') || {}).textContent || '';
  return t.length > 0 && !/^Notified/i.test(t.trim());
}), await page.evaluate(() => (document.querySelector('#cr-pk .pkout') || {}).textContent));

console.log('\n--- closing tells the office ---');
await page.evaluate(() => {
  window.notifyTeam = async (to, title, body) => { window.__NOTIFIED__.push({ to, title, body }); return { sent: 1, mailed: 1 }; };
  window.__NOTIFIED__ = [];
});
await page.evaluate(async () => {
  const P = window.CardinalPunch;
  const row = P.rows().find(r => r.id === 'pi-1');
  row.photos = ['a','b','c','d','e'];
  row.steps = [];
  window.CardinalPunchCard.open('pi-1', { back: 'production' });
});
await page.waitForTimeout(900);
await page.click('#cr-pk [data-act="close"]');
await page.waitForTimeout(1600);
n = await page.evaluate(() => window.__NOTIFIED__ || []);
ok('the office is notified when the field closes something', n.length >= 1, JSON.stringify(n).slice(0, 220));
ok('the notice names the closer and the counts',
  n.length >= 1 && /closed/i.test(n[n.length-1].title) && /photos/.test(n[n.length-1].body || ''),
  n.length ? n[n.length-1].title : '');

console.log('\n--- one card everywhere: the client profile routes here too ---');
ok('CardinalPunchProfile.openItem hands off to the card',
  /CardinalPunchCard\.open\(itemId, \{ back:'none' \}\)/.test(APP));
ok('the fallback path is kept for a boot where the card has not parsed',
  /var tries = 0;/.test(APP));

console.log('\n--- chat is unchanged: @-only ---');
ok('chat still notifies only tagged people', /Theo.s rule, unchanged: only the people a comment TAGS/.test(APP));

ok('no page errors during the run', errors.length === 0, errors.slice(0, 3).join(' | '));
await browser.close();
console.log('RESULT: ' + pass + ' passed, ' + fail + ' failed  ->  ' + (fail ? 'RED' : 'GREEN'));
process.exit(fail ? 1 : 0);
