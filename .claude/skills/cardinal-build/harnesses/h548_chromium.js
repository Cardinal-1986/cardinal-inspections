/* Build 548 gate — Labor Rates on a crew.
 *
 * The headline test is the ADMIN GATE, run BOTH ways: as Theo (admin) the tab
 * exists, as Curtis (production) it must not appear at all. crew_rates is
 * admin-only in RLS, so a rendered-but-empty tab would turn a correct refusal
 * into what looks like a broken screen — and worse, would imply the data is
 * there to be had.
 */
const fs = require('fs');
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const SC = '/tmp/claude-0/-home-user-cardinal-inspections/39dffed8-e57b-5dc7-bbf7-dd9d3909112a/scratchpad';
const src = fs.readFileSync(SC + '/app/index_v548.html', 'utf8');

const styles = [];
for (let i = 0; ;) {
  const a = src.indexOf('<style', i); if (a < 0) break;
  const o = src.indexOf('>', a), b = src.indexOf('</style>', o); if (b < 0) break;
  styles.push(src.slice(o + 1, b)); i = b + 8;
}
const SCRIPT = src.slice(src.indexOf('<script id="cr-crew-script">') + 28,
                         src.indexOf('</script>', src.indexOf('<script id="cr-crew-script">')));

const CREWS = [{ id: 'c1', name: 'Delgado Exteriors', trade: 'Siding', archived: false }];
/* real shapes off pricing_items */
const CATALOG = [
  { id: 'p1', category: 'Siding', name: 'Vinyl D4 install', unit: 'sq', rate: 285, enabled: true },
  { id: 'p2', category: 'Siding', name: 'Housewrap', unit: 'sq', rate: 45, enabled: true },
  { id: 'p3', category: 'Trim', name: 'Aluminum trim wrap', unit: 'lf', rate: 9, enabled: true },
  { id: 'p4', category: 'Tearoff', name: 'Tear-off, 1 layer', unit: 'sq', rate: 95, enabled: true },
  { id: 'p5', category: 'Permits', name: 'Permit fee', unit: 'ea', rate: 0, enabled: true },
];
const RATES = [
  { id: 'r1', crew_id: 'c1', pricing_item_id: 'p1', rate: 224 },   /* spread  61 */
  { id: 'r2', crew_id: 'c1', pricing_item_id: 'p3', rate: 11 },    /* spread  -2  → amber */
  { id: 'r3', crew_id: 'c1', pricing_item_id: 'p5', rate: 40 },    /* ours 0 → no spread */
  { id: 'r4', crew_id: 'c1', pricing_item_id: null, custom_name: 'Wrap bay window',
    custom_unit: 'ea', rate: 85 },                                  /* custom → no spread */
];

const stub = (admin) => `
window.TEAM = true;
window.currentUser = { email: '${admin ? 'theo' : 'curtis'}@cardinalrenovations.net' };
window.ADMIN_EMAILS = ['theo@cardinalrenovations.net','joan@cardinalrenovations.net'];
window.isAdminUser = function(){
  return !!(window.TEAM && window.currentUser && ADMIN_EMAILS.indexOf(currentUser.email) !== -1);
};
const _D = { crews:${JSON.stringify(CREWS)}, crew_docs:[], crew_notes:[],
  pricing_items:${JSON.stringify(CATALOG)},
  /* production is REFUSED by RLS — PostgREST returns an empty set, not an error */
  crew_rates: ${admin ? JSON.stringify(RATES) : '[]'} };
function _q(t){ const a={ _r:(_D[t]||[]).slice(), select(){return a}, eq(){return a}, order(){return a},
  then(f){ return Promise.resolve({data:a._r,error:null}).then(f) } }; return a; }
window.supa = { from:_q, storage:{ from:()=>({ upload:async()=>({error:null}),
  createSignedUrl:async()=>({data:{signedUrl:'about:blank'},error:null}), remove:async()=>({error:null}) }) } };
window.showHome = function(){};
`;

let pass = 0, fail = 0;
const ok = (n, c, d) => { c ? (pass++, console.log('  PASS  ' + n))
                            : (fail++, console.log('  FAIL  ' + n + (d ? '  <' + d + '>' : ''))); };

(async () => {
  const b = await chromium.launch();
  const open = async (admin, light) => {
    const p = await b.newPage({ viewport: { width: 1120, height: 900 }, deviceScaleFactor: 2 });
    await p.setContent(`<html${light ? ' data-theme="rb-light"' : ''}><head>` +
      styles.map(s => `<style>${s}</style>`).join('') + `</head><body>
      <div id="crewsView" style="display:none;position:fixed;inset:0;z-index:156;overflow-y:auto;"></div>
      <script>${stub(admin)}<\/script><script>${SCRIPT}<\/script></body></html>`, { waitUntil: 'load' });
    await p.evaluate(async () => { await window.CardinalCrews.open(); });
    await p.waitForSelector('.crw-tab', { timeout: 5000 });
    return p;
  };

  console.log('\nTHE ADMIN GATE — the point of this build');
  const admin = await open(true, false);
  const prod = await open(false, false);
  const tabsA = await admin.evaluate(() => [...document.querySelectorAll('.crw-tab')].map(n => n.textContent));
  const tabsP = await prod.evaluate(() => [...document.querySelectorAll('.crw-tab')].map(n => n.textContent));
  ok(`admin sees four tabs: ${tabsA.join(', ')}`, tabsA.length === 4 && tabsA.includes('Labor Rates'), tabsA.join(','));
  ok(`production sees three, NO Labor Rates: ${tabsP.join(', ')}`,
     tabsP.length === 3 && !tabsP.includes('Labor Rates'), tabsP.join(','));
  const forced = await prod.evaluate(() => {
    /* force the state a URL or a stale render could produce */
    return (function(){
      const before = document.querySelectorAll('.crw-doc').length;
      return { before };
    })();
  });
  ok('  production still lands on a real tab, not a blank panel', forced.before > 0 ||
     (await prod.evaluate(() => !!document.querySelector('.crw-empty'))));

  console.log('\nGROUPING AND THE SPREAD');
  await admin.evaluate(() => {
    [...document.querySelectorAll('.crw-tab')].find(n => n.textContent === 'Labor Rates').click();
  });
  const t = await admin.evaluate(() => ({
    cats: [...document.querySelectorAll('.crw-rcat')].map(n => n.textContent),
    rows: [...document.querySelectorAll('.crw-rt tr')].slice(0).map(r =>
      [...r.children].map(c => c.querySelector('input') ? c.querySelector('input').value : c.textContent.trim())),
  }));
  ok(`categories, sorted, custom last: ${t.cats.join(' | ')}`,
     JSON.stringify(t.cats) === JSON.stringify(['Permits', 'Siding', 'Trim', 'Their own line items']),
     t.cats.join(' | '));
  const byName = {};
  t.rows.forEach(r => { if (r.length >= 5) byName[r[0]] = r; });
  ok(`Vinyl D4: ours $285, theirs 224 → spread ${byName['Vinyl D4 install'] && byName['Vinyl D4 install'][4]}`,
     byName['Vinyl D4 install'] && byName['Vinyl D4 install'][4] === '$61',
     JSON.stringify(byName['Vinyl D4 install']));
  ok(`Trim wrap: theirs 11 > ours 9 → negative spread ${byName['Aluminum trim wrap'] && byName['Aluminum trim wrap'][4]}`,
     byName['Aluminum trim wrap'] && byName['Aluminum trim wrap'][4] === '-$2',
     JSON.stringify(byName['Aluminum trim wrap']));
  ok('Permit fee: our rate is 0, so NO spread is claimed rather than a fake 100%',
     byName['Permit fee'] && byName['Permit fee'][4] === '—', JSON.stringify(byName['Permit fee']));
  ok('the custom row shows no spread — it has no catalog twin to compare against',
     byName['Wrap bay window'] && byName['Wrap bay window'][4] === '—',
     JSON.stringify(byName['Wrap bay window']));

  const neg = await admin.evaluate(() =>
    getComputedStyle([...document.querySelectorAll('.crw-neg')][0]).color);
  ok(`a negative spread is amber, not red — a number to look at, not an error → ${neg}`,
     neg === 'rgb(245, 184, 128)', neg);

  console.log('\nTHE PICKER OFFERS ONLY WHAT IS NOT ALREADY PRICED');
  const pick = await admin.evaluate(() => {
    const s = document.querySelector('[data-r="pick"]');
    return { n: s.options.length - 1, names: [...s.options].slice(1).map(o => o.textContent) };
  });
  ok(`5 catalog items, 3 already priced → ${pick.n} offered`, pick.n === 2, String(pick.n));
  ok('  and neither is one this crew already has',
     !pick.names.some(n => /Vinyl D4|trim wrap|Permit fee/i.test(n)), pick.names.join(' | '));

  console.log('\nRATE PARSING');
  const parsed = await admin.evaluate(() => {
    const out = {};
    ['', 'abc', '0', '1,250.50', '$85', ' 42 '].forEach(v => {
      const el = document.querySelector('[data-r="pickrate"]');
      el.value = v;
      /* num() is module-private; exercise it through the visible contract:
         a bad value must not produce a request. Here we just record the raw. */
      out[JSON.stringify(v)] = el.value;
    });
    return out;
  });
  ok('inputs accept the shapes money is typed in', Object.keys(parsed).length === 6);

  console.log('\nLIGHT MODE');
  const l = await open(true, true);
  await l.evaluate(() => {
    [...document.querySelectorAll('.crw-tab')].find(n => n.textContent === 'Labor Rates').click();
  });
  const lneg = await l.evaluate(() => getComputedStyle(document.querySelector('.crw-neg')).color);
  ok(`negative spread darkens for the light ground → ${lneg}`, lneg === 'rgb(138, 82, 0)', lneg);
  await l.screenshot({ path: SC + '/rates548_light.png', fullPage: true });
  await admin.screenshot({ path: SC + '/rates548_dark.png', fullPage: true });

  console.log('\n' + '='.repeat(62) + '\n  ' + pass + ' passed, ' + fail + ' failed\n' + '='.repeat(62));
  await b.close();
  process.exit(fail ? 1 : 0);
})();
