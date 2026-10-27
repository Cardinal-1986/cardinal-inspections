"""Build 1410 (built as 1408, renumbered on rebase over 1409) — a second rep on a job (Theo, 26 Oct 2026: "Make it in the CRM so you can have 2 people
assigned to 1 lead").

checklist.lead.assigned is already an array. Index 0 is the PRIMARY everywhere and keeps that meaning
(assignedRepOf, ljAssignedEmail, project_assigned_rep). Index 1 is the SECOND rep.

1. Job page "Assigned To" card: shows "Second rep: <name>"; an admin sets or clears it with a picker.
   Setting it sends NO notification (Theo: no notifications). Audit-logged like the primary reassign.
2. Reassigning the primary (job card, Bulk reassign, Community job page) now KEEPS the second rep instead of
   overwriting the whole array; if the new primary IS the second rep, the second slot is cleared, so
   primary == second can never be written.
3. Leads & Jobs card: a small "2nd: <name>" chip under the primary. Grouping/sort stay on the primary.
4. "Mine" checks count jobs where I am the second rep: the client-list Assigned = Me filter (cr-rf) and the
   rep's calendar visibility of job/drop appointments (prodVisibleAppt).
Commission is untouched: projects.sales_rep only ever follows the PRIMARY.
SQL (run first): second_rep_rls.sql."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
import patch_lib as pl
P = sys.argv[1] if len(sys.argv) > 1 else 'index.html'
s = open(P, encoding='utf-8').read()
def one(t, old, new, n=1):
    c = t.count(old); assert c == n, (c, old[:90]); return t.replace(old, new)

# ---- stamp + changelog
s = one(s, ">v2026-10-27 build 1409<", ">v2026-10-27 build 1410<")
s = one(s, """  { b: 1409, d:'2026-10-27',""",
"""  { b: 1410, d:'2026-10-27', t:'A second rep on a job', s:'A job can now have two reps. On the job page, Assigned To shows the second rep under the first, and an admin can set or clear it from the Second rep picker. Reassigning the main rep keeps the second one. The second rep sees the job in their own list (Assigned: Me) and on their calendar, and on Leads & Jobs the card shows a small 2nd chip. Setting a second rep sends no message. Commission still follows the main rep only.' },
  { b: 1409, d:'2026-10-27',""")

# ---- CSS: the card's second line and the Leads & Jobs chip
s = one(s, """.dbrep{font:700 15px 'Segoe UI',Arial,sans-serif;}
""", """.dbrep{font:700 15px 'Segoe UI',Arial,sans-serif;}
/* 1408: the second rep's line on the Assigned To card; ink inherits from .dbassign in every theme */
.dbrep2row{flex-basis:100%;display:flex;align-items:center;gap:12px;flex-wrap:wrap;}
.dbrep2{font:600 14px 'Segoe UI',Arial,sans-serif;}
.dbrep2.none{opacity:.75;}
""")
s = one(s, """.ljrep{font-size:11px;font-weight:800;color:var(--rbe-rep,#dce3ec);}
""", """.ljrep{font-size:11px;font-weight:800;color:var(--rbe-rep,#dce3ec);}
/* 1408: the second rep, a chip beside the primary's name (same ink, outlined) */
.ljrep2{display:inline-block;margin-left:6px;padding:0 6px;border:1px solid currentColor;border-radius:8px;font-size:11px;font-weight:700;line-height:15px;}
""")

# ---- helpers, beside assignedRepOf (main block)
s = one(s, """function assignedRepOf(pr){
  var L = parseCkAll(pr).lead;
  if(L && L.assigned && L.assigned.length) return L.assigned[0];
  return pr.created_by || null;
}
""", """function assignedRepOf(pr){
  var L = parseCkAll(pr).lead;
  if(L && L.assigned && L.assigned.length) return L.assigned[0];
  return pr.created_by || null;
}
/* 1408: the SECOND rep is checklist.lead.assigned[1]. Index 0 stays the primary everywhere (assignedRepOf,
   ljAssignedEmail, project_assigned_rep) and alone carries commission. Null when there is no primary at
   index 0 or the second repeats it. */
function secondRepOf(pr){
  try{
    var L = parseCkAll(pr).lead;
    var a = (L && Array.isArray(L.assigned)) ? L.assigned : [];
    var p0 = a[0] ? String(a[0]) : '', s1 = a[1] ? String(a[1]) : '';
    return (p0 && s1 && s1.toLowerCase() !== p0.toLowerCase()) ? s1 : null;
  }catch(_){ return null; }
}
/* 1408: the array a primary reassign writes — the new primary first, the existing second rep kept unless it
   IS the new primary (then the second slot clears, so primary == second is never written). */
function crWithPrimary(assigned, email){
  var a = Array.isArray(assigned) ? assigned : (assigned ? [assigned] : []);
  var s1 = a[1] ? String(a[1]) : '';
  return (s1 && s1.toLowerCase() !== String(email || '').toLowerCase()) ? [email, s1] : [email];
}
/* 1408: "is this one of mine" for a rep — primary OR second. */
function repIsOnJob(pr, em){
  em = String(em || '').toLowerCase();
  if(!pr || !em) return false;
  return String(assignedRepOf(pr) || '').toLowerCase() === em || String(secondRepOf(pr) || '').toLowerCase() === em;
}
""")

# ---- prodVisibleAppt: the second rep sees the job's crew/drop days too
s = one(s, """  return !!pr && assignedRepOf(pr) === me;
}""", """  return !!pr && (assignedRepOf(pr) === me || repIsOnJob(pr, me));   /* 1408: the second rep too */
}""")

# ---- the Assigned To card
s = one(s, """    '<span class="dbrep">&#128100; <b>' + esc(rptRepName(rep) || rep || 'Unassigned') + '</b></span>' +
    (isAdminUser() ? '<select id="dbAssignSel" class="acxsel" aria-label="Reassign this job to another rep" style="margin-left:auto;">' +
      '<option value="">reassign\\u2026</option>' +
      TEAM_ROSTER.map(function(m){ return '<option value="' + m.email + '">' + esc(m.name) + '</option>'; }).join('') +
    '</select>' : '') +
  '</div></div>';""", """    '<span class="dbrep">&#128100; <b>' + esc(rptRepName(rep) || rep || 'Unassigned') + '</b></span>' +
    (isAdminUser() ? '<select id="dbAssignSel" class="acxsel" aria-label="Reassign this job to another rep" style="margin-left:auto;">' +
      '<option value="">reassign\\u2026</option>' +
      TEAM_ROSTER.map(function(m){ return '<option value="' + m.email + '">' + esc(m.name) + '</option>'; }).join('') +
    '</select>' : '') +
    /* 1408: the second rep (checklist.lead.assigned[1]). Only offered once a primary is actually assigned at
       index 0 — a second rep with no first would leave index 0 empty. The picker never lists the primary. */
    (function(){
      var r2 = secondRepOf(pr);
      var a0 = ((parseCkAll(pr).lead || {}).assigned || [])[0];
      var adm = isAdminUser();
      if(!r2 && !adm) return '';
      var line = '<span class="dbrep2' + (r2 ? '' : ' none') + '">Second rep: <b>' + esc(r2 ? (rptRepName(r2) || r2) : 'none') + '</b></span>';
      if(!adm) return '<div class="dbrep2row">' + line + '</div>';
      if(!a0) return '<div class="dbrep2row">' + line + '<span class="dbrep2 none">Assign a rep first</span></div>';
      var p0 = String(a0).toLowerCase();
      return '<div class="dbrep2row">' + line +
        '<select id="dbAssign2Sel" class="acxsel" aria-label="Set or clear the second rep on this job" style="margin-left:auto;">' +
          '<option value="">second rep\\u2026</option>' +
          TEAM_ROSTER.filter(function(m){ return String(m.email).toLowerCase() !== p0; })
            .map(function(m){ return '<option value="' + m.email + '">' + esc(m.name) + '</option>'; }).join('') +
          (r2 ? '<option value="__clear">Remove second rep</option>' : '') +
        '</select></div>';
    })() +
  '</div></div>';""")

# ---- the primary reassign keeps the second rep
s = one(s, """    var L = parseCkAll(pr).lead || {};
    L.assigned = [asg.value];
    try{
      await patchProjectCk(pr, { lead: L });""", """    var L = parseCkAll(pr).lead || {};
    L.assigned = crWithPrimary(L.assigned, asg.value);   /* 1408: keeps the second rep */
    try{
      await patchProjectCk(pr, { lead: L });""")

# ---- the second-rep handler: no notification, audit-logged
s = one(s, """      renderOverview();
    }catch(err){ showError('Could not reassign: ' + (err.message || err)); }
  });
  acxBindOnce(mount);""", """      renderOverview();
    }catch(err){ showError('Could not reassign: ' + (err.message || err)); }
  });
  /* 1408: set or clear the second rep. Deliberately NO notifyTeam (Theo: no notifications) and no
     sales_rep write — commission follows the primary only. */
  var asg2 = /** @type {HTMLSelectElement|null} */ (document.getElementById('dbAssign2Sel'));
  if(asg2) asg2.addEventListener('change', async function(){
    var v2 = asg2.value;
    if(!v2) return;
    var L2 = parseCkAll(pr).lead || {};
    var cur = Array.isArray(L2.assigned) ? L2.assigned : [];
    var p0 = cur[0] ? String(cur[0]) : '';
    var was = cur[1] ? String(cur[1]) : '';
    if(!p0 || (v2 !== '__clear' && v2.toLowerCase() === p0.toLowerCase())){ asg2.value = ''; return; }
    L2.assigned = (v2 === '__clear') ? [p0] : [p0, v2];
    try{
      await patchProjectCk(pr, { lead: L2 });
      auditLog('assign', (v2 === '__clear'
        ? 'Second rep removed' + (was ? ' (' + (rptRepName(was) || was) + ')' : '')
        : 'Second rep set to ' + (rptRepName(v2) || v2)) + ' \\u2014 ' + (pr.name || ''), pr.id);
      renderOverview();
    }catch(err){ showError('Could not set the second rep: ' + (err.message || err)); }
  });
  acxBindOnce(mount);""")

# ---- Leads & Jobs card: the chip
s = one(s, """      '<div class="ljrep">' + esc(ljRepLabel(p)) + '</div>' +""",
"""      '<div class="ljrep">' + esc(ljRepLabel(p)) +
        /* 1408: the second rep as a chip; the card still groups and sorts under the primary */
        (function(){ var r2 = secondRepOf(p); return r2 ? '<span class="ljrep2" title="Second rep">2nd: ' + esc(rptRepName(r2) || r2) + '</span>' : ''; })() +
      '</div>' +""")

# ---- Bulk reassign keeps the second rep
s = one(s, """ck.lead.assigned = [email];""",
"""ck.lead.assigned = (typeof window.crWithPrimary === 'function') ? window.crWithPrimary(ck.lead.assigned, email) : [email];   /* 1408 */""")

# ---- Community job page rep picker keeps the second rep
s = one(s, """var L = Object.assign({}, lead(pr)); L.assigned = [v];""",
"""var L = Object.assign({}, lead(pr)); L.assigned = (typeof window.crWithPrimary === 'function') ? window.crWithPrimary(L.assigned, v) : [v];   /* 1408 */""")

# ---- client list "Assigned: Me" counts the second rep
s = one(s, """if(filter === '__me')   return rep === myEmail();""",
"""if(filter === '__me')   return rep === myEmail() || (typeof window.repIsOnJob === 'function' && window.repIsOnJob(pr, myEmail()));   /* 1408 */""")

# ---- the folded Assigned To summary names both
s = one(s, """        sum: rep ? rep.textContent.trim() : 'Nobody yet' },""",
"""        sum: rep ? rep.textContent.trim() + (function(){ var r2 = asg && asg.querySelector('.dbrep2:not(.none) b'); return r2 ? ' + ' + r2.textContent.trim() : ''; })() : 'Nobody yet' },   /* 1408 */""")

# ==== stage 2 (same build) — Theo, 26 Oct 2026: "I'm paying Jacob 10% of total cost during the training." and
# "I will never pay myself a commission." The DB trigger make_commission() decides who is paid
# (second_rep_commission.sql); these edits make the app SAY the same thing. The commission base is each
# collection's amount (10% of every dollar collected), unchanged.
s = one(s, "Commission still follows the main rep only.' },",
        r"On a job you hold, the second rep earns the 10% commission (Jacob, during his training); on a rep\u2019s own job the commission still goes to that rep only, and Theo never earns one.' },")

s = one(s, """/* 1408: "is this one of mine" for a rep — primary OR second. */""",
"""/* 1408: WHO EARNS THE 10% — the app's mirror of make_commission() (second_rep_commission.sql), which alone
   books the row. The job's sales_rep earns, as always; when that is Theo (or nobody) and the primary is not a
   commissioned rep, the SECOND rep earns (Theo, 26 Oct 2026: "I'm paying Jacob 10% of total cost during the
   training."). Theo never earns in any slot: "I will never pay myself a commission." Returns
   { email, second } or null. Display only — the trigger is the authority. */
var CR_NO_COMMISSION = 'theo@cardinalrenovations.net';
function crCommissionRep(pr){
  if(!pr) return null;
  var rep = pr.sales_rep ? String(pr.sales_rep) : '';
  if(rep && rep.toLowerCase() !== CR_NO_COMMISSION) return { email: rep, second: false };
  var L = (parseCkAll(pr) || {}).lead || {};
  var a = Array.isArray(L.assigned) ? L.assigned : [];
  var a0 = a[0] ? String(a[0]) : '';
  var s2 = secondRepOf(pr);
  var isRep = function(em){ return !!em && em.toLowerCase() !== CR_NO_COMMISSION &&
    (typeof tmRoleOf !== 'function' || tmRoleOf(em) === 'Sales'); };
  if(s2 && isRep(s2) && !isRep(a0)) return { email: s2, second: true };
  return null;
}
/* 1408: "is this one of mine" for a rep — primary OR second. */""")

s = one(s, """  var rep = currentProject.sales_rep || null;
  var pays = rep && rep !== 'theo@cardinalrenovations.net';""",
"""  var rep = currentProject.sales_rep || null;
  /* 1408: who earns comes from the one mirror of make_commission(); Theo never does */
  var _earn = crCommissionRep(currentProject);
  var pays = !!_earn;""")
s = one(s, r"""      (pays ? '\n\nThis job is assigned to ' + rep + ', so a 10% commission will be created.' : ''))) return;""",
r"""      (pays ? (_earn.second
        ? '\n\nThis job is held by ' + (rptRepName(rep || '') || rep || 'the office') + ', so a 10% commission will be created for ' + (rptRepName(_earn.email) || _earn.email) + ' (second rep).'
        : '\n\nThis job is assigned to ' + rep + ', so a 10% commission will be created for ' + (rptRepName(_earn.email) || _earn.email) + '.') : ''))) return;""")

s = one(s, """    (rep === COMM_OWNER
      ? '<span class="subnote">No commission &#8212; owner project.</span>'""",
"""    /* 1408: an owner project with a second rep pays the second rep (Theo, 26 Oct 2026) */
    ((function(){ var e = crCommissionRep(currentProject); return e && e.second; })()
      ? '<span class="subnote" data-cr-comm2="1">' + woEsc(rptRepName(crCommissionRep(currentProject).email) || crCommissionRep(currentProject).email) + ' (second rep) earns 10% of every dollar collected.</span>'
      : rep === COMM_OWNER
      ? '<span class="subnote">No commission &#8212; owner project.</span>'""")

# ==== stage 3 (same build) — Theo, 26 Oct: the second rep also sees the job's contracts, claims, payments,
# supplements, objection logs and scope reads (second_rep_rls.sql). Only the What's New text changes here.
s = one(s, "The second rep sees the job in their own list (Assigned: Me) and on their calendar",
        "The second rep sees the job in their own list (Assigned: Me), on their calendar, and its contracts, claims, payments and scope reads")

pl.write_atomic(P, s)
print('ok 1410')
