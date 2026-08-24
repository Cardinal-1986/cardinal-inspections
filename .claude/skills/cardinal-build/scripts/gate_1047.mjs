/* gate_1047.mjs — build 1047: the notification matrix wires.
 * Boots as Theo, replaces window.notifyTeam with a recorder AFTER boot (every
 * call site resolves the global binding at call time), then drives:
 *   W1  adb.create({kind:'job'...})  -> recorder sees BOTH production emails,
 *       subject "Build day set"; a kind:'appt' create sends NOTHING;
 *   W2  the board's Mark-ordered button on an injected Approved job whose
 *       sales_rep is Nick -> recorder sees exactly [nick], "Materials ordered";
 *   W3  the punch add modal saved with NO assignee -> recorder sees the
 *       production crew, "Unassigned punch-out".
 * Run:  node gate_1047.mjs <artifact> [--control <index_1046>]
 * Control must go RED (the recorder stays silent on all three drives).
 */
import { readFileSync, existsSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium;
for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright/index.js']) {
  try { chromium = require(p).chromium; break; } catch (e) {}
}
if (!chromium) { console.error('gate_1047: playwright not found'); process.exit(2); }

const argv = process.argv.slice(2);
const FILE = argv.find(a => !a.startsWith('--'));
const ci = argv.indexOf('--control');
const CONTROL = ci !== -1 ? argv[ci + 1] : null;
if (!FILE || !existsSync(FILE)) { console.error('usage: node gate_1047.mjs <index.html> [--control prev]'); process.exit(2); }

const SKILL = new URL('.', import.meta.url).pathname;
const CARDINAL_JS = readFileSync(SKILL + 'sentinel_setup_cardinal.js', 'utf8');
const MOCK_JS = readFileSync(SKILL + 'e2e_mock_supa.js', 'utf8');
const REP_ROW = `(function(){
  if(!window.__SEED__) return;
  window.__SEED__.projects.push({ id:'pq5', name:'Norm Gale', address:'5 Shingle St', city:'Dayton',
    state:'OH', zip:'45402', stage:'Approved', created_by:'theo@cardinalrenovations.net',
    sales_rep:'nick@cardinalrenovations.net', checklist: JSON.stringify({ po:1094, lead:{ assigned:[] } }),
    phone:null, email:null, crm:'retail', created_at:'2026-08-01T10:00:00Z',
    updated_at:'2026-08-20T10:00:00Z', stage_since:'2026-08-20T10:00:00Z' });
})();`;
const RECORDER = `window.__SENT__ = [];
window.notifyTeam = function(to, subject, html){
  window.__SENT__.push({ to: Array.isArray(to) ? to.slice() : [to], subject: String(subject || '') });
  return Promise.resolve({ ok: true, sent: (to || []).length });
};`;
const PNG1 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

async function sweep(html) {
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
  await page.addInitScript(CARDINAL_JS);
  await page.addInitScript(REP_ROW);
  await page.addInitScript(MOCK_JS);
  await page.goto('https://sentinel.test/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1400);
  await page.evaluate(RECORDER);

  const out = {};
  /* W1 — a job appointment through the chokepoint, then a non-job control */
  out.w1 = await page.evaluate(`(async function(){
    await window.adb.create({ title:'Job start \\u2014 Gate', appt_date:'2026-09-01',
      appt_time:'08:00', project_id:'p1', notes:null, kind:'job' });
    var afterJob = window.__SENT__.length;
    await window.adb.create({ title:'Adjuster visit', appt_date:'2026-09-02',
      appt_time:null, project_id:'p1', notes:null, kind:'appt' });
    return { afterJob: afterJob, afterAppt: window.__SENT__.length,
             first: window.__SENT__[0] || null };
  })()`);
  /* W2 — the board's Mark ordered on the injected rep-carrying job */
  out.w2 = await page.evaluate(`(async function(){
    var base = window.__SENT__.length;
    await window.CardinalProduction.open();
    await new Promise(function(r){ setTimeout(r, 700); });
    var box = document.querySelector('#cr-pb [data-box="needs"]');
    if(!box) return { fault:'no needs box' };
    box.click();
    await new Promise(function(r){ setTimeout(r, 500); });
    var btn = document.querySelector('#cr-pb [data-ord="pq5"]');
    if(!btn) return { fault:'no Mark-ordered button for pq5' };
    btn.click();
    await new Promise(function(r){ setTimeout(r, 900); });
    return { sent: window.__SENT__.slice(base) };
  })()`);
  /* W3 — the punch add modal, saved with no assignee */
  out.w3 = await page.evaluate(`(async function(){
    var base = window.__SENT__.length;
    window.CardinalProduction.addFor('p1');
    await new Promise(function(r){ setTimeout(r, 400); });
    var t = document.querySelector('.pbmodal [data-f="title"], [data-f="title"]');
    if(!t) return { fault:'no title field' };
    t.value = 'Gate unassigned item';
    var a = document.querySelector('[data-f="assigned"]');
    if(a) a.value = '';
    var s = document.querySelector('[data-act="save"]');
    if(!s) return { fault:'no save button' };
    s.click();
    await new Promise(function(r){ setTimeout(r, 1200); });
    return { sent: window.__SENT__.slice(base) };
  })()`);
  await ctx.close();
  await browser.close();
  return out;
}

const PROD = ['curtis@cardinalrenovations.net', 'scottie@cardinalrenovations.net'];
function judge(r) {
  const fails = [];
  if (r.w1.afterJob < 1) fails.push('W1: booking a build day sent nothing');
  else {
    const f = r.w1.first;
    if (!/^Build day set/.test(f.subject)) fails.push(`W1 subject "${f.subject}"`);
    const to = (f.to || []).slice().sort();
    if (JSON.stringify(to) !== JSON.stringify(PROD)) fails.push(`W1 recipients ${to.join(',')}`);
  }
  if (r.w1.afterAppt !== r.w1.afterJob) fails.push('W1: a NON-job appointment also notified — over-wired');
  if (r.w2.fault) fails.push('W2 rig fault: ' + r.w2.fault + ' (proves nothing)');
  else if (!r.w2.sent.length) fails.push('W2: Mark ordered sent nothing to the rep');
  else {
    const m = r.w2.sent.find(x => /^Materials ordered/.test(x.subject));
    if (!m) fails.push('W2: no Materials-ordered subject');
    else if (JSON.stringify(m.to) !== JSON.stringify(['nick@cardinalrenovations.net']))
      fails.push(`W2 recipients ${m.to.join(',')}`);
  }
  if (r.w3.fault) fails.push('W3 rig fault: ' + r.w3.fault + ' (proves nothing)');
  else {
    const u = (r.w3.sent || []).find(x => /^Unassigned punch-out/.test(x.subject));
    if (!u) fails.push('W3: an unassigned punch-out told nobody');
    else {
      const to = (u.to || []).slice().sort();
      if (JSON.stringify(to) !== JSON.stringify(PROD)) fails.push(`W3 recipients ${to.join(',')}`);
    }
  }
  return fails;
}

const html = readFileSync(FILE, 'utf8');
const fails = judge(await sweep(html));
for (const f of fails) console.log('  FAIL ' + f);
console.log(fails.length ? `GATE 1047 RED — ${fails.length} failure(s)` : 'GATE 1047 GREEN — build day, materials and unassigned punch all reach the right people');

if (CONTROL) {
  const cfails = judge(await sweep(readFileSync(CONTROL, 'utf8')));
  console.log(`CONTROL (${CONTROL.split('/').pop()}): ${cfails.length} named failure(s) — ${cfails.length ? 'RED as expected' : 'UNEXPECTEDLY CLEAN'}`);
  for (const f of cfails.slice(0, 4)) console.log('    control-fail ' + f);
  if (!cfails.length) { console.log('a control that cannot fail proves nothing'); process.exit(1); }
}
process.exit(fails.length ? 1 : 0);
