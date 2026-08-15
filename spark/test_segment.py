#!/usr/bin/env python3
"""
test_segment.py — per-object masks must be combined, not silently dropped.

    python3 test_segment.py

WHY

`individual_objects: true` makes SAM 2 return one image PER OBJECT. Before
this, segment() took `images[0]` and discarded the rest — and the failure is
invisible: a roof whose second plane was found and then thrown away renders
EXACTLY like a roof whose second plane was never found. No error, no warning,
a plausible picture, and the wrong one.

That mattered from the moment the flag went on, which is why the union and the
flag land in the same commit.

Also pins the graph config the sheets actually verified, so a later edit in the
ComfyUI UI has to break a test rather than a render.
"""

import io
import json
import os
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

if not (HERE / ".env").exists():
    os.environ.setdefault("SUPABASE_URL", "https://example.invalid")
    os.environ.setdefault("SUPABASE_SERVICE_KEY", "inert-placeholder-not-a-key")

try:
    from PIL import Image, ImageDraw
    import visualizer_worker as W
except SystemExit as e:
    print("CANNOT RUN — %s" % e); sys.exit(1)
except ImportError as e:
    print("CANNOT RUN — %s" % e); sys.exit(1)

fails = []
ran = 0
def ok(name, cond, detail=""):
    global ran
    ran += 1
    if not cond:
        fails.append(name + ("  — " + detail if detail else ""))


def mask(boxes, size=(200, 100), fill=255):
    im = Image.new("L", size, 0)
    d = ImageDraw.Draw(im)
    for b in boxes:
        d.rectangle(b, fill=fill)
    b = io.BytesIO(); im.save(b, "PNG"); return b.getvalue()


def lit(png):
    im = Image.open(io.BytesIO(png)).convert("L")
    return sum(1 for p in list(im.getdata()) if p >= 128)


# ── the union ────────────────────────────────────────────────────────────
left  = mask([(0, 0, 79, 99)])          # 80 x 100
right = mask([(120, 0, 199, 99)])       # 80 x 100

u = W.union_masks([left, right])
ok("both planes survive the union", lit(u) == lit(left) + lit(right),
   "%d vs %d + %d" % (lit(u), lit(left), lit(right)))
ok("the union is still a PNG of the same size",
   Image.open(io.BytesIO(u)).size == (200, 100))

ok("a single mask passes through unchanged", lit(W.union_masks([left])) == lit(left))

# Overlap must not cancel. A paste would write the second mask's UNLIT pixels
# over the first mask's lit ones wherever they overlap — the union would then
# be smaller than one of its inputs, which is the worst possible failure here
# because it looks like the segmenter simply found less.
a = mask([(0, 0, 119, 99)])
b = mask([(80, 0, 199, 99)])
ov = W.union_masks([a, b])
ok("overlapping masks do not cancel", lit(ov) == 200 * 100,
   "%d of %d — a paste would have lost the overlap" % (lit(ov), 200 * 100))
ok("the union is never smaller than its largest input",
   lit(ov) >= max(lit(a), lit(b)))

# Soft edges must not be crushed. `lighter` keeps the higher value; an add
# would saturate to a hard fringe, which shows up as a rim of new colour
# along every roof edge.
soft = mask([(0, 0, 199, 99)], fill=90)
dim  = mask([(0, 0, 199, 99)], fill=40)
sm = Image.open(io.BytesIO(W.union_masks([soft, dim]))).convert("L")
ok("a soft edge keeps its value rather than saturating",
   sm.getpixel((100, 50)) == 90, str(sm.getpixel((100, 50))))

# A differently-sized mask must be resized, not crash or misalign.
small = mask([(0, 0, 49, 49)], size=(100, 50))
ok("a mismatched size is resized to the first",
   Image.open(io.BytesIO(W.union_masks([left, small]))).size == (200, 100))

# ⚠ SCOPED TO segment(), not the file. inpaint() has its own legitimate
# `comfy.fetch(images[0])` — one SaveImage, one image, always — and a
# file-wide check fails on correct code because of it. CLAUDE.md's "scope the
# assertion to the function, not the file", hit on the first run of this test.
_w = (HERE / "visualizer_worker.py").read_text()
_seg = _w[_w.index("\ndef segment("):]
_seg = _seg[:_seg.index("\ndef ", 1)]

ok("segment() no longer takes images[0]", "comfy.fetch(images[0])" not in _seg,
   "that is the silent-drop bug")
ok("segment() fetches every returned image", "for m in images" in _seg)
ok("and it says so when it unions", "came back as %d objects" in _seg)
ok("inpaint()'s single-image fetch is left alone",
   "comfy.fetch(images[0])" in _w,
   "one SaveImage, one image — changing it would be churn")

# ── the graph config the sheets verified ─────────────────────────────────
G = json.loads((HERE / "segment_api.json").read_text())

def node(title):
    for v in G.values():
        if ((v.get("_meta") or {}).get("title") or "").lower() == title:
            return v
    return None

ok("roof grounds on 'shingles'", (node("find roof") or {}).get("inputs", {}).get("text_input") == "shingles",
   "'roof' found the garage band only; the sheet showed 'shingles' finds both planes")
ok("roof returns per-object masks",
   (node("segment roof") or {}).get("inputs", {}).get("individual_objects") is True,
   "merged found the upper plane only")
ok("windows return per-object masks",
   (node("segment windows") or {}).get("inputs", {}).get("individual_objects") is True,
   "a house has many windows; one mask each, unioned, is the point")
ok("gutters return per-object masks",
   (node("segment gutters") or {}).get("inputs", {}).get("individual_objects") is True)

# Siding is deliberately NOT split: measured 12.6% merged vs 12.8% split, so
# there is nothing to gain, and it is corrected by subtraction once the roof
# mask is right. Changing it without evidence is what this file exists to stop.
ok("siding is left merged, on purpose",
   (node("segment siding") or {}).get("inputs", {}).get("individual_objects") is False,
   "no measurement supports splitting it")
# windows is PLURAL, and that is a sheet-backed change like the roof's:
#   "window"  + merged  -> 1 window   (0.1-0.2% of frame)
#   "window"  + split   -> 3 windows  (0.5%)
#   "windows" + split   -> 4 windows  (0.6%) — picks up the right gable one
# The singular wraps one cluster; SAM 2 was always doing its job inside the
# box it was given, and the BOX was the limit. Same shape as the roof.
ok("windows grounds on the plural", (node("find windows") or {}).get("inputs", {}).get("text_input") == "windows",
   "the singular found 3 of 5; the plural reaches the right gable window")

ok("the phrases with no sheet behind them are untouched",
   (node("find siding") or {}).get("inputs", {}).get("text_input") == "house wall" and
   (node("find gutters") or {}).get("inputs", {}).get("text_input") == "rain gutter",
   "guessing phrases produced 'roof of a house' = the whole building")


# ── regions: the auto-segmentation graph and the schema fill ─────────────
# Nothing here needs a GPU. What it guards is the class of mistake that cost
# the most today: a parameter name written from memory. fill_defaults() asks
# ComfyUI what the node takes, so the graph carries only wiring plus the two
# values we deliberately tune.
try:
    R = json.loads((HERE / "regions_api.json").read_text())
except Exception as _e:          # absent or unparseable -> a red, not a crash
    R = {}
    fails.append("regions_api.json is readable  — %s" % _e)

def rnode(title):
    for v in R.values():
        if ((v.get("_meta") or {}).get("title") or "").lower() == title:
            return v
    return None

ok("the regions graph loads the photo under the shared title",
   (rnode("cardinal_seg_image") or {}).get("class_type") == "LoadImage",
   "set_input() finds it by that title")
ok("it uses Sam2AutoSegmentation",
   (rnode("find every region") or {}).get("class_type") == "Sam2AutoSegmentation")
ok("it reuses the SAM2 model the other graph loads",
   (rnode("find every region") or {}).get("inputs", {}).get("sam2_model") is not None,
   "no new model download")
ok("no text prompt anywhere in the regions graph",
   not any(v.get("class_type") in ("Florence2Run", "CLIPTextEncode") for v in R.values()),
   "the whole point is that no phrase is involved")
ok("points_per_side is tuned down from the default 32",
   (rnode("find every region") or {}).get("inputs", {}).get("points_per_side") == 16,
   "32 returns hundreds of regions and a picker with hundreds of choices is not one")
ok("the output is titled for the worker to find",
   (rnode("cardinal_regions") or {}).get("class_type") == "SaveImage")

# ⚠ ONLY confirmed parameters. Everything else comes from the node's schema at
# submit time. If this list grows, someone typed a name from memory again.
_auto = (rnode("find every region") or {}).get("inputs", {})
ok("the graph names no unconfirmed parameters",
   set(_auto) <= {"sam2_model", "image", "points_per_side", "pred_iou_thresh"},
   "unexpected: %s" % sorted(set(_auto) - {"sam2_model", "image", "points_per_side", "pred_iou_thresh"}))

# fill_defaults, against a stubbed schema — no ComfyUI needed.
class _FakeComfy(W.Comfy):
    def __init__(self, schema):
        self.base = "http://stub"
        self._schema_cache = {"Sam2AutoSegmentation": schema}

_schema = {"input": {"required": {
    "sam2_model": ["SAM2MODEL"],                      # a LINK — must NOT be filled
    "image": ["IMAGE"],                               # a LINK
    "points_per_side": ["INT", {"default": 32}],      # already set — must NOT move
    "points_per_batch": ["INT", {"default": 64}],     # missing — fill
    "use_m2m": ["BOOLEAN", {"default": False}],       # missing — fill
    "mode": [["a", "b"], {}],                         # an enum with no default
}}}
_g = json.loads(json.dumps(R))
_added = _FakeComfy(_schema).fill_defaults(_g, "Sam2AutoSegmentation")
_ins = (rnode("find every region") and [v for v in _g.values()
        if ((v.get("_meta") or {}).get("title") or "") == "find every region"][0]["inputs"])

ok("a missing widget input is filled from the node's default",
   _ins.get("points_per_batch") == 64 and _ins.get("use_m2m") is False,
   repr({k: _ins.get(k) for k in ("points_per_batch", "use_m2m")}))
ok("an enum with no default takes its first choice", _ins.get("mode") == "a")
ok("a value already in the graph is NEVER overwritten",
   _ins.get("points_per_side") == 16,
   "the two tuned values must survive the fill")
ok("a LINK input is left to the graph",
   isinstance(_ins.get("sam2_model"), list) and isinstance(_ins.get("image"), list),
   "inventing a value for an IMAGE input is worse than the error you get without")
ok("it reports what it filled", sorted(_added) == ["mode", "points_per_batch", "use_m2m"],
   repr(sorted(_added)))

# An unreadable schema must fill NOTHING rather than everything.
ok("an empty schema fills nothing",
   _FakeComfy({}).fill_defaults(json.loads(json.dumps(R)), "Sam2AutoSegmentation") == [])

# ── the render path honours hand-picked regions ──────────────────────────
_rj = _w[_w.index("\ndef run_job("):]
_branch, _dl = 'selections.get("_regions")', "storage_download"
ok("a _regions job branches before any download",
   _branch in _rj and _dl in _rj and _rj.index(_branch) < _rj.index(_dl),
   "segmenting a photo for a job that wants no render is wasted GPU")
ok("hand-picked regions override the segmenter", '"_regions"' in _rj and "picked" in _rj)
ok("segmentation is skipped when every surface was labelled",
   "skipping segmentation" in _rj,
   "a Florence2 + SAM 2 load for nothing")
_apply = "for surface, paths in picked.items()"
_excl  = "masks = exclusive(masks)"
ok("the hand-picked override exists", _apply in _rj)
ok("hand-picked masks still go through exclusive()",
   _apply in _rj and _excl in _rj and _rj.index(_apply) < _rj.index(_excl),
   "one reconciliation path, not two")

# ── report ───────────────────────────────────────────────────────────────
# MUST BE THE LAST THING IN THIS FILE. See the note in the commit that moved
# it: assertions appended below a report are assertions nobody reads.
if fails:
    print("\ntest_segment — %d of %d FAILED" % (len(fails), ran))
    for f in fails:
        print("  - " + f)
    sys.exit(1)
print("\ntest_segment — all %d checks pass" % ran)
