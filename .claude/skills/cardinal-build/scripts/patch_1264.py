#!/usr/bin/env python3
"""Build 1264 — the Community job page, redone in the Retail page's order.

Theo, 8 Oct: "I need a total revamp of community crm to match exactly the retail
crm in its functions. It's too confusing." … "Don't drop anything into the
retail page. Just re do the community page" … "Where it says lead source add in
the partnership organizations instead" … "yes, put the thread in communication".

The page (`#cr-cc`, cr-cc-script) keeps its own module — the retail page is not
touched — and now reads top to bottom like Retail:
  name card (call / text / email) · Job Value / Balance ring · Payment
  Information · the stage bar with ‹ › arrows in Community words (⋮ for
  Awaiting Funding, Referred, Not Awarded) · Job Menu · Location · Job Details
  (Job Category, Work Type, Trade Type, Partnership Organization in place of
  Lead Source, Property) · Homeowner & Site (homeowner, site contact, estimate
  due) · Assigned To · Partner Work Orders · Reviews.
Gone from the page: the pin, the Thread | Estimate tabs. The Thread opens from
the Communication tile, the priced estimate from the Estimates tile — each as a
sub-view with a way back.

The arrows keep the bookkeeping the old buttons wrote — nothing the hub or the
partner reports read goes missing:
  → Estimate Submitted  the existing 'submitted' arm (bid.submitted_at/_amount)
  → Awarded             bid.awarded_amount/_at from the job's price, then stage
  → Build Complete / Invoiced  the existing 'complete' / 'invoice' arms
  ⋮ Awaiting Funding / Referred  the existing outcome form, at its step 2
  ⋮ Not Awarded         asks the reason (lead.not_awarded_reason), like Retail
Checklist first, then setStage — the order ocSave documents, so neither write
can drop the other.

usage: python3 patch_1264.py [index.html]
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import patch_lib as pl
HERE = os.path.dirname(os.path.abspath(__file__))
PATH = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, '../../../../index.html')
src = pl.load(PATH)

# ---- 1. the page renderer ---------------------------------------------------
A = "var l = lead(pr);\nvar hoNm = homeownerOf(pr);\nvar pq974 = priceOf(pr), amt = pq974.amt;"
B = "'<h3 class=\"cc-sect\">Reviews</h3><div class=\"cc-loc cc-rev\" id=\"cr-cc-rev\"></div>';"
assert src.count(A) == 1
a = src.index(A); b = src.index(B, a) + len(B)
src = src[:a] + "/* 1264: the Retail-order page, or one of its two sub-views. */\nmount.innerHTML = (tab === 'thread' || tab === 'bid') ? cc2Sub(pr) : cc2Page(pr);" + src[b:]

# ---- 2. the new markup + its handlers, beside render() ------------------------
NEW = r'''/* ── 1264: the Community page in Retail's order ─────────────────────────────
   Every piece below reads and writes the SAME fields the old pin, tabs and
   buttons did; only the arrangement and the way a stage moves changed. */
var CC2_ORD = ['Lead','Prospect','Approved','Scheduled','Completed','Invoiced','Closed'];
var CC2_TRADES = ['Roofing','Siding','Gutters','Windows','Repairs','Misc'];
var CC2_CATS = ['Residential','Commercial','Property Management'];
var CC2_WT = ['Inspection','Insurance','New','Repair','Retail','Service','Warranty'];
var CC2_LOSS = ['Not funded','Went with another contractor','Partner cancelled','Homeowner declined','Other'];
function cc2Ink(hex){
var h = String(hex || '').replace('#', '');
if(h.length !== 6) return '#111111';
var c = [0, 2, 4].map(function(i){ var v = parseInt(h.substr(i, 2), 16) / 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
return (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) > 0.2 ? '#111111' : '#ffffff';
}
function cc2Ck(pr){ try{ return JSON.parse((pr && pr.checklist) || '{}') || {}; }catch(_){ return {}; } }
function cc2Rep(pr){ var l = lead(pr); return (l.assigned && l.assigned[0]) || (pr && pr.sales_rep) || ''; }
function cc2Opts(list, cur, blank){
var has = !cur || list.indexOf(cur) !== -1;
return '<option value="">' + (blank || '\u2014') + '</option>' +
(has ? '' : '<option selected>' + esc(cur) + '</option>') +
list.map(function(o){ return '<option' + (o === cur ? ' selected' : '') + '>' + esc(o) + '</option>'; }).join('');
}
function cc2Page(pr){
var l = lead(pr), c = cc2Ck(pr), st = normStage(pr.stage);
var hoNm = homeownerOf(pr), nm = hoNm || pr.name || 'Client';
var pq = priceOf(pr), amt = Number(pq.amt) || 0;
var paid = 0;
try{ if(typeof window.jobFinance === 'function') paid = Number(window.jobFinance(pr).paid) || 0; }catch(_){}
var bal = Math.max(0, amt - paid), pct = amt > 0 ? Math.min(100, Math.round(paid / amt * 100)) : 0;
var phone = String(l.homeowner_phone || pr.phone || '').replace(/[^0-9+]/g, '');
var mail = String(l.homeowner_email || pr.email || '').trim();
var col = (window.STAGE_COLORS || {})[st] || '#607D8B', ink = cc2Ink(col);
var held = (st === 'OnHold' && !!l.check_back_at);
var sinceD = Math.floor((Date.now() - new Date(c.stage_since || pr.stage_since || pr.updated_at || pr.created_at).getTime()) / 86400000);
var since = isFinite(sinceD) && sinceD >= 0 ? (sinceD === 0 ? 'today' : sinceD + (sinceD === 1 ? ' day' : ' days')) : '';
var idx = CC2_ORD.indexOf(st);
var rep = cc2Rep(pr);
var repNm = rep ? ((typeof window.rptRepName === 'function' && window.rptRepName(rep)) || rep) : 'Unassigned';
var roster = (typeof TEAM_ROSTER !== 'undefined' && Array.isArray(TEAM_ROSTER)) ? TEAM_ROSTER : [];
var admin = (typeof isAdminUser === 'function') && isAdminUser();
var trades = Array.isArray(c.trades) ? c.trades : (c.trade ? [c.trade] : []);
var wt = c.work_type || l.work_type || l.worktype || '';
var R = 36, C = 2 * Math.PI * R;
var ic = function(k){ try{ return (typeof window.dbIc === 'function') ? window.dbIc(k) : ''; }catch(_){ return ''; } };
return '<button class="cc-out" data-cc-out="1" type="button">\u2039 Community</button>' +
'<div class="cc2-name"><div class="nm"><b>' + esc(nm) + '</b>' +
(c.po ? '<span class="po">PO ' + esc(String(c.po)) + '</span>' : '') +
(pr.address ? '<small>' + esc(pr.address) + '</small>' : '') + '</div>' +
'<div class="acts">' +
(mail ? '<a class="ib" href="mailto:' + esc(mail) + '" aria-label="Email ' + esc(nm) + '">' + ic('mail') + '<span>Email</span></a>' : '') +
(phone ? '<a class="ib" href="sms:' + esc(phone) + '" aria-label="Text ' + esc(nm) + '">' + ic('comms') + '<span>Text</span></a>' : '') +
(phone ? '<a class="ib" href="tel:' + esc(phone) + '" aria-label="Call ' + esc(nm) + '">' + ic('phone') + '<span>Call</span></a>' : '') +
'<button class="ib" type="button" data-act="edithome" aria-label="Edit who this job serves"><span>Edit</span></button>' +
'</div></div>' +
'<div class="cc2-money"><div><small>Job Value</small><b>' + usd(amt) + '</b>' +
(priceSrc(pr) ? '<em>' + esc(priceSrc(pr)) + '</em>' : '') + '</div>' +
'<svg class="ring" viewBox="0 0 84 84" role="img" aria-label="' + pct + '% collected">' +
'<circle cx="42" cy="42" r="' + R + '" class="tr"></circle>' +
'<circle cx="42" cy="42" r="' + R + '" class="fl" stroke-dasharray="' + (C * pct / 100).toFixed(1) + ' ' + C.toFixed(1) + '" transform="rotate(-90 42 42)"></circle>' +
'<text x="42" y="47" text-anchor="middle">' + pct + '%</text></svg>' +
'<div class="r"><small>Balance Due</small><b>' + usd(bal) + '</b></div></div>' +
'<button class="cc2-row" type="button" data-cc2="pay"><span>$ Payment Information</span><span class="chev">\u203A</span></button>' +
'<div class="cc2-band" style="background:' + col + ';color:' + ink + '">' +
'<button type="button" class="ar" data-cc2="prev" aria-label="Move back a stage"' + (idx <= 0 && st !== 'OnHold' && st !== 'Lost' ? ' disabled' : '') + '>\u2039</button>' +
'<div class="lb"><b>' + esc((LABEL[st] || st || '').toUpperCase()) + '</b><small>' +
esc(held ? 'Check back ' + fmtDay(l.check_back_at) : (since === 'today' ? 'Since today' : (since ? since + ' in this stage' : ''))) + '</small></div>' +
'<button type="button" class="ar" data-cc2="next" aria-label="Move forward a stage"' + (idx === CC2_ORD.length - 1 ? ' disabled' : '') + '>\u203A</button>' +
'<button type="button" class="mo" data-cc2="more" aria-label="More stage choices">\u22EE</button></div>' +
'<h3 class="cc-sect">Job Menu</h3><div class="cc-jm" id="cr-cc-jm"></div>' +
'<h3 class="cc-sect">Location</h3><div class="cc-loc" id="cr-cc-loc"></div>' +
'<h3 class="cc-sect">Job Details</h3><div class="cc2-card">' +
'<label class="kv"><span class="k">Job Category</span><select class="cc2-sel" data-cc2f="cat" aria-label="Job Category">' + cc2Opts(CC2_CATS, c.job_category || '') + '</select></label>' +
'<label class="kv"><span class="k">Work Type</span><select class="cc2-sel" data-cc2f="wt" aria-label="Work Type">' + cc2Opts(CC2_WT, wt) + '</select></label>' +
'<div class="kv"><span class="k">Trade Type</span><div class="chips">' + CC2_TRADES.map(function(t){
var on = trades.indexOf(t) !== -1;
return '<button type="button" class="chip' + (on ? ' on' : '') + '" data-cc2t="' + esc(t) + '" aria-pressed="' + on + '">' + esc(t) + '</button>';
}).join('') + '</div></div>' +
'<div class="cc-pp" id="cr-cc-pp"></div></div>' +
'<h3 class="cc-sect">Homeowner &amp; Site</h3><div class="cc2-card">' + contactsHtml(pr, true) +
'<label class="kv"><span class="k">Estimate due</span><input class="cc2-sel" type="date" data-cc2f="due" aria-label="Estimate due date" value="' + esc(String(l.bid_due_at || '').slice(0, 10)) + '"></label>' +
'</div>' +
'<h3 class="cc-sect">Assigned To</h3><div class="cc2-card"><div class="kv"><span class="k">' + esc(repNm) + '</span>' +
(admin ? '<select class="cc2-sel" data-cc2f="rep" aria-label="Reassign this job to another rep"><option value="">reassign\u2026</option>' +
roster.map(function(m){ return '<option value="' + esc(m.email) + '">' + esc(m.name) + '</option>'; }).join('') + '</select>' : '') +
'</div></div>' +
'<h3 class="cc-sect" id="cr-cc-wo-h">Partner Work Orders</h3><div class="cc-loc cc-wo" id="cr-cc-wo"></div>' +
'<h3 class="cc-sect">Reviews</h3><div class="cc-loc cc-rev" id="cr-cc-rev"></div>';
}
function cc2Sub(pr){
var thread = (tab === 'thread');
return '<button class="cc-out" data-cc2="back" type="button">\u2039 ' + esc(homeownerOf(pr) || pr.name || 'Job') + '</button>' +
'<h3 class="cc-sect">' + (thread ? 'Communication' : 'Estimate') + '</h3>' +
(thread
? '<button class="cc2-row" type="button" data-cc2="msgs"><span>Messages &amp; notes</span><span class="chev">\u203A</span></button>' + threadHtml(pr)
: bidHtml(pr));
}
async function cc2Write(pr, patch, what){
if(typeof window.patchProjectCk !== 'function'){ crTell('Cannot save right now \u2014 reload the app and retry.'); return false; }
try{
await window.patchProjectCk(pr, patch);
if(what && typeof window.auditLog === 'function'){ try{ window.auditLog('lead', what, pr.id); }catch(_){} }
return true;
}catch(e){ crTell('That did not save \u2014 ' + ((e && e.message) || e)); return false; }
}
async function cc2Step(dir, pr){
var st = normStage(pr.stage);
var idx = CC2_ORD.indexOf(st);
if(idx === -1) idx = 1;               /* Awaiting Funding / Not Awarded sit after Submitted */
var to = CC2_ORD[idx + dir];
if(!to) return;
if(typeof window.setStage !== 'function'){ crTell('Cannot change the stage right now \u2014 reload the app and retry.'); return; }
if(dir > 0 && to === 'Prospect'){ await ccDoAct('submitted', pr); return; }
if(dir > 0 && to === 'Completed'){ await ccDoAct('complete', pr); return; }
if(dir > 0 && to === 'Invoiced'){ await ccDoAct('invoice', pr); return; }
if(!await crAsk('Move this job to ' + (LABEL[to] || to) + '?', { verb:'Move', tone:'plain' })) return;
try{
if(dir > 0 && to === 'Approved'){
var b = bidOf(pr), p = priceOf(pr);
var n = (b.awarded_amount != null && b.awarded_amount !== '') ? b.awarded_amount : (Number(p.amt) > 0 ? Number(p.amt) : '');
if(!await cc2Write(pr, { bid: mergeCk(pr, 'bid', { awarded_amount: n, awarded_at: b.awarded_at || todayIso() }) }, 'Awarded by ' + (lead(pr).partner_name || 'the partner'))) return;
}
await window.setStage(pr.id, to);
}catch(e){ crTell('That did not save \u2014 ' + ((e && e.message) || e)); }
render();
}
async function cc2More(pr){
var pick = await crAsk('Where does this job stand?', { cancel:'Cancel', choices:[
{ id:'hold', label:LABEL.OnHold || 'Awaiting Funding', hint:'Park it until the partner decides' },
{ id:'referred', label:'Referred to another partner', hint:'The bill-to moves with it' },
{ id:'lost', label:LABEL.Lost || 'Not Awarded', hint:'Asks why' }
]});
if(!pick) return;
if(pick === 'hold' || pick === 'referred'){
ocOpen(pr);
if(oc){ oc.kind = (pick === 'hold') ? 'waiting' : 'referred'; oc.step = 2; render(); }
return;
}
var why = await crAsk('Why was it not awarded?', { cancel:'Cancel', choices: CC2_LOSS.map(function(r){ return { id:r, label:r }; }) });
if(!why) return;
if(!await cc2Write(pr, { lead: mergeCk(pr, 'lead', { not_awarded_reason: why }) }, 'Not awarded \u2014 ' + why)) return;
try{ await window.setStage(pr.id, 'Lost'); }catch(e){ crTell('That did not save \u2014 ' + ((e && e.message) || e)); }
render();
}
async function cc2Field(f, v, pr){
if(f === 'cat'){ await cc2Write(pr, { job_category: v || null }, 'Job category set to ' + (v || 'none')); }
else if(f === 'wt'){ await cc2Write(pr, { work_type: v || null, lead: mergeCk(pr, 'lead', { work_type: v }) }, 'Work type set to ' + (v || 'none')); }
else if(f === 'due'){ await cc2Write(pr, { lead: mergeCk(pr, 'lead', { bid_due_at: v }) }, 'Estimate due date set to ' + (v || 'none')); }
else if(f === 'rep'){
if(!v) return;
var L = Object.assign({}, lead(pr)); L.assigned = [v];
if(!await cc2Write(pr, { lead: L }, null)) return;
try{ if(typeof window.auditLog === 'function') window.auditLog('assign', 'Job reassigned to ' + ((window.rptRepName && window.rptRepName(v)) || v) + ' \u2014 ' + (pr.name || ''), pr.id); }catch(_){}
try{
var me = ((/** @type {any} */ (window)).currentUser || {}).email || '';
if(v !== me && window.notifyTeam){
window.notifyTeam([v], 'Job assigned to you \u2014 ' + (pr.name || 'client'),
'<p>' + esc((window.rptRepName && window.rptRepName(me)) || me || 'Someone') + ' assigned you <b>' + esc(pr.name || 'a job') + '</b>' + (pr.address ? ' \u2014 ' + esc(pr.address) : '') + '.</p><p>Open Cardinal to see it.</p>',
(typeof window.clientLink === 'function') ? window.clientLink(pr.id) : undefined);
}
}catch(_n){}
}
render();
}
'''
src = pl.sub(src, "function render(){\ntry{\nrenderInner();", NEW + "function render(){\ntry{\nrenderInner();")

# ---- 3. wiring ---------------------------------------------------------------
src = pl.sub(src, """function wire(mount, pr){
mount.querySelectorAll('[data-t]').forEach(function(b){
b.onclick = function(){ tab = b.dataset.t; render(); };
});""", """function wire(mount, pr){
mount.querySelectorAll('[data-t]').forEach(function(b){
b.onclick = function(){ tab = b.dataset.t; render(); };
});
/* 1264 */
mount.querySelectorAll('[data-cc2]').forEach(function(b){
b.onclick = function(){
var k = b.getAttribute('data-cc2');
if(k === 'back'){ tab = 'page'; try{ window.scrollTo(0, 0); }catch(_){} render(); return; }
if(k === 'pay'){ ccDoAct('pay', pr); return; }
if(k === 'prev'){ cc2Step(-1, pr); return; }
if(k === 'next'){ cc2Step(1, pr); return; }
if(k === 'more'){ cc2More(pr); return; }
if(k === 'msgs'){ var src0 = /** @type {HTMLElement} */ (document.querySelector('#acxMount .ja-menu .jabox[data-jm="comms"]')); if(src0) src0.click(); return; }
};
});
mount.querySelectorAll('[data-cc2f]').forEach(function(el){
el.onchange = function(){ cc2Field(el.getAttribute('data-cc2f'), /** @type {any} */ (el).value, pr); };
});
mount.querySelectorAll('[data-cc2t]').forEach(function(b){
b.onclick = async function(){
var t = b.getAttribute('data-cc2t'), c = cc2Ck(pr);
var cur = Array.isArray(c.trades) ? c.trades.slice() : (c.trade ? [c.trade] : []);
var i = cur.indexOf(t);
if(i === -1) cur.push(t); else cur.splice(i, 1);
await cc2Write(pr, { trades: cur.length ? cur : null, trade: null }, 'Trades set to ' + (cur.join(', ') || 'none'));
render();
};
});""")

# ---- 4. state: the page is the default, Communication shows the thread --------
src = pl.sub(src, "var tab = 'thread';", "var tab = 'page';   /* 1264: 'page' | 'thread' (Communication) | 'bid' (Estimates) */")
src = pl.sub(src, "busy = true;\ntab = 'thread';\noc = null;", "busy = true;\ntab = 'page';\noc = null;")
src = pl.sub(src, """'<button class="cc-jmb" data-jm="pay" type="button"><span class="l">Payment Information</span></button>';""", """'';   /* 1264: Payment Information is its own row under Job Value now */""")
src = pl.sub(src, """if(t.dataset.jm === 'estimates'){""", """if(t.getAttribute('data-jm') === 'comms'){
/* 1264 (Theo: "put the thread in communication"): the job's Thread is its
   Communication — opened in place, with Messages & notes one tap further. */
tab = 'thread';
try{ window.scrollTo(0, 0); }catch(_){}
render();
return;
}
if(t.dataset.jm === 'estimates'){""")

# ---- 5. bill-to now lives in Job Details --------------------------------------
src = pl.sub(src, """function contactsHtml(pr){
var l = lead(pr);
var site = contacts.find(function(c){ return c.kind === 'site'; });
var billTo = l.partner_name""", """function contactsHtml(pr, noBill){
var l = lead(pr);
var site = contacts.find(function(c){ return c.kind === 'site'; });
var billTo = (!noBill && l.partner_name)""")
src = pl.sub(src, """'<div class="ppk">Funding partner</div>'""", """'<div class="ppk">Partnership Organization</div>'""")

# ---- 6. styles ------------------------------------------------------------------
CSS = '''<style id="cr-cc2-styles">
/* 1264: the Community page in Retail's order. Every colour a --ccm-* token with
   its literal (both themes are declared by cr-cc-styles' own token blocks). */
#cr-cc .cc2-name{display:flex;align-items:flex-start;gap:10px;padding:14px 2px 10px;flex-wrap:wrap}
#cr-cc .cc2-name .nm{flex:1 1 180px;min-width:0}
#cr-cc .cc2-name .nm b{display:block;font:700 22px Georgia,'Times New Roman',serif;color:var(--ccm-ink,#f2f4f3)}
#cr-cc .cc2-name .nm small{display:block;margin-top:4px;font:400 15px 'Segoe UI',Arial,sans-serif;color:var(--ccm-mute,#9aa39e)}
#cr-cc .cc2-name .po{display:inline-block;margin-top:6px;padding:3px 8px;border-radius:6px;font:700 13px 'Segoe UI',Arial,sans-serif;background:var(--ccm-chip,#242927);color:var(--ccm-chipink,#b8c1bd)}
#cr-cc .cc2-name .acts{display:flex;gap:8px;flex-wrap:wrap}
#cr-cc .cc2-name .ib{min-width:56px;min-height:48px;padding:4px 8px;border-radius:10px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;
  background:var(--ccm-raise,#1e2220);border:1px solid var(--ccm-line,#2a2f2c);color:var(--ccm-ink,#f2f4f3);text-decoration:none;font:700 13px 'Segoe UI',Arial,sans-serif;cursor:pointer}
#cr-cc .cc2-name .ib svg{width:20px;height:20px}
#cr-cc .cc2-money{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:6px 2px 14px}
#cr-cc .cc2-money small{display:block;font:700 13px 'Segoe UI',Arial,sans-serif;color:var(--ccm-mute,#9aa39e)}
#cr-cc .cc2-money b{display:block;font:700 22px 'Segoe UI',Arial,sans-serif;color:var(--ccm-ink,#f2f4f3)}
#cr-cc .cc2-money em{display:block;font:400 13px 'Segoe UI',Arial,sans-serif;font-style:normal;color:var(--ccm-mute,#9aa39e)}
#cr-cc .cc2-money .r{text-align:right}
#cr-cc .cc2-money .ring{width:84px;height:84px;flex:none}
#cr-cc .cc2-money .ring .tr{fill:none;stroke:var(--ccm-line,#2a2f2c);stroke-width:9}
#cr-cc .cc2-money .ring .fl{fill:none;stroke:var(--ccm-ac,#34D399);stroke-width:9;stroke-linecap:round}
#cr-cc .cc2-money .ring text{font:700 18px 'Segoe UI',Arial,sans-serif;fill:var(--ccm-ink,#f2f4f3)}
#cr-cc .cc2-row{display:flex;width:100%;align-items:center;justify-content:space-between;min-height:52px;padding:0 14px;margin:0 0 12px;
  background:var(--ccm-card,#161918);border:1px solid var(--ccm-line,#2a2f2c);border-radius:10px;color:var(--ccm-ink,#f2f4f3);font:700 15px 'Segoe UI',Arial,sans-serif;cursor:pointer}
#cr-cc .cc2-row .chev{color:var(--ccm-ac,#34D399);font-size:22px}
#cr-cc .cc2-band{display:flex;align-items:center;gap:6px;margin:4px 0 6px;padding:8px 6px;border-radius:10px}
#cr-cc .cc2-band .lb{flex:1;text-align:center;min-width:0}
#cr-cc .cc2-band .lb b{display:block;font:800 18px 'Segoe UI',Arial,sans-serif;letter-spacing:.04em}
#cr-cc .cc2-band .lb small{display:block;font:700 13px 'Segoe UI',Arial,sans-serif}
#cr-cc .cc2-band button{min-width:44px;min-height:48px;border:0;background:transparent;color:inherit;font:800 26px 'Segoe UI',Arial,sans-serif;cursor:pointer;border-radius:8px}
#cr-cc .cc2-band button[disabled]{opacity:.35;cursor:default}
#cr-cc .cc2-card{background:var(--ccm-card,#161918);border:1px solid var(--ccm-line,#2a2f2c);border-radius:12px;padding:4px 14px}
#cr-cc .cc2-card .kv{display:flex;align-items:center;gap:12px;min-height:56px;padding:6px 0;border-bottom:1px solid var(--ccm-line2,#232725)}
#cr-cc .cc2-card .kv:last-child{border-bottom:0}
#cr-cc .cc2-card .kv .k{width:128px;flex:none;font:700 15px 'Segoe UI',Arial,sans-serif;color:var(--ccm-mute,#9aa39e)}
#cr-cc .cc2-sel{flex:1;min-width:0;min-height:44px;padding:0 10px;border-radius:8px;border:1px solid var(--ccm-line,#2a2f2c);
  background:var(--ccm-raise,#1e2220);color:var(--ccm-ink,#f2f4f3);font:600 15px 'Segoe UI',Arial,sans-serif}
#cr-cc .cc2-card .chips{display:flex;flex-wrap:wrap;gap:6px;flex:1}
#cr-cc .cc2-card .chip{min-height:44px;padding:0 12px;border-radius:22px;border:1px solid var(--ccm-line,#2a2f2c);background:transparent;
  color:var(--ccm-ink,#f2f4f3);font:600 15px 'Segoe UI',Arial,sans-serif;cursor:pointer}
#cr-cc .cc2-card .chip.on{background:var(--ccm-ac,#34D399);border-color:var(--ccm-ac,#34D399);color:var(--ccm-onac,#08240f)}
#cr-cc .cc2-card .cts{margin:6px 0 0}
#cr-cc .cc2-card .cc-pp{margin:0;padding:0;border:0;background:transparent}
</style>
'''
src = pl.sub(src, '<script id="cr-cc-script">', CSS + '<script id="cr-cc-script">')

src = pl.sub(src, '>v2026-10-08 build 1263<', '>v2026-10-08 build 1264<')
src = pl.sub(src, '''var CHANGELOG = [
''', '''var CHANGELOG = [
  { b: 1264, d: '2026-10-08', t: 'The Community job page, laid out like Retail',
    s: 'A Community job now opens like a Retail one: the name with call, text and email; Job Value and Balance; Payment Information; the stage bar with <b>\\u2039 \\u203A</b> arrows in Community words (\\u22EE for Awaiting Funding, Referred and Not Awarded); the Job Menu; Location; <b>Job Details</b>, where <b>Partnership Organization</b> takes Lead Source\\u2019s place; Homeowner &amp; Site; and Assigned To. The job\\u2019s Thread is now inside <b>Communication</b>, and the priced estimate inside <b>Estimates</b>. Moving a stage still records what the old buttons did \\u2014 the submitted and awarded amounts and dates \\u2014 and Not Awarded asks why.' },
''')
pl.write_atomic(PATH, src)
print('patched', PATH, len(src))
