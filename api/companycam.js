// /api/companycam.js
// Vercel serverless function — reads photographs out of CompanyCam so they can
// be filed into the Resource Library.
//
// SCOPE: reading. This route lists photos, lists the tag vocabulary, and fetches
// the bytes of ONE chosen photo. It never writes to CompanyCam, never deletes,
// and offers no endpoint that could. The importer is a one-way door.
//
// WHICH API. app.companycam.com/public_api/v1 — NOT api.companycam.com/v2.
// The v1 public API is the only one with an account-wide photo list and
// server-side date/tag filters; v2 can only list photos one project at a time.
// The full reasoning, and the measured Photo schema, are in
// .claude/skills/cardinal-build/references/companycam-api.md.
//
// THREE THINGS THIS ROUTE REFUSES TO DO, each deliberate:
//
//   1. It never returns an `internal: true` photo. That is CompanyCam's own
//      privacy flag and their wording is explicit — "should not be used in
//      marketing or other public materials". Whoever took the photo already
//      made that call and it is not ours to override. Filtered in BOTH list
//      and fetch, so a known id cannot be used to step around the list.
//
//   2. `fetch` takes a photo ID, never a URL. The server re-reads the photo
//      from CompanyCam and picks the rendition itself. If it took a URL from
//      the client this route would be an open proxy for anything the Vercel
//      box can reach.
//
//   3. It never returns the API key, and scrubs it from every error body
//      before echoing. A CompanyCam key has already been exposed once on this
//      project; assume that mistake is easy to repeat.
//
// Admin-only, on the same gate as api/invite.js — it spends a credential.

const SUPABASE_URL = (process.env.SUPABASE_URL || 'https://yipslubcptjoarblzbpl.supabase.co').trim();
const SUPABASE_ANON_KEY = (process.env.SUPABASE_ANON_KEY || 'sb_publishable_aGsug3EBJjHX90BLKd5bLQ_zryUMqNZ').trim();
const FALLBACK_ADMINS = ['theo@cardinalrenovations.net', 'joan@cardinalrenovations.net'];

const CC_BASE = 'https://app.companycam.com/public_api/v1';

/* A `web` rendition is normally well under a megabyte. Base64 inflates by a
   third and Vercel caps the response, so refuse early with a clear message
   rather than emitting a truncated body that fails to decode in the browser. */
const MAX_IMAGE_BYTES = 3 * 1024 * 1024;

/* Text search pages through captions because the API cannot. Eight pages of 100
   is 800 photos and about eight sequential round trips - enough to be useful,
   bounded enough that a vague word cannot walk the whole account. */
const MAX_SCAN_PAGES = 8;

/* Never let the key reach a response body, however the error was shaped. */
function scrub(text, key) {
  let s = String(text == null ? '' : text);
  if (key) s = s.split(key).join('[redacted]');
  return s.slice(0, 400);
}

async function cc(path, key, params) {
  const url = new URL(CC_BASE + path);
  for (const [k, v] of Object.entries(params || {})) {
    if (v == null || v === '') continue;
    if (Array.isArray(v)) v.forEach(one => { if (one !== '' && one != null) url.searchParams.append(k + '[]', one); });
    else url.searchParams.set(k, v);
  }
  const r = await fetch(url.toString(), {
    headers: { Authorization: 'Bearer ' + key, Accept: 'application/json' }
  });
  const raw = await r.text();
  let body = null;
  try { body = JSON.parse(raw); } catch (e) { /* keep raw for the error path */ }
  return { ok: r.ok, status: r.status, body, raw };
}

/* Prefer the crew's marked-up copy. An ice dam with an arrow drawn at it is
   teaching material in a way the raw frame is not — that is the whole reason
   these photos are worth importing. `original` is last and reluctant: it drags
   full-resolution job photos across for no benefit, but a large photo beats a
   missing one. */
const URI_ORDER = ['web_annotation', 'web', 'thumbnail_annotation', 'thumbnail', 'original'];

function pickUri(photo, order) {
  const uris = Array.isArray(photo && photo.uris) ? photo.uris : [];
  for (const want of (order || URI_ORDER)) {
    const hit = uris.find(u => u && u.type === want && (u.url || u.uri));
    if (hit) return { type: want, url: hit.url || hit.uri };
  }
  return null;
}

/* Only fields the Library actually needs. No coordinates — a reference photo
   does not need to carry the customer's latitude and longitude into a second
   system. */
function safePhoto(p) {
  const web = pickUri(p, ['web_annotation', 'web', 'original']);
  const thumb = pickUri(p, ['thumbnail_annotation', 'thumbnail', 'web']);
  return {
    id: String(p.id),
    description: p.description || '',
    captured_at: p.captured_at || p.created_at || '',
    project_id: p.project_id ? String(p.project_id) : '',
    creator_name: p.creator_name || '',
    annotated: !!(web && web.type === 'web_annotation'),
    thumb: thumb ? thumb.url : '',
    preview: web ? web.url : ''
  };
}

function usable(p) {
  if (!p || p.internal === true) return false;              // their privacy flag, respected
  if (p.status && p.status !== 'active') return false;      // deleted / archived
  if (p.processing_status && p.processing_status !== 'processed') return false;
  return true;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'POST only' }); return; }

  const key = (process.env.COMPANYCAM_API_KEY || '').trim();

  try {
    if (!key) { res.status(500).json({ error: 'COMPANYCAM_API_KEY not configured in Vercel' }); return; }

    // ---- 1) Signed in? ----
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    if (!token) { res.status(401).json({ error: 'Sign in required' }); return; }
    const who = await fetch(SUPABASE_URL + '/auth/v1/user', {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: 'Bearer ' + token }
    });
    if (!who.ok) { res.status(401).json({ error: 'Invalid session' }); return; }
    const caller = await who.json();
    const callerEmail = ((caller && caller.email) || '').toLowerCase();
    if (!callerEmail) { res.status(401).json({ error: 'Invalid session' }); return; }

    // ---- 2) Admin? Same gate as invite.js — DB role, hardcoded fallback ----
    let isAdmin = FALLBACK_ADMINS.includes(callerEmail);
    if (!isAdmin) {
      const service = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
      if (service) {
        const pr = await fetch(
          SUPABASE_URL + '/rest/v1/team_profiles?email=eq.' + encodeURIComponent(callerEmail) + '&select=role',
          { headers: { apikey: service, Authorization: 'Bearer ' + service } }
        );
        if (pr.ok) {
          const rows = await pr.json();
          isAdmin = Array.isArray(rows) && rows[0] && String(rows[0].role).toLowerCase() === 'admin';
        }
      }
    }
    if (!isAdmin) { res.status(403).json({ error: 'Admins only' }); return; }

    const action = String((req.body && req.body.action) || 'list');

    // ---- 3) tags — the vocabulary the filter offers ----
    if (action === 'tags') {
      const r = await cc('/tags', key, { limit: 100 });
      if (!r.ok) {
        res.status(502).json({ error: 'CompanyCam refused the tag list', status: r.status, detail: scrub(r.raw, key) });
        return;
      }
      const rows = (r.body && r.body.data) || [];
      res.status(200).json({
        tags: rows.map(t => ({ id: String(t.id), name: t.display_value || t.value || t.name || String(t.id) }))
                  .filter(t => t.name)
      });
      return;
    }

    // ---- 4) list — filtered, paged, internal photos already gone ----
    if (action === 'list') {
      const b = req.body || {};
      const limit = Math.min(Math.max(parseInt(b.limit, 10) || 30, 1), 100);
      let tagIds = Array.isArray(b.tag_ids) ? b.tag_ids.slice(0, 20) : [];

      /* 471: the librarian speaks tag NAMES, never ids — a model cannot know
         that "Ice Dam" is tag 4471. Resolve here rather than making the caller
         fetch the vocabulary first. Unknown names resolve to nothing, which
         yields an empty result rather than silently returning the whole
         account: a filter that fails open would show every photo Cardinal has
         ever taken in answer to one word. */
      let unmatchedTags = [];
      if (!tagIds.length && Array.isArray(b.tag_names) && b.tag_names.length) {
        const want = b.tag_names.slice(0, 10).map(n => String(n).trim().toLowerCase()).filter(Boolean);
        const tr = await cc('/tags', key, { limit: 100 });
        const vocab = ((tr.body && tr.body.data) || []).map(t => ({
          id: String(t.id),
          name: String(t.display_value || t.value || t.name || '').toLowerCase()
        }));
        want.forEach(w => {
          const hit = vocab.find(v => v.name === w) || vocab.find(v => v.name && v.name.indexOf(w) > -1);
          if (hit) tagIds.push(hit.id); else unmatchedTags.push(w);
        });
        if (!tagIds.length) {
          res.status(200).json({
            photos: [], next_cursor: null, has_next: false,
            unmatched_tags: unmatchedTags,
            known_tags: vocab.map(v => v.name).filter(Boolean).slice(0, 40)
          });
          return;
        }
      }

      const params = {
        limit,
        after: b.after || '',
        tag_ids: tagIds,
        project_ids: Array.isArray(b.project_ids) ? b.project_ids.slice(0, 20) : []
      };

      /* 472: TEXT SEARCH, which the API does not have. The photo index takes
         eleven parameters and none of them is a query, so matching "ice dam"
         against a caption means paging and filtering here. Bounded hard: at
         most MAX_SCAN_PAGES pages, stopping the moment we have enough. There
         are no rate-limit headers to read, so politeness has to be structural.
         Every response says how far it actually got - a search that quietly
         gave up after one page and reported "nothing found" would be worse
         than no search at all. */
      const q = String(b.q || '').trim().toLowerCase();
      const words = q ? q.split(/\s+/).filter(w => w.length > 1).slice(0, 6) : [];

      /* The accepted date format is not documented anywhere we can read, and a
         bad one is a 422 rather than an ignored parameter. So: try the filter,
         and if CompanyCam rejects it, drop the dates and filter on captured_at
         here instead. Slower, never wrong, and it means an unknown in the spec
         cannot break the feature. */
      let r = null, clientSideDates = false;
      const wantDates = !!(b.start_date || b.end_date);
      if (wantDates) {
        r = await cc('/photos', key, { ...params, start_date: b.start_date || '', end_date: b.end_date || '' });
        if (r.status === 422) { r = null; clientSideDates = true; }
      }
      if (!r) r = await cc('/photos', key, params);

      if (!r.ok) {
        res.status(502).json({ error: 'CompanyCam refused the photo list', status: r.status, detail: scrub(r.raw, key) });
        return;
      }

      let rows = ((r.body && r.body.data) || []).filter(usable);
      if (clientSideDates) {
        const from = b.start_date ? Date.parse(b.start_date) : null;
        const to = b.end_date ? Date.parse(b.end_date) : null;
        rows = rows.filter(p => {
          const t = Date.parse(p.captured_at || p.created_at || '');
          if (!t) return false;
          if (from && t < from) return false;
          if (to && t > to) return false;
          return true;
        });
      }

      let meta = (r.body && r.body.meta) || {};

      /* Text search: keep paging until we have `limit` matches or hit the cap.
         Scoring is deliberately dumb - all words beat some words, a whole-phrase
         hit sorts first - because a caption is one short line and anything
         cleverer would be guessing. */
      let scanned = rows.length, pages = 1, captioned = rows.filter(p => p.description).length;
      if (words.length) {
        const score = p => {
          const d = String(p.description || '').toLowerCase();
          if (!d) return 0;
          const hits = words.filter(w => d.indexOf(w) > -1).length;
          if (!hits) return 0;
          return (d.indexOf(q) > -1 ? 100 : 0) + hits * 10 + (hits === words.length ? 5 : 0);
        };
        let pool = rows.map(p => ({ p, s: score(p) })).filter(x => x.s > 0);
        let cursor = meta.has_next === true ? meta.next_cursor : null;
        while (pool.length < limit && cursor && pages < MAX_SCAN_PAGES) {
          const nx = await cc('/photos', key, { ...params, limit: 100, after: cursor });
          if (!nx.ok) break;
          pages++;
          const batch = ((nx.body && nx.body.data) || []).filter(usable);
          scanned += batch.length;
          captioned += batch.filter(p => p.description).length;
          pool = pool.concat(batch.map(p => ({ p, s: score(p) })).filter(x => x.s > 0));
          const m2 = (nx.body && nx.body.meta) || {};
          cursor = m2.has_next === true ? m2.next_cursor : null;
        }
        pool.sort((a, z) => z.s - a.s);
        rows = pool.slice(0, limit).map(x => x.p);
        meta = { next_cursor: null, has_next: false };
      }

      res.status(200).json({
        photos: rows.map(safePhoto),
        next_cursor: meta.next_cursor || null,
        has_next: meta.has_next === true,
        dates_filtered_here: clientSideDates,
        unmatched_tags: unmatchedTags,
        searched: words.length ? { q, scanned, pages, captioned, capped: pages >= MAX_SCAN_PAGES } : null
      });
      return;
    }

    // ---- 5) fetch — the bytes of ONE photo, resolved by id, never by URL ----
    if (action === 'fetch') {
      const id = String((req.body && req.body.id) || '').trim();
      if (!/^[A-Za-z0-9_-]{1,64}$/.test(id)) { res.status(400).json({ error: 'Bad photo id' }); return; }

      const one = await cc('/photos/' + encodeURIComponent(id), key, {});
      if (!one.ok) {
        res.status(502).json({ error: 'CompanyCam refused that photo', status: one.status, detail: scrub(one.raw, key) });
        return;
      }
      const photo = (one.body && one.body.data) || null;
      if (!photo) { res.status(404).json({ error: 'No such photo' }); return; }
      /* Re-checked here, not trusted from the list: an id that was filtered out
         of the list must not become reachable by asking for it directly. */
      if (!usable(photo)) { res.status(403).json({ error: 'That photo is marked internal or is not active' }); return; }

      const pick = pickUri(photo);
      if (!pick) { res.status(502).json({ error: 'That photo has no usable rendition' }); return; }

      /* The URL came from CompanyCam's own response, never from the caller. */
      const img = await fetch(pick.url);
      if (!img.ok) { res.status(502).json({ error: 'Could not download the photo', status: img.status }); return; }
      const buf = Buffer.from(await img.arrayBuffer());
      if (buf.length > MAX_IMAGE_BYTES) {
        res.status(413).json({ error: 'That rendition is too large to import', bytes: buf.length });
        return;
      }

      res.status(200).json({
        id: String(photo.id),
        mime: img.headers.get('content-type') || 'image/jpeg',
        bytes: buf.length,
        rendition: pick.type,
        description: photo.description || '',
        captured_at: photo.captured_at || photo.created_at || '',
        data: buf.toString('base64')
      });
      return;
    }

    res.status(400).json({ error: 'Unknown action' });
  } catch (e) {
    res.status(500).json({ error: 'CompanyCam request failed', detail: scrub((e && e.message) || e, key) });
  }
}
