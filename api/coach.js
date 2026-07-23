// api/coach.js
// ─────────────────────────────────────────────────────────────
// Objection Coach — grades a rep's answer against Cardinal's own
// word track and returns specific, actionable feedback.
//
// POST { objection_id, answer }
//   -> { score, feedback:{strengths[],gaps[],fix,verdict}, ideal, attempt_id }
//
// Uses the same provider ladder as estimate.js:
//   gemini-3.5-flash -> 1.2s wait -> gemini-2.5-flash -> gpt-4o-mini
//
// ES MODULE — api/package.json has "type":"module".
// ─────────────────────────────────────────────────────────────

import { createClient } from '@supabase/supabase-js';

export const config = { maxDuration: 30, regions: ['iad1'] };

const GEMINI_KEY   = (process.env.GEMINI_API_KEY || '').trim();
const OPENAI_KEY   = (process.env.OPENAI_API_KEY || '').trim();
const SUPABASE_URL = (process.env.SUPABASE_URL || 'https://yipslubcptjoarblzbpl.supabase.co').trim();
const SUPABASE_SRV = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

const GEMINI_MODELS = ['gemini-3.5-flash', 'gemini-2.5-flash'];
const RETRY_WAIT_MS = 1200;
const GEMINI_URL    = (m) => `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`;
const ROSTER_DOMAIN = '@cardinalrenovations.net';

const MIN_ANSWER = 15;
const MAX_ANSWER = 2000;

// ═══ Prompt ══════════════════════════════════════════════════
function buildPrompt({ category, objection, ideal, proTip, answer }) {
  return `
You are a sales coach for Cardinal Roofing & Renovations, a roofing, siding and window contractor in Dayton, Ohio. You are grading one rep's spoken response to a homeowner objection during a role-play drill.

Cardinal's method: acknowledge the objection honestly, reframe it around something concrete the homeowner can verify, and end on a question that hands control back to the rep. Never a memorised script. Never pressure. Never anything that would be illegal in Ohio (for example, waiving or absorbing an insurance deductible).

CATEGORY: ${category}

THE OBJECTION THE HOMEOWNER RAISED:
"${objection}"

CARDINAL'S REFERENCE WORD TRACK (the target, not the only right answer):
"${ideal}"
${proTip ? `\nWHY THAT WORKS: ${proTip}` : ''}

THE REP ACTUALLY SAID:
"${answer}"

GRADE IT. Rules:
1. Score 0-100. Be a real coach, not a cheerleader — a generic or defensive answer should land in the 40s, a solid answer in the 70s, an answer that acknowledges + reframes + ends on a question in the high 80s or 90s. Reserve 95+ for genuinely excellent.
2. A different approach than the reference can still score high if it acknowledges honestly, gives the homeowner something concrete, and keeps control. Do NOT reward mere paraphrasing of the reference.
3. Penalise heavily: arguing with the homeowner, discounting to escape the objection, vague "you get what you pay for" filler, anything legally risky, and any answer that does not end with a question.
4. "fix" must be ONE specific sentence the rep could say differently next time — actual words, not advice about words.
5. Keep every string short. strengths/gaps are at most 2 items each, one short clause per item.
6. Return ONLY valid JSON matching the schema. No markdown, no code fences, no preamble.

SCHEMA:
{
  "score": 0,
  "verdict": "one short line, max 12 words",
  "strengths": ["..."],
  "gaps": ["..."],
  "fix": "one sentence the rep could actually say",
  "ended_with_question": true
}
`.trim();
}

// ═══ Providers ═══════════════════════════════════════════════
async function callGemini(model, prompt) {
  const r = await fetch(GEMINI_URL(model), {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': GEMINI_KEY },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3,
        responseMimeType: 'application/json',
        maxOutputTokens: 900,
      },
    }),
  });
  if (!r.ok) {
    const t = await r.text().catch(() => '');
    throw new Error(`Gemini ${model} -> ${r.status} ${t.slice(0, 160)}`);
  }
  const data = await r.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  if (!text) throw new Error(`Gemini ${model} -> empty`);
  return text;
}

async function callOpenAI(prompt) {
  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { authorization: `Bearer ${OPENAI_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You output only valid JSON matching the schema in the user message. No prose, no code fences.' },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    }),
  });
  if (!r.ok) {
    const t = await r.text().catch(() => '');
    throw new Error(`OpenAI -> ${r.status} ${t.slice(0, 160)}`);
  }
  const data = await r.json();
  return data?.choices?.[0]?.message?.content || '';
}

// ═══ HANDLER ═════════════════════════════════════════════════
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const jwt = (req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
  if (!jwt) return res.status(401).json({ error: 'No session' });

  const supa = createClient(SUPABASE_URL, SUPABASE_SRV, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: userRes, error: authErr } = await supa.auth.getUser(jwt);
  if (authErr || !userRes?.user) return res.status(401).json({ error: 'Invalid session' });
  const repEmail = userRes.user.email || '';
  if (!repEmail.endsWith(ROSTER_DOMAIN)) return res.status(403).json({ error: 'Not on the roster' });

  const { objection_id, answer } = req.body || {};
  if (!objection_id) return res.status(400).json({ error: 'objection_id required' });
  const ans = String(answer || '').trim();
  if (ans.length < MIN_ANSWER) return res.status(400).json({ error: `Give it a real shot — at least ${MIN_ANSWER} characters.` });
  if (ans.length > MAX_ANSWER) return res.status(400).json({ error: 'Answer too long' });

  // Load the card
  const { data: card, error: cardErr } = await supa
    .from('objections')
    .select('id, category, objection, response, pro_tip')
    .eq('id', objection_id)
    .single();
  if (cardErr || !card) return res.status(404).json({ error: 'Objection not found' });

  const t0 = Date.now();
  const prompt = buildPrompt({
    category: card.category,
    objection: card.objection,
    ideal: card.response,
    proTip: card.pro_tip,
    answer: ans,
  });

  // Provider ladder
  let raw = null, modelUsed = null, lastErr = null;
  for (let i = 0; i < GEMINI_MODELS.length; i++) {
    try {
      raw = await callGemini(GEMINI_MODELS[i], prompt);
      modelUsed = GEMINI_MODELS[i];
      break;
    } catch (e) {
      lastErr = e;
      console.warn(`[coach] ${GEMINI_MODELS[i]} failed: ${e.message}`);
      if (i === 0) await new Promise((r) => setTimeout(r, RETRY_WAIT_MS));
    }
  }
  if (!raw) {
    try {
      raw = await callOpenAI(prompt);
      modelUsed = 'openai:gpt-4o-mini';
    } catch (e) {
      return res.status(502).json({ error: 'Coach unavailable', detail: `${lastErr?.message || ''} | ${e.message}` });
    }
  }

  let g;
  try { g = JSON.parse(raw); }
  catch { return res.status(502).json({ error: 'Coach returned invalid JSON', raw_preview: String(raw).slice(0, 300) }); }

  // Clamp + normalise
  const score = Math.max(0, Math.min(100, Math.round(Number(g.score) || 0)));
  const feedback = {
    verdict:   String(g.verdict || '').slice(0, 140),
    strengths: (Array.isArray(g.strengths) ? g.strengths : []).slice(0, 3).map(s => String(s).slice(0, 180)),
    gaps:      (Array.isArray(g.gaps)      ? g.gaps      : []).slice(0, 3).map(s => String(s).slice(0, 180)),
    fix:       String(g.fix || '').slice(0, 400),
    ended_with_question: !!g.ended_with_question,
  };

  const latency = Date.now() - t0;

  const { data: saved } = await supa
    .from('objection_attempts')
    .insert({
      rep_email: repEmail,
      objection_id: card.id,
      objection_snapshot: card.objection,
      answer: ans,
      score,
      feedback,
      model_used: modelUsed,
      latency_ms: latency,
    })
    .select('id')
    .single();

  return res.status(200).json({
    attempt_id: saved?.id || null,
    score,
    feedback,
    ideal: card.response,
    pro_tip: card.pro_tip,
    model_used: modelUsed,
    latency_ms: latency,
  });
}
