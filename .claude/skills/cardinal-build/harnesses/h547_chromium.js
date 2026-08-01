/* Build 547 gate — the SHIPPED crews module, driven in Chromium.
 *
 * Every <style> block from the artifact is loaded in file order (the 481
 * lesson), and the module's own script is executed against a stubbed Supabase
 * client returning realistic rows. Assertions are getComputedStyle reads and
 * real DOM state, not string matching.
 *
 * The expiry logic gets the hardest test, because that is the entire reason
 * this page exists: a crew whose COI lapsed must not read as compliant.
 */
const fs = require('fs');
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const SC = '/tmp/claude-0/-home-user-cardinal-inspections/39dffed8-e57b-5dc7-bbf7-dd9d3909112a/scratchpad';
const src = fs.readFileSync(SC + '/app/index_v547.html', 'utf8');

const styles = [];
for (let i = 0; ;) {
  const a = src.indexOf('<style', i); if (a < 0) break;
  const o = src.indexOf('>', a), b = src.indexOf('</style>', o); if (b < 0) break;
  styles.push(src.slice(o + 1, b)); i = b + 8;
}
const SCRIPT = src.slice(src.indexOf('<script id="cr-crew-script">') + 28,
                         src.indexOf('</script>', src.indexOf('<script id="cr-crew-script">')));
console.log(`  ${styles.length} stylesheets · crews module ${SCRIPT.length} chars`);

const day = (n) => { const d = new Date(Date.now() + n * 86400000); return d.toISOString().slice(0, 10); };
const CREWS = [
  { id: 'c1', name: 'Ramirez Roofing', legal_name: 'Ramirez Roofing LLC', trade: 'Roofing',
    contact_name: 'Luis Ramirez', contact_phone: '937 555 0148', archived: false },
  { id: 'c2', name: 'Ortiz & Sons', trade: 'Roofing', archived: false },
  { id: 'c3', name: 'Delgado Exteriors', trade: 'Siding', archived: false },
  { id: 'c4', name: 'Halstead Windows', trade: 'Windows', archived: false },
  { id: 'c5', name: 'Novak Gutter Co', trade: 'Gutters', archived: false },
  { id: 'c6', name: 'Marsh Handyman', trade: 'General Repairs', archived: false },
];
const DOCS = [
  /* c1 fully compliant */
  { crew_id: 'c1', kind: 'w9', storage_path: 'p1', issued_on: '2026-01-09', expires_on: null, uploaded_at: '2026-01-09' },
  { crew_id: 'c1', kind: 'gl', storage_path: 'p2', expires_on: day(220), carrier: 'Grange', coverage_limits: '$1M / $2M', uploaded_at: '2026-01-09' },
  { crew_id: 'c1', kind: 'wc', storage_path: 'p3', expires_on: day(300), uploaded_at: '2026-01-09' },
  /* c3 expiring in 21 days */
  { crew_id: 'c3', kind: 'w9', storage_path: 'p4', expires_on: null, uploaded_at: '2026-01-01' },
  { crew_id: 'c3', kind: 'gl', storage_path: 'p5', expires_on: day(21), uploaded_at: '2026-01-01' },
  { crew_id: 'c3', kind: 'wc', storage_path: 'p6', expires_on: day(90), uploaded_at: '2026-01-01' },
  /* c5 LAPSED */
  { crew_id: 'c5', kind: 'w9', storage_path: 'p7', expires_on: null, uploaded_at: '2026-01-01' },
  { crew_id: 'c5', kind: 'gl', storage_path: 'p8', expires_on: day(-6), uploaded_at: '2026-01-01' },
  /* two GL rows for c1's neighbour c2 — the NEWER must win */
  { crew_id: 'c2', kind: 'gl', storage_path: 'old', expires_on: day(-40), uploaded_at: '2025-01-01' },
  { crew_id: 'c2', kind: 'gl', storage_path: 'new', expires_on: day(400), uploaded_at: '2026-07-01' },
  { crew_id: 'c2', kind: 'w9', storage_path: 'p9', expires_on: null, uploaded_at: '2026-01-01' },
  { crew_id: 'c2', kind: 'wc', storage_path: 'p10', expires_on: day(400), uploaded_at: '2026-01-01' },
];
const NOTES = [{ crew_id: 'c1', body: 'Great on steep. Two days notice.', at: '2026-07-29T00:00:00Z', by: 'theo@' }];

const STUB = `
window.currentUser = { email: 'theo@cardinalrenovations.net' };
const _DATA = { crews: ${JSON.stringify(CREWS)}, crew_docs: ${JSON.stringify(DOCS)}, crew_notes: ${JSON.stringify(NOTES)} };
function _q(table){
  const api = {
    _rows: (_DATA[table] || []).slice(),
    select(){ return api; }, eq(){ return api; }, order(){ return api; },
    then(res){ return Promise.resolve({ data: api._rows, error: null }).then(res); },
  };
  return api;
}
window.supa = {
  from: _q,
  storage: { from: () => ({ upload: async () => ({ error: null }),
    createSignedUrl: async () => ({ data: { signedUrl: 'about:blank' }, error: null }),
    remove: async () => ({ error: null }) }) },
};
window.showHome = function(){ window.__wentHome = true; };
`;

let pass = 0, fail = 0;
const ok = (n, c, d) => { c ? (pass++, console.log('  PASS  ' + n))
                            : (fail++, console.log('  FAIL  ' + n + (d ? '  <' + d + '>' : ''))); };

(async () => {
  const b = await chromium.launch();
  const run = async (light) => {
    const p = await b.newPage({ viewport: { width: 1120, height: 900 }, deviceScaleFactor: 2 });
    await p.setContent(`<html${light ? ' data-theme="rb-light"' : ''}><head>` +
      styles.map(s => `<style>${s}</style>`).join('') + `</head><body>
      <div id="crewsView" style="display:none;position:fixed;inset:0;z-index:156;overflow-y:auto;"></div>
      <script>${STUB}<\/script><script>${SCRIPT}<\/script></body></html>`, { waitUntil: 'load' });
    await p.evaluate(async () => { await window.CardinalCrews.open(); });
    await p.waitForSelector('.crw-item', { timeout: 5000 });
    return p;
  };

  console.log('\nSTRUCTURE — the trade nav');
  const p = await run(false);
  const nav = await p.evaluate(() => ({
    sections: [...document.querySelectorAll('.crw-sec')].map(n => n.firstElementChild.textContent),
    counts: [...document.querySelectorAll('.crw-sec')].map(n => n.lastElementChild.textContent),
    items: [...document.querySelectorAll('.crw-item')].map(n => n.textContent.trim()),
  }));
  ok('five sections, in Theo\'s order, General Repairs last',
     JSON.stringify(nav.sections) === JSON.stringify(
       ['Roofing Crews', 'Siding Crews', 'Window Installers', 'Gutter Crews', 'General Repairs']),
     nav.sections.join(' | '));
  ok('counts are per section: ' + nav.counts.join(','),
     JSON.stringify(nav.counts) === JSON.stringify(['2', '1', '1', '1', '1']), nav.counts.join(','));
  ok('every crew rendered exactly once', nav.items.length === 6, String(nav.items.length));

  console.log('\nTHE EXPIRY LOGIC — the reason this page exists');
  const dots = await p.evaluate(() => {
    const o = {};
    document.querySelectorAll('.crw-item').forEach(n => {
      o[n.firstElementChild.textContent] = n.querySelector('.crw-dot').className.replace('crw-dot ', '');
    });
    return o;
  });
  ok(`Ramirez (all current)      → ${dots['Ramirez Roofing']}`, dots['Ramirez Roofing'] === 'ok');
  ok(`Delgado (GL in 21 days)    → ${dots['Delgado Exteriors']}`, dots['Delgado Exteriors'] === 'warn');
  ok(`Novak (GL expired, no WC)  → ${dots['Novak Gutter Co']}`, dots['Novak Gutter Co'] === 'bad');
  ok(`Halstead (nothing on file) → ${dots['Halstead Windows']}`, dots['Halstead Windows'] === 'bad',
     'a crew with NO documents must never read as compliant');
  ok('Ortiz — the NEWER of two GL rows wins, so an old expired one does not condemn them',
     dots['Ortiz & Sons'] === 'ok', dots['Ortiz & Sons']);

  console.log('\nCOMPLIANCE TAB — per-document state');
  await p.evaluate(() => {
    [...document.querySelectorAll('.crw-item')].find(n => n.textContent.includes('Novak')).click();
  });
  const nv = await p.evaluate(() => ({
    pills: [...document.querySelectorAll('.crw-doc .crw-pill')].map(n => n.textContent.trim()),
    header: document.querySelector('.crw-card .crw-pill').textContent.trim(),
  }));
  ok(`Novak's three rows: ${nv.pills.join(' | ')}`,
     nv.pills.length === 3 && /On file|Current/.test(nv.pills[0]) &&
     /Expired/.test(nv.pills[1]) && /Missing/.test(nv.pills[2]), nv.pills.join(' | '));
  ok(`header says not compliant → ${nv.header}`, /Not compliant/.test(nv.header), nv.header);

  console.log('\nTABS');
  for (const [t, probe] of [['profile', '[data-f="name"]'], ['notes', '[data-f="newnote"]'],
                            ['compliance', '.crw-doc']]) {
    const found = await p.evaluate(({ t, probe }) => {
      const tb = [...document.querySelectorAll('.crw-tab')].find(n => n.dataset.tab === t);
      if (!tb) return 'no tab';
      tb.click();
      return document.querySelector(probe) ? 'ok' : 'missing';
    }, { t, probe });
    ok(`${t} tab renders its own body`, found === 'ok', found);
  }
  ok('only three tabs ship — no empty Rates/Work Orders/Payments',
     (await p.evaluate(() => document.querySelectorAll('.crw-tab').length)) === 3);

  console.log('\nCSS ACTUALLY APPLIES — dark (obsidian) …');
  const d = await p.evaluate(() => {
    const c = getComputedStyle(document.querySelector('.crw-card'));
    const n = getComputedStyle(document.querySelector('.crw-nav'));
    return { card: c.backgroundImage, shadow: c.boxShadow, well: n.backgroundColor,
             page: getComputedStyle(document.getElementById('crewsView')).backgroundColor };
  });
  ok('card paints 545\'s obsidian gradient', d.card.includes('radial-gradient'), d.card.slice(0, 50));
  ok('  and is raised', d.shadow.includes('24px'), d.shadow.slice(0, 60));
  ok(`  nav well is 536's #0A0E16 → ${d.well}`, d.well === 'rgb(10, 14, 22)', d.well);
  await p.close();

  console.log('… and light');
  const q = await run(true);
  const l = await q.evaluate(() => ({
    card: getComputedStyle(document.querySelector('.crw-card')).backgroundColor,
    cardImg: getComputedStyle(document.querySelector('.crw-card')).backgroundImage,
    well: getComputedStyle(document.querySelector('.crw-nav')).backgroundColor,
    page: getComputedStyle(document.getElementById('crewsView')).backgroundColor,
  }));
  ok(`light card is white, not obsidian → ${l.card}`,
     l.card === 'rgb(255, 255, 255)' && l.cardImg === 'none', `${l.card} / ${l.cardImg}`);
  ok(`light well is #f2f3f5 → ${l.well}`, l.well === 'rgb(242, 243, 245)', l.well);
  ok(`light page is grey → ${l.page}`, l.page === 'rgb(242, 243, 245)', l.page);
  await q.close();

  for (const light of [false, true]) {
    const z = await run(light);
    await z.evaluate(() => {
      [...document.querySelectorAll('.crw-item')].find(n => n.textContent.includes('Delgado')).click();
    });
    await z.screenshot({ path: SC + '/crews547_' + (light ? 'light' : 'dark') + '.png', fullPage: true });
    await z.close();
  }
  console.log('  screenshots written');
  console.log('\n' + '='.repeat(60) + '\n  ' + pass + ' passed, ' + fail + ' failed\n' + '='.repeat(60));
  await b.close();
  process.exit(fail ? 1 : 0);
})();
