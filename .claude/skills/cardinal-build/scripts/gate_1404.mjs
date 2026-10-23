/* gate_1404 — photos, quick inspection, estimate builder (390px, America/New_York, the 1401 seed).
 *   A  the Photo Album keeps going past an unreadable file and says which failed
 *   B  a photo row insert that fails once keeps its file (no row pointing at a removed file)
 *   C  a refused photo-row delete leaves the file in storage
 *   D  editing / duplicating an estimate never rewrites the original's photo captions or cover
 *   E  estimate line amounts are cents and add up to the subtotal; the discount is clamped; Valid through is local
 *   F  quick-inspection shots carry their label; unsaved shots are counted for the resume line
 * Arg: [index.html] -> negative control (1403 must go RED). */
process.env.APPFILE = process.argv[2] || '/home/user/cardinal-inspections/index.html';
import fs from 'fs';
const SRC = fs.readFileSync(process.env.APPFILE, 'utf8');
const { boot } = await import('./gate_1403_lib.mjs');
setTimeout(() => { console.log('TIMEOUT'); process.exit(1); }, 280000);
let pass = 0, fail = 0;
const ok = (c, m, d = '') => { console.log((c ? '  PASS  ' : '  FAIL  ') + m + (d ? '  → ' + d : '')); c ? pass++ : fail++; };
const tryDo = async (why, f) => { try { return await f(); } catch (e) { ok(false, why + ' (crashed)', e.message.split('\n')[0].slice(0, 140)); return null; } };

/* A, B, C — photos */
{
  const { browser, page } = await boot('theo', { instr: false });
  const W = () => page.evaluate(() => __WRITES__.filter(w => /photo/.test(w.table)).map(w => w.table + ' ' + w.op + ' ' + JSON.stringify(w.payload || w.filters)));
  try {
    await page.evaluate(() => openProject('R1')); await page.waitForTimeout(2000);
    await page.evaluate(() => openGalleryMode('all')); await page.waitForTimeout(1500);
    const jpg = Buffer.from(await page.evaluate(async () => { const c = document.createElement('canvas'); c.width = 800; c.height = 600; const x = c.getContext('2d'); x.fillStyle = '#c33'; x.fillRect(0, 0, 800, 600); const b = await new Promise(r => c.toBlob(r, 'image/jpeg', .9)); const a = new Uint8Array(await b.arrayBuffer()); let s = ''; a.forEach(v => s += String.fromCharCode(v)); return btoa(s); }), 'base64');
    const bad = Buffer.from('this is not an image at all '.repeat(50));
    await tryDo('A', async () => {
      await page.setInputFiles('#galFileInput', [{ name: 'a.jpg', mimeType: 'image/jpeg', buffer: jpg }, { name: 'IMG_0002.HEIC', mimeType: 'image/heic', buffer: bad }, { name: 'c.jpg', mimeType: 'image/jpeg', buffer: jpg }, { name: 'd.jpg', mimeType: 'image/jpeg', buffer: jpg }]);
      await page.waitForTimeout(6000);
      const st = await page.evaluate(() => document.getElementById('galStatus').textContent);
      const rows = await page.evaluate(() => (__SEED__.project_photos || []).length);
      ok(rows === 3 && /Added 3 of 4/.test(st) && /IMG_0002\.HEIC/.test(st), 'A  the album keeps going past a bad file and names it', rows + ' rows · ' + st.slice(0, 120));
    });
    await tryDo('B', async () => {
      await page.evaluate(() => { let n = 0; Object.defineProperty(window, '__MOCK_FAIL__', { configurable: true, get() { return (window.__F1__ && n++ === 0) ? 'project_photos' : null; } }); window.__F1__ = 1; window.__WRITES__.length = 0; });
      await page.setInputFiles('#galFileInput', [{ name: 'e.jpg', mimeType: 'image/jpeg', buffer: jpg }]);
      await page.waitForTimeout(4000);
      const w = await W();
      ok(!w.some(x => /storage:photos remove/.test(x)) && w.some(x => /project_photos insert/.test(x)), 'B  a row insert that fails once keeps its file', JSON.stringify(w.map(x => x.slice(0, 60))));
    });
    await tryDo('C', async () => {
      await page.evaluate(() => { window.__F1__ = 0; window.__WRITES__.length = 0; });
      const r = await page.evaluate(async () => { const id = __SEED__.project_photos[0].id; Object.defineProperty(window, '__MOCK_FAIL__', { configurable: true, value: 'project_photos', writable: true }); try { await photoDb.remove(id); return 'ok'; } catch (e) { return 'threw'; } finally { window.__MOCK_FAIL__ = null; } });
      const w = await W();
      ok(r === 'threw' && !w.some(x => /storage:photos remove/.test(x)), 'C  a refused row delete leaves the file in storage', r + ' ' + JSON.stringify(w.map(x => x.slice(0, 60))));
    });
  } finally { await browser.close(); }
}

/* D, E — estimate builder */
{
  const seed = `(function(){var S=window.__SEED__; S.photos=[{id:'ph1',project_id:'R1',data:'https://x/p1.jpg',storage_path:'photos/R1/p1.jpg',caption:'orig cap',created_at:new Date().toISOString()}];
  S.estimates.push({id:'eR1',project_id:'R1',estimate_number:'EST-2026-0200',title:'Estimate — Sample Retail One',status:'draft',archived:false,line_items:[{name:'Roof',qty:1,unit_price:100,amount:100}],photos:[{photo_id:'ph1',path:'photos/R1/p1.jpg',url:'https://x/p1.jpg',caption:'orig cap'}],subtotal:'100.00',discount:'0.00',total:'100.00',deposit_pct:30,deposit_amount:'30.00',created_by:'theo@cardinalrenovations.net',created_at:new Date().toISOString()});})();`;
  const { browser, page } = await boot('theo', { seed, instr: false, clock: '2026-10-23T22:30:00-04:00' });
  const T = ms => page.clock.runFor(ms);
  const openSaved = async () => { await page.evaluate(() => document.querySelector('#cr-est-saved-slot .cr-est-saved-row').click()); await T(800); };
  try {
    await page.evaluate(() => openProject('R1')); await T(3000);
    await tryDo('D', async () => {
      await openSaved();
      await page.locator('#cr-est-view [data-pf="caption"]').first().fill('UNSAVED caption'); await T(200);
      await page.evaluate(() => CardinalEstimates.close()); await T(300);
      await openSaved();
      const c1 = await page.evaluate(() => document.querySelector('#cr-est-view [data-pf="caption"]').value);
      await page.locator('#cr-est-view [data-act="dup"]').click({ force: true }); await T(800);
      await page.locator('#cr-est-view [data-pf="caption"]').first().fill('DUPLICATE caption'); await T(200);
      await page.evaluate(() => CardinalEstimates.close()); await T(300);
      await openSaved();
      const c2 = await page.evaluate(() => document.querySelector('#cr-est-view [data-pf="caption"]').value);
      ok(c1 === 'orig cap' && c2 === 'orig cap', 'D  a discarded edit and a copy’s caption never reach the original', JSON.stringify([c1, c2]));
    });
    await tryDo('E', async () => {
      const vt = await page.evaluate(() => { CardinalEstimates.close(); CardinalEstimates.openEditor(window.currentProject, null); return document.querySelector('#cr-est-view [data-f="valid_through"]').value; });
      ok(vt === '2026-11-22', 'E1 Valid through is the local date at 10:30pm', vt);
      for (let k = 0; k < 3; k++) { await page.evaluate(() => document.querySelector('#cr-est-view [data-act=add-custom]').click()); await T(200); }
      const n = await page.locator('#cr-est-view [data-lf="unit_price"]').count();
      for (let k = 0; k < n; k++) {
        await page.locator('#cr-est-view [data-lf="qty"]').nth(k).fill('1.5');
        await page.locator('#cr-est-view [data-lf="unit_price"]').nth(k).fill('10.01');
      }
      await T(300);
      const sub = await page.evaluate(() => (document.querySelector('#cr-est-view [data-t="subtotal"]') || {}).textContent || '');
      ok(n === 3 && /45\.06/.test(sub), 'E2 three 1.5 × $10.01 lines make a $45.06 subtotal', n + ' lines · ' + sub);
      await page.locator('#cr-est-view [data-f="discount"]').fill('-500'); await T(200);
      const tot = await page.evaluate(() => document.querySelector('#cr-est-view [data-t="total"]').textContent);
      ok(/45\.06/.test(tot), 'E3 a negative discount does not raise the total', tot);
    });
  } finally { await browser.close(); }
}

/* F — quick inspection (source) */
{
  ok(/photoDb\.add\(qi\.projectId, p\.data, p\.label \? \{ caption: p\.label \}/.test(SRC), 'F1 a quick-inspection shot carries its label');
  ok(/lost: qi\.photos\.filter/.test(SRC) && /had not uploaded when the app closed/.test(SRC), 'F2 unsaved shots are counted and named on resume');
}

console.log((fail ? 'RED' : 'GREEN') + `  ${pass} pass / ${fail} fail`);
process.exit(fail ? 1 : 0);
