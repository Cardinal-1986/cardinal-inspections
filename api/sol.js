// /api/sol.js
// AI Scope of Loss reader — extracts structured insurance info from an adjuster's
// PDF or scanned image. Gated by the caller's Supabase session, same as analyze.js.
//
// Env vars needed:
//   GEMINI_API_KEY  — the paid Gemini key (same one analyze.js uses)
//
// Request body, EITHER shape:
//   { file: <base64 payload>, mime: "application/pdf" | "image/..." }   small files, sent inline
//   { url:  <Supabase storage URL> }                                     large files (643)
//
// 643: the URL shape is what index.html has been sending all along for anything
// over 3.1 MB. It uploads to photos/scopes/… , makes a 600-second signed URL and
// POSTs { url }. This route only ever read `file`, so it answered 400 "No file"
// and the client showed "the extractor doesn't accept links yet — deploy the
// updated api/sol.js." That message was an honest placeholder for a server half
// that was never written. Adam Gunn's scope is the file that found it.

const SUPABASE_URL = 'https://yipslubcptjoarblzbpl.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_aGsug3EBJjHX90BLKd5bLQ_zryUMqNZ';
const MODEL = 'gemini-3.5-flash';
const MAX_BYTES = 12 * 1024 * 1024;   // 12 MB raw cap; base64 is ~16 MB

/* 643 — THE ONLY PLACE A CALLER-SUPPLIED URL MAY POINT.
   Fetching a URL the caller chose is server-side request forgery unless it is
   bounded. A signed-in user could otherwise hand this route an internal address
   and read the response through the error body. This route exists to read a
   scope the CLIENT JUST UPLOADED, so the bound is exact: this project's Supabase
   storage, nothing else. Not a substring test — a prefix test on the parsed
   origin, so "https://evil.test/?x=https://yipslub…supabase.co/storage/v1/"
   cannot pass. */
const STORAGE_PREFIX = SUPABASE_URL + '/storage/v1/';

function storageUrlOrNull(raw) {
  if (typeof raw !== 'string' || !raw) return null;
  let u;
  try { u = new URL(raw); } catch (e) { return null; }
  if (u.protocol !== 'https:') return null;
  if (u.origin !== new URL(SUPABASE_URL).origin) return null;
  if (!raw.startsWith(STORAGE_PREFIX)) return null;
  return raw;
}

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
    res.status(405).json({ error: 'POST only' });
    return;
  }
  try {
    // ---- 1) auth ----
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    if (!token) { res.status(401).json({ error: 'Sign in required' }); return; }
    const who = await fetch(SUPABASE_URL + '/auth/v1/user', {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: 'Bearer ' + token }
    });
    if (!who.ok) { res.status(401).json({ error: 'Invalid session' }); return; }
    const user = await who.json();
    if (!user || !user.email) { res.status(401).json({ error: 'Invalid session' }); return; }

    // ---- 2) validate ----
    const body = req.body || {};
    let { file, mime } = body;

    /* 643: the stored-file path. index.html uploads anything over 3.1 MB to
       photos/scopes/… and sends the signed URL instead of 16 MB of base64. */
    if (!file && body.url) {
      const safeUrl = storageUrlOrNull(body.url);
      if (!safeUrl) {
        res.status(400).json({ error: 'That link is not a Cardinal storage URL' });
        return;
      }
      let doc;
      try {
        doc = await fetch(safeUrl);
      } catch (e) {
        res.status(502).json({ error: 'Could not fetch the uploaded file' });
        return;
      }
      /* A signed URL lasts 600s. If the read took longer than the extraction
         queue, say so plainly rather than reporting "AI request failed". */
      if (!doc.ok) {
        res.status(doc.status === 400 || doc.status === 401 || doc.status === 403 ? 410 : 502)
           .json({ error: doc.status === 200 ? 'Could not fetch the uploaded file'
                        : 'The upload link has expired or was refused — try the upload again' });
        return;
      }
      const buf = Buffer.from(await doc.arrayBuffer());
      if (buf.length > MAX_BYTES) {
        res.status(413).json({
          error: 'That file is ' + (buf.length / 1048576).toFixed(1) +
                 ' MB. The reader handles up to ' + (MAX_BYTES / 1048576) +
                 ' MB — split it and upload the scope pages only.'
        });
        return;
      }
      if (!buf.length) { res.status(502).json({ error: 'The uploaded file came back empty' }); return; }
      file = buf.toString('base64');
      /* Trust the stored object's own content type over anything in the body. */
      mime = mime || (doc.headers.get('content-type') || 'application/pdf').split(';')[0].trim();
    }

    if (!file || typeof file !== 'string') { res.status(400).json({ error: 'No file' }); return; }
    if (file.length > MAX_BYTES * 1.4) { res.status(413).json({ error: 'File too large (12 MB cap)' }); return; }
    const mt = (mime || 'application/pdf').toLowerCase();
    const isPdf = mt.indexOf('pdf') >= 0;
    const isImage = mt.indexOf('image/') === 0;
    if (!isPdf && !isImage) { res.status(400).json({ error: 'Unsupported file type — send PDF or image' }); return; }

    const key = (process.env.GEMINI_API_KEY || '').trim();
    if (!key) { res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server' }); return; }

    // ---- 3) prompt ----
    const prompt =
      'You are extracting insurance claim information from a Scope of Loss document ' +
      '(often produced by an insurance adjuster after inspecting a roof claim). ' +
      'The document may be a PDF or scanned image. Read carefully. Extract only ' +
      'values that are clearly present. Do not invent values. Use null for ' +
      'missing fields.\n\n' +
      'Respond with ONLY raw JSON, no markdown fences, no preamble, in exactly this shape:\n' +
      '{\n' +
      '  "carrier": string or null,\n' +
      '  "policy_number": string or null,\n' +
      '  "claim_number": string or null,\n' +
      '  "date_of_loss": "YYYY-MM-DD" or null,\n' +
      '  "adjuster": {\n' +
      '    "name": string or null,\n' +
      '    "phone": string or null,\n' +
      '    "email": string or null\n' +
      '  },\n' +
      '  "deductible": number or null,\n' +
      '  "coverage_type": "RCV" or "ACV" or null,\n' +
      '  "ord_law": true or false or null,\n' +
      '  "insured_name": string or null,\n' +
      '  "property_address": string or null,\n' +
      '  "totals": {\n' +
      '    "rcv": number or null,\n' +
      '    "acv": number or null,\n' +
      '    "depreciation": number or null,\n' +
      '    "net_claim": number or null\n' +
      '  },\n' +
      '  "summary": "one sentence describing what this document is and its top-line finding"\n' +
      '}\n\n' +
      'If the document is not a Scope of Loss / claim summary, set every field to null ' +
      'and put a note explaining what the document appears to be in the summary field.';

    // ---- 4) call Gemini ----
    const _parts = [
      { inline_data: { mime_type: mt, data: file } },
      { text: prompt }
    ];
    let g = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/' + MODEL + ':generateContent',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify({
          contents: [{ parts: _parts }],
          generationConfig: { maxOutputTokens: 1024, temperature: 0.1 }
        })
      }
    );
    /* 505: BEFORE the body is read - a Response can only be consumed once, and
       the fallback returns a different object with its own json(). */
    if (!g.ok) g = await aiFallback(_parts, g);
    const j = await g.json();
    if (!g.ok) {
      res.status(502).json({
        error: (j && j.error && j.error.message) || 'AI request failed',
        detail: JSON.stringify(j).slice(0, 500)
      });
      return;
    }
    let text = ((((j.candidates || [])[0] || {}).content || {}).parts || [])
      .map(p => p.text || '').join('');
    text = String(text || '').replace(/```json|```/g, '').trim();

    let parsed;
    try { parsed = JSON.parse(text); }
    catch (e) {
      res.status(502).json({
        error: 'Could not parse AI response as JSON',
        detail: text.slice(0, 500)
      });
      return;
    }

    // Basic shape guard so the caller can trust the object
    if (!parsed || typeof parsed !== 'object') {
      res.status(502).json({ error: 'AI returned unexpected shape', detail: text.slice(0, 300) });
      return;
    }

    res.status(200).json({ extracted: parsed, model: MODEL });
  } catch (err) {
    res.status(500).json({ error: String((err && err.message) || err) });
  }
}
