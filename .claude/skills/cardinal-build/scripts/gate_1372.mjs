// gate_1372 — New job for this client.
// A  ⋮ on a job offers "New job for this client"; it opens the Add form filled with the client's name, address,
//    phone, email and Lead Source = Repeat customer, titled "New job for <name>"
// B  Save creates a NEW project (the old one untouched) whose checklist carries prior_job = the old id,
//    stage Lead, and no money copied
// C  the new job's ⋮ offers "Open earlier job" (opens the old one); the old job's ⋮ offers "Open newer job"
// D  a plain "Add project" afterwards carries no prior_job (the link never leaks into an unrelated lead)
// node gate_1372.mjs [index.html]   (1371 = RED)
import { createRequire } from 'module'; const require = createRequire(import.meta.url);
import { readFileSync } from 'fs';
const here = new URL('.', import.meta.url).pathname;
const chromium = require('playwright').chromium;
const { launchChromium } = require(here + 'chromium_launch.cjs');
const APP = readFileSync(process.argv[2] || here + '../../../../index.html', 'utf8');
const SETUP = readFileSync(here + 'sentinel_setup_cardinal.js', 'utf8') + '\n;\n' + readFileSync(here + 'e2e_mock_supa.js', 'utf8');
let fail = 0;
const ok = (c, m, d) => { console.log((c ? '  PASS  ' : '  FAIL  ') + m + (d !== undefined ? '  → ' + d : '')); if (!c) fail++; };
const b = await launchChromium(chromium);
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const p = await ctx.newPage(); p.on('dialog', d => d.dismiss().catch(() => {}));
await p.route('**/*', r => r.request().url().startsWith('https://sentinel.test/') ? r.fulfill({ status: 200, contentType: 'text/html', body: APP }) : r.fulfill({ status: 200, body: '' }));
await p.addInitScript(SETUP);
await p.addInitScript(() => { const S = window.__SEED__; S.projects.push({ id: 'gOld', name: 'Pat Repeat', address: '9 Elm St, Dayton, OH 45419', phone: '9375550101', email: 'pat@example.com', stage: 'Invoiced', created_by: 'theo@cardinalrenovations.net', created_at: '2026-06-10T10:00:00Z', updated_at: '2026-10-10T10:00:00Z', checklist: JSON.stringify({ po: 1260, manual_value: 4200, lead_source: 'Door knock', lead: { claim_type: 'retail', retail: true } }) }); });
await p.goto('https://sentinel.test/', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(2600);
const menu = async () => { await p.evaluate(() => { const d = document.getElementById('msDots'); if (d) d.click(); }); await p.waitForTimeout(300);
  return p.evaluate(() => [...document.querySelectorAll('#msDrop button')].map(x => x.getAttribute('data-act'))); };
await p.evaluate(() => openProject('gOld')); await p.waitForTimeout(1500);
let acts = await menu();
ok(acts.includes('newjob'), 'A: ⋮ offers New job for this client', JSON.stringify(acts));
await p.evaluate(() => { const x = document.querySelector('#msDrop [data-act="newjob"]'); if (x) x.click(); }); await p.waitForTimeout(500);
const form = await p.evaluate(() => { const m = document.getElementById('projModal'), g = id => (document.getElementById(id) || {}).value;
  return { shown: !!(m && getComputedStyle(m).display !== 'none'), title: (document.getElementById('projModalTitle') || {}).textContent, name: g('pfName'), addr: g('pfAddress'), phone: g('pfPhone'), email: g('pfEmail'), src: g('pfSource') }; });
ok(form.shown && form.name === 'Pat Repeat' && /9 Elm St/.test(form.addr || '') && form.phone === '9375550101' && form.email === 'pat@example.com' && form.src === 'Repeat customer' && /New job for Pat Repeat/.test(form.title || ''),
   'A: the form opens filled in, Repeat customer, titled New job for the client', JSON.stringify(form));
const w0 = await p.evaluate(() => (window.__WRITES__ || []).length);
await p.evaluate(() => { const s = document.getElementById('pfSave'); if (s) s.click(); }); await p.waitForTimeout(2500);
const made = await p.evaluate(w0 => { const ins = (window.__WRITES__ || []).slice(w0).filter(w => w.table === 'projects' && w.op === 'insert')[0];
  const upd = (window.__WRITES__ || []).slice(w0).filter(w => w.table === 'projects' && w.op === 'update');
  const row = ins && (Array.isArray(ins.payload) ? ins.payload[0] : ins.payload); let ck = {}; try { ck = JSON.parse(row.checklist); } catch (e) {}
  const nu = (window.cacheProjects || []).find(x => x.name === 'Pat Repeat' && x.id !== 'gOld');
  return { name: row && row.name, stage: row && row.stage, prior: ck.prior_job, src: ck.lead_source, money: ck.manual_value, oldTouched: upd.length, newId: nu && nu.id, cur: window.currentProject && window.currentProject.id }; }, w0);
ok(made.name === 'Pat Repeat' && made.stage === 'Lead' && made.prior === 'gOld' && made.src === 'Repeat customer' && made.money === undefined && made.newId,
   'B: a new Lead project, linked to the earlier job, no money copied', JSON.stringify(made));
ok(made.oldTouched === 0, 'B: the earlier job is not written to', made.oldTouched);
if (made.newId) {
  await p.evaluate(id => openProject(id), made.newId); await p.waitForTimeout(1500);
  acts = await menu();
  ok(acts.includes('priorjob'), 'C: the new job ⋮ offers Open earlier job', JSON.stringify(acts));
  await p.evaluate(() => { const x = document.querySelector('#msDrop [data-act="priorjob"]'); if (x) x.click(); }); await p.waitForTimeout(1500);
  const cur = await p.evaluate(() => window.currentProject && window.currentProject.id);
  ok(cur === 'gOld', 'C: Open earlier job opens it', cur);
  acts = await menu();
  ok(acts.includes('laterjob'), 'C: the earlier job ⋮ offers Open newer job', JSON.stringify(acts));
} else { ok(false, 'C: (no new job to check)'); }
const plain = await p.evaluate(async () => { openProjModal(null); return (document.getElementById('pfName') || {}).value === '' && typeof pfFromJob !== 'undefined' && pfFromJob === null; });
ok(plain, 'D: a plain Add project starts empty and unlinked');
await b.close();
console.log(fail ? 'GATE 1372 RED — ' + fail + ' failing' : 'GATE 1372 GREEN');
process.exit(fail ? 1 : 0);
