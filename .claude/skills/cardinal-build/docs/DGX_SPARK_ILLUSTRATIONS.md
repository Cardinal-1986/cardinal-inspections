# Making Library illustrations on the DGX Spark

*Written 1 Aug 2026, build 534. Theo has a DGX Spark up and running and Tailscale already set
up, and asked how to point them at the Resource Library.*

**The headline: this needs NO changes to the app.** The Library already accepts image uploads —
`ccFileBlob()` files a blob to the `library` bucket and inserts a `library_items` row with
`kind:'image'`. You generate on the Spark, look at it, upload it through the UI that exists
today. No vendor, no API key, no endpoint to verify, nothing to deploy.

That is why this route beats Gemini and Recraft for *your* case: illustrations are generated
once, reviewed by a human anyway, and not needed at request time. None of the things an API buys
you (uptime, latency, zero setup) matter here — and the things the Spark buys you do.

---

## What you get that no API can sell you

1. **Unlimited iteration at zero marginal cost.** Generate fifty eave cutaways, keep one. Paying
   per image quietly pushes you into accepting the first passable result.
2. **One consistent house style, via a LoRA.** Train once on technical illustration and every
   picture in the library looks like the same hand drew it. You cannot buy this through an API
   at any price, and for a reference library consistency probably matters more than any single
   image.
3. **Customer photos never leave the building** — relevant if you ever want illustrations traced
   from real job photos, and consistent with the fence already around the librarian.

---

## Setup

### 1 · Tailscale — you already have this

You need the Spark and your phone on the same tailnet. NVIDIA documents this as the official
remote-access route for the Spark, so you are on a supported path, not a hack.

Get the Spark's tailnet address — it will look like `100.a.b.c`. You will use it in step 4.

```bash
tailscale ip -4
```

### 2 · ComfyUI on the Spark

ComfyUI is the right front end: it runs in a browser, so your phone is a first-class client, and
it saves reusable workflows so you are not re-typing settings every time.

Three routes, in the order I would try them:

| Route | Why |
|---|---|
| **NVIDIA's own playbook** — `NVIDIA/dgx-spark-playbooks` | Officially supported, includes a ComfyUI playbook with FLUX.1-dev. Start here. |
| **A Spark-specific Docker image** (e.g. `AEON-7/comfyui-aeon-spark`) | Pre-built for GB10 / `sm_121a`, CUDA 13, models bundled. Fastest to something working. |
| **Upstream ComfyUI from source** | Works on GB10 aarch64, but you own the CUDA/PyTorch wheel matching. Only if the above disappoint. |

⚠️ **The Spark is ARM64 (aarch64), not x86.** Plenty of AI tooling silently assumes x86 and will
either refuse to install or install a CPU-only build that "works" at 100× slower. If something is
inexplicably slow, check you did not get a CPU wheel.

### 3 · The one setting everyone misses

**ComfyUI binds to `127.0.0.1` by default**, which means it is reachable only from the Spark
itself — Tailscale will connect and get nothing. You must tell it to listen on all interfaces:

```bash
python main.py --listen 0.0.0.0 --port 8188
```

If you are running the Docker route, make sure the port is published (`-p 8188:8188`) *and* that
ComfyUI inside the container is listening on `0.0.0.0`. Both are required; either alone fails the
same way, which is what makes this confusing.

### 4 · Reach it from your phone

Open a browser on your phone, on the tailnet:

```
http://100.a.b.c:8188
```

That is the whole remote setup. No port forwarding, no dynamic DNS, no firewall rules — that is
the point of Tailscale here.

---

## Model choice, for *shaded technical illustration* specifically

Start with **FLUX.1-dev** — it is what NVIDIA's own playbook ships and it handles shaded,
illustrative work well. 128 GB of unified memory means you are not fighting quantisation.

**The deciding factor is text rendering, and it is the reason to be careful.** A cutaway with
garbled labels is worse than useless on a jobsite. Most image models still mangle text.

**So: do not ask the model to label the drawing.** Generate the illustration *unlabelled*, and let
the Library's existing `~~stack` / `~~flow` diagrams carry the words. They are already accurate,
already themed, already readable on a phone, and their text is real text rather than a picture of
text. Illustration for the shape, diagram for the facts.

### A prompt shape that works for this subject

```
A clean shaded technical cross-section illustration of a roof eave assembly,
cutaway view, muted greys with a single red accent, soft directional shading,
white background, no text, no labels, no annotations, no watermark,
architectural spec-sheet style, orthographic side view
```

Adjust the subject; keep the rest. The parts doing the work are **`cutaway`**,
**`orthographic side view`** (stops it drifting into a photo of a house),
**`no text, no labels`**, and **`white background`** (composites cleanly onto both themes).

---

## The Cardinal loop

1. Generate on the Spark from your phone over Tailscale.
2. **Look at it properly before it goes anywhere.** See the warning below.
3. Save the image to your phone.
4. In the Library, upload it into the right section — the existing image upload path.
5. Keep the `~~stack` / `~~flow` diagram in the entry alongside it. The illustration orients; the
   diagram states the facts.

---

## ⚠️ The real risk, and it is not technical

Generated technical illustration produces **confident, handsome, wrong detail** — layers in the
wrong order, flashing that cannot exist, invented components. Your crew uses this library to work
on real houses, and Owens Corning details matter.

The existing diagrams are structurally safe from this: `api/librarian.js` requires a diagram to
*only restate what the prose already says*, and four data lines can be checked at a glance.
**You cannot verify a picture that way.** A generated cutaway is an unverifiable claim wearing a
picture's authority.

So:

- **Nothing files without you looking at it.** The manual upload step is a feature here, not
  friction — do not automate it away later without thinking hard about this.
- **Schematic, not photoreal.** Photorealism implies a precision the image does not have.
- **Never let an illustration replace a diagram.** Beside it, always.
- If you cannot tell whether a detail is right, that is the signal to not file it.

---

## What NOT to build

**Do not wire the Spark into the app as a live dependency.** A box in Dayton behind a tunnel is a
single point of failure for a tool your crew opens from roofs at all hours. The librarian
currently falls back Gemini → OpenAI; a self-hosted box has nothing to fall back to. If it sleeps
or the internet drops, the assistant dies.

Generate offline, upload the result. That keeps the Spark's advantages and none of its risks.

---

## Sources

- [NVIDIA DGX Spark playbooks — Tailscale remote access](https://deepwiki.com/NVIDIA/dgx-spark-playbooks/2.3-setting-up-remote-access-with-tailscale)
- [ComfyUI on NVIDIA DGX Spark](https://comfyui.org/en/comfyui-on-nvidia-dgx-spark)
- [awesome-dgx-spark — tools and playbooks](https://github.com/bidual/awesome-dgx-spark)
- [comfyui-aeon-spark — GB10/sm_121a prebuilt](https://github.com/AEON-7/comfyui-aeon-spark)
- [Remote ComfyUI on DGX Spark over Tailscale, port 8188](https://github.com/Sniper711/DGX-Spark-Day08-ComfyUI-on-Remote-Spark-20260130)

**Verified from here:** ComfyUI runs on GB10/aarch64; port 8188; Tailscale is NVIDIA's documented
remote-access route; the Library's image upload path exists and works (`ccFileBlob()`, 5 call
sites). **Not verified from here:** the exact install commands — this sandbox cannot reach the
Spark or NVIDIA's docs host, so treat the commands above as the shape, and follow the playbook's
own README for exact syntax.

---

## First real attempt — what actually came out (1 Aug 2026, ~02:15 EDT)

**The pipeline works.** ComfyUI + FLUX.1-dev running on the Spark, driven from a phone over
Tailscale, generating on Theo's own hardware at zero marginal cost. That part is settled and does
not need re-proving.

**The first image was not usable, and the reason is worth keeping.** Prompted with the recipe
above ("cutaway view … orthographic side view"), FLUX returned a **clean 3D perspective product
render** of a roof edge — not a section. No layers, no underlayment, no deck, no drip edge; the
shingles were a surface texture rather than a layer in a stack. It also invented a floating grey
box beneath the eave that corresponds to nothing real.

Handsome, confident, and it teaches a roofer nothing — **exactly the failure mode this file warns
about, arriving on the very first try.** Worth noting the warning earned its place immediately.

**FLUX defaults hard toward clean 3D renders**, and the words `cutaway` and `orthographic side
view` are not enough to overcome it. Two stronger prompts were queued but their results are not
yet recorded here:

- **A, force it flat:** `Flat 2D architectural section drawing of a roof eave, straight-on side
  elevation, no perspective, no 3D, cut through the assembly showing each layer as a distinct
  band … thin black outlines, flat grey fills, one red accent line. White background. Technical
  manual figure. No text, no labels.`
- **B, anchor to an existing style:** `Black and white architectural detail plate from a
  construction textbook, roof eave section, cut view, hatched material fills, flat orthographic
  projection, no perspective, no gradients, white background, no text`

### The reframe — probably the most useful thing learned here

**Do not ask the image model to do what `~~stack` already does well.**

A layer assembly is precisely what the SVG diagrams handle: accurately, with real text, themed,
readable on a phone, and constrained to only restate what the prose says. Replacing that with a
generated picture trades a correct diagram for a prettier guess — a bad trade for a library the
crew works from.

Generated illustrations earn their place on **recognition** subjects the diagrams cannot show:

- what a **kickout flashing** looks like installed
- what **ice damming** looks like on a real roof
- what a **failed pipe boot** looks like, so a crew member spots one
- **roof shapes** — gable vs hip vs gambrel at a glance

"What does this look like" is the job. "What are the layers" is already done, and done better.

**Status: paused here at Theo's call.** Prompts A and B are untried. Nothing is half-built — no
app code was written for illustrations, and none is needed; the upload path already exists.
