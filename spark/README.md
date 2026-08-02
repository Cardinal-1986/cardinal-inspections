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
│   │   └── Dayton-OH/                          ← one folder per town
│   │       └── 123-Main-St-45402--3f9c1a2b/    ← full street address + ZIP
│   │           └── <photo-id>.jpg
│   ├── manifest.jsonl                          ← one line per photo: id, job,
│   │                                             address, date, caption, path
│   ├── jobs.jsonl                              ← one point per job (--with-coords)
│   └── state.json                              ← resume cursor + layout
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

**Coordinates: `--with-coords`.** See the section below — worth reading once before you turn it on.

**Foldering: the full address, nested by town.** `--layout city` is the default and gives you
`Dayton-OH/123-Main-St-45402--3f9c1a2b/`, so you can open one town and see every job in it. The
street line is the complete address including apartment and ZIP — flattened the same way
`api/companycam-sync.js` does it, which is proven against this account. `--layout flat` puts the
whole address on one folder instead.

The eight-character job id on the end is always there, and it earns its place: two jobs really can
share an address — a repeat customer, a re-roof years later, a duplicate record — and quietly
merging their photographs into one folder is not something you could untangle afterwards.

⚠️ **Pick the layout before the big run.** Changing it later would download everything a second
time into a new folder tree while the old one still sits on disk. The script records the layout in
`state.json` and refuses to run with a different one rather than let that happen quietly.

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

## 3 · Geolocation, for marketing with consent

Theo asked for coordinates to come across so finished work can be matched to a homeowner's
neighbourhood. They can.

```bash
python3 fetch_companycam.py --dest /data/cardinal/companycam --with-coords
```

That writes `lat`/`lon` onto each line of `manifest.jsonl` and rolls every job up into
**`jobs.jsonl`** — one point per job with its address and photo count, which is what a map or a
"jobs near this address" query actually wants. Far less duplication than eighty photos each
carrying the same driveway.

**On the fence.** The no-coordinates rule written into `companycam_index.sql`,
`api/companycam-sync.js` and `api/companycam.js` is about the **Supabase mirror** — not carrying
customers' coordinates into a second online system the whole team queries. This archive is
Cardinal's own hardware and a different decision, and it is Theo's to make. The app's fence stays
exactly where it is; nothing here changes it.

### Where the photos can and cannot come from

| Source | Coordinates? |
|---|---|
| **CompanyCam → Spark** | **Yes.** Every photo carries `coordinates {lat, lon}`; `--with-coords` keeps them. |
| **Phone → Spark** | **Yes, if** Photos is set to `Keep Originals` (see above). Otherwise iOS strips GPS on the way out. |
| **Cardinal app → Spark** | **No, and it is already too late for existing photos.** Every upload path in the app re-encodes through a canvas, which drops EXIF as a side effect. The photos in the `photos` bucket never had coordinates and cannot be made to have them retroactively. Use CompanyCam as the geo source. |

### ⚠️ The part that makes "with consent" real

**EXIF travels inside the file.** Post an original straight out of this archive and the house's
latitude and longitude go with it — whatever the caption says, whatever the client agreed to. Some
platforms strip EXIF on upload. A file served from cardinalrenovations.net does not.

So keep coordinates in the archive, and publish nothing that carries them:

```bash
# what would leak right now?
python3 strip_exif.py /data/cardinal/companycam/originals --check

# clean copies for the website or social — originals untouched
python3 strip_exif.py /data/cardinal/showcase/raw /data/cardinal/showcase/web --max 2048
```

`strip_exif.py` re-encodes from pixels only, so nothing from the source header survives, and it
**verifies every file it writes** rather than trusting the library. It refuses to write inside the
source folder — the archive original is never modified.

It also **bakes in the rotation before discarding the metadata**. Phone photos are usually stored
sideways with an EXIF Orientation tag telling the viewer to turn them; strip the tag blind and
every portrait shot publishes on its side. Tested: an Orientation-6 800×600 input comes out a
correctly-turned 600×800 with zero EXIF tags.

**Two judgement calls that stay yours:** knowing a coordinate is not the same as publishing one —
consent to use someone's photos is not automatically consent to publish their address, so prefer
showing the street or the neighbourhood over the pin. And the release itself belongs in
`showcase_pairs.release_on` / `release_by` in the app, so a year from now the permission can still
be proven.

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
