/* Build 1077 gate — the work order's colour prefill asked for a column that
 * does not exist.
 *
 * Executes the SHIPPED woReadContractColors(), sliced out of the artifact by
 * brace-matching, against a mock that behaves like PostgREST: a select naming a
 * column the table does not have answers 400 / 42703, exactly as the real
 * database does. That is what makes the control fail for the RIGHT reason —
 * a mock that returns rows whatever you ask for would go green on 1076.
 *
 * Optional path argument points it at the previous build as a negative control.
 * BUG_CLASSES 37: every section is wrapped, and the FLOOR fails the run if a
 * check never executed.
 */
import fs from 'fs';
import { chromium } from 'playwright';

const FILE = process.argv[2] || '/home/user/cardinal-inspections/index.html';
const HTML = fs.readFileSync(FILE, 'utf8');
console.log('gate_1077 on ' + FILE);

let fails = 0, passes = 0;
const ran = new Set();
function ok(name, cond, extra) {
  ran.add(name);
  if (cond) { passes++; console.log('  PASS  ' + name); }
  else { fails++; console.log('  FAIL  ' + name + (extra ? '  → ' + extra : '')); }
}
async function step(name, fn) {
  try { await fn(); }
  catch (e) { ran.add(name); fails++; console.log('  FAIL  ' + name + ' section  → threw: ' + (e && e.message)); }
}

/* ── slice the shipped function ─────────────────────────────────────────── */
function fnSource(head) {
  const i = HTML.indexOf(head);
  if (i === -1) return null;
  let depth = 0, k = HTML.indexOf('{', i);
  for (;; k++) {
    const c = HTML[k];
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) return HTML.slice(i, k + 1); }
  }
}
const FN = fnSource('async function woReadContractColors(pr){');

/* The real columns, from information_schema on the production database. */
const REAL_COLUMNS = ['id','title','status','sent_at','created_at','updated_at',
                      'created_by','html','project','project_id','share_token','total','signed_at'];

const CONTRACT_HTML =
  '<div><select data-crsel="occ">' +
    '<option value="Onyx Black">Onyx Black</option>' +
    '<option value="Driftwood" selected>Driftwood</option>' +
  '</select>' +
  '<select data-crsel="trim">' +
    '<option value="White">White</option>' +
    '<option value="Musket Brown" selected>Musket Brown</option>' +
  '</select></div>';

const ROWS = [
  { title: 'Contract — Roofing Agreement', created_at: '2026-08-10T00:00:00Z',
    html: CONTRACT_HTML, project: null },
  { title: 'Contract — Gutters',           created_at: '2026-08-11T00:00:00Z',
    html: '<div><select data-crsel="occ"><option value="WRONG" selected>WRONG</option></select></div>',
    project: null },
  { title: 'Estimate — Roof Replacement',  created_at: '2026-08-12T00:00:00Z',
    html: '<div><select data-crsel="occ"><option value="NOT A CONTRACT" selected>x</option></select></div>',
    project: null }
];

/* A mock that refuses an unknown column the way PostgREST does. */
const RIG = (rows) => `
window.__asked = [];
window.sb = {
  from: function(table){
    var cols = null;
    var q = {
      select: function(c){ cols = c; window.__asked.push({ table: table, select: c }); return q; },
      eq: function(){ return q; },
      order: function(){ return q; },
      then: function(res){
        var real = ${JSON.stringify(REAL_COLUMNS)};
        var want = String(cols || '').split(',').map(function(s){ return s.trim(); }).filter(Boolean);
        var bad = want.filter(function(c){ return real.indexOf(c) === -1; });
        if (bad.length) {
          /* what the database actually answers: 42703, column does not exist */
          return Promise.resolve({ data: null,
            error: { code: '42703', message: 'column ' + JSON.stringify(bad[0]) + ' does not exist' } }).then(res);
        }
        var rows = ${JSON.stringify(rows)}.map(function(r){
          var out = {}; want.forEach(function(c){ out[c] = r[c]; }); return out;
        });
        return Promise.resolve({ data: rows, error: null }).then(res);
      }
    };
    return q;
  }
};
window.isContractTitle = function(t){ return /^contract/i.test(String(t || '').trim()); };
`;

(async () => {
const browser = await chromium.launch();

await step('A', async () => {
  ok('A1 woReadContractColors is in the artifact', !!FN, FN ? FN.length + ' chars' : 'not found');
  if (!FN) {
    ['A2 it asks for columns the table actually has',
     'A3 it reads the contract and returns both colours',
     'A4 it prefers the ROOFING contract over another one',
     'A5 an unknown column still returns blank rather than throwing']
      .forEach(n => ok(n, false, 'function not found'));
    return;
  }
  const page = await browser.newPage();
  page.on('pageerror', e => console.log('    [pageerror] ' + String(e).split('\n')[0]));
  await page.setContent('<!doctype html><html><body></body></html>');
  await page.addScriptTag({ content: RIG(ROWS) });
  await page.addScriptTag({ content: FN + '\nwindow.__fn = woReadContractColors;' });

  const r = await page.evaluate(async () => {
    const out = await window.__fn({ id: 'p1' });
    return { out, asked: window.__asked };
  });

  const sel = (r.asked[0] || {}).select || '';
  const wanted = sel.split(',').map(s => s.trim()).filter(Boolean);
  const bogus = wanted.filter(c => !REAL_COLUMNS.includes(c));
  ok('A2 it asks for columns the table actually has',
     wanted.length > 0 && bogus.length === 0,
     'select(' + JSON.stringify(sel) + ')' + (bogus.length ? ' — no such column: ' + bogus.join(', ') : ''));

  ok('A3 it reads the contract and returns both colours',
     r.out && r.out.shingle === 'Driftwood' && r.out.drip === 'Musket Brown',
     JSON.stringify(r.out));

  ok('A4 it prefers the ROOFING contract over another one',
     r.out && r.out.shingle !== 'WRONG' && r.out.shingle !== 'NOT A CONTRACT',
     JSON.stringify(r.out));
  await page.close();
});

/* The guard must still hold: a refused query returns blank, never throws. */
await step('B', async () => {
  if (!FN) { ok('A5 an unknown column still returns blank rather than throwing', false, 'no function'); return; }
  const page = await browser.newPage();
  await page.setContent('<!doctype html><html><body></body></html>');
  /* Force the refusal by shrinking the table's real column list to nothing. */
  await page.addScriptTag({ content: RIG(ROWS).replace(
    JSON.stringify(REAL_COLUMNS), JSON.stringify(['id'])) });
  await page.addScriptTag({ content: FN + '\nwindow.__fn = woReadContractColors;' });
  const out = await page.evaluate(async () => {
    try { return { ok: true, v: await window.__fn({ id: 'p1' }) }; }
    catch (e) { return { ok: false, err: String(e) }; }
  });
  ok('A5 an unknown column still returns blank rather than throwing',
     out.ok && out.v && out.v.shingle === '' && out.v.drip === '', JSON.stringify(out));
  await page.close();
});

/* Source invariants — the two <template>.content must not have been collateral. */
await step('C', async () => {
  const tmpl = (HTML.match(/getElementById\([^)]*\)\.content/g) || []).length;
  ok('C1 the two <template>.content survivors are intact', tmpl === 2, 'found ' + tmpl);
  ok('C2 no `doc.content` left in the artifact', !/\bdoc\.content\b/.test(HTML));
});

await browser.close();

const FLOOR = ['A1','A2','A3','A4','A5','C1','C2'];
const seen = [...ran];
const missing = FLOOR.filter(n => !seen.some(r => r.startsWith(n + ' ')));
console.log('\n── floor ──');
if (missing.length) { fails += missing.length;
  console.log('  FAIL  ' + missing.length + ' check(s) never ran: ' + missing.join(', ')); }
else console.log('  PASS  all ' + FLOOR.length + ' checks executed');

console.log('\n' + (fails ? 'RED' : 'GREEN') + ' — ' + passes + ' passed, ' + fails + ' failed');
process.exit(fails ? 1 : 0);
})();
