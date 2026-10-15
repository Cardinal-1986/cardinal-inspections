// gate_1341 — the five CONFIRMED findings of the 14 Oct end-to-end audit, reproduced in Chromium.
// node gate_1341.mjs [index.html]   (point at 1340 for the negative control: all five fail there)
import { createRequire } from 'module'; const require = createRequire(import.meta.url);
import { readFileSync } from 'fs';
const here = new URL('.', import.meta.url).pathname;
const chromium = require('playwright').chromium;
const APP = readFileSync(process.argv[2] || here + '../../../../index.html', 'utf8');
const SETUP = readFileSync(here + 'sentinel_setup_cardinal.js', 'utf8') + '\n;\n' + readFileSync(here + 'e2e_mock_supa.js', 'utf8');
let fail = 0;
const ok = (c, m, d) => { console.log((c ? '  PASS  ' : '  FAIL  ') + m + (d !== undefined ? '  → ' + d : '')); if (!c) fail++; };
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
async function boot(w, h, mobile) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: mobile, hasTouch: mobile });
  const p = await ctx.newPage(); p.on('dialog', d => d.accept());
  await p.route('**/*', r => r.request().url().startsWith('https://sentinel.test/') ? r.fulfill({ status: 200, contentType: 'text/html', body: APP }) : r.fulfill({ status: 200, body: '' }));
  await p.addInitScript(SETUP); await p.goto('https://sentinel.test/?as=theo', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(3000);
  return { ctx, p };
}
const vis = 'el => { if (!el) return false; const k = getComputedStyle(el), r = el.getBoundingClientRect(); return k.display !== "none" && k.visibility !== "hidden" && r.width > 0 && r.height > 0; }';

// 1 + 2: desktop
{ const { ctx, p } = await boot(1440, 900, false);
  const r1 = await p.evaluate(async (vs) => { const vis = eval(vs); window.CardinalFinanceRates.open(); await new Promise(r => setTimeout(r, 600));
    const el = document.getElementById('cr-fin'); return { shown: vis(el), text: el ? el.innerText.trim().length : 0, inline: el && el.style.display }; }, vis);
  ok(r1.shown && r1.text > 20, '1 · Financing Rates opens with its content, not a blank page', JSON.stringify(r1));
  const r1b = await p.evaluate(async (vs) => { const vis = eval(vs); if (window.showHome) window.showHome(); await new Promise(r => setTimeout(r, 300));
    return { finGone: !vis(document.getElementById('cr-fin')), scroll: document.body.style.overflow }; }, vis);
  ok(r1b.finGone && r1b.scroll !== 'hidden', '1 · leaving it hides it and the page can scroll again', JSON.stringify(r1b));
  const r2 = await p.evaluate(async (vs) => { const vis = eval(vs); window.CardinalABC.open(); await new Promise(r => setTimeout(r, 500));
    const x = document.querySelector('#cr-abc [data-act="close"]'); if (!x) return { noX: true }; x.click(); await new Promise(r => setTimeout(r, 600));
    return { abcGone: !vis(document.getElementById('cr-abc')), home: vis(document.getElementById('mainView')) }; }, vis);
  ok(r2.abcGone && r2.home, '2 · Suppliers × closes it AND lands on home, not a blank page', JSON.stringify(r2));
  await ctx.close(); }

// 3, 4, 5: phone
{ const { ctx, p } = await boot(390, 844, true);
  const r3 = await p.evaluate(async () => { const dd = document.querySelector('#crBanner .cbdd[data-dd="tools"]'); if (!dd) return { noTools: true };
    dd.click(); await new Promise(r => setTimeout(r, 300)); const m = dd.querySelector('.cbmenu'); const r = m.getBoundingClientRect();
    return { open: dd.classList.contains('open'), left: Math.round(r.left), right: Math.round(r.right), vw: document.documentElement.clientWidth }; });
  ok(r3.open && r3.right <= r3.vw && r3.left >= 0, '3 · the phone Tools menu fits on the screen', JSON.stringify(r3));
  await p.evaluate(() => { document.body.click(); });
  const r4 = await p.evaluate(async (vs) => { const vis = eval(vs); const f = document.getElementById('cr-ai-fab'); const before = vis(f);
    window.openProjModal(null); await new Promise(r => setTimeout(r, 700));
    const pm = document.getElementById('projModal'); const formUp = vis(pm); const during = vis(f);
    document.getElementById('pfCancel').click(); await new Promise(r => setTimeout(r, 400));
    return { before, formUp, during, after: vis(f) }; }, vis);
  ok(r4.before && r4.formUp && !r4.during && r4.after, '4 · the Ask button steps away while the client form is open, and comes back', JSON.stringify(r4));
  // 5: walk to Clients so there is history, open the form, swipe Back
  const r5 = await p.evaluate(async (vs) => { const vis = eval(vs);
    if (window.openClientsDirectory) window.openClientsDirectory(); await new Promise(r => setTimeout(r, 700));
    if (window.showHome) window.showHome(); await new Promise(r => setTimeout(r, 700));
    const before = JSON.stringify(history.state && history.state.view);
    window.openProjModal(null); await new Promise(r => setTimeout(r, 700));
    const up = vis(document.getElementById('projModal'));
    history.back(); await new Promise(r => setTimeout(r, 1200));
    const after = JSON.stringify(history.state && history.state.view);
    return { up, formAfterBack: vis(document.getElementById('projModal')), before, after }; }, vis);
  ok(r5.up && !r5.formAfterBack, '5 · Back with the client form open closes the form', JSON.stringify(r5));
  ok(r5.before === r5.after, '5 · …and you stay on the screen you were on', r5.before + ' -> ' + r5.after);
  const r5b = await p.evaluate(async (vs) => { const vis = eval(vs);
    window.openProjModal(null); await new Promise(r => setTimeout(r, 600));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await new Promise(r => setTimeout(r, 300));
    return { closed: !vis(document.getElementById('projModal')) }; }, vis);
  ok(r5b.closed, '5 · Esc closes the client form', JSON.stringify(r5b));
  await ctx.close(); }
await b.close();
console.log(fail ? 'RED — gate_1341: ' + fail + ' fail' : 'GREEN — gate_1341: all pass');
process.exit(fail ? 1 : 0);
