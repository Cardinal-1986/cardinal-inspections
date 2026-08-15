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
    from PIL import Image
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
def segment(comfy, image_png):
    """Run SAM 2 once and get a mask per surface.

    Returns {surface: png_bytes}. Surfaces the model could not find are simply
    absent, and the caller skips them — a house with no visible gutters is not
    an error."""
    graph = load_graph("segment_api.json")
    name = comfy.upload_image("cardinal_seg.png", image_png)
    set_input(graph, T_SEG_IN, "image", name)

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
        if images:
            masks[surface] = comfy.fetch(images[0])
    return masks


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


def run_job(comfy, job):
    job_id = job["id"]
    started = time.time()
    patch_job(job_id, {"status": "running", "started_at": _now()})
    log("job %s — %s" % (job_id[:8], job.get("source_path")))

    selections = job.get("selections") or {}
    if isinstance(selections, str):
        selections = json.loads(selections)

    source = storage_download(job["source_path"])
    working = to_png(source)
    working, was, now = fit_for_flux(working)
    if was != now:
        log("  %dx%d -> %dx%d for FLUX" % (was[0], was[1], now[0], now[1]))
    else:
        log("  %dx%d — already in FLUX's band" % now)

    log("  segmenting…")
    masks = segment(comfy, working)
    log("  found: %s" % (", ".join(sorted(masks)) or "nothing"))

    # Persist the masks: the presentation app overlays them so a rep can tap a
    # region of the house and have the sidebar jump to that surface.
    mask_paths = {}
    for surface, png in masks.items():
        p = "visualizer/%s/mask_%s.png" % (job_id, surface)
        storage_upload(p, png, "image/png")
        mask_paths[surface] = p
    if mask_paths:
        patch_job(job_id, {"masks": mask_paths})

    applied, skipped = [], []
    for surface in SURFACE_ORDER:
        sel = selections.get(surface)
        if not sel:
            continue
        if surface not in masks:
            # Not a failure. The model could not see that surface in this
            # photograph — say so plainly and carry on with the rest.
            skipped.append(surface)
            continue
        log("  inpainting %s — %s" % (surface, _short(sel.get("name") or "", 60)))
        # Hand the model the colour in the pixels first. Without this the text
        # is the only steer and a distilled model at cfg 1 ignores it — which
        # is how "Evergreen Mist" came back tan.
        hexv = sel.get("hex")
        if hexv:
            working = tint(working, masks[surface], hexv)
        else:
            log("    no swatch hex on this selection — colour rests on the prompt alone")
        working = inpaint(comfy, working, masks[surface],
                          sel.get("prompt") or "", sel.get("negative") or "",
                          seed_for(job_id, surface))
        applied.append(surface)

    if not applied:
        raise RuntimeError(
            "Nothing could be applied — the segmenter did not find %s in this photograph. "
            "Try a straighter, less obstructed shot of the elevation."
            % (", ".join(sorted(selections)) or "any selected surface"))

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
    })

    insert_render({
        "job_id": job_id,
        "project_id": job.get("project_id"),
        "title": " · ".join((selections[s].get("name") or s) for s in applied),
        "source_path": job["source_path"],
        "render_path": render_path,
        "preview_path": preview_path,
        "selections": selections,
        "via": "spark/comfyui sam2+inpaint",
        # approved stays FALSE. A person looks at it before a customer does.
        "created_by": job.get("created_by"),
    })

    msg = "  done in %.1fs — applied %s" % (took / 1000.0, ", ".join(applied))
    if skipped:
        msg += " · not found in photo: %s" % ", ".join(skipped)
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
    log("worker %s → %s (lock %s)" % (WORKER_NAME, COMFY_URL, LOCK_PATH))
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
                patch_job(job["id"], {"status": "failed", "error": reason,
                                      "finished_at": _now()})
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
