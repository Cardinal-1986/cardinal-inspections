#!/usr/bin/env python3
"""
test_probe_planes.py — the graph surgery in probe_planes.py, without a GPU.

    python3 test_probe_planes.py

WHY

probe_planes.py exists to answer a question with a NUMBER ("did siding come
back as 1 object or 4?"), and every one of those numbers depends on graph
edits landing where they were aimed. An edit that silently misses produces a
confident wrong answer — "one object, splitting does not work" when the flag
was never actually set — and that answer would cancel a feature.

The parts that need a GPU are not tested here. The parts that decide what the
GPU is asked are, against the REAL segment_api.json rather than a fixture, so
a graph edited in the ComfyUI UI breaks this rather than the probe.
"""

import io
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

import os
os.environ.setdefault("SUPABASE_URL", "https://example.invalid")
os.environ.setdefault("SUPABASE_SERVICE_KEY", "inert-placeholder-not-a-key")

try:
    from PIL import Image
    import probe_planes as P
except SystemExit as e:
    print("CANNOT RUN — %s" % e); sys.exit(1)
except ImportError as e:
    print("CANNOT RUN — %s" % e); sys.exit(1)

fails = []
def ok(name, cond, detail=""):
    if not cond:
        fails.append(name + ("  — " + detail if detail else ""))

GRAPH = json.loads((HERE / "segment_api.json").read_text())
g = lambda: json.loads(json.dumps(GRAPH))

# ── surfaces come off the SaveImage titles ───────────────────────────────
found = P.surfaces_in(GRAPH)
ok("every surface is discovered", set(found) == {"roof", "siding", "windows", "gutters"},
   repr(sorted(found)))

# ── the flag lands on EVERY segmentation node ────────────────────────────
# One missed node is the failure that produces a wrong verdict quietly: the
# surface still returns one mask, and it looks like splitting does not work.
x = g()
n = P.set_split(x, True)
sam = [v for v in x.values() if v.get("class_type") == "Sam2Segmentation"]
ok("the flag is set on all four Sam2 nodes", n == len(sam) == 4, "n=%d sam=%d" % (n, len(sam)))
ok("and every one of them is actually True",
   all(v["inputs"]["individual_objects"] is True for v in sam))

x = g(); P.set_split(x, False)
ok("false is settable too (the control run)",
   all(v["inputs"]["individual_objects"] is False
       for v in x.values() if v.get("class_type") == "Sam2Segmentation"))

ok("the real graph ships with splitting OFF",
   all(v["inputs"]["individual_objects"] is False
       for v in GRAPH.values() if v.get("class_type") == "Sam2Segmentation"),
   "if this fails the shipped default changed and the worker takes images[0] only")

# ── phrases are retargeted by TITLE, not id ──────────────────────────────
x = g()
ok("a phrase lands", P.set_phrase(x, "siding", "wall section"))
hit = [v for v in x.values()
       if v.get("class_type") == "Florence2Run"
       and (v.get("_meta") or {}).get("title") == "find siding"]
ok("on the right node", hit and hit[0]["inputs"]["text_input"] == "wall section",
   repr(hit and hit[0]["inputs"]["text_input"]))
ok("and nothing else moved",
   [v["inputs"]["text_input"] for v in x.values()
    if v.get("class_type") == "Florence2Run"
    and (v.get("_meta") or {}).get("title") == "find roof"] == ["roof"])
ok("an unknown surface reports FALSE rather than silently doing nothing",
   P.set_phrase(g(), "chimney", "chimney") is False,
   "a silent miss means the probe reports a phrase it never sent")

# ── --only drops the outputs it was not asked for ────────────────────────
x = g()
dropped = P.drop_surfaces(x, ["siding"])
ok("--only drops the others", sorted(dropped) == ["gutters", "roof", "windows"],
   repr(sorted(dropped)))
ok("and keeps the one asked for", P.surfaces_in(x) == ["siding"], repr(P.surfaces_in(x)))
ok("dropping nothing is a no-op", P.drop_surfaces(g(), found) == [])

# ── mask stats ───────────────────────────────────────────────────────────
def png(draw):
    im = Image.new("L", (100, 100), 0)
    draw(im)
    b = io.BytesIO(); im.save(b, "PNG"); return b.getvalue()

def rect(im, x0, y0, x1, y1, v=255):
    from PIL import ImageDraw
    ImageDraw.Draw(im).rectangle([x0, y0, x1, y1], fill=v)

st = P.mask_stats(png(lambda im: rect(im, 0, 0, 49, 99)), (100, 100))
ok("coverage is a percentage of the FRAME", abs(st["pct"] - 50.0) < 1.5, "%.2f" % st["pct"])
ok("the bounding box is the lit region", st["box"] == (0, 0, 50, 100), repr(st["box"]))

st = P.mask_stats(png(lambda im: None), (100, 100))
ok("an empty mask is 0%, not a crash", st["pct"] == 0.0)
ok("an empty mask has no box", st["box"] is None)

# A soft edge must not inflate coverage — the threshold is why the merged and
# split numbers are comparable to each other at all.
st = P.mask_stats(png(lambda im: rect(im, 0, 0, 99, 99, 60)), (100, 100))
ok("a dim mask counts as UNLIT, not as full coverage", st["pct"] == 0.0,
   "%.2f — SAM 2 edges are soft; >0 would inflate every figure" % st["pct"])

# A mask at a different resolution than the photo must be rescaled, or every
# percentage is measured against the wrong denominator.
st = P.mask_stats(png(lambda im: rect(im, 0, 0, 99, 49)), (200, 200))
ok("a mask is resized to the frame before measuring",
   abs(st["pct"] - 50.0) < 2.0, "%.2f" % st["pct"])

# ── the sheet renders ────────────────────────────────────────────────────
import tempfile
photo = Image.new("RGB", (100, 100), (48, 48, 48))
layers = [P.mask_stats(png(lambda im: rect(im, 0, 0, 99, 49)), (100, 100)),
          P.mask_stats(png(lambda im: rect(im, 0, 60, 99, 99)), (100, 100))]
with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as f:
    out = f.name
P.sheet(photo, layers, out)
res = Image.open(out).convert("RGB")
top, mid, bot = res.getpixel((50, 20)), res.getpixel((50, 55)), res.getpixel((50, 80))
ok("the first plane is tinted", top != (48, 48, 48), repr(top))
ok("the second plane is tinted DIFFERENTLY", bot != (48, 48, 48) and bot != top,
   "%r vs %r — two planes must be tellable apart" % (top, bot))
ok("the gap between planes is untouched", mid == (48, 48, 48), repr(mid))
ok("there are enough distinct tints for a busy elevation", len(set(P.TINTS)) >= 6,
   str(len(set(P.TINTS))))

# ── the .env placeholders must NOT beat a real .env ──────────────────────
# THE REGRESSION THIS FILE EXISTS FOR, SECOND EDITION. probe_planes sets inert
# SUPABASE_* placeholders so it can import the worker without a database. The
# worker's own .env reader is `setdefault` BY DESIGN (an explicit export beats
# a stale file) — so placeholders set unconditionally win over the real .env,
# and --job dies with "needs real credentials" while sitting next to a perfectly
# good .env. That happened on the Spark on the first run.
#
# Run in a subprocess against a throwaway tree, because the import has already
# happened in this process and cannot be undone.
import subprocess, tempfile, shutil

# ⚠ The child MUST NOT inherit this process's SUPABASE_* — THIS FILE sets the
# same placeholders at the top, subprocess passes os.environ through, and the
# worker's setdefault then finds them already present. The first version of
# this test failed on the fixed code AND on the broken code, for that reason:
# an assertion that cannot pass is not a test, it is a stuck light. Strip them.
CLEAN = {k: v for k, v in os.environ.items() if not k.startswith("SUPABASE_")}

with tempfile.TemporaryDirectory() as td:
    for f in ("probe_planes.py", "visualizer_worker.py", "segment_api.json"):
        shutil.copy(HERE / f, Path(td) / f)
    (Path(td) / ".env").write_text(
        "SUPABASE_URL=https://real.example.test\n"
        "SUPABASE_SERVICE_KEY=a-real-looking-key\n")
    probe = ("import sys; sys.path.insert(0,%r); import probe_planes as P; "
             "import os; print(os.environ['SUPABASE_URL'], P.W.SERVICE_KEY)" % td)
    r = subprocess.run([sys.executable, "-c", probe], cwd=td, env=CLEAN,
                       capture_output=True, text=True)
    got = (r.stdout or "").strip()
    ok("a real .env beats the inert placeholders",
       "real.example.test" in got and "a-real-looking-key" in got,
       repr(got or r.stderr[-200:]))
    ok("and --job's own guard therefore passes",
       "inert-" not in got, repr(got))

# With NO .env the placeholders must still stand in, or the probe cannot be
# used on a local image away from the Spark.
with tempfile.TemporaryDirectory() as td:
    for f in ("probe_planes.py", "visualizer_worker.py", "segment_api.json"):
        shutil.copy(HERE / f, Path(td) / f)
    probe = ("import sys; sys.path.insert(0,%r); import probe_planes; "
             "import os; print(os.environ['SUPABASE_URL'])" % td)
    r = subprocess.run([sys.executable, "-c", probe], cwd=td, env=CLEAN,
                       capture_output=True, text=True)
    ok("with no .env the probe still imports",
       "example.invalid" in (r.stdout or ""), repr((r.stdout or r.stderr)[-200:]))

# ── report ───────────────────────────────────────────────────────────────
if fails:
    print("\ntest_probe_planes — %d FAILED" % len(fails))
    for f in fails:
        print("  - " + f)
    sys.exit(1)
print("\ntest_probe_planes — all 24 checks pass")
