/* Build 664 — an applied scope reaches the CLAIM, not just the profile.

   Theo applied Adam Gunn's scope. The client profile got everything. The
   insurance_claims row got NULL for ord_law, ord_law_basis, ord_law_rcv,
   ord_law_acv, ord_law_limit and never received coverage_type — the entire
   product of builds 655, 658 and 660.

   `bridgeSolToClaim()` copies through an ALLOW-LIST (`CLAIM_COL`) written at
   646. An unknown key is not an error there; it is simply not copied. So three
   later builds added fields to the review modal and nothing anywhere went red.

   Two kinds of assertion here, and the second is the one that matters:
     1. the shipped function is EXECUTED against Gunn's real applied object,
        and the patch it sends to Supabase is inspected column by column;
     2. the modal's field list and the writer's map are extracted from the
        SOURCE and checked against each other, so the NEXT field added to one
        and forgotten in the other fails here instead of in production.

   Usage: node harness_664.js [index.html]
   Point it at the previous build as the negative control — it must go red. */
const fs = require('fs');

const FILE = process.argv[2] || '/home/user/cardinal-inspections/index.html';
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
ok('bridgeSolToClaim extracted from the artifact', !!BRIDGE, BRIDGE ? BRIDGE.length : 0);

/* ── run the SHIPPED function and capture what it sends ─────────────────── */
function runBridge(applied, existingClaim) {
  const sent = { update: null, insert: null, table: null, id: null };
  const single = async () => ({ data: { id: 'claim-1' }, error: null });
  const supa = {
    from(t) {
      sent.table = t;
      const chain = {
        select: () => chain, eq: () => chain, limit: async () => ({
          data: existingClaim ? [existingClaim] : [], error: null }),
        update(p) { sent.update = p; return { eq: () => ({ select: () => ({ single }) }),
                                              then: (f) => f({ error: null }) }; },
        insert(p) { sent.insert = p; return { select: () => ({ single }) }; }
      };
      return chain;
    }
  };
  const sandbox = {
    window: { supa, my_email: () => 'theo@cardinalrenovations.net' },
    localToday: () => '2026-08-09',
    currentProject: null,
    paintSolLift: () => {},
    alert: (m) => { sandbox.__alerted = m; },
    console: { warn: () => {}, error: () => {} },
    Number, String, Object, Math, Date, JSON, isNaN
  };
  const fn = new Function('sandbox', 'with(sandbox){ return (' + BRIDGE + '); }')(sandbox);
  return fn({ id: 'p1', name: 'Adam Gunn', address: '1 Main St' }, applied)
    .then(() => ({ sent, sandbox }));
}

/* The object Theo actually approved — in the shape bridgeSolToClaim RECEIVES.
   ⚠ This is NOT the shape the checklist ends up holding. `applied[path] = val`
   is keyed by the modal's DOTTED PATH ('adjuster.phone'); the nested
   `{adjuster:{phone}}` form is built separately for the checklist afterwards.
   A fixture copied from the checklist row reads perfectly and silently tests
   nothing about the adjuster — this harness did exactly that on its first run
   and reported a false red on correct code. Values are strings except the
   paths openSolReviewModal coerces: deductible / rcv / acv / ord_law_* to
   numbers, ord_law to a boolean, coverage_type upper-cased. */
const GUNN = {
  'carrier': 'Allstate Vehicle and Property Insurance Company',
  'policy_number': '000826751113', 'claim_number': '0802889162',
  'date_of_loss': '2025-07-23', 'deductible': 1500,
  'rcv': 22397.63, 'acv': 14164.81, 'coverage_type': 'RCV',
  'ord_law': true, 'ord_law_basis': 'BC-Building Codes',
  'ord_law_rcv': 1887.33, 'ord_law_acv': 1933.72,
  'adjuster.name': 'Shawn Feistamel', 'adjuster.company': 'National Catastrophe Team',
  'adjuster.phone': '(330) 636-5816', 'adjuster.email': 'claims@claims.allstate.com'
};

console.log('\n── THE BUG: Gunn\'s approved scope, run through the shipped writer ──');
{
  const { sent } = await runBridge(GUNN, { id: 'claim-1', first_scope_rcv: 22397.63 });
  const p = sent.update || {};
  ok('it wrote to insurance_claims', sent.table === 'insurance_claims', sent.table);
  /* the five that were NULL on his live row */
  ok('ord_law reaches the claim', p.ord_law === true, JSON.stringify(p.ord_law));
  ok('ord_law_basis reaches the claim', p.ord_law_basis === 'BC-Building Codes', p.ord_law_basis);
  ok('ord_law_rcv reaches the claim', p.ord_law_rcv === 1887.33, p.ord_law_rcv);
  ok('ord_law_acv reaches the claim', p.ord_law_acv === 1933.72, p.ord_law_acv);
  ok('coverage_type reaches the claim', p.coverage_type === 'RCV', p.coverage_type);
  /* and nothing that already worked stopped working */
  ok('the money still copies', p.approved_rcv === 22397.63 && p.approved_acv === 14164.81 &&
    p.approved_depreciation === 8232.82, JSON.stringify([p.approved_rcv, p.approved_acv, p.approved_depreciation]));
  ok('the adjuster still copies, phone included',
    p.adjuster_phone === '(330) 636-5816' && p.adjuster_email === 'claims@claims.allstate.com',
    p.adjuster_phone);
  ok('date_of_loss still passes its YYYY-MM-DD guard', p.date_of_loss === '2025-07-23', p.date_of_loss);
  ok('first_scope_* is NOT overwritten when a baseline exists',
    p.first_scope_rcv === undefined, p.first_scope_rcv);
}

console.log('\n── 658\'s tri-state survives the copy ──');
{
  const no = await runBridge(Object.assign({}, GUNN, { ord_law: false, ord_law_basis: null }),
    { id: 'claim-1' });
  ok('a deliberate No is still recordable as false',
    no.sent.update.ord_law === false, JSON.stringify(no.sent.update.ord_law));
  const unknown = await runBridge(Object.assign({}, GUNN, { ord_law: null }), { id: 'claim-1' });
  ok('an absence writes NOTHING rather than asserting a negative',
    !('ord_law' in unknown.sent.update), JSON.stringify(unknown.sent.update.ord_law));
  ok('…which is the whole of 658 — absence must never become "No"',
    unknown.sent.update.ord_law !== false);
}

console.log('\n── a brand-new claim carries them too, not just an update ──');
{
  const { sent } = await runBridge(GUNN, null);
  const p = sent.insert || {};
  ok('the INSERT path carries the O&L columns as well',
    p.ord_law === true && p.ord_law_basis === 'BC-Building Codes' &&
    p.ord_law_rcv === 1887.33 && p.ord_law_acv === 1933.72, JSON.stringify({
      a: p.ord_law, b: p.ord_law_basis, c: p.ord_law_rcv, d: p.ord_law_acv }));
  ok('…and sets the baseline on a first scope',
    p.first_scope_rcv === 22397.63 && p.first_scope_acv === 14164.81, p.first_scope_rcv);
}

console.log('\n── THE DURABLE PART: the two lists cannot drift again ──');
{
  /* every path offered in the review modal … */
  const fBlock = SRC.slice(SRC.indexOf('var fields = ['));
  const fList = fBlock.slice(0, fBlock.indexOf('\n  ];'));
  const paths = [...fList.matchAll(/^\s*\['[^']*',\s*'([^']+)'/gm)].map(m => m[1]);
  ok('the modal\'s field list was extracted', paths.length >= 15, paths.length + ': ' + paths.join(' '));

  /* … has a home in the writer's map, or is one of three special cases */
  const mBlock = SRC.slice(SRC.indexOf('var CLAIM_COL = {'));
  const mList = mBlock.slice(0, mBlock.indexOf('\n  };'));
  const mapped = [...mList.matchAll(/'([^']+)':\s*'([^']+)'/g)].map(m => m[1]);
  ok('the writer\'s column map was extracted', mapped.length >= 14, mapped.length + ': ' + mapped.join(' '));

  /* the ONLY paths allowed to be absent from CLAIM_COL, each for a stated
     reason in the source: they are handled by hand just below it. */
  const SPECIAL = ['date_of_loss', 'rcv', 'acv'];
  const orphans = paths.filter(p => mapped.indexOf(p) === -1 && SPECIAL.indexOf(p) === -1);
  ok('NO field in the modal is missing from the claim writer', orphans.length === 0,
    'orphaned: ' + orphans.join(', '));
  const ghosts = mapped.filter(m => paths.indexOf(m) === -1);
  ok('…and the writer maps nothing the modal never offers', ghosts.length === 0,
    'ghosts: ' + ghosts.join(', '));
  ok('the coupling is stated at BOTH ends, so it is found from either side',
    /ADDING A ROW HERE IS HALF THE JOB/.test(SRC) &&
    /THIS MAP AND THE REVIEW MODAL'S `fields` LIST GROW TOGETHER/.test(SRC));
}

console.log('\n── what shipped is what the artifact says shipped ──');
{
  ok('the app stamp is at 664 or later',
    (function(){ var m = SRC.match(/data-cr-footer[^>]*>v[\d-]+ build (\d+)/); return m && +m[1] >= 664; })(),
    (SRC.match(/data-cr-footer[^>]*>v[\d-]+ build (\d+)/) || [])[1]);
  ok('the changelog records it', /\{ b:664,/.test(SRC));
}

console.log('\nRESULT: ' + (fail ? 'FAIL' : 'PASS') + '  (' + pass + ' passed, ' + fail + ' failed)');
process.exit(fail ? 1 : 0);
})().catch(e => { console.error('HARNESS CRASHED:', e); process.exit(1); });
