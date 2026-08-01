/* Build 555 gate — the crew Work Order.
 *
 * Executes the SHIPPED woBody / woSpecRows / woLaborRows / woVal — extracted
 * from index.html by brace-matching, never re-typed — against REAL rows pulled
 * from the database:
 *
 *   ALTON   a job the roof inspection covered: layers "2 Layers", pitch "8/12",
 *           decking "1x6 Plank / Spaced Lumber"
 *   FIELD   a job with hand-taken measurements: 28.6 sq at 6/12
 *   RAMIREZ a real crews row shape
 *
 * The headline assertions are the two that would make this feature a lie:
 *   1. the roof facts REACH the document (a photo-signing change once shipped
 *      completely inert because it was verified against invented shapes)
 *   2. no email address is invented anywhere, ever
 */
const fs = require('fs');
const SRC = fs.readFileSync('/home/user/cardinal-inspections/index.html', 'utf8');

function grab(name) {
  const i = SRC.indexOf('function ' + name + '(');
  if (i < 0) throw new Error('not found: ' + name);
  let d = 0, k = SRC.indexOf('{', i);
  for (; k < SRC.length; k++) {
    if (SRC[k] === '{') d++;
    else if (SRC[k] === '}' && --d === 0) break;
  }
  return SRC.slice(i, k + 1);
}
const WO_TRADES = ["Roofing", "Siding", "Windows", "Gutters", "General Repairs"];
const src = ['woEsc', 'woVal', 'woRow', 'woSpecRows', 'woLaborRows', 'woBody'].map(grab).join('\n');
const sandbox = new Function('getChecklist', 'parseCkAll',
  src + '; return { woBody, woSpecRows, woLaborRows, woVal, woEsc };');

/* real rows */
const ALTON = { id: 'p1', name: 'Alton', address: '1442 Wayne Ave, Dayton OH 45410',
  phone: '937-555-0118',
  checklist: JSON.stringify({ structure: 'Gable', rooftype: 'Architectural Shingle',
    pitch: '8/12', layers: '2 Layers', decking: '1x6 Plank / Spaced Lumber',
    deckcond: 'Fair', sat: 'Yes' }) };
const FIELD = { id: 'p2', name: 'Kettering job', address: '88 Shroyer Rd',
  checklist: JSON.stringify({ structure: 'Hip', pitch: '6/12', layers: '1 Layer',
    decking: 'OSB',
    meas: { sq: '28.6', hip: '48', eave: '172', rake: '96', pitch: '6/12',
            ridge: '64', source: 'Field', valley: '36' } }) };
const BARE = { id: 'p3', name: 'New lead', checklist: null };

const RAMIREZ = { id: 'c1', name: 'Ramirez Roofing', legal_name: 'Ramirez Roofing LLC',
  trade: 'Roofing', contact_name: 'Luis Ramirez', contact_phone: '937-555-0142',
  contact_email: null };                       /* Theo has not supplied it yet */
const GUTTER = { id: 'c2', name: 'Novak Gutter Co', trade: 'Gutters',
  contact_name: null, contact_phone: null, contact_email: null };

const CATALOG = { i1: { id: 'i1', name: 'Tear-off, one layer', unit: 'sq' },
                  i2: { id: 'i2', name: 'Install architectural shingle', unit: 'sq' } };
const RATES = [{ pricing_item_id: 'i1', rate: 78 },
               { pricing_item_id: 'i2', rate: 224 },
               { pricing_item_id: null, custom_name: 'Reset satellite dish', custom_unit: 'ea', rate: 85 }];

/* the app's real helpers, as the module defines them */
const getChecklist = (pr) => {
  if (!pr || !pr.checklist) return null;
  try { const c = JSON.parse(pr.checklist); return (c && c.structure) ? c : null; }
  catch (e) { return null; }
};
const parseCkAll = (pr) => { try { return JSON.parse((pr && pr.checklist) || '{}') || {}; }
                             catch (e) { return {}; } };
const WO = sandbox(getChecklist, parseCkAll);

let pass = 0, fail = 0;
const ok = (n, c, d) => { c ? (pass++, console.log('  PASS  ' + n))
                            : (fail++, console.log('  FAIL  ' + n + (d ? '  <' + d + '>' : ''))); };

console.log('\n=== A ROOFING WORK ORDER ON AN INSPECTED JOB (real row: Alton) ===');
{
  const html = WO.woBody(ALTON, RAMIREZ, RATES, CATALOG,
    { wo_number: 'WO-1001', issued: 'Aug 1, 2026', scheduled_on: '2026-08-11',
      scope: 'Tear off to deck.\nIce & water at eaves and valleys.' });
  const has = (s) => html.indexOf(s) !== -1;

  console.log('\n  THE ROOF FACTS REACH THE PAPER — this is the whole feature');
  ok('layers  "2 Layers"', has('2 Layers'));
  ok('pitch   "8/12"', has('8/12'));
  ok('decking "1x6 Plank / Spaced Lumber", with its condition',
     has('1x6 Plank / Spaced Lumber') && has('condition Fair'));
  ok('existing roof type', has('Architectural Shingle'));
  ok('the satellite dish is called out as an ACTION, not just a fact',
     has('Satellite dish') && has('remove and set aside before tear-off'));

  console.log('\n  THE JOB AND THE CREW');
  ok('homeowner and address', has('Alton') && has('1442 Wayne Ave, Dayton OH 45410'));
  ok('crew legal name', has('Ramirez Roofing LLC'));
  ok('crew contact and phone', has('Luis Ramirez') && has('937-555-0142'));
  ok('the trade this order is for', has('<td>Roofing</td>'));
  ok('the schedule date', has('2026-08-11'));

  console.log('\n  NO EMAIL IS INVENTED');
  ok('the crew has no email on file, so the field renders BLANK, not a guess',
     !/@/.test(html), (html.match(/\S*@\S*/) || [''])[0]);

  console.log('\n  SCOPE AND LABOR');
  ok('the typed scope survives, with its line breaks', has('Tear off to deck.<br>'));
  ok('labor lines come from crew_rates',
     has('Tear-off, one layer') && has('$78') && has('$224'));
  ok('  including the crew\'s own custom line', has('Reset satellite dish') && has('$85'));

  console.log('\n  ESCAPING');
  /* legal_name must be cleared or woBody prefers it and the hostile `name` is
     never rendered at all — the first version of this test asserted on a string
     that could not appear, which is a fixture bug, not an escaping one. */
  const evil = Object.assign({}, RAMIREZ,
    { legal_name: null, name: '<script>x</script>', contact_name: 'A & B "C"' });
  const h2 = WO.woBody(ALTON, evil, null, {}, {});
  ok('a crew name cannot open a tag', h2.indexOf('<script>x') === -1 && h2.indexOf('&lt;script&gt;') !== -1);
  ok('  and ampersands/quotes are escaped', h2.indexOf('A &amp; B &quot;C&quot;') !== -1);
}

console.log('\n=== A GUTTER WORK ORDER ON THE SAME KIND OF JOB ===');
{
  const html = WO.woBody(FIELD, GUTTER, [], {}, { wo_number: 'WO-1002' });
  ok('the ROOF block is omitted — it is not a roofing job',
     html.indexOf('Number of layers') === -1 && html.indexOf('Satellite dish') === -1);
  ok('but the measurements still print', html.indexOf('28.6 squares') !== -1 &&
     html.indexOf('172 eave LF') !== -1, html.slice(0, 0));
  ok('  and say where they came from', html.indexOf('(Field)') !== -1);
  ok('a crew with no contact details renders visible blanks, not empty cells',
     (html.match(/\[&nbsp;&nbsp;&nbsp;&nbsp;\]/g) || []).length >= 3);
  ok('"no rates recorded" is said out loud rather than printing an empty table',
     html.indexOf('No labor rates recorded') !== -1);
}

console.log('\n=== A JOB THAT HAS NOT BEEN INSPECTED YET ===');
{
  const html = WO.woBody(BARE, RAMIREZ, null, {}, {});
  ok('no Job Specifications section is invented', html.indexOf('Job Specifications') === -1);
  ok('the document is still usable — scope placeholder is there',
     html.indexOf('describe exactly what this crew is to do') !== -1);
  ok('an unreadable rate table says so instead of printing nothing',
     html.indexOf('Labor rates are not readable') !== -1);
}

console.log('\n=== THE ADMIN-ONLY RATE GATE (crew_rates is RLS-restricted) ===');
{
  const asAdmin = WO.woLaborRows(RATES, CATALOG);
  const asProd  = WO.woLaborRows(null, {});       /* RLS refuses -> null */
  ok(`admin sees a total of $${asAdmin.total}`, asAdmin.total === 387, String(asAdmin.total));
  ok('production sees no total at all', asProd.total === null, String(asProd.total));
  ok('  and no money leaks into the markup', !/\$\d/.test(asProd.html), asProd.html.slice(0, 60));
}

console.log('\n=== DOCUMENT TYPE THREE ROUTES CORRECTLY ===');
{
  const isEstimateTitle = new Function('return ' + grab('isEstimateTitle') + ';')();
  const isContractTitle = new Function('return ' + grab('isContractTitle') + ';')();
  const isWorkOrderTitle = new Function('return ' + grab('isWorkOrderTitle') + ';')();
  const title = 'Work Order — Roofing — Ramirez Roofing';
  ok('a work order is recognised as one', isWorkOrderTitle(title));
  ok('  and is NOT mistaken for an estimate or a contract',
     !isEstimateTitle(title) && !isContractTitle(title));
  /* the insp bucket is defined by negation — this is the trap */
  const insp = (t) => !isEstimateTitle(t) && !isContractTitle(t) && !isWorkOrderTitle(t) &&
                      !/^file:/i.test(t.trim());
  ok('  and does not fall into the Inspections bucket', !insp(title));
  ok('a real inspection report still does', insp('Roof Inspection — Alton'));
  ok('contracts and estimates are unaffected',
     isContractTitle('Contract — Alton') && isEstimateTitle('Siding Estimate — Alton'));
}

console.log('\n' + '='.repeat(66) + '\n  ' + pass + ' passed, ' + fail + ' failed\n' + '='.repeat(66));
process.exit(fail ? 1 : 0);
