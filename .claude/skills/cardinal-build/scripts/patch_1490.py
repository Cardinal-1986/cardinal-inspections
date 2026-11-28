import sys
sys.path.insert(0, '/Users/cardinal/Library/Application Support/Claude/local-agent-mode-sessions/6faf96fc-b092-4eb3-bb94-9529487cc28c/6141bb56-7dbc-45f6-9b2b-f2e1860be711/rpm/plugin_01TFruGAR5g4rn2KiAVaYtG9/skills/cardinal-build/scripts')
import patch_lib as pl

src = pl.load('index_v1489.html')

# 1) header comment
src = pl.sub(src, """   Opened from: the job's Costs tab ("Read crew invoice"), or #crew-invoice (Command's Agents page links
   there), where the job is matched from the invoice address / job number and can be changed. */""",
"""   Opened from: the job's Costs tab ("Read crew invoice"), or #crew-invoice (Command's Agents page links
   there), where the job is matched from the invoice address / job number and can be changed.
   1490 (Theo: "I do want to save original invoices"): the ORIGINAL file goes to the private crew-docs
   bucket first (read = is_full_access only, the crew-pay fence; job-files would show it to every rep
   on the job). PDFs are then read from storage by path, so the 4.5 MB Vercel body cap no longer
   applies; photos still send a shrunk copy. Apply links the cost to the file (job_costs.file_*);
   Cancel removes an unapplied upload. Costs rows with a file get "View invoice" (office only). */""")

# 2) size caps
src = pl.sub(src, "var MAXB = 5 * 1024 * 1024;\nvar st = null;   /* { pid, inv, busy, err, dupe } */",
             "var MAXB = 25 * 1024 * 1024;   /* 1490: originals go to storage; Claude reads PDFs up to ~30 MB */\nvar st = null;   /* { pid, inv, busy, err, dupe, saved, applied } */")

# 3) shrink(): PDFs are no longer base64'd in the browser
src = pl.sub(src, """    if(file.type === 'application/pdf'){
      if(file.size > MAXB) return rej(new Error('That PDF is over 5 MB. Take a photo of the page instead.'));
      var r = new FileReader(); r.onload = function(){ res({ mime: 'application/pdf', data: String(r.result).split(',')[1] }); }; r.onerror = function(){ rej(new Error('Could not open the file.')); };
      r.readAsDataURL(file); return;
    }""",
"""    if(file.type === 'application/pdf'){ res({ mime: 'application/pdf', data: null }); return; }   /* 1490: read from storage */""")

# 4) read(): save the original first, then read
src = pl.sub(src, """  st.busy = true; st.err = ''; paint();
  try{
    var f = await shrink(file);
    var s = db() && db().auth ? await db().auth.getSession() : {};
    var tok = s && s.data && s.data.session ? s.data.session.access_token : '';
    var r = await fetch('/api/crew-invoice', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok },
      body: JSON.stringify({ file: f.data, mime: f.mime }) });""",
"""  st.busy = true; st.err = ''; paint();
  try{
    if(file.size > MAXB) throw new Error('That file is ' + (file.size / 1048576).toFixed(1) + ' MB; the limit is 25 MB. Take a photo of the page instead.');
    var f = await shrink(file);
    /* 1490: keep the original — private crew-docs bucket, office-only like crew pay */
    var safe = String(file.name || 'invoice').replace(/[^\\w.\\-]+/g, '_').slice(-80) || 'invoice';
    var key = 'invoices/' + new Date().toISOString().slice(0, 7) + '/' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7) + '-' + safe;
    var up = await db().storage.from('crew-docs').upload(key, file, { contentType: file.type || 'application/octet-stream', upsert: false });
    if(up && up.error) throw new Error('Could not save the original: ' + (up.error.message || 'refused'));
    st.saved = { bucket: 'crew-docs', path: key, name: file.name || safe };
    var s = db() && db().auth ? await db().auth.getSession() : {};
    var tok = s && s.data && s.data.session ? s.data.session.access_token : '';
    var r = await fetch('/api/crew-invoice', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok },
      body: JSON.stringify(f.data ? { file: f.data, mime: f.mime } : { storage_path: key, mime: f.mime }) });""")

# 5) apply(): link the cost to the file; if the SQL isn't run yet, save the cost anyway and say so
src = pl.sub(src, """    var row = { project_id: f.pid, kind: 'labor', description: desc, amount: Math.round(amt * 100) / 100,
      spent_on: f.date || new Date().toISOString().slice(0, 10), paid_by: 'company', reimburse: false, created_by: me() };
    var r = await db().from('job_costs').insert(row).select('id');
    if(r.error || !r.data || !r.data.length) throw new Error('Not saved: ' + ((r.error && r.error.message) || 'the database refused it.'));
    var pid = f.pid;
    close();
    tell('Added ' + M(row.amount) + ' labor cost' + (f.crew ? ' from ' + f.crew : '') + '.', 'ok');""",
"""    var row = { project_id: f.pid, kind: 'labor', description: desc, amount: Math.round(amt * 100) / 100,
      spent_on: f.date || new Date().toISOString().slice(0, 10), paid_by: 'company', reimburse: false, created_by: me() };
    var linked = false;
    if(st.saved){ row.file_bucket = st.saved.bucket; row.file_path = st.saved.path; row.file_name = String(st.saved.name).slice(0, 120); }
    var r = await db().from('job_costs').insert(row).select('id');
    if(r.error && st.saved && /file_(bucket|path|name)/.test(String(r.error.message || ''))){   /* 1490 SQL not run yet */
      delete row.file_bucket; delete row.file_path; delete row.file_name;
      r = await db().from('job_costs').insert(row).select('id');
    }else if(!r.error && st.saved){ linked = true; }
    if(r.error || !r.data || !r.data.length) throw new Error('Not saved: ' + ((r.error && r.error.message) || 'the database refused it.'));
    var pid = f.pid;
    st.applied = true;
    close();
    tell('Added ' + M(row.amount) + ' labor cost' + (f.crew ? ' from ' + f.crew : '') + '.' +
      (st && st.saved && !linked ? ' The original is saved but not linked yet (database update pending).' : (linked ? ' Original invoice saved.' : '')), 'ok');""")

# 6) close(): an upload that was never applied is removed
src = pl.sub(src, "function close(){ var m = q('cr-crinv'); if(m) m.classList.remove('on'); st = null;",
             "function close(){ var m = q('cr-crinv'); if(m) m.classList.remove('on');\n  if(st && st.saved && !st.applied){ try{ db().storage.from(st.saved.bucket).remove([st.saved.path]); }catch(_){} }   /* 1490 */\n  st = null;")

# 7) View invoice: delegated, office only, opens the original
src = pl.sub(src, """document.addEventListener('click', function(e){
  var b = e.target.closest && e.target.closest('[data-crinv-open]');
  if(b){ open({ pid: b.getAttribute('data-crinv-open') }); }
});""",
"""document.addEventListener('click', function(e){
  var b = e.target.closest && e.target.closest('[data-crinv-open]');
  if(b){ open({ pid: b.getAttribute('data-crinv-open') }); return; }
  var v = e.target.closest && e.target.closest('[data-crinv-view]');
  if(v){ viewFile(v.getAttribute('data-crinv-bucket'), v.getAttribute('data-crinv-view'), v); }
});
/* 1490: open the saved original (crew-docs; storage RLS refuses anyone outside the office) */
async function viewFile(bucket, path, btn){
  if(bucket !== 'crew-docs' || !path) return;
  var tab = null; try{ tab = window.open('', '_blank'); }catch(_){}
  try{
    var r = await db().storage.from(bucket).download(path);
    if(!r || r.error || !r.data) throw new Error((r && r.error && r.error.message) || 'not found');
    var url = URL.createObjectURL(r.data);
    if(tab && !tab.closed) tab.location = url; else window.open(url, '_blank');
    setTimeout(function(){ URL.revokeObjectURL(url); }, 120000);
  }catch(err){ if(tab && !tab.closed) tab.close(); tell('Could not open the invoice: ' + ((err && err.message) || err)); }
}""")

# 8) Costs tab row: "View invoice" for a cost that carries a file (office only)
src = pl.sub(src, """    if(r.k === 'cost' && r.raw && r.raw.reimburse){
      var c = r.raw, nm = payer(c.paid_by);""",
"""    if(r.k === 'cost' && r.raw && r.raw.file_path && r.raw.file_bucket === 'crew-docs' && isOffice()){   /* 1490 */
      h += '<div class="crjp-rb"><button type="button" data-crinv-view="' + E(r.raw.file_path) + '" data-crinv-bucket="crew-docs">📄 View invoice</button></div>';
    }
    if(r.k === 'cost' && r.raw && r.raw.reimburse){
      var c = r.raw, nm = payer(c.paid_by);""")

src = pl.sub(src, 'v2026-11-27 build 1489', 'v2026-11-27 build 1490')
pl.write_atomic('index_v1490.html', src)
pl.assert_in('index_v1490.html', '1490 (Theo: "I do want to save original invoices")')
pl.assert_in('index_v1490.html', "data-crinv-bucket=\"crew-docs\">📄 View invoice</button>")
print('patched')
