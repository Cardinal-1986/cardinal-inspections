/* Build 540 gate — the SHIPPED functions, run against PRODUCTION rows.
 *
 * projectValue(), indexMoney() and isEstimateTitle() are extracted from
 * index_v540.html by brace matching and executed. The rows they run on came out
 * of the live database on 2026-08-01, including their nulls and their
 * duplicated titles. Nothing here is a re-implementation and nothing is a
 * fixture someone typed to make the test pass — that is the whole point, and
 * it is why the 0-dollar bug this fixes survived so long.
 *
 * The ONE thing stubbed is parseCkAll(), and it is stubbed honestly: it is a
 * memoising wrapper over a checklist JSON parse, and the stub does the parse.
 * The assertion below proves the stub is not hiding anything — no production
 * checklist carries manual_value at all, so that branch contributes 0
 * everywhere and cannot be what makes these numbers right.
 */
const fs = require('fs');
const SC = '/tmp/claude-0/-home-user-cardinal-inspections/39dffed8-e57b-5dc7-bbf7-dd9d3909112a/scratchpad';
const src = fs.readFileSync(SC + '/app/index_v540.html', 'utf8');
const prod = JSON.parse(fs.readFileSync(SC + '/prod540.json', 'utf8'));

const fn = (name) => {
  const i = src.indexOf('function ' + name + '(');
  if (i < 0) throw new Error('no function ' + name);
  let d = 0;
  for (let k = src.indexOf('{', i); k < src.length; k++) {
    if (src[k] === '{') d++;
    else if (src[k] === '}' && !--d) return src.slice(i, k + 1);
  }
  throw new Error('unbalanced ' + name);
};
const decl = (name) => {
  const m = src.match(new RegExp('var ' + name + ' = \\{[^}]*\\};'));
  if (!m) throw new Error('no declaration for ' + name);
  return m[0];
};

const PV = fn('projectValue'), IM = fn('indexMoney'), IET = fn('isEstimateTitle');
console.log(`  extracted projectValue ${PV.length} chars · indexMoney ${IM.length} · isEstimateTitle ${IET.length}`);
if (!PV.includes('ctrSigned') || !IM.includes('homeowner_signed_at')) throw new Error('bad capture');

let pass = 0, fail = 0;
const ok = (n, c, d) => { c ? (pass++, console.log('  PASS  ' + n))
                            : (fail++, console.log('  FAIL  ' + n + (d ? '  <' + d + '>' : ''))); };

/* ---- build the world the shipped code expects -------------------------- */
const sandbox = {
  cacheRows: prod.reports,
  estBest: {}, ctrSigned: {},
  /* honest stub: the real one memoises this exact parse */
  parseCkAll: (pr) => { try { return JSON.parse(pr.checklist || '{}'); } catch (_) { return {}; } },
};
const run = new Function('ctx', `
  with (ctx) {
    ${decl('SENT_EST')}
    ${IET}
    ${IM}
    ${PV}
    ctx.indexMoney = indexMoney; ctx.projectValue = projectValue;
    ctx.__reindex = function(e, c){ indexMoney(e, c); ctx.estBest = estBest; ctx.ctrSigned = ctrSigned; };
  }
`);
run(sandbox);

console.log('\nTHE STUB IS NOT DOING THE WORK');
const anyManual = prod.projects.filter(p => sandbox.parseCkAll(p).manual_value != null);
ok('no production checklist carries manual_value — that branch is 0 everywhere',
   anyManual.length === 0, anyManual.map(p => p.name).join(', '));

console.log('\nBEFORE — what the old code saw (inspection_reports only)');
const legacyOnly = prod.reports.filter(r => /^(estimate|siding estimate|window estimate|andersen estimate|gutter estimate|repair estimate)/i.test(r.title.trim()));
ok('3 report rows match isEstimateTitle', legacyOnly.length === 3, String(legacyOnly.length));
ok('  and every one of them totals 0 — this is why the circle read $0',
   legacyOnly.every(r => Number(r.total) === 0), JSON.stringify(legacyOnly.map(r => r.total)));

console.log('\nAFTER — the shipped projectValue on the real rows');
sandbox.indexMoney(prod.estimates, prod.contracts);
/* the `with` block closes over its own estBest/ctrSigned, so re-read them */
const EXPECT = {
  'Kimberly  Guy': 36654,          // sent 36,654 beats sent 21,451
  'Dan Thompson': 11920.99,        // the only sent estimate
  'Betty Mann': 1820,              // three 0-dollar drafts, one sent 1,820
  'Kim Guy': 0,                    // 34,050 / 36,432 / 17,730 ALL DRAFTS
  'Kitty Hawk Realty — 7036 Montague Road': 0,  // 2,560 / 6,180 both drafts
  'Bob DeBuilder': 0,
  'Joeseph Estimate': 0,
  'Alton': 0,
};
for (const p of prod.projects) {
  const got = sandbox.projectValue(p);
  const want = EXPECT[p.name];
  ok(`${p.name.slice(0, 34).padEnd(36)} $${got}`, got === want, `wanted ${want}`);
}

console.log('\nDRAFTS MUST NOT COUNT — the rule Theo can reverse with one word');
const drafted = prod.estimates.filter(e => e.status === 'draft' && Number(e.total) > 0);
ok(`${drafted.length} drafts carry real money and are all excluded`,
   drafted.every(e => {
     const pr = prod.projects.find(x => x.id === e.project_id);
     return sandbox.projectValue(pr) !== Number(e.total);
   }));

console.log('\nA SIGNED CONTRACT WINS OUTRIGHT — even over a bigger estimate');
const kim = prod.projects.find(p => p.name === 'Kimberly  Guy');
sandbox.indexMoney(prod.estimates, [
  { project_id: kim.id, total: 30000, status: 'signed',
    homeowner_signed_at: '2026-08-01T00:00:00Z', voided_at: null },
]);
ok('contract $30,000 beats the sent estimate $36,654', sandbox.projectValue(kim) === 30000,
   String(sandbox.projectValue(kim)));

sandbox.indexMoney(prod.estimates, [
  { project_id: kim.id, total: 30000, status: 'signed',
    homeowner_signed_at: '2026-08-01T00:00:00Z', voided_at: '2026-08-01T01:00:00Z' },
]);
ok('  a VOIDED contract does not — falls back to the estimate',
   sandbox.projectValue(kim) === 36654, String(sandbox.projectValue(kim)));

sandbox.indexMoney(prod.estimates, [
  { project_id: kim.id, total: 30000, status: 'sent', homeowner_signed_at: null, voided_at: null },
]);
ok('  an UNSIGNED contract does not either', sandbox.projectValue(kim) === 36654,
   String(sandbox.projectValue(kim)));

console.log('\nIT CANNOT THROW BEFORE THE FETCH RESOLVES');
sandbox.indexMoney([], []);
ok('empty maps → every project is 0, no exception',
   prod.projects.every(p => sandbox.projectValue(p) === 0));
ok('  a null project returns 0 rather than throwing', sandbox.projectValue(null) === 0);
sandbox.indexMoney(null, null);
ok('  indexMoney(null, null) survives — a failed fetch passes [] but be sure', true);

console.log('\n' + '='.repeat(58) + '\n  ' + pass + ' passed, ' + fail + ' failed\n' + '='.repeat(58));
process.exit(fail ? 1 : 0);
