/* Gate for 517 — Theo's menu reorganisation, checked in BOTH roles.
 * Loads the real index.html in Chromium and reads the menu the app builds.
 * Role matters: the Admin section only exists for an admin, so a single-role
 * run would prove half of it.
 */
const { chromium } = require('playwright');
const FILE = process.argv[2] || '/tmp/claude-0/-home-user-cardinal-inspections/39dffed8-e57b-5dc7-bbf7-dd9d3909112a/scratchpad/app/index_v519.html';
let pass = 0, fail = 0; const fails = [];
const ok = (n, c, x) => { if (c) { pass++; console.log('  ✓ ' + n); } else { fail++; fails.push(n); console.log('  ✗ ' + n + (x !== undefined ? '  <<< ' + JSON.stringify(x) : '')); } };
const eq = (n, g, w) => ok(n + '  [' + JSON.stringify(g) + ']', JSON.stringify(g) === JSON.stringify(w), { got: g, want: w });

async function readMenu(admin) {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const c = await b.newContext({ viewport: { width: 1600, height: 1000 } });
  await c.route('**/*', (r) => r.request().url().startsWith('file://') ? r.continue() : r.abort());
  const p = await c.newPage();
  if (admin) {
    await p.addInitScript(() => {
      const U = { email: 'theo@cardinalrenovations.net' };
      Object.defineProperty(window, 'currentUser', { get: () => U, set: () => {}, configurable: false });
      window.my_email = () => 'theo@cardinalrenovations.net';
    });
  }
  await p.goto('file://' + FILE, { waitUntil: 'domcontentloaded' });
  /* past cr-sf-script's ~6s retry and cr-cpartners-script's ~6s tick, so the
     late injections have all landed and reorg() has had its say */
  await p.waitForTimeout(9000);
  await p.evaluate(() => {
    document.querySelector('header.site').style.display = '';
    document.getElementById('landingView').style.display = 'none';
    document.getElementById('navWrap').style.display = 'inline-block';
  });
  await p.waitForTimeout(1200);
  const out = await p.evaluate(() => {
    const m = document.getElementById('navMenu');
    const secs = {}; let cur = null;
    for (const el of m.children) {
      if (el.classList.contains('navsec')) { cur = el.style.display === 'none' ? null : el.textContent.trim(); if (cur) secs[cur] = []; continue; }
      if (!el.classList.contains('navopt') || el.style.display === 'none' || el.id === 'signOutBtn') continue;
      (secs[cur || '(loose)'] = secs[cur || '(loose)'] || []).push(el.textContent.trim());
    }
    return {
      secs,
      dupPartners: [...m.querySelectorAll('.navopt')].filter((o) => o.style.display !== 'none' && /Community Partners/.test(o.textContent)).length,
      coachVisible: [...m.querySelectorAll('.navopt')].some((o) => o.style.display !== 'none' && /Objection Coach/.test(o.textContent)),
      sidebar: [...document.querySelectorAll('#cr-lnav .lnav-item')].map((i) => i.textContent.trim()),
    };
  });
  await b.close();
  return out;
}

(async () => {
  console.log('== as an ADMIN (theo@) ==');
  const a = await readMenu(true);
  Object.entries(a.secs).forEach(([k, v]) => console.log('  ' + k + ': ' + v.join(' · ')));
  ok('Sales Floor is the FIRST thing in Sell', (a.secs.Sell || [])[0] && /Sales Floor/.test(a.secs.Sell[0]), a.secs.Sell);
  ok('...and no longer loose at the end of the menu', !(a.secs['(loose)'] || []).some((x) => /Sales Floor/.test(x)), a.secs['(loose)']);
  eq('Objection Coach is out of the menu — it lives in Sales Floor', a.coachVisible, false);
  ok('ABC Supply moved into Admin', (a.secs.Admin || []).some((x) => /ABC Supply/.test(x)), a.secs.Admin);
  ok('...and out of Sell', !(a.secs.Sell || []).some((x) => /ABC Supply/.test(x)), a.secs.Sell);
  ok('Health Check was already in Admin and stayed there', (a.secs.Admin || []).some((x) => /Health Check/.test(x)), a.secs.Admin);
  eq('Community Partners appears exactly once now', a.dupPartners, 1);
  ok('Sell still holds the rest of the selling tools',
    ['Quick Inspection', 'Inspections', 'Estimates'].every((n) => (a.secs.Sell || []).some((x) => x.includes(n))), a.secs.Sell);
  ok('the left menu shows the same thing — it mirrors, so it follows for free',
    a.sidebar.length && /Sales Floor/.test(a.sidebar.join('|')) && !/Objection Coach/.test(a.sidebar.join('|')), a.sidebar);
  eq('nothing loose is left except Self Check',
    (a.secs['(loose)'] || []).filter((x) => !/Self Check/.test(x)), []);

  console.log('\n== as a REP (not admin) ==');
  const r = await readMenu(false);
  Object.entries(r.secs).forEach(([k, v]) => console.log('  ' + k + ': ' + v.join(' · ')));
  ok('Sales Floor leads Sell for a rep too', (r.secs.Sell || [])[0] && /Sales Floor/.test(r.secs.Sell[0]), r.secs.Sell);
  eq('Objection Coach is out for a rep too', r.coachVisible, false);
  ok('with no Admin section, ABC Supply stays in Sell rather than vanishing',
    (r.secs.Sell || []).some((x) => /ABC Supply/.test(x)), r.secs);
  eq('Community Partners appears once for a rep as well', r.dupPartners, 1);

  console.log('\n' + (fail === 0 ? 'PASS' : 'FAIL') + ' — ' + pass + ' passed, ' + fail + ' failed');
  if (fail) { console.log('failed:\n  - ' + fails.join('\n  - ')); process.exit(1); }
})().catch((e) => { console.error('HARNESS ERROR', e); process.exit(2); });
