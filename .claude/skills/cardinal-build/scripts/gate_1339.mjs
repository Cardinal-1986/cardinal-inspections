// gate_1339 — the light/dark switch is in the header bar again, on a phone AND a desktop, every
// portal (Theo: "please bring back the light dark theme"). Before, it lived only in the phone menu
// drawer, which a desktop never opens. Also: it must not rewrite itself every second.
// node gate_1339.mjs [index.html]   (point at 1338 for the negative control)
import { createRequire } from 'module'; const require = createRequire(import.meta.url);
import { readFileSync } from 'fs';
const here = new URL('.', import.meta.url).pathname;
const chromium = require('playwright').chromium;
const APP = readFileSync(process.argv[2] || here + '../../../../index.html', 'utf8');
const SETUP = readFileSync(here + 'sentinel_setup_cardinal.js', 'utf8') + '\n;\n' + readFileSync(here + 'e2e_mock_supa.js', 'utf8');
let fail = 0;
const ok = (c, m, d) => { console.log((c ? '  PASS  ' : '  FAIL  ') + m + (d !== undefined ? '  → ' + d : '')); if (!c) fail++; };
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
for (const vp of [{ w: 390, h: 844, m: true, n: 'phone' }, { w: 1440, h: 900, m: false, n: 'desktop' }]) {
  const ctx = await b.newContext({ viewport: { width: vp.w, height: vp.h }, isMobile: vp.m, hasTouch: vp.m });
  const p = await ctx.newPage(); p.on('dialog', d => d.accept());
  await p.route('**/*', r => r.request().url().startsWith('https://sentinel.test/') ? r.fulfill({ status: 200, contentType: 'text/html', body: APP }) : r.fulfill({ status: 200, body: '' }));
  await p.addInitScript(SETUP); await p.goto('https://sentinel.test/?as=theo', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(3500);
  const r = await p.evaluate(async () => {
    const t = document.getElementById('cr-dark-toggle');
    if (!t) return { missing: true };
    const rc = t.getBoundingClientRect(), k = getComputedStyle(t);
    const visible = rc.width >= 44 && rc.height >= 44 && k.display !== 'none' && k.visibility !== 'hidden';
    const inBar = !!(t.parentNode && t.parentNode.id === 'cr-hd2-bar');
    const plus = document.getElementById('addProjectBtn'), lens = document.getElementById('cr-hd2-lens');
    const between = plus && lens ? (plus.getBoundingClientRect().right <= rc.left && rc.right <= lens.getBoundingClientRect().left) : false;
    const h1 = document.querySelector('#cr-hd2-mid #brandTitle h1'); const tr = h1 && h1.getBoundingClientRect();
    const clear = !tr || !tr.width || tr.right <= rc.left || tr.left >= rc.right;
    const drawn = !!t.querySelector('svg') && !/[☀\uD83C]/.test(t.textContent);
    let muts = 0; const mo = new MutationObserver(l => { for (const m of l) if (m.target === t || t.contains(m.target) || [...m.addedNodes].includes(t)) muts++; });
    mo.observe(document.body, { subtree: true, childList: true, attributes: true, characterData: true });
    await new Promise(r => setTimeout(r, 3200)); mo.disconnect();
    const th0 = document.documentElement.getAttribute('data-theme'), l0 = t.getAttribute('aria-label');
    t.click(); await new Promise(r => setTimeout(r, 300));
    const th1 = document.documentElement.getAttribute('data-theme'), l1 = t.getAttribute('aria-label');
    return { visible, inBar, between, clear, drawn, muts, flipped: th0 !== th1, labels: l0 + ' -> ' + l1, at: Math.round(rc.left) + ',' + Math.round(rc.top) + ' ' + Math.round(rc.width) + 'x' + Math.round(rc.height) };
  });
  if (r.missing) { ok(false, vp.n + ': the switch exists'); await ctx.close(); continue; }
  ok(r.visible, vp.n + ': the switch is visible in the header, 44px', r.at);
  ok(r.inBar, vp.n + ': it lives in the header bar, not the hidden search row or a floating corner');
  ok(r.between, vp.n + ': it sits between + and Search');
  ok(r.clear, vp.n + ': the screen title does not run into it');
  ok(r.drawn, vp.n + ': it is a drawn sun/moon, not an emoji');
  ok(r.muts === 0, vp.n + ': it does not rewrite itself while nothing changes (0 mutations in 3s)', r.muts);
  ok(r.flipped && /light/i.test(r.labels.split(' -> ')[0]) && /dark/i.test(r.labels.split(' -> ')[1]), vp.n + ': a tap flips the theme and the label says what the next tap does', r.labels);
  if (vp.n === 'phone') {
    const hid = await p.evaluate(async () => {
      const st = (window.__sentinelStates || []).find(x => x.name === 'showcase'); if (!st) return 'no state';
      await st.run(); await new Promise(r => setTimeout(r, 1600));
      const t = document.getElementById('cr-dark-toggle'); const k = t && getComputedStyle(t);
      return !t || k.display === 'none' || !t.getBoundingClientRect().width ? 'hidden' : 'visible';
    });
    ok(hid === 'hidden', 'phone: it hides on the client-facing Showcase, which is dark by decision', hid);
  }
  await ctx.close();
}
await b.close();
console.log(fail ? 'RED — gate_1339: ' + fail + ' fail' : 'GREEN — gate_1339: all pass');
process.exit(fail ? 1 : 0);
