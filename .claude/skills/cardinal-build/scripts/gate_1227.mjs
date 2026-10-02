/* gate_1227.mjs — build 1227: the desktop client profile, Job Menu first.

   Theo, 2 Oct, from a rendered before/after: "Do the desktop fix". At 1440
   (one column, flex) and 1920 (two-column GRID, replacing 923's CSS columns,
   which cannot be ordered), both themes:
     A. ORDER: stage < Money In < Job Menu, and Location < Job Details <
        Assigned To < History < Admin row.
     B. 1920: the Job Menu holds the LEFT column and Location starts beside it
        (same row band), the money band stays full width.
     C. NO OVERLAP: no two visible cards in #acxMount intersect.
     D. ADMIN: Convert / Scope of Loss / Delete hidden, Admin row ≥44px, opens.
     E. The map is open on desktop.
   ⚠ Written to go RED on 1226 rather than crash (BUG_CLASSES 37).
   usage:  node gate_1227.mjs [file.html]
*/
import { readFileSync, existsSync } from 'fs';
import { dirname, resolve } from 'path';
import { createRequire } from 'module';
const require_ = createRequire(import.meta.url);
const here = dirname(new URL(import.meta.url).pathname);
const artifact = resolve(process.argv[2] || resolve(here, '../../../../index.html'));
const PW_SANDBOX = '/opt/node22/lib/node_modules/playwright/index.js';
const { chromium } = require_(existsSync(PW_SANDBOX) ? PW_SANDBOX : 'playwright');
const { launchChromium } = require_(resolve(here, 'chromium_launch.cjs'));
let pass = 0, fail = 0;
const ok = (c, m, d = '') => { console.log((c ? '  PASS  ' : '  FAIL  ') + m + (d !== '' ? '  → ' + d : '')); c ? pass++ : fail++; };
setTimeout(() => { console.log('GATE TIMEOUT'); process.exit(3); }, 560000).unref();
const PROBE = () => {
  const vis = e => !!e && e.getClientRects().length > 0 && getComputedStyle(e).display !== 'none';
  const box = e => { if (!vis(e)) return null; const r = e.getBoundingClientRect(); return { t: Math.round(r.top + scrollY), l: Math.round(r.left), r: Math.round(r.right), b: Math.round(r.bottom + scrollY), w: Math.round(r.width) }; };
  const m = document.querySelector('#projectView #acxMount');
  const q = s => m && m.querySelector(':scope > ' + s);
  const ash = m && [...m.children].find(e => e.matches('h3.projsec') && e.nextElementSibling && e.nextElementSibling.matches('.acxassignsec'));
  const kids = m ? [...m.children].filter(vis).map(e => ({ id: e.id || e.className.split(' ')[0] || e.tagName, ...box(e) })).filter(x => x.w > 0) : [];
  const over = [];
  for (let i = 0; i < kids.length; i++) for (let j = i + 1; j < kids.length; j++) {
    const a = kids[i], b = kids[j];
    if (a.l < b.r - 1 && b.l < a.r - 1 && a.t < b.b - 1 && b.t < a.b - 1) over.push(a.id + ' × ' + b.id);
  }
  const tog = q('.cr-admin-tog');
  return { mount: m ? m.getBoundingClientRect().width : 0,
    stage: box(q('.dbstage')), money: box(q('#dbMoneyRow')), jm: box(q('.ja-menu')), loc: box(q('[data-cr-ord="loch"]')),
    jd: box(q('[data-cr-ord="jdh"]')), as: box(ash), his: box(q('#kpHis')), rev: box(q('.rvcard')), tog: box(tog),
    togH: vis(tog) ? Math.round(tog.getBoundingClientRect().height) : 0,
    conv: vis(document.getElementById('dbConvertIns')), sol: vis(document.getElementById('solCard')), del: vis(document.getElementById('dangerZone')),
    map: vis(document.getElementById('dbMap')), over };
};
const browser = await launchChromium(chromium);
for (const theme of ['dark', 'rb-light']) for (const vw of [1440, 1920]) {
  const at = (theme === 'dark' ? 'dark' : 'light') + ' @' + vw;
  console.log('\n── ' + at + ' ' + '─'.repeat(40));
  const p = await browser.newPage({ viewport: { width: vw, height: 1000 } });
  await p.addInitScript(t => { window.__sentinelTheme = t; }, theme);
  for (const f of ['sentinel_setup_cardinal.js', 'e2e_mock_supa.js']) await p.addInitScript(readFileSync(resolve(here, f), 'utf8'));
  await p.goto('file://' + artifact, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(2600);
  await p.evaluate(() => { const s = (window.__sentinelStates || []).find(s => s.name === 'client'); return s && s.run(); }).catch(() => {});
  await p.waitForTimeout(1800);
  const r = await p.evaluate(PROBE).catch(e => ({ err: String(e) }));
  if (r.err) { ok(false, at + ' probe', r.err); await p.close(); continue; }
  const need = ['stage', 'money', 'jm', 'loc', 'jd', 'as', 'his', 'rev', 'tog'];
  const miss = need.filter(k => !r[k]);
  ok(!miss.length, at + ' — every section renders', miss.length ? 'missing ' + miss.join(', ') : 'ok');
  if (miss.length) { await p.close(); continue; }
  ok(r.stage.t < r.money.t && r.money.t < r.jm.t, at + ' — the money band stays above the Job Menu', [r.stage.t, r.money.t, r.jm.t].join(' < '));
  const rs = [r.loc, r.jd, r.as, r.his, r.rev, r.tog].map(x => x.t);
  ok(rs.every((v, i) => i === 0 || v > rs[i - 1]), at + ' — Location < Job Details < Assigned To < History < Reviews < Admin', rs.join(' < '));
  if (vw >= 1600) {
    ok(r.jm.l < r.loc.l - 50, at + ' — the Job Menu holds the left column, Location the right', 'jm x' + r.jm.l + ' · loc x' + r.loc.l);
    ok(Math.abs(r.jm.t - r.loc.t) < 80, at + ' — Location starts beside the Job Menu, not below it', 'jm ' + r.jm.t + ' · loc ' + r.loc.t);
    ok(Math.abs(r.money.w - Math.round(r.mount)) <= 2, at + ' — Money In still spans the full width', r.money.w + ' of ' + Math.round(r.mount));
  } else {
    ok(r.jm.t < r.loc.t, at + ' — the Job Menu comes before Location', r.jm.t + ' < ' + r.loc.t);
  }
  ok(!r.over.length, at + ' — no two cards overlap', r.over.length ? r.over.join('; ') : 'none');
  ok(r.map, at + ' — the map is open on desktop');
  ok(!r.conv && !r.sol && !r.del && r.togH >= 44, at + ' — Admin starts folded, its row ≥44px', `convert ${r.conv} · sol ${r.sol} · delete ${r.del} · row ${r.togH}px`);
  await p.evaluate(() => { const t = document.querySelector('#acxMount > .cr-admin-tog'); if (t) t.click(); });
  await p.waitForTimeout(400);
  const o = await p.evaluate(PROBE);
  ok(o.conv && o.sol, at + ' — opening Admin shows Convert to Insurance and Scope of Loss', `convert ${o.conv} · sol ${o.sol}`);
  ok(!o.over.length, at + ' — still no overlap with Admin open', o.over.length ? o.over.join('; ') : 'none');
  await p.close();
}
await browser.close();
console.log('\n' + (fail ? 'GATE 1227 RED' : 'GATE 1227 GREEN') + ' — ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
