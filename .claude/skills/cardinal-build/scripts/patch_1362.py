"""Build 1362 — Sales Numbers in the Owner Console (Theo picked 3).
Theo: "can we make sure the numbers data syncs up to what we have in the cardinal app". Measured: the app had
NO per-rep sales screen — the YTD figures quoted to him came from ad-hoc queries, so nothing in the app could
agree or disagree with them. Now there is one, and it reads the app's OWN numbers:
- Sold $ is jobFinance(p).value — the one job-value rule (contract / accepted estimate / manual + signed change
  orders + invoice extras) that Balance Due, A/R, pay.js and share.js already share. A job counts as sold when it
  is at Approved or past it AND crBillable() says it can be invoiced; its sold date is the first signed contract or
  the first sold-stage stamp.
- Collected is the collections table by collected date (the same rows jobFinance trusts), plus dated legacy
  payments on a job that has no collections — exactly jobFinance's precedence. Undated legacy money is counted
  and named in a footnote, never silently dropped.
- Leads are clients created in the period; migrated clients (AccuLynx import) get their own column, so a
  migration never reads as new leads.
- A job moved to Unassigned still counts for the rep who had it (lead.unassigned_from), so a departed rep's
  history is kept. A name typed where an email belongs is matched to the roster.
- This month / This year / All time. The hub card shows sold this year."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
import patch_lib as pl
path = sys.argv[1] if len(sys.argv) > 1 else 'index.html'
s = open(path, encoding='utf-8').read()
def one(old, new):
    global s
    n = s.count(old); assert n == 1, (n, old[:90]); s = s.replace(old, new)

# 1. styles (the console is a single-theme paper surface; inks measured on #fffdf9)
one("""#cr-owner .ow-net b.red{color:#c8202e;}""",
"""#cr-owner .ow-net b.red{color:#c8202e;}
/* 1362: Sales Numbers */
#cr-owner .ow-sn-per{display:flex;gap:8px;margin:0 0 14px;flex-wrap:wrap;}
#cr-owner .ow-sn-per button{min-height:44px;padding:0 16px;border:1px solid #ddd2c4;border-radius:22px;background:#fffdf9;
  font:600 13px/1 "Segoe UI",Arial,sans-serif;color:#231d18;cursor:pointer;}
#cr-owner .ow-sn-per button.on{background:#c8202e;border-color:#c8202e;color:#fff;}
#cr-owner .ow-sn-wrap{overflow-x:auto;-webkit-overflow-scrolling:touch;}
#cr-owner .ow-sn{width:100%;border-collapse:collapse;font:400 13px/1.3 "Segoe UI",Arial,sans-serif;color:#231d18;}
#cr-owner .ow-sn th{font:700 11px/1.2 "Segoe UI",Arial,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:#6b5f54;
  text-align:right;padding:0 0 8px 10px;border-bottom:2px solid #c8202e;white-space:nowrap;}
#cr-owner .ow-sn th:first-child,#cr-owner .ow-sn td:first-child{text-align:left;padding-left:0;}
#cr-owner .ow-sn td{text-align:right;padding:11px 0 11px 10px;border-bottom:1px solid #e5ded3;white-space:nowrap;
  font-family:ui-monospace,Menlo,monospace;}
#cr-owner .ow-sn td:first-child{font:700 15px/1.2 "Segoe UI",Arial,sans-serif;}
#cr-owner .ow-sn tr.un td:first-child{color:#6b5f54;font-style:italic;font-weight:600;}
#cr-owner .ow-sn tr.tot td{font-weight:700;border-bottom:0;border-top:2px solid #231d18;}""")

# 2. the builder + the area row
one("""  /* 1129: ONE table that knows the console's areas.""",
"""  /* 1362: Sales Numbers — one row per rep, from the app's OWN money rule, so the console and every
     other screen can never disagree. See the build log. */
  var snPeriod = 'year';
  var SN_SOLD = { Approved:1, Scheduled:1, Completed:1, Invoiced:1, Closed:1 };
  function snStart(per){
    var d = new Date();
    if(per === 'all') return null;
    return per === 'month' ? new Date(d.getFullYear(), d.getMonth(), 1) : new Date(d.getFullYear(), 0, 1);
  }
  function snTime(v){ if(!v) return NaN; return new Date(String(v).replace(' ', 'T')).getTime(); }
  function snIn(v, from){ var t = snTime(v); return !isNaN(t) && (!from || t >= from.getTime()); }
  function snCk(p){ try{ return (typeof parseCkAll === 'function' ? parseCkAll(p) : null) || {}; }catch(_){ return {}; } }
  function snRoster(){ return (typeof TEAM_ROSTER !== 'undefined' && TEAM_ROSTER) || []; }
  function snRep(p, ck){
    var r = String(p.sales_rep || '').trim();
    if(!r){ var uf = ck.lead && ck.lead.unassigned_from; r = (uf && uf.rep) ? String(uf.rep) : ''; }   /* history kept */
    if(r && r.indexOf('@') === -1){   /* a name typed where an email belongs */
      var low = r.toLowerCase(), hit = snRoster().filter(function(m){ return String(m.name).toLowerCase() === low; })[0];
      if(hit) r = hit.email;
    }
    return r.toLowerCase();
  }
  function snName(k){
    if(!k) return 'Unassigned';
    var m = snRoster().filter(function(x){ return String(x.email).toLowerCase() === k; })[0];
    return m ? String(m.name).split(' ')[0] : k.split('@')[0];
  }
  function snSoldAt(p, ck){
    var best = NaN;
    function snTake(v){ var t = snTime(v); if(!isNaN(t) && (isNaN(best) || t < best)) best = t; }
    ['t_Approved','t_Scheduled','t_Completed','t_Invoiced','t_Closed'].forEach(function(k){ snTake(ck[k]); });
    ((typeof cacheRows !== 'undefined' && cacheRows) || []).forEach(function(r){
      if(r.project_id === p.id && /^contract/i.test(String(r.title || '').trim()) && r.signed_at) snTake(r.signed_at);
    });
    return isNaN(best) ? (ck.stage_since || p.created_at || null) : new Date(best).toISOString();
  }
  function snRows(per){
    var from = snStart(per), by = {}, repOf = {}, undated = 0;
    function snRow(k){ return by[k] || (by[k] = { k:k, leads:0, mig:0, sold:0, soldAmt:0, coll:0 }); }
    var projs = (typeof cacheProjects !== 'undefined' && cacheProjects) || [];
    var cp = (typeof collPaid !== 'undefined' && collPaid) || {};
    projs.forEach(function(p){
      if(!p) return;
      var ck = snCk(p), k = snRep(p, ck);
      repOf[p.id] = k;
      var mig = !!(ck.acculynx_import || (ck.lead && ck.lead.source === 'AccuLynx import'));
      if(snIn(p.created_at, from)){ if(mig) snRow(k).mig++; else snRow(k).leads++; }
      if(SN_SOLD[p.stage] && typeof jobFinance === 'function'){
        var f = null;
        try{ f = jobFinance(p); }catch(_){}
        if(f && typeof crBillable === 'function' && crBillable(f) && snIn(snSoldAt(p, ck), from)){
          snRow(k).sold++; snRow(k).soldAmt += Number(f.value) || 0;
        }
      }
      /* jobFinance's precedence: a job with ANY collections is paid from collections alone */
      if(cp[p.id] === undefined){
        (Array.isArray(ck.payments) ? ck.payments : []).forEach(function(x){
          if(!x || x.dir !== 'in' || !(Number(x.amt) > 0)) return;
          var d = x.date || x.at;
          if(!d) undated++; else if(snIn(d, from)) snRow(k).coll += Number(x.amt);
        });
        var ws = ck.ws || {};
        Object.keys(ws).forEach(function(id){ if(ws[id] && Number(ws[id].paid) > 0) undated++; });
      }
    });
    ((typeof cacheCollections !== 'undefined' && cacheCollections) || []).forEach(function(c){
      if(!c || !c.project_id || !snIn(c.collected_at || c.created_at, from)) return;
      snRow(repOf[c.project_id] !== undefined ? repOf[c.project_id] : '').coll += Number(c.amount) || 0;
    });
    var list = Object.keys(by).map(function(k){ return by[k]; })
      .filter(function(r){ return r.leads || r.mig || r.sold || r.coll; });
    list.sort(function(a, b){
      if(!a.k !== !b.k) return a.k ? -1 : 1;   /* Unassigned last */
      return (b.soldAmt - a.soldAmt) || (b.coll - a.coll) || (b.leads - a.leads) || snName(a.k).localeCompare(snName(b.k));
    });
    return { list:list, undated:Math.max(0, undated) };
  }
  function salesHTML(){
    var d = snRows(snPeriod), tot = { leads:0, mig:0, sold:0, soldAmt:0, coll:0 };
    var PER = [['month','This month'], ['year','This year'], ['all','All time']];
    var h = '<div class="ow-sec"><div class="ow-sl">Sales Numbers <span class="ow-ct">by rep</span></div>';
    h += '<div class="ow-sn-per">' + PER.map(function(p){
      return '<button type="button" data-act="sn-period" data-per="' + p[0] + '" class="' + (snPeriod === p[0] ? 'on' : '') + '">' + p[1] + '</button>';
    }).join('') + '</div>';
    if(!d.list.length){
      h += '<div class="ow-empty">Nothing in this period yet.</div>';
    }else{
      h += '<div class="ow-sn-wrap"><table class="ow-sn"><thead><tr><th>Rep</th><th>Leads</th><th>Migrated</th><th>Sold</th><th>Sold $</th><th>Collected</th></tr></thead><tbody>';
      d.list.forEach(function(r){
        ['leads','mig','sold','soldAmt','coll'].forEach(function(f){ tot[f] += r[f]; });
        h += '<tr' + (r.k ? '' : ' class="un"') + '><td>' + esc(snName(r.k)) + '</td><td>' + r.leads + '</td><td>' + r.mig + '</td><td>' + r.sold +
             '</td><td>' + fmtMoney(r.soldAmt) + '</td><td>' + fmtMoney(r.coll) + '</td></tr>';
      });
      h += '<tr class="tot"><td>Total</td><td>' + tot.leads + '</td><td>' + tot.mig + '</td><td>' + tot.sold +
           '</td><td>' + fmtMoney(tot.soldAmt) + '</td><td>' + fmtMoney(tot.coll) + '</td></tr></tbody></table></div>';
    }
    h += '<div class="ow-note">Sold $ is the same job value the client page and Balance Due use. A job counts as sold once it is Approved or past it and can be invoiced. Collected is money in by the date it came in. Leads are new clients; migrated ones from the old system have their own column. A job moved to Unassigned still counts for the rep who had it.' +
         (d.undated ? ' ' + d.undated + ' older payment' + (d.undated === 1 ? ' has' : 's have') + ' no date, so ' + (d.undated === 1 ? 'it is' : 'they are') + ' not in Collected.' : '') + '</div>';
    h += '</div>';
    return h;
  }

  /* 1129: ONE table that knows the console's areas.""")

one("""    { k:'ledger', t:'The Ledger', d:'Loans, draws and money you lent',""",
"""    /* 1362 */
    { k:'sales', t:'Sales Numbers', d:'Leads, sold and collected, by rep',
      fn:function(){ return salesHTML(); },
      stat:function(){
        var d = snRows('year'), n = d.list.reduce(function(s, r){ return s + r.soldAmt; }, 0);
        return { n:fmtMoney(n), w:'sold this year' }; } },
    { k:'ledger', t:'The Ledger', d:'Loans, draws and money you lent',""")

# 3. the period chips
one("""      if(act === 'strat-edit'){ stratEdit = t.getAttribute('data-slug'); render(); }""",
"""      if(act === 'sn-period'){ snPeriod = t.getAttribute('data-per') || 'year'; render(); return; }   /* 1362 */
      if(act === 'strat-edit'){ stratEdit = t.getAttribute('data-slug'); render(); }""")

one(">v2026-10-16 build 1361<button", ">v2026-10-17 build 1362<button")
one("""  { b: 1361, d:'2026-10-16',""",
"""  { b: 1362, d:'2026-10-17', t:'Sales Numbers in the Owner Console', s:'The Owner Console has a new Sales Numbers card: leads, jobs sold, sold dollars and money collected for each rep, for this month, this year or all time. It uses the same job value the client page and Balance Due use, so the numbers match the rest of the app. Clients moved over from the old system have their own Migrated column and do not count as new leads. A job moved to Unassigned still counts for the rep who had it.' },
  { b: 1361, d:'2026-10-16',""")
pl.write_atomic(path, s)
print('ok 1362')
