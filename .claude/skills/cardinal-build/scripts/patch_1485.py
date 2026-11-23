"""Build 1485: Jerry Wamsley joins TEAM_ROSTER, so he can be picked as a rep (Theo, 23 Nov 2026, with a
screenshot of the Reassign list: "Wamsley isn't here").

He shares the first name AND the email prefix "jerry" with Jerry Vera, so on the roster alone "@jerry"
would buzz both (mentionMatch keys on first name + email prefix). A roster entry may now carry `tag`,
its @handle: a tagged member is reached by the tag or the last name only. Both Jerrys are tagged
(@wamsley, @vera), so "@jerry" reaches nobody and the line under the box says "type more: Vera,
Wamsley". The three tag-chip rows (job thread, punch card, punch page) show the tag for a tagged member.

Run from the repo root:  python .claude/skills/cardinal-build/scripts/patch_1485.py [index.html]"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import patch_lib as pl
P = sys.argv[1] if len(sys.argv) > 1 else 'index.html'
s = pl.load(P)

def one(s, a, b):
    assert s.count(a) == 1, (s.count(a), a[:90])
    return s.replace(a, b, 1)

# 1. the roster: Wamsley added; both Jerrys tagged
s = one(s, "/* ---- team roster & roles (edit emails here if any differ) ---- */\n",
"/* ---- team roster & roles (edit emails here if any differ) ---- */\n"
"/* 1485: `tag` is an optional @handle. A member with a tag is reached by that tag (or the last name)\n"
"   only, never by first name or email prefix: Jerry Vera and Jerry Wamsley share both (\"jerry\"),\n"
"   so \"@jerry\" must reach nobody rather than both. Tag anyone whose first name another member has. */\n")
s = one(s, "  { name:'Jerry Vera',          email:'jerry@cardinalrenovations.net' },\n",
           "  { name:'Jerry Vera',          email:'jerry@cardinalrenovations.net', tag:'vera' },\n"
           "  { name:'Jerry Wamsley',       email:'jerry@jerrywamsley.com', tag:'wamsley' },\n")

# 2. who a tag reaches
s = one(s, "  function keys(mbr){ return [(mbr.name || '').trim().split(/\\s+/)[0].toLowerCase(), (mbr.email || '').split('@')[0].toLowerCase()]; }\n",
"  /* 1485: a tagged member answers to the tag and the last name only (see TEAM_ROSTER) */\n"
"  function keys(mbr){\n"
"    if(mbr.tag){ var nm = (mbr.name || '').trim().split(/\\s+/); return [String(mbr.tag).toLowerCase(), String(nm[nm.length - 1] || '').toLowerCase()]; }\n"
"    return [(mbr.name || '').trim().split(/\\s+/)[0].toLowerCase(), (mbr.email || '').split('@')[0].toLowerCase()];\n"
"  }\n")
# 3. the "type more" hint names a tagged member by the tag
s = one(s, "  function firstOf(mbr){ return (mbr.name || '').trim().split(/\\s+/)[0]; }\n",
"  function firstOf(mbr){ return mbr.tag ? String(mbr.tag).charAt(0).toUpperCase() + String(mbr.tag).slice(1) : (mbr.name || '').trim().split(/\\s+/)[0]; }   /* 1485 */\n")

# 4. the three chip rows
s = one(s, "    var first = (mbr.name || '').trim().split(/\\s+/)[0];\n",
"    var first = mbr.tag ? String(mbr.tag).charAt(0).toUpperCase() + String(mbr.tag).slice(1) : (mbr.name || '').trim().split(/\\s+/)[0];   /* 1485 */\n")
s = one(s, "    return '<button class=\"pktag\" data-tag=\"' + esc((m.name || nameOf(m.email)).split(' ')[0]) + '\" type=\"button\">@' +\n      esc((m.name || nameOf(m.email)).split(' ')[0]) + '</button>';\n",
"    var first = m.tag ? String(m.tag).charAt(0).toUpperCase() + String(m.tag).slice(1) : (m.name || nameOf(m.email)).split(' ')[0];   /* 1485 */\n"
"    return '<button class=\"pktag\" data-tag=\"' + esc(first) + '\" type=\"button\">@' +\n      esc(first) + '</button>';\n")
s = one(s, "var first = String(m.name || '').trim().split(/\\s+/)[0];\n",
"var first = m.tag ? String(m.tag).charAt(0).toUpperCase() + String(m.tag).slice(1) : String(m.name || '').trim().split(/\\s+/)[0];   /* 1485 */\n")

# 5. stamp + What's New
s = one(s, ">v2026-11-21 build 1484<", ">v2026-11-23 build 1485<")
s = one(s, "var CHANGELOG = [\n  { b: 1484,",
"var CHANGELOG = [\n"
"  { b: 1485, d:'2026-11-23', t:'Jerry Wamsley can be picked as a rep', s:'Jerry Wamsley now appears in Reassign, in the rep list on a new lead and everywhere else a teammate is chosen. Because he and Jerry Vera share a first name, @jerry in a message no longer notifies either of them: tag @Wamsley or @Vera instead. The tag buttons show those names, and the line under the box tells you if a tag fits two people.' },\n"
"  { b: 1484,")

pl.write_atomic(P, s)
print('ok 1485')
