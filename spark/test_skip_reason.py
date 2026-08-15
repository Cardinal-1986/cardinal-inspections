#!/usr/bin/env python3
"""
test_skip_reason.py — a selected surface that came back unchanged must say so.

    python3 test_skip_reason.py

WHY THIS TEST EXISTS

Before build 823 a job could finish `done`, upload a render, leave `error`
null — and have quietly not touched one of the surfaces the rep picked. The
only record was a log line on the Spark box. The screen showed a success.

That is the failure this file guards, and it has two halves:

  1. skip_reason() must classify correctly, and in the right ORDER.
  2. The reason must travel — every code it returns must have a sentence in
     SKIP_REASON, or the browser shows a rep a bare enum.

The second half is the one that rots. A future reason added to skip_reason()
without a line in SKIP_REASON breaks nothing at runtime and nobody notices,
so it is asserted here rather than trusted.

Imports the SHIPPED module — no re-implementation. The worker's heavy deps
(requests, websocket, PIL) are needed at import, so this is skipped with a
clear message rather than a traceback when they are absent.
"""

import os
import sys
from pathlib import Path

# The worker refuses to import without these. Nothing in this file makes a
# network call, so INERT PLACEHOLDERS are set when the real ones are absent —
# a test that quietly skips is a test that proves nothing, which is the exact
# failure mode 823 was built to stop. Never put a real service key here; it
# would be a credential in a commit.
os.environ.setdefault("SUPABASE_URL", "https://example.invalid")
os.environ.setdefault("SUPABASE_SERVICE_KEY", "inert-placeholder-not-a-key")

# Allow pointing at another tree for a negative control:
#     python3 test_skip_reason.py /tmp/old_spark
CONTROL = len(sys.argv) > 1
sys.path.insert(0, sys.argv[1] if CONTROL
                else str(Path(__file__).resolve().parent))

try:
    import visualizer_worker as W
except SystemExit as e:                       # the module's own dep guard
    print("CANNOT RUN — %s" % e)
    sys.exit(1)
except ImportError as e:
    print("CANNOT RUN — cannot import visualizer_worker: %s" % e)
    sys.exit(1)

# A control run needs the OLD module, not a cached new one.
if CONTROL and Path(W.__file__).resolve().parent != Path(sys.argv[1]).resolve():
    sys.exit("CONTROL FAILED — imported %s, not the tree given" % W.__file__)

# The control must fail at the FIRST missing name, loudly, rather than
# tripping an AttributeError halfway down and looking like a code bug.
missing = [n for n in ("skip_reason", "SKIP_REASON") if not hasattr(W, n)]
if missing:
    print("\ntest_skip_reason — RED: %s absent from %s"
          % (", ".join(missing), W.__file__))
    sys.exit(0 if CONTROL else 1)

fails = []


def ok(name, cond, detail=""):
    if cond:
        return
    fails.append(name + ("  — " + detail if detail else ""))


MASKS = {"roof": b"", "siding": b""}          # presence is all that matters
HEX = {"hex": "#3A3E41", "name": "Onyx Black"}
NOHEX = {"name": "Some swatch"}

# ── 1. the happy path ────────────────────────────────────────────────────
ok("a masked surface with a hex is changeable",
   W.skip_reason("roof", HEX, MASKS, False) is None)

# ── 2. no mask ───────────────────────────────────────────────────────────
ok("a surface with no mask is not_found",
   W.skip_reason("trim", HEX, MASKS, False) == "not_found")
ok("no mask is not_found in restyle mode too",
   W.skip_reason("trim", HEX, MASKS, True) == "not_found",
   "restyle cannot paint outside a mask either")

# ── 3. no hex, and the mode decides ──────────────────────────────────────
ok("no hex in RECOLOUR is no_hex",
   W.skip_reason("roof", NOHEX, MASKS, False) == "no_hex",
   "the tint IS the render; there is nothing to tint toward")
ok("no hex in RESTYLE is fine",
   W.skip_reason("roof", NOHEX, MASKS, True) is None,
   "the prompt carries the colour when a diffusion pass follows")

# ── 4. ORDER — the case that sends a rep to fix the wrong thing ──────────
# A surface that is BOTH absent from the masks and hexless must report the
# mask problem. Telling someone their swatch has no colour, when the real
# trouble is that the gutter is not in the photograph, costs a second render
# and a wrong conclusion.
ok("no mask AND no hex reports not_found, not no_hex",
   W.skip_reason("gutters", NOHEX, MASKS, False) == "not_found",
   "got " + repr(W.skip_reason("gutters", NOHEX, MASKS, False)))

# ── 5. an empty selection does not explode ───────────────────────────────
ok("a None selection is handled",
   W.skip_reason("roof", None, MASKS, False) == "no_hex")
ok("an empty-string hex counts as no hex",
   W.skip_reason("roof", {"hex": ""}, MASKS, False) == "no_hex")

# ── 6. every reason has a sentence ───────────────────────────────────────
# The contract with visualizer/index.html. A code with no sentence renders to
# a rep as a bare enum.
produced = set()
for surface in ("roof", "trim"):
    for sel in (HEX, NOHEX, None, {"hex": ""}):
        for restyle in (False, True):
            r = W.skip_reason(surface, sel, MASKS, restyle)
            if r:
                produced.add(r)

ok("every reason skip_reason can produce has a sentence",
   produced <= set(W.SKIP_REASON),
   "missing: " + ", ".join(sorted(produced - set(W.SKIP_REASON))))
ok("no sentence is dead weight",
   set(W.SKIP_REASON) <= produced,
   "unreachable: " + ", ".join(sorted(set(W.SKIP_REASON) - produced)))
ok("both reasons are actually reachable", produced == {"not_found", "no_hex"},
   "got " + repr(sorted(produced)))

# ── 7. the sentences are for a person, not a log ─────────────────────────
for code, text in W.SKIP_REASON.items():
    ok("%s reads as a sentence" % code,
       len(text) > 20 and text == text.strip() and "_" not in text,
       repr(text))

# ── report ───────────────────────────────────────────────────────────────
total = 14
if fails:
    print("\ntest_skip_reason — %d FAILED" % len(fails))
    for f in fails:
        print("  - " + f)
    sys.exit(1)
print("\ntest_skip_reason — all %d checks pass" % total)
