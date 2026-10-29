#!/usr/bin/env python3
"""patch_1417_comms.py — Build 1417, step 1 of 2: judge 13 (chat boxes + team comms), on top of build 1416.

Usage:  python3 patch_1417_comms.py <file-to-patch> [<out>]      (no <out>: patched in place, atomically)

Every edit is an exact-match splice with an asserted count (patch_lib.sub). Each anchor's repr() is
printed before it is replaced, so a whitespace mismatch is visible rather than guessed. Edits are
applied FORWARD in file order; an anchor is only asserted unique against the text as it stands
after the edits before it. Nothing here touches the app stamp or the CHANGELOG.

Fixes (numbers are the judge's):
  #2  the job thread re-reads when it opens and every 25 s while it is the screen and the app is
      in front; stops when closed or backgrounded; keeps your place if you scrolled up
  #4  claim_notes (the "I chased the carrier" notes) show read-only in an insurance job's thread,
      labelled "Carrier chase", merged by time
  #5  @mentions: exact first name / exact email prefix / a UNIQUE prefix of 3+ letters — "@J" no
      longer buzzes four people; an email address is not a tag; "Will notify: …" under the box
  #6  links wrap inside their bubble and are tappable (escape first, then promote)
  #7  the tag alert links #p/<id>/comms, and that link opens the thread
  #8  one Communication tile with a "tags for you" badge (Notifications opened the same screen)
  #9  Community card: a 16px gutter; Delete Client only on the card's Overview
  #10 the thread's time stamp (and its status line) at #6e6663
  #11 Activity Feed: a message row opens the message; punch-out messages are in the feed
  #12 "Tell the office"; the punch page's tag alert title loses its emoji
"""
import os
import sys

sys.path.insert(0, '/home/user/cardinal-inspections/.claude/skills/cardinal-build/scripts')
import patch_lib as pl  # noqa: E402

if len(sys.argv) < 2:
    sys.exit('usage: patch_1417_comms.py <file-to-patch> [<out>]')
SRC = sys.argv[1]
OUT = sys.argv[2] if len(sys.argv) > 2 else SRC
QUIET = os.environ.get('PATCH_C_QUIET') == '1'

s = pl.load(SRC)
STAMP_BEFORE = s[s.find('data-cr-footer'):s.find('data-cr-footer') + 200]
CL_BEFORE = s.count('{ b:')
EDITS = []


def edit(label, old, new, count=1):
    global s
    if not QUIET:
        print('\n== ' + label)
        pl.context(s, old, before=40, after=40)
    s = pl.sub(s, old, new, count)
    EDITS.append(label)


# ─────────────────────────────────────────────────────────────────────────────
# CSS — the main sheet's chat rules (in place, not out-specified)
# ─────────────────────────────────────────────────────────────────────────────
edit('#6 bubble wraps anything, including a 90-character link',
     r"""  font:15px/1.45 'Segoe UI',-apple-system,BlinkMacSystemFont,Roboto,Arial,sans-serif;color:#333;min-width:0;max-width:85%;}""",
     r"""  font:15px/1.45 'Segoe UI',-apple-system,BlinkMacSystemFont,Roboto,Arial,sans-serif;color:#333;min-width:0;max-width:85%;
  overflow-wrap:anywhere;}""")

edit('#10 the time stamp ink: #9a8c85 was 3.25:1 on the white bubble at 11px',
     r""".chatmsg .when{font-size:11px;color:#9a8c85;margin-left:6px;font-weight:600;}""",
     r""".chatmsg .when{font-size:11px;color:#6e6663;margin-left:6px;font-weight:600;}""")

edit('#5 #6 #4 new chat rules, after the composer row\'s layout rule (a line no colour pass touches)',
     r""".chatinput{display:flex;gap:8px;margin-top:10px;}
""",
     r""".chatinput{display:flex;gap:8px;margin-top:10px;}
/* 1417 (judge 13): the chat box is a cream/white card in every CRM and both themes, so these inks are the
   box's, not the page's. #6e6663 is the insurance twin's own --ct-ink-2: 5.61:1 on the white bubble, 5.24:1
   on the #faf7f5 box. (The thread's status line, .chatempty, is Builder A's J16 ink and is not touched here.) */
/* #6: a link in a note — the note's own ink, underlined, and it breaks anywhere. Unscoped on purpose:
   fmtChatText also draws the Leads job panel's copy of the thread (.ljcmsg, a dark panel), where the
   browser's default link blue would be the failure. */
.chatlink{--cr-stack:"1417 a link in a note takes the note's ink, not the browser link colour";
  color:inherit;text-decoration:underline;text-underline-offset:2px;overflow-wrap:anywhere;}
/* #4: the claim's read-only notes (carrier chases) — a dashed bubble and a label, never a reply target */
.chatmsg.sys .bub{--cr-stack:"1417 a read-only claim note is drawn dashed so it never reads as a message";border-style:dashed;}
.chatmsg .chattag{display:inline-block;margin-right:6px;padding:0 6px;border:1px solid #8a7c76;border-radius:4px;
  font:800 11px 'Segoe UI',-apple-system,BlinkMacSystemFont,Roboto,Arial,sans-serif;letter-spacing:.04em;
  text-transform:uppercase;color:#5c4a42;}
/* #5: who the message will reach, said before Send */
.chatwill{padding:7px 2px 0;font:600 13px/1.4 'Segoe UI',-apple-system,BlinkMacSystemFont,Roboto,Arial,sans-serif;color:#6e6663;}
.chatwill:empty{display:none;}
.chatwill.warn{color:#9c1822;}
""")

edit('#8 the tag badge on the one Communication tile (auto-placed in the tile\'s empty top-middle cell)',
     r"""#acxMount .jabox .jan.zero{visibility:hidden;}
""",
     r"""#acxMount .jabox .jan.zero{visibility:hidden;}
/* 1417 #8: the tag count rides the Communication tile. A grid item with no area lands in the tile's
   one empty cell ("ic . n"), between the icon and the count. White on #c8202e is 5.88:1. */
.jabox .jatag{justify-self:start;padding:2px 8px;border-radius:20px;background:#c8202e;color:#fff;
  font:800 11px 'Segoe UI',-apple-system,BlinkMacSystemFont,Roboto,Arial,sans-serif;white-space:nowrap;}
""")

# ─────────────────────────────────────────────────────────────────────────────
# MARKUP — the line under the composer
# ─────────────────────────────────────────────────────────────────────────────
edit('#5 the Will-notify line under the composer',
     """        <button class="btn" id="chatSend">Send</button>
      </div>
""",
     """        <button class="btn" id="chatSend">Send</button>
      </div>
      <div class="chatwill" id="chatWill" role="status" aria-live="polite"></div>
""")

# ─────────────────────────────────────────────────────────────────────────────
# MAIN BLOCK — job menu (renderAcxOverview)
# ─────────────────────────────────────────────────────────────────────────────
edit('#8 the tagged-you count goes through the ONE mention rule',
     r"""  var mentions = (ck.comments || []).filter(function(m){
    return myFirst && String(m.text || '').toLowerCase().indexOf('@' + myFirst.toLowerCase()) !== -1;
  }).length;""",
     r"""  /* 1417 #8: counted through the ONE mention rule (mentionEmailsFor) rather than a second private
     substring test, which counted "@joanne" — or any word starting with your first name — as a tag. */
  var mentions = (ck.comments || []).filter(function(m){
    return !!me && mentionEmailsFor(mentionNamesIn(m.text), m.by).indexOf(me) !== -1;
  }).length;""")

edit('#8 jt() takes an optional extra (the badge)',
     r"""  function jt(ic, label, n, act, idn){
    var zero = (n === 0 || n === '0' || n === '');
    return '<div class="jabox" data-jm="' + act + '">' + ic + '<span class="jbl">' + label + '</span>' +
      '<b class="jan' + (zero ? ' zero' : '') + '"' + (idn ? ' id="' + idn + '"' : '') + '>' + n + '</b></div>';
  }""",
     r"""  function jt(ic, label, n, act, idn, extra){
    var zero = (n === 0 || n === '0' || n === '');
    return '<div class="jabox" data-jm="' + act + '">' + ic + '<span class="jbl">' + label + '</span>' +
      '<b class="jan' + (zero ? ' zero' : '') + '"' + (idn ? ' id="' + idn + '"' : '') + '>' + n + '</b>' + (extra || '') + '</div>';
  }""")

edit('#8 one Communication tile, full width; Notifications retired (it opened the same screen)',
     r"""    '<div class="jaboxrow">' +
      jt(dbIc('comms'), 'Communication', commsCount(pr), 'comms') +
      jt(dbIc('bell'), 'Notifications', mentions, 'notifs') +
    '</div><div class="jaboxrow">' +""",
     r"""    /* 1417 #8: "Communication" and "Notifications" were two tiles that called the same
       openCommunications(). One tile now, full width like Work Orders, with the count of messages that
       tag you as a badge on it. The router keeps its 'notifs' case so a cached page still works. */
    '<div class="jaboxrow" style="grid-template-columns:1fr">' +
      jt(dbIc('comms'), 'Communication', commsCount(pr), 'comms', null,
         mentions ? '<span class="jatag">' + mentions + (mentions === 1 ? ' tag for you' : ' tags for you') + '</span>' : '') +
    '</div><div class="jaboxrow">' +""")

# ─────────────────────────────────────────────────────────────────────────────
# MAIN BLOCK — showTab: 'comms' is a view, not a pane
# ─────────────────────────────────────────────────────────────────────────────
edit('#7 showTab(\'comms\') opens Communications instead of painting every pane out',
     """function showTab(name){
""",
     """function showTab(name){
  /* 1417 #7: '#p/<id>/comms' (the tag alert's link) reached here as a TAB through the hash restore
     and popstate, matched none of the panes below, and painted every one of them out — the job opened
     blank. Communications is a view of its own; open it. Both callers hold __histLock, so no entry moves. */
  if(name === 'comms'){ if(currentProject && typeof openCommunications === 'function') openCommunications(); return; }
""")

# ─────────────────────────────────────────────────────────────────────────────
# MAIN BLOCK — openCommunications starts the refresh
# ─────────────────────────────────────────────────────────────────────────────
edit('#2 #5 opening the thread re-reads it, starts the poll, clears the Will-notify line',
     """  }).join('');
  renderChat();
  window.scrollTo(0, 0);
}""",
     """  }).join('');
  renderChat();
  chatWillPaint();
  window.scrollTo(0, 0);
  commsPollStart();   /* 1417 #2: not awaited — this function stays synchronous */
}""")

# ─────────────────────────────────────────────────────────────────────────────
# MAIN BLOCK — the thread renderer, the composer, the mention engine
# ─────────────────────────────────────────────────────────────────────────────
edit('#6 fmtChatText: escape, then promote links and tags in ONE pass',
     r"""function fmtChatText(t){
  return esc(t).replace(/@([A-Za-z][\w.-]*)/g, '<span class="mention">@$1</span>');
}""",
     r"""/* 1417 #6: a pasted link was plain text, and a long one ran out of its bubble (771px of text in a
   243px bubble). ESCAPE FIRST, then promote — lbRich's order: by the time either rule runs every < is
   &lt;, so nothing typed can open a tag. ONE pass with two alternatives, so an @ inside a link stays
   part of the link and can never become a mention span inside its href. A link is http(s) only, it
   stops at any escaped quote or bracket, and trailing sentence punctuation stays text. A tag is an @
   that does not follow a letter (bob@curtis.com is an address), the same rule mentionNamesIn reads. */
function fmtChatText(t){
  return esc(t).replace(/(https?:\/\/(?:[^\s&<>"']|&amp;)+)|(^|[^\w])@([A-Za-z][\w.-]*)/g, function(all, url, pre, nm){
    if(nm){
      var tail = (/[.-]+$/.exec(nm) || [''])[0];
      return pre + '<span class="mention">@' + nm.slice(0, nm.length - tail.length) + '</span>' + tail;
    }
    var trail = (/[.,;:!?)\]]+$/.exec(url) || [''])[0];
    var u = url.slice(0, url.length - trail.length);
    if(!/^https?:\/\/[^\/]/.test(u)) return all;
    return '<a class="chatlink" href="' + u + '" target="_blank" rel="noopener noreferrer">' + u + '</a>' + trail;
  });
}""")

edit('#2 #4 renderChat: claim notes merged by time; a quiet refresh keeps your place',
     r"""function renderChat(){
  if(!currentProject) return;
  /* 649: the promotion of the legacy notes column moved into commsMessages(),
     so the job-menu tile counts exactly what this thread shows. */
  var msgs = commsMessages(currentProject);
  var me = TEAM && currentUser ? currentUser.email : '';
  var thread = document.getElementById('chatThread');
  thread.innerHTML = msgs.length ? msgs.map(function(m){
    var initials = (m.name || '?').trim().split(/\s+/).map(function(w){ return w.charAt(0); }).join('').slice(0,2).toUpperCase();
    var mine = m.by && m.by === me;
    return '<div class="chatmsg' + (mine ? ' mine' : '') + '">' +
      '<span class="av">' + esc(initials) + '</span>' +
      '<span class="bub"><span class="who">' + esc(m.name || m.by || '') + '</span>' +
      '<span class="when">' + (m.at ? timeAgo(m.at) : '') + '</span><br>' +
      fmtChatText(m.text || '') + '</span></div>';
  }).join('') : '<div class="chatempty">No notes yet \u2014 start the thread.</div>';
  thread.scrollTop = thread.scrollHeight;
}""",
     r"""/* 1417 #2: renderChat({ quiet:true }) is the poll's call. It writes NOTHING when the thread's data
   is unchanged (an identical innerHTML still emits mutation records — 567's lesson — and every body
   observer would wake every 25 s for nothing), and when it does write it keeps your place if you had
   scrolled up to read; at the bottom it follows the new message. Every other caller is unchanged. */
var __chatSig = '';
function renderChat(opt){
  if(!currentProject) return;
  /* 649: the promotion of the legacy notes column moved into commsMessages(),
     so the job-menu tile counts exactly what this thread shows. */
  var msgs = commsMessages(currentProject);
  /* 1417 #4: an insurance job's claim notes, read-only, merged by time. NOT added to commsMessages():
     they are not the job's messages, the job-menu count is not theirs, and nothing may write them back. */
  var _cn = commsClaimNotes(currentProject);
  if(_cn.length) msgs = msgs.concat(_cn).sort(function(a, b){ return String(a.at || '').localeCompare(String(b.at || '')); });
  var me = TEAM && currentUser ? currentUser.email : '';
  var thread = document.getElementById('chatThread');
  var sig = String(currentProject.id) + '\u0002' + msgs.map(function(m){ return [m.at || '', m.by || '', m.name || '', m.text || '', m.sys || ''].join('\u0001'); }).join('\u0002');
  var quiet = !!(opt && opt.quiet);
  if(quiet && sig === __chatSig) return;
  var fromEnd = thread.scrollHeight - thread.scrollTop - thread.clientHeight, top0 = thread.scrollTop;
  thread.innerHTML = msgs.length ? msgs.map(function(m){
    var initials = (m.name || '?').trim().split(/\s+/).map(function(w){ return w.charAt(0); }).join('').slice(0,2).toUpperCase();
    var mine = m.by && m.by === me;
    return '<div class="chatmsg' + (mine ? ' mine' : '') + (m.sys ? ' sys' : '') + '"' + (m.sys ? ' data-src="claim_notes"' : '') + '>' +
      '<span class="av">' + esc(initials) + '</span>' +
      '<span class="bub">' + (m.sys ? '<span class="chattag">' + (m.sys === 'chase' ? 'Carrier chase' : 'Claim note') + '</span>' : '') +
      '<span class="who">' + esc(m.name || m.by || '') + '</span>' +
      '<span class="when">' + (m.at ? timeAgo(m.at) : '') + '</span><br>' +
      fmtChatText(m.text || '') + '</span></div>';
  }).join('') : '<div class="chatempty">No notes yet \u2014 start the thread.</div>';
  __chatSig = sig;
  thread.scrollTop = (quiet && fromEnd > 48) ? top0 : thread.scrollHeight;
}""")

edit('#2 sendChat posts a COPY of the list (the parse cache is shared) and clears the Will-notify line',
     r"""    var msgs = all.comments || [];
    msgs.push(msg);
    await saveCkPatch({ comments: msgs });
    inp.value = '';
    renderChat();""",
     r"""    /* 1417 #2: a COPY. parseCkAll() hands back its cached object, so pushing onto it put the message
       in the cache before the save — a failed post then showed as sent on the next repaint, which the
       25 s refresh now makes certain to happen. The 1413 merge is still the write. */
    var msgs = (all.comments || []).slice();
    msgs.push(msg);
    await saveCkPatch({ comments: msgs });
    inp.value = '';
    chatWillPaint();
    renderChat();""")

edit('#7 the tag alert links the thread and says so',
     r"""          '<p>Open the client\u2019s Communications page in Cardinal Resource to reply.</p>', clientLink(currentProject.id));""",
     r"""          '<p>Tap to open the job\u2019s thread and reply.</p>', commsLink(currentProject.id));   /* 1417 #7 */""")

edit('#5 the mention engine: exact, or a unique prefix of 3+; an address is not a tag',
     r"""function mentionNamesIn(text){
  return (String(text || '').match(/@([A-Za-z][\w.-]*)/g) || [])
    .map(function(s){ return s.slice(1).toLowerCase(); });
}
function mentionEmailsFor(names, byEmail){
  var to = [];
  (typeof TEAM_ROSTER !== 'undefined' ? TEAM_ROSTER : []).forEach(function(mbr){
    var first = (mbr.name || '').trim().split(/\s+/)[0].toLowerCase();
    var pre = (mbr.email || '').split('@')[0].toLowerCase();
    if(names.some(function(mn){ return mn === first || mn === pre || first.indexOf(mn) === 0; })){
      if(mbr.email && to.indexOf(mbr.email) < 0 && mbr.email !== byEmail) to.push(mbr.email);
    }
  });
  return to;
}
window.CardinalMentions = Object.assign(window.CardinalMentions || {}, {
  names  : mentionNamesIn,
  emails : mentionEmailsFor,
});""",
     r"""/* 1417 #5: a tag is an @ that does not follow a letter or digit — "bob@curtis.com" is an address,
   not a tag for Curtis — and a sentence's full stop is not part of the name ("thanks @curtis." used to
   be the name "curtis." and reached nobody). */
function mentionNamesIn(text){
  var out = [], re = /(^|[^\w])@([A-Za-z][\w.-]*)/g, m, src = String(text || '');
  while((m = re.exec(src))){
    var nm = m[2].toLowerCase().replace(/[.-]+$/, '');
    if(nm) out.push(nm);
  }
  return out;
}
/* 1417 #5: who ONE tag reaches. The rule was `first.indexOf(mn) === 0` — any PREFIX of a first name —
   so "@J" buzzed Joan, Joey, Jacob and Jerry and "@Jo" buzzed Joan and Joey. Theo's rule is that only
   the people a message tags are notified, and four people on one letter breaks it. A tag now reaches
   the exact first name, or the exact email prefix ("@joey" — his roster name is Joseph), or a prefix
   of 3+ letters that fits exactly ONE person ("@curt", "@scott"). Anything else reaches nobody, and
   the line under the box says so before Send (mentionPreview). One rule, three composers: the job
   thread, the punch card and the punch page all call CardinalMentions. */
function mentionMatch(mn){
  mn = String(mn || '').toLowerCase();
  if(!mn) return [];
  var roster = (typeof TEAM_ROSTER !== 'undefined' ? TEAM_ROSTER : []);
  function keys(mbr){ return [(mbr.name || '').trim().split(/\s+/)[0].toLowerCase(), (mbr.email || '').split('@')[0].toLowerCase()]; }
  var exact = roster.filter(function(mbr){ return keys(mbr).indexOf(mn) !== -1; });
  if(exact.length || mn.length < 3) return exact;
  var pre = roster.filter(function(mbr){ return keys(mbr).some(function(k){ return !!k && k.indexOf(mn) === 0; }); });
  return pre.length === 1 ? pre : [];
}
function mentionEmailsFor(names, byEmail){
  var to = [];
  (Array.isArray(names) ? names : []).forEach(function(mn){
    mentionMatch(mn).forEach(function(mbr){
      if(mbr.email && to.indexOf(mbr.email) < 0 && mbr.email !== byEmail) to.push(mbr.email);
    });
  });
  return to;
}
/* 1417 #5: the sentence under the composer, BEFORE Send — "Will notify: Curtis", or which tag reaches
   nobody and why. Built from mentionNamesIn + mentionEmailsFor, so it can never promise a different
   list from the one the send will notify. { text, warn } — warn when a tag reaches nobody. */
function mentionPreview(text, byEmail){
  var names = mentionNamesIn(text);
  if(!names.length){
    return { text: String(text || '').trim() ? 'Nobody will be notified \u2014 add @name to buzz someone.' : '', warn: false };
  }
  var roster = (typeof TEAM_ROSTER !== 'undefined' ? TEAM_ROSTER : []);
  function mentionWho(em){ return (typeof rptRepName === 'function' ? rptRepName(em) : '') || String(em || '').split('@')[0]; }
  function firstOf(mbr){ return (mbr.name || '').trim().split(/\s+/)[0]; }
  var to = mentionEmailsFor(names, byEmail), miss = [], parts = [];
  names.forEach(function(mn){ if(!mentionMatch(mn).length && miss.indexOf(mn) === -1) miss.push(mn); });
  if(to.length) parts.push('Will notify: ' + to.map(mentionWho).join(', '));
  miss.forEach(function(mn){
    var could = roster.filter(function(mbr){
      var f = firstOf(mbr).toLowerCase(), p = (mbr.email || '').split('@')[0].toLowerCase();
      return (!!f && f.indexOf(mn) === 0) || (!!p && p.indexOf(mn) === 0);
    }).map(firstOf);
    parts.push('@' + mn + (could.length > 1 ? ' fits ' + could.length + ' people \u2014 type more: ' + could.join(', ')
                         : could.length === 1 ? ' \u2014 type more of the name: ' + could[0]
                         : ' matches nobody on the team'));
  });
  if(!parts.length) parts.push('Nobody else will be notified.');
  return { text: parts.join(' \u00b7 '), warn: miss.length > 0 };
}
window.CardinalMentions = Object.assign(window.CardinalMentions || {}, {
  names  : mentionNamesIn,
  emails : mentionEmailsFor,
  /* 1417: the Will-notify sentence for any composer — CardinalMentions.preview(text, myEmail) */
  preview: function(text, byEmail){ return mentionPreview(text, byEmail).text; },
});""")

edit('#2 #4 #5 the refresh, the claim notes and the Will-notify painter',
     r"""document.getElementById('chatText').addEventListener('keydown', function(e){
  if(e.key === 'Enter' && !e.shiftKey){ e.preventDefault(); sendChat(); }
});
""",
     r"""document.getElementById('chatText').addEventListener('keydown', function(e){
  if(e.key === 'Enter' && !e.shiftKey){ e.preventDefault(); sendChat(); }
});
/* 1417 #5: the Will-notify line follows the box as you type. A chip tap sets the value without an
   input event, so the chip row repaints too — after the commsView handler has appended the tag. */
function chatWillPaint(){
  var el = document.getElementById('chatWill');
  var inp = /** @type {HTMLInputElement} */ (document.getElementById('chatText'));
  if(!el || !inp) return;
  var p = mentionPreview(inp.value, TEAM && currentUser ? currentUser.email : '');
  if(el.textContent !== p.text) el.textContent = p.text;
  el.classList.toggle('warn', !!p.warn);
}
document.getElementById('chatText').addEventListener('input', chatWillPaint);
document.getElementById('chatTagRow').addEventListener('click', function(){ setTimeout(chatWillPaint, 0); });

/* 1417 #2: the job thread was read ONCE — when the job opened — so a note Curtis posted from the roof
   was invisible to the office until somebody left and came back (judge 13: 20 s+, no reload, nothing).
   Now opening Communications re-reads the row, and while the thread is the screen AND the app is in
   front it re-reads every 25 s. Cheap by construction: one narrow select (the checklist column, plus
   the claim's notes on an insurance job), no observer (the 46 body observers stay 46), no realtime
   channel, and nothing is queried once the thread is closed or the phone is put away — the pending
   tick sees that and stops without a query, and a hidden tab clears the timer outright.
   Only the MESSAGES are taken from the fresh row, unioned with ours (crMergeComments, the 1413 rule):
   every other key stays the local copy, so a refresh can never overwrite an edit still on its way out,
   and every write still re-reads through patchProjectCk as before. Offline it does not run at all. */
var COMMS_POLL_MS = 25000;
var __commsPoll = { t: 0, busy: '' };
var __claimNotes = { pid: null, ids: null, rows: [] };
function commsIsOpen(){ return !!(currentProject && commsView && commsView.style.display !== 'none'); }
function commsLink(pid){ return pid ? clientLink(pid) + '/comms' : '/'; }
window.commsLink = commsLink;
/* 1417 #4: "I chased the carrier" (recordChase) writes claim_notes, and no screen in this app read them —
   only the admin Supplement Desk. RLS (claim_notes_select = can_see_claim: full access, the claim's
   creator, or the job's rep; staff only) already lets the job's people read them, so this adds no SQL.
   Read-only: drawn in the thread, never written back, never counted as the job's messages. */
function commsClaimNotes(pr){
  if(!pr || __claimNotes.pid !== pr.id) return [];
  return __claimNotes.rows.map(function(n){
    var em = String(n.created_by || '');
    return { sys: /^chased\b/i.test(String(n.body || '')) ? 'chase' : 'claim', at: n.created_at, by: em,
             name: (em.indexOf('@') > 0 && typeof rptRepName === 'function') ? rptRepName(em) : (em || 'Claim'),
             text: String(n.body || '') };
  });
}
async function commsLoadClaimNotes(pr){
  if(!pr || !TEAM || projClaimType(pr) !== 'insurance') return;
  var pid = pr.id;
  if(__claimNotes.pid !== pid || !__claimNotes.ids){
    var c = await sb.from('insurance_claims').select('id').eq('project_id', pid);
    if(c.error) return;
    __claimNotes = { pid: pid, ids: (c.data || []).map(function(x){ return x.id; }),
                     rows: (__claimNotes.pid === pid ? __claimNotes.rows : []) };
  }
  if(!__claimNotes.ids || !__claimNotes.ids.length){ __claimNotes.rows = []; return; }
  var n = await sb.from('claim_notes').select('id,claim_id,body,created_at,created_by')
    .in('claim_id', __claimNotes.ids).order('created_at', { ascending: false }).limit(50);
  if(n.error || __claimNotes.pid !== pid) return;
  __claimNotes.rows = (n.data || []).slice().reverse();
}
async function commsRefresh(){
  if(!commsIsOpen() || !TEAM) return;
  if(typeof navigator !== 'undefined' && navigator.onLine === false) return;
  var pid = currentProject.id;
  if(__commsPoll.busy === String(pid)) return;
  __commsPoll.busy = String(pid);
  try{
    var r = await sb.from('projects').select('checklist').eq('id', pid).single();
    if(!r.error && r.data && currentProject && currentProject.id === pid){
      var srv = /** @type {any} */ ({}), loc = /** @type {any} */ ({});
      try{ srv = JSON.parse(r.data.checklist || '{}') || {}; }catch(_e1){ srv = {}; }
      try{ loc = JSON.parse(currentProject.checklist || '{}') || {}; }catch(_e2){ loc = {}; }
      if(Array.isArray(srv.comments) && srv.comments.length){
        var merged = crMergeComments(srv.comments, loc.comments);
        if(JSON.stringify(merged) !== JSON.stringify(loc.comments || [])){
          loc.comments = merged;
          var s = JSON.stringify(loc);
          currentProject.checklist = s;
          var cp = cacheProjects.find(function(x){ return x.id === pid; });
          if(cp) cp.checklist = s;
        }
      }
    }
    if(currentProject && currentProject.id === pid){ try{ await commsLoadClaimNotes(currentProject); }catch(_c){} }
  }catch(_r){}
  finally{ __commsPoll.busy = ''; }
  if(commsIsOpen() && currentProject.id === pid) renderChat({ quiet: true });
}
function commsPollStop(){ if(__commsPoll.t){ clearTimeout(__commsPoll.t); __commsPoll.t = 0; } }
function commsPollArm(){
  commsPollStop();
  if(!commsIsOpen() || document.visibilityState === 'hidden') return;
  __commsPoll.t = setTimeout(function(){
    __commsPoll.t = 0;
    if(!commsIsOpen() || document.visibilityState === 'hidden') return;   /* closed or put away: stop, no query */
    commsRefresh().then(commsPollArm, commsPollArm);
  }, COMMS_POLL_MS);
}
function commsPollStart(){
  if(__claimNotes.pid === (currentProject && currentProject.id)) __claimNotes.ids = null;   /* a claim may have been filed since */
  commsRefresh().then(commsPollArm, commsPollArm);
}
document.addEventListener('visibilitychange', function(){
  if(document.visibilityState === 'hidden'){ commsPollStop(); return; }
  if(commsIsOpen() && !__commsPoll.t) commsPollStart();   /* back in front: catch up at once, then resume */
});
""")

# ─────────────────────────────────────────────────────────────────────────────
# MAIN BLOCK — Activity Feed
# ─────────────────────────────────────────────────────────────────────────────
edit('#11 punch-out messages join the feed (one cache, every item)',
     r"""        cli: pr3 ? pr3.name : '', pid: pr3 ? pr3.id : null, detail: it.title || '' });
    });
  }catch(_){}
""",
     r"""        cli: pr3 ? pr3.name : '', pid: pr3 ? pr3.id : null, detail: it.title || '' });
    });
  }catch(_){}
  /* 1417 #11: a punch-out's messages never reached the feed — "found rotted decking, 3 sheets" was
     visible only inside the card. The same one punch cache as the block above, every item open or
     closed, and the row opens that card. */
  try{
    var _pkc = window.CardinalPunch;
    ((_pkc && typeof _pkc.rows === 'function') ? (_pkc.rows() || []) : []).forEach(function(it){
      if(!it || !Array.isArray(it.comments)) return;
      var pr4 = it.project_id ? cacheProjects.find(function(x){ return x.id === it.project_id; }) : null;
      it.comments.forEach(function(c){
        if(!c || !c.at) return;
        var ac4 = actor(c.by);
        ev.push({ t:c.at, ini:ac4.ini, email:ac4.email, label:'Punch-out message:', who:c.name || ac4.nm,
          cli: pr4 ? pr4.name : '', pid: pr4 ? pr4.id : null, go:'punch', pk: it.id,
          detail: (it.title ? it.title + ' \u2014 ' : '') + (c.text || '') });
      });
    });
  }catch(_){}
""")

edit('#11 a job comment row knows it is a message',
     r"""      ev.push({ t:c.at, ini:ini, label:'Comment by:', who:c.name || '',
        cli:pr2.name || '', pid:pr2.id, detail:c.text || '' });""",
     r"""      ev.push({ t:c.at, ini:ini, label:'Comment by:', who:c.name || '',
        cli:pr2.name || '', pid:pr2.id, detail:c.text || '', go:'comms' });   /* 1417 #11 */""")

edit('#11 openActivityFeed: rows carry where they go; the punch cache is warmed once',
     r"""function openActivityFeed(){
  hideAllViews();
  activityView.style.display = 'block';
  var ev = buildActivityEvents().slice(0, 60);
  document.getElementById('actFeedFull').innerHTML = ev.length ? ev.map(function(x){
    return '<div class="afrow">' +""",
     r"""/* 1417 #11: the feed's paint, split out so the punch-cache warm below can repaint it once. A message row
   (a job comment, a punch-out message) carries where it goes and the whole row is the tap target. */
function paintActivityFull(){
  var ev = buildActivityEvents().slice(0, 60);
  document.getElementById('actFeedFull').innerHTML = ev.length ? ev.map(function(x){
    return '<div class="afrow"' + (x.go && x.pid ? ' data-proj="' + esc(String(x.pid)) + '" data-go="' + esc(x.go) + '"' +
        (x.pk ? ' data-pk="' + esc(String(x.pk)) + '"' : '') + ' style="cursor:pointer;"' : '') + '>' +""")

edit('#11 openActivityFeed body',
     r"""      + 'This fills in as the team creates clients, sends estimates and logs payments.</div>';
  window.scrollTo(0,0);
}""",
     r"""      + 'This fills in as the team creates clients, sends estimates and logs payments.</div>';
}
function openActivityFeed(){
  hideAllViews();
  activityView.style.display = 'block';
  paintActivityFull();
  window.scrollTo(0,0);
  /* 1417 #11: punch-out messages come from the punch cache, which is empty until a punch surface has
     loaded (the 1044 idiom warms it the same way). Repaint ONCE, and only if the feed is still the screen. */
  try{
    var _pk = window.CardinalPunch;
    if(_pk && typeof _pk.rows === 'function' && !_pk.rows().length && typeof _pk.reload === 'function'){
      Promise.resolve(_pk.reload()).then(function(){
        if(activityView.style.display !== 'none' && _pk.rows().length) paintActivityFull();
      }).catch(function(){});
    }
  }catch(_){}
}""")

edit('#11 a message row opens the message, not the profile',
     r"""document.getElementById('actFeedFull').addEventListener('click', function(e){
  var c = e.target.closest('.afcli[data-proj]');
  if(c) openProject(c.getAttribute('data-proj'));
});""",
     r"""document.getElementById('actFeedFull').addEventListener('click', function(e){
  var t = /** @type {HTMLElement} */ (e.target);
  /* 1417 #11: a comment row opened the client's profile and left you to find the thread; a punch-out
     message had no row at all. A message row now opens the message. Other rows: the client name, as before. */
  var row = t.closest('.afrow[data-go]'), c = row || t.closest('.afcli[data-proj]');
  if(!c) return;
  var go = row ? row.getAttribute('data-go') : '', pk = row ? row.getAttribute('data-pk') : '';
  if(go === 'punch' && pk && window.CardinalPunchCard && typeof window.CardinalPunchCard.open === 'function'){
    window.CardinalPunchCard.open(pk); return;
  }
  openProject(c.getAttribute('data-proj'));
  if(go === 'comms') openCommunications();
  else if(go === 'punch') showTab('punch');
});""")

# ─────────────────────────────────────────────────────────────────────────────
# cr-pp (punch PAGE) — the tag alert title
# ─────────────────────────────────────────────────────────────────────────────
edit('#12 the punch page tag alert title starts with the name, not an emoji',
     """'🔨 ' + msg.name + ' tagged you — ' + ((pr && pr.name) || 'a job'),""",
     """/* 1417 #12: no emoji on a phone's lock screen — the job thread's alert never had one */
msg.name + ' tagged you — ' + ((pr && pr.name) || 'a job'),""")

# ─────────────────────────────────────────────────────────────────────────────
# cr-cc (Community card) — gutter + Delete Client
# ─────────────────────────────────────────────────────────────────────────────
edit('#9 the Community card gets the 16px phone gutter',
     """  #cr-cc .cts{grid-template-columns:1fr 1fr;gap:12px}
}
""",
     """  #cr-cc .cts{grid-template-columns:1fr 1fr;gap:12px}
}
/* 1417 #9: the card is mounted straight into #projectView, outside every .wrap, so at 390px the back chip,
   the headings, "Messages & notes" and every card ran from x=0 to the glass edge. The gutter is the card's own. */
#cr-cc{padding-left:16px;padding-right:16px}
""")

edit('#9 Delete Client only on the card\'s Overview, never under the thread',
     """mount.innerHTML = (tab === 'thread' || tab === 'bid') ? cc2Sub(pr) : cc2Page(pr);
wire(mount, pr);""",
     """mount.innerHTML = (tab === 'thread' || tab === 'bid') ? cc2Sub(pr) : cc2Page(pr);
/* 1417 #9: Delete Client (the one button nobody can undo) sat directly under the job thread. It belongs to
   the Overview: the two sub-views hide it, the Overview restores exactly what openProject decided (admins). */
(function(){
var dz = document.getElementById('dangerZone');
if(!dz) return;
var want = (tab === 'thread' || tab === 'bid') ? 'none' : ((typeof isAdminUser === 'function' && isAdminUser()) ? 'block' : 'none');
if(dz.style.display !== want) dz.style.display = want;
})();
wire(mount, pr);""")

# ─────────────────────────────────────────────────────────────────────────────
# Team Feedback — the lead line
# ─────────────────────────────────────────────────────────────────────────────
edit('#12 "Tell the office" (the box was telling Theo to tell Theo)',
     """<p class="fb-lead">Tell Theo when something breaks, isn’t working right, or you have an idea. Every one gets read.</p>""",
     """<p class="fb-lead">Tell the office when something breaks, isn’t working right, or you have an idea. Every one gets read.</p>""")

# ─────────────────────────────────────────────────────────────────────────────
# post-conditions
# ─────────────────────────────────────────────────────────────────────────────
assert s[s.find('data-cr-footer'):s.find('data-cr-footer') + 200] == STAMP_BEFORE, 'the app stamp moved'
assert s.count('{ b:') == CL_BEFORE, 'the CHANGELOG moved'
assert s.count('new MutationObserver') == pl.load(SRC).count('new MutationObserver'), 'an observer was added'
assert s.count('document.body.style.overflow') == pl.load(SRC).count('document.body.style.overflow'), 'a scroll-lock writer was added'
pl.write_atomic(OUT, s)
pl.assert_in(OUT, 'function commsPollArm(')
pl.assert_in(OUT, 'function mentionMatch(mn){')
print('\npatch_C: %d edits applied -> %s (%d chars)' % (len(EDITS), OUT, len(s)))
