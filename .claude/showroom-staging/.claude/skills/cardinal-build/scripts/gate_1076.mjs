/* Build 1076 gate — The Walk's job door, and the project_id that was never written.
 *
 * A real CHROMIUM drive, not jsdom, and it executes the SHIPPED text:
 *   · the whole cr-show-script IIFE is sliced out of the artifact and injected,
 *     so saveWalk() / openForProject() / closeForm() under test are the ones
 *     that deploy;
 *   · the job-menu router and the admin ternary that draws the tile are sliced
 *     out of the main block and executed too — a regex over either would go
 *     green on code that never runs, which is the whole failure this build is
 *     fixing on a different line.
 *
 * Optional path argument points it at the previous build as a negative control.
 * BUG_CLASSES 37: every section is wrapped and every missing symbol reports a
 * FAIL instead of a stack trace, and the FLOOR at the bottom fails the run if a
 * check never executed at all.
 */
import fs from 'fs';
import { createRequire } from 'module';
import { chromium } from 'playwright';

const CR_ROOT = createRequire(import.meta.url)('./script_paths.cjs').ROOT + '/';
const FILE = process.argv[2] || CR_ROOT + 'index.html';
const HTML = fs.readFileSync(FILE, 'utf8');
console.log('gate_1076 on ' + FILE + '  (' + HTML.length.toLocaleString() + ' chars)');

let fails = 0, passes = 0;
const ran = new Set();
function ok(name, cond, extra) {
  ran.add(name);
  if (cond) { passes++; console.log('  PASS  ' + name); }
  else { fails++; console.log('  FAIL  ' + name + (extra ? '  → ' + extra : '')); }
}
async function step(name, fn) {
  try { await fn(); }
  catch (e) { ran.add(name); fails++; console.log('  FAIL  ' + name + ' section  → threw: ' + (e && e.message)); }
}

/* ── slices ──────────────────────────────────────────────────────────────── */
/* ⚠ MODULE TEXT COMES FROM module_source.cjs, NOT FROM A BLOCK SLICE.
   This gate used to cut its module out of index.html by `<script id="cr-show-script">`.
   That stops working the instant the module becomes an external file, which is
   what the Showroom relocation does — and it stops working SILENTLY, handing
   the gate an empty string so every assertion fails for a reason the output
   never names. The resolver finds the module inline today and in the file it is
   relocated to tomorrow, and returns byte-identical text either way. */
const require_1076 = createRequire(import.meta.url);
const MS = require_1076('./module_source.cjs');
/* missing:'throw' preserves this gate's existing behaviour exactly — it threw
   'block not found' before and it throws a named error now. */
const MODULE_JS = MS.moduleText(HTML, 'showcase.js', { htmlPath: FILE, missing: 'throw' });

/* Expand outward from `mark` to the enclosing balanced parentheses. */
function parenAround(src, mark) {
  const m = src.indexOf(mark);
  if (m === -1) return null;
  let depth = 0, start = -1;
  for (let i = m; i >= 0; i--) {
    const c = src[i];
    if (c === ')') depth++;
    else if (c === '(') { if (depth === 0) { start = i; break; } depth--; }
  }
  if (start === -1) return null;
  depth = 0;
  for (let i = start; i < src.length; i++) {
    const c = src[i];
    if (c === '(') depth++;
    else if (c === ')') { depth--; if (depth === 0) return src.slice(start, i + 1); }
  }
  return null;
}

/* ── fixtures: production shapes, not convenient ones ────────────────────── */
const PROJECT = {
  id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
  name: 'Marjorie Whitlock',
  address: '4212 Wilmington Pike, Kettering, OH 45440'
};
const OTHER_ID = '99999999-8888-7777-6666-555555555555';

const MOCKS = (walks) => `
window.__captured = [];
(function(){
  var WALKS = ${JSON.stringify(walks)};
  var supa = {
    auth: { getUser: function(){ return Promise.resolve({ data:{ user:{ email:'theo@cardinalrenovations.net' } } }); } },
    from: function(table){
      var data = table === 'walks' ? WALKS.slice() : [];
      var q = {
        select:function(){ return q; }, order:function(){ return q; }, eq:function(){ return q; },
        update:function(){ return q; }, delete:function(){ return q; }, limit:function(){ return q; },
        insert:function(row){ window.__captured.push({ table:table, row:row }); data = [{ id: row && row.id }]; return q; },
        then:function(res){ return Promise.resolve({ data:data, error:null }).then(res); }
      };
      return q;
    },
    storage:{ from:function(){ return { upload:function(){ return Promise.resolve({ error:null }); } }; } }
  };
  Object.defineProperty(window, 'supa', { value: supa, writable:false });
})();
window.signedPhotoMap = function(paths){
  var out = {}; (paths||[]).forEach(function(p){ out[p] = 'https://signed.example/' + p; });
  return Promise.resolve(out);
};
window.hideAllViews = function(){};
window.navSetView = function(){};
window.showHome = function(){};
window.confirm = function(){ return true; };
`;

let browser;
async function boot({ admin = true, walks = [] } = {}) {
  const page = await browser.newPage();
  page.on('pageerror', e => console.log('    [pageerror] ' + e.message));
  await page.setContent('<!doctype html><html><body></body></html>');
  await page.addScriptTag({ content: MOCKS(walks) });
  await page.addScriptTag({
    content: `Object.defineProperty(window,'is_admin',{value:function(){ return ${!!admin}; },writable:false});`
  });
  await page.addScriptTag({ content: MODULE_JS });
  return page;
}
const settle = (p, n = 120) => p.waitForTimeout(n);

/* ══════════════════════════════════════════════════════════════════════════ */
(async () => {
browser = await chromium.launch();

/* ── A · the door: no walk yet → a form that carries the job ─────────────── */
console.log('\n── A · job door, no walk yet ──');
await step('A', async () => {
  const page = await boot({ admin: true, walks: [] });
  const hasApi = await page.evaluate(() =>
    !!(window.CardinalShowcase && typeof window.CardinalShowcase.openForProject === 'function'));
  ok('A0 openForProject is exported', hasApi);
  if (!hasApi) { await page.close(); return; }                        // BUG_CLASSES 37

  const r = await page.evaluate(async (PR) => {
    await window.CardinalShowcase.openForProject(PR);
    await new Promise(r => setTimeout(r, 60));
    const d = document;
    const form = d.getElementById('cr-show-form');
    const v = k => { const i = form && form.querySelector('[data-f="' + k + '"]'); return i ? i.value : null; };
    return {
      tabOn: !!d.querySelector('#cr-show [data-tab="walk"].on'),
      formOpen: !!(form && form.classList.contains('open')),
      title: v('title'), address: v('address'), city: v('city'),
      namesJob: /Marjorie Whitlock/.test((form && form.innerHTML) || '')
    };
  }, PROJECT);
  ok('A1 the module opened on the walk tab', r.tabOn);
  ok('A2 the start form opened', r.formOpen);
  ok('A3 title prefilled from the job', r.title === 'Marjorie Whitlock — 4212 Wilmington Pike', JSON.stringify(r.title));
  ok('A4 address prefilled with the street only', r.address === '4212 Wilmington Pike', JSON.stringify(r.address));
  ok('A5 city split off the address', r.city === 'Kettering', JSON.stringify(r.city));
  ok('A6 the form names the job', r.namesJob);

  const s = await page.evaluate(async () => {
    const b = document.querySelector('#cr-show-form [data-act="save"]');
    if (!b) return { clicked: false, ins: [] };
    b.click();
    await new Promise(r => setTimeout(r, 150));
    return { clicked: true, ins: window.__captured.filter(c => c.table === 'walks') };
  });
  ok('A7 Start clicked', s.clicked);
  ok('A8 exactly one walks insert', s.ins.length === 1, 'n=' + s.ins.length);
  ok('A9 the row carries project_id',
     s.ins.length === 1 && s.ins[0].row.project_id === PROJECT.id,
     s.ins.length ? JSON.stringify(s.ins[0].row.project_id) : 'no insert');
  ok('A10 the row still carries what the form said',
     s.ins.length === 1 && s.ins[0].row.title === 'Marjorie Whitlock — 4212 Wilmington Pike'
                        && s.ins[0].row.address === '4212 Wilmington Pike'
                        && s.ins[0].row.city === 'Kettering',
     s.ins.length ? JSON.stringify(s.ins[0].row) : '');
  await page.close();
});

/* ── B · contamination: the Showcase's own Start a walk must write null ──── */
console.log('\n── B · the Showcase door must not inherit a job ──');
await step('B', async () => {
  const page = await boot({ admin: true, walks: [] });
  const hasApi = await page.evaluate(() =>
    !!(window.CardinalShowcase && typeof window.CardinalShowcase.openForProject === 'function'));
  if (!hasApi) {
    ok('B1 cancel closed the carried form', false, 'openForProject missing');
    ok('B2 Start a walk reachable', false, 'openForProject missing');
    ok('B2b the ordinary form is blank', false, 'openForProject missing');
    ok('B3 the second walk carries NO job', false, 'openForProject missing');
    await page.close(); return;
  }
  const r = await page.evaluate(async (PR) => {
    const wait = n => new Promise(r => setTimeout(r, n));
    await window.CardinalShowcase.openForProject(PR);      // carries PR
    await wait(60);
    const form = () => document.getElementById('cr-show-form');
    const open = () => !!(form() && form().classList.contains('open'));
    const cx = form() && form().querySelector('[data-act="cancel"]');
    if (cx) cx.click();
    const cancelled = !open();

    const add = document.querySelector('#cr-show [data-act="waddwalk"]');
    if (add) add.click();
    await wait(30);
    const reopened = open();
    const t = form() && form().querySelector('[data-f="title"]');
    const blank = !!t && t.value === '';
    if (t) t.value = 'Hand-made walk';
    const sv = form() && form().querySelector('[data-act="save"]');
    if (sv) sv.click();
    await wait(150);
    return { cancelled, reopened, blank, tv: t ? t.value : null,
             ins: window.__captured.filter(c => c.table === 'walks') };
  }, PROJECT);
  ok('B1 cancel closed the carried form', r.cancelled);
  ok('B2 Start a walk reachable', r.reopened);
  ok('B2b the ordinary form is blank', r.blank, JSON.stringify(r.tv));
  ok('B3 the second walk carries NO job',
     r.ins.length === 1 && r.ins[0].row.project_id === null,
     JSON.stringify({ n: r.ins.length, pid: r.ins.length ? r.ins[0].row.project_id : undefined }));
  await page.close();
});

/* ── C · an existing walk for this job is FOUND, not duplicated ──────────── */
console.log('\n── C · find-or-create ──');
await step('C', async () => {
  const MINE   = { id: 'w-mine',   project_id: PROJECT.id, title: 'Wilmington hail', published: true, sort_order: 0 };
  const THEIRS = { id: 'w-theirs', project_id: OTHER_ID,   title: 'Someone else',    published: true, sort_order: 1 };

  const p1 = await boot({ admin: true, walks: [THEIRS, MINE] });
  const has1 = await p1.evaluate(() => !!(window.CardinalShowcase && window.CardinalShowcase.openForProject));
  if (!has1) {
    ok('C1 opened the existing walk', false, 'openForProject missing');
    ok('C2 no start form', false, 'openForProject missing');
  } else {
    const r = await p1.evaluate(async (PR) => {
      await window.CardinalShowcase.openForProject(PR);
      await new Promise(r => setTimeout(r, 120));
      const el = document.getElementById('cr-show');
      const form = document.getElementById('cr-show-form');
      return { back: !!(el && el.querySelector('[data-act="wback"]')),
               mine: /Wilmington hail/.test((el && el.innerHTML) || ''),
               formOpen: !!(form && form.classList.contains('open')) };
    }, PROJECT);
    ok('C1 opened the existing walk', r.back && r.mine, JSON.stringify(r));
    ok('C2 no start form', !r.formOpen);
  }
  await p1.close();

  const p2 = await boot({ admin: true, walks: [THEIRS] });
  const has2 = await p2.evaluate(() => !!(window.CardinalShowcase && window.CardinalShowcase.openForProject));
  if (!has2) { ok('C3 another job’s walk is not adopted', false, 'openForProject missing'); }
  else {
    const r = await p2.evaluate(async (PR) => {
      await window.CardinalShowcase.openForProject(PR);
      await new Promise(r => setTimeout(r, 120));
      const form = document.getElementById('cr-show-form');
      return { formOpen: !!(form && form.classList.contains('open')),
               adopted: /Someone else/.test((form && form.innerHTML) || '') };
    }, PROJECT);
    ok('C3 another job’s walk is not adopted', r.formOpen && !r.adopted, JSON.stringify(r));
  }
  await p2.close();
});

/* ── D · a rep gets the list, never a form the database would refuse ─────── */
console.log('\n── D · the rep path ──');
await step('D', async () => {
  const page = await boot({ admin: false, walks: [] });
  const hasApi = await page.evaluate(() => !!(window.CardinalShowcase && window.CardinalShowcase.openForProject));
  if (!hasApi) {
    ['D1 no start form for a rep','D2 no Start a walk button for a rep',
     'D3 the walk tab still renders','D4 nothing was written']
      .forEach(n => ok(n, false, 'openForProject missing'));
    await page.close(); return;
  }
  const r = await page.evaluate(async (PR) => {
    await window.CardinalShowcase.openForProject(PR);
    await new Promise(r => setTimeout(r, 120));
    const el = document.getElementById('cr-show');
    const form = document.getElementById('cr-show-form');
    return { formOpen: !!(form && form.classList.contains('open')),
             addBtn: !!(el && el.querySelector('[data-act="waddwalk"]')),
             tabOn: !!(el && el.querySelector('[data-tab="walk"].on')),
             wrote: window.__captured.length };
  }, PROJECT);
  ok('D1 no start form for a rep', !r.formOpen);
  ok('D2 no Start a walk button for a rep', !r.addBtn);
  ok('D3 the walk tab still renders', r.tabOn);
  ok('D4 nothing was written', r.wrote === 0, 'writes=' + r.wrote);
  await page.close();
});

/* ── E · the tile: the ADMIN TERNARY, executed, not grepped ──────────────── */
console.log('\n── E · the job-menu tile ──');
await step('E', async () => {
  /* 1080–1082 (ce80e34) gave the tile its own drawn 'walk' icon, replacing
   * 'camera'. Match the tile by its LABEL, not the icon key, so an icon swap
   * cannot break the marker again — the contract is the admin-gated tile. */
  const mWalk = HTML.match(/jt\(dbIc\('[a-z0-9_-]+'\),\s*'The Walk'/);
  const expr = mWalk ? parenAround(HTML, mWalk[0]) : null;
  ok('E0 the tile sits inside a parenthesised expression', !!expr, expr ? expr.length + ' chars' : 'marker not found');
  if (!expr) {
    ok('E1 an admin gets the tile', false, 'no expression');
    ok('E2 a rep gets nothing', false, 'no expression');
    return;
  }
  const page = await browser.newPage();
  await page.setContent('<!doctype html><html><body></body></html>');
  const r = await page.evaluate((src) => {
    const run = (admin) => (new Function('jt', 'dbIc', 'isAdminUser', 'return ' + src))(
      (ic, label, n, act) => '<div class="jabox" data-jm="' + act + '">' + label + '</div>',
      () => '<svg></svg>',
      () => admin);
    return { asAdmin: run(true), asRep: run(false) };
  }, expr);
  ok('E1 an admin gets the tile', /data-jm="walk"/.test(r.asAdmin) && /The Walk/.test(r.asAdmin),
     JSON.stringify(r.asAdmin).slice(0, 140));
  ok('E2 a rep gets nothing', r.asRep === '', JSON.stringify(r.asRep));
  await page.close();
});

/* ── F · the router: dispatched, not grepped ─────────────────────────────── */
console.log('\n── F · the job-menu router ──');
await step('F', async () => {
  const start = HTML.indexOf("mount.querySelectorAll('[data-jm]').forEach(function(b){");
  ok('F0 router sliced', start !== -1);
  if (start === -1) {
    ['F1 walk routes to openForProject with the project',
     'F2 walk does NOT fall to showTab',
     'F3 the other tiles still route'].forEach(n => ok(n, false, 'router not found'));
    return;
  }
  const ROUTER = HTML.slice(start, HTML.indexOf('\n  });', start) + 6);
  const page = await browser.newPage();
  page.on('pageerror', e => console.log('    [pageerror] ' + e.message));
  await page.setContent('<!doctype html><html><body><div id="m">' +
    '<div data-jm="walk"></div><div data-jm="docs"></div><div data-jm="checklists"></div>' +
    '</div></body></html>');
  const calls = await page.evaluate(({ ROUTER, PR }) => {
    const calls = [];
    window.CardinalShowcase = { openForProject: p => calls.push(['openForProject', p && p.id]) };
    const fn = new Function('mount', 'pr', 'openCommunications', 'openGalleryMode',
      'openTasksPage', 'openDocsPage', 'openApptsPage', 'showTab', ROUTER);
    fn(document.getElementById('m'), PR,
       () => calls.push(['comms']), () => calls.push(['album']), () => calls.push(['tasks']),
       () => calls.push(['docs']), () => calls.push(['appts']),
       t => calls.push(['showTab', t]));
    document.querySelector('[data-jm="walk"]').click();
    const afterWalk = calls.slice();
    document.querySelector('[data-jm="docs"]').click();
    document.querySelector('[data-jm="checklists"]').click();
    return { afterWalk, all: calls };
  }, { ROUTER, PR: PROJECT });
  ok('F1 walk routes to openForProject with the project',
     calls.afterWalk.length === 1 && calls.afterWalk[0][0] === 'openForProject'
       && calls.afterWalk[0][1] === PROJECT.id, JSON.stringify(calls.afterWalk));
  ok('F2 walk does NOT fall to showTab',
     !calls.afterWalk.some(c => c[0] === 'showTab'), JSON.stringify(calls.afterWalk));
  ok('F3 the other tiles still route',
     calls.all.some(c => c[0] === 'docs') && calls.all.some(c => c[0] === 'showTab' && c[1] === 'checklists'),
     JSON.stringify(calls.all));
  await page.close();
});

/* ── G · standing invariants this build must not have broken ─────────────── */
console.log('\n── G · standing invariants ──');
await step('G', async () => {
  ok('G1 no 14th scroll-lock writer', !/body\.style\.overflow\s*=/.test(MODULE_JS));
  ok('G2 export still merges',
     /window\.CardinalShowcase\s*=\s*Object\.assign\(window\.CardinalShowcase\s*\|\|\s*\{\}/.test(MODULE_JS));
  const page = await boot({ admin: true, walks: [] });
  const r = await page.evaluate(async () => {
    const api = window.CardinalShowcase;
    const surface = !!(api && typeof api.open === 'function' && typeof api.close === 'function'
                        && typeof api.reload === 'function');
    if (api && api.open) api.open();
    await new Promise(r => setTimeout(r, 80));
    return { surface, showcaseTab: !!document.querySelector('#cr-show [data-tab="showcase"].on'),
             overflow: document.body.style.overflow };
  });
  ok('G3 module still exports open/close/reload', r.surface);
  ok('G4 an ordinary open still lands on the Showcase tab', r.showcaseTab);
  ok('G5 no body.style.overflow written', r.overflow === '', JSON.stringify(r.overflow));
  await page.close();
});

await browser.close();

/* ── FLOOR ───────────────────────────────────────────────────────────────── */
const FLOOR = ['A0','A1','A2','A3','A4','A5','A6','A7','A8','A9','A10',
               'B1','B2','B2b','B3','C1','C2','C3','D1','D2','D3','D4',
               'E0','E1','E2','F0','F1','F2','F3','G1','G2','G3','G4','G5'];
const seen = [...ran];
const missing = FLOOR.filter(n => !seen.some(r => r.startsWith(n + ' ')));
console.log('\n── floor ──');
if (missing.length) {
  fails += missing.length;
  console.log('  FAIL  ' + missing.length + ' check(s) never ran: ' + missing.join(', '));
} else {
  console.log('  PASS  all ' + FLOOR.length + ' checks executed');
}

console.log('\n' + (fails ? 'RED' : 'GREEN') + ' — ' + passes + ' passed, ' + fails + ' failed');
process.exit(fails ? 1 : 0);
})();
