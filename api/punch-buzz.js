// api/punch-buzz.js — build 1255, the scheduled punch buzzes (Theo's pick 4C).
//
// Vercel Cron calls this every hour at :05 (vercel.json). The route works out the
// time IN DAYTON (America/New_York, so daylight saving moves with it) and sends
// whatever is due in that hour. Mon–Sat only; nothing goes out on a Sunday.
//
//   7 am   Theo      — the morning report: today's stops per person, past due,
//                       needs follow-up, unassigned, closed yesterday.
//   7 am   Curtis    — escalation: open jobs 2+ days past due (each job once per
//                       date it was due).
//   7 am   Theo      — escalation: open jobs 5+ days past due (same rule).
//   3 pm   Curtis    — "Plan <next working day>": stops per person on that day,
//                       unassigned, no date, past due.
//   6 pm   each crew — "Your <next working day>": that person's stops in order,
//                       one buzz per person who has any.
//
// The job rules MIRROR the Punch List and the route page in index.html
// (cr-punch-script plBase / cr-route-script): open = status != 'done'; on hold
// = hold_reason set and hold_until not yet reached; on site = a visit with no
// `out`; past due = dated before today, not on site, not on hold. Held jobs
// never buzz. ⚠ Two copies of one rule — gate_1255.mjs runs both against the
// same seed and fails if they disagree.
//
// AT MOST ONCE. Every buzz has a key (`am:2026-10-08`, `crew:2026-10-08:<email>`,
// `esc2:<id>:<due date>` …) that is CLAIMED in punch_buzz_log before anything is
// sent. A retried or doubled cron finds the key taken and sends nothing.
// (punch_buzz_log.sql — run it before this route ships.)
//
// DELIVERY. Push first, through the same push_subs table and VAPID key api/notify.js
// uses (VAPID_PUBLIC is imported from it, so there is one public key in /api). A
// person with NO push subscription gets the buzz by email instead (Resend), so a
// phone that never enabled notifications still hears about tomorrow. Nobody gets
// both. ⚠ The send loop here is a second, smaller copy of notify.js's push
// fan-out: notify.js is the staff-session door and a cron has no session.
//
// Auth is fail-closed, exactly like api/digest.js: CRON_SECRET unset means this
// route refuses everything. Manual runs: `?slot=am|plan|crew` forces a slot,
// `?dry=1` reports what WOULD go out without claiming or sending.
//
// Needs: CRON_SECRET, SUPABASE_SERVICE_ROLE_KEY, VAPID_PRIVATE_KEY.
// Optional: RESEND_API_KEY (+ DIGEST_FROM) for the email fallback.

import { VAPID_PUBLIC } from './notify.js';

const SUPABASE_URL = 'https://yipslubcptjoarblzbpl.supabase.co';
const THEO = 'theo@cardinalrenovations.net';
const CURTIS = 'curtis@cardinalrenovations.net';
const TZ = 'America/New_York';
const SLOT_HOURS = { am: 7, plan: 15, crew: 18 };
const ESC_CURTIS = 2, ESC_THEO = 5;
const DOW = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const KIND = { tarp:'Tarp', ticket:'Repair', callback:'Callback', punch:'Punch-out' };

/* ── Dayton's clock ── */
export function localNow(now) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year:'numeric', month:'2-digit', day:'2-digit',
    hour:'2-digit', hourCycle:'h23', weekday:'short' }).formatToParts(now);
  const g = t => (parts.find(p => p.type === t) || {}).value;
  const day = g('year') + '-' + g('month') + '-' + g('day');
  return { day, hour: Number(g('hour')), dow: dateOf(day).getUTCDay() };
}
function dateOf(k) { const p = String(k).split('-').map(Number); return new Date(Date.UTC(p[0], p[1] - 1, p[2])); }
function keyOf(d) { return d.toISOString().slice(0, 10); }
function addDays(k, n) { const d = dateOf(k); d.setUTCDate(d.getUTCDate() + n); return keyOf(d); }
export function nextWorkingDay(k) { let n = addDays(k, 1); if (dateOf(n).getUTCDay() === 0) n = addDays(n, 1); return n; }
function daysBetween(a, b) { return Math.round((dateOf(b) - dateOf(a)) / 86400000); }
function dayName(k) { return DOW[dateOf(k).getUTCDay()]; }
function label(k) { const d = dateOf(k); return DOW[d.getUTCDay()].slice(0, 3) + ' ' + d.getUTCDate() + ' ' + MON[d.getUTCMonth()]; }
function nameOf(e) { const n = String(e || '').split('@')[0]; return n.charAt(0).toUpperCase() + n.slice(1); }
function clock(t) { if (!t) return ''; const p = String(t).split(':'); const h = parseInt(p[0], 10); if (isNaN(h) || p.length < 2) return '';
  return ((h % 12) || 12) + ':' + p[1].slice(0, 2) + ' ' + (h >= 12 ? 'PM' : 'AM'); }

/* ── the job rules (mirrors of index.html — see the header) ── */
const isOpen = it => it.status !== 'done';
const dayOfIt = it => it.scheduled_at ? String(it.scheduled_at).slice(0, 10) : '';
const onHold = (it, today) => !!(it.hold_reason && (!it.hold_until || String(it.hold_until).slice(0, 10) > today));
const onSite = it => (Array.isArray(it.visits) ? it.visits : []).some(v => v && !v.out);
const pinged = it => !!(it.ping_at && !it.ping_done_at);
function stopsFor(items, who, k, today) {
  return items.filter(it => isOpen(it) && !onHold(it, today) && String(it.assigned_to || '') === who &&
    (dayOfIt(it) === k || (k === today && onSite(it))))
    .sort((a, b) => (a.scheduled_time ? 0 : 1) - (b.scheduled_time ? 0 : 1) ||   /* timed first, like the route page */
      String(a.scheduled_time || '').localeCompare(String(b.scheduled_time || '')));
}
function lateOnes(items, today) {
  return items.filter(it => { const d = dayOfIt(it); return isOpen(it) && !onHold(it, today) && d && d < today && !onSite(it); });
}
function crewOf(items, today) {
  const s = new Set(); items.forEach(it => { if (isOpen(it) && !onHold(it, today) && it.assigned_to) s.add(String(it.assigned_to)); });
  return [...s].sort();
}
function perPerson(items, crew, k, today) {
  return crew.map(w => ({ w, n: stopsFor(items, w, k, today).length })).filter(x => x.n)
    .map(x => nameOf(x.w) + ' ' + x.n).join(', ') || 'nobody';
}
function escTitle(c, n) { return c + ' job' + (c === 1 ? '' : 's') + ' ' + n + '+ days past due'; }
function routeLink(email) { return '#route/' + encodeURIComponent(String(email).split('@')[0]); }

/* for gate_1255: the same stop rule the route page uses, so the two can be compared */
export function _stopsFor(items, who, k, now) { return stopsFor(items, who, k, localNow(now).day); }

/* ── what is due at this moment — PURE, so the gate can run it ── */
export function planBuzzes(items, projects, now, force) {
  const L = localNow(now), today = L.day, out = [];
  if (L.dow === 0 && !force) return out;
  const slot = force || Object.keys(SLOT_HOURS).find(s => SLOT_HOURS[s] === L.hour);
  if (!slot) return out;
  const pr = {}; (projects || []).forEach(p => { pr[String(p.id)] = p; });
  const who = it => (pr[String(it.project_id)] || {}).name || 'No client';
  const crew = crewOf(items, today);
  const late = lateOnes(items, today);

  if (slot === 'am') {
    const tot = crew.reduce((s, w) => s + stopsFor(items, w, today, today).length, 0);
    const yest = items.filter(it => it.status === 'done' && it.done_at &&
      localNow(new Date(it.done_at)).day === addDays(today, -1)).length;
    const unasg = items.filter(it => isOpen(it) && !onHold(it, today) && !it.assigned_to).length;
    const flags = items.filter(it => isOpen(it) && pinged(it)).length;
    out.push({ key: 'am:' + today, to: [THEO], title: 'Punch report · ' + label(today),
      body: 'Today: ' + tot + ' stop' + (tot === 1 ? '' : 's') + ' (' + perPerson(items, crew, today, today) + '). ' +
        'Past due: ' + late.length + '. Needs follow-up: ' + flags + '. Unassigned: ' + unasg + '. Closed yesterday: ' + yest + '.',
      url: '#punch' });
    [[ESC_CURTIS, CURTIS, 'esc2'], [ESC_THEO, THEO, 'esc5']].forEach(([n, to, tag]) => {
      const hits = late.filter(it => daysBetween(dayOfIt(it), today) >= n);
      if (!hits.length) return;
      const lines = hits.map(it => who(it) + ' — ' + (it.title || '') + ' (' + (it.assigned_to ? nameOf(it.assigned_to) : 'unassigned') +
        ', ' + daysBetween(dayOfIt(it), today) + 'd)');
      out.push({ key: tag + ':' + today, claims: hits.map(it => tag + ':' + it.id + ':' + dayOfIt(it)), lines, days: n, to: [to],
        title: escTitle(hits.length, n), body: lines.join(' · '), url: '#punch' });
    });
  }
  if (slot === 'plan') {
    const nx = nextWorkingDay(today);
    const nodate = items.filter(it => isOpen(it) && !onHold(it, today) && !dayOfIt(it) && !onSite(it)).length;
    const unasg = items.filter(it => isOpen(it) && !onHold(it, today) && !it.assigned_to).length;
    out.push({ key: 'plan:' + nx, to: [CURTIS], title: 'Plan ' + dayName(nx),
      body: label(nx) + ': ' + perPerson(items, crew, nx, today) + '. Unassigned: ' + unasg + ' · No date: ' + nodate +
        ' · Past due: ' + late.length + '.',
      url: '#punch' });
  }
  if (slot === 'crew') {
    const nx = nextWorkingDay(today);
    crew.forEach(w => {
      const st = stopsFor(items, w, nx, today);
      if (!st.length) return;
      out.push({ key: 'crew:' + nx + ':' + w, to: [w],
        title: 'Your ' + dayName(nx) + ': ' + st.length + ' stop' + (st.length === 1 ? '' : 's'),
        body: st.map(it => (clock(it.scheduled_time) ? clock(it.scheduled_time) + ' ' : '') + who(it) + ' — ' +
          (KIND[it.kind || 'punch'] || 'Punch-out') + ': ' + (it.title || '')).join(' · '),
        url: routeLink(w) });
    });
  }
  return out.map(b => Object.assign({ slot }, b));
}

/* ── the side effects ── */
function cronAuthorised(req) {
  const secret = (process.env.CRON_SECRET || '').trim();
  if (!secret) return { ok: false, why: 'CRON_SECRET is not configured in Vercel, so the scheduled door is closed.' };
  if ((req.headers.authorization || '') !== 'Bearer ' + secret) return { ok: false, why: 'Bad cron secret' };
  return { ok: true };
}
function sb(key) { return { apikey: key, Authorization: 'Bearer ' + key }; }
async function rest(key, path) {
  const r = await fetch(SUPABASE_URL + '/rest/v1/' + path, { headers: sb(key) });
  const j = await r.json();
  if (!Array.isArray(j)) throw new Error(path.split('?')[0] + ': ' + String((j && (j.message || j.error)) || r.status).slice(0, 120));
  return j;
}
/* claim every key; true only if ALL were new. A partly-claimed group (one job
   already escalated) still sends — it names only the jobs that were new. */
async function claim(key, keys) {
  const r = await fetch(SUPABASE_URL + '/rest/v1/punch_buzz_log?on_conflict=key', {
    method: 'POST',
    headers: Object.assign(sb(key), { 'Content-Type': 'application/json', Prefer: 'resolution=ignore-duplicates,return=representation' }),
    body: JSON.stringify(keys.map(k => ({ key: k })))
  });
  const j = await r.json();
  if (!Array.isArray(j)) throw new Error('punch_buzz_log: ' + String((j && (j.message || j.error)) || r.status).slice(0, 120));
  return j.map(x => x.key);
}

export default async function handler(req, res) {
  const cron = cronAuthorised(req);
  if (!cron.ok) { res.status(401).json({ ok: false, error: cron.why }); return; }
  const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!KEY) { res.status(500).json({ ok: false, error: 'SUPABASE_SERVICE_ROLE_KEY is not set' }); return; }
  const q = req.query || {};
  const dry = q.dry === '1' || q.dry === 'true';
  const force = SLOT_HOURS[q.slot] != null ? q.slot : null;
  try {
    const items = await rest(KEY, 'punch_items?select=*');
    const projects = await rest(KEY, 'projects?select=id,name');
    let buzzes = planBuzzes(items, projects, new Date(), force);
    const L = localNow(new Date());
    if (dry) { res.status(200).json({ ok: true, dry: true, local: L, buzzes }); return; }

    /* claim first — at most once */
    const ready = [];
    for (const b of buzzes) {
      const want = [b.key].concat(b.claims || []);
      const got = await claim(KEY, want);
      if (!got.includes(b.key)) continue;                          /* this slot already went */
      if (b.claims) {
        /* name only the jobs not escalated before — each job buzzes once per due date */
        const keep = b.claims.map((k, i) => got.includes(k) ? b.lines[i] : null).filter(Boolean);
        if (!keep.length) continue;
        b.title = escTitle(keep.length, b.days); b.body = keep.join(' · ');
      }
      ready.push(b);
    }

    let webpush = null, pushErr = null;
    const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || process.env.VAPID_PRIVATE || '';
    try {
      webpush = (await import('web-push')).default;
      if (VAPID_PRIVATE) webpush.setVapidDetails('mailto:info@cardinalrenovations.net', VAPID_PUBLIC, VAPID_PRIVATE);
      else { pushErr = 'VAPID_PRIVATE_KEY is not set'; webpush = null; }
    } catch (e) { pushErr = 'push library unavailable'; webpush = null; }

    const report = [];
    for (const b of ready) {
      const r = { key: b.key, to: b.to, pushed: 0, mailed: 0 };
      for (const email of b.to) {
        let subs = [];
        try { subs = await rest(KEY, 'push_subs?select=endpoint,sub&email=eq.' + encodeURIComponent(email)); } catch (e) { r.err = e.message; }
        let ok = 0;
        if (webpush) for (const s of subs) {
          try { await webpush.sendNotification(s.sub, JSON.stringify({ title: b.title, body: b.body, url: b.url })); ok++; }
          catch (err) {
            const code = err && err.statusCode;
            if (code === 404 || code === 410) {
              try { await fetch(SUPABASE_URL + '/rest/v1/push_subs?endpoint=eq.' + encodeURIComponent(s.endpoint), { method: 'DELETE', headers: sb(KEY) }); } catch (_) {}
            } else if (!r.err) r.err = 'push HTTP ' + (code || 0);
          }
        }
        r.pushed += ok;
        if (!ok && process.env.RESEND_API_KEY) {
          /* no working subscription: the buzz goes by email instead */
          try {
            const link = 'https://app.cardinalroster.com/' + b.url;
            const html = '<p>' + String(b.body).replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</p>' +
              '<p style="margin:18px 0 0"><a href="' + link.replace(/"/g, '&quot;') + '">Open it in Cardinal</a></p>';
            const mr = await fetch('https://api.resend.com/emails', { method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + process.env.RESEND_API_KEY },
              body: JSON.stringify({ from: process.env.DIGEST_FROM || 'Cardinal Client Resources <onboarding@resend.dev>',
                to: [email], subject: b.title, html }) });
            if (mr.ok) r.mailed++; else if (!r.err) r.err = 'email HTTP ' + mr.status;
          } catch (e) { if (!r.err) r.err = 'email failed'; }
        }
      }
      report.push(r);
    }
    res.status(200).json({ ok: true, local: L, planned: buzzes.length, sent: report, push_error: pushErr || undefined });
  } catch (e) {
    res.status(200).json({ ok: false, error: String((e && e.message) || e) });
  }
}
