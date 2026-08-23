/* gate_998.mjs — a build day on the calendar names its job.

   THE DEFECT. The client box read "Client (optional)" for every kind, so a
   build booked by typing an address and leaving it blank produced an
   appointment attached to nothing. __apptMayAdvanceStage returns early unless
   the appointment is kind 'job' AND carries a project_id, so the job never
   reached Scheduled, never reached the Needs-a-crew rail, and the arm-and-place
   workflow built at 949 had an empty tray. Measured live: ZERO projects at
   stage Scheduled, and BOTH 'job' appointments in the database are orphans.

   ⚠ Scoped to job and drop only. Ten of the fifteen appointments in the
   database are ordinary ones with no client — Theo's own diary — and requiring
   one there would break a working screen to fix a different one.

   Usage: node gate_998.mjs [path]   Control: the previous build, red + named. */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium;
for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright/index.js']) {
  try { chromium = require(p).chromium; break; } catch (e) {}
}
if (!chromium) { console.error('gate_998: playwright not found'); process.exit(2); }
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
const HERE = dirname(fileURLToPath(import.meta.url));
const FILE = process.argv[2] || join(HERE, '../../../../index.html');
const APP  = readFileSync(FILE, 'utf8');
const SETUP = readFileSync(join(HERE, 'sentinel_setup_cardinal.js'), 'utf8')
            + '\n;\n' + readFileSync(join(HERE, 'e2e_mock_supa.js'), 'utf8');

let fails = [], passes = 0;
const need = (n, ok, d) => { if (ok) passes++; else fails.push(n + (d ? ' — ' + d : '')); };

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'],
}).catch(() => chromium.launch());
const ctx = await browser.newContext({ viewport: { width: 414, height: 896 } });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push(String(e).split('\n')[0]));
await page.route('**/*', async r => {
  const u = r.request().url();
  if (u.startsWith('https://sentinel.test/'))
    return r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: APP });
  if (/\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(u))
    return r.fulfill({ status: 200, contentType: 'image/png',
      body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64') });
  return r.fulfill({ status: 200, body: '' });
});
await page.addInitScript(SETUP);
await page.goto('https://sentinel.test/?as=theo', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1600);

/* ⚠ openApptDay(ds), NOT openApptsPage(). They are two different screens:
   openApptsPage is the per-client sub-page; the calendar DAY modal is the one
   that carries #apptSave, #apptKind and #apptClient. The first draft of this
   gate opened the wrong one — and #apptSave is static markup, so the "form
   opened" assertion passed VACUOUSLY while the client select was never filled,
   which is what made a correctly-filled build day look refused. Navigate the
   way the app navigates, and assert the select actually has jobs in it. */
const openForm = async () => page.evaluate(async () => {
  ['landingView', 'loginView'].forEach(id => { const e = document.getElementById(id); if (e) e.style.display = 'none'; });
  const d = new Date();
  const ds = d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
  if (typeof openApptDay === 'function') openApptDay(ds);
  await new Promise(r => setTimeout(r, 600));
  const cli = document.getElementById('apptClient');
  return { form: !!document.getElementById('apptSave'),
           jobs: cli ? [...cli.options].filter(o => o.value).length : 0 };
});
const opened = await openForm();
need('the calendar day form opens', opened.form, 'no #apptSave — the gate proved nothing');
need('and the job list is actually populated', opened.jobs > 0,
     'the client select has no jobs in it, so "saves with a job" could never pass');

/* try to save one appointment of a given kind, with or without a client */
const trySave = (kind, withClient) => page.evaluate(async ([k, wc]) => {
  const err = document.getElementById('apptError');
  const kindSel = document.getElementById('apptKind');
  const cli = document.getElementById('apptClient');
  document.getElementById('apptTitle').value = 'Gate 998 ' + k;
  kindSel.value = k;
  kindSel.dispatchEvent(new Event('change', { bubbles: true }));
  await new Promise(r => setTimeout(r, 120));
  const label = (document.getElementById('apptClientLbl') || {}).textContent || '';
  if (wc) {
    const opt = [...cli.options].find(o => o.value);
    cli.value = opt ? opt.value : '';
  } else cli.value = '';
  err.textContent = '';
  const before = (window.cacheAppts || []).length;
  document.getElementById('apptSave').click();
  await new Promise(r => setTimeout(r, 700));
  return {
    label: label.trim(),
    error: (err.textContent || '').trim(),
    saved: (window.cacheAppts || []).length > before,
  };
}, [kind, withClient]);

/* 1-2 — a JOB with no client is refused, and says why. */
const jobNo = await trySave('job', false);
need('a job day with no job is refused', !jobNo.saved,
     'the appointment saved with project_id null — it can never reach Scheduled');
need('and the refusal says why', /never reaches Scheduled|no crew/i.test(jobNo.error),
     `the message reads "${jobNo.error}"`);

/* 3 — the label warned before the refusal did. */
need('the label says the job is required', /Job \*/.test(jobNo.label),
     `the label reads "${jobNo.label}" when Job is selected`);

/* 4 — a MATERIAL DROP is held to the same rule. */
const dropNo = await trySave('drop', false);
need('a material drop with no job is refused', !dropNo.saved, 'a delivery saved attached to nothing');

/* 5-6 — THE LOOK-ALIKES. An ordinary appointment must still save with no
   client — ten of the fifteen live rows are exactly that, and breaking them to
   fix job days would trade one broken screen for another. */
const apptNo = await trySave('appt', false);
need('an ordinary appointment still saves with no client', apptNo.saved,
     'a haircut now needs a client — the fix leaked past job/drop');
need('and its label still reads optional', /optional/i.test(apptNo.label),
     `the label reads "${apptNo.label}" for an ordinary appointment`);

/* 7 — a job WITH a job saves. Without this the fix could be "refuse all jobs". */
const jobYes = await trySave('job', true);
need('a job day WITH a job saves', jobYes.saved, 'a correctly-filled build day was refused');

/* 8 — the repair path exists for the rows already in the calendar. */
const repair = await page.evaluate(() => ({
  hasFn: typeof apptAttachJob === 'function',
  hasUpdate: !!(window.adb ? window.adb.update : (typeof adb !== 'undefined' && adb.update)),
}));
need('orphan job days can be attached rather than deleted', repair.hasFn,
     'apptAttachJob is missing — the two live orphans would have to be re-booked');
need('and the data layer can actually write it', repair.hasUpdate,
     'adb.update does not exist, so the attach button would throw');

need('no page errors', errs.length === 0, errs.slice(0, 3).join(' | '));

await ctx.close(); await browser.close();
console.log(`gate_998 — ${FILE}`);
console.log(`  job/no-client  saved=${jobNo.saved} label="${jobNo.label}"`);
console.log(`  drop/no-client saved=${dropNo.saved}`);
console.log(`  appt/no-client saved=${apptNo.saved} label="${apptNo.label}"`);
console.log(`  job/with-job   saved=${jobYes.saved}`);
console.log(`\nPASS ${passes}  FAIL ${fails.length}`);
for (const f of fails) console.log('  FAIL ' + f);
process.exit(fails.length ? 1 : 0);
