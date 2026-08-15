// gate_design.mjs — api/design.js: the prompt it builds and the ladder it climbs.
//
// Everything here goes through ONE mocked global fetch, routed by URL, so the
// shipped handler runs unmodified — no re-implementation of the thing under
// test. Two surfaces are covered:
//
//   THE PROMPT. On 15 Aug Theo prompted "make only the shingled roof Evergreen
//   Mist" and Gemini returned a different siding colour, and on an earlier
//   press it gave a standing-seam porch deck brown architectural shingles.
//   "Change nothing that is not listed" did not hold. The fix is to ENUMERATE:
//   every surface not being changed is named, and the metal-roof and
//   same-framing clauses are always present. These assertions read the body
//   that would actually have gone to Google.
//
//   THE LADDER. The retry loop carried a comment describing behaviour it did
//   not have: `continue` advanced the CONFIG loop, so a 503 was "retried" with
//   a different request and a 503 on the bare pass was never retried at all.
//   Fixed 15 Aug; these cases pin it.
//
// Run against the pre-fix file to see it go red:
//     node gate_design.mjs                       # the working tree
//     node gate_design.mjs /tmp/design_old.js    # the negative control
//
// A gate that has never been seen to fail proves nothing (BUG_CLASSES 37).

import { pathToFileURL } from 'node:url';
import path from 'node:path';

const TARGET = process.argv[2] || 'api/design.js';
const CONTROL = process.argv[2] != null;

let pass = 0, fail = 0;
const bad = [];
function ok(name, cond, detail) {
  if (cond) { pass++; return; }
  fail++; bad.push(name + (detail ? '  — ' + detail : ''));
}

// ── the mock ─────────────────────────────────────────────────────────────
// Routed by URL. `plan` is an array of what Gemini should do, consumed in
// order; anything past the end repeats the last entry.
let sent = [];        // every Gemini request body, parsed
let plan = [];
let planAt = 0;

function geminiReply() {
  const step = plan[Math.min(planAt, plan.length - 1)];
  planAt++;
  return step;
}

function imagePart() {
  return {
    ok: true, status: 200,
    json: async () => ({
      candidates: [{ content: { parts: [
        { inline_data: { mime_type: 'image/png', data: 'AAAA' } }
      ] } }]
    })
  };
}
function textOnly(t) {
  return {
    ok: true, status: 200,
    json: async () => ({ candidates: [{ content: { parts: [{ text: t }] } }] })
  };
}
function errStatus(status, message) {
  return { ok: false, status, json: async () => ({ error: { message } }) };
}

globalThis.fetch = async (url, opts) => {
  const u = String(url);

  if (u.includes('/auth/v1/user')) {
    return { ok: true, status: 200, json: async () => ({ email: 'theo@cardinalrenovations.net' }) };
  }
  if (u.includes('/v1beta/models?')) {
    return { ok: true, status: 200,
             json: async () => ({ models: [{ name: 'models/gemini-3.1-flash-image' }] }) };
  }
  if (u.includes(':generateContent')) {
    const model = (u.match(/models\/([^:]+):/) || [])[1] || '?';
    let body = {};
    try { body = JSON.parse(opts.body); } catch (_) {}
    sent.push({ model, body });
    return geminiReply();
  }
  throw new Error('unexpected fetch: ' + u);
};

// ── harness ──────────────────────────────────────────────────────────────
function res() {
  const r = { code: 0, body: null };
  r.status = n => { r.code = n; return r; };
  r.json = o => { r.body = o; return r; };
  return r;
}

async function run(handler, changes, steps) {
  sent = []; plan = steps; planAt = 0;
  const rs = res();
  await handler({
    method: 'POST',
    headers: { authorization: 'Bearer tok' },
    body: { image: 'BBBB', mime: 'image/jpeg', changes }
  }, rs);
  return rs;
}

const textOf = i => (sent[i].body.contents[0].parts.find(p => p.text) || {}).text || '';

const file = path.resolve(TARGET);
const mod = await import(pathToFileURL(file).href);
const handler = mod.default;

process.env.GEMINI_API_KEY = 'test-key';

// ── 1. the prompt, roof only ─────────────────────────────────────────────
{
  await run(handler, { roof: 'Owens Corning Duration in Evergreen Mist' }, [imagePart()]);
  const t = textOf(0);

  ok('roof instruction present', /Evergreen Mist/.test(t));

  // The enumerated hold list — the whole point of the 15 Aug change.
  ok('names SIDING in the hold list', /Keep the wall cladding and its exact existing colour/i.test(t),
     'a generic "change nothing else" is what let the siding move');
  ok('names TRIM in the hold list', /Keep the trim/i.test(t));
  ok('names GUTTERS in the hold list', /Keep the gutters and downspouts/i.test(t));
  ok('names WINDOWS in the hold list', /Keep the window frames/i.test(t));
  ok('does NOT hold the roof it was asked to change',
     !/Keep the roof shingles, ridge caps and roof colour exactly/i.test(t));

  ok('metal roof is explicitly locked', /standing-seam[\s\S]{0,200}Never apply shingles to a metal roof/i.test(t),
     'the porch deck came back shingled');
  ok('framing / aspect is locked', /do not zoom, pan, re-compose or extend/i.test(t),
     'renders came back re-framed, which is what makes compositing impossible');
  ok('same aspect ratio demanded on return', /same aspect ratio as the input/i.test(t));
  ok('shingle granule vocabulary present when roof changes',
     /granule blending[\s\S]{0,120}shadow bands/i.test(t));

  ok('temperature pinned low', sent[0].body.generationConfig &&
     sent[0].body.generationConfig.temperature === 0.2,
     'fidelity job, not a creative one');
  ok('asks for pixels back',
     (((sent[0].body.generationConfig || {}).responseModalities) || []).includes('IMAGE'));
}

// ── 2. the prompt, siding only — the hold list must FLIP ─────────────────
{
  await run(handler, { siding: 'CertainTeed Monogram in Pacific Blue' }, [imagePart()]);
  const t = textOf(0);
  ok('holds the ROOF when only siding changes', /Keep the roof shingles, ridge caps and roof colour/i.test(t),
     'the list is per-request, not a fixed block');
  ok('does NOT hold the siding it was asked to change',
     !/Keep the wall cladding and its exact existing colour/i.test(t));
  ok('no shingle vocabulary when the roof is untouched',
     !/granule blending/i.test(t));
}

// ── 3. unknown surface keys are DROPPED, not forwarded ───────────────────
{
  const rs = await run(handler, { roof: 'Black Sable', chimney: 'paint it red' }, [imagePart()]);
  ok('unknown surface key dropped', !/paint it red/i.test(textOf(0)),
     'a pinned vocabulary must not be negotiable per request');
  ok('known surface still applied', rs.code === 200);
}

// ── 4. the ladder: 503 retries the SAME request ──────────────────────────
{
  const rs = await run(handler, { roof: 'Black Sable' },
                       [errStatus(503, 'model is overloaded'), imagePart()]);
  ok('503 then success returns 200', rs.code === 200, 'got ' + rs.code);
  ok('503 produced exactly 2 presses', sent.length === 2, 'got ' + sent.length);
  ok('the retry went to the SAME model',
     sent.length === 2 && sent[0].model === sent[1].model,
     sent.map(s => s.model).join(' -> '));
  ok('the retry sent the SAME config (not the bare fallback)',
     sent.length === 2 && JSON.stringify(sent[0].body.generationConfig) ===
                          JSON.stringify(sent[1].body.generationConfig),
     'a 503 is an overload, not a complaint about the request');
}

// ── 5. the ladder: a 400 about the config drops the config ───────────────
{
  const rs = await run(handler, { roof: 'Black Sable' },
                       [errStatus(400, 'Invalid responseModalities'), imagePart()]);
  ok('400-on-config recovers', rs.code === 200, 'got ' + rs.code);
  ok('second press dropped generationConfig',
     sent.length === 2 && sent[1].body.generationConfig === undefined,
     JSON.stringify((sent[1] || {}).body && sent[1].body.generationConfig));
}

// ── 6. a text-only answer is a refusal, surfaced honestly ────────────────
{
  const rs = await run(handler, { roof: 'Black Sable' },
                       [textOnly('I cannot edit photographs of real property.')]);
  ok('refusal is not reported as success', rs.code !== 200, 'got ' + rs.code);
  ok('refusal text reaches the caller',
     /cannot edit photographs/i.test(JSON.stringify(rs.body || {})),
     'a bare "failed" sends you hunting for a bug that is not there');
}

// ── 7. nothing selected is a 400, not an empty press ─────────────────────
{
  const rs = await run(handler, {}, [imagePart()]);
  ok('no surfaces selected → 400', rs.code === 400, 'got ' + rs.code);
  ok('no surfaces selected → no Gemini call', sent.length === 0,
     'spending the key on an empty request');
}

// ── report ───────────────────────────────────────────────────────────────
const total = pass + fail;
console.log('\ngate_design — %s%s', TARGET, CONTROL ? '   [negative control]' : '');
console.log('  %d/%d pass', pass, total);
if (fail) {
  console.log('\n  FAILED:');
  bad.forEach(b => console.log('    - ' + b));
}
if (CONTROL) {
  console.log(fail
    ? '\n  RED, as a control should be — the pre-fix file does not satisfy these.'
    : '\n  ⚠ the control PASSED. These assertions do not test what they claim.');
  process.exit(fail ? 0 : 1);
}
process.exit(fail ? 1 : 0);
