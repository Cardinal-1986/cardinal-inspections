/* Build 1164 — the Front Door panel, proven in a real engine.
   Optional path arg → negative control (must go RED on v1163). */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const FILE = process.argv[2] || '/home/user/cardinal-inspections/index.html';
let pass = 0, fail = 0;
const bad = [];
function ok(c, m){ c ? pass++ : (fail++, bad.push(m)); }
const to = setTimeout(() => { console.log('GATE TIMEOUT'); process.exit(1); }, 90000);

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: 390, height: 844 } });
p.on('pageerror', e => { fail++; bad.push('pageerror: ' + String(e).slice(0, 120)); });
await p.goto('file://' + FILE, { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(2500);

const boot = await p.evaluate(() => ({
  api: !!(window.CardinalFrontDoor && typeof window.CardinalFrontDoor.open === 'function'),
  able: document.body.classList.contains('cr-fd-able'),
}));
ok(boot.api, 'CardinalFrontDoor export exists');
ok(boot.able, 'body carries cr-fd-able (chevron affordance armed)');

if (boot.api) {
  // spy every door BEFORE opening — spies target what the code calls at tap time
  await p.evaluate(() => {
    window.__hits = [];
    const rec = n => () => window.__hits.push(n);
    window.CardinalCommunityHub = { show: rec('community') };
    window.CardinalProduction = { open: rec('production') };
    window.CardinalSalesFloor = { open: rec('sales') };
    window.CardinalShowcase = { open: rec('showroom') };
    window.CardinalColors = { open: rec('colors') };
    window.showCardinalTruth = rec('insurance');
    window.showResourceLibrary = rec('library');
    window.CardinalStands = { counts: () => ({ appr: 2, chase: 1, bids: 3, punch: 5, date: 0, today: 0 }) };
    window.isAdminUser = () => true;
  });
  await p.evaluate(() => window.CardinalFrontDoor.open());
  const st = await p.evaluate(() => {
    const v = document.getElementById('cr-fd');
    const rows = [...v.querySelectorAll('.fdrow')];
    const sheet = v.querySelector('.fd-sheet');
    const sr = sheet.getBoundingClientRect();
    return {
      open: v.classList.contains('open'),
      rows: rows.map(r => ({ go: r.getAttribute('data-fd'), h: r.getBoundingClientRect().height })),
      sheetVisible: sr.width > 300 && sr.height > 300,
      quote: !!v.querySelector('.fd-quote'),
      hotline: (v.querySelector('[data-fd="community"] small') || {}).textContent || '',
    };
  });
  ok(st.open, 'panel opens');
  ok(st.sheetVisible, 'sheet has real geometry');
  ok(st.rows.length === 9, '9 door rows (got ' + st.rows.length + ')');
  ok(st.rows.every(r => r.h >= 44), 'every row ≥44px (min ' + Math.min(...st.rows.map(r => r.h)).toFixed(1) + ')');
  ok(st.quote, 'the daily quote renders');
  ok(/3 bids past due/.test(st.hotline), 'community state line shows the mocked 3 (got "' + st.hotline + '")');

  // every door routes — real taps
  for (const d of ['community', 'production', 'sales', 'insurance', 'library', 'showroom', 'colors']) {
    await p.evaluate(() => window.CardinalFrontDoor.open());
    await p.click('#cr-fd .fdrow[data-fd="' + d + '"]');
  }
  const hits = await p.evaluate(() => window.__hits);
  ok(JSON.stringify(hits) === JSON.stringify(['community','production','sales','insurance','library','showroom','colors']),
     'all 7 spied doors fired in order (got ' + hits.join(',') + ')');
  const closed = await p.evaluate(() => !document.getElementById('cr-fd').classList.contains('open'));
  ok(closed, 'a tap closes the panel');

  // scrim tap closes; hideAllViews closes
  await p.evaluate(() => window.CardinalFrontDoor.open());
  await p.mouse.click(5, 800);
  ok(await p.evaluate(() => !window.CardinalFrontDoor.isOpen()), 'scrim tap closes');
  await p.evaluate(() => { window.CardinalFrontDoor.open(); hideAllViews(); });
  ok(await p.evaluate(() => !window.CardinalFrontDoor.isOpen()), 'hideAllViews closes it (nav-trap rule)');

  // ink floors, composited, BOTH themes
  for (const theme of ['dark', 'light']) {
    await p.evaluate(t => {
      if (t === 'light') document.documentElement.setAttribute('data-theme', 'rb-light');
      else document.documentElement.removeAttribute('data-theme');
      window.CardinalFrontDoor.open();
    }, theme);
    const inks = await p.evaluate(() => {
      const parse = c => { const m = (c || '').match(/rgba?\(([^)]+)\)/); if (!m) return null;
        const q = m[1].split(',').map(Number); return { r: q[0], g: q[1], b: q[2], a: q.length > 3 ? q[3] : 1 }; };
      const lin = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
      const L = c => 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b);
      const ratio = (a, c) => (Math.max(L(a), L(c)) + 0.05) / (Math.min(L(a), L(c)) + 0.05);
      const sheet = document.querySelector('#cr-fd .fd-sheet');
      const bg = parse(getComputedStyle(sheet).backgroundColor);
      const out = [];
      sheet.querySelectorAll('b, small, .fd-stamp, .fd-quote p, .fd-grp').forEach(el => {
        const fg = parse(getComputedStyle(el).color);
        if (!fg || !el.textContent.trim()) return;
        out.push({ t: el.textContent.trim().slice(0, 22), r: +ratio(fg, bg).toFixed(2) });
      });
      return out;
    });
    const under = inks.filter(x => x.r < 4.5);
    ok(under.length === 0, theme + ': ' + under.length + ' inks under 4.5 → ' +
       under.map(x => x.r + ':1 "' + x.t + '"').join(' | '));
  }
}
clearTimeout(to);
console.log((fail ? 'RED  ' : 'GREEN  ') + pass + '/' + (pass + fail));
bad.forEach(m => console.log('  ✗ ' + m));
await b.close();
process.exit(fail ? 1 : 0);
