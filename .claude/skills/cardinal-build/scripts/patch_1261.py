#!/usr/bin/env python3
"""Build 1261 — only Theo, Joan and Curtis schedule punch work; old leads get
their Job Category and Work Type.

Theo, 8 Oct: "Only Theo Joan and Curtis can schedule punch work. Yes fill in
job categories."

SQL FIRST, both APPLIED to production 8 Oct before this patch:
  punch_schedule_guard.sql — punch_close_guard() now refuses a date or time
    change from anyone but the three punch bosses, except putting a job on hold
    (1249) and an older app's check-out (the visit is kept, the date is not).
  backfill_lead_category_worktype.sql — 26 leads entered before 1253 get the
    flat job_category / work_type that Job Details and the reports read.

App — so nobody is offered what the database now refuses:
  1. "+ New" punch form: Schedule for shows only for the bosses; anyone else
     reads "Curtis schedules it" (the 1252 "Curtis assigns it" shape).
  2. Card check-out: a boss is still asked "Back on this tomorrow?". Anyone
     else is asked "Tell Curtis it needs another day?" — yes writes the closed
     visit plus a message on the job, then buzzes the office (Theo + Curtis,
     officeEmails(), the same pair 1252's "Tell Curtis it's finished" buzzes).
     It never sends a date.
  3. Work Type: the New Lead form has offered Warranty since before 1253, but
     the Edit form and Job Details did not, so a Warranty lead showed blank
     there and an Edit-form save wrote '' over it. One backfilled lead is
     Warranty. Both lists gain it, in the intake's order.
  4. The Edit form kept a lead's Retail / Insurance Work Type only in name:
     cr-wtd-script strips both from the list at load, so the select showed
     "not set" and Save wrote null over it. The lead's own value is now kept as
     a labelled legacy option. 9 leads carry one.

usage: python3 patch_1261.py [index.html]
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import patch_lib as pl
HERE = os.path.dirname(os.path.abspath(__file__))
PATH = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, '../../../../index.html')
src = pl.load(PATH)

# 1. the "+ New" punch form
src = pl.sub(src, """      : '<div><label>Assign to</label><select data-f="assigned">' + who + '</select></div>') +
    '<div><label>Schedule for</label><div class="cr-when2">' +
      '<input type="date" data-f="when">' +
      '<input type="time" data-f="whentime" aria-label="Time (optional)">' +
    '</div></div>' +
    '</div>' +""", """      : '<div><label>Assign to</label><select data-f="assigned">' + who + '</select></div>') +
    /* 1261: only they schedule, too — punch_schedule_guard.sql refuses a dated
       row from anyone else, so anyone else files it undated for Curtis */
    ((typeof window.isPunchBoss === 'function' && !window.isPunchBoss())
      ? '<div><label>Schedule for</label><div class="pbnote" style="padding:10px 0;">Curtis schedules it</div></div>'
      : '<div><label>Schedule for</label><div class="cr-when2">' +
          '<input type="date" data-f="when">' +
          '<input type="time" data-f="whentime" aria-label="Time (optional)">' +
        '</div></div>') +
    '</div>' +""")

# 2. check-out on the card
src = pl.sub(src, """  var patch = { visits: v };
  /* Theo's call: ASK, then move. Nothing reschedules itself behind him — he
     may be checking out because he is waiting on a part, and then tomorrow is
     the wrong date and nobody was consulted. */
  if(it.status !== 'done'){
    var back = await crAsk('Not finished yet.\\n\\nBack on this tomorrow?');
    if(back) patch.scheduled_at = nextWorkDay(now);
  }
  save(patch);
}""", """  var patch = { visits: v };
  /* Theo's call: ASK, then move. Nothing reschedules itself behind him — he
     may be checking out because he is waiting on a part, and then tomorrow is
     the wrong date and nobody was consulted. */
  var needDay = false;
  if(it.status !== 'done'){
    if(isManager()){
      var back = await crAsk('Not finished yet.\\n\\nBack on this tomorrow?');
      if(back) patch.scheduled_at = nextWorkDay(now);
    } else {
      /* 1261: only Theo, Joan and Curtis schedule (punch_schedule_guard.sql).
         The crew says it needs another day; Curtis picks the day. */
      needDay = !!(await crAsk('Not finished yet.\\n\\nTell Curtis it needs another day?',
                               { verb:'Tell Curtis', cancel:'Not now', tone:'plain' }));
      if(needDay){
        var me = myEmail();
        patch.comments = comments().concat([{ by:me, name:nameOf(me), at:now.toISOString(),
          text:'Not finished \\u2014 needs another day. Curtis to schedule it.', flag:'needday' }]);
      }
    }
  }
  if(!needDay){ save(patch); return; }
  await save(patch);
  var to = officeEmails();
  if(to.length && typeof window.notifyTeam === 'function'){
    var pr = projectFor(it.project_id), who = myEmail();
    try{
      var res = await window.notifyTeam(to, 'Needs another day: ' + ((pr && pr.name) || 'a job') + ' \\u2014 ' + (it.title || 'punch-out'),
        '<p><b>' + esc(nameOf(who)) + '</b> checked out of <b>' + esc(it.title || '') + '</b> at <b>' + esc((pr && pr.name) || 'a job') + '</b>. It is not finished and needs another day \\u2014 pick the day on the card.</p>',
        punchLink(it.project_id));
      outMsg = outcomeText(res, to);
    }catch(_){ outMsg = 'Saved \\u2014 could not tell whether Curtis was buzzed.'; }
    lastSig = ''; render();
  }
}""")

# 3. Warranty in the two Work Type lists that lacked it
src = pl.sub(src, """      <option>Repair</option><option>Retail</option><option>Service</option>
    </select></label>""", """      <option>Repair</option><option>Retail</option><option>Service</option><option>Warranty</option>
    </select></label>""")
src = pl.sub(src, """acxOpts(['Inspection','Insurance','New','Repair','Retail','Service'], ck.work_type)""",
                  """acxOpts(['Inspection','Insurance','New','Repair','Retail','Service','Warranty'], ck.work_type)""")

# 4. the Edit form wiped a Retail / Insurance Work Type on save
#    cr-wtd-script strips Insurance and Retail from #pfWorkType once, at load
#    (Claim Type carries them now), and keeps the option only if it is the
#    select's value AT THAT MOMENT — which at load is always ''. So a lead saved
#    as either could never be shown: the select fell to "not set" and the next
#    Save wrote null over it. 9 leads carry one (6 Retail, 3 Insurance), 3 of
#    them filled by this build's backfill. Keep the lead's own value as a
#    labelled option, in cr-wtd's own words, before setting the select.
src = pl.sub(src, """  document.getElementById('pfWorkType').value = _ck.work_type || '';
""", """  /* 1261: cr-wtd-script strips Insurance/Retail from this list at load and keeps
     one only if it is the value AT THAT MOMENT ('' at load), so a lead saved as
     either fell to "not set" here and the next Save wrote null over it. Keep the
     lead's own value as a labelled option — cr-wtd's own wording for a legacy
     type — then select it. */
  (function(sel, v){
    if(!sel) return;
    Array.prototype.slice.call(sel.querySelectorAll('option[data-cr-legacy]')).forEach(function(o){ o.remove(); });
    if(v && !Array.prototype.some.call(sel.options, function(o){ return (o.value || o.textContent || '').trim() === v; })){
      var red = (window.CardinalWorkTypeDedupe && window.CardinalWorkTypeDedupe.redundant) || [];
      var o = document.createElement('option');
      o.value = v;
      o.textContent = red.indexOf(v) !== -1 ? v + ' (legacy \u2014 set Claim Type instead)' : v;
      o.setAttribute('data-cr-legacy', '1');
      sel.appendChild(o);
    }
    sel.value = v || '';
  })((/** @type {HTMLSelectElement} */ (document.getElementById('pfWorkType'))), _ck.work_type || '');
""")

# stamp + changelog
src = pl.sub(src, '>v2026-10-07 build 1260<', '>v2026-10-08 build 1261<')
src = pl.sub(src, '''var CHANGELOG = [
''', '''var CHANGELOG = [
  { b: 1261, d: '2026-10-08', t: 'Only Theo, Joan and Curtis schedule punch work',
    s: 'Picking the day for a punch-out, repair, callback or tarp is now for Theo, Joan and Curtis, the same three who assign and close them. Anyone else files new work without a date (the form says <b>Curtis schedules it</b>), and checking out of a job that is not finished asks <b>Tell Curtis it needs another day?</b> \\u2014 yes leaves a note on the job and lets Curtis and Theo know. Anyone can still put a job on hold, and it still comes back on its look-again day. Leads entered before yesterday now show their Job Category and Work Type, Warranty is a Work Type everywhere, and saving the Edit form no longer erases a lead\u2019s Retail or Insurance Work Type.' },
''')
pl.write_atomic(PATH, src)
print('patched', PATH, len(src))
