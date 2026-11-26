/* gate_1487 — Jerry Wamsley is jwamsley@cardinalrenovations.net in the app's code (Theo, 25 Nov 2026:
   "create an [email] for Jerry Wamsley jwamsley@", then "Yes" to switching his CRM email to it).
   His sign-in, team_profiles row and leads were already on jwamsley@; two hardcoded lists were not.

   Runs the SHIPPED code, sliced out of the files, in a vm:
     W1  TEAM_ROSTER has Jerry Wamsley exactly once, on jwamsley@, still tagged @wamsley; Vera unchanged
     W2  the Reassign picker's real option builder offers him under jwamsley@
     W3  the Ask-button list (AI_PEOPLE) and the server's PEOPLE both carry jwamsley@ and name the
         SAME people; the server still treats him as a sales rep (owner false, sales true)
     W4  the old address appears nowhere in index.html or api/assistant.js
     W5  the app stamp is 1487 and What's New leads with 1487

   Args: [index.html] [assistant.js] -> negative control: main at 1486 must go RED, not crash. */
import fs from 'fs';
import vm from 'vm';

const APP = process.argv[2] || 'index.html';
const SRV = process.argv[3] || 'api/assistant.js';
const S = fs.readFileSync(APP, 'utf8').replace(/\r\n/g, '\n');
const A = fs.readFileSync(SRV, 'utf8').replace(/\r\n/g, '\n');
const NEW = 'jwamsley@cardinalrenovations.net', OLD = 'jerry@jerrywamsley.com', VERA = 'jerry@cardinalrenovations.net';
let pass = 0, fail = 0;
const ok = (c, m, d = '') => { console.log((c ? '  PASS  ' : '  FAIL  ') + m + (d ? '  → ' + String(d).slice(0, 300) : '')); c ? pass++ : fail++; };
console.log('gate_1487 on ' + APP + ' + ' + SRV);

function slice(src, from, to) {
  const i = src.indexOf(from); if (i < 0) throw new Error('anchor not found: ' + from.slice(0, 60));
  const j = src.indexOf(to, i + from.length); if (j < 0) throw new Error('end not found after: ' + from.slice(0, 60));
  return src.slice(i, j + to.length);
}
const run = (code, ctx = {}) => { vm.createContext(ctx); vm.runInContext(code, ctx); return ctx; };

// W1
let R = [];
try { R = run(slice(S, 'var TEAM_ROSTER = [', '];')).TEAM_ROSTER; } catch (e) { ok(false, 'W1  extract the shipped TEAM_ROSTER', e.message); }
const w = R.filter(m => m.name === 'Jerry Wamsley');
ok(w.length === 1 && w[0].email === NEW && w[0].tag === 'wamsley', 'W1  TEAM_ROSTER has Jerry Wamsley once, on ' + NEW + ', tagged @wamsley', JSON.stringify(w));
const v = R.filter(m => m.email === VERA);
ok(v.length === 1 && v[0].name === 'Jerry Vera' && v[0].tag === 'vera', 'W1  Jerry Vera is unchanged', JSON.stringify(v));
const em = R.map(m => m.email);
ok(em.length > 5 && new Set(em).size === em.length, 'W1  no email appears twice', em.join(', '));

// W2 — the real Reassign option builder
try {
  const ctx = run("var TEAM_ROSTER = " + JSON.stringify(R) + ";", { esc: s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c])) });
  const html = vm.runInContext(slice(S, "TEAM_ROSTER.map(function(m){ return '<option value=\"' + m.email + '\">'", ".join('')"), ctx);
  ok(html.includes('<option value="' + NEW + '">Jerry Wamsley</option>') && !html.includes(OLD), 'W2  Reassign offers Jerry Wamsley under ' + NEW, html.slice(0, 220));
} catch (e) { ok(false, 'W2  Reassign offers Jerry Wamsley under ' + NEW, e.message); }

// W3
let AI = {}, PEOPLE = {};
try { AI = run(slice(S, 'var AI_PEOPLE = {', '};')).AI_PEOPLE; } catch (e) { ok(false, 'W3  extract AI_PEOPLE', e.message); }
try { PEOPLE = run(slice(A, 'export const PEOPLE = {', '};').replace('export const PEOPLE', 'var PEOPLE')).PEOPLE; } catch (e) { ok(false, 'W3  extract the server PEOPLE', e.message); }
ok(AI[NEW] === 1 && !(OLD in AI), 'W3  the Ask button shows for ' + NEW + ' and not for the old address', JSON.stringify(AI));
ok(!!PEOPLE[NEW] && PEOPLE[NEW].sales === true && PEOPLE[NEW].owner === false && !(OLD in PEOPLE), 'W3  the server serves ' + NEW + ' as a sales rep', JSON.stringify(PEOPLE[NEW] || null));
const ka = Object.keys(AI).sort().join(','), kp = Object.keys(PEOPLE).sort().join(',');
ok(ka.length > 0 && ka === kp, 'W3  the browser list and the server list name exactly the same people', ka + ' | ' + kp);

// W4
ok(!S.includes(OLD), 'W4  the old address is gone from ' + APP, (S.match(new RegExp('.{0,60}' + OLD.replace(/[.@]/g, '\\$&') + '.{0,20}', 'g')) || []).join(' | '));
ok(!A.includes(OLD), 'W4  the old address is gone from ' + SRV);

// W5
ok(/>v2026-11-25 build 1487</.test(S), 'W5  the app stamp reads build 1487');
ok(/var CHANGELOG = \[\n  \{ b: 1487,/.test(S), 'W5  What\'s New leads with 1487');

console.log(`\ngate_1487: ${pass} pass, ${fail} fail — ${fail ? 'RED' : 'GREEN'}`);
process.exit(fail ? 1 : 0);
