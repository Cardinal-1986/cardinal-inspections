"""Build 1342 — a document page can never be saved empty, wherever the save comes from.
13 Oct 23:17: a phone wrote an empty page (<html><head></head><body></body></html>) over an estimate
that had 11,059 characters (EST-2026-0910). Build 1328 guards the editor's own save, but a phone that kept
an older copy of the app open never ran 1328. Restored from document_versions on 14 Oct.
1. db.update for inspection_reports refuses a patch whose html shows nothing (no text, image, table cell)
   — every writer in this file goes through it.
2. serializeFrame() checks the page AFTER it strips the editor's own banner and live layers: the 1328
   check ran before the strip, so a frame holding only the editing banner passed it.
3. inspection_reports_blank_guard.sql does the same on the server (catches old copies of the app)."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
import patch_lib as pl
path = sys.argv[1] if len(sys.argv) > 1 else 'index.html'
s = open(path, encoding='utf-8').read()
def one(old, new):
    global s
    n = s.count(old); assert n == 1, (n, old[:90]); s = s.replace(old, new)

one("""  update: async function(id, fields){
    fields.updated_at = new Date().toISOString();
    if(TEAM){
      /* 869: no signal""",
"""  update: async function(id, fields){
    /* 1342: no writer may store an empty page over a document (EST-2026-0910, 13 Oct). */
    if(fields && ('html' in fields) && crPageIsEmpty(fields.html)){
      throw new Error('the page is empty, so it was not saved \\u2014 close the document and open it again');
    }
    fields.updated_at = new Date().toISOString();
    if(TEAM){
      /* 869: no signal""")

one("""var TABLE = 'inspection_reports';""",
"""var TABLE = 'inspection_reports';
/* 1342: true when an html page shows nothing at all — no text, no image, no table cell. The same test
   as inspection_reports_blank_guard.sql on the server. A real Cardinal document is never this. */
function crPageIsEmpty(html){
  var t = String(html == null ? '' : html);
  if(t.length > 1500) return false;
  t = t.replace(/<(head|style|script)[^>]*>[\\s\\S]*?<\\/\\1>/gi, '');
  if(/<(img|td|svg)\\b/i.test(t)) return false;
  return !t.replace(/<[^>]*>/g, '').replace(/&nbsp;|\\s/g, '');
}""")

one("""  return '<!DOCTYPE html>\\n' + clone.outerHTML;
}""",
"""  var _out = '<!DOCTYPE html>\\n' + clone.outerHTML;
  /* 1342: checked AFTER the editor's banner and live layers are stripped — before, a frame holding only
     the "Editing mode" banner passed the 1328 check and saved an empty page. */
  if(crPageIsEmpty(_out)) throw new Error('the document has not finished opening');
  return _out;
}""")

one(">v2026-10-14 build 1341<button", ">v2026-10-14 build 1342<button")
one("""  { b: 1341, d:'2026-10-14',""",
"""  { b: 1342, d:'2026-10-14', t:'A document can never be saved as an empty page', s:'An estimate page was saved empty from a phone that was still running an older copy of the app, so it opened blank. The page has been put back from its saved copy. Now the app refuses to save an empty page over any estimate, contract, invoice or report, whichever button the save comes from.' },
  { b: 1341, d:'2026-10-14',""")
pl.write_atomic(path, s)
print('patched', path)
