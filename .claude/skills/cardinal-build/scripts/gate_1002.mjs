/* gate_1002.mjs — an iTel lab result attaches to a job.

   28 lab results were linked to nothing: the app only offered a claim link and
   the attachable ones belong to jobs with no claim. 1002 links by JOB.

   Usage: node gate_1002.mjs [path]   Control: build 1001, red + named.
   Runs against the mock DB, which accepts the new project_id column; the real
   column is added by itel_project_link.sql, shipped alongside. */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium;
for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright/index.js']) {
  try { chromium = require(p).chromium; break; } catch (e) {}
}
if (!chromium) { console.error('gate_1002: playwright not found'); process.exit(2); }
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

/* one orphan, one already linked to p1 (Mark Diamond) */
const EXTRA = `(function(){ try{
  var S = window.__SEED__; if(!S) return;
  S.itel_lab_reports = [
    { id:'lab-orphan', control_number:'CTRL-ORPHAN', verdict:'no_match',
      manufacturer:'GAF', product:'Timberline', insured_name:'Adam Gunn',
      loss_location:'9222 Arlington Rd', report_date:'2026-06-01', project_id:null },
    { id:'lab-linked', control_number:'CTRL-LINKED', verdict:'match_available',
      manufacturer:'OC', product:'Duration', report_date:'2026-05-01', project_id:'p1' }
  ];
}catch(e){} })();`;

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'],
}).catch(() => chromium.launch());
const ctx = await browser.newContext({ viewport: { width: 414, height: 896 } });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push(String(e).split('\n')[0]));
page.on('dialog', d => d.accept('1'));   /* the attach picker -> first job (Kathy May, sorted) */
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
await page.addInitScript(EXTRA);
await page.goto('https://sentinel.test/?as=theo', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1600);

const openIt = () => page.evaluate(async () => {
  ['landingView', 'loginView'].forEach(id => { const e = document.getElementById(id); if (e) e.style.display = 'none'; });
  const m = window.CardinalItelLab;
  if (!m || !m.open) return { err: 'no CardinalItelLab.open' };
  await m.open();
  await new Promise(r => setTimeout(r, 700));
  const v = document.getElementById('cr-itellab');
  const body = v ? v.querySelector('.cr-itellab-body') : null;
  return {
    open: !!v && v.classList.contains('open'),
    sub: v ? (v.querySelector('.cr-itellab-sub') || {}).textContent : '',
    attachBtns: body ? body.querySelectorAll('[data-itel-attach]').length : -1,
    linkedText: body ? (body.textContent || '').replace(/\s+/g, ' ') : '',
  };
});

const first = await openIt();
need('the iTel viewer opens', first.open, 'view not open');
/* two seeded rows: one orphan (attach button), one linked to p1 (shows Job:) */
need('the orphan row offers "Attach to a job"', first.attachBtns === 1,
     'attach buttons = ' + first.attachBtns + ' (expected exactly the one orphan)');
need('the already-linked row names its job', /Job: Mark Diamond/.test(first.linkedText),
     'linked row did not show "Job: Mark Diamond"');
need('the sub-line counts jobs, not claims', /not yet linked to a job/.test(first.sub || ''),
     'sub-line: ' + JSON.stringify(first.sub));

/* click attach on the orphan; the prompt is auto-answered "1" */
const clicked = await page.evaluate(async () => {
  const b = document.querySelector('#cr-itellab [data-itel-attach="lab-orphan"]');
  if (!b) return false;
  b.click();
  await new Promise(r => setTimeout(r, 1000));
  return true;
});
need('the attach button was clickable', clicked, 'no attach button for lab-orphan');

/* after attach + re-render: the orphan is now linked, and there are 0 attach
   buttons left (both rows linked). */
const after = await page.evaluate(() => {
  const v = document.getElementById('cr-itellab');
  const body = v ? v.querySelector('.cr-itellab-body') : null;
  return {
    attachBtns: body ? body.querySelectorAll('[data-itel-attach]').length : -1,
    text: body ? (body.textContent || '').replace(/\s+/g, ' ') : '',
    seedProj: (window.__SEED__.itel_lab_reports.find(x => x.id === 'lab-orphan') || {}).project_id,
  };
});
need('the orphan is now attached (write persisted)', after.attachBtns === 0,
     'still ' + after.attachBtns + ' attach button(s) after linking');
need('it links to the picked job (Kathy May, #1 sorted)', /Job: Kathy May/.test(after.text),
     'after-text did not show "Job: Kathy May": ' + after.text.slice(0, 200));

need('no page errors', errs.length === 0, errs.slice(0, 3).join(' | '));

await ctx.close(); await browser.close();
console.log(`gate_1002 — ${FILE}`);
console.log(`  first: attachBtns=${first.attachBtns} sub=${JSON.stringify(first.sub)}`);
console.log(`  after: attachBtns=${after.attachBtns} seedProj=${after.seedProj}`);
console.log(`\nPASS ${passes}  FAIL ${fails.length}`);
for (const f of fails) console.log('  FAIL ' + f);
process.exit(fails.length ? 1 : 0);
