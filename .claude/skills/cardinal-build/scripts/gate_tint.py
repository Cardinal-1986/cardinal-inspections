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


def luma(t):
    return 0.2126 * t[0] + 0.7152 * t[1] + 0.0722 * t[2]


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

# ── 1b. A BRIGHT source — the case the first fixture was too easy to catch ──
# ⚠ THE ORIGINAL FIXTURE PASSED ON BROKEN CODE. Its tan averages rgb(140,118,86),
# whose lightness happens to sit near Evergreen Mist's, so a tint that kept
# luminance EXACTLY still landed within 3 of the swatch and read as green.
#
# The real roof is far brighter — about rgb(198,172,140), L*184 against the
# swatch's L*127. Keeping luminance there paints rgb(168,181,162): a pale
# washed sage, right hue and wrong colour, and close enough to the model's tan
# attractor that FLUX pulls it back. That is exactly what Theo saw.
#
# A fixture must include the case that FAILS, or it certifies the bug.
bright = Image.new("RGB", (W, H), (60, 140, 60))
bp = bright.load()
for y in range(0, 60):
    for x in range(W):
        shade = 0.75 + 0.25 * (x / (W - 1))
        if 20 <= y <= 28:
            shade *= 0.55
        bp[x, y] = (min(255, int(232 * shade)), min(255, int(202 * shade)), min(255, int(164 * shade)))
BSRC = png(bright)
bout = open_png(vw.tint(BSRC, MSK, GREEN, strength=1.0))
b_before = mean_rgb(bright, (0, 0, W, 60))
b_after  = mean_rgb(bout,   (0, 0, W, 60))
chk("the bright source really is much lighter than the swatch (not vacuous)",
    luma(b_before) > luma(tgt) + 40,
    "source luma %.0f vs swatch %.0f" % (luma(b_before), luma(tgt)))
b_drift = max(abs(b_after[i] - tgt[i]) for i in range(3))
chk("⚠ a BRIGHT roof still lands ON the swatch — lightness is moved, not just hue. "
    "Keeping luminance gives a pale wash that FLUX pulls back to tan",
    b_drift < 30, "mean rgb(%.0f,%.0f,%.0f) vs swatch rgb%s" % (b_after + (tgt,)))
b_shadow = luma(mean_rgb(bout, (0, 21, W, 28)))
b_plane  = luma(mean_rgb(bout, (0, 5,  W, 15)))
chk("and the shading survives the lightness move too (re-centred, not flattened)",
    b_shadow < b_plane * 0.8, "shadow %.0f vs plane %.0f" % (b_shadow, b_plane))

# ── 2. it touches ONLY the mask ───────────────────────────────────────────
grass_before = mean_rgb(img, (0, 70, W, H))
grass_after  = mean_rgb(out, (0, 70, W, H))
chk("⚠ nothing outside the mask moves — the lawn is untouched",
    max(abs(grass_before[i] - grass_after[i]) for i in range(3)) < 0.5,
    "%s -> %s" % (tuple(round(v) for v in grass_before), tuple(round(v) for v in grass_after)))

# ── 3. the shading survives ───────────────────────────────────────────────
# The tree-shadow band must still be materially darker than the plane above it.
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

# ── 7. one worker per GPU ─────────────────────────────────────────────────
# Found on the Spark 15 Aug: THREE workers polling the same queue since the
# previous evening. Nothing was corrupted — claim_job() is atomic, so they
# took DIFFERENT jobs — they simply ran FLUX concurrently on one GPU and every
# render crawled. A clean database and a wrong wall clock is what this looks
# like from outside, which is why it survived a full day.
chk("the worker takes a single-instance lock at startup",
    "def take_lock" in src and "fcntl.flock" in src)
chk("⚠ it uses flock, not a PID file — the kernel drops it when the process "
    "dies, so a crash leaves no stale lock to clear",
    "LOCK_EX | fcntl.LOCK_NB" in src and "pidfile" not in src.lower())
chk("a refused start exits NON-ZERO (a bare main() would look like success "
    "to systemd and never restart or alarm)",
    "sys.exit(main())" in src)
chk("the refusal says how to fix it, not just that it refused",
    "pkill -f visualizer_worker.py" in src)
chk("a second GPU is still possible — the lock path is overridable",
    'os.environ.get("VISUALIZER_LOCK")' in src)

# and prove the lock actually excludes a second holder, rather than trusting
# that flock does what the docs say in this environment
import subprocess, tempfile, textwrap
_probe = textwrap.dedent("""
    import fcntl, sys
    fh = open(sys.argv[1], "w")
    try:
        fcntl.flock(fh.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
        print("GOT")
    except OSError:
        print("BLOCKED")
""")
with tempfile.TemporaryDirectory() as td:
    probe = Path(td) / "probe.py"
    probe.write_text(_probe)
    lockf = Path(td) / "l.lock"
    first = open(lockf, "w")
    import fcntl as _f
    _f.flock(first.fileno(), _f.LOCK_EX | _f.LOCK_NB)
    r = subprocess.run([sys.executable, str(probe), str(lockf)],
                       capture_output=True, text=True)
    chk("CONTROL: a second process really IS blocked while the first holds it",
        r.stdout.strip() == "BLOCKED", r.stdout.strip() or r.stderr.strip()[:60])
    first.close()
    r2 = subprocess.run([sys.executable, str(probe), str(lockf)],
                        capture_output=True, text=True)
    chk("and the lock is released when the holder exits — no stale lock",
        r2.stdout.strip() == "GOT", r2.stdout.strip() or r2.stderr.strip()[:60])

# ── 8. the worker measures what it produced ───────────────────────────────
# Three colour diagnoses on 15 Aug came from photographs of a monitor, and two
# were wrong before they were right. measure() is how the next one comes from
# a number instead — and, more usefully, how "the pipeline missed" is told
# apart from "the swatch is wrong", which need opposite fixes and look
# identical in a screenshot.
if not hasattr(vw, "measure"):
    chk("the worker measures the colour it actually produced", False, "no measure()")
else:
    # A render that came out EXACTLY right.
    perfect = Image.new("RGB", (W, H), vw._hex_rgb(GREEN))
    m = vw.measure(png(perfect), MSK, GREEN)
    chk("a render that hit the swatch measures near-zero drift",
        m and m["drift"] <= 1, str(m))
    chk("and it reports both what was asked for and what arrived",
        m and m["want"].upper() == GREEN.upper() and m["got"].startswith("#"), str(m))

    # The REAL failure: the pale sage the luminance-preserving tint produced.
    pale = Image.new("RGB", (W, H), (168, 181, 162))
    m2 = vw.measure(png(pale), MSK, GREEN)
    chk("⚠ CONTROL: the pale sage that shipped as 'roof colour still off' is "
        "measured as a LARGE drift — this is the number that would have "
        "diagnosed it in one query instead of three guesses",
        m2 and m2["drift"] >= 40, str(m2))

    # It measures INSIDE the mask only — the lawn must not drag the mean.
    half = Image.new("RGB", (W, H), (255, 0, 255))     # screaming magenta
    hp = half.load()
    for y in range(0, 60):
        for x in range(W):
            hp[x, y] = vw._hex_rgb(GREEN)             # correct inside the mask
    m3 = vw.measure(png(half), MSK, GREEN)
    chk("⚠ it measures INSIDE the mask only — magenta everywhere else does not "
        "move the reading",
        m3 and m3["drift"] <= 1, str(m3))

    for label, val in [("a missing hex", None), ("junk", "nope")]:
        chk("measure() returns None rather than throwing on %s" % label,
            vw.measure(png(perfect), MSK, val) is None)

    chk("the measurement is written onto the job row",
        '"achieved": achieved or None' in src)
    chk("it is taken BEFORE the JPEG round trip, on the pixels the model made",
        src.index("m = measure(working, masks[surface]") < src.index('to_jpeg(working, 2400'))
    chk("a failure to measure never costs the render",
        "could not measure the result" in src)

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
