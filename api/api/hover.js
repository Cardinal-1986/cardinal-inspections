// /api/hover.js
// Vercel serverless function — receives the raw text of a Hover measurement
// report PDF and returns structured siding/exterior measurements for the
// material order list. Uses the same GEMINI_API_KEY as the other functions.

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

    const geminiRes = await fetch(
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
