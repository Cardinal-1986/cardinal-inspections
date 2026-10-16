"""Build 1358 — iPhone (HEIC) photos upload. A rep, tagging Theo on a client's thread: "Photos will not upload
to cardinal app due to Heic file."
Reproduced in Chromium with a real HEIC: resizeImageFile() decodes through <img>, Chrome cannot decode HEIC
(Safari can), so it rejected "Could not decode the image" and the album stopped with "Upload failed". The
photos bucket already accepts image/heic — the app was the block, not storage.
Fix at the one chokepoint every photo path shares (album, quick inspection, change order, punch-out,
crew/vault prep via photoPrepFile): when the decode fails AND the file is HEIC/HEIF (by type or by name),
convert it to JPEG with heic2any — loaded from cdnjs ONLY then, never on a normal launch — and shrink that.
What is stored is a JPEG, so the tile twin, captions and the CompanyCam push all keep working.
The album's file picker also lists .heic/.heif, so a desktop that does not map them to image/* shows them."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
import patch_lib as pl
path = sys.argv[1] if len(sys.argv) > 1 else 'index.html'
s = open(path, encoding='utf-8').read()
def one(old, new):
    global s
    n = s.count(old); assert n == 1, (n, old[:90]); s = s.replace(old, new)

one("function resizeImageFile(file, maxDim, quality){\n  return new Promise(",
    """/* 1358: an iPhone photo (HEIC) cannot be decoded by Chrome, so this wrapper converts it to JPEG first.
   The converter loads from cdnjs only when a HEIC actually arrives. Every photo path calls resizeImageFile. */
function crIsHeic(f){ return !!f && (/^image\\/hei[cf]/i.test(String(f.type || '')) || /\\.hei[cf]$/i.test(String(f.name || ''))); }
var _crHeicLib = null;
function crLoadHeic(){
  var w = /** @type {any} */ (window);
  if(w.heic2any) return Promise.resolve(w.heic2any);
  if(_crHeicLib) return _crHeicLib;
  _crHeicLib = new Promise(function(res, rej){
    var sc = document.createElement('script');
    sc.src = 'https://cdnjs.cloudflare.com/ajax/libs/heic2any/0.0.4/heic2any.min.js';
    sc.async = true;
    sc.onload = function(){ if(w.heic2any) res(w.heic2any); else { _crHeicLib = null; rej(new Error('the converter did not load')); } };
    sc.onerror = function(){ _crHeicLib = null; rej(new Error('the converter could not be downloaded \\u2014 check the connection and try again')); };
    document.head.appendChild(sc);
  });
  return _crHeicLib;
}
async function crHeicToJpeg(file){
  var h = await crLoadHeic();
  var out = await h({ blob:file, toType:'image/jpeg', quality:0.9 });
  var b = Array.isArray(out) ? out[0] : out;
  var nm = String(file.name || 'photo').replace(/\\.[^.]+$/, '') + '.jpg';
  try{ return new File([b], nm, { type:'image/jpeg' }); }catch(_){ return b; }
}
function resizeImageFile(file, maxDim, quality){
  return crResizeRaw1358(file, maxDim, quality).catch(function(err){
    if(!crIsHeic(file)) throw err;
    return crHeicToJpeg(file).then(function(jpg){ return crResizeRaw1358(jpg, maxDim, quality); }, function(e2){
      throw new Error('This iPhone photo (HEIC) could not be converted: ' + ((e2 && e2.message) || e2));
    });
  });
}
function crResizeRaw1358(file, maxDim, quality){
  return new Promise(""")
one("  if(!file || !/^image\\//.test(file.type || '')) return file;",
    "  if(!file || !(/^image\\//.test(file.type || '') || crIsHeic(file))) return file;   /* 1358: a HEIC with no type still converts */")
one('<input type="file" id="galFileInput" accept="image/*" multiple style="display:none;">',
    '<input type="file" id="galFileInput" accept="image/*,.heic,.heif" multiple style="display:none;">')
one(">v2026-10-16 build 1357<button", ">v2026-10-16 build 1358<button")
one("""  { b: 1357, d:'2026-10-16',""",
"""  { b: 1358, d:'2026-10-16', t:'iPhone photos upload', s:'Photos taken on an iPhone (HEIC files) now upload from a computer or an Android phone. Before, the photo album stopped with "Upload failed" because those browsers cannot open that kind of file. The app now turns it into a normal JPEG first, so it shows up, shrinks and shares like any other photo. The album’s file picker also lists .heic files now.' },
  { b: 1357, d:'2026-10-16',""")
pl.write_atomic(path, s)
print('ok 1358')
