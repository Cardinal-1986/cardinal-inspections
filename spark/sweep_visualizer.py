#!/usr/bin/env python3
"""
Cardinal Exterior Visualizer — sweep unreferenced images out of storage.

Runs ON the Spark, beside visualizer_worker.py, and reads the same spark/.env.
Deleting a design_jobs row does not delete the pictures it made: the app's own
Delete button removes both, but a row deleted straight from SQL leaves its
render, preview and masks behind. Tonight's cleanup left ~60 files, ~20 MB.

    python3 sweep_visualizer.py            # DRY RUN — lists, deletes nothing
    python3 sweep_visualizer.py --apply    # actually delete
    python3 sweep_visualizer.py --apply --min-age-hours 2

────────────────────────────────────────────────────────────────────────────
WHY THIS IS NOT A SQL DELETE

The obvious version is `delete from storage.objects where ...`, and it is
wrong. That row is Supabase's INDEX of the object, not the object. Delete the
row and the file stays in the bucket, now invisible to every tool that could
have cleaned it up — you have not freed the space, you have hidden it. This
goes through the storage API, which removes both.

────────────────────────────────────────────────────────────────────────────
WHAT IT WILL NOT TOUCH

  1. Anything referenced by a live row. Every render_path, preview_path and
     source_path on design_jobs, every mask value inside design_jobs.masks,
     and both paths on design_renders. If a path appears anywhere, it stays.

  2. Anything outside `visualizer/`. The photos bucket also holds project
     photographs, the Showcase, the Studio archive and Walk overlays. The
     prefix is hardcoded and not a parameter, because the blast radius of
     getting that wrong is the whole company's photography.

  3. Anything younger than --min-age-hours (default 24). A rep who has just
     imported a CompanyCam photograph has an object in visualizer/src/ that no
     row references YET — the job does not exist until they press Render. A
     sweep with no age floor would delete the picture out from under them
     between the import and the click. This is the guard that matters most and
     it is the one a naive version leaves out.

Dry run is the default. It prints exactly what it would remove and stops.
"""
import argparse
import os
import sys
from pathlib import Path

try:
    import requests
except ImportError as e:
    sys.exit("Missing dependency: %s\n  pip install requests" % e.name)

HERE = Path(__file__).resolve().parent
BUCKET = "photos"
PREFIX = "visualizer"          # hardcoded on purpose — see the docstring


def _load_dotenv():
    """Same minimal reader as the worker. Never clobbers a real env var."""
    p = HERE / ".env"
    if not p.exists():
        return
    for line in p.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


_load_dotenv()
SUPABASE_URL = (os.environ.get("SUPABASE_URL") or "").rstrip("/")
SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY") or ""
if not SUPABASE_URL or not SERVICE_KEY:
    sys.exit("SUPABASE_URL and SUPABASE_SERVICE_KEY are required (see spark/.env).")

H = {"apikey": SERVICE_KEY, "Authorization": "Bearer " + SERVICE_KEY}


def log(msg):
    print(msg, flush=True)


# ── what the database still points at ──────────────────────────────────────
def referenced():
    """Every storage path any live row mentions.

    Built by asking for the columns rather than by pattern-matching names: a
    file is safe because a row points at it, not because it looks important.
    """
    keep = set()

    r = requests.get(
        SUPABASE_URL + "/rest/v1/design_jobs"
        "?select=source_path,render_path,preview_path,masks",
        headers=H, timeout=60)
    r.raise_for_status()
    for row in r.json():
        for k in ("source_path", "render_path", "preview_path"):
            if row.get(k):
                keep.add(row[k])
        masks = row.get("masks") or {}
        if isinstance(masks, dict):
            for v in masks.values():
                if v:
                    keep.add(v)

    r = requests.get(
        SUPABASE_URL + "/rest/v1/design_renders"
        "?select=source_path,render_path,preview_path",
        headers=H, timeout=60)
    r.raise_for_status()
    for row in r.json():
        for k in ("source_path", "render_path", "preview_path"):
            if row.get(k):
                keep.add(row[k])

    return keep


# ── what is actually in the bucket ─────────────────────────────────────────
def list_folder(prefix):
    """One level of the bucket. The storage list API is NOT recursive: a
    subfolder comes back as an entry with id == None, and its contents only
    appear when you ask for that prefix. Treating the first page as the whole
    answer is how a sweep misses most of what it was meant to find."""
    out, offset = [], 0
    while True:
        r = requests.post(
            "%s/storage/v1/object/list/%s" % (SUPABASE_URL, BUCKET),
            headers=dict(H, **{"Content-Type": "application/json"}),
            json={"prefix": prefix, "limit": 100, "offset": offset,
                  "sortBy": {"column": "name", "order": "asc"}},
            timeout=60)
        r.raise_for_status()
        page = r.json()
        if not page:
            break
        out.extend(page)
        if len(page) < 100:
            break
        offset += len(page)
    return out


def walk(prefix):
    """Every FILE under a prefix, depth-first. Returns (path, size, created)."""
    files = []
    for e in list_folder(prefix):
        name = e.get("name")
        if not name:
            continue
        full = prefix + "/" + name
        if e.get("id") is None:            # a folder, not an object
            files.extend(walk(full))
        else:
            meta = e.get("metadata") or {}
            files.append((full, int(meta.get("size") or 0),
                          e.get("created_at") or ""))
    return files


def remove(paths):
    """Delete through the storage API, in batches. This removes the object AND
    its row; a SQL delete would remove only the row."""
    gone = 0
    for i in range(0, len(paths), 100):
        batch = paths[i:i + 100]
        r = requests.delete(
            "%s/storage/v1/object/%s" % (SUPABASE_URL, BUCKET),
            headers=dict(H, **{"Content-Type": "application/json"}),
            json={"prefixes": batch}, timeout=120)
        r.raise_for_status()
        gone += len(r.json() or [])
    return gone


def human(n):
    for unit in ("B", "KB", "MB", "GB"):
        if n < 1024 or unit == "GB":
            return "%.1f %s" % (n, unit)
        n /= 1024.0


def main():
    ap = argparse.ArgumentParser(description="Sweep unreferenced Visualizer images.")
    ap.add_argument("--apply", action="store_true",
                    help="actually delete. Without this it is a dry run.")
    ap.add_argument("--min-age-hours", type=float, default=24.0,
                    help="never touch anything younger than this (default 24). "
                         "Protects a CompanyCam import that has not been rendered yet.")
    args = ap.parse_args()

    from datetime import datetime, timezone, timedelta
    cutoff = datetime.now(timezone.utc) - timedelta(hours=args.min_age_hours)

    log("reading what the database still points at…")
    keep = referenced()
    log("  %d referenced path(s)" % len(keep))

    log("listing %s/%s/ …" % (BUCKET, PREFIX))
    files = walk(PREFIX)
    log("  %d file(s) in the bucket" % len(files))

    doomed, young, bytes_ = [], 0, 0
    for path, size, created in files:
        if path in keep:
            continue
        try:
            when = datetime.fromisoformat(created.replace("Z", "+00:00"))
        except Exception:
            when = None
        # No timestamp means we cannot prove it is old. Keep it — the cost of a
        # wrong delete here is a photograph a rep is mid-way through using.
        if when is None or when > cutoff:
            young += 1
            continue
        doomed.append(path)
        bytes_ += size

    log("")
    log("  referenced, keeping ....... %d" % (len(files) - len(doomed) - young))
    log("  too new, keeping .......... %d  (younger than %gh)" % (young, args.min_age_hours))
    log("  unreferenced, sweepable ... %d  (%s)" % (len(doomed), human(bytes_)))

    if not doomed:
        log("\nNothing to do.")
        return 0

    for p in doomed[:20]:
        log("    " + p)
    if len(doomed) > 20:
        log("    … and %d more" % (len(doomed) - 20))

    if not args.apply:
        log("\nDRY RUN — nothing deleted. Re-run with --apply to remove these.")
        return 0

    log("\ndeleting…")
    gone = remove(doomed)
    log("removed %d file(s), freed %s" % (gone, human(bytes_)))
    if gone != len(doomed):
        log("⚠ asked for %d, storage reported %d — re-run to see what is left."
            % (len(doomed), gone))
    return 0


if __name__ == "__main__":
    sys.exit(main())
