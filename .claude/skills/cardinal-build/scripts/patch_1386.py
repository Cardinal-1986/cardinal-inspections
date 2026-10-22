"""Build 1386 — Download saves a PDF, not an .html file (Theo, 22 Oct: "The contract is saving in html.
not pdf", then a photo of the raw <!DOCTYPE html> source on a Mac in front of a client).
Every Download button (the document editor's, the contract viewer's, the Documents row ⋯ Download)
went through CardinalDownload, which wrote a .html file. A Mac opens that as source code.
Download now opens the print sheet for that document — the same path Print uses, already tuned for
page breaks and iPad — with the document's title as the file name, so "Save as PDF" is the default
on a computer and the share sheet offers it on an iPhone or iPad. Real text, real page breaks.
CardinalDownload.url (files that already are PDFs) is unchanged."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
import patch_lib as pl
path = sys.argv[1] if len(sys.argv) > 1 else 'index.html'
s = open(path, encoding='utf-8').read()
def one(old, new):
    global s
    n = s.count(old); assert n == 1, (n, old[:90]); s = s.replace(old, new)

one("""/* Save the rendered document as a standalone .html file — opens in any browser,
   prints to PDF from there, and keeps working offline. */
function downloadHtml(html, title){
  try{
    var doc = '<!doctype html><html><head><meta charset="utf-8">' +
      '<meta name="viewport" content="width=device-width,initial-scale=1">' +
      '<title>' + safe(title) + '</title></head><body>' + html + '</body></html>';
    var blob = new Blob([doc], { type:'text/html;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = safe(title) + '.html';
    document.body.appendChild(a); a.click();
    setTimeout(function(){ URL.revokeObjectURL(url); a.remove(); }, 1500);
    return true;
  }catch(e){
    crTell('Could not download: ' + (e.message || e));
    return false;
  }
}
function downloadFrame(frame, title){
  try{
    var d = frame && (frame.contentDocument || (frame.contentWindow && frame.contentWindow.document));
    if(!d) return false;
    return downloadHtml(d.documentElement ? d.documentElement.outerHTML : d.body.innerHTML, title);
  }catch(e){ crTell('Could not download: ' + (e.message || e)); return false; }
}""",
"""/* 1386 (Theo: "The contract is saving in html. not pdf"): Download used to write a .html file,
   and a Mac opens that as source code — in front of the client. Download is now "Save as PDF":
   the document goes to the print sheet (printDoc, the path Print already uses and the print gates
   measure), named after the document, so a computer offers Save as PDF and an iPhone/iPad's share
   sheet does too. The title is lent to the page while the sheet is open, because that is the name
   the browser gives the PDF. */
function withTitle(title, fn){
  var keep = document.title, name = safe(title);
  document.title = name;
  var titleBack = function(){ document.title = keep; window.removeEventListener('afterprint', titleBack); };
  window.addEventListener('afterprint', titleBack);
  setTimeout(titleBack, 10 * 60 * 1000);
  try{ return fn(name); }catch(e){ titleBack(); throw e; }
}
function downloadFrame(frame, title){
  try{
    var d = frame && (frame.contentDocument || (frame.contentWindow && frame.contentWindow.document));
    if(!d) return false;
    return withTitle(title, function(name){
      try{ d.title = name; }catch(_){}
      return printDoc(d, frame.contentWindow);
    });
  }catch(e){ crTell('Could not save the PDF: ' + (e.message || e)); return false; }
}
function downloadHtml(html, title){
  try{
    var src = String(html || '');
    var doc = /^\\s*<(!doctype|html)/i.test(src) ? src :
      '<!doctype html><html><head><meta charset="utf-8">' +
      '<meta name="viewport" content="width=device-width,initial-scale=1">' +
      '<title>' + safe(title) + '</title></head><body>' + src + '</body></html>';
    var old = document.getElementById('crPdfFrame'); if(old) old.remove();
    var f = document.createElement('iframe');
    f.id = 'crPdfFrame';
    f.setAttribute('aria-hidden', 'true');
    f.style.cssText = 'position:fixed;right:0;bottom:0;width:8.5in;height:11in;border:0;opacity:0;pointer-events:none;z-index:-1;';
    f.onload = function(){
      f.onload = null;
      setTimeout(function(){ downloadFrame(f, title); }, 250);
      setTimeout(function(){ if(f.parentNode) f.remove(); }, 10 * 60 * 1000);
    };
    document.body.appendChild(f);
    f.srcdoc = doc;
    return true;
  }catch(e){
    crTell('Could not save the PDF: ' + (e.message || e));
    return false;
  }
}""")

one("""function downloadReport(r){
  var blob = new Blob([r.html], {type:'text/html'});""",
"""function downloadReport(r){
  /* 1386: Save as PDF, not a .html file (see cr-dl-script) */
  if(window.CardinalDownload && window.CardinalDownload.html){ window.CardinalDownload.html(r.html, r.title || 'Cardinal document'); return; }
  var blob = new Blob([r.html], {type:'text/html'});""")

one(">v2026-10-22 build 1385<", ">v2026-10-22 build 1386<")
one("""  { b: 1385, d:'2026-10-22',""",
"""  { b: 1386, d:'2026-10-22', t:'Download saves a PDF', s:'Download on a contract, estimate or report used to save a web-page (.html) file, which a Mac opens as code. It now opens the print screen for that document with Save as PDF ready, named after the document. On an iPhone or iPad, tap the share button on that screen and choose Save to Files. Print works exactly as before.' },
  { b: 1385, d:'2026-10-22',""")
pl.write_atomic(path, s)
print('ok 1386')
