// /api/caption.js
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

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                { inlineData: { mimeType: mimeType, data: base64Data } }
              ]
            }
          ]
        })
      }
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      res.status(502).json({ error: 'Gemini request failed', detail: errText });
      return;
    }

    const data = await geminiRes.json();
    const caption =
      data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
      '[Caption — describe what this photo shows.]';

    res.status(200).json({ caption });
  } catch (err) {
    res.status(500).json({ error: err.message || String(err) });
  }
}
