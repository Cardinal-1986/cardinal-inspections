/* gate_1196 — the homeowner-language layer over inspection findings.
 *
 *  1. THE RECORD IS UNTOUCHED: the shipped buildChecklistFindings still
 *     produces the identical report view (area/text/pr) — proved by
 *     executing it — and now every row carries a UNIQUE per-rule id.
 *  2. COVERAGE IS A FLOOR: every rule id the transform can emit has a
 *     WF_TALK translation (a new rule without one goes RED here, so the
 *     fallback path is a designed state, never an accident).
 *  3. THE FALLBACK EXISTS: a rule without a translation renders its
 *     recorded text (source-asserted — the layer can never blank a finding).
 *  4. CERTAINTY VOCABULARY FLOOR: no urgency/closing words anywhere in the
 *     translation map.
 *  5. RENDER: the story card leads with the homeowner title and the
 *     translated line; the report prose for a translated rule does NOT
 *     appear on the homeowner screen; education still appears on tap;
 *     data-gs-topic and data-gs-evidence survive.
 *
 * Negative control: argv[2] = the 1195 (or 1194) artifact — RED, reporting.
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
/* the object literal for `var NAME = {...};` inside the module */
function extractObj(source, name) {
  const hv = source.indexOf('var ' + name + ' = {');
  if (hv < 0) return '';
  const open = source.indexOf('{', hv);
  let d = 0;
  for (let i = open; i < source.length; i++) {
    if (source[i] === '{') d++;
    else if (source[i] === '}') { d--; if (!d) return source.slice(open, i + 1); }
  }
  return '';
}
const FN_BCF = extractFn('buildChecklistFindings');
const TALK_SRC = extractObj(js, 'WF_TALK');
const TOPICS_SRC = extractObj(js, 'WF_TOPICS');
ok('transform extracted', FN_BCF.length > 200);
ok('WF_TALK ships', TALK_SRC.length > 200);
ok('WF_TOPICS ships', TOPICS_SRC.length > 200);

/* ── 1 · the record is untouched; ids are per-rule and unique ─────────── */
let RULE_IDS = [];
{
  let bcf = null;
  try { bcf = new Function('return (' + FN_BCF + ')')(); } catch (e) {}
  ok('transform evaluates', !!bcf);
  if (bcf) {
    const full = { leak: 'Yes', layers: '2 Layers', wind: 'Yes', hail: 'Yes',
      granule: 'Heavy', bio: 'Yes', flash: 'Yes', boot: 'Yes', fluecond: 'Poor',
      attic_deck: 'Stained / Tracked', deckcond: 'Poor', light: 'Yes',
      baffles: 'Blocked', soffit: 'No', ductout: 'No', ventcond: 'Critical — details' };
    const F = bcf(full);
    ok('report view unchanged: 16 rules fire, first row byte-identical',
       F.length === 16 &&
       [F[0].area, F[0].text, F[0].pr].join('|') ===
       'Interior / roof system|Homeowner reports an active leak at time of inspection.|high');
    ok('report view unchanged: severity spread 9 high / 7 mod',
       F.filter(f => f.pr === 'high').length === 9 && F.filter(f => f.pr === 'mod').length === 7);
    ok('every row carries a per-rule id, and ids are unique',
       F.every(f => typeof f.id === 'string' && f.id.length > 0) &&
       new Set(F.map(f => f.id)).size === F.length);
    ok('topics still group rules (vent spans four ids)',
       F.filter(f => f.k === 'vent').length === 4 &&
       new Set(F.filter(f => f.k === 'vent').map(f => f.id)).size === 4);
    /* enumerate ALL rule ids by driving every branch */
    const drives = [
      { leak: 'Yes' }, { layers: '3+ Layers (Code Violation)' }, { layers: '2 Layers' },
      { wind: 'Yes' }, { hail: 'Yes' }, { granule: 'Critical' }, { granule: 'Heavy' },
      { granule: 'Mild' }, { bio: 'Yes' }, { flash: 'Yes' }, { boot: 'Yes' },
      { fluecond: 'Poor' }, { attic_deck: 'Active Rot / Mold' }, { attic_deck: 'Stained / Tracked' },
      { deckcond: 'Poor' }, { light: 'Yes' }, { baffles: 'Blocked' }, { soffit: 'No' },
      { ductout: 'No' }, { ventcond: 'Critical' }, { ventcond: 'Poor' }
    ];
    const ids = new Set();
    drives.forEach(d => bcf(d).forEach(f => ids.add(f.id)));
    RULE_IDS = [...ids];
    ok('the transform can emit exactly 21 distinct rules', RULE_IDS.length === 21,
       'n=' + RULE_IDS.length + ' [' + RULE_IDS.join(',') + ']');
  }
}

/* ── 2 · coverage floor + 3 · fallback + 4 · vocabulary floor ─────────── */
{
  let talk = null;
  try { talk = new Function('return (' + TALK_SRC + ')')(); } catch (e) {}
  ok('WF_TALK evaluates', !!talk);
  if (talk && RULE_IDS.length) {
    const missing = RULE_IDS.filter(id => !(id in talk) || !talk[id]);
    ok('every rule the transform can emit has a translation (21/21)',
       missing.length === 0, 'missing: ' + missing.join(','));
    const orphans = Object.keys(talk).filter(id => !RULE_IDS.includes(id));
    ok('no orphan translations (a renamed rule would strand one)',
       orphans.length === 0, 'orphans: ' + orphans.join(','));
  }
  ok('the fallback to the recorded text ships', js.includes('WF_TALK[f.id] || f.text'));
  const BANNED = /urgent|immediat|dangerous|act now|as soon as possible|before it|don’t wait|could collapse|failure is|you need to/i;
  ok('no urgency/closing vocabulary anywhere in the translation map',
     !BANNED.test(TALK_SRC), (TALK_SRC.match(BANNED) || [])[0]);
  ok('no urgency/closing vocabulary in the topic map', !BANNED.test(TOPICS_SRC),
     (TOPICS_SRC.match(BANNED) || [])[0]);
}

/* ── 5 · render: the homeowner layer speaks; the record stays in the file ─ */
function realm() {
  const CK = { structure: 'S', method: 'M', attic: 'A', age: '18', condition: 'F',
    layers: '1 Layer', decking: 'OSB', pitch: '6/12', rooftype: 'Asphalt',
    hail: 'Yes', granule: 'Mild', baffles: 'Blocked',
    completed_at: '2026-08-30T14:00:00Z' };
  const rows = [{ id: 'p1', name: 'Kim Lawson', stage: 'Approved',
                  address: '12 Oak St', checklist: JSON.stringify(CK) }];
  const mk = table => {
    const q = { _eq: {} };
    for (const m of ['select', 'order', 'limit']) q[m] = () => q;
    q.eq = (k, v) => { q._eq[k] = v; return q; };
    q.single = () => q; q.maybeSingle = () => q;
    q.then = res => {
      let data = [];
      if (table === 'projects') data = rows;
      return Promise.resolve({ data }).then(res);
    };
    return q;
  };
  const body = js.slice(js.indexOf('>') + 1);
  const dom = new JSDOM('<!doctype html><html><head>' + css + '</style></head><body>' +
    '<div id="cr-show"><button data-tab="work"></button></div>' +
    '<script>' + FN_BCF + '\n' + extractFn('buildServiceableList') + '<\/script>' +
    '<script>' + body + '<\/script></body></html>',
    { runScripts: 'dangerously', url: 'https://gs.test/' });
  const w = dom.window;
  Object.defineProperty(w, 'supa', { value: { from: t => mk(t),
    storage: { from: () => ({ createSignedUrls: () => Promise.resolve({ data: [] }),
                              createSignedUrl:  () => Promise.resolve({ data: {} }) }) } },
    writable: false });
  w.patchProjectCk = () => Promise.resolve();
  w.CardinalShowcase = { openForProject(){}, open(){}, close(){} };
  w.CardinalWhy = { open(){}, close(){} };
  w.CardinalColors = { open(){}, close(){} };
  w.hideAllViews = () => {};
  return w;
}
const step = ms => new Promise(r => setTimeout(r, ms || 380));

(async () => {
{
  const w = realm();
  ok('module exported', !!w.CardinalAppointment);
  if (!w.CardinalAppointment) throw new Error('no module — control tree?');
  await w.CardinalAppointment.open();
  await step(480);
  const pane = w.document.getElementById('cr-appt');
  const rail = w.document.getElementById('cr-appt-rail');
  const job = pane.querySelector('.ap-job');
  if (job) job.click(); else ok('a job row exists', false);
  await step(560);
  const chips = rail.querySelectorAll('.ar-step');
  if (chips[5]) chips[5].click(); else ok('found chip exists', false);
  await step(520);
  const stories = [...pane.querySelectorAll('.wf-story')];
  ok('three stories render (hail, baffles, granule-mild)', stories.length === 3,
     'n=' + stories.length);
  const text = pane.textContent;
  ok('the eyebrow is the homeowner TITLE, not the report area',
     text.includes('Hail impact') && text.includes('How your attic breathes') &&
     text.includes('Surface wear'));
  ok('the line is the TRANSLATION, certainty intact',
     text.includes('We found hail impact — pockmarks, bruising, or fractures in the shingle surface.') &&
     text.includes('We found early wear in the protective granule surface.'));
  ok('the report prose for a translated rule stays OFF the homeowner screen',
     !text.includes('Hail impact observed') && !text.includes('Mild granule loss observed') &&
     !text.includes('Soffit intake baffles physically blocked'));
  ok('report AREA headings stay off too', !text.includes('Roof covering'));
  if (stories[0]) {
    stories[0].click();
    await step(80);
    ok('education still arrives on tap',
       stories[0].classList.contains('on') &&
       /bruises the reinforcing mat/.test(stories[0].textContent));
  } else ok('a story exists to tap', false);
  ok('topic keys survive for the future educational layer',
     stories.length === 3 && stories.every(s => (s.getAttribute('data-gs-topic') || '').length > 0));
  const fp = pane.querySelector('[data-gs-pane="found"]');
  ok('still marked as ACTUAL evidence', !!fp && fp.getAttribute('data-gs-evidence') === 'actual');
  ok('still no internal grading words',
     !/\b(HIGH|MODERATE|MONITOR|crit|warn|severity|ai_quality)\b/.test(text),
     (text.match(/\b(HIGH|MODERATE|MONITOR|crit|warn|severity|ai_quality)\b/) || [])[0]);
}
  console.log('\n  ' + pass + ' pass, ' + fail + ' fail');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.log('  FAIL  harness crashed -> ' + e.message);
  console.log('\n  ' + pass + ' pass, ' + (fail + 1) + ' fail'); process.exit(1); });

setTimeout(() => { console.log('GATE TIMEOUT'); process.exit(1); }, 45000);
