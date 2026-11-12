#!/usr/bin/env python3
"""Build 1445: punch-out photos go up several at a time, and they arrive.

Theo, 12 Nov 2026, on Scottie's phone: "it's one photo at a time and it doesn't
even show up."

Measured before patching:
  * punch_items: no punch-out has a photo saved since August.
  * storage: Scottie has sent no photo anywhere in 30 days. The one punch photo
    uploaded since August (Curtis, 14 Oct) reached storage but never reached its
    punch-out.
  * Scottie's session of 12 Nov (16:49-16:53 UTC) read the punch-outs and sent
    no upload and no punch-out save. The photo is lost on the phone.

The old pickPhoto():
  1. made its file input with createElement and never put it in the page. iPhone
     Safari can drop a detached input while its camera is up, so the photo comes
     back to nothing: no upload and no error;
  2. set capture="environment": the phone camera, ONE shot, no library;
  3. ran CardinalSolUpload.prepare (the scope reader's) before photoPrepFile, and
     a large photo was sent to scopes/ by it;
  4. called save(), which returns early while another write is in flight, so a
     photo that finished uploading during a step tick was dropped silently.

The fix:
  * A slot tap or Take photos opens CardinalMultiCam (1229, the job album's
    in-app camera): shoot several, then Upload once. It gains a target mode
    (open({ key, room, onUpload, native })) so a caller can take the shots
    instead of the album. Album mode is unchanged.
  * Add from phone picks several from the library.
  * Both inputs live in the page (display:none, like the album's own).
  * Each photo is still re-encoded by photoPrepFile (1600px, no EXIF/GPS) and
    still goes to the offline outbox with no signal.
  * The card says "Uploading N photos" while it works, waits for an in-flight
    write before saving, and if the card has moved on it appends on the server
    the way the offline flush does.

Usage: python3 patch_1445_photos.py <in.html> <out.html>
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import patch_lib as pl

src_path, out_path = sys.argv[1], sys.argv[2]
s = pl.load(src_path)


def block(s, sid):
    i = s.find('<script id="' + sid + '"')
    assert i >= 0, sid
    j = s.find('</script>', i)
    return i, j


def sub_in(s, sid, old, new):
    i, j = block(s, sid)
    b = s[i:j]
    assert b.count(old) == 1, (sid, old[:80], b.count(old))
    return s[:i] + b.replace(old, new) + s[j:]


# ---------------------------------------------------------------- cr-mcam-script
MC = 'cr-mcam-script'

s = sub_in(s, MC,
"var root = null, video = null, stream = null, shots = [], forPid = null, isOpen = false, stripOn = false;\n",
"var root = null, video = null, stream = null, shots = [], forPid = null, isOpen = false, stripOn = false;\n"
"/* 1445: target mode. open({ key, room, onUpload, native }) hands the shots to the\n"
"   caller instead of the album: the punch-out card uses it. null = the album, as before. */\n"
"var target = null;\n")

s = sub_in(s, MC,
"function mcRoom(){\n"
"  var max = window.GAL_MAX || 50;\n",
"function mcRoom(){\n"
"  if(target) return Math.max(0, (Number(target.room && target.room()) || 20) - shots.length);\n"
"  var max = window.GAL_MAX || 50;\n")

s = sub_in(s, MC,
"  var rm = mcQ('.mc-room'); if(rm) rm.textContent = r <= 5 ? (r ? r + ' left' : 'Album full') : '';\n",
"  var rm = mcQ('.mc-room'); if(rm) rm.textContent = r <= 5 ? (r ? r + ' left' : (target ? 'Upload these first' : 'Album full')) : '';\n")

s = sub_in(s, MC,
"async function mcUpload(){\n"
"  if(!shots.length) return;\n"
"  var cp = window.currentProject;\n",
"async function mcUpload(){\n"
"  if(!shots.length) return;\n"
"  if(target){\n"
"    /* 1445: the caller owns these. They go to what the camera was opened for,\n"
"       even if the screen behind has moved on. */\n"
"    var tg = target, tstamp = Date.now();\n"
"    var tfiles = shots.map(function(s, i){ return new File([s.blob], 'camera-' + tstamp + '-' + (i + 1) + '.jpg', { type:'image/jpeg' }); });\n"
"    var theld = shots;\n"
"    shots = [];\n"
"    mcHide();\n"
"    try{ await tg.onUpload(tfiles); }\n"
"    finally{ theld.forEach(function(s){ try{ URL.revokeObjectURL(s.url); }catch(_){} }); }\n"
"    return;\n"
"  }\n"
"  var cp = window.currentProject;\n")

s = sub_in(s, MC,
"  if(k === 'native'){\n"
"    mcDiscard(); mcHide();\n"
"    var inp = document.getElementById('galCamInput');\n",
"  if(k === 'native'){\n"
"    mcDiscard(); mcHide();\n"
"    if(target && typeof target.native === 'function'){ target.native(); return; }   /* 1445 */\n"
"    var inp = document.getElementById('galCamInput');\n")

s = sub_in(s, MC,
"function mcOpen(){\n"
"  if(!window.currentProject) return;\n"
"  mcBuild();\n"
"  if(!isOpen || String(forPid) !== String(window.currentProject.id)){\n"
"    if(String(forPid) !== String(window.currentProject.id)) mcDiscard();\n"
"    forPid = window.currentProject.id;\n"
"  }\n"
"  isOpen = true;\n",
"function mcOpen(opts){\n"
"  /* 1445: with { key, onUpload } the shots go to the caller; without, the album as before */\n"
"  var t = (opts && typeof opts.onUpload === 'function' && opts.key) ? opts : null;\n"
"  if(t){\n"
"    mcBuild();\n"
"    var tk = 't:' + t.key;\n"
"    if(String(forPid) !== tk){ mcDiscard(); forPid = tk; }\n"
"  }else{\n"
"  if(!window.currentProject) return;\n"
"  mcBuild();\n"
"  if(!isOpen || String(forPid) !== String(window.currentProject.id)){\n"
"    if(String(forPid) !== String(window.currentProject.id)) mcDiscard();\n"
"    forPid = window.currentProject.id;\n"
"  }\n"
"  }\n"
"  target = t;\n"
"  var secSel = mcQ('.mc-sec'); if(secSel) secSel.hidden = !!t;   /* album sections mean nothing to a caller */\n"
"  isOpen = true;\n")

s = sub_in(s, MC,
"  _state: function(){ return { open: isOpen, shots: shots.length, pid: forPid, live: !!stream, zoom: zoom, lens: !!hw }; }\n",
"  _state: function(){ return { open: isOpen, shots: shots.length, pid: forPid, live: !!stream, zoom: zoom, lens: !!hw, target: !!target }; }\n")

# ---------------------------------------------------------------- cr-pk-script
PK = 'cr-pk-script'

s = sub_in(s, PK,
"  cam  :'<rect x=\"3\" y=\"7\" width=\"18\" height=\"13\" rx=\"2\"/><circle cx=\"12\" cy=\"13.5\" r=\"4\"/><path d=\"M8.5 7l2-3h3l2 3\"/>',\n",
"  cam  :'<rect x=\"3\" y=\"7\" width=\"18\" height=\"13\" rx=\"2\"/><circle cx=\"12\" cy=\"13.5\" r=\"4\"/><path d=\"M8.5 7l2-3h3l2 3\"/>',\n"
"  img  :'<rect x=\"3\" y=\"4\" width=\"18\" height=\"16\" rx=\"2\"/><circle cx=\"9\" cy=\"10\" r=\"2\"/><path d=\"M21 16l-5-5-9 9\"/>',\n")

s = sub_in(s, PK,
"  var _pend = photoPendFor(it && it.id);\n"
"  var pnote = _pend ? '<div class=\"pkpnote\">' + svg('cam') + esc(_pend + ' photo' + (_pend === 1 ? '' : 's') + ' saved on your phone \\u2014 uploading when you\\u2019re back') + '</div>' : '';\n",
"  /* 1445: the library takes several at once; the slots and the camera take several too */\n"
"  gal += '<button class=\"pkgalbtn\" data-act=\"phlib\" type=\"button\">' + svg('img') + ' Add photos from phone</button>';\n"
"  var _pend = photoPendFor(it && it.id);\n"
"  var pnote = _pend ? '<div class=\"pkpnote\">' + svg('cam') + esc(_pend + ' photo' + (_pend === 1 ? '' : 's') + ' saved on your phone \\u2014 uploading when you\\u2019re back') + '</div>' : '';\n"
"  var _upn = upFor(it && it.id);\n"
"  if(_upn) pnote += '<div class=\"pkpnote\" data-pkup=\"' + _upn + '\">' + svg('cam') + esc('Uploading ' + _upn + ' photo' + (_upn === 1 ? '' : 's') + '\\u2026') + '</div>';\n")

s = sub_in(s, PK,
"  var add = '<button class=\"pkgadd\" data-act=\"galadd\" type=\"button\">' + svg('cam') + 'Add photo</button>';\n",
"  var add = '<button class=\"pkgadd\" data-act=\"galadd\" type=\"button\">' + svg('cam') + 'Take photos</button>' +\n"
"    '<button class=\"pkgadd\" data-act=\"phlib\" type=\"button\">' + svg('img') + 'From phone</button>';\n")

OLD_PICK_HEAD = (
"function pickPhoto(i){\n"
"  var inp = document.createElement('input');\n"
"  inp.type = 'file';\n"
"  inp.accept = 'image/*';\n")
OLD_PICK_TAIL = (
"      crTell('Could not attach the photo: ' + (e.message || e));\n"
"    }\n"
"  };\n"
"  inp.click();\n"
"}\n")
i, j = block(s, PK)
b = s[i:j]
a = b.find(OLD_PICK_HEAD); z = b.find(OLD_PICK_TAIL)
assert a >= 0 and z > a and b.count(OLD_PICK_HEAD) == 1 and b.count(OLD_PICK_TAIL) == 1
old_pick = b[a:z + len(OLD_PICK_TAIL)]
assert old_pick.count('function ') == 1, 'the old pickPhoto slice spans one function'
print('old pickPhoto:', len(old_pick), 'chars')

NEW_PICK = r"""/* 1445: Theo, on Scottie's phone: "it's one photo at a time and it doesn't even
   show up." The old pickPhoto made its file input with createElement and never
   put it in the page, and iPhone Safari can drop a detached input while its
   camera is up: the photo came back to nothing, with no upload and no error. It
   also set capture="environment" (the phone camera, ONE shot, no library).
   Measured: Scottie's session of 12 Nov sent no upload and no punch-out save.
   Now:
   - a slot tap or Take photos opens the app's own camera (CardinalMultiCam,
     1229): shoot several, then Upload once;
   - Add from phone picks several from the library;
   - both inputs live in the page, like the album's.
   Every photo still takes photoPrepFile (1600px, no EXIF / GPS) and the offline
   outbox. CardinalSolUpload.prepare is off this path: it is the scope reader's,
   and it sent a large photo to scopes/. */
var PK_BATCH = 20;
var _pkInp = null, _pkUp = {};
function upFor(id){ return (id && _pkUp[id]) || 0; }
function pkInput(){
  if(_pkInp && document.body.contains(_pkInp)) return _pkInp;
  var inp = document.createElement('input');
  inp.type = 'file';
  inp.accept = 'image/*';
  inp.id = 'pkPhotoInput';
  inp.tabIndex = -1;
  inp.setAttribute('aria-hidden', 'true');
  inp.style.display = 'none';
  inp.addEventListener('change', function(){
    var fs = Array.prototype.slice.call(inp.files || []);
    var id = inp.getAttribute('data-for');
    inp.value = '';
    if(fs.length && id) addPhotos(id, fs);
  });
  document.body.appendChild(inp);
  _pkInp = inp;
  return inp;
}
function pickFromPhone(){
  if(!it) return;
  var inp = pkInput();
  inp.removeAttribute('capture');
  inp.multiple = true;
  inp.setAttribute('data-for', it.id);
  inp.click();
}
function phoneCamera(id){
  var inp = pkInput();
  inp.multiple = false;
  /* the phone's camera, ONE photo: only when the app's own camera cannot run */
  inp.setAttribute('capture', 'environment');
  inp.setAttribute('data-for', id);
  inp.click();
}
function pickPhoto(){
  if(!it) return;
  var id = it.id;
  var mc = window.CardinalMultiCam;
  /* synchronous, so the fallback click is still the tap */
  if(mc && mc.supported && mc.supported()){
    mc.open({ key: 'punch:' + id, room: function(){ return PK_BATCH; },
      onUpload: function(files){ return addPhotos(id, files); },
      native: function(){ phoneCamera(id); } });
    return;
  }
  phoneCamera(id);
}
async function addPhotos(id, files){
  files = Array.prototype.slice.call(files || []).filter(Boolean);
  if(!id || !files.length) return { added: 0, held: 0, failed: 0 };
  var pkMine = function(){ return !!(it && String(it.id) === String(id)); };
  var pkRepaint = function(){ if(pkMine()){ lastSig = ''; render(); } };
  var base = pkMine() ? photos().length : 0;
  var me = myEmail(), nm = nameOf(me);
  var added = [], held = 0, bad = [];
  _pkUp[id] = (_pkUp[id] || 0) + files.length;
  pkRepaint();
  for(var n = 0; n < files.length; n++){
    var f = files[n];
    try{
      if(typeof photoPrepFile === 'function'){ try{ f = await photoPrepFile(f); }catch(_){} }
      if(typeof navigator !== 'undefined' && navigator.onLine === false){
        await queuePhoto(id, f); held++; continue;
      }
      var pos = base + added.length;
      var path = 'punch/' + id + '/' + Date.now() + '-' + n + '-' + (SLOTS[pos] ? SLOTS[pos].k : 'extra') + '.jpg';
      var up = await window.supa.storage.from('photos').upload(path, f, { upsert:true, contentType:'image/jpeg' });
      if(up.error) throw up.error;
      var pub = window.supa.storage.from('photos').getPublicUrl(path);
      var url = (pub && pub.data && pub.data.publicUrl) || '';
      if(!url) throw new Error('no url back from storage');
      added.push({ u:url, by:me, name:nm, at:new Date().toISOString() });
    }catch(e){
      if(_pNet(e)){ try{ await queuePhoto(id, f); held++; }catch(_q){ bad.push(e); } }
      else bad.push(e);
    }finally{
      _pkUp[id] = Math.max(0, (_pkUp[id] || 0) - 1);
      pkRepaint();
    }
  }
  if(added.length){
    try{ await attachPhotos(id, added); }
    catch(e2){ bad.push(e2); added = []; }
  }
  if(held) flushPhotos();
  if(bad.length){
    var m = (bad[0] && bad[0].message) || String(bad[0]);
    crTell((bad.length === 1 ? 'Could not attach a photo: ' : 'Could not attach ' + bad.length + ' photos: ') + m);
  }
  pkRepaint();
  return { added: added.length, held: held, failed: bad.length };
}
async function attachPhotos(id, added){
  var pkAllShown = function(){ return added.every(function(p){ return photos().some(function(q){ return pUrl(q) === p.u; }); }); };
  if(it && String(it.id) === String(id)){
    /* save() returns early while another write is in flight, which dropped a
       photo that finished uploading during a step tick. Wait for it. */
    for(var w = 0; busy && w < 150; w++) await new Promise(function(r){ setTimeout(r, 100); });
    if(!busy && it && String(it.id) === String(id)){
      await save({ photos: photos().filter(function(x){ return !!pUrl(x); }).concat(added) });
      if(it && String(it.id) === String(id) && pkAllShown()) return;
    }
  }
  /* the card moved on, or its save was refused: append on the server, as the
     offline flush does (read the current list, add what is missing) */
  var cx = window.sb || window.supa;
  var cur = await cx.from('punch_items').select('photos').eq('id', id).single();
  if(cur && cur.error) throw cur.error;
  var arr = (cur && cur.data && Array.isArray(cur.data.photos)) ? cur.data.photos.slice() : [];
  added.forEach(function(p){ if(!arr.some(function(q){ return pUrl(q) === p.u; })) arr.push(p); });
  var ur = await cx.from('punch_items').update({ photos: arr }).eq('id', id);
  if(ur && ur.error) throw ur.error;
  try{ if(window.CardinalPunch && window.CardinalPunch.reload) await window.CardinalPunch.reload(); }catch(_){}
  if(it && String(it.id) === String(id)){
    var fresh = (typeof rowFor === 'function') ? rowFor(id) : null;
    if(fresh) it = fresh;
  }
}
"""
s = s[:i] + b.replace(old_pick, NEW_PICK) + s[j:]

s = sub_in(s, PK,
"  q('[data-act=\"galadd\"]', function(b){ b.onclick = function(){ pickPhoto(photos().length); }; });\n",
"  q('[data-act=\"galadd\"]', function(b){ b.onclick = function(){ pickPhoto(); }; });\n"
"  q('[data-act=\"phlib\"]', function(b){ b.onclick = function(){ pickFromPhone(); }; });   /* 1445 */\n")

s = sub_in(s, PK,
"    pickPhoto(i);\n"
"  }; });\n",
"    pickPhoto();\n"
"  }; });\n")

s = sub_in(s, PK,
"function rcptPick(){\n"
"  var inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*'; inp.setAttribute('capture', 'environment');\n"
"  inp.onchange = async function(){\n"
"    var f = inp.files && inp.files[0]; if(!f || !it || !window.CardinalReceipts) return;\n",
"function rcptPick(){\n"
"  var inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*'; inp.setAttribute('capture', 'environment');\n"
"  /* 1445: in the page, or iPhone Safari can drop it while the camera is up (the photo fault). One at a time. */\n"
"  var _old = document.getElementById('pkRcptInput'); if(_old && _old.parentNode) _old.parentNode.removeChild(_old);\n"
"  inp.id = 'pkRcptInput'; inp.style.display = 'none'; inp.setAttribute('aria-hidden', 'true');\n"
"  document.body.appendChild(inp);\n"
"  inp.onchange = async function(){\n"
"    var f = inp.files && inp.files[0];\n"
"    try{ if(inp.parentNode) inp.parentNode.removeChild(inp); }catch(_rm){}\n"
"    if(!f || !it || !window.CardinalReceipts) return;\n")

assert s.count("  _discardPhoto: function(id){ return discardPhoto(id); },\n};") == 1
s = s.replace(
"  _discardPhoto: function(id){ return discardPhoto(id); },\n};",
"  _discardPhoto: function(id){ return discardPhoto(id); },\n"
"  _addPhotos: function(id, files){ return addPhotos(id, files); },   /* 1445 test hook */\n"
"};")

pl.write_atomic(out_path, s)
print('wrote', out_path)
