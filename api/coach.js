// api/coach.js
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

  const SUPABASE_URL = (process.env.SUPABASE_URL || '').trim();
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

  // 2. Fetch the objection card (service-role bypasses RLS)
  let card;
  try {
    const cardResp = await fetch(
      `${SUPABASE_URL}/rest/v1/objections?id=eq.${encodeURIComponent(objection_id)}&select=id,category,difficulty,quote,context,ideal_response,rubric`,
      { headers: { apikey: SERVICE_KEY, authorization: `Bearer ${SERVICE_KEY}` } }
    );
    if (!cardResp.ok) {
      const detail = await cardResp.text().catch(() => '');
      return res.status(502).json({
        error: `Card fetch failed: HTTP ${cardResp.status}`,
        supabase_said: detail.slice(0, 400),
        hint: cardResp.status === 401
          ? 'SUPABASE_SERVICE_ROLE_KEY is wrong or missing — check Vercel env vars'
          : cardResp.status === 404
          ? 'objections table not found — run objection_coach_setup.sql in Supabase'
          : cardResp.status === 400
          ? 'Query rejected — usually a bad SUPABASE_URL (needs https://, no trailing slash)'
          : undefined,
      });
    }
    const rows = await cardResp.json();
    card = rows[0];
    if (!card) return res.status(404).json({
      error: 'Objection card not found',
      hint: 'The client sent an objection_id that isn\'t in the seeded deck. Re-run objection_coach_setup.sql and reload the app.',
      objection_id,
    });
  } catch (e) {
    return res.status(502).json({ error: 'Card lookup failed: ' + e.message });
  }

  // 3. Build the Gemini prompt
  const rubricItems = Array.isArray(card.rubric?.looks_for) ? card.rubric.looks_for : [];
  const prompt =
    'You are a strict but fair sales coach grading a Cardinal Roofing sales rep\'s answer ' +
    'to a customer objection. You always respond with a single valid JSON object and nothing else.\n\n' +
    `CUSTOMER OBJECTION (category: ${card.category}, difficulty: ${card.difficulty}/3):\n"${card.quote}"\n\n` +
    `CONTEXT: ${card.context || 'General customer objection.'}\n\n` +
    `CARDINAL'S IDEAL RESPONSE:\n${card.ideal_response}\n\n` +
    'RUBRIC — what a great answer hits:\n- ' + rubricItems.join('\n- ') + '\n\n' +
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
    ideal: card.ideal_response,
    feedback,
  });
}
