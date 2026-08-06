# RECOVERY — build 602 taxonomy remap

**Written 6 Aug 2026, rewritten twice the same day.** The migration this file was
written to rescue is **finished**. It is now a record of what was done, a block for
verifying a dataset is in the finished state, and a recipe for rebuilding it from
scratch if the Spark loses everything.

Nothing in here is reproducible from the repo alone — the dataset state lives on the
box, and the box has already lost its work once.

> **Two superseded plans, and both still circulate.**
>
> 1. An early revision said the dataset was waiting on a human to rule 19-or-20 on
>    128 paint boxes. **That review was abandoned** — §2 says why. A copy that
>    describes `paint_review.tsv`, a suggester pass or a review page is stale.
> 2. The revision after it said pass one was done and *"one command finishes it."*
>    **That command has been run.** A copy telling you to run `--drop-paint --apply`
>    on the live dataset is stale too. Re-pull from `main`.

---

## 0 · The one-paragraph version

**The migration is done and PR #130 merged as build 602** (`279fd51`). The dataset
was remapped 33 → 31 classes, `soffit_damage` + `fascia_damage` were merged into
`soffit_fascia_damage`, the 128 `paint_deterioration` boxes were **deleted**, and
`hail_v5` was trained on the result.

**Theo reviewed `hail_v5`'s predictions and rejected the model** — §7. That is not a
reason to re-run or revert this migration; it is a separate and much larger problem.
The taxonomy change did what it claimed. It was never going to be sufficient.

**Nothing is mid-flight. Do not run `remap_taxonomy_602.py` against the live dataset
at all** unless §1 tells you the dataset is not in the finished state.

---

## 1 · Verify where you actually are — run this FIRST

Everything outside this block is what previous sessions **reported**. No session that
has written to this file could reach the Spark to confirm it, so **verify before
acting on any of it**. Run from the dataset root — the directory holding `images/`
and `labels/`:

```bash
DS=/home/cardinal2023/hailapp/yolo_dataset      # confirm this is right

echo "marker:      $([ -f $DS/.remapped_602 ] && echo PRESENT || echo absent)"
echo "backups:     $(find $DS/labels -name '*.pre602' | wc -l)   (expect 473)"
echo "label files: $(find $DS/labels -name '*.txt' ! -name 'classes.txt' | wc -l)   (expect 1149)"
echo "on class 99: $(grep -rh '^99 ' $DS/labels --include='*.txt' | wc -l)   (expect 0)"
echo "on class 24: $(grep -rh '^24 ' $DS/labels --include='*.txt' | wc -l)   (expect NON-ZERO)"
echo "data.yaml:   $(grep -E '^nc:' $DS/data.yaml)                (expect nc: 31)"
```

**Class 24 is NOT expected to be zero, and this is the trap that shipped once.** Post
remap, `24` means `window_seal_failure` — `paint_deterioration` vacated the index and
the window class moved into it. A finished dataset has real boxes on 24. Only a count
on **99** proves paint is still parked.

**One thing genuinely needs checking rather than assuming — the 11 window boxes.** The
broken `--drop-paint` deleted them on the live dataset before the count gave it away
(§8, bug six). Whether they were restored afterwards is not recorded anywhere, and no
session that wrote this file could confirm it. The backups answer it directly:

```bash
# OLD 26 window_seal_failure -> NEW 24. Both sides should agree.
echo "in backups (OLD 26): $(grep -rh '^26 ' $DS/labels --include='*.pre602' | wc -l)"
echo "live      (NEW 24): $(grep -rh '^24 ' $DS/labels --include='*.txt'    | wc -l)"
```

Live short of backups by ~11 means the deletion was never undone. That is repairable
per-file from `.pre602` and is worth doing before anything else trains — it is 11 real
annotations of a class that has few.

### Read the result against this table

| marker | `.pre602` | on 99 | `data.yaml` | where you are | what to do |
|---|---|---|---|---|---|
| present | ~473 | **0** | `nc: 31` | **finished — the expected state** | **nothing.** Do not run the script |
| present | ~473 | ~128 | `nc: 33` | pass one done, drop never ran | `--drop-paint --apply`, then §7 |
| **absent** | some | any | any | **pass one died partway** | **restore from `.pre602`, do NOT re-run** — §5 |
| absent | none | 0 | `nc: 33` | never ran / rebuilt from scratch | §6 — straight to `--drop-paint` |
| — | — | — | — | dataset directory gone | rebuild with `prepare_yolo.py`, then §6 |

The marker is written **only at the very end** of a run. Marker absent while backups
exist means it stopped mid-write, and re-running would shift the finished files a
second time.

---

## 2 · Why the 128 boxes were deleted rather than reassigned

602 removed `paint_deterioration` on the reasoning that paint is a *condition*, not a
*location*, so each box should be reassigned to the surface carrying it — assumed to
be soffit/fascia or siding. A two-pass design, a review page and an overlap-scoring
suggester were all built on that binary.

**Theo reviewed the actual photographs and it does not hold.** The first seven boxes
were on **decking, windows, roofs and leaks**. Three that *were* on
soffit/fascia/siding **duplicated a box already annotated there** — so reassigning
those would put a second identical-class box on the same defect, manufacturing the
redundancy this build exists to remove. Not one of the boxes examined warranted
reassignment.

`paint_deterioration` had been used as a **junk drawer**. Reassigning a junk drawer
across two surfaces teaches the model that a leaking window is siding damage.

**Only the paint half of 602 was affected.** Merging `soffit_damage` +
`fascia_damage` rests on NMS being per-class and on the 294-box clustering. That half
was untouched and is still correct.

`suggest_paint_surface.py` and its harness remain in the tree, and the `--paint`
two-pass route still works. **Neither was used for this migration and neither should
be revived for it.**

---

## 3 · What must not happen

- **Never run plain `--apply` pass one on the live dataset.** The `.remapped_602`
  marker makes the script refuse. Do not delete the marker to "get past" it.
- **Never train while any box sits on class 99.** 99 is outside `nc`, so training
  hard-fails on purpose. That failure is correct behaviour, not a bug to route around.
- **Never delete `.pre602` files.** The original reason was "until the retrain is
  accepted." The retrain was **rejected**, so they now matter more, not less — they
  are the only way back to the 33-class annotations if the taxonomy ever has to be
  reconsidered. 473 files, a few hundred KB. Leave them.
- **Do not `--drop-paint` a dataset that already reads `nc: 31`.** On a finished tree
  class 24 is `window_seal_failure`; the script only treats 24 as paint when the
  marker is absent, but running it there is pointless risk for zero gain.

The scripts are **on `main`** as of `279fd51`. The old instruction to check out
`claude/taxonomy-602` is obsolete — that branch is merged and should not be used as
a source.

---

## 4 · The pipeline — all of it has run

```
1. dry run          python3 remap_taxonomy_602.py --root $DS              DONE
2. pass one         python3 remap_taxonomy_602.py --root $DS --apply      DONE
3. drop             --drop-paint --apply   deleted 128, data.yaml -> 31   DONE
4. retrain          hail_v5                                               DONE — REJECTED, §7
5. build stamp + merge PR #130                                            DONE — build 602
```

`--drop-paint` catches **both** class 24 and the 99 sentinel, so it works on a fresh
dataset and on one already parked — no restore needed. It does **not** re-shift the
surviving indices while doing so; `test_drop_paint.py` case B2 asserts exactly that.

It reports any label file left with **no boxes at all**. YOLO reads an empty label
file as a background image, which is harmless — but read the list rather than
discover it later.

---

## 5 · If a from-scratch pass one dies partway (marker absent, backups present)

Restore, do not re-run:

```bash
cd $DS
find labels -name '*.pre602' | while read -r b; do mv -- "$b" "${b%.pre602}"; done
rm -f .remapped_602 paint_review.tsv paint_review.suggested.tsv
```

Then verify you are back to pre-migration — `grep -rh '^99 ' labels | wc -l` should be
0 and `grep -rh '^24 ' labels | wc -l` should be 128 — and go to §6.

**On a pre-migration tree 24 means `paint_deterioration`; on a migrated one it means
`window_seal_failure`.** Reading 128 here is how you confirm which tree you have.

---

## 6 · Rebuilding it from scratch

```bash
git clone --filter=blob:none --sparse https://github.com/Cardinal-1986/cardinal-inspections.git
cd cardinal-inspections && git sparse-checkout set spark
grep -c -- '--sources' spark/push_studio_tags.py    # 0 means the copy is stale

python3 spark/remap_taxonomy_602.py --root $DS                        # dry run
python3 spark/remap_taxonomy_602.py --root $DS --drop-paint --apply   # one pass, done
```

`main` is the source now; there is no branch to check out.

Do not sync `spark/` from `raw.githubusercontent.com` — it serves stale copies for
minutes after a commit, and a sync that silently changes nothing is the worst failure
mode here. It cost a full round on this migration: a session read a file that had
been fixed and reported the bug still present, quoting the line number of the
*previous* commit.

Expected dry-run numbers on this dataset: **1,149 label files, 473 would change, 128
paint boxes.** Materially different means stop and say so.

---

## 7 · The retrain was rejected — read this before proposing more taxonomy work

`hail_v5` trained clean on the 31-class dataset. **Theo reviewed
`val_batch*_pred.jpg` and the model is not usable.** In his words: multiple
overlapping boxes, wrong descriptions, *"ponding debris when it's not"*, a
`gutter_damage` box filling half the frame on **overgrown vegetation**, and a
photograph of him lifting a drip edge to count layers labelled `wind_lifted_shingle`.

**What that does and does not tell you:**

- The **overlaps surviving the merge** matter. 602's premise was that splitting one
  repair across `soffit_damage` / `fascia_damage` / `paint_deterioration` defeated
  per-class NMS. Merging them was necessary and it was correct. It was **not
  sufficient** — boxes still stack, so there is a second cause that the taxonomy
  never addressed.
- The **wrong descriptions** are not a taxonomy problem at all. Vegetation read as
  gutter damage, and a hand lifting a drip edge read as a lifted shingle, is a model
  that has not seen enough of either. No renaming or merging of classes fixes that.

**The real bottleneck is the training set, and it is not close.** 31 classes against a
dataset of 1,149 label files — while **60,503 photographs sit in the archive
unlabelled** — on a `yolov8n` backbone. More classes were never the problem; examples
per class is.

**Nothing in the app consumes the `.pt`.** `api/detect.js` is a *prompt* route — it
ships `DEFECT_KEYS` to a language model and runs no inference of its own. So a
rejected `hail_v5` costs production nothing and there is no deadline pressure here.
`DEFECT_KEYS` **is** index-aligned to the trained taxonomy and was verified equal to
`NEW_NAMES` (31 names, in order, `other` at 16, `soffit_fascia_damage` at 19) after
#130 merged — keep them in step.

**Before any further taxonomy work, the question to put to Theo is labelling
throughput, not class names.** Also still open and much cheaper: `nail_pop` has 1–2
examples in the whole set and should be dropped or deliberately labelled.

---

## 8 · Five bugs were found in these scripts — do not reintroduce them

Four were in code that had been "verified" before shipping; three were caught only by
running on the real dataset, and the fifth by looking at real photographs.

1. **`label_files()` matched only the last path component**, so a split dataset
   (`labels/train/`, `labels/val/`) yielded zero files. The pre-ship fixture was
   flat. Fixed with a path-**component** match — a substring test also fixes the
   split case but starts feeding `labels_backup/` and `unlabelled/` into a
   destructive rewrite.
2. **Line numbers shifted between passes.** `read_boxes()` skips blank lines and the
   rewrite rebuilt files from boxes alone, so a blank line vanished and every line
   below moved up while the review TSV held pre-rewrite numbers. A decision was
   silently discarded, or applied to the wrong box. *(Measured: 0 of 1,149 files here
   contain a blank line, so it never bit this dataset.)*
3. **The suggester scored overlap in one direction only.** `contained` is
   intersection ÷ paint area, which cannot see a paint box that *encloses* a small
   surface box. IoU cannot substitute: `iou ≤ contained` always.
4. **Evidence printed at two decimals**, so 0.003 and 0.000 looked identical.
5. **The reassignment premise itself was wrong** — §2.

And a sixth, found after the list was written, which is the one to actually be afraid
of: **`--drop-paint` deleted `window_seal_failure` boxes on a parked tree.** On a
migrated dataset OLD 26 lands on NEW 24 — the index paint vacated — so "delete class
24" ate 11 real window annotations. It was caught by a **count that did not match**
(139 deletions reported against 128 expected) and by nothing else. `test_drop_paint.py`
cases A3 and B3 exist for it.

**Every one of these six surfaced from a number that disagreed with an expectation —
0 files, 7 lines vs 5, 16 of 128, 139 vs 128. Not one came from a passing test.**
Three trace to a fixture that lacked the case that mattered. When a count contradicts
you, that is the stop signal, not an inconvenience to reason past.

Four harnesses guard these, all negative-controlled — they fail against the pre-fix
versions:

```bash
python3 spark/test_remap_layouts.py
python3 spark/test_remap_lines.py
python3 spark/test_suggest_paint.py
python3 spark/test_drop_paint.py
```

**Run all four before trusting any change to these scripts.**

---

## 9 · Unrelated, also settled

The **private room** storage test is **CLOSED as of 6 Aug 2026** — both halves pass,
and personal uploads are no longer gated on it.

The HTTP half was proven by requesting one real object at
`private/theo@cardinalrenovations.net/` from two callers on the same path: `nick@`
(real staff session) got *"Object not found"*; `theo@` (the owner) got 2,742,127
bytes. The owner's run is the half that matters — Supabase returns *"Object not
found"* for an RLS denial and for a missing file alike, so a refusal on its own is
uninterpretable. See `ORIENTATION.md` for the full note.
