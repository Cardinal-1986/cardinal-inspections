# -*- coding: utf-8 -*-
r"""Which build number is safe to use? Ask the REMOTE, never the working copy.

    python .claude/skills/cardinal-build/scripts/next_build.py

Two sessions built on this repo at the same time on 31 July 2026. Both read the
build number out of their own working copy, both went "the next one is 504", and
one of them produced a branch that reused 504, 505 and 506 for entirely different
features. Merging it would have written FOUR conflict markers into the shipped
index.html and left two build stamps in one file.

The working copy cannot know what another session has already pushed. `main` and
the pushed branches can. So this asks them.

Run it BEFORE the first patch of a session, and again before opening a PR.

Exit codes:  0 = clear   1 = a pushed branch collides with main   2 = git problem
"""
from __future__ import print_function

import re
import subprocess
import sys

STAMP = re.compile(r"v\d{4}-\d{2}-\d{2} build (\d+)")

# THE CHANGELOG HAS TWO ENTRY SHAPES, AND BOTH ARE LIVE. Build 574 added
# `{ b, d, t, s }` BESIDE the original `{ build, note }` — it did not replace it.
# The old shape kept receiving entries until build 600, and both are interleaved
# in one descending array that the app's own renderer normalises on purpose
# (`entryBuild(e){ return e.build != null ? e.build : e.b; }`).
#
# Matching only the old shape is what broke this script. Every branch parses to
# an identical set of old-shape entries, so `new`/`bad`/`edited` are always empty,
# every branch is skipped by the `if new or bad or edited` guard, and a branch
# that has claimed a number becomes INVISIBLE. Collision detection was dead from
# 574 until this fix — on 9 Aug it reported "637 free" while a pushed branch was
# stamped 637, and two PRs shipped a build 638.
ENTRY_OLD = re.compile(r"\{\s*build:\s*(\d+),\s*note:'([^']{0,60})")
ENTRY_NEW = re.compile(r"\{\s*b:\s*(\d+),\s*d:'[^']*',\s*t:'([^']{0,60})")


# 4 OR 5 hex: the broken five-hex form is exactly what build 511 repaired, and
# stripping only four of its digits leaves a stray letter behind that makes two
# identical notes compare as different.
ESCAPE = re.compile(r"\\u[0-9A-Fa-f]{4,5}")


def prose(note):
    """A note's MEANING, for deciding whether two builds are the same work.

    Comparing raw bytes is too crude: build 511 repaired the emoji escapes in
    six earlier notes, so their text differs while the feature is identical.
    That is an EDIT, not a reuse of the number, and flagging it buries the one
    collision that matters. Strip the escapes, drop any stray leftover initial,
    and what remains is the sentence a person reads.
    """
    words = ESCAPE.sub("", note).split()
    while words and len(words[0]) < 3:
        words.pop(0)
    return " ".join(words).lower()[:40]


def git(*args):
    p = subprocess.Popen(["git"] + list(args), stdout=subprocess.PIPE,
                         stderr=subprocess.PIPE)
    out, err = p.communicate()
    return p.returncode, out.decode("utf-8", "replace"), err.decode("utf-8", "replace")


def index_at(ref):
    """The changelog entries and stamp of index.html at a ref, or None."""
    code, out, _ = git("show", ref + ":index.html")
    if code != 0:
        return None
    stamps = [int(n) for n in STAMP.findall(out)]
    entries = dict((int(n), t) for n, t in ENTRY_OLD.findall(out))
    entries.update(dict((int(n), t) for n, t in ENTRY_NEW.findall(out)))
    return {
        "stamp": max(stamps) if stamps else None,
        "entries": entries,
    }


def self_test():
    """Prove prose() separates a repaired note from a reused number.

    Both directions matter. A rule loose enough to catch every real collision
    also flags every legitimate edit, and a rule tight enough to ignore edits
    can miss the collision. These are the actual strings from 31 July 2026.
    """
    same = (r"ὍA The Resource Library is now one tap away from anywhere.",
            r"📚 The Resource Library is now one tap away from anywhere.")
    diff = (r"ὐE CompanyCam search is much more forgiving. Typing an address",
            r"🟩 The green Bill to card on a community job is back.")
    ok = True
    if prose(same[0]) != prose(same[1]):
        print("FAIL: a repaired emoji reads as a different build")
        print("      %r\n      %r" % (prose(same[0]), prose(same[1])))
        ok = False
    else:
        print("ok: a repaired emoji is recognised as the SAME build")
    if prose(diff[0]) == prose(diff[1]):
        print("FAIL: two different features read as the same build")
        ok = False
    else:
        print("ok: two different features are recognised as a COLLISION")

    # THE REGRESSION THAT KILLED THIS SCRIPT FOR 65 BUILDS. Matching only the
    # pre-574 shape made every branch parse identically, so no branch ever looked
    # like it had claimed a number. Verbatim samples of both live shapes, taken
    # from index.html's single interleaved CHANGELOG array.
    mixed = (
        "var CHANGELOG = [\n"
        "  { b:639, d:'2026-08-09', t:'The Scope of Loss upload is visible again',\n"
        "    s:'long user-facing summary' },\n"
        "{ build:600, note:'\\uD83D\\uDD12 What\\u2019s New no longer opens for the team.' },\n"
        "];\n"
    )
    got = dict((int(n), t) for n, t in ENTRY_OLD.findall(mixed))
    got.update(dict((int(n), t) for n, t in ENTRY_NEW.findall(mixed)))
    if sorted(got.keys()) != [600, 639]:
        print("FAIL: both changelog shapes must parse — got %s, expected [600, 639]"
              % sorted(got.keys()))
        print("      (matching only one shape is what broke collision detection)")
        ok = False
    else:
        print("ok: BOTH changelog entry shapes parse — { build, note } and { b, d, t, s }")

    return 0 if ok else 1


def main():
    if "--self-test" in sys.argv:
        return self_test()

    code, _, err = git("fetch", "origin", "--quiet")
    if code != 0:
        print("could not fetch: " + err.strip())
        print("(carrying on with what is already fetched — the answer may be stale)\n")

    base = index_at("origin/main")
    if base is None:
        print("cannot read origin/main:index.html — is this the right repo?")
        return 2

    highest = max([base["stamp"] or 0] + list(base["entries"].keys()))
    print("origin/main   stamp %s, changelog goes up to %d\n"
          % (base["stamp"], max(base["entries"].keys())))

    # every pushed branch, so a number claimed but unmerged is still visible
    code, out, _ = git("for-each-ref", "--format=%(refname:short)", "refs/remotes/origin")
    branches = [b for b in out.split("\n") if b.strip() and b != "origin/HEAD" and b != "origin/main"]

    claimed = {}      # build number -> [branch, ...]  (not on main at all)
    collisions = []   # (branch, number, main_note, branch_note)
    stale_only = []   # (branch, stamp) — behind main, nothing else to say

    for b in branches:
        code, ahead, _ = git("rev-list", "--count", "origin/main.." + b)
        if code != 0 or ahead.strip() == "0":
            continue                      # nothing new on it
        info = index_at(b)
        if info is None:
            continue
        new, bad, edited = [], [], []
        for n, note in info["entries"].items():
            if n not in base["entries"]:
                new.append(n)
                claimed.setdefault(n, []).append(b)
            elif prose(note) != prose(base["entries"][n]):
                bad.append(n)
                collisions.append((b, n, base["entries"][n], note))
            elif note != base["entries"][n]:
                edited.append(n)     # same feature, note text repaired — fine
        # A branch's STAMP counts even when its entries tell us nothing. Belt and
        # braces on purpose: the entry regex is one assumption about a changelog
        # shape that has already changed once, and the stamp is what
        # check_build.py actually gates on. If the shape changes again, this
        # keeps the number safe while the parse goes quietly blind.
        highest = max([highest, info["stamp"] or 0] + new + bad)

        # Ahead of main but stamped no higher than main => it CANNOT merge as it
        # stands: check_build.py requires the app stamp to strictly increase.
        stale = (info["stamp"] or 0) <= (base["stamp"] or 0)

        # ⚠ Only say so for a branch doing CURRENT work. Reporting every stale
        # branch printed 55 lines on the first run of this fix and buried the one
        # collision that mattered — this tool is worthless if its headline
        # scrolls off. An abandoned 427-era branch being behind is not news;
        # `highest` above already accounts for it either way, so the safe-number
        # answer never depends on whether we print this.
        if stale and not (new or bad or edited):
            stale_only.append((b, info["stamp"]))

        if new or bad or edited:
            label = b.replace("origin/", "")
            print("  %-46s stamp %s" % (label[:46], info["stamp"]))
            if new:
                print("      adds builds: %s" % ", ".join(str(x) for x in sorted(new)))
            if edited:
                print("      edits the note on %s (same feature — not a clash)"
                      % ", ".join(str(x) for x in sorted(edited)))
            if bad:
                print("      *** REUSES %s — already on main for different work ***"
                      % ", ".join(str(x) for x in sorted(bad)))
            if stale:
                print("      !!! stamp %s is not above main's %s — must be re-stamped"
                      " (>= %d) before it can merge"
                      % (info["stamp"], base["stamp"], (base["stamp"] or 0) + 1))

    nxt = highest + 1
    print("\n" + "=" * 62)
    print("  NEXT SAFE BUILD NUMBER: %d" % nxt)
    print("=" * 62)
    print("  highest seen anywhere (main + every pushed branch): %d" % highest)
    if claimed:
        pending = sorted(claimed.keys())
        print("  unmerged but already claimed: %s"
              % ", ".join("%d (%s)" % (n, claimed[n][0].replace("origin/", "")) for n in pending))
    if stale_only:
        top = sorted(stale_only, key=lambda x: -(x[1] or 0))[:3]
        print("  %d other pushed branch(es) are stamped at or below main's %s and"
              " would need re-stamping to merge (newest: %s)"
              % (len(stale_only), base["stamp"],
                 ", ".join("%s %s" % (b.replace("origin/", ""), s) for b, s in top)))

    if collisions:
        print("\n*** %d COLLISION(S) — these must be renumbered before merging ***\n"
              % len(collisions))
        for b, n, mine, theirs in collisions:
            print("  build %d on %s" % (n, b.replace("origin/", "")))
            print("      main says   : %s" % mine[:58])
            print("      branch says : %s" % theirs[:58])
        print("\n  Merging one of these writes conflict markers into index.html and")
        print("  leaves two build stamps in one file. Renumber from %d upward first." % nxt)
        return 1

    print("\n  No collisions. Stamp your build %d and nothing else is using it." % nxt)
    return 0


if __name__ == "__main__":
    sys.exit(main())
