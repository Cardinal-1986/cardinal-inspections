/* gate_1192 — the homeowner canvas + auto-skip + persistence semantics.
 *
 *  1. THE TWO LAYERS: discovery / shield / resume paint with #cr-appt.gs-lit
 *     (the warm light canvas); the picker — the rep's room — never does.
 *  2. AUTO-SKIP (Theo's §6): with NO content behind them, roof / good /
 *     house / options / sign dim on the rail (.ar-off, aria-disabled,
 *     disabled), Next from Plans lands on WHY (the first available stop,
 *     never an empty room), Back from Why returns to Plans, a tap on a
 *     dimmed chip is refused, and Next dies at the last available stop.
 *  3. INTERNAL-COPY FLOOR: no homeowner-visible stop carries internal voice
 *     ("Theo", "scoped to your sign-in", "Queue them in the Designer").
 *  4. guided.v === 1 rides every persisted payload (the §4 semantic marker).
 *  5. Offline/failed quick-create reports honestly and creates nothing.
 *  6. With content PRESENT nothing dims — the 1161 journey is untouched.
 *
 * Negative control: argv[2] = the 1191 (or 1190) artifact. Must go RED and
 * must REPORT rather than crash — access is guarded (BUG_CLASSES 37).
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
ok('the homeowner canvas CSS shipped (gs-lit, light ground)',
   css.includes('#cr-appt.gs-lit{background:#F7F4EF;}'));
ok('dimmed-chip CSS shipped', css.includes('.ar-step.ar-off'));
ok('reduced motion respected', css.includes('prefers-reduced-motion'));
ok('availability probe exists', js.includes('function gsProbeAvail'));
ok('persisted shape is versioned', js.includes('guided.v = 1;'));
ok('still writes NO scroll lock', !/style\.overflow/.test(js));
ok('still adds NO document.body observer', !js.includes('.observe(document.body'));

/* ── realm builder: seed = 'full' | 'empty' ────────────────── */
function realm(seed) {
  const patches = [];
  const rows = {
    projects: [{ id: 'p1', name: 'Kim Lawson', stage: 'Approved',
                 address: '12 Oak St', checklist: '{}' }]
  };
  const mk = table => {
    const q = { _t: table, _eq: {} };
    for (const m of ['select', 'order', 'limit']) q[m] = () => q;
    q.eq = (k, v) => { q._eq[k] = v; return q; };
    q.single = () => q; q.maybeSingle = () => q;
    q.then = (res, rej) => {
      let data = [];
      if (table === 'projects') data = rows.projects;
      else if (seed === 'full') {
        if (table === 'walks') data = [{ id: 'w1' }];
        if (table === 'workmanship_pairs') data = [{ id: 'wp1' }];
        if (table === 'design_renders') data = [{ id: 'r1', title: 'Onyx',
          render_path: 'v/a.jpg', preview_path: 'v/a-p.jpg', approved: true }];
        if (table === 'inspection_reports') data = [{ id: 'd1',
          title: 'Roof Options — Kim Lawson', share_token: 'tokZ',
          signed_at: null, status: 'sent', created_at: '2026-08-30' }];
      }
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
  w.patchProjectCk = (pr, patch) => { patches.push(JSON.parse(JSON.stringify(patch)));
    return Promise.resolve(); };
  const calls = [];
  w.CardinalShowcase = { openForProject: (pr, o) => calls.push('ofp'),
                         open: () => calls.push('show.open'), close(){} };
  w.CardinalWhy = { open: () => calls.push('why.open'), close(){} };
  w.CardinalColors = { open(){}, close(){} };
  w.hideAllViews = () => {};
  return { w, patches, calls };
}
const step = ms => new Promise(r => setTimeout(r, ms || 380));
const INTERNAL = /Theo|scoped to your sign-in|Queue them in the Designer|Publish the estimate/i;

(async () => {

/* ── 2 · EMPTY content: skip, dim, refuse, stay in voice ───── */
{
  const { w, patches, calls } = realm('empty');
  ok('module exported (empty realm)', !!w.CardinalAppointment);
  if (!w.CardinalAppointment) throw new Error('no module — control tree?');
  await w.CardinalAppointment.open();
  await step(480);
  const pane = w.document.getElementById('cr-appt');
  const rail = w.document.getElementById('cr-appt-rail');
  ok('the picker is the rep’s room — NOT gs-lit',
     !pane.classList.contains('gs-lit'));
  const job = pane.querySelector('.ap-job');
  if (job) job.click(); else ok('a job row exists', false);
  await step(520);
  ok('Welcome paints on the light canvas (gs-lit)',
     pane.classList.contains('gs-lit') && /Let’s look at your roof/.test(pane.textContent));
  const chips = rail.querySelectorAll('.ar-step');
  const idx = { roof: 5, good: 6, why: 7, house: 8, options: 9, sign: 10 };
  for (const [nm, i] of Object.entries(idx)) {
    if (nm === 'why') continue;
    const b = chips[i];
    ok('empty job dims ' + nm, !!b && b.classList.contains('ar-off') &&
       b.disabled && b.getAttribute('aria-disabled') === 'true');
  }
  ok('Why us stays available (its content is static)',
     !!chips[7] && !chips[7].classList.contains('ar-off') && !chips[7].disabled);
  /* a tap on a dimmed chip is refused */
  if (chips[5]) chips[5].click();
  await step();
  ok('a dimmed chapter does not open',
     pane.style.display === 'block' && !calls.includes('ofp'));
  /* walk the discovery, then Next must land on WHY, never an empty room */
  for (let i = 0; i < 3; i++) {
    const n = pane.querySelector('[data-gs="next"]');
    if (n) n.click(); else ok('Continue exists (stop ' + i + ')', false);
    await step(300);
  }
  ok('reached Plans', !!pane.querySelector('.gs-card[data-k="forever"]'));
  const n2 = pane.querySelector('[data-gs="next"]');
  if (n2) n2.click();
  await step(460);
  ok('Next from Plans SKIPS roof/good and lands on Why us',
     calls.includes('why.open') && !calls.includes('ofp') && !calls.includes('show.open'));
  ok('Next is dead at the last AVAILABLE stop',
     rail.querySelector('[data-ap="next"]').disabled);
  rail.querySelector('[data-ap="back"]').click();
  await step(420);
  ok('Back from Why us returns to Plans (skipping backwards too)',
     pane.style.display === 'block' && !!pane.querySelector('.gs-card[data-k="forever"]'));
  /* internal-copy floor across every reachable homeowner stop */
  let leaked = null;
  const stops = [1, 2, 3, 4];
  for (const s of stops) {
    const chip = chips[s]; if (chip) chip.click();
    await step(220);
    if (INTERNAL.test(pane.textContent)) leaked = s + ':' + pane.textContent.slice(0, 60);
  }
  ok('no internal voice on any homeowner stop', !leaked, leaked || '');
  /* payloads carry the semantic version marker */
  const card = pane.querySelector('.gs-card[data-k="forever"]');
  if (card) card.click();
  await step(120);
  const last = patches.length ? patches[patches.length - 1].guided : null;
  ok('persisted payloads carry v:1', !!last && last.v === 1,
     JSON.stringify(last));
}

/* ── 6 · FULL content: nothing dims, the 1161 journey intact ── */
{
  const { w, calls } = realm('full');
  if (w.CardinalAppointment) {
    await w.CardinalAppointment.open();
    await step(480);
    const pane = w.document.getElementById('cr-appt');
    const rail = w.document.getElementById('cr-appt-rail');
    const job = pane.querySelector('.ap-job');
    if (job) job.click();
    await step(520);
    const offs = [...rail.querySelectorAll('.ar-step.ar-off')];
    ok('with content present NOTHING dims', offs.length === 0,
       'dimmed=' + offs.length);
    const chips = rail.querySelectorAll('.ar-step');
    if (chips[5]) chips[5].click();
    await step(460);
    ok('roof opens normally when a walk exists', calls.includes('ofp'));
    ok('the shield paints on the light canvas',
       (chips[0] && (chips[0].click(), true)) ? await step(300).then(() =>
         pane.classList.contains('gs-lit') && pane.textContent.includes('client list')) : false);
  } else ok('module exported (full realm)', false);
}

/* ── 5 · a FAILED create reports honestly and creates nothing ── */
{
  const { w } = realm('empty');
  if (w.CardinalAppointment) {
    w.pdb = { create: () => Promise.reject(new Error('Failed to fetch')) };
    await w.CardinalAppointment.open();
    await step(480);
    const pane = w.document.getElementById('cr-appt');
    const door = pane.querySelector('[data-gs="new"]');
    if (door) door.click(); else ok('quick-create door exists', false);
    await step(80);
    const nn = pane.querySelector('[data-slot="nn"]');
    const create = pane.querySelector('[data-gs="create"]');
    if (nn && create) {
      nn.value = 'Offline Homeowner';
      create.click();
      await step(300);
      ok('a failed create says so plainly and stays on the picker',
         pane.textContent.includes('Could not create') &&
         !!pane.querySelector('.ap-search'));
    } else ok('create form paints', false);
  }
}

  console.log('\n  ' + pass + ' pass, ' + fail + ' fail');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.log('  FAIL  harness crashed -> ' + e.message);
  console.log('\n  ' + pass + ' pass, ' + (fail + 1) + ' fail'); process.exit(1); });

setTimeout(() => { console.log('GATE TIMEOUT'); process.exit(1); }, 45000);
