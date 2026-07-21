// Cardinal team invite — creates a Supabase sign-in + sets the role, admin-only.
// Deploy: put this file at  api/invite.js  (ESM — do NOT convert to module.exports).
// Uses existing Vercel env var SUPABASE_SERVICE_ROLE_KEY. No new env vars needed.

const SUPABASE_URL = 'https://yipslubcptjoarblzbpl.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_aGsug3EBJjHX90BLKd5bLQ_zryUMqNZ';
const FALLBACK_ADMINS = ['theo@cardinalrenovations.net', 'joan@cardinalrenovations.net'];
const ROLES = ['sales', 'production', 'admin'];

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'POST only' }); return; }
  try {
    const service = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
    if (!service) { res.status(500).json({ error: 'SUPABASE_SERVICE_ROLE_KEY not configured in Vercel' }); return; }

    // ---- 1) Who is calling? Must be a signed-in user ----
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    if (!token) { res.status(401).json({ error: 'Sign in required' }); return; }
    const who = await fetch(SUPABASE_URL + '/auth/v1/user', {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: 'Bearer ' + token }
    });
    if (!who.ok) { res.status(401).json({ error: 'Invalid session' }); return; }
    const caller = await who.json();
    const callerEmail = (caller && caller.email || '').toLowerCase();
    if (!callerEmail) { res.status(401).json({ error: 'Invalid session' }); return; }

    // ---- 2) Caller must be an admin (DB role, with hardcoded fallback) ----
    let isAdmin = FALLBACK_ADMINS.includes(callerEmail);
    if (!isAdmin) {
      const pr = await fetch(
        SUPABASE_URL + '/rest/v1/team_profiles?email=eq.' + encodeURIComponent(callerEmail) + '&select=role',
        { headers: { apikey: service, Authorization: 'Bearer ' + service } }
      );
      if (pr.ok) {
        const rows = await pr.json();
        isAdmin = Array.isArray(rows) && rows[0] && String(rows[0].role).toLowerCase() === 'admin';
      }
    }
    if (!isAdmin) { res.status(403).json({ error: 'Admins only' }); return; }

    // ---- 3) Validate payload ----
    const { email, name, role, password } = req.body || {};
    const em = String(email || '').trim().toLowerCase();
    const rl = String(role || 'sales').toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) { res.status(400).json({ error: 'Invalid email' }); return; }
    if (!ROLES.includes(rl)) { res.status(400).json({ error: 'Role must be sales, production, or admin' }); return; }
    if (!password || String(password).length < 8) { res.status(400).json({ error: 'Password must be at least 8 characters' }); return; }

    // ---- 4) Create the auth user (or detect existing) ----
    let existed = false;
    const cr = await fetch(SUPABASE_URL + '/auth/v1/admin/users', {
      method: 'POST',
      headers: { apikey: service, Authorization: 'Bearer ' + service, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: em, password: String(password), email_confirm: true })
    });
    if (!cr.ok) {
      const cj = await cr.json().catch(() => ({}));
      const msg = (cj && (cj.msg || cj.message || cj.error_description || cj.error)) || '';
      if (cr.status === 422 || /already/i.test(String(msg))) {
        existed = true; // fine — we'll just set/refresh their role below
      } else {
        res.status(502).json({ error: 'Supabase could not create the user: ' + (msg || ('HTTP ' + cr.status)) });
        return;
      }
    }

    // ---- 5) Upsert their team profile with the role ----
    const up = await fetch(SUPABASE_URL + '/rest/v1/team_profiles?on_conflict=email', {
      method: 'POST',
      headers: {
        apikey: service, Authorization: 'Bearer ' + service,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates'
      },
      body: JSON.stringify([{
        email: em,
        name: String(name || '').trim() || null,
        role: rl,
        updated_at: new Date().toISOString()
      }])
    });
    if (!up.ok) {
      const uj = await up.json().catch(() => ({}));
      res.status(502).json({ error: 'User created but profile save failed: ' + ((uj && uj.message) || ('HTTP ' + up.status)) + ' — run the roles SQL?' });
      return;
    }

    res.status(200).json({ ok: true, existed, email: em, role: rl });
  } catch (e) {
    res.status(500).json({ error: String((e && e.message) || e) });
  }
}
