/* gate_1409 — a lead card opens the client at every width; hover previews on a mouse.
 *   A  1280×900: clicking a card opens the profile
 *   B  1280×900: pointing at a card fills the side pane with that lead
 *   C  390 phone: clicking a card still opens the profile
 * Arg: [index.html] -> negative control (1407 must go RED on A). */
process.env.APPFILE = process.argv[2] || '/home/user/cardinal-inspections/index.html';
const { boot } = await import('./gate_1403_lib.mjs');
setTimeout(() => { console.log('TIMEOUT'); process.exit(1); }, 200000);
let pass = 0, fail = 0;
const ok = (c, m, d = '') => { console.log((c ? '  PASS  ' : '  FAIL  ') + m + (d ? '  → ' + d : '')); c ? pass++ : fail++; };
const prof = p => p.evaluate(() => { const v = document.getElementById('projectView'); return !!v && getComputedStyle(v).display !== 'none'; });
for (const desk of [true, false]) {
  const { browser, page } = await boot('theo', { instr: false, desktop: desk });
  try {
    await page.evaluate(() => openLeadsView()); await page.waitForTimeout(1200);
    if (desk) {
      const names = await page.evaluate(() => [...document.querySelectorAll('.ljcard .ljnm')].map(n => n.textContent));
      await page.hover('.ljcard:nth-child(2) .ljmain'); await page.waitForTimeout(400);
      const pane = await page.evaluate(() => (document.querySelector('#ljPane .ljpname') || {}).textContent || '');
      ok(names.length > 1 && pane === names[1], 'B  hovering a card previews it in the side pane', JSON.stringify({ pane, want: names[1] }));
      await page.click('.ljcard:nth-child(1) .ljmain'); await page.waitForTimeout(1200);
      ok(await prof(page), 'A  desktop: clicking a lead opens its profile');
    } else {
      await page.click('.ljcard .ljmain'); await page.waitForTimeout(1200);
      ok(await prof(page), 'C  phone: clicking a lead opens its profile');
    }
  } catch (e) { ok(false, (desk ? 'desktop' : 'phone') + ' crashed', e.message.split('\n')[0].slice(0, 140)); }
  finally { await browser.close(); }
}
console.log((fail ? 'RED' : 'GREEN') + `  ${pass} pass / ${fail} fail`);
process.exit(fail ? 1 : 0);
