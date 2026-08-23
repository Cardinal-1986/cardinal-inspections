// api/coach.js  [v9 · 2026-07-24]
// ═════════════════════════════════════════════════════════════════════
// Objection Coach — grade a rep's answer against the ideal response.
// Returns { score, ideal, feedback: { verdict, strengths, gaps, fix },
// _graded_by } to match what the client (CardinalCoach) expects.
//
// AI backend ladder (mirrors Cardinal's analyze.js / caption.js pattern):
//   1. Gemini 3.5 Flash — primary. Retries 503 twice with backoff.
//   2. OpenAI gpt-4o-mini — automatic fallback if Gemini errors.
//
// So the coach keeps working through Gemini load spikes, model
// deprecations, or key issues, as long as either provider is healthy.
//
// v9: Added OpenAI backup, kept Gemini retry, added _graded_by tag.
// v8: Model → gemini-3.5-flash (2.x sunset).
// v5: Uses x-goog-api-key HEADER (required for new AQ.-format keys).
// v4: Recognizes `objection` column, tolerates missing ideal_response.
// gaps, fix } } to match what the client (CardinalCoach) expects.
//
// REQUIRES these Vercel env vars:
//   GEMINI_API_KEY              — Google AI Studio key with billing on
//   SUPABASE_URL                — e.g. https://yipslubcptjoarblzbpl.supabase.co
//   SUPABASE_ANON_KEY           — public anon key (already in index.html)
//   SUPABASE_SERVICE_ROLE_KEY   — sensitive, from Supabase → Settings → API
//
// The service-role key lets this function read the objection card and
// save the attempt row even if RLS is set strict. RLS on the attempts
// table only allows self-writes when using user tokens, but by using
// the service role from a trusted server (Vercel) we can safely record
// the attempt with any user_email we verify.
//
// Per project rules: ES module, `export default async function handler`.
// ═════════════════════════════════════════════════════════════════════

const GEMINI_MODEL = 'gemini-3.5-flash';
const GEMINI_URL   = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

import { isStaff } from './_staff.js';
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' });
  }

  const { objection_id, answer } = (req.body || {});
  if (!objection_id || typeof objection_id !== 'string') {
    return res.status(400).json({ error: 'objection_id required' });
  }
  if (!answer || typeof answer !== 'string' || answer.trim().length < 15) {
    return res.status(400).json({ error: 'answer required (min 15 chars)' });
  }

  const authHeader = req.headers.authorization || '';
  const userToken = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!userToken) return res.status(401).json({ error: 'Not signed in' });

  const SUPABASE_URL_RAW = (process.env.SUPABASE_URL || '').trim();
  // Normalize: prepend https:// if the user pasted a bare hostname, and
  // strip any trailing slash so URL concatenation stays clean.
  const SUPABASE_URL = SUPABASE_URL_RAW
    ? (SUPABASE_URL_RAW.match(/^https?:\/\//i) ? SUPABASE_URL_RAW : 'https://' + SUPABASE_URL_RAW).replace(/\/+$/, '')
    : '';
  const ANON_KEY     = (process.env.SUPABASE_ANON_KEY || '').trim();
  const SERVICE_KEY  = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  const GEMINI_KEY   = (process.env.GEMINI_API_KEY || '').trim();

  if (!SUPABASE_URL || !ANON_KEY || !SERVICE_KEY) {
    return res.status(500).json({ error: 'Supabase env not configured' });
  }
  if (!GEMINI_KEY) return res.status(500).json({ error: 'GEMINI_API_KEY not set' });

  // 1. Verify the user's token
  let userEmail;
  try {
    const userResp = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { authorization: `Bearer ${userToken}`, apikey: ANON_KEY },
    });
    if (!userResp.ok) return res.status(401).json({ error: 'Invalid session' });
    const user = await userResp.json();
    userEmail = user?.email;
    if (!userEmail) return res.status(401).json({ error: 'No email in session' });
    if (!isStaff(userEmail)) return res.status(403).json({ error: 'Cardinal staff only' });
  } catch (e) {
    return res.status(502).json({ error: 'Auth check failed: ' + e.message });
  }

  // 2. Fetch the objection card (service-role bypasses RLS).
  // We select * because the objections table schema may vary — an earlier
  // module version used {title, question, answer} while our SQL uses
  // {quote, ideal_response}. Grab everything, then pick fields by name.
  let card;
  const cardUrl = `${SUPABASE_URL}/rest/v1/objections?id=eq.${encodeURIComponent(objection_id)}&select=*`;
  try {
    const cardResp = await fetch(
      cardUrl,
      { headers: { apikey: SERVICE_KEY, authorization: `Bearer ${SERVICE_KEY}` } }
    );
    if (!cardResp.ok) {
      const detail = (await cardResp.text().catch(() => '')).slice(0, 300);
      // Fold everything into the top-level error string so it shows up in
      // the client toast (the client only reads .error, not .supabase_said).
      return res.status(502).json({
        error:
          `[v3] HTTP ${cardResp.status} from Supabase. ` +
          `Body: ${detail || '(empty)'}. ` +
          `URL: ${cardUrl.replace(/([?&]apikey=)[^&]+/, '$1REDACTED')}`,
      });
    }
    const rows = await cardResp.json();
    card = rows[0];
    if (!card) return res.status(404).json({
      error: `No objection with id ${objection_id} in the deck. Table exists but the id from the client doesn't match a row.`,
    });
  } catch (e) {
    return res.status(502).json({ error: 'Card lookup network error: ' + e.message });
  }

  // Normalize field names — different schema versions of the objections
  // table use different column names for the same concept.
  const pick = (row, keys) => {
    for (const k of keys) if (row[k] != null && row[k] !== '') return row[k];
    return '';
  };
  const cardCategory   = pick(card, ['category', 'topic', 'section', 'group', 'type']);
  const cardDifficulty = pick(card, ['difficulty', 'level', 'tier']) || 2;
  const cardQuote      = pick(card, ['objection', 'quote', 'question', 'title', 'prompt', 'homeowner_says', 'customer_says']);
  const cardContext    = pick(card, ['context', 'scenario', 'setting', 'notes', 'description', 'situation', 'background']);
  const cardIdeal      = pick(card, [
    'ideal_response', 'ideal_answer', 'ideal', 'answer', 'response',
    'model_answer', 'good_answer', 'ideal_line', 'sample_response',
    'best_response', 'reply', 'suggested_response', 'coach_response',
  ]);
  const cardRubric     = card.rubric || card.criteria || card.looks_for || card.grading_notes || {};

  // Only fail if we can't even get the QUESTION. Grading works without an
  // ideal reference — Gemini can score against general sales principles.
  if (!cardQuote) {
    return res.status(500).json({
      error:
        `[v4] Objections row has no recognized question field. ` +
        `Row columns: ${Object.keys(card).join(', ')}. ` +
        `Expected one of: objection, quote, question, title, prompt.`,
    });
  }

  // 3. Build the Gemini prompt
  const rubricItems = Array.isArray(cardRubric?.looks_for)
    ? cardRubric.looks_for
    : Array.isArray(cardRubric)
    ? cardRubric
    : [];
  const idealBlock = cardIdeal
    ? `CARDINAL'S IDEAL RESPONSE (the reference to grade against):\n${cardIdeal}\n\n`
    : `NOTE: No reference response is stored for this card — grade against general roofing-sales best practices.\n\n`;
  const prompt =
    'You are a strict but fair sales coach grading a Cardinal Roofing sales rep\'s answer ' +
    'to a customer objection. You always respond with a single valid JSON object and nothing else.\n\n' +
    `CUSTOMER OBJECTION (category: ${cardCategory || 'general'}, difficulty: ${cardDifficulty}/3):\n"${cardQuote}"\n\n` +
    `CONTEXT: ${cardContext || 'General customer objection.'}\n\n` +
    idealBlock +
    (rubricItems.length
      ? 'RUBRIC — what a great answer hits:\n- ' + rubricItems.join('\n- ') + '\n\n'
      : '') +
    `REP'S ANSWER:\n"${answer}"\n\n` +
    'Grade the rep\'s answer from 0 to 100 based on how well it:\n' +
    '1. Actually addresses the objection (doesn\'t dodge or change the subject)\n' +
    '2. Acknowledges the homeowner\'s concern without being defensive\n' +
    '3. Sounds natural — a real human talking to a homeowner, not a script\n' +
    '4. Ends with a question or clear next step\n' +
    '5. Would actually work in the field with a skeptical customer\n\n' +
    'Be honest. A wooden or manipulative answer should score low. ' +
    'A creative answer that addresses the objection in unexpected but effective ways should score high. ' +
    'A one-line dismissive reply ("Yea probably so") is a clear zero — no acknowledgment, no substance, no question.\n\n' +
    'Respond ONLY with this JSON structure:\n' +
    '{\n' +
    '  "score": <integer 0-100>,\n' +
    '  "feedback": {\n' +
    '    "verdict": "<one sentence overall take>",\n' +
    '    "strengths": ["<what worked>", "..."],\n' +
    '    "gaps": ["<what was missing or weak>", "..."],\n' +
    '    "fix": "<one short paragraph — the single most important thing to change>"\n' +
    '  }\n' +
    '}';

  // ─────────────────────────────────────────────────────────────
  // 4. Grade — try Gemini first, fall back to OpenAI on failure.
  // ─────────────────────────────────────────────────────────────

  const OPENAI_KEY = (process.env.OPENAI_API_KEY || '').trim();

  // Try Gemini 3.5 Flash. Retries transient 503 (Google's "high demand"
  // response) twice with backoff before giving up. Returns parsed JSON
  // on success, or throws with the last error text.
  async function tryGemini() {
    const call = () => fetch(GEMINI_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-goog-api-key': GEMINI_KEY,
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.4,
          responseMimeType: 'application/json',
        },
      }),
    });
    let r = await call();
    if (r.status === 503) { await new Promise(x => setTimeout(x, 1500)); r = await call(); }
    if (r.status === 503) { await new Promise(x => setTimeout(x, 3000)); r = await call(); }
    if (!r.ok) throw new Error(`Gemini ${r.status}: ${(await r.text()).slice(0, 200)}`);
    const gem = await r.json();
    const text = gem?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return JSON.parse(text);
  }

  // OpenAI fallback. Uses gpt-4o-mini for cheap, fast JSON grading —
  // matches the pattern used by analyze.js and caption.js. Response
  // format is forced to JSON so we don't have to strip fences.
  async function tryOpenAI() {
    if (!OPENAI_KEY) throw new Error('OpenAI backup not configured');
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${OPENAI_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.4,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: 'You are a strict but fair sales coach. Respond only with valid JSON.' },
          { role: 'user', content: prompt },
        ],
      }),
    });
    if (!r.ok) throw new Error(`OpenAI ${r.status}: ${(await r.text()).slice(0, 200)}`);
    const oai = await r.json();
    const text = oai?.choices?.[0]?.message?.content || '';
    return JSON.parse(text);
  }

  let parsed = null;
  let usedBackend = 'gemini';
  let geminiError = null;
  try {
    parsed = await tryGemini();
  } catch (e) {
    geminiError = e.message;
  }
  if (!parsed) {
    try {
      parsed = await tryOpenAI();
      usedBackend = 'openai';
    } catch (openaiError) {
      return res.status(502).json({
        error:
          `[v9] Both AI providers failed. ` +
          `Gemini: ${geminiError || 'skipped'}. ` +
          `OpenAI: ${openaiError.message}.`,
      });
    }
  }

  const score = Math.max(0, Math.min(100, parseInt(parsed.score, 10) || 0));
  const feedback = parsed.feedback && typeof parsed.feedback === 'object' ? parsed.feedback : {};

  // 5. Save the attempt (fire-and-forget)
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/objection_attempts`, {
      method: 'POST',
      headers: {
        apikey: SERVICE_KEY,
        authorization: `Bearer ${SERVICE_KEY}`,
        'content-type': 'application/json',
        prefer: 'return=minimal',
      },
      body: JSON.stringify({
        objection_id,
        user_email: userEmail,
        answer,
        score,
        feedback,
      }),
    });
  } catch (_) {
    // Non-fatal — grading result still returns to the client
  }

  return res.status(200).json({
    score,
    ideal: cardIdeal,
    feedback,
    _graded_by: usedBackend,   // 'gemini' | 'openai' — informational
  });
}
