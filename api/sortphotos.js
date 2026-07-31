// /api/sortphotos.js
// Vercel serverless function — bulk-sorts photographs that are ALREADY IN an
// inspection report into their sections, with a caption, a severity and a trade.
//
// SCOPE, and the reason this route's gate differs from the CompanyCam picker's:
// it only ever sees photographs the caller already has in this report. It never
// touches CompanyCam and cannot reach another client's job. /api/companycam.js
// stays admin-only because it reaches all 1,437 jobs and can put the wrong
// customer's house into a report that goes out by email and public link. This
// one is merely SIGNED IN — settled by Theo, recorded in OPEN_ITEMS. Spend is
// bounded by MAX_PHOTOS below, not by the gate.
//
// Same GEMINI_API_KEY as organize.js / librarian.js / caption.js.

const SUPABASE_URL = (process.env.SUPABASE_URL || 'https://yipslubcptjoarblzbpl.supabase.co').trim();
const SUPABASE_ANON_KEY = (process.env.SUPABASE_ANON_KEY || 'sb_publishable_aGsug3EBJjHX90BLKd5bLQ_zryUMqNZ').trim();

/* ─────────────────────────────────────────────────────────────────────────
   ONE vocabulary, pinned in ONE place.

   This is the biggest correctness risk in this route, so none of it is
   invented. `section` already had incompatible prior art — organize.js
   defines sections as numeric 3-8 and rejects anything outside — so this
   route uses the SAME numbering rather than a fourth scheme under a
   colliding name. `severity` matches severityOf() (index.html:31212).
   `trade` is the EST_TYPES key set (index.html:16771), not a new list.

   A value this route can emit that the client does not know silently
   becomes something else on the other side. That is the normStage lesson:
   the whitelist ships before the writer.
   ───────────────────────────────────────────────────────────────────── */
const SECTIONS = {
  3: 'Exterior Elevations (ground-level photos of the sides of the building, siding, gutters, fascia, overall elevation views)',
  4: 'Aerial Roof Overview (drone/overhead shots showing the whole roof or large portions of it)',
  5: 'Roof Surface: Shingles, Fasteners, Hips & Ridges (close-ups of shingle condition, granule loss, nail pops, hip/ridge caps, brittleness)',
  6: 'Penetrations & Flashings (pipe jacks, boot seals, vents, step/counter flashing, roof-to-wall transitions, skylights)',
  7: 'Chimney (masonry, crown, chimney flashing, chase covers)',
  8: 'Attic, Roof Decking & Ventilation (interior attic shots, decking, framing, insulation, intake/exhaust ventilation)'
};
const SECTION_MIN = 3;
const SECTION_MAX = 8;
const SEVERITIES = ['crit', 'warn', 'ok'];
const TRADES = ['roof', 'siding', 'windows', 'andersen', 'gutters', 'general'];

/* Bounds spend. Applies regardless of who is signed in — the gate decides WHO
   may sort, this decides HOW MUCH one press can cost. */
const MAX_PHOTOS = 24;

const CAPTION_MAX = 300;

/* Only signed-in Cardinal users may spend the Gemini key. Copied verbatim from
   /api/organize.js together with its caller — the helper is inert without the
   two lines in handler() that actually invoke it. */
async function requireSession(req, res) {
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

/* The retry ladder, taken from librarian.js:48-65 WITH ITS BUG FIXED.
   That version sleeps after the final attempt too, so a job that is going to
   fail anyway still burns 1200 ms of billed time before returning. Sleep only
   when another attempt will actually follow. */
const ATTEMPTS = 2;
const RETRY_PAUSE_MS = 1200;

async function askGemini(apiKey, parts) {
  const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent';
  const opts = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({ contents: [{ parts }] })
  };
  let last = null;
  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    const r = await fetch(url, opts);
    if (r.ok) return r;
    last = r;
    if (r.status !== 503 && r.status !== 429) break;
    if (attempt < ATTEMPTS - 1) await new Promise(s => setTimeout(s, RETRY_PAUSE_MS));
  }
  return last;
}

/* 501: the second rung. gemini-3.5-flash is 503ing "high demand" about one call
   in four and taking 6-14s when it does answer; OpenAI answers the same server in
   0.6s. gpt-4o-mini is multimodal, so it can read the photograph too.

   Returns the raw text, or null. Never throws - sortOne's contract is that every
   photograph comes back in exactly one of two lists, and a throw here would
   silently drop one. */
async function askOpenAI(prompt, mime, b64) {
  const key = (process.env.OPENAI_API_KEY || '').trim();
  if (!key) return null;
  try {
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 300,
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: 'data:' + mime + ';base64,' + b64 } }
          ]
        }]
      })
    });
    if (!r || !r.ok) return null;
    const d = await r.json();
    const t = d && d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content;
    return (t && String(t).trim()) || null;
  } catch (e) {
    return null;
  }
}

function sectionList() {
  return Object.keys(SECTIONS).map(n => n + ' — ' + SECTIONS[n]).join('\n');
}

function promptFor() {
  return 'You are sorting photographs into a professional roof inspection report with these sections:\n' +
    sectionList() + '\n\n' +
    'Look at the attached photograph. Respond with ONLY raw JSON, no markdown fences, in this shape:\n' +
    '{"section": <number ' + SECTION_MIN + '-' + SECTION_MAX + '>, ' +
    '"caption": "<one concise sentence, under 20 words, in professional roofing-inspection language>", ' +
    '"severity": "<one of: ' + SEVERITIES.join(' | ') + '>", ' +
    '"trade": "<one of: ' + TRADES.join(' | ') + '>"}\n\n' +
    'severity means: crit = active damage or a leak path; warn = wear or a defect worth noting; ' +
    'ok = shown for the record, nothing wrong. If the photograph does not clearly belong in any ' +
    'section, omit the section field rather than guessing.';
}

/* One photograph -> a placement or a reason it was set aside. NEVER throws:
   the caller relies on every submitted photo coming back in exactly one of the
   two lists, and a throw here would silently drop one. */
async function sortOne(apiKey, photo) {
  const id = photo && photo.id != null ? String(photo.id) : '';
  const aside = reason => ({ id, reason });

  const img = photo && typeof photo.dataUrl === 'string' ? photo.dataUrl : '';
  const match = img.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.*)$/);
  if (!match) return { setAside: aside('not an image data URL') };

  /* 501: Gemini first - it is what every other route uses and what this prompt
     was tuned against - then OpenAI if it refuses or returns nothing usable. A
     photograph is only set aside once BOTH have failed. */
  const prompt = promptFor();
  let text = '';
  let via = 'gemini';

  try {
    const r = await askGemini(apiKey, [
      { text: prompt },
      { inlineData: { mimeType: match[1], data: match[2] } }
    ]);
    if (r && r.ok) {
      const data = await r.json();
      text = (data && data.candidates && data.candidates[0] && data.candidates[0].content &&
              data.candidates[0].content.parts && data.candidates[0].content.parts[0] &&
              data.candidates[0].content.parts[0].text || '').trim();
    }
  } catch (e) {
    text = '';
  }

  if (!text) {
    const alt = await askOpenAI(prompt, match[1], match[2]);
    if (alt) { text = alt.trim(); via = 'openai'; }
  }

  if (!text) return { setAside: aside('both models refused') };

  text = text.replace(/```json|```/g, '').trim();

  let parsed;
  try { parsed = JSON.parse(text); }
  catch (e) { return { setAside: aside('model returned unparseable output') }; }

  const section = parseInt(parsed && parsed.section, 10);
  if (!(section >= SECTION_MIN && section <= SECTION_MAX)) {
    return { setAside: aside('no confident section') };
  }

  // Coerce to the pinned vocabularies. An unknown value is NOT passed through —
  // it falls back to the safe end of each scale, so nothing the client has never
  // heard of can reach it.
  const severity = SEVERITIES.indexOf(parsed && parsed.severity) !== -1 ? parsed.severity : 'ok';
  const trade = TRADES.indexOf(parsed && parsed.trade) !== -1 ? parsed.trade : 'roof';
  const caption = String((parsed && parsed.caption) || '').slice(0, CAPTION_MAX);

  return { placed: { id, section, caption, severity, trade, via } };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // ---- Only signed-in Cardinal users may spend credits ----
  const _user = await requireSession(req, res);
  if (!_user) return;

  const apiKey = (process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey) {
    res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server' });
    return;
  }

  try {
    const photos = req.body && Array.isArray(req.body.photos) ? req.body.photos : null;
    if (!photos || !photos.length) {
      res.status(400).json({ error: 'Send an array of photos' });
      return;
    }
    if (photos.length > MAX_PHOTOS) {
      res.status(400).json({
        error: 'Too many photographs in one sort',
        detail: 'Sent ' + photos.length + ', the limit is ' + MAX_PHOTOS + ' per sort.',
        max: MAX_PHOTOS
      });
      return;
    }

    const submitted = photos.length;
    const placed = [];
    const setAside = [];

    /* 499: CONCURRENTLY, not one at a time. The previous loop awaited each
       photograph in turn, so a batch of four was four Gemini vision calls
       back-to-back - several seconds each, plus up to a 1200 ms retry pause -
       and it blew the client's 45 s timeout. Four concurrent calls take about
       as long as one.

       sortOne NEVER throws (asserted in its own gate), so Promise.all cannot
       reject here and cannot lose a photograph. Results come back in the order
       they were requested, so the accounting below is unchanged. */
    const outs = await Promise.all(photos.map(photo => sortOne(apiKey, photo)));
    for (const out of outs) {
      if (out.placed) placed.push(out.placed);
      else setAside.push(out.setAside);
    }

    /* THE invariant this route exists to keep. A silent drop is the failure
       mode: a photograph that is neither placed nor reported looks to the user
       like it was handled. If this ever trips it is a bug in sortOne, and
       failing loudly here is better than returning a short list. */
    if (placed.length + setAside.length !== submitted) {
      res.status(500).json({
        error: 'Internal accounting error — photographs were dropped',
        detail: 'submitted ' + submitted + ', placed ' + placed.length +
                ', set aside ' + setAside.length
      });
      return;
    }

    res.status(200).json({
      placed,
      setAside,
      counts: {
        submitted, placed: placed.length, setAside: setAside.length,
        /* 501: which rung answered. A day where everything says openai is a
           Gemini outage, not a bug in this route. */
        viaGemini: placed.filter(p => p.via === 'gemini').length,
        viaOpenAI: placed.filter(p => p.via === 'openai').length
      },
      vocabulary: { sectionMin: SECTION_MIN, sectionMax: SECTION_MAX, severities: SEVERITIES, trades: TRADES }
    });
  } catch (err) {
    res.status(500).json({ error: err.message || String(err) });
  }
}
