#!/usr/bin/env python3
"""
test_exclusive.py — a surface that gets subtracted away must SAY so.

    python3 test_exclusive.py [/path/to/other/spark]

WHY THIS TEST EXISTS

16 Aug, Theo ran the first restyle. FLUX Fill loaded, ran for 67 seconds, wrote
a 448 KB render — and the picture came back looking exactly like the
photograph. No error. Status `done`.

`mask_siding.png` was black but for about forty stray pixels.

`exclusive()` builds each surface by subtracting the more specific ones from
it: siding is "house wall" MINUS windows, trim, gutters and roof. Siding is
last in DETAIL_WINS, so it is subtracted by everything. When the other masks
are also box-shaped and cover most of the building, nothing survives — and
nothing anywhere said so. The only way to find it was to open a PNG by hand in
the Supabase dashboard.

That is the failure this pins, and it has three parts:

  1. exclusive() must MEASURE what the subtraction cost, per surface.
  2. It must name WHICH mask took the most, because "siding is empty" and
     "gutters ate siding" send you to two different places.
  3. skip_reason() must refuse an erased surface, so the job reports a skip
     instead of rendering a confident no-op.

Asserted on GEOMETRY with masks whose areas are known exactly, so the numbers
have a right answer rather than a plausible one.
"""

import io
import os
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
CONTROL = len(sys.argv) > 1
ROOT = Path(sys.argv[1]).resolve() if CONTROL else HERE
sys.path.insert(0, str(ROOT))

os.environ.setdefault("SUPABASE_URL", "https://example.invalid")
os.environ.setdefault("SUPABASE_SERVICE_KEY", "inert-placeholder-not-a-key")

try:
    from PIL import Image, ImageDraw
    import visualizer_worker as W
except SystemExit as e:
    print("CANNOT RUN — %s" % e); sys.exit(1)
except ImportError as e:
    print("CANNOT RUN — %s" % e); sys.exit(1)

fails, ran = [], 0


def ok(name, cond, detail=""):
    global ran
    ran += 1
    if not cond:
        fails.append(name + ("  — " + str(detail) if detail else ""))


SIZE = (200, 100)          # 20,000 px, so every percentage below is exact

# Every NEW symbol this file touches is read through a default, so a control
# tree reports a failure instead of an AttributeError. Three separate crashes
# tonight came from asserting on a name the older tree does not have.
FLOOR = getattr(W, "ANNIHILATED_PCT", None)
REASONS = getattr(W, "SKIP_REASON", {})


def mask(boxes):
    im = Image.new("L", SIZE, 0)
    d = ImageDraw.Draw(im)
    for b in boxes:
        d.rectangle(b, fill=255)
    buf = io.BytesIO(); im.save(buf, "PNG"); return buf.getvalue()


def lit(png):
    im = Image.open(io.BytesIO(png)).convert("L")
    return sum(im.point(lambda p: 255 if p >= 128 else 0).histogram()[128:])


# ── the shape that actually happened ────────────────────────────────────────
# "house wall" grounds as a box over the whole elevation; gutters is
# over-grounded and covers nearly the same box. Siding is last, so it loses.
wall = mask([(0, 0, 199, 99)])                 # the whole frame: 20,000 px
gutter_big = mask([(0, 0, 199, 95)])           # 19,200 px — almost all of it

# Guarded so a NEGATIVE CONTROL reports rather than raising. Against a tree
# where exclusive() still returns a bare dict, the unpack throws and tells you
# nothing about which contract broke — the third time that shape has come up
# tonight (830, 834), so it is handled up front here.
_res = W.exclusive({"siding": wall, "gutters": gutter_big})
_pair = isinstance(_res, tuple) and len(_res) == 2 and isinstance(_res[1], dict)
ok("exclusive returns (masks, report)", _pair,
   "got %s — this tree predates the claim report" % type(_res).__name__)
out, report = _res if _pair else (_res, {})

ok("exclusive returns a report as well as masks", isinstance(report, dict), str(type(report)))
ok("the erased surface is in the report", "siding" in report, str(sorted(report)))

r = report.get("siding") or {}
ok("it records what siding had BEFORE", abs(r.get("before_pct", 0) - 100.0) < 0.5,
   str(r.get("before_pct")))
ok("it records what survived", r.get("after_pct", 99) < 5.0, str(r.get("after_pct")))
ok("kept_pct is the ratio, not the frame share",
   r.get("kept_pct", 100) < 5.0, str(r.get("kept_pct")))
ok("it names the mask that took it", r.get("eaten_by") == "gutters", str(r.get("eaten_by")))
ok("and the mask really is nearly empty", lit(out["siding"]) < 0.05 * lit(wall),
   "%d lit of %d" % (lit(out["siding"]), lit(wall)))

# The claimant itself must NOT be reported as erased — it kept everything.
rg = report.get("gutters") or {}
ok("the surface that won is not reported as erased",
   rg.get("kept_pct", 0) >= 99.0, str(rg.get("kept_pct")))

# ── an ordinary elevation must NOT trip the guard ───────────────────────────
# Siding legitimately loses a chunk to windows. That is reconciliation working,
# and firing on it would make the warning noise nobody reads.
windows = mask([(10, 10, 39, 39), (60, 10, 89, 39)])     # 1,800 px of 20,000
_res2 = W.exclusive({"siding": wall, "windows": windows})
out2, report2 = _res2 if (isinstance(_res2, tuple) and len(_res2) == 2) else (_res2, {})
r2 = report2.get("siding") or {}
ok("a normal subtraction keeps most of the wall", r2.get("kept_pct", 0) > 80.0,
   str(r2.get("kept_pct")))
ok("a normal subtraction is above the annihilation floor",
   FLOOR is not None and r2.get("kept_pct", 0) >= FLOOR,
   "floor=%r kept=%r" % (FLOOR, r2.get("kept_pct")))

# ── skip_reason must refuse the erased surface ──────────────────────────────
def _why(surface, masks, claims):
    """skip_reason with the claims argument, or a marker on an older tree."""
    try:
        return W.skip_reason(surface, {"hex": "#4A5157"}, masks, True, claims)
    except TypeError:
        return "NO_CLAIMS_ARG"

ok("an erased surface is skipped, not rendered",
   _why("siding", out, report) == "erased", _why("siding", out, report))
ok("a healthy surface is still rendered",
   _why("siding", out2, report2) is None, str(_why("siding", out2, report2)))
ok("not_found still beats erased",
   _why("trim", out, report) == "not_found", str(_why("trim", out, report)))
ok("the erased reason has a sentence for a rep", "erased" in REASONS,
   str(sorted(REASONS)))
ok("that sentence reads as English, not an enum",
   len(REASONS.get("erased", "")) > 25 and
   "_" not in REASONS.get("erased", ""), REASONS.get("erased"))

# ── one mask is left alone ──────────────────────────────────────────────────
_res3 = W.exclusive({"siding": wall})
solo, solo_report = _res3 if (isinstance(_res3, tuple) and len(_res3) == 2) else (_res3, {})
ok("a single mask is returned untouched", lit(solo["siding"]) == lit(wall))
ok("and reports nothing to report", solo_report == {}, str(solo_report))

if fails:
    print("\ntest_exclusive — %d of %d FAILED" % (len(fails), ran))
    for f in fails:
        print("  - " + f)
    sys.exit(1)
print("\ntest_exclusive — all %d checks pass" % ran)
