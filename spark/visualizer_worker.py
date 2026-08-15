#!/usr/bin/env python3
"""
Cardinal Exterior Visualizer — the DGX Spark worker.

Runs ON the Spark box, beside ComfyUI. Claims queued jobs from Supabase, runs
the segmentation + inpainting graphs, pushes the finished render back, marks
the job done or failed.

    python3 visualizer_worker.py

────────────────────────────────────────────────────────────────────────────
WHY THERE IS NO TUNNEL

This worker reaches OUT to Supabase. Nothing reaches in. There is no
cloudflared, no Tailscale Funnel, no HTTPS endpoint, no inbound port, and
therefore no perimeter to secure. That is not a shortcut — it is what lets
DGX_SPARK_ILLUSTRATIONS.md's settled rule ("do not wire the Spark into the app
as a live dependency") hold BY CONSTRUCTION. An in-home pitch reads finished
rows out of Supabase, so a sleeping box, a power cut or bad wifi cannot
produce dead air in front of a customer. It can only ever mean "that
combination has not been rendered yet."

Corollary: if you are ever tempted to add a "render now" button that calls
this box synchronously, you are re-introducing exactly the failure this
architecture was chosen to avoid. Don't.

────────────────────────────────────────────────────────────────────────────
TWO DEPARTURES FROM THE ORIGINAL PLAN, BOTH ON PURPOSE

1. NODES ARE FOUND BY TITLE, NOT BY ID.
   The obvious approach — "replace node 12's image and node 7's prompt" — is a
   trap. ComfyUI renumbers nodes whenever you edit a graph, so the first time
   you tweak the workflow in the UI the worker starts writing the prompt into
   the wrong node, and it does it SILENTLY: the graph still runs and still
   produces an image, just not the one you asked for. Here the worker matches
   on each node's `_meta.title`, so you can rearrange the graph freely as long
   as the titles survive. Missing title = loud error at startup, not a wrong
   picture at midnight.

2. ONE MASKED PASS PER SURFACE, CHAINED — NOT ONE PASS FOR EVERYTHING.
   This is the actual fix for the failure that killed the previous version:
   handing a whole house to a model with "change the roof and the siding"
   repaints the entire photograph. Each pass here is masked to ONE region and
   carries ONE unambiguous prompt, and the output of each becomes the input of
   the next. Roof first (biggest area), then siding, then the small overlay
   details, so trim and gutters land on top of finished walls.

────────────────────────────────────────────────────────────────────────────
DEPENDENCIES
    pip install requests websocket-client pillow

ENVIRONMENT (put these in a .env beside this file, or export them)
    SUPABASE_URL           https://<ref>.supabase.co
    SUPABASE_SERVICE_KEY   the SERVICE ROLE key. Stays on this box. It never
                           goes near a browser, a commit or a chat message.
    COMFY_URL              http://127.0.0.1:8188   (default)
    WORKER_NAME            defaults to the hostname — a stuck job names its box
    POLL_SECONDS           default 5
"""

import base64
import hashlib
import io
import json
import os
import signal
import socket
import sys
import time
import uuid
from pathlib import Path

try:
    import requests
    import websocket                      # websocket-client
    from PIL import Image, ImageChops
except ImportError as e:                  # a missing dep should say which
    sys.exit("Missing dependency: %s\n  pip install requests websocket-client pillow" % e.name)

HERE = Path(__file__).resolve().parent

# ── config ────────────────────────────────────────────────────────────────
def _load_dotenv():
    """Minimal .env reader. No dependency, and it must never clobber a real
    environment variable — an explicit export beats a stale file."""
    p = HERE / ".env"
    if not p.exists():
        return
    for line in p.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))

_load_dotenv()

SUPABASE_URL = (os.environ.get("SUPABASE_URL") or "").rstrip("/")
SERVICE_KEY  = os.environ.get("SUPABASE_SERVICE_KEY") or ""
COMFY_URL    = (os.environ.get("COMFY_URL") or "http://127.0.0.1:8188").rstrip("/")
WORKER_NAME  = os.environ.get("WORKER_NAME") or socket.gethostname()
POLL_SECONDS = float(os.environ.get("POLL_SECONDS") or 5)
BUCKET       = "photos"
# The long edge every photograph is fitted to before FLUX sees it. Tunable
# without a code change because the right value is a trade against render time
# and nobody has measured it on real photographs yet. See fit_for_flux().
FLUX_LONG_EDGE = int(os.environ.get("FLUX_LONG_EDGE") or 1280)

if not SUPABASE_URL or not SERVICE_KEY:
    sys.exit("SUPABASE_URL and SUPABASE_SERVICE_KEY are required (see the docstring).")

# The order matters: big areas first, so the small overlay details land on top
# of finished walls rather than being painted over by them.
SURFACE_ORDER = ["roof", "siding", "trim", "windows", "gutters"]

# Node titles this worker writes into. Set these in ComfyUI via right-click →
# "Title" on each node. See spark/VISUALIZER_SETUP.md.
T_IMAGE    = "CARDINAL_IMAGE"      # LoadImage      — the working photograph
T_MASK     = "CARDINAL_MASK"       # LoadImage      — this surface's mask
T_POSITIVE = "CARDINAL_POSITIVE"   # CLIPTextEncode — the material prompt
T_NEGATIVE = "CARDINAL_NEGATIVE"   # CLIPTextEncode — what must not appear
T_OUTPUT   = "CARDINAL_OUTPUT"     # SaveImage
T_SAMPLER  = "CARDINAL_SAMPLER"    # KSampler       — the seed goes here
T_SEG_IN   = "CARDINAL_SEG_IMAGE"  # LoadImage in the segmentation graph

_stop = False
def _on_signal(_sig, _frm):
    global _stop
    _stop = True
    log("signal received — will release the current job and exit")
signal.signal(signal.SIGINT,  _on_signal)
signal.signal(signal.SIGTERM, _on_signal)


def log(msg):
    print("[%s] %s" % (time.strftime("%H:%M:%S"), msg), flush=True)


# ── Supabase (plain REST — fewer moving parts than a client library) ───────
def _headers(extra=None):
    h = {
        "apikey": SERVICE_KEY,
        "Authorization": "Bearer " + SERVICE_KEY,
        "Content-Type": "application/json",
    }
    if extra:
        h.update(extra)
    return h


def claim_job():
    """Ask Postgres for the next job. The FOR UPDATE SKIP LOCKED inside
    claim_design_job() is what guarantees two workers never take the same
    row — do not reimplement this as a SELECT then an UPDATE."""
    r = requests.post(SUPABASE_URL + "/rest/v1/rpc/claim_design_job",
                      headers=_headers(), json={"p_worker": WORKER_NAME}, timeout=30)
    r.raise_for_status()
    j = r.json()
    if not j:
        return None
    row = j[0] if isinstance(j, list) else j
    # claim_design_job() is `returns public.design_jobs` — a COMPOSITE. When it
    # returns null, PostgREST does not send null; it sends a row with every
    # column set to null: {"id": null, "project_id": null, …}. That dict is
    # non-empty, so `if not j` above sails straight past it and the worker
    # treats an empty queue as a job it can never do. Observed live: two real
    # jobs failed, then several hundred phantom claims a second, each one dying
    # on `"…?id=eq." + None` and unable to record its own failure.
    # The id is the only field that can never legitimately be null.
    if not row.get("id"):
        return None
    return row


def patch_job(job_id, patch):
    r = requests.patch(
        SUPABASE_URL + "/rest/v1/design_jobs?id=eq." + job_id,
        headers=_headers({"Prefer": "return=minimal"}),
        json=dict(patch, updated_at=_now()), timeout=30)
    r.raise_for_status()


def insert_render(row):
    r = requests.post(SUPABASE_URL + "/rest/v1/design_renders",
                      headers=_headers({"Prefer": "return=representation"}),
                      json=row, timeout=30)
    r.raise_for_status()
    return r.json()[0]


def _now():
    return time.strftime("%Y-%m-%dT%H:%M:%S", time.gmtime()) + "Z"


def storage_download(path):
    r = requests.get("%s/storage/v1/object/%s/%s" % (SUPABASE_URL, BUCKET, path),
                     headers={"apikey": SERVICE_KEY,
                              "Authorization": "Bearer " + SERVICE_KEY}, timeout=120)
    r.raise_for_status()
    return r.content


def storage_upload(path, data, content_type="image/jpeg"):
    r = requests.post("%s/storage/v1/object/%s/%s" % (SUPABASE_URL, BUCKET, path),
                      headers={"apikey": SERVICE_KEY,
                               "Authorization": "Bearer " + SERVICE_KEY,
                               "Content-Type": content_type,
                               "x-upsert": "true"},
                      data=data, timeout=300)
    r.raise_for_status()
    return path


# ── ComfyUI ───────────────────────────────────────────────────────────────
class Comfy:
    def __init__(self, base):
        self.base = base
        self.client_id = str(uuid.uuid4())

    def up(self):
        try:
            requests.get(self.base + "/system_stats", timeout=5).raise_for_status()
            return True
        except Exception:
            return False

    def upload_image(self, name, data):
        """Put an image into ComfyUI's input folder so a LoadImage node can
        reference it by filename."""
        r = requests.post(self.base + "/upload/image",
                          files={"image": (name, data, "image/png")},
                          data={"overwrite": "true"}, timeout=120)
        r.raise_for_status()
        j = r.json()
        # ComfyUI answers with the name it actually stored, which may differ.
        return j.get("name", name)

    def run(self, graph, timeout=600):
        """Queue a graph and block until it finishes. Returns the prompt_id.

        The websocket is opened BEFORE queueing. Opening it after is a race:
        a fast graph can finish before the socket attaches and then the worker
        waits out the full timeout on a job that is already done."""
        ws = websocket.WebSocket()
        ws.connect("%s/ws?clientId=%s" % (self.base.replace("http", "ws", 1), self.client_id),
                   timeout=30)
        try:
            r = requests.post(self.base + "/prompt",
                              json={"prompt": graph, "client_id": self.client_id}, timeout=60)
            if r.status_code >= 400:
                # ComfyUI puts the real reason (a bad node, a missing model) in
                # the body. Surface it — a bare status code has cost this
                # project whole days before.
                raise RuntimeError("ComfyUI refused the graph: %s" % _short(r.text))
            prompt_id = r.json()["prompt_id"]

            deadline = time.time() + timeout
            ws.settimeout(30)
            while time.time() < deadline:
                if _stop:
                    raise RuntimeError("worker was asked to stop mid-render")
                try:
                    msg = ws.recv()
                except websocket.WebSocketTimeoutException:
                    continue
                if not isinstance(msg, str):
                    continue                       # binary preview frame
                m = json.loads(msg)
                t, d = m.get("type"), m.get("data", {})
                if d.get("prompt_id") not in (None, prompt_id):
                    continue
                if t == "execution_error":
                    raise RuntimeError("ComfyUI error: %s" %
                                       _short(d.get("exception_message") or json.dumps(d)))
                if t == "execution_interrupted":
                    raise RuntimeError("ComfyUI interrupted the run")
                if t == "executing" and d.get("node") is None:
                    return prompt_id               # graph complete
            raise RuntimeError("ComfyUI did not finish within %ds" % timeout)
        finally:
            try:
                ws.close()
            except Exception:
                pass

    def outputs(self, prompt_id):
        r = requests.get(self.base + "/history/" + prompt_id, timeout=60)
        r.raise_for_status()
        return r.json().get(prompt_id, {}).get("outputs", {})

    def node_schema(self, class_type):
        """What inputs a node class actually takes, from ComfyUI itself.

        Cached per process. Returns {} if the server will not say, which the
        caller must treat as "fill nothing" rather than "fill everything".
        """
        if not hasattr(self, "_schema_cache"):
            self._schema_cache = {}
        if class_type in self._schema_cache:
            return self._schema_cache[class_type]
        try:
            r = requests.get(self.base + "/object_info/" + class_type, timeout=30)
            r.raise_for_status()
            info = (r.json() or {}).get(class_type) or {}
        except Exception as e:
            log("    could not read the schema for %s (%s) — sending the graph as written"
                % (class_type, _short(e, 60)))
            info = {}
        self._schema_cache[class_type] = info
        return info

    def fill_defaults(self, graph, class_type):
        """Add every REQUIRED input the node declares and the graph omits,
        using the node's own default.

        This narrows one class of mistake: a parameter name written from
        memory. Sam2AutoSegmentation takes a dozen widget inputs, and guessing
        them into the JSON is how a graph gets rejected at submit time — or
        accepted with a value that means something else. Asking the node what
        it wants removes the guess. It does not make the graph correct; the
        wiring and the tuned values can still be wrong.
        Values already present in the graph are never overwritten — the two we
        deliberately tune stay tuned.

        Returns the names it filled, so the log can say.
        """
        info = self.node_schema(class_type)
        req = ((info.get("input") or {}).get("required") or {})
        added = []
        for nid, node in graph.items():
            if node.get("class_type") != class_type:
                continue
            ins = node.setdefault("inputs", {})
            for name, spec in req.items():
                if name in ins:
                    continue
                # spec is [type, {...opts}] or [[choices], {...}]
                opts = spec[1] if len(spec) > 1 and isinstance(spec[1], dict) else {}
                if "default" in opts:
                    ins[name] = opts["default"]
                    added.append(name)
                elif isinstance(spec[0], list) and spec[0]:
                    ins[name] = spec[0][0]          # an enum — take the first
                    added.append(name)
                # A required input with no default and no choices is a LINK
                # (IMAGE, MASK, SAM2MODEL…). Those are the graph's job, and
                # inventing one would be worse than the error you get without.
        return added

    def force_automask(self, graph):
        """Load the SAM2 model as an automatic mask generator.

        `Sam2AutoSegmentation` will not accept an ordinary SAM2 model. The
        loader's `segmentor` enum is what decides, and regions_api.json shipped
        `single_image` — the mode the OTHER graph wants — so ComfyUI rejected
        it with "Loaded model is not SAM2AutomaticMaskGenerator". Same
        checkpoint file, different wrapper; no new download.

        The enum's spelling comes from the node rather than from me. Writing a
        parameter value from memory is the mistake that has cost the most on
        this feature, and a mode name is exactly the sort of thing a node pack
        renames between versions.

        Unlike fill_defaults() this DOES overwrite what the graph carries: the
        shipped value is known to be wrong for this graph. Returns the mode it
        set, or None when the schema could not be read and the graph's own
        value was left alone.
        """
        LOADER = "DownloadAndLoadSAM2Model"
        nodes = [n for n in graph.values() if n.get("class_type") == LOADER]
        if not nodes:
            return None
        spec = (((self.node_schema(LOADER).get("input") or {}).get("required") or {})
                .get("segmentor") or [])
        choices = spec[0] if spec and isinstance(spec[0], list) else []
        if not choices:
            log("    could not read the SAM2 loader's segmentor list — sending "
                "the graph's own %r, which may be refused"
                % (nodes[0].get("inputs", {}).get("segmentor")))
            return None
        pick = next((c for c in choices if "automask" in c.lower().replace("_", "")), None)
        if pick is None:
            pick = next((c for c in choices if c.lower().startswith("auto")), None)
        if pick is None:
            raise RuntimeError(
                "the SAM2 loader offers no automatic-mask mode — it lists %s. "
                "Sam2AutoSegmentation cannot run without one."
                % ", ".join(map(str, choices)))
        for n in nodes:
            n.setdefault("inputs", {})["segmentor"] = pick
        return pick

    def fetch(self, meta):
        r = requests.get(self.base + "/view",
                         params={"filename": meta["filename"],
                                 "subfolder": meta.get("subfolder", ""),
                                 "type": meta.get("type", "output")}, timeout=120)
        r.raise_for_status()
        return r.content


def _short(s, n=300):
    s = " ".join(str(s).split())
    return s if len(s) <= n else s[:n] + "…"


# ── graph patching, by TITLE ──────────────────────────────────────────────
def find_node(graph, title):
    """Return the node id whose _meta.title matches. Raises loudly when it is
    absent: a silently-unpatched graph renders the WRONG THING, which is far
    more expensive than a crash at startup."""
    for nid, node in graph.items():
        if (node.get("_meta") or {}).get("title") == title:
            return nid
    raise RuntimeError(
        'No node titled "%s" in the workflow. In ComfyUI, right-click the node '
        "→ Title, and set it exactly. See spark/VISUALIZER_SETUP.md." % title)


def set_input(graph, title, key, value):
    graph[find_node(graph, title)]["inputs"][key] = value


def load_graph(name):
    p = HERE / name
    if not p.exists():
        raise RuntimeError(
            "%s is missing. Build the graph in ComfyUI, then Developer Mode → "
            "Save (API Format) and put it here. See spark/VISUALIZER_SETUP.md." % name)
    return json.loads(p.read_text())


# ── the pipeline ──────────────────────────────────────────────────────────
# Surfaces whose detection chain must never be able to fail a whole job.
# ⚠ gutters was added on 15 Aug by hand-writing nodes 40-44 into
# segment_api.json. If Florence2 finds no gutter on an elevation — and a thin
# gutter line is far more missable than a window — an empty bbox list reaching
# SAM 2 can raise inside ComfyUI, and that takes down the ENTIRE segmentation,
# not just gutters. The customer then gets a failed render because of a surface
# they did not ask about.
#
# 830: node 40 grounds on "rain gutter . downspout", not "rain gutter". The
# trough and the downspout are two OBJECTS, so grounding the trough alone left
# the downspout out of the gutters mask — and because siding subtracts the
# detail masks from itself (DETAIL_WINS below), an unmasked downspout was being
# painted as siding. Same class as Theo's "It also painted the gutter" on the
# 15th, one object further down the wall.
#
# ⚠ The dot separator is Grounding DINO's list convention and this node is
# Florence2, which grounds noun phrases inside a caption. It is not the
# documented syntax for this model, so it is plausible rather than proven —
# and it is UNVERIFIED BY EYE. If the mask comes back empty, OPTIONAL_MASKS is
# what keeps that from failing the whole job; if it comes back too big, the
# tell is a hole carved out of the siding. Either way the fix is a separate
# downspouts pass, not a longer prompt.
OPTIONAL_MASKS = ("gutters",)


def _drop_mask_chain(graph, surface):
    """Remove a surface's SaveImage so ComfyUI never executes its chain.

    Deleting only the output node is enough and is why this is safe: ComfyUI
    executes backwards from outputs, so with nothing asking for that mask the
    whole Florence2 -> SAM 2 branch simply goes unrun. No renumbering, no
    dangling links, nothing else touched.
    """
    title = "CARDINAL_MASK_" + surface.upper()
    for nid, n in list(graph.items()):
        if (n.get("_meta") or {}).get("title") == title:
            del graph[nid]
            return True
    return False


def segment(comfy, image_png):
    """Run SAM 2 once and get a mask per surface.

    Returns {surface: png_bytes}. Surfaces the model could not find are simply
    absent, and the caller skips them — a house with no visible gutters is not
    an error."""
    graph = load_graph("segment_api.json")
    name = comfy.upload_image("cardinal_seg.png", image_png)
    set_input(graph, T_SEG_IN, "image", name)

    try:
        pid = comfy.run(graph, timeout=300)
    except Exception as e:
        # Retry without the optional chains before giving up. The surfaces the
        # job actually asked for matter; a gutter it never mentioned does not.
        dropped = [s for s in OPTIONAL_MASKS if _drop_mask_chain(graph, s)]
        if not dropped:
            raise
        log("    segmentation failed (%s) — retrying without %s"
            % (_short(e, 80), ", ".join(dropped)))
        pid = comfy.run(graph, timeout=300)
    out = comfy.outputs(pid)

    masks = {}
    # Each SaveImage node in the segmentation graph is titled CARDINAL_MASK_<surface>.
    for nid, payload in out.items():
        title = (graph.get(nid, {}).get("_meta") or {}).get("title", "")
        if not title.startswith("CARDINAL_MASK_"):
            continue
        surface = title[len("CARDINAL_MASK_"):].lower()
        images = payload.get("images") or []
        if not images:
            continue
        # ⚠ NOT images[0]. With individual_objects=true a surface comes back
        # as one image PER OBJECT, and taking the first silently discards the
        # rest — a roof whose second plane was found and then thrown away
        # renders exactly like a roof whose second plane was never found.
        # Union, because the rest of this pipeline is one mask per surface;
        # keeping them apart is the tap-a-plane feature and a much bigger
        # change. This preserves today's contract and stops the silent loss.
        pngs = [comfy.fetch(m) for m in images]
        if len(pngs) > 1:
            log("    %s came back as %d objects — unioned" % (surface, len(pngs)))
        masks[surface] = pngs[0] if len(pngs) == 1 else union_masks(pngs)
    return masks


def union_masks(pngs):
    """One surface mask from N object masks — per-pixel max.

    `lighter` rather than a paste or an add: a paste would overwrite a lit
    pixel with an unlit one wherever the masks overlap, and an add would
    saturate the soft edges SAM 2 produces into a hard fringe.
    """
    base = Image.open(io.BytesIO(pngs[0])).convert("L")
    for p in pngs[1:]:
        m = Image.open(io.BytesIO(p)).convert("L")
        if m.size != base.size:
            m = m.resize(base.size, Image.LANCZOS)
        base = ImageChops.lighter(base, m)
    buf = io.BytesIO()
    base.save(buf, format="PNG")
    return buf.getvalue()


# Detail beats plane. Florence2 grounds "house wall" as a BOX and SAM 2 fills
# it, so the siding mask legitimately swallows everything sitting on that wall
# — windows, trim, and the gutter running along the top of it.
DETAIL_WINS = ["windows", "trim", "gutters", "roof", "siding"]


def exclusive(masks):
    """Stop one surface's mask from covering another's.

    ⚠ Theo, 15 Aug: "It also painted the gutter." The siding mask is grounded
    on the phrase "house wall", which is a BOX around the whole elevation —
    so SAM 2 fills in the gutter along its top edge, the trim, and the windows,
    and all of them get painted as siding. The windows were already being
    recoloured this way and nobody had noticed, because a window tinted toward
    a siding colour looks like a reflection.

    The masks are made independently and nothing ever reconciled them. This
    subtracts the smaller, more specific surfaces from the larger ones, in the
    order above: a pixel claimed by "windows" stops being siding.

    It cannot invent a mask that was never made — if the segmenter found no
    gutters in a photograph, there is nothing to subtract and the gutter stays
    part of the wall. That case needs a gutters pass in segment_api.json and
    it is called out in VISUALIZER_SETUP.md rather than pretended away.
    """
    if len(masks) < 2:
        return masks
    order = [s for s in DETAIL_WINS if s in masks] + \
            [s for s in masks if s not in DETAIL_WINS]
    out, claimed = {}, None
    for surface in order:
        try:
            m = Image.open(io.BytesIO(masks[surface])).convert("L")
        except Exception:
            out[surface] = masks[surface]
            continue
        if claimed is not None:
            if claimed.size != m.size:
                claimed = claimed.resize(m.size, Image.LANCZOS)
            # keep only what nothing more specific has already taken
            m = ImageChops.subtract(m, claimed)
        buf = io.BytesIO()
        m.save(buf, format="PNG")
        out[surface] = buf.getvalue()
        claimed = m if claimed is None else ImageChops.lighter(
            claimed.resize(m.size, Image.LANCZOS) if claimed.size != m.size else claimed, m)
    return out


def seed_for(job_id, surface):
    """A seed that is stable for one job+surface and different for every other.

    The graph ships with a seed baked in, and the worker used to leave it
    alone — so every render in the app's history would have used the same
    number. Same photograph + same material + same seed is byte-identical
    output, which means "render it again" hands the rep back the picture they
    just rejected. The first time that happens in front of a customer is the
    wrong time to discover it.

    Derived rather than random on purpose: a given job always reproduces, so a
    retry after a crash yields the same image and a bad render can be
    investigated. A NEW job gets a new id, and therefore a genuinely different
    look. hashlib, not hash() — the built-in is salted per process and would
    make the same job irreproducible across restarts."""
    h = hashlib.sha256(("%s/%s" % (job_id, surface)).encode("utf-8")).digest()
    return int.from_bytes(h[:6], "big")   # < 2^48, well inside ComfyUI's range


# How much of the region's colour comes from the swatch rather than from the
# model, and how much of the original texture survives the diffusion pass.
# Both are env-tunable because the right values are a matter of taste on real
# photographs and only Theo's eyes can settle them.
TINT_STRENGTH = float(os.environ.get("TINT_STRENGTH") or 0.85)
FLUX_DENOISE  = float(os.environ.get("FLUX_DENOISE")  or 0.82)

# ── recolour or restyle ───────────────────────────────────────────────────
# ⚠ THE DEFAULT IS RECOLOUR, AND THE REASON IS THE WHOLE POINT OF THE TOOL.
#
# Theo, 15 Aug, on a render of a house whose siding had just been installed:
#   "the picture is of a new siding install completed. The original siding one
#    looks great but when rendered it looks warped and wouldn't sell a job"
#
# He is right, and it is not a tuning problem. That photograph ALREADY has
# everything a render needs: straight lap lines, correct perspective, real
# shadows under every course, real reflections. The only thing being asked for
# is a different COLOUR. Sending it through a diffusion model at denoise 0.82
# throws all of that away and redraws it from scratch — and a model redrawing
# a large angled plane of horizontal lines makes them wander. That is the
# warping. We destroyed geometry we had no reason to touch.
#
# So: for a colour change, do not diffuse. tint() alone changes the colour and
# keeps the photograph's own geometry, which is why it looks photographic —
# because it IS the photograph. It is also exact (no model to pull the colour
# back toward tan) and about forty times faster.
#
# Reach for the model when the MATERIAL changes, not the colour: lap siding to
# board-and-batten, a 3-tab roof to a dimensional architectural shingle, or a
# surface too damaged to recolour convincingly.
#
#   RENDER_MODE=recolour   (default)  tint only. The photograph, in the new
#                                     colour. Fast, exact, and it sells.
#   RENDER_MODE=restyle               tint + FLUX. Use when the material
#                                     itself is changing.
# ⚠ BUMP THIS ON EVERY WORKER CHANGE. Found the hard way, three times in one
# night: a render looked wrong, and nobody could prove WHICH code produced it.
# The Spark was variously running a curl-copied file, a stale checkout, and a
# foreground process that predated the fix being tested — and from the outside
# every one of those looks identical: a done row and a wrong picture.
#
# So the worker stamps its build and mode into achieved._worker on every job.
# One query ends the argument:
#   select achieved->>'_worker' from design_jobs where id = '...';
#   null                      -> a worker from before 15 Aug ran it
#   "wb-2026-08-15.7 recolour" -> this code, this mode
WORKER_BUILD = "wb-2026-08-15.12"

# 823 — why a selected surface came back unchanged. These two codes are the
# CONTRACT with the browser: visualizer/index.html carries the same two keys
# and turns them into a sentence for a rep. Adding a third here without adding
# it there degrades to showing the bare code, which is ugly but not wrong —
# so a new reason is safe to ship worker-first. Removing or renaming one is
# NOT: the browser would silently stop explaining a real skip.
SKIP_REASON = {
    "not_found": "the segmenter could not find it in this photograph",
    "no_hex":    "that swatch carries no colour value",
}


def skip_reason(surface, sel, masks, restyle):
    """Why this SELECTED surface cannot be changed — or None if it can.

    Pulled out of run_job so it can be tested without ComfyUI, a GPU or a
    photograph. It used to be two `continue`s buried a hundred lines into a
    function that needs all three, which is the practical reason nobody ever
    checked that the skip travelled anywhere.

    The order is load-bearing: no mask beats no hex. A surface the segmenter
    never found is not made changeable by having a colour, and reporting
    "no colour value" for a surface that is not in the picture sends a rep to
    fix the wrong thing.
    """
    if surface not in masks:
        return "not_found"
    # In restyle mode the prompt carries the colour, so a hexless swatch is
    # workable. In recolour mode the tint IS the render and there is nothing
    # to tint toward.
    if not (sel or {}).get("hex") and not restyle:
        return "no_hex"
    return None

RENDER_MODE = (os.environ.get("RENDER_MODE") or "recolour").strip().lower()
if RENDER_MODE not in ("recolour", "recolor", "restyle"):
    RENDER_MODE = "recolour"
RESTYLE = RENDER_MODE == "restyle"


def _hex_rgb(h):
    h = (h or "").strip().lstrip("#")
    if len(h) == 3:
        h = "".join(c * 2 for c in h)
    if len(h) != 6:
        return None
    try:
        return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))
    except ValueError:
        return None


def tint(image_png, mask_png, hex_colour, strength=None):
    """Recolour the masked region toward a swatch, KEEPING its luminance.

    ────────────────────────────────────────────────────────────────────────
    WHY THIS EXISTS — the colour has to be in the PIXELS, not only the words.

    Theo, 15 Aug, on a render of Evergreen Mist roof + Charcoal Gray siding:
    "Wrong color on both." The roof came back tan and the siding came back a
    generic grey. Nothing was broken: the masks were real, the loop paired
    each mask with its own prompt, and the prompts stored on the job named
    both colours correctly.

    The cause is `denoise = 1` with `noise_mask = True`. That regenerates the
    masked region FROM PURE NOISE — nothing of the original survives inside
    the mask — so the only thing steering colour is the text. FLUX.1 Fill dev
    is distilled and runs at cfg 1, where colour words are weakly enforced,
    and it falls back on whatever is most likely: tan for asphalt shingle,
    grey for siding.

    It is also why the early renders looked right and hid this. Onyx Black
    and Black Sable are near-black — simultaneously the commonest shingle
    colour in the training data AND a strongly represented word. A muted sage
    green is neither. The pipeline was never reading the swatch; it was
    agreeing with it by luck.

    ────────────────────────────────────────────────────────────────────────
    WHY THE SHADING SURVIVES, and why a flat fill will not do

    Painting the region flat destroys exactly what makes a render believable:
    the shading across a roof plane, the shadow a tree throws, the darker
    course lines. So the region's lightness is RE-CENTRED on the swatch and
    every pixel keeps its distance from the mean — a shaded part of the roof
    stays shaded, in the new colour, at the new lightness.

    ⚠ Keeping lightness EXACTLY, which is what the first version did, is not
    good enough and the section on lightness below says why with numbers.

    Paired with denoise below 1 the diffusion pass then re-textures the region
    as shingle or lap siding while the hue underneath survives. Either half
    alone fails: tinting with denoise 1 is thrown away, and lowering denoise
    without tinting just preserves the ORIGINAL colour, which is the tan roof
    we started with.
    """
    rgb = _hex_rgb(hex_colour)
    if not rgb:
        return image_png                      # no swatch, nothing to steer with
    k = TINT_STRENGTH if strength is None else strength
    k = max(0.0, min(1.0, k))
    if k == 0.0:
        return image_png

    im = Image.open(io.BytesIO(image_png)).convert("RGB")
    mk = Image.open(io.BytesIO(mask_png)).convert("L")
    if mk.size != im.size:
        mk = mk.resize(im.size, Image.LANCZOS)

    # Do the recolour in LAB: keep L (all the shading), take a/b from the
    # swatch. PIL converts through ImageCms-free "LAB" mode, which is enough
    # here — we are matching a paint chip, not proofing for print.
    lab   = im.convert("LAB")
    swatch = Image.new("RGB", (1, 1), rgb).convert("LAB").getpixel((0, 0))
    L, A, B = lab.split()
    A2 = Image.new("L", im.size, swatch[1])
    B2 = Image.new("L", im.size, swatch[2])
    A = Image.blend(A, A2, k)
    B = Image.blend(B, B2, k)

    # ── lightness ────────────────────────────────────────────────────────
    # ⚠ THE FIRST VERSION KEPT L EXACTLY, AND THAT WAS WRONG. Measured on the
    # real render: a tan roof at L*184 tinted toward Evergreen Mist (L*127)
    # came out rgb(168,181,162) — a PALE SAGE — against a swatch of
    # rgb(110,122,105). The hue was right and the colour was still wrong.
    #
    # And the same +58 error hid on the siding. Charcoal over a blue-grey
    # gave rgb(134,138,141) instead of rgb(78,81,84): too light, but grey
    # against grey still READS as grey, so it looked like it worked. On a
    # chromatic colour it does not — a washed-out sage sits right beside the
    # model's tan attractor, and at denoise 0.82 FLUX pulls it back there.
    # One defect, two very different appearances. Theo saw exactly that:
    # "Siding seems working. Roof color still off."
    #
    # So move the lightness to the swatch, and keep only the VARIATION around
    # it — which is what the shading, the shadows and the course lines are.
    # Re-centre rather than flatten: every pixel keeps its distance from the
    # region's mean, the mean itself lands on the swatch.
    from PIL import ImageStat
    st = ImageStat.Stat(L, mk)
    try:
        mean_l = st.mean[0]
        sd_l = st.stddev[0] or 0.0
    except (IndexError, ZeroDivisionError):
        mean_l, sd_l = swatch[0], 0.0
    target_l = swatch[0]

    # Scale the deviations only as far as they can go without clipping. A
    # plain shift would crush the dark end of a bright roof against 0 and
    # take the shadow with it — losing the shading is the thing this whole
    # function exists to avoid.
    span = 2.5 * sd_l                       # ~99% of the region
    contrast = 1.0
    if span > 1e-6:
        contrast = min(1.0, (255.0 - target_l) / span, target_l / span)

    lut = []
    for v in range(256):
        moved = target_l + (v - mean_l) * contrast
        lut.append(max(0, min(255, int(round(v + (moved - v) * k)))))
    L = L.point(lut)

    tinted = Image.merge("LAB", (L, A, B)).convert("RGB")

    # Only inside the mask. The mask is the segmenter's own output, so its
    # soft edges feather the recolour exactly where DifferentialDiffusion
    # will feather the diffusion.
    out = Image.composite(tinted, im, mk)
    buf = io.BytesIO()
    out.save(buf, format="PNG")
    return buf.getvalue()


def measure(image_png, mask_png, hex_wanted):
    """What colour did that surface ACTUALLY come out?

    ────────────────────────────────────────────────────────────────────────
    Three times on 15 Aug a render came back the wrong colour, and the only
    evidence anyone had was a photograph of a monitor. Every diagnosis was a
    guess, and two were wrong before they were right — the last one because
    ONE defect looked fine on siding and broken on roof, which is exactly the
    kind of thing an eye cannot separate and arithmetic can.

    The worker is the only place that can see both the swatch and the
    finished pixels. So it measures, and the answer is written on the job.

    What it makes possible is a DIAGNOSIS, not just a number:

      drift SMALL and Theo unhappy -> the pipeline did its job. The swatch is
                                      wrong, or the paint chip disagrees with
                                      the eye. Do not touch the code.
      drift LARGE                  -> the tint did not land, or FLUX pulled it
                                      back. TINT_STRENGTH up, FLUX_DENOISE down.

    Those two need opposite fixes and look identical from a screenshot.
    """
    want = _hex_rgb(hex_wanted)
    if not want:
        return None
    try:
        from PIL import ImageStat
        im = Image.open(io.BytesIO(image_png)).convert("RGB")
        mk = Image.open(io.BytesIO(mask_png)).convert("L")
        if mk.size != im.size:
            mk = mk.resize(im.size, Image.LANCZOS)
        st = ImageStat.Stat(im, mk)
        got = tuple(int(round(v)) for v in st.mean[:3])
    except Exception as e:
        # Measuring must never cost a render. A job that dies taking its own
        # temperature is a worse outcome than not knowing the temperature.
        log("    could not measure the result: %s" % _short(e))
        return None
    return {
        "want": "#%02X%02X%02X" % want,
        "got":  "#%02X%02X%02X" % got,
        "drift": max(abs(got[i] - want[i]) for i in range(3)),
    }


def inpaint(comfy, image_png, mask_png, positive, negative, seed):
    graph = load_graph("inpaint_api.json")
    set_input(graph, T_IMAGE, "image", comfy.upload_image("cardinal_work.png", image_png))
    set_input(graph, T_MASK,  "image", comfy.upload_image("cardinal_mask.png", mask_png))
    set_input(graph, T_POSITIVE, "text", positive)
    set_input(graph, T_NEGATIVE, "text", negative or "")
    set_input(graph, T_SAMPLER, "seed", seed)
    # Below 1 so the tint underneath survives the pass. At denoise 1 the region
    # is rebuilt from noise and the swatch is thrown away — see tint().
    set_input(graph, T_SAMPLER, "denoise", FLUX_DENOISE)

    pid = comfy.run(graph, timeout=900)
    out = comfy.outputs(pid)
    nid = find_node(graph, T_OUTPUT)
    images = (out.get(nid) or {}).get("images") or []
    if not images:
        raise RuntimeError("the inpaint graph produced no image on %s" % T_OUTPUT)
    return comfy.fetch(images[0])


def to_png(data):
    im = Image.open(io.BytesIO(data))
    # ⚠ EXIF is dropped here, and that is load-bearing, not incidental. A phone
    # photograph of a customer's house carries GPS. Re-encoding through a fresh
    # PIL image keeps the pixels and none of the metadata, which is how the
    # CONTRACTOR_VISION_SUITE GPS exclusion holds on this path.
    im = im.convert("RGB")
    buf = io.BytesIO()
    im.save(buf, format="PNG")
    return buf.getvalue()


def fit_for_flux(png):
    """Put the working image inside FLUX's operating band before anything is
    masked or painted. Returns (png, (was_w, was_h), (now_w, now_h)).

    FLUX Fill is trained around 1024px and BOTH directions hurt. Hand it a
    small photograph and there are not enough pixels to build a shingle course
    out of — the fill comes back as a grey smear that reads, correctly, as
    "that doesn't look like a roof". Hand it a 12MP original and the model is
    running far outside its training distribution, slowly, and the texture goes
    soft the same way. The first real render hit the first case: a 43 KB source.

    This runs BEFORE segmentation on purpose. Every mask is then generated at
    the working size and matches it exactly. Resizing masks afterwards instead
    shifts every boundary by a pixel or two, which shows up as a fringe of the
    old colour along the edge of the new roof.

    Multiples of 16 because the VAE downsamples by 8 and FLUX patchifies by 2;
    an odd size gets padded internally and the padding can show as a seam."""
    im = Image.open(io.BytesIO(png)).convert("RGB")
    w, h = im.size
    scale = FLUX_LONG_EDGE / float(max(w, h))
    nw = max(16, int(round(w * scale / 16.0)) * 16)
    nh = max(16, int(round(h * scale / 16.0)) * 16)
    if (nw, nh) == (w, h):
        return png, (w, h), (w, h)          # no re-encode when nothing changes
    # LANCZOS in both directions. The upscale is deliberately NOT a smart one:
    # the masked region is about to be repainted, so detail invented there
    # would be discarded anyway, and the region outside the mask only has to
    # avoid looking processed.
    buf = io.BytesIO()
    im.resize((nw, nh), Image.LANCZOS).save(buf, format="PNG")
    return buf.getvalue(), (w, h), (nw, nh)


def to_jpeg(data, max_px, quality):
    im = Image.open(io.BytesIO(data)).convert("RGB")
    if max(im.size) > max_px:
        im.thumbnail((max_px, max_px), Image.LANCZOS)
    buf = io.BytesIO()
    im.save(buf, format="JPEG", quality=quality, optimize=True)
    return buf.getvalue()


REGION_MAX = 40          # how many regions the picker will ever be handed
REGION_MIN_PCT = 0.30    # ignore anything smaller than this share of the frame


def run_regions_job(comfy, job, job_id, started):
    """Segment the photograph into every region, for a person to label.

    No text prompt, no Florence2, no phrase. Two photographs of the same
    house on 15 Aug produced very different masks, because a phrase that
    grounds correctly on one angle grounded the whole building on another —
    so tuning the phrase trades one house for the next. Here the machine
    proposes regions and a person says which is the roof, which is Theo's own
    doctrine from The Walk.

    This removes the phrase as a failure mode. It does not make the regions
    right: SAM 2 can still split a roof across a shadow line or merge a wall
    with the garage door, and the picker is what that costs.
    """
    source = storage_download(job["source_path"])
    fitted, was, now = fit_for_flux(to_png(source))
    frame = Image.open(io.BytesIO(fitted)).size
    log("  regions pass — %dx%d" % frame)

    graph = load_graph("regions_api.json")
    mode = comfy.force_automask(graph)
    if mode:
        log("    SAM2 loaded as %s" % mode)
    added = comfy.fill_defaults(graph, "Sam2AutoSegmentation")
    if added:
        log("    filled from the node's own schema: %s" % ", ".join(sorted(set(added))))
    name = comfy.upload_image("cardinal_regions.png", fitted)
    set_input(graph, T_SEG_IN, "image", name)

    pid = comfy.run(graph, timeout=900)
    out = comfy.outputs(pid)

    images = []
    for nid, payload in out.items():
        if ((graph.get(nid, {}).get("_meta") or {}).get("title") or "") == "CARDINAL_REGIONS":
            images = payload.get("images") or []
            break
    if not images:
        raise RuntimeError("the regions graph produced no masks")

    # Rank by area and keep the biggest. SAM 2's automatic mode returns
    # everything — a leaf, a shingle clump, a car door handle — and a picker
    # with two hundred choices is not a picker. Big things first is also the
    # order a person looks in: roof, walls, garage door, then detail.
    kept = []
    for meta in images:
        png = comfy.fetch(meta)
        m = Image.open(io.BytesIO(png)).convert("L")
        if m.size != frame:
            m = m.resize(frame, Image.LANCZOS)
        bw = m.point(lambda p: 255 if p >= 128 else 0)
        lit = sum(bw.histogram()[128:])
        pct = 100.0 * lit / float(frame[0] * frame[1])
        if pct < REGION_MIN_PCT:
            continue
        kept.append((pct, png, bw.getbbox()))
    kept.sort(key=lambda t: -t[0])
    kept = kept[:REGION_MAX]

    if not kept:
        raise RuntimeError(
            "Every region was smaller than %.2f%% of the frame — nothing worth "
            "showing. Try a photograph where the house fills more of the shot."
            % REGION_MIN_PCT)

    regions = {}
    for i, (pct, png, box) in enumerate(kept, 1):
        p = "visualizer/%s/region_%02d.png" % (job_id, i)
        storage_upload(p, png, "image/png")
        regions["r%02d" % i] = {"path": p, "pct": round(pct, 2), "box": list(box or ())}

    # 831: the frame those boxes are measured in. Without it the browser divides
    # box coordinates by the DISPLAYED photograph's natural size, which is the
    # original — 4032px on a phone shot against a ~1280px segmentation frame —
    # so every circle collapsed toward the top-left corner by that ratio. The
    # highlights were right the whole time because a mask PNG is full-frame and
    # aligns itself; only the box arithmetic needed to know the scale.
    # `regionsOf()` in the browser keeps only entries carrying `path`, so this
    # key is invisible to every existing consumer by construction.
    regions["_frame"] = {"w": now[0], "h": now[1]}

    took = int((time.time() - started) * 1000)
    patch_job(job_id, {
        "status": "done", "masks": regions, "finished_at": _now(),
        "duration_ms": took, "error": None,
        # No render_path and no design_renders row on purpose: this job produced
        # no picture. A gallery entry for it would be an empty card.
        "achieved": {"_worker": "%s regions" % WORKER_BUILD,
                     "_regions": len(kept)},
    })
    log("  %d region(s) kept of %d found, in %.1fs — largest %.1f%% of frame"
        % (len(kept), len(images), took / 1000.0, kept[0][0]))


POINTS_MAX = 8           # taps one job may carry, so a stuck finger cannot queue 400


def run_points_job(comfy, job, job_id, started):
    """Segment ONE surface, where a person tapped it.

    The automatic pass returned lawns, tree canopies, driveways and cars,
    because SAM 2's automatic mode is class-agnostic and this worker then kept
    the biggest regions by area — and in a real photograph the house is a third
    of the frame, cut into pieces by its own shadow, while the trees and lawn
    are large and uniform. Ranking by size selects against the building. A tap
    carries the one thing the model has no way to know: which pixel is siding.

    ⚠ THE `segmentor` ON NODE 3 MUST STAY `single_image`, and that is the
    opposite of the fix that shipped at wb-2026-08-15.8. `automaskgenerator`
    builds a generator that samples its own grid and accepts no prompt;
    `Sam2Segmentation` needs the plain predictor and answers `SAM2AutomaticMask
    Generator is not a SAM2ImagePredictor` if it is handed the other. Two
    graphs, two modes, both correct — do not make them agree.

    Coordinates arrive NORMALISED (0..1) and are scaled here. The browser has
    no way to know the fitted size, and a ratio survives every resize between
    the two of us — the same reasoning as the note above frameW() in the
    visualizer.

    The mask lands under the SAME storage name and in the same `masks` shape a
    regions job produces, so the picker, the render hand-off and exclusive()
    consume it without knowing which pass made it. One pipeline per concept.
    """
    selections = job.get("selections") or {}
    if isinstance(selections, str):
        selections = json.loads(selections)
    pts = selections.get("_points") or []
    if isinstance(pts, dict):
        pts = [pts]
    pts = [p for p in pts if isinstance(p, dict) and "x" in p and "y" in p][:POINTS_MAX]
    if not pts:
        raise RuntimeError("no tap on this job — nothing to segment")

    source = storage_download(job["source_path"])
    fitted, was, now = fit_for_flux(to_png(source))
    frame = Image.open(io.BytesIO(fitted)).size
    log("  points pass — %dx%d, %d tap(s)" % (frame[0], frame[1], len(pts)))

    # Normalised -> pixels in the fitted frame. Clamped one pixel inside the
    # edge: SAM 2 takes a point ON the boundary and returns an empty mask, and
    # an empty mask reads to a rep as "the tap did nothing".
    scaled = []
    for p in pts:
        x = min(max(float(p["x"]), 0.0), 1.0) * frame[0]
        y = min(max(float(p["y"]), 0.0), 1.0) * frame[1]
        scaled.append({"x": int(min(max(x, 1), frame[0] - 1)),
                       "y": int(min(max(y, 1), frame[1] - 1))})

    graph = load_graph("points_api.json")
    # Logged in full because the coordinate STRING is the one part of this
    # graph nothing here can verify: `coordinates_positive` is declared
    # forceInput, so the shape is whatever Florence2toCoordinates emits. If a
    # tap ever comes back empty, this line says whether the format was wrong
    # or the model simply found nothing there.
    coords = json.dumps(scaled)
    log("    coordinates_positive = %s" % coords)
    set_input(graph, "CARDINAL_POINTS", "coordinates_positive", coords)
    added = comfy.fill_defaults(graph, "Sam2Segmentation")
    if added:
        log("    filled from the node's own schema: %s" % ", ".join(sorted(set(added))))
    name = comfy.upload_image("cardinal_points.png", fitted)
    set_input(graph, T_SEG_IN, "image", name)

    pid = comfy.run(graph, timeout=900)
    out = comfy.outputs(pid)

    images = []
    for nid, payload in out.items():
        if ((graph.get(nid, {}).get("_meta") or {}).get("title") or "") == "CARDINAL_REGIONS":
            images = payload.get("images") or []
            break
    if not images:
        raise RuntimeError("the points graph produced no mask")

    png = comfy.fetch(images[0])
    m = Image.open(io.BytesIO(png)).convert("L")
    if m.size != frame:
        m = m.resize(frame, Image.LANCZOS)
    bw = m.point(lambda p: 255 if p >= 128 else 0)
    box = bw.getbbox()
    lit = sum(bw.histogram()[128:])
    pct = 100.0 * lit / float(frame[0] * frame[1])
    if not box or not lit:
        # Deliberately a rep-readable sentence: this one is shown on the iPad.
        raise RuntimeError(
            "Nothing at that spot — try the middle of the surface, away from a "
            "window or an edge.")

    # region_01 because ONE tap is ONE region. A surface built from several taps
    # arrives at the render as several paths, and union_masks() already joins
    # them — which is why this pass does not have to merge anything itself.
    p = "visualizer/%s/region_01.png" % job_id
    storage_upload(p, png, "image/png")
    # `_frame` for the same reason as the regions pass — see the note there.
    # It matters more here: a tap is answered one region at a time, so the
    # circle is the ONLY thing that tells a rep their tap was understood.
    regions = {"r01": {"path": p, "pct": round(pct, 2), "box": list(box)},
               "_frame": {"w": now[0], "h": now[1]}}

    took = int((time.time() - started) * 1000)
    patch_job(job_id, {
        "status": "done", "masks": regions, "finished_at": _now(),
        "duration_ms": took, "error": None,
        # No render_path, for the same reason a regions job has none: this
        # produced a mask, not a picture, and a gallery card for it is empty.
        "achieved": {"_worker": "%s points" % WORKER_BUILD,
                     "_points": len(scaled)},
    })
    log("  tapped region is %.1f%% of frame, in %.1fs" % (pct, took / 1000.0))


def run_job(comfy, job):
    job_id = job["id"]
    started = time.time()
    patch_job(job_id, {"status": "running", "started_at": _now()})
    log("job %s — %s" % (job_id[:8], job.get("source_path")))

    selections = job.get("selections") or {}
    if isinstance(selections, str):
        selections = json.loads(selections)

    # ── a REGIONS job, not a render ──────────────────────────────────────
    # Two jobs, no queue change. This one segments the photograph into every
    # distinct region and finishes; the rep taps which regions are roof and
    # which are siding; pressing Render queues an ORDINARY job carrying those
    # picks. A `review` stage in the queue would have meant a worker that
    # pauses, and a paused worker is a stuck worker the first time a tab
    # closes.
    #
    # Marked by an underscore key in `selections`, matching the convention
    # already on this row (`achieved._worker`, `achieved._skipped`) — and
    # costing no migration, which matters because the alternative was a column
    # plus a claim-function change to ship before the writer.
    if selections.get("_regions"):
        run_regions_job(comfy, job, job_id, started)
        return

    # ── a POINTS job: one tap, one mask ──────────────────────────────────
    # Same trick as above and for the same reasons — an underscore key on
    # `selections`, no column, no migration, no change to the claim function.
    # Checked after `_regions` only because that one shipped first; the two are
    # mutually exclusive and the browser never sets both.
    if selections.get("_points"):
        run_points_job(comfy, job, job_id, started)
        return

    # ── 829: an underscore key this worker does not know is a STALE WORKER ──
    # Underscore keys are modes, not surfaces. Every one of them is handled by
    # a branch above; reaching here with one means the browser is newer than
    # this process.
    #
    # Without this the job fell through to the ordinary render path, which
    # segmented all four surfaces, looked for a mask named `_points`, found
    # none, and told the rep:
    #
    #   "the segmenter did not find _points in this photograph.
    #    Try a straighter, less obstructed shot of the elevation."
    #
    # That sentence sent us hunting a photography problem for an hour when the
    # Spark simply had not been restarted after 827. A mode key is not a
    # surface and must never be printed as one.
    #
    # Note the honest limit: this guard only speaks once the NEW code is
    # running, so it cannot report the very stall that prompted it. It is here
    # for the next time the browser outruns the worker, which is now twice.
    unknown_modes = sorted(k for k in selections if k.startswith("_"))
    if unknown_modes:
        raise RuntimeError(
            "This job needs a newer worker. It asks for %s, which %s does not "
            "understand. On the Spark: git pull, then restart the worker."
            % (", ".join(unknown_modes), WORKER_BUILD))

    source = storage_download(job["source_path"])
    working = to_png(source)
    # Segmentation (and FLUX, in restyle mode) want the ~1280px band. The
    # RENDER does not. Found in the 15 Aug audit: recolour mode was still
    # downscaling the photograph to 1280px — a quality loss inherited from the
    # FLUX path for no reason, since no diffusion ever runs. Now the masks are
    # made on the fitted copy and scaled up by tint()/measure(), which both
    # already resize a mask to the image they are given, and the photograph
    # keeps every pixel it arrived with.
    fitted, was, now = fit_for_flux(working)
    if was != now:
        log("  %dx%d -> %dx%d for segmentation%s"
            % (was[0], was[1], now[0], now[1], " + FLUX" if RESTYLE else
               " — the render keeps %dx%d" % was))
    else:
        log("  %dx%d — already in the segmentation band" % now)
    if RESTYLE:
        working = fitted   # FLUX needs its band, and image must match mask

    log("  mode: %s" % ("restyle — the model redraws each surface"
                          if RESTYLE else
                          "recolour — the photograph keeps its own geometry"))
    log("  segmenting…")
    # ── hand-picked regions beat anything a phrase found ─────────────────
    # If every selected surface was labelled by hand there is nothing left for
    # the segmenter to do, and skipping it saves a Florence2 + SAM 2 load.
    picked = {s: (sel or {}).get("_regions") for s, sel in selections.items()
              if isinstance(sel, dict) and (sel or {}).get("_regions")}
    want = [s for s in selections if selections.get(s)]

    if picked and all(s in picked for s in want):
        masks = {}
        log("  every surface was labelled by hand — skipping segmentation")
    else:
        masks = segment(comfy, fitted)
        log("  found: %s" % (", ".join(sorted(masks)) or "nothing"))

    for surface, paths in picked.items():
        pngs = [storage_download(p) for p in paths]
        masks[surface] = pngs[0] if len(pngs) == 1 else union_masks(pngs)
        log("    %s: %d hand-picked region(s)" % (surface, len(pngs)))

    # Reconcile them before anything is painted — see exclusive().
    # ⚠ Hand-picked masks go through exclusive() TOO, deliberately: if a rep
    # labels a region as both roof and window, the detail still wins, exactly
    # as it would for a found mask. Exempting them would make two paths where
    # there is one.
    masks = exclusive(masks)

    # Persist the masks: the presentation app overlays them so a rep can tap a
    # region of the house and have the sidebar jump to that surface.
    mask_paths = {}
    for surface, png in masks.items():
        p = "visualizer/%s/mask_%s.png" % (job_id, surface)
        storage_upload(p, png, "image/png")
        mask_paths[surface] = p
    if mask_paths:
        patch_job(job_id, {"masks": mask_paths})

    # 823: skipped is a MAP now, surface -> reason. A rep is told to do two
    # different things by the two reasons ("shoot the elevation again" vs
    # "that swatch carries no colour"), so collapsing them into one list
    # throws away the half that says what to do next.
    applied, skipped, achieved = [], {}, {}
    for surface in SURFACE_ORDER:
        sel = selections.get(surface)
        if not sel:
            continue
        why = skip_reason(surface, sel, masks, RESTYLE)
        if why:
            # Not a failure. Say plainly which surface is coming back
            # untouched and why, then carry on with the rest.
            log("    %s NOT changed — %s" % (surface, SKIP_REASON.get(why, why)))
            skipped[surface] = why
            continue
        log("  %s %s — %s" % ("restyling" if RESTYLE else "recolouring",
                                surface, _short(sel.get("name") or "", 60)))
        hexv = sel.get("hex")
        if not hexv:
            # RESTYLE only — skip_reason() already refused this in recolour
            # mode, where there is no diffusion pass to carry the colour.
            log("    no swatch hex — colour rests on the prompt alone")
        else:
            # In recolour mode there is no diffusion pass afterwards to bring
            # texture back, so the tint carries the whole result and goes on
            # at full strength. In restyle mode it is a steer for the model.
            working = tint(working, masks[surface], hexv,
                           strength=1.0 if not RESTYLE else None)
        if RESTYLE:
            working = inpaint(comfy, working, masks[surface],
                              sel.get("prompt") or "", sel.get("negative") or "",
                              seed_for(job_id, surface))
        applied.append(surface)

    if not applied:
        raise RuntimeError(
            "Nothing could be applied — the segmenter did not find %s in this photograph. "
            "Try a straighter, less obstructed shot of the elevation."
            % (", ".join(sorted(selections)) or "any selected surface"))

    # The stamp goes on even when nothing could be measured — a job with a
    # null achieved must mean "an old worker ran this", never "measure failed".
    achieved["_worker"] = "%s %s" % (WORKER_BUILD, RENDER_MODE)

    # ── 823: a surface that was NOT changed has to travel back ──────────────
    # Until now `skipped` existed only in the log line at the bottom of this
    # function, on this box, in Theo's house. The row went `done`, the render
    # uploaded, `error` stayed null — and the screen had no way to know the
    # siding was never touched. A silent PARTIAL success is the worst of the
    # three outcomes, because it is the one nobody thinks to check: a failure
    # announces itself and a success is what you expected.
    #
    # It rides inside `achieved` under an underscore key, beside `_worker`,
    # rather than in a new column. That convention already exists on this row
    # and it means every deployed reader keeps working — an unknown underscore
    # key is ignorable in a way an unknown column is not, and it saves a
    # migration that would have to land before this worker to be safe.
    #
    # ⚠ `achieved` cannot answer this on its own, which is why the key is
    # needed at all: measure() returns nothing for a surface it could not
    # measure and the loop below `continue`s past it, so "absent from
    # achieved" ALREADY means two different things. This says which.
    if skipped:
        achieved["_skipped"] = dict(skipped)

    # Measure BEFORE the JPEG round trip, on the pixels the render produced.
    for surface in applied:
        m = measure(working, masks[surface], (selections.get(surface) or {}).get("hex"))
        if not m:
            continue
        achieved[surface] = m
        log("    %s wanted %s, got %s — drift %d%s"
            % (surface, m["want"], m["got"], m["drift"],
               "  ⚠ the colour did not land" if m["drift"] > 40 else ""))

    render_path  = "visualizer/%s/render.jpg"  % job_id
    preview_path = "visualizer/%s/preview.jpg" % job_id
    storage_upload(render_path,  to_jpeg(working, 2400, 90))
    # A small copy for grid tiles. Build 633 paid for this lesson: one
    # rendition cannot serve both a lightbox and a 270px thumbnail.
    storage_upload(preview_path, to_jpeg(working, 640, 80))

    took = int((time.time() - started) * 1000)
    patch_job(job_id, {
        "status": "done", "render_path": render_path, "preview_path": preview_path,
        "finished_at": _now(), "duration_ms": took, "error": None,
        "achieved": achieved or None,
    })

    insert_render({
        "job_id": job_id,
        "project_id": job.get("project_id"),
        "title": " · ".join((selections[s].get("name") or s) for s in applied),
        "source_path": job["source_path"],
        "render_path": render_path,
        "preview_path": preview_path,
        "selections": selections,
        "via": "spark %s %s" % (WORKER_BUILD, RENDER_MODE),
        # approved stays FALSE. A person looks at it before a customer does.
        "created_by": job.get("created_by"),
    })

    msg = "  done in %.1fs — applied %s" % (took / 1000.0, ", ".join(applied))
    if skipped:
        # Reason included: "not found in photo" was true of one of the two
        # cases and quietly wrong about the other.
        msg += " · NOT CHANGED: %s" % ", ".join(
            "%s (%s)" % (s, SKIP_REASON.get(r, r)) for s, r in skipped.items())
    log(msg)


LOCK_PATH = os.environ.get("VISUALIZER_LOCK") or "/tmp/cardinal_visualizer.lock"
_lock_fh = None


def take_lock():
    """One worker per box, unless someone deliberately says otherwise.

    ⚠ THIS IS NOT BELT-AND-BRACES. Found on the Spark 15 Aug: THREE workers
    had been polling the same queue since the previous evening.

    claim_job() uses FOR UPDATE SKIP LOCKED, so two workers never take the
    SAME job — which is exactly why this went unnoticed. Nothing was corrupted
    and no job was rendered twice. What they did instead was claim DIFFERENT
    jobs and run FLUX concurrently on one GPU: 24 GB of weights loaded two or
    three times over, thrashing VRAM, every render crawling. The render Theo
    asked about took 12m13s against a warm baseline of 30-190s, and this is
    the likeliest reason.

    A correct-looking database and a badly wrong wall clock is what the
    failure mode looks like from the outside, which is why it survived.

    flock and not a PID file: the kernel drops the lock when the process
    dies, so there is no stale lock to clear after a crash or a reboot. If a
    second worker is genuinely wanted (a second GPU), give it its own lock
    path: VISUALIZER_LOCK=/tmp/cardinal_visualizer_gpu1.lock
    """
    global _lock_fh
    try:
        import fcntl
    except ImportError:                      # not POSIX — nothing to enforce
        return True
    _lock_fh = open(LOCK_PATH, "w")
    try:
        fcntl.flock(_lock_fh.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
    except OSError:
        log("REFUSING TO START — another worker already holds %s." % LOCK_PATH)
        log("  Several workers on one GPU do not corrupt anything: the claim")
        log("  is atomic, so they take different jobs. They just fight over")
        log("  VRAM and every render crawls.")
        log("  Running workers:")
        log("    ps aux | grep [v]isualizer_worker")
        log("  Stop them all, then start one:")
        log("    pkill -f visualizer_worker.py")
        log("  A second GPU is a real reason to run two — give it its own lock:")
        log("    VISUALIZER_LOCK=/tmp/cardinal_visualizer_gpu1.lock python3 spark/visualizer_worker.py")
        return False
    _lock_fh.write("%d\n" % os.getpid())
    _lock_fh.flush()
    return True


def main():
    if not take_lock():
        return 1
    comfy = Comfy(COMFY_URL)
    log("worker %s [%s · %s] → %s (lock %s)"
        % (WORKER_NAME, WORKER_BUILD, RENDER_MODE, COMFY_URL, LOCK_PATH))
    if not comfy.up():
        log("WARNING: ComfyUI is not answering at %s yet — will keep polling" % COMFY_URL)

    idle = False
    while not _stop:
        job = None
        try:
            job = claim_job()
        except Exception as e:
            log("could not reach Supabase: %s" % _short(e))
            time.sleep(POLL_SECONDS * 2)
            continue

        if not job:
            if not idle:
                log("queue empty — waiting")
                idle = True
            time.sleep(POLL_SECONDS)
            continue
        idle = False

        try:
            run_job(comfy, job)
        except Exception as e:
            if _stop:
                # A deliberate shutdown is NOT a failed job. Hand it straight
                # back so the next worker picks it up immediately, rather than
                # stranding it until requeue_stale_design_jobs() notices half
                # an hour later — and don't burn the attempt.
                log("  interrupted — returning job %s to the queue" % job["id"][:8])
                try:
                    patch_job(job["id"], {"status": "queued", "claimed_by": None,
                                          "claimed_at": None, "started_at": None,
                                          "attempts": max(0, (job.get("attempts") or 1) - 1)})
                except Exception as e2:
                    log("  could not requeue: %s" % _short(e2))
                break

            reason = _short(e, 500)
            log("  FAILED: %s" % reason)
            try:
                # The worker's own sentence, stored verbatim and shown to the
                # office. A job that fails silently is worse than one that
                # fails loudly — the whole ABC saga was six rounds of an error
                # message being thrown away.
                # 829: stamp the build on FAILURES too. The success path has
                # written `achieved._worker` since 823, on the stated rule that
                # a null `achieved` means "an old worker ran this" — but a
                # failure wrote no stamp at all, so that rule silently did not
                # hold for the half of the rows where knowing the version
                # matters most. Four failed tap jobs carried no version and it
                # had to be inferred from which mask keys they left behind.
                # Any partial `achieved` from a raising branch is not worth
                # preserving on a row nothing will read.
                patch_job(job["id"], {"status": "failed", "error": reason,
                                      "finished_at": _now(),
                                      "achieved": {"_worker": "%s %s" % (
                                          WORKER_BUILD, RENDER_MODE)}})
            except Exception as e2:
                log("  and could not record the failure: %s" % _short(e2))
            # Never spin. A failure that cannot even be written down is exactly
            # the case where the loop would otherwise hammer the database as
            # fast as the network allows — which is what the phantom-claim bug
            # did before the guard in claim_job() was added.
            time.sleep(POLL_SECONDS)

    log("stopped")


if __name__ == "__main__":
    # sys.exit(main()), not a bare main(): a refused start must exit NON-ZERO.
    # Discarding the return made "another worker already holds the lock" look
    # like a clean shutdown to systemd, which would then treat it as success
    # and never restart or alarm. main() returns None on the normal path, and
    # sys.exit(None) is 0.
    sys.exit(main())
