/* probe_crmhead.mjs — which header does each screen wear, and why?

   Theo: "It was the retail crm with insurance header after I signed in."

   crmHead() names the header. It returns crmNow() when that is not retail,
   then checks projopen, then punchView/teamView, then falls through to
   stickyCrm() — the LAST PORTAL YOU USED. Build 754 made shared screens follow
   the portal on purpose. The question this probe answers is whether the retail
   home dashboard is one of those shared screens or is being caught by accident.

   ⚠ It must also answer the SAFETY question in the same run: a guard that
   forces 'retail' whenever #mainView is visible would break 754 outright if
   mainView stays visible under the shared screens. So the probe prints
   #mainView's display for every state, not just the one that was reported.

   usage:
     node probe_crmhead.mjs <file.html> [portal] [state,state|all]
*/
import { chromium } from 'playwright';
import { readFileSync } from 'fs';
const S = '.claude/skills/cardinal-build/scripts/';
const FILE = process.argv[2] || 'index.html';
const PORTAL = process.argv[3] || 'insurance';
const WANT = (process.argv[4] || 'all').split(',').filter(Boolean);

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 844 } });
for (const f of ['sentinel_setup_cardinal.js', 'e2e_mock_supa.js'])
  await p.addInitScript(readFileSync(S + f, 'utf8'));
await p.goto('file://' + process.cwd() + '/' + FILE, { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(2500);

await p.evaluate((portal) => {
  try { window.CardinalPortal.set(portal, false); } catch (e) {}
}, PORTAL);
await p.waitForTimeout(300);

const names = await p.evaluate('(window.__sentinelStates||[]).map(s=>s.name)');
const states = WANT[0] === 'all' ? names : WANT;

const READ = () => {
  const dsp = id => { const e = document.getElementById(id);
    return e ? (getComputedStyle(e).display === 'none' ? 'none' : 'shown') : '(absent)'; };
  let head = '(no crmHead)', now = '(no crmNow)';
  try { head = window.CardinalHeader && window.CardinalHeader.crm ? window.CardinalHeader.crm() : head; } catch (e) { head = 'threw'; }
  try { now = typeof crmNow === 'function' ? crmNow() : now; } catch (e) { now = 'threw'; }
  return {
    head, now,
    stamped: document.body.dataset.crmHead || '(unset)',
    mainView: dsp('mainView'), landingView: dsp('landingView'),
    title: (document.querySelector('#brandTitle h1') || {}).textContent || '',
  };
};

console.log('portal = ' + PORTAL + '\n');
console.log('  state           head      crmNow    stamped   #mainView  #landingView  title');
console.log('  ' + '-'.repeat(86));
for (const st of states) {
  /* `fn:showHome` calls a global directly. The sentinel's own `home` state does
     not put #mainView on screen, so the retail DASHBOARD — the screen actually
     reported — is not reachable through the state list and has to be opened the
     way the app opens it. Reproducing the reported screen beats reasoning about
     a neighbouring one. */
  if (st.startsWith('fn:')) {
    /* fn:name:arg — showMain(email) is the real sign-in entry and takes one */
    const parts = st.slice(3).split(':');
    const fn = parts[0], arg = parts.slice(1).join(':');
    try { await p.evaluate('Promise.resolve(window[' + JSON.stringify(fn) + '](' +
      (arg ? JSON.stringify(arg) : '') + '))'); }
    catch (e) { console.log('  ' + st.padEnd(15) + '-- threw: ' + String(e.message).split('\n')[0].slice(0, 50)); continue; }
    await p.waitForTimeout(700);
    const rr = await p.evaluate(READ);
    const ff = (rr.stamped !== 'retail' && rr.mainView === 'shown' && rr.landingView === 'none') ? '   <== MISMATCH' : '';
    console.log('  ' + st.padEnd(15) + String(rr.head).padEnd(10) + String(rr.now).padEnd(10) +
      String(rr.stamped).padEnd(10) + rr.mainView.padEnd(11) + rr.landingView.padEnd(14) +
      rr.title.slice(0, 12) + ff);
    continue;
  }
  const i = names.indexOf(st);
  if (i < 0) { console.log('  ' + st.padEnd(15) + '-- no such state'); continue; }
  try { await p.evaluate('Promise.resolve(window.__sentinelStates[' + i + '].run())'); }
  catch (e) { console.log('  ' + st.padEnd(15) + '-- threw: ' + String(e.message).split('\n')[0].slice(0, 50)); continue; }
  await p.waitForTimeout(500);
  const r = await p.evaluate(READ);
  const flag = (r.head !== 'retail' && r.mainView === 'shown' && r.landingView === 'none') ? '   <== MISMATCH' : '';
  console.log('  ' + st.padEnd(15) + String(r.head).padEnd(10) + String(r.now).padEnd(10) +
    String(r.stamped).padEnd(10) + r.mainView.padEnd(11) + r.landingView.padEnd(14) +
    r.title.slice(0, 12) + flag);
}
await b.close();
