/* gate_999.mjs — lead source is a required tap when you add a client.

   THE DEFECT. lead_source was fully wired (reports chart, filter, sort, column)
   and set on 0 of 57 jobs, because the new-project form offered a "— not set —"
   default in a dropdown and only the client name was required.

   999 makes it eight chips, one required at CREATION (never when editing a
   client that predates the rule — the 998 scoping lesson), remembering the last
   pick for the session.

   Usage: node gate_999.mjs [path]   Control: build 998, red + named. */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium;
for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright/index.js']) {
  try { chromium = require(p).chromium; break; } catch (e) {}
}
if (!chromium) { console.error('gate_999: playwright not found'); process.exit(2); }
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

const openCreate = () => page.evaluate(() => {
  ['landingView', 'loginView'].forEach(id => { const e = document.getElementById(id); if (e) e.style.display = 'none'; });
  if (typeof openProjModal !== 'function') return { err: 'no openProjModal' };
  openProjModal();            /* no arg = create */
  const host = document.getElementById('pfSourceChips');
  const chips = host ? [...host.querySelectorAll('.pf-chip')].map(b => b.getAttribute('data-src')) : [];
  return { chips, hasHidden: !!document.getElementById('pfSource'),
           hiddenIsHidden: (document.getElementById('pfSource') || {}).type === 'hidden' };
});
const oc = await openCreate();

/* 1 — the eight chips exist, and #pfSource survives as a hidden input so every
   existing .value read keeps working. */
need('the source control is eight chips', Array.isArray(oc.chips) && oc.chips.length === 8,
     'found ' + (oc.chips || []).length + ' chips');
need('#pfSource survives as a hidden input', oc.hasHidden && oc.hiddenIsHidden,
     'the existing .value reads in the save handler would break otherwise');
need('the chip labels are the acxSrc eight (vocabulary not forked)',
     JSON.stringify(oc.chips) === JSON.stringify(['Door knock','Referral','Google / website','Yard sign','Repeat customer','Storm canvass','Facebook / social','Other']),
     (oc.chips || []).join(' | '));

/* helper: attempt a create with a given name, optionally tapping a source */
const attemptCreate = (name, tapSource) => page.evaluate(async ([nm, src]) => {
  document.getElementById('pfName').value = nm;
  const err = document.getElementById('pfError'); if (err) err.textContent = '';
  if (src) {
    const b = [...document.querySelectorAll('#pfSourceChips .pf-chip')].find(x => x.getAttribute('data-src') === src);
    if (b) b.click();
  }
  const before = (window.cacheProjects || []).length;
  document.getElementById('pfSave').click();
  await new Promise(r => setTimeout(r, 700));
  /* ⚠ null-safe: on a build with no chip row (the negative control), this must
     report a value, never throw — a crashing control proves nothing (class 37). */
  const chipRow = document.getElementById('pfSourceChips');
  return { error: (err ? err.textContent : '').trim(),
           needHL: !!chipRow && chipRow.classList.contains('pf-need'),
           saved: (window.cacheProjects || []).length > before,
           modalOpen: getComputedStyle(document.getElementById('projModal')).display !== 'none' };
}, [name, tapSource]);

/* 2 — create with NO source is refused, named, and highlighted. */
const noSrc = await attemptCreate('Gate 999 No Source', null);
need('a new client with no source is refused', !noSrc.saved, 'it saved with lead_source null');
need('the refusal names the reason', /where this lead came from|knocking/i.test(noSrc.error),
     'message: "' + noSrc.error + '"');
need('and the chip row is highlighted', noSrc.needHL, 'no .pf-need on the chip row');

/* 3 — create WITH a source saves, and stores the value. */
await openCreate();
const withSrc = await attemptCreate('Gate 999 With Source', 'Storm canvass');
need('a new client WITH a source saves', withSrc.saved, 'it was refused with a source picked');
const stored = await page.evaluate(() => {
  const p = (window.cacheProjects || []).find(x => x.name === 'Gate 999 With Source');
  if (!p) return null;
  try { return (window.parseCkAll(p) || {}).lead_source; } catch (e) { return '(parse err)'; }
});
need('the picked source is stored on the job', stored === 'Storm canvass',
     'stored lead_source = ' + JSON.stringify(stored));

/* 4 — the session remembers the last pick: reopen create, it is preselected. */
const remembered = await page.evaluate(() => {
  if (typeof openProjModal === 'function') openProjModal();
  return { hidden: (document.getElementById('pfSource') || {}).value,
           onChip: (document.querySelector('#pfSourceChips .pf-chip.on') || {}).getAttribute
                   ? document.querySelector('#pfSourceChips .pf-chip.on').getAttribute('data-src') : null };
});
need('the next new client preselects the remembered source', remembered.hidden === 'Storm canvass' && remembered.onChip === 'Storm canvass',
     'hidden=' + remembered.hidden + ' onChip=' + remembered.onChip);

/* 5 — THE LOOK-ALIKE: editing a client that predates the rule is NOT nagged.
   p3 in the seed ("Unassigned Caller") carries no lead_source. */
const editOld = await page.evaluate(async () => {
  const p = (window.cacheProjects || []).find(x => x.id === 'p3') || (window.cacheProjects || [])[2];
  if (!p) return { err: 'no project' };
  if (typeof openProjModal === 'function') openProjModal(p);
  await new Promise(r => setTimeout(r, 300));
  const err = document.getElementById('pfError'); if (err) err.textContent = '';
  const before = getComputedStyle(document.getElementById('projModal')).display;
  document.getElementById('pfSave').click();
  await new Promise(r => setTimeout(r, 700));
  return { wasOpen: before !== 'none',
           refused: getComputedStyle(document.getElementById('projModal')).display !== 'none'
                    && !!document.getElementById('pfSourceChips')
                    && document.getElementById('pfSourceChips').classList.contains('pf-need') };
});
need('editing an old client with no source is NOT refused', editOld.wasOpen && !editOld.refused,
     'the edit was blocked for a missing source — the requirement leaked past create');

need('no page errors', errs.length === 0, errs.slice(0, 3).join(' | '));

await ctx.close(); await browser.close();
console.log(`gate_999 — ${FILE}`);
console.log(`  chips: ${JSON.stringify(oc.chips)}`);
console.log(`  no-source refused=${!noSrc.saved}  with-source saved=${withSrc.saved}  stored=${JSON.stringify(stored)}`);
console.log(`  remembered=${JSON.stringify(remembered)}`);
console.log(`\nPASS ${passes}  FAIL ${fails.length}`);
for (const f of fails) console.log('  FAIL ' + f);
process.exit(fails.length ? 1 : 0);
