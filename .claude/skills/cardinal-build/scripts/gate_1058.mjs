/* gate_1058.mjs — the digest names overdue chases, and the two policy copies agree.
 *
 * No browser: this is a serverless handler plus a pure-function section, so the
 * gate EXTRACTS the shipped functions and runs them, rather than re-implementing
 * them (a re-implementation validates fiction — this project's own rule).
 *
 *   1  CHASE_POLICY in api/digest.js is IDENTICAL to the one in index.html.
 *      This is the whole reason the gate exists: a serverless function cannot
 *      import from the app, so the rule lives in two places and will drift the
 *      first time someone edits one. Red here means "change the other too".
 *   2  chaseList() picks exactly the claims that are past the mark — measured
 *      against fixtures built from the REAL production row shape.
 *   3  a claim chased recently drops out, which is the point of the clock.
 *   4  an orphan claim (no project) is skipped, not a crash.
 *   5  chaseHtml() renders nothing for an empty list, and names the days over.
 *   6  the admin send guard includes chases.length — without it the section is
 *      built and binned on a quiet day.
 *
 * Run:  node gate_1058.mjs <api/digest.js> [--app <index.html>] [--control <prev digest.js>]
 */
import { readFileSync, existsSync } from 'fs';

const args = process.argv.slice(2);
/* suite-runnable: default to this gate's OWN artifact — it gates api/digest.js,
   not index.html; the runner's index.html fallback made it declare
   rig-fault on the wrong file. A positional arg still wins. */
const FILE = (args[0] && !args[0].startsWith('--')) ? args[0]
  : new URL('../../../../api/digest.js', import.meta.url).pathname;
const ai = args.indexOf('--app');
const APP = ai >= 0 ? args[ai + 1] : '/home/user/cardinal-inspections/index.html';
const ci = args.indexOf('--control');
const CONTROL = ci >= 0 ? args[ci + 1] : null;
if (!FILE || !existsSync(FILE)) { console.error('usage: node gate_1058.mjs <api/digest.js> [--app <index.html>] [--control <prev>]'); process.exit(2); }

/* pull `{ 'supplement filed': { first: 14, again: 7 }, ... }` out of either
   file, tolerant of the JS/quoting differences between them */
function policyOf(text, label) {
  /* ⚠ ANCHOR ON THE DECLARATION, not the bare name. The first version used
     indexOf('CHASE_POLICY'), which in api/digest.js finds the HEADER COMMENT
     that says "its CHASE_POLICY is a MIRROR of the one in index.html" — so it
     started scanning from prose and parsed todayLocal() instead. That is this
     project's comment-pollution trap, committed inside the gate written to
     catch drift. The error message printed what it had captured, which is the
     only reason it was obvious. */
  const decl = /(?:const|var|let)\s+CHASE_POLICY\s*=/.exec(text);
  if (!decl) return { err: `no CHASE_POLICY declaration in ${label}` };
  const i = decl.index;
  const open = text.indexOf('{', i);
  const close = text.indexOf('}', text.indexOf('}', open) + 1);   /* second } closes the outer */
  const blob = text.slice(open, close + 1);
  const out = {};
  const re = /['"]([^'"]+)['"]\s*:\s*\{\s*first\s*:\s*(\d+)\s*,\s*again\s*:\s*(\d+)\s*\}/g;
  let m;
  while ((m = re.exec(blob))) out[m[1]] = { first: +m[2], again: +m[3] };
  if (!Object.keys(out).length) return { err: `CHASE_POLICY in ${label} parsed to nothing — ${JSON.stringify(blob.slice(0,90))}` };
  return { policy: out };
}

/* run the SHIPPED chase functions out of the digest source */
function harness(text) {
  const a = (/(?:const|var|let)\s+CHASE_POLICY\s*=/.exec(text) || { index: -1 }).index;
  const b = text.indexOf('// 784: the estimates');
  if (a < 0 || b < 0 || b < a) return null;
  const body = text.slice(a, b);
  const pre = `
    function daysSince(iso){ if(!iso) return 0; const t=Date.parse(iso);
      if(!isFinite(t)) return 0; return Math.floor((Date.now()-t)/86400000); }
    function esc(s){ return String(s==null?'':s).replace(/[<>&"]/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'}[c])); }
    function money(n){ return '$' + Math.round(Number(n)||0).toLocaleString('en-US'); }
  `;
  return new Function(pre + body + '\n return { chaseList, chaseHtml, chaseDue, CHASE_POLICY };')();
}

const ago = d => new Date(Date.now() - d * 86400000).toISOString();
/* fixtures in the REAL production shape: insurance_claims with `projects`
   embedded, checklist as the TEXT column it actually is */
const CLAIMS = [
  { id:'c1', carrier:'Allstate', supplement_status:'filed', supplement_filed:4200,
    supplement_filed_at: ago(20), last_chased_at:null,
    projects:{ id:'p1', name:'Renfrew', stage:'Prospect', checklist:'{}', updated_at:ago(20) } },
  { id:'c2', carrier:'State Farm', supplement_status:'filed', supplement_filed:9100,
    supplement_filed_at: ago(40), last_chased_at: ago(2),
    projects:{ id:'p2', name:'Alvarez', stage:'Prospect', checklist:'{}', updated_at:ago(40) } },
  { id:'c3', carrier:'Erie', supplement_status:'none', supplement_filed:0,
    supplement_filed_at:null, last_chased_at:null,
    approved_depreciation:6000, supplement_approved:0,
    projects:{ id:'p3', name:'Boyd', stage:'Invoiced',
               checklist: JSON.stringify({ stage_since: ago(25) }), updated_at:ago(25) } },
  { id:'c4', carrier:'Nationwide', supplement_status:'filed', supplement_filed:500,
    supplement_filed_at: ago(3), last_chased_at:null,
    projects:{ id:'p4', name:'Fresh', stage:'Prospect', checklist:'{}', updated_at:ago(3) } },
  /* the orphans that really exist in production — 3 of the 5 rows */
  { id:'c5', carrier:null, supplement_status:'none', supplement_filed:0,
    supplement_filed_at:null, last_chased_at:null, projects:null },
];

function judge(file) {
  const f = [];
  const text = readFileSync(file, 'utf8');

  /* 1 — the two copies agree */
  const mine = policyOf(text, 'api/digest.js');
  if (mine.err) f.push(mine.err);
  if (existsSync(APP)) {
    const theirs = policyOf(readFileSync(APP, 'utf8'), 'index.html');
    if (theirs.err) f.push(theirs.err);
    if (mine.policy && theirs.policy) {
      /* ⚠ NOT JSON.stringify(p, Object.keys(p).sort()). The second argument to
         stringify is a REPLACER, and an array replacer is a property ALLOWLIST
         applied at EVERY level — so the nested {first, again} were filtered
         out of both sides and every comparison read
         {"awaiting release":{},"supplement filed":{}} === the same. The drift
         check could never fire, in the gate whose only job is that check.
         Caught by feeding it a deliberately drifted tree, which is the only
         reason it was ever going to be caught. */
      const stable = p => JSON.stringify(Object.keys(p).sort()
        .map(k => [k, p[k].first, p[k].again]));
      const A = stable(mine.policy);
      const B = stable(theirs.policy);
      if (A !== B)
        f.push(`CHASE_POLICY DRIFT — api/digest.js says ${JSON.stringify(mine.policy)} and index.html says ${JSON.stringify(theirs.policy)}. Change one, change the other.`);
    }
  } else f.push(`index.html not found at ${APP} — the drift check proved nothing`);

  const H = harness(text);
  if (!H) { f.push('could not extract the chase functions from the digest (rig fault — proves nothing)'); return f; }

  /* 2+3+4 — who is picked */
  let list;
  try { list = H.chaseList(CLAIMS); }
  catch (e) { f.push(`chaseList threw on production-shaped rows: ${e.message}`); return f; }
  const names = list.map(x => x.name);
  if (!names.includes('Renfrew')) f.push('Renfrew is 20 days on a 14-day policy and was not picked');
  if (!names.includes('Boyd'))    f.push('Boyd is 25 days awaiting release on a 21-day policy and was not picked');
  if (names.includes('Alvarez'))  f.push('Alvarez is 40 days old but was chased 2 days ago — it must NOT be nudged');
  if (names.includes('Fresh'))    f.push('Fresh is 3 days old and well inside the policy — it must NOT be nudged');
  if (list.length !== 2) f.push(`chaseList picked ${list.length} claims (${names.join(', ') || 'none'}), expected exactly Renfrew and Boyd`);
  /* sorted by how overdue */
  if (names[0] && names[0] !== 'Renfrew') f.push(`sorted ${names.join(' > ')} — Renfrew (+6) must lead Boyd (+4)`);

  /* 5 — the rendering */
  if (H.chaseHtml([]) !== '') f.push('chaseHtml renders markup for an empty list — a quiet day would show an empty table');
  const html = H.chaseHtml(list);
  if (!/Carriers to chase/.test(html)) f.push('the section has no heading');
  if (!/6d/.test(html)) f.push('the section does not show how many days over the mark Renfrew is');
  if (!/never chased/.test(html)) f.push('the section does not distinguish a claim nobody has ever chased');
  if (/undefined|NaN/.test(html)) f.push(`the section rendered undefined/NaN: ${html.slice(0, 160)}`);

  /* 6 — the send guard */
  if (!/\|\|\s*chases\.length\)/.test(text))
    f.push('the admin send guard does not include chases.length — on a day with no appointments and no reminders the section is built and thrown away');
  if (!/chaseHtml\(chases\)/.test(text))
    f.push('chaseHtml(chases) is never placed into the admin email');

  return f;
}

const fails = judge(FILE);
if (fails.length) {
  console.log(`GATE 1058 RED — ${fails.length} failure(s)`);
  fails.forEach(x => console.log('    ' + x));
} else {
  console.log('GATE 1058 GREEN — policies agree, only overdue claims are named, a recent chase silences one, the guard lets it send');
}
if (CONTROL && existsSync(CONTROL)) {
  const c = judge(CONTROL);
  console.log(`CONTROL (${CONTROL.split('/').pop()}): ${c.length} named failure(s) — ${c.length ? 'RED as expected' : '*** GREEN, THIS GATE PROVES NOTHING ***'}`);
  c.slice(0, 20).forEach(x => console.log('    control-fail ' + x));
  if (!c.length) process.exit(1);
}
process.exit(fails.length ? 1 : 0);
