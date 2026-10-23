/* gate_1400 — a production day. Personas ride the sentinel setup's ?as= (curtis = production, scottie = field).
 *   A  production with a saved session lands on the Production board, not the retail home
 *   B  a refused move to Completed is not written to the audit log
 *   C  the punch card's Call button dials the client's digits
 *   D  closing the board closes its day / + Add sheet
 *   E  a field user's "Open job" does not close the punch card he is on
 *   F  production's work order is not given the crew_rates read
 * Arg: [index.html] -> negative control (1399 must go RED). */
process.env.APPFILE = process.argv[2] || '/home/user/cardinal-inspections/index.html';
const { boot } = await import('./gate_1400_lib.mjs');
import fs from 'fs';
const SRC = fs.readFileSync(process.env.APPFILE, 'utf8');
setTimeout(() => { console.log('TIMEOUT'); process.exit(1); }, 240000);
let pass = 0, fail = 0;
const ok = (c, m, d = '') => { console.log((c ? '  PASS  ' : '  FAIL  ') + m + (d ? '  → ' + d : '')); c ? pass++ : fail++; };
{
  const { browser, page } = await boot('curtis');
  try {
    const a = await page.evaluate(() => { const b = document.getElementById('cr-pb'); return !!(b && b.classList.contains('open')); });
    ok(a, 'A  production lands on the Production board on a warm start');
    const r = await page.evaluate(async () => {
      const out = {};
      const pr = (window.cacheProjects || []).find(p => /Scheduled/.test(p.stage || ''));
      const n = (window.__WRITES__ || []).length;
      if (pr) { try { await setStage(pr.id, 'Completed'); } catch (_) {} }
      await new Promise(r => setTimeout(r, 800));
      out.pr = pr && pr.id;
      out.audit = (window.__WRITES__ || []).slice(n).filter(w => w.table === 'audit_events' && /Completed/.test(JSON.stringify(w.payload || {}))).length;
      out.stage = pr && (window.cacheProjects.find(p => p.id === pr.id) || {}).stage;
      try { const s = document.getElementById('cr-inst-sheet'); if (s) s.classList.remove('open'); } catch (_) {}
      /* D */
      window.CardinalProduction.open(); await new Promise(r => setTimeout(r, 900));
      const add = document.querySelector('#cr-pb [data-add]'); if (add) add.click();
      await new Promise(r => setTimeout(r, 500));
      const sheetUp = () => [...document.querySelectorAll('.pbmodal.open, #cr-pb-modal.open, [id^="cr-pb"].open')].filter(e => e.id !== 'cr-pb').length;
      out.sheetBefore = sheetUp();
      history.back(); await new Promise(r => setTimeout(r, 900));
      out.sheetAfter = sheetUp();
      /* C */
      const it = (window.CardinalPunch && window.CardinalPunch.rows ? window.CardinalPunch.rows() : []).find(i => i.project_id);
      if (it) { window.CardinalPunchCard.open(it.id); await new Promise(r => setTimeout(r, 1200)); }
      const tel = [...document.querySelectorAll('#cr-pk a[href^="tel:"]')].map(a => a.getAttribute('href'));
      out.tel = tel; out.hasPhone = !!(it && typeof projPhone === 'function' && (projPhone(cacheProjects.find(p => p.id === it.project_id)) || {}).digits);
      return out;
    });
    ok(r.pr && r.stage !== 'Completed' && r.audit === 0, 'B  a refused Completed is not logged', JSON.stringify([r.pr, r.stage, r.audit]));
    ok(r.sheetBefore >= 1 && r.sheetAfter === 0, 'D  Back from the board closes its + Add sheet', JSON.stringify([r.sheetBefore, r.sheetAfter]));
    ok(!r.hasPhone || (r.tel.length && r.tel.every(h => /^tel:\+?\d{7,}$/.test(h))), 'C  Call dials the client’s digits', JSON.stringify(r.tel));
  } finally { await browser.close(); }
}
{
  const { browser, page } = await boot('scottie');
  try {
    const e = await page.evaluate(async () => {
      const it = (window.CardinalPunch && window.CardinalPunch.rows ? window.CardinalPunch.rows() : []).find(i => i.project_id);
      if (!it) return 'no item';
      window.CardinalPunchCard.open(it.id); await new Promise(r => setTimeout(r, 1200));
      const b = document.querySelector('#cr-pk [data-act="job"]'); if (b) b.click();
      await new Promise(r => setTimeout(r, 900));
      return window.CardinalPunchCard.isOpen();
    });
    ok(e === true, 'E  a field user’s Open job leaves the punch card up', String(e));
  } finally { await browser.close(); }
}
ok(/if\(typeof isAdminUser === 'function' && isAdminUser\(\)\) try\{\s*var rr = await sb\.from\('crew_rates'\)/.test(SRC), 'F  only the admin reads crew_rates for a work order');
console.log((fail ? 'RED' : 'GREEN') + '  ' + pass + ' pass / ' + fail + ' fail');
process.exit(fail ? 1 : 0);
