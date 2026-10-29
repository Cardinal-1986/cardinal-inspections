/* gate_1420 — Home is Production's hub for a production account.
 *   A  Curtis (phone, installed): on a client profile, the bottom-bar Home opens the Production board,
 *      not the retail home (no #mainView, no AR strip); the Home tab is lit while the board is up
 *   B  Curtis: the header's goHome() (the gold house) does the same
 *   C  CONTROLS — Theo and a sales rep: Home still opens the retail home
 * Arg: [index.html] -> negative control (1419 must go RED). */
process.env.APPFILE = process.argv[2] || '/home/user/cardinal-inspections/index.html';
const lib = await import('./gate_1400_lib.mjs');
setTimeout(() => { console.log('TIMEOUT'); process.exit(1); }, 300000);
let pass = 0, fail = 0;
const ok = (c, m, d = '') => { console.log((c ? '  PASS  ' : '  FAIL  ') + m + (d !== '' ? '  → ' + d : '')); c ? pass++ : fail++; };
const state = p => p.evaluate(() => {
  const ct = document.getElementById('cardinalTruthView');
  const vis = id => { const e = document.getElementById(id); return !!e && getComputedStyle(e).display !== 'none' && e.getClientRects().length > 0; };
  const pb = document.getElementById('cr-pb');
  const on = document.querySelector('#pwaNav .pwatab.on');
  return { board: !!pb && pb.classList.contains('open'), main: vis('mainView'), truth: vis('cardinalTruthView'), profile: vis('projectView'), lit: on ? on.getAttribute('data-tab') : '' };
});
async function run(as, expectBoard, kind) {
  const { browser, page } = await lib.boot(as, {});
  try {
    page.setDefaultTimeout(5000);
    await page.evaluate(() => document.body.classList.add('standalone'));
    await page.waitForTimeout(400);
    /* a RETAIL job for the control (an insurance job's Home is Cardinal Truth by design); any job for Curtis,
       and Curtis is run on BOTH kinds, since 1419 sent him to retail from one and to Cardinal Truth from the other */
    const pid = await page.evaluate(k => { const ps = window.cacheProjects || []; const f = ps.find(p => (typeof projClaimType === 'function' ? projClaimType(p) : 'retail') === k); return (f || ps[0] || {}).id; }, kind);
    await page.evaluate(id => { const b = document.getElementById('cr-pb'); if (b && b.classList.contains('open') && window.CardinalProduction) window.CardinalProduction.close(false); openProject(id); }, pid);
    await page.waitForTimeout(1000);
    const s0 = await state(page);
    ok(s0.profile, as + ' (' + kind + ' job): rig — a client profile is open', JSON.stringify(s0));
    const tab = await page.$('#pwaNav .pwatab[data-tab="home"]');
    ok(!!tab, as + ': rig — the bottom bar has a Home tab');
    if (tab) await page.evaluate(() => document.querySelector('#pwaNav .pwatab[data-tab="home"]').click());
    await page.waitForTimeout(1200);
    const s1 = await state(page);
    if (expectBoard) {
      ok(s1.board && !s1.main && !s1.truth, 'A  ' + as + ' (' + kind + ' job): the bottom-bar Home opens the Production board', JSON.stringify(s1));
      ok(s1.lit === 'home', 'A  ' + as + ': the Home tab is lit on the board', JSON.stringify(s1));
      await page.evaluate(id => { window.CardinalProduction.close(false); openProject(id); }, pid); await page.waitForTimeout(900);
      await page.evaluate(() => window.CardinalHeader.goHome()); await page.waitForTimeout(1200);
      const s2 = await state(page);
      ok(s2.board && !s2.main, 'B  ' + as + ': the header house (goHome) opens the board too', JSON.stringify(s2));
    } else {
      ok(s1.main && !s1.board, 'C  ' + as + ': Home still opens the retail home (control)', JSON.stringify(s1));
    }
    /* D: a job's thread is inside the job — it lights Jobs (it lit nothing) */
    await page.evaluate(id => { try { if (window.CardinalProduction) window.CardinalProduction.close(false); } catch (_) {} openProject(id); }, pid); await page.waitForTimeout(900);
    await page.evaluate(() => { openCommunications(); document.getElementById('commsView').dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    await page.waitForTimeout(500);
    const s3 = await state(page);
    ok(s3.lit === 'jobs', 'D  ' + as + ': a job\'s thread lights Jobs', JSON.stringify(s3));
    const errs = lib.log ? lib.log.filter(l => /PAGEERROR/.test(l)) : [];
    ok(!errs.length, as + ': no page errors', errs.join(' | ').slice(0, 160));
  } catch (e) { ok(false, as + ' run crashed', String(e.message || e).split('\n')[0].slice(0, 160)); }
  finally { await browser.close(); }
}
await run('curtis', true, 'retail');
await run('curtis', true, 'insurance');
await run('theo', false, 'retail');
console.log((fail ? 'RED' : 'GREEN') + `  ${pass} pass / ${fail} fail`);
process.exit(fail ? 1 : 0);
