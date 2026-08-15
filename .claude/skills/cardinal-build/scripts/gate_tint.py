#!/usr/bin/env python3
"""gate_tint — the swatch actually reaches the pixels, and the shading survives.

The Spark cannot be reached from a build session, so the end-to-end render is
Theo's eyes and nobody else's. But the part that FAILED is not the diffusion —
it is that the chosen colour never entered the image at all. That part is pure
arithmetic on pixels, and arithmetic can be tested here.

What this guards, in order of what it already cost:

  1. THE SWATCH REACHES THE PIXELS. A render of "Evergreen Mist" came back tan
     because denoise=1 rebuilt the masked region from noise and the only steer
     was a text prompt a distilled model at cfg 1 largely ignores. The tint is
     the fix; a tint that does not move the hue is no fix at all.

  2. IT ONLY TOUCHES THE MASK. Recolouring outside the mask would repaint the
     lawn, the neighbour's house and the sky. This is the one that would be
     obvious in a screenshot and invisible in a unit test that only samples
     the middle of the roof.

  3. LUMINANCE IS PRESERVED. A flat fill destroys the shading that makes a
     render believable — the plane shading, the tree shadow, the course lines.
     Keep L, replace a/b. If shading is lost the render reads as a sticker.

  4. IT NEVER THROWS ON REAL-WORLD JUNK. A missing hex, a 3-digit hex, a mask
     at a different size — the worker must carry on, because a job that dies
     on a malformed swatch is worse than one that renders in the wrong colour.

    python3 gate_tint.py
    python3 gate_tint.py <a previous visualizer_worker.py>    # control -> RED

A gate that has never been seen to go red proves nothing, so it takes a path
like every other harness here. Against the worker as it stood before this
change it must fail — that version has no tint() at all, and the whole claim
is that its absence is the bug.
"""
import importlib.util
import io
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
SPARK = ROOT / "spark"
WORKER = Path(sys.argv[1]) if len(sys.argv) > 1 else (SPARK / "visualizer_worker.py")

os.environ.setdefault("SUPABASE_URL", "http://tint.invalid")
os.environ.setdefault("SUPABASE_SERVICE_KEY", "gate-not-a-key")

try:
    from PIL import Image
except ImportError:
    sys.exit("gate_tint needs Pillow: pip install Pillow")

CHECKS = []
def chk(name, ok, detail=""):
    CHECKS.append((name, bool(ok), str(detail)))

spec = importlib.util.spec_from_file_location("vw", WORKER)
vw = importlib.util.module_from_spec(spec)
spec.loader.exec_module(vw)

# ⚠ A control must REPORT red, never crash. BUG_CLASSES 37 struck five times in
# one session by letting a missing symbol take the process down before it
# printed a line — a run that dies having said nothing is indistinguishable
# from a run that passed.
if not hasattr(vw, "tint") or not hasattr(vw, "_hex_rgb"):
    print("  FAIL  the worker has no tint() — the swatch never reaches the pixels, "
          "so a chosen colour rests entirely on a prompt a distilled model ignores")
    print("RED — no tint in %s" % WORKER)
    sys.exit(1)


def png(im):
    b = io.BytesIO()
    im.save(b, format="PNG")
    return b.getvalue()


def open_png(data):
    return Image.open(io.BytesIO(data)).convert("RGB")


# ── a synthetic "photograph": a TAN roof with real shading, on green grass ──
# Tan, because tan is exactly what the broken pipeline produced.
W, H = 200, 120
img = Image.new("RGB", (W, H), (60, 140, 60))          # grass everywhere
px = img.load()
for y in range(0, 60):                                  # top half is the roof
    for x in range(W):
        # A gradient across the plane plus a dark band: the shading a flat
        # fill would destroy.
        shade = 0.55 + 0.45 * (x / (W - 1))
        if 20 <= y <= 28:
            shade *= 0.45                               # a tree shadow
        px[x, y] = (int(198 * shade), int(166 * shade), int(122 * shade))

mask = Image.new("L", (W, H), 0)
for y in range(0, 60):
    for x in range(W):
        mask.putpixel((x, y), 255)

SRC, MSK = png(img), png(mask)
GREEN = "#6E7A69"          # Evergreen Mist, the real value off oc_colors


def mean_rgb(im, box):
    x0, y0, x1, y1 = box
    n = 0
    r = g = b = 0
    p = im.load()
    for y in range(y0, y1):
        for x in range(x0, x1):
            pr, pg, pb = p[x, y]
            r += pr; g += pg; b += pb; n += 1
    return (r / n, g / n, b / n)


# ── 1. the swatch reaches the pixels ──────────────────────────────────────
out = open_png(vw.tint(SRC, MSK, GREEN, strength=1.0))
before = mean_rgb(img, (0, 0, W, 60))
after  = mean_rgb(out, (0, 0, W, 60))

# tan has R > G > B; the target is a muted green, G highest.
chk("the source really is TAN to begin with (not a vacuous pass)",
    before[0] > before[1] > before[2],
    "rgb(%.0f,%.0f,%.0f)" % before)
chk("⚠ after tinting the roof reads GREEN — the swatch reached the pixels",
    after[1] > after[0] and after[1] > after[2],
    "rgb(%.0f,%.0f,%.0f)" % after)

# and it is the RIGHT green, not just any
tgt = vw._hex_rgb(GREEN)
drift = max(abs(after[i] - tgt[i]) for i in range(3))
chk("and it is the swatch's own hue, not merely 'some green'",
    drift < 42, "mean rgb(%.0f,%.0f,%.0f) vs swatch rgb%s" % (after + (tgt,)))

# ── 2. it touches ONLY the mask ───────────────────────────────────────────
grass_before = mean_rgb(img, (0, 70, W, H))
grass_after  = mean_rgb(out, (0, 70, W, H))
chk("⚠ nothing outside the mask moves — the lawn is untouched",
    max(abs(grass_before[i] - grass_after[i]) for i in range(3)) < 0.5,
    "%s -> %s" % (tuple(round(v) for v in grass_before), tuple(round(v) for v in grass_after)))

# ── 3. the shading survives ───────────────────────────────────────────────
# The tree-shadow band must still be materially darker than the plane above it.
def luma(t):
    return 0.2126 * t[0] + 0.7152 * t[1] + 0.0722 * t[2]

shadow_b = luma(mean_rgb(img, (0, 21, W, 28)))
plane_b  = luma(mean_rgb(img, (0, 5,  W, 15)))
shadow_a = luma(mean_rgb(out, (0, 21, W, 28)))
plane_a  = luma(mean_rgb(out, (0, 5,  W, 15)))
chk("⚠ the tree shadow is still there after tinting (a flat fill would erase it)",
    shadow_a < plane_a * 0.75,
    "shadow %.0f vs plane %.0f" % (shadow_a, plane_a))
chk("and the shading has roughly its original depth, not a token amount",
    abs((shadow_a / plane_a) - (shadow_b / plane_b)) < 0.18,
    "ratio %.2f before, %.2f after" % (shadow_b / plane_b, shadow_a / plane_a))

# the left-to-right gradient across the plane must survive too
l_a = luma(mean_rgb(out, (0, 40, 30, 55)))
r_a = luma(mean_rgb(out, (W - 30, 40, W, 55)))
chk("the plane still gets lighter across its width — geometry is not flattened",
    r_a > l_a * 1.25, "left %.0f, right %.0f" % (l_a, r_a))

# ── 4. CONTROL: strength 0 must change nothing at all ─────────────────────
zero = open_png(vw.tint(SRC, MSK, GREEN, strength=0.0))
chk("CONTROL: strength 0 is a no-op, so the effect above is the TINT and not "
    "an artefact of re-encoding",
    mean_rgb(zero, (0, 0, W, 60)) == before,
    "%s" % (tuple(round(v) for v in mean_rgb(zero, (0, 0, W, 60))),))

# ── 5. it never throws on real-world junk ─────────────────────────────────
for label, val in [("no hex at all", None), ("empty string", ""),
                   ("a 3-digit hex", "#6a7"), ("junk", "not-a-colour"),
                   ("a name rather than a hex", "green")]:
    try:
        r = vw.tint(SRC, MSK, val)
        ok = isinstance(r, (bytes, bytearray)) and len(r) > 0
    except Exception as e:
        ok = False
        r = str(e)
    chk("survives %s without throwing (a job must never die on a bad swatch)" % label, ok)

# a 3-digit hex must actually EXPAND, not silently no-op
three = open_png(vw.tint(SRC, MSK, "#6a7", strength=1.0))
chk("a 3-digit hex is expanded and applied, not quietly ignored",
    mean_rgb(three, (0, 0, W, 60)) != before)

# a mask at a different size is resized rather than raising
small = Image.new("L", (W // 2, H // 2), 255)
try:
    r = vw.tint(SRC, png(small), GREEN)
    ok = len(r) > 0
except Exception as e:
    ok = False
    r = str(e)
chk("a mask at a different resolution is resized, not thrown on", ok)

# ── 6. the denoise change is real and wired ───────────────────────────────
src = WORKER.read_text()
chk("denoise is set on the sampler at run time, not left at the graph's 1",
    'set_input(graph, T_SAMPLER, "denoise", FLUX_DENOISE)' in src)
chk("⚠ denoise is BELOW 1 — at 1 the region is rebuilt from noise and the "
    "tint is thrown away, which is the whole bug",
    vw.FLUX_DENOISE < 1.0, "FLUX_DENOISE = %s" % vw.FLUX_DENOISE)
chk("both knobs are env-tunable, so they can be dialled without editing code",
    'os.environ.get("TINT_STRENGTH")' in src and 'os.environ.get("FLUX_DENOISE")' in src)
chk("the tint runs BEFORE the inpaint, on the same mask",
    src.index("working = tint(working, masks[surface], hexv)")
    < src.index("working = inpaint(comfy, working, masks[surface],"))

fails = 0
for name, ok, detail in CHECKS:
    if not ok:
        fails += 1
    print(("  PASS  " if ok else "  FAIL  ") + name + (("   [" + detail + "]") if detail else ""))
print("RED — %d of %d failed" % (fails, len(CHECKS)) if fails
      else "GREEN — %d/%d" % (len(CHECKS), len(CHECKS)))
print("\n⚠ This proves the SWATCH REACHES THE PIXELS and the shading survives.")
print("  It does NOT prove the render looks right — only the Spark can run FLUX,")
print("  and only Theo's eyes settle whether 0.82 denoise is the right amount.")
sys.exit(1 if fails else 0)
