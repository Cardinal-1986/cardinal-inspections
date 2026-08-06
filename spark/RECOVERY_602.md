# RECOVERY — build 602 taxonomy remap, mid-flight state

**Written 6 Aug 2026, ~01:40 UTC, because the office Spark session lost its context
mid-task.** If you are a fresh session on the Spark and you are reading this, the
dataset is **half-migrated** and there are things you must not do. Read the whole
file before running anything.

Nothing in here is reproducible from the repo alone — the state lives on the box.

---

## 0 · The one-paragraph version

`remap_taxonomy_602.py --apply` **pass one has already been run** on
`yolo_dataset`. 473 label files were rewritten, 128 `paint_deterioration` boxes
were parked on **class 99**, and every touched file was backed up to `.pre602`.
The dataset is **deliberately not trainable** in this state. It is waiting on Theo
to rule 19 (soffit/fascia) or 20 (siding) on 128 boxes, of which 91 need his eye
on the photograph. Then pass two resolves them and rewrites `data.yaml`.

**Do not re-run pass one. Do not train. Do not delete `.pre602` files.**

---

## 1 · Verify where you actually are — run this FIRST

Everything below is what the previous session **reported**. This session could not
reach the Spark to confirm it (the container is not on the tailnet), so **verify
before acting on any of it**. Run from the dataset root — the directory holding
`images/` and `labels/`:

```bash
DS=/home/cardinal2023/hailapp/yolo_dataset      # confirm this is right

echo "marker:      $([ -f $DS/.remapped_602 ] && echo PRESENT || echo absent)"
echo "backups:     $(find $DS/labels -name '*.pre602' | wc -l)   (expect 473)"
echo "label files: $(find $DS/labels -name '*.txt' ! -name 'classes.txt' | wc -l)   (expect 1149)"
echo "on class 99: $(grep -rhc '^99 ' $DS/labels --include='*.txt' | paste -sd+ | bc)   (expect 128)"
echo "data.yaml:   $(grep -E '^nc:' $DS/data.yaml)   (expect nc: 33 until pass two)"
echo "review tsv:  $([ -f $DS/paint_review.tsv ] && wc -l < $DS/paint_review.tsv || echo MISSING)   (expect 129 = 128 + header)"
echo "suggested:   $([ -f $DS/paint_review.suggested.tsv ] && echo present || echo absent)"
```

### Read the result against this table

| marker | `.pre602` | boxes on 99 | where you are | what to do |
|---|---|---|---|---|
| present | ~473 | ~128 | **pass one done** — the expected state | wait for Theo's rulings, then pass two |
| present | ~473 | **0** | pass two already ran | check `data.yaml` says `nc: 31`; if so you are done, retrain |
| **absent** | some | any | **pass one died partway** | **restore from `.pre602`, do NOT re-run** — see §4 |
| absent | none | 0 | pass one never ran | start from the dry run, §5 |
| — | — | — | dataset directory gone | rebuild with `prepare_yolo.py`, then §5 |

The marker is written **only at the very end** of pass one. Marker absent while
backups exist means it stopped mid-write, and re-running would shift the finished
files a second time.

---

## 2 · What must not happen

- **Never run `--apply` pass one twice.** The `.remapped_602` marker makes the
  script refuse, which is the guard. Do not delete the marker to "get past" it.
- **Never train while any box sits on class 99.** 99 is outside `nc`, so training
  hard-fails on purpose. A hard failure here is correct behaviour, not a bug to
  work around.
- **Never delete `.pre602` files** until the retrain is done and Theo has accepted
  the result. They are the only way back.
- **Never merge, rebase or force-push `claude/taxonomy-602` / PR #130.**
- The scripts live **only on branch `claude/taxonomy-602`**, not on `main`. A
  `git pull` of `main` will not give you `remap_taxonomy_602.py` or
  `suggest_paint_surface.py`.

---

## 3 · The pipeline, and where the stall is

```
1. dry run          python3 remap_taxonomy_602.py --root $DS
2. pass one  DONE   python3 remap_taxonomy_602.py --root $DS --apply
3. suggester DONE   python3 suggest_paint_surface.py --tsv $DS/paint_review.tsv
4. THEO RULES  <-- STALLED HERE. 91 boxes need a human looking at photographs.
5. pass two         python3 remap_taxonomy_602.py --root $DS --paint <tsv> --apply
6. retrain, eyeball val_batch*_pred.jpg
7. re-stamp the build number, then merge PR #130
```

### What the suggester produced (reported, verify)

| bucket | count | meaning |
|---|---:|---|
| decided | 25 | overlap arithmetic was confident; still review them |
| **no surface box on the image** | **91** | geometry cannot help — Theo's eye, on the photo |
| below the containment floor | 12 | tuning recovers a couple, not worth much |
| split / ambiguous | 0 | none |

Decided rows are live (`path<TAB>line<TAB>19|20`). The other 103 are emitted
**commented out** so they parse but stay unresolved. Evidence for every row is in
`#` lines above it.

⚠ **The remap accepts only `19` or `20`** and dies on anything else. There is no
"drop this box" value. If Theo decides some paint boxes are cosmetic-only and
should be removed rather than reassigned, **the script needs a third value added
before he rules**, not after.

⚠ **Any rulings Theo made in a browser page and did not write to a file are
gone** when that page closed. Rulings only count once they are in a TSV on disk.

---

## 4 · If pass one died partway (marker absent, backups present)

Restore, do not re-run:

```bash
cd $DS
find labels -name '*.pre602' | while read -r b; do mv -- "$b" "${b%.pre602}"; done
rm -f .remapped_602 paint_review.tsv paint_review.suggested.tsv
```

Then verify you are back to the pre-migration state — `grep -rc '^99 ' labels`
should total 0 and `grep -rc '^24 ' labels` should total 128 — and start again
from the dry run.

---

## 5 · Running it from scratch

Only if verification says pass one never ran.

```bash
git clone --filter=blob:none --sparse https://github.com/Cardinal-1986/cardinal-inspections.git
cd cardinal-inspections && git sparse-checkout set spark
git checkout claude/taxonomy-602            # the branch, NOT main
grep -c -- '--sources' spark/push_studio_tags.py    # 0 means the copy is stale

python3 spark/remap_taxonomy_602.py --root $DS               # dry run, writes nothing
python3 spark/remap_taxonomy_602.py --root $DS --apply       # pass one
python3 spark/suggest_paint_surface.py --tsv $DS/paint_review.tsv
# Theo rules on the refusals
python3 spark/remap_taxonomy_602.py --root $DS --paint $DS/<final>.tsv --apply
```

Do not sync `spark/` from `raw.githubusercontent.com` — it serves stale copies for
minutes after a commit, and a sync that silently changes nothing is the worst
failure mode here.

Expected dry-run numbers on this dataset: **1,149 label files, 473 would change,
128 paint boxes.** If you get something materially different, stop and say so
rather than proceeding.

---

## 6 · Four bugs were found in this script tonight — do not reintroduce them

All four were in code that had been "verified" before shipping. Three were caught
only by running it on the real dataset.

1. **`label_files()` matched only the last path component**, so a split dataset
   (`labels/train/`, `labels/val/`) yielded zero files. The pre-ship fixture was
   flat. Fixed with a path-**component** match — a substring test also fixes the
   split case but starts feeding `labels_backup/` and `unlabelled/` into a
   destructive rewrite.
2. **Line numbers shifted between passes.** `read_boxes()` skips blank lines and
   the rewrite rebuilt files from boxes alone, so a blank line vanished and every
   line below moved up — while `paint_review.tsv` still held pre-rewrite numbers.
   A filled-in decision was silently discarded, or applied to the wrong box.
   Fixed by substituting in place. *(Measured: 0 of 1,149 files here contain a
   blank line, so it never actually bit this dataset.)*
3. **The suggester scored overlap in one direction only.** `contained` is
   intersection ÷ paint area, which cannot see a paint box that *encloses* a small
   surface box — the commonest annotation shape here. IoU cannot substitute:
   `iou ≤ contained` always. Now scores `max(contained, covers)`.
4. **Evidence printed at two decimals**, so 0.003 (barely overlapping) and 0.000
   (not touching) looked identical. Three decimals now.

Three standalone harnesses guard these, all negative-controlled — they fail
against the pre-fix versions:

```bash
python3 spark/test_remap_layouts.py
python3 spark/test_remap_lines.py
python3 spark/test_suggest_paint.py
```

**Run all three before trusting any change to these scripts.**

---

## 7 · Before PR #130 can merge

**The build stamp must be re-checked.** The branch stamps **602**, which was correct
when cut (`main` was 601) and was still correct at 01:20 UTC 6 Aug. But **#132
claims 603** and is waiting. If anything lands first, 602 goes backwards and the
gate fails.

```bash
git fetch origin main
git show origin/main:index.html | grep -o 'data-cr-footer[^<]*' | head -1
```

Bump **both**, together — they are separate strings:

1. the `data-cr-footer` app stamp in `index.html`
2. the `CHANGELOG` head entry in `<script id="cr-cl-script">`, currently `{ b:602`

---

## 8 · Unrelated, also parked on Theo

The **private room** storage test. The database half is proven — an owner sees a
private object, a non-admin and an admin who is not the owner both see nothing.
The **HTTP half is still open**: it needs one throwaway file at
`photos/private/theo@cardinalrenovations.net/` and a request for it from a
non-admin session, expecting a 4xx. `photos/private/` is currently empty, which is
why a refusal cannot be told apart from absence.

**Nothing personal should be uploaded until that test passes.**
