# Exterior Visualizer — DGX Spark setup

*Written 14 Aug 2026. Hand this to whoever is at the keyboard on the Spark.*

The worker (`visualizer_worker.py`) is written and its database contract is
**already applied to production**. What is left is on this box: ComfyUI, the
models, and two saved graphs.

---

## The shape of it, in one paragraph

The Spark **polls** Supabase for queued jobs and pushes finished renders back.
Nothing reaches into this box — no tunnel, no port forward, no HTTPS endpoint,
no static IP. If the box is asleep, jobs simply wait. That is the whole reason
this design was chosen: an in-home sales pitch reads *finished rows*, so a
sleeping GPU can never produce dead air in front of a customer.

**Do not add a "render now" button that calls this box synchronously.** That
re-introduces exactly the failure the architecture exists to avoid.

---

## 1. ComfyUI

```bash
git clone https://github.com/comfyanonymous/ComfyUI
cd ComfyUI && pip install -r requirements.txt

# Manager, for installing the custom nodes below from the UI
git clone https://github.com/ltdrdata/ComfyUI-Manager custom_nodes/ComfyUI-Manager

python3 main.py --listen 127.0.0.1 --port 8188
```

`--listen 127.0.0.1` is deliberate: ComfyUI should answer **only** on
localhost. The worker runs on the same box, so nothing else needs to reach it,
and an unauthenticated ComfyUI on an open interface is a remote code execution
hole.

## 2. Custom nodes (via Manager → Install Custom Nodes)

| Node pack | For |
|---|---|
| **ComfyUI-segment-anything-2** (SAM 2) | finding the roof / walls / trim automatically |
| **comfyui_controlnet_aux** | depth + line-art preprocessors |
| **ComfyUI-Impact-Pack** | mask cleanup — grow/blur/erode, which matters more than it sounds |

## 3. Models

| Put in | File |
|---|---|
| `models/unet/` | **FLUX.1 Fill dev** — inpainting, the quality driver |
| `models/clip/` | `t5xxl_fp16.safetensors` + `clip_l.safetensors` |
| `models/vae/` | `ae.safetensors` |
| `models/controlnet/` | a **depth** ControlNet matching your base model |
| `models/sams/` | `sam2_hiera_large.pt` |

The Spark's 128 GB unified memory means you can run FLUX Fill at fp16 without
the quantisation compromises a 24 GB consumer card forces. Use it.

---

## 4. The two graphs

Build these visually in ComfyUI, then **Settings → Enable Dev Mode Options**,
then **Save (API Format)**. Save them beside the worker:

- `spark/segment_api.json`
- `spark/inpaint_api.json`

### ⚠ Node titles are the contract

The worker finds nodes by their **title**, not by their id. Right-click each
node → **Title** → set it exactly as below.

This is not a style preference. ComfyUI renumbers nodes whenever you edit a
graph, so an id-based worker starts writing the prompt into the wrong node the
first time you tweak anything — and it does it *silently*: the graph still
runs and still produces an image, just not the one you asked for. With titles,
a mistake is a loud error at startup instead of a wrong picture at midnight.

**`inpaint_api.json`** — runs once per surface:

| Title | Node type | The worker sets |
|---|---|---|
| `CARDINAL_IMAGE` | LoadImage | `image` — the working photograph |
| `CARDINAL_MASK` | LoadImage | `image` — this surface's mask |
| `CARDINAL_POSITIVE` | CLIPTextEncode | `text` — the material prompt |
| `CARDINAL_NEGATIVE` | CLIPTextEncode | `text` — what must not appear |
| `CARDINAL_OUTPUT` | SaveImage | *(read back)* |

**`segment_api.json`** — runs once per job:

| Title | Node type | Note |
|---|---|---|
| `CARDINAL_SEG_IMAGE` | LoadImage | the worker sets `image` |
| `CARDINAL_MASK_ROOF` | SaveImage | one SaveImage per surface |
| `CARDINAL_MASK_SIDING` | SaveImage | |
| `CARDINAL_MASK_TRIM` | SaveImage | |
| `CARDINAL_MASK_WINDOWS` | SaveImage | |
| `CARDINAL_MASK_GUTTERS` | SaveImage | |

A surface whose node is absent, or which SAM 2 cannot find in a given
photograph, is **skipped, not failed**. A house with no visible gutters is not
an error, and the worker says so in the job log.

### Getting the graph right

Two things do the heavy lifting, and both are why the previous Gemini version
produced mush:

1. **The mask.** Each pass is confined to one region. Grow the mask 4–8 px and
   blur the edge 4 px — a hard mask edge reads as a cut-out sticker.
2. **The depth lock.** Feed a depth ControlNet at ~0.8 strength from the
   *original* photograph. This is what stops the model from inventing a new
   roofline, moving a dormer, or straightening a gable while it repaints.

Denoise around **0.85** for a material change. Higher and the geometry drifts;
lower and the old colour bleeds through.

---

## 5. Worker config

Create `spark/.env` (this file is git-ignored — **never commit it**):

```
SUPABASE_URL=https://yipslubcptjoarblzbpl.supabase.co
SUPABASE_SERVICE_KEY=<the service role key from Supabase → Settings → API>
COMFY_URL=http://127.0.0.1:8188
WORKER_NAME=spark-dayton
POLL_SECONDS=5
```

⚠ **The service role key bypasses every RLS policy in the database.** It stays
on this box. It never goes into a browser, a commit, a screenshot or a chat
message. If it is ever pasted anywhere, rotate it in Supabase immediately.

```bash
pip install requests websocket-client pillow
python3 spark/visualizer_worker.py
```

Expected on a healthy idle box:

```
[09:14:02] worker spark-dayton → http://127.0.0.1:8188
[09:14:02] queue empty — waiting
```

## 6. Run it as a service

```ini
# /etc/systemd/system/cardinal-visualizer.service
[Unit]
Description=Cardinal Exterior Visualizer worker
After=network-online.target

[Service]
Type=simple
User=YOUR_USER
WorkingDirectory=/home/YOUR_USER/cardinal-inspections/spark
ExecStart=/usr/bin/python3 visualizer_worker.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable --now cardinal-visualizer
journalctl -u cardinal-visualizer -f
```

`Restart=always` is safe: a worker killed mid-render hands its job back to the
queue on shutdown, and anything it *couldn't* hand back is recovered by
`requeue_stale_design_jobs()` after 30 minutes, capped at 3 attempts so a job
that genuinely crashes the pipeline stops instead of looping forever.

---

## 7. Proving it works, before any UI exists

Queue a job by hand from the Supabase SQL editor:

```sql
insert into public.design_jobs (source_path, selections, created_by)
values (
  'visualizer/test/house.jpg',        -- upload a house photo there first
  jsonb_build_object(
    'roof', jsonb_build_object(
      'source','oc_colors', 'name','Onyx Black',
      'prompt','Owens Corning TruDefinition Duration architectural asphalt shingles in Onyx Black, deep charcoal granular texture, crisp shingle course lines'),
    'siding', (select jsonb_build_object('source','materials','id',id,'name',color_name,'prompt',prompt,'negative',negative)
                 from public.materials
                where category='siding' and color_name='Iron Gray' limit 1)
  ),
  'theo@cardinalrenovations.net'
);
```

Then watch `journalctl -f`. Within a few seconds the worker should claim it,
segment, inpaint, and write `render_path`. Check:

```sql
select status, error, duration_ms, render_path, masks
  from public.design_jobs order by created_at desc limit 1;
```

**`status = 'failed'` is a useful outcome, not a setback** — the `error`
column carries the worker's own sentence verbatim (a missing node title, a
model that won't load, ComfyUI's own complaint). Read it; it will name the
problem.

---

## What is already done, so nobody redoes it

- ✅ `materials` table — 30 colours, 12 real product lines. **Roofing is
  excluded by CHECK constraint**: `oc_colors` owns shingles (31 colours, 63
  photographs) and a second roofing catalog would be two pipelines for one
  concept.
- ✅ `design_jobs` queue + `claim_design_job()` using `FOR UPDATE SKIP LOCKED`,
  self-tested against double-claiming and negative-controlled.
- ✅ `requeue_stale_design_jobs()` with a 3-attempt cap.
- ✅ `design_renders`, carrying `approved` / `approved_by`. **Renders are not
  approved by default** — the settled Walk rule (AI proposes, a person
  confirms, *then* the client sees it) applies here, because an inpainting
  model will occasionally melt a dormer and that must not reach a kitchen
  table unreviewed.
- ✅ Storage policies for `photos/visualizer/*` and `photos/materials/*`.
- ✅ **No lat/lon columns anywhere, and none may be added.** The worker also
  re-encodes every image through PIL on ingest, which drops EXIF — that is
  load-bearing, not incidental. This path ends at a screen and a printed
  proposal.

## Still to build

- The Next.js presentation app (`visualizer/`) — canvas, mask overlays,
  swatch sidebar, before/after slider, proposal sheet.
- Retiring the old `cr-des` module and `api/design.js` from `index.html`.

## Honest caveat on the catalog

Every one of the 30 material rows is `hex_verified = false`. The product lines
and colour names are real; **the hex values are approximations and not one has
been checked** against a manufacturer's published value or a physical sample.
Until someone holds the sample board next to the screen, the UI must say
"approximate" rather than "factory colour match" — that caption appears in
front of a paying customer choosing what their house will look like. Flip
`hex_verified` one row at a time as each is confirmed; re-running the seed
never resets it.

---

## ⚠ Which prompts actually work — measured 14 Aug 2026, on real Cardinal photos

**`segment_api.json` is written and committed.** It was not designed on paper: every prompt below
was run through Florence2 + SAM 2 on a real drone photograph from the *Minnie marsh kent — Habitat
for Humanity* job, and the mask was looked at.

| surface | prompt | result |
|---|---|---|
| roof | **`roof`** | ✅ clean — mask on the subject roof, nothing on sky, grass, fence or neighbours |
| siding | **`house wall`** | ✅ works |
| windows | **`window`** | ✅ works |
| trim | *(none found)* | ❌ `trim`, `window trim` — no usable mask |
| gutters | *(none found)* | ❌ `gutters`, `gutter` — **masked the LAWN and the roof** |

**`siding` does not work and `house wall` does.** Florence-2 was trained on ordinary English
captions, not trade words. It *finds* things when given "siding" — you can see the boxes — but SAM 2
then segments the dominant surface inside those boxes, which is the roof. Do not "fix" the graph by
putting the trade word back.

**Why trim and gutters fail is structural, not a wording problem.** This pipeline works by drawing a
box and segmenting what is inside it. A box around a gutter contains mostly roof, wall and lawn, so
that is what comes back. Thin linear features are the wrong shape for it. A different technique
(edge detection off the roof mask, or a purpose-trained model) would be needed — no amount of
rephrasing gets there.

⚠️ **The gutters failure is the dangerous kind and is worth looking at once**: the mask covered the
customer's lawn. Had that reached FLUX it would have painted Musket Brown gutters across the grass.
It is the clearest argument in the whole project for `design_renders.approved` defaulting to false.

**So v1 does roof, siding and windows.** `SURFACE_ORDER` still lists all five and the catalog still
offers all five — a surface with no `CARDINAL_MASK_*` node is **skipped and reported**, which is the
behaviour the worker was built with. Verified by driving the worker's own `find_node` / `set_input`
against the committed graph: a job asking for roof + siding + trim + gutters applies roof and
siding and logs *"not found in photo: trim, gutters"*; a job asking **only** for trim raises
"Nothing could be applied" rather than silently producing an unchanged image.

### Two settings in `segment_api.json` that are load-bearing

- **`individual_objects: false`.** The worker takes `images[0]` from each SaveImage. With
  `individual_objects: true` SAM 2 emits one mask *per detection*, so a roof seen as three planes
  would silently lose two of them. False combines them into the one mask per surface the worker
  expects.
- **No resize node.** The example workflow squashes to 768×512 with `keep_proportion: false`, which
  both distorts the house and — more seriously — produces masks at different dimensions from the
  photograph `inpaint()` works on. Misaligned masks paint the right colour in the wrong place. Every
  chain in the committed graph reads node `1` (the original) directly.

### Still to build: `inpaint_api.json`

FLUX.1 Fill dev is downloaded (23.8 GB, `models/unet/flux1-fill-dev.safetensors`). The inpaint graph
is the remaining piece — load ComfyUI's own Flux Fill template, prove it runs, then retitle
`CARDINAL_IMAGE`, `CARDINAL_MASK`, `CARDINAL_POSITIVE`, `CARDINAL_NEGATIVE`, `CARDINAL_OUTPUT` and
export API format. ⚠ It must **not** resize either, for the same reason as above.

### Installed on the Spark, 14 Aug 2026

`ComfyUI-segment-anything-2`, `ComfyUI-Florence2`, `ComfyUI-KJNodes` (kijai), plus `color-matcher`
and `mss` into `~/ComfyUI/venv`. Nothing declared `torch`, so the working `2.13.0+cu130` aarch64
build was untouched — **check that before installing any node pack's requirements.** The Florence2
and SAM 2 weights download themselves on first run; there is no manual model fetch for either.

---

## ⚠ `inpaint_api.json` is written too — and three things in it correct this guide

Built from ComfyUI's own `flux_fill_inpaint_example` template, read out of
`comfyui_workflow_templates_json` on the Spark. **Every model filename it wants is
already on the box**: `flux1-fill-dev.safetensors`, `clip_l.safetensors`,
`t5xxl_fp16.safetensors`, `ae.safetensors`.

**1. The negative prompt does nothing, and this guide implied otherwise.** FLUX Fill runs at
**cfg 1**, where classifier-free guidance is off — the negative conditioning has no influence on
the image. The stock template does not even use a text encoder for it; it uses
`ConditioningZeroOut`. A `CLIPTextEncode` titled `CARDINAL_NEGATIVE` is kept so the worker's
`set_input` resolves and nothing has to change on that side, but **the `negative` field in
`materials` and in the composed roof prompt is inert with this model.** Do not spend effort
tuning negatives. Raising cfg to make them work would degrade FLUX dev, which is distilled for
cfg 1.

**2. Denoise is 1, not 0.85.** §4 of this guide says "denoise around 0.85 for a material change".
That is correct for ordinary SD inpainting; it is **wrong for FLUX Fill**, where
`InpaintModelConditioning` with `noise_mask` defines the region and the stock template ships
denoise 1. Left at the template's value.

**3. The mask must go through `ImageToMask`, not `LoadImage`'s MASK output.** The worker hands
the mask over as its own greyscale PNG. `LoadImage`'s MASK output is the **alpha channel**, and a
greyscale PNG has an opaque alpha — so wiring it that way yields an empty mask and FLUX repaints
nothing, silently. The graph loads the mask as an IMAGE and converts with
`ImageToMask(channel="red")`.

Also carried over from the template deliberately: **`DifferentialDiffusion`** on the model, which
is what makes mask edges blend instead of reading as a cut-out sticker, and **`FluxGuidance 30`**.

### The remaining unknown

Neither graph has ever executed. Structure, contracts, node types and settings are verified —
against the worker's own `find_node`/`set_input`, and every node type taken from a graph that ran
on this box — but the first end-to-end run will still be the first. If either throws, ComfyUI
names the node, and `design_jobs.error` carries the worker's own sentence verbatim.
