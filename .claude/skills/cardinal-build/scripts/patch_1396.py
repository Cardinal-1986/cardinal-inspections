"""Build 1396 — three bugs from the second code audit (23 Oct 2026).
1. Supplement Desk (supplement.html): since 1359 a filed insurance document stores its bytes in the
   job-files bucket ({file, bucket, path}) instead of inline data, and the Desk still required pay.data —
   every scope filed since 1359 said "That document has no stored file." It downloads by path now
   (admin passes job_files_read), staging over 3 MB exactly as before. SD_BUILD 1072 -> 1396.
2. "Advance to Completed" from the job menu: since 1331 setStage() refuses (returns false) when install
   photos are missing — and acxAdvance() still asked "Job completed! Send a Google review request?" 300ms
   later. A yes texted the homeowner a review request for unfinished work. It stops on a refusal.
3. Sales Numbers: new Date('2026-10-01') is UTC midnight = 30 Sep 8 pm in Dayton, so a payment collected
   on the 1st fell out of "This month" (and Jan 1 out of "This year"). A bare date reads as local noon."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
import patch_lib as pl
path = sys.argv[1] if len(sys.argv) > 1 else 'index.html'
sup = sys.argv[2] if len(sys.argv) > 2 else 'supplement.html'
s = open(path, encoding='utf-8').read()
def one(old, new):
    global s
    n = s.count(old); assert n == 1, (n, old[:90]); s = s.replace(old, new)
one("""    await setStage(pr.id, nx);
    renderOverview(); renderPipeline();
    if(nx === 'Completed' && !parseCkAll(pr).review_requested_at && (pr.phone || pr.email)){""",
"""    /* 1396: setStage refuses (false) when install photos are missing (1331) — no "Job completed!" review offer then */
    var _moved = await setStage(pr.id, nx);
    if(_moved === false) return;
    renderOverview(); renderPipeline();
    if(nx === 'Completed' && !parseCkAll(pr).review_requested_at && (pr.phone || pr.email)){""")
one("""  function snTime(v){ if(!v) return NaN; return new Date(String(v).replace(' ', 'T')).getTime(); }""",
"""  /* 1396: a bare YYYY-MM-DD parses as UTC midnight (8 pm the day before in Dayton) — read it as local noon */
  function snTime(v){ if(!v) return NaN; var sv = String(v).replace(' ', 'T'); if(/^\\d{4}-\\d\\d-\\d\\d$/.test(sv)) sv += 'T12:00:00'; return new Date(sv).getTime(); }""")
one(">v2026-10-23 build 1395<", ">v2026-10-23 build 1396<")
one("""  { b: 1395, d:'2026-10-23',""",
"""  { b: 1396, d:'2026-10-23', t:'Three fixes from the audit', s:'The Supplement Desk reads Scope of Loss documents filed since early October again \\u2014 it said the document had no stored file. Advancing a job to Completed when its install photos are missing no longer offers to text the homeowner a Google review request. Sales Numbers counts payments collected on the 1st of the month in This month.' },
  { b: 1395, d:'2026-10-23',""")
pl.write_atomic(path, s)

t = open(sup, encoding='utf-8').read()
def oneS(old, new):
    global t
    n = t.count(old); assert n == 1, (n, old[:90]); t = t.replace(old, new)
oneS("""    if(!pay || !pay.file || !pay.data) throw new Error('That document has no stored file.');
    S.scopeDoc = { id: row.data.id, name: pay.name || 'Scope of Loss', size: pay.size || 0 };

    var scope;
    var b64 = String(pay.data).split(',')[1] || '';
    var rawBytes = Math.floor(b64.replace(/=+$/, '').length * 3 / 4);""",
"""    /* 1396: since 1359 a filed document keeps its bytes in storage ({bucket, path}), not inline data */
    if(!pay || !pay.file || !(pay.data || pay.path)) throw new Error('That document has no stored file.');
    S.scopeDoc = { id: row.data.id, name: pay.name || 'Scope of Loss', size: pay.size || 0 };

    var scope, stored = null;
    if(!pay.data && pay.path){
      var dl = await sb.storage.from(pay.bucket || 'job-files').download(pay.path);
      if(dl.error || !dl.data) throw new Error('Could not open the stored file' + (dl.error && dl.error.message ? ': ' + dl.error.message : '.'));
      stored = dl.data;
    }
    var b64 = stored ? '' : (String(pay.data).split(',')[1] || '');
    var rawBytes = stored ? stored.size : Math.floor(b64.replace(/=+$/, '').length * 3 / 4);""")
oneS("""      var blob = await (await fetch(pay.data)).blob();""",
"""      var blob = stored || await (await fetch(pay.data)).blob();""")
oneS("""    } else {
      scope = { file: b64, mime: pay.mime || 'application/pdf' };
    }""",
"""    } else {
      if(stored){
        var du = await new Promise(function(res, rej){ var fr = new FileReader(); fr.onload = function(){ res(String(fr.result)); }; fr.onerror = function(){ rej(new Error('Could not read the stored file.')); }; fr.readAsDataURL(stored); });
        b64 = du.split(',')[1] || '';
      }
      scope = { file: b64, mime: pay.mime || stored && stored.type || 'application/pdf' };
    }""")
oneS("""<span class="sdbuild" id="sdBuild" title="Which Desk code you are looking at">build 1072</span>""",
     """<span class="sdbuild" id="sdBuild" title="Which Desk code you are looking at">build 1396</span>""")
oneS("""var SD_BUILD = 1072; window.SD_BUILD = SD_BUILD;""", """var SD_BUILD = 1396; window.SD_BUILD = SD_BUILD;""")
pl.write_atomic(sup, t)
print('ok 1396')
