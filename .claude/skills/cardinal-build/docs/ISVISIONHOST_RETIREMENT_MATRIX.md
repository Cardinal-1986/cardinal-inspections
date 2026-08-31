# The `isVisionHost()` retirement matrix

*Written 31 Aug 2026. Planning document — nothing here is built. `index.html` is untouched at
build 1185.*

Theo, 31 Aug: *"Keep `showroom.cardinalroster.com` as the intended final hostname, but do not
repoint it until all 13 `isVisionHost()` dependencies have explicit replacements and Vision is
verified without that hostname. Use a temporary staging URL until final cutover."*

## ⚠️ MEASURED 31 Aug, AFTER build 1186: **NONE of the four call sites can be inverted yet**

*This section was added when the first cutover build was attempted. It stopped that build.*

**`showroom.cardinalroster.com` is LIVE and serves Cardinal's own `index.html`.** Not inferred —
both hosts were fetched and compared:

| | |
|---|---|
| `showroom.cardinalroster.com` | HTTP 200, **5,446,039 bytes** |
| `app.cardinalroster.com` | HTTP 200, **5,446,039 bytes** |
| `cmp` of the two | **byte-identical** |
| build stamp served on the showroom host | **`v2026-08-31 build 1185`** |
| `isVisionHost` / `visionHtml` present in what it serves | **10 / 2** |

So `isVisionHost()` returns **true on that hostname today**, and the Vision hub is what a rep
opening it actually sees. The four call sites are not dormant code waiting to be tidied — they
are **the live behaviour of a client-facing hostname**.

**Therefore inverting any of them before the repoint is a production regression, not a cutover:**

| site | what inverting it does TODAY |
|---|---|
| 3 · `showLanding()` | the Vision hub stops painting; `showroom.*` shows the CRM landing |
| 4 · `goToLanding()` | the CRM teardown starts running on the Vision hub |
| 5 · `build()` | `visionHtml()` is deleted; the hub markup no longer exists to swap in |
| 6 · the Visualizer hand-off | Vision users silently drop from **Present** to **Prep** |

⚠️ **This is what this document's own closing section already says** — *"Nothing above happens
before the repoint"* — and it is Theo's own settled condition: the hostname is not repointed until
every dependency has a replacement **and Vision is verified without that hostname**. The order is
not a preference; the `?vision=1` door exists precisely so step 2 can happen while `showroom.*`
still works, which is why the definition is deleted **last**.

⚠️ **And "the four SAFE call sites" is not a set that exists.** There are **four call sites in
total**, and `goToLanding()` is one of them. Excluding it leaves **three**, not four — and on the
evidence above, the safe count before the repoint is **zero**. The phrase came from me and was
wrong; it is corrected here so the next reader does not plan around it.

---

## ✅ THE PARITY MAP IS BUILT AND PROVEN — build 1187 · Showroom `ea30488`

*All seven doors. `gate_1187.mjs`: **23/23 in Chromium**, RED on the 1186 control.*

| # | old Vision hub door | new Showroom destination | native / outbound | canonical URL |
|---|---|---|---|---|
| 1 | **Presentations** — Showcase, Workmanship, The Walk | Showcase tile | **native** | — |
| 2 | **Colors** | OC Colors tile | **native** | — |
| 3 | **Studio** | Studio tile | outbound | `https://app.cardinalroster.com/studio.html` |
| 4 | **Designer** | Exterior Visualizer tile | outbound | `https://app.cardinalroster.com/visualizer/?present=1` |
| 5 | **The Appointment** | The Appointment tile | outbound | `https://app.cardinalroster.com/?open=appt` |
| 6 | **Why Cardinal** | Why Cardinal tile | outbound | `https://app.cardinalroster.com/?open=why` |
| 7 | **The Pop-Up Roof** | The Pop-Up Roof tile | outbound | `https://presentation.cardinalroster.com/` |

**Every outbound URL is absolute and resolves identically wherever the page is served from.**
`gate_1187` asserts no tile carries a bare path.

### `isVisionHost()` after this build — UNCHANGED, deliberately

**9 code occurrences · 6 locations · 4 call sites · 3 comments.** Build 1187 touched **none** of
them: it added an entry point and canonicalised four links. The definition, the export and all
four call sites are exactly as they were.

| # | site | status after 1187 |
|---|---|---|
| 1 | the definition, `cr-lr-script` | untouched — deleted **last** |
| 2 | the export on `window.CardinalLanding` | untouched |
| 3 | `showLanding()` | untouched — inverts after the repoint |
| 4 | **`goToLanding()`** | untouched — **its own build, ring-fenced** |
| 5 | `build()` / `visionHtml()` | untouched — its two hrefs canonicalised, the guard left alone |
| 6 | the Visualizer hand-off | untouched — `present=1` already relocated to the Showroom's tile |
| 7–10 | the comments | untouched — rewritten with the definition |

⚠ **The blocker that remains is the repoint itself, and it is now the ONLY one.** Both of Theo's
conditions are met: Vision is verified without the hostname (`?vision=1`, confirmed by him), and
every hub dependency now has an explicit replacement that is built and proven rather than planned.
`showroom.cardinalroster.com` still serves Cardinal byte-identically, so sites 3–6 still cannot be
inverted until it points at the Showroom project.

---

## The parity build, audited 31 Aug — and the two doors that have no URL to link to

*Theo: preserve access rather than knowingly drop hub destinations. The Appointment → outbound
tile, do not relocate. Pop-Up Roof → outbound tile (the prior decision was "not a native Showroom
module", not "remove access"). Why Cardinal → audit first, no duplicate launcher for a number.
And outbound tools must use a canonical absolute production URL, not a path whose behaviour
depends on which hostname serves the deployment.*

### ✅ WHY CARDINAL: there is only ONE implementation, and it is not in the Showroom

Answering the three-way question directly — **it is (1), the same module, with the qualification
that the Showroom has no implementation of it at all.**

`grep -rn "Why Cardinal|CardinalWhy|whyCardinal"` over the entire Showroom repo returns **zero
files**. The "Showroom product definition already includes a Why Cardinal experience" is a line in
`SHOWROOM_EXTRACTION_SPIKE.md` — *"Not measured here, and required before step 5: The Walk, Why
Cardinal, The Appointment and Proof are also presentation surfaces inside index.html"* — an
**intention**, never built. **So an outbound tile is not a duplicate launcher.**

⚠️ **But there ARE two implementations of this content, and both are in Cardinal.** Worth stating
because it is the thing that looks like a duplicate and is not:

| | `cr-sf-script` → `proof()` | `cr-why-script` → `CardinalWhy` |
|---|---|---|
| shipped | Sales Floor, pre-1160 | **build 1160** |
| audience | **the rep** | **the homeowner** |
| reached by | Sales Floor → Proof pane | Vision hub `data-go="why"` · the Appointment's `openWhy()` |
| size | 1,618 chars | 5,217 chars |
| voice | *"Ask a competitor whether they do."* · *"The facts you should be able to give without looking anything up."* | *"Both of those are promises. The second one is the one that matters."* |
| sections | company · warranty · what goes on the roof · their rights | company · **Owens Corning** · warranty · what goes on **your** roof · **your** right to cancel |

Same five topics, deliberately refaced — `OPEN_ITEMS` calls it *"a reface, not a write"*. The rep
version stays in the CRM; the client version is the presentation surface. **Neither is redundant.**

⚠️ **`CardinalWhy` has TWO callers, and the second one constrains the cutover.** Besides the hub
tile, `openWhy()` in `cr-appt-script` calls it — The Appointment's running order is
Job → Roof → Good → **Why** → House. **Relocating Why Cardinal natively would break the
Appointment or force a second copy of it.** That is an independent argument for the outbound tile
Theo asked for, and it lines up with his instruction not to relocate the Appointment.

### ⚠ THE BLOCKER: The Appointment and Why Cardinal have no canonical URL to point at

They are in-app modules, not pages. Cardinal's hash router (`__tryRestoreFromHash`) restores
exactly these views:

`#p/… · #e/… · #list/… · #leads · #reports · #clients · #feed · #audit · #board · #me · #team · #settings`

**Neither `why` nor `appt` is among them.** Today the only way to reach either is to open the
Vision hub — on `showroom.*` or `?vision=1` — and tap the tile. So the instruction *"use its
intended canonical absolute production URL"* cannot be followed for these two: **the URL does not
exist yet, and inventing a link to a URL that does not resolve is the studio-subdomain mistake
again.**

Both modules are otherwise ready for one. `cr-why` is a plain `inset:0` DISPLAY-lever view
registered in `hideAllViews()`, **not host-gated** — its banner says "Reached from the Vision hub
only", which is a convention, not a guard. `CardinalWhy.open()` and `CardinalAppointment.open()`
would both work on any host today.

**Two shapes are possible and it is a product decision, not a mechanical one:**

| | where it lives | cost | risk |
|---|---|---|---|
| **A · hash route** — `app.cardinalroster.com/#why`, `/#appt` | two cases in `__tryRestoreFromHash` + two openers | small | ⚠ touches the **history router**, which is `goToLanding()`-adjacent — the class Theo ring-fenced |
| **B · landing query** — `app.cardinalroster.com/?open=why` | honoured inside `cr-lr-script` only | small | no history-router involvement; survives the `isVisionHost` deletion |

**B is the recommendation** — it keeps the change out of the navigation lever entirely, and unlike
`?vision=1` it does not depend on a door that is scheduled for deletion.

### The canonical URLs that DO exist and are settled

| destination | canonical absolute URL | evidence |
|---|---|---|
| **Studio** | `https://app.cardinalroster.com/studio.html` | verified 200 |
| **Exterior Visualizer** | `https://app.cardinalroster.com/visualizer/` | shipped in the Showroom's tiles |
| **The Pop-Up Roof** | **`https://presentation.cardinalroster.com/`** | `vercel.json` host rewrite → `/popup.html`. ⚠ **This, not `app…/popup.html`** — it is the client-facing domain the book was given, and it is exactly the "canonical rather than hostname accident" rule |

⚠️ **Cardinal's own `visionHtml()` still uses relative `/studio.html` and `/popup.html`** and must
be corrected to these in the same build — that is the hostname-accident fix, and it is
behaviour-preserving on both hosts today.

**Build not started.** `index.html` untouched at build 1186. Two of the seven rows cannot be
written until Theo picks A or B.

---

## ✅ Condition 1 MET · ⚠ Condition 2 IS NOT — the Showroom covers 4 of the hub's 7 doors

*31 Aug, after build 1186. Theo verified `app.cardinalroster.com/?vision=1` himself: "yes it goes
to the menu with presentation, studio, etc."*

**That satisfies the second half of his condition — Vision is verified WITHOUT the `showroom.`
hostname.** The testing door works, so the hostname is no longer the only way to reach the hub.

⚠️ **It does NOT satisfy the first half, and checking it found a gap nobody had measured.**
The condition is *"all dependencies have explicit replacements"*, and the hub's own tiles are
dependencies. Enumerated from `visionHtml()` and its `wire()` dispatch, then checked against the
Showroom's `TILES`:

| # | Vision hub tile | how it works | in the Showroom? |
|---|---|---|---|
| 1 | **Presentations** — Showcase, Workmanship & The Walk | `data-go="showroom"` | ✅ relocated |
| 2 | **The Appointment** | `data-go="appt"` → `CardinalAppointment.open()` | ❌ **absent** |
| 3 | **Studio** | `href="/studio.html"` | ✅ linked, absolute |
| 4 | **Designer** | `data-go="designer"` → the Visualizer | ✅ linked, absolute |
| 5 | **Colors** | `data-go="colors"` → `CardinalColors.open()` | ✅ relocated |
| 6 | **The Pop-Up Roof** | `href="/popup.html"` | ❌ **excluded by decision** |
| 7 | **Why Cardinal** | `data-go="why"` → `CardinalWhy.open()` | ❌ **absent** |

**`CardinalAppointment` and `CardinalWhy` are each assigned exactly once — real modules, not
stubs.** They were never mentioned in the extraction spike, the deployment boundary or this
matrix, because every one of those documents scoped the relocation as *Showcase + OC Colors*. The
hub is wider than the two modules that moved.

⚠️ **THE POP-UP ROOF EXCLUSION IS NOT NEUTRAL AFTER A REPOINT.** Leaving it out of a NEW launcher
adds nothing; leaving it out of a launcher that REPLACES the hub **removes a door Theo has today**.
The settled decision was made about a new app, not about a substitution — worth putting to him in
those terms rather than treating it as already answered.

⚠️ **And two hub links break on the repoint even though they look fine.** `/studio.html` and
`/popup.html` are RELATIVE. Measured:

| URL | today |
|---|---|
| `showroom.cardinalroster.com/studio.html` | **200** |
| `showroom.cardinalroster.com/popup.html` | **200** |
| `cardinal-showroom.vercel.app/studio.html` | **404** |
| `cardinal-showroom.vercel.app/popup.html` | **404** |

They resolve today only because that hostname serves Cardinal's whole deployment. Point it at the
Showroom project and both 404 — **the same defect as the invented `studio.cardinalroster.com`, in
the other direction.** The Showroom's own tiles already use absolute `app.cardinalroster.com`
URLs and are unaffected.

**So the repoint is still blocked, and the blocker has moved**: it is no longer "prove Vision
works without the hostname" — that is done — it is **"decide what happens to The Appointment, Why
Cardinal and the Pop-Up Roof."** Three answers are possible for each: relocate it, link it, or
knowingly drop it. None of them is a code change until Theo picks.

---

## ⚠ FIRST: "13 dependencies" is 13 OCCURRENCES, and it is SIX code locations

The figure 13 is real — `grep -c isVisionHost index.html` returns 13, and I quoted it that way
myself. **Measured properly it is not 13 things to replace.** Classified by walking the file and
asking of each hit whether it sits inside a `/* … */`:

| | count |
|---|---:|
| occurrences of the identifier | **13** |
| …of which are **prose in comments** | **4** |
| …of which are **code** | **9** |
| **distinct code locations** (a guard and its call on one line are one site) | **6** |
| of those six: the definition · the export · **real call sites** | 1 · 1 · **4** |

**Four call sites are the actual work.** This is the counting trap this project documents, in its
usual shape: a raw grep total that is a third comments, and two sites that read as four because
`X && X()` mentions the name twice on one line.

**The four comments must still be dealt with — but as prose, not as code.** Two of them
(lines 27781, 28763) exist specifically to explain that the check is *deliberately not* called
there because `isVisionHost` is defined ~22,000 lines later in the file. Deleting the function
while leaving those comments would leave the next reader an explanation of a mechanism that no
longer exists.

---

## The matrix

### 1. `isVisionHost()` — the definition · `cr-lr-script`, line 51710

```js
function isVisionHost(){ try{
  if(location.search.indexOf('vision=1') !== -1) return true;
  return location.hostname.indexOf('showroom.') === 0;
}catch(_){ return false; } }
```

| | |
|---|---|
| **Current behaviour** | True on any host beginning `showroom.`, or with `?vision=1` anywhere. The `?vision=1` half is the testing door and is what makes staging possible without touching DNS. |
| **Replacement route** | **Deleted last, not first.** While Cardinal still answers on `showroom.*` it must keep working. It is removed in the final build, after the repoint, when nothing calls it. |
| **Verification** | `grep -c isVisionHost index.html` → **0**, and the four comments below rewritten in the same edit. |
| **Rollback** | Revert the commit; the function is self-contained and has no state. |

### 2. The export · `cr-lr-script`, line 52106 — `isVisionHost : isVisionHost`

| | |
|---|---|
| **Current behaviour** | Publishes it on the existing `window.CardinalLanding` object. Sites 3 and 4 reach it only through this export — they run ~24,000 lines earlier than the definition, so the global is the only way they can see it. |
| **Replacement route** | Removed with the definition. ⚠ It is a **property on an existing export object**, added that way because a second `window.Cardinal*` would trip the dupe-API gate — so the edit removes one property, never the object. |
| **Verification** | `gate_dupes` and `check_build`'s dupe-API check stay green; `window.CardinalLanding` still exists with its other members. |
| **Rollback** | Revert; one property. |

### 3. `showLanding()` · main block, line 27177 — **a real call site**

```js
var _visS = false;
try{ _visS = !!(window.CardinalLanding && window.CardinalLanding.isVisionHost
               && window.CardinalLanding.isVisionHost()); }catch(_vs){}
if(!_visS){ goToLanding(); return; }
```

| | |
|---|---|
| **Current behaviour** | On a vision host, `showLanding()` proceeds to paint the Vision landing (greeting, date). Anywhere else it **hands straight off to `goToLanding()`** and returns. |
| **Replacement route** | The guard **inverts to unconditional**: after the repoint, Cardinal is never a vision host, so the correct body is the `!_visS` branch — `goToLanding(); return;` — and the vision-landing code below it is dead and removed with it. |
| **Verification** | `harness_vision.js` covers this surface (20P/3F baselined). The three baselined failures are *about this gate* and must be re-read at the same time, not carried blindly. A Chromium render of `app.cardinalroster.com` shows the ordinary landing unchanged. |
| **Rollback** | Revert the commit. ⚠ **This site is `display`-lever code inside the landing flow** — reverting restores it whole; there is no persisted state to unwind. |

### 4. `goToLanding()` · main block, line 27422 — **a real call site**

```js
try{ _vis = !!(… .isVisionHost()); }catch(_ve){}
if(!_vis){ hideAllViews(); cardinalTruthView.style.display='none';
           resourceLibraryView.style.display='none'; … }
```

| | |
|---|---|
| **Current behaviour** | The inverse guard: on a **non**-vision host it tears the CRM down (hideAllViews plus three explicit view hides) before showing the landing. On a vision host it deliberately does **not**, because Vision users *"land back on their own hub with the picker over it."* |
| **Replacement route** | Also inverts to unconditional — the teardown always runs once Cardinal is never a vision host. |
| **Verification** | ⚠ **This is the riskiest of the four and needs a purpose-built check, not a grep.** It touches `hideAllViews()`, which is the app's single navigation lever; a mistake here is the "swaps the page underneath itself and traps the user" class. Drive it in Chromium: from each of the CRM's full-screen views, call `goToLanding()` and assert the view actually closed and the landing is visible. |
| **Rollback** | Revert. No persisted state. |

### 5. `build()` · `cr-lr-script`, line 51808 — **a real call site**

```js
if(isVisionHost()){ lv.innerHTML = visionHtml(); wire(lv);
                    lv.dataset.crLrBuilt='1'; lv.dataset.crPortalBuilt='1'; return true; }
```

| | |
|---|---|
| **Current behaviour** | Swaps the whole Vision hub markup into `#landingView` instead of the ordinary ten-destination launcher, and marks it built. |
| **Replacement route** | The branch and `visionHtml()` are **removed together** — `visionHtml()` has no other caller. ⚠ `#landingView` **itself is not deleted and must not be**: on the ordinary host it is the normal launcher. The build-log comment at line 72855 says exactly this and is one of the four prose hits. |
| **Verification** | `harness_vision.js`, plus a render asserting `#landingView` still builds the ten-destination launcher and `dataset.crLrBuilt` is still set on the ordinary path. |
| **Rollback** | Revert; `visionHtml()` returns with it. |

### 6. The Visualizer hand-off · `cr-lr-script`, line 52002 — **a real call site**

```js
var _vz = (window.CR_VISUALIZER_URL || '/visualizer/');
if(isVisionHost()) _vz += (_vz.indexOf('?') === -1 ? '?' : '&') + 'present=1';
window.location.href = _vz;
```

| | |
|---|---|
| **Current behaviour** | On a vision host the Visualizer opens in **`present=1`** — approved renders only, one tap, because Prep is the wrong screen in front of a homeowner. Everywhere else it opens on Prep. |
| **Replacement route** | ⚠ **This one does NOT simply invert, and it is the only one with a real design decision in it.** `present=1` is a genuine product behaviour, not CRM chrome: the Showroom must still be able to open the Visualizer in Present mode. So the flag moves to the Showroom's own launcher, and Cardinal's copy loses the conditional and always opens Prep. **Do not delete `present=1` — relocate it.** |
| **Verification** | Assert Cardinal's URL is exactly `/visualizer/` with no `present`, and that the Showroom's launcher produces `present=1`. The Visualizer's own `gate_807` asserts no CRM code in that file and is unaffected. |
| **Rollback** | Revert. Presentation-only; no data touched. |

### 7–10. The four comments · lines 27781, 28763, 51999, 72855

| | |
|---|---|
| **Current behaviour** | None — prose. Two explain that the check is deliberately *not* used at that point because it is defined ~22,000 lines later; one explains the Visualizer's Present decision; one, in `cr-show-styles`, explains that `build()` swaps the Vision markup in. |
| **Replacement route** | Rewritten in the same commit that deletes the function, to describe what the code does *after* the move. **Not deleted silently** — a comment explaining a vanished mechanism is worse than no comment. |
| **Verification** | `grep -c isVisionHost index.html` → 0 covers these too, which is why that check is the honest one rather than counting call sites. |
| **Rollback** | Revert. |

---

## Order, and the staging URL

**Nothing above happens before the repoint.** Theo's instruction is explicit: the hostname is not
repointed until every dependency has an explicit replacement *and* Vision is verified without that
hostname.

1. Showroom is staged on a **temporary Vercel URL**, with Showcase and OC Colors and one
   Showroom-owned image utility. Cardinal is untouched; both versions exist.
2. **Vision is verified without `showroom.*`** — using the `?vision=1` half of the definition,
   which is exactly the door that exists for this and is the reason the definition is deleted
   last rather than first.
3. Parity and rollback checks pass on the staged URL (`gate_relocation`, `gate_harnesses`,
   `gate_chromium`).
4. **Then** the repoint, then sites 3–6, then the definition, export and comments.

⚠ **The repoint is still the most reversible step and the teardown is not.** Repointing back is a
DNS change with no deploy. Sites 3 and 4 edit `hideAllViews()`-adjacent navigation, which is where
this project has trapped users before — so they land in their own commit, after the repoint has
been proven, never bundled with it.

---

## ✅ CALL SITE 4 IS DONE — build 1188 took `goToLanding()`

Ring-fenced exactly as reserved: `goToLanding()` only, the definition untouched, no other call
site swept in.

**The hostname fork is gone.** One path: `hideAllViews()` → the account's real destination
(Production board for Curtis/Scottie, per 1038; the CRM home for everyone else) → the Front Door
over it. On every host, for every account.

**Three pre-existing facts made the single path safe, and all three were verified rather than
assumed** — the earlier plan for this build assumed the opposite of the first one:

| assumed | measured |
|---|---|
| `#landingView` is not in `hideAllViews()` (still stated in `CLAUDE.md`) | ❌ **it has been since 1101**, with `body.cr-landing-on`. The single path tears the Vision pane down on its own |
| the vision branch's `body.style.overflow = ''` had to be preserved | ❌ `hideAllViews()` has released a leaked lock since **364**. **No new scroll-lock writer — the roster stays at 17** |
| a signed-out call would tear the login screen down | ❌ `#loginView` is not in `hideAllViews()`. Driven in Chromium (gate F2), not reasoned |

**And one thing that was not bookkeeping.** Between `hideAllViews()` and the return, the only
thing between the user and a blank screen was `else if(typeof showHome === 'function')` — an
else-if with no else — and `showHome()` was unwrapped, so a renderer throwing skipped the Front
Door. **The floor now shows `#mainView` when no destination lands.** On the 1187 control,
`elementFromPoint` at the centre of the viewport returns `HTML` with every container hidden: the
blank screen is measured, not argued for.

### `isVisionHost()` after 1188 — 13 occurrences, **7 in CODE** (lexer), 2 blocks

⚠ The header above says "13 dependencies". **13 is the raw occurrence count and 6 of them are
prose.** The lexer answers 7 CODE hits across 2 blocks, and two of those are the definition and
its export. There are **three real decisions left**, not thirteen.

| # | purpose | site | what happens at cutover |
|---|---|---|---|
| 1 | definition | `function isVisionHost(){` · cr-lr-script | the surface, not a decision |
| 2 | export | `isVisionHost : isVisionHost,` · `window.CardinalLanding` | ditto |
| 3 | **paint the Vision pane** | `showLanding()`'s guard + call · main block | the hub itself |
| 4 | **paint the Vision pane** | `build()`'s `if(isVisionHost())` · cr-lr-script | the hub itself |
| 5 | **a presentation FLAG, not a door** | `if(isVisionHost()) _vz += 'present=1'` · the Designer tile | ⚠ see below |
| — | prose | 6 comments, incl. 1188's own | no behaviour |

**Does any of it block the DNS cutover? No.**

- 3 and 4 are the Vision hub. After the repoint, `showroom.*` serves the Showroom app and these
  never run; on `app.*` they are reachable only through `?vision=1`.
- **5 is the only one whose BEHAVIOUR would be lost rather than merely unreachable** — it is what
  ever set `?present=1` on the Visualizer, the difference between the office workbench and the
  screen you hand a homeowner. **It is already reproduced**: the Showroom's Visualizer launcher
  hard-codes `https://app.cardinalroster.com/visualizer/?present=1`. Verified in the Showroom
  tree, not assumed.

### The one live cost of shipping 1188 before the repoint

`showroom.cardinalroster.com` still serves this deployment byte-for-byte. Until DNS moves, a
back-to-the-hub path on that host lands on the Cardinal home with the Front Door over it instead
of the Vision hub — and `showMain()`'s vision branch skips `reload()`, so that home carries **no
client data**. Visible, usable, never stranded — but empty. **This build makes the repoint more
urgent, not less.**

---

## ⚠ CORRECTION 31 Aug 2026 — **DNS IS NOT THE CUTOVER MECHANISM**

Every plan above, and every message I sent about the cutover, called it a "DNS repoint". **That is
wrong, and it was never measured until the cutover was authorised.** Recorded here because acting
on it would have caused a real outage window for no reason.

**Measured (Cloudflare DoH + curl, 31 Aug 2026):**

| host | record | value |
|---|---|---|
| `showroom.cardinalroster.com` | **A** (no CNAME) | `216.150.16.129`, `216.150.16.1` · TTL 1800 |
| `presentation.cardinalroster.com` | **A** (no CNAME) | `216.150.16.1`, `216.150.1.65` · TTL 1800 |
| `app.cardinalroster.com` | CNAME | `bbc01c28dda6bf13.vercel-dns-017.com.` · TTL 60 |
| `cardinal-showroom.vercel.app` | A | `64.29.17.131`, `216.198.79.131` · TTL 300 |

**`showroom.cardinalroster.com` already points at Vercel.** All three Cardinal hostnames answer
`server: Vercel` and return byte-identical content from *different* IPs, because Vercel routes by
`Host` header, not by which anycast address you reached.

So the cutover is a **Vercel project-domain reassignment**, not a DNS edit:

1. Vercel → `cardinal-inspections` (`prj_H6uDE65cj42ZqHuBdi7dPYKeZbno`) → Settings → Domains →
   **remove** `showroom.cardinalroster.com`
2. the Showroom project → Settings → Domains → **add** `showroom.cardinalroster.com`

**The DNS records above do not change, and must not be edited.** The rollback is therefore not a
DNS value: it is **re-adding `showroom.cardinalroster.com` to `cardinal-inspections`.** No
registrar involvement, no propagation wait, no TTL exposure.

**TLS today:** TLSv1.3, ALPN h2, subject `CN=*.cardinalroster.com` — a wildcard, so the certificate
covers the hostname under either project and is not part of the cutover risk.

### The agreed sequence (Theo, 31 Aug), superseding anything above

1. merge #584, so production `app.cardinalroster.com` actually carries 1186–1189 and the
   `?open=appt` / `?open=why` entry points exist
2. smoke-test production Cardinal **first**, including both `?open=` destinations and the Pop-Up Roof
3. only if that passes, move `showroom.cardinalroster.com` in Vercel
4. smoke-test the real Showroom hostname
5. on failure, roll back by reattaching the domain to `cardinal-inspections`

⚠ **Two of the twelve smoke tests could not have passed on 31 Aug**, which is why step 1 comes
first: production was on **build 1185**, so `?open=` did not exist there at all.
