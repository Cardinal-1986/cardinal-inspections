// /api/librarian.js
// Vercel serverless function — the brains behind the Resource Library assistant.
//
// SCOPE: the Resource Library ONLY. This route files reference material —
// building code, roofing, siding, windows, gutters, manufacturer specs. It has
// no knowledge of projects, clients, inspections or Company Documents and must
// never be pointed at them.
//
// Given a PDF's text, a photo, or a typed question, it decides which library
// section the material belongs in, writes a short title and summary, and may
// propose a NEW section or subsection when nothing existing fits.
//
// Same GEMINI_API_KEY and the same session gate as organize.js / caption.js.

const SUPABASE_URL = (process.env.SUPABASE_URL || 'https://yipslubcptjoarblzbpl.supabase.co').trim();
const SUPABASE_ANON_KEY = (process.env.SUPABASE_ANON_KEY || 'sb_publishable_aGsug3EBJjHX90BLKd5bLQ_zryUMqNZ').trim();

/* Only signed-in Cardinal users may spend the Gemini key. Same gate as
   /api/organize.js and /api/analyze.js. */
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

/* The retry ladder this project uses everywhere: flash, pause, flash again.
   The free Gemini tier 503s under load, so one retry is worth the 1.2s. */
async function askGemini(apiKey, parts){
  const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent';
  const body = JSON.stringify({ contents: [{ parts }] });
  const opts = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body
  };
  let last = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    const r = await fetch(url, opts);
    if (r.ok) return r;
    last = r;
    if (r.status !== 503 && r.status !== 429) break;
    await new Promise(s => setTimeout(s, 1200));
  }
  return last;
}

function outline(sections){
  if (!Array.isArray(sections) || !sections.length) return '(the library is empty)';
  return sections.slice(0, 120).map(s => {
    const sub = Array.isArray(s.children) && s.children.length
      ? '\n' + s.children.slice(0, 40).map(c => '      - ' + String(c.title).slice(0, 80)).join('\n')
      : '';
    return '  [' + s.hub + '] ' + String(s.title).slice(0, 80) + sub;
  }).join('\n');
}

const RULES =
  'You are the librarian for a roofing contractor\'s internal reference library.\n' +
  'The library holds ONLY reference material: building and residential code, ' +
  'roofing, siding, windows and doors, gutters and drainage, manufacturer ' +
  'installation specs, and insurance-claim reference for Ohio.\n' +
  'It does NOT hold job files, client paperwork, contracts, invoices or ' +
  'inspection reports. If the material is clearly one of those, say so.\n';

const SHAPE =
  'Respond with ONLY raw JSON, no markdown fences, in this shape:\n' +
  '{\n' +
  '  "belongs": true|false,\n' +
  '  "reason": "<if belongs is false, one short sentence saying why>",\n' +
  '  "hub": "general"|"insurance",\n' +
  '  "section": "<the existing section title it belongs in, or a NEW one you are proposing>",\n' +
  '  "section_is_new": true|false,\n' +
  '  "subsection": "<optional subsection title, or empty string>",\n' +
  '  "subsection_is_new": true|false,\n' +
  '  "title": "<a clear title for this item, under 70 characters>",\n' +
  '  "summary": "<one or two sentences on what it covers and when someone would reach for it>"\n' +
  '}\n' +
  'Prefer an existing section when one genuinely fits. Only propose a new ' +
  'section when the material is a real category the library is missing. ' +
  'Never invent more than one new section and one new subsection per item.';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const _user = await requireSession(req, res);
  if (!_user) return;

  const apiKey = (process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey) {
    res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server' });
    return;
  }

  try {
    const { image, file, text, filename, mime, sections, ask } = req.body || {};
    if (!image && !file && !text && !ask) {
      res.status(400).json({ error: 'Send a file, an image, document text, or a question' });
      return;
    }

    const shelf = 'The library currently looks like this:\n' + outline(sections) + '\n\n';
    let parts;

    if (ask) {
      // A question, not a filing. Answer from the trade, and point at the shelf.
      parts = [{ text:
        RULES + '\n' + shelf +
        'A member of the crew asked:\n"' + String(ask).slice(0, 800) + '"\n\n' +
        'Answer in plain, practical language for a roofer — two short paragraphs at ' +
        'most. If a section of the library above is where they should look, name it. ' +
        'If the answer depends on local code or a manufacturer\'s spec, say so plainly ' +
        'rather than guessing a number. Respond with ONLY raw JSON: ' +
        '{"answer": "<your answer>", "look_in": "<section title or empty string>"}'
      }];
    } else if (file) {
      /* Same request shape as /api/sol.js: { file: <base64 payload>, mime }.
         Gemini reads PDFs directly, so no text extraction in the browser. */
      const mt = String(mime || 'application/pdf').toLowerCase();
      const b64 = String(file).includes(',') ? String(file).split(',').pop() : String(file);
      if (!b64) { res.status(400).json({ error: 'Empty file payload' }); return; }
      parts = [
        { text: RULES + '\n' + shelf +
          'This file was uploaded to the library' +
          (filename ? ' (filename: ' + String(filename).slice(0, 120) + ')' : '') +
          '. Read it and decide where it belongs.\n\n' + SHAPE },
        { inlineData: { mimeType: mt, data: b64 } }
      ];
    } else if (image) {
      const match = typeof image === 'string'
        ? image.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.*)$/)
        : null;
      if (!match) {
        res.status(400).json({ error: 'Missing or invalid image data URL' });
        return;
      }
      parts = [
        { text: RULES + '\n' + shelf +
          'A photo was uploaded to the library' +
          (filename ? ' (filename: ' + String(filename).slice(0, 120) + ')' : '') +
          '. Decide where it belongs.\n\n' + SHAPE },
        { inlineData: { mimeType: match[1], data: match[2] } }
      ];
    } else {
      parts = [{ text:
        RULES + '\n' + shelf +
        'A document was uploaded to the library' +
        (filename ? ' (filename: ' + String(filename).slice(0, 120) + ')' : '') +
        (mime ? ', type ' + String(mime).slice(0, 60) : '') + '.\n' +
        'Here is the text extracted from it:\n"""\n' +
        String(text).slice(0, 12000) + '\n"""\n\n' + SHAPE
      }];
    }

    const geminiRes = await askGemini(apiKey, parts);
    if (!geminiRes || !geminiRes.ok) {
      const errText = geminiRes ? await geminiRes.text() : 'no response';
      res.status(502).json({
        error: 'Gemini request failed',
        detail: String(errText).slice(0, 500),
        retryable: !!geminiRes && (geminiRes.status === 503 || geminiRes.status === 429)
      });
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

    if (ask) {
      res.status(200).json({
        answer: String(parsed.answer || '').slice(0, 4000),
        look_in: String(parsed.look_in || '').slice(0, 120)
      });
      return;
    }

    const hub = parsed.hub === 'insurance' ? 'insurance' : 'general';
    res.status(200).json({
      belongs: parsed.belongs !== false,
      reason: String(parsed.reason || '').slice(0, 300),
      hub,
      section: String(parsed.section || 'Unsorted').slice(0, 90),
      section_is_new: !!parsed.section_is_new,
      subsection: String(parsed.subsection || '').slice(0, 90),
      subsection_is_new: !!parsed.subsection_is_new,
      title: String(parsed.title || filename || 'Untitled').slice(0, 140),
      summary: String(parsed.summary || '').slice(0, 700)
    });
  } catch (err) {
    res.status(500).json({ error: err.message || String(err) });
  }
}
