/* gate_1194 — WHAT WE FOUND: the homeowner inspection story (Slice 2).
 *
 *  1. SHAPE: the found step + paintFound ship; the persisted-evidence marker
 *     (data-gs-evidence="actual") is emitted from exactly one template; still
 *     no scroll lock and no body observer in the module.
 *  2. THE TRANSFORM IS SHARED, NOT COPIED: buildChecklistFindings is
 *     extracted from the SHIPPED file and executed — every row now carries a
 *     stable k, and area/text/pr are byte-identical to the 1193 behavior
 *     (the printed report's consumer sees no change).
 *  3. RICH REALM: checklist + reviewed walk shots -> Next from Plans lands on
 *     Findings; provenance dated; attention/watch grouped by pr WITHOUT
 *     printing grades; serviceable + numbers render; stories carry
 *     data-gs-topic and expand on tap; a photograph renders its mark and
 *     opens the lightbox; an unreadable shot is counted honestly.
 *  4. LEAK-PROOF: the walks read is scoped to the picked job (recorded eq),
 *     and another customer's walk content never renders.
 *  5. CHECKLIST-ONLY REALM: found stays available when no walk exists (the
 *     OR side), and no photo section renders.
 *  6. RELOAD: a fresh realm over the same production rows paints the same
 *     stories — the evidence lives in its production source, not the pane.
 *
 * Negative control: argv[2] = the 1193 artifact. Must go RED and REPORT
 * (guarded access — BUG_CLASSES 37), never crash.
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

/* brace-matched extraction of a shipped top-level function */
function extractFn(name) {
  const hv = src.indexOf('function ' + name + '(');
  if (hv < 0) return '';
  const open = src.indexOf('{', hv);
  let d = 0;
  for (let i = open; i < src.length; i++) {
    if (src[i] === '{') d++;
    else if (src[i] === '}') { d--; if (!d) return src.slice(hv, i + 1); }
  }
  return '';
}
const FN_BCF = extractFn('buildChecklistFindings');
const FN_SVC = extractFn('buildServiceableList');
ok('buildChecklistFindings extracted from the shipped file', FN_BCF.length > 200);
ok('buildServiceableList extracted from the shipped file', FN_SVC.length > 200);

/* ── 1 · shape ─────────────────────────────────────────────── */
ok('STEPS carries the found chapter', js.includes("id:'found'"));
ok('paintFound ships', js.includes('function paintFound'));
ok('the actual-evidence marker is emitted from exactly ONE template',
   (js.split('data-gs-evidence="actual"').length - 1) === 1);
ok('stories carry a topic key for the future educational layer',
   js.includes('data-gs-topic'));
ok('walk shots are read for DISPLAY through the signing chokepoint',
   js.includes('signedPhotoMap') && !/wf[\s\S]{0,40}update\(/.test(js));
ok('still writes NO scroll lock', !/style\.overflow/.test(js));
ok('still adds NO document.body observer', !js.includes('.observe(document.body'));
ok('found styles ship (marks, stories, numbers)',
   css.includes('.wf-mark') && css.includes('.wf-story') && css.includes('.wf-num'));

/* ── 2 · the transform: keyed, and behavior-identical for the report ── */
{
  let bcf = null, svc = null;
  try { bcf = new Function('return (' + FN_BCF + ')')(); } catch (e) {}
  try { svc = new Function('return (' + FN_SVC + ')')(); } catch (e) {}
  ok('extracted transforms evaluate', !!bcf && !!svc);
  if (bcf) {
    const cl = { leak: 'Yes', layers: '2 Layers', wind: 'Yes', hail: 'Yes',
      granule: 'Heavy', bio: 'Yes', flash: 'Yes', boot: 'Yes', fluecond: 'Poor',
      attic_deck: 'Stained / Tracked', deckcond: 'Poor', light: 'Yes',
      baffles: 'Blocked', soffit: 'No', ductout: 'No', ventcond: 'Critical — details' };
    const F = bcf(cl);
    ok('all 16 rules fire on the full fixture', F.length === 16, 'n=' + F.length);
    ok('every finding row now carries a stable k',
       F.every(f => typeof f.k === 'string' && f.k.length > 0));
    /* the report consumer's view — area/text/pr — matches 1193 exactly */
    const legacy = F.map(f => [f.area, f.text, f.pr].join('|'));
    const expect0 = 'Interior / roof system|Homeowner reports an active leak at time of inspection.|high';
    ok('report view unchanged: first row byte-identical', legacy[0] === expect0, legacy[0]);
    ok('report view unchanged: severity spread',
       F.filter(f => f.pr === 'high').length === 9 &&
       F.filter(f => f.pr === 'mod').length === 7,
       'high=' + F.filter(f => f.pr === 'high').length + ' mod=' + F.filter(f => f.pr === 'mod').length);
    ok('ventilation rules share one topic key',
       F.filter(f => f.k === 'vent').length === 4);
  }
}

/* ── realm builder ─────────────────────────────────────────── */
function realm(seed) {
  /* seed: 'rich' (checklist + walks + shots + a foreign walk),
           'ckonly' (checklist, no walks) */
  const CK = { structure: 'Single-family residence', method: 'Full inspection',
    attic: 'Accessed', age: '18 years', condition: 'Fair', layers: '1 Layer',
    decking: 'OSB', pitch: '6/12', rooftype: 'Asphalt shingles',
    leak: 'No', wind: 'No', hail: 'Yes', granule: 'Mild', flash: 'Yes',
    boot: 'No', bio: 'No', deckcond: 'Good', attic_deck: 'Good', light: 'No',
    baffles: 'Blocked', soffit: 'Yes', ductout: 'Yes', ventcond: 'Good — balanced',
    fluecond: 'Good', completed_at: '2026-08-30T14:00:00Z',
    meas: { sq: '24.3', pitch: '6/12', ridge: '48' } };
  const calls = [];
  const rows = {
    projects: [{ id: 'p1', name: 'Kim Lawson', stage: 'Approved',
                 address: '12 Oak St', checklist: JSON.stringify(CK) }]
  };
  const shotsByWalk = {
    w1: [
      { id: 's1', path: 'walks/w1/a.jpg', caption: 'The south slope',
        findings: [
          { defect: 'hail_impact', severity: 'crit', label: 'Impact bruising, south slope',
            box: { x: 0.31, y: 0.42, w: 0.18, h: 0.14 } },
          { defect: 'wind_lifted', severity: 'warn', label: '',
            box: { x: 0.6, y: 0.2, w: 0.1, h: 0.1 } }
        ], ai_quality: null, reviewed_at: '2026-08-30', sort_order: 0 },
      { id: 's2', path: 'walks/w1/b.jpg', caption: '',
        findings: [], ai_quality: 'poor', reviewed_at: '2026-08-30', sort_order: 1 }
    ],
    w9: [
      { id: 's9', path: 'walks/w9/z.jpg', caption: 'P2 SECRET GUTTER',
        findings: [{ defect: 'gutter_damage', severity: 'warn', label: 'P2 SECRET',
                     box: { x: 0.1, y: 0.1, w: 0.2, h: 0.2 } }],
        ai_quality: null, reviewed_at: '2026-08-30', sort_order: 0 }
    ]
  };
  const mk = table => {
    const q = { _t: table, _eq: {} };
    for (const m of ['select', 'order', 'limit']) q[m] = () => q;
    q.eq = (k, v) => { q._eq[k] = v; calls.push(table + '.eq:' + k + '=' + v); return q; };
    q.single = () => q; q.maybeSingle = () => q;
    q.then = (res, rej) => {
      let data = [];
      if (table === 'projects') data = rows.projects;
      else if (table === 'walks') {
        /* the DB would answer by the filter — honor it, so an unfiltered
           read would LEAK w9 and the gate would see 'P2 SECRET' */
        if (seed === 'rich') {
          const all = [{ id: 'w1', project_id: 'p1' }, { id: 'w9', project_id: 'p2' }];
          data = ('project_id' in q._eq) ? all.filter(w => w.project_id === q._eq.project_id) : all;
        } else data = [];
      }
      else if (table === 'walk_shots') data = shotsByWalk[q._eq.walk_id] || [];
      else if (table === 'workmanship_pairs') data = seed === 'rich' ? [{ id: 'wp1' }] : [];
      else if (table === 'inspection_reports') data = [];
      else if (table === 'design_renders') data = [];
      return Promise.resolve({ data }).then(res, rej);
    };
    return q;
  };
  const body = js.slice(js.indexOf('>') + 1);
  const dom = new JSDOM('<!doctype html><html><head>' + css + '</style></head><body>' +
    '<div id="cr-show"><button data-tab="work"></button></div>' +
    '<script>' + FN_BCF + '\n' + FN_SVC + '<\/script>' +
    '<script>' + body + '<\/script></body></html>',
    { runScripts: 'dangerously', url: 'https://gs.test/' });
  const w = dom.window;
  Object.defineProperty(w, 'supa', { value: { from: t => mk(t),
    storage: { from: () => ({ createSignedUrls: () => Promise.resolve({ data: [] }),
                              createSignedUrl:  () => Promise.resolve({ data: {} }) }) } },
    writable: false });
  w.patchProjectCk = () => Promise.resolve();
  w.signedPhotoMap = paths => { calls.push('sign:' + paths.length);
    const m = {}; paths.forEach(p => { m[p] = 'https://x/' + p; }); return Promise.resolve(m); };
  const calls2 = calls;
  w.CardinalShowcase = { openForProject: () => calls2.push('ofp'), open(){}, close(){} };
  w.CardinalWhy = { open: () => calls2.push('why.open'), close(){} };
  w.CardinalColors = { open(){}, close(){} };
  w.hideAllViews = () => {};
  return { w, calls };
}
const step = ms => new Promise(r => setTimeout(r, ms || 380));
const INTERNAL = /Theo|scoped to your sign-in|Queue them in the Designer|Publish the estimate/i;
const GRADES = /\b(HIGH|MODERATE|MONITOR|crit|warn|severity|ai_quality|reviewed_at)\b/;

(async () => {

/* ── 3+4 · the RICH realm ──────────────────────────────────── */
{
  const { w, calls } = realm('rich');
  ok('module exported (rich realm)', !!w.CardinalAppointment);
  if (!w.CardinalAppointment) throw new Error('no module — control tree?');
  await w.CardinalAppointment.open();
  await step(480);
  const pane = w.document.getElementById('cr-appt');
  const rail = w.document.getElementById('cr-appt-rail');
  const job = pane.querySelector('.ap-job');
  if (job) job.click(); else ok('a job row exists', false);
  await step(560);
  const chips = rail.querySelectorAll('.ar-step');
  ok('the rail carries twelve stops', chips.length === 12, 'n=' + chips.length);
  ok('Findings is available on a job with evidence',
     !!chips[5] && !chips[5].classList.contains('ar-off'));
  ok('the walks read was scoped to the picked job',
     calls.includes('walks.eq:project_id=p1'), calls.filter(c => c.startsWith('walks')).join(' | '));

  /* walk the discovery to Plans, then Next must land on Findings */
  for (let i = 0; i < 3; i++) {
    const n = pane.querySelector('[data-gs="next"]');
    if (n) n.click(); else ok('Continue exists (stop ' + i + ')', false);
    await step(300);
  }
  ok('reached Plans', !!pane.querySelector('.gs-card[data-k="forever"]'));
  const n2 = pane.querySelector('[data-gs="next"]');
  if (n2) n2.click();
  await step(560);
  const fp = pane.querySelector('[data-gs-pane="found"]');
  ok('Next from Plans lands on WHAT WE FOUND (never straight to a module)',
     !!fp && pane.style.display === 'block' && !calls.includes('ofp'));
  if (fp) {
    ok('the room quiets down: the found pane is NOT on the light canvas',
       !pane.classList.contains('gs-lit'));
    ok('the composed opener', pane.textContent.includes('Let’s look at your roof.'));
    ok('provenance: dated, from THEIR inspection',
       /From your inspection · August 30, 2026/.test(pane.textContent));
    ok('marked as actual evidence', fp.getAttribute('data-gs-evidence') === 'actual');

    /* photographs */
    const shots = pane.querySelectorAll('.wf-shot');
    ok('one photograph card (the unreadable one is not paraded)',
       shots.length === 1, 'n=' + shots.length);
    ok('marks drawn as overlay spans, percent-positioned',
       pane.querySelectorAll('.wf-mark').length === 2 &&
       (pane.querySelector('.wf-mark').getAttribute('style') || '').includes('%'));
    ok('caption prefers the shot caption', pane.textContent.includes('The south slope'));
    ok('the unlabelled finding falls back to words, never the raw key',
       !pane.textContent.includes('wind_lifted'));
    ok('signing went through the chokepoint once',
       calls.filter(c => c.startsWith('sign:')).length === 1);

    /* stories from the checklist, grouped without printed grades */
    const stories = pane.querySelectorAll('.wf-story');
    /* fixture: hail(high) flash(high) baffles(mod) = attention · granule Mild(mon) = watch */
    ok('four checklist stories render', stories.length === 4, 'n=' + stories.length);
    ok('grouped: What deserves attention + Worth keeping an eye on',
       pane.textContent.includes('What deserves attention') &&
       pane.textContent.includes('Worth keeping an eye on'));
    ok('every story carries its topic key',
       [...stories].every(s => (s.getAttribute('data-gs-topic') || '').length > 0));
    ok('a story answers "why it matters" only when brought forward',
       stories[0].getAttribute('aria-expanded') === 'false');
    stories[0].click();
    await step(80);
    ok('tap brings a finding forward (rep control, no autoplay)',
       stories[0].classList.contains('on') && stories[0].getAttribute('aria-expanded') === 'true');

    /* the normal conditions + honesty + numbers */
    ok('Holding up well renders the serviceable list',
       pane.textContent.includes('Holding up well') &&
       pane.textContent.includes('no wind damage'));
    ok('the unreadable photograph is counted honestly',
       pane.textContent.includes('couldn’t be read clearly enough'));
    ok('the numbers render from checklist.meas',
       pane.textContent.includes('24.3') && pane.textContent.includes('squares of covering') &&
       pane.textContent.includes('6/12'));

    /* floors */
    ok('no internal grading words anywhere on the screen',
       !GRADES.test(pane.textContent), (pane.textContent.match(GRADES) || [])[0]);
    ok('no internal voice on the found screen', !INTERNAL.test(pane.textContent));
    ok('no other customer’s evidence can leak in',
       !pane.textContent.includes('P2 SECRET') && !calls.includes('walk_shots.eq:walk_id=w9'));

    /* the photograph opens full screen */
    const ph = pane.querySelector('[data-wf-shot]');
    if (ph) ph.click();
    await step(80);
    ok('a tapped photograph opens the lightbox',
       !!pane.querySelector('[data-slot="wflight"]') &&
       pane.querySelector('[data-slot="wflight"]').classList.contains('on'));
  }
}

/* ── 5 · CHECKLIST-ONLY realm: the OR side of availability ─── */
{
  const { w } = realm('ckonly');
  if (w.CardinalAppointment) {
    await w.CardinalAppointment.open();
    await step(480);
    const pane = w.document.getElementById('cr-appt');
    const rail = w.document.getElementById('cr-appt-rail');
    const job = pane.querySelector('.ap-job');
    if (job) job.click();
    await step(560);
    const chips = rail.querySelectorAll('.ar-step');
    ok('found stays AVAILABLE on checklist alone (no walk)',
       !!chips[5] && !chips[5].classList.contains('ar-off'));
    ok('roof (the Walk) dims when no walk exists',
       !!chips[6] && chips[6].classList.contains('ar-off'));
    if (chips[5]) chips[5].click();
    await step(500);
    ok('checklist-only: stories render, no photo section',
       pane.querySelectorAll('.wf-story').length === 4 &&
       pane.querySelectorAll('.wf-shot').length === 0);
  } else ok('module exported (ckonly realm)', false);
}

/* ── 6 · reload: same production rows, same story ──────────── */
{
  const a = realm('rich'), b = realm('rich');
  const read = async ({ w }) => {
    await w.CardinalAppointment.open();
    await step(420);
    const pane = w.document.getElementById('cr-appt');
    const job = pane.querySelector('.ap-job');
    if (job) job.click();
    await step(520);
    const rail = w.document.getElementById('cr-appt-rail');
    const chips = rail.querySelectorAll('.ar-step');
    if (chips[5]) chips[5].click();
    await step(500);
    return [...pane.querySelectorAll('.wf-story')].map(s =>
      s.getAttribute('data-gs-topic') + ':' + (s.querySelector('.wf-saw') || {}).textContent).join('||');
  };
  if (a.w.CardinalAppointment && b.w.CardinalAppointment) {
    const s1 = await read(a), s2 = await read(b);
    ok('a fresh realm over the same rows paints the same evidence',
       s1.length > 0 && s1 === s2, s1.slice(0, 80) + ' vs ' + s2.slice(0, 80));
  } else ok('reload realms exported', false);
}

  console.log('\n  ' + pass + ' pass, ' + fail + ' fail');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.log('  FAIL  harness crashed -> ' + e.message);
  console.log('\n  ' + pass + ' pass, ' + (fail + 1) + ' fail'); process.exit(1); });

setTimeout(() => { console.log('GATE TIMEOUT'); process.exit(1); }, 45000);
