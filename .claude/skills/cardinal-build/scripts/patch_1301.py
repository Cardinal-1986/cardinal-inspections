"""Build 1301 — Community's stage names live in one place (OPEN_ITEMS, Community revamp row 2).

Four identical copies of the Community stage map: the Client Directory's
CD_STAGE_LABEL.community, cr-comstage's COM_LABEL, and two byte-identical `var LABEL`
maps in the Community modules (CLAUDE.md's LABEL trap). 710 already found one of them
missing OnHold. This makes ONE map, window.CC_STAGE_LABEL, beside INS_STAGE_LABEL, and
every copy reads it first -- the exact shape 655 (CR-AUD-014) gave insurance: shared
map first, same-wording fallback so each module still stands alone. gate_1301 fails if
any fallback ever differs from the shared map, so the copies cannot drift apart again.
No wording changes: all four were measured identical before the change.

Usage: python3 patch_1301.py [index.html]
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import patch_lib as pl
PATH = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../../../index.html')
src = pl.load(PATH)

A = "window.insStageLabel = insStageLabel;\n"
B = """window.insStageLabel = insStageLabel;
/* 1301: ONE Community stage map. Four copies existed (this file's directory map,
   cr-comstage's COM_LABEL and two identical `var LABEL`s in the Community modules);
   each now reads this first and keeps its own copy only as a standalone fallback,
   the 655 shape INS_STAGE_LABEL already has. gate_1301 holds them equal.
   On window only, not also a top-level var: the pair reads as a type clash to gate_types. */
window.CC_STAGE_LABEL = {
  'Lead':'Estimate Requested', 'Prospect':'Estimate Submitted', 'OnHold':'Awaiting Funding',
  'Approved':'Awarded', 'Scheduled':'Scheduled', 'Completed':'Build Complete',
  'Invoiced':'Invoiced', 'Closed':'Closed', 'Lost':'Not Awarded'
};
"""
src = pl.sub(src, A, B)

A = """  community: { 'Lead':'Estimate Requested', 'Prospect':'Estimate Submitted', 'OnHold':'Awaiting Funding',
               'Approved':'Awarded',
               'Scheduled':'Scheduled', 'Completed':'Build Complete', 'Invoiced':'Invoiced',
               'Closed':'Closed', 'Lost':'Not Awarded' }"""
B = """  community: window.CC_STAGE_LABEL   /* 1301: the one map, defined just above */"""
src = pl.sub(src, A, B)

A = "var COM_LABEL = {\n'Lead':      'Estimate Requested',"
B = "var COM_LABEL = window.CC_STAGE_LABEL || {   /* 1301: shared map first */\n'Lead':      'Estimate Requested',"
src = pl.sub(src, A, B)

OLD = "var LABEL = {\n'Lead':'Estimate Requested',"
NEW = "var LABEL = window.CC_STAGE_LABEL || {   /* 1301: shared map first */\n'Lead':'Estimate Requested',"
assert src.count(OLD) == 2, src.count(OLD)
src = src.replace(OLD, NEW)

A = ">v2026-10-11 build 1300<button"
B = ">v2026-10-11 build 1301<button"
src = pl.sub(src, A, B)
A = "var CHANGELOG = [\n"
B = """var CHANGELOG = [
  { b: 1301, d: '2026-10-11', t: 'Community stage names live in one place',
    s: 'Behind the scenes: the Community stage names (Estimate Requested, Awarded, Build Complete\\u2026) were written out four separate times, and once one copy was missing a stage. They now come from one list, so a name can only ever be changed in one spot and every Community screen says the same thing. Nothing you see changes.' },
"""
src = pl.sub(src, A, B)
pl.write_atomic(PATH, src)
print('patched', PATH)
