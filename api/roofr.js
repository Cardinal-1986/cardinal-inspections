// /api/roofr.js
// Vercel serverless function — receives the raw text of a Roofr measurement
// report PDF and returns structured measurements for the estimate template.
//
// Uses the same GEMINI_API_KEY environment variable as the other functions.

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

    const geminiRes = await fetch(
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
