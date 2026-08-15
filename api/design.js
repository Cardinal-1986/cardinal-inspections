// /api/design.js
// Vercel serverless function — the Exterior Designer's engine. Takes ONE
// photograph of a house and an explicit list of surface changes, and returns
// an AI-EDITED image of the same house wearing the new materials.
//
// WHY THIS IS NOT /api/detect.js. That route looks at pixels and returns
// coordinates; this one returns NEW pixels. It is the first image-GENERATING
// route in the app (OPEN_ITEMS recorded "there is no image generation in this
// app" at build 534 — this is the build that changes that, on Theo's 12 Aug
// instruction: an exterior designer as a sales resource in front of clients).
//
// THE OUTPUT IS A CONCEPT, NEVER EVIDENCE. Everything this route returns is an
// AI-generated image of a real house. The client burns an "AI CONCEPT" mark
// into it before anything is stored, and nothing produced here may reach
// project photos, inspection reports, claims, supplements or CompanyCam —
// that is the altered-evidence fence from CONTRACTOR_VISION_SUITE.md, and it
// is why saved renders live under their own designer/ storage prefix with no
// path into the claims pipeline.
//
// Same GEMINI_API_KEY as detect.js / analyze.js / caption.js / organize.js.
// No OpenAI fallback ON PURPOSE: gpt-4o-mini cannot emit images, OpenAI's
// image models are a different product with different auth, and the vendor
// question was settled in OPEN_ITEMS (1 Aug) — Gemini image generation on the
// existing key, fal.ai only as future insurance. One vendor, honest errors.

const SUPABASE_URL = (process.env.SUPABASE_URL || 'https://yipslubcptjoarblzbpl.supabase.co').trim();
const SUPABASE_ANON_KEY = (process.env.SUPABASE_ANON_KEY || 'sb_publishable_aGsug3EBJjHX90BLKd5bLQ_zryUMqNZ').trim();

/* ─────────────────────────────────────────────────────────────────────────
   ONE vocabulary, pinned in ONE place — the normStage lesson.

   The five surfaces are the feature's contract with the client UI. A change
   arriving under any other key is DROPPED, not passed through: this route
   builds a prompt from what it recognises, and silently forwarding free text
   under an unknown key would turn a pinned vocabulary into a suggestion.
   ───────────────────────────────────────────────────────────────────── */
const SURFACES = ['roof', 'siding', 'trim', 'gutters', 'windows'];
const SURFACE_LEAD = {
  roof:    'THE ROOF: replace all roof shingles with',
  siding:  'THE SIDING: replace the wall cladding with',
  trim:    'THE TRIM: repaint or replace the trim (fascia, corner boards, door and window surrounds) as',
  gutters: 'THE GUTTERS: replace the gutters and downspouts with',
  windows: 'THE WINDOWS: replace the visible window frames and sashes, keeping every opening exactly where it is, with'
};

/* Bounds. The gate decides WHO may spend the key; these decide how much one
   press can cost and how much text a confused caller can inject. */
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;   // matches detect.js / analyze.js
const MAX_CHANGE_CHARS = 300;              // one surface's instruction

/* The ladder. gemini-3.1-flash-image (Nano Banana 2) is the settled pick —
   OPEN_ITEMS vendor table, 1 Aug: existing key, existing host, ~$0.067/image;
   Imagen 4 is shut down 17 Aug 2026 and must not appear here. The older
   flash-image generation is kept as a fallback the same way detect.js keeps
   the older text flash: if the primary 404s on this key, the press should
   degrade, not die. probe mode (below) reports what the key actually has —
   OPEN_ITEMS' one unverified thing, closed the way it recommended. */
const IMAGE_MODELS = ['gemini-3.1-flash-image', 'gemini-2.5-flash-image'];

/* Only signed-in Cardinal users may spend the Gemini key. Same gate as
   detect.js and sortphotos.js, for the same reason: this route only ever sees
   a photograph the caller already has. Per Theo's 12 Aug decision this is a
   sales resource — reps use it in front of clients — so it is deliberately
   NOT admin-gated. */
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
    res.status(401).json({ error: 'Could not verify session' }); return null;
  }
}

function trim(s, max) {
  const t = String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
  return t.length > max ? t.slice(0, max - 1).trimEnd() + '…' : t;
}

/* What each surface is called when we tell the model to LEAVE IT ALONE.
   "Change nothing that is not listed" is a generic instruction and it does not
   hold: on 15 Aug Theo prompted "make only the shingled roof Evergreen Mist"
   and the siding came back a different colour. Naming the surface — "keep the
   existing siding colour exactly as it is" — is a materially stronger
   constraint than asking for silence about it. So every surface the caller is
   NOT changing gets enumerated by name, per request. */
const SURFACE_HOLD = {
  roof:    'the roof shingles, ridge caps and roof colour',
  siding:  'the wall cladding and its exact existing colour',
  trim:    'the trim — fascia, corner boards, door and window surrounds',
  gutters: 'the gutters and downspouts',
  windows: 'the window frames, sashes and glass'
};

/* Locked no matter WHICH surfaces are being changed. Every line here is a
   failure that was actually observed on a real Cardinal photograph, not a
   precaution:
     - a low-slope standing-seam porch roof came back with brown architectural
       shingles on it (15 Aug). A metal roof is not a shingle roof and must
       never be re-clad as one, even when the roof IS the surface being changed.
     - renders came back re-framed, wider than the source, with the lawn and
       trees redrawn — which is what makes compositing the result back through
       a mask impossible.
     - a door appeared, and windows moved, across three separate renders. */
const ALWAYS_HOLD = [
  'Any standing-seam, corrugated, membrane or flat METAL roof — porch, patio, ' +
  'awning or bay. Never apply shingles to a metal roof panel. Metal roofs keep ' +
  'their existing material and colour even when the main roof is being changed.',
  'Chimneys, vents, pipes, satellite dishes and solar panels.',
  'Every window, door and dormer — same count, same size, same position. Add ' +
  'nothing, remove nothing, move nothing.',
  'Landscaping, lawn, trees, shrubs, mulch beds, driveway, walkways, patio, ' +
  'fences and everything else on the ground.',
  'The sky, the sun angle, the time of day and every shadow.',
  'The camera angle, perspective, framing and crop. Return the SAME field of ' +
  'view at the SAME aspect ratio — do not zoom, pan, re-compose or extend the ' +
  'edges of the photograph.'
];

/* The fixed wrapper is SERVER-pinned; only the material descriptions inside it
   are caller data. The geometry rules are the whole product: a designer that
   moves a window or invents a dormer is showing the client a different house,
   and the sale is "YOUR house, our materials". */
function prompt(changes) {
  const lines = [];
  for (const k of SURFACES) {
    if (changes[k]) lines.push('- ' + SURFACE_LEAD[k] + ' ' + changes[k] + '.');
  }

  /* The enumerated hold list: every surface in the vocabulary the caller did
     NOT ask to change, named. */
  const hold = SURFACES.filter(k => !changes[k]).map(k => SURFACE_HOLD[k]);

  const roofNote = changes.roof
    ? '\nSHINGLE RENDERING: render a realistic architectural asphalt shingle — ' +
      'multi-tone granule blending, granule depth, dimensional shadow bands ' +
      'along each course, straight consistent course lines, and matching ' +
      'dimensional ridge caps. Match the photograph’s own lighting.\n'
    : '';

  return (
    'Edit this photograph of a house for a professional exterior-renovation ' +
    'visualization.\n\n' +
    'CHANGE ONLY THIS:\n' + lines.join('\n') + '\n' +
    roofNote + '\n' +
    'DO NOT TOUCH — these must come back pixel-for-pixel as they are:\n' +
    (hold.length ? hold.map(h => '- Keep ' + h + ' exactly as it is.\n').join('') : '') +
    ALWAYS_HOLD.map(h => '- ' + h + '\n').join('') + '\n' +
    'RULES:\n' +
    '1. Keep it the SAME house from the SAME camera angle: identical geometry, ' +
    'rooflines, window and door positions and sizes, landscaping, driveway, ' +
    'sky, lighting and shadows. Do not add, remove or move any window, door, ' +
    'dormer, chimney or structure.\n' +
    '2. Change nothing that is not listed under CHANGE ONLY THIS. Every other ' +
    'surface keeps its current material and colour.\n' +
    '3. The new materials must look professionally and newly installed, ' +
    'photorealistic, matching the photograph’s lighting and perspective.\n' +
    '4. Do not add any people, vehicles, text, labels, logos or watermarks.\n' +
    '5. Return a single edited photograph at the same aspect ratio as the input.'
  );
}

/* Models wrap image parts in either casing depending on API generation, and a
   refusal arrives as text parts — surface those honestly instead of a bare
   failure. */
function pickImagePart(j) {
  const parts = (((j.candidates || [])[0] || {}).content || {}).parts || [];
  let img = null; const notes = [];
  for (const p of parts) {
    const d = p.inline_data || p.inlineData;
    if (d && d.data && !img) img = { data: d.data, mime: d.mime_type || d.mimeType || 'image/png' };
    else if (p.text) notes.push(p.text);
  }
  return { img, note: trim(notes.join(' '), 400) };
}

async function askGeminiImage(model, key, image, mime, text, bare) {
  const body = {
    contents: [{ parts: [
      { inline_data: { mime_type: mime || 'image/jpeg', data: image } },
      { text: text }
    ]}]
  };
  /* responseModalities is how the current generation asks for pixels back.
     OPEN_ITEMS records that sources conflict on the newest API's exact shape,
     so a 400 that names the config is retried once with no config at all
     (`bare`) rather than treated as a dead model — the caller decides. */
  /* temperature low ON PURPOSE. This is a fidelity job, not a creative one —
     we want the same house back wearing one different material, and the
     variance is the defect: one prompt produced a mint roof, a tan roof and a
     shingled porch deck across three presses. It does not eliminate that (a
     prompt is a request, not a constraint) but it narrows it. */
  if (!bare) body.generationConfig = {
    responseModalities: ['IMAGE', 'TEXT'],
    temperature: 0.2
  };

  const g = await fetch(
    'https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify(body)
    }
  );
  const j = await g.json();
  if (!g.ok) {
    const e = new Error((j.error && j.error.message) || 'Gemini request failed');
    e.status = g.status;
    throw e;
  }
  const fb = j.promptFeedback || {};
  if (fb.blockReason) {
    const e = new Error('The model declined this photograph (' + fb.blockReason + ')');
    e.status = 422;
    throw e;
  }
  return pickImagePart(j);
}

/* probe:true — list which image-capable models this key can actually reach.
   This exists because the one thing OPEN_ITEMS could not verify from the
   sandbox is whether the deployed GEMINI_API_KEY has image generation at all,
   and an unauthenticated 403 proves nothing (the negative-control lesson:
   a nonsense model name 403s identically). Run from the deployed function,
   with the real key, this answers it in one press. */
async function probeModels(key) {
  const out = [];
  let page = '';
  for (let i = 0; i < 5; i++) {
    const r = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models?pageSize=200' +
      (page ? '&pageToken=' + encodeURIComponent(page) : ''),
      { headers: { 'x-goog-api-key': key } }
    );
    const j = await r.json();
    if (!r.ok) throw new Error((j.error && j.error.message) || 'Model list failed');
    (j.models || []).forEach(m => {
      const name = String(m.name || '').replace(/^models\//, '');
      if (name.indexOf('image') !== -1) out.push(name);
    });
    page = j.nextPageToken || '';
    if (!page) break;
  }
  return out;
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'POST only' }); return; }

  try {
    const user = await requireSession(req, res);
    if (!user) return;

    const key = (process.env.GEMINI_API_KEY || '').trim();
    if (!key) { res.status(500).json({ error: 'No GEMINI_API_KEY configured in Vercel' }); return; }

    if ((req.body || {}).probe === true) {
      const models = await probeModels(key);
      res.status(200).json({
        probe: true,
        imageModels: models,
        hasPrimary: models.indexOf(IMAGE_MODELS[0]) !== -1
      });
      return;
    }

    const { image, mime } = req.body || {};
    if (!image || typeof image !== 'string') { res.status(400).json({ error: 'No image' }); return; }
    if (image.length > MAX_IMAGE_BYTES * 1.4) { res.status(413).json({ error: 'Image too large' }); return; }

    /* Unknown keys dropped, known keys bounded — the vocabulary is pinned
       above, not negotiated per request. */
    const raw = (req.body || {}).changes || {};
    const changes = {};
    for (const k of SURFACES) {
      if (raw[k] && typeof raw[k] === 'string') {
        const t = trim(raw[k], MAX_CHANGE_CHARS);
        if (t) changes[k] = t;
      }
    }
    if (!Object.keys(changes).length) {
      res.status(400).json({ error: 'Nothing to change — pick at least one surface' });
      return;
    }

    const text = prompt(changes);
    let result = null, via = '', lastErr = null;

    /* The settled ladder shape: try each model, one 1.2 s pause on 503/429
       (the free tier's habit), and one bare retry when the config itself is
       what a 400 complains about.

       FIXED 15 Aug: the comment above described a behaviour the code did not
       have. `continue` advances the INNER loop, which is the config loop — so
       a 503 slept and then retried with a DIFFERENT config (bare) rather than
       retrying the same request, and a 503 on the bare pass fell out of the
       loop having never retried at all. The overload retry now has its own
       attempt, so the pause means what it says. */
    for (const model of IMAGE_MODELS) {
      for (const bare of [false, true]) {
        let next = 'model';                       // model | config | done
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            const r = await askGeminiImage(model, key, image, mime, text, bare);
            if (r.img) { result = r; via = model; next = 'done'; break; }
            /* Parsed fine but no image part — a text-only answer is a refusal;
               keep it as the error and move on. */
            lastErr = new Error(r.note || 'The model returned no image');
            break;
          } catch (e) {
            lastErr = e;
            /* Overloaded: pause and retry THIS request, unchanged. */
            if ((e.status === 503 || e.status === 429) && attempt === 0) {
              await sleep(1200); continue;
            }
            /* The config itself is what it objects to — drop it and re-ask. */
            if (e.status === 400 && !bare &&
                /modalit|generation_?config|temperature/i.test(e.message || '')) {
              next = 'config';
            }
            break;
          }
        }
        if (next !== 'config') break;             // done, or on to the next model
      }
      if (result) break;
    }

    if (!result) {
      res.status(502).json({
        error: (lastErr && lastErr.message) || 'Image generation failed',
        hint: 'If this names a missing model or permission, run the probe: POST {"probe":true} — the key in Vercel may not have image models enabled.'
      });
      return;
    }

    res.status(200).json({
      image: result.data,           // bare base64 — same convention as the request
      mime: result.mime,
      note: result.note || undefined,
      via: via,
      /* Echoed so the client can spot deploy skew, the way detect.js echoes
         its vocabulary. */
      vocab: { surfaces: SURFACES }
    });

  } catch (err) {
    res.status(500).json({ error: String((err && err.message) || err) });
  }
}
