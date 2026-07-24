// api/coach.js  [v3 · 2026-07-24]
// ═════════════════════════════════════════════════════════════════════
// Objection Coach — grade a rep's answer against the ideal response
// using Gemini. Returns { score, ideal, feedback: { verdict, strengths,
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

const GEMINI_MODEL = 'gemini-2.0-flash-exp';
const GEMINI_URL   = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

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
  const cardCategory   = pick(card, ['category', 'topic', 'section', 'group']);
  const cardDifficulty = pick(card, ['difficulty', 'level']) || 2;
  const cardQuote      = pick(card, ['quote', 'question', 'objection', 'title', 'prompt']);
  const cardContext    = pick(card, ['context', 'scenario', 'setting', 'notes', 'description']);
  const cardIdeal      = pick(card, ['ideal_response', 'ideal', 'answer', 'response', 'model_answer', 'good_answer']);
  const cardRubric     = card.rubric || card.criteria || card.looks_for || {};

  if (!cardQuote || !cardIdeal) {
    return res.status(500).json({
      error: 'Card schema unrecognized',
      hint: 'The objections row is missing a quote/question and/or ideal response field. Check the column names in your objections table.',
      row_columns: Object.keys(card),
    });
  }

  // 3. Build the Gemini prompt
  const rubricItems = Array.isArray(cardRubric?.looks_for)
    ? cardRubric.looks_for
    : Array.isArray(cardRubric)
    ? cardRubric
    : [];
  const prompt =
    'You are a strict but fair sales coach grading a Cardinal Roofing sales rep\'s answer ' +
    'to a customer objection. You always respond with a single valid JSON object and nothing else.\n\n' +
    `CUSTOMER OBJECTION (category: ${cardCategory || 'general'}, difficulty: ${cardDifficulty}/3):\n"${cardQuote}"\n\n` +
    `CONTEXT: ${cardContext || 'General customer objection.'}\n\n` +
    `CARDINAL'S IDEAL RESPONSE:\n${cardIdeal}\n\n` +
    (rubricItems.length
      ? 'RUBRIC — what a great answer hits:\n- ' + rubricItems.join('\n- ') + '\n\n'
      : '') +
    `REP'S ANSWER:\n"${answer}"\n\n` +
    'Grade the rep\'s answer from 0 to 100 based on how well it:\n' +
    '1. Actually addresses the objection (doesn\'t dodge or change the subject)\n' +
    '2. Hits the rubric items above\n' +
    '3. Sounds natural — a real human talking to a homeowner, not a script\n' +
    '4. Would actually work in the field with a skeptical customer\n\n' +
    'Be honest. A wooden or manipulative answer should score low even if it hits the rubric. ' +
    'A creative answer that hits the rubric in unexpected ways should score high. ' +
    'Ideal responses match or beat the reference and score 85+.\n\n' +
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

  // 4. Call Gemini
  let parsed;
  try {
    const gemResp = await fetch(`${GEMINI_URL}?key=${encodeURIComponent(GEMINI_KEY)}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.4,
          responseMimeType: 'application/json',
        },
      }),
    });
    if (!gemResp.ok) {
      const errText = await gemResp.text().catch(() => '');
      return res.status(502).json({ error: 'Gemini error: ' + errText.slice(0, 200) });
    }
    const gem = await gemResp.json();
    const text = gem?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    parsed = JSON.parse(text);
  } catch (e) {
    return res.status(502).json({ error: 'Grading failed: ' + e.message });
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
  });
}
