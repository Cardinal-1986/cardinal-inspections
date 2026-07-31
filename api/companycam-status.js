// api/companycam-status.js  [v1 · 2026-07-31]
// ═════════════════════════════════════════════════════════════════════
// Health + schema probe for the CompanyCam Public API.
//
// Companion to api/ai-status.js, and deliberately the same shape: visit it
// in a browser, read the JSON, fix what says false. Same rule too —
// IT NEVER RETURNS THE KEY.
//
// Usage: https://app.cardinalroster.com/api/companycam-status
//
// WHY THIS EXISTS, rather than an importer.
// The v1 reference was read off a screenshot (see
// .claude/skills/cardinal-build/references/companycam-api.md). Six things
// were not legible, and an importer written on guesses about them would be
// the vinyl-cards failure again. Every one of the six is a single live call
// away — but no CompanyCam host is reachable from the agent sandbox, so the
// call has to happen from Vercel. This route IS that call.
//
// WHAT IT WILL NOT RETURN.
// Not the key. Not a photo. Not a URL, an address, a coordinate, a creator
// name, or any other field VALUE from a customer's job — only the FIELD
// NAMES present on a photo object. "Does v1's Photo carry `description`?"
// is answerable with a list of keys and nothing else, so that is all it
// sends. Tag names are the one exception and are opt-in behind ?tags=1,
// because they are company vocabulary ("Ice Dam", "Before") rather than
// anything about a customer — and knowing them is the whole point of the
// tag_ids filter.
//
// Public, with no session gate — matching ai-status.js, which is public for
// exactly this reason: it has to be openable from a phone with no app
// session. The cost is that a stranger could spend a little CompanyCam rate
// limit. Every call here is limit=1. Say the word and it gets the
// requireSession() + admin gate that librarian.js uses.
// ═════════════════════════════════════════════════════════════════════

const V1 = 'https://app.companycam.com/public_api/v1';
const V2 = 'https://api.companycam.com/v2';
const TIMEOUT_MS = 9000;

/* Belt and braces: nothing echoed back may contain the credential. Doorkeeper's
   error bodies do not include the token, but an error body is remote text and
   this response is public, so it gets scrubbed rather than trusted. */
function scrub(text, key) {
  let s = typeof text === 'string' ? text : JSON.stringify(text);
  if (!s) return '';
  if (key) s = s.split(key).join('[redacted]');
  return s.length > 600 ? s.slice(0, 600) + '…' : s;
}

async function call(url, key, init) {
  const t0 = Date.now();
  try {
    const r = await fetch(url, {
      ...(init || {}),
      headers: { Authorization: 'Bearer ' + key, Accept: 'application/json', ...((init || {}).headers || {}) },
      signal: AbortSignal.timeout(TIMEOUT_MS)
    });
    const raw = await r.text();
    let body = null;
    try { body = JSON.parse(raw); } catch (e) { body = null; }
    return { status: r.status, ok: r.ok, body, raw, headers: r.headers, ms: Date.now() - t0 };
  } catch (e) {
    return { status: 0, ok: false, body: null, raw: '', headers: null, ms: Date.now() - t0,
             why: String((e && e.message) || e) };
  }
}

/* Rate limits are one of the six unknowns and they arrive for free on every
   response — we just have to look. Header names vary by vendor, so sweep. */
function rateLimit(headers) {
  if (!headers) return null;
  const out = {};
  for (const [k, v] of headers.entries()) {
    if (/^(x-)?ratelimit|^retry-after$/i.test(k)) out[k] = v;
  }
  return Object.keys(out).length ? out : null;
}

export default async function handler(req, res) {
  const key = (process.env.COMPANYCAM_API_KEY || '').trim();
  const q = (req && req.query) || {};
  const want = n => (typeof q[n] === 'string' ? q[n] : Array.isArray(q[n]) ? q[n][0] : '');

  const out = {
    what: 'CompanyCam Public API probe. Field names only — no photo data, no key.',
    key: { configured: !!key, length: key ? key.length : 0 },
    v1: {},
    v2: {},
    answers: {}
  };

  if (!key) {
    out.key.why = 'COMPANYCAM_API_KEY env var is empty in this Vercel environment';
    res.status(200).json(out);
    return;
  }

  // ── 1. Does the key authenticate against v1 at all? ──────────────────
  // access_tokens/verify is the cheap way to find out; it costs no list call.
  const verify = await call(V1 + '/access_tokens/verify', key, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: ''
  });
  out.v1.verify = { ok: verify.ok, status: verify.status, ms: verify.ms };
  if (!verify.ok) out.v1.verify.why = verify.why || scrub(verify.raw, key);

  // ── 2. The photo index — the endpoint the whole importer rests on ────
  // Passthrough params so the date format (a 422, not a no-op, when wrong)
  // and `include` can be probed from the URL bar without a redeploy:
  //   ?start_date=2026-01-01&end_date=2026-03-31
  //   ?include=tags
  //   ?include_total=true
  const params = new URLSearchParams({ limit: '1' });
  for (const p of ['start_date', 'end_date', 'include', 'include_total', 'tag_ids', 'project_ids']) {
    const v = want(p);
    if (v) params.set(p, v);
  }
  out.v1.photos_query = Object.fromEntries(params.entries());

  const photos = await call(V1 + '/photos?' + params.toString(), key);
  const pr = { ok: photos.ok, status: photos.status, ms: photos.ms };
  const rl = rateLimit(photos.headers);
  if (rl) pr.rate_limit_headers = rl;

  if (photos.ok && photos.body && typeof photos.body === 'object') {
    const b = photos.body;
    pr.envelope_keys = Object.keys(b);                       // expect data/errors/meta
    const rows = Array.isArray(b.data) ? b.data : [];
    pr.returned = rows.length;

    const first = rows[0];
    if (first && typeof first === 'object') {
      // THE ANSWER TO UNKNOWN #1 — the schema tail that was below the fold.
      pr.photo_fields = Object.keys(first).sort();
      // uris[].type is the only nested enum we actually need; names, not values.
      if (Array.isArray(first.uris)) {
        pr.uri_types = first.uris.map(u => u && u.type).filter(Boolean);
        pr.uri_item_fields = first.uris[0] ? Object.keys(first.uris[0]).sort() : [];
      }
      // Which of the fields we care about are present, stated plainly.
      for (const f of ['description', 'captured_at', 'created_at', 'updated_at',
                       'internal', 'tags', 'processing_status', 'origin']) {
        out.answers['photo_has_' + f] = Object.prototype.hasOwnProperty.call(first, f);
      }
      // Type, not value — enough to know whether timestamps really are ISO strings.
      out.answers.timestamp_type = typeof first.created_at;
    } else {
      pr.photo_fields = [];
      pr.why = 'the account returned zero photos for this query';
    }

    if (b.meta && typeof b.meta === 'object') {
      pr.meta_keys = Object.keys(b.meta).sort();
      pr.has_next = b.meta.has_next === true;          // boolean, not the cursor
      out.answers.include_total_worked =
        Object.prototype.hasOwnProperty.call(b.meta, 'total') ||
        Object.prototype.hasOwnProperty.call(b.meta, 'total_count');
    }
  } else {
    pr.why = photos.why || scrub(photos.raw, key);
    // A 422 body is the doc page we could not read: it says what it wanted.
    if (photos.status === 422) out.answers.date_format_hint = scrub(photos.raw, key);
  }
  out.v1.photos = pr;

  // ── 3. Tags — opt-in, because names are the point of the tag_ids filter ──
  if (want('tags')) {
    const tags = await call(V1 + '/tags?limit=100', key);
    const tr = { ok: tags.ok, status: tags.status, ms: tags.ms };
    if (tags.ok && tags.body && Array.isArray(tags.body.data)) {
      tr.count = tags.body.data.length;
      tr.tag_fields = tags.body.data[0] ? Object.keys(tags.body.data[0]).sort() : [];
      tr.names = tags.body.data.map(t => t && (t.display_value || t.name || t.value)).filter(Boolean);
    } else {
      tr.why = tags.why || scrub(tags.raw, key);
    }
    out.v1.tags = tr;
  } else {
    out.v1.tags = { skipped: 'add ?tags=1 to list the account tag vocabulary' };
  }

  // ── 4. Is the key v2-valid but not v1-scoped? ────────────────────────
  // This is unknown #5. A key minted through the older Applications flow can
  // authenticate on v2 and still 403 insufficient_scope on v1, and the two
  // failures look identical from the app.
  const v2 = await call(V2 + '/projects?per_page=1', key);
  out.v2 = { ok: v2.ok, status: v2.status, ms: v2.ms };
  if (!v2.ok) out.v2.why = v2.why || scrub(v2.raw, key);
  const rl2 = rateLimit(v2.headers);
  if (rl2) out.v2.rate_limit_headers = rl2;

  // ── 5. Say what it all means, so nobody has to interpret status codes ──
  const v1Auth = out.v1.verify.ok || out.v1.photos.ok;
  out.answers.which_api_the_key_works_on =
    v1Auth && out.v2.ok ? 'both v1 and v2'
    : v1Auth ? 'v1 only — this is the one we want'
    : out.v2.ok ? 'v2 only — the Application is missing the v1 OAuth scopes; that is the fix'
    : 'neither — the key is wrong, expired, or revoked';
  out.answers.rate_limits_seen = !!(out.v1.photos.rate_limit_headers || out.v2.rate_limit_headers);

  res.status(200).json(out);
}
