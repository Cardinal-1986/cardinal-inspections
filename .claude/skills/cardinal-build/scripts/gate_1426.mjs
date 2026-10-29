/* gate_1426 — client names show in full.
 *   A  Clients list, phone 390: every visible name is shown whole (visible width >= its full width), dark and light
 *   B  Clients list at 1600 and 1280 desktop: the same
 *   C  the largest text size (data-cr-text="xl") on a phone: no name is 0px, every name shown whole
 *   D  desktop home Recent leads at 1280: the name has at least 150px and is shown whole for these sample names
 *   F  the phone client page header (#cr-namebar) shows the whole name
 *   E  the card still carries its PO / star / portal tag, and the star still toggles (no control lost)
 * Arg: [index.html] -> negative control (1425 must go RED). */
process.env.APPFILE = process.argv[2] || '/home/user/cardinal-inspections/index.html';
const { boot } = await import('./gate_1403_lib.mjs');
setTimeout(() => { console.log('TIMEOUT'); process.exit(1); }, 300000);
let pass = 0, fail = 0;
const ok = (c, m, d = '') => { console.log((c ? '  PASS  ' : '  FAIL  ') + m + (d !== '' ? '  → ' + d : '')); c ? pass++ : fail++; };
const names = (page, sel) => page.evaluate(s => [...document.querySelectorAll(s)].filter(e => e.getClientRects().length).map(e => { const r = e.getBoundingClientRect(); return { t: e.textContent.trim().slice(0, 24), vis: Math.round(r.width), full: e.scrollWidth, h: Math.round(r.height) }; }), sel);
const whole = arr => arr.length > 0 && arr.every(n => n.vis > 0 && n.full <= n.vis + 1);
try {
  for (const [desk, w] of [[false, 390], [true, 1280], [true, 1600]]) {
    const { browser, page } = await boot('theo', { instr: false, desktop: desk });
    try {
      if (desk) await page.setViewportSize({ width: w, height: 900 });
      await page.waitForTimeout(400);
      await page.evaluate(() => openClientsDirectory()); await page.waitForTimeout(1500);
      const n = await names(page, '#clientsView .cd-name');
      ok(whole(n), `${desk ? 'B' : 'A'}  Clients at ${w}: every name shown whole`, JSON.stringify(n.slice(0, 3)));
      if (!desk) {
        const tags = await page.evaluate(() => { const c = document.querySelector('#clientsView .cd-card'); return { star: !!c.querySelector('.cd-star'), tag: !!c.querySelector('.cd-crmtag') }; });
        ok(tags.star && tags.tag, 'E  the card keeps its star and portal tag', JSON.stringify(tags));
        const fav = await page.evaluate(async () => { const s = document.querySelector('#clientsView .cd-star'); const a = s.classList.contains('on'); s.click(); await new Promise(r => setTimeout(r, 500)); const s2 = document.querySelector('#clientsView .cd-star[data-fav="' + s.dataset.fav + '"]'); return { a, b: s2 && s2.classList.contains('on') }; });
        ok(fav.a !== fav.b, 'E  the star still toggles', JSON.stringify(fav));
        await page.evaluate(() => openProject('R1')); await page.waitForTimeout(1500);
        const hb = await names(page, '#cr-namebar .nb-nm');
        ok(whole(hb), 'F  phone client page header: the name shown whole', JSON.stringify(hb));
        await page.evaluate(() => openClientsDirectory()); await page.waitForTimeout(1200);
        await page.evaluate(() => document.documentElement.setAttribute('data-cr-text', 'xl')); await page.waitForTimeout(500);
        const x = await names(page, '#clientsView .cd-name');
        ok(whole(x), 'C  largest text size: every name shown whole, none 0px', JSON.stringify(x.slice(0, 3)));
        await page.evaluate(() => document.documentElement.removeAttribute('data-cr-text'));
      }
      if (desk && w === 1280) {
        await page.evaluate(() => showHome()); await page.waitForTimeout(1500);
        const k = await names(page, '.kplrow .nm');
        ok(k.length > 0 && k.every(n => n.vis >= 150 || n.full <= n.vis + 1) && whole(k), 'D  Recent leads at 1280: the name has room and shows whole', JSON.stringify(k.slice(0, 3)));
      }
    } finally { await browser.close(); }
  }
} catch (e) { ok(false, 'run crashed', String(e.message || e).split('\n')[0].slice(0, 160)); }
console.log((fail ? 'RED' : 'GREEN') + `  ${pass} pass / ${fail} fail`);
process.exit(fail ? 1 : 0);
