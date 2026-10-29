/* gate_1421 — the shared task sheet (#tskModal: New work order, Measurements) reads on its white card.
 *   A  every text colour in the sheet clears 4.5:1 against the card it sits on, dark AND light theme
 *   B  the close × is a 44px target and reads >= 4.5:1
 *   C  the heading is the app sans, not Georgia
 * Arg: [index.html] -> negative control (1420 must go RED). */
process.env.APPFILE = process.argv[2] || '/home/user/cardinal-inspections/index.html';
const { boot } = await import('./gate_1403_lib.mjs');
setTimeout(() => { console.log('TIMEOUT'); process.exit(1); }, 240000);
let pass = 0, fail = 0;
const ok = (c, m, d = '') => { console.log((c ? '  PASS  ' : '  FAIL  ') + m + (d ? '  → ' + d : '')); c ? pass++ : fail++; };
const SEED = `window.__SEED__.crews = [{ id:'cw1', name:'Sample Roof Crew', trade:'Roofing', archived:false }];`;
const { browser, page } = await boot('theo', { instr: false, seed: SEED });
const worst = () => page.evaluate(() => {
  const rgb = s => (s.match(/[\d.]+/g) || []).map(Number);
  const L = c => { const v = c.slice(0, 3).map(x => { x /= 255; return x <= .03928 ? x / 12.92 : Math.pow((x + .055) / 1.055, 2.4); }); return .2126 * v[0] + .7152 * v[1] + .0722 * v[2]; };
  const ratio = (a, b) => { const x = L(a), y = L(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
  const ground = el => { for (let e = el; e; e = e.parentElement) { const c = rgb(getComputedStyle(e).backgroundColor); if (c.length >= 3 && (c.length < 4 || c[3] > .9)) return c; } return [0, 0, 0]; };
  let min = 99, at = '', n = 0;
  document.querySelectorAll('#tskModal *').forEach(e => {
    if (!e.getClientRects().length || ![...e.childNodes].some(t => t.nodeType === 3 && t.textContent.trim())) return;
    if (e.tagName === 'OPTION' || e.tagName === 'OPTGROUP') return;
    n++; const r = ratio(rgb(getComputedStyle(e).color), ground(e));
    if (r < min) { min = r; at = (e.id || e.className || e.tagName) + ' "' + e.textContent.trim().slice(0, 30) + '"'; }
  });
  const x = document.getElementById('tskModalX'), xr = x.getBoundingClientRect();
  const h = document.getElementById('tskModalTitle');
  return { min: Math.round(min * 100) / 100, at, n, xw: Math.round(xr.width), xh: Math.round(xr.height),
           xratio: Math.round(ratio(rgb(getComputedStyle(x).color), ground(x)) * 100) / 100, hff: getComputedStyle(h).fontFamily };
});
try {
  const pid = await page.evaluate(() => (window.cacheProjects || [])[0].id);
  await page.evaluate(id => openProject(id), pid); await page.waitForTimeout(900);
  for (const which of ['work order', 'measurements']) {
    await page.evaluate(w => { if (w === 'work order') openWorkOrderPicker(currentProject); else openMeasModal(currentProject); }, which);
    await page.waitForTimeout(900);
    for (const theme of ['dark', 'light']) {
      await page.evaluate(th => { if (th === 'light') document.documentElement.setAttribute('data-theme', 'rb-light'); else document.documentElement.removeAttribute('data-theme'); }, theme);
      await page.waitForTimeout(200);
      const w = await worst();
      ok(w.n >= 4 && w.min >= 4.5, `A  ${which}, ${theme}: every label clears 4.5:1 on the card`, JSON.stringify({ min: w.min, at: w.at, n: w.n }));
      ok(w.xw >= 44 && w.xh >= 44 && w.xratio >= 4.5, `B  ${which}, ${theme}: the close × is 44px and reads`, JSON.stringify({ w: w.xw, h: w.xh, r: w.xratio }));
      if (theme === 'dark') ok(!/georgia|times/i.test(w.hff), `C  ${which}: the heading is the app sans`, w.hff);
    }
    await page.evaluate(() => { document.documentElement.removeAttribute('data-theme'); document.getElementById('tskModal').style.display = 'none'; });
  }
} catch (e) { ok(false, 'run crashed', e.message.split('\n')[0].slice(0, 160)); }
finally { await browser.close(); }
console.log((fail ? 'RED' : 'GREEN') + `  ${pass} pass / ${fail} fail`);
process.exit(fail ? 1 : 0);
