# Tagging the archive for the Studio

*Written 2026-08-03. Hand this to Hermes as-is.*

**What this is for:** a backend curation library — tag every photo in the
archive by what's in it, so "nail pops" or "aerial" in a search box pulls up
matching photos, and folders happen automatically from the tags rather than
needing to be built by hand. This tool is never shown to a client; it exists
so Theo can find a good example fast.

**Your job stops at one local file.** You never touch Supabase, never need a
credential, never make a network call. Read photos, write tags, done. A
separate script (already written, `push_studio_tags.py` in this folder) reads
your output and does everything from there.

---

## The output

One file: `studio_tags.jsonl`, one JSON object per line, **append-only**.

```json
{"id":"98234871","source":"companycam","path":"companycam/originals/Dayton-OH/123-Main-St-45402--3f9c1a2b/98234871.jpg","tags":["nail_pop","roof"],"confidence":{"nail_pop":0.82,"roof":0.95},"tagged_at":"2026-08-03T04:00:00Z"}
```

| Field | What it is |
|---|---|
| `id` | See below — where it comes from depends on the source. |
| `source` | `"companycam"` or `"phone"`. |
| `path` | Relative to `/data/cardinal/` — the same tree `spark/README.md` already lays out. `companycam/originals/...` or `phone/sorted/...`. |
| `tags` | Flat array of strings. **Never empty-by-omission** — see below. |
| `confidence` | Optional, `{tag: 0.0-1.0}`. Worth including if your model gives you one; makes a later human review pass much faster. |
| `tagged_at` | ISO 8601, when you tagged it. |

### `id` — reuse what already exists, don't invent a second one

- **CompanyCam-sourced photos already have an id** — it's sitting right there
  in `manifest.jsonl` (`fetch_companycam.py`'s own output), one line per photo,
  with a `path` field pointing at the exact file. **Drive your tagger off
  `manifest.jsonl` directly** rather than walking the archive folders
  yourself: for each row, tag the file at `dest/<row.path>`, and echo that
  row's `id` straight through into your own output, unchanged. This is the
  whole reason to use it — zero id logic to write for this half.
- **Phone photos have no such file.** Assign your own id there:
  `"phone:" + sha256(relative_path)[:16]`. Stable across re-runs of the same
  file in the same place; that's all it needs to be.

### `tags: []` is a real answer, not a skip

If you looked at a photo and it doesn't match anything, still write the
record with an empty `tags` array. **Don't omit the line.** The push script
needs to tell "haven't gotten to this one yet" apart from "looked, found
nothing" — the same distinction the app's own Walk review screen already
makes between *Not checked* and *Nothing found*. An omitted line looks like
the first; an empty array is the second.

---

## The vocabulary

**Damage tags — reuse this list verbatim, don't reinvent it.** It's
`api/detect.js`'s own defect vocabulary, the same one `/api/detect` already
uses and the same one `hail_review.py` already trains toward:

```
hail_impact, wind_lifted, missing_shingle, granule_loss, cracked_split,
nail_pop, exposed_fastener, flashing_failed, flashing_missing, pipe_boot,
chimney, valley, ridge_cap, ponding_debris, decking_sag, ice_dam, other
```

**Composition / content tags are open** — `aerial`, `roof`, `siding`,
`close-up`, `wide`, whatever your model actually produces usefully. That part
is genuinely your and Theo's call, not something to match against an existing
list. One constraint: keep it flat strings in the same `tags` array as the
damage tags. No separate field, no category/type distinction — see below.

**A rough city or area name is fine as a tag** (`dayton`, `kettering`) if
useful — it's no different in kind from `aerial` or `roof`. It is not the
same thing as `project_address`, which the push script fills in separately
from `manifest.jsonl` — you don't need to produce that at all.

---

## What NOT to build

**No folder tree.** Don't create directories, don't emit a `category` or
`folder` field distinct from `tags`, don't nest anything. The tag array *is*
the folder system — the app groups photos by tag on its own. A stored folder
hierarchy next to a tag column would be two mechanisms answering the same
question, and that's a real, named trap on this project (grep `CLAUDE.md` for
"one pipeline per concept" if you want the long version).

**No Supabase, no network, no credential.** If your tagger wants to call out
to anything beyond reading local files, stop — that's not this script's job.

---

## Resumability

Match the pattern every other script in this folder already uses
(`fetch_companycam.py`, `hail_review.py`): **Ctrl-C should cost nothing.**
Track what's already in `studio_tags.jsonl` (by `id`) and skip it on the next
run rather than re-tagging from scratch. A `state.json` next to the output
file, or just reading the existing jsonl back in at startup — either is fine,
whatever's simplest against however your model runs.

---

## Handoff

Once `studio_tags.jsonl` has anything in it:

```bash
export CARDINAL_EMAIL='theo@cardinalrenovations.net'
export CARDINAL_PASSWORD='...'          # never on the command line, never in a file
python3 push_studio_tags.py --dest /data/cardinal/companycam --tags studio_tags.jsonl
```

That's the script that actually reaches Supabase — reads your file, joins
CompanyCam-sourced rows against `manifest.jsonl` for the address, generates a
browsing-size thumbnail, and upserts into `studio_photos`. Resumable the same
way. You don't need to look at it to do your half of this.
