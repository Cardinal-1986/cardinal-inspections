/* gate_1321 — the app's full-access mirror matches the database after field_role.sql.
 *   A  window.is_full_access is true for Theo, Joan, Curtis and FALSE for Scottie
 *   B  Scottie is still a field user (isFieldUser) and still production (assignee lists)
 *   C  field_role.sql records that it was applied
 * Arg: [index.html] -> negative control (1320: must go RED). */
import fs from 'fs';
import vm from 'vm';
const FILE = process.argv[2] || '/home/user/cardinal-inspections/index.html';
const html = fs.readFileSync(FILE, 'utf8');
let pass = 0, fail = 0;
const ok = (c, m, d = '') => { console.log((c ? '  PASS  ' : '  FAIL  ') + m + (d ? '  → ' + d : '')); c ? pass++ : fail++; };
const i = html.indexOf('window.is_full_access = function');
const j = html.indexOf('};', i);
const fn = i > 0 ? html.slice(i, j + 2) : '';
const run = (email) => { const w = { my_email: () => email }; vm.runInNewContext('var window = w;' + fn, { w }); return w.is_full_access(); };
let got = {};
try { for (const e of ['theo', 'joan', 'curtis', 'scottie']) got[e] = run(e + '@cardinalrenovations.net'); } catch (e) { got.err = String(e); }
ok(got.theo && got.joan && got.curtis && got.scottie === false, 'A  full access: Theo, Joan, Curtis yes · Scottie no', JSON.stringify(got));
ok(/var FIELD_EMAILS = \['scottie@cardinalrenovations\.net'\]/.test(html) && /var PRODUCTION_EMAILS = \['curtis@cardinalrenovations\.net', 'scottie@cardinalrenovations\.net'\]/.test(html), 'B  Scottie is still a field user and still production');
const sql = fs.readFileSync('/home/user/cardinal-inspections/field_role.sql', 'utf8');
ok(/APPLIED 12 Oct 2026/.test(sql), 'C  field_role.sql says it was applied');
console.log((fail ? 'RED' : 'GREEN') + ' — gate_1321: ' + pass + ' pass, ' + fail + ' fail');
process.exit(fail ? 1 : 0);
