"""Build 1328 — the document editor could save a BLANK page over a real document.

Jacob, via Theo, 12 Oct: "the estimates are still wacky." EST-2026-0914 (signed, shared) was
stored as `<!DOCTYPE html>\n<html><head></head><body></body></html>` — 55 characters — since a
save on 10 Oct. document_versions v6 holds the 27,150-character document from one second before.

Cause: `frame.srcdoc = r.html` is asynchronous. Until the new document commits, the frame still
holds the previous one — and after closeEditor() that is the BLANK page from `srcdoc = ''`. Open
a document and close it (Back, the client chip, Close) before it finishes loading, and
closeEditor() -> saveCurrent() -> serializeFrame() reads the blank page and writes it over the
document now in `current`. The old onload stayed attached too, so the blank page's own load
event ran the previous document's wiring against nothing.

Fix — the editor only saves what it actually opened:
  - openEditor clears `frame.dataset.loadedId` before assigning srcdoc; onload sets it to the
    document's id once the document has committed (and the body has content).
  - closeEditor detaches onload and clears loadedId before blanking the frame.
  - saveCurrent() skips quietly when the frame has not finished opening `current` — nothing can
    have been edited yet, so nothing is lost.
  - serializeFrame() refuses an empty body outright, for every caller (save, email, share).
Usage: python3 patch_1328.py [index.html]
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

one("""  frame.dataset.docId = String(r.id);
  frame.srcdoc = r.html;
  frame.onload = function(){
    try{
      var doc = frame.contentDocument;""",
"""  frame.dataset.docId = String(r.id);
  /* 1328: srcdoc loads ASYNCHRONOUSLY. Until it commits, the frame still holds the previous
     page (after a close, the blank one). loadedId says which document the frame really holds,
     and saveCurrent() will not write anything until it matches. */
  frame.dataset.loadedId = '';
  frame.srcdoc = r.html;
  frame.onload = function(){
    try{
      var doc = frame.contentDocument;
      if(doc && doc.body && (doc.body.childElementCount || String(doc.body.textContent || '').trim())) frame.dataset.loadedId = String(r.id);""")

one("""function serializeFrame(){
  var doc = frame.contentDocument;
  var clone = doc.documentElement.cloneNode(true);""",
"""function serializeFrame(){
  var doc = frame.contentDocument;
  /* 1328: never hand back an empty page as "the document" — that is what wiped EST-2026-0914 */
  if(!doc || !doc.body || !(doc.body.childElementCount || String(doc.body.textContent || '').trim())){
    throw new Error('the document has not finished opening');
  }
  var clone = doc.documentElement.cloneNode(true);""")

one("""async function saveCurrent(){
  if(!current) return;
  var html;""",
"""async function saveCurrent(){
  if(!current) return;
  /* 1328: the frame has not finished opening THIS document (closed while still loading).
     Nothing can have been edited, so there is nothing to save — and saving would write the
     previous, blank page over it. */
  if(frame && frame.dataset && frame.dataset.loadedId !== String(current.id)) return;
  var html;""")

one("""  document.body.style.overflow = '';
  frame.srcdoc = '';
  current = null;
  await reload();
}""",
"""  document.body.style.overflow = '';
  frame.onload = null;              /* 1328: the blank page's load must not run this document's wiring */
  frame.dataset.loadedId = '';
  frame.srcdoc = '';
  current = null;
  await reload();
}""")

# stamp + changelog
one(""">v2026-10-12 build 1327<button""", """>v2026-10-12 build 1328<button""")
CL = "{ b: 1327, d:'2026-10-12',"
assert s.count(CL) == 1
s = s.replace(CL, "{ b: 1328, d:'2026-10-12', t:'A document can no longer be saved blank', s:'If you opened an estimate, contract or report and went back before it had finished loading, the app could save an empty page over it, and the client link then showed nothing. It now saves only a document that has fully opened, and it refuses to save an empty page at all.' },\n  " + CL, 1)
pl.write_atomic(FILE, s)
print('1328 applied')
