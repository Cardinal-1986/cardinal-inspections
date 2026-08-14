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
// 806: MOVED OFF GEMINI, onto Claude. Same Supabase session gate; the JSON this
// route hands back to index.html is unchanged, field for field. What went away
// with the swap:
//
//   - the four-rung ladder (3.6-flash x2 -> 3.5-flash x2 -> gpt-4o-mini). It
//     existed because the free Gemini tier 503'd about one call in four; it is
//     not needed here and a second provider silently answering roofing-code
//     questions is worse than an honest error. OPENAI_API_KEY is no longer read.
//   - the "respond with ONLY raw JSON, no markdown fences" hope, and the
//     ```-stripping that backed it up. The shape is now ENFORCED by
//     output_config.format, so a fence cannot appear and the strip — which
//     would have corrupted any answer whose body legitimately contained one —
//     is gone. The shape prose below is kept anyway: it carries instructions
//     the schema does not (which section to prefer, when to cite nothing).
//
// Priced before it was switched, on real traffic rather than a guess: 21 real
// questions, 5,803 chars in and 2,221 out on average, ~$1/month at the observed
// rate. Cost was never the constraint; a wrong code citation is.
//
// GEMINI_API_KEY is no longer read by this route. It needs ANTHROPIC_API_KEY.

import Anthropic from '@anthropic-ai/sdk';

const SUPABASE_URL = (process.env.SUPABASE_URL || 'https://yipslubcptjoarblzbpl.supabase.co').trim();
const SUPABASE_ANON_KEY = (process.env.SUPABASE_ANON_KEY || 'sb_publishable_aGsug3EBJjHX90BLKd5bLQ_zryUMqNZ').trim();

const MODEL = 'claude-opus-5';

/* The 662 rule — 60s maxDuration (vercel.json), leave headroom. maxRetries
   only fires on transport failures (429, 5xx, connection reset) and those come
   back in well under a second, so the realistic worst case is one fast retry
   plus one full attempt. A genuine 45s hang leaves no room for the retry and
   Vercel ends the function, which is exactly what the old route did when
   Gemini hung. */
const REQ_TIMEOUT_MS = 45000;
const MAX_RETRIES = 1;

/* Effort is the latency lever. Thinking is on by default on this model and is
   the reason to be here at all — the failure that costs money on this route is
   a confidently wrong code section, not a slow answer. 'medium' keeps it close
   to the 6-14s the crew is used to; raise it to 'high' if answers get sloppy. */
const EFFORT = 'medium';

/* Only signed-in Cardinal users may spend the key. Same gate as
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
  'inspection reports. If the material is clearly one of those, say so.\n' +
  /* 508: Theo asked it to draw the ice-and-water concept and it refused with
     "Job drawings, blueprints, site plans, and shop drawings are job-specific
     files." Right fence, wrong catch: he asked for a DIAGRAM OF A CONCEPT, which
     is reference material by definition. The test is WHOSE it is, not whether it
     is a picture - and Plates 1-5 already in this library are exactly that. */
  /* 510: 508 carved this out in SEVEN lines against a FIVE-line fence. A
     qualifier heavier than the rule it qualifies stops being a qualifier - it
     becomes the rule, and job paperwork gets let in from the other side. Same
     distinction, three lines, proportionate. */
  'A drawing IS in scope when it explains how something works in general, and is \n' +
  'NOT in scope when it belongs to one job - a site plan or shop drawing for a \n' +
  'single address. The test is whose it is, not whether it is a picture.\n';

/* 806: the shape below is now ENFORCED by output_config.format, not requested.
   It is kept in the prompt because it says things the schema cannot: prefer an
   existing section, never invent more than one, cite nothing rather than
   guess. Schema and prose must stay in step - if you add a field to one, add
   it to the other. */
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

/* 512: these instructions were inline in the ask branch. The illustrate
   mode below needs them too, and a second copy would drift - the 510
   spacing fix would have landed in only one of them. One definition. */
const DIAGRAM =
        /* 466: diagrams. The model writes DATA, never markup - index.html
           draws the SVG. See the lbDiagram block there for why. */
        'You may add ONE simple diagram when it genuinely helps. You never write \n' +
        'HTML or SVG - you write the data on its own lines and the app draws it. \n' +
        /* 510: TESTED against the real lbRich. A marker line is only a diagram
           if it is the FIRST line of its own block; lbRich splits on blank lines
           only. Prose touching it on either side turns the whole thing into a
           paragraph and leaks the ~~ to the reader. The example below now obeys
           this - it did not, and rendered as zero diagrams. */
        'A marker must be the FIRST line of its own block: one blank line before \n' +
        'it and one blank line after the last data line. Text touching it on \n' +
        'either side turns the whole diagram into plain text. The four forms:\n' +
        '  ~~stack        a layered assembly, TOP layer first, one per line\n' +
        '  ~~flow         ordered steps, one per line, drawn with arrows\n' +
        '  ~~bars <unit>  comparison, one "Label | number" per line\n' +
        '  ~~pitch 6/12   a roof slope triangle; the app computes the multiplier\n' +
        'For example:\n' +
        '\n~~stack\nAsphalt shingles\nSynthetic underlayment\nIce barrier at the eave\nRoof deck\n' +
        '\n~~bars %\nSimple gable | 6\nStandard cut-up | 12\nComplex cut-up | 15\n' +
        '\n' +
        'At most ONE diagram per entry, at most 8 lines in it, labels under 40 \n' +
        'characters. A diagram may ONLY restate something the prose already says - \n' +
        'never put a fact, number or step in a diagram that is not in the text. \n' +
        'If the answer is values that vary by one thing, a TABLE is better. If \n' +
        'nothing genuinely benefits from a picture, do not add one.\n';

/* The writing brief for a question. Unchanged wording; it moved out of the
   user turn so the whole standing instruction is one cacheable prefix. */
const ASK_BRIEF =
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
  DIAGRAM +
  /* 471: real photographs, on the same principle — you write a SEARCH,
     the app runs it. The model never receives photo data back. */
  'REAL PHOTOGRAPHS. When someone asks to SEE something — "show me", \n' +
  '"what does X look like", "have we got photos of" — you may add ONE \n' +
  '~~photos block. It searches the company\'s own job photographs.\n' +
  '  ~~photos q=ice dam\n' +
  '  ~~photos q=kickout flashing from=2026-01-01 to=2026-03-31\n' +
  'ALWAYS use q= with the plain words someone would have written on the \n' +
  'photo. It matches the caption the crew typed. Tags on this account are \n' +
  'used inconsistently, so tag= is a last resort, not the default. Dates \n' +
  'only when the question is about a season or period. Put it on ONE line, and \n' +
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
  'sure of.';

const ILLUSTRATE_BRIEF =
  'A reference entry in a roofing company library already exists and someone \n' +
  'has asked for a drawing to go with it. Do NOT rewrite it, summarise it, \n' +
  'correct it or comment on it. Your entire job is the drawing.\n\n' +
  DIAGRAM + '\n' +
  'Draw ONLY what the entry actually says. Never introduce a measurement, \n' +
  'a layer or a step the text does not contain - a diagram that disagrees \n' +
  'with the words above it is worse than no diagram.\n' +
  'Some entries should NOT be illustrated. If it is about who to call, \n' +
  'where to file, what a permit costs or which office has jurisdiction, \n' +
  'return an empty diagram and say why. A picture of an office helps nobody.';

/* ── the shapes, enforced ─────────────────────────────────────────────────
   Every property is required and additionalProperties is false, so the
   handler below can read each field without guarding for its absence — which
   is the whole point of moving off "please answer in JSON". */
const str = d => ({ type: 'string', description: d });

const FILING_FIELDS = {
  belongs:           { type: 'boolean', description: 'False when this is job paperwork, a client file, a contract, an invoice or an inspection report rather than reference material.' },
  reason:            str('If belongs is false, one short sentence saying why. Empty string otherwise.'),
  hub:               { type: 'string', enum: ['general', 'insurance'], description: 'Which hub of the library this belongs in.' },
  section:           str('The existing section title it belongs in, or a NEW one you are proposing.'),
  section_is_new:    { type: 'boolean', description: 'True only when section is not already in the outline you were shown.' },
  subsection:        str('Optional subsection title, or an empty string.'),
  subsection_is_new: { type: 'boolean', description: 'True only when subsection is not already in the outline you were shown.' },
  title:             str('A clear title for this item, under 70 characters.'),
  summary:           str('One or two sentences on what it covers and when someone would reach for it.'),
};

const CLASSIFY_SCHEMA = {
  type: 'object',
  properties: { ...FILING_FIELDS },
  required: Object.keys(FILING_FIELDS),
  additionalProperties: false,
};

const ASK_SCHEMA = {
  type: 'object',
  properties: {
    ...FILING_FIELDS,
    body: str('The reference entry itself, in the light markdown described in the brief.'),
    sources: {
      type: 'array',
      items: { type: 'string' },
      description: 'Short citations a person could look up. EMPTY when nothing specific governs the answer — an uncited entry beats a citation that does not say what you claim.',
    },
  },
  required: [...Object.keys(FILING_FIELDS), 'body', 'sources'],
  additionalProperties: false,
};

const ILLUSTRATE_SCHEMA = {
  type: 'object',
  properties: {
    diagram: str('The marker line and its data lines, or an empty string.'),
    caption: str('One short sentence introducing it, or an empty string.'),
    reason:  str('If diagram is empty, why a picture would not help here.'),
  },
  required: ['diagram', 'caption', 'reason'],
  additionalProperties: false,
};

/* One place the model is called. Streams and takes the final message, because
   a non-streaming request at this max_tokens is where SDK HTTP timeouts live. */
async function askClaude(client, system, content, schema) {
  const stream = client.messages.stream({
    model: MODEL,
    max_tokens: 16000,
    /* Thinking is adaptive by default on this model; effort bounds it. */
    output_config: {
      effort: EFFORT,
      format: { type: 'json_schema', schema },
    },
    system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content }],
  }, { timeout: REQ_TIMEOUT_MS });
  return await stream.finalMessage();
}

function textOf(msg) {
  return (msg && Array.isArray(msg.content) ? msg.content : [])
    .filter(b => b && b.type === 'text' && typeof b.text === 'string')
    .map(b => b.text).join('').trim();
}

/* Map an SDK error onto the shape index.html already renders. `retryable`
   keeps its old meaning: try the same thing again and it may work. */
function apiFailure(res, err) {
  const status = err && typeof err.status === 'number' ? err.status : 0;
  const retryable = status === 429 || status >= 500 || status === 0;
  res.status(502).json({
    error: 'Claude request failed',
    detail: String((err && err.message) || err || 'no response').slice(0, 500),
    retryable
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const _user = await requireSession(req, res);
  if (!_user) return;

  const apiKey = (process.env.ANTHROPIC_API_KEY || '').trim();
  if (!apiKey) {
    res.status(500).json({ error: 'ANTHROPIC_API_KEY is not configured on the server' });
    return;
  }

  try {
    const { image, file, text, filename, mime, sections, ask, illustrate } = req.body || {};
    if (!image && !file && !text && !ask && !illustrate) {
      res.status(400).json({ error: 'Send a file, an image, document text, a question, or an entry to illustrate' });
      return;
    }

    const shelf = 'The library currently looks like this:\n' + outline(sections) + '\n\n';
    let system, content, schema;

    if (illustrate) {
      /* 512: add a drawing to an entry that ALREADY EXISTS. It gets the entry's
         own words and returns ONLY a diagram - never a rewrite. Half this
         library is permit-office contact notes, so returning nothing has to be
         a first-class answer, not a failure. */
      const itTitle = String(illustrate.title || '').slice(0, 200);
      const itBody = String(illustrate.body || '').slice(0, 8000);
      if (!itBody.trim()) {
        res.status(400).json({ error: 'That entry has no text to illustrate' });
        return;
      }
      system = ILLUSTRATE_BRIEF;
      schema = ILLUSTRATE_SCHEMA;
      content = 'Title: ' + itTitle + '\n\nThe entry says:\n"""\n' + itBody + '\n"""';

    } else if (ask) {
      /* A question is a request to GROW the library. Write a reference entry
         worth keeping and say where it should be filed — the browser then
         stores it, so the next person finds it without asking. */
      system = RULES + '\n' + ASK_BRIEF;
      schema = ASK_SCHEMA;
      content = shelf + 'A member of the crew asked:\n"' + String(ask).slice(0, 800) + '"';

    } else if (file) {
      /* Same request shape as /api/sol.js: { file: <base64 payload>, mime }.
         PDFs go up as a document block and are read directly.

         806: Gemini would swallow any mime type. Claude takes PDFs and images;
         anything else is refused HERE with a sentence that says what to do,
         rather than being sent up to fail obscurely. Nothing has ever come
         through this branch in production - all 32 library items are notes -
         so this narrows a path that has never carried traffic. */
      const mt = String(mime || 'application/pdf').toLowerCase();
      const b64 = String(file).includes(',') ? String(file).split(',').pop() : String(file);
      if (!b64) { res.status(400).json({ error: 'Empty file payload' }); return; }
      if (mt.indexOf('pdf') === -1) {
        res.status(400).json({
          error: 'The librarian reads PDFs and photos. Save this as a PDF, or paste its text in and ask about that.'
        });
        return;
      }
      system = RULES + '\n' + SHAPE;
      schema = CLASSIFY_SCHEMA;
      content = [
        { type: 'text', text: shelf + 'This file was uploaded to the library' +
          (filename ? ' (filename: ' + String(filename).slice(0, 120) + ')' : '') +
          '. Read it and decide where it belongs.' },
        { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: b64 } }
      ];

    } else if (image) {
      const match = typeof image === 'string'
        ? image.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.*)$/)
        : null;
      if (!match) {
        res.status(400).json({ error: 'Missing or invalid image data URL' });
        return;
      }
      system = RULES + '\n' + SHAPE;
      schema = CLASSIFY_SCHEMA;
      content = [
        { type: 'text', text: shelf + 'A photo was uploaded to the library' +
          (filename ? ' (filename: ' + String(filename).slice(0, 120) + ')' : '') +
          '. Decide where it belongs.' },
        { type: 'image', source: { type: 'base64', media_type: match[1], data: match[2] } }
      ];

    } else {
      system = RULES + '\n' + SHAPE;
      schema = CLASSIFY_SCHEMA;
      content = shelf +
        'A document was uploaded to the library' +
        (filename ? ' (filename: ' + String(filename).slice(0, 120) + ')' : '') +
        (mime ? ', type ' + String(mime).slice(0, 60) : '') + '.\n' +
        'Here is the text extracted from it:\n"""\n' +
        String(text).slice(0, 12000) + '\n"""';
    }

    const client = new Anthropic({ apiKey, maxRetries: MAX_RETRIES });

    let msg;
    try { msg = await askClaude(client, system, content, schema); }
    catch (e) { apiFailure(res, e); return; }

    /* A refusal is a 200 with nothing usable in it. Say so rather than
       failing to parse an empty string. */
    if (msg && msg.stop_reason === 'refusal') {
      res.status(502).json({ error: 'The model declined that one', detail: '', retryable: false });
      return;
    }
    /* Truncation would hand JSON.parse half an object. Structured output
       cannot protect against running out of room. */
    if (msg && msg.stop_reason === 'max_tokens') {
      res.status(502).json({ error: 'The answer ran long and was cut off — ask for something narrower', retryable: true });
      return;
    }

    const out = textOf(msg);

    let parsed;
    try { parsed = JSON.parse(out); }
    catch (e) {
      res.status(502).json({ error: 'Model returned unparseable output', detail: out.slice(0, 300) });
      return;
    }

    /* 446: sources is display-only and reaches the DB as text[]. Coerce to a
       clean array of short strings here so the browser never has to guess —
       a model returning a bare string or null must not become [null].
       512: this sat INSIDE the catch above, so it ran only when JSON.parse had
       already thrown - at which point `parsed` is undefined and its own guard is
       false. Dead since 446. Nothing corrupt reached the database because the
       browser re-guards on insert, but a model answering sources as a bare
       string failed that Array.isArray check and the citation was dropped, which
       is the exact thing this block was written to prevent. */
    if (parsed && typeof parsed === 'object') {
      const raw = parsed.sources;
      const list = Array.isArray(raw) ? raw : (typeof raw === 'string' && raw.trim() ? [raw] : []);
      parsed.sources = list
        .map(x => String(x == null ? '' : x).trim().slice(0, 200))
        .filter(x => x.length > 1)
        .slice(0, 8);
    }

    if (illustrate) {
      const d = String(parsed.diagram || '').trim();
      res.status(200).json({
        diagram: d.slice(0, 1200),
        caption: String(parsed.caption || '').slice(0, 300),
        reason: String(parsed.reason || '').slice(0, 300)
      });
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
