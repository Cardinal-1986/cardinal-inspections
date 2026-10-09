"""patch_1269.py — the estimate's Publish bar was under the installed app's nav; add Email.
usage: python3 patch_1269.py [index.html]
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import patch_lib as pl
HERE = os.path.dirname(os.path.abspath(__file__))
PATH = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, '../../../../index.html')
src = pl.load(PATH)

# 1. in the installed app the bar sits ABOVE the bottom nav (#pwaNav, z 9990 in
#    standalone) instead of under it; the body pads for both
src = pl.sub(src, ''':root[data-theme="rb-light"] #cr-est-view .cr-est-phonebar button.primary{color:#ffffff;}''',
''':root[data-theme="rb-light"] #cr-est-view .cr-est-phonebar button.primary{color:#ffffff;}
/* 1269: in the INSTALLED app #pwaNav (z 9990) covered this whole bar, so Save,
   Publish and Email could not be tapped. It now sits on top of the nav. */
body.standalone #cr-est-view .cr-est-phonebar{--cr-stack:"installed-app offset above #pwaNav; the base rule still serves the browser";
  bottom:calc(64px + env(safe-area-inset-bottom,0px));padding-bottom:10px;}
body.standalone #cr-est-view .cr-est-body{--cr-stack:"room for the bar AND the nav in the installed app";
  padding-bottom:calc(150px + env(safe-area-inset-bottom,0px));}''')

# 2. Email beside Save and Publish
src = pl.sub(src, '''\'<button class="primary" data-act="bar-publish" type="button">Publish</button>\' +''',
'''\'<button data-act="bar-email" type="button">Email</button>\' +
\'<button class="primary" data-act="bar-publish" type="button">Publish</button>\' +''')
src = pl.sub(src, '''var barPub = view.querySelector('[data-act="bar-publish"]');''',
'''/* 1269: Email = Publish, then the document's own Email to client */
var barEmail = view.querySelector('[data-act="bar-email"]');
if(barEmail) barEmail.onclick = function(){
var pb = document.getElementById('cr-epub-btn');
if(!pb){ crTell('Publish is still loading \\u2014 give it a second and tap again.'); return; }
window.__crEstEmailNext = true;
pb.click();
};
var barPub = view.querySelector('[data-act="bar-publish"]');''')
src = pl.sub(src, '''async function handlePublishClick(){
var btn = document.getElementById('cr-epub-btn');''', '''/* 1269: after an Email tap publishes, open the email as soon as the document
   is the one on screen (openEditor is not awaited by openDoc) */
function emailWhenOpen(docId){
var t0 = Date.now();
(function ewTick(){
var f = /** @type {any} */ (document.getElementById('reportFrame')), b = document.getElementById('emailDocBtn');
var ready = f && f.dataset.docId === String(docId) && f.contentDocument && f.contentDocument.readyState === 'complete';
if(ready && b){ b.click(); return; }
if(Date.now() - t0 < 12000) setTimeout(ewTick, 250);
else crTell('The estimate is published. Tap Email to client at the top to send it.');
})();
}
async function handlePublishClick(){
var _emailNext = !!window.__crEstEmailNext;
window.__crEstEmailNext = false;
var btn = document.getElementById('cr-epub-btn');''')
src = pl.sub(src, '''if(!openDoc(docId)){
crTell('Estimate published as ' + (est.estimate_number || 'a document') +''', '''if(openDoc(docId)){ if(_emailNext) emailWhenOpen(docId); }
else {
crTell('Estimate published as ' + (est.estimate_number || 'a document') +''')
src = pl.sub(src, '>v2026-10-09 build 1268<', '>v2026-10-09 build 1269<')
src = pl.sub(src, '''var CHANGELOG = [
''', '''var CHANGELOG = [
  { b: 1269, d: '2026-10-09', t: 'Publish and Email on the estimate, in the installed app',
    s: 'In the installed app on a phone, the bar with <b>Save</b> and <b>Publish</b> at the bottom of an estimate sat underneath the app\\u2019s bottom menu, so it could not be tapped. It now sits above the menu. It also has a new <b>Email</b> button: it publishes the estimate and opens the email to the client in one tap.' },
''')
pl.write_atomic(PATH, src)
print('patched', PATH, len(src))
