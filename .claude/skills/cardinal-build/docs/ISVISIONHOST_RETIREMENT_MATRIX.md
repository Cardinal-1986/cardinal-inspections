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
