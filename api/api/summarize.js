// /api/summarize.js
// Vercel serverless function — takes the photo captions already entered in a
// report and drafts the "Overall Condition Assessment" paragraph.
//
// Uses the same GEMINI_API_KEY environment variable as /api/caption.js —
// no extra setup needed if you've already configured that one.
//
// This is a DRAFT only. It's meant to be reviewed and edited by the inspector
// before the report is sent — especially the repair-vs-replacement call,
// which carries real liability and should reflect the inspector's judgment.

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
    const { captions } = req.body || {};
    const list = Array.isArray(captions) ? captions.filter(Boolean) : [];

    if (list.length === 0) {
      res.status(400).json({
        error: 'No photo captions yet — add at least one photo with a caption first, then draft the summary.'
      });
      return;
    }

    const prompt =
      'You are a professional roof inspector drafting the "Overall Condition Assessment" ' +
      'paragraph of an inspection report, based only on the photo observations below. ' +
      'Write one factual, specific paragraph (4-6 sentences) covering: general wear, ' +
      'granule loss (if relevant), fastener condition, brittleness, remaining serviceable ' +
      'life, and whether repair or full replacement is recommended. Do not invent details ' +
      'not supported by the observations. No preamble, just the paragraph.\n\n' +
      'Photo observations:\n' +
      list.map((c, i) => `${i + 1}. ${c}`).join('\n');

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      }
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      res.status(502).json({ error: 'Gemini request failed', detail: errText });
      return;
    }

    const data = await geminiRes.json();
    const summary = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!summary) {
      res.status(502).json({ error: 'Gemini returned no text' });
      return;
    }

    res.status(200).json({ summary });
  } catch (err) {
    res.status(500).json({ error: err.message || String(err) });
  }
}
