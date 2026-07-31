// /api/librarian.js
// Vercel serverless function — the brains behind the Resource Library assistant.
//
// SCOPE: the Resource Library. This route files reference material — building
// code, roofing, siding, windows, gutters, manufacturer specs. It still has no
// knowledge of clients, inspections or Company Documents and must not be
// pointed at them.
//
// ONE DELIBERATE EXCEPTION, added 471 on Theo's explicit instruction. The
// librarian may ask for PHOTOGRAPHS from the company's own CompanyCam account
// by emitting a `~~photos` block. It never receives photo data and never sees a
// caption: it writes a search, and index.html runs it through /api/companycam,
// which is admin-only and refuses anything flagged internal. The fence that
// mattered — no client records, no job paperwork — is intact; what changed is
// that asking to SEE a roof is now in scope.
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
      /* A question is a request to GROW the library. Write a reference entry
         worth keeping and say where it should be filed — the browser then
         stores it, so the next person finds it without asking. */
      parts = [{ text:
        RULES + '\n' + shelf +
        'A member of the crew asked:\n"' + String(ask).slice(0, 800) + '"\n\n' +
        'Write a reference entry for the library that answers it and is worth ' +
        'keeping. Plain, practical language for a roofer in Ohio. Lead with the ' +
        'answer, then the detail that matters on a roof or a job site. Use short ' +
        'paragraphs; use "- " bullets for lists of requirements or steps.\n' +
        'The body is rendered as light markdown. You may use: "## " for a short ' +
        'heading on its own line, "- " bullets, "1. " numbered steps, **bold**, ' +
        'and GitHub-style pipe tables. Separate every block with a blank line.\n' +
        'Reach for a TABLE whenever the answer is a set of values that vary by ' +
        'one thing — sizes, spacings, fastener counts, thresholds by material, ' +
        'requirements by jurisdiction. A table a roofer can read one row off ' +
        'beats the same numbers buried in a sentence. Example shape:\n' +
        '| Pitch | Multiplier |\n|---|---|\n| 4/12 | 1.0541 |\n' +
        'Keep tables to 4 columns or fewer — this is read on a phone.\n' +
        'Do NOT use raw HTML, links or images; they will not render.\n' +
        /* 466: diagrams. The model writes DATA, never markup - index.html
           draws the SVG. See the lbDiagram block there for why. */
        'You may add ONE simple diagram when it genuinely helps. You never write \n' +
        'HTML or SVG - you write the data on its own lines and the app draws it. \n' +
        'Leave a blank line before and after. The four forms:\n' +
        '  ~~stack        a layered assembly, TOP layer first, one per line\n' +
        '  ~~flow         ordered steps, one per line, drawn with arrows\n' +
        '  ~~bars <unit>  comparison, one "Label | number" per line\n' +
        '  ~~pitch 6/12   a roof slope triangle; the app computes the multiplier\n' +
        'For example:\n' +
        '~~stack\nAsphalt shingles\nSynthetic underlayment\nIce barrier at the eave\nRoof deck\n' +
        '\n~~bars %\nSimple gable | 6\nStandard cut-up | 12\nComplex cut-up | 15\n' +
        'At most ONE diagram per entry, at most 8 lines in it, labels under 40 \n' +
        'characters. A diagram may ONLY restate something the prose already says - \n' +
        'never put a fact, number or step in a diagram that is not in the text. \n' +
        'If the answer is values that vary by one thing, a TABLE is better. If \n' +
        'nothing genuinely benefits from a picture, do not add one.\n' +
        /* 471: real photographs, on the same principle — you write a SEARCH,
           the app runs it. The model never receives photo data back. */
        'REAL PHOTOGRAPHS. When someone asks to SEE something — "show me", \n' +
        '"what does X look like", "have we got photos of" — you may add ONE \n' +
        '~~photos block. It searches the company\'s own job photographs.\n' +
        '  ~~photos tag=Ice Dam from=2026-01-01 to=2026-03-31\n' +
        'Every part is optional; `~~photos` alone returns the most recent. Use \n' +
        'tag= only for a tag the crew would plausibly have used, and dates only \n' +
        'when the question is about a season or period. Put it on ONE line, and \n' +
        'do NOT describe what the photos will show — you cannot see them, and \n' +
        'the app puts the real captions underneath. Say something like "Here is \n' +
        'what we have on file:" and nothing more about their content.\n' +
        'Use it only for things a photograph actually settles. A definition, a \n' +
        'code citation or a measurement is not one of those.\n' +
        'Where a number comes from code or a manufacturer spec, name the source ' +
        '(for example "2019 Residential Code of Ohio R905.2.8.5" or "per the ' +
        'manufacturer\'s installation instructions"). If you are not certain of a ' +
        'number, say what governs it instead of inventing one — a wrong number in ' +
        'the library is worse than no entry.\n' +
        'Aim for 150-400 words. Respond with ONLY raw JSON, no markdown fences:\n' +
        '{\n' +
        '  "belongs": true|false,\n' +
        '  "reason": "<if belongs is false, why>",\n' +
        '  "hub": "general"|"insurance",\n' +
        '  "section": "<existing section title, or a new one>",\n' +
        '  "section_is_new": true|false,\n' +
        '  "subsection": "<optional, or empty string>",\n' +
        '  "subsection_is_new": true|false,\n' +
        '  "title": "<a title someone would scan for later, under 70 characters>",\n' +
        '  "summary": "<one sentence on what it covers>",\n' +
        '  "body": "<the entry itself>",\n' +
        '  "sources": ["<short citation>", "..."]\n' +
        '}\n' +
        'sources: the code sections, manufacturer documents or statutes the ' +
        'answer actually rests on, each a short label a person could look up ' +
        '(for example "2019 RCO R905.1.2" or "Owens Corning installation ' +
        'instructions"). Cite only what genuinely governs the answer. If nothing ' +
        'specific does, return an EMPTY array — the library shows an uncited ' +
        'entry as uncited, which is far better than a citation that does not ' +
        'say what you claim it says. Never cite a section number you are not ' +
        'sure of.'
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
    /* 446: sources is display-only and reaches the DB as text[]. Coerce to a
       clean array of short strings here so the browser never has to guess —
       a model returning a bare string or null must not become [null]. */
    try { parsed = JSON.parse(out); }
    catch (e) {
      res.status(502).json({ error: 'Model returned unparseable output', detail: out.slice(0, 300) });

    if (parsed && typeof parsed === 'object') {
      const raw = parsed.sources;
      const list = Array.isArray(raw) ? raw : (typeof raw === 'string' && raw.trim() ? [raw] : []);
      parsed.sources = list
        .map(s => String(s == null ? '' : s).trim().slice(0, 200))
        .filter(s => s.length > 1)
        .slice(0, 8);
    }
      return;
    }

    if (ask) {
      res.status(200).json({
        belongs: parsed.belongs !== false,
        reason: String(parsed.reason || '').slice(0, 300),
        hub: parsed.hub === 'insurance' ? 'insurance' : 'general',
        section: String(parsed.section || 'Unsorted').slice(0, 90),
        section_is_new: !!parsed.section_is_new,
        subsection: String(parsed.subsection || '').slice(0, 90),
        subsection_is_new: !!parsed.subsection_is_new,
        title: String(parsed.title || 'Reference note').slice(0, 140),
        summary: String(parsed.summary || '').slice(0, 700),
        body: String(parsed.body || '').slice(0, 8000),
        /* 454: sources was asked for in the prompt and sanitised above, then
           dropped here — so every entry the librarian filed since 446 showed
           "No source recorded" no matter what the model returned. */
        sources: parsed.sources || []
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
      summary: String(parsed.summary || '').slice(0, 700),
      sources: parsed.sources || []
    });
  } catch (err) {
    res.status(500).json({ error: err.message || String(err) });
  }
}
