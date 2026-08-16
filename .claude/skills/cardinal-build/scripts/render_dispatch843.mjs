/*
 * Build 843 render proof — Crew Dispatch in-grid assign.
 * Boots the REAL index.html in Chromium against the recording mock, seeds crews +
 * crew_work_orders + projects, opens CardinalDispatch, and proves the grid renders:
 * trade bands, crew lanes, day columns, the Needs-a-crew rail, idle collapse, the
 * amount-fence (no crew_work_orders select ever asks for amount), and tap->openProject.
 * Runs both themes. A real negative control:
 *   node render_dispatch842.mjs                          # 842 -> GREEN (grid + repairs band)
 *   node render_dispatch842.mjs /path/to/index_v841.html   # 841 -> repairs band ABSENT (neg control)
 */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium;
for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright/index.js', 'playwright-core']) {
  try { chromium = require(p).chromium; break; } catch (e) {}
}
if (!chromium) { console.error('playwright not found'); process.exit(2); }
import { readFileSync } from 'fs';

const FILE = process.argv[2] || '/home/user/cardinal-inspections/index.html';
const APP_HTML = readFileSync(FILE, 'utf8');
const MOCK = readFileSync(new URL('./e2e_mock_supa.js', import.meta.url), 'utf8');
const TAG = FILE.includes('842') ? '842' : '843';  // 842 = picker routing ABSENT (neg control)

// dates for THIS week (Mon..Sun), computed in Node so seeds land in the visible week
function ymd(d){ return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
const now = new Date();
const mon = new Date(now.getFullYear(), now.getMonth(), now.getDate());
mon.setDate(mon.getDate() - ((mon.getDay()+6)%7));
const D = i => { const d = new Date(mon); d.setDate(mon.getDate()+i); return ymd(d); };

const CREWS = [
  { id:'c1', name:'Betos Home Improvements', trade:'Roofing', archived:false, contact:'Alberto Campuzano' },
  { id:'c2', name:'Sarceno Construction',    trade:'Roofing', archived:false, contact:'Daniel Sarceno' },
  { id:'c3', name:'Pineda Siding',           trade:'Siding',  archived:false, contact:'Jamie Pineda' },
  { id:'c4', name:'The Deaton Boys',         trade:'Windows', archived:false, contact:'Robert Deaton' },
  { id:'c5', name:'Jimenez Gutters',         trade:'Gutters', archived:false, contact:'Francisco Ramirez' },
  { id:'c6', name:'Backup Roof Crew',        trade:'Roofing', archived:false },   // idle -> collapses
];
const WOS = [
  { id:'w1', crew_id:'c1', project_id:'p1', report_id:'r1', status:'completed', scheduled_on:D(0), sent_at:'x', completed_on:'x', amount:9999 },
  { id:'w2', crew_id:'c2', project_id:'p2', report_id:'r2', status:'sent',      scheduled_on:D(2), sent_at:'x', completed_on:null, amount:9999 },
  { id:'w3', crew_id:'c3', project_id:'p3', report_id:'r3', status:'draft',     scheduled_on:D(1), sent_at:null, completed_on:null, amount:9999 },
  { id:'w4', crew_id:'c4', project_id:'p4', report_id:'r4', status:'draft',     scheduled_on:D(3), sent_at:null, completed_on:null, amount:9999 },
];
const PROJECTS = [
  { id:'p1', name:'Betty Mann',  address:'449 Harriet, Dayton',  stage:'Scheduled', checklist:{} },
  { id:'p2', name:'Union Job',   address:'88 Union, Dayton',     stage:'Scheduled', checklist:{} },
  { id:'p3', name:'Kitty Hawk',  address:'7036 Montague',        stage:'Scheduled', checklist:{} },
  { id:'p4', name:'Whitfield',   address:'55 Ridgeway',          stage:'Scheduled', checklist:{} },
  { id:'p5', name:'Maker Space', address:'1630 E 5th St',        stage:'Scheduled', checklist:{} }, // needs crew
  { id:'p6', name:'Habitat — Delaware', address:'231 Delaware',  stage:'Scheduled', checklist:{} }, // needs crew, sorts first
];
const PUNCH = [
  { id:'pu1', title:'Ridge cap',    project_id:'p1', assigned_to:'curtis@cardinalrenovations.net',  scheduled_at:D(2), status:'open' },
  { id:'pu2', title:'Pipe boot',    project_id:'p2', assigned_to:'scottie@cardinalrenovations.net', scheduled_at:D(3), status:'open' },
  { id:'pu3', title:'Fascia touch', project_id:'p3', assigned_to:'curtis@cardinalrenovations.net',  scheduled_at:null,  status:'open' },
  { id:'pu4', title:'Gutter reseal',project_id:'p4', assigned_to:null,                                scheduled_at:null,  status:'open' },
];
const SEED = {
  team_profiles: [{ email:'theo@cardinalrenovations.net', name:'Theo Dorion', role:'admin', title:'Owner' }],
  crews: CREWS, crew_work_orders: WOS, projects: PROJECTS,
  appointments: [], estimates: [], inspection_reports: [], punch_items: PUNCH, insurance_claims: [],
};

const errs = [];
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 1194, height: 900 } });
const page = await ctx.newPage();
page.on('pageerror', e => errs.push(String(e.message || e)));

await page.route('**/*', async route => {
  const url = route.request().url(), rt = route.request().resourceType();
  if (url === 'https://app.cardinalroster.com/' || url === 'https://app.cardinalroster.com/index.html')
    return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: APP_HTML });
  if (url.includes('@supabase/supabase-js'))
    return route.fulfill({ status: 200, contentType: 'application/javascript', body: MOCK });
  if (url.includes('chart.js') || url.includes('papaparse'))
    return route.fulfill({ status: 200, contentType: 'application/javascript', body: 'window.Chart=function(){this.destroy=function(){};this.update=function(){};};window.Papa={parse:function(){return{data:[]};},unparse:function(){return"";}};' });
  if (url.startsWith('https://app.cardinalroster.com/api/'))
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  if (rt === 'image' || rt === 'font' || rt === 'media' || rt === 'stylesheet') return route.abort();
  if (url.startsWith('https://app.cardinalroster.com/')) return route.fulfill({ status: 200, body: '' });
  return route.abort();
});
await page.addInitScript(seed => { window.__SEED__ = seed; }, SEED);
await page.addInitScript(MOCK);
await page.addInitScript(() => { try { Object.defineProperty(document, 'fonts', { configurable: true, get: () => ({ ready: Promise.resolve(), status: 'loaded', check: () => true, load: () => Promise.resolve([]), forEach: () => {} }) }); } catch (e) {} });
// record every crew_work_orders .select() column list, to prove amount is never requested
await page.addInitScript(() => { window.__woSelects = []; });

let pass = 0, fail = 0;
const ok = (l, c, extra) => { if (c) { pass++; console.log('  PASS ' + l); } else { fail++; console.log('  FAIL ' + l + (extra !== undefined ? '  -> ' + extra : '')); } };

console.log(`artifact : ${FILE}  (build ${TAG})`);
try {
  await page.goto('https://app.cardinalroster.com/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.sb || window.supa, { timeout: 20000 });

  // wrap the live client's from() so we capture crew_work_orders selects (amount fence)
  await page.evaluate(() => {
    const c = window.sb || window.supa; if (!c) return;
    const of = c.from.bind(c);
    c.from = function(t){ const q = of(t); if (t === 'crew_work_orders'){ const os = q.select.bind(q);
      q.select = function(cols){ window.__woSelects.push(cols || ''); return os(cols); }; } return q; };
  });
  // seed the in-memory project cache the grid reads
  await page.evaluate(seed => { window.cacheProjects = seed; }, PROJECTS);

  await page.evaluate(async () => { await window.CardinalDispatch.open(); });
  await page.waitForTimeout(500);
  // real correctness: the 555 picker must be a global function, or the shortcut silently degrades
  const pickerGlobal = await page.evaluate(() => typeof window.openWorkOrderPicker === 'function');
  ok('openWorkOrderPicker is a global function (feature can actually fire)', pickerGlobal, pickerGlobal);

  const r = await page.evaluate(() => {
    const v = document.getElementById('cr-disp');
    const q = s => Array.from(v.querySelectorAll(s));
    return {
      open: !!(v && v.classList.contains('open')),
      bands: q('.dband').map(b => b.textContent.trim()),
      crewNames: q('.crewc .cn').map(x => x.textContent.trim()),
      dayHeads: q('.dcol .c:not(.rail)').length,
      hasToday: !!v.querySelector('.dcol .c.today'),
      jobs: q('.job').length,
      railChips: q('.drail .uch .c').map(x => x.textContent.trim()),
      idleRows: q('.idle').map(x => x.textContent.trim()),
      pips: { done: q('.job .pip.done').length, sent: q('.job .pip.sent').length },
      firstJobPid: (v.querySelector('.job') || {}).getAttribute ? v.querySelector('.job').getAttribute('data-pid') : null,
      noMoney: !/\$|amount/i.test(v.textContent),
    };
  });

  ok('the view opened (#cr-disp.open)', r.open);
  ok('trade bands rendered (Roofing/Siding/Windows/Gutters)', r.bands.length >= 4, r.bands.join(','));
  ok('active crew lanes rendered (company names)', r.crewNames.length >= 4 && r.crewNames.some(n=>/Betos|Sarceno|Pineda/.test(n)), r.crewNames.join(' | '));
  ok('day columns rendered (6 or 7)', r.dayHeads === 6 || r.dayHeads === 7, r.dayHeads);
  ok('today column highlighted', r.hasToday);
  ok('job chips rendered from work orders', r.jobs >= 4, r.jobs);
  ok('status pips computed (a done + a sent)', r.pips.done >= 1 && r.pips.sent >= 1, JSON.stringify(r.pips));
  ok('Needs-a-crew rail lists the two crewless jobs', r.railChips.length === 2, r.railChips.join(','));
  ok('Habitat sorts first in the rail', /habitat/i.test(r.railChips[0] || ''), r.railChips[0]);
  ok('idle roofing crew collapses into an idle row', r.idleRows.some(t => /idle/.test(t) && /roofing/i.test(t)), r.idleRows.join(' | '));
  ok('NO money renders on the board', r.noMoney);

  // the amount fence at the query layer
  const sel = await page.evaluate(() => window.__woSelects.slice());
  ok('crew_work_orders was queried', sel.length >= 1, sel.length);
  ok('the amount column is NEVER selected', sel.every(s => !/amount/i.test(s)), JSON.stringify(sel));

  // tap a job -> openProject(pid), view closes
  const nav = await page.evaluate(async (pid) => {
    let got = null; const orig = window.openProject;
    window.openProject = function(id){ got = id; };
    const j = document.querySelector('#cr-disp .job'); if (j) j.click();
    await new Promise(r => setTimeout(r, 200));
    window.openProject = orig;
    return { got: got, closed: !document.getElementById('cr-disp').classList.contains('open') };
  }, r.firstJobPid);
  ok('tapping a job calls openProject with its project id', !!nav.got, nav.got);
  ok('tapping a job closes the dispatch view', nav.closed);

  // ---- Repairs band (build 842) ----
  await page.evaluate(async () => { await window.CardinalDispatch.open(); });   // the job-tap test closed it
  await page.waitForTimeout(300);
  const rep = await page.evaluate(() => {
    const v = document.getElementById('cr-disp');
    const q = s => Array.from(v.querySelectorAll(s));
    const band = v.querySelector('.dband.repband');
    const laneNames = q('.dlane .crewc .cn').map(x => x.textContent.trim());
    return {
      band: !!band,
      bandLabel: band ? band.textContent.trim() : '',
      curtis: !!v.querySelector('.crewc.own-curtis'),
      scottie: !!v.querySelector('.crewc.own-scottie'),
      unassigned: laneNames.includes('Unassigned'),
      repChips: q('.dcell .rep').map(x => x.textContent.trim()),
      badges: q('.repbdg').map(x => x.textContent.trim()),
      repPid: (v.querySelector('.dcell .rep') || {}).getAttribute ? v.querySelector('.dcell .rep').getAttribute('data-pid') : null,
    };
  });
  ok('Repairs band renders', rep.band);
  ok('band label reads Punch-outs & Repairs', /punch-outs\s*&?\s*repairs/i.test(rep.bandLabel), rep.bandLabel);
  ok('Curtis has an owner lane (own-curtis)', rep.curtis);
  ok('Scottie has an owner lane (own-scottie)', rep.scottie);
  ok('an Unassigned lane exists', rep.unassigned);
  ok('scheduled repairs render as chips (Ridge cap + Pipe boot)', rep.repChips.some(t=>/ridge cap/i.test(t)) && rep.repChips.some(t=>/pipe boot/i.test(t)), rep.repChips.join(' | '));
  ok('a backlog badge shows for the unscheduled repair', rep.badges.some(t=>/\bopen\b/i.test(t)), rep.badges.join(','));

  const rnav = await page.evaluate(async () => {
    let got=null, err=null; const o=window.openProject; window.openProject=function(id){got=id;};
    const r=document.querySelector('#cr-disp .dcell .rep');
    const info={found:!!r, dp:r?r.getAttribute('data-pid'):null, open:document.getElementById('cr-disp').classList.contains('open')};
    try{ if(r) r.click(); }catch(e){ err=String(e&&e.message||e); }
    await new Promise(x=>setTimeout(x,200)); window.openProject=o; info.got=got; info.err=err; return info;
  });
  ok('tapping a repair opens its client (openProject)', !!rnav.got, JSON.stringify(rnav));
  await page.evaluate(async () => { await window.CardinalDispatch.open(); });
  await page.waitForTimeout(200);

  // ---- in-grid assign (build 843): tap a Needs-a-crew chip -> the 555 picker ----
  await page.evaluate(async () => { await window.CardinalDispatch.open(); });
  await page.waitForTimeout(300);
  const asg = await page.evaluate(async () => {
    let pickerArg = 'NONE', openProj = null;
    const op = window.openWorkOrderPicker, oj = window.openProject;
    window.openWorkOrderPicker = function(project){ pickerArg = project; };
    window.openProject = function(id){ openProj = id; };
    const uch = document.querySelector('#cr-disp .uch[data-pid]');
    const dp = uch ? uch.getAttribute('data-pid') : null;
    if (uch) uch.click();
    await new Promise(r => setTimeout(r, 200));
    const closed = !document.getElementById('cr-disp').classList.contains('open');
    window.openWorkOrderPicker = op; window.openProject = oj;
    return { dp, calledPicker: pickerArg !== 'NONE', pickerId: (pickerArg && pickerArg.id) || null, closed, openProj };
  });
  if (TAG === '843') {
    ok('tapping a Needs-a-crew chip opens the 555 picker', asg.calledPicker, JSON.stringify(asg));
    ok('the picker is prefilled with that job (Habitat, sorts first)', asg.pickerId === asg.dp && /p6/.test(asg.dp||''), `${asg.pickerId} vs ${asg.dp}`);
    ok('the grid closes so the picker is not hidden behind it', asg.closed);
  } else {
    ok('on 842 the chip routes to the profile, NOT the picker (neg control)', !asg.calledPicker && !!asg.openProj, JSON.stringify(asg));
  }
  await page.evaluate(async () => { await window.CardinalDispatch.open(); });
  await page.waitForTimeout(200);

  // both themes: flip to rb-light, re-open, assert it still renders with a different ground
  const themes = await page.evaluate(async () => {
    const read = () => getComputedStyle(document.getElementById('cr-disp')).backgroundColor;
    document.documentElement.setAttribute('data-theme', 'rb-light');
    await window.CardinalDispatch.open(); await new Promise(r => setTimeout(r, 300));
    const light = read(); const lightHasGrid = !!document.querySelector('#cr-disp .dspgrid');
    document.documentElement.removeAttribute('data-theme');
    await window.CardinalDispatch.open(); await new Promise(r => setTimeout(r, 300));
    const dark = read();
    return { light, dark, lightHasGrid };
  });
  ok('light theme renders the grid', themes.lightHasGrid);
  ok('dark and light grounds differ (both themes wired)', themes.light !== themes.dark, `${themes.dark} vs ${themes.light}`);

  console.log(`\n${fail === 0 ? 'GREEN' : 'RED'} — ${pass} passed, ${fail} failed   ${errs.length ? '(pageerrors: ' + errs.slice(0, 3).join(' | ') + ')' : ''}`);
} catch (e) {
  console.log('HARNESS ERROR: ' + String(e).slice(0, 300));
  console.log(errs.length ? 'pageerrors: ' + errs.slice(0, 5).join(' | ') : '');
  fail++;
} finally {
  await browser.close();
}
process.exit(fail === 0 ? 0 : 1);
