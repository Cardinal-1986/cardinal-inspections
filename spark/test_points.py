#!/usr/bin/env python3
"""
test_points.py — a tap must land where the finger did.

    python3 test_points.py

WHY

The automatic pass failed for a structural reason: SAM 2's automatic mode is
class-agnostic, and this worker keeps the biggest regions by area, so in a real
photograph it proposes the lawn, the canopy and the driveway. A tap supplies
the semantics. Which means the ONE thing this pass must never get wrong is
where the tap was — a mask that is correct but forty pixels off is worse than
no mask, because it looks deliberate.

Three failure modes this pins, all of them silent:

  1. COORDINATE SPACE. The browser sends 0..1 because it cannot know the size
     the worker fitted the photograph to. If the scaling is dropped, SAM 2 is
     handed {x:0, y:0} — the top-left corner — and returns a mask of the sky
     for every tap. Plausible picture, wrong one.

  2. THE `segmentor` ENUM. wb-2026-08-15.8 set the regions graph to
     `automaskgenerator`; this graph must stay `single_image`, because
     Sam2Segmentation needs the plain predictor. The two graphs disagree ON
     PURPOSE and a later "fix" that makes them agree breaks this pass.

  3. AN EMPTY MASK. SAM 2 answers a point on a boundary with nothing lit. That
     must surface as a sentence a rep can act on, not as a stored black PNG
     that renders as "this surface did not change".

Runs against the SHIPPED function — no re-implementation. ComfyUI and Supabase
are faked at their seams; fit_for_flux, the scaling and the measurement are the
real ones.
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
    from PIL import Image
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


def png_of(im):
    b = io.BytesIO(); im.save(b, format="PNG"); return b.getvalue()


def photo(size=(1600, 900)):
    return png_of(Image.new("RGB", size, (90, 110, 130)))


def maskpng(size, box=None):
    """A mask with `box` lit, or nothing lit when box is None."""
    im = Image.new("L", size, 0)
    if box:
        for x in range(box[0], box[2]):
            for y in range(box[1], box[3]):
                im.putpixel((x, y), 255)
    return png_of(im)


class FakeComfy(object):
    """Records the graph it was handed; answers with one mask."""
    def __init__(self, mask_bytes, mask_size):
        self.graph = None
        self.uploaded = None
        self.filled_for = []
        self._mask = mask_bytes
        self._size = mask_size

    def fill_defaults(self, graph, cls):
        self.filled_for.append(cls)
        return []

    def upload_image(self, name, data):
        self.uploaded = (name, len(data))
        return name

    def run(self, graph, timeout=None):
        self.graph = json.loads(json.dumps(graph))   # snapshot, not a live ref
        return "pid-1"

    def outputs(self, pid):
        return {"12": {"images": [{"filename": "m.png"}]}}

    def fetch(self, meta):
        return self._mask


def harness(points, mask_box="auto", photo_size=(1600, 900)):
    """Run the shipped run_points_job against fakes. Returns (patch, comfy)."""
    seen = {}
    stored = {}

    fitted, _was, now = W.fit_for_flux(W.to_png(photo(photo_size)))
    if mask_box == "auto":
        mask_box = (10, 10, now[0] // 2, now[1] // 2)
    mb = maskpng(now, mask_box)

    comfy = FakeComfy(mb, now)

    orig = (W.storage_download, W.storage_upload, W.patch_job)
    W.storage_download = lambda p: photo(photo_size)
    W.storage_upload = lambda p, d, ct="image/jpeg": stored.setdefault(p, len(d))
    W.patch_job = lambda jid, patch: seen.update(patch)
    try:
        job = {"id": "job-abc", "source_path": "visualizer/src/x.jpg",
               "selections": {"_points": points}}
        err = None
        try:
            # A real start time, so the duration this logs is a duration.
            W.run_points_job(comfy, job, "job-abc", __import__("time").time())
        except Exception as e:            # noqa: BLE001 - the test inspects it
            err = e
    finally:
        W.storage_download, W.storage_upload, W.patch_job = orig
    return seen, comfy, stored, err, now


def coords_of(comfy):
    return json.loads(comfy.graph["10"]["inputs"]["coordinates_positive"])


# ── 1. the graph on disk ────────────────────────────────────────────────────
g = json.loads((HERE / "points_api.json").read_text())
ok("graph: node 3 is the SAM2 loader",
   g["3"]["class_type"] == "DownloadAndLoadSAM2Model")
ok("graph: segmentor is single_image, NOT automaskgenerator",
   g["3"]["inputs"]["segmentor"] == "single_image",
   "got %r — see wb-2026-08-15.8; the two graphs differ on purpose"
   % g["3"]["inputs"].get("segmentor"))
ok("graph: the prompted node is Sam2Segmentation",
   g["10"]["class_type"] == "Sam2Segmentation")
ok("graph: it is titled CARDINAL_POINTS so set_input can find it",
   g["10"]["_meta"]["title"] == "CARDINAL_POINTS")
ok("graph: it carries coordinates_positive",
   "coordinates_positive" in g["10"]["inputs"])
ok("graph: the save node keeps the CARDINAL_REGIONS title",
   g["12"]["_meta"]["title"] == "CARDINAL_REGIONS",
   "the output finder matches on this exact title")
ok("graph: the loader image node is the one T_SEG_IN names",
   g["1"]["_meta"]["title"] == W.T_SEG_IN)

# ── 2. coordinate space ─────────────────────────────────────────────────────
patch, comfy, stored, err, frame = harness([{"x": 0.5, "y": 0.5}])
ok("centre tap: no error", err is None, repr(err))
c = coords_of(comfy)
ok("centre tap: one coordinate sent", len(c) == 1, repr(c))
ok("centre tap: x is half the FITTED width, not 0.5",
   abs(c[0]["x"] - frame[0] / 2.0) <= 1,
   "sent %r for a %dx%d frame" % (c[0], frame[0], frame[1]))
ok("centre tap: y is half the fitted height",
   abs(c[0]["y"] - frame[1] / 2.0) <= 1, repr(c[0]))
ok("centre tap: coordinates are ints, as the node's JSON expects",
   isinstance(c[0]["x"], int) and isinstance(c[0]["y"], int), repr(c[0]))

patch, comfy, _s, err, frame = harness([{"x": 0.25, "y": 0.75}])
c = coords_of(comfy)
ok("quarter tap: x tracks the ratio",
   abs(c[0]["x"] - frame[0] * 0.25) <= 1, repr(c[0]))
ok("quarter tap: y tracks the ratio",
   abs(c[0]["y"] - frame[1] * 0.75) <= 1, repr(c[0]))

# A different source size must not move the tap: the ratio is the contract.
_p, comfy_a, _s, _e, fa = harness([{"x": 0.5, "y": 0.5}], photo_size=(1600, 900))
_p, comfy_b, _s, _e, fb = harness([{"x": 0.5, "y": 0.5}], photo_size=(3840, 2160))
ra = coords_of(comfy_a)[0]["x"] / float(fa[0])
rb = coords_of(comfy_b)[0]["x"] / float(fb[0])
ok("the ratio survives a different source size",
   abs(ra - rb) < 0.01, "%.3f vs %.3f" % (ra, rb))

# ── 3. clamping ─────────────────────────────────────────────────────────────
patch, comfy, _s, err, frame = harness([{"x": 0.0, "y": 0.0}])
c = coords_of(comfy)
ok("corner tap: never lands on 0, which SAM 2 answers with nothing",
   c[0]["x"] >= 1 and c[0]["y"] >= 1, repr(c[0]))
patch, comfy, _s, err, frame = harness([{"x": 1.0, "y": 1.0}])
c = coords_of(comfy)
ok("far corner: stays inside the frame",
   c[0]["x"] <= frame[0] - 1 and c[0]["y"] <= frame[1] - 1,
   "%r for %r" % (c[0], frame))
patch, comfy, _s, err, frame = harness([{"x": 4.2, "y": -3.0}])
c = coords_of(comfy)
ok("out-of-range normalised values are clamped, not wrapped",
   1 <= c[0]["x"] <= frame[0] - 1 and 1 <= c[0]["y"] <= frame[1] - 1, repr(c[0]))

# ── 4. the point list ───────────────────────────────────────────────────────
patch, comfy, _s, err, _f = harness([{"x": 0.4, "y": 0.4}, {"x": 0.6, "y": 0.6}])
ok("two taps travel as two coordinates", len(coords_of(comfy)) == 2)
patch, comfy, _s, err, _f = harness(
    [{"x": 0.5, "y": 0.5}] * (W.POINTS_MAX + 5))
ok("POINTS_MAX caps the list", len(coords_of(comfy)) == W.POINTS_MAX,
   "got %d" % len(coords_of(comfy)))
patch, comfy, _s, err, _f = harness(
    [{"x": 0.5, "y": 0.5}, "nonsense", {"y": 0.2}, None])
ok("malformed entries are dropped, not crashed on",
   err is None and len(coords_of(comfy)) == 1, repr(err))
_p, _c, _s, err, _f = harness([])
ok("no tap at all is an error, not an empty render",
   err is not None and "no tap" in str(err).lower(), repr(err))

# ── 5. a single tap is a single object ──────────────────────────────────────
patch, comfy, _s, err, _f = harness([{"x": 0.5, "y": 0.5}])
ok("individual_objects stays off — one tap is one surface",
   comfy.graph["10"]["inputs"].get("individual_objects") is False,
   repr(comfy.graph["10"]["inputs"].get("individual_objects")))
ok("the node schema is consulted for Sam2Segmentation",
   "Sam2Segmentation" in comfy.filled_for, repr(comfy.filled_for))
ok("the fitted photograph is what gets uploaded",
   comfy.uploaded and comfy.uploaded[0] == "cardinal_points.png",
   repr(comfy.uploaded))
ok("the graph handed to ComfyUI still says single_image",
   comfy.graph["3"]["inputs"]["segmentor"] == "single_image",
   "force_automask must never be called on this graph")

# ── 6. what it stores ───────────────────────────────────────────────────────
patch, comfy, stored, err, frame = harness([{"x": 0.5, "y": 0.5}])
ok("stored under the SAME name a regions job uses",
   "visualizer/job-abc/region_01.png" in stored, repr(list(stored)))
ok("status is done", patch.get("status") == "done", repr(patch.get("status")))
m = (patch.get("masks") or {}).get("r01") or {}
ok("masks.r01 carries a path", m.get("path", "").endswith("region_01.png"), repr(m))
ok("masks.r01 carries a box the picker can centre a circle on",
   isinstance(m.get("box"), list) and len(m["box"]) == 4, repr(m.get("box")))
ok("masks.r01 carries pct", isinstance(m.get("pct"), float), repr(m.get("pct")))
ok("the box is in the FITTED frame, not the source",
   m.get("box") and m["box"][2] <= frame[0] and m["box"][3] <= frame[1],
   "%r vs frame %r" % (m.get("box"), frame))
ok("achieved records the worker build",
   (patch.get("achieved") or {}).get("_worker", "").startswith(W.WORKER_BUILD),
   repr(patch.get("achieved")))
ok("achieved records how many taps",
   (patch.get("achieved") or {}).get("_points") == 1, repr(patch.get("achieved")))
ok("no render_path — this made a mask, not a picture",
   "render_path" not in patch, repr(list(patch)))

# ── 7. an empty mask is a sentence, not a black PNG ─────────────────────────
patch, comfy, stored, err, _f = harness([{"x": 0.5, "y": 0.5}], mask_box=None)
ok("an empty mask raises", err is not None, "it stored %r instead" % list(stored))
ok("…and says something a rep can act on",
   err is not None and "nothing at that spot" in str(err).lower(), repr(err))
ok("…and stores no black PNG", not stored, repr(list(stored)))

# ── 8. dispatch ─────────────────────────────────────────────────────────────
src = (HERE / "visualizer_worker.py").read_text()
ok("run_job routes _points to run_points_job",
   'if selections.get("_points"):' in src and
   src.index('if selections.get("_points"):') < src.index("def take_lock"))
ok("run_points_job is defined exactly once",
   src.count("def run_points_job(") == 1, str(src.count("def run_points_job(")))
ok("the regions route is untouched",
   src.count('if selections.get("_regions"):') == 1)
ok("force_automask is not called in the points path",
   "force_automask" not in src[src.index("def run_points_job("):
                               src.index("def run_job(")])

print("test_points — %d/%d pass" % (ran - len(fails), ran))
for f in fails:
    print("  FAIL  " + f)
sys.exit(1 if fails else 0)
