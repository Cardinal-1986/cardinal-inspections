/* gate_806 — the librarian moves off Gemini without index.html noticing.

   The contract this build must not break is not "it calls Claude". It is that
   the JSON reaching the two call sites in index.html is the SAME JSON. So the
   gate runs BOTH routes — the shipped Gemini one, kept beside it — hands each
   the identical model output, and compares what they emit field for field.

   It also drives the REAL SDK. There is no mock Anthropic client: a local HTTP
   server stands in for api.anthropic.com and speaks proper SSE back, so the
   request captured is the request the SDK would actually put on the wire. A
   hand-written fake would have proved my own assumption instead.

   Usage:
     node gate_806.mjs                       # the new route  -> GREEN
     node gate_806.mjs <path to old route>   # negative control -> must go RED

   The control is the Gemini file saved before the swap. Everything about the
   request shape has to fail against it (BUG_CLASSES 37: a control that cannot
   fail proves nothing).                                                     */

import http from 'http';

const TARGET = process.argv[2] || '/home/user/cardinal-inspections/api/librarian.js';
const OLD    = '/tmp/claude-0/-home-user-cardinal-inspections/1df73da0-9ab0-51de-9322-6c62456856c9/scratchpad/librarian_gemini.js';

setTimeout(() => { console.log('GATE TIMEOUT — treat as RED'); process.exit(1); }, 120000);

const checks = [];
const chk = (n, c, d) => checks.push({ n, pass: !!c, d: d === undefined ? '' : String(d) });

/* ── the model's answer, used identically by both routes ─────────────────── */
const ASK_OUT = {
  belongs: true, reason: '', hub: 'general',
  section: 'Roofing', section_is_new: false,
  subsection: 'Roof Ventilation & Ice Prevention', subsection_is_new: false,
  title: 'Ice barrier at the eave',
  summary: 'Where the ice barrier has to reach on an Ohio roof.',
  body: 'Ice barrier must extend from the eave edge to a point 24 inches inside '
      + 'the exterior wall line.\n\n~~stack\nShingles\nUnderlayment\nIce barrier\nDeck\n',
  sources: ['2019 RCO R905.1.2', '  ', 'x', null, 'Owens Corning installation instructions'],
};
const CLASSIFY_OUT = {
  belongs: true, reason: '', hub: 'insurance',
  section: 'Matching & Line Items', section_is_new: false,
  subsection: '', subsection_is_new: false,
  title: 'Matching statute extract', summary: 'What Ohio requires on matching.',
};
const ILL_OUT = { diagram: '~~stack\nShingles\nDeck', caption: 'Top down.', reason: '' };

const OUTLINE = [
  { hub: 'general', title: 'Roofing', children: [{ title: 'Roof Ventilation & Ice Prevention' }] },
  { hub: 'insurance', title: 'Matching & Line Items', children: [] },
];

/* ── a stand-in for api.anthropic.com that speaks real SSE ───────────────── */
const seen = [];
function sse(obj) { return 'event: ' + obj.type + '\ndata: ' + JSON.stringify(obj) + '\n\n'; }
function streamBody(text, stopReason) {
  return sse({ type: 'message_start', message: { id: 'msg_gate', type: 'message', role: 'assistant',
        model: 'claude-opus-5', content: [], stop_reason: null, stop_sequence: null,
        usage: { input_tokens: 1200, output_tokens: 1 } } })
    + sse({ type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } })
    + sse({ type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text } })
    + sse({ type: 'content_block_stop', index: 0 })
    + sse({ type: 'message_delta', delta: { stop_reason: stopReason, stop_sequence: null },
            usage: { output_tokens: 600 } })
    + sse({ type: 'message_stop' });
}

let NEXT = { text: '{}', stop: 'end_turn' };
const server = http.createServer((req, res) => {
  let body = '';
  req.on('data', c => { body += c; });
  req.on('end', () => {
    if (req.url.includes('/auth/v1/user')) {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ email: 'theo@cardinalrenovations.net' }));
      return;
    }
    try { seen.push(JSON.parse(body)); } catch (e) { seen.push({ __unparseable: body.slice(0, 200) }); }
    res.writeHead(200, { 'content-type': 'text/event-stream' });
    res.end(streamBody(NEXT.text, NEXT.stop));
  });
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const PORT = server.address().port;
const BASE = 'http://127.0.0.1:' + PORT;

process.env.ANTHROPIC_API_KEY = 'sk-ant-gate-not-a-real-key';
process.env.ANTHROPIC_BASE_URL = BASE;
process.env.SUPABASE_URL = BASE;
process.env.GEMINI_API_KEY = 'gate-not-a-real-key';
delete process.env.OPENAI_API_KEY;   /* the old route's third rung must stay off */

/* ── run a handler and capture exactly what it would send to the browser ─── */
function mkRes() {
  const r = { code: 0, body: null, sent: false };
  r.status = c => { r.code = c; return r; };
  r.json = b => { r.body = b; r.sent = true; return r; };
  return r;
}
async function call(handler, payload) {
  const res = mkRes();
  await handler({ method: 'POST', headers: { authorization: 'Bearer t' }, body: payload }, res);
  return res;
}

/* The old route talks to Gemini over global fetch. Same answer, its shape. */
function geminiFetch(out) {
  return async (url, opts) => {
    const u = String(url);
    if (u.includes('/auth/v1/user'))
      return { ok: true, json: async () => ({ email: 'theo@cardinalrenovations.net' }) };
    return { ok: true, status: 200, json: async () => ({
      candidates: [{ content: { parts: [{ text: JSON.stringify(out) }] } }] }) };
  };
}

const { default: newHandler } = await import(TARGET);
const { default: oldHandler } = await import(OLD);
const realFetch = globalThis.fetch;

/* When TARGET is the old route (the negative control) it would otherwise put a
   real request on the wire to Google and go red with "API key not valid" —
   which is red for the wrong reason, and offline it would be red for a third
   reason again. Intercept just that host and answer it properly, so the
   control fails on what this build actually changed and nothing else. */
globalThis.fetch = async (url, opts) => {
  if (String(url).includes('generativelanguage.googleapis.com'))
    return { ok: true, status: 200, json: async () => ({
      candidates: [{ content: { parts: [{ text: NEXT.text }] } }] }) };
  return realFetch(url, opts);
};
const baseFetch = globalThis.fetch;

async function bothWays(payload, out) {
  NEXT = { text: JSON.stringify(out), stop: 'end_turn' };
  seen.length = 0;
  const fresh = await call(newHandler, payload);
  const req = seen.length ? seen[seen.length - 1] : null;

  globalThis.fetch = geminiFetch(out);
  const prior = await call(oldHandler, payload);
  globalThis.fetch = baseFetch;

  return { fresh, prior, req };
}

/* ── 1. a question: the path all 21 real library entries came through ────── */
const ask = await bothWays({ ask: 'How far in does ice barrier go?', sections: OUTLINE }, ASK_OUT);

chk('ask: answered 200', ask.fresh.code === 200, 'code=' + ask.fresh.code + ' ' + JSON.stringify(ask.fresh.body).slice(0, 160));
chk('ask: the browser gets byte-identical JSON to the Gemini route',
    JSON.stringify(ask.fresh.body) === JSON.stringify(ask.prior.body),
    'new=' + JSON.stringify(ask.fresh.body).slice(0, 200) + ' old=' + JSON.stringify(ask.prior.body).slice(0, 200));
/* Named explicitly, because "identical" is only worth something if the fields
   index.html actually reads are present and populated. */
for (const k of ['belongs','reason','hub','section','section_is_new','subsection',
                 'subsection_is_new','title','summary','body','sources'])
  chk('ask: field "' + k + '" present', ask.fresh.body && k in ask.fresh.body);
chk('ask: sources still sanitised (blank/short/null dropped)',
    JSON.stringify(ask.fresh.body && ask.fresh.body.sources)
      === JSON.stringify(['2019 RCO R905.1.2', 'Owens Corning installation instructions']),
    JSON.stringify(ask.fresh.body && ask.fresh.body.sources));
chk('ask: the diagram marker survives untouched',
    typeof ask.fresh.body?.body === 'string' && ask.fresh.body.body.includes('\n~~stack\n'));

/* ── 2. the request the SDK really put on the wire ───────────────────────── */
const r = ask.req || {};
chk('request: reached the Anthropic endpoint at all', !!ask.req);
chk('request: model is claude-opus-5', r.model === 'claude-opus-5', r.model);
chk('request: output is schema-enforced, not asked for politely',
    r.output_config?.format?.type === 'json_schema', JSON.stringify(r.output_config?.format?.type));
chk('request: the schema is closed and requires body + sources',
    r.output_config?.format?.schema?.additionalProperties === false &&
    (r.output_config?.format?.schema?.required || []).includes('body') &&
    (r.output_config?.format?.schema?.required || []).includes('sources'),
    JSON.stringify(r.output_config?.format?.schema?.required));
chk('request: effort is set', typeof r.output_config?.effort === 'string', r.output_config?.effort);
chk('request: the standing brief is a cacheable system prefix',
    Array.isArray(r.system) && r.system[0]?.cache_control?.type === 'ephemeral');
chk('request: the volatile half (shelf + question) is the user turn, not the system prefix',
    typeof r.messages?.[0]?.content === 'string' &&
    r.messages[0].content.includes('The library currently looks like this:') &&
    r.messages[0].content.includes('How far in does ice barrier go?') &&
    !String(r.system?.[0]?.text || '').includes('How far in does ice barrier go?'));
/* The prompt fixes of 466/471/508/510 are the asset here, not the transport. */
for (const [label, needle] of [
  ['the 510 diagram-marker rule', 'A marker must be the FIRST line of its own block'],
  ['the 471 photographs block',   '~~photos q=ice dam'],
  ['the 510 drawing fence',       'The test is whose it is, not whether it is a picture'],
  ['the never-guess-a-number rule','a wrong number in the library is worse than no entry'],
])
  chk('request: ' + label + ' is still in the prompt',
      String(r.system?.[0]?.text || '').includes(needle));
chk('request: streaming, so a long answer cannot hit an SDK timeout', r.stream === true, r.stream);

/* ── 3. illustrate and classify still answer in their own shapes ─────────── */
const ill = await bothWays({ illustrate: { title: 'Ice barrier', body: 'It goes 24in inside the wall line.' } }, ILL_OUT);
chk('illustrate: answered 200', ill.fresh.code === 200, ill.fresh.code);
chk('illustrate: byte-identical to the Gemini route',
    JSON.stringify(ill.fresh.body) === JSON.stringify(ill.prior.body),
    JSON.stringify(ill.fresh.body));
chk('illustrate: no shelf leaks into a mode that has no sections',
    !String(seen[seen.length - 1]?.messages?.[0]?.content || '').includes('library currently looks like'));

const txt = await bothWays({ text: 'Ohio matching rules...', filename: 'match.txt', mime: 'text/plain', sections: OUTLINE }, CLASSIFY_OUT);
chk('text: answered 200', txt.fresh.code === 200, txt.fresh.code);
chk('text: byte-identical to the Gemini route',
    JSON.stringify(txt.fresh.body) === JSON.stringify(txt.prior.body),
    JSON.stringify(txt.fresh.body));
chk('text: classify schema carries no body/sources field',
    !(seen[seen.length - 1]?.output_config?.format?.schema?.properties || {}).body);

/* A PDF must go up as a document block, not as text. */
NEXT = { text: JSON.stringify(CLASSIFY_OUT), stop: 'end_turn' };
seen.length = 0;
const pdf = await call(newHandler, { file: 'JVBERi0xLjQK', mime: 'application/pdf', filename: 'spec.pdf', sections: OUTLINE });
const pdfReq = seen[seen.length - 1] || {};
chk('pdf: answered 200', pdf.code === 200, pdf.code + ' ' + JSON.stringify(pdf.body).slice(0, 120));
chk('pdf: sent as a base64 document block',
    (pdfReq.messages?.[0]?.content || []).some(b => b.type === 'document'
      && b.source?.type === 'base64' && b.source?.media_type === 'application/pdf'),
    JSON.stringify((pdfReq.messages?.[0]?.content || []).map(b => b.type)));

/* ── 4. failures the crew has to be able to read ─────────────────────────── */
NEXT = { text: JSON.stringify(ASK_OUT), stop: 'max_tokens' };
const cut = await call(newHandler, { ask: 'Write me everything', sections: OUTLINE });
chk('truncation is reported, not parsed into half an object',
    cut.code === 502 && /cut off/.test(String(cut.body?.error)), cut.code + ' ' + JSON.stringify(cut.body));

NEXT = { text: '', stop: 'refusal' };
const ref = await call(newHandler, { ask: 'something declined', sections: OUTLINE });
chk('a refusal says so rather than failing to parse ""',
    ref.code === 502 && /declined/.test(String(ref.body?.error)), ref.code + ' ' + JSON.stringify(ref.body));

/* The key check kept its old shape, so the existing "not configured" path
   still renders the same way. */
const savedKey = process.env.ANTHROPIC_API_KEY;
process.env.ANTHROPIC_API_KEY = '';
const nokey = await call(newHandler, { ask: 'x', sections: OUTLINE });
process.env.ANTHROPIC_API_KEY = savedKey;
chk('a missing key is a 500 that names the variable',
    nokey.code === 500 && /ANTHROPIC_API_KEY/.test(String(nokey.body?.error)),
    nokey.code + ' ' + JSON.stringify(nokey.body));

/* ── 5. the ladder is gone, and stays gone ───────────────────────────────── */
const src = await import('fs').then(m => m.readFileSync(TARGET, 'utf8'));
chk('no Gemini endpoint left in the route', !src.includes('generativelanguage.googleapis.com'));
chk('no OpenAI rung left in the route', !src.includes('api.openai.com'));
/* Assert on the READ, not the name. The first version of this line said
   !src.includes('OPENAI_API_KEY') and went red against a correct file, because
   the route's own header comment says the key is no longer read. That is the
   comment-pollution trap this project keeps paying for; the fix is the
   assertion, never the comment. */
chk('OPENAI_API_KEY is no longer read', !src.includes('process.env.OPENAI_API_KEY'));
chk('the ```-strip is gone (it would corrupt a body containing a fence)',
    !src.includes("replace(/```json|```/g"));

server.close();
let fails = 0;
for (const c of checks) { if (!c.pass) fails++; console.log((c.pass ? '  PASS  ' : '  FAIL  ') + c.n + (c.d ? ('   [' + c.d + ']') : '')); }
console.log(fails ? ('RED — ' + fails + ' of ' + checks.length + ' failed')
                  : ('GREEN — ' + checks.length + '/' + checks.length));
process.exit(fails ? 1 : 0);
