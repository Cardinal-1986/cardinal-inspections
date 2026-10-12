"""Build 1322 — Owner Review (Theo's pick 1A, "1 silent").

An admin-only page that lists jobs the owner wants to look at, with each job's money trail
and owner-only notes. SILENT: the rows live in public.owner_reviews (owner_review.sql),
which is is_cardinal_admin() for read AND write — a rep's session cannot read a single row,
so nothing about a review can reach his screen. The job itself is not touched; he keeps
working it as before. The drawer row and the client page's "Owner review" tile are drawn for
admins only. No notification, thread post, note or job field is written. No body observer,
no scroll lock (both rosters stay where they are).

Also: a job that is not in the app yet (still in AccuLynx) can be added by name, with a
rep, a reason and notes.

The What's New entry is deliberately generic: the changelog is shown to the whole team.
Usage: python3 patch_1322.py [index.html]
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import patch_lib as pl
PATH = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../../../index.html')
src = pl.load(PATH)
def one(old, new):
    global src
    assert src.count(old) == 1, (old[:100], src.count(old))
    src = src.replace(old, new)

BLOCK = r"""<style id="cr-orv-styles">
/* 1322: Owner Review — admin-only, silent. Own tokens, each with a literal fallback at the
   point of use; dark here, light twin below. Header is the shared .cr-mhd. */
#cr-orv-view{
  --orv-bg:#0c0d0f; --orv-panel:#141619; --orv-ink:#f2f4f7; --orv-dim:#a8b0ba; --orv-line:#262a30;
  --orv-well:#1b1f24; --orv-red:#C8202E; --orv-due:#f08a90; --orv-pos:#34d399; --orv-warn:#e0a94f;
  position:fixed; inset:0; z-index:9500; display:none; overflow:auto;
  background:var(--orv-bg,#0c0d0f); color:var(--orv-ink,#f2f4f7);
  font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;
}
:root[data-theme="rb-light"] #cr-orv-view{
  --orv-bg:#F4F4F5; --orv-panel:#FFFFFF; --orv-ink:#0F172A; --orv-dim:#475569; --orv-line:#E2E8F0;
  --orv-well:#F8FAFC; --orv-due:#B91C1C; --orv-pos:#047857; --orv-warn:#8a6420;
}
#cr-orv-view .orv-shell{max-width:860px; margin:0 auto; padding:14px 16px 96px;}
#cr-orv-view .orv-sub{font-size:13px; color:var(--orv-dim,#a8b0ba); margin:2px 0 14px;}
#cr-orv-view .orv-card{display:block; width:100%; text-align:left; font:inherit; color:inherit;
  background:var(--orv-panel,#141619); border:1px solid var(--orv-line,#262a30); border-radius:14px;
  padding:13px 14px; margin-bottom:10px;}
#cr-orv-view button.orv-card{cursor:pointer; min-height:44px;}
#cr-orv-view .orv-nm{font-size:15px; font-weight:700;}
#cr-orv-view .orv-mu{font-size:13px; color:var(--orv-dim,#a8b0ba); margin-top:2px;}
#cr-orv-view .orv-pill{display:inline-block; font-size:11px; font-weight:700; padding:2px 8px; border-radius:99px;
  border:1px solid var(--orv-line,#262a30); color:var(--orv-dim,#a8b0ba); margin-left:6px; vertical-align:2px;}
#cr-orv-view .orv-pill.red{color:var(--orv-due,#f08a90); border-color:var(--orv-due,#f08a90);}
#cr-orv-view .orv-pill.warn{color:var(--orv-warn,#e0a94f); border-color:var(--orv-warn,#e0a94f);}
#cr-orv-view .orv-h{font-size:13px; font-weight:700; letter-spacing:.06em; text-transform:uppercase;
  color:var(--orv-dim,#a8b0ba); margin:18px 0 8px;}
#cr-orv-view .orv-tbl{width:100%; border-collapse:collapse; font-size:13px;}
#cr-orv-view .orv-tbl td{padding:7px 0; border-bottom:1px solid var(--orv-line,#262a30); vertical-align:top;}
#cr-orv-view .orv-tbl td.r{text-align:right; font-variant-numeric:tabular-nums; white-space:nowrap; padding-left:10px;}
#cr-orv-view .orv-tbl tr.red td.r{color:var(--orv-due,#f08a90); font-weight:700;}
#cr-orv-view .orv-tbl tr.pos td.r{color:var(--orv-pos,#34d399); font-weight:700;}
#cr-orv-view .orv-note{border-left:3px solid var(--orv-red,#C8202E); background:var(--orv-well,#1b1f24);
  padding:9px 11px; border-radius:8px; margin-bottom:8px; font-size:14px; white-space:pre-wrap;}
#cr-orv-view .orv-note small{display:block; font-size:12px; color:var(--orv-dim,#a8b0ba); margin-bottom:3px;}
#cr-orv-view textarea, #cr-orv-view input, #cr-orv-view select{width:100%; box-sizing:border-box; font:inherit; font-size:15px;
  color:var(--orv-ink,#f2f4f7); background:var(--orv-well,#1b1f24); border:1px solid var(--orv-line,#262a30);
  border-radius:10px; padding:10px 12px; min-height:44px; margin-bottom:8px;}
#cr-orv-view .orv-btn{display:inline-flex; align-items:center; justify-content:center; min-height:44px; padding:8px 14px;
  border-radius:10px; border:1px solid var(--orv-line,#262a30); background:transparent; color:var(--orv-ink,#f2f4f7);
  font:inherit; font-size:14px; font-weight:700; cursor:pointer; margin:0 8px 8px 0;}
#cr-orv-view .orv-btn.primary{background:var(--orv-red,#C8202E); border-color:var(--orv-red,#C8202E); color:#fff;}
#cr-orv-view .orv-empty{color:var(--orv-dim,#a8b0ba); font-size:14px; padding:18px 4px;}
#cr-orv-view details summary{cursor:pointer; min-height:44px; display:flex; align-items:center; font-size:14px; color:var(--orv-dim,#a8b0ba);}
</style>
<div id="cr-orv-view" style="display:none;" aria-hidden="true">
  <div class="orv-shell">
    <div class="cr-mhd">
      <button id="orvClose" class="cr-mhd-back" type="button" aria-label="Back"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg></button>
      <h1 class="cr-mhd-t">Owner <span>Review</span></h1>
    </div>
    <div class="cr-mhd-eb">Only Theo and Joan see this page</div>
    <div id="orvBody"></div>
  </div>
</div>
<script id="cr-orv-script">
/* 1322: Owner Review. Silent by construction — see owner_review.sql. Everything here runs
   only for an admin (window.is_admin), and the table refuses everyone else anyway. */
(function(){
  'use strict';
  var rows = [], cur = null, adding = false, trailCache = {};
  function orvQ(id){ return document.getElementById(id); }
  function orvIsAdm(){ try{ return !!(window.is_admin && window.is_admin()); }catch(e){ return false; } }
  function orvCx(){ return window.sb || window.supa || null; }
  function orvMe(){ try{ return (window.my_email && window.my_email()) || ''; }catch(e){ return ''; } }
  function orvEsc(s){ return String(s == null ? '' : s).replace(/[<>&"']/g, function(c){ return { '<':'&lt;', '>':'&gt;', '&':'&amp;', '"':'&quot;', "'":'&#39;' }[c]; }); }
  function orvUsd(n){ var v = Number(n) || 0; return (v < 0 ? '−$' : '$') + Math.abs(v).toLocaleString('en-US', { minimumFractionDigits:2, maximumFractionDigits:2 }); }
  function orvDay(v){ var d = v ? new Date(v) : null; return (d && !isNaN(d.getTime())) ? d.toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' }) : ''; }
  function orvWho(e){ e = String(e || ''); return e ? e.split('@')[0].replace(/^./, function(c){ return c.toUpperCase(); }) : ''; }
  function orvProjOf(id){ try{ return (typeof cacheProjects !== 'undefined' && cacheProjects || []).find(function(p){ return p.id === id; }) || null; }catch(e){ return null; } }
  function orvCk(pr){ try{ return typeof pr.checklist === 'string' ? JSON.parse(pr.checklist || '{}') : (pr.checklist || {}); }catch(e){ return {}; } }
  function orvNameOf(r){ var pr = r.project_id ? orvProjOf(r.project_id) : null; return (pr && pr.name) || r.client_name || 'Job'; }
  function orvRepOf(r){ var pr = r.project_id ? orvProjOf(r.project_id) : null; return orvWho((pr && pr.sales_rep) || r.rep_email); }

  async function orvLoad(){
    var c = orvCx(); if(!c) return;
    try{
      var res = await c.from('owner_reviews').select('*').order('created_at', { ascending:false });
      rows = (res && res.data) || [];
    }catch(e){ rows = []; }
  }

  function orvListHtml(){
    var open = rows.filter(function(r){ return r.status === 'open'; });
    var done = rows.filter(function(r){ return r.status !== 'open'; });
    var card = function(r){
      var n = Array.isArray(r.notes) ? r.notes.length : 0;
      return '<button class="orv-card" type="button" data-orv-open="' + orvEsc(r.id) + '">'
        + '<div class="orv-nm">' + orvEsc(orvNameOf(r)) + (r.reason ? '<span class="orv-pill' + (r.source === 'auto' ? ' warn' : ' red') + '">' + orvEsc(r.reason) + '</span>' : '') + '</div>'
        + '<div class="orv-mu">' + orvEsc(orvRepOf(r) || 'No rep') + ' · flagged ' + orvEsc(orvDay(r.created_at)) + (n ? ' · ' + n + (n === 1 ? ' note' : ' notes') : '') + (r.project_id ? '' : ' · not in the app yet') + '</div></button>';
    };
    var h = '<p class="orv-sub">' + open.length + (open.length === 1 ? ' job' : ' jobs') + ' under review. Reps cannot see this page, its flags or its notes.</p>';
    h += open.length ? open.map(card).join('') : '<div class="orv-empty">Nothing under review.</div>';
    h += adding ? addFormHtml() : '<button class="orv-btn" type="button" data-orv-add="1">Add a job that is not in the app</button>';
    if(done.length) h += '<details><summary>Resolved (' + done.length + ')</summary>' + done.map(card).join('') + '</details>';
    return h;
  }
  function addFormHtml(){
    var team = Array.isArray(window.TEAM_ROSTER) ? window.TEAM_ROSTER : [];
    return '<div class="orv-card"><div class="orv-nm">Add a job</div><div class="orv-mu" style="margin-bottom:8px">For a client still in AccuLynx or on paper.</div>'
      + '<input id="orvAddName" placeholder="Client name" aria-label="Client name">'
      + '<select id="orvAddRep" aria-label="Rep"><option value="">Rep</option>' + team.map(function(m){ return m && m.email ? '<option value="' + orvEsc(m.email) + '">' + orvEsc(m.name || m.email) + '</option>' : ''; }).join('') + '</select>'
      + '<input id="orvAddWhy" placeholder="Why (e.g. payment not recorded)" aria-label="Reason">'
      + '<button class="orv-btn primary" type="button" data-orv-addsave="1">Add</button><button class="orv-btn" type="button" data-orv-addcancel="1">Cancel</button></div>';
  }

  async function trailFor(r){
    if(!r.project_id) return Array.isArray(r.trail) ? r.trail.map(function(t){ return { label:t.label, value:t.value, k:t.k }; }) : [];
    if(trailCache[r.project_id]) return trailCache[r.project_id];
    var out = [], c = orvCx(), pr = orvProjOf(r.project_id), pid = r.project_id;
    var fin = null; try{ fin = (pr && typeof jobFinance === 'function') ? jobFinance(pr) : null; }catch(e){}
    var ests = [], docs = [], vers = [], claims = [];
    try{ var a = await c.from('estimates').select('id,title,total,discount,created_at,created_by').eq('project_id', pid).order('created_at', { ascending:true }); ests = (a && a.data) || []; }catch(e){}
    try{ var b = await c.from('inspection_reports').select('id,title,total,signed_at,created_at,created_by').eq('project_id', pid); docs = ((b && b.data) || []).filter(function(d){ return /^(estimate|contract|agreement|invoice)/i.test(String(d.title || '').trim()); }); }catch(e){}
    if(docs.length){ try{ var v = await c.from('document_versions').select('document_id,version,total,created_by,created_at').in('document_id', docs.map(function(d){ return d.id; })).order('created_at', { ascending:true }); vers = (v && v.data) || []; }catch(e){} }
    try{ var cl = await c.from('insurance_claims').select('carrier,approved_rcv,deductible,deductible_waived').eq('project_id', pid); claims = (cl && cl.data) || []; }catch(e){}
    var first = ests.length ? ests[0] : null, signedTotal = fin ? Number(fin.value) || 0 : 0;
    if(first) out.push({ label:'First estimate · ' + orvDay(first.created_at) + ' · ' + orvWho(first.created_by), value:orvUsd(first.total) });
    ests.slice(1).forEach(function(e){ out.push({ label:'Estimate · ' + orvDay(e.created_at) + ' · ' + orvWho(e.created_by), value:orvUsd(e.total) }); });
    ests.forEach(function(e){ if(Number(e.discount) > 0) out.push({ label:'Discount on an estimate', value:orvUsd(e.discount), k:'red' }); });
    docs.forEach(function(d){
      var hist = vers.filter(function(x){ return x.document_id === d.id; }), last = null;
      hist.forEach(function(x){ if(last !== null && Number(x.total) !== Number(last)) out.push({ label:esc0(d.title) + ' changed · ' + orvDay(x.created_at) + ' · ' + orvWho(x.created_by), value:orvUsd(last) + ' → ' + orvUsd(x.total), k:Number(x.total) < Number(last) ? 'red' : '' }); last = x.total; });
      if(d.signed_at) out.push({ label:esc0(d.title) + ' · signed ' + orvDay(d.signed_at), value:orvUsd(d.total) });
    });
    claims.forEach(function(cm){
      if(cm.approved_rcv != null) out.push({ label:'Insurance approved' + (cm.carrier ? ' (' + cm.carrier + ')' : ''), value:orvUsd(cm.approved_rcv) });
      if(cm.deductible != null) out.push({ label:'Deductible' + (cm.deductible_waived ? ' · marked WAIVED' : ''), value:orvUsd(cm.deductible), k:cm.deductible_waived ? 'red' : '' });
    });
    if(pr){
      var k = orvCk(pr), bid = k.lead && k.lead.bid_amount;
      if(bid !== undefined && bid !== null && bid !== '') out.push({ label:'Estimate amount on the job', value:orvUsd(bid), k:Number(bid) > 0 ? '' : 'red' });
      if(Number(k.manual_value) > 0) out.push({ label:'Manual extras', value:orvUsd(k.manual_value) });
      out.push({ label:'Stage', value:String(pr.stage || '') });
    }
    if(fin){
      out.push({ label:'Job value', value:orvUsd(fin.value), k:Number(fin.value) > 0 ? '' : 'red' });
      if(first && signedTotal > 0 && Number(first.total) - signedTotal >= 1000) out.push({ label:'Drop from first estimate to job value', value:orvUsd(signedTotal - Number(first.total)), k:'red' });
      out.push({ label:'Paid', value:orvUsd(fin.paid), k:Number(fin.paid) > 0 ? 'pos' : '' });
      out.push({ label:'Balance', value:orvUsd(fin.balance) });
    }
    trailCache[r.project_id] = out;
    return out;
  }
  function esc0(t){ return String(t || '').replace(/\s*[—-].*$/, '').trim() || 'Document'; }

  function orvDetailHtml(r, trail){
    var notes = Array.isArray(r.notes) ? r.notes : [];
    var h = '<button class="orv-btn" type="button" data-orv-list="1">← All reviews</button>';
    h += '<div class="orv-card"><div class="orv-nm">' + orvEsc(orvNameOf(r)) + (r.reason ? '<span class="orv-pill red">' + orvEsc(r.reason) + '</span>' : '') + '</div>'
      + '<div class="orv-mu">' + orvEsc(orvRepOf(r) || 'No rep') + ' · flagged ' + orvEsc(orvDay(r.created_at)) + ' by ' + orvEsc(orvWho(r.created_by)) + (r.status !== 'open' ? ' · ' + orvEsc(r.status) + ' ' + orvEsc(orvDay(r.resolved_at)) : '') + '</div></div>';
    h += '<div class="orv-h">Money trail</div>';
    h += trail.length ? '<div class="orv-card"><table class="orv-tbl">' + trail.map(function(t){ return '<tr' + (t.k ? ' class="' + orvEsc(t.k) + '"' : '') + '><td>' + orvEsc(t.label) + '</td><td class="r">' + orvEsc(t.value) + '</td></tr>'; }).join('') + '</table></div>'
      : '<div class="orv-empty">' + (r.project_id ? 'Nothing recorded on this job yet.' : 'Not in the app yet — add what you know as notes.') + '</div>';
    h += '<div class="orv-h">Owner notes</div>';
    h += notes.length ? notes.map(function(n){ return '<div class="orv-note"><small>' + orvEsc(orvDay(n.at)) + ' · ' + orvEsc(orvWho(n.by)) + '</small>' + orvEsc(n.text) + '</div>'; }).join('') : '<div class="orv-empty">No notes yet.</div>';
    h += '<textarea id="orvNote" rows="3" placeholder="Add a note — only Theo and Joan see it" aria-label="Owner note"></textarea>';
    h += '<button class="orv-btn primary" type="button" data-orv-note="1">Add note</button>';
    h += r.status === 'open' ? '<button class="orv-btn" type="button" data-orv-resolve="1">Mark resolved</button>' : '<button class="orv-btn" type="button" data-orv-reopen="1">Reopen</button>';
    if(r.project_id) h += '<button class="orv-btn" type="button" data-orv-job="' + orvEsc(r.project_id) + '">Open the job</button>';
    return h;
  }

  async function orvRender(){
    var body = orvQ('orvBody'); if(!body) return;
    var r = cur ? rows.find(function(x){ return x.id === cur; }) : null;
    if(!r){ cur = null; body.innerHTML = orvListHtml(); return; }
    body.innerHTML = orvDetailHtml(r, []);
    var t = await trailFor(r);
    if(cur === r.id) body.innerHTML = orvDetailHtml(r, t);
  }

  async function orvOpen(id){
    if(!orvIsAdm()) return;
    if(typeof hideAllViews === 'function') hideAllViews();
    var view = orvQ('cr-orv-view'); if(!view) return;
    view.style.display = 'block'; view.setAttribute('aria-hidden', 'false');
    cur = id || null; adding = false; trailCache = {};
    var body = orvQ('orvBody'); if(body) body.innerHTML = '<div class="orv-empty">Loading…</div>';
    await orvLoad(); await orvRender();
    try{ window.scrollTo(0, 0); }catch(e){}
    if(window.navSetView) window.navSetView('ownerreview', cur ? { id:cur } : null);
  }
  function orvClose(){
    var view = orvQ('cr-orv-view'); if(view){ view.style.display = 'none'; view.setAttribute('aria-hidden', 'true'); }
    if(typeof showHome === 'function') showHome();
  }
  async function patch(r, fields){
    var c = orvCx(); if(!c) return false;
    fields.updated_at = new Date().toISOString();
    var res = await c.from('owner_reviews').update(fields).eq('id', r.id).select();
    if(res && res.error){ if(typeof crTell === 'function') crTell('Could not save: ' + res.error.message); return false; }
    Object.assign(r, fields); return true;
  }
  /* from the client page (admin tile): open this job's review, or start one */
  async function orvFlag(pr){
    if(!orvIsAdm() || !pr) return;
    var c = orvCx(); if(!c) return;
    await orvLoad();
    var have = rows.find(function(x){ return x.project_id === pr.id && x.status === 'open' && x.source === 'manual'; });
    if(have){ orvOpen(have.id); return; }
    var why = window.prompt('Why are you putting this job under review? Only you and Joan will see this.', '');
    if(why === null) return;
    var res = await c.from('owner_reviews').insert({ project_id:pr.id, client_name:pr.name || null, rep_email:pr.sales_rep || null,
      source:'manual', reason:String(why).trim().slice(0, 80) || 'Owner review', status:'open', notes:[], created_by:orvMe() }).select();
    if(res && res.error){ if(typeof crTell === 'function') crTell('Could not flag: ' + res.error.message); return; }
    var row = res && res.data && res.data[0];
    orvOpen(row ? row.id : null);
  }

  var view = orvQ('cr-orv-view');
  if(view) view.addEventListener('click', async function(e){
    var el = e.target instanceof Element ? e.target : null; if(!el) return;
    var t, r = cur ? rows.find(function(x){ return x.id === cur; }) : null;
    if(el.closest('#orvClose')){ orvClose(); return; }
    if((t = el.closest('[data-orv-open]'))){ cur = t.getAttribute('data-orv-open'); await orvRender(); try{ window.scrollTo(0, 0); }catch(_){} return; }
    if(el.closest('[data-orv-list]')){ cur = null; await orvRender(); return; }
    if(el.closest('[data-orv-add]')){ adding = true; await orvRender(); return; }
    if(el.closest('[data-orv-addcancel]')){ adding = false; await orvRender(); return; }
    if(el.closest('[data-orv-addsave]')){
      var nm = orvQ('orvAddName'), rp = orvQ('orvAddRep'), wy = orvQ('orvAddWhy');
      var name = nm instanceof HTMLInputElement ? nm.value.trim() : '';
      if(!name){ if(typeof crTell === 'function') crTell('Add the client’s name.'); return; }
      var res = await orvCx().from('owner_reviews').insert({ client_name:name, rep_email:(rp instanceof HTMLSelectElement && rp.value) || null, source:'manual',
        reason:(wy instanceof HTMLInputElement && wy.value.trim().slice(0, 80)) || 'Owner review', status:'open', notes:[], created_by:orvMe() }).select();
      if(res && res.error){ if(typeof crTell === 'function') crTell('Could not add: ' + res.error.message); return; }
      adding = false; await orvLoad(); await orvRender(); return;
    }
    if(!r) return;
    if(el.closest('[data-orv-note]')){
      var ta = orvQ('orvNote'), text = ta instanceof HTMLTextAreaElement ? ta.value.trim() : '';
      if(!text) return;
      var notes = (Array.isArray(r.notes) ? r.notes : []).concat([{ at:new Date().toISOString(), by:orvMe(), text:text }]);
      if(await patch(r, { notes:notes })) await orvRender();
      return;
    }
    if(el.closest('[data-orv-resolve]')){ if(await patch(r, { status:'resolved', resolved_at:new Date().toISOString(), resolved_by:orvMe() })) await orvRender(); return; }
    if(el.closest('[data-orv-reopen]')){ if(await patch(r, { status:'open', resolved_at:null, resolved_by:null })) await orvRender(); return; }
    if((t = el.closest('[data-orv-job]'))){ if(typeof window.openProject === 'function') window.openProject(t.getAttribute('data-orv-job')); return; }
  });

  window.CardinalOwnerReview = Object.assign(window.CardinalOwnerReview || {}, { open:orvOpen, close:orvClose, flag:orvFlag, reload:function(){ return orvLoad().then(orvRender); } });
})();
</script>

"""

# the view, its styles and script — beside Invoices & AR, before AR's script
one('<script id="cr-ar-script">', BLOCK + '<script id="cr-ar-script">')

# hideAllViews
one("""  var _arv = document.getElementById('cr-ar-view');
  if(_arv) _arv.style.display = 'none';""",
"""  var _arv = document.getElementById('cr-ar-view');
  if(_arv) _arv.style.display = 'none';
  /* 1322: Owner Review is a fixed inset:0 view, DISPLAY-shown, so display:none. */
  var _orv = document.getElementById('cr-orv-view');
  if(_orv) _orv.style.display = 'none';""")

# back button
one("""        case 'ar':                 if(typeof openAR === 'function') openAR(); break;""",
"""        case 'ar':                 if(typeof openAR === 'function') openAR(); break;
        case 'ownerreview':        if(window.CardinalOwnerReview) window.CardinalOwnerReview.open(state.data && state.data.id); break;""")

# shared header map
one("""  'cr-ar-view':'Invoices', 'cr-lrs-view':'Labor Rates', 'cr-guide-editor':'Guides'""",
"""  'cr-ar-view':'Invoices', 'cr-lrs-view':'Labor Rates', 'cr-guide-editor':'Guides',
  'cr-orv-view':'Owner Review'   /* 1322 */""")

# drawer row (admins only — hidden for everyone else below)
one("""          <button class="navopt" data-nav="ar" data-cri="cash lg">Invoices &amp; AR</button>
""",
"""          <button class="navopt" data-nav="ar" data-cri="cash lg">Invoices &amp; AR</button>
          <button class="navopt" data-nav="ownerreview" data-cri="eye lg">Owner Review</button>
""")
one("""  else if(nav === 'ar'){ if(typeof openAR === 'function') openAR(); }""",
"""  else if(nav === 'ar'){ if(typeof openAR === 'function') openAR(); }
  else if(nav === 'ownerreview'){ if(window.CardinalOwnerReview) window.CardinalOwnerReview.open(); }""")
one("""hideOpt('ar');
hideOpt('laborrates');""", """hideOpt('ar');
hideOpt('ownerreview');   /* 1322: admins only */
hideOpt('laborrates');""")

# the client page tile — admins only, beside The Walk
one("""      (isAdminUser() ? jt(dbIc('walk'), 'The Walk', '', 'walk') : '') +""",
"""      (isAdminUser() ? jt(dbIc('walk'), 'The Walk', '', 'walk') : '') +
      (isAdminUser() ? jt(dbIc('checklist'), 'Owner review', '', 'ownerreview') : '') +   /* 1322: admins only */""")
one("""      else if(act === 'walk'){
        if(window.CardinalShowcase && window.CardinalShowcase.openForProject){""",
"""      else if(act === 'ownerreview'){ if(window.CardinalOwnerReview) window.CardinalOwnerReview.flag(pr); }   /* 1322 */
      else if(act === 'walk'){
        if(window.CardinalShowcase && window.CardinalShowcase.openForProject){""")

# a11y: the Job Menu becomes a named section (its tiles were outside any landmark; the new admin tile added one more)
one("""  html += '<div class="ja-menu"><h3 class="projsec""", """  html += '<div class="ja-menu" role="region" aria-label="Job menu"><h3 class="projsec""")
one(">v2026-10-12 build 1321<button", ">v2026-10-12 build 1322<button")
one("var CHANGELOG = [", """var CHANGELOG = [
  { b: 1322, d:'2026-10-12', t:'Behind the scenes', s:'Housekeeping for the office. Nothing changes on your screens.' },""")
pl.write_atomic(PATH, src)
print('1322 applied')
