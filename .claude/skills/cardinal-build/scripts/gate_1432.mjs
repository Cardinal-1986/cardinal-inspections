/* gate_1432 — the Supplement card is retired (Theo, 30 Oct: "Retire card").
 *   S1  an insurance client page carries no Supplement card, no filing sheet, and no window.CardinalSupplement
 *   S2  the module's other job still works: the Scope of Loss card mounts on the insurance page
 *   S3  the page is still quiet while idle (the module's watcher is kept, not removed)
 *   S4  the claim cache no longer asks for supplement_notes; the Insurance lists still read supplement_status
 *   S5  no page errors
 * Arg: [index.html] -> negative control (1431 must go RED). */
import fs from 'fs';
process.env.APPFILE = process.argv[2] || '/home/user/cardinal-inspections/index.html';
const { boot, log } = await import('./gate_1403_lib.mjs');
setTimeout(() => { console.log('TIMEOUT'); process.exit(1); }, 240000).unref();
let pass = 0, fail = 0;
const ok = (c, m, d = '') => { console.log((c ? '  PASS  ' : '  FAIL  ') + m + (d !== '' ? '  → ' + String(d).slice(0, 240) : '')); c ? pass++ : fail++; };
const idle = page => page.evaluate(() => new Promise(res => {
  let n = 0; const mo = new MutationObserver(ms => { n += ms.length; });
  mo.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true });
  setTimeout(() => { mo.disconnect(); res(n); }, 2000);
}));
try {
  const { browser, page } = await boot('theo', { instr: false });
  try {
    await page.evaluate(() => openProject('R1')); await page.waitForTimeout(2200);
    const base = await idle(page);
    await page.evaluate(() => openProject('I1')); await page.waitForTimeout(2500);
    const st = await page.evaluate(() => ({ mount: !!document.getElementById('cr-sp-mount'), modal: !!document.getElementById('cr-sp-modal'),
      api: typeof window.CardinalSupplement, sol: !!document.querySelector('#solCard #solCardEl'), solMount: !!document.getElementById('solCard') }));
    ok(!st.mount && !st.modal && st.api === 'undefined', 'S1  no Supplement card, no filing sheet, no window.CardinalSupplement', JSON.stringify(st));
    ok(st.solMount && st.sol, 'S2  the Scope of Loss card still mounts on the insurance page', JSON.stringify(st));
    const n = await idle(page);
    ok(n <= base + 30, 'S3  the insurance page is still quiet while idle', `${n} vs retail ${base}`);
    const errs = log.filter(l => /PAGEERROR/.test(l));
    ok(errs.length === 0, 'S5  no page errors', errs.slice(0, 3).join(' | '));
  } finally { await browser.close(); }
  const src = fs.readFileSync(process.env.APPFILE, 'utf8');
  ok(!/'supplement_notes,supplement_filed_at'\);/.test(src) && /'supplement_filed_at'\);/.test(src) && (src.match(/supplement_status === 'filed'/g) || []).length >= 3,
    'S4  the claim cache drops supplement_notes; the Insurance lists still read supplement_status');
} catch (e) { ok(false, 'run crashed', String(e.message || e).split('\n')[0].slice(0, 200)); }
console.log((fail ? 'RED' : 'GREEN') + `  ${pass} pass / ${fail} fail`);
process.exit(fail ? 1 : 0);
