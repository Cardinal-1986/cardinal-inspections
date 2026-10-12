"""Build 1325 — Owner Review's automatic flags (Theo's pick 4: "all on", each switchable).

Six rules, each run only for an admin, each writing only to owner_reviews (admin-only RLS):
  price_drop         the job value is $1,000+ under the FIRST estimate
  below_ins          insurance job: signed contracts total more than $250 under the approved RCV
  ded_uncollected    insurance job, finished: deductible marked WAIVED, or money still owed and no
                     deductible check recorded on the claim (insurance_payments kind 'deductible')
  extra_no_co        a punch item says extra / added / build-out / extend / additional, and the job
                     has no signed change order
  done_unpaid        Completed / Invoiced / Closed 14+ days with nothing recorded paid
  invoiced_no_price  Invoiced or Closed with a job value of $0
A rule flags a job ONCE: the unique index (project_id, rule) means a dismissed or resolved auto flag
never comes back. Switches live in owner_review_rules (admin-only; missing row = ON).
When: every time Owner Review opens, and once, quietly, ~20s after an admin signs in.
Usage: python3 patch_1325.py [index.html]
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import patch_lib as pl
FILE = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../../../index.html')
s = pl.load(FILE)
def one(old, new):
    global s
    assert s.count(old) == 1, (old[:90], s.count(old))
    s = s.replace(old, new)

# ── styles: the rule rows and their switch ─────────────────────────────────────────────
one("""#cr-orv-view details summary{cursor:pointer; min-height:44px; display:flex; align-items:center; font-size:14px; color:var(--orv-dim,#a8b0ba);}
</style>""", """#cr-orv-view details summary{cursor:pointer; min-height:44px; display:flex; align-items:center; font-size:14px; color:var(--orv-dim,#a8b0ba);}
/* 1325: the automatic-flag switches */
#cr-orv-view .orv-rule{display:flex; justify-content:space-between; align-items:center; gap:12px;}
#cr-orv-view .orv-tog{flex:none; min-width:64px; min-height:44px; padding:0 14px; border-radius:99px; font:inherit; font-size:14px; font-weight:700;
  border:1px solid var(--orv-line,#262a30); background:transparent; color:var(--orv-dim,#a8b0ba); cursor:pointer;}
#cr-orv-view .orv-tog[aria-pressed="true"]{background:var(--orv-pos,#34d399); border-color:var(--orv-pos,#34d399); color:#04130d;}
:root[data-theme="rb-light"] #cr-orv-view .orv-tog[aria-pressed="true"]{color:#FFFFFF;}
</style>""")

# ── the list: switches + "dismissed" folded with resolved ──────────────────────────────
one("""    if(done.length) h += '<details><summary>Resolved (' + done.length + ')</summary>' + done.map(card).join('') + '</details>';
    return h;
  }""", """    if(done.length) h += '<details><summary>Resolved or dismissed (' + done.length + ')</summary>' + done.map(card).join('') + '</details>';
    h += orvRulesHtml();
    return h;
  }""")

# ── the detail: Dismiss on an automatic flag ───────────────────────────────────────────
one("""    h += r.status === 'open' ? '<button class="orv-btn" type="button" data-orv-resolve="1">Mark resolved</button>' : '<button class="orv-btn" type="button" data-orv-reopen="1">Reopen</button>';""",
"""    h += r.status === 'open' ? '<button class="orv-btn" type="button" data-orv-resolve="1">Mark resolved</button>' : '<button class="orv-btn" type="button" data-orv-reopen="1">Reopen</button>';
    if(r.source === 'auto' && r.status === 'open') h += '<button class="orv-btn" type="button" data-orv-dismiss="1">Dismiss — not a problem</button>';   /* 1325 */""")
one("""    if(el.closest('[data-orv-reopen]')){ if(await patch(r, { status:'open', resolved_at:null, resolved_by:null })) await orvRender(); return; }""",
"""    if(el.closest('[data-orv-reopen]')){ if(await patch(r, { status:'open', resolved_at:null, resolved_by:null })) await orvRender(); return; }
    if(el.closest('[data-orv-dismiss]')){ if(await patch(r, { status:'dismissed', resolved_at:new Date().toISOString(), resolved_by:orvMe() })) await orvRender(); return; }""")

# ── the switch click (it needs no open review, so it goes BEFORE the `if(!r) return`) ──
one("""    if(!r) return;
    if(el.closest('[data-orv-note]')){""", """    if((t = el.closest('[data-orv-rule]'))){ await orvToggleRule(t.getAttribute('data-orv-rule')); return; }   /* 1325 */
    if(!r) return;
    if(el.closest('[data-orv-note]')){""")

# ── open: run the rules first ──────────────────────────────────────────────────────────
one("""    var body = orvQ('orvBody'); if(body) body.innerHTML = '<div class="orv-empty">Loading…</div>';
    await orvLoad(); await orvRender();""", """    var body = orvQ('orvBody'); if(body) body.innerHTML = '<div class="orv-empty">Loading…</div>';
    try{ await orvRunRules(); }catch(_ru){}   /* 1325 */
    await orvLoad(); await orvRender();""")

ENGINE = r"""
  /* 1325: the automatic flags. Admin-only by construction: orvRunRules() returns at once for anyone
     else, and both tables it touches refuse a non-admin in RLS anyway. Nothing here writes to the job. */
  var ORV_RULES = [
    { k:'price_drop',        t:'Price dropped $1,000 or more',     m:'Job value $1,000+ under the first estimate' },
    { k:'below_ins',         t:'Signed below the insurance amount', m:'Insurance job: signed contracts more than $250 under the approved amount' },
    { k:'ded_uncollected',   t:'Deductible not collected',          m:'Finished insurance job: deductible waived, or still owed with no deductible check recorded' },
    { k:'extra_no_co',       t:'Extra work, no change order',       m:'A punch item says extra, added, build-out, extend or additional, and nothing is signed' },
    { k:'done_unpaid',       t:'Work done, nothing recorded paid',  m:'Completed 14+ days with $0 in the ledger' },
    { k:'invoiced_no_price', t:'Invoiced with no price',            m:'Invoiced or Closed with a job value of $0' }
  ];
  var ruleOn = null, ruleRanAt = 0;
  async function orvLoadRules(){
    var c = orvCx(); ruleOn = {};
    ORV_RULES.forEach(function(x){ ruleOn[x.k] = true; });   /* a missing row is ON — Theo's "all on" */
    if(!c) return ruleOn;
    try{ var res = await c.from('owner_review_rules').select('rule,enabled'); ((res && res.data) || []).forEach(function(r){ if(r.rule in ruleOn) ruleOn[r.rule] = r.enabled !== false; }); }catch(e){}
    return ruleOn;
  }
  function orvRulesHtml(){
    var on = ruleOn || {};
    return '<div class="orv-h">Automatic flags</div><p class="orv-sub">Each rule flags a job once. Dismiss a flag and it stays dismissed.</p>'
      + ORV_RULES.map(function(x){
          var lit = on[x.k] !== false;
          return '<div class="orv-card orv-rule"><div><div class="orv-nm">' + orvEsc(x.t) + '</div><div class="orv-mu">' + orvEsc(x.m) + '</div></div>'
            + '<button class="orv-tog" type="button" data-orv-rule="' + x.k + '" aria-pressed="' + (lit ? 'true' : 'false') + '" aria-label="' + orvEsc(x.t) + '">' + (lit ? 'On' : 'Off') + '</button></div>';
        }).join('');
  }
  async function orvToggleRule(k){
    if(!orvIsAdm() || !ruleOn || !(k in ruleOn)) return;
    var c = orvCx(); if(!c) return;
    var next = !(ruleOn[k] !== false);
    var res = await c.from('owner_review_rules').upsert({ rule:k, enabled:next, updated_at:new Date().toISOString(), updated_by:orvMe() }).select();
    if(res && res.error){ if(typeof crTell === 'function') crTell('Could not save: ' + res.error.message); return; }
    ruleOn[k] = next;
    if(next){ ruleRanAt = 0; try{ await orvRunRules(); }catch(_){} await orvLoad(); }
    await orvRender();
  }
  function orvMoneyIn(pr, fin){ return fin ? Number(fin.paid) || 0 : 0; }
  function orvStage(pr){ try{ return typeof normStage === 'function' ? normStage(pr.stage) : String(pr.stage || ''); }catch(e){ return String(pr.stage || ''); } }
  async function orvRunRules(){
    if(!orvIsAdm()) return 0;
    if(Date.now() - ruleRanAt < 60000) return 0;
    var c = orvCx(); if(!c) return 0;
    ruleRanAt = Date.now();
    var on = await orvLoadRules();
    if(!ORV_RULES.some(function(x){ return on[x.k]; })) return 0;
    var projects = [];
    try{ projects = ((typeof cacheProjects !== 'undefined' && cacheProjects) || []).filter(function(p){ return p && p.id && orvStage(p) !== 'Lost'; }); }catch(e){}
    if(!projects.length) return 0;
    var docs = []; try{ docs = (typeof cacheRows !== 'undefined' && cacheRows) || []; }catch(e){}
    var ests = [], claims = [], ipay = [], punch = [], have = [];
    try{ var a = await c.from('estimates').select('project_id,total,created_at').order('created_at', { ascending:true }); ests = (a && a.data) || []; }catch(e){}
    try{ var b = await c.from('insurance_claims').select('id,project_id,approved_rcv,deductible,deductible_waived'); claims = (b && b.data) || []; }catch(e){}
    try{ var d = await c.from('insurance_payments').select('claim_id,kind,amount'); ipay = (d && d.data) || []; }catch(e){}
    try{ var f = await c.from('punch_items').select('project_id,title,detail,comments'); punch = (f && f.data) || []; }catch(e){}
    try{ var g = await c.from('owner_reviews').select('project_id,rule').not('rule', 'is', null); have = ((g && g.data) || []).filter(function(h){ return h && h.rule; }); }catch(e){ return 0; }
    var seen = {}; have.forEach(function(h){ seen[h.project_id + '|' + h.rule] = 1; });
    var firstEst = {}; ests.forEach(function(e){ if(e.project_id && Number(e.total) > 0 && !firstEst[e.project_id]) firstEst[e.project_id] = Number(e.total); });
    var claimOf = {}; claims.forEach(function(cl){ if(cl.project_id && !claimOf[cl.project_id]) claimOf[cl.project_id] = cl; });
    var dedPaid = {}; ipay.forEach(function(p){ if(String(p.kind || '').toLowerCase() === 'deductible') dedPaid[p.claim_id] = (dedPaid[p.claim_id] || 0) + (Number(p.amount) || 0); });
    var EXTRA = /\b(extra|added|build[- ]?out|extend(ed|ing)?|additional)\b/i;
    var extraOn = {}; punch.forEach(function(p){
      var txt = [p.title, p.detail, typeof p.comments === 'string' ? p.comments : JSON.stringify(p.comments || '')].join(' ');
      if(p.project_id && EXTRA.test(txt)) extraOn[p.project_id] = 1;
    });
    var FIN = { Completed:1, Invoiced:1, Closed:1 }, DAY = 86400000, now = Date.now();
    var adds = [];
    projects.forEach(function(pr){
      var fin = null; try{ fin = typeof jobFinance === 'function' ? jobFinance(pr) : null; }catch(e){}
      if(!fin) return;
      var stg = orvStage(pr), val = Number(fin.value) || 0, paid = orvMoneyIn(pr, fin), ck = orvCk(pr), cl = claimOf[pr.id] || null;
      var ins = false; try{ ins = (typeof projClaimType === 'function' && projClaimType(pr) === 'insurance') || !!cl; }catch(e){ ins = !!cl; }
      var mine = docs.filter(function(r){ return r.project_id === pr.id; });
      var signedC = mine.filter(function(r){ return /^contract/i.test((r.title || '').trim()) && r.signed_at && Number(r.total) > 0; })
                        .reduce(function(a, r){ return a + Number(r.total); }, 0);
      var hasCO = mine.some(function(r){ return /^change order/i.test((r.title || '').trim()) && r.signed_at; });
      var since = Date.parse(ck.stage_since || pr.updated_at || pr.created_at || '') || now;
      var orvHit = function(k, why){ if(on[k] && !seen[pr.id + '|' + k]) adds.push({ project_id:pr.id, client_name:pr.name || null, rep_email:pr.sales_rep || pr.created_by || null,
        source:'auto', rule:k, reason:why.slice(0, 80), status:'open', notes:[], created_by:orvMe() }); };
      var fe = firstEst[pr.id] || 0;
      if(fe > 0 && val > 0 && fe - val >= 1000) orvHit('price_drop', 'Price ' + orvUsd(val - fe) + ' from first estimate');
      var rcv = cl ? Number(cl.approved_rcv) || 0 : 0;
      if(ins && rcv > 0 && signedC > 0 && rcv - signedC > 250) orvHit('below_ins', 'Signed ' + orvUsd(rcv - signedC) + ' under insurance');
      var ded = cl ? Number(cl.deductible) || 0 : 0;
      if(ins && FIN[stg] && ded > 0){
        if(cl.deductible_waived) orvHit('ded_uncollected', 'Deductible marked waived');
        else if(Number(fin.balance) > 0 && (dedPaid[cl.id] || 0) < ded) orvHit('ded_uncollected', 'Deductible not collected · ' + orvUsd(ded));
      }
      if(extraOn[pr.id] && !hasCO) orvHit('extra_no_co', 'Extra work, no change order');
      if(FIN[stg] && paid <= 0 && now - since >= 14 * DAY) orvHit('done_unpaid', 'Done ' + Math.floor((now - since) / DAY) + ' days, nothing paid');
      if((stg === 'Invoiced' || stg === 'Closed') && val <= 0) orvHit('invoiced_no_price', 'Invoiced with no price');
    });
    var made = 0;
    for(var i = 0; i < adds.length; i++){
      try{ var res = await c.from('owner_reviews').insert(adds[i]).select(); if(res && !res.error) made++; }catch(e){}   /* a unique-index refusal is the rule working */
    }
    return made;
  }
  /* once, quietly, after an admin is signed in and the jobs have loaded — a timer, not an observer */
  (function(){
    var tries = 0;
    function orvTick(){
      var ready = false; try{ ready = orvIsAdm() && typeof cacheProjects !== 'undefined' && cacheProjects && cacheProjects.length > 0; }catch(e){}
      if(ready){ orvRunRules().catch(function(){}); return; }
      if(++tries < 20) setTimeout(orvTick, 15000);
    }
    setTimeout(orvTick, 20000);
  })();

  var view = orvQ('cr-orv-view');
  if(view) view.addEventListener('click', async function(e){"""
one("""
  var view = orvQ('cr-orv-view');
  if(view) view.addEventListener('click', async function(e){""", ENGINE)

# the list needs the switches' state; load it with the rows
one("""      var res = await c.from('owner_reviews').select('*').order('created_at', { ascending:false });
      rows = (res && res.data) || [];
    }catch(e){ rows = []; }""", """      var res = await c.from('owner_reviews').select('*').order('created_at', { ascending:false });
      rows = (res && res.data) || [];
    }catch(e){ rows = []; }
    if(!ruleOn){ try{ await orvLoadRules(); }catch(_){} }   /* 1325 */""")

# export the runner for the gate and for a manual nudge
one("""  window.CardinalOwnerReview = Object.assign(window.CardinalOwnerReview || {}, { open:orvOpen, close:orvClose, flag:orvFlag, reload:function(){ return orvLoad().then(orvRender); } });""",
"""  window.CardinalOwnerReview = Object.assign(window.CardinalOwnerReview || {}, { open:orvOpen, close:orvClose, flag:orvFlag, reload:function(){ return orvLoad().then(orvRender); },
    runRules:function(){ ruleRanAt = 0; return orvRunRules(); } });""")

# stamp + changelog (deliberately generic: the What's New list is read by the whole team)
one(""">v2026-10-12 build 1324<button""", """>v2026-10-12 build 1325<button""")
CL = "{ b: 1324, d:'2026-10-12',"
assert s.count(CL) == 1
s = s.replace(CL, "{ b: 1325, d:'2026-10-12', t:'Behind the scenes', s:'Admin housekeeping. Nothing changes on your screens.' },\n  " + CL, 1)
pl.write_atomic(FILE, s)
print('1325 applied')
