#!/usr/bin/env python3
"""Builder E — six existing gates that pin the OLD shape of things patch_E deliberately changed.

    python3 patch_E_gates.py [<scripts dir>]   (default: the repo's .claude/skills/cardinal-build/scripts)

Each one asserted a MECHANISM, not the contract it exists to protect, so a correct change read as a regression:

  gate_1201  counted `crDocSent(` as exactly 3 (one definition + the email send + the editor's Mark sent).
             patch_E adds the third real write site: the document LIST's Mark sent, which marked only the
             document and left the estimate Draft (judge 2 #2). 1201's own banner says the announcement is for
             "the email send and the Mark sent button"; the list's button is the same claim. Count 4.
  gate_1135  required the name field's padding-right >= 100px. On a phone the 44px controls now sit in their
             own row ABOVE the name, and on a desktop the field stops short of them (width), so there is no
             padding to measure. It now measures what 1135 cares about: the name's text box does not overlap
             any control beside it.
  gate_1029  stubbed crAsk to answer `true`. The unsaved-changes sheet now offers named choices (Save and
             close / Discard changes / Keep editing) and resolves a choice id, so the stub answers the
             choice that matches the old "accept" -- discard -- when it is handed choices.
Every edit is exact-match; nothing is written unless all three land. gate_1201's count now pins 4, so it reads
that one check red on a pre-E tree by design; gate_1135 and gate_1029 stay green on the old tree too.
"""
import os, sys
sys.path.insert(0, '/home/user/cardinal-inspections/.claude/skills/cardinal-build/scripts')
import patch_lib as pl

D = sys.argv[1] if len(sys.argv) > 1 else '/home/user/cardinal-inspections/.claude/skills/cardinal-build/scripts'
out = {}

g = pl.load(os.path.join(D, 'gate_1201.mjs'))
g = pl.sub(g,
"ok((html.match(/crDocSent\\(/g) || []).length === 3,\n"
"   'crDocSent: one definition and exactly two write sites',",
"/* Builder E: the document list's Mark sent is the third write site -- the same claim as the editor's */\n"
"ok((html.match(/crDocSent\\(/g) || []).length === 4,\n"
"   'crDocSent: one definition and its write sites (email send, the editor\\'s Mark sent, the list\\'s Mark sent)',")
out['gate_1201.mjs'] = g

g = pl.load(os.path.join(D, 'gate_1135.mjs'))
g = pl.sub(g,
"    namePadRight: name ? getComputedStyle(name).paddingRight : 'none',\n",
"    namePadRight: name ? getComputedStyle(name).paddingRight : 'none',\n"
"    /* Builder E: what 1135 protects is that the name's TEXT never runs under a control beside it --\n"
"       not how much padding buys that. The text box is the field less its right padding. */\n"
"    nameOverlap: (function(){ if(!name) return null; var row = name.closest('.cr-est-lineitem'); var n = name.getBoundingClientRect();\n"
"      var textR = n.right - (parseFloat(getComputedStyle(name).paddingRight) || 0);\n"
"      return [...row.querySelectorAll('.cr-est-move button, .del')].map(function(b){ var r = b.getBoundingClientRect();\n"
"        var vert = r.bottom > n.top && r.top < n.bottom; return vert ? Math.max(0, Math.round(textR - r.left)) : 0; })\n"
"        .reduce(function(a, b){ return Math.max(a, b); }, 0); })(),\n")
g = pl.sub(g,
"  if (parseFloat(r.namePadRight) < 100) fails.push(`name input clearance ${r.namePadRight} — runs under the move/delete buttons`);\n",
"  if (r.nameOverlap == null || r.nameOverlap > 0) fails.push(`name text runs ${r.nameOverlap}px under the move/delete buttons (padding ${r.namePadRight})`);\n")
out['gate_1135.mjs'] = g

g = pl.load(os.path.join(D, 'gate_1029.mjs'))
g = pl.sub(g,
"    window.crAsk = function(m){ window.__asks.push(String(m || '')); return Promise.resolve(window.__askAnswer); };\n",
"    /* Builder E: a question with named choices resolves a choice id. \"Accept\" on the unsaved-changes\n"
"       sheet is its discard choice; a plain yes/no question still gets the boolean. */\n"
"    window.crAsk = function(m, o){ window.__asks.push(String(m || ''));\n"
"      var ch = o && Array.isArray(o.choices) ? o.choices : null;\n"
"      if(ch && window.__askAnswer === true){ var d = ch.filter(function(c){ return /discard/i.test(String(c.id)); })[0]; return Promise.resolve(d ? d.id : true); }\n"
"      return Promise.resolve(window.__askAnswer); };\n")
out['gate_1029.mjs'] = g

# harness_ar1107 / harness_inv1108 asserted the exact labels judge 5 called the defect: "Deposit Paid" for one
# payment on any job, "Partially Paid" for two, and a 41-day sent invoice reading "Sent". The pill now answers
# the INVOICE's state (Builder E): an unsent invoice is Draft whatever was paid, a sent one past 30 days is
# Overdue, a sent one with money in is Partly paid. The figures paid still show in the row's own sub-line.
g = pl.load(os.path.join(D, 'harness_ar1107.js'))
for old, new in [
  ("ok(byId.P2.st.label === 'Deposit Paid', 'P2 (one draw) = Deposit Paid');",
   "ok(byId.P2.st.label === 'Draft', 'P2 (one draw, invoice not sent) = Draft -- the pill is the invoice state (Builder E)');"),
  ("ok(byId.P3.st.label === 'Partially Paid', 'P3 (two draws) = Partially Paid');",
   "ok(byId.P3.st.label === 'Draft', 'P3 (two draws, invoice not sent) = Draft');"),
  ("ok(byId.P4.st.k === 'sent' && byId.P4.age > 30, 'P4 = Sent AND overdue (age ' + byId.P4.age + ')');",
   "ok(byId.P4.st.k === 'over' && byId.P4.st.label === 'Overdue' && byId.P4.age > 30, 'P4 = Overdue (sent, age ' + byId.P4.age + ')');"),
  ("ok(/Deposit Paid/.test(bodyHtml) && /Partially Paid/.test(bodyHtml), 'rendered rows carry the status pills');",
   "ok(/>Draft</.test(bodyHtml) && />Overdue</.test(bodyHtml) && !/Deposit Paid|Partially Paid/.test(bodyHtml), 'rendered rows carry the status pills');"),
  ("ok(p1b.st.label === 'Deposit Paid', 'after a draw records, P1 moves Sent -> Deposit Paid');",
   "ok(p1b.st.label === 'Partly paid', 'after a draw records, P1 moves Sent -> Partly paid');"),
]:
    g = pl.sub(g, old, new)
out['harness_ar1107.js'] = g
g = pl.load(os.path.join(D, 'harness_inv1108.js'))
g = pl.sub(g, "ok(AR.status(p2).label === 'Deposit Paid', 'after the $500 check, P2 steps Sent -> Deposit Paid');",
              "ok(AR.status(p2).label === 'Partly paid', 'after the $500 check, P2 steps Sent -> Partly paid');")
out['harness_inv1108.js'] = g

# harness_estasm1098 extracted the shipped functions by their exact old signatures. Both gained a trailing
# measurements argument (judge 2 #1); a call with no measurements behaves exactly as before, which the
# harness's own math checks still prove.
g = pl.load(os.path.join(D, 'harness_estasm1098.js'))
g = pl.sub(g, "braceExtract('function expandAssembly(a, n){')", "braceExtract('function expandAssembly(a, n, m){')")
g = pl.sub(g, "ok(src.indexOf('function injectAssembly(a, squares){') !== -1, 'injectAssembly defined');",
              "ok(src.indexOf('function injectAssembly(a, squares, m){') !== -1, 'injectAssembly defined');")
g = pl.sub(g, "ok(/injectAssembly\\(a, sq\\);[\\s\\S]{0,40}closePicker\\(\\);/.test(src),",
              "ok(/injectAssembly\\(a, sq(?:, [^;]*)?\\);[\\s\\S]{0,140}closePicker\\(\\);/.test(src),")
out['harness_estasm1098.js'] = g

for name, text in out.items():
    pl.write_atomic(os.path.join(D, name), text)
    print('patch_E_gates: wrote', os.path.join(D, name))
