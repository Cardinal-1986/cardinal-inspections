// api/requeue-stale.js — build 1062 (25 Aug 2026)
//
// Gives requeue_stale_design_jobs() a caller. It has had none.
//
// THE FINDING, not a new feature: the function was written, granted to
// service_role, documented in VISUALIZER_SETUP.md as "✅ done with a 3-attempt
// cap", named in visualizer_worker.py's shutdown comment ("rather than
// stranding it until requeue_stale_design_jobs() notices half an hour later")
// and in visualizer/index.html's ("requeue_stale would only fail it half an
// hour later"). Two pieces of code reason about when it will run. Nothing has
// ever run it. Grepped the whole repo: two prose mentions, zero call sites.
//
// WHY A CRON AND NOT THE OBVIOUS PLACES:
//   - not the worker — if the worker died, it cannot recover itself, and that
//     is precisely the case this exists for;
//   - not the browser — it needs service_role, which must never be there, and
//     the browser is closed at 3am anyway.
// A scheduled server call is the only home that is up when the thing that died
// is the Spark.
//
// WHAT IT DOES NOT DO: it does not decide anything. Every rule lives in the SQL
// — gemini jobs fail (the browser that owned them is gone), spark jobs requeue
// until attempts hits 3, and the error sentence is written there. This route
// only opens the door on a schedule. Keep it that way; a second copy of the
// policy here is the divergence CHASE_POLICY already had to be gated against.
//
// ENV:
//   CRON_SECRET                — REQUIRED, fail-closed, same as api/digest.js.
//   SUPABASE_SERVICE_ROLE_KEY  — REQUIRED. The RPC is service_role only.

const SUPABASE_URL = 'https://yipslubcptjoarblzbpl.supabase.co';

// The staleness window. 30 minutes is the SQL default and this passes it
// explicitly so the value is visible in one place a human reads, rather than
// hiding in a schema file. STALE_MINUTES overrides without a deploy.
// ⚠ It must stay well above the longest honest render: the slowest real one
// measured here was 12m13s and came back correct. Requeuing good work is worse
// than waiting — it burns an attempt and doubles the load on the box.
const STALE_MINUTES = Math.max(15, parseInt(process.env.STALE_MINUTES || '30', 10) || 30);

function cronAuthorised(req) {
  const secret = (process.env.CRON_SECRET || '').trim();
  if (!secret) return { ok: false, why: 'CRON_SECRET is not configured in Vercel, so the ' +
    'scheduled door is closed. Set it, and give the cron the same value.' };
  if ((req.headers.authorization || '') !== 'Bearer ' + secret) return { ok: false, why: 'Bad cron secret' };
  return { ok: true };
}

export default async function handler(req, res) {
  const cron = cronAuthorised(req);
  if (!cron.ok) {
    res.status(401).json({ error: 'Unauthorized', detail: cron.why });
    return;
  }

  const srk = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!srk) {
    // Say which key is missing rather than failing as a bare 500. This feature
    // has already cost six rounds of an error message being thrown away.
    res.status(500).json({ error: 'SUPABASE_SERVICE_ROLE_KEY is not set — ' +
      'requeue_stale_design_jobs() is service_role only and cannot be called without it.' });
    return;
  }

  try {
    const r = await fetch(SUPABASE_URL + '/rest/v1/rpc/requeue_stale_design_jobs', {
      method: 'POST',
      headers: {
        apikey: srk,
        Authorization: 'Bearer ' + srk,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ p_older_than: STALE_MINUTES + ' minutes' }),
    });

    const text = await r.text();
    if (!r.ok) {
      // Carry Postgres's own words through. `detail` on its own is the field
      // index.html's api() drops, so it goes in the message too.
      res.status(502).json({ error: 'requeue_stale_design_jobs failed: HTTP ' + r.status +
        (text ? ' — ' + text.slice(0, 400) : ''), detail: text.slice(0, 2000) });
      return;
    }

    // The RPC `returns integer`; PostgREST sends it bare.
    let n = null;
    try { n = JSON.parse(text); } catch (_) { n = null; }
    n = (typeof n === 'number' && isFinite(n)) ? n : null;

    res.status(200).json({
      ok: true,
      requeued: n,
      older_than_minutes: STALE_MINUTES,
      // Zero is the healthy answer and is reported as such rather than as
      // silence — 808 exists because a correct state with no explanation read
      // as a fault.
      note: n === 0 ? 'nothing was stale' : null,
    });
  } catch (e) {
    res.status(500).json({ error: 'Could not reach Supabase: ' + (e && e.message ? e.message : String(e)) });
  }
}
