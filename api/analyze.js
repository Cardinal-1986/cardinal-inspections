// Cardinal AI proxy — runs on Vercel, keeps the Gemini key server-side.
// Deploy: put this file at  api/analyze.js  in the repo root.
// Then in Vercel: Project → Settings → Environment Variables → add
//   GEMINI_API_KEY = <your paid Gemini key>
// Redeploy. The key never appears in index.html or the browser.

const SUPABASE_URL = 'https://yipslubcptjoarblzbpl.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_aGsug3EBJjHX90BLKd5bLQ_zryUMqNZ';
const MODEL = 'gemini-2.5-flash';           // cheap + strong vision; swap anytime
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;    // 5 MB cap per request

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'POST only' });
    return;
  }
  try {
    // ---- 1) Only signed-in Cardinal users may spend credits ----
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    if (!token) { res.status(401).json({ error: 'Sign in required' }); return; }
    const who = await fetch(SUPABASE_URL + '/auth/v1/user', {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: 'Bearer ' + token }
    });
    if (!who.ok) { res.status(401).json({ error: 'Invalid session' }); return; }
    const user = await who.json();
    if (!user || !user.email) { res.status(401).json({ error: 'Invalid session' }); return; }

    // ---- 2) Validate payload ----
    const { image, mime, label, question } = req.body || {};
    if (!image || typeof image !== 'string') { res.status(400).json({ error: 'No image' }); return; }
    if (image.length > MAX_IMAGE_BYTES * 1.4) { res.status(413).json({ error: 'Image too large' }); return; }

    const key = process.env.GEMINI_API_KEY;
    const oaKey = process.env.OPENAI_API_KEY;   // optional backup
    if (!key && !oaKey) { res.status(500).json({ error: 'No AI key configured in Vercel' }); return; }

    // ---- 3) Ask Gemini ----
    const prompt = question ||
      ('You are an experienced roofing inspector\'s assistant for Cardinal Roofing & Renovations. ' +
       'Look at this inspection photo' + (label ? ' (labeled: "' + label + '")' : '') + '. ' +
       'In 2-4 short sentences: describe what is visible (material, components), assess condition, ' +
       'and flag any visible damage or concerns a homeowner\'s insurance claim might cover. ' +
       'If the photo is too blurry/dark to judge, say so and suggest how to reshoot it. Plain language, no preamble.');

    async function askOpenAI(){
      const o = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + oaKey },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          max_tokens: 300, temperature: 0.4,
          messages: [{ role: 'user', content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: 'data:' + (mime || 'image/jpeg') + ';base64,' + image } }
          ]}]
        })
      });
      const oj = await o.json();
      if (!o.ok) throw new Error((oj.error && oj.error.message) || 'OpenAI request failed');
      return ((oj.choices || [])[0] || {}).message?.content || '';
    }

    if (!key) {                          // Gemini not configured: go straight to backup
      const text = await askOpenAI();
      res.status(200).json({ text: text.trim() || 'No analysis returned.', via: 'openai' });
      return;
    }

    const g = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/' + MODEL + ':generateContent',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify({
          contents: [{
            parts: [
              { inline_data: { mime_type: mime || 'image/jpeg', data: image } },
              { text: prompt }
            ]
          }],
          generationConfig: { maxOutputTokens: 300, temperature: 0.4 }
        })
      }
    );
    const j = await g.json();
    if (!g.ok) {
      if (oaKey) {                       // Gemini failed: fall back to OpenAI
        try {
          const text = await askOpenAI();
          res.status(200).json({ text: text.trim() || 'No analysis returned.', via: 'openai-fallback' });
          return;
        } catch (e2) { /* fall through to the Gemini error */ }
      }
      res.status(502).json({ error: (j.error && j.error.message) || 'AI request failed' });
      return;
    }
    const text = (((j.candidates || [])[0] || {}).content || {}).parts?.map(p => p.text).join('') || '';
    res.status(200).json({ text: text.trim() || 'No analysis returned.' });
  } catch (err) {
    res.status(500).json({ error: String((err && err.message) || err) });
  }
};
