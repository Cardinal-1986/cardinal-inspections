"""Build 1332 — upload more than one PDF at a time (Theo, 13 Oct: "please allow us to upload more
than one pdf at a time").

The job's Files tab already took many (`#jdFileInput multiple`). Three PDF doors took one:
  - Insurance documents (#insDocFileInput) — each file is filed as its own document already, so
    several just loop. The "read this scope now?" offer is made once, for the first file.
  - Measurements (#msFileInput) — each report is filed; only the FIRST Hover/Roofr report is read
    into the job's measurements, so a second report can never overwrite the first one's numbers.
  - Work orders ([data-wo-file]) — each file is stored on its own.
Left one-at-a-time on purpose: the Scope of Loss reader (it reads one scope into the claim), the
crew compliance upload (each file carries its own type and expiry), materials (one order per trade).
Every file is still checked against the size limit on its own; one bad file does not stop the rest,
and the toast says how many went.
Usage: python3 patch_1332.py [index.html]
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


# ---- insurance documents ----
one("""<input type="file" id="insDocFileInput" style="display:none;" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.heic">""",
    """<input type="file" id="insDocFileInput" style="display:none;" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.heic" multiple>""")
one("""  input.onchange = async function(){
    var f = this.files && this.files[0];
    this.value = '';
    if(!f) return;
    try{
      await uploadInsuranceDoc(typeKey, f);
      renderInsuranceDocsCard();""",
"""  input.onchange = async function(){
    /* 1332: several at once. Each is filed as its own document, in order; one that fails does
       not stop the rest. The scope-reading offer below is made once, for the first file. */
    var list = Array.prototype.slice.call(this.files || []);
    this.value = '';
    if(!list.length) return;
    var f = list[0];
    if(list.length > 1){
      var okN = 0, bad = [];
      for(var li = 0; li < list.length; li++){
        try{ await uploadInsuranceDoc(typeKey, list[li]); okN++; }
        catch(eL){ bad.push(list[li].name + ' (' + ((eL && eL.message) || eL) + ')'); }
      }
      renderInsuranceDocsCard();
      crTell('Filed ' + okN + ' of ' + list.length + (bad.length ? '. Not filed: ' + bad.join('; ') : '') + '.');
      if(!okN) return;
    }
    try{
      if(list.length === 1){ await uploadInsuranceDoc(typeKey, f); }
      renderInsuranceDocsCard();""")

# ---- measurements ----
one("""<input type="file" id="msFileInput" accept="application/pdf,image/*" style="display:none;">""",
    """<input type="file" id="msFileInput" accept="application/pdf,image/*" style="display:none;" multiple>""")
one("""document.getElementById('msFileInput').addEventListener('change', function(){
  var pr = currentProject;
  var f = this.files && this.files[0];
  this.value = '';
  if(!f || !pr) return;""",
"""document.getElementById('msFileInput').addEventListener('change', function(){
  var pr = currentProject;
  /* 1332: several at once. All are filed; only the FIRST Hover/Roofr report is read into the
     job's measurements, so a second report cannot overwrite the first one's numbers. */
  var list = Array.prototype.slice.call(this.files || []);
  this.value = '';
  if(!list.length || !pr) return;
  if(list.length > 1){
    var srcM = __msUpSrc;
    (async function(){
      var okN = 0, bad = [];
      for(var mi = 0; mi < list.length; mi++){
        var fm = list[mi];
        if(fm.size > 8*1024*1024){ bad.push(fm.name + ' (over 8MB)'); continue; }
        try{
          var du = await new Promise(function(res, rej){ var r0 = new FileReader(); r0.onload = function(){ res(r0.result); }; r0.onerror = function(){ rej(new Error('could not read it')); }; r0.readAsDataURL(fm); });
          await measDb.add(pr.id, srcM + ' \\u2014 ' + fm.name, du);
          okN++;
          if(okN === 1 && (srcM === 'Hover' || srcM === 'Roofr')) importMeasFrom(pr, srcM, fm);
        }catch(eM){ bad.push(fm.name + ' (' + ((eM && eM.message) || eM) + ')'); }
      }
      renderMeasureTab(); refreshMeasSummary(pr);
      crTell('Filed ' + okN + ' of ' + list.length + ' reports' + (bad.length ? '. Not filed: ' + bad.join('; ') : '') +
             ((srcM === 'Hover' || srcM === 'Roofr') && okN > 1 ? '. The numbers were read from the first one.' : '.'));
    })();
    return;
  }
  var f = list[0];""")

# ---- work orders ----
one("""'<input type="file" data-wo-file style="display:none;" ' +""", """'<input type="file" data-wo-file multiple style="display:none;" ' +""")
one("""fileInput.onchange = async function(){
var f = fileInput.files[0];
if(!f) return;
uploadBtn.disabled = true;
uploadBtn.textContent = 'Uploading\\u2026';
try{ await uploadFile(f); }
catch(e){ crTell('Upload failed: ' + (e.message || e)); }""",
"""fileInput.onchange = async function(){
/* 1332: several at once, stored one after another */
var list = Array.prototype.slice.call(fileInput.files || []);
if(!list.length) return;
uploadBtn.disabled = true;
uploadBtn.textContent = 'Uploading\\u2026';
var bad = [];
try{
  for(var wi = 0; wi < list.length; wi++){
    try{ await uploadFile(list[wi]); }
    catch(eW){ bad.push(list[wi].name + ' (' + ((eW && eW.message) || eW) + ')'); }
  }
  if(bad.length) crTell('Upload failed: ' + bad.join('; '));
  else if(list.length > 1) crTell('Uploaded ' + list.length + ' work orders.');
}
catch(e){ crTell('Upload failed: ' + (e.message || e)); }""")

one(""">v2026-10-13 build 1331<button""", """>v2026-10-13 build 1332<button""")
CL = "{ b: 1331, d:'2026-10-13',"
assert s.count(CL) == 1
s = s.replace(CL, "{ b: 1332, d:'2026-10-13', t:'Upload several PDFs at once', s:'Insurance documents, measurement reports and work orders now take more than one file at a time \\u2014 pick them all together and each is filed on its own. For Hover and Roofr reports, the numbers are read from the first report so a second one cannot overwrite them. The Files tab already did this.' },\n  " + CL, 1)
pl.write_atomic(FILE, s)
print('1332 applied')
