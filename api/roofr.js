// /api/roofr.js
// Vercel serverless function — receives the raw text of a Roofr measurement
// report PDF and returns structured measurements for the estimate template.
//
// Uses the same GEMINI_API_KEY environment variable as the other functions.

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
    if (!text || typeof text !== 'string' || text.trim().length < 20) {
      res.status(400).json({ error: 'No usable PDF text received — the PDF may be a scanned image rather than a digital report.' });
      return;
    }

    const prompt =
      'You are parsing the text of a Roofr aerial roof measurement report for a roofing estimate. ' +
      'The text below was extracted page by page (pages are marked "--- PAGE N ---").\n\n' +
      'Extract the following values. Use numbers only (no units) unless noted. ' +
      'If a value is not present in the text, use null. Do NOT guess or invent numbers.\n' +
      '- area_sqft: total roof area in square feet\n' +
      '- squares: total roof area in squares (area_sqft / 100 if only area given)\n' +
      '- pitch: predominant pitch as a string, e.g. "6/12" (include secondary pitches if listed)\n' +
      '- ridge_lf, hip_lf, valley_lf, eave_lf, rake_lf: lineal feet of each\n' +
      '- step_lf: step flashing lineal feet\n' +
      '- wall_lf: wall/apron flashing lineal feet\n' +
      '- penetrations: short string describing penetrations if listed (e.g. "4 pipe jacks, 1 chimney"), else null\n' +
      '- penetrations_count: total number of pipe/vent penetrations needing boot seals as an integer, else null\n' +
      '- waste_pct: suggested waste percentage if the report states one, else null\n\n' +
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
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      }
    );

    /* 505: Google refusing is no longer the end of the road. */
    if (!geminiRes.ok) geminiRes = await aiFallback([{ text: prompt }], geminiRes);

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      res.status(502).json({ error: 'Gemini request failed', detail: errText.slice(0, 500) });
      return;
    }

    const data = await geminiRes.json();
    let out = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
    out = out.replace(/```json|```/g, '').trim();

    let parsed;
    try { parsed = JSON.parse(out); }
    catch (e) {
      res.status(502).json({ error: 'Model returned unparseable output', detail: out.slice(0, 300) });
      return;
    }

    res.status(200).json(parsed);
  } catch (err) {
    res.status(500).json({ error: err.message || String(err) });
  }
}
