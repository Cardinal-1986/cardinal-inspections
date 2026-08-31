# The Showroom deployment boundary

*Written 31 Aug 2026. Planning document — nothing here is built. `index.html` is untouched at
build 1185 and all four blocks are still inline.*

Theo, 31 Aug: *"Do not put the final relocated implementation in a path that Cardinal continues
to serve as a shared runtime dependency. Trigger 1 requires independent deployment, not merely
external script files."*

## 0. What that corrects, in my own earlier plan

The spike and the Phase-2 gate work both described the destination as **`showroom/showcase.js`
served by the Cardinal project**. **That does not satisfy trigger 1 and the instruction above is
right.** A file inside `cardinal-inspections` is still built by the Cardinal deploy, still
invalidated by a Cardinal push, and still down when Cardinal is down. Splitting one file into two
files in the same project buys modularity, which nobody asked for; it does not buy independent
deployment, which is the whole ask.

The gate work is unaffected and still correct — `module_source.cjs` resolves a module from
whatever artifact references it, and in the destination below that artifact is the **Showroom's
own** `index.html`. What changes is *which repository* those gates live in after the move.

## 1. Location

| | |
|---|---|
| **Repository** | **`Cardinal-1986/cardinal-showroom`** — a new repository, not a folder |
| **Artifact** | `index.html` at that repo's **root** |
| **Vercel project** | its own, root directory `/`, deploying from that repo's `main` |
| **Cardinal's involvement at runtime** | **none** |

⚠️ **`visualizer/` is the precedent for the SHAPE, not for the destination.** It was made a
folder *"so it can become the root of its own Vercel project"* — a stepping stone that has not
been taken. Showroom skips it: a folder inside `cardinal-inspections` is the exact arrangement
trigger 1 rules out, and 807's own note says a hostname check inside one big file *"stops the CRM
being shown, not being downloaded."*

## 2. Production URL — and the one thing that makes this a real cutover

**`showroom.cardinalroster.com`**, repointed from the Cardinal project to the Showroom project.

⚠️ **THAT HOSTNAME IS ALREADY LOAD-BEARING INSIDE `index.html`, AND THIS IS THE SHARPEST EDGE IN
THE WHOLE MOVE.** Build 593/625 made a host starting with `showroom.` swap the Cardinal landing
for the Vision hub, gated by `isVisionHost()` — **13 occurrences** in `index.html`. So today that
subdomain *is* Cardinal, serving the whole CRM and hiding most of it.

Consequences, and they decide the order of everything below:

- **The DNS repoint is the cutover switch.** It is atomic from a visitor's point of view and it
  is the single most reversible step in the plan — repoint back and the old behaviour returns
  with no deploy.
- **Nothing may be deleted from `index.html` before the repoint**, or the CRM's showroom door
  breaks while it is still the thing answering that name.
- **`isVisionHost()` and its 13 sites become dead code only AFTER the repoint** — they are
  removed in the final step, not the first, and removing them is what closes 805's argument for
  good.
- **Verification before the repoint uses the Vercel preview URL**, not the production hostname,
  because the production hostname is still Cardinal until the moment it is not.

## 3. Authentication — all staff

Settled: **Showroom is all authenticated staff. Studio remains separately admin-only. Present
mode is a display boundary, not an authentication boundary.**

- **Same Supabase project**, its **publishable anon key only**. No service-role key ever reaches
  the browser — that key bypasses every RLS policy and lives on the Spark box.
- **Its own sign-in and its own session key: `storageKey: 'cr-showroom-auth'`.** This follows
  `cr-viz-auth` (build 807), which exists precisely because Studio and the CRM both use the
  supabase-js default and fight over one session on a shared origin. ⚠️ Studio and the Supplement
  Desk still carry no `storageKey` — measured — which is why *"Studio keeps logging in"* is still
  open. **Showroom must not join them.** On a separate origin the CRM session does not carry
  over, so Showroom needs a real sign-in screen, exactly as Studio does.
- **Authorisation stays in the database, not the page.** All-staff means the RLS policy on each
  table below must admit any authenticated staff member — not `is_cardinal_admin()`. That is a
  migration to write and apply *before* the Showroom reads anything, and it is the one part of
  this plan that touches production data policy.
- **Present mode changes what is drawn, never what may be fetched.** A customer-safe view that
  relied on hiding a control would be one devtools tab from being no boundary at all.

## 4. Supabase and service configuration

Measured from `cr-show-script` — the tables it actually reads:

`showcase_pairs` · `workmanship_pairs` · `walks` · `walk_shots` · `projects` · `photos` ·
`project_photos` · `studio_tray`

Storage: the **`photos`** bucket, through signed URLs.

- **Storage policy.** `photos/studio/*` is carved out admin-only for Studio. Showroom is
  all-staff and must not be given that prefix; whatever it needs from the archive continues to
  arrive through **`studio_tray`**, which is the one sanctioned seam.
- ⚠️ **The GPS fence crosses this boundary and must be re-asserted on the far side.**
  `studio_photos` carries `lat`/`lon`; `studio_tray` deliberately has no coordinate columns and
  `toggleTray()` names its six fields rather than spreading the row. A new front end reading the
  tray is a new place that fence can be lost. It is asserted today at the schema and at both ends
  of the code; the Showroom repo needs its own assertion, not an inherited assumption.
- ⚠️ **AI-generated imagery stays out.** Presentation-only images never reach project photos,
  inspection reports, claims or supplements. A separate deploy does not relax that.
- **Env vars:** none beyond the Supabase URL and anon key, both of which are safe in the file by
  design. **No build step** means `NEXT_PUBLIC_*` does nothing here — a public value must be
  committed literally, a private one must never exist in this project at all.

## 5. The handoff from Cardinal — exact shape

**Measured, because two different numbers were in circulation and both were wrong.** The user's
brief says 15 call sites; my own earlier note said a "five-site checklist", which was the *`cr-des`
retirement pattern* from 807, not a count of anything. The real figure, enumerated on the shipped
file:

| Kind | Count |
|---|---:|
| `window.CardinalShowcase.<api>(` invocations | **8** |
| module-registry entry `{ id:'cr-show', api:… }` | 1 |
| `BLACKOUT` membership `'cr-show'` | 1 |
| `document.getElementById('cr-show')` in `openGood()` | 1 |
| `hideAllViews()` registration | 1 |
| dispatch on `=== 'showcase'` | 1 |
| **distinct code locations** | **13** |
| raw `CardinalShowcase` mentions (guards + calls double-count) | 22 |

The 8 invocations are only three distinct verbs: **`open()`**, **`openForProject(project)`** and
**`close()`**.

**The replacement is a link, not a shim.** Each invocation becomes a navigation to the Showroom
origin; the other five are deletions of dead wiring once nothing is left to register.

- `open()` → `https://showroom.cardinalroster.com/`
- `openForProject(pr)` → `https://showroom.cardinalroster.com/#/project/<project id>`
- `close()` → deleted; a separate site is closed by leaving it.

⚠️ **Pass an id and nothing else.** No name, no address, no signed payload, no token in the URL.
Showroom authenticates independently and looks the project up itself, so **RLS is what decides
what the viewer may see** — the same rule on both sides, enforced once, in the database. A URL
that carried client details would put them in browser history, in referrer headers and in any
logs along the way, for a boundary the database is already enforcing.

⚠️ **A shim that keeps `window.CardinalShowcase` alive in Cardinal as a redirect stub is exactly
the shared runtime dependency this plan forbids.** The call sites change; they do not get a
compatibility layer.

## 6. ⚠ THE BLOCKER: OC Colors reaches into Showcase, and it is in `index.html`

Measured at one site, in `cr-occ-script`:

```js
async function shrinkOne(file, name){
  var S = window.CardinalShowcase;
  if(!S || typeof S.shrink !== 'function') …   // fails loudly rather than uploading raw
```

**So `cr-show-*` cannot be deleted from `index.html` while `cr-occ-*` is still there.** The
moment Showcase leaves the page, OC Colors' image toolchain has nothing to call, and its own
guard turns that into a refusal to upload — correct behaviour, and a broken feature.

Three ways out, and the choice is Theo's:

1. **Move both in the same cutover.** Honours *"they share the image pipeline"*, and is why
   Showcase was to land first. Largest single step.
2. **Extract the toolchain first** into a third thing both can call. Adds a shared dependency,
   which is what trigger 1 is trying to remove.
3. **Duplicate the shrink helper into `cr-occ-script`** before Showcase leaves. Smallest and most
   reversible; costs one duplicated function, which this project normally forbids — justified
   here only because it is deliberately temporary, and it must be recorded as debt with the
   condition that retires it.

**Recommended: 3, then 1.** It decouples the two moves so a Showcase rollback cannot break
Colours, and `harness_ourroofs` — the one gate spanning the seam — is the check that says whether
it worked.

## 7. Staged cutover

Every stage ends in a state that is correct and shippable on its own. **No stage before 5 changes
anything a user sees.**

| # | Stage | Reversible by |
|---|---|---|
| **1** | Create `cardinal-showroom`, its Vercel project, and a Showroom `index.html` that signs in and renders nothing else. Assert **no CRM code**, as `gate_807` does for the Visualizer. | deleting a project nobody points at |
| **2** | Apply the all-staff RLS migration for the eight tables. Separate PR, applied before any read, stated as SQL-first. | the revert statement, written in the same PR |
| **3** | Copy Showcase into it and get it working against the preview URL. **Cardinal is untouched and the inline version is still live** — both exist, which is the point of this stage. | nothing to undo |
| **4** | **Parity gate.** Run the Showcase gates against BOTH artifacts and require the same verdict. `gate_relocation.mjs` already does exactly this shape and is the tool. | — |
| **5** | **Repoint `showroom.cardinalroster.com`.** The switch. | repoint back — no deploy, minutes |
| **6** | Duplicate the shrink helper into `cr-occ-script` (§6), prove with `harness_ourroofs`. | revert one commit |
| **7** | Replace the 8 invocations with the handoff; delete the 5 structural registrations. **`cr-show-*` still present and still loading.** | revert one commit |
| **8** | **Remove `cr-show-*`** — only after 4 and 7 are green and rollback is rehearsed. Retire `isVisionHost()`'s 13 sites in the same build. | revert one commit |

**Rollback rehearsal, before stage 8 and not after:** repoint the hostname back, confirm the CRM
door works, repoint forward again. A rollback path that has never been walked is a hope.

## 8. What stays behind in Cardinal

- The Colors module, until it makes the same trip.
- **The gates that test CRM-side behaviour** — that the handoff exists and points at the right
  origin. The Showcase harnesses **move to the Showroom repo with the module**: after stage 8
  Cardinal's `index.html` no longer contains or references Showcase, so `module_source.cjs`
  correctly finds nothing there. That is not a gate breaking; that is a gate whose subject has
  emigrated, and it must emigrate with it rather than be left resolving to null.
- `studio_tray` as the only seam from the archive.

## 9. Open questions for Theo

1. **§6 — which of the three?** Recommendation: duplicate the helper (3), then move both (1).
2. **Does Colors follow immediately, or is it a later trip?** Changes stage 6 only.
3. **Does `showroom.cardinalroster.com` stay the name**, or does the Showroom get its own domain
   and leave that subdomain to the Vision hub? The plan above assumes it is repointed.
