# RECOVERY — build 602 taxonomy remap, mid-flight state

**Written 6 Aug 2026. Rewritten ~02:50 UTC after the plan changed.** If you are a
fresh session on the Spark, the dataset is **half-migrated** and there are things
you must not do. Read the whole file before running anything.

Nothing in here is reproducible from the repo alone — the state lives on the box.

> **Superseded plan warning.** An earlier revision of this file said the dataset
> was waiting on a human to rule 19-or-20 on 128 paint boxes, 91 of them by eye.
> **That review was abandoned and should not be resumed.** §2 says why. If you are
> working from a copy that describes `paint_review.tsv`, a suggester pass or a
> review page, that copy is stale — re-pull the branch.

---

## 0 · The one-paragraph version

`remap_taxonomy_602.py --apply` **pass one has already been run**. 473 label files
were rewritten, 128 `paint_deterioration` boxes were parked on **class 99**, and
every touched file was backed up to `.pre602`. The dataset is **deliberately not
trainable** in this state.

**One command finishes it:**

```bash
python3 remap_taxonomy_602.py --root $DS --drop-paint            # dry run
python3 remap_taxonomy_602.py --root $DS --drop-paint --apply    # deletes
```

That deletes the parked boxes, rewrites `data.yaml` to `nc: 31`, and the dataset is
trainable. No review file, no human gate, no restoring backups first.

**Do not re-run plain pass one. Do not train while any box sits on 99. Do not
delete the `.pre602` backups.**

---

## 1 · Verify where you actually are — run this FIRST

Everything below is what previous sessions **reported**. The session that wrote
this could not reach the Spark to confirm it, so **verify before acting on any of
it**. Run from the dataset root — the directory holding `images/` and `labels/`:

```bash
DS=/home/cardinal2023/hailapp/yolo_dataset      # confirm this is right

echo "marker:      $([ -f $DS/.remapped_602 ] && echo PRESENT || echo absent)"
echo "backups:     $(find $DS/labels -name '*.pre602' | wc -l)   (expect 473)"
echo "label files: $(find $DS/labels -name '*.txt' ! -name 'classes.txt' | wc -l)   (expect 1149)"
echo "on class 99: $(grep -rh '^99 ' $DS/labels --include='*.txt' | wc -l)   (expect 128)"
echo "on class 24: $(grep -rh '^24 ' $DS/labels --include='*.txt' | wc -l)   (expect 0 post-pass-one)"
echo "data.yaml:   $(grep -E '^nc:' $DS/data.yaml)"
```

### Read the result against this table

| marker | `.pre602` | on 99 | on 24 | where you are | what to do |
|---|---|---|---|---|---|
| present | ~473 | ~128 | 0 | **pass one done** — the expected state | run `--drop-paint --apply` |
| present | ~473 | **0** | 0 | drop already ran | check `data.yaml` says `nc: 31`; retrain |
| **absent** | some | any | any | **pass one died partway** | **restore from `.pre602`, do NOT re-run** — §5 |
| absent | none | 0 | ~128 | pass one never ran | §6 — go straight to `--drop-paint` |
| — | — | — | — | dataset directory gone | rebuild with `prepare_yolo.py`, then §6 |

The marker is written **only at the very end** of pass one. Marker absent while
backups exist means it stopped mid-write, and re-running would shift the finished
files a second time.

---

## 2 · Why the 128 boxes are deleted rather than reassigned

602 removed `paint_deterioration` on the reasoning that paint is a *condition*, not
a *location*, so each box should be reassigned to the surface carrying it — assumed
to be soffit/fascia or siding. A two-pass design, a review page and an
overlap-scoring suggester were all built on that binary.

**Theo reviewed the actual photographs and it does not hold.** The first seven
boxes were on **decking, windows, roofs and leaks**. Three that *were* on
soffit/fascia/siding **duplicated a box already annotated there** — so reassigning
those would put a second identical-class box on the same defect, manufacturing the
redundancy this build exists to remove. Not one of the boxes examined warranted
reassignment.

`paint_deterioration` had been used as a **junk drawer**. Reassigning a junk drawer
across two surfaces teaches the model that a leaking window is siding damage.

**Only the paint half of 602 is affected.** Merging `soffit_damage` +
`fascia_damage` rests on NMS being per-class and on the 294-box clustering. That
half is untouched and still correct.

`suggest_paint_surface.py` and its harness remain in the tree, and the `--paint`
two-pass route still works. Neither should be used for this migration.

---

## 3 · What must not happen

- **Never run plain `--apply` pass one twice.** The `.remapped_602` marker makes
  the script refuse. Do not delete the marker to "get past" it.
- **Never train while any box sits on class 99.** 99 is outside `nc`, so training
  hard-fails on purpose. That failure is correct behaviour, not a bug to route around.
- **Never delete `.pre602` files** until the retrain is done and Theo has accepted
  the result. They are the only way back from the deletion.
- **Never merge, rebase or force-push `claude/taxonomy-602` / PR #130.**
- The scripts live **only on branch `claude/taxonomy-602`**, not on `main`.

---

## 4 · The pipeline

```
1. dry run          python3 remap_taxonomy_602.py --root $DS
2. pass one  DONE   python3 remap_taxonomy_602.py --root $DS --apply
3. drop      <-- HERE.  --drop-paint --apply   deletes the 128, rewrites data.yaml
4. retrain, eyeball val_batch*_pred.jpg
5. re-stamp the build number (§7), then merge PR #130
```

`--drop-paint` catches **both** class 24 and the 99 sentinel, so it works on a fresh
dataset and on one already parked — no restore needed. It does **not** re-shift the
surviving indices while doing so; `test_drop_paint.py` case B2 asserts exactly that.

It reports any label file left with **no boxes at all**. YOLO reads an empty label
file as a background image, which is harmless — but read the list rather than
discover it later.

---

## 5 · If pass one died partway (marker absent, backups present)

Restore, do not re-run:

```bash
cd $DS
find labels -name '*.pre602' | while read -r b; do mv -- "$b" "${b%.pre602}"; done
rm -f .remapped_602 paint_review.tsv paint_review.suggested.tsv
```

Then verify you are back to pre-migration — `grep -rh '^99 ' labels | wc -l` should
be 0 and `grep -rh '^24 ' labels | wc -l` should be 128 — and go to §6.

---

## 6 · Running it from scratch

```bash
git clone --filter=blob:none --sparse https://github.com/Cardinal-1986/cardinal-inspections.git
cd cardinal-inspections && git sparse-checkout set spark
git checkout claude/taxonomy-602            # the branch, NOT main
grep -c -- '--sources' spark/push_studio_tags.py    # 0 means the copy is stale

python3 spark/remap_taxonomy_602.py --root $DS                        # dry run
python3 spark/remap_taxonomy_602.py --root $DS --drop-paint --apply   # one pass, done
```

Do not sync `spark/` from `raw.githubusercontent.com` — it serves stale copies for
minutes after a commit, and a sync that silently changes nothing is the worst
failure mode here.

Expected dry-run numbers on this dataset: **1,149 label files, 473 would change,
128 paint boxes.** Materially different means stop and say so.

---

## 7 · Before PR #130 can merge

**Re-check the build stamp.** The branch stamps **602**, correct when cut (`main`
was 601) and still correct as of 02:50 UTC 6 Aug. But **#132 claims 603** and is
waiting. If anything lands first, 602 goes backwards and the gate fails.

```bash
git fetch origin main
git show origin/main:index.html | grep -o 'data-cr-footer[^<]*' | head -1
```

Bump **both**, together — separate strings, and a check on one passes while the
other is stale:

1. the `data-cr-footer` app stamp in `index.html`
2. the `CHANGELOG` head entry in `<script id="cr-cl-script">`, currently `{ b:602`

The PR description also needs its paint section rewritten to say deletion rather
than reassignment.

---

## 8 · Five bugs were found in these scripts — do not reintroduce them

Four were in code that had been "verified" before shipping; three were caught only
by running on the real dataset, and the fifth by looking at real photographs.

1. **`label_files()` matched only the last path component**, so a split dataset
   (`labels/train/`, `labels/val/`) yielded zero files. The pre-ship fixture was
   flat. Fixed with a path-**component** match — a substring test also fixes the
   split case but starts feeding `labels_backup/` and `unlabelled/` into a
   destructive rewrite.
2. **Line numbers shifted between passes.** `read_boxes()` skips blank lines and the
   rewrite rebuilt files from boxes alone, so a blank line vanished and every line
   below moved up while the review TSV held pre-rewrite numbers. A decision was
   silently discarded, or applied to the wrong box. *(Measured: 0 of 1,149 files
   here contain a blank line, so it never bit this dataset.)*
3. **The suggester scored overlap in one direction only.** `contained` is
   intersection ÷ paint area, which cannot see a paint box that *encloses* a small
   surface box. IoU cannot substitute: `iou ≤ contained` always.
4. **Evidence printed at two decimals**, so 0.003 and 0.000 looked identical.
5. **The reassignment premise itself was wrong** — §2.

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

## 9 · Unrelated, also parked on Theo

The **private room** storage test is **CLOSED as of 6 Aug 2026** — both halves pass,
and personal uploads are no longer gated on it.

The HTTP half was proven by requesting one real object at
`private/theo@cardinalrenovations.net/` from two callers on the same path:
`nick@` (real staff session) got *"Object not found"*; `theo@` (the owner) got
2,742,127 bytes. The owner's run is the half that matters — Supabase returns
*"Object not found"* for an RLS denial and for a missing file alike, so a refusal
on its own is uninterpretable. See `ORIENTATION.md` for the full note.
