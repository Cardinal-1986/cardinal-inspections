// /api/organize.js
// Vercel serverless function — the brains behind the in-editor Assistant chat.
// Given a photo OR a written observation, it decides which report section it
// belongs to and writes the caption (photos) or narrative sentence (notes).
//
// Uses the same GEMINI_API_KEY environment variable as caption.js/summarize.js.

const SECTIONS = `
3 — Exterior Elevations (ground-level photos of the sides of the building, siding, gutters, fascia, overall elevation views)
4 — Aerial Roof Overview (drone/overhead shots showing the whole roof or large portions of it)
5 — Roof Surface: Shingles, Fasteners, Hips & Ridges (close-ups of shingle condition, granule loss, nail pops, hip/ridge caps, brittleness)
6 — Penetrations & Flashings (pipe jacks, boot seals, vents, step/counter flashing, roof-to-wall transitions, skylights)
7 — Chimney (masonry, crown, chimney flashing, chase covers)
8 — Attic, Roof Decking & Ventilation (interior attic shots, decking, framing, insulation, intake/exhaust ventilation)`;

const SUPABASE_URL = (process.env.SUPABASE_URL || 'https://yipslubcptjoarblzbpl.supabase.co').trim();
const SUPABASE_ANON_KEY = (process.env.SUPABASE_ANON_KEY || 'sb_publishable_aGsug3EBJjHX90BLKd5bLQ_zryUMqNZ').trim();

/* Only signed-in Cardinal users may spend the Gemini key.
   This route previously had no session check at all: anyone who knew the path
   could POST to it and bill inference to GEMINI_API_KEY. Same gate as
   /api/analyze.js, which was already doing this correctly. */
async function requireSession(req, res){
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) { res.status(401).json({ error: 'Sign in required' }); return null; }
  try {
    const who = await fetch(SUPABASE_URL + '/auth/v1/user', {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: 'Bearer ' + token }
    });
    if (!who.ok) { res.status(401).json({ error: 'Invalid session' }); return null; }
    const user = await who.json();
    if (!user || !user.email) { res.status(401).json({ error: 'Invalid session' }); return null; }
    if (!isStaff(user.email)) { res.status(403).json({ error: 'Cardinal staff only' }); return null; }
    return user;
  } catch (e) {
    res.status(401).json({ error: 'Could not verify session' });
    return null;
  }
}

/* 502: the second rung. gemini-3.5-flash 503s "high demand" roughly one call in
   four and takes 6-14s when it answers; gpt-4o-mini answers the same server in
   0.6s. Measured via /api/ai-status, not assumed.

   Returns GEMINI'S OWN RESPONSE SHAPE so every existing call site reads it
   unchanged - no caller has to learn there is a second provider. Never throws:
   on total failure it returns the Gemini response (or null) and the caller's
   existing error path handles it exactly as before.

   Copied from caption.js, which has had this ladder for a long time. Not
   factored into a shared module on purpose: no route in this repo imports a
   sibling file, check.yml is syntax-only and could not catch a bundling failure,
   and the blast radius would be every AI route at once. */
async function aiFallback(parts, geminiRes) {
  const oaKey = (process.env.OPENAI_API_KEY || '').trim();
  if (!oaKey) return geminiRes;
  try {
    const content = [];
    (parts || []).forEach(p => {
      if (p && typeof p.text === 'string') content.push({ type: 'text', text: p.text });
      else if (p && p.inlineData) content.push({
        type: 'image_url',
        image_url: { url: 'data:' + p.inlineData.mimeType + ';base64,' + p.inlineData.data }
      });
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
    /* Gemini's shape, so nothing downstream changes. */
    return { ok: true, status: 200, _via: 'openai', json: async () => ({
      candidates: [{ content: { parts: [{ text: String(t) }] } }]
    }) };
  } catch (e) {
    return geminiRes;
  }
}

import { isStaff } from './_staff.js';
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // ---- Only signed-in Cardinal users may spend credits ----
  const _user = await requireSession(req, res);
  if (!_user) return;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server' });
    return;
  }

  try {
    const { image, note } = req.body || {};
    if (!image && !note) {
      res.status(400).json({ error: 'Send either an image or a note' });
      return;
    }

    let parts;
    if (image) {
      const match = typeof image === 'string'
        ? image.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.*)$/)
        : null;
      if (!match) {
        res.status(400).json({ error: 'Missing or invalid image data URL' });
        return;
      }
      const prompt =
        'You are organizing photos for a professional roof inspection report with these sections:\n' +
        SECTIONS + '\n\n' +
        'Look at the attached photo. Respond with ONLY raw JSON, no markdown fences, in this shape:\n' +
        '{"section": <section number 3-8>, "caption": "<one concise sentence, under 20 words, describing what the photo shows in professional roofing-inspection language>"}';
      parts = [
        { text: prompt },
        { inlineData: { mimeType: match[1], data: match[2] } }
      ];
    } else {
      const prompt =
        'You are organizing field notes for a professional roof inspection report with these sections:\n' +
        SECTIONS + '\n\n' +
        'The inspector wrote this observation:\n"' + String(note).slice(0, 1000) + '"\n\n' +
        'Rewrite it as one or two factual sentences in professional roofing-inspection language ' +
        '(third person, no hedging, no sales language), and pick the single best-fitting section. ' +
        'Respond with ONLY raw JSON, no markdown fences, in this shape:\n' +
        '{"section": <section number 3-8>, "sentence": "<the rewritten observation>"}';
      parts = [{ text: prompt }];
    }

    let geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey
        },
        body: JSON.stringify({ contents: [{ parts }] })
      }
    );

    /* 502: Google refusing is no longer the end of the road. */
    if (!geminiRes.ok) geminiRes = await aiFallback(parts, geminiRes);

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      res.status(502).json({ error: 'Gemini request failed', detail: errText.slice(0, 500) });
      return;
    }

    const data = await geminiRes.json();
    let text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
    text = text.replace(/```json|```/g, '').trim();

    let parsed;
    try { parsed = JSON.parse(text); }
    catch (e) {
      res.status(502).json({ error: 'Model returned unparseable output', detail: text.slice(0, 300) });
      return;
    }

    const section = parseInt(parsed.section, 10);
    if (!(section >= 3 && section <= 8)) {
      res.status(502).json({ error: 'Model returned an invalid section', detail: text.slice(0, 300) });
      return;
    }

    if (image) {
      res.status(200).json({ section, caption: String(parsed.caption || '').slice(0, 300) });
    } else {
      res.status(200).json({ section, sentence: String(parsed.sentence || '').slice(0, 600) });
    }
  } catch (err) {
    res.status(500).json({ error: err.message || String(err) });
  }
}
