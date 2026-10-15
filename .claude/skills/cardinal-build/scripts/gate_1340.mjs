// gate_1340 — a homeowner's signature on an estimate marks the linked estimate ACCEPTED (Theo, 14 Oct: "2 (1)").
// Runs the shipped helper against a recording client, and the shipped clientsign route against a stub fetch.
// node gate_1340.mjs [index.html] [api/clientsign.js]   (point at 1339 for the negative control)
import fs from 'node:fs';
const root = new URL('../../../../', import.meta.url);
const html = fs.readFileSync(process.argv[2] || new URL('index.html', root), 'utf8');
const cs = fs.readFileSync(process.argv[3] || new URL('api/clientsign.js', root), 'utf8');
let fail = 0;
const ok = (c, m, d) => { console.log((c ? '  PASS  ' : '  FAIL  ') + m + (d !== undefined ? '  → ' + d : '')); if (!c) fail++; };

console.log('A · the helper, executed');
const i = html.indexOf('function crAcceptEstimateForDoc(docId){');
ok(i > 0, 'crAcceptEstimateForDoc() exists');
if (i > 0) {
  const j = html.indexOf('\n}', i);
  const calls = [];
  const mk = rows => ({ from(t) { const q = { t, ops: [] }; calls.push(q); const c = {
      update(v) { q.ops.push(['update', v]); return c; }, eq(k, v) { q.ops.push(['eq', k, v]); return c; },
      in(k, v) { q.ops.push(['in', k, v]); return c; }, select(x) { q.ops.push(['select', x]); return Promise.resolve({ data: rows, error: null }); } }; return c; } });
  const run = (client, id) => new Function('window', html.slice(i, j + 2) + '\nreturn crAcceptEstimateForDoc(' + JSON.stringify(id) + ');')({ sb: client });
  let r = await run(mk([{ id: 'e1' }]), 'doc-9');
  const q = calls[0];
  ok(q && q.t === 'estimates', 'it writes the estimates table');
  ok(q && JSON.stringify(q.ops[0]) .includes('"status":"accepted"'), 'it sets status accepted');
  ok(q && q.ops.some(o => o[0] === 'eq' && o[1] === 'doc_id' && o[2] === 'doc-9'), 'only the estimate linked to the signed page (doc_id)');
  ok(q && q.ops.some(o => o[0] === 'in' && o[1] === 'status' && o[2].join() === 'draft,sent'), 'only from draft or sent (never re-opens a declined one)');
  ok(r === true, 'reports true when a row changed');
  calls.length = 0; r = await run(mk([]), 'doc-9'); ok(r === false, 'reports false when nothing matched');
  calls.length = 0; r = await run(mk([]), ''); ok(r === false && calls.length === 0, 'does nothing without a page id');
}

console.log('B · the in-person signing paths call it');
ok(/else if\(isEstimateTitle\(_t\)\)\{ await crAcceptEstimateForDoc\(current\.id\); \}/.test(html), 'buyer signature slot: an estimate is accepted');
ok(/\}else if\(isEstimateTitle\(t\)\)\{\s*await crAcceptEstimateForDoc\(current\.id\);/.test(html), 'single signature line: an estimate is accepted');
ok(/if\(\/\^contract\/i\.test\(_t\) && current\.project_id\)\{ await setStage\(current\.project_id, 'Approved'\); \}/.test(html), 'contracts still move the job to Approved (unchanged)');
ok(/Estimate signed and accepted/.test(html), 'the message says it was accepted');

console.log('C · the texted-link route, executed with a stub fetch');
const a = cs.indexOf('/* 1340');
ok(a > 0, 'clientsign has the 1340 block');
if (a > 0) {
  const blk = cs.slice(cs.indexOf('try {', a), cs.indexOf('} catch (_a) {}', a) + '} catch (_a) {}'.length);
  const seen = [];
  const fetchStub = async (url, opt) => { seen.push({ url, opt }); return { ok: true, status: 204, text: async () => '' }; };
  await new Function('fetch', 'SUPABASE_URL', 'sbHeaders', 'doc', 'return (async () => {' + blk + '})();')(fetchStub, 'https://x.supabase.co', { apikey: 'k' }, { id: 'doc-7' });
  const s = seen[0] || {};
  ok(seen.length === 1 && s.opt && s.opt.method === 'PATCH', 'it PATCHes once');
  ok(/\/rest\/v1\/estimates\?doc_id=eq\.doc-7&status=in\.\(draft,sent\)$/.test(s.url || ''), 'the linked estimate, only from draft/sent', s.url);
  ok(s.opt && JSON.parse(s.opt.body).status === 'accepted', 'to accepted');
  const blk2 = new Function('fetch', 'SUPABASE_URL', 'sbHeaders', 'doc', 'return (async () => {' + blk + '})();');
  let threw = false; try { await blk2(async () => { throw new Error('down'); }, 'u', {}, { id: 'd' }); } catch (e) { threw = true; }
  ok(!threw, 'a failure here never fails the signature (already saved)');
  ok(cs.indexOf('/* 1340') > cs.indexOf("if (!up.ok) throw new Error('save failed"), 'it runs only after the signature is saved');
}
console.log(fail ? 'RED — gate_1340: ' + fail + ' fail' : 'GREEN — gate_1340: all pass');
process.exit(fail ? 1 : 0);
