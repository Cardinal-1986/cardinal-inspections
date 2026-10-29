/* gate_1412 — the three bottom sheets sit above the installed app's nav.
 *   A  phone, body.standalone: Upload signed contract opens and its Save button is the topmost element at its own centre
 *   B  #ctUpSheet, #apptCalSheet, #ljAsk each compute a z-index above #pwaNav's
 * Arg: [index.html] -> negative control (1411 must go RED). */
process.env.APPFILE = process.argv[2] || '/home/user/cardinal-inspections/index.html';
const { boot } = await import('./gate_1403_lib.mjs');
setTimeout(() => { console.log('TIMEOUT'); process.exit(1); }, 200000);
let pass = 0, fail = 0;
const ok = (c, m, d = '') => { console.log((c ? '  PASS  ' : '  FAIL  ') + m + (d ? '  → ' + d : '')); c ? pass++ : fail++; };
const { browser, page } = await boot('theo', { instr: false });
try {
  await page.evaluate(() => document.body.classList.add('standalone'));
  const pid = await page.evaluate(() => (window.cacheProjects || []).filter(p => p.checklist)[0]?.id || (window.cacheProjects || [])[0]?.id);
  await page.evaluate(id => openProject(id), pid); await page.waitForTimeout(1200);
  await page.evaluate(() => document.getElementById('pUploadContractBtn').click()); await page.waitForTimeout(600);
  const r = await page.evaluate(() => {
    const sh = document.getElementById('ctUpSheet');
    if (!sh || !sh.classList.contains('open')) return { open: false };
    const bs = [...sh.querySelectorAll('button')].filter(x => x.offsetParent);
    if (bs.length < 2) return { open: true, btn: false };
    bs[bs.length - 1].scrollIntoView({ block: 'end' });
    const nav = document.getElementById('pwaNav'), out = [];
    let all = true;
    for (const b of bs) {
      const q = b.getBoundingClientRect(), hit = document.elementFromPoint(q.left + q.width / 2, q.top + q.height / 2);
      const top = !!hit && sh.contains(hit); all = all && top;
      out.push(b.textContent.trim() + ':' + (top ? 'ok' : (hit ? (hit.id || hit.className || hit.tagName) : 'none')));
    }
    return { open: true, btn: out.join(' / '), onTop: all, navShown: !!nav && getComputedStyle(nav).display !== 'none' };
  });
  ok(r.open && r.navShown && r.onTop, 'A  Upload signed contract: every button (Save, Cancel) is tappable above the installed nav', JSON.stringify(r));
  const z = await page.evaluate(() => {
    const nz = +getComputedStyle(document.getElementById('pwaNav')).zIndex;
    return ['ctUpSheet', 'apptCalSheet', 'ljAsk'].map(id => {
      let e = document.getElementById(id), made = false;
      if (!e) { e = document.createElement('div'); e.id = id; document.body.appendChild(e); made = true; }
      const v = +getComputedStyle(e).zIndex; if (made) e.remove();
      return { id, z: v, nav: nz };
    });
  });
  for (const x of z) ok(x.z > x.nav, 'B  #' + x.id + ' is above the nav', JSON.stringify(x));
} catch (e) { ok(false, 'crashed', e.message.split('\n')[0].slice(0, 160)); }
finally { await browser.close(); }
console.log((fail ? 'RED' : 'GREEN') + `  ${pass} pass / ${fail} fail`);
process.exit(fail ? 1 : 0);
