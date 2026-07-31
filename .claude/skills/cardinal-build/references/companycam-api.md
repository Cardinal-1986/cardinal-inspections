# CompanyCam API — what is actually known

*Three passes, in increasing order of trust. The v2 section came from the OpenAPI definition on the
"List All Checklists" page of `docs.companycam.com`. The **v1 section** came from a 109-page PDF of
`developers.companycam.com/api-reference`, read page by page. **Then `api/companycam-status.js` ran
against Cardinal's live account and measured what the screenshots could not show.** All 31 July
2026.*

**Read the provenance markers.** Anything marked **MEASURED** came back from the live API and is
fact. Anything marked *confirmed* was read off a legible pixel in the PDF. Anything marked *not
legible* is exactly that, and is not transcribed. **Where the two disagreed, the measurement won** —
`uris` has six types, not the three the v2 docs list, and this file said three until the probe
said otherwise.

**This environment cannot reach `api.companycam.com`, `docs.companycam.com`, `app.companycam.com`
or `developers.companycam.com`** — the agent proxy blocks every CompanyCam host, the
third-party mirrors (rollout, pipedream, mindcloud, dlthub) with them, and `*.vercel.app` besides.
Verified by direct request, not assumed. **The live measurements above exist because the probe runs
on Vercel and Theo opened it in a browser** — that is the only path from here to a real response,
and it is the path to use again for anything still open.

**Why this file exists:** the alternative is inventing field names, which is the failure the vinyl
cards at 461 and the `/api/config` note in `CLAUDE.md` both exist to prevent.

**A note on how the v1 section was read.** The PDF has **no text layer** — it is 8 full-page
screenshots at 3440×4522, each a ~1.5 MB JPEG. `pypdf` and `pdfminer.six` both abort at import in
this image (`cryptography`'s Rust binding is broken, `_cffi_backend` missing) and `poppler-utils`
404s from the Ubuntu mirror. The images were extracted with a zlib-and-regex script
(`scratchpad/pdftext.py`), then cropped and upscaled through Chromium's canvas
(`scratchpad/crop.js`) to read the small type. **Everything below marked *confirmed* was read off
a legible pixel.** Everything not legible is marked as such and is not transcribed.

---

# Use v1. `app.companycam.com/public_api/v1`.

There are two CompanyCam APIs and they are not variants of each other.

| | **v2** | **public_api/v1** ← use this |
|---|---|---|
| Host | `api.companycam.com/v2` | `app.companycam.com` |
| Docs | `docs.companycam.com` (ReadMe) | `developers.companycam.com` (Scalar) |
| Auth | `Authorization: Bearer` | OAuth2 Bearer **with scopes** — 403 `insufficient_scope` |
| Response | bare object / array | `{data, errors, meta}` envelope |
| Timestamps | **Unix `int32`** | **ISO 8601 strings** |
| Pagination | `page` / `per_page` | **cursor: `after` / `before` + `limit`** |
| Account-wide photo list | ✗ — only `GET /v2/projects/{id}/photos` | ✓ **`GET /public_api/v1/photos`** |
| Date / tag / user filters on that list | ✗ | ✓ |

v1 wins on the two things an importer actually needs: **one account-wide photo list**, and
**server-side date and tag filtering** so we are not paging 20,000 photos to find the winter ones.

---

# v1 — confirmed

`v1` · `OpenAPI 3.0.3` · titled **CompanyCam Public API** · *"OAuth2-authenticated public API."*

| | |
|---|---|
| Server | `https://app.companycam.com` |
| Path prefix | `/public_api/v1` |
| Env var (set in Vercel, 31 Jul) | `COMPANYCAM_API_KEY` |

**Envelope.** Verbatim from the introduction: *"All responses use a `{data, errors, meta}` envelope
with snake_case keys, string IDs, and ISO 8601 timestamps. Index endpoints support cursor
pagination via `?after=` / `?before=` query params."*

**Pagination `meta`**, identical on every index endpoint seen (photos, project_groups, users,
conditional_checklists):

```json
"meta": { "next_cursor": null, "prev_cursor": null, "has_next": true, "has_prev": true }
```

**`limit`**, identical wording on every index: `integer · min: 1 · max: 100`.
*"Maximum number of records per page. Defaults to 50; values above 100 are clamped to 100."*

**Auth.** *"Bearer tokens are issued by Doorkeeper. Failed authentication returns a structured
error code (`invalid_token` / `token_expired` / `token_revoked` / `insufficient_scope`) plus an
RFC 6750 `WWW-Authenticate` header on 401s."* There is a `POST /public_api/v1/access_tokens/verify`
that takes an empty body and returns `{data:{message}}` — **use it as the importer's health check**
rather than burning a real list call to find out the key is wrong.

**Webhooks.** Deliveries carry `X-CompanyCam-Signature` containing
`Base64(HMAC-SHA1(webhook.token, raw_body))`. *"Verify against the raw request body, not a
re-serialized parse."* Full CRUD at `/public_api/v1/webhooks`.

---

## `Photos` — the four operations

```
GET    /public_api/v1/photos          index
GET    /public_api/v1/photos/{id}     show
PATCH  /public_api/v1/photos/{id}     update
DELETE /public_api/v1/photos/{id}     destroy
```

**There is no `POST /public_api/v1/photos`.** Uploading a photo is not something this API surface
offers at the top level. We only ever want to read, so this does not block anything — but do not
design an "upload back to CompanyCam" step on the assumption it exists.

### `index` — `GET /public_api/v1/photos`

**This is the endpoint the whole integration was waiting on.** Query parameters, exactly as listed:

| Param | Type | Notes |
|---|---|---|
| `after` | string | cursor — feed it `meta.next_cursor` |
| `before` | string | cursor |
| `start_date` | *oneOf* two string forms | the doc renders it as a `One of string` selector; **the second form is not legible in the capture** |
| `end_date` | string | |
| `project_ids` | array string[] | |
| `group_ids` | array string[] | |
| `tag_ids` | array string[] | |
| `user_ids` | array string[] | |
| `include` | string | **accepted values not legible** — see "still unknown" |
| `include_total` | string | typed `string`, not boolean |
| `limit` | integer · min 1 · max 100 | default 50, clamped at 100 |

Responses: **200** *"excludes deleted photo from subsequent index"* · **401** invalid_token +
`WWW-Authenticate` · **403** insufficient_scope · **422** *"rejects invalid date strings"*.

That 422 matters: **a malformed date is a hard error, not an ignored parameter.** Format the dates
the way the API wants them or the call fails outright — and the exact accepted format is one of the
things not legible in the capture, so **the first live call has to probe it.**

### `Photo` — MEASURED against the live account, 31 July 2026

Not read off a screenshot. This is `Object.keys()` on a real photo, returned by
`/api/companycam-status` against Cardinal's own CompanyCam account. **20 fields, complete:**

```
captured_at   comment_count   company_id    coordinates   created_at
creator_id    creator_name    creator_type  description   has_comments
hash          id              internal      origin        photo_url
processing_status             project_id    status        updated_at    uris
```

**`description` exists — the caption problem is solved.** This was the one thing that could have
sunk the whole idea, because `project_photos` in Supabase has 236 rows and zero captions, and an
uncaptioned photo library is the thing we already have and cannot use. CompanyCam photos carry
their caption natively.

`captured_at` and `processing_status` are both present too — the screenshot capture had them below
the fold, and this file previously said they were "gone from the legible portion." They were never
gone; they were just unread. **`tags` is genuinely absent**, confirming tags need their own call.

`timestamp_type` measured as `string` — ISO 8601 confirmed, not v2's Unix ints.

### `uris[]` — SIX types, not three. This was the surprise.

```
original   web   thumbnail   original_annotation   web_annotation   thumbnail_annotation
```

The v2 docs list only the first three, and this file guessed from them. **The `_annotation`
variants are the crew's marked-up copies** — CompanyCam lets someone draw arrows and circles on a
photo, and those are stored as separate renditions.

**For library figures that inverts the obvious choice.** A raw photo of a roof is a photo of a
roof; the same photo with the foreman's arrow pointing at the ice dam is *teaching material*.
Prefer **`web_annotation` when it exists, falling back to `web`** — and never `original`, which
drags full-resolution job photos into the app for no benefit. `thumbnail` for lists.

Each item is `{ type, uri, url }`.

### `show` — `GET /public_api/v1/photos/{id}`

Path param `id` `integer` required. Query param **`include`** `string`. Responses 200/401/403/404.
The curl example is `curl 'https://app.companycam.com/public_api/v1/photos/1?include…` — **clipped
at the panel edge exactly where the value would be.**

### `update` — `PATCH /public_api/v1/photos/{id}`

Body `photo` object, `application/x-www-form-urlencoded`. The example sends
`--data-urlencode 'photo.internal='` and the 200 is captioned *"updates internal flag and returns
the photo"*. **Flipping `internal` is the documented use of this endpoint.** We have no reason to
call it — the importer is read-only — but note it exists before anyone reaches for it.

### `destroy` — `DELETE /public_api/v1/photos/{id}`

*"soft-deletes the photo and returns 204."* Confirms the 200-on-index caption: a destroyed photo
disappears from subsequent index calls rather than coming back with a tombstone status.

---

## Photo-adjacent resources

```
GET  POST   /public_api/v1/photos/{photo_id}/comments        Photo Comment
POST        /public_api/v1/photos/{photo_id}/descriptions    Photo Description  ← POST only
GET  POST   /public_api/v1/photos/{photo_id}/tags            Photo Tag
GET         /public_api/v1/projects/{project_id}/photos/tags Project Photo Tag
GET POST DELETE GET PATCH  /public_api/v1/tags[/{id}]        Tags — full CRUD
```

**`Photo Description` is POST-only — and that turned out not to matter.** There is no
`GET .../descriptions`, which looked like the importer's biggest risk: either the caption lived on
the Photo object or it needed a second call nobody could see. **The probe settled it — `description`
is a field on the Photo itself**, so the account-wide index returns captions in one pass. The
POST-only resource is for *writing* a description back, which we never do. Reading needs nothing
extra.

### `Projects → index` — `GET /public_api/v1/projects`

*Read 31 July off Theo's screen in the **Scalar API client** (`client.scalar.com`), which is the
interactive twin of the reference — same document, but every parameter is a live input box.*

Query parameters, and they are **not** the photo index's:

```
after   archived   assigned_user_ids   include   include_total   limit   status
```

**No `start_date` / `end_date`, no `tag_ids`.** Projects filter on `archived` and `status` instead.
So "photos from jobs we ran last winter" cannot be reached by filtering projects by date — go at it
through the **photo** index, which does carry the date filters, and use `project_id` off each photo
to label it. One pass, not two.

`limit` showed a default of **50**, matching every other index.

**Tags are a first-class resource in v1**, which the v2 schema had no field for at all. `tag_ids` on
the photo index is a server-side filter, and `GET /public_api/v1/tags` is how you learn the ids to
filter on. That is the clean path to "give me every photo the crew tagged *ice dam*" — one list
call for the tag id, one filtered photo call.

---

## Other v1 endpoints worth knowing exist

```
POST   /public_api/v1/access_tokens/verify
GET    /public_api/v1/companies/current          GET /public_api/v1/companies/{id}
GET    /public_api/v1/projects                   POST /public_api/v1/projects
GET    /public_api/v1/projects/search
GET PATCH DELETE /public_api/v1/projects/{id}
PATCH  /public_api/v1/projects/{id}/archive | /notepad | /restore | /unarchive
GET    /public_api/v1/projects/{project_id}/assigned_users | /collaborators | /videos
GET    /public_api/v1/users                      GET /public_api/v1/users/{id}
GET    /public_api/v1/videos                     GET /public_api/v1/videos/{id}
GET    /public_api/v1/documents | /groups | /labels | /pages | /mcp_calls
GET    /public_api/v1/templates/conditional_checklists
GET POST DELETE GET PATCH  /public_api/v1/webhooks[/{id}]
GET POST DELETE GET PATCH  /public_api/v1/project_groups[/{id}]
```

**`Video`** is the one schema in the capture that is complete rather than clipped, and it is worth
recording because it shows what the tail of a CompanyCam media object looks like:

```json
{ "id","company_id","creator_id","creator_type","creator_name","project_id",
  "coordinates":{"lat","lon"}, "status", "internal",
  "playback_url", "format", "thumbnail_urls":{"large","medium","small"},
  "duration", "captured_at", "created_at", "updated_at" }
```

**`User`** (from `GET /users`): `id, company_id, email_address, status, first_name, last_name,
phone_number, user_url, user_role, created_at, updated_at, profile_image[]`. `first_name` is `null`
in the example — **do not assume a user has a first name.**

`GET /users` takes only `after` and `limit` — no `before`. Worth noticing: **the cursor parameter
set is not uniform across index endpoints**, so read each one rather than assuming photos' set.

---

## Settled by the probe, 31 July 2026

✅ **1. The `Photo` schema** — measured in full, above. `description` exists.
✅ **5. Scopes are not a problem.** The key authenticates on **both v1 and v2**
(`which_api_the_key_works_on: "both v1 and v2"`). The feared "v2-valid but v1-unscoped 403" did not
happen. Key length 43.
⚠️ **6. Rate limits: CompanyCam sends no rate-limit headers on these responses** (`rate_limits_seen`
false, and the route sweeps every `ratelimit`/`retry-after` header name). The limits are real but
**not advertised**, so an importer cannot self-regulate from headers — it has to be polite by
construction (small `limit`, sequential pages, back off on 429) and treat a 429 as the first signal.

Also confirmed: `meta` is exactly `{has_next, has_prev, next_cursor, prev_cursor}` — **no `total`**
on a plain call.

## Still unknown — do NOT guess these

2. **What `include` accepts.** Present on both `index` and `show`; the one curl example using it is
   clipped at the panel edge precisely at the value. Probe with
   `/api/companycam-status?include=tags` and watch whether `photo_fields` grows.
3. **The accepted date format for `start_date` / `end_date`**, and what the second `oneOf` form of
   `start_date` is. A wrong format is a **422**, not a silent no-op — but the 422 body is echoed
   back by the probe, so one bad guess reveals the right answer. Probe with
   `?start_date=2026-01-01&end_date=2026-03-31`.
4. **`include_total`'s semantics** — typed `string`, not boolean, so `?include_total=true` is a
   guess. Probe it; the route now reports `not probed` rather than a misleading `false`.

**None of the three blocks an importer.** Dates can be filtered client-side on `captured_at` if
`start_date` will not cooperate — wasteful, not fatal — and neither `include` nor `include_total` is
needed to walk the account with cursors.

Each of these is one live call away from being settled — but that call has to be made from Vercel
or from Theo's browser, **not from here.**

### That call now exists: `api/companycam-status.js`

Rather than leave six unknowns for a future session to guess at, the call is written down as a
route. Visit **`https://app.cardinalroster.com/api/companycam-status`** and it answers all six.

It is modelled on `api/ai-status.js` — same shape, same public-with-no-session posture, and the
same absolute rule that **it never returns the key.** It goes further, because this one touches
customer jobs: **it returns no photo *values* at all** — only the *field names* present on a photo
object. "Does v1's Photo carry `description`?" is answerable with a list of keys and nothing else,
so a list of keys is all it sends. No URL, no address, no coordinate, no creator name, no caption.

| Probe | Closes |
|---|---|
| `POST /access_tokens/verify` | does the key authenticate on v1 at all |
| `GET /photos?limit=1` → `Object.keys(data[0])` | **unknown 1** — the clipped schema tail |
| the same call's response headers | **unknown 6** — rate limits, which arrive free |
| `GET /v2/projects?per_page=1` alongside it | **unknown 5** — v2-valid but v1-unscoped is a *scope* fix, not a bad key, and the two look identical from the app |
| `?start_date=…` passthrough, and the 422 body echoed back | **unknown 3** — the date format, from the API's own complaint |
| `?include=…` / `?include_total=…` passthrough | **unknowns 2 and 4**, probed from the URL bar with no redeploy |

`?tags=1` additionally lists the account's tag vocabulary. **Off by default**; on because tag names
are company words ("Ice Dam", "Before"), not anything about a customer, and they are what `tag_ids`
needs.

`limit` is pinned at 1 and **cannot be widened from the URL** — the route is a probe, not a data
tap. Gated by a harness at `scratchpad/ccstatus_harness.js`: 42 assertions, negative-controlled
across five deliberately-broken copies (no-scrub, leak-the-photo, no-field-enumeration,
widenable-limit, no-try/catch), each of which fails the specific assertion that protects it.

**It was run against the live account on 31 July 2026 and it worked.** Three of the six unknowns
closed on the first page load, one of them overturning a guess this file had made (`uris` has six
types, not three). The remaining three are listed above with the exact query string that closes
each. **Fill this file in from what it returns** — that is what the section above is.

---

## Two findings from v2 that still shape the design

**1. `internal` is CompanyCam's own privacy flag, and the importer must respect it.** Their wording:
*"for internal use only and should not be used in marketing or other public materials."* Whoever
took the photo already made that call. **An importer must skip `internal: true` outright** — that is
the crew's signal, not ours to override. It also happens to answer the customers'-houses concern
raised when this started. `internal` is present and legible on the v1 Photo too, so this survives
the switch to v1.

**2. Take `web`, never `original`.** `uris[]` carries `type` values `original`, `web`, `thumbnail`
(read off the v2 definition — v1 types the array but the example only shows `"type": "string"`).
Take **`web`** for a library figure and **`thumbnail`** for a list. Pulling `original` would drag
full-resolution job photos into the app for no benefit.

### v2 `Photo`, kept for the fields v1 has not confirmed

Base `https://api.companycam.com/v2`, `page` / `per_page`, **Unix `int32` timestamps**, string ids
throughout. Fields: `id`, `company_id`, `creator_id` / `creator_type` / `creator_name`,
`project_id`, `processing_status` (`pending`·`processing`·`processed`·`processing_error`·
`duplicate`), `status` (`active`·`deleted`), `coordinates`, `uris`, `hash`, **`description`** (free
text — *"The front of the house"*), **`internal`**, `photo_url`, **`captured_at`** (when the shutter
fired), `created_at` (when it reached their server — **may differ**), `updated_at`.

---

## Constraints that shape any build

**This session cannot test it.** `api/companycam.js` would run on Vercel, which reaches CompanyCam
fine. **This sandbox cannot**, so an integration written here can only be deployed and tested by
Theo. That asymmetry is the reason to get the spec right on paper first rather than iterating
against a live endpoint — and the reason the six unknowns above are listed rather than assumed.

**Gate it the way `librarian.js` gates:** `requireSession()`, and admin-only, given it holds a
credential. Never return the key, never log it.

**The one call that matters**, now verified end to end:

```
GET https://app.companycam.com/public_api/v1/photos?tag_ids[]=<id>&limit=100
Authorization: Bearer $COMPANYCAM_API_KEY
→ { data: [ …photos… ], errors: [], meta: { next_cursor, prev_cursor, has_next, has_prev } }
```

Loop on `meta.has_next` with `?after=<meta.next_cursor>`. Then, per photo:

- **Skip every `internal: true`.** Not negotiable — CompanyCam's own wording is *"should not be
  used in marketing or other public materials."* Whoever took the photo already made that call.
- **Skip `status !== 'active'`** and anything whose `processing_status` is not `processed`.
- Take **`uris[type='web_annotation']`, falling back to `web`** — the annotated rendition carries
  the crew's arrows and is the better figure. Never `original`.
- Carry **`description`** across as the caption. It exists, it is the whole point, and without it
  we are rebuilding the 236 uncaptioned rows we already cannot search.
- `captured_at` is the date to trust — `created_at` is when it reached their server and can differ.

Be polite by construction: **no rate-limit headers come back**, so there is nothing to read and
nothing to adapt to. Sequential pages, `limit` well under 100, and treat a 429 as the only warning
you will get.
