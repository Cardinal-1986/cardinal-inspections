#!/usr/bin/env python3
"""
probe_planes.py — does splitting the masks by object actually give us WALLS?

    python3 probe_planes.py ~/photo.jpg
    python3 probe_planes.py --job 80ebeb54            # the exact photo a job used
    python3 probe_planes.py ~/photo.jpg --phrase siding="wall section"
    python3 probe_planes.py ~/photo.jpg --only siding,roof

Segmentation ONLY. It queues nothing, writes nothing to Supabase, touches no
job row and produces no render. Run it as often as you like.

────────────────────────────────────────────────────────────────────────────
THE QUESTION IT ANSWERS

Theo, 15 Aug: "Why can't we do the siding by walls? With clickable circles
like hover does it?"

We can — `masks`' own schema comment has said "let a rep tap a region" since
day one. But the whole idea rests on one assumption nobody has tested:

    that `individual_objects: true` splits a house into PLANES.

It does not split by planes. It splits by whatever **Florence2 grounded**. If
Florence2 answers "house wall" with ONE box around the whole elevation, then
`true` returns one mask and nothing has improved — and we would have found
that out three builds into a tap-a-plane UI instead of here.

So this runs the real graph both ways and counts. It is deliberately a probe
and not a feature: the answer decides whether tap-a-plane is one build or
three, and the answer is currently a guess.

────────────────────────────────────────────────────────────────────────────
WHY IT IS ALSO WORTH RUNNING ON `false`

The merged run is the CONTROL. Build 824 recorded the cost of a number with
no baseline beside it (BUG_CLASSES 47), and "siding split into 4" means
nothing until you know the merged mask covered 38% of the frame and the four
together cover 31%. Both runs, every time, unless you pass --only-split.

────────────────────────────────────────────────────────────────────────────
WHAT IT LEAVES YOU

    ~/cardinal_planes/<image>/<surface>_merged.png      the mask as it ships today
    ~/cardinal_planes/<image>/<surface>_split_1.png     …one per object
    ~/cardinal_planes/<image>/<surface>_SHEET.png       ← LOOK AT THIS ONE

The sheet is the photograph with every plane tinted a different colour and
numbered. Twelve loose greyscale PNGs are not an answer to "did it find the
walls"; one picture is.

Needs the interpreter that has the worker's deps (see VISUALIZER_SETUP §5):
    /home/cardinal2023/ComfyUI/venv/bin/python3 probe_planes.py …
"""

import io
import json
import os
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

# The worker refuses to import without these. A probe pointed at a LOCAL file
# needs no database at all, so inert placeholders stand in — but ONLY when
# there is no .env to read.
#
# ⚠ THE GUARD IS `if not .env.exists()`, AND THAT CONDITION IS THE WHOLE FIX.
# The worker's own loader is `os.environ.setdefault`, on purpose, so that an
# explicit export beats a stale file. Setting placeholders unconditionally
# here therefore WINS over the real .env — the worker's setdefault finds the
# key already present and leaves the fake one in place. First run on the Spark:
# `--job needs real credentials`, from inside spark/, with a perfectly good
# .env sitting next to the script. A fallback that runs before the real source
# is not a fallback, it is an override.
#
# Never a real key here; this file is in git.
if not (HERE / ".env").exists():
    os.environ.setdefault("SUPABASE_URL", "https://example.invalid")
    os.environ.setdefault("SUPABASE_SERVICE_KEY", "inert-placeholder-not-a-key")

try:
    from PIL import Image
    import visualizer_worker as W
except SystemExit as e:
    sys.exit("CANNOT RUN — %s" % e)
except ImportError as e:
    sys.exit("CANNOT RUN — %s\n  Use the interpreter that has the worker's deps "
             "(VISUALIZER_SETUP §5)." % e)

OUT_ROOT = Path(os.environ.get("PROBE_OUT") or (Path.home() / "cardinal_planes"))

# Distinct enough to tell apart on a photograph of a house. Deliberately not
# the material colours — build 824's lesson: a grey wash over a grey roof
# answers nothing.
TINTS = [(255, 197, 61), (78, 201, 245), (245, 92, 192), (123, 227, 139),
         (255, 138, 76), (150, 130, 255), (255, 240, 120), (120, 255, 220)]


def log(*a):
    print(*a, flush=True)


# ── graph surgery ────────────────────────────────────────────────────────
def surfaces_in(graph):
    """Every surface the graph can produce, read off its SaveImage titles."""
    out = []
    for v in graph.values():
        t = ((v.get("_meta") or {}).get("title") or "")
        if t.startswith("CARDINAL_MASK_"):
            out.append(t[len("CARDINAL_MASK_"):].lower())
    return out


def set_split(graph, on):
    """individual_objects on every Sam2Segmentation node. Returns how many."""
    n = 0
    for v in graph.values():
        if v.get("class_type") == "Sam2Segmentation":
            v.setdefault("inputs", {})["individual_objects"] = bool(on)
            n += 1
    return n


def set_phrase(graph, surface, phrase):
    """Retarget one surface's Florence2 grounding phrase.

    Matched by the node TITLE ("find siding"), never by id — the worker's
    own banner explains why: ComfyUI renumbers nodes whenever the graph is
    edited, silently.
    """
    want = "find " + surface
    for v in graph.values():
        if v.get("class_type") == "Florence2Run" and \
           ((v.get("_meta") or {}).get("title") or "").lower() == want:
            v.setdefault("inputs", {})["text_input"] = phrase
            return True
    return False


def drop_surfaces(graph, keep):
    """Remove the SaveImage for every surface not asked for — the rest of the
    chain is left alone because ComfyUI only executes what an output needs."""
    dropped = []
    for nid in list(graph.keys()):
        t = ((graph[nid].get("_meta") or {}).get("title") or "")
        if t.startswith("CARDINAL_MASK_"):
            s = t[len("CARDINAL_MASK_"):].lower()
            if s not in keep:
                del graph[nid]
                dropped.append(s)
    return dropped


# ── measuring a mask ─────────────────────────────────────────────────────
def mask_stats(png, frame):
    """Coverage and bounding box of the lit part of a mask.

    Threshold at 128 rather than >0: SAM 2's masks are soft at the edges and
    counting every non-zero pixel inflates coverage by a few percent — small,
    but this probe exists to compare numbers to each other.
    """
    m = Image.open(io.BytesIO(png)).convert("L")
    if m.size != frame:
        m = m.resize(frame, Image.LANCZOS)
    bw = m.point(lambda p: 255 if p >= 128 else 0)
    lit = sum(bw.histogram()[128:])
    total = frame[0] * frame[1]
    return {
        "pct": 100.0 * lit / total if total else 0.0,
        "box": bw.getbbox(),          # None when the mask is empty
        "img": bw,
    }


def sheet(photo, layers, path):
    """One picture: the photograph with each plane tinted and numbered."""
    base = photo.convert("RGB").copy()
    for i, st in enumerate(layers):
        colour = TINTS[i % len(TINTS)]
        wash = Image.new("RGB", base.size, colour)
        # Paste the tint THROUGH the mask at partial strength, so the house
        # still reads underneath — a solid fill hides whether the edge is right,
        # which is most of what you are looking for.
        base = Image.composite(Image.blend(base, wash, 0.6), base, st["img"])
    base.save(path)


def main():
    argv = sys.argv[1:]
    if not argv or "-h" in argv or "--help" in argv:
        print(__doc__)
        return 0

    phrases, only, src_arg = {}, None, None
    both = True
    i = 0
    while i < len(argv):
        a = argv[i]
        if a == "--phrase":
            i += 1
            k, _, v = argv[i].partition("=")
            phrases[k.strip().lower()] = v
        elif a.startswith("--phrase="):
            k, _, v = a[len("--phrase="):].partition("=")
            phrases[k.strip().lower()] = v
        elif a == "--only":
            i += 1
            only = [s.strip().lower() for s in argv[i].split(",") if s.strip()]
        elif a == "--job":
            i += 1
            src_arg = ("job", argv[i])
        elif a == "--only-split":
            both = False
        elif not a.startswith("-"):
            src_arg = ("file", a)
        i += 1

    if not src_arg:
        sys.exit("Give an image path, or --job <id>. -h for help.")

    # ── the photograph ───────────────────────────────────────────────────
    if src_arg[0] == "file":
        p = Path(src_arg[1]).expanduser()
        if not p.exists():
            sys.exit("No such file: %s" % p)
        raw = p.read_bytes()
        label = p.stem
    else:
        jid = src_arg[1]
        if not W.SERVICE_KEY or W.SERVICE_KEY.startswith("inert-"):
            sys.exit("--job needs real credentials. Run this from spark/ so "
                     ".env is found, or pass a local image path instead.")
        log("looking up job %s…" % jid)
        import requests                       # already a worker dependency

        # ⚠ NO `like` FILTER HERE, and the reason is not obvious.
        # `design_jobs.id` is a UUID. PostgreSQL has no `uuid ~~ text`
        # operator, so `id=like.80ebeb54*` raises undefined_function (42883)
        # — and PostgREST maps that to **404 Not Found**, which reads exactly
        # like a missing table or a broken key and sends you to check the
        # wrong three things. (It did. First run on the Spark.)
        #
        # So: exact match on a full uuid, otherwise pull the recent rows and
        # match the prefix here. The list is small and this is a probe.
        hdrs = {"apikey": W.SERVICE_KEY, "Authorization": "Bearer " + W.SERVICE_KEY}
        full = re.fullmatch(r"[0-9a-fA-F-]{36}", jid) is not None
        if full:
            params = {"id": "eq." + jid, "select": "id,source_path", "limit": 1}
        else:
            params = {"select": "id,source_path,created_at",
                      "order": "created_at.desc", "limit": 200}
        r = requests.get(W.SUPABASE_URL + "/rest/v1/design_jobs",
                         params=params, headers=hdrs, timeout=30)
        r.raise_for_status()
        rows = r.json()
        if not full:
            rows = [x for x in rows if str(x.get("id", "")).startswith(jid.lower())]
        path = rows[0].get("source_path") if rows else None
        if not path:
            sys.exit("No job matching %s.\n"
                     "  Pass the full id, or a prefix of one of the most recent 200.\n"
                     "  A job with no source_path has not been rendered." % jid)
        if len(rows) > 1:
            log("  ⚠ %d jobs match that prefix — using %s" % (len(rows), rows[0]["id"]))
        log("  source: %s" % path)
        raw = W.storage_download(path)
        label = jid[:8]

    # The worker fits every image before segmenting, so the probe must too —
    # segmenting a 4000px frame the pipeline never sees would answer a
    # question nobody asked.
    # ⚠ THREE values, not one: (png, (was_w, was_h), (now_w, now_h)).
    # Taking only the first gives `TypeError: a bytes-like object is required,
    # not 'tuple'` several lines later, which points at Image.open rather than
    # at the real mistake — reading a function's docstring instead of guessing
    # its return shape.
    fitted, was, now = W.fit_for_flux(raw)
    photo = Image.open(io.BytesIO(fitted)).convert("RGB")
    frame = photo.size
    # Say the working size out loud. Every mask below is generated at THIS
    # size, and a coverage percentage means nothing without the frame it is a
    # percentage of.
    log("photograph: %dx%d%s" % (frame[0], frame[1],
        "" if was == now else "  (source was %dx%d)" % was))

    outdir = OUT_ROOT / re.sub(r"[^A-Za-z0-9_.-]", "_", label)
    outdir.mkdir(parents=True, exist_ok=True)

    comfy = W.Comfy(W.COMFY_URL)
    if not comfy.up():
        sys.exit("ComfyUI is not answering at %s — start it first." % W.COMFY_URL)

    base_graph = W.load_graph("segment_api.json")
    available = surfaces_in(base_graph)
    keep = [s for s in (only or available) if s in available]
    if only:
        missing = [s for s in only if s not in available]
        if missing:
            log("⚠ not in the graph, ignored: %s" % ", ".join(missing))
    if not keep:
        sys.exit("Nothing to segment. Graph has: %s" % ", ".join(available))

    results = {}
    modes = ([("merged", False), ("split", True)] if both else [("split", True)])

    for mode, split in modes:
        graph = json.loads(json.dumps(base_graph))     # deep copy per run
        drop_surfaces(graph, keep)
        n = set_split(graph, split)
        for s, ph in phrases.items():
            if set_phrase(graph, s, ph):
                log("  phrase: %s → %r" % (s, ph))
            else:
                log("  ⚠ no 'find %s' node — phrase ignored" % s)

        name = comfy.upload_image("cardinal_probe.png", fitted)
        W.set_input(graph, W.T_SEG_IN, "image", name)

        log("\n── %s run (individual_objects=%s on %d node(s)) ──"
            % (mode.upper(), split, n))
        pid = comfy.run(graph, timeout=600)
        out = comfy.outputs(pid)

        for nid, payload in out.items():
            title = ((graph.get(nid, {}).get("_meta") or {}).get("title") or "")
            if not title.startswith("CARDINAL_MASK_"):
                continue
            surface = title[len("CARDINAL_MASK_"):].lower()
            images = payload.get("images") or []
            stats = []
            for k, meta in enumerate(images):
                png = comfy.fetch(meta)
                st = mask_stats(png, frame)
                stats.append(st)
                fn = "%s_%s%s.png" % (surface, mode,
                                      "" if len(images) == 1 else "_%d" % (k + 1))
                (outdir / fn).write_bytes(png)
            results.setdefault(surface, {})[mode] = stats

            log("  %-8s %d mask%s" % (surface, len(images),
                                      "" if len(images) == 1 else "s"))
            for k, st in enumerate(stats):
                log("      %d: %5.1f%% of frame   box=%s"
                    % (k + 1, st["pct"], st["box"]))
            if stats:
                sheet(photo, stats, outdir / ("%s_%s_SHEET.png" % (surface, mode)))

    # ── the verdict ──────────────────────────────────────────────────────
    log("\n" + "=" * 68)
    log("  DOES SPLITTING GIVE US WALLS?")
    log("=" * 68)
    verdict_split = False
    for surface in keep:
        r = results.get(surface, {})
        m = len(r.get("merged", []))
        s = len(r.get("split", []))
        note = ""
        if both and m and s:
            if s > m:
                note = "← SPLIT into %d" % s
                verdict_split = True
            elif s == 1:
                note = "← one object; Florence2 grounded it as a single box"
        elif s > 1:
            note = "← %d objects" % s
            verdict_split = True
        log("  %-8s merged=%s  split=%s   %s"
            % (surface, m if both else "-", s, note))

    log("")
    if verdict_split:
        log("  At least one surface really does come back as separate objects.")
        log("  Tap-a-plane is worth building. The next question is whether the")
        log("  pieces line up with what a person would call a wall — that is")
        log("  what the _SHEET.png files are for, and it is Theo's eye.")
    else:
        log("  Every surface came back as ONE object. individual_objects alone")
        log("  will not give us walls on this photograph — Florence2 grounded")
        log("  each phrase as a single box. Try a different phrase before")
        log("  building any UI, e.g.:")
        log("      --phrase siding=\"wall section\"")
        log("      --phrase siding=\"side of a house\"")
        log("  If no phrase splits it, tap-a-plane needs a different segmenter,")
        log("  not a different flag, and that is a much bigger decision.")

    log("\n  masks + sheets: %s" % outdir)
    log("  Look at the *_SHEET.png files first.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
