"""Build 1357 — line items on an invoice, editable; EXTRA lines add to the job (Theo picked option 1).
Theo: "can you make it to where we can add line items to invoices? Make it editable as well."
- invoice_lines.sql (APPLIED first): inspection_reports.inv_lines jsonb + extra_total numeric.
- A "Line items" button on the job's invoice card opens a sheet: description, qty, price, EXTRA.
  It starts from the job's own numbers: the estimate behind the signed contract (or the accepted
  estimate) line by line, an adjustment line if the estimate carried a discount, else one line per
  signed contract; plus the manual job value and each signed change order. Lines can be changed,
  added and removed at any time.
- Plain lines are the breakdown and never move the money; the sheet says so when they do not add up
  to the job. An EXTRA line raises the job value and the balance, like a signed change order:
  jobFinance() here, owedOn() in api/pay.js + api/share.js, and api/remind.js all add extra_total.
- Saving writes the lines into the invoice page (an ITEMS table above the SUMMARY, between
  <!--invlines--> markers), inv_lines, extra_total and the invoice's stored total. Create invoice
  now writes the starting lines into a new invoice before it opens.
No new scroll-lock writer, no new body observer."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
import patch_lib as pl
path = sys.argv[1] if len(sys.argv) > 1 else 'index.html'
s = open(path, encoding='utf-8').read()
def one(old, new):
    global s
    n = s.count(old); assert n == 1, (n, old[:90]); s = s.replace(old, new)

# 1. the list carries extra_total (jobFinance reads it from cacheRows)
one("select('id,title,project,project_id,status,sent_at,share_token,total,signed_at,created_at,updated_at,created_by')",
    "select('id,title,project,project_id,status,sent_at,share_token,total,signed_at,created_at,updated_at,created_by,extra_total')")

# 2. jobFinance: an invoice's EXTRA lines add to the job
one("  if(coAdd > 0){ value += coAdd;",
    """  /* 1357: an invoice's EXTRA lines add to the job, like a signed change order (owedOn() and remind.js too) */
  cacheRows.forEach(function(r){
    if(r.project_id === pr.id && /^invoice/i.test((r.title || '').trim()) && Number(r.extra_total) > 0) coAdd += Number(r.extra_total);
  });
  if(coAdd > 0){ value += coAdd;""")

# 3. new invoices carry the markers where the ITEMS table goes
one("""  '<div class="secthead">SUMMARY</div>' +""",
    """  '<!--invlines--><!--/invlines-->' +   /* 1357: the invoice's line items are written here */
  '<div class="secthead">SUMMARY</div>' +""")

# 4. Create invoice writes the starting lines before the invoice opens
one("""    await reload();
    await openEditor(id);
    crTell('Invoice ' + num""",
"""    /* 1357: start the invoice with the job's own lines (never blocks the invoice) */
    try{ if(window.CardinalInvLines) await window.CardinalInvLines.seed(pr, id); }catch(_sl){}
    await reload();
    await openEditor(id);
    crTell('Invoice ' + num""")

# 5. the invoice card: Line items
one("""    var sendRow = inv ? '<div class="crji-sendrow\"""",
"""    if(inv) more += B('', 'data-inv-lines', IC_DOC + 'Line items');   /* 1357 */
    var sendRow = inv ? '<div class="crji-sendrow\"""")
one("""    if((t = e.target.closest('[data-inv-open]'))){""",
"""    if(_et && (t = _et.closest('[data-inv-lines]'))){ var pli = prById(t.getAttribute('data-inv-lines')); var ivl = invoiceFor(t.getAttribute('data-inv-lines')); if(pli && ivl && window.CardinalInvLines) window.CardinalInvLines.open(pli, ivl.id); return; }   /* 1357 */
    if((t = e.target.closest('[data-inv-open]'))){""")

# 6. the sheet
BLOCK = r'''<style id="cr-invl-styles">
/* 1357: the invoice line-items sheet. The change-order sheet's shape; own tokens with literal fallbacks; dark here, light twin below. */
#cr-invl-sheet{
  --il-sheet:#141619; --il-ink:#f2f4f7; --il-dim:#c3cbd5; --il-line:#2a2e35; --il-well:#1b1f24; --il-red:#C8202E; --il-due:#f08a90; --il-ex:#7fd1a8;
  position:fixed; inset:0; z-index:12000; display:none;
  font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;
}
:root[data-theme="rb-light"] #cr-invl-sheet{
  --il-sheet:#FFFFFF; --il-ink:#0F172A; --il-dim:#334155; --il-line:#E2E8F0; --il-well:#F8FAFC; --il-due:#B91C1C; --il-ex:#166534;
}
#cr-invl-sheet.open{display:block;}
#cr-invl-sheet .il-scrim{position:absolute; inset:0; background:rgba(0,0,0,.62);}
#cr-invl-sheet .il-box{position:absolute; left:0; right:0; bottom:0; max-height:92vh; overflow:auto; box-sizing:border-box;
  background:var(--il-sheet,#141619); color:var(--il-ink,#f2f4f7); border-radius:18px 18px 0 0; padding:16px 16px 24px;
  max-width:640px; margin:0 auto;}
#cr-invl-sheet .il-h{font-size:18px; font-weight:800; margin:0 0 2px;}
#cr-invl-sheet .il-sub{font-size:14px; color:var(--il-dim,#c3cbd5); margin:0 0 12px;}
#cr-invl-sheet .il-head{display:grid; grid-template-columns:72px 1fr 92px 44px; gap:8px; font-size:12px; font-weight:800; letter-spacing:.04em;
  text-transform:uppercase; color:var(--il-dim,#c3cbd5); margin:6px 0 4px;}
#cr-invl-sheet .il-row{display:grid; grid-template-columns:72px 1fr 92px 44px; grid-template-areas:"d d d d" "q p x r"; gap:6px 8px;
  padding:10px 0; border-bottom:1px solid var(--il-line,#2a2e35);}
#cr-invl-sheet .il-row.ex{box-shadow:inset 3px 0 0 var(--il-ex,#7fd1a8); padding-left:10px;}
#cr-invl-sheet .il-row [data-il-d]{grid-area:d;} #cr-invl-sheet .il-row [data-il-q]{grid-area:q;}
#cr-invl-sheet .il-row [data-il-p]{grid-area:p;} #cr-invl-sheet .il-row [data-il-x]{grid-area:x;} #cr-invl-sheet .il-row [data-il-del]{grid-area:r;}
#cr-invl-sheet input{width:100%; box-sizing:border-box; font:inherit; font-size:15px; min-height:44px; min-width:0;
  color:var(--il-ink,#f2f4f7); background:var(--il-well,#1b1f24); border:1px solid var(--il-line,#2a2e35); border-radius:10px; padding:10px 12px;}
#cr-invl-sheet .il-btn{display:inline-flex; align-items:center; justify-content:center; min-height:44px; min-width:44px; padding:8px 12px;
  border-radius:10px; border:1px solid var(--il-line,#2a2e35); background:transparent; color:var(--il-ink,#f2f4f7);
  font:inherit; font-size:14px; font-weight:700; cursor:pointer;}
#cr-invl-sheet .il-btn.primary{background:var(--il-red,#C8202E); border-color:var(--il-red,#C8202E); color:#fff;}
#cr-invl-sheet .il-btn[disabled]{opacity:.45; cursor:default;}
#cr-invl-sheet .il-btn.xon{border-color:var(--il-ex,#7fd1a8); color:var(--il-ex,#7fd1a8); box-shadow:inset 0 0 0 1px var(--il-ex,#7fd1a8);}
#cr-invl-sheet .il-sum{display:grid; grid-template-columns:1fr auto; gap:4px 12px; font-size:15px; margin:12px 0 0;}
#cr-invl-sheet .il-sum b{text-align:right;}
#cr-invl-sheet .il-sum .ex{color:var(--il-ex,#7fd1a8);}
#cr-invl-sheet .il-sum .tot{font-size:18px; font-weight:800; padding-top:6px; border-top:1px solid var(--il-line,#2a2e35);}
#cr-invl-sheet .il-note{font-size:14px; color:var(--il-dim,#c3cbd5); margin-top:8px;}
#cr-invl-sheet .il-why{font-size:14px; color:var(--il-due,#f08a90); margin-top:8px; min-height:18px;}
#cr-invl-sheet .il-foot{display:flex; gap:8px; margin-top:14px;}
#cr-invl-sheet .il-foot .il-btn{flex:1 1 0;}
</style>
<script id="cr-invl-script">
/* 1357: line items on an invoice. See patch_1357.py for the why. */
(function(){
  'use strict';
  var ilPr = null, ilInv = null, ilLines = [], ilBusy = false, ilBase = 0, ilOther = 0, ilLoading = false;
  function ilQ(id){ return document.getElementById(id); }
  function ilEsc(s){ return String(s == null ? '' : s).replace(/[<>&"']/g, function(c){ return { '<':'&lt;', '>':'&gt;', '&':'&amp;', '"':'&quot;', "'":'&#39;' }[c]; }); }
  function ilR(n){ return Math.round((Number(n) || 0) * 100) / 100; }
  function ilUsd(n){ var v = ilR(n); return (v < 0 ? '−$' : '$') + Math.abs(v).toLocaleString('en-US', { minimumFractionDigits:2, maximumFractionDigits:2 }); }
  function ilNum(v){ var n = parseFloat(String(v == null ? '' : v).replace(/[^0-9.\-]/g, '')); return isFinite(n) ? n : 0; }
  function ilAmt(l){ return ilR(ilNum(l.q) * ilNum(l.p)); }
  function ilQty(n){ var v = Number(n) || 0; return (Math.round(v) === v) ? String(v) : String(Math.round(v * 100) / 100); }
  function ilRows(pid){ return (typeof cacheRows !== 'undefined' ? cacheRows : []).filter(function(r){ return r && r.project_id === pid; }); }
  /* the EXTRA lines on this job's invoices, except one */
  function ilExtras(pid, except){
    return ilR(ilRows(pid).reduce(function(a, r){
      return a + ((r.id !== except && /^invoice/i.test(String(r.title || '').trim())) ? (Number(r.extra_total) || 0) : 0);
    }, 0));
  }
  function ilFilled(l){ return !!(String(l.d || '').trim() || String(l.q || '').trim() || String(l.p || '').trim()); }
  function ilProblem(){
    var used = ilLines.filter(ilFilled);
    if(!used.length) return 'Add at least one line.';
    for(var i = 0; i < used.length; i++){
      var l = used[i];
      if(!String(l.d || '').trim()) return 'Every line needs a description.';
      if(!(ilNum(l.q) > 0)) return 'Every line needs a quantity above 0.';
      if(l.x && !(ilNum(l.p) > 0)) return 'An extra needs a price above $0.';
    }
    return '';
  }
  function ilClean(){
    return ilLines.filter(ilFilled).map(function(l){
      return { d:String(l.d || '').trim(), q:ilR(ilNum(l.q)), p:ilR(ilNum(l.p)), x:!!l.x };
    });
  }
  function ilSums(lines){
    var b = 0, x = 0;
    lines.forEach(function(l){ var a = ilAmt(l); if(l.x) x += a; else b += a; });
    return { b:ilR(b), x:ilR(x) };
  }

  /* the job's own lines: the estimate behind the contract (or the accepted one), signed contracts,
     the manual job value, signed change orders. Plain lines only; nothing here moves the money. */
  async function ilStart(pr){
    var out = [], rows = ilRows(pr.id), est = null;
    var signed = rows.filter(function(r){ return /^contract/i.test(String(r.title || '').trim()) && r.signed_at && Number(r.total) > 0; });
    try{
      var cx = window.sb || window.supa;
      var res = cx ? await cx.from('estimates').select('id,status,archived,line_items,itemized,total,contract_doc_id').eq('project_id', pr.id) : null;
      var ests = ((res && res.data) || []).filter(function(e){ return e && !e.archived; });
      var sids = signed.map(function(r){ return r.id; });
      est = ests.filter(function(e){ return e.contract_doc_id && sids.indexOf(e.contract_doc_id) !== -1; })[0]
         || ests.filter(function(e){ return /^(accepted|signed)$/i.test(String(e.status || '')); })[0] || null;
    }catch(_e){ est = null; }
    if(est && Array.isArray(est.line_items)){
      est.line_items.forEach(function(l){
        if(!l) return;
        var flat = l.flat === true || est.itemized === false;
        var qv = flat ? 1 : (Number(l.qty) || 0), pv = flat ? (Number(l.amount) || 0) : (Number(l.unit_price) || 0);
        if(!(qv > 0) || !pv) return;
        out.push({ d:String(l.name || l.description || 'Item').trim() || 'Item', q:qv, p:ilR(pv), x:false });
      });
      if(out.length && Number(est.total) > 0){
        var diff = ilR(Number(est.total) - ilSums(out).b);
        if(Math.abs(diff) >= 0.01) out.push({ d:diff < 0 ? 'Discount' : 'Adjustment', q:1, p:diff, x:false });
      }
    }
    if(!out.length) signed.forEach(function(r){ out.push({ d:String(r.title || 'Contract').trim(), q:1, p:ilR(r.total), x:false }); });
    if(!out.length && est && Number(est.total) > 0) out.push({ d:'Work as estimated', q:1, p:ilR(est.total), x:false });
    var mv = 0; try{ mv = Number(parseCkAll(pr).manual_value) || 0; }catch(_m){}
    if(mv > 0) out.push({ d:'Additional work', q:1, p:ilR(mv), x:false });
    rows.forEach(function(r){
      if(/^change order/i.test(String(r.title || '').trim()) && r.signed_at && Number(r.total) > 0){
        var dd = ''; try{ dd = new Date(r.signed_at).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' }); }catch(_d){}
        out.push({ d:'Change order' + (dd ? ' (signed ' + dd + ')' : ''), q:1, p:ilR(r.total), x:false });
      }
    });
    return out;
  }

  /* the ITEMS table written into the invoice page — the client reads and prints this */
  function ilTable(lines){
    if(!lines.length) return '<!--invlines--><!--/invlines-->';
    var th = 'padding:6px;border-bottom:2px solid #1b1b1b;font-size:12px;letter-spacing:.04em;';
    var td = 'padding:8px 6px;border-bottom:1px solid #ddd;vertical-align:top;';
    var ilRowHtml = function(l){
      return '<tr><td style="' + td + '">' + ilEsc(l.d) + (l.x ? ' <span style="font-size:11px;font-weight:800;color:#166534;border:1px solid #166534;border-radius:4px;padding:0 4px;">ADDED</span>' : '') + '</td>'
        + '<td style="' + td + 'text-align:right;">' + ilQty(l.q) + '</td>'
        + '<td style="' + td + 'text-align:right;">' + ilUsd(l.p) + '</td>'
        + '<td style="' + td + 'text-align:right;font-weight:700;">' + ilUsd(ilAmt(l)) + '</td></tr>';
    };
    var plain = lines.filter(function(l){ return !l.x; }), extra = lines.filter(function(l){ return l.x; });
    var s = ilSums(lines);
    var h = '<!--invlines--><div class="secthead">ITEMS</div>'
      + '<table id="invLines" style="width:100%;border-collapse:collapse;margin:4px 0 14px;font-size:13.5px;">'
      + '<tr><th style="' + th + 'text-align:left;">Description</th><th style="' + th + 'text-align:right;">Qty</th>'
      + '<th style="' + th + 'text-align:right;">Price</th><th style="' + th + 'text-align:right;">Amount</th></tr>'
      + plain.map(ilRowHtml).join('');
    if(extra.length){
      h += '<tr><td colspan="4" style="padding:10px 6px 4px;font-weight:800;font-size:12px;letter-spacing:.04em;">ADDED WORK</td></tr>'
        + extra.map(ilRowHtml).join('')
        + '<tr><td colspan="3" style="padding:8px 6px;text-align:right;font-weight:800;">Added work total</td>'
        + '<td style="padding:8px 6px;text-align:right;font-weight:800;">' + ilUsd(s.x) + '</td></tr>';
    }
    return h + '</table><!--/invlines-->';
  }
  function ilWrite(html, block){
    var re = /<!--invlines-->[\s\S]*?<!--\/invlines-->/;
    if(re.test(html)) return html.replace(re, function(){ return block; });
    var k = html.indexOf('<div class="secthead">SUMMARY</div>');
    if(k !== -1) return html.slice(0, k) + block + html.slice(k);
    var b = html.lastIndexOf('</body>');
    return b !== -1 ? html.slice(0, b) + block + html.slice(b) : html + block;
  }
  async function ilStore(pr, invId, lines){
    var row = await db.get(invId);
    var html = (row && row.html) || '';
    if(!html) throw new Error('the invoice page could not be read');
    var s = ilSums(lines);
    var fields = { html:ilWrite(html, ilTable(lines)), inv_lines:lines, extra_total:s.x };
    /* the invoice's stored total is the job's, extras included (A/R and the pay link's last resort read it) */
    var base = ilR((Number(jobFinance(pr).value) || 0) - ilExtras(pr.id, null));
    fields.total = ilR(base + ilExtras(pr.id, invId) + s.x);
    await db.update(invId, fields);
    return s;
  }

  function ilEnsure(){
    var m = ilQ('cr-invl-sheet'); if(m) return m;
    m = document.createElement('div'); m.id = 'cr-invl-sheet';
    m.innerHTML = '<div class="il-scrim" data-il-close="1"></div><div class="il-box" role="dialog" aria-modal="true" aria-labelledby="ilTitle">'
      + '<div class="il-h" id="ilTitle">Invoice line items</div><div class="il-sub" id="ilSub"></div>'
      + '<div class="il-head" aria-hidden="true"><span>Qty</span><span>Price</span><span></span><span></span></div>'
      + '<div id="ilLines"></div>'
      + '<button class="il-btn" type="button" data-il-add="1">+ Add line</button>'
      + '<div class="il-sum" id="ilSum"></div>'
      + '<div class="il-note">Plain lines show the client what the job is made of. Mark a line <b>Extra</b> when it is new work: it adds to what the client owes, everywhere.</div>'
      + '<div class="il-why" id="ilWhy"></div>'
      + '<div class="il-foot"><button class="il-btn" type="button" data-il-close="1">Cancel</button>'
      +   '<button class="il-btn primary" type="button" id="ilSave" disabled>Save lines</button></div>'
      + '</div>';
    document.body.appendChild(m);
    m.addEventListener('click', ilClick);
    m.addEventListener('input', ilInput);
    return m;
  }
  function ilLinesHtml(){
    return ilLines.map(function(l, i){
      return '<div class="il-row' + (l.x ? ' ex' : '') + '">'
        + '<input data-il-d="' + i + '" placeholder="What (e.g. extra sheets of decking)" aria-label="Description" value="' + ilEsc(l.d) + '">'
        + '<input data-il-q="' + i + '" inputmode="decimal" placeholder="Qty" aria-label="Quantity" value="' + ilEsc(l.q) + '">'
        + '<input data-il-p="' + i + '" inputmode="decimal" placeholder="Price $" aria-label="Price" value="' + ilEsc(l.p) + '">'
        + '<button class="il-btn' + (l.x ? ' xon' : '') + '" type="button" data-il-x="' + i + '" aria-pressed="' + (l.x ? 'true' : 'false') + '">Extra</button>'
        + '<button class="il-btn" type="button" data-il-del="' + i + '" aria-label="Remove line">×</button></div>';
    }).join('');
  }
  function ilPaint(full){
    if(full){ var L = ilQ('ilLines'); if(L) L.innerHTML = ilLoading ? '<div class="il-note">Loading the job’s lines…</div>' : ilLinesHtml(); }
    var lines = ilClean(), s = ilSums(lines), prob = ilLoading ? '' : ilProblem();
    var after = ilR(ilBase + ilOther + s.x);
    var sum = ilQ('ilSum');
    if(sum) sum.innerHTML = '<span>Lines</span><b>' + ilUsd(s.b) + '</b>'
      + '<span class="ex">Extras (added to the job)</span><b class="ex">' + ilUsd(s.x) + '</b>'
      + '<span class="tot">Job total after saving</span><b class="tot">' + ilUsd(after) + '</b>';
    var sv = ilQ('ilSave'); if(sv instanceof HTMLButtonElement) sv.disabled = ilBusy || ilLoading || !!prob;
    var w = ilQ('ilWhy');
    if(w){
      var off = ilR(s.b - ilR(ilBase + ilOther));
      w.textContent = ilBusy ? 'Saving…' : (prob || (lines.length && Math.abs(off) >= 0.01
        ? 'The plain lines add to ' + ilUsd(s.b) + ', and the job is ' + ilUsd(ilBase + ilOther) + ' before this invoice’s extras. The client still owes the job’s amount.'
        : ''));
    }
  }
  function ilRowCls(i){
    var r = document.querySelectorAll('#ilLines .il-row')[i];
    if(r) r.classList.toggle('ex', !!(ilLines[i] && ilLines[i].x));
  }
  function ilInput(e){
    var el = e.target instanceof HTMLInputElement ? e.target : null; if(!el) return;
    var vd = el.getAttribute('data-il-d'), vq = el.getAttribute('data-il-q'), vp = el.getAttribute('data-il-p');
    if(vd !== null && ilLines[+vd]) ilLines[+vd].d = el.value;
    if(vq !== null && ilLines[+vq]) ilLines[+vq].q = el.value;
    if(vp !== null && ilLines[+vp]) ilLines[+vp].p = el.value;
    ilPaint(false);
  }
  function ilClick(e){
    var el = e.target instanceof Element ? e.target : null; if(!el) return;
    var t;
    if(el.closest('[data-il-close]')){ ilClose(); return; }
    if(ilLoading) return;
    if(el.closest('[data-il-add]')){ ilLines.push({ d:'', q:'1', p:'', x:false }); ilPaint(true); var ins = document.querySelectorAll('#ilLines [data-il-d]'); var last = ins[ins.length - 1]; if(last instanceof HTMLInputElement) last.focus(); return; }
    if((t = el.closest('[data-il-del]'))){ ilLines.splice(+t.getAttribute('data-il-del'), 1); if(!ilLines.length) ilLines.push({ d:'', q:'1', p:'', x:false }); ilPaint(true); return; }
    if((t = el.closest('[data-il-x]'))){
      var i = +t.getAttribute('data-il-x'); if(!ilLines[i]) return;
      ilLines[i].x = !ilLines[i].x;
      t.classList.toggle('xon', ilLines[i].x); t.setAttribute('aria-pressed', ilLines[i].x ? 'true' : 'false'); ilRowCls(i);
      ilPaint(false); return;
    }
    if(el.closest('#ilSave')){ ilSave(); return; }
  }
  function ilClose(){ var m = ilQ('cr-invl-sheet'); if(m) m.classList.remove('open'); ilPr = null; ilInv = null; ilBusy = false; }
  async function ilOpen(pr, invId){
    if(!pr || !invId) return;
    var m = ilEnsure();
    ilPr = pr; ilInv = invId; ilBusy = false; ilLoading = true; ilLines = [];
    ilBase = ilR((Number(jobFinance(pr).value) || 0) - ilExtras(pr.id, null));
    ilOther = ilExtras(pr.id, invId);
    var inv = ilRows(pr.id).filter(function(r){ return r.id === invId; })[0];
    var sub = ilQ('ilSub'); if(sub) sub.textContent = (pr.name || 'Client') + (inv && inv.title && /#[\w-]+/.test(inv.title) ? ' · ' + inv.title.match(/#[\w-]+/)[0] : '');
    m.classList.add('open');
    ilPaint(true);
    var saved = null;
    try{ var row = await db.get(invId); saved = row && Array.isArray(row.inv_lines) ? row.inv_lines : null; }catch(_g){ saved = null; }
    var lines = (saved && saved.length) ? saved : await ilStart(pr);
    if(ilInv !== invId) return;   /* closed or reopened meanwhile */
    ilLines = lines.map(function(l){ return { d:String(l.d || ''), q:String(l.q == null ? '' : l.q), p:String(l.p == null ? '' : l.p), x:!!l.x }; });
    if(!ilLines.length) ilLines.push({ d:'', q:'1', p:'', x:false });
    ilLoading = false;
    ilPaint(true);
  }
  async function ilSave(){
    if(ilBusy || ilLoading || !ilPr || !ilInv || ilProblem()) return;
    var pr = ilPr, invId = ilInv, lines = ilClean();
    ilBusy = true; ilPaint(false);
    try{
      var s = await ilStore(pr, invId, lines);
      try{ if(typeof auditLog === 'function') auditLog('money', 'Invoice lines saved (' + lines.length + ')' + (s.x ? ' — extras ' + ilUsd(s.x) : ''), pr.id); }catch(_a){}
      ilClose();
      try{ if(typeof reload === 'function') await reload(); }catch(_r){}
      try{ if(typeof renderAcxOverview === 'function' && window.currentProject) renderAcxOverview(); }catch(_o){}
      try{ if(window.crToastOk) window.crToastOk('Invoice lines saved' + (s.x ? ' — ' + ilUsd(s.x) + ' added to the job' : '')); }catch(_t){}
    }catch(err){
      ilBusy = false; ilPaint(false);
      if(typeof showError === 'function') showError('Could not save the invoice lines: ' + ((err && err.message) || err));
    }
  }
  /* a new invoice starts with the job's lines; never throws into Create invoice */
  async function ilSeed(pr, invId){
    try{ var lines = await ilStart(pr); if(lines.length) await ilStore(pr, invId, lines); }catch(_s){}
  }
  window.CardinalInvLines = Object.assign(window.CardinalInvLines || {}, { open:ilOpen, close:ilClose, seed:ilSeed });
})();
</script>

'''
one('\n<script id="cr-orv-script">', '\n' + BLOCK + '<script id="cr-orv-script">')

one(">v2026-10-16 build 1356<button", ">v2026-10-16 build 1357<button")
one("""  { b: 1356, d:'2026-10-16',""",
"""  { b: 1357, d:'2026-10-16', t:'Line items on invoices', s:'An invoice now lists its line items, and you can change them. Tap Line items on the job’s invoice card: it starts with the lines from the estimate or contract, plus any signed change order, and you can edit a description, quantity or price, add a line or remove one. Mark a line Extra when it is new work (extra sheets of decking, say): it is added to what the client owes on the job page, the pay link and the reminders. Plain lines only describe the job and never change the amount owed. A new invoice starts with the job’s lines already filled in.' },
  { b: 1356, d:'2026-10-16',""")
pl.write_atomic(path, s)
print('ok 1357')
