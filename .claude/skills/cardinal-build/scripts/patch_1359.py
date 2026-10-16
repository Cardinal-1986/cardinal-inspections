"""Build 1359 — job files live in file storage, up to 50 MB each (Theo picked option 1).
Theo: a rep "is trying upload multiple docs and pdfs. There is a 10mb limit but some are much larger. He says
it's still one doc at a time he can upload. Would it be better if we somehow stored to spark ...?"
Measured: a job file was base64 text INSIDE inspection_reports.html (404 files, 180 MB in rows, biggest
13 MB) — that is the 10 MB cap. The Documents picker already takes several files; the loop skipped any file
over 10 MB and the next "Uploading 2 of 3" overwrote the message, and the first failure stopped the rest —
so it read as "one at a time".
- job_files_bucket.sql (APPLIED first): private bucket `job-files`, 50 MB, any type; read/write only on a job
  the user can see (the projects RLS), delete by uploader or admin.
- New files upload to job-files/<project_id>/…; the row keeps {file:1,name,mime,size,bucket,path}. Old rows
  ({…,data}) keep opening exactly as before — every reader takes either shape.
- Documents: several at once, 50 MB each, a too-big file and a failed one are LISTED at the end (and the
  message stays), and one failure no longer stops the rest. Insurance documents (1332's multi-pick) the same.
- The Spark was not used: it is never a live dependency of the app (settled)."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
import patch_lib as pl
path = sys.argv[1] if len(sys.argv) > 1 else 'index.html'
s = open(path, encoding='utf-8').read()
def one(old, new):
    global s
    n = s.count(old); assert n == 1, (n, old[:90]); s = s.replace(old, new)

# 1. helpers + the opener reads either shape
one("""async function openJobFile(id){""",
"""/* 1359: job files live in the job-files bucket (50 MB each); old rows still carry their bytes in `data`. */
var JOB_FILE_MAX = 50 * 1024 * 1024;
function crJobFileSafe(n){ return String(n || 'file').replace(/[^\\w.\\-]+/g, '_').slice(-120) || 'file'; }
async function crJobFileUp(pid, file){
  if(!TEAM || !sb) throw new Error('file storage needs a connection');
  var key = String(pid) + '/' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7) + '-' + crJobFileSafe(file.name);
  var up = await sb.storage.from('job-files').upload(key, file, { contentType: file.type || 'application/octet-stream', upsert: false });
  if(up && up.error) throw new Error(up.error.message || 'the upload was refused');
  return { file: 1, name: file.name, mime: file.type || '', size: file.size, bucket: 'job-files', path: key };
}
async function crJobFileBlob(meta){
  if(meta && meta.path){
    var r = await sb.storage.from(meta.bucket || 'job-files').download(meta.path);
    if(!r || r.error || !r.data) throw new Error((r && r.error && r.error.message) || 'the file could not be downloaded');
    return r.data;
  }
  if(meta && meta.data) return await (await fetch(meta.data)).blob();
  throw new Error('there is no stored file');
}
async function openJobFile(id){""")
one("""    var row = await db.get(id);
    var meta = JSON.parse(row.html);
    openStoredFile(meta.data, meta.mime, tab, 'file');""",
"""    var row = await db.get(id);
    var meta = JSON.parse(row.html);
    if(meta && meta.path){   /* 1359: a stored file — open its bytes as a blob document, same as openStoredFile */
      var bl = await crJobFileBlob(meta);
      var url = URL.createObjectURL(new Blob([bl], { type: meta.mime || bl.type || 'application/octet-stream' }));
      if(tab && !tab.closed) tab.location = url; else window.open(url, '_blank');
      setTimeout(function(){ URL.revokeObjectURL(url); }, 120000);
      return;
    }
    openStoredFile(meta.data, meta.mime, tab, 'file');""")

# 2. Documents: 50 MB, keep going, say what was skipped
one("""  var st = document.getElementById('jdStatus');
  var added = 0;
  for(var i = 0; i < files.length; i++){
    var f = files[i];
    if(f.size > 10 * 1024 * 1024){
      st.textContent = '\\u201C' + f.name + '\\u201D skipped \\u2014 over the 10 MB limit.';
      continue;
    }
    st.textContent = 'Uploading ' + (i + 1) + ' of ' + files.length + '\\u2026';
    try{
      var dataUrl = await new Promise(function(res, rej){
        var rd = new FileReader();
        rd.onload = function(){ res(rd.result); };
        rd.onerror = function(){ rej(new Error('could not read file')); };
        rd.readAsDataURL(f);
      });
      var payload = JSON.stringify({ file: 1, name: f.name, mime: f.type || '', size: f.size, data: dataUrl });
      await db.create('File: ' + f.name, payload, currentProject.name, currentProject.id);
      added++;
    }catch(err){
      st.textContent = 'Upload failed: ' + (err.message || err);
      break;
    }
  }
  if(added){
    st.textContent = '\\u2713 Added ' + added + ' file' + (added === 1 ? '' : 's') + '.';
    setTimeout(function(){ st.textContent = ''; }, 3500);
    try{ await reload(); }catch(e){}
  }""",
"""  var st = document.getElementById('jdStatus');
  var added = 0, big = [], bad = [], pr0 = currentProject;
  for(var i = 0; i < files.length; i++){
    var f = files[i];
    /* 1359: 50 MB a file, and a skipped or failed file is listed at the end instead of overwritten */
    if(f.size > JOB_FILE_MAX){ big.push(f.name); continue; }
    st.textContent = 'Uploading ' + (i + 1) + ' of ' + files.length + ' \\u2014 ' + f.name + '\\u2026';
    try{
      var payload = JSON.stringify(await crJobFileUp(pr0.id, f));
      await db.create('File: ' + f.name, payload, pr0.name, pr0.id);
      added++;
    }catch(err){
      bad.push(f.name + ' (' + ((err && err.message) || err) + ')');
    }
  }
  var msg = [];
  if(added) msg.push('\\u2713 Added ' + added + ' file' + (added === 1 ? '' : 's') + '.');
  if(big.length) msg.push('Over 50 MB, not added: ' + big.join(', ') + '.');
  if(bad.length) msg.push('Could not upload: ' + bad.join(', ') + '.');
  st.textContent = msg.join(' ');
  if(added && !big.length && !bad.length) setTimeout(function(){ st.textContent = ''; }, 3500);
  if(added){
    try{ await reload(); }catch(e){}
  }""")

# 3. Insurance documents
one("""  if(file.size > 10 * 1024 * 1024) throw new Error('File is over the 10 MB limit');
  var dataUrl = await new Promise(function(res, rej){
    var rd = new FileReader();
    rd.onload = function(){ res(rd.result); };
    rd.onerror = function(){ rej(new Error('could not read file')); };
    rd.readAsDataURL(file);
  });
  var payload = JSON.stringify({ file: 1, name: file.name, mime: file.type || '', size: file.size, data: dataUrl });
  var title = 'Insurance Doc [' + typeKey + ']: ' + file.name;""",
"""  if(file.size > JOB_FILE_MAX) throw new Error('File is over the 50 MB limit');   /* 1359 */
  var payload = JSON.stringify(await crJobFileUp(pr.id, file));
  var title = 'Insurance Doc [' + typeKey + ']: ' + file.name;""")

# 4. the scope reader reads either shape
one("""  if(!pay || !pay.file || !pay.data){""", """  if(!pay || !pay.file || !(pay.data || pay.path)){   /* 1359: or a stored file */""")
one("""    var blob = await (await fetch(pay.data)).blob();
    f = new File([blob], nm, { type: pay.mime || blob.type || 'application/pdf' });""",
"""    var blob = (typeof crJobFileBlob === 'function') ? await crJobFileBlob(pay) : await (await fetch(pay.data)).blob();   /* 1359: either shape */
    f = new File([blob], nm, { type: pay.mime || blob.type || 'application/pdf' });""")

one(">v2026-10-16 build 1358<button", ">v2026-10-16 build 1359<button")
one("""  { b: 1358, d:'2026-10-16',""",
"""  { b: 1359, d:'2026-10-16', t:'Bigger job files, several at once', s:'Documents on a job (and insurance documents) can now be up to 50 MB each, up from 10 MB, and you can pick several at once. If a file is too big or does not upload, the page now lists it by name at the end instead of the message disappearing, and the rest still upload. Files you already have open exactly as before.' },
  { b: 1358, d:'2026-10-16',""")
pl.write_atomic(path, s)
print('ok 1359')
