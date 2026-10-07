#!/usr/bin/env python3
"""Build 1257 — Company Documents stops trapping you (Theo, 7 Oct).

"when you go to resources company documents then roof pre install guide, there
is no way out. Also it says Nick. Also, all company documents traps you in the
page"

Measured, not guessed:
  * Every View / Download is a same-site PDF link (target=_blank). In the
    INSTALLED app on an iPhone a same-site link opens inside the app, with no
    browser chrome and so no Back. That is the trap on "all company documents".
  * The guide's Preview did window.open('') + document.write — the same trap, a
    chromeless blank window.
  * The preview filled the guide with a hard-coded sample rep, "Nick Hey", for
    whoever opened it. That is "it says Nick".
  * Found on the way: Preview and Download were white on the white row cards —
    invisible (rendered in Chromium, 390px).

Fix:
  1. A new in-app viewer, window.CardinalDocView (docview_1257.html): a Back bar,
     PDFs drawn page by page with the app's own pdf.js loader (an iframe if the
     reader cannot load), HTML in an iframe. Share (installed app) / Download
     (browser) for a PDF, Print for a preview. Registered in hideAllViews; Back
     and the phone's back both close it.
  2. Company Documents' View opens the viewer; Download in the installed app
     opens the share sheet instead of a dead-end tab (a browser keeps the plain
     download).
  3. The guide preview opens in the viewer, and names the person looking at it
     (their Team Directory name and phone) instead of Nick.
  4. The two invisible buttons get a dark ink.

usage: python3 patch_1257.py [index.html]
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import patch_lib as pl
HERE = os.path.dirname(os.path.abspath(__file__))
PATH = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, '../../../../index.html')
src = pl.load(PATH)

# 1. the viewer module, before cr-fin-styles
src = pl.sub(src, '<style id="cr-fin-styles">',
             open(os.path.join(HERE, 'docview_1257.html'), encoding='utf-8').read() + '\n<style id="cr-fin-styles">')

# hideAllViews
src = pl.sub(src, "   { id:'cr-route', api:window.CardinalRoute },",
  "   { id:'cr-route', api:window.CardinalRoute },\n"
  "   /* 1257: the in-app document viewer — class-shown, closes through its own close(false) */\n"
  "   { id:'cr-docview', api:window.CardinalDocView },")

# 2. Company Documents: View → the viewer; Download in the installed app → share
src = pl.sub(src, """document.getElementById('cdCats').addEventListener('click', function(e){
  var b = e.target.closest('.cdoccat');""", """/* 1257: a document opens INSIDE the app, under a Back bar. In the installed
   app a same-site PDF link opened in place with no browser chrome — no way out. */
document.getElementById('cdDocList').addEventListener('click', function(e){
  var a = /** @type {HTMLElement} */ (e.target).closest('.cdocrow a.btn');
  if(!a || !window.CardinalDocView) return;
  var row = a.closest('.cdocrow'), nm = row && row.querySelector('.cdname');
  var title = nm && nm.firstChild ? String(nm.firstChild.textContent || '').trim() : 'Document';
  var href = a.getAttribute('href') || '';
  if(!a.hasAttribute('data-cddl')){                 /* View */
    e.preventDefault();
    window.CardinalDocView.open({ title: title, url: href });
    return;
  }
  /* Download: a browser keeps the plain download; the installed app gets the share sheet */
  var standalone = false; try{ standalone = isStandalone(); }catch(_){}
  if(standalone && navigator.share){
    e.preventDefault();
    navigator.share({ title: title, url: new URL(href, location.href).href }).catch(function(){});
  }
});
document.getElementById('cdCats').addEventListener('click', function(e){
  var b = e.target.closest('.cdoccat');""")

# 3. the guide preview: the viewer, and the person looking at it, not Nick
src = pl.sub(src, """  function sampleCtx(){
    return { client_name:'Daniel Whitfield', property_address:'128 Maple Ave, Dayton, OH',
      install_date:fmtInstall(new Date(Date.now()+6*86400000).toISOString().slice(0,10)),
      rep_name:'Nick Hey', rep_phone:'(937) 576-6753' };
  }""", """  function sampleCtx(){
    /* 1257: the rep in a PREVIEW is whoever is looking at it (their Team
       Directory name and phone) — it was a hard-coded 'Nick Hey' for everyone.
       The client and address stay an obvious sample. */
    var me = '', nm = '', ph = '';
    try{ var cu = /** @type {any} */ (window.currentUser); me = String((cu && cu.email) || ''); }catch(_){}
    try{ if(me && typeof rptRepName === 'function') nm = rptRepName(me) || ''; }catch(_){}
    try{ var t = (window.cacheTeam || {})[me]; if(t && t.phone) ph = t.phone; }catch(_){}
    return { client_name:'Daniel Whitfield', property_address:'128 Maple Ave, Dayton, OH',
      install_date:fmtInstall(new Date(Date.now()+6*86400000).toISOString().slice(0,10)),
      rep_name: (nm && nm !== me) ? nm : FALLBACK.rep_name, rep_phone: ph || FALLBACK.rep_phone };
  }""")
src = pl.sub(src, """  function openPreviewWindow(html){
    try{""", """  function openPreviewWindow(html, title){
    /* 1257: inside the app, under a Back bar — a window.open('') from the
       installed app is a blank screen with no way back */
    if(window.CardinalDocView){ window.CardinalDocView.open({ title: (title || 'Preview') + ' — preview', html: html }); return; }
    try{""")
src = pl.sub(src, "    openPreviewWindow(doc(fill(harvestBody() || G(_slug).content, s), s, false, _slug));",
                  "    openPreviewWindow(doc(fill(harvestBody() || G(_slug).content, s), s, false, _slug), G(_slug).label);")
src = pl.sub(src, "    loadTemplate(slug).then(function(tpl){ openPreviewWindow(doc(fill(tpl.html, s), s, false, slug)); });",
                  "    loadTemplate(slug).then(function(tpl){ openPreviewWindow(doc(fill(tpl.html, s), s, false, slug), G(slug).label); });")

src = pl.sub(src, '>v2026-10-07 build 1256<', '>v2026-10-07 build 1257<')
src = pl.sub(src, '''var CHANGELOG = [
''', '''var CHANGELOG = [
  { b: 1257, d: '2026-10-07', t: 'Company Documents no longer trap you',
    s: 'Opening a document from Company Documents \\u2014 a contract master, or a Pre-Install Guide preview \\u2014 used to take over the installed app with no way back. Every document now opens inside the app under a <b>\\u2190 Back</b> bar, with <b>Share</b> (save to Files, print, mail) or <b>Download</b> beside it. The guide preview now shows <b>your</b> name and number as the rep, not Nick\\u2019s. And the Preview and Download buttons, which were white on white, can be seen.' },
''')
pl.write_atomic(PATH, src)
print('patched', PATH, len(src))
