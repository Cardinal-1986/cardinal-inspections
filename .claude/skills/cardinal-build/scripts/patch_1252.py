#!/usr/bin/env python3
"""Build 1252 — only Theo, Joan and Curtis assign or close punch work.

Theo, 7 Oct: "Only me Joan and Curtis can edit the assigned to, completion."
punch_boss_guard.sql (applied first) is the authority. This build makes the
app agree with it so nobody is shown a control the database will refuse:

  * window.isPunchBoss() — one helper, the same three addresses as
    public.is_punch_boss().
  * Punch List: the queue's Assign button and the home strip's tick follow it.
  * Ultrawide map: the pin's assign buttons follow it.
  * "+ New" composer: Assign to shows for the bosses only; everyone else sees
    "Curtis assigns it" and the item is filed unassigned. Its "Ticket" option
    reads "Repair", the word the Punch List already uses (1248).
  * The punch card: Close and Reopen are the bosses' (isManager() was already
    exactly these three). Everyone else — Scottie included — sees what is
    still missing and, once ready, "Tell Curtis it's finished", which posts to
    the job's messages and buzzes Curtis and Theo.

usage: python3 patch_1252.py [index.html]
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import patch_lib as pl
PATH = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), '../../../../index.html')
src = pl.load(PATH)

# ── the one helper ──
src = pl.sub(src, '''function isProductionUser(){ return TEAM && currentUser && PRODUCTION_EMAILS.indexOf(currentUser.email) !== -1; }''',
'''function isProductionUser(){ return TEAM && currentUser && PRODUCTION_EMAILS.indexOf(currentUser.email) !== -1; }
/* 1252: who may assign and close punch work — Theo's rule, the same three
   addresses as public.is_punch_boss() (punch_boss_guard.sql), which is the
   authority. This only keeps the app from offering what it would refuse. */
var PUNCH_BOSS_EMAILS = ['theo@cardinalrenovations.net', 'joan@cardinalrenovations.net', 'curtis@cardinalrenovations.net'];
function isPunchBoss(){ return !!(currentUser && PUNCH_BOSS_EMAILS.indexOf(String(currentUser.email || '').toLowerCase()) !== -1); }
window.isPunchBoss = isPunchBoss;''')

# ── Punch List ──
src = pl.sub(src, '''function mayClose(){
  try{
    var prod  = (typeof window.isProductionUser === 'function') ? window.isProductionUser() : null;
    var admin = (typeof window.isAdminUser === 'function') ? window.isAdminUser() : null;
    if(prod === null && admin === null) return true;
    return !!prod || !!admin;
  }catch(e){ return true; }
}''', '''function mayClose(){
  /* 1252: Theo, Joan and Curtis only (punch_boss_guard). Falls OPEN when the
     helper is missing so a partial boot hides nothing — the database refuses
     the write regardless. */
  try{
    if(typeof window.isPunchBoss !== 'function') return true;
    return !!window.isPunchBoss();
  }catch(e){ return true; }
}''')
src = pl.sub(src, '''                  : ' aria-disabled="true" title="Only the production team can close punch items"') +''',
                  '''                  : ' aria-disabled="true" title="Only Theo, Joan and Curtis close punch items"') +''')
src = pl.sub(src, '''      crTell('Only the production team can close or reopen a punch item.\\\\n\\\\n' +''',
                  '''      crTell('Only Theo, Joan and Curtis can close or reopen a punch item.\\\\n\\\\n' +''')
src = pl.sub(src, '''    try{ mayAsg = (typeof isAdminUser === 'function' && isAdminUser()) ||
                  (typeof isProductionUser === 'function' && isProductionUser()); }catch(_){}''',
'''    try{ mayAsg = (typeof window.isPunchBoss === 'function') && window.isPunchBoss(); }catch(_){}   /* 1252 */''')

# ── ultrawide map pins ──
src = pl.sub(src, '''  function canAssign(){ try{ return (typeof isAdminUser==='function' && isAdminUser()) || (typeof isProductionUser==='function' && isProductionUser()); }catch(e){ return false; } }''',
'''  function canAssign(){ try{ return typeof window.isPunchBoss==='function' && window.isPunchBoss(); }catch(e){ return false; } }   /* 1252 */''')

# ── composer ──
src = pl.sub(src, '''    '<option value="punch">Punch</option><option value="ticket">Ticket</option>' +''',
                  '''    '<option value="punch">Punch-out</option><option value="ticket">Repair</option>' +''')
src = pl.sub(src, '''    '<div><label>Assign to</label><select data-f="assigned">' + who + '</select></div>' +''',
'''    /* 1252: only Theo, Joan and Curtis assign; everyone else files it unassigned */
    ((typeof window.isPunchBoss === 'function' && !window.isPunchBoss())
      ? '<div><label>Assign to</label><div class="pbnote" style="padding:10px 0;">Curtis assigns it</div></div>'
      : '<div><label>Assign to</label><select data-f="assigned">' + who + '</select></div>') +''')

# ── the card ──
src = pl.sub(src, '''function closeHtml(done){
  if(done){
    return '<button class="pkclose reopen" data-act="reopen" type="button">Reopen punch-out' +
      '<b>' + esc('closed ' + (it.done_at ? fmtWhen(it.done_at) : '') + ' by ' + nameOf(it.done_by)) + '</b></button>';
  }''', '''function closeHtml(done){
  var boss = isManager();   /* 1252: Theo, Joan, Curtis — punch_boss_guard */
  if(done){
    if(!boss) return '<div class="pkclose closed-ro">Closed<b>' + esc((it.done_at ? fmtWhen(it.done_at) + ' ' : '') + 'by ' + nameOf(it.done_by)) + '</b></div>';
    return '<button class="pkclose reopen" data-act="reopen" type="button">Reopen punch-out' +
      '<b>' + esc('closed ' + (it.done_at ? fmtWhen(it.done_at) : '') + ' by ' + nameOf(it.done_by)) + '</b></button>';
  }''')
src = pl.sub(src, '''  var ready = readyToClose();
  return '<button class="pkclose' + (ready ? ' ready' : '') + '" data-act="close" type="button">' +
    'Close punch-out' +''', '''  var ready = readyToClose();
  if(!boss){
    /* 1252: the crew finishes, Curtis closes. Ready = tell him; not ready = what is left. */
    return '<button class="pkclose' + (ready ? ' ready' : '') + '" data-act="' + (ready ? 'askclose' : 'close') + '" type="button">' +
      (ready ? 'Tell Curtis it\\u2019s finished' : 'Finish the punch-out') +
      '<b>' + (ready ? 'Curtis closes it' : want.join(' \\u00b7 ') + ' left') + '</b></button>';
  }
  return '<button class="pkclose' + (ready ? ' ready' : '') + '" data-act="close" type="button">' +
    'Close punch-out' +''')
src = pl.sub(src, '''async function doClose(){
  if(it.status === 'done') return;''', '''/* 1252: the crew's "it's finished" — a message on the job and a buzz to the
   office (Curtis and Theo), never a status change, which is the bosses'. */
async function askClose(){
  if(it.status === 'done' || !readyToClose()) return;
  var me = myEmail(), list = comments().slice();
  list.push({ by:me, name:nameOf(me), at:new Date().toISOString(), text:'Finished \\u2014 ready for Curtis to close.', flag:'askclose' });
  await save({ comments:list });
  var to = officeEmails();
  if(to.length && typeof window.notifyTeam === 'function'){
    var pr = projectFor(it.project_id);
    try{
      var res = await window.notifyTeam(to, 'Ready to close: ' + ((pr && pr.name) || 'a job') + ' \\u2014 ' + (it.title || 'punch-out'),
        '<p><b>' + esc(nameOf(me)) + '</b> finished <b>' + esc(it.title || '') + '</b> at <b>' + esc((pr && pr.name) || 'a job') + '</b>. Photos and steps are in. It is ready for you to close.</p>',
        punchLink(it.project_id));
      outMsg = outcomeText(res, to);
    }catch(_){ outMsg = 'Saved \\u2014 could not tell whether Curtis was buzzed.'; }
    lastSig = ''; render();
  }
}
async function doClose(){
  if(it.status === 'done') return;''')
src = pl.sub(src, '''  q('[data-act="close"]', function(b){ b.onclick = doClose; });''',
                  '''  q('[data-act="close"]', function(b){ b.onclick = doClose; });
  q('[data-act="askclose"]', function(b){ b.onclick = askClose; });''')
src = pl.sub(src, '''async function doClose(){
  if(it.status === 'done') return;
  if(!readyToClose()){''', '''async function doClose(){
  if(it.status === 'done') return;
  if(!isManager() && readyToClose()){ return askClose(); }   /* 1252 */
  if(!readyToClose()){''')
src = pl.sub(src, '''#cr-pk .pkclose.ready b{ color:#e4f6ec; }''', '''#cr-pk .pkclose.ready b{ color:#e4f6ec; }
#cr-pk .pkclose.closed-ro{ cursor:default; }   /* 1252: closed, and this person may not reopen it */''')

# ── stamp + changelog ──
src = pl.sub(src, '>v2026-10-07 build 1251<', '>v2026-10-07 build 1252<')
src = pl.sub(src, '''var CHANGELOG = [
''', '''var CHANGELOG = [
  { b: 1252, d: '2026-10-07', t: 'Only Theo, Joan and Curtis assign and close punch work',
    s: 'Assigning a punch-out, repair, callback or tarp, and closing or reopening one, is now for Theo, Joan and Curtis only. Everyone else can still file new work (it goes to the top of the Punch List for Curtis to assign), message on it, add photos, flag it for follow-up or put it on hold. When the crew finishes a job, the card shows \\u201cTell Curtis it\\u2019s finished\\u201d \\u2014 it posts to the job\\u2019s messages and lets Curtis and Theo know it\\u2019s ready to close.' },
''')
pl.write_atomic(PATH, src)
print('patched', PATH, len(src))
