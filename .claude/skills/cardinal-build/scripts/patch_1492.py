import sys
sys.path.insert(0, '/Users/cardinal/Library/Application Support/Claude/local-agent-mode-sessions/6faf96fc-b092-4eb3-bb94-9529487cc28c/6141bb56-7dbc-45f6-9b2b-f2e1860be711/rpm/plugin_01TFruGAR5g4rn2KiAVaYtG9/skills/cardinal-build/scripts')
import patch_lib as pl

src = pl.load('index_v1491.html')

# ═════════════ A. Crews card: Invoices tab, check photos, check ↔ invoice links ═════════════
src = pl.sub(src, "var TABS = [['profile','Profile'],['compliance','Compliance'],['jobs','Jobs'],['rates','Labor Rates'],['payments','Payments'],['notes','Notes']];",
  "var TABS = [['profile','Profile'],['compliance','Compliance'],['jobs','Jobs'],['invoices','Invoices'],['rates','Labor Rates'],['payments','Payments'],['notes','Notes']];   /* 1492: Invoices */")
src = pl.sub(src, "var MONEY_TABS = ['rates','payments'];", "var MONEY_TABS = ['rates','payments','invoices'];   /* 1492: crew_invoices is is_cardinal_admin like crew_payments */")
src = pl.sub(src, "var callbacks = [];             /* 1296: callback punch-outs with an original crew */",
  "var callbacks = [];             /* 1296: callback punch-outs with an original crew */\n"
  "var invoices = [], plinks = [];  /* 1492: crew_invoices + crew_payment_invoices (admin-only; degrade to []) */\n"
  "var linkPay = null;             /* 1492: the payment whose invoice-link picker is open */")
src = pl.sub(src, """    cl.from('punch_items').select('id,project_id,title,detail,callback_cause,orig_crew_id,created_at,status')
      .eq('kind', 'callback').not('orig_crew_id', 'is', null).order('created_at', { ascending:false })
  ]);""", """    cl.from('punch_items').select('id,project_id,title,detail,callback_cause,orig_crew_id,created_at,status')
      .eq('kind', 'callback').not('orig_crew_id', 'is', null).order('created_at', { ascending:false }),
    /* 1492: what crews BILLED, and which check paid which bill. Admin-only RLS; before the
       1492 SQL runs these 404 — both degrade to [] like the money tables above. */
    cl.from('crew_invoices').select('*').order('invoice_date', { ascending:false, nullsFirst:true }),
    cl.from('crew_payment_invoices').select('*')
  ]);""")
src = pl.sub(src, "  callbacks = (res[7] && res[7].data) || [];\n",
  "  callbacks = (res[7] && res[7].data) || [];\n"
  "  invoices = (res[8] && !res[8].error && res[8].data) || [];\n"
  "  plinks = (res[9] && !res[9].error && res[9].data) || [];\n")

INV = r"""
/* ── 1492: Invoices — what a crew BILLED (Theo, 27 Nov: "an invoiced section with stats but also a
   thumbnail pic that opens of the invoice … somewhere we can also put checks") ─────────────────────
   One row per crew_invoices row, newest first, with a thumbnail of the original (private crew-docs,
   opened with the same signed-URL openDoc the Compliance tab uses). Paid/Part/Open comes from the
   checks linked to it on the Payments tab (crew_payment_invoices); pay_status 'unknown' is a migrated
   bill nobody has matched to a check yet, 'paid_outside' one paid with no check on file. The stats are
   summed from the rows rendered, never from a second query. Flags: the same invoice # twice, a second
   bill on the same job, a bill on a job marked Lost. Admin-only, like Payments. */
function invPaid(id){
  var t = 0;
  plinks.forEach(function(l){ if(l.invoice_id === id){ var v = Number(l.amount); if(isFinite(v)) t += v; } });
  return t;
}
function invState(inv){
  var tot = Number(inv.total) || 0, pd = invPaid(inv.id);
  if(inv.pay_status === 'paid_outside') return { k:'paid', label:'Paid · no check on file', paid:tot };
  if(pd > 0 && pd >= tot - 0.005) return { k:'paid', label:'Paid', paid:pd };
  if(pd > 0) return { k:'part', label:'Part paid', paid:pd };
  if(inv.pay_status === 'unknown') return { k:'unk', label:'Not linked', paid:0 };
  return { k:'open', label:'Open', paid:0 };
}
function projOf(pid){
  try{ var list = window.cacheProjects || []; for(var i = 0; i < list.length; i++){ if(list[i].id === pid) return list[i]; } }catch(_){ }
  return null;
}
function invFlags(inv, mine){
  var f = [];
  if(inv.invoice_number){
    var same = mine.filter(function(o){ return o.id !== inv.id && o.invoice_number === inv.invoice_number; });
    if(same.some(function(o){ return Math.abs((Number(o.total) || 0) - (Number(inv.total) || 0)) < 0.005; }))
      f.push('Same invoice # and amount entered twice');
    else if(same.length) f.push('Invoice # also used on another bill');
  }
  if(inv.project_id){
    var also = mine.filter(function(o){ return o.id !== inv.id && o.project_id === inv.project_id; });
    if(also.length) f.push('Another bill on this job (#' + also.map(function(o){ return o.invoice_number || '?'; }).join(', #') + ')');
    var p = projOf(inv.project_id);
    if(p && String(p.stage || '').toLowerCase() === 'lost') f.push('This job is marked Lost');
  }
  return f;
}
function isPdf(name){ return /\.pdf$/i.test(String(name || '')); }
function thumbHtml(path, name, kind, id){
  if(path) return '<button type="button" class="crw-ith" data-open="' + esc(path) + '" aria-label="Open the ' + kind + '">' +
    (isPdf(name) ? '<span class="crw-ipdf">PDF</span>' : '<img alt="" data-thumb="' + esc(path) + '">') + '</button>';
  return '<label class="crw-ith add" title="Add a photo of the ' + kind + '">+ Photo<input type="file" accept="image/*,application/pdf" hidden data-' +
    (kind === 'check' ? 'payphoto' : 'invphoto') + '="' + esc(id) + '"></label>';
}
function invoicesHtml(c){
  if(!canSeeRates()) return '<div class="crw-empty">Invoices are not shown for this account.</div>';
  var mine = invoices.filter(function(i){ return i.crew_id === c.id; });
  var billed = 0, paid = 0, open = 0, unk = 0, flagged = 0;
  var rows = mine.map(function(inv){
    var tot = Number(inv.total) || 0, st = invState(inv), fl = invFlags(inv, mine);
    billed += tot; paid += Math.min(st.paid, tot);
    if(st.k === 'unk') unk += tot; else if(st.k !== 'paid') open += tot - st.paid;
    if(fl.length) flagged++;
    var p = projOf(inv.project_id);
    var who = (p && p.name) || projName(inv.project_id) || '';
    var where = inv.job_address || (p && (p.address || p.street)) || '';
    return '<div class="crw-irow">' + thumbHtml(inv.file_path, inv.file_name, 'invoice', inv.id) +
      '<div class="crw-im"><div class="crw-i1"><b>#' + esc(inv.invoice_number || '—') + '</b>' + (who ? ' · ' + esc(who) : '') + '</div>' +
        '<div class="crw-mut crw-i2">' + esc([where, inv.invoice_date ? dstr(inv.invoice_date) : 'no date'].filter(Boolean).join(' · ')) + '</div>' +
        fl.map(function(x){ return '<div class="crw-iflag">⚠ ' + esc(x) + '</div>'; }).join('') +
      '</div>' +
      '<div class="crw-ir"><b>' + money(tot, true) + '</b>' +
        '<span class="crw-ist ' + st.k + '">' + esc(st.label) + '</span>' +
        (st.k === 'part' ? '<span class="crw-mut" style="font-size:11.5px">' + money(st.paid, true) + ' paid</span>' : '') +
      '</div></div>';
  }).join('');
  var stat = function(lbl, v, cls){ return '<div class="crw-istat' + (cls ? ' ' + cls : '') + '"><small>' + lbl + '</small><b>' + money(v, true) + '</b></div>'; };
  return '<div class="crw-istats">' + stat('Invoiced', billed) + stat('Paid', paid) + stat('Open', open, 'open') +
      (unk ? stat('Not linked', unk, 'unk') : '') + '</div>' +
    '<div class="crw-mut" style="font-size:12.5px;margin:0 2px 8px">' + mine.length + (mine.length === 1 ? ' invoice' : ' invoices') +
      (flagged ? ' · ' + flagged + ' flagged' : '') + (unk ? ' · link “Not linked” bills to their checks on the Payments tab' : '') + '</div>' +
    '<button type="button" class="crw-btn primary" data-act="readinv" style="margin-bottom:6px">Read a crew invoice</button>' +
    (rows || '<div class="crw-empty">No invoices from this crew yet.</div>');
}
/* fill every thumbnail on screen with a short-lived signed URL (one call) */
async function fillThumbs(){
  var v = view(); if(!v) return;
  var imgs = [].slice.call(v.querySelectorAll('img[data-thumb]'));
  if(!imgs.length) return;
  var cl = db(); if(!cl) return;
  try{
    var paths = imgs.map(function(i){ return i.getAttribute('data-thumb'); });
    var r = await cl.storage.from('crew-docs').createSignedUrls(paths, 600);
    var map = {};
    ((r && r.data) || []).forEach(function(x){ if(x && x.path && x.signedUrl) map[x.path] = x.signedUrl; });
    imgs.forEach(function(i){ var u = map[i.getAttribute('data-thumb')]; if(u) i.src = u; });
  }catch(_){ }
}
async function attachPhoto(table, id, file, folder){
  var cl = db(); if(!cl || !file || !canSeeRates()) return;
  if(file.size > 20 * 1024 * 1024){ crTell('That file is over 20 MB.'); return; }
  var safe = String(file.name || 'photo').replace(/[^\w.\-]+/g, '_').slice(-80) || 'photo';
  var key = folder + '/' + new Date().toISOString().slice(0, 7) + '/' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7) + '-' + safe;
  var up = await cl.storage.from('crew-docs').upload(key, file, { contentType: file.type || 'application/octet-stream', upsert: false });
  if(up && up.error){ crTell('Could not upload: ' + up.error.message); return; }
  var r = await cl.from(table).update({ file_bucket:'crew-docs', file_path:key, file_name:String(file.name || safe).slice(0, 120) }).eq('id', id);
  if(r.error){ try{ await cl.storage.from('crew-docs').remove([key]); }catch(_){ } crTell('Could not save the photo: ' + r.error.message); return; }
  await load(); render();
}
/* the Payments tab's "Link invoices" picker for one check */
function linkPickerHtml(p){
  var c = sel(); if(!c) return '';
  var amt = Number(p.amount) || 0, used = 0;
  plinks.forEach(function(l){ if(l.payment_id === p.id) used += Number(l.amount) || 0; });
  var open = invoices.filter(function(i){
    if(i.crew_id !== c.id) return false;
    if(plinks.some(function(l){ return l.payment_id === p.id && l.invoice_id === i.id; })) return false;
    return invState(i).k !== 'paid';
  });
  var rows = open.map(function(i){
    var left = Math.max(0, (Number(i.total) || 0) - invPaid(i.id));
    return '<label class="crw-lrow"><input type="checkbox" data-lnk="' + esc(i.id) + '">' +
      '<span><b>#' + esc(i.invoice_number || '—') + '</b> · ' + esc(projName(i.project_id) || i.job_address || '') + ' · ' + esc(i.invoice_date ? dstr(i.invoice_date) : '') + '</span>' +
      '<input type="text" inputmode="decimal" data-lnkamt="' + esc(i.id) + '" value="' + left.toFixed(2) + '" aria-label="Amount of this check for #' + esc(i.invoice_number || '') + '"></label>';
  }).join('');
  return '<tr class="crw-lpick"><td colspan="6"><div class="crw-lbox">' +
    '<b>Which invoices did ' + esc(p.reference || 'this payment') + ' (' + money(amt, true) + ') pay?</b>' +
    '<div class="crw-mut" style="font-size:12.5px;margin:2px 0 8px">' + money(amt - used, true) + ' of this check is not linked yet. Tick the bills; adjust an amount if the check only covered part.</div>' +
    (rows || '<div class="crw-mut">Every invoice from this crew is already paid.</div>') +
    '<div style="margin-top:10px;display:flex;gap:8px;align-items:center"><button type="button" class="crw-btn primary" data-linksave="' + esc(p.id) + '">Save links</button>' +
    '<button type="button" class="crw-btn" data-linkcancel="1">Cancel</button><span class="crw-mut" data-linkmsg style="font-size:13px"></span></div>' +
    '</div></td></tr>';
}
async function saveLinks(payId){
  var cl = db(), v = view(); if(!cl || !v || !canSeeRates()) return;
  var p = payments.find(function(x){ return x.id === payId; }); if(!p) return;
  var msg = v.querySelector('[data-linkmsg]');
  var picks = [].slice.call(v.querySelectorAll('[data-lnk]')).filter(function(b){ return b.checked; }).map(function(b){
    var id = b.getAttribute('data-lnk'), el = v.querySelector('[data-lnkamt="' + id + '"]');
    return { payment_id: payId, invoice_id: id, amount: Math.round(Number(String(el ? el.value : '').replace(/[$,\s]/g, '')) * 100) / 100, created_by: me() };
  });
  if(!picks.length){ if(msg) msg.textContent = 'Tick at least one invoice.'; return; }
  if(picks.some(function(x){ return !(x.amount > 0); })){ if(msg) msg.textContent = 'Each amount must be more than $0.'; return; }
  var used = 0; plinks.forEach(function(l){ if(l.payment_id === payId) used += Number(l.amount) || 0; });
  var want = picks.reduce(function(a, x){ return a + x.amount; }, 0);
  if(used + want > (Number(p.amount) || 0) + 0.005){ if(msg) msg.textContent = 'That is ' + money(used + want - Number(p.amount), true) + ' more than the check.'; return; }
  if(msg) msg.textContent = 'Saving…';
  var r = await cl.from('crew_payment_invoices').insert(picks);
  if(r.error){ if(msg) msg.textContent = 'Could not save: ' + r.error.message; return; }
  await cl.from('crew_invoices').update({ pay_status:'auto' }).in('id', picks.map(function(x){ return x.invoice_id; }));
  linkPay = null; await load(); render();
}
"""
src = pl.sub(src, "function payFor(crewId){", INV + "function payFor(crewId){")

# Payments rows: check thumbnail + what it pays + Link button + the picker
src = pl.sub(src, """    return '<tr>' +
      '<td>' + esc(p.paid_on ? dstr(p.paid_on) : '\\u2014') + '</td>' +
      '<td style="text-align:right">' + money(p.amount, true) + '</td>' +
      '<td>' + esc(meth) + '</td>' +
      '<td>' + esc(p.reference || '') + '</td>' +
      '<td>' + esc(p.memo || '') + '</td>' +
      '<td><button class="crw-btn" style="padding:3px 8px" data-delpay="' + esc(p.id) + '">Remove</button></td>' +
    '</tr>';""",
"""    /* 1492: the check's photo, which invoices it paid, and the link picker */
    var pays = plinks.filter(function(l){ return l.payment_id === p.id; }).map(function(l){
      var inv = invoices.find(function(i){ return i.id === l.invoice_id; });
      return '#' + esc(inv ? (inv.invoice_number || '—') : '?') + (inv && Math.abs((Number(inv.total) || 0) - (Number(l.amount) || 0)) > 0.005 ? ' (' + money(l.amount, true) + ')' : '');
    });
    return '<tr>' +
      '<td><div class="crw-pdate">' + thumbHtml(p.file_path, p.file_name, 'check', p.id) + '<span>' + esc(p.paid_on ? dstr(p.paid_on) : '\\u2014') + '</span></div></td>' +
      '<td style="text-align:right">' + money(p.amount, true) + '</td>' +
      '<td>' + esc(meth) + '</td>' +
      '<td>' + esc(p.reference || '') + '</td>' +
      '<td>' + esc(p.memo || '') +
        (pays.length ? '<div class="crw-pays">Pays ' + pays.join(', ') + '</div>' : '') +
        '<div><button type="button" class="crw-btn crw-mini2" data-linkpay="' + esc(p.id) + '">' + (pays.length ? 'Link more' : 'Link invoices') + '</button></div></td>' +
      '<td><button class="crw-btn" style="padding:3px 8px" data-delpay="' + esc(p.id) + '">Remove</button></td>' +
    '</tr>' + (linkPay === p.id ? linkPickerHtml(p) : '');""")

src = pl.sub(src, "    : tab === 'payments' ? paymentsHtml(c)\n",
             "    : tab === 'payments' ? paymentsHtml(c)\n    : tab === 'invoices' ? invoicesHtml(c)   /* 1492 */\n")
src = pl.sub(src, "    '<div class=\"crw-wrap\"><div>' + navHtml() + '</div><div>' + panelHtml() + '</div></div>';\n}",
             "    '<div class=\"crw-wrap\"><div>' + navHtml() + '</div><div>' + panelHtml() + '</div></div>';\n  fillThumbs();   /* 1492 */\n}")
# clicks
src = pl.sub(src, """    var dp = e.target.closest('[data-delpay]');
    if(dp){ delPayment(dp.getAttribute('data-delpay')); return; }""",
"""    var dp = e.target.closest('[data-delpay]');
    if(dp){ delPayment(dp.getAttribute('data-delpay')); return; }
    /* 1492 */
    var lp = e.target.closest('[data-linkpay]');
    if(lp){ linkPay = lp.getAttribute('data-linkpay'); render(); return; }
    var ls = e.target.closest('[data-linksave]');
    if(ls){ saveLinks(ls.getAttribute('data-linksave')); return; }
    if(e.target.closest('[data-linkcancel]')){ linkPay = null; render(); return; }""")
src = pl.sub(src, "    else if(k === 'addpay'){ addPayment(); }\n",
             "    else if(k === 'addpay'){ addPayment(); }\n"
             "    else if(k === 'readinv'){ var cc = sel(); if(window.CardinalCrewInvoice && cc) window.CardinalCrewInvoice.open({ crewId: cc.id }); }   /* 1492 */\n")
src = pl.sub(src, """  v.addEventListener('change', function(e){
    var k = e.target.getAttribute && e.target.getAttribute('data-apf');""",
"""  v.addEventListener('change', function(e){
    /* 1492: photo of an invoice or a check */
    var ip = e.target.getAttribute && e.target.getAttribute('data-invphoto');
    if(ip && e.target.files && e.target.files[0]){ attachPhoto('crew_invoices', ip, e.target.files[0], 'invoices'); return; }
    var pp = e.target.getAttribute && e.target.getAttribute('data-payphoto');
    if(pp && e.target.files && e.target.files[0]){ attachPhoto('crew_payments', pp, e.target.files[0], 'checks'); return; }
    var k = e.target.getAttribute && e.target.getAttribute('data-apf');""")

# styles: appended to the crews' own style block if we can find it, else a new block before the script
CSS = """
/* 1492: Crews · Invoices tab + check photos */
.crw-istats{display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:8px;margin:2px 0 10px}
.crw-istat{border:1px solid rgba(128,128,128,.3);border-radius:12px;padding:9px 11px}
.crw-istat small{display:block;font-size:11px;letter-spacing:.08em;text-transform:uppercase;opacity:.7}
.crw-istat b{font-size:17px}.crw-istat.open b{color:#f2a531}.crw-istat.unk b{color:#9aa0a8}
.crw-irow{display:flex;gap:10px;align-items:center;border:1px solid rgba(128,128,128,.22);border-radius:12px;padding:8px;margin-top:8px}
.crw-ith{flex:none;width:64px;height:64px;border-radius:8px;overflow:hidden;border:1px solid rgba(128,128,128,.35);padding:0;background:rgba(128,128,128,.12);cursor:pointer;display:grid;place-items:center;font-size:12px}
.crw-ith img{width:100%;height:100%;object-fit:cover;display:block}
.crw-ith.add{font-weight:700;opacity:.8}
.crw-ipdf{font-weight:800;font-size:13px}
.crw-im{flex:1;min-width:0}.crw-i1{font-size:14.5px}.crw-i2{font-size:13px}
.crw-iflag{color:#e0a020;font-size:12.5px;margin-top:2px}
.crw-ir{display:flex;flex-direction:column;align-items:flex-end;gap:3px;text-align:right}
.crw-ist{font-size:11px;font-weight:700;border-radius:999px;padding:2px 8px}
.crw-ist.open{background:#3a2c08;color:#ffd98a}.crw-ist.part{background:#2a2410;color:#ffd98a}.crw-ist.paid{background:#0f2f22;color:#7fe0b5}.crw-ist.unk{background:rgba(128,128,128,.2)}
.crw-pdate{display:flex;align-items:center;gap:8px}.crw-pdate .crw-ith{width:40px;height:40px;font-size:10px}
.crw-pays{font-size:12px;opacity:.85;margin-top:2px}.crw-mini2{padding:2px 8px;font-size:12px;margin-top:4px}
.crw-lbox{border:1px solid rgba(128,128,128,.3);border-radius:12px;padding:10px 12px;margin:4px 0}
.crw-lrow{display:flex;align-items:center;gap:8px;padding:6px 0;border-top:1px solid rgba(128,128,128,.15)}
.crw-lrow span{flex:1;min-width:0}.crw-lrow input[type=text]{width:96px;text-align:right}
"""
src = pl.sub(src, '<script id="cr-crew-script">', '<style id="cr-crew-1492-styles">' + CSS + '</style>\n<script id="cr-crew-script">')

# ═════════════ B. Reader: file a crew's bill into crew_invoices (admin, crew chosen) ═════════════
src = pl.sub(src, "function open(opts){\n  st = { pid: (opts && opts.pid) ? String(opts.pid) : '', inv: null, form: null, busy: false, err: '', dupe: false, matchWhy: '' };",
"""var crewList = null;   /* 1492: crews, loaded once for an admin so a bill can be filed under its crew */
function admin(){ try{ return typeof window.isAdminUser === 'function' ? !!window.isAdminUser() : (typeof isAdminUser === 'function' && !!isAdminUser()); }catch(_){ return false; } }
function crewMatch(name){
  var t = toks(name).filter(function(w){ return w.length > 2 && ['gutters','gutter','roofing','llc','inc','construction','the'].indexOf(w) === -1; });
  var best = null, bs = 0;
  (crewList || []).forEach(function(c){ var ct = toks((c.name || '') + ' ' + (c.legal_name || '')), s = 0; t.forEach(function(w){ if(ct.indexOf(w) !== -1) s++; }); if(s > bs){ bs = s; best = c; } });
  return bs ? best : null;
}
function open(opts){
  st = { pid: (opts && opts.pid) ? String(opts.pid) : '', crewId: (opts && opts.crewId) ? String(opts.crewId) : '', inv: null, form: null, busy: false, err: '', dupe: false, matchWhy: '' };
  if(admin() && !crewList && db()){ db().from('crews').select('id,name,legal_name,trade').eq('archived', false).order('name').then(function(r){ crewList = (r && r.data) || []; if(st && st.inv) paint(); }, function(){ crewList = []; }); }""")
# crew picked when the read comes back
src = pl.sub(src, """    st.form = { pid: st.pid || (mt ? mt.p.id : ''), crew: inv.crew_name, no: inv.invoice_number,""",
"""    var cm = st.crewId ? null : crewMatch(inv.crew_name);   /* 1492 */
    st.form = { crewId: st.crewId || (cm ? cm.id : ''), pid: st.pid || (mt ? mt.p.id : ''), crew: inv.crew_name, no: inv.invoice_number,""")
# a Crew select on the review card (admin only)
src = pl.sub(src, """  h += '<div class="ci-row2"><div><label for="ci-crew">Crew</label><input id="ci-crew" data-ci-f="crew" value="' + E(f.crew) + '"></div>' +""",
"""  if(admin() && crewList && crewList.length){   /* 1492: file it under the crew → Crews › Invoices */
    h += '<label for="ci-crewid">File under crew</label><select id="ci-crewid" data-ci-f="crewId"><option value="">Not a crew bill (job cost only)</option>' +
      crewList.map(function(c){ return '<option value="' + E(c.id) + '"' + (String(c.id) === String(f.crewId) ? ' selected' : '') + '>' + E(c.legal_name || c.name) + (c.legal_name && c.name && c.legal_name !== c.name ? ' (' + E(c.name) + ')' : '') + '</option>'; }).join('') + '</select>';
  }
  h += '<div class="ci-row2"><div><label for="ci-crew">Crew</label><input id="ci-crew" data-ci-f="crew" value="' + E(f.crew) + '"></div>' +""")
src = pl.sub(src, "  h += '<p class=\"ci-sub\">Check what was read. Change anything that’s wrong, then Apply. It adds one Labor cost to the job.</p>';",
             "  h += '<p class=\"ci-sub\">Check what was read. Change anything that’s wrong, then Apply. ' + (f.crewId ? 'It files the bill under the crew (Crews › Invoices); it counts on the job as labor.' : 'It adds one Labor cost to the job.') + '</p>';")
src = pl.sub(src, "  if(k && st && st.form){ st.form[k] = t.value; if(k === 'pid'){ st.matchWhy = ''; st.dupe = false; paint(); } else if(k === 'no'){ st.dupe = false; } }",
             "  if(k && st && st.form){ st.form[k] = t.value; if(k === 'pid'){ st.matchWhy = ''; st.dupe = false; paint(); } else if(k === 'crewId'){ st.dupe = false; paint(); } else if(k === 'no'){ st.dupe = false; } }")
# apply: crew bill path
src = pl.sub(src, """  st.busy = true; st.err = ''; paint();
  try{
    if(f.no && !st.dupe){
      var d = await db().from('job_costs').select('id,description').eq('project_id', f.pid);""",
"""  st.busy = true; st.err = ''; paint();
  if(f.crewId && admin()){ return applyCrewBill(f, amt); }   /* 1492 */
  try{
    if(f.no && !st.dupe){
      var d = await db().from('job_costs').select('id,description').eq('project_id', f.pid);""")
src = pl.sub(src, "function onClick(e){\n  var t = e.target;\n  if(t === q('cr-crinv')",
"""/* 1492: a crew's bill goes to crew_invoices (the Crews › Invoices tab). Not also a job_cost: the job's
   Costs tab counts crew bills as labor, and counts a check only when it is not linked to a bill. */
async function applyCrewBill(f, amt){
  try{
    if(f.no && !st.dupe){
      var d = await db().from('crew_invoices').select('id').eq('crew_id', f.crewId).eq('invoice_number', f.no);
      if(d && !d.error && d.data && d.data.length){ st.dupe = true; st.busy = false; paint(); return; }
    }
    var row = { crew_id: f.crewId, project_id: f.pid, invoice_number: f.no || null, invoice_date: f.date || null,
      total: Math.round(amt * 100) / 100, lines: (st.inv && st.inv.lines) || [], job_address: (st.inv && st.inv.job_address) || null,
      notes: (st.inv && st.inv.notes) || null, source: 'reader', created_by: me() };
    if(st.saved){ row.file_bucket = st.saved.bucket; row.file_path = st.saved.path; row.file_name = String(st.saved.name).slice(0, 120); }
    var r = await db().from('crew_invoices').insert(row).select('id');
    if(r.error || !r.data || !r.data.length) throw new Error('Not saved: ' + ((r.error && r.error.message) || 'the database refused it.'));
    var pid = f.pid, crew = f.crew;
    st.applied = true; close();
    tell('Filed ' + M(row.total) + ' bill' + (crew ? ' from ' + crew : '') + ' under the crew.', 'ok');
    try{ if(window.CardinalJobPay && window.CardinalJobPay.refresh) window.CardinalJobPay.refresh(pid); }catch(_){}
    try{ var cv = document.getElementById('crewsView'); if(cv && cv.style.display !== 'none' && window.CardinalCrews && window.CardinalCrews.reload) window.CardinalCrews.reload(); }catch(_){}
  }catch(e){ st.busy = false; st.err = (e && e.message) || 'Not saved.'; paint(); }
}
function onClick(e){
  var t = e.target;
  if(t === q('cr-crinv')""")
src = pl.sub(src, "  if(st.dupe) h += '<div class=\"ci-warn\">This job already has a cost for invoice ' + E(f.no) + '. Tap Apply again only if this is a different bill.</div>';",
             "  if(st.dupe) h += '<div class=\"ci-warn\">' + (f.crewId ? 'This crew already has invoice ' + E(f.no) + ' on file.' : 'This job already has a cost for invoice ' + E(f.no) + '.') + ' Tap Apply again only if this is a different bill.</div>';")

# ═════════════ C. Job Costs tab: crew bills count as labor; a check linked to a bill does not count again ═════════════
src = pl.sub(src, """      db.from('job_costs').select('*').eq('project_id', pid)
    ]).then(function(rs){""",
"""      db.from('job_costs').select('*').eq('project_id', pid),
      office ? db.from('crew_invoices').select('id,crew_id,invoice_number,invoice_date,total,file_bucket,file_path,created_at').eq('project_id', pid) : none   /* 1492 */
    ]).then(function(rs){""")
src = pl.sub(src, """      var ids = crew.map(function(x){ return x.crew_id; }).filter(Boolean);
      if(!ids.length) return d;
      return db.from('crews').select('id,name').in('id', ids).then(function(r){ d.crews = (r && r.data) || []; return d; }, function(){ return d; });""",
"""      d.cinv = (rs[5] && !rs[5].error && rs[5].data) || [];   /* 1492 */
      d.linked = {};
      var ids = crew.map(function(x){ return x.crew_id; }).concat(d.cinv.map(function(x){ return x.crew_id; })).filter(Boolean);
      var payIds = crew.map(function(x){ return x.id; });
      var lk = payIds.length ? db.from('crew_payment_invoices').select('payment_id').in('payment_id', payIds).then(function(r){
        ((r && !r.error && r.data) || []).forEach(function(x){ d.linked[x.payment_id] = 1; }); }, function(){}) : Promise.resolve();
      if(!ids.length) return lk.then(function(){ return d; });
      return lk.then(function(){ return db.from('crews').select('id,name').in('id', ids); }).then(function(r){ d.crews = (r && r.data) || []; return d; }, function(){ return d; });""")
src = pl.sub(src, """    (d.crew || []).forEach(function(p){
      rows.push({ k:'out', id:p.id, crew:true,""",
"""    /* 1492: a crew's bills on this job are its labor cost; a check linked to a bill is money out, not a second cost */
    (d.cinv || []).forEach(function(b){
      rows.push({ k:'bill', id:b.id, crewBill:true, raw:{ file_bucket:b.file_bucket, file_path:b.file_path },
        title: 'Crew bill · ' + (crewName[b.crew_id] || 'crew') + (b.invoice_number ? ' · #' + b.invoice_number : ''),
        when: jpDay(b.invoice_date || b.created_at), amt: Number(b.total) || 0,
        sortDay: String(b.invoice_date || b.created_at || ''), sortAt: String(b.created_at || '') });
    });
    (d.crew || []).forEach(function(p){
      rows.push({ k:'out', id:p.id, crew:true, linked: !!(d.linked && d.linked[p.id]),""")
src = pl.sub(src, """      if(r.crew) out.push({ k:'cost', id:r.id, title: r.title.replace(/^Crew · /, ''), tag:'LABOR', kind:'labor', fromCrews:true,
        when: r.when, entered:'', by:'from Crews', amt: r.amt, sortDay: r.sortDay, sortAt: r.sortAt });""",
"""      if(r.crew && !r.linked) out.push({ k:'cost', id:r.id, title: r.title.replace(/^Crew · /, ''), tag:'LABOR', kind:'labor', fromCrews:true,
        when: r.when, entered:'', by:'from Crews', amt: r.amt, sortDay: r.sortDay, sortAt: r.sortAt });
      if(r.crewBill) out.push({ k:'cost', id:r.id, raw:r.raw, title: r.title, tag:'CREW BILL', kind:'labor', fromCrews:true,   /* 1492 */
        when: r.when, entered:'', by:'from Crews · invoice', amt: r.amt, sortDay: r.sortDay, sortAt: r.sortAt });""")

src = pl.sub(src, "      : rows.filter(function(r){ return r.k !== 'cost'; }).concat(rows.filter(function(r){ return r.k === 'cost'; })).sort(sorter);",
             "      : rows.filter(function(r){ return r.k !== 'cost' && r.k !== 'bill'; }).concat(rows.filter(function(r){ return r.k === 'cost'; })).sort(sorter);   /* 1492: an unpaid bill is not money out */")

src = pl.sub(src, 'v2026-11-27 build 1491', 'v2026-11-27 build 1492')
pl.write_atomic('index_v1492.html', src)
pl.assert_in('index_v1492.html', '/* ── 1492: Invoices — what a crew BILLED')
pl.assert_in('index_v1492.html', "if(f.crewId && admin()){ return applyCrewBill(f, amt); }   /* 1492 */")
print('patched')
