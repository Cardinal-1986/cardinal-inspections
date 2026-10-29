"""Build 1419 — a draft stays on its own job (29 Oct 2026). Found by the 1417 builder, not fixed there.

#chatText is ONE input shared by every job's thread. A note half-typed on job A was still in the box when
job B's thread opened, so Send posted A's note on B — and buzzed whoever it tagged about the wrong client.
Now each job keeps its own draft: leaving a thread files the box under that job, opening one restores its own.
And sendChat() names the job it started on: the save already used it, but the tag alert after the save read
currentProject again, so a thread changed mid-save told the tagged person about the wrong job.
"""
import sys
sys.path.insert(0, '/home/user/cardinal-inspections/.claude/skills/cardinal-build/scripts')
import patch_lib as pl

P = sys.argv[1] if len(sys.argv) > 1 else 'index.html'
s = pl.load(P)
def one(s, a, b):
    assert s.count(a) == 1, (s.count(a), a[:90])
    return s.replace(a, b, 1)

s = one(s, """  tr.innerHTML = TEAM_ROSTER.filter(function(mbr){ return mbr.email !== me; }).map(function(mbr){
    var first = (mbr.name || '').trim().split(/\\s+/)[0];
    return '<button class="chipbtn" data-tag="' + esc(first.toLowerCase()) + '" style="padding:4px 11px;font-size:11px;">@' + esc(first) + '</button>';
  }).join('');
  renderChat();
  chatWillPaint();""",
"""  tr.innerHTML = TEAM_ROSTER.filter(function(mbr){ return mbr.email !== me; }).map(function(mbr){
    var first = (mbr.name || '').trim().split(/\\s+/)[0];
    return '<button class="chipbtn" data-tag="' + esc(first.toLowerCase()) + '" style="padding:4px 11px;font-size:11px;">@' + esc(first) + '</button>';
  }).join('');
  chatDraftSwap(currentProject.id);   /* 1419: the box is shared; the draft is not */
  renderChat();
  chatWillPaint();""")

s = one(s, """document.getElementById('commsView').addEventListener('click', function(e){
  var b = e.target.closest('[data-tag]');""",
"""/* 1419: one draft per job. #chatText is a single input every job's thread shares, so a note half-typed on
   one job used to be sitting in the box when the next job's thread opened — and Send posted it there. */
var __chatDrafts = {}, __chatDraftPid = null;
function chatDraftSwap(pid){
  var inp = /** @type {HTMLInputElement} */ (document.getElementById('chatText'));
  if(!inp || __chatDraftPid === pid) return;
  if(__chatDraftPid != null){ if(inp.value.trim()) __chatDrafts[__chatDraftPid] = inp.value; else delete __chatDrafts[__chatDraftPid]; }
  inp.value = __chatDrafts[pid] || '';
  __chatDraftPid = pid;
}
document.getElementById('commsView').addEventListener('click', function(e){
  var b = e.target.closest('[data-tag]');""")

s = one(s, """async function sendChat(){
  if(!currentProject) return;
  var inp = document.getElementById('chatText');""",
"""async function sendChat(){
  if(!currentProject) return;
  var pr = currentProject;   /* 1419: the job this note is FOR, whatever is open when the save returns */
  var inp = document.getElementById('chatText');""")

s = one(s, """    await saveCkPatch({ comments: msgs });
    inp.value = '';
    chatWillPaint();
    renderChat();
    if(mentions.length){
      var to = mentionEmailsFor(mentions, msg.by);
      if(to.length){
        /* 612: await the report rather than claiming success beside it. */
        var _r = await notifyTeam(to,
          msg.name + ' tagged you \\u2014 ' + (currentProject.name || 'a client'),
          '<p><b>' + esc(msg.name) + '</b> tagged you on <b>' + esc(currentProject.name || '') + '</b>:</p>' +
          '<blockquote>' + esc(text) + '</blockquote>' +
          '<p>Tap to open the job\\u2019s thread and reply.</p>', commsLink(currentProject.id));   /* 1417 #7 */""",
"""    await saveCkPatch({ comments: msgs });
    delete __chatDrafts[pr.id];
    if(__chatDraftPid === pr.id) inp.value = '';   /* 1419: never wipe the box of a job opened mid-save */
    chatWillPaint();
    renderChat();
    if(mentions.length){
      var to = mentionEmailsFor(mentions, msg.by);
      if(to.length){
        /* 612: await the report rather than claiming success beside it. */
        var _r = await notifyTeam(to,
          msg.name + ' tagged you \\u2014 ' + (pr.name || 'a client'),
          '<p><b>' + esc(msg.name) + '</b> tagged you on <b>' + esc(pr.name || '') + '</b>:</p>' +
          '<blockquote>' + esc(text) + '</blockquote>' +
          '<p>Tap to open the job\\u2019s thread and reply.</p>', commsLink(pr.id));   /* 1417 #7; 1419 the job it was sent on */""")

s = one(s, ">v2026-10-29 build 1418<", ">v2026-10-29 build 1419<")
s = one(s, """  { b: 1418, d:'2026-10-29',""",
"""  { b: 1419, d:'2026-10-29', t:'A half-typed note stays on its own job', s:'A note you started on one job used to still be sitting in the message box when you opened another job\\u2019s thread, so Send could post it on the wrong job. Each job now keeps its own draft, and a tag alert always names the job the note was sent on.' },
  { b: 1418, d:'2026-10-29',""")
pl.write_atomic(P, s)
print('ok 1419')
