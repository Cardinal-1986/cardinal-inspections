"""Build 1486: every note wears its date and time (Theo, 23 Nov 2026: "When writing notes can you make a
time and date stamp ?").

A job note has always been saved with its exact moment (`at`, an ISO time, set by sendChat), but the
thread drew it through timeAgo(): "3h ago", "2d ago", then "Nov 5" with no time and no year. The punch
card's discussion drew the date only. Now one helper, noteStamp(), prints "Nov 23, 2026 · 4:12 PM",
and the three places a note is read use it:
  - the job's Communications thread (renderChat)
  - the job list's preview pane (renderLjPane)
  - the punch card's discussion (cr-pp-script)
The punch page already printed date + time (fmtTime) and is left alone. timeAgo is unchanged for the
activity feed, the history and the other "last touched" chips: those are not notes.

Run from the repo root:  python .claude/skills/cardinal-build/scripts/patch_1486.py [index.html]"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import patch_lib as pl
P = sys.argv[1] if len(sys.argv) > 1 else 'index.html'
s = pl.load(P)

def one(s, a, b):
    assert s.count(a) == 1, (s.count(a), a[:90])
    return s.replace(a, b, 1)

# 1. the helper, beside timeAgo
s = one(s, "function timeAgo(iso){\n",
"/* 1486: a note's date-and-time stamp, \"Nov 23, 2026 · 4:12 PM\" (Theo: \"When writing notes can you make a\n"
"   time and date stamp\"). Every place a NOTE is read uses it: the job thread, the job list's preview and\n"
"   the punch card. timeAgo stays for feeds and chips, which are not notes. '' for a missing or bad time. */\n"
"function noteStamp(iso){\n"
"  if(!iso) return '';\n"
"  var d = crDate(iso);\n"
"  if(isNaN(d.getTime())) return '';\n"
"  return d.toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' }) + ' \\u00b7 ' +\n"
"         d.toLocaleTimeString('en-US', { hour:'numeric', minute:'2-digit' });\n"
"}\n"
"function timeAgo(iso){\n")

# 2. the job's Communications thread
s = one(s, "      '<span class=\"when\">' + (m.at ? timeAgo(m.at) : '') + '</span><br>' +\n      fmtChatText(m.text || '') + '</span></div>';",
           "      '<span class=\"when\">' + (m.at ? noteStamp(m.at) : '') + '</span><br>' +   /* 1486 */\n      fmtChatText(m.text || '') + '</span></div>';")

# 3. the job list's preview pane
s = one(s, "'<span class=\"when\">' + (m.at ? timeAgo(m.at) : '') + '</span><br>' + fmtChatText(m.text || '') + '</div>';",
           "'<span class=\"when\">' + (m.at ? noteStamp(m.at) : '') + '</span><br>' + fmtChatText(m.text || '') + '</div>';   /* 1486 */")

# 4. the punch card's discussion (its own block; noteStamp is a global of the main script)
s = one(s, "'<div class=\"pp-when\">' + esc(when(m.at)) + '</div>' +",
           "'<div class=\"pp-when\">' + esc(typeof noteStamp === 'function' ? noteStamp(m.at) : when(m.at)) + '</div>' +   /* 1486 */")

# 5. build label
s = one(s, "v2026-11-23 build 1485<button", "v2026-11-23 build 1486<button")

pl.write_atomic(P, s)
pl.assert_in(P, "function noteStamp(iso){")
print('patched', P)

# 6. What's New
s = pl.load(P)
s = one(s, "{ b: 1485, d:'2026-11-23',",
"{ b: 1486, d:'2026-11-23', t:'Every note shows its date and time', s:'Notes on a client now show the day and time they were written, for example Nov 23, 2026 \u00b7 4:12 PM, instead of \u201c3h ago\u201d. The same stamp shows in the job list preview and on punch card notes.' },\n"
"  { b: 1485, d:'2026-11-23',")
pl.write_atomic(P, s)
pl.assert_in(P, "{ b: 1486, d:'2026-11-23'")
print('changelog added')
