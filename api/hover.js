// /api/hover.js
// Vercel serverless function — receives the raw text of a Hover measurement
// report PDF and returns structured siding/exterior measurements for the
// material order list. Uses the same GEMINI_API_KEY as the other functions.

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
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server' });
    return;
  }

  try {
    const { text } = req.body || {};
    if (!text || typeof text !== 'string' || text.trim().length < 40) {
      res.status(400).json({ error: 'No PDF text provided' });
      return;
    }

    const prompt =
      'You are parsing the text of a Hover exterior measurement report for a siding material order. ' +
      'The text below was extracted page by page (pages are marked "--- PAGE N ---").\n\n' +
      'Extract the following values. Use numbers only (no units). ' +
      'If a value is not present in the text, use null. Do NOT guess or invent numbers.\n' +
      '- siding_area_sqft: total siding/facade area in square feet (siding only, not roof/openings)\n' +
      '- openings_count: total number of window and door openings\n' +
      '- opening_perimeter_lf: total perimeter of window/door openings in lineal feet (may be listed as "openings trim" or window/door perimeter)\n' +
      '- outside_corner_lf: total outside corner length in lineal feet\n' +
      '- inside_corner_lf: total inside corner length in lineal feet\n' +
      '- base_length_lf: total level base/starter length in lineal feet (bottom of siding walls)\n' +
      '- soffit_area_sqft: total soffit area in square feet\n' +
      '- fascia_lf: total fascia length in lineal feet\n' +
      '- stories: number of stories as an integer if stated\n\n' +
      'Respond with ONLY raw JSON, no markdown fences, exactly these keys.\n\n' +
      'REPORT TEXT:\n' + text.slice(0, 50000);

    let geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0 }
        })
      }
    );
    /* 505: Google refusing is no longer the end of the road. */
    if (!geminiRes.ok) geminiRes = await aiFallback([{ text: prompt }], geminiRes);

    if (!geminiRes.ok) {
      const detail = await geminiRes.text();
      res.status(502).json({ error: 'AI request failed', detail: detail.slice(0, 300) });
      return;
    }
    const data = await geminiRes.json();
    const raw = (((data.candidates || [])[0] || {}).content || {}).parts
      ?.map(p => p.text || '').join('') || '';
    const clean = raw.replace(/```json|```/g, '').trim();
    let parsed;
    try { parsed = JSON.parse(clean); }
    catch (e) {
      res.status(502).json({ error: 'Could not parse measurements', detail: clean.slice(0, 200) });
      return;
    }
    res.status(200).json(parsed);
  } catch (err) {
    res.status(500).json({ error: err.message || String(err) });
  }
}
