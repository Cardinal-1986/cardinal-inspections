/* gate_1425 — insurance and community job pages sit still while nobody touches them.
 *   A  idle for 2 s on I1, I2 (insurance) and C1 (community): no more page changes than a retail job plus a
 *      margin (the clocks tick; nothing else may) — 1424 measured 460-545, retail 22
 *   B  the relabellers still relabel: the forward arrow and the ⋮ menu speak the portal's stage words
 *   C  the Supplement card is drawn, and File a supplement still opens its sheet
 *   D  the card still repaints when the claim changes (the guard compares, it does not freeze)
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
    sp: !!document.querySelector('#cr-sp-mount .cr-sp-card'),
    btn: !!document.querySelector('#cr-sp-mount [data-act="file"]')
  }));
  ok(/^Advance to /.test(lab.fw) && lab.opts.some(t => /^Advance to /.test(t)), 'B  the arrow and the ⋮ menu still say where the job goes next', JSON.stringify({ fw: lab.fw, opts: lab.opts.slice(0, 3) }));
  ok(lab.sp && lab.btn, 'C  the Supplement card is drawn with its File button', JSON.stringify(lab));
  if (lab.btn) {
    await page.evaluate(() => document.querySelector('#cr-sp-mount [data-act="file"]').click()); await page.waitForTimeout(600);
    const open = await page.evaluate(() => { const m = document.getElementById('cr-sp-modal'); return !!m && m.classList.contains('open'); });
    ok(open, 'C  File a supplement opens its sheet');
    await page.evaluate(() => { const m = document.getElementById('cr-sp-modal'); if (m) m.classList.remove('open'); document.body.style.overflow = ''; });
  }
  const before = await page.evaluate(() => (document.querySelector('#cr-sp-mount .pill') || {}).textContent || '');
  const after = await page.evaluate(async () => {
    const c = window.CardinalInsurance && window.CardinalInsurance.claim && window.CardinalInsurance.claim(currentProject.id);
    if (!c) return 'no claim object';
    c.supplement_status = 'filed'; c.supplement_filed = 4200;
    document.body.appendChild(document.createElement('i'));   /* any body change wakes the card's watcher */
    await new Promise(r => setTimeout(r, 900));
    return (document.querySelector('#cr-sp-mount .pill') || {}).textContent || '';
  });
  ok(after && after !== before && after !== 'no claim object', 'D  the card repaints when the claim changes', JSON.stringify({ before, after }));
} catch (e) { ok(false, 'run crashed', String(e.message || e).split('\n')[0].slice(0, 160)); }
finally { await browser.close(); }
console.log((fail ? 'RED' : 'GREEN') + `  ${pass} pass / ${fail} fail`);
process.exit(fail ? 1 : 0);
