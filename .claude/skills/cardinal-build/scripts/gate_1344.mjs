// Build 1344 — several ACCEPTED estimates add up, the same in all five places; sent ones stay "largest".
// Runs the SHIPPED estBest loop body against rows. Usage: node gate_1344.mjs [index.html] [apiDir]
import fs from 'fs';
const here = new URL('.', import.meta.url).pathname;
const s = fs.readFileSync(process.argv[2] || here + '../../../../index.html', 'utf8');
const api = process.argv[3] || here + '../../../../api';
const sqlF = here + '../../../../collections_guards.sql';
const fails = [], ok = (c, m) => { if (!c) fails.push(m); else console.log('  ok  ' + m); };
const a = s.indexOf("    var tier = ACCEPTED_EST[st] ? 2 : 1;");
const b = s.indexOf('  });', a);
const body = a > 0 && b > a ? s.slice(a, b) : '';
ok(!!body, 'found the estBest loop');
if (body) {
  const run = new Function('rows', `var estTier = {}, estBest = {}, ACCEPTED_EST = { accepted: 1, signed: 1 };
    rows.forEach(function(e){ var st = e.status, t = e.total; ${body} });
    return estBest;`);
  ok(run([{ project_id: 'p', status: 'accepted', total: 20000 }, { project_id: 'p', status: 'accepted', total: 15000 }]).p === 35000, 'two accepted estimates add up (20,000 + 15,000 = 35,000)');
  ok(run([{ project_id: 'p', status: 'sent', total: 36432 }, { project_id: 'p', status: 'sent', total: 34050 }]).p === 36432, 'two SENT estimates (options) still price at the largest');
  ok(run([{ project_id: 'p', status: 'sent', total: 90000 }, { project_id: 'p', status: 'accepted', total: 15000 }]).p === 15000, 'an accepted estimate still outranks a bigger sent one');
}
for (const f of ['pay.js', 'share.js']) {
  const t = fs.readFileSync(api + '/' + f, 'utf8');
  ok(/accEst \+= Number\(e\.total\)/.test(t) && !/Number\(e\.total\) > accEst\) accEst =/.test(t), f + ' adds accepted estimates');
}
const r = fs.readFileSync(api + '/remind.js', 'utf8');
ok(/estByP\[e\.project_id\] = \(estByP\[e\.project_id\] \|\| 0\) \+ Number\(e\.total\)/.test(r), 'remind.js adds accepted estimates');
const q = fs.readFileSync(sqlF, 'utf8');
ok(/sum\(total\) filter \(where status in \('accepted','signed'\)/.test(q) && !/max\(total\) filter \(where status in \('accepted'/.test(q), 'job_total_for() adds accepted estimates');
if (fails.length) { console.log('GATE 1344 RED — ' + fails.length + ' failing'); fails.forEach(m => console.log('  FAIL ' + m)); process.exit(1); }
console.log('GATE 1344 GREEN');
