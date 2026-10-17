// gate_1363 — Buttons A part 3: Delete is red words, never a red block.
// A: Delete Client has no fill (no background colour, no gradient, no shadow) on Retail, Insurance and Community,
//    in both themes, and its label clears 4.5:1 against the ground it actually sits on.
// B: it is still 44px tall and still opens the delete confirmation.
// C: the bulk bar's Delete has no fill and its label clears 4.5:1 on the bar.
// node gate_1363.mjs [index.html]   (1362 = RED)
import { createRequire } from 'module'; const require = createRequire(import.meta.url);
import { readFileSync } from 'fs';
const here = new URL('.', import.meta.url).pathname;
const chromium = require('playwright').chromium;
const { launchChromium } = require(here + 'chromium_launch.cjs');
const APP = readFileSync(process.argv[2] || here + '../../../../index.html', 'utf8');
const SETUP = readFileSync(here + 'sentinel_setup_cardinal.js', 'utf8') + '\n;\n' + readFileSync(here + 'e2e_mock_supa.js', 'utf8');
let fail = 0;
const ok = (c, m, d) => { console.log((c ? '  PASS  ' : '  FAIL  ') + m + (d !== undefined ? '  → ' + d : '')); if (!c) fail++; };
const MEASURE = `(sel) => {
  const el = document.querySelector(sel); if (!el) return null;
  const P = s => { const m = /rgba?\\(([^)]+)\\)/.exec(s || ''); if (!m) return null; const p = m[1].split(',').map(parseFloat); return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1]; };
  const lum = c => { const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }; return .2126 * f(c[0]) + .7152 * f(c[1]) + .0722 * f(c[2]); };
  const over = (top, bot) => { const a = top[3]; return [top[0] * a + bot[0] * (1 - a), top[1] * a + bot[1] * (1 - a), top[2] * a + bot[2] * (1 - a), 1]; };
  /* every ground an ancestor paints: its colour and each gradient stop; score against the worst */
  const chain = []; let n = el.parentElement;
  while (n) { const cs = getComputedStyle(n); const bg = P(cs.backgroundColor); const stops = (cs.backgroundImage.match(/rgba?\\([^)]+\\)/g) || []).map(P);
    chain.push({ bg, stops }); n = n.parentElement; }
  let ground = [255, 255, 255, 1];
  for (let i = chain.length - 1; i >= 0; i--) { const c = chain[i]; if (c.bg && c.bg[3] > 0) ground = over(c.bg, ground); }
  const grounds = [ground];
  chain.forEach(c => c.stops.forEach(s => { if (s && s[3] > .5) grounds.push(over(s, ground)); }));
  const cs = getComputedStyle(el), ink = P(cs.color), own = P(cs.backgroundColor);
  const ratios = grounds.map(g => { const a = lum(ink), b = lum(g); return (Math.max(a, b) + .05) / (Math.min(a, b) + .05); });
  return { fill: own ? own[3] : 0, img: cs.backgroundImage, shadow: cs.boxShadow, h: el.getBoundingClientRect().height,
           vis: el.getBoundingClientRect().height > 0, ratio: +Math.min.apply(null, ratios).toFixed(2), ink: cs.color };
}`;
const b = await launchChromium(chromium);
async function page(light) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const p = await ctx.newPage();
  p.on('dialog', d => d.dismiss().catch(() => {}));
  await p.route('**/*', r => r.request().url().startsWith('https://sentinel.test/') ? r.fulfill({ status: 200, contentType: 'text/html', body: APP }) : r.fulfill({ status: 200, body: '' }));
  if (light) await p.addInitScript(`try{localStorage.setItem('cardinal.theme.rb','1')}catch(_){}`);
  await p.addInitScript(SETUP);
  await p.addInitScript(() => { const S = window.__SEED__; if (!S) return;
    const ck = (o) => JSON.stringify(Object.assign({ po: 1200 }, o));
    S.projects.push({ id: 'gR', name: 'Gate Retail', address: '1 A St', stage: 'Prospect', created_by: 'theo@cardinalrenovations.net', created_at: '2026-10-01T10:00:00Z', updated_at: '2026-10-01T10:00:00Z', checklist: ck({ lead: { claim_type: 'retail', retail: true } }) });
    S.projects.push({ id: 'gI', name: 'Gate Insurance', address: '2 B St', stage: 'Prospect', created_by: 'theo@cardinalrenovations.net', created_at: '2026-10-01T10:00:00Z', updated_at: '2026-10-01T10:00:00Z', checklist: ck({ lead: { claim_type: 'insurance', insurance: { carrier: 'Test Mutual' } } }) });
    S.projects.push({ id: 'gC', name: 'Gate Community', address: '3 C St', stage: 'Prospect', crm: 'community', created_by: 'theo@cardinalrenovations.net', created_at: '2026-10-01T10:00:00Z', updated_at: '2026-10-01T10:00:00Z', checklist: ck({ lead: { claim_type: 'community', partner_name: 'Habitat for Humanity of Greater Dayton', bid_amount: '1000' } }) });
  });
  await p.goto('https://sentinel.test/', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(2500);
  return { ctx, p };
}
for (const light of [false, true]) {
  const T = light ? 'light' : 'dark';
  const { ctx, p } = await page(light);
  for (const [id, crm] of [['gR', 'Retail'], ['gI', 'Insurance'], ['gI', 'Insurance siren'], ['gC', 'Community']]) {
    await p.evaluate(pid => { try { window.openProject(pid); } catch (_) {} }, id); await p.waitForTimeout(2200);
    await p.evaluate(sir => { if (sir) document.body.setAttribute('data-rltheme', 'siren'); else document.body.removeAttribute('data-rltheme'); }, crm === 'Insurance siren');
    await p.waitForTimeout(150);
    /* the Admin fold hides it on Retail/Insurance: open the fold the way a tap does */
    await p.evaluate(() => { const pv = document.getElementById('projectView'); if (pv) pv.classList.add('cr-admin-open'); const dz = document.getElementById('dangerZone'); if (dz) dz.style.display = ''; });
    await p.waitForTimeout(200);
    const m = await p.evaluate(`(${MEASURE})('#delClientBtn')`);
    ok(m && m.vis && m.fill < .05 && m.img === 'none' && (m.shadow === 'none' || !m.shadow), `A ${T} ${crm}: Delete Client has no fill`, JSON.stringify(m));
    ok(m && m.ratio >= 4.5, `A ${T} ${crm}: its red words clear 4.5:1 on the ground`, m && (m.ratio + ' ' + m.ink));
    if (crm === 'Retail') {
      ok(m && m.h >= 44, `B ${T}: still 44px tall`, m && m.h);
      const asked = await p.evaluate(async () => { const b = document.getElementById('delClientBtn'); if (!b) return false; b.click(); await new Promise(r => setTimeout(r, 500));
        const a = document.querySelector('#crAsk.open'); const t = a ? a.textContent : ''; const c = a && a.querySelector('[data-pick="cancel"], .askno, button:not(.askgo)'); if (c) c.click(); return /delete|permanent|remove/i.test(t) || !!a; });
      ok(asked, `B ${T}: it still opens the delete confirmation`);
    }
  }
  /* C — the bulk bar's Delete */
  const c = await p.evaluate(() => { const bar = document.createElement('div'); bar.className = 'cr-bulk-bar'; bar.style.display = 'flex';
    bar.innerHTML = '<button class="destroy" id="gDestroy">Delete</button>'; document.body.appendChild(bar); return true; });
  const m = c && await p.evaluate(`(${MEASURE})('#gDestroy')`);
  ok(m && m.fill < .05, `C ${T}: the bulk bar Delete has no fill`, JSON.stringify(m));
  ok(m && m.ratio >= 4.5, `C ${T}: its words clear 4.5:1 on the bar`, m && m.ratio);
  await ctx.close();
}
await b.close();
console.log(fail ? 'GATE 1363 RED — ' + fail + ' failing' : 'GATE 1363 GREEN');
