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

  const apiKey = (process.env.GEMINI_API_KEY || '').trim();
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

    // primary model, retry once on overload, then older model, then OpenAI backup
    const oaKey = (process.env.OPENAI_API_KEY || '').trim();
    const diag = { openai_key_present: !!oaKey };
    let geminiRes = await askGemini('gemini-3.5-flash');
    diag.gemini35_try1 = geminiRes.status;
    if (geminiRes.status === 503 || geminiRes.status === 429) {
      await new Promise(r => setTimeout(r, 1200));
      geminiRes = await askGemini('gemini-3.5-flash');
      diag.gemini35_try2 = geminiRes.status;
    }
    if (!geminiRes.ok) {
      const alt = await askGemini('gemini-2.5-flash');
      diag.gemini25 = alt.status;
      if (alt.ok) geminiRes = alt;
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
        if (cap) { res.status(200).json({ caption: cap, via: 'openai' }); return; }
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

    res.status(200).json({ caption });
  } catch (err) {
    res.status(500).json({ error: err.message || String(err) });
  }
}
