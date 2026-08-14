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


def inpaint(comfy, image_png, mask_png, positive, negative, seed):
    graph = load_graph("inpaint_api.json")
    set_input(graph, T_IMAGE, "image", comfy.upload_image("cardinal_work.png", image_png))
    set_input(graph, T_MASK,  "image", comfy.upload_image("cardinal_mask.png", mask_png))
    set_input(graph, T_POSITIVE, "text", positive)
    set_input(graph, T_NEGATIVE, "text", negative or "")
    set_input(graph, T_SAMPLER, "seed", seed)

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


def main():
    comfy = Comfy(COMFY_URL)
    log("worker %s → %s" % (WORKER_NAME, COMFY_URL))
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
    main()
