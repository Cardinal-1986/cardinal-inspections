// /api/companycam-sync.js
// Fills the local mirror of CompanyCam photo metadata, a few pages at a time.
//
// WHY IT IS RESUMABLE RATHER THAN ONE LONG JOB.
// The account holds 61,649 photos — 617 pages of 100. At the ~700ms per page
// this project measured, that is roughly seven minutes of wall clock, which no
// serverless function may hold. So each call does a handful of pages, returns
// the cursor, and the caller loops. That also means a timeout, a redeploy or a
// closed tab costs one batch, not the whole run.
//
// WHAT IT WRITES. Caption, dates, project id, creator, and the two URLs needed
// to show a thumbnail. NOT coordinates — a searchable index does not need the
// customer's latitude and longitude — and never a photo flagged `internal`,
// matching what api/companycam.js already refuses to return.
//
// Admin-only, same gate as api/invite.js and api/companycam.js.

const SUPABASE_URL = (process.env.SUPABASE_URL || 'https://yipslubcptjoarblzbpl.supabase.co').trim();
const SUPABASE_ANON_KEY = (process.env.SUPABASE_ANON_KEY || 'sb_publishable_aGsug3EBJjHX90BLKd5bLQ_zryUMqNZ').trim();
const FALLBACK_ADMINS = ['theo@cardinalrenovations.net', 'joan@cardinalrenovations.net'];
const CC_BASE = 'https://app.companycam.com/public_api/v1';

/* Six pages ≈ 4-5s at the measured 707ms. Comfortably inside a 10s function
   limit, so this works on any Vercel plan rather than only the paid one. */
const DEFAULT_PAGES = 6;
const MAX_PAGES = 12;
const PAGE_SIZE = 100;

function scrub(text, key) {
  let s = String(text == null ? '' : text);
  if (key) s = s.split(key).join('[redacted]');
  return s.slice(0, 400);
}

async function cc(path, key, params) {
  const url = new URL(CC_BASE + path);
  for (const [k, v] of Object.entries(params || {})) {
    if (v == null || v === '') continue;
    url.searchParams.set(k, v);
  }
  const r = await fetch(url.toString(), {
    headers: { Authorization: 'Bearer ' + key, Accept: 'application/json' }
  });
  const raw = await r.text();
  let body = null;
  try { body = JSON.parse(raw); } catch (e) { /* keep raw for the error path */ }
  return { ok: r.ok, status: r.status, body, raw };
}

function pickUri(photo, order) {
  const uris = Array.isArray(photo && photo.uris) ? photo.uris : [];
  for (const want of order) {
    const hit = uris.find(u => u && u.type === want && (u.url || u.uri));
    if (hit) return { type: want, url: hit.url || hit.uri };
  }
  return null;
}

/* Same refusal as api/companycam.js. An internal photo must not reach the
   mirror either — otherwise the index becomes a way around the flag. */
function usable(p) {
  if (!p || p.internal === true) return false;
  if (p.status && p.status !== 'active') return false;
  if (p.processing_status && p.processing_status !== 'processed') return false;
  return true;
}

function iso(v) {
  if (!v) return null;
  if (typeof v === 'number') return new Date(v * 1000).toISOString();   // v2 sends unix
  const t = Date.parse(v);
  return isNaN(t) ? null : new Date(t).toISOString();
}

function row(p) {
  const web = pickUri(p, ['web_annotation', 'web', 'original']);
  const thumb = pickUri(p, ['thumbnail_annotation', 'thumbnail', 'web']);
  return {
    id: String(p.id),
    description: p.description || null,
    captured_at: iso(p.captured_at),
    cc_created_at: iso(p.created_at),
    project_id: p.project_id ? String(p.project_id) : null,
    creator_name: p.creator_name || null,
    annotated: !!(web && web.type === 'web_annotation'),
    thumb_url: thumb ? thumb.url : null,
    preview_url: web ? web.url : null,
    synced_at: new Date().toISOString()
  };
}

/* 485: one caller for every Postgres function this route invokes. Three of them
   now - the name backfill, the caption sample and the job count - and three
   hand-rolled fetches would drift on headers the way they always do. */
async function rpc(service, name, body) {
  return fetch(SUPABASE_URL + '/rest/v1/rpc/' + name, {
    method: 'POST',
    headers: { apikey: service, Authorization: 'Bearer ' + service, 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {})
  });
}

/* 484: the ONE place the backfill RPC is called. Two callers - the projects
   pass, which runs it after writing names, and the `stamp` action, which runs it
   alone for photos a later sync added. A copy in each would drift. */
async function stampNames(service) {
  const r = await rpc(service, 'companycam_backfill_project_names', {});
  let stamped = null;
  if (r.ok) { try { stamped = await r.json(); } catch (e) { stamped = null; } }
  return { ok: r.ok, stamped };
}

async function sb(service, path, init) {
  return fetch(SUPABASE_URL + '/rest/v1/' + path, {
    ...(init || {}),
    headers: {
      apikey: service,
      Authorization: 'Bearer ' + service,
      'Content-Type': 'application/json',
      ...((init || {}).headers || {})
    }
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'POST only' }); return; }

  const key = (process.env.COMPANYCAM_API_KEY || '').trim();
  const service = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

  try {
    if (!key) { res.status(500).json({ error: 'COMPANYCAM_API_KEY not configured in Vercel' }); return; }
    if (!service) { res.status(500).json({ error: 'SUPABASE_SERVICE_ROLE_KEY not configured in Vercel' }); return; }

    // ---- who ----
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    if (!token) { res.status(401).json({ error: 'Sign in required' }); return; }
    const who = await fetch(SUPABASE_URL + '/auth/v1/user', {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: 'Bearer ' + token }
    });
    if (!who.ok) { res.status(401).json({ error: 'Invalid session' }); return; }
    const caller = await who.json();
    const email = ((caller && caller.email) || '').toLowerCase();
    if (!email) { res.status(401).json({ error: 'Invalid session' }); return; }

    let isAdmin = FALLBACK_ADMINS.includes(email);
    if (!isAdmin) {
      const pr = await sb(service, 'team_profiles?email=eq.' + encodeURIComponent(email) + '&select=role');
      if (pr.ok) {
        const rows = await pr.json();
        isAdmin = Array.isArray(rows) && rows[0] && String(rows[0].role).toLowerCase() === 'admin';
      }
    }
    if (!isAdmin) { res.status(403).json({ error: 'Admins only' }); return; }

    const b = req.body || {};

    // ---- status only ----
    if (b.action === 'status') {
      const st = await sb(service, 'companycam_sync?id=eq.1&select=*');
      const cnt = await sb(service, 'companycam_photos?select=id', { headers: { Prefer: 'count=exact', Range: '0-0' } });
      const have = parseInt(String(cnt.headers.get('content-range') || '').split('/')[1], 10);
      const gap = await sb(service, 'companycam_photos?select=id&or=(description.is.null,description.eq.)',
        { headers: { Prefer: 'count=exact', Range: '0-0' } });
      const uncap = parseInt(String(gap.headers.get('content-range') || '').split('/')[1], 10);
      const prj = await sb(service, 'companycam_projects?select=id', { headers: { Prefer: 'count=exact', Range: '0-0' } });
      const nprj = parseInt(String(prj.headers.get('content-range') || '').split('/')[1], 10);
      const named = await sb(service, 'companycam_photos?select=id&project_name=not.is.null',
        { headers: { Prefer: 'count=exact', Range: '0-0' } });
      const nnamed = parseInt(String(named.headers.get('content-range') || '').split('/')[1], 10);
      res.status(200).json({
        state: st.ok ? (await st.json())[0] || null : null,
        rows_in_index: isNaN(have) ? null : have,
        uncaptioned: isNaN(uncap) ? null : uncap,
        projects: isNaN(nprj) ? null : nprj,
        photos_with_project_name: isNaN(nnamed) ? null : nnamed
      });
      return;
    }

    // ---- reset, so a re-sync can start clean without touching rows ----
    if (b.action === 'reset') {
      await sb(service, 'companycam_sync?id=eq.1', {
        method: 'PATCH',
        body: JSON.stringify({ cursor: null, synced: 0, skipped: 0, captioned: 0,
                               started_at: new Date().toISOString(), finished_at: null,
                               updated_at: new Date().toISOString() })
      });
      res.status(200).json({ ok: true, reset: true });
      return;
    }

    // ---- stamp: names onto photos, with no trip to CompanyCam ----
    /* 484: the names are already in companycam_projects; photos added by a later
       sync just need them applied. The sync runs this at the END of a press so a
       photo indexed thirty seconds ago is searchable by job like all the others.
       One UPDATE, and the function only touches rows whose value differs. */
    if (b.action === 'stamp') {
      const st = await stampNames(service);
      res.status(200).json({ stamped: st.stamped, backfilled: st.ok, done: true });
      return;
    }

    // ---- projects: names for the index ----
    /* The first full sync proved the caption search had nothing to search: 79 of
       60,485 photos carry a description, 0.13%, flat across every year. But every
       photo knows its project_id, across 775 jobs — the index just did not know
       what those projects are CALLED. This pass fetches the names, then stamps
       them onto the photos so a search for "Habitat" reaches all of them.

       Cheap: 775 projects is ~8 pages, not 617. Runs to completion in one call. */
    if (b.action === 'projects') {
      let cursor = null, wrote = 0, pages = 0, hasNext = true;
      while (hasNext && pages < 40) {
        const params = { limit: 100 };
        if (cursor) params.after = cursor;
        const r = await cc('/projects', key, params);
        if (!r.ok) {
          res.status(502).json({ error: 'CompanyCam refused the project list',
                                 status: r.status, detail: scrub(r.raw, key), wrote, pages });
          return;
        }
        pages++;
        const data = (r.body && r.body.data) || [];
        const meta = (r.body && r.body.meta) || {};
        const rows = data.filter(p => p && p.id).map(p => {
          /* Address arrives as an object on v1; flatten it to one searchable line
             and tolerate a plain string, because this shape is unverified against
             the live account. Missing pieces simply drop out. */
          const a = p.address || {};
          const addr = typeof a === 'string' ? a : [
            a.street_address_1, a.street_address_2, a.city, a.state, a.postal_code
          ].filter(Boolean).join(', ');
          return {
            id: String(p.id),
            name: p.name || null,
            address: addr || null,
            status: p.status || null,
            cc_created_at: iso(p.created_at),
            synced_at: new Date().toISOString()
          };
        });
        if (rows.length) {
          const up = await sb(service, 'companycam_projects?on_conflict=id', {
            method: 'POST',
            headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
            body: JSON.stringify(rows)
          });
          if (!up.ok) {
            const why = await up.text();
            res.status(502).json({ error: 'Could not write the project list',
                                   status: up.status, detail: scrub(why, service), wrote, pages });
            return;
          }
          wrote += rows.length;
        }
        hasNext = meta.has_next === true && !!meta.next_cursor;
        cursor = hasNext ? meta.next_cursor : null;
        if (!data.length) hasNext = false;
      }

      /* Stamp the names onto the photos. One statement, not 60k round trips. */
      const st = await stampNames(service);

      res.status(200).json({ projects: wrote, pages, stamped: st.stamped,
                             backfilled: st.ok, done: true });
      return;
    }

    // ---- AI caption sample ----
    /* Theo asked whether AI captions would help find pictures. Only 79 of 60,485
       photos carry a human caption, so content search has nothing to work with -
       but a general vision model may not know roofing well enough to be worth
       60,406 calls. This answers that on a SMALL sample before anything is spent.

       Deliberate choices:
       - The prompt is lifted VERBATIM from api/caption.js, so this measures what
         the app would really produce, not a prompt written to flatter the test.
       - Results go to ai_description, never description. The 79 human captions
         are untouchable and the whole sample is one UPDATE away from discarded.
       - The sample is drawn by a stable ordering, so re-running captions the SAME
         photos instead of spending on a fresh 50.
       - Six per call. Downloading a photo and captioning it is slow, and the
         serverless limit is the same one the photo sync works around. */
    if (b.action === 'sample_captions') {
      const gem = (process.env.GEMINI_API_KEY || '').trim();
      if (!gem) { res.status(500).json({ error: 'GEMINI_API_KEY not configured in Vercel' }); return; }
      const want = Math.min(Math.max(parseInt(b.limit, 10) || 50, 1), 50);
      const per  = Math.min(Math.max(parseInt(b.per, 10) || 6, 1), 8);

      /* 485: ONE PHOTO PER JOB. The 478 version ordered by id and called that a
         spread. It is not one - ids sort near creation order, so it took the
         oldest rows, which on this account are 53 photographs of a SINGLE roof
         over two days. The trial therefore answered nothing, and half its output
         read "water staining indicating an active roof leak" because that is
         what that one house looked like.

         companycam_caption_sample() does the real thing: distinct on project_id,
         jobs that already carry a caption excluded outright, ordered by md5(id)
         so it is a stable spread rather than a slice of one year. Measured on
         the live index: 50 photos, 50 jobs, 5 crews, 2024-04-30..2026-07-30. */
      const q = await rpc(service, 'companycam_caption_sample', { n: per });
      if (!q.ok) { res.status(502).json({ error: 'Could not read the index', detail: scrub(await q.text(), service) }); return; }
      const batch = await q.json();

      /* Progress is JOBS, not photographs. 53 photos of one roof is one data
         point, and counting it as 53 is exactly how the first trial reported
         itself finished while having proved nothing. */
      const dj = await rpc(service, 'companycam_caption_jobs_done', {});
      const already = dj.ok ? (parseInt(await dj.text(), 10) || 0) : 0;
      if (!batch.length || already >= want) {
        res.status(200).json({ jobs: already, captioned: already, done: true, remaining: 0 });
        return;
      }

      /* Verbatim from api/caption.js. Do not "improve" it here - a different
         prompt would make the sample unrepresentative of the real feature. */
      const prompt =
        'You are captioning a photo for a professional roof inspection report. ' +
        'In one concise sentence (under 20 words), describe what the photo shows in ' +
        'plain, professional roofing-inspection language. No preamble, no quotes, just the caption sentence.';

      let wrote = 0; const failures = [];
      for (const ph of batch) {
        try {
          const img = await fetch(ph.preview_url || ph.thumb_url);
          if (!img.ok) { failures.push({ id: ph.id, why: 'image ' + img.status }); continue; }
          const buf = Buffer.from(await img.arrayBuffer());
          if (buf.length > 4 * 1024 * 1024) { failures.push({ id: ph.id, why: 'too large' }); continue; }
          const mime = img.headers.get('content-type') || 'image/jpeg';

          const g = await fetch(
            'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent',
            { method: 'POST',
              headers: { 'Content-Type': 'application/json', 'x-goog-api-key': gem },
              body: JSON.stringify({ contents: [ { parts: [
                { text: prompt },
                { inlineData: { mimeType: mime.split(';')[0], data: buf.toString('base64') } }
              ] } ] }) });
          if (!g.ok) { failures.push({ id: ph.id, why: 'gemini ' + g.status }); continue; }
          const gj = await g.json();
          const cap = (((gj.candidates || [])[0] || {}).content || {}).parts?.[0]?.text;
          if (!cap) { failures.push({ id: ph.id, why: 'empty caption' }); continue; }

          const up = await sb(service, 'companycam_photos?id=eq.' + encodeURIComponent(ph.id), {
            method: 'PATCH',
            headers: { Prefer: 'return=minimal' },
            body: JSON.stringify({ ai_description: String(cap).trim().slice(0, 400),
                                   ai_captioned_at: new Date().toISOString() })
          });
          if (up.ok) wrote++; else failures.push({ id: ph.id, why: 'write ' + up.status });
        } catch (e) {
          failures.push({ id: ph.id, why: scrub((e && e.message) || e, gem).slice(0, 60) });
        }
      }

      /* Re-read rather than assuming already+wrote: a batch can fail partway,
         and the job count is the thing the panel and I both reason about. */
      const dj2 = await rpc(service, 'companycam_caption_jobs_done', {});
      const jobs = dj2.ok ? (parseInt(await dj2.text(), 10) || 0) : (already + wrote);

      /* `captioned` is kept as an alias of `jobs` on purpose. The panel that is
         already on Theo's phone reads that field, and a route deploying ahead of
         index.html must not make it read undefined. */
      res.status(200).json({ wrote, jobs, captioned: jobs, target: want,
                             remaining: Math.max(0, want - jobs),
                             done: jobs >= want, failures });
      return;
    }

    // ---- a batch ----
    const pages = Math.min(Math.max(parseInt(b.pages, 10) || DEFAULT_PAGES, 1), MAX_PAGES);
    let cursor = typeof b.cursor === 'string' && b.cursor ? b.cursor : null;

    /* No cursor supplied means "carry on from where the stored state got to".
       Passing one explicitly wins, so the caller can drive the loop itself. */
    if (!cursor && b.resume !== false) {
      const st = await sb(service, 'companycam_sync?id=eq.1&select=cursor');
      if (st.ok) { const r0 = (await st.json())[0]; cursor = (r0 && r0.cursor) || null; }
    }

    /* A run that starts with no cursor is starting from the beginning - either
       the first ever, or a re-run after the last one finished and cleared it.
       The counters must start from zero too. They did not, and the panel showed
       "87,096 of 61,649": the second run kept adding to the first run's total.
       Only the FIRST call of a run can be fresh; later calls carry a cursor. */
    const freshRun = !cursor;

    let wrote = 0, skipped = 0, captioned = 0, pagesDone = 0, total = null, hasNext = true;

    for (let i = 0; i < pages && hasNext; i++) {
      const params = { limit: PAGE_SIZE };
      if (cursor) params.after = cursor;
      if (i === 0) params.include_total = 'true';

      const r = await cc('/photos', key, params);
      if (!r.ok) {
        res.status(502).json({ error: 'CompanyCam refused the photo list', status: r.status,
                               detail: scrub(r.raw, key), wrote, pages: pagesDone, cursor });
        return;
      }
      pagesDone++;
      const data = (r.body && r.body.data) || [];
      const meta = (r.body && r.body.meta) || {};
      if (typeof meta.total === 'number') total = meta.total;

      const keep = data.filter(usable);
      skipped += data.length - keep.length;
      captioned += keep.filter(p => p.description).length;

      if (keep.length) {
        const up = await sb(service, 'companycam_photos?on_conflict=id', {
          method: 'POST',
          headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
          body: JSON.stringify(keep.map(row))
        });
        if (!up.ok) {
          const why = await up.text();
          res.status(502).json({ error: 'Could not write to the index', status: up.status,
                                 detail: scrub(why, service), wrote, pages: pagesDone, cursor });
          return;
        }
        wrote += keep.length;
      }

      hasNext = meta.has_next === true && !!meta.next_cursor;
      cursor = hasNext ? meta.next_cursor : null;
      if (!data.length) hasNext = false;
    }

    // ---- record where we got to ----
    const st = await sb(service, 'companycam_sync?id=eq.1&select=synced,skipped,captioned,started_at');
    const prev = st.ok ? ((await st.json())[0] || {}) : {};
    await sb(service, 'companycam_sync?id=eq.1', {
      method: 'PATCH',
      body: JSON.stringify({
        cursor,
        synced: (freshRun ? 0 : (prev.synced || 0)) + wrote,
        skipped: (freshRun ? 0 : (prev.skipped || 0)) + skipped,
        captioned: (freshRun ? 0 : (prev.captioned || 0)) + captioned,
        total,
        started_at: freshRun ? new Date().toISOString() : (prev.started_at || new Date().toISOString()),
        finished_at: hasNext ? null : new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
    });

    res.status(200).json({
      wrote, skipped, captioned, pages: pagesDone,
      cursor, has_next: hasNext, done: !hasNext,
      total, fresh_run: freshRun,
      synced_so_far: (freshRun ? 0 : (prev.synced || 0)) + wrote
    });
  } catch (e) {
    res.status(500).json({ error: 'Sync failed', detail: scrub((e && e.message) || e, key) });
  }
}
