# Getting the photographs onto the Spark

*Written 2 Aug 2026. Two libraries, two very different routes.*

**Why bother:** the Supabase mirror holds 60,485 rows of CompanyCam **metadata** — captions,
dates, job names, addresses, and two CDN links. It holds **no image bytes**. Stop paying
CompanyCam and every link in it dies; the app keeps working, the projects and reports keep
working, but the 61,649 photographs are gone. This is the copy Cardinal owns.

---

## Where it goes

Find the big volume first — don't assume:

```bash
df -h            # pick the mount with hundreds of GB free
```

Then build the tree on it. `/data` below is an example; use whatever `df -h` says is roomy.

```
/data/cardinal/
├── companycam/
│   ├── originals/
│   │   └── 3f9c1a2b--123-Main-St-Dayton-OH/   ← one folder per job
│   │       └── <photo-id>.jpg
│   ├── manifest.jsonl                          ← one line per photo: id, job,
│   │                                             address, date, caption, path
│   └── state.json                              ← resume cursor
│
├── phone/
│   ├── incoming/                               ← raw dump, never edited
│   └── sorted/
│       ├── by-address/
│       ├── by-person/
│       └── unsorted/
│
└── showcase/                                   ← curated pairs, aligned/upscaled
```

```bash
sudo mkdir -p /data/cardinal/{companycam,phone/incoming,phone/sorted,showcase}
sudo chown -R $USER /data/cardinal
```

**Space to expect.** 61,649 originals at ~3 MB averages **≈185 GB**. The `web` rendition is
roughly a sixth of that (~30 GB) and is still far larger than anything the app displays — worth
considering if the NVMe is tight. Phone photos are separate: 16,000 iPhone shots run **50–80 GB**,
much more if there are videos among them.

---

## 1 · CompanyCam → Spark

`fetch_companycam.py` in this folder. Standard library only, nothing to install.

```bash
export COMPANYCAM_API_KEY='...'        # never put this in a file or a commit
cd /path/to/cardinal-inspections/spark

# smoke test first — 50 photos, a couple of minutes
python3 fetch_companycam.py --dest /data/cardinal/companycam --limit 50

# then the real run
python3 fetch_companycam.py --dest /data/cardinal/companycam
```

It is **resumable**: Ctrl-C or a dropped connection costs nothing, re-run the identical command
and it picks up from `state.json` and skips files already on disk.

**It reads the API, not the mirror, and that is deliberate** — the mirror only stores `thumb_url`
and `preview_url`, which are web-sized renditions. Only the API returns the full `uris` array
containing the original. An archive built from the mirror would be an archive of previews.

**It refuses the same photos the app refuses** — anything flagged `internal` in CompanyCam, and
anything not active/processed. The archive must not become a way around that flag.

**Coordinates are off by default.** The no-coordinates decision is written in three places in this
repo, and you don't need them: every photo already carries its job's street address, which makes a
better folder name than a lat/lon pair ever would. `--with-coords` is there if you decide otherwise.

Expect several hours for the full run. Leave it in `tmux` or `screen` so closing the laptop
doesn't kill it:

```bash
tmux new -s archive
python3 fetch_companycam.py --dest /data/cardinal/companycam
# Ctrl-B then D to detach; `tmux attach -t archive` to look in
```

---

## 2 · iPhone → Spark

Harder, because iOS does not hand its photo library to a Linux box. Three routes, best first.

### PhotoSync (recommended for 16,000 photos)

A paid iOS app built for exactly this. It targets SMB or SFTP directly, runs in the background,
remembers what it already sent, and survives being interrupted — which matters at this volume.

1. On the Spark: `sudo apt install openssh-server` (SFTP then works with no further setup).
2. In PhotoSync: add an **SFTP** target — the Spark's Tailscale address, your username, path
   `/data/cardinal/phone/incoming`.
3. Select all, send. Leave it plugged in overnight.

### Files app over SMB (no extra app, fine for hundreds)

1. On the Spark: `sudo apt install samba`, share `/data/cardinal/phone/incoming`.
2. On the iPad/iPhone: **Files → ⋯ → Connect to Server →** `smb://100.x.y.z`.
3. In Photos, select a batch → **Share → Save to Files** → that share.

Workable, but selecting 16,000 photos through the Files app is miserable and prone to timing out.
Use it for a few hundred, not the whole library.

### Via a Mac or PC

iPhone → Finder/Image Capture → a folder → copy to the Spark with `rsync` or `scp`. Reliable, but
needs a computer in the middle.

### ⚠️ The setting that decides whether any of this works

**Settings → Photos → Transfer to Mac or PC → `Keep Originals`.**

On `Automatic`, iOS transcodes HEIC to JPEG on the way out and **metadata can be lost in the
conversion — including GPS**. Sorting your phone photos by address depends entirely on that GPS
being intact. Get this wrong and you copy 16,000 files that cannot be sorted, and you won't find
out until afterwards.

Check a handful right after the first batch lands:

```bash
sudo apt install libimage-exiftool-perl
exiftool -GPSLatitude -GPSLongitude -DateTimeOriginal /data/cardinal/phone/incoming/*.HEIC | head -20
```

If GPS is there, carry on. If it isn't, stop and fix the setting before sending the rest.

---

## What I could not verify from here

This sandbox cannot reach CompanyCam or the Spark, so:

- **The download script has never made a live call.** Its paging, its refusal rules and its
  rendition order are copied from `api/companycam-sync.js` and `api/companycam.js`, which are
  proven in production against this exact account — but run `--limit 50` first and look at what
  lands before committing to hours.
- **Whether the CompanyCam CDN links expire** is still unknown. Irrelevant once the archive
  exists, which is part of why the archive is worth having.
- **Whether CompanyCam offers a bulk export** that beats paging the API — worth one email to
  their support before spending a night on this. If they do, use it.
