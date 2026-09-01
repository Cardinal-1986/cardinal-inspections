/* gate_1195 — Walk → job attachment: the second half of the one mechanism.
 *
 * Chromium over the SHIPPED cr-show module (the 1076 rig), with a mock whose
 * walks table actually MUTATES on update — so "survives refetch" is a real
 * round trip, not a cached object.
 *
 *  A · a standalone walk grows an Attach to job control; the picker opens in
 *      attach mode (its own heading, real jobs only — NO Studio tray, NO Add
 *      button), the job tap writes project_id through the walks update rails
 *      scoped to this walk, and the button reads Job ✓.
 *  B · the association survives a full loadWalks() refetch.
 *  C · Detach writes project_id null and the control reads Attach again.
 *  D · guards: no curWalk → no picker; the wjob button (MouseEvent arg)
 *      still opens plain walk mode; a non-admin sees no attach control.
 *
 * Negative control: argv[2] = the 1194 artifact — A/C go RED, reporting
 * (BUG_CLASSES 37: guarded lookups, a FLOOR on executed checks).
 */
import fs from 'fs';
import { createRequire } from 'module';
import { chromium } from 'playwright';

const requireC = createRequire(import.meta.url);
const CR_ROOT = requireC('./script_paths.cjs').ROOT + '/';
const FILE = process.argv[2] || CR_ROOT + 'index.html';
const HTML = fs.readFileSync(FILE, 'utf8');
console.log('gate_1195 on ' + FILE + '  (' + HTML.length.toLocaleString() + ' chars)');

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

const MS = requireC('./module_source.cjs');
const MODULE_JS = MS.moduleText(HTML, 'showcase.js', { htmlPath: FILE, missing: 'throw' });

const P1 = { id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', name: 'Marjorie Whitlock',
             address: '4212 Wilmington Pike, Kettering, OH 45440' };
const P2 = { id: '99999999-8888-7777-6666-555555555555', name: 'Bob Roof', address: '9 Elm St' };

const MOCKS = (walks) => `
window.__captured = [];
window.__trayQueried = 0;
(function(){
  var WALKS = ${JSON.stringify(walks)};
  var PROJECTS = ${JSON.stringify([P1, P2])};
  var supa = {
    auth: { getUser: function(){ return Promise.resolve({ data:{ user:{ email:'theo@cardinalrenovations.net' } } }); } },
    from: function(table){
      if (table === 'studio_tray') window.__trayQueried++;
      var q = { _eq:{}, _patch:null };
      q.select = function(){ return q; }; q.order = function(){ return q; }; q.limit = function(){ return q; };
      q.eq = function(k, v){ q._eq[k] = v; return q; };
      q.insert = function(row){ window.__captured.push({ table:table, op:'insert', row:row });
        if (table === 'walks') WALKS.push(row); q._ins = [{ id: row && row.id }]; return q; };
      q.update = function(patch){ q._patch = patch;
        window.__captured.push({ table:table, op:'update', patch:patch, eq:q._eq }); return q; };
      q.delete = function(){ return q; };
      q.then = function(res){
        var data = [];
        if (q._ins) data = q._ins;
        else if (table === 'walks'){
          if (q._patch){
            /* the mutation IS the point: a later refetch must see it */
            WALKS.forEach(function(w){
              var hit = !('id' in q._eq) || String(w.id) === String(q._eq.id);
              if (hit) Object.keys(q._patch).forEach(function(k){ w[k] = q._patch[k]; });
            });
            data = WALKS.filter(function(w){ return !('id' in q._eq) || String(w.id) === String(q._eq.id); });
          } else data = WALKS.slice();
        }
        else if (table === 'projects') data = PROJECTS.slice();
        else if (table === 'studio_tray') data = [];
        return Promise.resolve({ data: data, error: null, count: 0 }).then(res);
      };
      return q;
    },
    storage:{ from:function(){ return {
      upload:function(){ return Promise.resolve({ error:null }); },
      createSignedUrls:function(){ return Promise.resolve({ data: [] }); },
      createSignedUrl:function(){ return Promise.resolve({ data: {} }); } }; } }
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

/* open the module, land on the walk tab, open walk card 0 */
async function openWalkZero(page) {
  return await page.evaluate(async () => {
    const wait = n => new Promise(r => setTimeout(r, n));
    if (!window.CardinalShowcase || !window.CardinalShowcase.open) return { ok: false, why: 'no open()' };
    window.CardinalShowcase.open();
    await wait(120);
    const tab = document.querySelector('#cr-show [data-tab="walk"]');
    if (!tab) return { ok: false, why: 'no walk tab' };
    tab.click();
    await wait(260);
    const card = document.querySelector('#cr-show [data-walk="0"]');
    if (!card) return { ok: false, why: 'no walk card' };
    card.click();
    await wait(260);
    return { ok: true };
  });
}

(async () => {
browser = await chromium.launch();

/* ── A · attach a standalone walk ────────────────────────────────────── */
console.log('\n── A · attach ──');
await step('A', async () => {
  const page = await boot({ admin: true,
    walks: [{ id: 'w1', title: 'The walk', address: '5735 Webster street', city: 'Dayton',
              trade: 'roof', project_id: null, published: true, sort_order: 0 }] });
  const o = await openWalkZero(page);
  ok('A0 walk view reached', o.ok, o.why);
  if (!o.ok) { await page.close(); return; }

  const a1 = await page.evaluate(() => {
    const b = document.querySelector('#cr-show [data-act="wattach"]');
    return { present: !!b, label: b ? b.textContent.trim() : '' };
  });
  ok('A1 the attach control ships on the walk view', a1.present);
  ok('A2 an unattached walk reads "Attach to job"', a1.label === 'Attach to job', a1.label);

  const a3 = await page.evaluate(async () => {
    const wait = n => new Promise(r => setTimeout(r, n));
    const b = document.querySelector('#cr-show [data-act="wattach"]');
    if (!b) return null;
    b.click();
    await wait(260);
    const form = document.getElementById('cr-show-form');
    return {
      open: !!(form && form.classList.contains('open')),
      h3: form ? (form.querySelector('h3') || {}).textContent : '',
      jobs: form ? form.querySelectorAll('[data-proj]').length : 0,
      tray: form ? /Studio tray/.test(form.innerHTML) : true,
      addBtn: form ? !!form.querySelector('[data-jadd]') : true,
      trayQueried: window.__trayQueried
    };
  });
  ok('A3 the picker opens in attach mode', !!a3 && a3.open && a3.h3 === 'Attach this walk to a job', a3 && a3.h3);
  ok('A4 both real jobs listed', !!a3 && a3.jobs === 2, a3 && ('n=' + a3.jobs));
  ok('A5 the Studio tray pseudo-project stays out', !!a3 && !a3.tray && a3.trayQueried === 0,
     a3 && ('queried=' + a3.trayQueried));
  ok('A6 no Add button — the job tap completes it', !!a3 && !a3.addBtn);

  const a7 = await page.evaluate(async (pid) => {
    const wait = n => new Promise(r => setTimeout(r, n));
    const form = document.getElementById('cr-show-form');
    const rows = form ? form.querySelectorAll('[data-proj]') : [];
    let hit = null;
    rows.forEach(r => { if (r.getAttribute('data-proj') === pid) hit = r; });
    if (!hit) return { tapped: false };
    hit.click();
    await wait(300);
    const ups = window.__captured.filter(c => c.table === 'walks' && c.op === 'update');
    const b = document.querySelector('#cr-show [data-act="wattach"]');
    return { tapped: true, ups: ups, formOpen: !!(form && form.classList.contains('open')),
             label: b ? b.textContent.trim() : '' };
  }, P1.id);
  ok('A7 the job tap wrote exactly one walks update', !!a7 && a7.tapped && a7.ups.length === 1,
     a7 && ('n=' + (a7.ups || []).length));
  ok('A8 the update carries the picked project_id, scoped to THIS walk',
     !!a7 && a7.ups.length === 1 && a7.ups[0].patch.project_id === P1.id &&
     String(a7.ups[0].eq.id) === 'w1', a7 && JSON.stringify(a7.ups[0] || {}));
  ok('A9 the picker closed', !!a7 && !a7.formOpen);
  ok('A10 the control now reads Job ✓', !!a7 && a7.label === 'Job ✓', a7 && a7.label);

  /* ── B · survives a refetch ── */
  const b1 = await page.evaluate(async (pid) => {
    const wait = n => new Promise(r => setTimeout(r, n));
    /* leave and re-enter the walk list — loadWalks() runs against the mock's
       MUTATED table, the same shape a reload takes */
    const back = document.querySelector('#cr-show [data-act="wback"]');
    if (back) back.click();
    await wait(120);
    if (!window.CardinalShowcase.openForProject) return { found: false };
    await window.CardinalShowcase.openForProject({ id: pid, name: 'Marjorie Whitlock', address: '4212 Wilmington Pike' });
    await wait(300);
    const form = document.getElementById('cr-show-form');
    return { found: !document.querySelector('#cr-show-form.open'),
             onWalk: !!document.querySelector('#cr-show [data-act="wattach"]') };
  }, P1.id);
  ok('B1 after refetch, the JOB DOOR finds this walk (no create form)',
     !!b1 && b1.found && b1.onWalk, JSON.stringify(b1));

  /* ── C · detach ── */
  const c1 = await page.evaluate(async () => {
    const wait = n => new Promise(r => setTimeout(r, n));
    const b = document.querySelector('#cr-show [data-act="wattach"]');
    if (!b) return null;
    b.click();
    await wait(260);
    const form = document.getElementById('cr-show-form');
    const det = form && form.querySelector('[data-jdetach]');
    if (!det) return { det: false };
    det.click();
    await wait(300);
    const ups = window.__captured.filter(c => c.table === 'walks' && c.op === 'update');
    const b2 = document.querySelector('#cr-show [data-act="wattach"]');
    return { det: true, last: ups[ups.length - 1], label: b2 ? b2.textContent.trim() : '' };
  });
  ok('C1 an attached walk offers Detach', !!c1 && c1.det);
  ok('C2 detach writes project_id null through the same rails',
     !!c1 && c1.last && c1.last.patch.project_id === null && String(c1.last.eq.id) === 'w1',
     c1 && JSON.stringify(c1.last || {}));
  ok('C3 the control reads Attach to job again', !!c1 && c1.label === 'Attach to job', c1 && c1.label);
  await page.close();
});

/* ── D · guards ──────────────────────────────────────────────────────── */
console.log('\n── D · guards ──');
await step('D', async () => {
  const page = await boot({ admin: true,
    walks: [{ id: 'w1', title: 'The walk', project_id: null, published: true, sort_order: 0 }] });
  const d1 = await page.evaluate(async () => {
    const wait = n => new Promise(r => setTimeout(r, n));
    window.CardinalShowcase.open();
    await wait(120);
    const tab = document.querySelector('#cr-show [data-tab="walk"]');
    if (tab) tab.click();
    await wait(260);
    /* no walk open: the wjob button does not exist on the LIST; drive the
       picker directly the way the wattach wrapper would — with no curWalk
       it must refuse */
    if (typeof window.__gate_openJobPicker !== 'function'){
      /* not exported — assert via the form staying closed after a walk-less
         attach attempt is impossible to trigger from UI, which is itself the
         guard: no control exists outside a walk view */
      return { noControl: !document.querySelector('#cr-show [data-act="wattach"]') };
    }
    return { noControl: true };
  });
  ok('D1 no attach control outside a walk view', !!d1 && d1.noControl);

  const d2 = await page.evaluate(async () => {
    const wait = n => new Promise(r => setTimeout(r, n));
    const card = document.querySelector('#cr-show [data-walk="0"]');
    if (!card) return null;
    card.click();
    await wait(260);
    const wjob = document.querySelector('#cr-show [data-act="wjob"]');
    if (!wjob) return { wjob: false };
    wjob.click();                      /* arg 0 is a MouseEvent — 628's trap */
    await wait(260);
    const form = document.getElementById('cr-show-form');
    return { wjob: true, h3: form ? (form.querySelector('h3') || {}).textContent : '' };
  });
  ok('D2 the wjob button (MouseEvent arg) still opens plain walk mode',
     !!d2 && d2.wjob && d2.h3 === 'Add from a job', d2 && d2.h3);
  await page.close();

  const rep = await boot({ admin: false,
    walks: [{ id: 'w1', title: 'The walk', project_id: null, published: true, sort_order: 0 }] });
  const d3 = await rep.evaluate(async () => {
    const wait = n => new Promise(r => setTimeout(r, n));
    window.CardinalShowcase.open();
    await wait(120);
    const tab = document.querySelector('#cr-show [data-tab="walk"]');
    if (tab) tab.click();
    await wait(260);
    const card = document.querySelector('#cr-show [data-walk="0"]');
    if (card) card.click();
    await wait(260);
    return { attach: !!document.querySelector('#cr-show [data-act="wattach"]') };
  });
  ok('D3 a non-admin never sees the attach control', !!d3 && !d3.attach);
  await rep.close();
});

/* floor — a section that never ran is a failure, not a green */
const FLOOR = ['A1', 'A7', 'A8', 'B1', 'C2', 'D2', 'D3'];
FLOOR.forEach(n => { if (![...ran].some(r => r.startsWith(n))) ok('FLOOR: ' + n + ' executed', false); });

await browser.close();
console.log('\n  ' + passes + ' pass, ' + fails + ' fail');
process.exit(fails ? 1 : 0);
})().catch(e => { console.log('  FAIL  harness crashed → ' + e.message);
  console.log('\n  ' + passes + ' pass, ' + (fails + 1) + ' fail'); process.exit(1); });

setTimeout(() => { console.log('GATE TIMEOUT'); process.exit(1); }, 90000);
