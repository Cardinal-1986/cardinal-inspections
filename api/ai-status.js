// api/ai-status.js  [v1 · 2026-07-24]
// ═════════════════════════════════════════════════════════════════════
// Health check for the AI provider ladder (Gemini + OpenAI backup).
// Makes a tiny test call to each configured provider and reports which
// ones are working. Safe to expose publicly — returns only ok/fail
// status per provider, never the keys themselves.
//
// Usage: visit https://app.cardinalroster.com/api/ai-status in a browser.
// You should see something like:
//   {
//     "gemini": { "ok": true, "model": "gemini-3.5-flash", "latency_ms": 812 },
//     "openai": { "ok": true, "model": "gpt-4o-mini", "latency_ms": 1240 }
//   }
//
// If either shows "ok": false, the "why" field tells you what to fix.
// ═════════════════════════════════════════════════════════════════════

export default async function handler(req, res) {
  const GEMINI_KEY = (process.env.GEMINI_API_KEY || '').trim();
  const OPENAI_KEY = (process.env.OPENAI_API_KEY || '').trim();
  const SUPABASE_URL_RAW = (process.env.SUPABASE_URL || '').trim();
  const SUPABASE_URL = SUPABASE_URL_RAW
    ? (SUPABASE_URL_RAW.match(/^https?:\/\//i) ? SUPABASE_URL_RAW : 'https://' + SUPABASE_URL_RAW).replace(/\/+$/, '')
    : '';
  const SERVICE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

  const result = { gemini: {}, openai: {}, supabase: {} };

  // ── Gemini check ─────────────────────────────────────────
  if (!GEMINI_KEY) {
    result.gemini = { ok: false, why: 'GEMINI_API_KEY env var is empty' };
  } else {
    const t0 = Date.now();
    try {
      const r = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent',
        {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-goog-api-key': GEMINI_KEY,
          },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: 'Reply with just: OK' }] }],
            generationConfig: { temperature: 0, maxOutputTokens: 10 },
          }),
        }
      );
      const latency = Date.now() - t0;
      if (r.ok) {
        result.gemini = { ok: true, model: 'gemini-3.5-flash', latency_ms: latency };
      } else {
        const txt = (await r.text().catch(() => '')).slice(0, 250);
        result.gemini = {
          ok: false,
          status: r.status,
          why: `HTTP ${r.status}: ${txt}`,
          latency_ms: latency,
        };
      }
    } catch (e) {
      result.gemini = { ok: false, why: 'Network error: ' + e.message };
    }
  }

  // ── OpenAI check ─────────────────────────────────────────
  if (!OPENAI_KEY) {
    result.openai = { ok: false, why: 'OPENAI_API_KEY env var is empty' };
  } else {
    const t0 = Date.now();
    try {
      const r = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${OPENAI_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          max_tokens: 10,
          temperature: 0,
          messages: [{ role: 'user', content: 'Reply with just: OK' }],
        }),
      });
      const latency = Date.now() - t0;
      if (r.ok) {
        result.openai = { ok: true, model: 'gpt-4o-mini', latency_ms: latency };
      } else {
        const txt = (await r.text().catch(() => '')).slice(0, 250);
        result.openai = {
          ok: false,
          status: r.status,
          why: `HTTP ${r.status}: ${txt}`,
          latency_ms: latency,
        };
      }
    } catch (e) {
      result.openai = { ok: false, why: 'Network error: ' + e.message };
    }
  }

  // ── Supabase check (bonus — cheap sanity ping) ────────────
  if (!SUPABASE_URL || !SERVICE_KEY) {
    result.supabase = { ok: false, why: 'SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing' };
  } else {
    const t0 = Date.now();
    try {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/objections?select=count&limit=1`, {
        headers: { apikey: SERVICE_KEY, authorization: `Bearer ${SERVICE_KEY}` },
      });
      const latency = Date.now() - t0;
      if (r.ok) {
        result.supabase = { ok: true, latency_ms: latency };
      } else {
        result.supabase = {
          ok: false,
          status: r.status,
          why: `HTTP ${r.status}`,
          latency_ms: latency,
        };
      }
    } catch (e) {
      result.supabase = { ok: false, why: 'Network error: ' + e.message };
    }
  }

  // Overall summary — coach works if EITHER AI provider works AND Supabase works
  result.coach_will_work =
    (result.gemini.ok || result.openai.ok) && result.supabase.ok;

  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json(result);
}
