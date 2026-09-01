/* gate_1191 — the Guided Sale spine on The Appointment.
 *
 *  1. STEPS floor: all eleven stops, in order — discovery (welcome,
 *     whynow, priorities, plans) sits between pick and roof.
 *  2. CAPTURE + PERSISTENCE: driving the shipped module, every answer
 *     tap produces a patchProjectCk({guided:…}) payload — why_now
 *     toggles on AND off, priorities keep tap order (ranked), plans is
 *     single-select. The localStorage hint (gs_session) tracks the step.
 *  3. THE SHIELD: mid-visit, the Job stop paints the shield, a quick tap
 *     does NOT open the client list, a 600ms hold does, and Back returns
 *     to the step you came from.
 *  4. RESUME: a FRESH realm with the hint + a checklist carrying guided
 *     answers offers the resume card, and Resume lands on the hinted
 *     step with the saved answers painted. Start fresh clears the hint.
 *  5. QUICK-CREATE: pdb.create is called with stage Lead and a checklist
 *     carrying stage_since (the invariant); an empty name refuses.
 *  6. end() clears the hint; answers stay (they live on the customer).
 *  7. Hygiene: no scroll lock, no document.body observer, still ONE
 *     Object.assign export.
 *
 * Negative control: argv[2] = the 1190 artifact. Must go RED, and must
 * REPORT rather than crash (BUG_CLASSES 37) — every chip/selector access
 * is guarded.
 */
import fs from 'node:fs';
import { JSDOM } from 'jsdom';

const FILE = process.argv[2] || 'index.html';
const src  = fs.readFileSync(FILE, 'utf8');
let pass = 0, fail = 0;
const ok = (n, c, d) => { if (c) { pass++; console.log('  PASS  ' + n); }
                          else   { fail++; console.log('  FAIL  ' + n + (d ? '  -> ' + d : '')); } };

const blk = (tag, id) => {
  const a = src.indexOf(`<${tag} id="${id}"`);
  if (a < 0) return '';
  const b = src.indexOf(`</${tag}>`, a);
  return b < 0 ? '' : src.slice(a, b);
};
const js  = blk('script', 'cr-appt-script');
const css = blk('style',  'cr-appt-styles');

/* ── 1 · shape ─────────────────────────────────────────────── */
{
  const order = ['pick','welcome','whynow','priorities','plans',
                 'roof','good','why','house','options','sign'];
  let last = -1, inOrder = true;
  for (const id of order) {
    const at = js.indexOf("id:'" + id + "'");
    ok('STEPS floor: ' + id, at !== -1);
    if (at !== -1 && at < last) inOrder = false;
    last = at;
  }
  ok('STEPS order: discovery sits between pick and roof', inOrder);
}
ok('discovery card CSS shipped', css.includes('.gs-card') && css.includes('.gs-rank'));
ok('rail strip CSS shipped', css.includes('.ar-strip'));
ok('still writes NO scroll lock', !/style\.overflow/.test(js));
ok('adds NO document.body observer', !js.includes('.observe(document.body'));
ok('exported once via Object.assign',
   /Object\.assign\(\s*window\.CardinalAppointment\s*\|\|/.test(js));

/* ── shared realm builder ──────────────────────────────────── */
const CK = JSON.stringify({
  stage_since: '2026-08-01T00:00:00Z',
  guided: { why_now: ['storm'], priorities: ['price', 'looks'], horizon: 'forever' }
});
function realm(seed) {
  const calls = [];
  const rows = {
    projects: [
      { id: 'p1', name: 'Kim Lawson', stage: 'Approved', address: '12 Oak St', checklist: seed ? CK : '{}' },
      { id: 'p2', name: 'Bob Roof',   stage: 'Lead',     address: '', checklist: '{}' }
    ],
    renders: []
  };
  const mk = table => {
    const q = { _t: table, _eq: {} };
    for (const m of ['select', 'order', 'limit']) q[m] = () => q;
    q.eq = (k, v) => { q._eq[k] = v; calls.push(table + '.eq:' + k + '=' + v); return q; };
    q.single = () => q; q.maybeSingle = () => q;
    q.then = (res, rej) => {
      let data = [];
      if (q._t === 'projects') data = q._eq.id
        ? rows.projects.filter(p => String(p.id) === String(q._eq.id))
        : rows.projects;
      if (q._t === 'design_renders') data = rows.renders;
      if (q._t === 'inspection_reports') data = [];
      return Promise.resolve({ data }).then(res, rej);
    };
    return q;
  };
  const body = js.slice(js.indexOf('>') + 1);
  const dom = new JSDOM('<!doctype html><html><head>' + css + '</style></head><body>' +
    '<div id="cr-show"><button data-tab="work"></button></div>' +
    '<script>' + body + '<\/script></body></html>',
    { runScripts: 'dangerously', url: 'https://gs.test/' });
  const w = dom.window;
  Object.defineProperty(w, 'supa', { value: { from: t => mk(t),
    storage: { from: () => ({ createSignedUrls: () => Promise.resolve({ data: [] }),
                              createSignedUrl:  () => Promise.resolve({ data: {} }) }) } },
    writable: false });
  const patches = [];
  w.patchProjectCk = (pr, patch) => { patches.push({ id: pr && pr.id, patch: JSON.parse(JSON.stringify(patch)) });
    return Promise.resolve(); };
  w.CardinalShowcase = { openForProject(){}, open(){}, close(){} };
  w.CardinalWhy = { open(){}, close(){} };
  w.CardinalColors = { open(){}, close(){} };
  w.hideAllViews = () => {};
  return { w, calls, patches };
}
const step = ms => new Promise(r => setTimeout(r, ms || 380));
const lastGuided = patches => patches.length ? patches[patches.length - 1].patch.guided : null;
const tapCard = (pane, k) => { const b = pane.querySelector('.gs-card[data-k="' + k + '"]');
  if (b) b.click(); return !!b; };

(async () => {

/* ── 2+3 · capture, persistence, hint, shield ──────────────── */
{
  const { w, patches } = realm(false);
  ok('module exported in realm A', !!w.CardinalAppointment);
  if (!w.CardinalAppointment) throw new Error('no module — control tree?');
  await w.CardinalAppointment.open();
  await step(480);
  const pane = w.document.getElementById('cr-appt');
  const rail = w.document.getElementById('cr-appt-rail');
  ok('picker paints + quick-create door', !!pane.querySelector('[data-gs="new"]'));
  const job = pane.querySelector('.ap-job');
  if (job) job.click(); else ok('a job row exists', false);
  await step(480);
  ok('pick -> Welcome, with the address on it',
     !!pane.querySelector('[data-gs-pane="welcome"]') && pane.textContent.includes('12 Oak St'));
  ok('hint tracks the step (welcome)',
     (JSON.parse(w.localStorage.getItem('gs_session') || '{}').stepId) === 'welcome');
  const begin = pane.querySelector('[data-gs="next"]');
  if (begin) begin.click(); else ok('Begin exists', false);
  await step();

  /* why now — multi-toggle */
  ok('Why now paints its cards', !!pane.querySelector('.gs-card[data-k="storm"]'));
  tapCard(pane, 'storm'); await step(60);
  tapCard(pane, 'leak');  await step(60);
  let g = lastGuided(patches);
  ok('two taps persisted in order', !!g && JSON.stringify(g.why_now) === '["storm","leak"]',
     JSON.stringify(g && g.why_now));
  tapCard(pane, 'storm'); await step(60);
  g = lastGuided(patches);
  ok('re-tap toggles OFF and persists', !!g && JSON.stringify(g.why_now) === '["leak"]',
     JSON.stringify(g && g.why_now));
  const note = pane.querySelector('.gs-note');
  if (note) {
    note.value = 'gutters too';
    note.dispatchEvent(new w.Event('input'));
    note.dispatchEvent(new w.Event('blur'));
    await step(60);
    g = lastGuided(patches);
    ok('the note persists on blur', !!g && g.why_now_note === 'gutters too');
  } else ok('note field exists', false);
  const n1 = pane.querySelector('[data-gs="next"]');
  if (n1) n1.click(); await step();

  /* priorities — ranked */
  tapCard(pane, 'warranty'); await step(60);
  tapCard(pane, 'price'); await step(60);
  g = lastGuided(patches);
  ok('priorities keep tap order', !!g && JSON.stringify(g.priorities) === '["warranty","price"]',
     JSON.stringify(g && g.priorities));
  const rank = pane.querySelector('.gs-card[data-k="warranty"] .gs-rank');
  ok('rank badge shows 1 on the first pick', !!rank && rank.textContent === '1');
  const n2 = pane.querySelector('[data-gs="next"]');
  if (n2) n2.click(); await step();

  /* plans — single-select */
  tapCard(pane, 'awhile'); await step(60);
  tapCard(pane, 'forever'); await step(60);
  g = lastGuided(patches);
  ok('plans is single-select (last tap wins)', !!g && g.horizon === 'forever');
  ok('every persisted patch targeted the picked job',
     patches.length > 0 && patches.every(p => p.id === 'p1'), 'n=' + patches.length);
  ok('hint now says plans',
     (JSON.parse(w.localStorage.getItem('gs_session') || '{}').stepId) === 'plans');

  /* rep-privacy floor: no coaching vocabulary on any discovery pane */
  ok('no rep coaching leaks into discovery',
     !/objection|talk track|dealer fee|commission/i.test(pane.textContent));

  /* the shield */
  const jobChip = rail.querySelectorAll('.ar-step')[0];
  if (jobChip) jobChip.click(); else ok('job chip exists', false);
  await step();
  ok('mid-visit the Job stop is the SHIELD, not the list',
     pane.textContent.includes('client list') && !pane.querySelector('.ap-search'));
  const hold = pane.querySelector('[data-gs="unlock"]');
  if (hold) {
    hold.dispatchEvent(new w.Event('pointerdown'));
    await step(120);
    hold.dispatchEvent(new w.Event('pointerup'));
    await step(80);
    ok('a quick tap does NOT open the list', !pane.querySelector('.ap-search'));
    const back = pane.querySelector('[data-gs="backvisit"]');
    if (back) back.click(); await step();
    ok('Back returns to the step you came from (plans)',
       !!pane.querySelector('.gs-card[data-k="forever"]'));
    if (jobChip) jobChip.click(); await step();
    const hold2 = pane.querySelector('[data-gs="unlock"]');
    hold2.dispatchEvent(new w.Event('pointerdown'));
    await step(700);
    ok('a 600ms HOLD opens the client list', !!pane.querySelector('.ap-search'));
  } else ok('hold control exists', false);

  /* end clears the hint */
  const endBtn = rail.querySelector('[data-ap="end"]');
  if (endBtn) endBtn.click(); await step();
  ok('end() clears the resume hint', w.localStorage.getItem('gs_session') === null);
}

/* ── 4 · resume in a FRESH realm ───────────────────────────── */
{
  const { w } = realm(true);
  if (w.CardinalAppointment) {
    w.localStorage.setItem('gs_session', JSON.stringify(
      { projectId: 'p1', projectName: 'Kim Lawson', stepId: 'priorities', at: Date.now() }));
    await w.CardinalAppointment.open();
    await step(480);
    const pane = w.document.getElementById('cr-appt');
    ok('a fresh load offers the resume card',
       pane.textContent.includes('Pick up where you left off') &&
       pane.textContent.includes('Kim Lawson'));
    const res = pane.querySelector('[data-gs="resume"]');
    if (res) res.click(); else ok('Resume exists', false);
    await step(520);
    ok('Resume lands on the hinted step (priorities)',
       !!pane.querySelector('.gs-card[data-k="price"]'));
    const p1 = pane.querySelector('.gs-card[data-k="price"]');
    const p2 = pane.querySelector('.gs-card[data-k="looks"]');
    ok('saved answers are painted back (price=1, looks=2)',
       !!p1 && p1.classList.contains('on') && !!p1.querySelector('.gs-rank') &&
       p1.querySelector('.gs-rank').textContent === '1' &&
       !!p2 && p2.classList.contains('on') &&
       p2.querySelector('.gs-rank').textContent === '2');
  } else ok('module exported in realm B', false);
}

/* ── 4b · start fresh clears the hint ──────────────────────── */
{
  const { w } = realm(true);
  if (w.CardinalAppointment) {
    w.localStorage.setItem('gs_session', JSON.stringify(
      { projectId: 'p1', projectName: 'Kim Lawson', stepId: 'plans', at: Date.now() }));
    await w.CardinalAppointment.open();
    await step(480);
    const pane = w.document.getElementById('cr-appt');
    const fresh = pane.querySelector('[data-gs="fresh"]');
    if (fresh) fresh.click(); else ok('Start fresh exists', false);
    await step();
    ok('Start fresh lands on the picker', !!pane.querySelector('.ap-search'));
    ok('…and clears the hint', w.localStorage.getItem('gs_session') === null);
  } else ok('module exported in realm C', false);
}

/* ── 5 · quick-create ──────────────────────────────────────── */
{
  const { w } = realm(false);
  if (w.CardinalAppointment) {
    const created = [];
    w.pdb = { create: f => { created.push(JSON.parse(JSON.stringify(f))); return Promise.resolve('newid'); } };
    await w.CardinalAppointment.open();
    await step(480);
    const pane = w.document.getElementById('cr-appt');
    const door = pane.querySelector('[data-gs="new"]');
    if (door) door.click(); else ok('quick-create door exists', false);
    await step(60);
    const create = pane.querySelector('[data-gs="create"]');
    if (create) {
      create.click(); await step(80);
      ok('empty name refuses (pdb.create not called)',
         created.length === 0 && pane.textContent.includes('Name is required'));
      pane.querySelector('[data-slot="nn"]').value = 'New Homeowner';
      pane.querySelector('[data-slot="np"]').value = '937-555-0142';
      create.click(); await step(480);
      const f = created[0];
      ok('pdb.create called with stage Lead', !!f && f.stage === 'Lead' && f.name === 'New Homeowner');
      let ckOK = false;
      try { ckOK = !!JSON.parse(f.checklist).stage_since; } catch (_) {}
      ok('checklist carries stage_since on creation (the invariant)', ckOK);
      ok('…and lands on Welcome for the new customer',
         !!pane.querySelector('[data-gs-pane="welcome"]') && pane.textContent.includes('New Homeowner'));
    } else ok('create button exists', false);
  } else ok('module exported in realm D', false);
}

  console.log('\n  ' + pass + ' pass, ' + fail + ' fail');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.log('  FAIL  harness crashed -> ' + e.message);
  console.log('\n  ' + pass + ' pass, ' + (fail + 1) + ' fail'); process.exit(1); });

/* watchdog — a hung boot must read as a failure, not a pass */
setTimeout(() => { console.log('GATE TIMEOUT'); process.exit(1); }, 45000);
