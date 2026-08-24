/* gate_1049.mjs — build 1049: punch-out work survives no signal.
 * Rig as Curtis on the punch card. Drives CardinalPunch through three states
 * by swapping window.supa's punch_items writer:
 *   [offline]  a thrown network error ("Load failed", the iOS shape) ->
 *              update() returns { ok:true, queued:true }, the local row KEEPS
 *              the change, and the outbox holds a punch_items patch;
 *   [refusal]  a real RLS-style error object -> still { ok:false } and the row
 *              ROLLS BACK (the loud path must not have been softened);
 *   [overlay]  with a queued patch present, reload() against a server row that
 *              lacks it must still show the queued value (no wipe);
 *   [toggle]   a network error on toggle() also queues instead of throwing.
 * Run:  node gate_1049.mjs <artifact> [--control <index_1048>]
 * The control must go RED (offline work is lost and rolled back).
 */
import { readFileSync, existsSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium;
for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright/index.js']) {
  try { chromium = require(p).chromium; break; } catch (e) {}
}
if (!chromium) { console.error('gate_1049: playwright not found'); process.exit(2); }

const argv = process.argv.slice(2);
const FILE = argv.find(a => !a.startsWith('--'));
const ci = argv.indexOf('--control');
const CONTROL = ci !== -1 ? argv[ci + 1] : null;
if (!FILE || !existsSync(FILE)) { console.error('usage: node gate_1049.mjs <index.html> [--control prev]'); process.exit(2); }

const SKILL = new URL('.', import.meta.url).pathname;
const SETUP_JS = ['sentinel_setup_cardinal.js', 'sentinel_setup_production.js', 'e2e_mock_supa.js']
  .map(f => readFileSync(SKILL + f, 'utf8')).join('\n;\n');
const PNG1 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

async function sweep(html) {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' })
    .catch(() => chromium.launch());
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await page.route('**/*', r => {
    const u = r.request().url();
    if (u.startsWith('https://sentinel.test/') && !/\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(u))
      return r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: html });
    if (/\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(u)) return r.fulfill({ status: 200, contentType: 'image/png', body: PNG1 });
    return r.fulfill({ status: 200, body: '' });
  });
  await page.addInitScript(SETUP_JS);
  await page.goto('https://sentinel.test/?as=curtis', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1300);
  await page.evaluate(`window.__sentinelStates.filter(s=>s.name==='punchcard')[0].run()`);
  await page.waitForTimeout(900);

  const out = await page.evaluate(`(async function(){
    var P = window.CardinalPunch;
    if(!P || typeof P.update !== 'function') return { fault:'CardinalPunch.update missing' };
    /* a recorder in place of the real outbox — proves what WOULD be queued
       without depending on IndexedDB inside the rig */
    var queued = [];
    window.CardinalOutbox = {
      queue: function(e){ queued.push(e); },
      networkish: function(e){ return /load failed|network|fetch/i.test(String((e && e.message) || e)); },
      patchesFor: function(t){ return Promise.resolve(queued.filter(function(e){ return e.table === t; })); }
    };
    var realFrom = window.supa.from.bind(window.supa);
    function stub(mode){
      window.supa.from = function(t){
        if(t !== 'punch_items') return realFrom(t);
        return {
          update: function(){ return { eq: function(){
            if(mode === 'offline') return Promise.reject(new TypeError('Load failed'));
            if(mode === 'refuse')  return Promise.resolve({ error:{ message:'new row violates row-level security policy' } });
            return Promise.resolve({ error:null });
          } }; },
          select: function(){ return {
            order: function(){ return Promise.resolve({ data: SERVER_ROWS, error:null }); },
            eq: function(){ return { single: function(){ return Promise.resolve({ data:{ photos:[] }, error:null }); } }; }
          }; }
        };
      };
    }
    var id = P.rows()[0] && P.rows()[0].id;
    if(!id) return { fault:'no punch rows seeded' };
    var SERVER_ROWS = JSON.parse(JSON.stringify(P.rows()));   /* server copy WITHOUT our edits */

    /* 1 — offline update */
    stub('offline');
    var r1 = await P.update(id, { priority:'high' });
    var row1 = P.rows().filter(function(x){ return String(x.id) === String(id); })[0];
    var res = { offline:{ ok:r1 && r1.ok, queued:!!(r1 && r1.queued), kept: row1 && row1.priority === 'high',
                          outboxed: queued.filter(function(e){ return e.table === 'punch_items'; }).length } };

    /* 2 — a real refusal must still fail and roll back */
    stub('refuse');
    var before = P.rows().filter(function(x){ return String(x.id) === String(id); })[0].detail;
    var r2 = await P.update(id, { detail:'refused change' });
    var row2 = P.rows().filter(function(x){ return String(x.id) === String(id); })[0];
    res.refusal = { ok:r2 && r2.ok, rolledBack: row2.detail === before };

    /* 3 — reload while still offline must not wipe the queued value */
    stub('offline');
    await P.reload();
    var row3 = P.rows().filter(function(x){ return String(x.id) === String(id); })[0];
    res.overlay = { priority: row3 && row3.priority };

    /* 4 — toggle offline */
    var qBefore = queued.length;
    var r4 = await P.toggle(id);
    res.toggle = { ok:r4 && r4.ok, queued:!!(r4 && r4.queued), grew: queued.length > qBefore };

    window.supa.from = realFrom;
    return res;
  })()`);
  await ctx.close();
  await browser.close();
  return out;
}

function judge(r) {
  const fails = [];
  if (r.fault) return ['rig fault: ' + r.fault + ' (proves nothing)'];
  if (r.offline.ok !== true || !r.offline.queued) fails.push(`offline update returned ok=${r.offline.ok} queued=${r.offline.queued} (want ok:true, queued:true)`);
  if (!r.offline.kept) fails.push('offline update rolled the crew’s change back off the screen');
  if (!r.offline.outboxed) fails.push('nothing was queued to the outbox');
  if (r.refusal.ok !== false) fails.push('a REAL refusal no longer fails — the loud path was softened');
  if (!r.refusal.rolledBack) fails.push('a real refusal did not roll back');
  if (r.overlay.priority !== 'high') fails.push(`reload while offline wiped the queued value (priority=${r.overlay.priority})`);
  if (r.toggle.ok !== true || !r.toggle.queued || !r.toggle.grew) fails.push(`offline toggle not queued (ok=${r.toggle.ok} queued=${r.toggle.queued} grew=${r.toggle.grew})`);
  return fails;
}

const html = readFileSync(FILE, 'utf8');
const fails = judge(await sweep(html));
for (const f of fails) console.log('  FAIL ' + f);
console.log(fails.length ? `GATE 1049 RED — ${fails.length} failure(s)` : 'GATE 1049 GREEN — offline work is held and replayed, real refusals still fail loudly');

if (CONTROL) {
  const cfails = judge(await sweep(readFileSync(CONTROL, 'utf8')));
  console.log(`CONTROL (${CONTROL.split('/').pop()}): ${cfails.length} named failure(s) — ${cfails.length ? 'RED as expected' : 'UNEXPECTEDLY CLEAN'}`);
  for (const f of cfails.slice(0, 4)) console.log('    control-fail ' + f);
  if (!cfails.length) { console.log('a control that cannot fail proves nothing'); process.exit(1); }
}
process.exit(fails.length ? 1 : 0);
