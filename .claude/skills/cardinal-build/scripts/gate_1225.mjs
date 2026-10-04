/* gate_1225.mjs — build 1225: the client profile, regrouped for the phone.

   Theo, 2 Oct, from a rendered preview: option 3 "as shown" (1).
     A. PHONE ORDER (390, both themes): stage < Job Menu < Invoices < Location
        < Job Details < Assigned To < History < Admin row. The Job Menu starts
        on the first screen.
     B. LOCATION: the map is closed; Map opens it, Map again closes it,
        Satellite while open keeps it open.
     C. ADMIN: Convert to Insurance, Scope of Loss and Delete are hidden behind
        a 44px row; opening shows them, closing hides them.
     D. DESKTOP (1440) is untouched: no Admin row, the three are visible, the
        map is open, and Location still sits above the Job Menu.
     E. NOT A REPAINT LOOP: an idle client profile writes no more DOM than 1224.

   ⚠ Written to go RED on 1224 rather than crash (BUG_CLASSES 37).
   usage:  node gate_1225.mjs [file.html] [--prev prev.html]
*/
import { readFileSync, existsSync } from 'fs';
import { dirname, resolve } from 'path';
import { createRequire } from 'module';
const require_ = createRequire(import.meta.url);
const here = dirname(new URL(import.meta.url).pathname);
const args = process.argv.slice(2);
const pi = args.indexOf('--prev'); const PREV = pi >= 0 ? resolve(args[pi + 1]) : null;
const artifact = resolve(args.find((a, i) => !a.startsWith('--') && i !== pi + 1) || resolve(here, '../../../../index.html'));
const PW_SANDBOX = '/opt/node22/lib/node_modules/playwright/index.js';
const { chromium } = require_(existsSync(PW_SANDBOX) ? PW_SANDBOX : 'playwright');
const { launchChromium } = require_(resolve(here, 'chromium_launch.cjs'));

let pass = 0, fail = 0;
const ok = (c, m, d = '') => { console.log((c ? '  PASS  ' : '  FAIL  ') + m + (d !== '' ? '  → ' + d : '')); c ? pass++ : fail++; };
setTimeout(() => { console.log('GATE TIMEOUT'); process.exit(3); }, 560000).unref();

const browser = await launchChromium(chromium);
async function open(file, theme, width) {
  const p = await browser.newPage({ viewport: { width, height: 844 } });
  await p.addInitScript(t => { window.__sentinelTheme = t; }, theme);
  for (const f of ['sentinel_setup_cardinal.js', 'e2e_mock_supa.js']) await p.addInitScript(readFileSync(resolve(here, f), 'utf8'));
  await p.goto('file://' + file, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(2600);
  await p.evaluate(() => { const s = (window.__sentinelStates || []).find(s => s.name === 'client'); return s && s.run(); }).catch(() => {});
  await p.waitForTimeout(1500);
  return p;
}
const PROBE = () => {
  const vis = e => !!e && e.getClientRects().length > 0 && getComputedStyle(e).display !== 'none';
  const top = e => vis(e) ? Math.round(e.getBoundingClientRect().top + scrollY) : null;
  const m = document.querySelector('#projectView #acxMount');
  const ash = m && [...m.children].find(e => e.matches('h3.projsec') && e.nextElementSibling && e.nextElementSibling.matches('.acxassignsec'));
  const tog = document.querySelector('#acxMount > .cr-admin-tog');
  return {
    stage: top(document.querySelector('#acxMount > .dbstage')), jm: top(document.querySelector('#acxMount > .ja-menu')),
    inv: top(document.querySelector('#acxMount > .crji-card')), loc: top(document.querySelector('#acxMount > [data-cr-ord="loch"]')),
    jd: top(document.querySelector('#acxMount > [data-cr-ord="jdh"]')), as: top(ash), his: top(document.querySelector('#acxMount > #kpHis')),
    tog: top(tog), togH: vis(tog) ? Math.round(tog.getBoundingClientRect().height) : 0,
    map: vis(document.getElementById('dbMap')), conv: vis(document.getElementById('dbConvertIns')),
    sol: vis(document.getElementById('solCard')), del: vis(document.getElementById('dangerZone')),
  };
};
const click = (p, sel) => p.evaluate(s => { const e = document.querySelector(s); if (!e) return false; e.click(); return true; }, sel).then(() => p.waitForTimeout(400));

/* A–C: phone, both themes */
for (const theme of ['dark', 'rb-light']) {
  const tag = theme === 'dark' ? 'dark' : 'light';
  console.log('\n── ' + tag + ' @390 ' + '─'.repeat(40));
  const p = await open(artifact, theme, 390);
  const r = await p.evaluate(PROBE).catch(e => ({ err: String(e) }));
  if (r.err) { ok(false, tag + ' probe', r.err); await p.close(); continue; }
  const seq = [['stage', r.stage], ['Job Menu', r.jm], ['Invoices', r.inv], ['Location', r.loc], ['Job Details', r.jd], ['Assigned To', r.as], ['History', r.his], ['Admin row', r.tog]];
  const missing = seq.filter(x => x[1] === null).map(x => x[0]);
  ok(!missing.length, tag + ' — every section renders', missing.length ? 'missing: ' + missing.join(', ') : seq.map(x => x[0] + ' ' + x[1]).join(' · '));
  const inOrder = !missing.length && seq.every((x, i) => i === 0 || x[1] > seq[i - 1][1]);
  ok(inOrder, tag + ' — stage < Job Menu < Invoices < Location < Job Details < Assigned < History < Admin', seq.map(x => x[1]).join(' < '));
  ok(r.jm !== null && r.jm < 844, tag + ' — the Job Menu starts on the first screen', r.jm + 'px');
  ok(!r.map, tag + ' — the map starts closed');
  await click(p, '#acxMount .dbmtabs button[data-dbm="map"]');
  ok((await p.evaluate(PROBE)).map, tag + ' — Map opens it');
  await click(p, '#acxMount .dbmtabs button[data-dbm="sat"]');
  ok((await p.evaluate(PROBE)).map, tag + ' — Satellite while open keeps it open');
  await click(p, '#acxMount .dbmtabs button[data-dbm="sat"]');
  ok(!(await p.evaluate(PROBE)).map, tag + ' — tapping the lit tab again closes it');
  ok(!r.conv && !r.sol && !r.del, tag + ' — the three admin items start hidden', `convert ${r.conv} · sol ${r.sol} · delete ${r.del}`);
  ok(r.togH >= 44, tag + ' — the Admin row clears the 44px floor', r.togH + 'px');
  await click(p, '#acxMount > .cr-admin-tog');
  const o = await p.evaluate(PROBE);
  ok(o.conv && o.sol, tag + ' — opening Admin shows Convert to Insurance and Scope of Loss', `convert ${o.conv} · sol ${o.sol}`);
  const isAdmin = await p.evaluate(() => { try { return isAdminUser(); } catch (e) { return null; } });
  ok(o.del === !!isAdmin, tag + ' — Delete follows its own admin rule when open', `delete ${o.del} · admin ${isAdmin}`);
  await click(p, '#acxMount > .cr-admin-tog');
  const c = await p.evaluate(PROBE);
  ok(!c.conv && !c.sol && !c.del, tag + ' — closing Admin hides them again');
  await p.close();
}

/* D: desktop — 1225 left it untouched; 1227 (Theo's pick) gave it its own
   order and the Admin fold, asserted in gate_1227. What 1225 still owns on
   desktop: the map is never folded there. */
console.log('\n── dark @1440 ' + '─'.repeat(38));
{
  const p = await open(artifact, 'dark', 1440);
  const r = await p.evaluate(PROBE);
  ok(r.map, 'desktop — the map is open (the phone fold never applies above 560px)');
  await p.close();
}

/* E: no repaint loop — DOM mutations while idle, vs the previous build */
async function idleWrites(file) {
  const p = await open(file, 'dark', 390);
  const n = await p.evaluate(() => new Promise(res => { let k = 0; const mo = new MutationObserver(l => { k += l.length; }); mo.observe(document.body, { subtree: true, childList: true, attributes: true, characterData: true }); setTimeout(() => { mo.disconnect(); res(k); }, 3000); }));
  await p.close(); return n;
}
console.log('\n── idle writes ' + '─'.repeat(37));
const now = await idleWrites(artifact);
if (PREV) {
  const before = await idleWrites(PREV);
  ok(now <= before + 6, 'an idle profile writes no more than the previous build (3s)', now + ' vs ' + before);
} else ok(now < 200, 'an idle profile is quiet (3s, <200 mutation records)', String(now));

await browser.close();
console.log('\n' + (fail ? 'GATE 1225 RED' : 'GATE 1225 GREEN') + ' — ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
