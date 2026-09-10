#!/usr/bin/env python3
"""Build 1200 — two guards, both one condition.

B1  syncMenuCount() wrote textContent unconditionally from inside a
    document.body MutationObserver's wake, and an identical-string write still
    emits a childList record, so the observer woke itself ~60x/sec for as long
    as a client profile was open. Measured 65 records/sec, 360 on this element
    in six seconds, on both seeded profiles (4 punch items and 0).

B2  The Approved and Completed team emails fired on `prev !== v` — "arrived
    from anywhere" — so the back chevron from Scheduled to Approved re-sent
    Curtis "schedule + order materials" for an already-scheduled job.

Usage: patch_1200.py --src index.html --dst out.html
"""
import argparse, re, sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import patch_lib as pl

# ---------------------------------------------------------------- B1
OLD_SYNC = """function syncMenuCount(){
var el = document.getElementById('dbPunchN');
if(!el || loadedFor === null) return;
var open = rows.filter(function(i){ return i.status !== 'done'; }).length;
el.textContent = open;
el.classList.toggle('zero', open === 0);
}"""

NEW_SYNC = """function syncMenuCount(){
var el = document.getElementById('dbPunchN');
if(!el || loadedFor === null) return;
var open = rows.filter(function(i){ return i.status !== 'done'; }).length;
/* 1200: this is reached from check(), which runs from a document.body
   MutationObserver. Assigning textContent emits a childList record even when
   the string is IDENTICAL - the old text node is removed and a new one added -
   so this write woke every body observer in the app about sixty times a second
   for as long as a client profile was open. Measured: 65 records/sec, 360 of
   them on this element in six seconds, on a profile with four punch items and
   on one with none. Same class as 567/569. Compare against the LIVE element
   (paintChip's shape, 567) rather than a stored signature (wxPaint, 569), so
   this still repairs the count if another module stomps it. */
var txt = String(open);
if(el.textContent !== txt) el.textContent = txt;
var zero = (open === 0);
if(el.classList.contains('zero') !== zero) el.classList.toggle('zero', zero);
}"""

# ---------------------------------------------------------------- B2
OLD_RANK = """function acxRank(stg){
  var order = ['Lead','Prospect','Approved','Scheduled','Completed','Invoiced','Closed'];
  return order.indexOf(stg);
}"""

NEW_RANK = OLD_RANK + """
/* 1200: has this job just reached `to` for the FIRST time, moving forward?
   The Approved and Completed team emails used to fire on `prev !== to`, which
   means "arrived from anywhere" - so the back chevron from Scheduled to
   Approved re-sent Curtis "APPROVED - schedule + order materials" for a job
   that had already been scheduled, and the same shape re-sent the rep's
   "job complete" mail from Invoiced. acxRank() above is the app's pipeline
   order and the only one; do not add a second. The two stages it does NOT
   list - OnHold and Lost - rank -1 and count as BEFORE every stage ON PURPOSE:
   a held job that gets approved, and a lost job revived, are both real forward
   moves and must still tell Curtis. gate_1200 pins the entire nine-stage truth
   table for both targets, so a later edit to that order goes red rather than
   silently inverting this. api/clientsign.js has carried the same rule since
   1007 ("only alerts on the real move"). */
function crStageIsForward(prev, to){
  var r = acxRank(prev);
  return r === -1 || r < acxRank(to);
}"""

OLD_APPR = "if(v === 'Approved' && prev !== 'Approved'){"
NEW_APPR = "if(v === 'Approved' && crStageIsForward(prev, 'Approved')){"
OLD_COMP = "if(v === 'Completed' && prev !== 'Completed'){"
NEW_COMP = "if(v === 'Completed' && crStageIsForward(prev, 'Completed')){"

# ---------------------------------------------------------------- stamp
OLD_STAMP = 'v2026-09-09 build 1199'
NEW_STAMP = 'v2026-09-10 build 1200'

# ---------------------------------------------------------------- changelog
OLD_CL = "var CHANGELOG = [\n  { b: 1199,"
NEW_CL = ("var CHANGELOG = [\n"
  "  { b: 1200, d: '2026-09-10', t: 'Your phone stops working overtime on a client profile, "
  "and Curtis stops being told twice', s: 'Two fixes, both invisible until you notice what they cost. "
  "<b>An open client profile was redrawing its Punch Outs count about sixty times a second</b>, "
  "forever, whether the job had four punch items or none \\u2014 every other part of the page that "
  "watches for changes woke up each time. On a phone that is battery and heat for nothing. The count "
  "is now written only when it actually changes. <b>And moving a job backwards no longer re-sends the "
  "team email.</b> Tapping the \\u2039 arrow from Scheduled back to Approved fired Curtis and the "
  "admins a fresh \\u201cAPPROVED \\u2014 schedule + order materials\\u201d for a job that had already "
  "been scheduled; the same shape re-sent the rep\\u2019s \\u201cjob complete\\u201d mail from Invoiced. "
  "Those two emails now go out only when a job reaches that stage moving <i>forward</i> \\u2014 and a "
  "job that was On Hold, or Lost and revived, still counts as forward, so nothing real is missed.' },\n"
  "  { b: 1199,")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--src', required=True)
    ap.add_argument('--dst', required=True)
    a = ap.parse_args()

    src = pl.load(a.src)
    orig = src

    for name, old in [('syncMenuCount', OLD_SYNC), ('acxRank', OLD_RANK),
                      ('approved-notify', OLD_APPR), ('completed-notify', OLD_COMP),
                      ('stamp', OLD_STAMP), ('changelog-head', OLD_CL)]:
        n = src.count(old)
        assert n == 1, '%s: expected 1 occurrence, found %d' % (name, n)
    assert 'crStageIsForward' not in src, 'marker already present in source'

    src = pl.sub(src, OLD_SYNC, NEW_SYNC)
    src = pl.sub(src, OLD_RANK, NEW_RANK)
    src = pl.sub(src, OLD_APPR, NEW_APPR)
    src = pl.sub(src, OLD_COMP, NEW_COMP)
    src = pl.sub(src, OLD_STAMP, NEW_STAMP)
    src = pl.sub(src, OLD_CL, NEW_CL)

    # self-computing assertions: exactly one of each old form survived nowhere
    assert src.count(OLD_APPR) == 0 and src.count(NEW_APPR) == 1
    assert src.count(OLD_COMP) == 0 and src.count(NEW_COMP) == 1
    assert src.count('crStageIsForward') == 3          # 1 def + 2 call sites
    assert src.count('function acxRank(') == 1
    assert src.count('function syncMenuCount(') == 1
    assert src.count("el.textContent = open;") == 0
    assert src.count('build 1200') == 1 and src.count('build 1199') == 0
    assert src.count('{ b: 1200,') == 1 and src.count('{ b: 1199,') == 1
    # nothing else moved
    assert len(src) > len(orig)

    pl.write_atomic(a.dst, src)
    pl.assert_in(a.dst, 'function crStageIsForward(prev, to){')
    pl.assert_in(a.dst, NEW_APPR)
    pl.assert_in(a.dst, NEW_COMP)
    pl.assert_in(a.dst, 'if(el.textContent !== txt) el.textContent = txt;')
    print('build 1200 written: %s  (%d -> %d chars)' % (a.dst, len(orig), len(src)))


if __name__ == '__main__':
    main()
