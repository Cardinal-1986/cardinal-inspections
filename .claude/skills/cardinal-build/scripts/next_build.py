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
ENTRY = re.compile(r"\{ build:(\d+), note:'([^']{0,60})")


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
    return {
        "stamp": max(stamps) if stamps else None,
        "entries": dict((int(n), t) for n, t in ENTRY.findall(out)),
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
            highest = max([highest] + new + bad)

    nxt = highest + 1
    print("\n" + "=" * 62)
    print("  NEXT SAFE BUILD NUMBER: %d" % nxt)
    print("=" * 62)
    print("  highest seen anywhere (main + every pushed branch): %d" % highest)
    if claimed:
        pending = sorted(claimed.keys())
        print("  unmerged but already claimed: %s"
              % ", ".join("%d (%s)" % (n, claimed[n][0].replace("origin/", "")) for n in pending))

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
