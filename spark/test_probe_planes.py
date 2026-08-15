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

# This used to assert the graph ships with splitting OFF everywhere, guarding
# the fact that segment() took images[0] and would silently drop the rest.
# That premise died when segment() learned to union, and the assertion then
# failed on correct code — a snapshot of yesterday's config masquerading as an
# invariant. The real invariant is the PAIRING: any split node at all means
# segment() must combine what comes back.
_split_on = [v for v in GRAPH.values()
             if v.get("class_type") == "Sam2Segmentation"
             and v["inputs"].get("individual_objects") is True]
#
# ⚠ And it must look at the CALL, inside segment() — not at the file. The
# first version matched "union_masks(pngs)", which is also the text of
# `def union_masks(pngs):`, so deleting the call left the assertion green.
# Definition-pollution, in the assertion written to replace a bad one.
_worker_src = (HERE / "visualizer_worker.py").read_text()
_seg_src = _worker_src[_worker_src.index("\ndef segment("):]
_seg_src = _seg_src[:_seg_src.index("\ndef ", 1)]
ok("if any node is split, segment() unions",
   not _split_on or "union_masks(" in _seg_src,
   "%d split node(s) and no union CALL in segment() — every extra object is "
   "discarded silently" % len(_split_on))

# ── phrases are retargeted by TITLE, not id ──────────────────────────────
x = g()
ok("a phrase lands", P.set_phrase(x, "siding", "wall section"))
hit = [v for v in x.values()
       if v.get("class_type") == "Florence2Run"
       and (v.get("_meta") or {}).get("title") == "find siding"]
ok("on the right node", hit and hit[0]["inputs"]["text_input"] == "wall section",
   repr(hit and hit[0]["inputs"]["text_input"]))
# Compared against the graph's OWN current value, not a literal. Hardcoding
# "roof" here meant this went red the moment the shipped phrase became
# "shingles" — the test asserting a snapshot instead of the behaviour it cares
# about, which is only that set_phrase(siding) leaves the roof node alone.
_roof_now = [v["inputs"]["text_input"] for v in GRAPH.values()
             if v.get("class_type") == "Florence2Run"
             and (v.get("_meta") or {}).get("title") == "find roof"]
ok("and nothing else moved",
   [v["inputs"]["text_input"] for v in x.values()
    if v.get("class_type") == "Florence2Run"
    and (v.get("_meta") or {}).get("title") == "find roof"] == _roof_now,
   "set_phrase must touch exactly one node")
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

# ── --upload composes a URL a browser can actually open ──────────────────
# The storage API returns a PATH ("/object/sign/photos/…?token=…"), not a URL.
# Returning it bare gives a link that 404s with no clue why — and the only
# place that would surface is Theo's browser at 3am. Mocked end to end so the
# composition is verified rather than assumed.
class _FakeResp:
    def __init__(self, payload): self._p = payload
    def raise_for_status(self): pass
    def json(self): return self._p

class _FakeRequests:
    def __init__(self, payload): self.payload = payload; self.calls = []
    def post(self, url, **kw):
        self.calls.append((url, kw))
        return _FakeResp(self.payload)

import types
_up_png = png(lambda im: rect(im, 0, 0, 99, 99))
with tempfile.TemporaryDirectory() as td:
    _f = Path(td) / "sheet.png"
    _f.write_bytes(_up_png)

    _fake = _FakeRequests({"signedURL": "/object/sign/photos/visualizer/probe/x/sheet.png?token=abc"})
    _sent = {}
    _real_upload = P.W.storage_upload
    P.W.storage_upload = lambda path, data, ct="image/jpeg": _sent.update(
        path=path, n=len(data), ct=ct) or path
    _real_url, _real_key = P.W.SUPABASE_URL, P.W.SERVICE_KEY
    P.W.SUPABASE_URL, P.W.SERVICE_KEY = "https://ref.supabase.co", "svc"
    sys.modules["requests"] = types.SimpleNamespace(post=_fake.post)
    try:
        url = P.upload_sheet(_f, "visualizer/probe/x/sheet.png")
    finally:
        P.W.storage_upload = _real_upload
        P.W.SUPABASE_URL, P.W.SERVICE_KEY = _real_url, _real_key
        sys.modules.pop("requests", None)

    ok("the signed link is absolute, not a bare path",
       url.startswith("https://ref.supabase.co/storage/v1/object/sign/"), url)
    ok("it keeps the token", "token=abc" in url, url)
    ok("no doubled /storage/v1", url.count("/storage/v1") == 1, url)
    ok("the sheet bytes were actually uploaded", _sent.get("n") == len(_up_png),
       repr(_sent))
    ok("uploaded as a PNG, not the default jpeg", _sent.get("ct") == "image/png",
       repr(_sent.get("ct")))
    ok("it lands under visualizer/probe/ so the sweeper cleans it",
       _sent.get("path", "").startswith("visualizer/probe/"), repr(_sent.get("path")))

ok("--upload is opt-in, not the default",
   "upload = False" in (HERE / "probe_planes.py").read_text(),
   "a probe that writes by default is not a probe")
ok("missing credentials are caught BEFORE the GPU runs",
   "--upload needs real credentials" in (HERE / "probe_planes.py").read_text(),
   "finding out after two model loads is a bad way to find out")
ok("an upload failure does not lose the run",
   "upload failed for" in (HERE / "probe_planes.py").read_text(),
   "the counts are already printed and the sheet is already on disk")

# ── fit_for_flux returns THREE values ────────────────────────────────────
# Called with one target it raises "a bytes-like object is required, not
# 'tuple'" several lines later, pointing at Image.open rather than at the
# guess. Asserted against the SHIPPED worker, so a change to its return shape
# breaks this rather than the probe on Theo's box.
_p = png(lambda im: rect(im, 0, 0, 99, 99))
_r = P.W.fit_for_flux(_p)
ok("fit_for_flux returns (png, was, now)",
   isinstance(_r, tuple) and len(_r) == 3, "len=%s" % (len(_r) if isinstance(_r, tuple) else "?"))
ok("its first element is the image bytes", isinstance(_r[0], (bytes, bytearray)))
ok("and the probe unpacks all three",
   "fitted, was, now = W.fit_for_flux(raw)" in (HERE / "probe_planes.py").read_text())

# ── --job must never filter a UUID column with `like` ────────────────────
# Confirmed against the real database:
#   ERROR 42883: operator does not exist: uuid ~~ unknown
# PostgREST maps 42883 to **404 Not Found**, so this reads as a missing table
# or a dead key and sends you to check the wrong three things. It did.
src = (HERE / "probe_planes.py").read_text()
ok("no `like` filter on the uuid id column",
   '"id": "like.' not in src and "'id': 'like." not in src,
   "uuid has no ~~ operator; PostgREST reports it as 404")
ok("a full uuid is matched with eq", '"id": "eq." + jid' in src)
ok("a prefix is matched client-side", ".startswith(jid.lower())" in src)

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
print("\ntest_probe_planes — all 39 checks pass")
