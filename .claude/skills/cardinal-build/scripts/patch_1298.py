"""Build 1298 — receipts (Theo's pick 3, 11 Oct).

The crew photographs the receipt, the office types the amount, and the money and
the proof sit on the same line.
  · Punch-out card: "Receipts" with an Add receipt button (camera). No dollar
    figure on the card — Production carries no money (settled).
  · Job Menu → Files: a receipt is an ordinary job file named "Receipt <stamp>",
    tagged Needs amount / Priced (no dollars — Files is visible to the crew).
  · Payments: "N receipts need an amount" at the top; Add amount turns one into an
    Additional job expense row that points at it (payments[].receipt = file id).
    Expense rows show their receipt, or Attach receipt when they have none.

Storage is the existing job-file path (db.create 'File: …', {file:1,…}), so the
Files viewer, rename and delete all work unchanged. The photo is shrunk to 1600px
JPEG first (a phone photo base64-encoded is ~7 MB in a row). No SQL.
Linking is by id from the payment row, so pricing never rewrites the file.

Usage: python3 patch_1298.py [index.html]
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import patch_lib as pl
PATH = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../../../index.html')
src = pl.load(PATH)

# ── helpers + export, before addJobFiles
A = "async function addJobFiles(files){"
B = r"""/* 1298: receipts are job files named "Receipt …". A payment row prices one by
   pointing at its id (payments[].receipt), so the file itself never changes. */
function isReceiptTitle(t){ return /^file:\s*receipt\b/i.test(String(t || '').trim()); }
function rcptPriced(proj){
  var s = {}; ((parseCkAll(proj) || {}).payments || []).forEach(function(p){ if(p && p.receipt) s[p.receipt] = 1; });
  return s;
}
function rcptFor(proj){
  return cacheRows.filter(function(r){ return proj && r.project_id === proj.id && isReceiptTitle(r.title); })
    .sort(function(a, b){ return String(b.created_at || '').localeCompare(String(a.created_at || '')); });
}
function rcptShrink(f){
  return new Promise(function(res){
    if(!f || !/^image\//.test(f.type || '')) return res(f);
    var u = URL.createObjectURL(f), im = new Image();
    im.onload = function(){
      try{
        var k = Math.min(1, 1600 / Math.max(im.naturalWidth || 1, im.naturalHeight || 1));
        var c = document.createElement('canvas'); c.width = Math.round(im.naturalWidth * k); c.height = Math.round(im.naturalHeight * k);
        c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
        c.toBlob(function(b){ URL.revokeObjectURL(u); res(b || f); }, 'image/jpeg', 0.8);
      }catch(_){ URL.revokeObjectURL(u); res(f); }
    };
    im.onerror = function(){ URL.revokeObjectURL(u); res(f); };
    im.src = u;
  });
}
async function addReceipt(proj, file, meta){
  if(!proj || !file) throw new Error('no job or no photo');
  var b = await rcptShrink(file);
  if(b.size > 10 * 1024 * 1024) throw new Error('that photo is over 10 MB');
  var d = new Date();
  var name = 'Receipt ' + (d.getMonth() + 1) + '-' + d.getDate() + ' ' + d.toTimeString().slice(0, 5).replace(':', '.') + '.jpg';
  var dataUrl = await new Promise(function(res, rej){
    var rd = new FileReader(); rd.onload = function(){ res(rd.result); }; rd.onerror = function(){ rej(new Error('could not read the photo')); }; rd.readAsDataURL(b);
  });
  var payload = JSON.stringify({ file: 1, name: name, mime: b.type || 'image/jpeg', size: b.size, data: dataUrl, receipt: 1,
    by: (currentUser && currentUser.email) || null, punch: (meta && meta.punch) || null });
  var id = await db.create('File: ' + name, payload, proj.name, proj.id);
  try{ await reload(); }catch(_){}
  return id;
}
window.CardinalReceipts = Object.assign(window.CardinalReceipts || {}, {
  add: function(pid, file, meta){
    var proj = (cacheProjects || []).filter(function(p){ return String(p.id) === String(pid); })[0];
    return addReceipt(proj, file, meta);
  },
  count: function(pid){ return cacheRows.filter(function(r){ return String(r.project_id) === String(pid) && isReceiptTitle(r.title); }).length; }
});
async function addJobFiles(files){"""
src = pl.sub(src, A, B)

# ── Files: tag receipts (no dollars — the crew reads Files)
F = "    var nm = fileDocName(r.title);   /* 644: was a bare ^file: strip */"
src = pl.sub(src, F, F + "\n    var rc = isReceiptTitle(r.title) ? (rcptPriced(currentProject)[r.id] ? '<span class=\"jdrc ok\" data-cr-1298>Priced</span>' : '<span class=\"jdrc\" data-cr-1298>Needs amount</span>') : '';   /* 1298 */")
G = "      '<span style=\"flex:1;cursor:pointer;font-weight:700;\" data-jdopen=\"' + r.id + '\">' + esc(nm) +"
src = pl.sub(src, G, "      '<span style=\"flex:1;cursor:pointer;font-weight:700;\" data-jdopen=\"' + r.id + '\">' + esc(nm) + rc +")

# ── Payments: needs-amount block, receipt chips, attach
H = "    '<div class=\"paynet\">Job Net"
src = pl.sub(src, "  document.getElementById('paySummary').innerHTML =\n    PAY_SECTIONS.map(function(sec){", "  document.getElementById('paySummary').innerHTML = rcptNeedHtml() +   /* 1298: receipts waiting, at the top */\n    PAY_SECTIONS.map(function(sec){")
I = "      '<button class=\"chipbtn paydel\" data-pi=\"' + i + '\">&#10005;</button></div>';"
I2 = """      (p.receipt ? '<button class="chipbtn" data-rcptopen="' + esc(String(p.receipt)) + '" type="button">Receipt</button>'
        : (p.dir === 'exp' ? '<button class="chipbtn" data-rcptattach="' + i + '" type="button">Attach receipt</button>' : '')) +   /* 1298 */
      '<button class="chipbtn paydel" data-pi="' + i + '">&#10005;</button></div>';"""
src = pl.sub(src, I, I2)
J = "function openPaymentsPage(){"
J2 = r"""/* 1298: receipts waiting for the office to type an amount */
function rcptNeedHtml(){
  var pr = rcptPriced(currentProject), need = rcptFor(currentProject).filter(function(r){ return !pr[r.id]; });
  if(!need.length) return '';
  return '<div class="paysec payrcpt" data-cr-1298><div class="payhead"><span>' + need.length + (need.length === 1 ? ' receipt needs' : ' receipts need') + ' an amount</span></div>' +
    need.map(function(r){
      return '<div class="payrow"><span data-rcptopen="' + r.id + '" style="cursor:pointer;">' + esc(fileDocName(r.title)) +
        (r.created_by ? ' · ' + esc(rptRepName(r.created_by) || r.created_by) : '') + '</span>' +
        '<button class="chipbtn" data-rcptamt="' + r.id + '" type="button">Add amount</button></div>';
    }).join('') + '</div>';
}
async function rcptPrice(id){
  if(!currentProject) return;
  var v = prompt('Amount on this receipt ($)');
  if(v == null) return;
  var amt = parseFloat(String(v).replace(/[$,\s]/g, ''));
  if(!(amt > 0)){ crTell('Enter the amount, like 184.20'); return; }
  var row = cacheRows.filter(function(r){ return r.id === id; })[0];
  var log = (parseCkAll(currentProject).payments || []).slice();
  log.push({ dir: 'exp', amt: Math.round(amt * 100) / 100, note: 'Receipt' + (row && row.created_by ? ' · ' + (rptRepName(row.created_by) || row.created_by) : ''),
             at: new Date().toISOString(), by: (currentUser && currentUser.email) || null, receipt: id });
  try{
    await patchProjectCk(currentProject, { payments: log });
    renderPayments(); renderWorksheet(currentProject, jobFinance(currentProject));
  }catch(err){ showError('Could not save the amount: ' + (err.message || err)); }
}
function rcptAttach(i){
  var inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*'; inp.setAttribute('capture', 'environment');
  inp.onchange = async function(){
    var f = inp.files && inp.files[0]; if(!f || !currentProject) return;
    try{
      var id = await addReceipt(currentProject, f, null);
      var log = (parseCkAll(currentProject).payments || []).slice();
      if(!log[i]) return;
      log[i] = Object.assign({}, log[i], { receipt: id });
      await patchProjectCk(currentProject, { payments: log });
      renderPayments();
    }catch(err){ showError('Could not attach the receipt: ' + (err.message || err)); }
  };
  inp.click();
}
['paySummary', 'payLog'].forEach(function(mid){
  var m = document.getElementById(mid); if(!m) return;
  m.addEventListener('click', function(e){
    var tg = /** @type {HTMLElement} */ (e.target);
    var o = tg.closest('[data-rcptopen]'), a = tg.closest('[data-rcptamt]'), t = tg.closest('[data-rcptattach]');
    if(o){ e.stopPropagation(); openJobFile(o.getAttribute('data-rcptopen')); return; }
    if(a){ e.stopPropagation(); rcptPrice(a.getAttribute('data-rcptamt')); return; }
    if(t){ e.stopPropagation(); rcptAttach(parseInt(t.getAttribute('data-rcptattach'), 10)); }
  }, true);
});
function openPaymentsPage(){"""
src = pl.sub(src, J, J2)

# ── punch card: the Receipts section
K = "function truckHtml(){"
K2 = r"""/* 1298: receipts — the crew photographs it; the office prices it on Payments */
function rcptHtml(){
  if(it.status === 'done' && !(window.CardinalReceipts && window.CardinalReceipts.count(it.project_id))) return '';
  var n = window.CardinalReceipts ? window.CardinalReceipts.count(it.project_id) : 0;
  return '<div class="pksec" id="pkSecRcpt" data-cr-1298><div class="pkh">' + svg('list') + 'Receipts' +
    '<span class="rt"><b>' + n + '</b> on this job</span></div>' +
    '<button class="pkbtn pkrcpt" data-act="rcpt" type="button">' + svg('cam') + 'Add receipt</button>' +
    '<div class="pktk0">Saved to this job’s Files. The office adds the amount.</div></div>';
}
function rcptPick(){
  var inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*'; inp.setAttribute('capture', 'environment');
  inp.onchange = async function(){
    var f = inp.files && inp.files[0]; if(!f || !it || !window.CardinalReceipts) return;
    var id = it.id;
    try{ await window.CardinalReceipts.add(it.project_id, f, { punch: id }); outMsg = 'Receipt saved to the job’s Files.'; }
    catch(err){ outMsg = 'Could not save the receipt: ' + ((err && err.message) || err); }
    if(it && it.id === id){ lastSig = ''; render(); }
  };
  inp.click();
}
function truckHtml(){"""
src = pl.sub(src, K, K2)
src = pl.sub(src, "checklistHtml() + truckHtml() + photosHtml() + disp", "checklistHtml() + truckHtml() + rcptHtml() + photosHtml() + disp")
src = pl.sub(src, "descHtml() + checklistHtml() + truckHtml() + photosHtml();", "descHtml() + checklistHtml() + truckHtml() + rcptHtml() + photosHtml();")
W = "  q('[data-act=\"addtruck\"]', function(b){ b.onclick = addTruck; });\n"
src = pl.sub(src, W, W + "  q('[data-act=\"rcpt\"]', function(b){ b.onclick = rcptPick; });   /* 1298 */\n")

# ── the shared .tskrow (Files, Tasks, Payment log, Appointments, two lists): its ink
#    was the white-page #2b2b2b and read 1.3:1 on the dark ground. Edited at source onto
#    the --rbe-* pair, which flips with the theme; Insurance keeps its own override.
src = pl.sub(src, """.tskrow{display:flex;align-items:center;gap:10px;padding:8px 4px;border-bottom:1px solid #f0e8e2;
  font:600 13px 'Segoe UI',Arial,sans-serif;color:#2b2b2b;}
.tskrow small{color:#8a7a72;margin-left:auto;white-space:nowrap;}""", """.tskrow{display:flex;align-items:center;gap:10px;padding:8px 4px;border-bottom:1px solid var(--rbe-line,#f0e8e2);
  font:600 13px 'Segoe UI',Arial,sans-serif;color:var(--rbe-ink,#2b2b2b);}
.tskrow small{color:var(--rbe-mute,#8a7a72);margin-left:auto;white-space:nowrap;}""")
# ── CSS
C = "#cr-pk .pkvnone{ color:var(--pk-dim,#9aa2ae); }\n"
src = pl.sub(src, C, C + """/* 1298: the Add receipt button — an outline (Buttons A), the camera glyph beside it */
#cr-pk .pkrcpt{ display:inline-flex; align-items:center; gap:8px; margin:4px 0 2px; }
#cr-pk .pkrcpt svg{ width:16px; height:16px; }
""")
X = "<style id=\"cr-crew-styles\">"
src = pl.sub(src, X, """<style id="cr-rcpt-styles">
/* 1298: receipt tags in Files and the needs-amount block on Payments */
.jdrc{display:inline-block;margin-left:8px;padding:1px 8px;border-radius:20px;font:700 11px 'Segoe UI',Arial,sans-serif;vertical-align:2px;
  color:#f0a24a;border:1px solid rgba(240,162,74,.5);}
.jdrc.ok{color:#34d399;border-color:rgba(52,211,153,.45);}
:root[data-theme="rb-light"] .jdrc{color:#8a5500;border-color:rgba(138,85,0,.45);}
:root[data-theme="rb-light"] .jdrc.ok{color:#1f6b4a;border-color:rgba(31,107,74,.45);}
.paysec.payrcpt{border-color:rgba(240,162,74,.55);}
</style>
""" + X)

src = pl.sub(src, '">v2026-10-10 build 1297<button', '">v2026-10-11 build 1298<button')
src = pl.sub(src, "var CHANGELOG = [\n  { b: 1297,",
  "var CHANGELOG = [\n"
  "  { b: 1298, d: '2026-10-11', t: 'Receipts',\n"
  "    s: 'A punch-out card has an Add receipt button: the crew photographs the receipt and it is saved to the job\\u2019s Files, with no dollar amount on the card. On the job\\u2019s Payments page, receipts that still need an amount wait at the top; type the amount and it becomes an Additional job expense with its receipt attached. Older expense lines get an Attach receipt button, and Files marks each receipt as Needs amount or Priced.' },\n"
  "  { b: 1297,")
pl.write_atomic(PATH, src)
print('patched 1298')
