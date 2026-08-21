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


# ⚠ THE BUILD SEQUENCE IS SHARED ACROSS ARTIFACTS, AND THIS SCRIPT COULD ONLY
# SEE ONE OF THEM.
#
# Builds 810-822 were all spent on visualizer/index.html while index.html sat
# at 808. Reading index.html alone, this script answered "next safe: 810" —
# a number thirteen builds into the past, and one that would have written a
# second build 810 into the repo. That is precisely the collision it exists to
# prevent, produced by the tool itself.
#
# So: stamps come from EVERY artifact that carries one. Changelog entries stay
# index.html's, because that is the only file with a CHANGELOG array — the two
# signals answer different questions and only the stamp is per-artifact.
#
# Adding a new stamped artifact means adding it here. A file that carries a
# stamp and is not listed is invisible to this check, which is the failure
# above, exactly.
STAMPED = ("index.html", "visualizer/index.html")


def index_at(ref):
    """Changelog entries and the HIGHEST build stamp across every artifact."""
    code, out, _ = git("show", ref + ":index.html")
    if code != 0:
        return None
    stamps = [int(n) for n in STAMP.findall(out)]
    entries = dict((int(n), t) for n, t in ENTRY_OLD.findall(out))
    entries.update(dict((int(n), t) for n, t in ENTRY_NEW.findall(out)))

    per_file = {"index.html": max(stamps) if stamps else None}
    for path in STAMPED[1:]:
        c2, o2, _ = git("show", ref + ":" + path)
        if c2 != 0:            # absent on this ref — normal for old branches
            continue
        s2 = [int(n) for n in STAMP.findall(o2)]
        if s2:
            per_file[path] = max(s2)
            stamps.extend(s2)

    return {
        "stamp": max(stamps) if stamps else None,
        "entries": entries,
        "per_file": per_file,
    }


def cross_branch_collisions(claimed):
    """Build numbers claimed by MORE THAN ONE unmerged branch.

    `claimed` maps a build number to a list of (branch, note). Neither branch is
    on main, so the branch-vs-main check that this script has always done cannot
    see them — and that is the 574-span collision exactly. Kept as its own
    function so self_test() exercises the real rule rather than a copy of it.
    """
    return [(n, claimed[n]) for n in sorted(claimed) if len(claimed[n]) > 1]


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

    # THE GAP FOUND LIVE ON 21 AUG 2026. Two unmerged branches both claimed
    # build 967 (the UX-audit branch and the contract-print branch) and this
    # script printed both, three lines apart, without crossing them — because
    # collision detection only ever compared a branch against MAIN. That is the
    # 574-span disaster it was written to prevent, happening in its own output.
    # Against the pre-fix version there is no cross_branch_collisions() at all,
    # so this check cannot pass by accident.
    fixture = {
        967: [("origin/claude/a", "a refused write is held"),
              ("origin/claude/b", "the printed contract shows its words")],
        968: [("origin/claude/a", "the desk stops signing you out")],
    }
    hits = cross_branch_collisions(fixture)
    if [n for n, _ in hits] != [967]:
        print("FAIL: two branches claiming one number must be a collision — got %s"
              % [n for n, _ in hits])
        ok = False
    elif len(hits[0][1]) != 2:
        print("FAIL: the collision must name BOTH claimants")
        ok = False
    else:
        print("ok: a number claimed by two UNMERGED branches is a COLLISION")

    # THE REGRESSION THAT MADE THIS SCRIPT ANSWER 810 ON 15 AUG 2026, when
    # builds 810-822 had already shipped in visualizer/index.html. Reading one
    # artifact is not reading the build sequence. `git` is stubbed so this
    # exercises index_at() itself rather than a re-implementation of it — and
    # against the pre-fix version it returns 808 and fails.
    global git
    real_git = git

    FAKE = {
        "index.html": "<!-- v2026-08-14 build 808 -->\nvar CHANGELOG = [\n"
                      "  { b:808, d:'2026-08-14', t:'a', s:'b' },\n];\n",
        "visualizer/index.html": "<!--\n  v2026-08-15 build 822\n-->\n",
    }

    def fake_git(*args):
        if args[0] == "show":
            path = args[1].split(":", 1)[1]
            if path in FAKE:
                return 0, FAKE[path], ""
            return 128, "", "fatal: path does not exist"
        return real_git(*args)

    git = fake_git
    try:
        got = index_at("origin/main")
    finally:
        git = real_git

    if not got or got["stamp"] != 822:
        print("FAIL: the highest stamp across ALL artifacts must win — got %s, expected 822"
              % (got and got["stamp"]))
        print("      (reading index.html alone is what made this script answer 810")
        print("       when 810-822 were already spent in visualizer/index.html)")
        ok = False
    else:
        print("ok: the build number is the MAX across every stamped artifact")

    if not got or "visualizer/index.html" not in (got.get("per_file") or {}):
        print("FAIL: visualizer/index.html is not being scanned at all")
        ok = False
    else:
        print("ok: every artifact in STAMPED is reported separately")

    # A file absent on a ref must be skipped, not fatal — old branches predate
    # the Visualizer entirely, and treating that as an error would make this
    # script refuse to run over most of the repo's history.
    FAKE.pop("visualizer/index.html")
    git = fake_git
    try:
        got2 = index_at("origin/main")
    finally:
        git = real_git
    if not got2 or got2["stamp"] != 808:
        print("FAIL: an artifact absent on a ref must be skipped — got %s"
              % (got2 and got2["stamp"]))
        ok = False
    else:
        print("ok: a ref predating an artifact still resolves")

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
                claimed.setdefault(n, []).append((b, note))
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
        # ⚠ 975: this printed claimed[n][0] and nothing else. `claimed` has ALWAYS
        # been a number -> LIST of branches, so a number claimed twice printed as
        # if it were claimed once, and the tool that exists to prevent the 574
        # collision could not see one happening in front of it. Print every
        # claimant.
        print("  unmerged but already claimed: %s"
              % ", ".join("%d (%s)" % (n, ", ".join(x[0].replace("origin/", "")
                                                    for x in claimed[n]))
                          for n in pending))
    if stale_only:
        top = sorted(stale_only, key=lambda x: -(x[1] or 0))[:3]
        print("  %d other pushed branch(es) are stamped at or below main's %s and"
              " would need re-stamping to merge (newest: %s)"
              % (len(stale_only), base["stamp"],
                 ", ".join("%s %s" % (b.replace("origin/", ""), s) for b, s in top)))

    # ⚠ 975: the collision this tool was BUILT for, and could not see. Until now
    # it only compared each branch against MAIN — so it caught "this branch
    # reuses a number already shipped" and missed "two unmerged branches claim
    # the same number", which is precisely the 574-span disaster CLAUDE.md
    # records. It had both facts in hand the whole time and never crossed them:
    # `claimed` is a number -> list, and nothing ever tested len() > 1.
    # Found live on 21 Aug 2026: 967 claimed by both the UX-audit branch and the
    # contract-print branch, with an add/add clash on gate_967.mjs.
    cross = cross_branch_collisions(claimed)

    if collisions or cross:
        print("\n*** %d COLLISION(S) — these must be renumbered before merging ***\n"
              % (len(collisions) + len(cross)))
        for b, n, mine, theirs in collisions:
            print("  build %d on %s" % (n, b.replace("origin/", "")))
            print("      main says   : %s" % mine[:58])
            print("      branch says : %s" % theirs[:58])
        for n, who in cross:
            print("  build %d claimed by %d UNMERGED branches — neither is on main yet"
                  % (n, len(who)))
            for b, note in who:
                print("      %-46s : %s" % (b.replace("origin/", "")[:46], prose(note)[:52]))
            print("      whichever merges first, the other conflicts: same app stamp,")
            print("      same CHANGELOG head, and a gate_%d.mjs add/add clash." % n)
        print("\n  Merging one of these writes conflict markers into index.html and")
        print("  leaves two build stamps in one file. Renumber from %d upward first." % nxt)
        return 1

    print("\n  No collisions. Stamp your build %d and nothing else is using it." % nxt)
    return 0


if __name__ == "__main__":
    sys.exit(main())
