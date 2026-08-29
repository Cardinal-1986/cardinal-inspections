/* gate_1149b — drive the ACTUAL incident in a browser.
 *
 * Reading the code proves the shape. This proves the behaviour: force db.get()
 * to return undefined (the offline cache miss that caused it), then check that
 *   a) the app says something,
 *   b) the frame's document stamp is cleared, and
 *   c) the signature pad REFUSES to open.
 *
 * Control (1148) -> the pad OPENS on a stale document. That is the bug.
 */
import { chromium } from 'playwright';
import { readFileSync } from 'fs';
const FILE = process.argv[2] || '../../../../index.html';
const HTML = readFileSync(FILE, 'utf8');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  PASS  ' + m); }
                       else { fail++; console.log('  FAIL  ' + m); } };

const b = await chromium.launch();
const p = await b.newPage({ viewport:{ width: 390, height: 844 } });
await p.route('**/*', r => r.request().url().startsWith('https://sentinel.test/')
  ? r.fulfill({ status:200, contentType:'text/html; charset=utf-8', body:HTML })
  : r.fulfill({ status:200, body:'' }));
for (const f of ['sentinel_setup_cardinal.js','e2e_mock_supa.js'])
  await p.addInitScript(readFileSync(f, 'utf8'));
await p.goto('https://sentinel.test/', { waitUntil:'domcontentloaded' });
await p.waitForTimeout(2600);

const r = await p.evaluate(async () => {
  const out = { errors: [], reachable: false };
  const frame = document.getElementById('reportFrame');
  const sigBtn = document.getElementById('sigBtn');
  const sigModal = document.getElementById('sigModal');
  if (!frame || !sigBtn || !sigModal) { out.missing = true; return out; }
  out.reachable = true;

  /* capture anything the app tries to tell the user */
  ['showError','crTell'].forEach(n => {
    const o = window[n];
    if (typeof o === 'function') window[n] = function(m){ out.errors.push(String(m).slice(0,110)); };
  });

  /* SIMULATE THE INCIDENT: a document is already loaded and stamped … */
  frame.dataset.docId = 'DOC-A-service-contract';
  out.stampBefore = frame.dataset.docId;

  /* …then the user taps another document that is NOT on this device.
     That is exactly what db.get returns offline: undefined, no throw. */
  const realGet = (window.db && window.db.get);
  if (window.db) window.db.get = async () => undefined;
  try { if (typeof window.openEditor === 'function') await window.openEditor('DOC-B-roofing'); }
  catch (e) { out.threw = String(e).slice(0,90); }
  if (window.db && realGet) window.db.get = realGet;

  out.stampAfter = frame.dataset.docId || '(cleared)';

  /* now the client is handed the phone and the rep taps sign */
  sigModal.style.display = 'none';
  sigBtn.click();
  await new Promise(z => setTimeout(z, 250));
  out.padOpened = getComputedStyle(sigModal).display !== 'none';
  return out;
});

if (!r.reachable) { ok(false, 'editor + signature elements present in this harness (skipped run)'); }
else {
  console.log(`        stamp before "${r.stampBefore}" -> after "${r.stampAfter}" · pad opened: ${r.padOpened}`);
  console.log(`        messages: ${r.errors.length ? r.errors.join(' | ') : '(none)'}`);
  ok(r.errors.length > 0, 'a cache miss TELLS the user something happened');
  ok(/not on this device|do not sign|NOTHING WAS OPENED/i.test(r.errors.join(' ')),
     '  · and the message warns against signing what is on screen');
  ok(r.stampAfter === '(cleared)', 'the stale document stamp is cleared by the miss');
  ok(r.padOpened === false, 'THE SIGNATURE PAD REFUSES TO OPEN on an unproven document');
}
await b.close();
console.log(fail ? `\nRED — ${fail} failed, ${pass} passed` : `\nGREEN — all ${pass} checks passed`);
process.exit(fail ? 1 : 0);
