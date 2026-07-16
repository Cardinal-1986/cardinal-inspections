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

    const geminiRes = await fetch(
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
