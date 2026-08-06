// /api/detect.js
// Vercel serverless function — finds damage in ONE inspection photograph and
// says WHERE it is, as normalised coordinates.
//
// WHY THIS IS NOT /api/analyze.js. That route returns 2-4 sentences of prose:
// useful to a rep reading it, useless to a renderer. This one returns located
// findings — a box, a severity and a short label per defect — so the app can
// draw a circle on top of the photograph.
//
// THE CIRCLES ARE AN OVERLAY, NEVER BURNED IN. This route touches no pixels
// and returns no image. The app renders boxes over the original, which means
// the photograph on file is never altered — the whole reason auto-annotation
// is safe to run on roofs that end up in insurance claims. Anything that later
// flattens a circle into a JPEG is doing something different, and should only
// ever do it to a copy made for presentation.
//
// NOTHING HERE REACHES A HOMEOWNER UNREVIEWED. This is a suggestion engine.
// A person accepts, adjusts or rejects every finding before it is shown.
//
// Same GEMINI_API_KEY as analyze.js / caption.js / organize.js / sortphotos.js.

const SUPABASE_URL = (process.env.SUPABASE_URL || 'https://yipslubcptjoarblzbpl.supabase.co').trim();
const SUPABASE_ANON_KEY = (process.env.SUPABASE_ANON_KEY || 'sb_publishable_aGsug3EBJjHX90BLKd5bLQ_zryUMqNZ').trim();

/* ─────────────────────────────────────────────────────────────────────────
   ONE vocabulary, pinned in ONE place — the normStage lesson.

   `severity` is NOT a new scale. It is the existing crit/warn/ok used by
   severityOf() and api/sortphotos.js, which the report already renders as
   HIGH / MODERATE / MONITOR and which matches the three tiers in Theo's
   brief: Severe (replace) / Moderate (repair) / Minor (monitor). A fourth
   scale under a colliding name is the failure this project keeps paying for.

   `defect` IS new — nothing in the app localises damage today, so there is no
   prior art to match. It must be mirrored client-side before anything reads
   it: a value this route can emit that the client does not know silently
   becomes something else on the other side.
   ───────────────────────────────────────────────────────────────────── */
const SEVERITIES = ['crit', 'warn', 'ok'];

const DEFECTS = {
  hail_impact:      'a hail bruise or impact mark — granule loss with a soft, dented mat',
  wind_lifted:      'a lifted, creased or torn tab, or a shingle folded back by wind',
  missing_shingle:  'a shingle wholly or partly gone, deck or underlayment showing',
  granule_loss:     'general granule wear exposing the mat, not a discrete impact',
  cracked_split:    'a split, crack or thermal fracture through a shingle',
  nail_pop:         'a fastener backing out, tenting or piercing the shingle above',
  exposed_fastener: 'a nail head sitting exposed on the surface, unsealed',
  flashing_failed:  'rusted, lifted, sealed-with-caulk or improperly lapped flashing',
  flashing_missing: 'flashing that should be present and is not — kickout, step, counter',
  pipe_boot:        'a cracked, split or UV-perished pipe-boot collar',
  chimney:          'a chimney defect — crown, counter-flashing, masonry, chase cover',
  valley:           'valley wear, debris packing, or an improperly cut valley',
  ridge_cap:        'damaged, missing or improperly fastened hip and ridge cap',
  ponding_debris:   'standing water, packed debris or organic growth holding moisture',
  decking_sag:      'a sag, dip or soft spot indicating decking or framing trouble',
  ice_dam:          'ice damming or the staining and wear it leaves behind',
  other:            'a real, visible defect that fits none of the above',

  /* ── 17-30: the exterior half, added 5 Aug 2026; narrowed 602 ────────────
     THESE KEYS ARE A CONTRACT AND THE ORDER IS LOAD-BEARING. They are
     exterior_vocab.py on Theo's Spark, verbatim — the same file
     prepare_yolo.py and recover_other.py import, so DEFECT_KEYS is index-
     aligned with the trained model's class indices 0-30. `other` stays at 16
     for that reason, not because an escape hatch belongs mid-list. Renaming or
     reordering silently decouples this route from the model.

     They are not invented. They are the clusters of what the model ACTUALLY
     called the 294 boxes a roof-only vocabulary had to flatten to 'other'
     (gutter 65, soffit/fascia 57, window 42, deck 42), and they map onto the
     six trades in walks_trade_ck with no seventh trade needed.

     602: soffit_damage and fascia_damage MERGED back to one key, and
     paint_deterioration REMOVED. The cluster line above is the reason —
     the boxes grouped as 'soffit/fascia 57', one cluster, and splitting
     them into two classes is what let the model spread confidence across
     both. NMS is per-class, so neither suppressed the other and the same
     eave came back boxed three or four times. paint_deterioration was a
     CONDITION among LOCATIONS — it stacked on every surface — so paint
     failure now belongs to whichever surface carries it, and is named in
     both descriptions above so the model still has somewhere to put it.
     33 -> 31 classes. Every index <= 18 is unchanged; the roof half and
     `other` keep their numbers. */
  gutter_damage:        'a bent, sagging, separated or holed gutter trough',
  downspout_damage:     'a crushed, detached, missing or mis-draining downspout or elbow',
  soffit_fascia_damage: 'soffit rot, holes or sagging panels, or a rotted, split, water-stained or detached fascia board \u2014 including paint failure on either',
  siding_damage:        'cracked, holed, buckled, chalked or missing siding or trim, including paint failure on it',
  masonry_damage:       'spalling brick, cracked or missing mortar, damaged stone or stucco',
  vegetation_contact:   'branches, vines or heavy growth touching or overhanging the envelope',
  window_glass_damage:  'cracked, chipped, shattered or impact-marked glazing',
  window_seal_failure:  'a failed sealed unit — fogging or condensation between the panes',
  window_frame_damage:  'rot, warp, separation or damage to a sash, frame, sill or surround',
  deck_penetration:     'an unsealed hole or penetration through the roof deck or sheathing',
  underlayment_exposed: 'underlayment, felt or housewrap left exposed to the weather',
  hardware_loose:       'loose, missing or failing fasteners, hangers, brackets or straps',
  electrical_hazard:    'a damaged service mast, weatherhead, exposed conductor or meter',
  interior_water_damage:'staining, streaking or water damage visible from outside'
};
const DEFECT_KEYS = Object.keys(DEFECTS);

/* Bounds. The gate decides WHO may spend the key; these decide how much one
   press can cost and how much a confused model can return. */
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;    // matches analyze.js
const MAX_FINDINGS = 12;                    // a roof slope with 30 boxes is noise

/* COLLECTION MODE — `{collect:true}` in the body.

   This route has two callers with opposite requirements. A rep reviewing one
   photograph wants the 12 most significant findings; 30 boxes is noise, and
   that is what MAX_FINDINGS is for. The Spark's label pipeline wants the
   OPPOSITE: a slope with 30 hail impacts is 30 training examples for the class
   with the least data, and summarising it to 12 throws away the 18 that matter
   most.

   Measured 5 Aug 2026 over 1274 collected photographs: `dropped` was 0 on every
   one, so the route-side truncation below has NEVER fired in a collection run,
   and neither has the size floor. The cap that may still bite is the one in
   rule 6 of the prompt — the model self-limiting before this code ever sees the
   excess. That is invisible from the response, which is why collection mode
   lifts the instruction rather than only the constant. */
const COLLECT_MAX_FINDINGS = 40;
const LABEL_MAX = 70;
const NOTE_MAX = 180;

const GEMINI_MODELS = ['gemini-3.6-flash', 'gemini-3.5-flash'];

/* Only signed-in Cardinal users may spend the Gemini key. Same gate as
   sortphotos.js and for the same reason: this route only ever sees a
   photograph the caller already has. It cannot reach another client's job,
   so it does not need the admin gate that api/companycam.js carries. */
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

/* THE SIX TRADES, and they are not this file's invention — they are
   walks_trade_ck (walks_schema.sql:53), and index.html:57402 passes the walk's
   trade into this route as `label`. One grows, all grow.

   Why this exists: 294 of 959 collected boxes (30.7%) coerced to 'other',
   because a roof-only vocabulary was being asked to describe siding, window and
   gutter walks. Widening DEFECTS is half the fix. The other half is here — a
   prompt that opened "You are assisting a ROOFING inspector" and instructed
   "undamaged ROOFS exist" tells the model what to look at, and it was not
   gutters. Naming the trade uses information the route already receives.

   Anything not in this map falls back to the old generic label hint, so a
   caller passing something else is unaffected. */
const TRADE_FOCUS = {
  roof:     'a ROOF inspection — shingles, flashing, valleys, ridge and hip, penetrations, decking',
  siding:   'a SIDING inspection — cladding, trim, soffit, fascia, corners, J-channel, wraps',
  windows:  'a WINDOW inspection — glass, seals, screens, sills, surrounds, caulking, trim',
  andersen: 'an ANDERSEN WINDOW inspection — as windows, on Andersen units specifically',
  gutters:  'a GUTTER inspection — troughs, downspouts, hangers, end caps, pitch and drainage',
  general:  'a GENERAL exterior inspection — the whole envelope, roof through foundation line'
};

function prompt(label, collect) {
  const focus = TRADE_FOCUS[String(label || '').trim().toLowerCase()] || '';
  return (
    'You are assisting an exterior inspector for Cardinal Roofing & Renovations. ' +
    'Examine this inspection photograph' +
    (focus ? '' : (label ? ' (labelled: "' + label + '")' : '')) + ' ' +
    'and locate every DEFECT you can actually see and point at.\n\n' +

    (focus
      ? 'THIS PHOTOGRAPH IS FROM ' + focus +
        '. Look there first. Defects on other parts of the building still count ' +
        'if you can see them and place a box on them — report what is in front ' +
        'of you, not only what the trade name says.\n\n'
      : '') +

    'Return ONLY JSON, no prose, no code fence:\n' +
    '{"quality":"ok"|"poor","quality_note":"...","findings":[' +
    '{"defect":"<key>","severity":"crit"|"warn"|"ok","label":"short name",' +
    '"note":"one short sentence on what it is and why it matters",' +
    '"box":{"x":0.0,"y":0.0,"w":0.0,"h":0.0},"confidence":0.0}]}\n\n' +

    'THE BOX IS THE POINT. x,y is the TOP-LEFT corner as a FRACTION of image ' +
    'width and height, w,h are the width and height as fractions. All four are ' +
    'between 0 and 1. x=0,y=0 is the top-left of the photograph. Make the box ' +
    'tight around the defect, not the whole slope or wall.\n\n' +

    'RULES, and the first one matters more than the rest:\n' +
    '1. If you cannot point at it, do not report it. A finding with no box is ' +
    'not wanted here. Better to return nothing than to guess a location.\n' +
    '2. An empty findings array is a correct and useful answer. Sound roofs, sound ' +
    'siding and sound windows all exist. Do not manufacture a defect to fill the ' +
    'list.\n' +
    '3. Report only what is VISIBLE in this photograph. Do not infer damage ' +
    'from the age or style of the building.\n' +
    '4. If the photograph is too dark, blurry, distant or obstructed to judge, ' +
    'set quality "poor", say why in quality_note, and return few or no findings. ' +
    'A confident box on an unreadable photo is worse than no box.\n' +
    '5. severity: "crit" = replace, active or imminent failure. "warn" = repair, ' +
    'real but contained. "ok" = monitor, wear within tolerance. When torn ' +
    'between two, choose the LESS severe — a person reviews this before a ' +
    'homeowner ever sees it, and overstating damage on an insurance job is the ' +
    'more costly mistake.\n' +
    (collect
      ? '6. List EVERY distinct defect you can place a box on, up to ' +
        COLLECT_MAX_FINDINGS + '. Do NOT summarise and do NOT skip repeats: if a ' +
        'slope carries twenty separate hail impacts, return twenty boxes, one ' +
        'per impact. Repetition is wanted here.\n'
      : '6. At most ' + MAX_FINDINGS + ' findings. If there are more, return the ' +
        'most significant.\n') +
    '7. confidence is your own 0-1 estimate that this defect is really there.\n\n' +

    'defect must be exactly one of these keys:\n' +
    DEFECT_KEYS.map(k => '  ' + k + ' — ' + DEFECTS[k]).join('\n')
  );
}

/* Models wrap JSON in prose or a fence often enough that this is not optional. */
function parseJson(text) {
  if (!text) return null;
  let s = String(text).trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) s = fence[1].trim();
  try { return JSON.parse(s); } catch (e) { /* fall through */ }
  const a = s.indexOf('{'), b = s.lastIndexOf('}');
  if (a !== -1 && b > a) {
    try { return JSON.parse(s.slice(a, b + 1)); } catch (e) { /* give up */ }
  }
  return null;
}

function num(v) {
  const n = typeof v === 'number' ? v : parseFloat(v);
  return Number.isFinite(n) ? n : null;
}
function clamp01(n) { return Math.min(1, Math.max(0, n)); }
function trim(s, max) {
  const t = String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
  return t.length > max ? t.slice(0, max - 1).trimEnd() + '…' : t;
}

/* Everything the model returns is treated as a proposal, not a fact. A finding
   that cannot be placed on the photograph is DROPPED rather than coerced: this
   route's whole contract is that a finding has a location. */
function cleanFindings(raw, cap) {
  const by = { malformed: 0, unplaceable: 0, tiny: 0, truncated: 0 };
  const total = () => by.malformed + by.unplaceable + by.tiny + by.truncated;
  if (!Array.isArray(raw)) return { findings: [], dropped: 0, dropped_by: by };
  const out = [];

  for (const f of raw) {
    if (!f || typeof f !== 'object') { by.malformed++; continue; }
    const b = f.box || {};
    let x = num(b.x), y = num(b.y), w = num(b.w), h = num(b.h);
    if (x === null || y === null || w === null || h === null) { by.unplaceable++; continue; }

    // Some models answer in percent despite the instruction. 0-100 is
    // unambiguous here because a legal fraction never exceeds 1.
    if (x > 1 || y > 1 || w > 1 || h > 1) { x /= 100; y /= 100; w /= 100; h /= 100; }

    x = clamp01(x); y = clamp01(y);
    w = clamp01(w); h = clamp01(h);
    if (x + w > 1) w = 1 - x;
    if (y + h > 1) h = 1 - y;
    if (w <= 0.005 || h <= 0.005) { by.tiny++; continue; }   // a dot is not a location

    /* THE MODEL'S OWN WORD IS KEPT. Coercing an unrecognised name to 'other' is
       right for the reviewer — a defect the client cannot render is worse than
       one with an ugly name — but it is lossy, and the loss was not small.
       Measured 5 Aug 2026 over the collected corpus: 294 of 959 boxes (30.7%)
       landed on 'other', the largest single leak in the label pipeline. The raw
       string is the only thing that can recover them, so it now travels with the
       finding instead of being discarded at the coercion. */
    const defect = DEFECT_KEYS.indexOf(f.defect) !== -1 ? f.defect : 'other';
    const rawDefect = typeof f.defect === 'string' ? trim(f.defect, 40) : '';
    /* Unknown severity falls to the LEAST alarming, not the most. The reviewer
       can raise it; nobody wants the machine inventing urgency on a roof that
       may end up in a claim. */
    const severity = SEVERITIES.indexOf(f.severity) !== -1 ? f.severity : 'ok';
    const conf = num(f.confidence);

    out.push({
      defect: defect,
      severity: severity,
      label: trim(f.label, LABEL_MAX) || defect.replace(/_/g, ' '),
      note: trim(f.note, NOTE_MAX),
      box: { x: +x.toFixed(4), y: +y.toFixed(4), w: +w.toFixed(4), h: +h.toFixed(4) },
      confidence: conf === null ? null : +clamp01(conf).toFixed(2),
      /* Present ONLY when the model said something the vocabulary does not have.
         JSON.stringify omits undefined, so the ~69% that matched cost nothing. */
      raw_defect: (rawDefect && rawDefect !== defect) ? rawDefect : undefined
    });
  }

  const rank = { crit: 0, warn: 1, ok: 2 };
  out.sort((p, q) => (rank[p.severity] - rank[q.severity]) ||
                     ((q.confidence || 0) - (p.confidence || 0)));
  const lim = cap || MAX_FINDINGS;
  if (out.length > lim) {
    by.truncated += out.length - lim;
    out.length = lim;
  }
  /* `dropped` stays a plain integer — the client and the Spark's hail_review.py
     both read it, and a bare 0 was the useful answer over 1274 photographs.
     `dropped_by` is the addition: a zero told us nothing had gone, but a
     non-zero would not have said which path took it. */
  return { findings: out, dropped: total(), dropped_by: by };
}

async function askGemini(model, key, image, mime, label, collect) {
  const g = await fetch(
    'https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        contents: [{ parts: [
          { inline_data: { mime_type: mime || 'image/jpeg', data: image } },
          { text: prompt(label, collect) }
        ]}],
        generationConfig: {
          maxOutputTokens: 1400,
          temperature: 0.1,                 // locating, not composing
          responseMimeType: 'application/json'
        }
      })
    }
  );
  const j = await g.json();
  if (!g.ok) {
    const e = new Error((j.error && j.error.message) || 'Gemini request failed');
    e.status = g.status;
    throw e;
  }
  return (((j.candidates || [])[0] || {}).content || {}).parts?.map(p => p.text).join('') || '';
}

async function askOpenAI(oaKey, image, mime, label, collect) {
  const o = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + oaKey },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      max_tokens: 1400,
      temperature: 0.1,
      response_format: { type: 'json_object' },
      messages: [{ role: 'user', content: [
        { type: 'text', text: prompt(label, collect) },
        { type: 'image_url', image_url: { url: 'data:' + (mime || 'image/jpeg') + ';base64,' + image } }
      ]}]
    })
  });
  const oj = await o.json();
  if (!o.ok) throw new Error((oj.error && oj.error.message) || 'OpenAI request failed');
  return ((oj.choices || [])[0] || {}).message?.content || '';
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'POST only' }); return; }

  try {
    const user = await requireSession(req, res);
    if (!user) return;

    const { image, mime, label } = req.body || {};
    /* Collection mode is opt-in and session-gated like everything else here.
       The reviewer path never sets it, so its behaviour is byte-identical. */
    const collect = (req.body || {}).collect === true;
    if (!image || typeof image !== 'string') { res.status(400).json({ error: 'No image' }); return; }
    if (image.length > MAX_IMAGE_BYTES * 1.4) { res.status(413).json({ error: 'Image too large' }); return; }

    const key = (process.env.GEMINI_API_KEY || '').trim();
    const oaKey = (process.env.OPENAI_API_KEY || '').trim();
    if (!key && !oaKey) { res.status(500).json({ error: 'No AI key configured in Vercel' }); return; }

    let text = '', via = '', lastErr = null;

    /* The settled ladder: newer flash, then older flash, then the other
       provider. The free tier 503s often enough that one pause between
       attempts is worth more than any prompt tuning. */
    if (key) {
      for (const model of GEMINI_MODELS) {
        try {
          text = await askGemini(model, key, image, mime, label, collect);
          via = model;
          break;
        } catch (e) {
          lastErr = e;
          if (e.status === 503 || e.status === 429) await sleep(1200);
        }
      }
    }
    if (!text && oaKey) {
      try { text = await askOpenAI(oaKey, image, mime, label, collect); via = 'gpt-4o-mini'; }
      catch (e) { lastErr = e; }
    }
    if (!text) {
      res.status(502).json({ error: (lastErr && lastErr.message) || 'AI request failed' });
      return;
    }

    const parsed = parseJson(text);
    if (!parsed) {
      /* Do not hand the caller half-parsed prose and let it guess. */
      res.status(502).json({ error: 'The model did not return usable JSON', via: via });
      return;
    }

    const { findings, dropped, dropped_by } = cleanFindings(
      parsed.findings, collect ? COLLECT_MAX_FINDINGS : MAX_FINDINGS);
    const quality = parsed.quality === 'poor' ? 'poor' : 'ok';

    res.status(200).json({
      findings: findings,
      quality: quality,
      quality_note: trim(parsed.quality_note, NOTE_MAX),
      counted: findings.length,
      dropped: dropped,                 // unplaceable proposals, for honest debugging
      dropped_by: dropped_by,           // which path took them — 0 everywhere is a real answer
      collect: collect || undefined,    // so a collected record says how it was gathered
      via: via,
      /* Echoed so the client can detect deploy skew against its own copy of the
         vocabulary, the way cr-sortvocab-script does with sortphotos. */
      vocab: { severities: SEVERITIES, defects: DEFECT_KEYS }
    });

  } catch (err) {
    res.status(500).json({ error: String((err && err.message) || err) });
  }
}
