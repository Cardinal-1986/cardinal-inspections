#!/usr/bin/env python3
"""
test_stale_worker.py — a mode key must never be reported as a surface.

    python3 test_stale_worker.py

WHY THIS TEST EXISTS

On 15 Aug the browser shipped tap-to-segment (827) and the Spark was not
restarted. Four tap jobs ran against the previous worker, which had no
`_points` branch, so they fell through to the ordinary render path. That path
segmented all four surfaces, looked for a mask named `_points`, found none,
and told the rep:

    "Nothing could be applied — the segmenter did not find _points in this
     photograph. Try a straighter, less obstructed shot of the elevation."

Every word of that is wrong. There was nothing wrong with the photograph, the
segmenter had done its job, and `_points` is a MODE, not a surface. It cost
an hour of looking for a photography problem, and the rows themselves carried
no worker version to contradict it — the failure path stamped nothing.

Two things are asserted here:

  1. An underscore key that no branch handled raises a stale-worker error that
     names the build and says what to do, and does NOT talk about the
     photograph.
  2. Every mode key the browser can send is either handled by a branch or
     caught by that guard. This is the half that rots: a third mode added to
     the browser without a branch here would go back to being reported as a
     missing surface.

Imports the SHIPPED module — no re-implementation. The worker's heavy deps
are needed at import, so this skips with a clear message rather than a
traceback when they are absent.
"""

import os
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent

# The worker refuses to import without these. Nothing here makes a network
# call, so INERT PLACEHOLDERS stand in when the real ones are absent — a test
# that quietly skips is a test that proves nothing. Never a real key.
os.environ.setdefault("SUPABASE_URL", "https://example.invalid")
os.environ.setdefault("SUPABASE_SERVICE_KEY", "inert-placeholder-not-a-key")

# Allow pointing at another tree for a negative control:
#     python3 test_stale_worker.py /tmp/old_spark
CONTROL = len(sys.argv) > 1
ROOT = Path(sys.argv[1]).resolve() if CONTROL else HERE
sys.path.insert(0, str(ROOT))

try:
    import visualizer_worker as W
except SystemExit as e:                       # the module's own dep guard
    print("CANNOT RUN — %s" % e)
    sys.exit(1)
except ImportError as e:
    print("CANNOT RUN — cannot import visualizer_worker: %s" % e)
    sys.exit(1)

fails = []
checks = 0


def ok(name, cond, detail=""):
    global checks
    checks += 1
    if not cond:
        fails.append(name + ("  — " + str(detail) if detail else ""))


SRC = (ROOT / "visualizer_worker.py").read_text()

# ── 1. the guard exists, and sits AFTER every mode branch ────────────────────
# Order is the whole point: a guard placed above the branches would refuse the
# modes the worker does support.
i_regions = SRC.find('if selections.get("_regions")')
i_points = SRC.find('if selections.get("_points")')
i_guard = SRC.find('unknown_modes = sorted(')
# Anchored AFTER the dispatch, not file-wide: `storage_download(source_path)`
# appears in the mode branches too, and a bare .find() lands on one of those —
# it reported the ordinary path as sitting 11k characters BEFORE the guard.
i_download = SRC.find('source = storage_download(job["source_path"])', i_points)

ok("the _regions branch is present", i_regions > 0)
ok("the _points branch is present", i_points > 0)
ok("the stale-worker guard is present", i_guard > 0)
ok("the guard sits after both mode branches",
   i_guard > i_regions and i_guard > i_points,
   "guard %d, regions %d, points %d" % (i_guard, i_regions, i_points))
ok("the guard sits before the ordinary render path",
   0 < i_guard < i_download,
   "guard %d, download %d" % (i_guard, i_download))

# ── 2. every mode key the BROWSER can send is accounted for ─────────────────
# Read them out of the shipped page rather than listing them here, so a new
# mode cannot be added on one side only.
page = ROOT.parent / "visualizer" / "index.html"
if page.exists():
    sent = set(re.findall(r"selections:\s*\{\s*(_[a-z]+)\s*:", page.read_text()))
    sent |= set(re.findall(r"\{\s*(_[a-z]+)\s*:\s*true\s*\}", page.read_text()))
    ok("the browser's mode keys were found at all", bool(sent), sorted(sent))
    for k in sorted(sent):
        ok("mode %s is handled by a branch" % k,
           ('if selections.get("%s")' % k) in SRC,
           "no branch — it would reach the guard and fail as a stale worker")
else:                                                     # pragma: no cover
    ok("visualizer/index.html was found", False, str(page))

# ── 3. the message names the build and does not blame the photograph ────────
guard_txt = SRC[i_guard:i_download] if 0 < i_guard < i_download else ""
ok("the guard raises rather than continuing", "raise RuntimeError" in guard_txt)
ok("the guard names the worker build", "WORKER_BUILD" in guard_txt)
ok("the guard says what to do", "restart the worker" in guard_txt)
ok("the guard does not blame the photograph",
   "photograph" not in guard_txt and "elevation" not in guard_txt,
   "this is the exact wording that cost an hour")

# ── 4. a failed job carries the worker build ────────────────────────────────
# The success path has stamped achieved._worker since 823 on the rule that a
# null `achieved` means an old worker ran the row. That rule did not hold for
# failures, which is why four failed tap jobs could not be told apart from
# four jobs run by a stale worker.
fail_patch = SRC[SRC.find('"status": "failed"'):]
fail_patch = fail_patch[:fail_patch.find("except Exception")]
ok("the failure patch sets achieved", '"achieved"' in fail_patch, fail_patch[:200])
ok("the failure patch stamps the build", "WORKER_BUILD" in fail_patch)

# ── 5. the build string is a real one ───────────────────────────────────────
ok("WORKER_BUILD looks like a build stamp",
   bool(re.match(r"^wb-\d{4}-\d\d-\d\d\.\d+$", W.WORKER_BUILD)), W.WORKER_BUILD)

# ── report ──────────────────────────────────────────────────────────────────
if fails:
    print("\ntest_stale_worker — %d of %d FAILED" % (len(fails), checks))
    for f in fails:
        print("  - " + f)
    sys.exit(1)
print("\ntest_stale_worker — all %d checks pass" % checks)
