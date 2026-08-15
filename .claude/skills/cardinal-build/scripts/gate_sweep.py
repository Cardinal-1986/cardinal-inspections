#!/usr/bin/env python3
"""gate_sweep — the storage sweep deletes only what it should.

A sweep is the one script here that can destroy work, so it is tested against
the two mistakes that would actually hurt, both by executing the SHIPPED
functions rather than re-implementing their logic:

  1. DELETING SOMETHING A ROW STILL POINTS AT. Renders, previews, masks and
     source photographs all live under the same prefix and look alike. The
     only thing separating "safe to bin" from "a customer's render" is whether
     a row mentions it.

  2. DELETING A COMPANYCAM IMPORT THAT HAS NOT BEEN RENDERED YET. Between the
     import and the Render click, the file exists and NOTHING references it —
     it is indistinguishable from garbage by reference alone. The age floor is
     what protects it, and a naive sweep has no age floor at all.

It also checks the walker recurses (the storage list API is not recursive, and
a sweep that only reads the top level silently misses almost everything) and
that a dry run deletes nothing.

    python3 gate_sweep.py
"""
import importlib.util
import json
import os
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
SPARK = ROOT / "spark"

os.environ.setdefault("SUPABASE_URL", "http://sweep.invalid")
os.environ.setdefault("SUPABASE_SERVICE_KEY", "gate-not-a-key")

CHECKS = []
def chk(name, ok, detail=""):
    CHECKS.append((name, bool(ok), str(detail)))

# ── a fake bucket and database ────────────────────────────────────────────
NOW = datetime.now(timezone.utc)
OLD = (NOW - timedelta(days=3)).isoformat().replace("+00:00", "Z")
NEW = (NOW - timedelta(minutes=5)).isoformat().replace("+00:00", "Z")

#   visualizer/
#     src/            imported-old.jpg (referenced), imported-new.jpg (NOT yet)
#                     stale-import.jpg (unreferenced AND old -> sweepable)
#     job-live/       render, preview, mask_roof   (all referenced)
#     job-deleted/    render, preview, mask_roof   (row is gone -> sweepable)
BUCKET = {
    "visualizer": [
        {"name": "src",         "id": None},
        {"name": "job-live",    "id": None},
        {"name": "job-deleted", "id": None},
    ],
    "visualizer/src": [
        {"name": "imported-old.jpg",  "id": "1", "metadata": {"size": 100}, "created_at": OLD},
        {"name": "imported-new.jpg",  "id": "2", "metadata": {"size": 200}, "created_at": NEW},
        {"name": "stale-import.jpg",  "id": "3", "metadata": {"size": 300}, "created_at": OLD},
    ],
    "visualizer/job-live": [
        {"name": "render.jpg",   "id": "4", "metadata": {"size": 400}, "created_at": OLD},
        {"name": "preview.jpg",  "id": "5", "metadata": {"size": 500}, "created_at": OLD},
        {"name": "mask_roof.png","id": "6", "metadata": {"size": 600}, "created_at": OLD},
    ],
    "visualizer/job-deleted": [
        {"name": "render.jpg",   "id": "7", "metadata": {"size": 700}, "created_at": OLD},
        {"name": "preview.jpg",  "id": "8", "metadata": {"size": 800}, "created_at": OLD},
        {"name": "mask_roof.png","id": "9", "metadata": {"size": 900}, "created_at": OLD},
    ],
}
JOBS = [{
    "source_path":  "visualizer/src/imported-old.jpg",
    "render_path":  "visualizer/job-live/render.jpg",
    "preview_path": "visualizer/job-live/preview.jpg",
    "masks": {"roof": "visualizer/job-live/mask_roof.png"},
}]
RENDERS = [{
    "source_path":  "visualizer/src/imported-old.jpg",
    "render_path":  "visualizer/job-live/render.jpg",
    "preview_path": "visualizer/job-live/preview.jpg",
}]

DELETED = []          # every path the script asked storage to remove


class Resp:
    def __init__(self, body): self._b = body
    def raise_for_status(self): pass
    def json(self): return self._b


def fake_get(url, **kw):
    if "/rest/v1/design_jobs" in url:    return Resp(JOBS)
    if "/rest/v1/design_renders" in url: return Resp(RENDERS)
    raise AssertionError("unexpected GET " + url)


def fake_post(url, **kw):
    assert "/storage/v1/object/list/photos" in url, url
    body = kw.get("json") or {}
    return Resp(BUCKET.get(body.get("prefix", ""), []))


def fake_delete(url, **kw):
    body = kw.get("json") or {}
    paths = body.get("prefixes") or []
    DELETED.extend(paths)
    return Resp([{"name": p} for p in paths])


spec = importlib.util.spec_from_file_location("sweep", SPARK / "sweep_visualizer.py")
sweep = importlib.util.module_from_spec(spec)
spec.loader.exec_module(sweep)
sweep.requests.get = fake_get
sweep.requests.post = fake_post
sweep.requests.delete = fake_delete

# ── 1. it finds every file, at every depth ────────────────────────────────
files = sweep.walk("visualizer")
paths = sorted(p for p, _, _ in files)
chk("the walker recurses into subfolders (the list API does not)",
    len(files) == 9, "%d file(s): %s" % (len(files), paths[:3]))
chk("folders are not mistaken for files",
    "visualizer/src" not in paths and "visualizer/job-live" not in paths)

# ── 2. references are read from the rows, not guessed from names ──────────
keep = sweep.referenced()
chk("every referenced path is collected, masks included",
    keep == {
        "visualizer/src/imported-old.jpg",
        "visualizer/job-live/render.jpg",
        "visualizer/job-live/preview.jpg",
        "visualizer/job-live/mask_roof.png",
    }, sorted(keep))

# ── 3. a DRY RUN deletes nothing ──────────────────────────────────────────
DELETED.clear()
sys.argv = ["sweep_visualizer.py"]
sweep.main()
chk("a dry run deletes nothing at all", DELETED == [], DELETED)

# ── 4. --apply removes ONLY the orphaned, old files ───────────────────────
DELETED.clear()
sys.argv = ["sweep_visualizer.py", "--apply"]
sweep.main()
got = set(DELETED)
want = {
    "visualizer/src/stale-import.jpg",
    "visualizer/job-deleted/render.jpg",
    "visualizer/job-deleted/preview.jpg",
    "visualizer/job-deleted/mask_roof.png",
}
chk("it removes the files whose job row was deleted", want <= got, sorted(got))
chk("it removes nothing else", got == want, "extra: %s" % sorted(got - want))

# the two that would actually hurt, stated as their own checks
chk("⚠ it NEVER deletes a file a row still points at",
    not (got & keep), "would have deleted: %s" % sorted(got & keep))
chk("⚠ it NEVER deletes a fresh CompanyCam import awaiting its first Render",
    "visualizer/src/imported-new.jpg" not in got)

# ── 5. the age floor is load-bearing, so prove removing it breaks things ──
DELETED.clear()
sys.argv = ["sweep_visualizer.py", "--apply", "--min-age-hours", "0"]
sweep.main()
chk("CONTROL: with the age floor at 0 the fresh import IS swept — "
    "so the floor is what protects it, not luck",
    "visualizer/src/imported-new.jpg" in set(DELETED), sorted(DELETED))

# ── 6. the prefix is not a parameter ──────────────────────────────────────
src = (SPARK / "sweep_visualizer.py").read_text()
chk("the visualizer/ prefix is hardcoded, not an argument",
    'PREFIX = "visualizer"' in src and "--prefix" not in src)

fails = 0
for name, ok, detail in CHECKS:
    if not ok:
        fails += 1
    print(("  PASS  " if ok else "  FAIL  ") + name + (("   [" + detail + "]") if detail else ""))
print("RED — %d of %d failed" % (fails, len(CHECKS)) if fails
      else "GREEN — %d/%d" % (len(CHECKS), len(CHECKS)))
sys.exit(1 if fails else 0)
