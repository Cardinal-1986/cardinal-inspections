// gate_1345 — a delete goes to the Trash, the job page lists it, Restore brings it back. Chromium + mock.
// node gate_1345.mjs [index.html]   (1344 = RED: it hard-deletes and has no Trash)
import { createRequire } from 'module'; const require = createRequire(import.meta.url);
import { readFileSync } from 'fs';
const here = new URL('.', import.meta.url).pathname;
const chromium = require('playwright').chromium;
const APP = readFileSync(process.argv[2] || here + '../../../../index.html', 'utf8');
const SETUP = readFileSync(here + 'sentinel_setup_cardinal.js', 'utf8') + '\n;\n' + readFileSync(here + 'e2e_mock_supa.js', 'utf8');
let fail = 0;
const ok = (c, m, d) => { console.log((c ? '  PASS  ' : '  FAIL  ') + m + (d !== undefined ? '  → ' + d : '')); if (!c) fail++; };
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
const p = await ctx.newPage(); p.on('dialog', d => d.accept());
await p.route('**/*', r => r.request().url().startsWith('https://sentinel.test/') ? r.fulfill({ status: 200, contentType: 'text/html', body: APP }) : r.fulfill({ status: 200, body: '' }));
await p.addInitScript(SETUP); await p.goto('https://sentinel.test/?as=theo', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(3000);
const r = await p.evaluate(async () => {
  const pause = ms => new Promise(r => setTimeout(r, ms));
  const out = {};
  try {
    window.__SEED__.inspection_reports.push({ id: 'ctr-del', title: 'Contract — Windows — Test', project: 'Test', project_id: 'p1',
      status: 'unsent', signed_at: new Date().toISOString(), total: 92316, html: '<html><body><p>Signed.</p></body></html>',
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(), created_by: 'theo@cardinalrenovations.net' });
    window.__SEED__.document_trash = [{ id: 'tr-1', doc_id: 'gone-1', project_id: 'p1', title: 'Contract — Exterior — Test',
      deleted_by: 'jacob@cardinalrenovations.net', deleted_at: new Date().toISOString() }];
    await window.reload(); await pause(400);
    window.__WRITES__.length = 0;
    await window.db.remove('ctr-del');
    out.writes = window.__WRITES__.map(w => w.table + ':' + w.op);
  } catch (e) { out.err = String(e && e.message || e); }
  try {
    if (window.openProject) window.openProject('p1'); await pause(1200);
    if (window.showTab) window.showTab('contracts'); await pause(1200);
    const m = document.querySelector('#contractDocsMount + .cr-trash-mount');
    out.trash = m ? m.textContent.replace(/\s+/g, ' ').trim().slice(0, 160) : null;
    const btn = m && m.querySelector('[data-trash-restore]');
    out.hasRestore = !!btn;
    if (btn) { window.__WRITES__.length = 0; btn.click(); await pause(1200); out.restoreWrites = window.__WRITES__.map(w => w.table + ':' + w.op); }
  } catch (e) { out.err2 = String(e && e.message || e); }
  return out;
});
ok(r.writes && r.writes.some(w => /trash_document/.test(w)), 'a delete calls trash_document', JSON.stringify(r.writes || r.err));
ok(r.writes && !r.writes.some(w => /^inspection_reports:delete/.test(w)), 'a delete never hard-deletes the row', JSON.stringify(r.writes));
ok(r.trash && /Trash \(1\)/.test(r.trash) && /Exterior/.test(r.trash), 'the job page lists its Trash under Contracts', r.trash || r.err2);
ok(r.hasRestore, 'each Trash item has Restore');
ok(r.restoreWrites && r.restoreWrites.some(w => /restore_document/.test(w)), 'Restore calls restore_document', JSON.stringify(r.restoreWrites));
await b.close();
console.log(fail ? 'GATE 1345 RED — ' + fail + ' failing' : 'GATE 1345 GREEN');
process.exit(fail ? 1 : 0);
