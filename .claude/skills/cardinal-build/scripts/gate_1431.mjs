/* gate_1431 — the lead-source list without duplicates (Theo: "Trim duplicate lead sources").
 *   L1  New Lead's picker and the client page's picker offer the same 18 sources, no Canvasser / Internet* left
 *   L2  every old spelling maps to the source it is (Canvasser, Door Knocking -> Door knock; Google, Website,
 *       Internet, Internet: Google, Internet: Website -> Google / website; Non Proffit -> Non Profit;
 *       Kitty Hawk -> Real-estate: Kitty Hawk; Previous Customer -> Repeat customer); a system value
 *       (AccuLynx import) comes back as stored
 *   L3  a job stored as "Internet: Google" shows "Google / website" on its client page, and opening it writes nothing
 *   L4  Storm canvass is still a source and still one of the eight Add-project chips
 * Arg: [index.html] -> negative control (1430 must go RED). */
process.env.APPFILE = process.argv[2] || '/home/user/cardinal-inspections/index.html';
const { boot, log } = await import('./gate_1403_lib.mjs');
setTimeout(() => { console.log('TIMEOUT'); process.exit(1); }, 240000).unref();
let pass = 0, fail = 0;
const ok = (c, m, d = '') => { console.log((c ? '  PASS  ' : '  FAIL  ') + m + (d !== '' ? '  → ' + String(d).slice(0, 260) : '')); c ? pass++ : fail++; };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const SEED = `(function(){ var S=window.__SEED__; var r=S.projects.find(function(p){return p.id==='R1';});
  var ck = {}; try { ck = JSON.parse(r.checklist || '{}') || {}; } catch(e) {}
  ck.lead_source = 'Internet: Google';
  S.projects.push(Object.assign({}, r, { id:'R7', name:'Sample Retail Seven', stage:'Prospect', checklist: JSON.stringify(ck) })); })();`;
const WANT = ['Door knock','Referral','Google / website','Yard sign','Repeat customer','Storm canvass','Facebook / social',
  'Commercial','Direct Mailings','Door hanger','Habitat - Dayton','Non Profit','Real-estate','Real-estate: Kitty Hawk',
  'Roofle','Telemarketing','Truck','Other'];
try {
  const { browser, page } = await boot('theo', { instr: false, seed: SEED });
  try {
    await sleep(500);
    const ld = await page.evaluate(() => [...document.querySelectorAll('#ldSource option')].map(o => o.textContent).filter(t => !/select/.test(t)));
    const list = await page.evaluate(() => (typeof CR_LEAD_SOURCES !== 'undefined') ? CR_LEAD_SOURCES.slice() : null);
    ok(JSON.stringify(ld) === JSON.stringify(WANT) && JSON.stringify(list) === JSON.stringify(WANT),
      'L1  New Lead offers the 18 sources, the same list as the client page', JSON.stringify(ld));
    ok(!ld.some(t => /^(Canvasser|Internet)/.test(t)), 'L1  ...with no Canvasser or Internet* left', ld.filter(t => /^(Canvasser|Internet)/.test(t)).join(', '));
    const map = await page.evaluate(() => { const q = ['Canvasser','Door Knocking','door knock','Google','Website','Internet','Internet: Google','Internet: Website',
      'Non Proffit','Kitty Hawk','Previous Customer','AccuLynx import','Storm canvass'];
      const o = {}; q.forEach(k => { o[k] = (typeof crLeadSource === 'function') ? crLeadSource(k) : null; }); return o; });
    const exp = { 'Canvasser':'Door knock','Door Knocking':'Door knock','door knock':'Door knock','Google':'Google / website','Website':'Google / website',
      'Internet':'Google / website','Internet: Google':'Google / website','Internet: Website':'Google / website','Non Proffit':'Non Profit',
      'Kitty Hawk':'Real-estate: Kitty Hawk','Previous Customer':'Repeat customer','AccuLynx import':'AccuLynx import','Storm canvass':'Storm canvass' };
    const bad = Object.keys(exp).filter(k => map[k] !== exp[k]);
    ok(bad.length === 0, 'L2  every old spelling maps to its source; a system value comes back as stored', bad.map(k => k + '→' + map[k]).join(' | '));
    const w0 = await page.evaluate(() => (window.__WRITES__ || []).length);
    await page.evaluate(() => { try { hideAllViews(); } catch (e) {} openProject('R7'); }); await sleep(1600);
    const shown = await page.evaluate(() => { const s = document.getElementById('acxSrc'); return s ? (s.options[s.selectedIndex] || {}).textContent : 'no #acxSrc'; });
    const w = await page.evaluate((w0) => (window.__WRITES__ || []).slice(w0).filter(x => x.table === 'projects' && JSON.stringify(x.payload || {}).indexOf('lead_source') !== -1).length, w0);
    ok(shown === 'Google / website' && w === 0, 'L3  a job stored as "Internet: Google" shows Google / website, and nothing is written', JSON.stringify({ shown, w }));
    const chips = await page.evaluate(() => [...document.querySelectorAll('#pfSourceChips .pf-chip')].map(b => b.getAttribute('data-src')));
    ok(chips.length === 8 && chips.includes('Storm canvass') && WANT.includes('Storm canvass'), 'L4  Storm canvass stays, and Add project keeps its eight chips', chips.join(' | '));
    const errs = log.filter(l => /PAGEERROR/.test(l));
    ok(errs.length === 0, 'L5  no page errors', errs.slice(0, 3).join(' | '));
  } finally { await browser.close(); }
} catch (e) { ok(false, 'run crashed', String(e.message || e).split('\n')[0].slice(0, 200)); }
console.log((fail ? 'RED' : 'GREEN') + `  ${pass} pass / ${fail} fail`);
process.exit(fail ? 1 : 0);
