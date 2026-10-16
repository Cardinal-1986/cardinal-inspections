// gate_1359 — job files live in file storage, up to 50 MB each, several at once.
// A: Documents takes [small.pdf, 12 MB.pdf, 51 MB.zip, fail.pdf, after.pdf]: the 12 MB file uploads (1358: refused at
//    10 MB), the 51 MB one is named as over 50 MB, the failed one is named, and after.pdf still uploads (no stop).
// B: the stored rows carry {bucket:'job-files', path:'p1/…'} and no base64 `data`.
// C: opening a stored file hands the browser its real bytes; an OLD row with `data` still opens.
// D: an insurance document goes to storage too.
// node gate_1359.mjs [index.html]   (1358 = RED)
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
const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
const p = await ctx.newPage(); p.on('dialog', d => d.accept());
await p.route('**/*', r => r.request().url().startsWith('https://sentinel.test/') ? r.fulfill({ status: 200, contentType: 'text/html', body: APP }) : r.fulfill({ status: 200, body: '' }));
await p.addInitScript(SETUP); await p.goto('https://sentinel.test/', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(3000);
const r = await p.evaluate(async () => {
  const pause = ms => new Promise(r => setTimeout(r, ms));
  const out = {};
  /* the mock's storage forgets bytes; make it keep them, and refuse one name */
  const proto = Object.getPrototypeOf(window.sb.storage.from('job-files'));
  const kept = {}; window.__KEPT__ = kept;
  const up0 = proto.upload;
  proto.upload = function (path, file) { if (/fail\.pdf$/.test(path)) return Promise.resolve({ data: null, error: { message: 'mock refusal' } }); kept[this.name + ':' + path] = file; return up0.call(this, path, file); };
  proto.download = function (path) { const f = kept[this.name + ':' + path]; return Promise.resolve(f ? { data: f, error: null } : { data: null, error: { message: 'not found' } }); };
  const opened = []; window.open = function () { const w = { closed: false, close() {}, set location(u) { opened.push(u); } }; return w; };
  window.openProject('p1'); await pause(2000);
  if (typeof window.openDocsPage === 'function') window.openDocsPage(); await pause(600);
  const mk = (n, mb, t) => new File([new Uint8Array(Math.round(mb * 1024 * 1024))], n, { type: t || 'application/pdf' });
  const files = [mk('small.pdf', 0.02), mk('big12.pdf', 12), mk('huge51.zip', 51, 'application/zip'), mk('fail.pdf', 0.02), mk('after.pdf', 0.02)];
  const w0 = (window.__WRITES__ || []).length;
  try { await window.addJobFiles(files); } catch (e) { out.err = String(e && e.message || e); }
  await pause(800);
  out.status = (document.getElementById('jdStatus') || {}).textContent || '';
  const ins = (window.__WRITES__ || []).slice(w0).filter(w => w.table === 'inspection_reports' && w.op === 'insert');
  const pay = x => { const pl = Array.isArray(x.payload) ? x.payload[0] : x.payload; try { return JSON.parse(pl.html); } catch (e) { return {}; } };
  out.rows = ins.map(x => { const m = pay(x); const pl = Array.isArray(x.payload) ? x.payload[0] : x.payload; return { t: pl.title, path: m.path || null, bucket: m.bucket || null, data: !!m.data, size: m.size }; });
  out.kept = Object.keys(kept);
  /* C: open the 12 MB stored file */
  const S = window.__SEED__;
  const big = (S.inspection_reports || []).find(x => /big12\.pdf/.test(x.title || ''));
  if (big) {
    opened.length = 0;
    await window.openJobFile(big.id); await pause(800);
    const u = opened[0];
    out.openUrl = u ? u.slice(0, 5) : null;
    if (u) { const bl = await (await fetch(u)).blob(); out.openSize = bl.size; }
  }
  /* C: an old row with the bytes inline */
  const now = new Date().toISOString();
  const oldData = 'data:application/pdf;base64,' + btoa('%PDF-1.4 old file');
  S.inspection_reports.push({ id: 'old-f', title: 'File: old.pdf', project_id: 'p1', html: JSON.stringify({ file: 1, name: 'old.pdf', mime: 'application/pdf', size: 17, data: oldData }), created_at: now, updated_at: now });
  opened.length = 0;
  await window.openJobFile('old-f'); await pause(800);
  if (opened[0]) { const bl = await (await fetch(opened[0])).blob(); out.oldSize = bl.size; }
  /* D */
  const w1 = (window.__WRITES__ || []).length;
  try { await window.uploadInsuranceDoc('scope', mk('scope15.pdf', 15)); out.insOk = true; } catch (e) { out.insErr = String(e && e.message || e); }
  const ins2 = (window.__WRITES__ || []).slice(w1).filter(w => w.table === 'inspection_reports' && w.op === 'insert');
  out.ins = ins2.map(x => { const m = pay(x); return { path: m.path || null, data: !!m.data }; });
  return out;
});
const byName = n => (r.rows || []).find(x => new RegExp(n).test(x.t || ''));
ok(byName('big12') && byName('big12').path, 'A: a 12 MB PDF uploads (was refused over 10 MB)', JSON.stringify(byName('big12')));
ok(byName('small') && byName('after') && (r.rows || []).length === 3, 'A: one failure does not stop the rest — 3 of 5 added', JSON.stringify((r.rows || []).map(x => x.t)));
ok(/Over 50 MB[^.]*huge51\.zip/.test(r.status) && /Could not upload[^.]*fail\.pdf/.test(r.status) && /Added 3 files/.test(r.status), 'A: the page names the too-big file and the failed one', r.status);
ok((r.rows || []).length === 3 && r.rows.every(x => x.bucket === 'job-files' && /^p1\//.test(x.path || '') && !x.data), 'B: rows point at job-files/p1/… and carry no base64', JSON.stringify(r.rows));
ok(r.openUrl === 'blob:' && r.openSize === 12 * 1024 * 1024, 'C: opening the stored file hands over its real bytes', JSON.stringify({ u: r.openUrl, size: r.openSize }));
ok(r.oldSize === 17, 'C: an old file with its bytes inline still opens', r.oldSize);
ok(r.insOk && r.ins && r.ins.length === 1 && r.ins[0].path && !r.ins[0].data, 'D: a 15 MB insurance document goes to storage', JSON.stringify({ ok: r.insOk, err: r.insErr, ins: r.ins }));
await b.close();
console.log(fail ? 'GATE 1359 RED — ' + fail + ' failing' : 'GATE 1359 GREEN');
process.exit(fail ? 1 : 0);
