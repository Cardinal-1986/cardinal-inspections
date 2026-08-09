/* Build 665 — scope history: no applied read is ever lost again.

   first_scope_* is write-once and approved_* is last-write-wins, so before
   this build scope #2-of-4 was unrecoverable. Now every APPLIED read becomes a
   scope_reads row through ONE writer, logScopeRead(), and the claim screen's
   Settle pane shows the trail.

   The capture path is EXECUTED, not asserted about: the shipped
   bridgeSolToClaim and logScopeRead are extracted and driven against a mock
   supa that records the insert — with the applied object keyed by DOTTED
   PATHS, the shape the writer actually receives (the §18 fixture trap: a
   fixture copied from the checklist row reads perfectly and tests nothing).

   Usage: node harness_665.js [index.html]
   Point it at the previous build as the negative control — it must go red. */
const fs = require('fs');

const FILE = process.argv[2] || '/home/user/cardinal-inspections/index.html';
const SQLF = '/home/user/cardinal-inspections/scope_reads.sql';
const SRC = fs.readFileSync(FILE, 'utf8');

let pass = 0, fail = 0;
const ok = (l, c, n) => { if (c) { pass++; console.log('  PASS ' + l); }
  else { fail++; console.log('  FAIL ' + l + (n !== undefined ? '  → ' + n : '')); } };

function fnText(name) {
  const m = SRC.match(new RegExp('(async )?function ' + name + '\\s*\\([^)]*\\)\\s*\\{'));
  if (!m) return null;
  let d = 0, started = false, k = m.index;
  for (; k < SRC.length; k++) {
    if (SRC[k] === '{') { d++; started = true; }
    else if (SRC[k] === '}') { d--; if (started && d === 0) break; }
  }
  return SRC.slice(m.index, k + 1);
}

(async function () {

const BRIDGE = fnText('bridgeSolToClaim');
const LOGFN = fnText('logScopeRead');
ok('bridgeSolToClaim extracted', !!BRIDGE);
ok('logScopeRead exists and was extracted', !!LOGFN);

/* ── a sandbox that runs BOTH shipped functions against a recording supa ── */
function makeSandbox(existingClaim) {
  const seen = { inserts: {}, updates: {}, warns: [] };
  const single = async () => ({ data: { id: 'claim-1' }, error: null });
  const supa = {
    from(t) {
      const chain = {
        select: () => chain, eq: () => chain, order: () => chain,
        limit: async () => ({ data: existingClaim ? [existingClaim] : [], error: null }),
        update(p) { seen.updates[t] = p; return { eq: () => ({ select: () => ({ single }) }),
                                                 then: (f) => f({ error: null }) }; },
        insert(p) { seen.inserts[t] = p;
          const res = { error: null };
          const pr = Promise.resolve(res);
          pr.select = () => ({ single });
          return pr; }
      };
      return chain;
    }
  };
  const sandbox = {
    window: { supa, my_email: () => 'theo@cardinalrenovations.net' },
    localToday: () => '2026-08-09',
    currentProject: null, paintSolLift: () => {},
    alert: (m) => { sandbox.__alerted = m; },
    console: { warn: (...a) => seen.warns.push(a.join(' ')), error: () => {} },
    Number, String, Object, Math, Date, JSON, isNaN,
  };
  /* On the negative control logScopeRead does not exist; `log: (null)` would
     make every call CRASH, and a crash is an absence of information, not a red
     (the 662 lesson). The stub returns a sentinel every money assertion then
     fails on — cleanly. */
  const build = new Function('sandbox',
    'with(sandbox){ return { bridge: (' + BRIDGE + '), log: (' +
    (LOGFN || 'async function(){ return "(no logScopeRead in this build)"; }') + ') }; }');
  return { fns: build(sandbox), seen, sandbox };
}

/* the applied object as the writer RECEIVES it — dotted paths, coerced values */
const GUNN = {
  'carrier': 'Allstate Vehicle and Property Insurance Company',
  'claim_number': '0802889162', 'deductible': 1500,
  'rcv': 22397.63, 'acv': 14164.81, 'coverage_type': 'RCV',
  'ord_law': true, 'ord_law_basis': 'BC-Building Codes',
  'ord_law_rcv': 1887.33, 'ord_law_acv': 1933.72,
  'adjuster.phone': '(330) 636-5816'
};
const EXTRACTED = { carrier: 'Allstate', totals: { rcv: 22397.63, acv: 14164.81 } };
const PR = { id: 'p1', name: 'Adam Gunn', address: '1 Main St' };

console.log('\n── THE BUILD: an applied read becomes a history row ──');
{
  const { fns, seen } = makeSandbox({ id: 'claim-1', first_scope_rcv: 22397.63 });
  const claimId = await fns.bridge(PR, GUNN);
  ok('bridgeSolToClaim now RETURNS the claim id it wrote', claimId === 'claim-1', claimId);
  await fns.log(claimId, PR, 'gunn-scope.pdf', EXTRACTED, GUNN);
  const row = seen.inserts.scope_reads;
  ok('a scope_reads row was inserted', !!row);
  ok('…keyed to the claim the bridge wrote', row && row.claim_id === 'claim-1', row && row.claim_id);
  ok('…and to the project', row && row.project_id === 'p1');
  ok('…named after the document', row && row.doc_name === 'gunn-scope.pdf', row && row.doc_name);
  ok('…carrying the FULL extraction (summary fields, never line items)',
    row && row.extracted && row.extracted.totals.rcv === 22397.63);
  ok('…and the exact ticked subset', row && row.applied &&
    row.applied['adjuster.phone'] === '(330) 636-5816');
  ok('…with the money first-class: 22,397.63 / 14,164.81 / 8,232.82',
    row && row.rcv === 22397.63 && row.acv === 14164.81 && row.depreciation === 8232.82,
    row && [row.rcv, row.acv, row.depreciation].join(' / '));
  ok('…stamped with who applied it', row && row.created_by === 'theo@cardinalrenovations.net');
}

console.log('\n── the trail survives the edges ──');
{
  /* a no-op apply (nothing changed) still returns the id — a read happened */
  const { fns } = makeSandbox({ id: 'claim-1', first_scope_rcv: 1 });
  const id = await fns.bridge(PR, {});
  ok('a no-op apply still hands back the claim id', id === 'claim-1', id);
}
{
  /* the bridge FAILED → claimId undefined → the row still lands, project-keyed */
  const { fns, seen } = makeSandbox(null);
  await fns.log(undefined, PR, 'scope.pdf', EXTRACTED, GUNN);
  const row = seen.inserts.scope_reads;
  ok('a failed bridge still leaves a project-keyed history row',
    row && row.claim_id === null && row.project_id === 'p1',
    row && JSON.stringify([row.claim_id, row.project_id]));
}
{
  /* nothing ticked → nothing logged (an empty apply is not a read applied) */
  const { fns, seen } = makeSandbox(null);
  await fns.log('claim-1', PR, 'x.pdf', EXTRACTED, {});
  ok('an empty apply logs nothing', !seen.inserts.scope_reads);
}
{
  /* the writer is non-blocking BY DESIGN: an insert error warns, never throws */
  const { fns, seen, sandbox } = makeSandbox(null);
  sandbox.window.supa = { from: () => { throw new Error('supabase down'); } };
  let threw = false;
  try { await fns.log('claim-1', PR, 'x.pdf', EXTRACTED, GUNN); } catch (e) { threw = true; }
  ok('a history failure never blocks the apply (warn, not throw)',
    !threw && seen.warns.some(w => /history not recorded/.test(w)),
    JSON.stringify(seen.warns));
}

console.log('\n── one writer, wired where it belongs ──');
{
  /* the read goes through softSelect('scope_reads', …), which passes the table
     name as a VARIABLE into .from() — so a bare from('scope_reads') count of 1
     is the insert alone, and the read has its own spelling. Counting only one
     form would either miss the reader or double-count nothing; this is the
     "print what your extractor captured" rule applied to a coupling check. */
  const direct = (SRC.match(/from\('scope_reads'\)/g) || []).length;
  const inserts = (SRC.match(/from\('scope_reads'\)\.insert/g) || []).length;
  const softs = (SRC.match(/softSelect\('scope_reads'/g) || []).length;
  ok('exactly ONE direct .from touchpoint — the insert inside logScopeRead',
    direct === 1 && inserts === 1, direct + ' direct / ' + inserts + ' insert');
  ok('exactly ONE reader, through softSelect', softs === 1, softs);
  ok('the apply chain calls the writer with the modal\'s own closure values',
    SRC.includes('return logScopeRead(claimId, pr, fileName, extracted, applied);'));
  ok('the writer is exported for future callers (supplements) via Object.assign',
    SRC.includes('{ read: solRead, logRead: logScopeRead }'));
  ok('the three non-callers are named in the source as decisions, not omissions',
    /NOT hooked, on purpose/.test(SRC) && /AccuLynx CLIENT importer/.test(SRC));
}

console.log('\n── the Settle pane shows the trail ──');
{
  ok('paneSettle gains section 4', SRC.includes("sect(4, 'Scope History', '', renderScopeHistory())"));
  const R = fnText('renderScopeHistory');
  ok('renderScopeHistory extracted', !!R);
  if (R) {
    const sandbox = {
      state: { scopeReads: [
        { created_at: '2026-08-09T22:00:00Z', created_by: 'theo@cardinalrenovations.net',
          doc_name: 'gunn-scope.pdf', rcv: 22397.63, acv: 14164.81, depreciation: 8232.82 },
        { created_at: '2026-08-01T10:00:00Z', created_by: null,
          doc_name: 'backfill — first scope on record', rcv: 21000, acv: 13000, depreciation: 8000 },
      ]},
      esc: (s) => String(s == null ? '' : s).replace(/[<>&"]/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'}[c])),
      fmt: (v) => Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      money: (v) => (v === null || v === undefined || v === '') ? '—' : '$' + Number(v).toLocaleString('en-US', { minimumFractionDigits: 2 }),
      fmtDateShort: (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase() : '—',
      String, Number, Date,
    };
    const fn = new Function('sandbox', 'with(sandbox){ return (' + R + '); }')(sandbox);
    const html = fn();
    ok('two rows render with document names', /gunn-scope\.pdf/.test(html) && /backfill/.test(html));
    ok('the money renders', /22,397\.63/.test(html) && /8,232\.82/.test(html));
    ok('who applied it renders (local part only)', /<small[^>]*>theo<\/small>/.test(html), html.slice(0, 300));
    const empty = new Function('sandbox', 'with(sandbox){ return (' + R + '); }')(
      Object.assign({}, sandbox, { state: { scopeReads: [] } }))();
    ok('the empty state is a quiet sentence, not an error', /No scope reads recorded yet/.test(empty));
  }
  ok('the loader is the soft kind — a missing table degrades to an empty list, never a banner',
    SRC.includes("state.scopeReads = await softSelect('scope_reads',"));
  ok('…bounded and newest-first', /scope_reads',\s*\n?\s*q => q\.eq\('claim_id', id\)\.order\('created_at', \{ ascending: false \}\)\.limit\(50\)\)/.test(SRC));
}

console.log('\n── the migration file is the record ──');
{
  let sql = '';
  try { sql = fs.readFileSync(SQLF, 'utf8'); } catch (e) {}
  ok('scope_reads.sql exists at the repo root', !!sql);
  ok('it is idempotent (create if not exists + drop-policy-if-exists)',
    /create table if not exists public\.scope_reads/.test(sql) &&
    (sql.match(/drop policy if exists/g) || []).length === 3);
  ok('the backfill cannot double-insert', /not exists \(select 1 from public\.scope_reads r where r\.claim_id = c\.id\)/.test(sql));
  ok('history is append-only: the file declares NO update policy, and says why',
    !/create policy scope_reads_update/.test(sql) && /append-only by design/.test(sql));
  ok('RLS mirrors insurance_claims (full access / creator / assigned rep)',
    /is_full_access\(\)/.test(sql) && /project_assigned_rep\(p\.checklist\)/.test(sql) &&
    /is_admin\(\)/.test(sql));
}

console.log('\n── what shipped is what the artifact says shipped ──');
{
  ok('the app stamp is at 665 or later',
    (function(){ var m = SRC.match(/data-cr-footer[^>]*>v[\d-]+ build (\d+)/); return m && +m[1] >= 665; })(),
    (SRC.match(/data-cr-footer[^>]*>v[\d-]+ build (\d+)/) || [])[1]);
  ok('the changelog records it', /\{ b:665,/.test(SRC));
}

console.log('\nRESULT: ' + (fail ? 'FAIL' : 'PASS') + '  (' + pass + ' passed, ' + fail + ' failed)');
process.exit(fail ? 1 : 0);
})().catch(e => { console.error('HARNESS CRASHED:', e); process.exit(1); });
