"""Build 1403 — scheduling, notifications and offline (23 Oct 2026 audit, round 7).
1. An offline job edit wiped teammates' changes to the same job on reconnect: patchProjectCk skips its refetch
   offline (1017) and the outbox replayed the whole checklist blob. A checklist patch now queues the KEYS it
   changed (`ck`), and the flush merges them onto the server's current checklist before writing (655's rule,
   offline too). A full-blob write to the same job still wins whole, as before.
2. (Not changed: reps are texted about every appointment on their jobs, personal ones included, by 1382's
   design, though RLS hides personal rows from them in the calendar — left for Theo.)
3. Booking an appointment with no signal said "run the appointments migration in Supabase". It says there is no
   signal and nothing was saved.
4. Smaller: the booking alert promised an hour-before text on all-day items; the punch map's "Today" was the UTC
   date (tomorrow after 8pm); a crew document expiring today read "Expired · 1 days ago"; the calendar's
   "Next:" line could show an appointment already over today; "remind me in N days" skipped a day across the
   spring clock change."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
import patch_lib as pl
path = sys.argv[1] if len(sys.argv) > 1 else 'index.html'
apath = sys.argv[2] if len(sys.argv) > 2 else 'api/appt-remind.js'
s = open(path, encoding='utf-8').read()
a = open(apath, encoding='utf-8').read()
def one(old, new, which='s'):
    global s, a
    t = s if which == 's' else a
    n = t.count(old); assert n == 1, (which, n, old[:90]); t = t.replace(old, new)
    if which == 's': s = t
    else: a = t

# 1 — the changed keys travel with the queued write
one("""function pdbQueueOffline(id, fields){
  pdbApplyLocal(id, fields);
  try{ if(window.CardinalOutbox) window.CardinalOutbox.queue({ table:'projects', match:{ col:'id', val:id }, patch: fields }); }catch(_pq){}
}""",
"""function pdbQueueOffline(id, fields, ck){
  pdbApplyLocal(id, fields);
  /* 1403: ck = the checklist keys this edit changed; the flush merges them onto the server's copy */
  var _e = { table:'projects', match:{ col:'id', val:id }, patch: fields };
  if(ck && fields && fields.checklist != null) _e.ck = ck;
  try{ if(window.CardinalOutbox) window.CardinalOutbox.queue(_e); }catch(_pq){}
}""")
one("""  update: async function(id, fields){
    fields.updated_at = new Date().toISOString();
    if(TEAM){
      /* 868: no signal — hold the change in the outbox and apply it locally now,
         then sync when we're back. A real RLS refusal (returned r.error, not a
         thrown network error) still throws so the caller can react. */
      if(typeof navigator !== 'undefined' && navigator.onLine === false && window.CardinalOutbox){
        pdbQueueOffline(id, fields); return;
      }
      var r;
      try{ r = await sb.from('projects').update(fields).eq('id', id); }
      catch(e){
        if(window.CardinalOutbox && window.CardinalOutbox.networkish && window.CardinalOutbox.networkish(e)){ pdbQueueOffline(id, fields); return; }
        throw e;
      }
      if(r.error){
        if(window.CardinalOutbox && window.CardinalOutbox.networkish && window.CardinalOutbox.networkish(r.error)){ pdbQueueOffline(id, fields); return; }""",
"""  update: async function(id, fields, ck){   /* 1403: ck — see pdbQueueOffline */
    fields.updated_at = new Date().toISOString();
    if(TEAM){
      /* 868: no signal — hold the change in the outbox and apply it locally now,
         then sync when we're back. A real RLS refusal (returned r.error, not a
         thrown network error) still throws so the caller can react. */
      if(typeof navigator !== 'undefined' && navigator.onLine === false && window.CardinalOutbox){
        pdbQueueOffline(id, fields, ck); return;
      }
      var r;
      try{ r = await sb.from('projects').update(fields).eq('id', id); }
      catch(e){
        if(window.CardinalOutbox && window.CardinalOutbox.networkish && window.CardinalOutbox.networkish(e)){ pdbQueueOffline(id, fields, ck); return; }
        throw e;
      }
      if(r.error){
        if(window.CardinalOutbox && window.CardinalOutbox.networkish && window.CardinalOutbox.networkish(r.error)){ pdbQueueOffline(id, fields, ck); return; }""")
one("""  Object.keys(patch).forEach(function(k){ all[k] = patch[k]; });
  var s = JSON.stringify(all);
  await pdb.update(pr.id, { checklist: s });""",
"""  Object.keys(patch).forEach(function(k){ all[k] = patch[k]; });
  var s = JSON.stringify(all);
  await pdb.update(pr.id, { checklist: s }, patch);   /* 1403: offline, only these keys are replayed */""")
# fold: keep the key set; a whole-blob write to the same job drops it
one("""          if(entry.op === 'upsert') hit.row = Object.assign({}, hit.row, entry.row);
          else hit.patch = Object.assign({}, hit.patch, entry.patch);""",
"""          if(entry.op === 'upsert') hit.row = Object.assign({}, hit.row, entry.row);
          else {
            /* 1403: checklist keys fold together; a whole-checklist write (no ck) replaces whole, as before */
            var _hadCk = !!hit.ck || !(hit.patch && hit.patch.checklist != null);
            if(entry.patch && entry.patch.checklist != null){
              if(entry.ck && _hadCk) hit.ck = Object.assign({}, hit.ck || {}, entry.ck);
              else delete hit.ck;
            }
            hit.patch = Object.assign({}, hit.patch, entry.patch);
          }""")
# flush: merge the keys onto the server's current checklist
one("""        var attempt = function(retried){
          var qq = (row.op === 'upsert')
            ? cx.from(row.table).upsert(row.row, row.onConflict ? { onConflict: row.onConflict } : undefined)
            : cx.from(row.table).update(row.patch).eq(row.match.col, row.match.val);""",
"""        var attempt = function(retried){
          /* 1403: a checklist edit made offline carries the keys it changed — merge them onto the server's
             CURRENT checklist, so a teammate's edits to other keys of the job survive the replay (655, offline) */
          if(row.ck && row.op !== 'upsert' && row.patch && row.patch.checklist != null && !row._merged){
            return Promise.resolve(cx.from(row.table).select('checklist').eq(row.match.col, row.match.val).single()).then(function(fr){
              if(fr && fr.error){
                if(networkish(fr.error)) return true;
                if(authish(fr.error) && !retried) return refreshAuth().then(function(){ return attempt(true); });
              } else if(fr && fr.data && fr.data.checklist){
                var cur = {}; try{ cur = JSON.parse(fr.data.checklist) || {}; }catch(_c){ cur = null; }
                if(cur){ Object.keys(row.ck).forEach(function(k){ cur[k] = row.ck[k]; }); row.patch = Object.assign({}, row.patch, { checklist: JSON.stringify(cur) }); }
              }
              row._merged = 1;
              return attempt(retried);
            }, function(e){ if(networkish(e)) return true; row._merged = 1; return attempt(retried); });
          }
          var qq = (row.op === 'upsert')
            ? cx.from(row.table).upsert(row.row, row.onConflict ? { onConflict: row.onConflict } : undefined)
            : cx.from(row.table).update(row.patch).eq(row.match.col, row.match.val);""")

# 2 — all-day bookings have no hour-before text
one("""      '<p>You will get a text that morning and again about an hour before.</p>',""",
"""      '<p>You will get a text that morning' + (f.appt_time ? ' and again about an hour before' : '') + '.</p>',   /* 1403: all-day has no hour-before */""")
# 3 — offline booking
one("""    document.getElementById('apptError').textContent = 'Could not save \\u2014 if this persists, run the appointments migration in Supabase. (' + (err.message || err) + ')';""",
"""    /* 1403: no signal is not a missing migration */
    var _off = (typeof navigator !== 'undefined' && navigator.onLine === false) ||
      (window.CardinalOutbox && window.CardinalOutbox.networkish && window.CardinalOutbox.networkish(err));
    document.getElementById('apptError').textContent = _off
      ? 'No signal \\u2014 this appointment was not saved. Add it again when you have service.'
      : 'Could not save \\u2014 if this persists, run the appointments migration in Supabase. (' + (err.message || err) + ')';""")

# 4 — dates
one("""  function todayISO(){ try{ return new Date().toISOString().slice(0,10); }catch(e){ return ''; } }""",
"""  function todayISO(){ try{ var t = new Date(); return t.getFullYear() + '-' + ('0' + (t.getMonth() + 1)).slice(-2) + '-' + ('0' + t.getDate()).slice(-2); }catch(e){ return ''; } }   /* 1403: the local day, not UTC */""")
one("""  var d = new Date(iso + 'T00:00:00');
  if(isNaN(d.getTime())) return null;
  return Math.floor((d.getTime() - Date.now()) / 86400000);""",
"""  var d = new Date(iso + 'T00:00:00');
  if(isNaN(d.getTime())) return null;
  var t0 = new Date(); t0.setHours(0, 0, 0, 0);   /* 1403: whole days from today — the last valid day is 0, not -1 */
  return Math.round((d.getTime() - t0.getTime()) / 86400000);""")
one("""  var up = cacheAppts.filter(function(a){ return a.appt_date >= todayS; });""",
"""  var nowT = ('0' + now.getHours()).slice(-2) + ':' + ('0' + now.getMinutes()).slice(-2);
  var up = cacheAppts.filter(function(a){   /* 1403: one that started earlier today is over */
    return a.appt_date > todayS || (a.appt_date === todayS && (!a.appt_time || String(a.appt_time).slice(0, 5) >= nowT));
  });""")
DST = "new Date(Date.now() + n * 86400000)"
assert s.count(DST) == 2
s = s.replace(DST, "(function(){ var _x = new Date(); _x.setDate(_x.getDate() + n); return _x; })()")   # 1403: calendar days
one("new Date(Date.now() + 3 * 86400000)", "(function(){ var _x = new Date(); _x.setDate(_x.getDate() + 3); return _x; })()")

one(">v2026-10-23 build 1402<", ">v2026-10-23 build 1403<")
one("""  { b: 1402, d:'2026-10-23',""",
"""  { b: 1403, d:'2026-10-23', t:'Offline edits, appointment texts and dates', s:'A change made to a job with no signal no longer wipes out a teammate\\u2019s changes to the same job when your phone syncs. Booking an appointment with no signal says so instead of asking for a database fix. All-day appointments no longer promise an hour-before text. The punch map\\u2019s Today, crew document expiry, the calendar\\u2019s Next line and reminders set across the clock change now count days correctly.' },
  { b: 1402, d:'2026-10-23',""")
pl.write_atomic(path, s)
pl.write_atomic(apath, a)
print('ok 1403')
