#!/usr/bin/env python3
"""Build 1250 — Flag for follow-up (Theo, 7 Oct 2026).

"Any way for say a salesman to ping a certain punchout. For instance if a
client called and starting yelling and saying I want to cancel the job. The
salesman can write a note urgent. Then an exclamation can appear in the punch
list screen and get moved to the top for follow up."

Card (cr-pk-script): anyone can "Flag for follow-up" with a note. The flag
shows in red at the top of the card, buzzes Curtis, Theo and the assignee
(never the sender) through notifyTeam, and stays up until somebody taps
Handled and says what they did. Both the flag and the answer are also written
into the card's message thread, so the history survives the next flag.

Punch List (cr-punch-script): a flagged item jumps to a new top group,
"Needs follow-up", with a red ! and the note as its line — on every tab, closed
work included (an angry call can come after the job closed). The rail gains a
Needs follow-up count. Columns from punch_ping.sql (applied 7 Oct).

usage: python3 patch_1250.py [index.html]
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import patch_lib as pl

PATH = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), '../../../../index.html')
src = pl.load(PATH)

# ════════════ the card ════════════
src = pl.sub(src, '''var holdOpen = false, holdPick = { r:'', d:'', n:'' };''',
'''var holdOpen = false, holdPick = { r:'', d:'', n:'' };
/* 1250: the follow-up flag's compose box */
var pingOpen = false;''')

src = pl.sub(src, '''    (urgent ? '<div class="pkurg">' + svg('flag') + 'Urgent — do first</div>' : '') +
    '<h1>' + esc(it.title || 'Punch-out') + '</h1>' +''',
'''    (urgent ? '<div class="pkurg">' + svg('flag') + 'Urgent — do first</div>' : '') +
    pingHtml() +
    '<h1>' + esc(it.title || 'Punch-out') + '</h1>' +
    (pingOn() || pingOpen ? '' : '<button class="pkfold dim pkpingbtn" data-act="ping" type="button"><span class="pkbang sm">!</span>' +
      '<span class="tx">Flag for follow-up</span><span class="ch">\\u203A</span></button>') +''')

src = pl.sub(src, '''/* ── 1249: On hold ── */''', '''/* ── 1250: Flag for follow-up ── */
function pingOn(){ return !!(it && it.ping_at && !it.ping_done_at); }
function pingHtml(){
  if(pingOn()){
    return '<div class="pkping" role="alert">' +
      '<div class="pkping-h"><span class="pkbang">!</span><b>Needs follow-up</b>' +
        '<span class="rt">' + esc(nameOf(it.ping_by)) + (it.ping_at ? ' \\u00b7 ' + esc(fmtWhen(it.ping_at)) : '') + '</span></div>' +
      '<div class="pkping-n">' + esc(it.ping_note || '') + '</div>' +
      '<textarea class="pkping-ta" data-f="pingdone" rows="2" placeholder="What did you do? (called her back, kept the job\\u2026)"></textarea>' +
      '<button class="pkping-go ok" data-act="pingdone" type="button">Handled</button>' +
    '</div>';
  }
  if(!pingOpen) return '';
  return '<div class="pkping compose">' +
    '<div class="pkping-h"><span class="pkbang">!</span><b>Flag for follow-up</b></div>' +
    '<textarea class="pkping-ta" data-f="pingnote" rows="3" placeholder="What happened? e.g. Client called upset, wants to cancel \\u2014 call her back today."></textarea>' +
    '<div class="pknote">Curtis, Theo and whoever has this job are buzzed. It stays at the top of the Punch List until someone marks it handled.</div>' +
    '<div class="pkping-f"><button class="pkbtn" data-act="pingx" type="button">Cancel</button>' +
      '<button class="pkping-go" data-act="pinggo" type="button">Flag it</button></div>' +
  '</div>';
}
function pingTo(){
  var me = myEmail(), out = officeEmails().slice();
  if(it.assigned_to) out.push(String(it.assigned_to).toLowerCase());
  return out.filter(function(e, i){ return e && e !== me && out.indexOf(e) === i; });
}
async function pingRaise(){
  var ta = el.querySelector('[data-f="pingnote"]');
  var note = ta ? ta.value.trim() : '';
  if(!note){ crTell('Say what happened first \\u2014 that note is what Curtis reads.'); return; }
  var me = myEmail(), now = new Date().toISOString();
  var list = comments().slice();
  list.push({ by:me, name:nameOf(me), at:now, text:'Follow up: ' + note, flag:'ping' });
  pingOpen = false;
  await save({ ping_note:note, ping_by:me || null, ping_at:now,
               ping_done_note:null, ping_done_by:null, ping_done_at:null, comments:list });
  if(typeof window.auditLog === 'function'){
    try{ window.auditLog('punch', 'Flagged for follow-up: ' + (it.title || ''), it.project_id); }catch(_){}
  }
  var to = pingTo();
  if(to.length && typeof window.notifyTeam === 'function'){
    var pr = projectFor(it.project_id);
    try{
      var res = await window.notifyTeam(to,
        'Follow up: ' + ((pr && pr.name) || 'a job') + ' \\u2014 ' + (it.title || 'punch-out'),
        '<p><b>' + esc(nameOf(me)) + '</b> flagged <b>' + esc(it.title || '') + '</b> at <b>' + esc((pr && pr.name) || 'a job') + '</b> for follow-up:</p>' +
        '<p>' + esc(note) + '</p>', punchLink(it.project_id));
      outMsg = outcomeText(res, to);
    }catch(_){ outMsg = 'Flagged \\u2014 could not tell whether anyone was buzzed.'; }
    lastSig = ''; render();
  }
}
async function pingHandled(){
  var ta = el.querySelector('[data-f="pingdone"]');
  var note = ta ? ta.value.trim() : '';
  if(!note){ crTell('Say what you did first \\u2014 the next person reads it.'); return; }
  var me = myEmail(), now = new Date().toISOString();
  var list = comments().slice();
  list.push({ by:me, name:nameOf(me), at:now, text:'Handled: ' + note, flag:'ping-done' });
  await save({ ping_done_note:note, ping_done_by:me || null, ping_done_at:now, comments:list });
  if(typeof window.auditLog === 'function'){
    try{ window.auditLog('punch', 'Follow-up handled: ' + (it.title || ''), it.project_id); }catch(_){}
  }
}
/* ── 1249: On hold ── */''')

src = pl.sub(src, '''  q('[data-act="unhold"]', function(b){ b.onclick = holdClear; });''',
'''  q('[data-act="unhold"]', function(b){ b.onclick = holdClear; });
  /* 1250: follow-up flag */
  q('[data-act="ping"]', function(b){ b.onclick = function(){
    pingOpen = true; lastSig = ''; render();
    var ta = el.querySelector('[data-f="pingnote"]'); if(ta) ta.focus();
  }; });
  q('[data-act="pingx"]', function(b){ b.onclick = function(){ pingOpen = false; lastSig = ''; render(); }; });
  q('[data-act="pinggo"]', function(b){ b.onclick = pingRaise; });
  q('[data-act="pingdone"]', function(b){ b.onclick = pingHandled; });''')

src = pl.sub(src, '''async function open(itemId, opts){
  holdOpen = false; holdPick = { r:'', d:'', n:'' };''', '''async function open(itemId, opts){
  holdOpen = false; holdPick = { r:'', d:'', n:'' }; pingOpen = false;''')

src = pl.sub(src, '''#cr-pk .pkholdbtn{ margin:0 0 10px; }''', '''#cr-pk .pkholdbtn{ margin:0 0 10px; }
/* 1250: follow-up flag. Red is this card's urgent colour already; the !
   is white on #c8202e (5.9:1). Inks computed for both themes. */
#cr-pk .pkpingbtn{ margin:0 0 12px; }
#cr-pk .pkbang{ flex:none; width:24px; height:24px; border-radius:50%; background:#c8202e; color:#fff;
  display:inline-flex; align-items:center; justify-content:center; font:800 15px -apple-system,'Segoe UI',Roboto,sans-serif; }
#cr-pk .pkbang.sm{ width:20px; height:20px; font-size:13px; }
#cr-pk .pkping{ margin:0 0 12px; padding:12px 13px; border-radius:12px; border:1.5px solid #c8202e;
  background:rgba(200,32,46,.14); }
#cr-pk .pkping-h{ display:flex; align-items:center; gap:9px; margin-bottom:8px; }
#cr-pk .pkping-h b{ font:700 15px -apple-system,'Segoe UI',Roboto,sans-serif; color:var(--pk-accl,#e8676e); }
#cr-pk .pkping-h .rt{ margin-left:auto; font-size:11px; color:var(--pk-mut,#9aa3ab); text-align:right; }
#cr-pk .pkping-n{ font:600 15px/1.4 -apple-system,'Segoe UI',Roboto,sans-serif; color:var(--pk-ink,#eceef0); margin-bottom:10px; white-space:pre-wrap; }
#cr-pk .pkping-ta{ width:100%; box-sizing:border-box; min-height:56px; padding:10px 12px; border-radius:10px; resize:vertical;
  background:var(--pk-c,#15171a); border:1px solid var(--pk-line,rgba(230,235,240,.11)); color:var(--pk-ink,#eceef0);
  font:400 15px -apple-system,'Segoe UI',Roboto,sans-serif; }
#cr-pk .pkping-f{ display:flex; gap:8px; margin-top:10px; }
#cr-pk .pkping-f .pkbtn{ min-height:48px; padding:0 16px; }
#cr-pk .pkping-go{ display:flex; align-items:center; justify-content:center; width:100%; min-height:48px; margin-top:8px; border:0;
  border-radius:12px; cursor:pointer; background:#c8202e; color:#fff; font:700 15px -apple-system,'Segoe UI',Roboto,sans-serif; }
#cr-pk .pkping-f .pkping-go{ flex:1; margin-top:0; }
#cr-pk .pkping-go.ok{ background:#1b7d49; }''')

# ════════════ the Punch List ════════════
src = pl.sub(src, '''function plGroup(it){
  if(it.status === 'done') return 'closed';''', '''/* 1250: an active follow-up flag beats every other group, closed work included */
function plPing(it){ return !!(it && it.ping_at && !it.ping_done_at); }
function plGroup(it){ return plPing(it) ? 'ping' : plBase(it); }
function plBase(it){
  if(it.status === 'done') return 'closed';''')
src = pl.sub(src, '''  var g = plGroup(it), d = plDay(it), o = puOpenVisit(it), n = puDaysOn(it);''',
                  '''  var g = plBase(it), d = plDay(it), o = puOpenVisit(it), n = puDaysOn(it);''')
src = pl.sub(src, '''  var pr = projOf(it.project_id), K = plKind(it), w = plWhen(it), g = plGroup(it);''',
                  '''  var pr = projOf(it.project_id), K = plKind(it), w = plWhen(it), g = plBase(it), ping = plPing(it);''')
src = pl.sub(src, '''  return '<div class="pl-row k-' + K.k + (urg ? ' u' : '') + (g === 'late' ? ' late' : '') + (g === 'closed' ? ' done' : '') +''',
                  '''  return '<div class="pl-row k-' + K.k + (urg ? ' u' : '') + (ping ? ' ping' : '') + (g === 'late' ? ' late' : '') + (g === 'closed' && !ping ? ' done' : '') +''')
src = pl.sub(src, '''    '<span class="pl-kd"><span class="pl-k1"><i class="pl-dot"></i>' + K.one + '</span>' +
      (urg ? '<span class="pl-flag">Urgent</span>' : '') +''', '''    '<span class="pl-kd"><span class="pl-k1"><i class="pl-dot"></i>' + K.one + '</span>' +
      (ping ? '<span class="pl-flag">Follow up</span>' : '') +
      (urg ? '<span class="pl-flag">Urgent</span>' : '') +''')
src = pl.sub(src, '''    '<span class="pl-cl"><b>' + esc(pr ? (pr.name || 'Unknown client') : 'Unknown client') + '</b>' +
      '<small>' + esc((pr && pr.address) || '') + '</small></span>' +
    '<span class="pl-pb">' + esc(it.title || 'Untitled item') + '</span>' +''',
'''    '<span class="pl-cl"><b>' + (ping ? '<i class="pl-bang" aria-label="Needs follow-up">!</i>' : '') +
      esc(pr ? (pr.name || 'Unknown client') : 'Unknown client') + '</b>' +
      '<small>' + esc((pr && pr.address) || '') + '</small></span>' +
    '<span class="pl-pb">' + (ping ? esc('\\u201C' + (it.ping_note || '') + '\\u201D \\u2014 ' + plName(it.ping_by)) : esc(it.title || 'Untitled item')) + '</span>' +''')

src = pl.sub(src, '''var PL_GROUPS = [
  { g:'late',   l:'Past due' },''', '''var PL_GROUPS = [
  { g:'ping',   l:'Needs follow-up' },
  { g:'late',   l:'Past due' },''')

src = pl.sub(src, '''  var inQueue = function(it){ return !it.assigned_to && !plOnHold(it); };''',
                  '''  var inQueue = function(it){ return !it.assigned_to && !plOnHold(it) && !plPing(it); };''')
src = pl.sub(src, '''  var board = open.filter(function(it){ return !inQueue(it) && plShown(it); });
  var G = { late:[], today:[], next:[], nodate:[], hold:[] };''',
'''  var board = all.filter(function(it){ return (it.status !== 'done' ? !inQueue(it) : plPing(it)) && plShown(it); });
  var G = { ping:[], late:[], today:[], next:[], nodate:[], hold:[] };''')
src = pl.sub(src, '''    (board.length + nQueue) + ' open · ' + nQueue + ' need assigned · ' + G.late.length + ' past due';''',
'''    (G.ping.length ? G.ping.length + ' need follow-up \\u00b7 ' : '') +
    (open.length) + ' open \\u00b7 ' + nQueue + ' need assigned \\u00b7 ' + G.late.length + ' past due';''')
src = pl.sub(src, '''      if(list.length) html += '<div class="pl-grp' + (g.g === 'late' ? ' late' : '') + '">' ''',
                  '''      if(list.length) html += '<div class="pl-grp' + (g.g === 'late' || g.g === 'ping' ? ' late' : '') + '">' ''')
src = pl.sub(src, '''    '<div class="pl-rh">Needs attention</div>' +
    ri('data-pufocus="late"',''', '''    '<div class="pl-rh">Needs attention</div>' +
    ri('data-pufocus="ping"', PU.view === 'ping', 'Needs follow-up', G.ping.length, G.ping.length > 0) +
    ri('data-pufocus="late"',''')

src = pl.sub(src, '''.pl-row.u .pl-stp{background:#c8202e;}''', '''.pl-row.u .pl-stp,.pl-row.ping .pl-stp{background:#c8202e;}
/* 1250: the follow-up ! — white on cardinal red, 5.9:1 */
.pl-bang{display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;margin-right:7px;border-radius:50%;
  background:#c8202e;color:#fff;font:800 13px 'Segoe UI',Arial,sans-serif;font-style:normal;vertical-align:1px;}
.pl-row.ping{background:var(--pl-latebg,#1c1013);}
.pl-row.ping .pl-pb{color:var(--rbe-ink);}''')

# ── stamp + changelog ──
src = pl.sub(src, '>v2026-10-07 build 1249<', '>v2026-10-07 build 1250<')
src = pl.sub(src, '''var CHANGELOG = [
''', '''var CHANGELOG = [
  { b: 1250, d: '2026-10-07', t: 'Flag a punch-out for follow-up',
    s: 'Anyone can now flag a punch-out, repair, callback or tarp for follow-up from its card \\u2014 say a client calls upset and wants to cancel. Write what happened and tap Flag it: Curtis, Theo and whoever has the job get a notification, and the job jumps to the top of the Punch List under Needs follow-up with a red ! and your note. It stays there until someone taps Handled and says what they did. Both notes are kept in the job\\u2019s messages.' },
''')

pl.write_atomic(PATH, src)
print('patched', PATH, len(src))
