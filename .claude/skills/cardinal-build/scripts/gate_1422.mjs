/* gate_1422 — the Ask button wears the portal colour and is a round star on a phone.
 *   A  its fill is the CRM's identity hue in retail / insurance / community, dark and light, matching the +
 *   B  its label/star clears 4.5:1 on that fill in every case
 *   C  on a phone it is 52x52 with a 22px star (1373's shape, which had been losing to the base rule)
 *   D  on a desktop it is still the labelled pill (48 tall, label shown)
 * Arg: [index.html] -> negative control (1421 must go RED). */
process.env.APPFILE = process.argv[2] || '/home/user/cardinal-inspections/index.html';
const { boot } = await import('./gate_1403_lib.mjs');
setTimeout(() => { console.log('TIMEOUT'); process.exit(1); }, 240000);
let pass = 0, fail = 0;
const ok = (c, m, d = '') => { console.log((c ? '  PASS  ' : '  FAIL  ') + m + (d ? '  → ' + d : '')); c ? pass++ : fail++; };
const read = p => p.evaluate(() => {
  const f = document.getElementById('cr-ai-fab'), cs = getComputedStyle(f), r = f.getBoundingClientRect();
  const want = getComputedStyle(document.body).getPropertyValue('--crm-id').trim();
  const rgb = s => (s.match(/[\d.]+/g) || []).map(Number);
  const L = c => { const v = c.slice(0, 3).map(x => { x /= 255; return x <= .03928 ? x / 12.92 : Math.pow((x + .055) / 1.055, 2.4); }); return .2126 * v[0] + .7152 * v[1] + .0722 * v[2]; };
  const ratio = (a, b) => { const x = L(a), y = L(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
  const hex = h => { h = h.replace('#', ''); return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)); };
  return { bg: cs.backgroundColor, want, match: !!want && rgb(cs.backgroundColor).slice(0, 3).join() === hex(want).join(),
           ratio: Math.round(ratio(rgb(cs.color), rgb(cs.backgroundColor)) * 100) / 100,
           w: Math.round(r.width), h: Math.round(r.height), fs: cs.fontSize, lbl: getComputedStyle(f.querySelector('.cr-ai-lbl')).display, on: cs.display !== 'none' };
});
try {
  for (const desk of [false, true]) {
    const { browser, page } = await boot('theo', { instr: false, desktop: desk });
    try {
      await page.waitForTimeout(500);
      for (const crm of ['retail', 'insurance', 'community']) for (const theme of ['dark', 'light']) {
        await page.evaluate(([c, t]) => { document.body.setAttribute('data-crm', c); if (t === 'light') document.documentElement.setAttribute('data-theme', 'rb-light'); else document.documentElement.removeAttribute('data-theme'); }, [crm, theme]);
        await page.waitForTimeout(150);
        const r = await read(page);
        if (!desk) {
          ok(r.on && r.match, `A  ${crm}/${theme}: the Ask fill is the CRM identity hue`, JSON.stringify({ bg: r.bg, want: r.want }));
          ok(r.ratio >= 4.5, `B  ${crm}/${theme}: the star reads on it`, String(r.ratio));
        }
      }
      await page.evaluate(() => { document.body.setAttribute('data-crm', 'retail'); document.documentElement.removeAttribute('data-theme'); });
      const r = await read(page);
      if (!desk) ok(r.w === 52 && r.h === 52 && r.fs === '22px' && r.lbl === 'none', 'C  phone: a 52x52 round star at 22px', JSON.stringify(r));
      else ok(r.h === 48 && r.lbl !== 'none' && r.w > 60, 'D  desktop: still the labelled pill', JSON.stringify(r));
    } finally { await browser.close(); }
  }
} catch (e) { ok(false, 'run crashed', e.message.split('\n')[0].slice(0, 160)); }
console.log((fail ? 'RED' : 'GREEN') + `  ${pass} pass / ${fail} fail`);
process.exit(fail ? 1 : 0);
