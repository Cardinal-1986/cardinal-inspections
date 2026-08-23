// gate_1017.mjs — proves patchProjectCk no longer merges offline edits onto a
// stale service-worker-cached row (build 1017, audit finding 8).
//
// EXECUTES the shipped patchProjectCk:
//   OFFLINE (navigator.onLine === false): must NOT refetch (sb.from unused) and
//     must merge the patch onto pr.checklist — the just-made offline edit
//     survives instead of being overwritten by the stale cached row.
//   ONLINE: must still refetch (655 two-device race) and merge onto the fresh row.
//
// Usage:
//   node gate_1017.mjs                 # working tree -> GREEN
//   node gate_1017.mjs <index.html>    # build-1016 copy -> RED (offline refetch happens)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, '../../../..');
const INDEX = process.argv[2] || path.join(REPO, 'index.html');
const src = fs.readFileSync(INDEX, 'utf8');

const fails = [];
const ok = (c, m) => { if (!c) fails.push(m); };

const anchor = 'async function patchProjectCk(pr, patch){';
const at = src.indexOf(anchor);
let body = null;
if (at === -1) fails.push('[extract] patchProjectCk not found');
else {
  let i = src.indexOf('{', at), depth = 0;
  for (let j = i; j < src.length; j++) {
    if (src[j] === '{') depth++;
    else if (src[j] === '}') { depth--; if (depth === 0) { body = src.slice(at, j + 1); break; } }
  }
}

async function run(onLine) {
  let refetched = 0, saved = null;
  const sb = { from: () => { refetched++; return {
    select: () => ({ eq: () => ({ single: async () => ({ error: null, data: { checklist: '{"a":1,"z":9}' } }) }) }) }; } };
  const pdb = { update: async (id, f) => { saved = f; } };
  const make = new Function('TEAM', 'sb', 'pdb', 'currentProject', 'cacheProjects', 'navigator',
    body + '\nreturn patchProjectCk;');
  const fn = make(true, sb, pdb, null, [], { onLine });
  const pr = { id: 'P', checklist: '{"a":1}' };
  await fn(pr, { b: 2 });
  return { refetched, merged: JSON.parse(saved.checklist) };
}

if (body) {
  try {
    const off = await run(false);
    ok(off.refetched === 0, `[offline] must NOT refetch (sb.from called ${off.refetched}×) — that read the stale SW cache and dropped the edit`);
    ok(off.merged.a === 1 && off.merged.b === 2, `[offline] must merge the patch onto the local row, got ${JSON.stringify(off.merged)}`);
    ok(off.merged.z === undefined, '[offline] must NOT have pulled the stale cached {z:9} row');

    const on = await run(true);
    ok(on.refetched === 1, `[online] must still refetch the fresh row (655 race), got ${on.refetched}`);
    ok(on.merged.z === 9 && on.merged.b === 2, `[online] must merge patch onto the fresh row, got ${JSON.stringify(on.merged)}`);
  } catch (e) { fails.push('patchProjectCk execution failed: ' + e.message); }
}

if (fails.length) {
  console.error('RED — gate_1017 failed (' + fails.length + '):');
  for (const f of fails) console.error('  ✗ ' + f);
  process.exit(1);
}
console.log('GREEN — gate_1017: offline patchProjectCk merges locally (no stale refetch); online still refetches.');
