# Cardinal Resource App — read this first

Single-file PWA (`index.html`, **~2.59 MB**) for **Cardinal Roofing & Renovations, LLC**, Dayton OH.
Live at **app.cardinalroster.com** · Vercel deploys on merge to `main` · Supabase backend (DB, storage, auth, RLS) · serverless functions in `/api/` (ESM — `api/package.json` has `"type":"module"`, handlers are `export default async function handler`).

The file you want is lowercase **`index.html`** at the repo root. **99** inline `<script>` blocks, **100** `<style>` blocks. No build step, no bundler, no framework, no test runner.

Owner: **Theo Dorion** · theo@cardinalrenovations.net

*Last verified against `origin/main @ 202e6f3`, 29 Jul 2026, stamped build 427.*

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

The build workflow lives in `.claude/skills/cardinal-build/SKILL.md`. It triggers on any Cardinal work — features, bug fixes, theming, SQL, `/api`, audits.

**For session state — open items, settled decisions, handoffs — these docs are authoritative over the skill's `references/` folder.** The references were refreshed to build 427/428 (invariants, gates, bug classes, theming, app map, plus the lexer/contrast/selector-audit scripts); `references/app_map.md` remains a 388-era terrain map that itself defers to `FEATURES.md`. Do not proceed from memory — build numbers, open items and settled decisions change every session. **Check their dates against the current build before trusting them**; docs written a session ago describe a different app.

---

## The prime doctrine

**Things that look missing are usually buried.** Six "missing features" on this project were fully built and merely unreachable or plain-looking — a dead handler stub, an Attach bar under the bottom nav's z-index, a punch module mounting to hidden anchors, an entire Team page in the burger menu, a `styleMounts()` inline style beating every CSS rule, and two separate Estimates screens.

Before building: grep `FEATURES.md`, then grep `index.html` for the feature name **and its mount anchor**. Ask "does this *element* still exist?" — not "does this code exist?" Extend, don't add. One pipeline per concept.

**Corollary: grep for the convention before inventing a mechanism.** The app already had `IC_SKIP` (per-CRM stage hiding) and `LEGACY_STAGE` (stage aliases). `PIPE_SKIP` was added by copying `IC_SKIP`'s shape. A new mechanism beside an existing one is a bug with a delay on it.

---

## How builds work here

No build pipeline, no module folder, no pristine base. **All work is direct surgery on the shipped `index.html`.**

- **Every edit is exact-match**: `assert src.count(old) == 1` before replacing. A failed assert aborts before the write.
- **Anchors must match real whitespace** — print `repr()` of the real text first (`patch_lib.context`). Never guess a line break. `.cr-pcard.community` is one line; assuming otherwise silently matched nothing.
- **Verify anchors sequentially, applying each edit forward.** Anchor B may only be unique *after* edit A lands.
- **Prove scope two ways.** Re-applying the edits to a fresh copy must reproduce the file byte-for-byte; and replacing each changed region with a sentinel in both old and new must compare equal. **Walk regions in file order** or you get a false failure.
- `patch_lib.sub()` is literal splicing — it does **not** expand regex backreferences. Use `re.sub` for backrefs.
- **Recon regexes need bounds.** `[^{}]` can't cross a brace; unbounded `[\s\S]*` on a 2.5 MB file backtracks until timeout.
- **`</body>` appears 9 times** — contract templates carry their own. Anchor with `rfind()`.
- New `window.Cardinal*` export → `Object.assign(window.X || {}, {...})`, never plain assignment.
- **Grep the whole file for every occurrence of a selector before patching it.** `.acthead` had three definitions; the winner was ~39,000 lines after the two found first.

Helpers: `.claude/skills/cardinal-build/scripts/patch_lib.py` (atomic temp-then-rename writes) and `check_build.py` (the mechanical gate ladder).

---

## Counting things in this file — read before you assert a number

Most wrong claims on this project came from a count, not from reasoning. A bare regex over 2.5 MB is **not** evidence.

**Comments and strings lie in both directions.** Patch scripts document the values they change, so a naive count finds the value in its own explanatory comment. But naive comment-*stripping* is worse: `/*` inside a string literal is not a comment, and stripping on that basis deletes real code.

Worked example — counting the global scroll lock:

| Method | Answer |
|---|---|
| Bare regex | 14 modules — one was text inside a code comment |
| Strip `/* … */` first | 10 modules — ate real calls from three modules |
| **JS lexer (strings/templates/comments as states)** | **13 — correct** |

Both shortcuts were wrong, in opposite directions. **Use a lexer.**

**Scope the assertion to the function, not the file.** The single most repeated error here. `await signedPhotoMap(...)` appears twice — `publish()` and `openPreview()` — so asserting `1` file-wide fails a correct patch. Extract the function by brace-matching, then assert against that slice. Same trap with `LABEL`: a file-wide regex finds the *insurance* map (`'Lead':'Claim Filed'`) when you meant community (`'Lead':'Bid Requested'`).

**Prefer self-computing assertions** over hardcoded numbers, which are usually read off an already-patched tree:

```python
assert count(patched, VALUE) == count(orig, VALUE) - 1   # "exactly one changed"
```

**Print what your extractor captured** before asserting on it. An extractor that swallowed 2,271 characters returned empty counts, and empty looks like a legitimate zero.

**When a count contradicts you, suspect the regex.** A pattern using `[^;\n]*` cannot see an expression split across lines — that nearly produced a false "locks scroll and never releases" bug report against correct code.

---

## Gates — run every build, in order

```bash
python3 .claude/skills/cardinal-build/scripts/check_build.py index.html \
    --prev <previous> --marker '<the string your fix added>'
```

Covers per-block `node --check` on all inline scripts (module scripts included), tag balance, CSS brace balance, duplicate `<style id=>` detection, the dupe-API check, build-label bump, marker present in the artifact you wrote, and the **negative control**.

Then a **jsdom functional harness** on the changed surface. Recipe in `references/gates.md`. Where practical, go further: extract the *shipped* function text and execute it against real data shapes — not a re-implementation.

**Never commit on red. Never hand over with a failing check.**

### What the gates cannot see

**jsdom does not resolve `var()` inside `background` / `border` shorthands** — it returns `rgba(0,0,0,0)`. A gate can verify **structure** (element exists, class applied, attribute set) and **directly-read custom properties** via `getPropertyValue()`, but **cannot verify that a tokenized colour actually renders**.

For colour work: assert on the **CSS text**, run the negative control against the previous build, and **say plainly that Theo's eyes are the gate.** Do not report a green jsdom run as proof a colour is right.

**Contrast is arithmetic, not judgment — compute it.** Stage and CRM colours are chosen for a dark ground and collapse as text on a light one: the stage set reads 1.96–4.37:1 on white and the spine neons 1.17–2.36:1, against a 4.5:1 floor for body text. Two shipped builds carried unreadable chips before anyone noticed. When a surface goes light, compute the ratio for **every colour that carries text** and use the `STAGE_INK` / `colorLight` twins. Bars, spines and dots keep the bright originals — a glowing 3px rule is not text.

**Test against production data shapes, not convenient fixtures.** A photo-signing change was verified against `{path, url}` fixtures and shipped completely inert, because **zero** photo objects in the real database have `path` or `storage_path`. The code was correct and did nothing. Query the real shape first.

**When a gate goes red, first ask whether the test or the app is wrong.** Roughly half of all reds on this project were the test's fault. Fix the test when the test is wrong; never bend the artifact to satisfy a bad assertion — the label gate compared dates, so two builds in one day read as un-bumped, and the first response was to change the date rather than the gate.

---

## Invariants — breaking these corrupts data silently

**`normStage()` is a whitelist.** Six copies; five delegate to the one in the main block.

```js
return STAGES.indexOf(s) !== -1 ? s : 'Lead';
```

Anything unrecognised **becomes `'Lead'`** with no error. Therefore: **`STAGES` must contain a stage value before any row is given it.** Ship the whitelist entry in its own commit, before the writer. Reversed, every affected job silently renders as a brand-new lead. Same rule for `LEGACY_STAGE`, `IC_SKIP`, `PIPE_SKIP`.

**Never mutate `estimates.photos` objects.** `saveEstimate()` persists them verbatim; writing a signed (expiring) URL into that array corrupts the record permanently. Sign for **display only**.

**Community bills one party for work on another's house.** Payer, occupant and contact are three roles and routinely three different entities. Bids email the **funding partner**, not the homeowner. Any code touching "the client" in Community must say which one. 2 of 12 community jobs have no homeowner recorded at all.

**Palette tokens need literal fallbacks** when referenced from outside the stylesheet that declares them: `var(--ccm-card,#161918)`, never bare.

**Adding `await` to a synchronous function is never a local change.** It opens a window in which the user can leave. List every side effect after the `await` and revalidate the precondition — a signed-URL round-trip inserted before a scroll lock froze the page with no overlay to dismiss.

**One global scroll lock, 13 modules, no reconciler.** `document.body.style.overflow` is written by 13 independent modules (15 locks, 19 releases, all individually balanced). It leaks on any early return or throw between lock and release. This class has recurred three times. Do not add a 14th writer without checking `BUG_CLASSES.md`.

---

## The build label — there are 20 of them, and only one is the app version

**Two separators, and a regex that assumes one will miss the other.** Module banner
comments use a middot (`v2026-07-22 · build 148`); footers and the app stamp use a
space (`v2026-07-29 build 427`). Counting only the space form finds 9 of 20 strings
and misses build 148 entirely.

`re.finditer(r"v(2026-\d\d-\d\d)\s*(?:·|)\s*build\s+(\d+)")` is the honest count:
**20 strings · 9 space + 11 middot · 5 distinct builds (95, 146, 148, 404, 427).**

| Label | Count | Where | Meaning |
|---|---:|---|---|
| `v2026-07-29 build 427` | 1 | nav menu `<div>`, char ~205,000 | **the app version — the only one in rendered markup, and the only one to bump** |
| `v2026-07-28 build 404` | 1 | `.cr-c-footer` | claims pane |
| `v2026-08-04 build 95` | 2 | `.cr-c-footer` + banner | Claims module (date is 6 days in the future; do not "fix" without asking) |
| `v2026-07-22 build 146` | 12 | `.cr-a-footer` / `.cr-k-footer` + banners | analytics / Keeper / portals / adjuster / coach |
| `v2026-07-22 build 148` | 4 | banner comments | estimates + pricing modules |

**The app stamp is the only version string in rendered markup.** Every other one lives
in a footer template or a `/* ... */` banner comment. That is what makes it identifiable
— and it is why a gate that compares the *set* of all labels can be fooled: bumping any
plugin footer passes while the app stamp stays stale. Demonstrated: bump `build 146` to
`147` and leave 427 alone, and a set-comparison gate reports "label bumped." **Anchor the
gate to the app stamp, not to the set.**

**Bump the app label every build**, and add a `CHANGELOG` entry in `<script id="cr-cl-script">`. Build numbers are **ordering, not inventory** — 234, 241 and 299 are each reused for unrelated work and there are 30 gaps. Never renumber history; 82 source comments cite build numbers.

⚠ **Three live defects in this machinery** (see `cardinal_build_log.md` §2): `currentBuild()` returns **406** instead of 427 because it queries `.menu-footer, [data-cr-footer]` and **neither exists in the markup**, then falls back to scanning `body.textContent` — which includes CSS source, so it matches a `(build 406)` comment. `buildTag()` fails the same way, so **no error report carries a build number**. Both are fixed by adding `data-cr-footer` to the stamp `<div>`. `CHANGELOG` is stale at build 342 and 9 of its entries still describe the retired gold palette.

---

## Shipping (cloud sessions)

Work on a branch, push, open a PR with a plain summary of what changed and what it cost. **Theo reviews and merges; Vercel deploys from `main`.**

- **SQL ships as separate `.sql` files, and runs BEFORE the `index.html` change.** Say so explicitly in the PR.
- After deploy, remind Theo to **fully close and reopen the PWA twice** — the service worker serves stale builds. Twice this has masqueraded as "the fix didn't work."
- On ship: add the feature row to `FEATURES.md`, one line to `cardinal_build_log.md`, strike the `OPEN_ITEMS.md` entry — in the same PR.
- Take a fresh `git hash-object` before pushing, to confirm what you push is what you verified.

---

## The three CRMs

**Retail** (iron, red/black/grey) · **Cardinal Claims** (Aurora teal) · **Community** (green `--ccm-*`, dark by default). Plus Production, Sales Floor, Punch & Repairs, Photo Activity and the Team Directory, which are CRM-independent.

**"The gold palette was retired" is only three-quarters true — do not over-apply it.** PR #8 migrated **542** values (`#d4a017`→`#c8202e` cardinal red, `#f5d061`→`#e35c63`, `#8a5a00`→`#8f1620`, plus rgba twins). It did **not** remove gold: **27 gold hex values remain** and are correct where they are — the **retail CRM badge is still `#c9a227`**, the **brass Client Directory** still uses it for chips and active icons, and `#b8860b` is the fallback colour under 10 gradient-clipped text rules. Token *names* also survived their value change (`--ins-gold` is now `#c8202e`), so **grep the value, not the word "gold."** Before "finishing the migration", check whether the gold you found is the badge, the brass directory, or a gradient fallback.

**`crmNow()` computes the active CRM; `skin()` publishes it to `body.dataset.crm`.** `window.CardinalHeader.crm` is `crmNow` and recomputes on call — use it when you need the value before `skin()` has run. Everything else reads the DOM mirror (`document.body.dataset.crm || 'retail'`, 6 sites), and **CSS must gate on the attribute** (`body[data-crm="community"]`).

**Community theming:** 57 `--ccm-*` token declarations, dark default at `:root` with a `[data-theme="rb-light"]` override. `body.cr-cc-open` is toggled in exactly one place (the client page's `takeOver()`), which makes it a safe community-only gate.

**Colour changes are rarely local.** Of 253 blue/cyan rules, only **4** carried a community selector — the rest are ungated, so a find-and-replace on a hex value is an app-wide restyle in disguise. Gate first, then restyle. **The surviving occurrences of an edited value are the proof the other CRMs were untouched — assert on them.**

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

Client name column is **`name`**. Money has one chokepoint: `bidAmt()`. `stage_since` must be written on creation. `.single()` throws on zero rows — there are **43** of them and **zero** `.maybeSingle()`; use `.maybeSingle()` wherever absence is legal.

---

## Working with Theo

- **Never state an inferred fact as fact. Reproduce before theorising** — screenshots have root-caused more bugs on this project than reasoning has.
- **Check the repo before claiming anything about its state.** Whether a build is live, whether a file was uploaded, what a doc actually says — all of it is one `curl` or one API call away. Note that `raw.githubusercontent.com` serves stale copies for minutes after a commit; when it disagrees with you, re-check against the commit SHA or the API. Getting this wrong repeatedly is what "walking in circles" feels like from the other side.
- **Check whether a file exists before creating it.** This document already existed and nearly got overwritten.
- **Audit before building.** Assume the feature exists and is buried.
- **Terse, honest reporting.** What shipped, what it cost, what's still broken. No flattery. **Report your own regressions plainly and name them as yours.**
- **Report false positives as false positives.** Chasing a non-bug and presenting it as a finding costs trust. Three "bugs" here were an idempotent double-lock, a `JSON.parse(JSON.stringify(x))` deep copy, and an internal literal in a selector.
- **Offer patch-vs-replace with real costs** when there's a choice.
- **Preview visual changes** before shipping — labelled options, dark and light, desktop and mobile, then build the pick. **Verify the preview matches production**: a palette once shipped to every preview and never to the app.
- He answers in short numbered picks ("2 and 1", "3"). Give numbered options.
- **Domain detail from him is load-bearing.** "Some of these could last 2 years depending on the grant" is why the `OnHold` stage exists. Habitat for Humanity does most of the community volume and appears in an annual joint TV commercial — **Habitat sorts first in every partner list.**
- **Never write an unverified email address into `community_partners`.** A bid sent to a guessed address is a lost bid. Ask.
- **One build at a time**, verified before the next starts.
- Theo works from a phone and works very late. Match the pace he sets and get out of the way.

---

## Secrets

Never put credentials in `index.html`, in a commit, or in a chat message. They go in Vercel env vars or GitHub secrets only. A Gemini key and a GitHub PAT have both been exposed in chat on this project — assume that mistake is easy to repeat and refuse to repeat it.
