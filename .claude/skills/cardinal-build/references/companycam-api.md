# CompanyCam API — what is actually known

*Two capture passes. The v2 section came from the OpenAPI definition on the "List All Checklists"
page of `docs.companycam.com`, 31 July 2026. The **v1 section — which is the one that matters —**
came from a 109-page PDF of `developers.companycam.com/api-reference`, supplied by Theo the same
night and read directly, page by page.*

**This environment cannot reach `api.companycam.com`, `docs.companycam.com`, `app.companycam.com`
or `developers.companycam.com`** — the agent proxy blocks every CompanyCam host, and the
third-party mirrors (rollout, pipedream, mindcloud, dlthub) with them. Verified by direct request,
not assumed. So this file is the only source of truth available in-session. Do not guess past it.

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

### `Photo` — the fields that are legible

Identical in `index` (inside `data: [...]`) and `show` (`data: {...}`):

```json
{
  "id": "string",
  "company_id": "string",
  "creator_id": "string",
  "creator_type": "string",
  "creator_name": "string",
  "project_id": "string",
  "coordinates": { "lat": 1, "lon": 1 },
  "status": "string",
  "uris": [ { "type": "string", "uri": "string", "url": "string" } ],
  "hash": null,
  "internal": true,
  "origin": "string",
  "photo_url": "string",
  "comment_count": 1,
  "has_comments": true,
```

**The example panel is clipped there, in both places.** Its scrollbar thumb covers roughly the top
40% of its track, so **something like 60% of the schema is below the fold and was never captured.**
Do not fill that in from the v2 schema and do not fill it in from the Video schema — see "still
unknown".

New in v1 versus v2: **`origin`**, **`comment_count`**, **`has_comments`**. Gone from the legible
portion: `processing_status`, `description`, `captured_at`.

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

**`Photo Description` is POST-only.** There is no `GET .../descriptions`. So either the description
lives on the Photo object itself (in the clipped tail, where v2 puts it) or it comes back through
`include` — **and we cannot tell which from this capture.** This is the single most important open
question for the importer, because the caption *is* the feature: `project_photos` in Supabase has
**236 rows and zero captions**, which is exactly why no query could ever find "the ice dam photo".

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

## Still unknown — do NOT guess these

1. **The rest of the `Photo` schema.** ~60% of the example is below the panel fold. In particular
   **whether `description` and `captured_at` exist on v1's Photo**, which v2's Photo definitely has.
2. **What `include` accepts.** Present on both `index` and `show`, and the one curl example that
   uses it is clipped at the panel edge precisely at the value.
3. **The accepted date format for `start_date` / `end_date`**, and what the second `oneOf` form of
   `start_date` is. A wrong format is a 422, not a silent no-op.
4. **`include_total`'s semantics** — it is typed `string`, not boolean, so `?include_total=true` is
   a guess, not a reading.
5. **The OAuth scope names**, and which ones Theo's Application was granted. The API Reference does
   not list them; the dev portal has separate *MCP Setup*, *Rate Limits* and *Deep Links* pages that
   were not in the capture. A key minted through the v2-era *Applications* flow **may 403 on v1**.
6. **Rate limits.** There is a whole nav page for them and we have not read it. An importer that
   walks the whole account must assume it will be throttled.

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

**Fill this file in from what it returns.** The unknowns above stop being unknowns the first time
anyone opens that URL.

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

**Sketch of the one call that matters**, once the unknowns are settled:

```
GET https://app.companycam.com/public_api/v1/photos
      ?start_date=<...>&end_date=<...>&tag_ids[]=<id>&limit=100
Authorization: Bearer $COMPANYCAM_API_KEY
→ { data: [ …photos… ], errors: [], meta: { next_cursor, has_next, … } }
```

then loop on `meta.has_next` with `?after=meta.next_cursor`, **skipping every `internal: true`**,
taking `uris[type=web]`, and carrying the caption — whatever field turns out to hold it — into
`project_photos`. **An uncaptioned photo library is the thing we already have and cannot use.**
