"""Build 1390 — a real document scanner (Theo, 22 Oct: "please allow us to actually scan documents also.
Right now its the same as taking a photo", then "A"). Scan document on a job's Documents page filed the
raw camera photo as a .jpg. Now the photo opens in cr-scan-script: the page edges are found, every corner
can be dragged, the page is straightened flat, cleaned (Document / Gray / Color), Add page takes the next
one, and Save PDF files ONE PDF of all the pages through the same addJobFiles() every upload uses.
The PDF is written in the browser (JPEG pages, DCTDecode) — no library, nothing fetched, no new endpoint.
The module is read from scan/module.html beside this patch."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
import patch_lib as pl
path = sys.argv[1] if len(sys.argv) > 1 else 'index.html'
s = open(path, encoding='utf-8').read()
MOD = open(os.path.join(os.path.dirname(__file__), 'scan_1390.html'), encoding='utf-8').read()
def one(old, new):
    global s
    n = s.count(old); assert n == 1, (n, old[:90]); s = s.replace(old, new)

one("""document.getElementById('jdScanInput').addEventListener('change', function(){
  var fl = Array.prototype.slice.call(this.files || []);
  this.value = '';
  if(!fl.length) return;""",
"""document.getElementById('jdScanInput').addEventListener('change', function(){
  var fl = Array.prototype.slice.call(this.files || []);
  this.value = '';
  if(!fl.length) return;
  /* 1390: a scan, not a photo — crop, flatten, clean, more pages, one PDF (cr-scan-script) */
  if(window.CardinalScan && typeof window.CardinalScan.open === 'function'){
    window.CardinalScan.open(fl[0], function(pdf){ addJobFiles([pdf]); });
    return;
  }""")
one("""&#128247; Scan document</button>""", """&#128247; Scan document</button>""")
i = s.rfind('</body>'); assert i > 0
s = s[:i] + MOD.strip() + '\n' + s[i:]
one(">v2026-10-22 build 1389<", ">v2026-10-22 build 1390<")
one("""  { b: 1389, d:'2026-10-22',""",
"""  { b: 1390, d:'2026-10-22', t:'Scan documents', s:'Scan document on a job\\u2019s Documents page is a real scanner now. After the photo, the app finds the page\\u2019s edges (drag any red corner to fix them), straightens the page flat, and cleans it up \\u2014 Document whitens the paper and lifts shadows, or pick Gray or Color. Tap Add page for the next page, then Save PDF: every page goes into one PDF on the job. The original photos are not kept.' },
  { b: 1389, d:'2026-10-22',""")
pl.write_atomic(path, s)
print('ok 1390')
