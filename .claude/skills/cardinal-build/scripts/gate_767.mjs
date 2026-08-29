/*
 * gate_767.mjs — the rebuilt Production screen, in a REAL browser.
 *
 * jsdom cannot answer the questions this build raises: whether a rule actually
 * wins, whether an ink clears its contrast floor, whether a pane really swaps.
 * So this boots the repo's own index.html in Chromium against the e2e mock
 * Supabase, seeds production-shaped rows, drives the screen, and measures.
 *
 *   node .claude/skills/cardinal-build/scripts/gate_767.mjs [path/to/index.html]
 *
 * Negative control: point it at the previous build — it must go RED.
 */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium;
for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright/index.js']) {
  try { chromium = require(p).chromium; break; } catch (e) {}
}
if (!chromium) { console.error('playwright not found'); process.exit(2); }
import { readFileSync, mkdirSync, writeFileSync } from 'fs';

const ROOT = process.cwd();
const APP = readFileSync(process.argv[2] || ROOT + '/index.html', 'utf8');
const MOCK = readFileSync(new URL('./e2e_mock_supa.js', import.meta.url), 'utf8');
const OUT = process.env.GATE_OUT || '/tmp/cardinal-767';
mkdirSync(OUT, { recursive: true });

let pass = 0, fail = 0;
const ok = (n, c, x) => { if (c) { pass++; console.log('  ok   ' + n); } else { fail++; console.log('  FAIL ' + n + (x ? '  — ' + x : '')); } };

/* ---- dates relative to now, so the gate never rots ---- */
const D = (off) => { const d = new Date(); d.setDate(d.getDate() + off); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const ISO = (off) => { const d = new Date(); d.setDate(d.getDate() + off); return d.toISOString(); };

const SEED = {
  team_profiles: [
    { email: 'theo@cardinalrenovations.net', name: 'Theo Dorion', role: 'admin', title: 'Owner' },
    { email: 'curtis@cardinalrenovations.net', name: 'Curtis', role: 'production', title: 'Production Manager' },
    { email: 'scottie@cardinalrenovations.net', name: 'Scottie', role: 'production', title: 'Production' },
  ],
  projects: [
    // Approved, scheduled, NOT ordered  -> Scheduled box + Needs ordered box
    { id: 'j-alv', name: 'M. Alvarez', address: '6633 Edenhill Ave', stage: 'Approved', checklist: '{}', created_by: 'theo@cardinalrenovations.net', created_at: ISO(-30) },
    // Approved, NO appointment          -> Needs ordered + "Needs scheduling"
    { id: 'j-hol', name: 'Dan Hollis', address: '1240 Creekview Dr', stage: 'Approved', checklist: '{}', created_by: 'theo@cardinalrenovations.net', created_at: ISO(-20) },
    // Scheduled AND ordered             -> Ordered box
    { id: 'j-bre', name: 'T. Brennan', address: '88 Ridge Rd', stage: 'Scheduled', checklist: JSON.stringify({ materials_ordered_at: ISO(-2), materials_ordered_by: 'curtis@cardinalrenovations.net' }), created_by: 'theo@cardinalrenovations.net', created_at: ISO(-40) },
    // A Prospect carrying punch         -> the off-stage tail
    { id: 'j-tac', name: 'R. Tackett', address: '418 Wilmington Pk', stage: 'Prospect', checklist: '{}', created_by: 'theo@cardinalrenovations.net', created_at: ISO(-10) },
  ],
  appointments: [
    { id: 'ap-1', project_id: 'j-alv', kind: 'job',  appt_date: D(2), appt_time: '08:00', title: 'Build day', created_by: 'curtis@cardinalrenovations.net', created_at: ISO(-3) },
    { id: 'ap-2', project_id: 'j-alv', kind: 'drop', appt_date: D(1), appt_time: '07:00', title: 'Material drop', created_by: 'curtis@cardinalrenovations.net', created_at: ISO(-3) },
    { id: 'ap-3', project_id: 'j-bre', kind: 'job',  appt_date: D(6), appt_time: '08:00', title: 'Build day', created_by: 'curtis@cardinalrenovations.net', created_at: ISO(-3) },
  ],
  punch_items: [
    { id: 'pi-1', project_id: 'j-tac', title: 'Re-seat drip edge, north gable', detail: 'Rattles in wind', kind: 'punch', priority: 'high', status: 'open', assigned_to: 'scottie@cardinalrenovations.net', created_by: 'theo@cardinalrenovations.net', created_at: ISO(-1), scheduled_at: D(0), photos: [], comments: [], steps: [] },
    { id: 'pi-2', project_id: 'j-tac', title: 'Downspout strap, rear', kind: 'punch', priority: 'normal', status: 'open', assigned_to: 'scottie@cardinalrenovations.net', created_by: 'theo@cardinalrenovations.net', created_at: ISO(-14), photos: [], comments: [], steps: [] },
    { id: 'pi-3', project_id: 'j-alv', title: 'Garage ceiling stain', kind: 'callback', priority: 'normal', status: 'done', assigned_to: 'curtis@cardinalrenovations.net', done_by: 'curtis@cardinalrenovations.net', done_at: ISO(-2), created_by: 'theo@cardinalrenovations.net', created_at: ISO(-8), photos: [], comments: [], steps: [] },
  ],
  estimates: [], inspection_reports: [], crew_work_orders: [], collections: [], commissions: [],
  ai_estimates: [], contracts: [], insurance_claims: [], crews: [], pricing_items: [], pricing_categories: [],
};

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const ctx = await browser.newContext({ viewport: { width: 430, height: 900 } });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(String(e.message || e)));

await page.route('**/*', async route => {
  const url = route.request().url(), rt = route.request().resourceType();
  if (url === 'https://app.cardinalroster.com/' || url === 'https://app.cardinalroster.com/index.html')
    return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: APP });
  if (url.includes('@supabase/supabase-js')) return route.fulfill({ status: 200, contentType: 'application/javascript', body: MOCK });
  if (url.includes('chart.js') || url.includes('papaparse'))
    return route.fulfill({ status: 200, contentType: 'application/javascript', body: 'window.Chart=function(){this.destroy=function(){};this.update=function(){};};window.Papa={parse:function(){return{data:[]};},unparse:function(){return "";}};' });
  if (url.startsWith('https://app.cardinalroster.com/api/')) return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  if (rt === 'image' || rt === 'font' || rt === 'media' || rt === 'stylesheet') return route.abort();
  if (url.startsWith('https://app.cardinalroster.com/')) return route.fulfill({ status: 200, body: '' });
  return route.abort();
});
await page.addInitScript(seed => { window.__SEED__ = seed; }, SEED);
await page.addInitScript(MOCK);
await page.addInitScript(() => {
  try { Object.defineProperty(document, 'fonts', { configurable: true, get: () => ({ ready: Promise.resolve(), status: 'loaded', check: () => true, load: () => Promise.resolve([]), forEach: () => {}, addEventListener: () => {}, removeEventListener: () => {} }) }); } catch (e) {}
});

/* page.screenshot() blocks on document.fonts.ready and the harness aborts font
   requests, so capture through CDP instead — otherwise every shot times out
   into a silent catch and the gate "passes" with no picture to look at. */
const cdp = await ctx.newCDPSession(page);
const shot = async (n) => {
  try { const r = await cdp.send('Page.captureScreenshot', { format: 'png' });
    writeFileSync(OUT + '/' + n + '.png', Buffer.from(r.data, 'base64')); }
  catch (e) { console.log('  (shot ' + n + ' failed: ' + String(e).slice(0, 60) + ')'); }
};

console.log('gate_767 — Production rebuilt, in Chromium');
await page.goto('https://app.cardinalroster.com/', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(3000);
await page.evaluate(() => { const v = document.getElementById('restoreVeil'); if (v) v.style.display = 'none'; });

console.log('\n--- the module is there and opens ---');
ok('window.CardinalProduction exports survive the rewrite', await page.evaluate(() =>
  !!(window.CardinalProduction && ['open','close','addFor','refresh','openCount']
    .every(k => typeof window.CardinalProduction[k] === 'function'))));
ok('#cr-pb is registered in hideAllViews (class-shown group)',
  APP.includes("id:'cr-pb', api:window.CardinalProduction") || APP.includes('id:"cr-pb", api:window.CardinalProduction'));

await page.evaluate(() => window.CardinalProduction.open());
await page.waitForTimeout(1400);
await shot('01-home');

ok('the view opens by CLASS, never display (570-572 damage class)', await page.evaluate(() => {
  const e = document.getElementById('cr-pb');
  return !!e && e.classList.contains('open') && !e.style.display;
}));
ok('the scroll lock is set while open', await page.evaluate(() => document.body.style.overflow === 'hidden'));
ok('navSetView recorded the view', await page.evaluate(() => (history.state && history.state.view) === 'production'));

console.log('\n--- the five boxes, computed from the seeded rows ---');
const tiles = await page.evaluate(() => [...document.querySelectorAll('#cr-pb .pbtile')].map(t => ({
  box: t.getAttribute('data-box'),
  v: t.querySelector('.v').textContent.trim(),
  l: t.querySelector('.l').textContent.trim(),
})));
ok('four boxes render', tiles.length === 4, JSON.stringify(tiles));
const byBox = Object.fromEntries(tiles.map(t => [t.box, t.v]));
ok('Needs ordered counts the two unordered active jobs', byBox.needs === '2', JSON.stringify(byBox));
ok('Ordered counts the one marked-ordered job', byBox.ordered === '1', JSON.stringify(byBox));
ok('Scheduled counts jobs with a real build-day appointment', byBox.sched === '2', JSON.stringify(byBox));
ok('Punch-outs counts OPEN items, not jobs', byBox.punch === '2', JSON.stringify(byBox));
ok('Closed repairs row shows this month\'s closes', await page.evaluate(() =>
  /1 this month/.test(document.querySelector('#cr-pb .pbclosed').textContent)));
ok('no money anywhere on the screen (Theo\'s rule)', await page.evaluate(() =>
  !/\$|invoice/i.test(document.querySelector('#cr-pb .pbwrap').textContent.replace(/Ready to invoice/g, ''))));

console.log('\n--- today\'s agenda is real ---');
const agenda = await page.evaluate(() => [...document.querySelectorAll('#cr-pb .pbev')].map(e => e.textContent.replace(/\s+/g, ' ').trim()));
ok('the scheduled punch-out shows on today', agenda.some(t => /drip edge/i.test(t)), JSON.stringify(agenda));
/* 853 replaced the home week strip with a compact month calendar (concept #3):
   month grid first, tiles, then the day agenda. Assert the shipped shape. */
ok('the home month calendar renders (853 — the week strip is gone by design)', await page.evaluate(() =>
  document.querySelectorAll('#cr-pb .pbmonth .pbday').length >= 28 &&
  document.querySelectorAll('#cr-pb .pbmonth .pbdow span').length === 7));
ok('no floating + button anywhere', await page.evaluate(() => !document.querySelector('#cr-pb .pc-fab, .cr-pb-fab')));
ok('the + lives in the rule row instead', await page.evaluate(() =>
  !!document.querySelector('#cr-pb [data-add]')));

console.log('\n--- the full calendar ---');
await page.click('#cr-pb [data-go="cal"]');
await page.waitForTimeout(600);
await shot('02-calendar');
const cal = await page.evaluate(() => ({
  days: document.querySelectorAll('#cr-pb .pbday').length,
  chips: [...document.querySelectorAll('#cr-pb .cch')].map(c => c.textContent.trim()),
  hasSheet: !!document.querySelector('#cr-pb .pbsheet'),
  title: (document.querySelector('#cr-pb h1') || {}).textContent,
}));
ok('a full month grid renders (>= 28 day cells)', cal.days >= 28, 'days=' + cal.days);
ok('build days appear as named chips, not dots', cal.chips.some(c => /Alvarez/i.test(c)), JSON.stringify(cal.chips.slice(0, 8)));
ok('material drops appear too', cal.chips.length >= 2, JSON.stringify(cal.chips.slice(0, 8)));
ok('the day sheet renders under the grid', cal.hasSheet);
ok('the pane is titled Calendar', /Calendar/.test(cal.title || ''));
ok('a "Needs a date" dispatch queue is present', await page.evaluate(() =>
  /needs a date/i.test(document.querySelector('#cr-pb .pbwrap').textContent)));

console.log('\n--- back goes UP ONE LEVEL, never Home (the trap this app keeps hitting) ---');
await page.click('#cr-pb [data-back]');
await page.waitForTimeout(500);
ok('back from Calendar lands on the Production home, not Home', await page.evaluate(() => {
  const e = document.getElementById('cr-pb');
  return e.classList.contains('open') && !!e.querySelector('.pbtile');
}));
await page.click('#cr-pb .pbtile[data-box="punch"]');
await page.waitForTimeout(700);
await shot('03-punchlist');
/* 856 rerouted the Punch-outs and Closed repairs boxes to the FULL Punch &
   Repairs page (window.openPunchView) — the internal list survives only as a
   fallback when that module is absent. 857 made the route close the hub with
   close(false) so retail home never paints behind it. Assert the shipped
   behaviour, not the retired internal list. */
ok('the Punch-outs box opens the full Punch & Repairs page (856)', await page.evaluate(() =>
  document.getElementById('punchView').style.display === 'block' &&
  !document.getElementById('cr-pb').classList.contains('open')));
/* 945 ("The Line") buckets every item into exactly one tab: the item scheduled
   for TODAY is Active, the undated assigned one sits under Assigned. Assert
   both open items are visible through the shipped buckets. */
ok('the punch page shows the open items', await page.evaluate(() =>
  /drip edge/i.test(document.getElementById('puList').textContent) &&
  document.getElementById('puNAssigned').textContent === '1' &&
  / 2 open/.test(document.getElementById('puSub').textContent)),
  await page.evaluate(() => document.getElementById('puSub').textContent));
ok('the hub closed WITHOUT bouncing to retail home (857)', await page.evaluate(() => {
  const mv = document.getElementById('mainView');
  return !mv || getComputedStyle(mv).display === 'none';
}));
await page.evaluate(() => window.CardinalProduction.open());
await page.waitForTimeout(600);
ok('the Production home reopens after the punch page', await page.evaluate(() =>
  !!document.getElementById('cr-pb').querySelector('.pbtile')));

console.log('\n--- Closed repairs: closed work is kept, not deleted ---');
await page.click('#cr-pb .pbclosed');
await page.waitForTimeout(700);
ok('Closed repairs routes to the full punch page too (856)', await page.evaluate(() =>
  document.getElementById('punchView').style.display === 'block'));
await page.click('#punchView [data-putab="completed"]');
await page.waitForTimeout(500);
await shot('04-closed');
const closed = await page.evaluate(() => document.getElementById('puList').textContent);
ok('the closed repair is listed', /Garage ceiling stain/.test(closed), closed.slice(0, 120));
ok('it names who closed it and when', /Curtis/i.test(closed));
ok('the empty-state copy promises history, not deletion',
  APP.includes('they are never deleted') || /never deleted/.test(APP));

console.log('\n--- Mark ordered writes through the app\'s own checklist path ---');
await page.evaluate(() => window.CardinalProduction.open());
await page.waitForTimeout(600);
await page.click('#cr-pb .pbtile[data-box="needs"]');
await page.waitForTimeout(500);
const beforeNeeds = await page.evaluate(() => document.querySelectorAll('#cr-pb .pbjob').length);
ok('the needs-ordered list shows both jobs', beforeNeeds === 2, 'rows=' + beforeNeeds);
await page.evaluate(() => { window.__WRITES__ = []; });
const ordBtn = await page.$('#cr-pb [data-ord]');
ok('every unordered job carries a Mark ordered control', !!ordBtn);
if (ordBtn) {
  await ordBtn.click();
  await page.waitForTimeout(900);
  const w = await page.evaluate(() => (window.__WRITES__ || []).map(x => ({ t: x.table, op: x.op, p: JSON.stringify(x.payload || {}).slice(0, 200) })));
  ok('it writes the project checklist (no new table)', w.some(x => x.t === 'projects'), JSON.stringify(w));
  ok('the write carries materials_ordered_at', w.some(x => /materials_ordered_at/.test(x.p)), JSON.stringify(w));
  await shot('05-ordered');
}

console.log('\n--- the add pipeline is still the ONE add pipeline ---');
await page.evaluate(() => window.CardinalProduction.addFor('j-tac'));
await page.waitForTimeout(700);
await shot('06-add');
const add = await page.evaluate(() => {
  const m = document.getElementById('cr-pb-modal');
  if (!m || !m.classList.contains('open')) return null;
  const sel = m.querySelector('[data-f="assigned"]');
  return {
    fields: [...m.querySelectorAll('[data-f]')].map(i => i.getAttribute('data-f')),
    preset: (m.querySelector('[data-f="project"]') || {}).value,
    assignees: sel ? [...sel.options].map(o => o.textContent) : [],
  };
});
ok('addFor() opens the one add modal', !!add);
if (add) {
  ok('it presets the job it was opened for', add.preset === 'j-tac', add.preset);
  ok('a Prospect is still selectable (the 605 fix survives)', add.preset === 'j-tac');
  ok('assignees come from the real roster, not two hardcoded emails',
    add.assignees.length > 3, JSON.stringify(add.assignees));
  ok('Curtis and Scottie sort first', /Curtis/.test(add.assignees[1] || '') && /Scottie/.test(add.assignees[2] || ''), JSON.stringify(add.assignees));
  ok('the form can schedule the item', add.fields.includes('when'), JSON.stringify(add.fields));
}
await page.evaluate(() => { const m = document.getElementById('cr-pb-modal'); if (m) m.classList.remove('open'); });

console.log('\n--- contrast, computed, in BOTH themes (the recurring defect) ---');
async function contrast() {
  return await page.evaluate(() => {
    const lum = (rgb) => {
      const [r, g, b] = rgb.map(v => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const parse = (s) => { const m = /rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/.exec(s); return m ? { c: [+m[1], +m[2], +m[3]], a: m[4] === undefined ? 1 : +m[4] } : null; };
    const over = (fg, bg) => fg.a >= 1 ? fg.c : fg.c.map((v, i) => v * fg.a + bg[i] * (1 - fg.a));
    /* Trap 3: a card paints a gradient, which is a background-IMAGE. Walk the
       ancestors collecting every ground actually painted — colour AND every
       gradient stop — and score against the worst. */
    function grounds(el) {
      const out = [];
      for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
        const cs = getComputedStyle(n);
        const bc = parse(cs.backgroundColor);
        if (bc && bc.a > 0) out.push(bc);
        const bi = cs.backgroundImage || '';
        (bi.match(/rgba?\([^)]+\)/g) || []).forEach(s => { const p = parse(s); if (p && p.a > 0) out.push(p); });
        if (bc && bc.a >= 1) { out.__opaque = true; break; }
      }
      /* The rig's own trap: pushing the page default unconditionally scores every
         element against WHITE even when an opaque dark ancestor was found, which
         reported a correct 15:1 ink as 1.16:1. Only fall back to white when
         nothing opaque was painted. */
      if (!out.__opaque) out.push({ c: [255, 255, 255], a: 1 });
      let acc = [255, 255, 255];
      for (let i = out.length - 1; i >= 0; i--) acc = over(out[i], acc);
      return out.map(o => over(o, acc));
    }
    const res = [];
    document.querySelectorAll('#cr-pb .pbtile .v, #cr-pb .pbtile .l, #cr-pb .pbtile .s, #cr-pb .pbrule, #cr-pb .pbjob .nm, #cr-pb .pbjob .ad, #cr-pb .pbev .tx b, #cr-pb .pbev .tx small, #cr-pb h1, #cr-pb .pbtag, #cr-pb .pbday .dn, #cr-pb .pbclosed .t, #cr-pb .pbclosed .c, #cr-pb .pbempty').forEach(el => {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) return;
      const cs = getComputedStyle(el);
      const fg = parse(cs.color); if (!fg) return;
      const size = parseFloat(cs.fontSize), bold = (parseInt(cs.fontWeight, 10) || 400) >= 700;
      const large = size >= 24 || (size >= 18.66 && bold);
      const gs = grounds(el);
      let worst = 99;
      gs.forEach(g => {
        const c = over(fg, g);
        const l1 = lum(c), l2 = lum(g);
        const cr = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
        if (cr < worst) worst = cr;
      });
      res.push({ sel: el.className || el.tagName, ratio: +worst.toFixed(2), floor: large ? 3 : 4.5, text: (el.textContent || '').trim().slice(0, 24) });
    });
    return res;
  });
}
await page.click('#cr-pb [data-back]').catch(() => {});
await page.waitForTimeout(400);
const dark = await contrast();
const darkBad = dark.filter(r => r.ratio < r.floor);
ok('dark: every measured ink clears its floor', darkBad.length === 0, JSON.stringify(darkBad.slice(0, 6)));
ok('dark: something was actually measured', dark.length >= 12, 'n=' + dark.length);

await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'rb-light'));
await page.waitForTimeout(400);
await shot('07-light');
const light = await contrast();
const lightBad = light.filter(r => r.ratio < r.floor);
ok('light: every measured ink clears its floor', lightBad.length === 0, JSON.stringify(lightBad.slice(0, 6)));
ok('light: something was actually measured', light.length >= 12, 'n=' + light.length);
ok('light really is a different ground (the twin applies)', await page.evaluate(() => {
  const bg = getComputedStyle(document.getElementById('cr-pb')).backgroundColor;
  return /244|245|246/.test(bg);
}), await page.evaluate(() => getComputedStyle(document.getElementById('cr-pb')).backgroundColor));
await page.evaluate(() => document.documentElement.removeAttribute('data-theme'));

console.log('\n--- close, and the invariants ---');
await page.evaluate(() => window.CardinalProduction.close(false));
await page.waitForTimeout(400);
ok('close() clears the class', await page.evaluate(() => !document.getElementById('cr-pb').classList.contains('open')));
ok('close() releases the scroll lock (no leak)', await page.evaluate(() => document.body.style.overflow === ''));
ok('exactly ONE body observer in the module',
  (APP.match(/\)\s*\.observe\(document\.body/g) || []).length >= 1 &&
  ((APP.slice(APP.indexOf('<script id="cr-pb-script"'), APP.indexOf('</script>', APP.indexOf('<script id="cr-pb-script"'))).match(/\.observe\(document\.body/g) || []).length === 1));
{
  const blk = APP.slice(APP.indexOf('<script id="cr-pb-script"'), APP.indexOf('</script>', APP.indexOf('<script id="cr-pb-script"')));
  {
    const w = blk.match(/document\.body\.style\.overflow\s*=\s*'([^']*)'/g) || [];
    const sets = w.filter(x => /'hidden'/.test(x)).length;
    const clears = w.filter(x => /''/.test(x)).length;
    /* The module is one of the 13 sanctioned writers and always has been: one
       set in open(), cleared in close() AND in the popstate fallback. Three
       writes, balanced — not a 14th writer. */
    ok('scroll lock unchanged: 1 set, 2 clears, no new writer module',
      sets === 1 && clears === 2, 'sets=' + sets + ' clears=' + clears);
  }
  ok('render is guarded against the 606 repaint loop', /if\(html === lastSig\) return;/.test(blk));
  ok('the guard compares GENERATED markup, not live innerHTML',
    !/=== el\.innerHTML/.test(blk) && /lastSig = html/.test(blk));
  /* Comments are prose, not UI: the block now carries three "⚠" markers inside
     /* *\/ comments (the doc convention), which are not rendered glyphs. Strip
     block comments before the check so the 759 no-emoji rule still gates the
     markup and strings the module actually paints. */
  const code = blk.replace(/\/\*[\s\S]*?\*\//g, '');
  ok('no emoji in the module (comments excluded)', !/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(code), 'emoji found');
  ok('every var() carries a literal fallback (448/449)', (() => {
    const sblk = APP.slice(APP.indexOf('<style id="cr-pb-styles"'), APP.indexOf('</style>', APP.indexOf('<style id="cr-pb-styles"')));
    const refs = sblk.match(/var\(--pb-[a-z0-9-]+(,[^)]*)?\)/g) || [];
    const bare = refs.filter(r => !r.includes(','));
    return refs.length > 20 && bare.length === 0;
  })(), 'bare var() refs found');
}
/* The desktop split must not depend on another module having mounted. */
await page.evaluate(() => window.CardinalProduction.open());
await page.waitForTimeout(900);
await page.setViewportSize({ width: 1440, height: 950 });
await page.evaluate(() => document.body.classList.remove('cr-lnav-on'));
await page.click('#cr-pb [data-go="cal"]');
await page.waitForTimeout(700);
const split = await page.evaluate(() => {
  const sp = document.querySelector('#cr-pb .pbsplit');
  return sp ? { d: getComputedStyle(sp).display, c: getComputedStyle(sp).gridTemplateColumns } : null;
});
ok('desktop splits month | day WITHOUT cr-lnav-on (a real-width twin)',
  !!split && split.d === 'grid' && (split.c.match(/[\d.]+px/g) || []).length === 2, JSON.stringify(split));
await shot('08-desktop');
await page.setViewportSize({ width: 430, height: 900 });
await page.evaluate(() => window.CardinalProduction.close(false));

ok('no page errors during the run', errors.length === 0, errors.slice(0, 3).join(' | '));

await browser.close();
console.log('\nshots: ' + OUT);
console.log('RESULT: ' + pass + ' passed, ' + fail + ' failed  ->  ' + (fail ? 'RED' : 'GREEN'));
process.exit(fail ? 1 : 0);
