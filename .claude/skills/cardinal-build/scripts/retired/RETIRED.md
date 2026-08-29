# Retired gates

A gate lands here when the thing it pinned was DELIBERATELY replaced by a later
build, or its required inputs no longer exist anywhere. Retirement is not
deletion: the file stays readable, `git log` keeps its history, and this table
says why each one left the suite — so nobody "rediscovers" a red that is
actually a design decision. `run_gates.py` globs `gate_*.mjs` in `scripts/`
only, so files in this folder simply stop being counted.

**The bar for retiring:** cite the superseding build (or the missing input) and
name what now covers the surface, if anything. A gate whose SURFACE lives but
whose RIG broke gets repaired in place instead — see gate_996 (crAsk), gate_966
(a deliberately moved colour), gate_1000 (a window shim) for the pattern.

| gate | pinned | retired because | covered now by |
|---|---|---|---|
| gate_747 | print header via a fixed-position `#printFix` block | build 1050 rebuilt contract printing on `@page` margin boxes — 747's own premise (that margin boxes are unimplemented) was measured false | `gate_1050.mjs` (31 assertions, presses the real Download button) |
| gate_761 | the in-app Exterior Designer (`cr-des`), both doors | build 807 deleted `cr-des` whole — both blocks cut, all five wirings unpicked, 35,420 chars removed; replaced by the separate Visualizer app | `gate_807.mjs` + the Visualizer's own gates (`gate_8xx`+, `spark/test_*.py`) |
| gate_762 | the Exterior Designer in Studio White | same deletion at 807 | same |
| gate_806 | the librarian's Gemini→Claude migration (byte-identical prompts vs a preserved pre-806 handler) | its negative control imported `librarian_gemini.js` from a SESSION SCRATCHPAD that no longer exists; the one-time migration it proved shipped at 806. Lesson, now a rule: a gate must never depend on a scratchpad path | CI parses `api/librarian.js`; prompt content has no standing gate |
| gate_1025 | the obsidian (dark) estimates screens' inks | build 1095 deliberately re-themed the estimate builder LIGHT-only ("Cardinal" porcelain, Theo's pick after previews); the inks 1025 pins were replaced on purpose | `render_estlight1095.mjs` (19 inks + focus ring, both viewports) |
| gate_724 | the `#puDetail` punch-detail sheet's repairs (604-610 arc) | build 768 made `CardinalPunchCard` (#cr-pk) the one punch detail screen; build 837 deleted `#puDetail` whole — 0 occurrences in the file | `render_punchcard837.mjs` |
| gate_725 | `#puDetail`'s five-photo rule + alert() fence | same 837 deletion (crashes on `getComputedStyle(null)`); the five-photo rule lives on in the card module (`PHOTO_MIN=5`) and the alert() moved to crTell at 1080-1083 | the card module's own gates |

