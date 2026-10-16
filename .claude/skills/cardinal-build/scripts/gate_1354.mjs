// gate_1354 — the job page, readable and in two real columns (Theo's pick: B).
// 1700px: left = invoice/Payments, Money In, Job Menu; right = Location, Job Details, …; a card growing on the
// right never moves the left; below 1600px everything is back in place; secondary ink is bright in both themes;
// no red rule under headings; the Admin row still opens.
// node gate_1354.mjs [index.html]   (1353 = RED)
import { createRequire } from 'module'; const require = createRequire(import.meta.url);
import { readFileSync } from 'fs';
const here = new URL('.', import.meta.url).pathname;
const chromium = require('playwright').chromium;
const { launchChromium } = require(here + 'chromium_launch.cjs');
const APP = readFileSync(process.argv[2] || here + '../../../../index.html', 'utf8');
const SETUP = readFileSync(here + 'sentinel_setup_cardinal.js', 'utf8') + '\n;\n' + readFileSync(here + 'e2e_mock_supa.js', 'utf8');
let fail = 0;
const ok = (c, m, d) => { console.log((c ? '  PASS  ' : '  FAIL  ') + m + (d !== undefined ? '  → ' + d : '')); if (!c) fail++; };
const b = await launchChromium(chromium);
const LIGHT = `window.__sentinelTheme='rb-light';(function put(){var r=document.documentElement;if(r){r.setAttribute('data-theme','rb-light');return;}new MutationObserver(function(_,o){if(document.documentElement){o.disconnect();put();}}).observe(document,{childList:true});})();`;

async function page(theme, width) {
  const ctx = await b.newContext({ viewport: { width, height: 1000 } });
  const p = await ctx.newPage();
  await p.route('**/*', r => r.request().url().startsWith('https://sentinel.test/') ? r.fulfill({ status: 200, contentType: 'text/html', body: APP }) : r.fulfill({ status: 200, body: '' }));
  if (theme === 'light') await p.addInitScript(LIGHT);
  await p.addInitScript(SETUP); await p.goto('https://sentinel.test/', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(3000);
  await p.evaluate(async () => { window.openProject('p1'); await new Promise(r => setTimeout(r, 2500)); });
  return { ctx, p };
}
const inks = p => p.evaluate(() => {
  const c = sel => { const e = document.querySelector('#projectView ' + sel); return e ? getComputedStyle(e).color : null; };
  const h = document.querySelector('#projectView .projsec');
  return { tab: c('.crjp-seg button:not([aria-pressed="true"])'), hint: c('.rvhint') || c('.rvstatus.none'), guide: c('.dbg-t'), arrow: c('#dbMoneyRow .dbgo'),
           rule: h ? getComputedStyle(h).borderBottomColor : null, tabSize: (() => { const e = document.querySelector('#projectView .crjp-seg button'); return e ? getComputedStyle(e).fontSize : null; })() };
});

/* ---- wide, dark ---- */
{
  const { ctx, p } = await page('dark', 1700);
  const r = await p.evaluate(async () => {
    const m = document.getElementById('acxMount');
    const box = m.querySelector(':scope > .acx-cols');
    const L = box && box.querySelector(':scope > .acx-colL'), R = box && box.querySelector(':scope > .acx-colR');
    const has = (col, sel) => !!(col && col.querySelector(':scope > ' + sel));
    const out = { box: !!box,
      left: L ? [...L.children].map(e => e.className.split(' ')[0] || e.id) : null,
      leftOk: has(L, '.crji-stack') && has(L, '#dbMoneyRow') && has(L, '.ja-menu'),
      rightOk: has(R, '[data-cr-ord="loc"]') && has(R, '[data-cr-ord="jd"]'),
      admin: !!m.querySelector(':scope > .cr-admin-tog') };
    const jm = m.querySelector('.ja-menu'), jd = m.querySelector('[data-cr-ord="jd"]');
    const t0 = jm && Math.round(jm.getBoundingClientRect().top);
    if (jd) { const d = document.createElement('div'); d.style.height = '500px'; jd.appendChild(d); }
    await new Promise(r => setTimeout(r, 150));
    out.jmMoved = jm ? Math.round(jm.getBoundingClientRect().top) - t0 : null;
    /* the Admin row still opens */
    const tog = m.querySelector(':scope > .cr-admin-tog');
    if (tog) { tog.click(); await new Promise(r => setTimeout(r, 100)); out.adminOpen = document.getElementById('projectView').classList.contains('cr-admin-open'); }
    return out;
  });
  ok(r.box, 'wide screen: the job page is two real columns');
  ok(r.leftOk, 'left: invoice + Payments, Money In & Commissions, Job Menu', JSON.stringify(r.left));
  ok(r.rightOk, 'right: Location and Job Details');
  ok(r.jmMoved === 0, 'a card growing on the right never moves the left column', r.jmMoved);
  ok(r.admin && r.adminOpen === true, 'the Admin row stays put and still opens', JSON.stringify({ admin: r.admin, open: r.adminOpen }));
  const k = await inks(p);
  ok(k.tab === 'rgb(212, 219, 228)' && k.tabSize === '14px', 'dark: tab labels bright and 14px', JSON.stringify(k));
  ok(k.guide === 'rgb(212, 219, 228)', 'dark: notes are bright', k.guide);
  ok(k.arrow === 'rgb(195, 203, 213)', 'dark: the row arrow is readable (was 2.2:1)', k.arrow);
  ok(/rgba\(0, 0, 0, 0\)|transparent/.test(k.rule || ''), 'no red rule under headings', k.rule);
  /* shrink below 1600: everything goes back where it was */
  await p.setViewportSize({ width: 1200, height: 1000 }); await p.waitForTimeout(500);
  const back = await p.evaluate(() => { const m = document.getElementById('acxMount');
    return { box: !!m.querySelector(':scope > .acx-cols'), direct: !!m.querySelector(':scope > .ja-menu') && !!m.querySelector(':scope > .crji-stack') && !!m.querySelector(':scope > [data-cr-ord="jd"]') }; });
  ok(!back.box && back.direct, 'below 1600px the columns come apart and every card is back in #acxMount', JSON.stringify(back));
  await ctx.close();
}
/* ---- wide, light ---- */
{
  const { ctx, p } = await page('light', 1700);
  const k = await inks(p);
  ok(k.tab === 'rgb(51, 65, 85)', 'light: tab labels dark slate (10.3:1)', JSON.stringify(k));
  ok(k.guide === 'rgb(51, 65, 85)', 'light: notes dark slate', k.guide);
  await ctx.close();
}
/* ---- phone: untouched order ---- */
{
  const { ctx, p } = await page('dark', 390);
  const r = await p.evaluate(() => ({ box: !!document.querySelector('#acxMount > .acx-cols') }));
  ok(!r.box, 'phone: no columns, its own order');
  await ctx.close();
}
await b.close();
console.log(fail ? 'GATE 1354 RED — ' + fail + ' failing' : 'GATE 1354 GREEN');
process.exit(fail ? 1 : 0);
