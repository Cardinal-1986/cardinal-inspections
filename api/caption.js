// /api/caption.js  [1075]
// Vercel serverless function — receives a base64 photo from the report editor
// and returns a one-sentence caption suitable for a roof inspection report.
//
// SETUP (one time):
// 1. Get a free Gemini API key: https://aistudio.google.com/app/apikey
// 2. In Vercel: this project -> Settings -> Environment Variables
//      Name:  GEMINI_API_KEY
//      Value: <the key you just copied>
//    Add it for Production (and Preview, if you use preview deploys), then redeploy.
//
// The key is only ever used here, on the server — it is never sent to the browser.

/* 1075: the SAME array detect.js, sortphotos.js and supplement.js have used
   since build 503 — copied, not invented, so the four routes cannot drift.

   ⚠ It replaces THREE IDENTICAL CALLS to gemini-3.5-flash. The comment above
     them claimed "then older model" and the third call's diag key was named
     `gemini25`: this was a real 3.5 -> 2.5 ladder that got flattened when the
     models were renumbered, leaving a retry wearing a ladder's clothes. On the
     ~1-in-4 Gemini outage measured at 500-501 an inspection caption made three
     doomed calls to one model and then fell to the smallest model in the stack.

   ⚠ 3.7 is NOT at the front on purpose. Which model should LEAD is what
     /bakeoff.html exists to answer; putting it there on my own judgement would
     pre-empt the measurement while sounding like it. One line, once measured. */
const GEMINI_MODELS = ['gemini-3.6-flash', 'gemini-3.5-flash'];

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

import { isStaff } from './_staff.js';
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // ---- Only signed-in Cardinal users may spend credits ----
  const _user = await requireSession(req, res);
  if (!_user) return;

  const apiKey = (process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey) {
    res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server' });
    return;
  }

  /* ── build 1028: estimate assist — ALL attached photos in ONE request ──
     The estimate editor sends { images:[dataURL…], captions:[string|null…],
     context:{client,title,items} } and gets { overview, captions, cover_index }
     back. The single-image path below (the inspection report editor's) is
     untouched. The CLIENT enforces fill-not-overwrite and never moving a
     rep-starred cover; this route just describes what it is shown. */
  if (Array.isArray((req.body || {}).images)) {
    return estimateAssist(req, res, apiKey);
  }

  try {
    const { image } = req.body || {};
    if (!image || typeof image !== 'string' || !image.startsWith('data:image')) {
      res.status(400).json({ error: 'Missing or invalid image data URL' });
      return;
    }

    const match = image.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.*)$/);
    if (!match) {
      res.status(400).json({ error: 'Could not parse image data URL' });
      return;
    }
    const mimeType = match[1];
    const base64Data = match[2];

    const prompt =
      'You are captioning a photo for a professional roof inspection report. ' +
      'In one concise sentence (under 20 words), describe what the photo shows in ' +
      'plain, professional roofing-inspection language. No preamble, no quotes, just the caption sentence.';

    async function askGemini(model) {
      return fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
          body: JSON.stringify({
            contents: [
              { parts: [
                { text: prompt },
                { inlineData: { mimeType: mimeType, data: base64Data } }
              ] }
            ]
          })
        }
      );
    }

    // the ladder: each model in turn, one pause on an overload, then OpenAI
    const oaKey = (process.env.OPENAI_API_KEY || '').trim();
    const diag = { openai_key_present: !!oaKey };
    let geminiRes = null, viaModel = '';
    for (const model of GEMINI_MODELS) {
      geminiRes = await askGemini(model);
      diag[model] = geminiRes.status;
      /* 503/429 is overload: pause and give the SAME model one more go, which
         is what the free tier actually needs. Any other failure means this
         model will not work — move on rather than retry something that cannot
         succeed (detect.js's rule since 503). */
      if (geminiRes.status === 503 || geminiRes.status === 429) {
        await new Promise(r => setTimeout(r, 1200));
        geminiRes = await askGemini(model);
        diag[model + '_retry'] = geminiRes.status;
      }
      if (geminiRes.ok) { viaModel = model; break; }
    }

    if (!geminiRes.ok && oaKey) {
      const o = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + oaKey },
        body: JSON.stringify({
          model: 'gpt-4o-mini', max_tokens: 60, temperature: 0.4,
          messages: [{ role: 'user', content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: image } }
          ] }]
        })
      });
      const oj = await o.json();
      diag.openai = o.status;
      if (o.ok) {
        const cap = oj?.choices?.[0]?.message?.content?.trim();
        if (cap) { res.status(200).json({ caption: cap, via: 'gpt-4o-mini',
                                          via_primary: GEMINI_MODELS[0] }); return; }
      } else {
        diag.openai_error = (oj?.error?.message || '').slice(0, 160);
      }
    }

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      res.status(502).json({ error: 'All AI providers failed', diag, detail: errText.slice(0, 300) });
      return;
    }

    const data = await geminiRes.json();
    const caption =
      data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
      '[Caption — describe what this photo shows.]';

    /* 1072: name the model on the SUCCESS path too. Reporting only the
       fallback made silence ambiguous — Gemini answered, or an older
       deploy is running? A field that appears only on failure cannot
       distinguish those, which is most of what it was needed for. */
    res.status(200).json({ caption, via: viaModel || GEMINI_MODELS[0],
                           via_primary: GEMINI_MODELS[0] });
  } catch (err) {
    res.status(500).json({ error: err.message || String(err) });
  }
}

/* ── build 1028: the estimate assist ─────────────────────────────────────────
   One request, every photo. Returns JSON enforced by responseSchema (the
   librarian lesson from 806: an enforced shape beats a prose ask — no fence
   stripping, no partial parses). Falls back to OpenAI in JSON mode the same
   way the single-image path does. */
async function estimateAssist(req, res, apiKey) {
  try {
    const body = req.body || {};
    const images = body.images;
    if (!images.length || images.length > 14) {
      res.status(400).json({ error: 'Send 1–14 photos (got ' + images.length + ')' });
      return;
    }
    const parsed = [];
    for (const im of images) {
      const m = typeof im === 'string' && im.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.*)$/);
      if (!m) { res.status(400).json({ error: 'Every entry in images[] must be an image data URL' }); return; }
      parsed.push({ mimeType: m[1], data: m[2] });
    }
    const captions = Array.isArray(body.captions) ? body.captions : [];
    const ctx = body.context || {};
    const items = Array.isArray(ctx.items) ? ctx.items.filter(s => typeof s === 'string').slice(0, 30) : [];

    let prompt =
      'You are helping a roofing contractor prepare a written estimate for a homeowner. ' +
      'You are shown ' + parsed.length + ' photographs of the property, in order (photo 1 first). ' +
      (ctx.client ? 'The client is ' + String(ctx.client).slice(0, 80) + '. ' : '') +
      (items.length ? 'The estimate lines are: ' + items.join('; ').slice(0, 1200) + '. ' : '') +
      'Return JSON with exactly these fields: ' +
      '"captions": one concise sentence per photo, under 20 words each, plain professional ' +
      'roofing-inspection language, in the same order as the photos (' + parsed.length + ' entries); ' +
      '"overview": one plain-language paragraph, 60–120 words, written for the homeowner, that ties ' +
      'the photos together — what condition the property is in and what the work addresses. ' +
      'No marketing language, no prices, no greeting; ' +
      '"cover_index": the 0-based index of the photo that best serves as the document cover — ' +
      'prefer a wide establishing view of the home or roof over a close-up.';
    const already = captions
      .map((c, i) => (c && String(c).trim() ? (i + 1) + ': "' + String(c).trim().slice(0, 120) + '"' : null))
      .filter(Boolean);
    if (already.length) {
      prompt += ' Some photos already have captions written by the rep — keep your captions for those ' +
        'consistent with them (they will not be replaced): ' + already.join('; ') + '.';
    }

    const schema = {
      type: 'object',
      properties: {
        captions: { type: 'array', items: { type: 'string' } },
        overview: { type: 'string' },
        cover_index: { type: 'integer' },
      },
      required: ['captions', 'overview', 'cover_index'],
    };

    async function askGemini(model) {
      return fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }].concat(
              parsed.map(p => ({ inlineData: { mimeType: p.mimeType, data: p.data } }))
            ) }],
            generationConfig: { responseMimeType: 'application/json', responseSchema: schema },
          }),
        }
      );
    }

    const oaKey = (process.env.OPENAI_API_KEY || '').trim();
    const diag = { openai_key_present: !!oaKey, photos: parsed.length };
    let r = null, viaModel = '';
    for (const model of GEMINI_MODELS) {
      r = await askGemini(model);
      diag[model] = r.status;
      if (r.status === 503 || r.status === 429) {
        await new Promise(x => setTimeout(x, 1200));
        r = await askGemini(model);
        diag[model + '_retry'] = r.status;
      }
      if (r.ok) { viaModel = model; break; }
    }

    let out = null, via = 'gemini';
    if (r.ok) {
      const data = await r.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      try { out = JSON.parse(text); } catch (_) { diag.gemini_parse = 'failed'; }
    }

    if (!out && oaKey) {
      const o = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + oaKey },
        body: JSON.stringify({
          model: 'gpt-4o-mini', max_tokens: 700, temperature: 0.4,
          response_format: { type: 'json_object' },
          messages: [{ role: 'user', content: [{ type: 'text', text: prompt + ' Respond with only the JSON object.' }]
            .concat(images.map(u => ({ type: 'image_url', image_url: { url: u } }))) }],
        }),
      });
      diag.openai = o.status;
      const oj = await o.json();
      if (o.ok) {
        try { out = JSON.parse(oj?.choices?.[0]?.message?.content || ''); via = 'openai'; }
        catch (_) { diag.openai_parse = 'failed'; }
      } else {
        diag.openai_error = (oj?.error?.message || '').slice(0, 160);
      }
    }

    if (!out || !Array.isArray(out.captions) || typeof out.overview !== 'string') {
      res.status(502).json({ error: 'All AI providers failed', diag });
      return;
    }

    /* normalize: exactly one caption per photo, cover_index in range */
    const caps = parsed.map((_, i) => String(out.captions[i] || '').trim());
    let cover = Number(out.cover_index);
    if (!Number.isInteger(cover) || cover < 0 || cover >= parsed.length) cover = 0;
    res.status(200).json({ overview: String(out.overview).trim(), captions: caps, cover_index: cover, via });
  } catch (err) {
    res.status(500).json({ error: err.message || String(err) });
  }
}
