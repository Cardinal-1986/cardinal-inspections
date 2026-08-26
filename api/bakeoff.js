// /api/bakeoff.js  [1073]
// ═══════════════════════════════════════════════════════════════════════════
// THE ACCURACY BAKE-OFF — /api/ai-status, but for whether the answer is RIGHT.
//
// WHY THIS EXISTS. Theo asked which AI is best at spotting issues in
// photographs. The honest answer was that nobody here had ever measured it:
// every model decision on this project (500-505, 806, 1072) was made on
// latency, uptime or reporting. `ai-status` answers "is it up". Nothing
// answered "is it right", and roofing is narrow enough that a public benchmark
// would not transfer — the only evidence that counts is Cardinal's own roofs.
//
// ⚠ AND THERE IS NO LABELLED SET TO SCORE AGAINST. Measured before building:
//   walk_shots is EMPTY (The Walk has never been used), project_photos has 217
//   rows and ZERO captions, and of 23 inspection reports only 3 carry the
//   data-ai-summary marker that would separate a person's words from a model's.
//   So precision/recall against a ground truth is not available at any price
//   short of Theo labelling by hand.
//
//   This measures the thing that IS available and that he actually asked:
//   given the same photograph and the same question, whose answer is better.
//   Blind, side by side, one tap. That is how open-ended output is really
//   evaluated, and it costs him a tap instead of a taxonomy.
//
// ⚠ BLINDING IS LOAD-BEARING, AND IT IS DONE IN THE BROWSER. This route
//   returns the model name with each answer, because the browser needs it to
//   unblind afterwards. bakeoff.html shuffles and hides. A route that withheld
//   the name would only move the shuffle server-side and make the tally
//   impossible to check.
//
// ADMIN ONLY, server-side, same gate as api/supplement.js. It spends the AI
// keys N times per photograph, so it is not a route to leave open — and
// CLAUDE.md records /api/notify shipping PUBLIC until 642. Every new route is
// public until its own gate says otherwise.
// ═══════════════════════════════════════════════════════════════════════════
import { isStaff } from './_staff.js';

const SUPABASE_URL = (process.env.SUPABASE_URL || 'https://yipslubcptjoarblzbpl.supabase.co').trim();
const SUPABASE_ANON_KEY = (process.env.SUPABASE_ANON_KEY || 'sb_publishable_aGsug3EBJjHX90BLKd5bLQ_zryUMqNZ').trim();
const STORAGE_PREFIX = SUPABASE_URL + '/storage/v1/';

/* The candidates. Adding one is a line here and nothing else.
   ⚠ gemini-3.1-pro is deliberately ABSENT: probed live on 26 Aug it answers
     404 "not found for API version v1beta" for this key. Listing a model the
     key cannot call would produce a column of errors that reads like a model
     being bad at roofs. */
const CANDIDATES = [
  { id: 'gemini-3.6-flash', vendor: 'google' },
  { id: 'gemini-3.5-flash', vendor: 'google' },
  { id: 'gpt-4o-mini',      vendor: 'openai' },
  { id: 'claude-opus-5',    vendor: 'anthropic' },
];

/* ONE question, asked of every model identically. It is the app's real job —
   detect.js's task in free text — not a synthetic benchmark prompt. Kept
   deliberately open: a fixed taxonomy would score obedience to a format, and
   what is being compared is what the model SEES. */
const PROMPT =
  'You are a roof and exterior inspector looking at one photograph of a ' +
  'property in Ohio, taken by a contractor.\n\n' +
  'List what is wrong in this photograph. For each thing: name it in plain ' +
  'roofing terms, say where in the frame it is, and say how confident you are ' +
  '(high / medium / low).\n\n' +
  'Work only from what is visible. If you cannot see it, do not list it. ' +
  'If nothing is wrong, say so plainly — "no defects visible" is a real and ' +
  'useful answer and is worth more than an invention.\n\n' +
  'No preamble. No dollar amounts. Six findings at most, the most significant ' +
  'first.';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const TIME_BUDGET_MS = 50000;      /* 60s maxDuration, 10s headroom (the 662 rule) */

async function requireAdmin(req, res) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) { res.status(401).json({ error: 'Sign in required' }); return null; }
  const who = await fetch(SUPABASE_URL + '/auth/v1/user', {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: 'Bearer ' + token }
  });
  if (!who.ok) { res.status(401).json({ error: 'Invalid session' }); return null; }
  const user = await who.json();
  if (!user || !user.email) { res.status(401).json({ error: 'Invalid session' }); return null; }
  if (!isStaff(user.email)) { res.status(403).json({ error: 'Cardinal staff only' }); return null; }
  const adm = await fetch(SUPABASE_URL + '/rest/v1/rpc/is_cardinal_admin', {
    method: 'POST',
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: 'Bearer ' + token,
               'Content-Type': 'application/json' },
    body: '{}'
  });
  const isAdmin = adm.ok ? await adm.json() : false;
  if (isAdmin !== true) { res.status(403).json({ error: 'The bake-off is admin-only.' }); return null; }
  return user;
}

/* Same SSRF bound as api/supplement.js, and for the same reason: the caller
   hands us a URL, so it must be provably this project's own storage. */
function storageUrlOrNull(raw) {
  if (typeof raw !== 'string' || !raw) return null;
  let u;
  try { u = new URL(raw); } catch (e) { return null; }
  if (u.protocol !== 'https:') return null;
  if (u.origin !== new URL(SUPABASE_URL).origin) return null;
  if (!raw.startsWith(STORAGE_PREFIX)) return null;
  return raw;
}

async function askGoogle(model, b64, mime) {
  const key = (process.env.GEMINI_API_KEY || '').trim();
  if (!key) return { ok: false, text: 'GEMINI_API_KEY is not configured' };
  const r = await fetch(
    'https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent',
    { method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({ contents: [{ parts: [
        { inline_data: { mime_type: mime, data: b64 } }, { text: PROMPT }] }] }) });
  if (!r.ok) return { ok: false, text: 'HTTP ' + r.status + ': ' + (await r.text()).slice(0, 300) };
  const j = await r.json();
  const t = (((j.candidates || [])[0] || {}).content || {}).parts?.map(p => p.text).join('') || '';
  return t.trim() ? { ok: true, text: t.trim() } : { ok: false, text: 'returned no text' };
}

async function askOpenAI(model, b64, mime) {
  const key = (process.env.OPENAI_API_KEY || '').trim();
  if (!key) return { ok: false, text: 'OPENAI_API_KEY is not configured' };
  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key },
    body: JSON.stringify({ model, max_tokens: 1200, messages: [{ role: 'user', content: [
      { type: 'text', text: PROMPT },
      { type: 'image_url', image_url: { url: 'data:' + mime + ';base64,' + b64 } }] }] }) });
  if (!r.ok) return { ok: false, text: 'HTTP ' + r.status + ': ' + (await r.text()).slice(0, 300) };
  const j = await r.json();
  const t = j?.choices?.[0]?.message?.content || '';
  return t.trim() ? { ok: true, text: t.trim() } : { ok: false, text: 'returned no text' };
}

async function askAnthropic(model, b64, mime) {
  const key = (process.env.ANTHROPIC_API_KEY || '').trim();
  if (!key) return { ok: false, text: 'ANTHROPIC_API_KEY is not configured' };
  try {
    /* ⚠ LAZY, and not merely to make this testable. A top-level
       `import Anthropic from '@anthropic-ai/sdk'` means the SDK failing to
       resolve takes the WHOLE route down — including the Google and OpenAI
       columns, which need nothing from it. That would turn one missing
       dependency into "the bake-off is broken" instead of "one model could
       not be reached", and the entire point of this route is that a model
       failing must not sink the comparison (its own check A6). */
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    const client = new Anthropic({ apiKey: key, maxRetries: 1 });
    const msg = await client.messages.create({
      model, max_tokens: 1200,
      messages: [{ role: 'user', content: [
        { type: 'image', source: { type: 'base64', media_type: mime, data: b64 } },
        { type: 'text', text: PROMPT }] }] });
    const t = (msg.content || []).filter(c => c.type === 'text').map(c => c.text).join('').trim();
    return t ? { ok: true, text: t } : { ok: false, text: 'returned no text' };
  } catch (e) {
    return { ok: false, text: String((e && e.message) || e).slice(0, 300) };
  }
}

const ASK = { google: askGoogle, openai: askOpenAI, anthropic: askAnthropic };

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
  const user = await requireAdmin(req, res);
  if (!user) return;

  const t0 = Date.now();
  const elapsed = () => Date.now() - t0;

  try {
    const { mode, url, models } = req.body || {};

    /* ── which candidates can this deployment actually call? ──────────────
       Answered from the ENV, not assumed. A model whose key is missing is
       reported as unavailable with the reason, so "we never tested Claude"
       cannot quietly become "Claude did badly". */
    if (mode === 'probe') {
      res.status(200).json({
        candidates: CANDIDATES.map(c => ({
          ...c,
          available: c.vendor === 'google'    ? !!(process.env.GEMINI_API_KEY || '').trim()
                   : c.vendor === 'openai'    ? !!(process.env.OPENAI_API_KEY || '').trim()
                   : !!(process.env.ANTHROPIC_API_KEY || '').trim(),
          why: c.vendor === 'google'    ? (process.env.GEMINI_API_KEY ? '' : 'GEMINI_API_KEY not set')
             : c.vendor === 'openai'    ? (process.env.OPENAI_API_KEY ? '' : 'OPENAI_API_KEY not set')
             : (process.env.ANTHROPIC_API_KEY ? '' : 'ANTHROPIC_API_KEY not set')
        })),
        prompt: PROMPT
      });
      return;
    }

    if (mode !== 'run') { res.status(400).json({ error: 'Unknown mode — probe or run.' }); return; }

    const safe = storageUrlOrNull(url);
    if (!safe) { res.status(400).json({ error: 'That is not a photograph in this project\'s storage.' }); return; }

    const r0 = await fetch(safe);
    if (!r0.ok) { res.status(400).json({ error: 'Could not read that photograph (HTTP ' + r0.status + ').' }); return; }
    const buf = Buffer.from(await r0.arrayBuffer());
    if (!buf.length) { res.status(400).json({ error: 'That photograph is empty.' }); return; }
    if (buf.length > MAX_IMAGE_BYTES) {
      res.status(400).json({ error: 'That photograph is ' + (buf.length / 1048576).toFixed(1) +
        ' MB — over the 5 MB limit. Ask for a resized copy.' });
      return;
    }
    const b64 = buf.toString('base64');
    const mime = /\.png(\?|$)/i.test(safe) ? 'image/png' : 'image/jpeg';

    const want = Array.isArray(models) && models.length
      ? CANDIDATES.filter(c => models.includes(c.id))
      : CANDIDATES;
    if (!want.length) { res.status(400).json({ error: 'No known models requested.' }); return; }

    /* Concurrent on purpose — four sequential vision calls is the 499 mistake,
       and here it would also make the four share a latency budget so the last
       one looks slow. Each records its OWN wall time, which is the only
       latency number worth comparing. */
    const answers = await Promise.all(want.map(async c => {
      const s = Date.now();
      try {
        const out = await ASK[c.vendor](c.id, b64, mime);
        return { model: c.id, vendor: c.vendor, ok: out.ok, text: out.text, ms: Date.now() - s };
      } catch (e) {
        return { model: c.id, vendor: c.vendor, ok: false,
                 text: String((e && e.message) || e).slice(0, 300), ms: Date.now() - s };
      }
    }));

    res.status(200).json({
      answers,
      image_bytes: buf.length,
      ms: elapsed(),
      /* said out loud, because a run that quietly ran out of time and returned
         three of four answers would read as one model failing */
      near_budget: elapsed() > TIME_BUDGET_MS
    });
  } catch (err) {
    res.status(500).json({ error: String((err && err.message) || err) });
  }
}
