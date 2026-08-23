/* gate_1003.mjs — the shared calendar, client-side half.

   THE CHANGE. Build 1003's RLS opens job/drop appointments to everyone who can
   see the job, so a rep now sees build days they did not create. Deleting or
   re-attaching one of those is refused server-side (own-or-admin), so the row
   must render READ-ONLY for a non-owner/non-admin: no delete cross, no "Attach
   to a job". apptCanEdit(a) is the gate. In local (non-TEAM) mode every row is
   the user's own, so everything stays editable.

   The RLS itself is verified against the live database separately (see the PR
   body); this gate proves the front end matches that fence.

   Control: the previous build, where the delete button is UNCONDITIONAL, so a
   non-owner still gets a delete cross and apptCanEdit does not exist. Both are
   reported as NAMED failures, never a crash.

   Usage: node gate_1003.mjs [path] */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium;
for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright/index.js']) {
  try { chromium = require(p).chromium; break; } catch (e) {}
}
if (!chromium) { console.error('gate_1003: playwright not found'); process.exit(2); }
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
page.on('pageerror', () => {});
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

/* Render the day list as a given viewer, over a fixed fixture, and report the
   affordances present on each row. Everything is guarded so a build without
   apptCanEdit reports a named failure instead of throwing. */
const renderAs = (email, team) => page.evaluate(([email, team]) => {
  try {
    ['landingView', 'loginView'].forEach(id => { const e = document.getElementById(id); if (e) e.style.display = 'none'; });
    const d = new Date();
    const ds = d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
    window.ADMIN_EMAILS = ['theo@cardinalrenovations.net', 'joan@cardinalrenovations.net'];
    window.TEAM = team;
    window.currentUser = { email };
    window.cacheProjects = [{ id: 'p1', name: 'Wright — 123 Oak', checklist: '{}' }];
    window.cacheAppts = [
      { id: 'a1', kind: 'job',  project_id: 'p1',  created_by: 'theo@cardinalrenovations.net', title: 'Build day',   appt_date: ds, appt_time: null, notes: null },
      { id: 'a2', kind: 'job',  project_id: 'p1',  created_by: 'nick@cardinalrenovations.net', title: 'Nick build',  appt_date: ds, appt_time: null, notes: null },
      { id: 'a3', kind: 'appt', project_id: null,  created_by: 'theo@cardinalrenovations.net', title: 'Hair cut',    appt_date: ds, appt_time: null, notes: null },
      { id: 'a4', kind: 'job',  project_id: null,  created_by: 'nick@cardinalrenovations.net', title: 'Loose build', appt_date: ds, appt_time: null, notes: null },
      { id: 'a5', kind: 'job',  project_id: 'p1',  created_by: null,                           title: 'Local build', appt_date: ds, appt_time: null, notes: null }
    ];
    if (typeof openApptDay === 'function') openApptDay(ds); else window.apptDay = ds;
    window.apptDay = ds;
    if (typeof renderApptList === 'function') renderApptList();
    const rows = {};
    document.querySelectorAll('#apptList .apptrow').forEach(r => {
      rows[r.getAttribute('data-aid')] = {
        del: !!r.querySelector('.del'),
        attach: !!r.querySelector('[data-apptattach]')
      };
    });
    return { ok: true, hasFn: typeof apptCanEdit === 'function', rows };
  } catch (e) { return { ok: false, err: String(e).split('\n')[0], hasFn: typeof apptCanEdit === 'function', rows: {} }; }
}, [email, team]);

const rep   = await renderAs('jacob@cardinalrenovations.net', true);  // unrelated rep
const nick  = await renderAs('nick@cardinalrenovations.net', true);   // creator of a2/a4
const theo  = await renderAs('theo@cardinalrenovations.net', true);   // admin
const local = await renderAs('nick@cardinalrenovations.net', false);  // local (non-TEAM)

need('apptCanEdit exists', rep.hasFn, 'no apptCanEdit() — the affordance gate was never added');
need('the day list rendered rows', rep.ok && Object.keys(rep.rows).length >= 4,
     rep.err ? ('threw: ' + rep.err) : 'no .apptrow found');

/* an unrelated rep can see the shared job days but must not act on them */
need('unrelated rep: no delete on a job they did not create', rep.rows.a1 && rep.rows.a1.del === false,
     'a non-owner got a delete cross on someone else’s build day');
need('unrelated rep: no attach on a loose job they did not create', rep.rows.a4 && rep.rows.a4.attach === false,
     'a non-owner got the Attach button on someone else’s job');
need('unrelated rep: no delete on a personal entry they do not own', rep.rows.a3 && rep.rows.a3.del === false,
     'a non-owner could delete a private appointment');

/* the creator keeps full control of their own rows */
need('creator: delete on their own job day', nick.rows.a2 && nick.rows.a2.del === true,
     'the creator lost the delete on their own booking');
need('creator: attach on their own unattached job', nick.rows.a4 && nick.rows.a4.attach === true,
     'the creator lost the Attach button on their own loose job');
need('creator: NO delete on another rep’s day', nick.rows.a1 && nick.rows.a1.del === false,
     'the creator gate leaked onto a row created by someone else');

/* an admin can act on every row */
need('admin: delete on a rep’s job day', theo.rows.a2 && theo.rows.a2.del === true,
     'an admin could not act on a rep’s booking');
need('admin: delete on a personal entry (own)', theo.rows.a3 && theo.rows.a3.del === true,
     'an admin lost control of their own diary entry');

/* local mode: created_by is null on every local row, so all rows stay editable */
need('local mode: null-owner row is still editable', local.rows.a5 && local.rows.a5.del === true,
     'local (non-TEAM) mode wrongly hid the delete on the user’s own row');

await browser.close();
if (fails.length) { console.log('gate_1003 FAIL  ' + passes + ' pass / ' + fails.length + ' fail'); fails.forEach(f => console.log('  ✗ ' + f)); process.exit(1); }
console.log('gate_1003 PASS  ' + passes + '/' + passes);
