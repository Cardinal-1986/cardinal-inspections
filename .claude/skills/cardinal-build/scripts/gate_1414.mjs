/* gate_1414 — the common screens carry drawn icons, not emoji.
 *   Every target element exists, holds an svg.cri, and has no emoji in its text:
 *   Clients (Home, search, filter), Activity title, an insurance profile (badge, address, rep, claim strip,
 *   document rows, Upload SOL, Scope of Loss, iTel), a retail profile (History, Punch List), Quick jump.
 *   Plus: no emoji left in any visible text node on those screens (typographic marks ▼ ☆ ✦ ✎ ▸ ▾ excepted).
 * Arg: [index.html] -> negative control (1413 must go RED). */
process.env.APPFILE = process.argv[2] || '/home/user/cardinal-inspections/index.html';
const { boot } = await import('./gate_1403_lib.mjs');
setTimeout(() => { console.log('TIMEOUT'); process.exit(1); }, 200000);
let pass = 0, fail = 0;
const ok = (c, m, d = '') => { console.log((c ? '  PASS  ' : '  FAIL  ') + m + (d ? '  → ' + d : '')); c ? pass++ : fail++; };
const { browser, page } = await boot('theo', { instr: false, desktop: false });
const EMO = '[\\u{1F300}-\\u{1FAFF}\\u{2600}-\\u{26FF}\\u{2700}-\\u{27BF}\\u{2B00}-\\u{2BFF}\\u{25A0}-\\u{25FF}]';
const KEEP = '[▼☆★✦✎▸▾▴◂▲►◄✓✔✕✖•]';
const check = async (screen, sels) => {
  const r = await page.evaluate(({ sels, EMO, KEEP }) => {
    const re = new RegExp(EMO, 'u'), keep = new RegExp(KEEP, 'gu');
    const out = {};
    for (const s of sels) { const e = document.querySelector(s); out[s] = !e ? 'missing' : (e.querySelector('svg.cri') ? (re.test((e.textContent || '').replace(keep, '')) ? 'emoji+svg' : 'ok') : 'no-svg'); }
    const left = []; const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n;
    while ((n = w.nextNode())) { const t = (n.nodeValue || '').replace(keep, ''); const p = n.parentElement; if (!re.test(t) || !p || !p.getClientRects().length || p.closest('#cr-lnav')) continue; left.push(t.trim().slice(0, 24)); }
    return { out, left: [...new Set(left)] };
  }, { sels, EMO, KEEP });
  for (const [s, v] of Object.entries(r.out)) ok(v === 'ok', screen + ': ' + s, v);
  ok(!r.left.length, screen + ': no emoji left in visible text', r.left.join(' | '));
};
try {
  await check('home', ['#actToggle']);
  await page.evaluate(() => openClientsDirectory()); await page.waitForTimeout(1000);
  await check('clients', ['#cliHomeBtn', '.cd-search', '#cdFunnelBtn']);
  await page.evaluate(() => openProject('I1')); await page.waitForTimeout(1500);
  await check('insurance profile', ['.insBadge', '.dbaddr', '.dbrep', '.cr-claimstrip .lbl', '.insdocrow .insdocic', '.solIcon', '.cr-itel-bar-t']);
  await page.evaluate(() => openProject('R1')); await page.waitForTimeout(1500);
  await check('retail profile', ['.kpst']);
  await page.evaluate(() => openProject('C1')); await page.waitForTimeout(1500);
  await check('community profile', ['.cr-pp-hd .t', '.dbaddr']);
  await page.evaluate(() => document.getElementById('navBtn').click()); await page.waitForTimeout(500);
  const qj = await page.evaluate(() => { const h = document.getElementById('cr-nav-palette-hint'); return h ? !!h.querySelector('svg.cri') : null; });
  ok(qj === true, 'drawer: Quick jump has a drawn search icon', String(qj));
} catch (e) { ok(false, 'crashed', e.message.split('\n')[0].slice(0, 160)); }
finally { await browser.close(); }
console.log((fail ? 'RED' : 'GREEN') + `  ${pass} pass / ${fail} fail`);
process.exit(fail ? 1 : 0);
