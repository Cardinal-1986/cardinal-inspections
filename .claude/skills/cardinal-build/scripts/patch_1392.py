"""Build 1392 — the audit's technical findings that needed no decision (23 Oct 2026).
1. Payments card: Gross profit, Margin and the cost bar showed to Production (isOffice() is
   commFullAccess(), which includes PRODUCTION_EMAILS) — and the figure was too high for them, because
   crew_payments is admin-only RLS, so labor dropped out of costs. They are now admin-only (jpAdmin()).
   With no costs entered the card no longer claims "Margin 100.0%": profit and margin read "—".
2. Pre-Install Guide email prompt said "Email saved" but called patchProject(), which does not exist;
   the address now writes to projects.email (pdb.update) and says so only when it did.
3. Phone drawer header always read "Cardinal": it called meName(), local to cr-pp-script. It uses
   displayNameFor(currentUser), as meName itself does.
4. Error reports lost their line numbers: stripQuery() removed everything from '?' to the next space,
   so on a URL with a query string it ate ':line:col)' too. The query still goes; the location stays.
5. Home's Accounts Receivable card counts the board you are on; with nothing owed there it said
   "every invoice is collected" while Invoices & AR showed money owed elsewhere. It names the other boards.
6. Activity feed called every document "new inspection" — invoices, contracts, work orders and filed
   files are named for what they are.
7. A signed document no longer offers "Mark sent"."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
import patch_lib as pl
path = sys.argv[1] if len(sys.argv) > 1 else 'index.html'
s = open(path, encoding='utf-8').read()
def one(old, new):
    global s
    n = s.count(old); assert n == 1, (n, old[:90]); s = s.replace(old, new)

# 1 — Payments card money is the admin's
one("""    var office = isOffice();
    var h = '<div class="crji-row"><span class="crji-ttl">Payments</span></div>';""",
"""    var office = isOffice();
    /* 1392: profit is the admin's. isOffice() includes Production, who must see no money here — and
       crew_payments is admin-only RLS, so their "profit" also left labor out and read too high. */
    var money = jpAdmin();
    var h = '<div class="crji-row"><span class="crji-ttl">Payments</span></div>';""")
one("""    if(office){
      var gp = total - costT;
      h += '<span>Costs</span><b>' + M(costT) + '</b>' +
        '<span class="crjp-bal">Gross profit</span><b class="crjp-gp' + (gp < 0 ? ' neg' : '') + '">' + M(gp) + '</b>' +
        '<span>Margin</span><b class="crjp-gp' + (gp < 0 ? ' neg' : '') + '">' + (total > 0 ? (Math.round(gp / total * 1000) / 10).toFixed(1) + '%' : '—') + '</b>';
    }""",
"""    if(money){
      var gp = total - costT;
      /* 1392: with no costs entered, "Margin 100.0%" is a claim nobody made */
      var noCost = !(costT > 0);
      h += '<span>Costs</span><b>' + (noCost ? 'None entered' : M(costT)) + '</b>' +
        '<span class="crjp-bal">Gross profit</span><b class="crjp-gp' + (gp < 0 ? ' neg' : '') + '">' + (noCost ? '—' : M(gp)) + '</b>' +
        '<span>Margin</span><b class="crjp-gp' + (gp < 0 ? ' neg' : '') + '">' + (total > 0 && !noCost ? (Math.round(gp / total * 1000) / 10).toFixed(1) + '%' : '—') + '</b>';
    }""")
one("""    if(office && (costT > 0 || total > 0)){
      var byM = 0, byL = 0, byO = 0;""",
"""    if(money && costT > 0){
      var byM = 0, byL = 0, byO = 0;""")

# 2 — guide email really saves
one("""      var saved = Promise.resolve();
      try{ if(typeof patchProject === 'function') saved = patchProject(pr.id, { email:to }); }catch(_){}
      Promise.resolve(saved).then(function(){
        pr.email = to;
        return sendFor(pr, fields, { force:true, slug:slug });
      }).then(function(r){
        if(r && r.ok) okToast('Email saved — ' + G(slug).label + ' sent to ' + (pr.name || 'the client'));
      }).catch(function(e){ tell('Saved the email, but the guide could not be sent: ' + ((e && e.message) || e)); });""",
"""      /* 1392: was patchProject(), which exists nowhere — the toast said "Email saved" and nothing was. */
      var stored = false;
      var saved = (window.pdb && typeof window.pdb.update === 'function')
        ? Promise.resolve(window.pdb.update(pr.id, { email:to })).then(function(){ stored = true; }, function(){ stored = false; })
        : Promise.resolve();
      Promise.resolve(saved).then(function(){
        pr.email = to;
        return sendFor(pr, fields, { force:true, slug:slug });
      }).then(function(r){
        if(r && r.ok) okToast((stored ? 'Email saved — ' : 'Sent (the address was not saved to the client) — ') + G(slug).label + ' sent to ' + (pr.name || 'the client'));
      }).catch(function(e){ tell((stored ? 'Saved the email, but the guide could not be sent: ' : 'The guide could not be sent: ') + ((e && e.message) || e)); });""")

# 3 — drawer name
one("""      var nm = ''; try{ if(typeof meName === 'function') nm = meName(); }catch(_){}""",
"""      /* 1392: meName() is local to cr-pp-script, so this always fell to 'Cardinal' */
      var nm = ''; try{ if(typeof window.displayNameFor === 'function' && window.currentUser) nm = window.displayNameFor(window.currentUser); }catch(_){}""")

# 4 — error reports keep their line numbers
one("""function stripQuery(s){
  return String(s || '').replace(/(\\?[^\\s'"]*)/g, '')
                        .replace(/(#[^\\s'"]*)/g, '');
}""",
"""function stripQuery(s){
  /* 1392: keep a trailing :line:col (and its ')') — the query or hash went, and so did the location */
  var keep = function(q){ var m = q.match(/(:\\d+:\\d+\\)?|:\\d+\\)?|\\))$/); return m ? m[1] : ''; };
  return String(s || '').replace(/(\\?[^\\s'"]*)/g, keep)
                        .replace(/(#[^\\s'"]*)/g, keep);
}""")

# 5 — AR card names the other boards
one("""  _arAll.forEach(function(x){
    if(!_onBoard[x.pr.id]) return;
    var v = Number(x.fin.balance) || 0;""",
"""  var _arElse = 0;   /* 1392: owed on the other boards, so "every invoice is collected" stays true */
  _arAll.forEach(function(x){
    if(!_onBoard[x.pr.id]){ var ve = Number(x.fin.balance) || 0; if(ve > 0) _arElse += ve; return; }
    var v = Number(x.fin.balance) || 0;""")
one("""          : 'nothing outstanding \\u2014 every invoice is collected') + '</span></div>' +""",
"""          : (_arElse > 0 ? 'nothing outstanding on this board \\u2014 ' + fmtMoney(_arElse) + ' on the others, in Invoices & Payments'
                         : 'nothing outstanding \\u2014 every invoice is collected')) + '</span></div>' +""")

# 6 — activity feed names the document
one("""    ev.push({ t:r.created_at, ini:a.ini, email:a.email, label:(isEst ? 'New Estimate:' : 'New Inspection:'), who:a.nm,""",
"""    /* 1392: invoices, contracts and files were all "new inspection" */
    var _tt = String(r.title || '').trim();
    var _lbl = isEst ? 'New Estimate:' : isContractTitle(_tt) ? 'New Contract:' : /^invoice\\b/i.test(_tt) ? 'New Invoice:'
             : isWorkOrderTitle(_tt) ? 'New Work Order:' : /^file:/i.test(_tt) ? 'File added:' : 'New Inspection:';
    ev.push({ t:r.created_at, ini:a.ini, email:a.email, label:_lbl, who:a.nm,""")

# 7 — signed: no Mark sent
one("""  toggleBtn.textContent = status === 'sent' ? 'Mark unsent' : 'Mark sent';
}""",
"""  toggleBtn.textContent = status === 'sent' ? 'Mark unsent' : 'Mark sent';
  toggleBtn.style.display = signedAt ? 'none' : '';   /* 1392: a signed document is past sent */
}""")

one(">v2026-10-23 build 1391<", ">v2026-10-23 build 1392<")
one("""  { b: 1391, d:'2026-10-23',""",
"""  { b: 1392, d:'2026-10-23', t:'Fixes from the audit', s:'Gross profit and margin on a job\\u2019s Payments card are for the office only now \\u2014 production no longer sees them (and the figure they saw left out labor). With no costs entered, the card says so instead of showing a 100% margin. The Pre-Install Guide\\u2019s email prompt really saves the address now. The phone menu shows your name instead of \\u201cCardinal\\u201d. The home Accounts Receivable card says when money is owed on the other boards instead of \\u201cevery invoice is collected\\u201d. The activity feed names invoices, contracts and files for what they are. A signed document no longer offers Mark sent.' },
  { b: 1391, d:'2026-10-23',""")
pl.write_atomic(path, s)
print('ok 1392')
