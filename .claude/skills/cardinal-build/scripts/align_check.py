#!/usr/bin/env python3
"""align_check.py — is a generated render still THE SAME PHOTOGRAPH?

WHY THIS EXISTS
───────────────────────────────────────────────────────────────────────────
On 15 Aug a Gemini render of a real house came back better-looking than
anything the Spark pipeline had produced — and it had also given the
low-slope porch roof a set of brown architectural shingles it is never
going to get. That is the failure that had already cost three builds
(added door, changed windows, warped gutters), except this time it was
pretty, which makes it worse: an obviously-wrong render gets thrown away,
a beautifully-wrong one gets shown to a customer.

The proposed fix is to composite the generated pixels back through our own
masks, so only roof and siding change and every other pixel is the
homeowner's actual photograph. That is only possible if the render is
REGISTERED with the original — same framing, same scale, same pixel grid.
If the model re-composed the scene, compositing silently produces a seam.

So this answers two questions, with numbers instead of opinion:

  1. REGISTRATION — can these two images be laid on top of each other?
       ALIGNED     → composite is safe as-is
       SHIFTED     → composite is safe after a translation (we can do that)
       RECOMPOSED  → the model re-framed the shot; composite is NOT safe

  2. GEOMETRY — did the model invent structure outside the surfaces it was
     asked to change? Measured as edges present in the original that the
     render lost, and edges in the render that the original never had.
     Invented shingles on a flat porch deck are hundreds of new edges in a
     region nobody asked it to touch.

Pass --mask to exclude the surfaces that were SUPPOSED to change; without
them the geometry numbers include the legitimate edit and read worse than
reality. The masks the Spark worker already writes to
visualizer/<job>/mask_<surface>.png are exactly the right input.

USAGE
    align_check.py ORIGINAL RENDER [--mask roof=m_roof.png ...] [--json]
    align_check.py --selftest

--selftest builds five synthetic pairs, three of which MUST fail. A gate
that has never been seen to go red proves nothing (BUG_CLASSES 37): the
self-test exits non-zero if any verdict comes back wrong, including the
ones that are supposed to be bad.

Requires numpy + pillow.
"""

import sys, json, math

try:
    import numpy as np
    from PIL import Image, ImageDraw
except ImportError:                                    # pragma: no cover
    sys.stderr.write(
        "align_check needs numpy and pillow:  pip3 install numpy pillow\n")
    sys.exit(2)


# ── thresholds ───────────────────────────────────────────────────────────
# All derived from what the composite actually needs, not from taste.

ASPECT_TOL   = 0.010   # 1%. Wider than this and the framing genuinely moved;
                       # a pure resolution change keeps aspect to ~0.1%.
SHIFT_OK_PX  = 1.0     # sub-pixel. Anything under this needs no correction.
SHIFT_MAX_PX = 24.0    # beyond this it is not a shift, it is a new crop.
RESIDUAL_OK  = 8.0     # median |ΔL| per pixel, 0-255, outside the masks.
                       # JPEG round-tripping alone costs 2-4; 8 leaves room
                       # for that without hiding a re-render.
EDGE_KEEP_OK = 0.80    # ≥80% of the original's strong edges must survive.
EDGE_ADD_OK  = 0.25    # ≤25% of the render's strong edges may be new.


# ── image helpers ────────────────────────────────────────────────────────

def load(path):
    im = Image.open(path)
    if im.mode != "RGB":
        im = im.convert("RGB")
    return im


def luma(im):
    a = np.asarray(im, dtype=np.float64)
    return 0.299 * a[:, :, 0] + 0.587 * a[:, :, 1] + 0.114 * a[:, :, 2]


def box_blur(a, r=1):
    """Cheap separable blur. Keeps the edge measure from firing on noise."""
    if r < 1:
        return a
    k = 2 * r + 1
    pad = np.pad(a, r, mode="edge")
    out = np.zeros_like(a)
    for i in range(k):
        out += pad[i:i + a.shape[0], r:r + a.shape[1]]
    out /= k
    pad = np.pad(out, r, mode="edge")
    out = np.zeros_like(a)
    for i in range(k):
        out += pad[r:r + a.shape[0], i:i + a.shape[1]]
    return out / k


def grad_mag(a):
    gy, gx = np.gradient(box_blur(a, 1))
    return np.hypot(gx, gy)


def phase_shift(a, b):
    """Global translation from a to b, by phase correlation.

    Returns (dy, dx, confidence). Confidence is the correlation peak over
    the mean — a re-composed scene has no single peak and scores near 1.
    """
    A = np.fft.fft2(a - a.mean())
    B = np.fft.fft2(b - b.mean())
    R = A * np.conj(B)
    mag = np.abs(R)
    mag[mag < 1e-12] = 1e-12
    r = np.real(np.fft.ifft2(R / mag))
    idx = np.unravel_index(np.argmax(r), r.shape)
    peak = r[idx]
    mean = np.abs(r).mean()
    dy, dx = idx
    if dy > a.shape[0] // 2:
        dy -= a.shape[0]
    if dx > a.shape[1] // 2:
        dx -= a.shape[1]
    return float(dy), float(dx), float(peak / mean if mean else 0.0)


def shift_by(a, dy, dx):
    return np.roll(np.roll(a, int(round(dy)), axis=0), int(round(dx)), axis=1)


def load_masks(pairs, size):
    """Union of every supplied mask, resized to the original. True = the
    model was ALLOWED to change this pixel, so exclude it from the audit."""
    if not pairs:
        return None
    acc = None
    for _, path in pairs:
        m = Image.open(path).convert("L").resize(size, Image.NEAREST)
        arr = np.asarray(m) > 127
        acc = arr if acc is None else (acc | arr)
    return acc


# ── the audit ────────────────────────────────────────────────────────────

def compare(orig_im, rend_im, masks=None):
    ow, oh = orig_im.size
    rw, rh = rend_im.size
    out = {
        "orig_size": [ow, oh],
        "render_size": [rw, rh],
        "notes": [],
    }

    ar_o, ar_r = ow / oh, rw / rh
    out["aspect_delta"] = round(abs(ar_o - ar_r) / ar_o, 5)
    if out["aspect_delta"] > ASPECT_TOL:
        # No amount of translation fixes a different crop. Say so and stop
        # pretending the rest of the numbers mean anything.
        out["verdict"] = "RECOMPOSED"
        out["notes"].append(
            "aspect ratio moved %.1f%% (%.4f vs %.4f) — the render is a "
            "different framing of the scene, not the same photograph at a "
            "different size. Compositing would seam."
            % (out["aspect_delta"] * 100, ar_o, ar_r))
        out["safe_to_composite"] = False
        out["geometry_ok"] = None      # not assessed — never default this True
        return out

    if (rw, rh) != (ow, oh):
        rend_im = rend_im.resize((ow, oh), Image.LANCZOS)
        out["notes"].append(
            "render rescaled %dx%d -> %dx%d for comparison (aspect held)"
            % (rw, rh, ow, oh))

    A, B = luma(orig_im), luma(rend_im)

    dy, dx, conf = phase_shift(A, B)
    dist = math.hypot(dy, dx)
    out["shift"] = {"dy": dy, "dx": dx, "px": round(dist, 2),
                    "confidence": round(conf, 1)}

    if dist > SHIFT_MAX_PX:
        out["verdict"] = "RECOMPOSED"
        out["notes"].append(
            "best alignment is %.0fpx away — past %.0fpx this is a new crop, "
            "not a nudge" % (dist, SHIFT_MAX_PX))
        out["safe_to_composite"] = False
        out["geometry_ok"] = None
        return out

    Bs = shift_by(B, dy, dx) if dist > 0 else B

    # Ignore a border the width of the shift: np.roll wraps, and wrapped
    # pixels are not evidence of anything.
    pad = int(math.ceil(dist)) + 2
    sl = (slice(pad, oh - pad), slice(pad, ow - pad))
    keep = np.ones((oh, ow), dtype=bool)
    if masks is not None:
        keep &= ~masks
    keep = keep[sl]
    if keep.sum() < 64:
        out["verdict"] = "RECOMPOSED"
        out["notes"].append("nothing left to compare after masks and border")
        out["safe_to_composite"] = False
        out["geometry_ok"] = None
        return out

    ga, gb = grad_mag(A)[sl], grad_mag(Bs)[sl]

    # Registration is only measurable where there is something to register.
    # The first version took the median over EVERY unmasked pixel, and a
    # 14%-zoomed re-crop scored a median of 0.0 — flat sky and flat wall
    # agree with themselves no matter how badly the frames line up, and they
    # outnumber the detail. Score the textured half only.
    # The FLOOR is load-bearing, not defensive. `>= median` alone does nothing
    # when most of the frame is flat: the median gradient is then 0, `>= 0` is
    # every pixel, and a 14%-zoomed re-crop scored a median residual of 0.00
    # while visibly misregistered. A solid fill agrees with itself at any zoom.
    tex_thr = max(float(np.percentile(ga[keep], 60)), 1.0)
    textured = keep & (ga >= tex_thr)
    if textured.sum() < 64:
        textured = keep
    d_all = np.abs(A[sl] - Bs[sl])
    diff = d_all[textured]
    out["residual"] = {
        "median": round(float(np.median(diff)), 2),
        "p90": round(float(np.percentile(diff, 90)), 2),
        "mean": round(float(diff.mean()), 2),
        "measured_on": "textured pixels outside the masks",
        "pixels": int(textured.sum()),
    }
    thr = float(np.percentile(ga[keep], 90))           # the original's own
    thr = max(thr, 1.0)                                # strongest 10%
    ea = (ga >= thr) & keep
    eb = (gb >= thr) & keep
    out["edges"] = {
        "threshold": round(thr, 2),
        "orig_strong": int(ea.sum()),
        "render_strong": int(eb.sum()),
        "kept": round(float((ea & eb).sum() / ea.sum()) if ea.sum() else 1.0, 3),
        "added": round(float((eb & ~ea).sum() / eb.sum()) if eb.sum() else 0.0, 3),
    }

    reg_ok = dist <= SHIFT_OK_PX
    res_ok = out["residual"]["median"] <= RESIDUAL_OK
    geo_ok = (out["edges"]["kept"] >= EDGE_KEEP_OK
              and out["edges"]["added"] <= EDGE_ADD_OK)

    if not res_ok:
        out["verdict"] = "RECOMPOSED"
        out["notes"].append(
            "median residual %.1f outside the masks (floor %.1f) — the model "
            "repainted pixels it was not asked to touch"
            % (out["residual"]["median"], RESIDUAL_OK))
    elif reg_ok:
        out["verdict"] = "ALIGNED"
    else:
        out["verdict"] = "SHIFTED"
        out["notes"].append(
            "registers after a %.0fpx translation — composite is safe once "
            "we apply it" % dist)

    out["geometry_ok"] = geo_ok
    if not geo_ok:
        out["notes"].append(
            "GEOMETRY: %.0f%% of the original's edges survive (floor %.0f%%), "
            "%.0f%% of the render's edges are new (ceiling %.0f%%) — structure "
            "was invented or destroyed outside the masked surfaces"
            % (out["edges"]["kept"] * 100, EDGE_KEEP_OK * 100,
               out["edges"]["added"] * 100, EDGE_ADD_OK * 100))

    out["safe_to_composite"] = out["verdict"] in ("ALIGNED", "SHIFTED")
    return out


# ── self-test ────────────────────────────────────────────────────────────

def _scene(w=320, h=240, seed=7):
    """A deterministic pseudo-photograph: texture plus hard structure, so
    the edge measure has something real to hold on to."""
    rng = np.random.default_rng(seed)
    base = rng.normal(128, 18, (h, w, 3)).clip(0, 255).astype(np.uint8)
    im = Image.fromarray(base)
    d = ImageDraw.Draw(im)
    d.rectangle([40, 60, 280, 200], fill=(120, 140, 165))     # the wall
    d.polygon([(30, 62), (160, 18), (290, 62)], fill=(58, 60, 64))  # the roof
    for x in range(70, 260, 60):                               # the windows
        d.rectangle([x, 100, x + 34, 150], fill=(235, 238, 240))
    return im


def _recolour(im, box, rgb):
    out = im.copy()
    ImageDraw.Draw(out).rectangle(box, fill=rgb)
    return out


def _selftest():
    base = _scene()
    w, h = base.size
    cases = []

    # 1. the good case: only a MASKED surface changed. The mask matters —
    #    without it the legitimate edit counts against geometry and the tool
    #    condemns a perfectly good render. This case exercises that path.
    wall = [40, 60, 280, 200]
    wmask = np.zeros((h, w), dtype=bool)
    wmask[wall[1]:wall[3], wall[0]:wall[2]] = True
    cases.append(("clean recolour", base, _recolour(base, wall, (90, 120, 160)),
                  wmask, "ALIGNED", True, True))

    # 1b. the SAME edit with no mask supplied must NOT read as clean — that is
    #     the tool telling you it cannot vouch for a surface you did not fence.
    cases.append(("recolour, no mask", base, _recolour(base, wall, (90, 120, 160)),
                  None, None, None, False))

    # 2. a pure translation — recoverable, composite still safe
    sh = Image.fromarray(np.roll(np.asarray(base), 7, axis=1))
    cases.append(("shifted 7px", base, sh, None, "SHIFTED", True, True))

    # 3. re-framed: cropped and blown back up, SAME aspect so the cheap check
    #    cannot catch it. MUST fail.
    cr = base.crop([20, 15, w - 20, h - 15]).resize((w, h), Image.LANCZOS)
    cases.append(("re-framed crop", base, cr, None, "RECOMPOSED", False, None))

    # 4. different aspect ratio. MUST fail, and geometry is NOT assessed.
    ar = base.resize((w, int(h * 0.72)), Image.LANCZOS)
    cases.append(("aspect changed", base, ar, None, "RECOMPOSED", False, None))

    # 5. invented structure — the porch-roof case. Registration is perfect;
    #    the model has drawn shingle courses on a surface nobody masked.
    inv = base.copy()
    d = ImageDraw.Draw(inv)
    for y in range(205, 236, 4):
        d.line([(20, y), (300, y)], fill=(96, 74, 52), width=2)
    cases.append(("invented shingles", base, inv, None, None, None, False))

    bad = 0
    for name, a, b, mask, want_verdict, want_safe, want_geo in cases:
        r = compare(a, b, mask)
        ok = True
        if want_verdict is not None and r["verdict"] != want_verdict:
            ok = False
        if want_safe is not None and r.get("safe_to_composite") != want_safe:
            ok = False
        # No .get(..., True) here. An unassessed geometry field defaulting to
        # "fine" is how the aspect case passed while proving nothing.
        if want_geo is not None and r.get("geometry_ok") != want_geo:
            ok = False
        print("  %-18s -> %-11s safe=%-5s geo=%-5s  %s"
              % (name, r["verdict"], r.get("safe_to_composite"),
                 r.get("geometry_ok"), "ok" if ok else "WRONG"))
        if not ok:
            bad += 1
            print("      got: %s" % json.dumps(
                {k: v for k, v in r.items() if k != "notes"}))

    print("\n  %d/%d cases correct (4 of the 6 must come back bad)"
          % (len(cases) - bad, len(cases)))
    return 1 if bad else 0


# ── cli ──────────────────────────────────────────────────────────────────

def main(argv):
    if "--selftest" in argv:
        print("align_check self-test")
        return _selftest()

    args = [a for a in argv if not a.startswith("--")]
    masks = [a.split("=", 1)[1].split(",") for a in argv
             if a.startswith("--mask=")]
    flat = [("m", p) for grp in masks for p in grp]
    if len(args) < 2:
        sys.stderr.write(__doc__.split("USAGE")[1])
        return 2

    orig, rend = load(args[0]), load(args[1])
    m = load_masks(flat, orig.size)
    r = compare(orig, rend, m)

    if "--json" in argv:
        print(json.dumps(r, indent=2))
        return 0 if r.get("safe_to_composite") and r.get("geometry_ok", True) else 1

    print("original  %dx%d" % tuple(r["orig_size"]))
    print("render    %dx%d" % tuple(r["render_size"]))
    if "shift" in r:
        print("shift     %.1f, %.1f  (%.1fpx, peak %.0fx mean)"
              % (r["shift"]["dy"], r["shift"]["dx"], r["shift"]["px"],
                 r["shift"]["confidence"]))
    if "residual" in r:
        print("residual  median %.1f  p90 %.1f  (floor %.1f)"
              % (r["residual"]["median"], r["residual"]["p90"], RESIDUAL_OK))
    if "edges" in r:
        print("edges     %.0f%% kept (floor %.0f%%)  %.0f%% new (ceiling %.0f%%)"
              % (r["edges"]["kept"] * 100, EDGE_KEEP_OK * 100,
                 r["edges"]["added"] * 100, EDGE_ADD_OK * 100))
    print("\nVERDICT   %s   composite %s   geometry %s"
          % (r["verdict"],
             "SAFE" if r.get("safe_to_composite") else "UNSAFE",
             "ok" if r.get("geometry_ok", True) else "CHANGED"))
    for n in r["notes"]:
        print("  - %s" % n)
    return 0 if r.get("safe_to_composite") and r.get("geometry_ok", True) else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
