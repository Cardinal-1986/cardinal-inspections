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
    return user;
  } catch (e) {
    res.status(401).json({ error: 'Could not verify session' });
    return null;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // ---- Only signed-in Cardinal users may spend credits ----
  const _user = await requireSession(req, res);
  if (!_user) return;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server' });
    return;
  }

  try {
    const { captions, section } = req.body || {};
    const list = Array.isArray(captions) ? captions.filter(Boolean) : [];

    if (list.length === 0) {
      res.status(400).json({
        error: 'No photo captions yet — add at least one photo with a caption first, then draft the summary.'
      });
      return;
    }

    const secName = section ? String(section).slice(0, 100) : '';
    const prompt = secName
      ? ('You are a professional roof inspector writing the body narrative for the "' + secName + '" ' +
         'section of an inspection report, based only on the photo observations below. ' +
         'Write 2-4 factual, specific sentences in precise roofing terms describing what was ' +
         'observed in this section. Do not invent details not supported by the observations, ' +
         'do not repeat the section title, and do not make repair-vs-replacement calls here. ' +
         'No preamble, just the sentences.\n\n' +
         'Photo observations:\n' +
         list.map((c, i) => `${i + 1}. ${c}`).join('\n'))
      : ('You are a professional roof inspector drafting the "Overall Condition Assessment" ' +
         'paragraph of an inspection report, based only on the photo observations below. ' +
         'Write one factual, specific paragraph (4-6 sentences) covering: general wear, ' +
         'granule loss (if relevant), fastener condition, brittleness, remaining serviceable ' +
         'life, and whether repair or full replacement is recommended. Do not invent details ' +
         'not supported by the observations. No preamble, just the paragraph.\n\n' +
         'Photo observations:\n' +
         list.map((c, i) => `${i + 1}. ${c}`).join('\n'));

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
