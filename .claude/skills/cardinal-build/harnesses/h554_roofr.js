/* Build 554 gate — a Roofr import fills the measurements and the pitch.
 *
 * This executes the SHIPPED `roofrMerge` — extracted from index.html by
 * brace-matching, never re-typed — against REAL checklist rows pulled from the
 * production database, not invented fixtures. A photo-signing change once
 * shipped completely inert on this project because it was verified against
 * `{path,url}` objects that no row actually had.
 *
 * The two real rows:
 *   ALTON    a job the roof inspection covered — top-level pitch/layers/decking,
 *            no meas at all
 *   FIELD    a job someone measured by hand — meas.source = 'Field',
 *            28.6 sq at 6/12
 *
 * The Roofr payload follows api/roofr.js's own documented contract. Worth
 * saying plainly: ZERO projects in production carry a `roofr` key, so no real
 * import has ever landed and that contract is the only shape evidence there is.
 */
const fs = require('fs');
const SRC = fs.readFileSync('/home/user/cardinal-inspections/index.html', 'utf8');

function extract(name) {
  const i = SRC.indexOf('function ' + name + '(');
  if (i < 0) throw new Error('not found: ' + name);
  let d = 0, k = SRC.indexOf('{', i);
  for (; k < SRC.length; k++) {
    if (SRC[k] === '{') d++;
    else if (SRC[k] === '}' && --d === 0) break;
  }
  return SRC.slice(i, k + 1);
}
const roofrMerge = new Function(extract('roofrMerge') + '; return roofrMerge;')();

/* real rows, copied out of public.projects */
const ALTON = {"pitch":"8/12","layers":"2 Layers","decking":"1x6 Plank / Spaced Lumber"};
const FIELD = {"meas":{"sq":"28.6","hip":"48","eave":"172","note":null,"rake":"96",
  "pitch":"6/12","ridge":"64","source":"Field","valley":"36",
  "updated_at":"2026-07-30T02:55:51.373Z"}};

/* api/roofr.js's documented output contract */
const PAYLOAD = {
  area_sqft: 3120, squares: 31.2, pitch: '7/12',
  ridge_lf: 72, hip_lf: 54, valley_lf: 40, eave_lf: 180, rake_lf: 104,
  step_lf: 22, wall_lf: 16, penetrations: '4 pipe jacks, 1 chimney',
  penetrations_count: 5, waste_pct: 12,
  imported_at: '2026-08-01T21:00:00.000Z',
};

let pass = 0, fail = 0;
const ok = (n, c, d) => { c ? (pass++, console.log('  PASS  ' + n))
                            : (fail++, console.log('  FAIL  ' + n + (d ? '  <' + d + '>' : ''))); };
const clone = (o) => JSON.parse(JSON.stringify(o));

console.log('\n=== A JOB WITH NO MEASUREMENTS YET (real row: Alton) ===');
{
  const all = clone(ALTON);
  roofrMerge(all, clone(PAYLOAD));
  console.log('    meas →', JSON.stringify(all.meas));
  ok('Measurements is populated where it was empty', !!all.meas, JSON.stringify(all.meas));
  ok(`  squares from area_sqft/100 → ${all.meas.sq}`, all.meas.sq === '31.2', all.meas.sq);
  ok(`  ridge ${all.meas.ridge}, hip ${all.meas.hip}, valley ${all.meas.valley}, ` +
     `eave ${all.meas.eave}, rake ${all.meas.rake}`,
     all.meas.ridge === '72' && all.meas.hip === '54' && all.meas.valley === '40' &&
     all.meas.eave === '180' && all.meas.rake === '104', JSON.stringify(all.meas));
  ok(`  labelled as coming from Roofr → ${all.meas.source}`, all.meas.source === 'Roofr', all.meas.source);
  ok('  and stamped with the import time', all.meas.updated_at === PAYLOAD.imported_at, all.meas.updated_at);

  console.log('\n  THE INSPECTION STAYS AUTHORITATIVE');
  ok(`  the inspector's pitch is NOT overwritten (${all.pitch}, Roofr said ${PAYLOAD.pitch})`,
     all.pitch === '8/12', all.pitch);
  ok(`  layers untouched → ${all.layers}`, all.layers === '2 Layers', all.layers);
  ok(`  decking untouched → ${all.decking}`, all.decking === '1x6 Plank / Spaced Lumber', all.decking);
  ok('  the raw payload is still saved for reference', all.roofr && all.roofr.waste_pct === 12);
}

console.log('\n=== A JOB SOMEONE MEASURED BY HAND (real row) ===');
{
  const all = clone(FIELD);
  const before = clone(all.meas);
  roofrMerge(all, clone(PAYLOAD));
  console.log('    meas →', JSON.stringify(all.meas));
  for (const k of ['sq', 'pitch', 'ridge', 'hip', 'valley', 'eave', 'rake']) {
    ok(`  ${k} kept the field value ${before[k]} (Roofr said something else)`,
       all.meas[k] === before[k], `${before[k]} → ${all.meas[k]}`);
  }
  ok('  nothing changed, so the record is NOT relabelled',
     all.meas.source === 'Field', all.meas.source);
  ok('  and the agreement gets a pitch it did not have', all.pitch === '7/12', all.pitch);
}

console.log('\n=== A HAND-MEASURED JOB WITH GAPS ===');
{
  const all = clone(FIELD);
  delete all.meas.valley; delete all.meas.rake;      /* whoever measured skipped two */
  roofrMerge(all, clone(PAYLOAD));
  ok(`  the blanks are filled — valley ${all.meas.valley}, rake ${all.meas.rake}`,
     all.meas.valley === '40' && all.meas.rake === '104',
     `${all.meas.valley} / ${all.meas.rake}`);
  ok(`  the measured values still stand — sq ${all.meas.sq}, pitch ${all.meas.pitch}`,
     all.meas.sq === '28.6' && all.meas.pitch === '6/12', `${all.meas.sq} / ${all.meas.pitch}`);
  ok(`  and the mixture is visible rather than hidden → ${all.meas.source}`,
     all.meas.source === 'Field + Roofr', all.meas.source);
}

console.log('\n=== RE-UPLOADING A CORRECTED REPORT ===');
{
  const all = clone(ALTON);
  roofrMerge(all, clone(PAYLOAD));
  const fixed = Object.assign(clone(PAYLOAD), {
    squares: 33.8, pitch: '9/12', ridge_lf: 80,
    imported_at: '2026-08-02T09:00:00.000Z' });
  roofrMerge(all, fixed);
  ok(`  Roofr refreshes its own numbers — sq ${all.meas.sq}, ridge ${all.meas.ridge}`,
     all.meas.sq === '33.8' && all.meas.ridge === '80', `${all.meas.sq} / ${all.meas.ridge}`);
  ok(`  pitch too → ${all.meas.pitch}`, all.meas.pitch === '9/12', all.meas.pitch);
  ok('  and the timestamp moves', all.meas.updated_at === fixed.imported_at, all.meas.updated_at);
  ok(`  the inspector's pitch is STILL not overwritten (${all.pitch})`, all.pitch === '8/12', all.pitch);
}

console.log('\n=== DEGRADES INSTEAD OF CORRUPTING ===');
{
  const all = clone(ALTON);
  roofrMerge(all, { pitch: null, squares: null, area_sqft: null });
  ok('a payload with nothing usable writes no meas at all', all.meas === undefined,
     JSON.stringify(all.meas));
  ok('  and leaves the inspection intact', all.pitch === '8/12' && all.layers === '2 Layers');

  const a2 = {};
  roofrMerge(a2, { area_sqft: 2740 });                /* squares absent — derive it */
  ok(`squares derived from area_sqft alone → ${a2.meas && a2.meas.sq}`,
     a2.meas && a2.meas.sq === '27.4', JSON.stringify(a2.meas));

  const a3 = {};
  roofrMerge(a3, null);
  ok('a null payload is a no-op, not a throw', Object.keys(a3).length === 0);

  const a4 = { meas: 'not an object' };               /* defensive: bad legacy shape */
  roofrMerge(a4, clone(PAYLOAD));
  ok('a non-object meas does not crash the import', typeof a4.meas === 'object' && !!a4.meas.sq,
     JSON.stringify(a4.meas));
}

console.log('\n=== THE SAVED SHAPE STILL MATCHES WHAT THE MODAL READS ===');
{
  const all = clone(ALTON);
  roofrMerge(all, clone(PAYLOAD));
  const modalKeys = ['sq', 'pitch', 'ridge', 'hip', 'valley', 'eave', 'rake', 'source', 'note'];
  const extra = Object.keys(all.meas).filter(k => !modalKeys.includes(k) && k !== 'updated_at');
  ok('no key the Measurements modal cannot display', extra.length === 0, extra.join(','));
  ok('every value is a string, like the rows already in the database',
     ['sq', 'pitch', 'ridge', 'hip', 'valley', 'eave', 'rake']
       .every(k => typeof all.meas[k] === 'string'),
     JSON.stringify(all.meas));
}

console.log('\n' + '='.repeat(66) + '\n  ' + pass + ' passed, ' + fail + ' failed\n' + '='.repeat(66));
process.exit(fail ? 1 : 0);
