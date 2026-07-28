# Cardinal Resource App — read this first

Single-file PWA (`index.html`, ~2.4 MB) for **Cardinal Roofing & Renovations, LLC**, Dayton OH.
Live at **app.cardinalroster.com** · Vercel deploys on merge to `main` · Supabase backend (DB, storage, auth, RLS) · serverless functions in `/api/` (ESM — `api/package.json` has `"type":"module"`, handlers are `export default async function handler`).

**The file you want is lowercase `index.html` at the repo root.** Two decoys of similar size sit beside it: `Index.html` (capital I, an older build) and `cardinal_v389_index.html` (a staged artifact uploaded under its staging name). Patching either changes nothing anyone will ever see. Confirm the build label with `grep -oE "v2026-[0-9-]+ build [0-9]+" index.html` before and after every edit.

Owner: **Theo Dorion** · theo@cardinalrenovations.net

---

## Read the doc set before doing anything

| File | Read when |
|---|---|
| `.claude/skills/cardinal-build/docs/START_HERE.md` | Always, first — app, workflow, gates, doctrine |
| `.claude/skills/cardinal-build/docs/FEATURES.md` | **Before building anything** — every feature and where it lives |
| `.claude/skills/cardinal-build/docs/OPEN_ITEMS.md` | Picking up work — live to-do, blockers, **settled decisions (don't re-litigate)** |
| `.claude/skills/cardinal-build/docs/BUG_CLASSES.md` | Before debugging, and before shipping |
| `.claude/skills/cardinal-build/docs/cardinal_build_log.md` | Tracing when/why something changed |
| `.claude/skills/cardinal-build/docs/HANDOFF.md` | Session-state bridge from the previous session |

The build workflow itself lives in the skill: `.claude/skills/cardinal-build/SKILL.md`. It triggers on any Cardinal work — features, bug fixes, theming, SQL, `/api`, audits.

**These docs are authoritative and supersede anything bundled in the skill's `references/` folder** (those are snapshots at build 334). Do not proceed from memory — build numbers, open items and settled decisions change every session.

> ### ⚠ Do not read the docs in the repo root
> `FEATURES.md`, `START HERE.md`, `cardinal build log.md`, `cardinal session summary.md` and `ABC SETUP.md` also sit at the repo root. **They are stale — build 332 and earlier — and wrong in ways that will cost you a build.** They describe the app as ~2.21 MB with 85 inline script blocks (it is ~2.4 MB with 94), state the header title is fixed at 34px (superseded at 373 by 40px, listed as settled in OPEN_ITEMS), and have no knowledge of the retail light theme. A confidently wrong doc is worse than a missing one. **Only `.claude/skills/cardinal-build/docs/` is current.** The root copies are pending deletion; if they are gone when you read this, delete this warning too.

---

## The prime doctrine

**Things that look missing are usually buried.** Six "missing features" on this project were fully built and merely unreachable or plain-looking — a dead handler stub, an Attach bar under the bottom nav's z-index, a punch module mounting to hidden anchors, an entire Team page in the burger menu, a `styleMounts()` inline style beating every CSS rule, and two separate Estimates screens.

Before building: grep `FEATURES.md`, then grep `index.html` for the feature name **and its mount anchor**. Ask "does this *element* still exist?" — not "does this code exist?" Extend, don't add. One pipeline per concept.

---

## How builds work here

No build pipeline, no module folder, no pristine base. **All work is direct surgery on the shipped `index.html`.**

- **Every edit is exact-match**: `assert src.count(old) == 1` before replacing. A failed assert aborts before the write.
- **Anchors must match real whitespace** — print `repr()` of the real text first (`patch_lib.context`).
- `patch_lib.sub()` is literal splicing — it does **not** expand regex backreferences. Use `re.sub` for backrefs.
- **Recon regexes need bounds.** `[^{}]` can't cross a brace; unbounded `[\s\S]*` on a 2 MB file backtracks until timeout.
- **`</body>` appears 9 times** — contract templates carry their own. Anchor with `rfind()`.
- **Bump the build label every build** — search `v2026-`.
- New `window.Cardinal*` export → `Object.assign(window.X || {}, {...})`, never plain assignment.
- **Grep the whole file for every occurrence of a selector before patching it.** `.acthead` had three definitions; the winner was ~39,000 lines after the two found first.

Helpers: `.claude/skills/cardinal-build/scripts/patch_lib.py` (atomic temp-then-rename writes) and `check_build.py` (the mechanical gate ladder).

---

## Gates — run every build, in order

```bash
python3 .claude/skills/cardinal-build/scripts/check_build.py index.html \
    --prev <previous> --marker '<the string your fix added>'
```

Covers per-block `node --check` on all inline scripts (module scripts included), tag balance, CSS brace balance, duplicate `<style id=>` detection, the dupe-API check, build-label bump, marker present in the artifact you wrote, and the **negative control**.

Then a **jsdom functional harness** on the changed surface. Recipe in `.claude/skills/cardinal-build/references/gates.md`.

**Never commit on red. Never hand over with a failing check.**

### What the gates cannot see

**jsdom does not resolve `var()` inside `background` / `border` shorthands** — it returns `rgba(0,0,0,0)`. So a gate can verify **structure** (element exists, class applied, attribute set) and **directly-read custom properties** via `getPropertyValue()`, but **cannot verify that a tokenized colour actually renders**.

For colour work: assert on the **CSS text**, run the negative control against the previous build, and **say plainly that Theo's eyes are the gate.** Do not report a green jsdom run as proof a colour is right.

**Contrast is arithmetic, not judgment — compute it.** Stage and CRM colours are chosen for a dark ground and collapse as text on a light one: the stage set reads 1.96-4.37:1 on white and the spine neons 1.17-2.36:1, against a 4.5:1 floor for body text. Two shipped builds carried unreadable chips before anyone noticed. When a surface goes light, compute the ratio for **every colour that carries text** and use the `STAGE_INK` / `colorLight` twins. Bars, spines and dots keep the bright originals — a glowing 3px rule is not text.

**When a gate goes red, first ask whether the test or the app is wrong.** Roughly half of all reds on this project were the test's fault. Fix the test when the test is wrong; never bend the artifact to satisfy a bad assertion — the label gate compared dates, so two builds in one day read as un-bumped, and the first response was to change the date rather than the gate.

---

## Shipping (cloud sessions)

Work on a branch, push, open a PR with a plain summary of what changed and what it cost. **Theo reviews and merges; Vercel deploys from `main`.**

- **SQL ships as separate `.sql` files, and runs BEFORE the `index.html` change.** Say so explicitly in the PR.
- After deploy, remind Theo to **fully close and reopen the PWA twice** — the service worker serves stale builds. Twice this has masqueraded as "the fix didn't work."
- On ship: add the feature row to `FEATURES.md`, one line to `cardinal_build_log.md`, strike the `OPEN_ITEMS.md` entry — in the same PR.

---

## The three CRMs

**Retail** (iron + gold) · **Cardinal Claims** (Aurora teal) · **Community** (Slate & Clay, light). Plus Production, Sales Floor, Punch & Repairs, Photo Activity and the Team Directory, which are CRM-independent.

`window.CardinalHeader.crm()` is the **single source of truth** for "which CRM am I in."

**Retail light theme (`rb-light`)** is a second theme for Retail only, driven by `--rbe-*` tokens in `:root` and `:root[data-theme="rb-light"]`. **Tokens, never an override layer** — retail-B was torn out at 21 override rules. Two sanctioned exceptions, both because dark and light needed genuinely *different designs* rather than one design in two palettes: the **calendars** (387) and the **brass Client Directory** (391). In both, the dark original is untouched byte-for-byte and the light rules are scoped under `:root[data-theme="rb-light"]`.

**Semantic colours stay fixed in both themes** — milestone/pipeline circles, status spines, urgency red, CRM badge colours, the lavender PO, the lit favourite star, photo captions, the chrome blacks. The full list is in `FEATURES.md`. **Do not "finish the job" by tokenizing these.** More than one build was spent re-learning it.

**Before "fixing" a light element on a dark ground, ask whether it is (a) hidden, (b) chrome with its own token system, or (c) deliberate contrast.** Only then is it a gap.

---

## Permissions

```
Admin       theo@, joan@              everything, including all money
Production  curtis@, scottie@         all clients; no stats strips or partner money
Sales       nick@, joey@, jacob@      only what they created or are assigned (RLS)
```

`project_assigned_rep()` takes `p.checklist`, **not** `p.id`. `is_cardinal_admin()` is security-definer to avoid RLS recursion. Theo + Joan are hardcoded admin fallbacks in SQL and API.

Client name column is **`name`**. Money has one chokepoint: `bidAmt()`. `stage_since` must be written on creation.

---

## Working with Theo

- **Never state an inferred fact as fact. Reproduce before theorising** — screenshots have root-caused more bugs on this project than reasoning has.
- **Check the repo before claiming anything about its state.** Whether a build is live, whether a file was uploaded, what a doc actually says — all of it is one `curl` or one API call away. Do not reason from what you remember staging. Note that `raw.githubusercontent.com` serves stale copies for minutes after a commit; when it disagrees with you, re-check against the commit SHA or the API before concluding anything. Getting this wrong repeatedly is what "walking in circles" feels like from the other side.
- **Audit before building.** Assume the feature exists and is buried.
- **Terse, honest reporting.** What shipped, what it cost, what's still broken. No flattery.
- **Offer patch-vs-replace with real costs** when there's a choice.
- **Preview visual changes** before shipping — labelled options, then build the pick.
- **One build at a time**, verified before the next starts.
- Theo works from a phone and works very late. Match the pace he sets and get out of the way.

---

## Secrets

Never put credentials in `index.html`, in a commit, or in a chat message. They go in Vercel env vars or GitHub secrets only. A Gemini key and a GitHub PAT have both been exposed in chat on this project — assume that mistake is easy to repeat and refuse to repeat it.
