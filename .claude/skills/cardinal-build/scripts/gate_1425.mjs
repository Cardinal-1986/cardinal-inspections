/* gate_1425 — insurance and community job pages sit still while nobody touches them.
 *   A  idle for 2 s on I1, I2 (insurance) and C1 (community): no more page changes than a retail job plus a
 *      margin (the clocks tick; nothing else may) — 1424 measured 460-545, retail 22
 *   B  the relabellers still relabel: the forward arrow and the ⋮ menu speak the portal's stage words
 *   C  (1432) the Supplement card stays retired: no mount, no sheet — it was the busiest idle writer here
 * Arg: [index.html] -> negative control (1424 must go RED on A). */
process.env.APPFILE = process.argv[2] || '/home/user/cardinal-inspections/index.html';
const { boot } = await import('./gate_1403_lib.mjs');
setTimeout(() => { console.log('TIMEOUT'); process.exit(1); }, 300000);
let pass = 0, fail = 0;
const ok = (c, m, d = '') => { console.log((c ? '  PASS  ' : '  FAIL  ') + m + (d !== '' ? '  → ' + d : '')); c ? pass++ : fail++; };
const idle = page => page.evaluate(() => new Promise(res => {
  let n = 0; const mo = new MutationObserver(ms => { n += ms.length; });
  mo.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true });
  setTimeout(() => { mo.disconnect(); res(n); }, 2000);
}));
const { browser, page } = await boot('theo', { instr: false });
try {
  await page.evaluate(() => openProject('R1')); await page.waitForTimeout(2500);
  const base = await idle(page);
  ok(base < 60, 'rig: an idle retail job is quiet', String(base));
  for (const id of ['I1', 'I2', 'C1']) {
    await page.evaluate(i => openProject(i), id); await page.waitForTimeout(2500);
    const n = await idle(page);
    ok(n <= base + 30, `A  ${id}: idle for 2 s, no busier than retail`, `${n} vs retail ${base}`);
  }
  await page.evaluate(() => openProject('I1')); await page.waitForTimeout(2000);
  const lab = await page.evaluate(() => ({
    fw: (document.getElementById('dbStgFwd') || {}).title || '',
    opts: [...document.querySelectorAll('#msDrop .estopt')].map(b => b.textContent.trim()),
    sp: !!document.getElementById('cr-sp-mount'),
    modal: !!document.getElementById('cr-sp-modal')
  }));
  ok(/^Advance to /.test(lab.fw) && lab.opts.some(t => /^Advance to /.test(t)), 'B  the arrow and the ⋮ menu still say where the job goes next', JSON.stringify({ fw: lab.fw, opts: lab.opts.slice(0, 3) }));
  ok(!lab.sp && !lab.modal, 'C  (1432) the Supplement card stays retired: no mount, no sheet', JSON.stringify(lab));
} catch (e) { ok(false, 'run crashed', String(e.message || e).split('\n')[0].slice(0, 160)); }
finally { await browser.close(); }
console.log((fail ? 'RED' : 'GREEN') + `  ${pass} pass / ${fail} fail`);
process.exit(fail ? 1 : 0);
