// /api/sol.js
// AI Scope of Loss reader — extracts structured insurance info from an adjuster's
// PDF or scanned image. Gated by the caller's Supabase session, same as analyze.js.
//
// Env vars needed:
//   GEMINI_API_KEY  — the paid Gemini key (same one analyze.js uses)
//
// Request body: { file: <base64 payload>, mime: "application/pdf" | "image/..." }

const SUPABASE_URL = 'https://yipslubcptjoarblzbpl.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_aGsug3EBJjHX90BLKd5bLQ_zryUMqNZ';
const MODEL = 'gemini-3.5-flash';
const MAX_BYTES = 12 * 1024 * 1024;   // 12 MB raw cap; base64 is ~16 MB

/* 505: the second rung, same as 502 elsewhere. gemini-3.5-flash 503s "high
   demand" in spells - measured at roughly one call in four this afternoon - and
   this route had NO fallback, so it simply failed while OpenAI sat idle at 0.6s.

   Returns GEMINI'S OWN response shape, so the call site below reads it unchanged.
   Never throws: on any failure it hands back the original Gemini response and the
   existing error path behaves exactly as before.

   Handles BOTH part spellings: inlineData/mimeType (most routes) and
   inline_data/mime_type (sol.js). Missing that would have shipped a silently
   text-only fallback for the one route whose whole job is reading a document. */
async function aiFallback(parts, geminiRes) {
  const oaKey = (process.env.OPENAI_API_KEY || '').trim();
  if (!oaKey) return geminiRes;
  try {
    const content = [];
    (parts || []).forEach(p => {
      if (!p) return;
      if (typeof p.text === 'string') { content.push({ type: 'text', text: p.text }); return; }
      const inl = p.inlineData || p.inline_data;
      if (inl) {
        const mime = inl.mimeType || inl.mime_type || 'image/jpeg';
        content.push({ type: 'image_url', image_url: { url: 'data:' + mime + ';base64,' + inl.data } });
      }
    });
    if (!content.length) return geminiRes;
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + oaKey },
      body: JSON.stringify({ model: 'gpt-4o-mini', max_tokens: 1200, messages: [{ role: 'user', content }] })
    });
    if (!r || !r.ok) return geminiRes;
    const d = await r.json();
    const t = d && d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content;
    if (!t) return geminiRes;
    return { ok: true, status: 200, _via: 'openai', json: async () => ({
      candidates: [{ content: { parts: [{ text: String(t) }] } }]
    }) };
  } catch (e) {
    return geminiRes;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'POST only' });
    return;
  }
  try {
    // ---- 1) auth ----
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    if (!token) { res.status(401).json({ error: 'Sign in required' }); return; }
    const who = await fetch(SUPABASE_URL + '/auth/v1/user', {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: 'Bearer ' + token }
    });
    if (!who.ok) { res.status(401).json({ error: 'Invalid session' }); return; }
    const user = await who.json();
    if (!user || !user.email) { res.status(401).json({ error: 'Invalid session' }); return; }

    // ---- 2) validate ----
    const { file, mime } = req.body || {};
    if (!file || typeof file !== 'string') { res.status(400).json({ error: 'No file' }); return; }
    if (file.length > MAX_BYTES * 1.4) { res.status(413).json({ error: 'File too large (12 MB cap)' }); return; }
    const mt = (mime || 'application/pdf').toLowerCase();
    const isPdf = mt.indexOf('pdf') >= 0;
    const isImage = mt.indexOf('image/') === 0;
    if (!isPdf && !isImage) { res.status(400).json({ error: 'Unsupported file type — send PDF or image' }); return; }

    const key = (process.env.GEMINI_API_KEY || '').trim();
    if (!key) { res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server' }); return; }

    // ---- 3) prompt ----
    const prompt =
      'You are extracting insurance claim information from a Scope of Loss document ' +
      '(often produced by an insurance adjuster after inspecting a roof claim). ' +
      'The document may be a PDF or scanned image. Read carefully. Extract only ' +
      'values that are clearly present. Do not invent values. Use null for ' +
      'missing fields.\n\n' +
      'Respond with ONLY raw JSON, no markdown fences, no preamble, in exactly this shape:\n' +
      '{\n' +
      '  "carrier": string or null,\n' +
      '  "policy_number": string or null,\n' +
      '  "claim_number": string or null,\n' +
      '  "date_of_loss": "YYYY-MM-DD" or null,\n' +
      '  "adjuster": {\n' +
      '    "name": string or null,\n' +
      '    "phone": string or null,\n' +
      '    "email": string or null\n' +
      '  },\n' +
      '  "deductible": number or null,\n' +
      '  "coverage_type": "RCV" or "ACV" or null,\n' +
      '  "ord_law": true or false or null,\n' +
      '  "insured_name": string or null,\n' +
      '  "property_address": string or null,\n' +
      '  "totals": {\n' +
      '    "rcv": number or null,\n' +
      '    "acv": number or null,\n' +
      '    "depreciation": number or null,\n' +
      '    "net_claim": number or null\n' +
      '  },\n' +
      '  "summary": "one sentence describing what this document is and its top-line finding"\n' +
      '}\n\n' +
      'If the document is not a Scope of Loss / claim summary, set every field to null ' +
      'and put a note explaining what the document appears to be in the summary field.';

    // ---- 4) call Gemini ----
    const _parts = [
      { inline_data: { mime_type: mt, data: file } },
      { text: prompt }
    ];
    let g = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/' + MODEL + ':generateContent',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify({
          contents: [{ parts: _parts }],
          generationConfig: { maxOutputTokens: 1024, temperature: 0.1 }
        })
      }
    );
    /* 505: BEFORE the body is read - a Response can only be consumed once, and
       the fallback returns a different object with its own json(). */
    if (!g.ok) g = await aiFallback(_parts, g);
    const j = await g.json();
    if (!g.ok) {
      res.status(502).json({
        error: (j && j.error && j.error.message) || 'AI request failed',
        detail: JSON.stringify(j).slice(0, 500)
      });
      return;
    }
    let text = ((((j.candidates || [])[0] || {}).content || {}).parts || [])
      .map(p => p.text || '').join('');
    text = String(text || '').replace(/```json|```/g, '').trim();

    let parsed;
    try { parsed = JSON.parse(text); }
    catch (e) {
      res.status(502).json({
        error: 'Could not parse AI response as JSON',
        detail: text.slice(0, 500)
      });
      return;
    }

    // Basic shape guard so the caller can trust the object
    if (!parsed || typeof parsed !== 'object') {
      res.status(502).json({ error: 'AI returned unexpected shape', detail: text.slice(0, 300) });
      return;
    }

    res.status(200).json({ extracted: parsed, model: MODEL });
  } catch (err) {
    res.status(500).json({ error: String((err && err.message) || err) });
  }
}
