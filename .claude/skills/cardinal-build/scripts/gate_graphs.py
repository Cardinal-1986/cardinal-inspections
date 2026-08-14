#!/usr/bin/env python3
"""gate_graphs — the two ComfyUI graphs answer to the worker that drives them.

Neither graph has ever executed. The failure this gate is built to prevent is
the expensive one: the worker uploads a photograph, ComfyUI spends five minutes
pulling Florence2 and SAM 2 weights, and THEN rejects the prompt because a node
title has a typo or a link points at a node that isn't there. On the Spark that
is a five-minute round trip per mistake. Here it is a tenth of a second.

It imports the SHIPPED worker and calls its OWN find_node / set_input / load_graph
against the SHIPPED json. It does not re-implement them — a re-implementation
would agree with itself and prove nothing.

What it cannot do: run FLUX, or judge whether a render looks like a roof. It
proves the graphs are wired the way the worker believes they are. Theo's eyes
are still the gate on the picture.

    python3 gate_graphs.py                # the shipped graphs -> GREEN
    python3 gate_graphs.py --control      # mutants -> every one must go RED
"""
import importlib.util
import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
SPARK = ROOT / "spark"

# The worker refuses to import without these. They are a guard, not a
# credential — nothing here reaches the network, and a real key must never
# appear in a repo file.
os.environ.setdefault("SUPABASE_URL", "http://gate.invalid")
os.environ.setdefault("SUPABASE_SERVICE_KEY", "gate-not-a-key")

spec = importlib.util.spec_from_file_location("vw", SPARK / "visualizer_worker.py")
vw = importlib.util.module_from_spec(spec)
spec.loader.exec_module(vw)

CHECKS = []


def chk(name, ok, detail=""):
    CHECKS.append((name, bool(ok), str(detail)))


def node_of(graph, title):
    """The worker's own lookup. Raises the worker's own error when absent."""
    return graph[vw.find_node(graph, title)]


def check_graph_pair(seg, inp):
    # ── 1. every title the worker writes into exists, exactly once ─────────
    for graph, gname, titles in (
        (seg, "segment_api.json", [vw.T_SEG_IN]),
        (inp, "inpaint_api.json", [vw.T_IMAGE, vw.T_MASK, vw.T_POSITIVE,
                                   vw.T_NEGATIVE, vw.T_OUTPUT, vw.T_SAMPLER]),
    ):
        for t in titles:
            hits = [nid for nid, n in graph.items()
                    if (n.get("_meta") or {}).get("title") == t]
            chk("%s: exactly one node titled %s" % (gname, t),
                len(hits) == 1, "found %d" % len(hits))

    # ── 2. each titled node is the class the worker assumes ────────────────
    #  A CLIPTextEncode titled CARDINAL_IMAGE would take the filename as a
    #  prompt and render a picture OF the words. Silent, and wrong.
    for graph, title, cls in (
        (seg, vw.T_SEG_IN,   "LoadImage"),
        (inp, vw.T_IMAGE,    "LoadImage"),
        (inp, vw.T_MASK,     "LoadImage"),
        (inp, vw.T_POSITIVE, "CLIPTextEncode"),
        (inp, vw.T_NEGATIVE, "CLIPTextEncode"),
        (inp, vw.T_OUTPUT,   "SaveImage"),
        (inp, vw.T_SAMPLER,  "KSampler"),
    ):
        got = node_of(graph, title).get("class_type")
        chk("%s is a %s" % (title, cls), got == cls, "is %s" % got)

    # ── 3. set_input writes a key the node already declares ────────────────
    #  ComfyUI validates inputs against the node class. Writing "image" onto a
    #  node whose input is called "images" is a 400 at submit time.
    for graph, title, key in (
        (seg, vw.T_SEG_IN,   "image"),
        (inp, vw.T_IMAGE,    "image"),
        (inp, vw.T_MASK,     "image"),
        (inp, vw.T_POSITIVE, "text"),
        (inp, vw.T_NEGATIVE, "text"),
        (inp, vw.T_SAMPLER,  "seed"),
    ):
        inputs = node_of(graph, title)["inputs"]
        had = key in inputs
        # Snapshot the VALUE, not the dict. `inputs` is the node's own dict —
        # holding a reference to it and reading back after the write returns
        # the sentinel, which silently made the seed check below compare an
        # int against "__gate__" and pass no matter what. A vacuous pass.
        original = inputs.get(key)
        vw.set_input(graph, title, key, "__gate__")
        chk("set_input(%s, %r) targets a declared input" % (title, key),
            had and node_of(graph, title)["inputs"][key] == "__gate__",
            "key present before write: %s" % had)
        node_of(graph, title)["inputs"][key] = original   # put it back

    # ── 4. every link points at a node that exists ─────────────────────────
    #  A dangling ["9", 0] is how a hand-edited API export fails, and ComfyUI
    #  reports it as a wall of validation text rather than a missing node.
    for graph, gname in ((seg, "segment_api.json"), (inp, "inpaint_api.json")):
        dangling = []
        for nid, node in graph.items():
            for key, val in (node.get("inputs") or {}).items():
                if isinstance(val, list) and len(val) == 2 and isinstance(val[0], str):
                    if val[0] not in graph:
                        dangling.append("%s.%s -> %s" % (nid, key, val[0]))
        chk("%s: no link points at a missing node" % gname,
            not dangling, "; ".join(dangling))

    # ── 5. the mask surfaces the worker will DISCOVER are ones it can USE ──
    #  segment() derives the surface name from the title suffix, lowercased.
    #  A node titled CARDINAL_MASK_WINDOW yields "window", which is not in
    #  SURFACE_ORDER, so that mask is computed, uploaded, and then never
    #  applied — a silent no-op that looks like the model failing to see it.
    discovered = sorted(
        (n.get("_meta") or {}).get("title", "")[len("CARDINAL_MASK_"):].lower()
        for n in seg.values()
        if (n.get("_meta") or {}).get("title", "").startswith("CARDINAL_MASK_"))
    chk("segmentation graph produces at least one mask", len(discovered) > 0,
        ", ".join(discovered))
    stray = [s for s in discovered if s not in vw.SURFACE_ORDER]
    chk("every CARDINAL_MASK_* title is a surface the worker applies",
        not stray, "orphans: %s | SURFACE_ORDER=%s" % (stray, vw.SURFACE_ORDER))

    # ── 6. the mask reaches the sampler as a MASK, via ImageToMask ─────────
    #  LoadImage's own MASK output is the alpha channel. A JPEG-sourced PNG
    #  mask has no alpha, so that path yields an all-opaque mask and FLUX
    #  repaints the ENTIRE photograph. This is the single most destructive
    #  mis-wire available here, and it produces a plausible-looking image.
    mask_nid = vw.find_node(inp, vw.T_MASK)
    consumers = [(nid, n) for nid, n in inp.items()
                 if any(isinstance(v, list) and v[:1] == [mask_nid]
                        for v in (n.get("inputs") or {}).values())]
    chk("the mask PNG feeds exactly one node", len(consumers) == 1,
        [n.get("class_type") for _, n in consumers])
    if len(consumers) == 1:
        cnid, cnode = consumers[0]
        chk("the mask goes through ImageToMask, not LoadImage's alpha",
            cnode.get("class_type") == "ImageToMask", cnode.get("class_type"))
        chk("ImageToMask reads a colour channel, not alpha",
            (cnode.get("inputs") or {}).get("channel") in ("red", "green", "blue"),
            (cnode.get("inputs") or {}).get("channel"))
        # and that MASK must land on the conditioning node's mask input
        fed = [n.get("class_type") for n in inp.values()
               if (n.get("inputs") or {}).get("mask", [None])[:1] == [cnid]]
        chk("the MASK lands on InpaintModelConditioning.mask",
            "InpaintModelConditioning" in fed, fed)

    # ── 7. FLUX Fill sampler settings that are correctness, not taste ──────
    ks = [n for n in inp.values() if n.get("class_type") == "KSampler"]
    chk("exactly one KSampler", len(ks) == 1, len(ks))
    if len(ks) == 1:
        i = ks[0]["inputs"]
        # cfg 1 = no classifier-free guidance. FLUX is distilled for this; a
        # cfg above 1 both halves the speed and degrades the fill.
        chk("KSampler cfg is 1 (FLUX is distilled — higher is not 'stronger')",
            i.get("cfg") == 1, i.get("cfg"))
        chk("KSampler denoise is 1 (an inpaint fills, it does not blend)",
            i.get("denoise") == 1, i.get("denoise"))
        chk("the sampler takes its latent from InpaintModelConditioning",
            inp.get((i.get("latent_image") or [None])[0], {}).get("class_type")
            == "InpaintModelConditioning",
            i.get("latent_image"))

    # ── 7b. the seed varies per job and reproduces per job ────────────────
    #  The graph ships a hardcoded seed. If the worker stops overriding it,
    #  every render in the app's history is the same number and "try again"
    #  returns the identical picture.
    a1 = vw.seed_for("420a2cff-eb3c-42bd-9ded-91f126f46d5c", "roof")
    a2 = vw.seed_for("420a2cff-eb3c-42bd-9ded-91f126f46d5c", "roof")
    b  = vw.seed_for("125eaec5-f5f6-437b-84fc-4175cd1ff5bd", "roof")
    c  = vw.seed_for("420a2cff-eb3c-42bd-9ded-91f126f46d5c", "siding")
    chk("the same job+surface reproduces exactly", a1 == a2, a1)
    chk("a different job gets a different seed", a1 != b, "%s vs %s" % (a1, b))
    chk("a different surface gets a different seed", a1 != c, "%s vs %s" % (a1, c))
    chk("the seed is a non-negative int inside ComfyUI's range",
        isinstance(a1, int) and 0 <= a1 < 2**64, a1)
    chk("the worker's seed is not the one baked into the graph",
        a1 != node_of(inp, vw.T_SAMPLER)["inputs"].get("seed"),
        "graph ships %s" % node_of(inp, vw.T_SAMPLER)["inputs"].get("seed"))

    # ── 8. no resize anywhere in segmentation ─────────────────────────────
    #  A mask that is not the source's exact dimensions cannot be composited
    #  back onto it. ComfyUI will happily scale and the result is offset.
    resizers = sorted({n.get("class_type") for n in seg.values()
                       if "resize" in (n.get("class_type") or "").lower()
                       or "scale" in (n.get("class_type") or "").lower()})
    chk("segmentation graph has no resize/scale node", not resizers, resizers)

    # ── 9. SAM 2 returns ONE combined mask per surface ─────────────────────
    #  individual_objects:true returns a batch, and segment() takes images[0]
    #  only — so a house with two roof planes would silently get one of them.
    bad = [nid for nid, n in seg.items()
           if n.get("class_type") == "Sam2Segmentation"
           and (n.get("inputs") or {}).get("individual_objects") is not False]
    chk("every Sam2Segmentation combines objects into one mask", not bad, bad)


def main():
    control = "--control" in sys.argv
    seg_raw = (SPARK / "segment_api.json").read_text()
    inp_raw = (SPARK / "inpaint_api.json").read_text()

    if not control:
        check_graph_pair(json.loads(seg_raw), json.loads(inp_raw))
        failed = [c for c in CHECKS if not c[1]]
        for name, ok, detail in CHECKS:
            print(("  PASS  " if ok else "  FAIL  ") + name +
                  (("   [%s]" % detail) if detail else ""))
        print("RED — %d of %d failed" % (len(failed), len(CHECKS)) if failed
              else "GREEN — %d/%d" % (len(CHECKS), len(CHECKS)))
        return 1 if failed else 0

    # ── the control: each mutant must be CAUGHT ───────────────────────────
    #  A gate that has never been seen to fail proves nothing.
    def mutate_title(raw, old, new):
        return raw.replace('"title": "%s"' % old, '"title": "%s"' % new, 1)

    mutants = [
        ("a mask title the worker cannot use (WINDOWS -> WINDOW)",
         mutate_title(seg_raw, "CARDINAL_MASK_WINDOWS", "CARDINAL_MASK_WINDOW"), inp_raw),
        ("the segmentation input title misspelt",
         mutate_title(seg_raw, "CARDINAL_SEG_IMAGE", "CARDINAL_SEG_IMG"), inp_raw),
        ("the prompt node retitled",
         seg_raw, mutate_title(inp_raw, "CARDINAL_POSITIVE", "CARDINAL_PROMPT")),
        ("the mask wired straight off LoadImage's alpha",
         seg_raw, inp_raw.replace('"image": ["2", 0]', '"image": ["1", 0]', 1)
                          .replace('"mask": ["3", 0]', '"mask": ["2", 1]', 1)),
        ("cfg raised to 7 as if FLUX were SDXL",
         seg_raw, inp_raw.replace('"cfg": 1', '"cfg": 7', 1)),
        ("the sampler untitled, so the seed silently stays hardcoded",
         seg_raw, mutate_title(inp_raw, "CARDINAL_SAMPLER", "sampler")),
        ("a dangling link", seg_raw, inp_raw.replace('["13", 0]', '["99", 0]', 1)),
        ("SAM 2 returning a batch", seg_raw.replace(
            '"individual_objects": false', '"individual_objects": true', 1), inp_raw),
        ("a resize node slipped into segmentation", seg_raw.replace(
            '"class_type": "MaskToImage"', '"class_type": "ImageScale"', 1), inp_raw),
    ]
    worst = 0
    for label, s, i in mutants:
        CHECKS.clear()
        try:
            check_graph_pair(json.loads(s), json.loads(i))
            caught = [c for c in CHECKS if not c[1]]
            # A RuntimeError from find_node counts as caught: the worker would
            # have died at the same place, before uploading anything.
            status = "caught by %d check(s)" % len(caught) if caught else "NOT CAUGHT"
            ok = bool(caught)
        except RuntimeError as e:
            status = "caught — worker raises: %s" % str(e).split(".")[0]
            ok = True
        print(("  ok    " if ok else "  MISS  ") + label + "   [" + status + "]")
        worst |= 0 if ok else 1
    print("CONTROL CLEAN — every mutant caught" if not worst
          else "CONTROL FAILED — a mutant sailed through")
    return worst


if __name__ == "__main__":
    sys.exit(main())
