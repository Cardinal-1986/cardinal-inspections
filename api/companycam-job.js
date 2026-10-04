// /api/companycam-job.js
// One client <-> its CompanyCam job: suggest a job to link, and list the linked
// job's photographs for that client's Photo Album. Build 1228.
//
// WHO. Theo, 2 Oct 2026: "As long as they are assigned or create that
// companycam/crm lead they can link and have access." So the gate is the
// CLIENT, not a role: the caller must be able to read the client row under
// their own session. The project row is read with the CALLER's token, which
// means the database's own `projects_select` policy (full access, created_by,
// assigned rep, sales_rep) makes the decision. This route never re-implements it.
//
// THE VAULT STAYS SHUT. companycam_photos / companycam_projects remain
// `is_cardinal_admin()` under RLS. This route reads them with the service key
// and hands back ONE job's photographs, and only after the client check above.
//
// THE RAIL FOR NON-ADMINS. A non-admin may only see a job whose street address
// matches the client's street address. Without it, anyone who can open one
// client could write any job id into that client's record and read any
// customer's roof. Admins may link any job (typo'd addresses happen).
//
// PRIVACY. The mirror never holds a photo CompanyCam flags `internal` (the
// nightly sync skips them), and it holds no coordinates. Nothing here adds
// either. Thumbnails are CompanyCam's own static URLs; no bytes pass through
// this route, so it cannot be used as a proxy.

const SUPABASE_URL = (process.env.SUPABASE_URL || 'https://yipslubcptjoarblzbpl.supabase.co').trim();
const SUPABASE_ANON_KEY = (process.env.SUPABASE_ANON_KEY || 'sb_publishable_aGsug3EBJjHX90BLKd5bLQ_zryUMqNZ').trim();
const FALLBACK_ADMINS = ['theo@cardinalrenovations.net', 'joan@cardinalrenovations.net'];
const MAX_PHOTOS = 300;
const MAX_SUGGEST = 10;

/* The street part of an address, reduced to letters and digits:
   "7990 Germantown Pike, Dayton OH 45414" -> "7990germantownpike".
   The same reduction is applied to both sides, so "Pike" vs "pike." matches. */
export function streetKey(addr) {
  const first = String(addr == null ? '' : addr).split(',')[0];
  return first.toLowerCase().replace(/[^a-z0-9]/g, '');
}
export function sameStreet(a, b) {
  const x = streetKey(a), y = streetKey(b);
  return x.length > 5 && x === y;
}

function rest(path, key, bearer, extra) {
  return fetch(SUPABASE_URL + '/rest/v1/' + path, {
    headers: Object.assign({ apikey: key, Authorization: 'Bearer ' + bearer }, extra || {})
  });
}

function parseCk(raw) {
  if (raw && typeof raw === 'object') return raw;
  try { return JSON.parse(raw || '{}') || {}; } catch (e) { return {}; }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'POST only' }); return; }
  const service = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  try {
    if (!service) { res.status(500).json({ error: 'SUPABASE_SERVICE_ROLE_KEY not configured in Vercel' }); return; }

    // ---- 1) Signed in? ----
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

    // ---- 2) Admin? (only widens WHICH job may be linked, never which client) ----
    let isAdmin = FALLBACK_ADMINS.includes(email);
    if (!isAdmin) {
      const pr = await rest('team_profiles?email=eq.' + encodeURIComponent(email) + '&select=role', service, service);
      if (pr.ok) {
        const rows = await pr.json();
        isAdmin = Array.isArray(rows) && rows[0] && String(rows[0].role).toLowerCase() === 'admin';
      }
    }

    // ---- 3) Can THIS caller open THIS client? Asked of the database, as them ----
    const body = req.body || {};
    const clientId = String(body.client_id || '').trim();
    if (!clientId || !/^[A-Za-z0-9-]{1,64}$/.test(clientId)) { res.status(400).json({ error: 'client_id required' }); return; }
    const pj = await rest('projects?id=eq.' + encodeURIComponent(clientId) + '&select=id,address,checklist', SUPABASE_ANON_KEY, token);
    if (!pj.ok) { res.status(502).json({ error: 'Could not read the client' }); return; }
    const prows = await pj.json();
    const client = Array.isArray(prows) ? prows[0] : null;
    if (!client) { res.status(404).json({ error: 'Client not found or not yours' }); return; }
    const clientAddr = String(client.address || '');

    const action = String(body.action || 'photos');

    // ---- 4) suggest: the CompanyCam jobs this client could be linked to ----
    if (action === 'suggest') {
      const q = String(body.q || '').trim().slice(0, 80);
      let rows = [];
      if (isAdmin && q) {
        const like = '*' + q.replace(/[*,()]/g, ' ') + '*';
        const r = await rest('companycam_projects?or=(name.ilike.' + encodeURIComponent(like) + ',address.ilike.' + encodeURIComponent(like) + ')&select=id,name,address&limit=' + MAX_SUGGEST, service, service);
        if (r.ok) rows = await r.json();
      } else {
        const num = (clientAddr.match(/^\s*(\d+)/) || [])[1];
        if (num) {
          const r = await rest('companycam_projects?address=ilike.' + encodeURIComponent(num + '*') + '&select=id,name,address&limit=60', service, service);
          if (r.ok) rows = (await r.json()).filter(p => sameStreet(p.address, clientAddr));
        }
      }
      rows = rows.slice(0, MAX_SUGGEST);
      const out = [];
      for (const p of rows) {
        const c = await rest('companycam_photos?project_id=eq.' + encodeURIComponent(p.id) + '&select=captured_at&order=captured_at.desc&limit=1',
          service, service, { Prefer: 'count=exact', Range: '0-0' });
        let count = 0, latest = null;
        if (c.ok) {
          const cr = c.headers.get('content-range') || '';
          count = Number((cr.split('/')[1] || '0')) || 0;
          const one = await c.json();
          latest = one && one[0] ? one[0].captured_at : null;
        }
        out.push({ id: p.id, name: p.name || '', address: p.address || '', count, latest, match: sameStreet(p.address, clientAddr) });
      }
      res.status(200).json({ ok: true, admin: isAdmin, suggestions: out });
      return;
    }

    // ---- 5) photos: the linked job's photographs ----
    if (action === 'photos') {
      const ccId = String(parseCk(client.checklist).cc_project_id || '').trim();
      if (!ccId) { res.status(200).json({ ok: true, linked: false, photos: [] }); return; }
      if (!/^[A-Za-z0-9_-]{1,40}$/.test(ccId)) { res.status(400).json({ error: 'Bad CompanyCam job id on this client' }); return; }
      const jr = await rest('companycam_projects?id=eq.' + encodeURIComponent(ccId) + '&select=id,name,address', service, service);
      const job = jr.ok ? (await jr.json())[0] : null;
      if (!job) { res.status(200).json({ ok: true, linked: true, missing: true, photos: [] }); return; }
      if (!isAdmin && !sameStreet(job.address, clientAddr)) {
        res.status(403).json({ error: 'That CompanyCam job is at a different address than this client', linked: true });
        return;
      }
      const ph = await rest('companycam_photos?project_id=eq.' + encodeURIComponent(ccId) +
        '&select=id,thumb_url,preview_url,captured_at,description,creator_name,annotated&order=captured_at.desc&limit=' + MAX_PHOTOS,
        service, service, { Prefer: 'count=exact' });
      if (!ph.ok) { res.status(502).json({ error: 'Could not read the CompanyCam mirror' }); return; }
      const total = Number(((ph.headers.get('content-range') || '').split('/')[1]) || 0) || 0;
      const photos = (await ph.json()).filter(p => p && p.thumb_url).map(p => ({
        id: p.id, thumb: p.thumb_url, full: p.preview_url || p.thumb_url, at: p.captured_at,
        caption: p.description || '', by: p.creator_name || '', annotated: !!p.annotated
      }));
      res.status(200).json({ ok: true, linked: true, job: { id: job.id, name: job.name || '', address: job.address || '' }, total, photos });
      return;
    }

    res.status(400).json({ error: 'Unknown action' });
  } catch (e) {
    res.status(500).json({ error: 'companycam-job failed', detail: String(e && e.message || e).slice(0, 200) });
  }
}
