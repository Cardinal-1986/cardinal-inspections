"""Build 1405 — inspection reports on paper, and the Supplement Desk (23 Oct 2026 audit, round 9).
index.html
1. Opening a report from a list filled its blank fields from the checklist of WHICHEVER client was open last
   (window.currentProject), and closing saved it — another job's roof facts in this job's report. The report's
   own project is used now; no project of its own, no fill.
2. Print numbered the Contents heading as section 1, so every printed number ran one ahead of the Contents page.
   Only headings that carry a number are renumbered.
3. The cover page (min-height 246mm) overflowed Letter (≈237mm usable under the print margins), pushing Client
   Contact / Inspection Date / Report No. / Inspector to page 2. Print caps it at 226mm; new templates carry 230mm.
4. Save as PDF skipped the print compaction: the client's PDF carried every [placeholder], empty section and
   "[#]" page number that Print hides. It compacts like Print and restores after.
5. Print hid h2.sec.page-break (the estimate's "Terms" heading) with the divider rule (1402 fixed the share page).
supplement.html (SD_BUILD 1405)
6. Switching claims mixed two claims' photos, scope documents, filings and iTel: the loaders now drop a reply
   that arrives after another claim was opened.
7. The drafted letter was put in the page with innerHTML unfiltered: scripts, event handlers and javascript:
   links are stripped before it is shown or printed.
8. An inline-data photo (no storage file) could be picked as an item's evidence but is never carried by the
   letter; only stored photos are offered.
9. Print started before the letter's photos had loaded; it waits for them (up to 8 s).
api/supplement.js
10. A 503 / 429 from every Gemini rung never reached the OpenAI backup; it is tried once before giving up.
11. A non-JSON Gemini error body surfaced as raw parser text ("Unexpected token '<'"); it is treated as a failed
    rung."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
import patch_lib as pl
P = sys.argv[1] if len(sys.argv) > 1 else 'index.html'
Q = sys.argv[2] if len(sys.argv) > 2 else 'supplement.html'
R = sys.argv[3] if len(sys.argv) > 3 else 'api/supplement.js'
s = open(P, encoding='utf-8').read(); d = open(Q, encoding='utf-8').read(); a = open(R, encoding='utf-8').read()
def one(t, old, new, n=1):
    c = t.count(old); assert c == n, (c, old[:90]); return t.replace(old, new)

# 1
s = one(s, """        var _ck = (typeof getChecklist === 'function' && window.currentProject)
                    ? getChecklist(window.currentProject) : null;""",
"""        /* 1405: the REPORT's own job — currentProject is whichever client was open last, so a report opened
           from a list was filled (and saved) with another job's checklist */
        var _rpid = r && r.project_id;
        var _rpr = _rpid ? ((window.currentProject && String(window.currentProject.id) === String(_rpid))
                    ? window.currentProject
                    : (cacheProjects || []).find(function(p){ return String(p.id) === String(_rpid); })) : null;
        var _ck = (typeof getChecklist === 'function' && _rpr) ? getChecklist(_rpr) : null;""")
# 2
s = one(s, """  secs.forEach(function(h){
    var sp = h.querySelector('.num');
    if(!sp || h.getAttribute('data-emptysec')) return;
    num++;""",
"""  secs.forEach(function(h){
    var sp = h.querySelector('.num');
    if(!sp || h.getAttribute('data-emptysec')) return;
    /* 1405: the Contents heading carries a glyph, not a number — counting it put every section one ahead */
    if(!/^\\s*\\d+\\s*$/.test(sp.getAttribute('data-orignum') || sp.textContent)) return;
    num++;""")
# 3 + 5
s = one(s, """    '.page-break{display:none !important;}' +
    'h2.sec{break-after:avoid;}' +""",
"""    '.page-break:not(h2){display:none !important;}' +   /* 1405: the Terms heading is h2.sec.page-break */
    '.cover{min-height:226mm !important;}' +   /* 1405: 246mm overflowed Letter under these margins */
    'h2.sec{break-after:avoid;}' +""")
s = one(s, ".cover{min-height:246mm;display:flex;flex-direction:column;}", ".cover{min-height:230mm;display:flex;flex-direction:column;}", 2)
# 4
s = one(s, """  try{ ensurePrintFix(frame.contentDocument); }catch(_){}
  if(window.CardinalDownload) window.CardinalDownload.frame(frame, t);""",
"""  try{ ensurePrintFix(frame.contentDocument); }catch(_){}
  /* 1405: the same compaction Print applies — the PDF a client is sent carried every placeholder and empty section */
  var _dd = null; try{ _dd = /** @type {any} */ (frame).contentDocument; if(_dd) compactForPrint(_dd); }catch(_cp){}
  try{ if(window.CardinalDownload) window.CardinalDownload.frame(frame, t); }
  finally{ try{ if(_dd) restorePrintMarks(_dd); }catch(_rp){} }""")
s = one(s, ">v2026-10-23 build 1404<", ">v2026-10-23 build 1405<")
s = one(s, """  { b: 1404, d:'2026-10-23',""",
"""  { b: 1405, d:'2026-10-23', t:'Reports on paper and the Supplement Desk', s:'Opening a report from a list no longer fills it with the checklist of the last client you looked at. Printed section numbers match the Contents page, the cover page fits on one Letter page, and Save as PDF hides the empty sections and placeholders the way Print does. On the Supplement Desk, switching claims no longer mixes in the previous claim\\u2019s photos or documents, only photos the letter can carry can be attached as evidence, printing waits for the photos, and the analyst falls back to its backup when the main model is busy.' },
  { b: 1404, d:'2026-10-23',""")

# 6 — stale replies
d = one(d, """async function loadItel(claimId){
  S.itel = null;
  try{
    var r = await sb.from('itel_lab_reports')
      .select('control_number, verdict, match_product, mismatch_notes, report_date')
      .eq('claim_id', claimId).order('report_date', { ascending: false }).limit(1);
    if(!r.error && r.data && r.data.length){""",
"""async function loadItel(claimId){
  S.itel = null;
  try{
    var r = await sb.from('itel_lab_reports')
      .select('control_number, verdict, match_product, mismatch_notes, report_date')
      .eq('claim_id', claimId).order('report_date', { ascending: false }).limit(1);
    if(!sdStillClaim(claimId)) return;   /* 1405: another claim was opened meanwhile */
    if(!r.error && r.data && r.data.length){""")
d = one(d, """function kv(label, val){ return""",
"""/* 1405: a loader's reply that lands after another claim was opened is dropped, not painted onto it */
function sdStillClaim(claimId){ return !!(S.claim && String(S.claim.id) === String(claimId)); }
function sdStillProject(pid){ return !!(S.claim && String(S.claim.project_id) === String(pid)); }
function kv(label, val){ return""")
d = one(d, """    .eq('project_id', pid).ilike('title', 'Insurance Doc%').order('created_at', { ascending: false }).limit(20);
  S.scopeDocs = r.data || [];""",
"""    .eq('project_id', pid).ilike('title', 'Insurance Doc%').order('created_at', { ascending: false }).limit(20);
  if(!sdStillProject(pid)) return;   /* 1405 */
  S.scopeDocs = r.data || [];""")
d = one(d, """    .eq('claim_id', claimId).order('created_at', { ascending: false }).limit(30);
  S.filings = r.data || [];""",
"""    .eq('claim_id', claimId).order('created_at', { ascending: false }).limit(30);
  if(!sdStillClaim(claimId)) return;   /* 1405 */
  S.filings = r.data || [];""")
d = one(d, """    .eq('project_id', pid).order('created_at', { ascending: true }).limit(200);
  S.photos = r.data || [];
  var paths = S.photos.filter(function(p){ return p.storage_path; }).map(function(p){ return p.storage_path; });
  if(paths.length){
    var su = await sb.storage.from('photos').createSignedUrls(paths, 3600);
    var byPath = {};
    (su.data || []).forEach(function(d, i){ if(d && d.signedUrl) byPath[paths[i]] = d.signedUrl; });
    S.photos.forEach(function(p){ p._src = p.storage_path ? byPath[p.storage_path] : (String(p.data || '').indexOf('data:') === 0 ? p.data : null); });
  } else {
    S.photos.forEach(function(p){ p._src = String(p.data || '').indexOf('data:') === 0 ? p.data : null; });
  }
}""",
"""    .eq('project_id', pid).order('created_at', { ascending: true }).limit(200);
  /* 1405: built on a local list and published only if this job is still the one open */
  var list = r.data || [];
  var paths = list.filter(function(p){ return p.storage_path; }).map(function(p){ return p.storage_path; });
  if(paths.length){
    var su = await sb.storage.from('photos').createSignedUrls(paths, 3600);
    var byPath = {};
    (su.data || []).forEach(function(d, i){ if(d && d.signedUrl) byPath[paths[i]] = d.signedUrl; });
    list.forEach(function(p){ p._src = p.storage_path ? byPath[p.storage_path] : (String(p.data || '').indexOf('data:') === 0 ? p.data : null); });
  } else {
    list.forEach(function(p){ p._src = String(p.data || '').indexOf('data:') === 0 ? p.data : null; });
  }
  if(!sdStillProject(pid)) return;
  S.photos = list;
}""")
d = one(d, """  if(!S.claim){ renderNotes(); return; }
  var r = await sb.from('claim_notes')""",
"""  if(!S.claim){ renderNotes(); return; }
  var _ncid = S.claim.id;   /* 1405 */
  var r = await sb.from('claim_notes')""")
d = one(d, """  if(r.error){
    el('noteList').innerHTML = '<div class="sd-empty">Could not load notes: ' + esc(r.error.message) + '</div>';
    return;
  }
  S.notes = r.data || [];""",
"""  if(!sdStillClaim(_ncid)) return;   /* 1405: another claim was opened meanwhile */
  if(r.error){
    el('noteList').innerHTML = '<div class="sd-empty">Could not load notes: ' + esc(r.error.message) + '</div>';
    return;
  }
  S.notes = r.data || [];""")
# 7 — sanitize the model's HTML
d = one(d, """function decorateTokens(html){
  return html.replace(""",
"""/* 1405: the letter is model-written and can be steered by claim notes — nothing in it may run in this page */
function sdSafeHtml(html){
  var t = document.createElement('template');
  t.innerHTML = String(html || '');
  t.content.querySelectorAll('script,iframe,object,embed,link,meta,style,base,form').forEach(function(n){ n.remove(); });
  t.content.querySelectorAll('*').forEach(function(n){
    Array.prototype.slice.call(n.attributes).forEach(function(at){
      var nm = at.name.toLowerCase(), v = String(at.value || '').replace(/[\\s\\u0000-\\u001f]/g, '').toLowerCase();
      if(nm.indexOf('on') === 0 || ((nm === 'href' || nm === 'src' || nm === 'xlink:href' || nm === 'action') && /^(javascript|vbscript|data:text)/.test(v))) n.removeAttribute(at.name);
    });
  });
  return t.innerHTML;
}
function decorateTokens(html){
  html = sdSafeHtml(html);
  return html.replace(""")
d = one(d, """  el('printArea').innerHTML =
    '<div style="font:14px/1.6 Georgia,serif;max-width:7.5in;margin:0 auto;padding:24px;">' +
    '<h2 style="font-size:16px;">' + esc(el('subjEdit').value) + '</h2>' + html +
    codeAppendix(html) + '</div>';
  el('printArea').style.display = 'block';
  window.print();""",
"""  html = sdSafeHtml(html);   /* 1405 */
  el('printArea').innerHTML =
    '<div style="font:14px/1.6 Georgia,serif;max-width:7.5in;margin:0 auto;padding:24px;">' +
    '<h2 style="font-size:16px;">' + esc(el('subjEdit').value) + '</h2>' + html +
    codeAppendix(html) + '</div>';
  el('printArea').style.display = 'block';
  /* 1405: print only once the photographs have loaded (or 8 s), or they print blank */
  await Promise.race([
    Promise.all(Array.prototype.map.call(el('printArea').querySelectorAll('img'), function(im){
      return im.complete ? null : new Promise(function(ok){ im.onload = im.onerror = ok; });
    })),
    new Promise(function(ok){ setTimeout(ok, 8000); })
  ]);
  window.print();""")
# 8 — only stored photos are evidence
d = one(d, """  el('photoGrid').innerHTML = S.photos.filter(function(p){ return p._src; }).map(function(p){""",
"""  /* 1405: the letter carries only stored photos (print and send skip 'row:' keys) — offer nothing else */
  el('photoGrid').innerHTML = S.photos.filter(function(p){ return p._src && p.storage_path; }).map(function(p){""")
d = one(d, ">build 1396</span>", ">build 1405</span>")
d = one(d, "var SD_BUILD = 1396; window.SD_BUILD = SD_BUILD;", "var SD_BUILD = 1405; window.SD_BUILD = SD_BUILD;")

# 10, 11 — the route
a = one(a, """    let ans = null, via = GEMINI_MODELS[0], lastBody = null, lastText = '';""",
"""    let ans = null, via = GEMINI_MODELS[0], lastBody = null, lastText = '', triedOA = false;""")
a = one(a, """        if (!r.ok) r = await aiFallback(parts, r);
        const j = await r.json();
        lastBody = j;
        if (!r.ok) continue;""",
"""        if (!r.ok) { triedOA = true; r = await aiFallback(parts, r); }
        /* 1405: a non-JSON error body is a failed rung, not a parser message for the Desk */
        let j = {};
        try { j = await r.json(); } catch (_pj) { j = {}; if (r.ok) continue; }
        lastBody = j;
        if (!r.ok) continue;""")
a = one(a, """    if (!ans) {
      const u = (lastBody && lastBody.usageMetadata) || {};""",
"""    /* 1405: every Gemini rung answered 503 / 429 (the commonest failure) — the backup was never asked */
    if (!ans && !triedOA && elapsed() <= TIME_BUDGET_MS) {
      try {
        const r2 = await aiFallback(parts, null);
        if (r2 && r2.ok) {
          const j2 = await r2.json();
          const cand2 = (j2.candidates || [])[0] || {};
          lastText = ((cand2.content || {}).parts || []).map(p => p.text || '').join('').replace(/```json|```/g, '').trim();
          const p2 = parseObj(lastText);
          if (p2) { ans = p2; via = 'gpt-4o-mini'; }
        }
      } catch (_oa) {}
    }

    if (!ans) {
      const u = (lastBody && lastBody.usageMetadata) || {};""")

pl.write_atomic(P, s); pl.write_atomic(Q, d); pl.write_atomic(R, a)
print('ok 1405')
