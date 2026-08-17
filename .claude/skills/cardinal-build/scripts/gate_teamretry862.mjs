/* Build 862 gate — executes the SHIPPED tmRetryWrite (Team Directory save retry)
 * against transient / RLS-refusal / persistent / non-network scenarios.
 *   node gate_teamretry862.mjs [path/to/index.html]   # 862 -> GREEN; v861 has no fn -> exits 1
 */
import { readFileSync } from 'fs';
const FILE = process.argv[2] || '/home/user/cardinal-inspections/index.html';
const s = readFileSync(FILE, 'utf8');
const start = s.indexOf('function tmRetryWrite(');
if (start < 0) { console.log('tmRetryWrite not present (pre-862)'); process.exit(1); }
let i = s.indexOf('{', start), depth = 0, end = -1;
for (; i < s.length; i++) { const c = s[i]; if (c === '{') depth++; else if (c === '}') { depth--; if (depth === 0) { end = i + 1; break; } } }
const tmRetryWrite = eval('(' + s.slice(start, end).replace(/^function tmRetryWrite/, 'function') + ')');
let pass = 0, fail = 0;
const ok = (l, c, x) => { c ? (pass++, console.log('  PASS ' + l)) : (fail++, console.log('  FAIL ' + l + (x !== undefined ? ' -> ' + JSON.stringify(x) : ''))); };
let a = 0; let r = await tmRetryWrite(() => { a++; if (a < 3) return Promise.reject(new TypeError('Load failed')); return Promise.resolve({ data: [{}], error: null }); });
ok('transient blip retried to success', a === 3 && r && r.error === null, { calls: a });
let b = 0; let rb = await tmRetryWrite(() => { b++; return Promise.resolve({ data: null, error: { message: 'rls' } }); });
ok('RLS refusal returned once (not retried)', b === 1 && !!rb.error, { calls: b });
let c = 0, threw = false; try { await tmRetryWrite(() => { c++; return Promise.reject(new TypeError('Load failed')); }); } catch (e) { threw = true; }
ok('persistent network failure gives up after 3', c === 3 && threw, { calls: c });
let d = 0, threwD = false; try { await tmRetryWrite(() => { d++; return Promise.reject(new Error('logic error')); }); } catch (e) { threwD = true; }
ok('non-network error not retried', d === 1 && threwD, { calls: d });
console.log('\n' + (fail === 0 ? 'GREEN' : 'RED') + ' — ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
