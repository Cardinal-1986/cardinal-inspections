# CompanyCam API — what is actually known

*Captured 31 July 2026 from the OpenAPI definition on the "List All Checklists" page of
`docs.companycam.com`, supplied by Theo. **This environment cannot reach `api.companycam.com`,
`docs.companycam.com`, or any third-party mirror** — the agent proxy blocks them — so this file
is the only source of truth available in-session. Do not guess past it.*

**Why this file exists:** the alternative is inventing field names, which is the failure the
vinyl cards at 461 and the `/api/config` note in `CLAUDE.md` both exist to prevent.

---

## Confirmed

| | |
|---|---|
| Base URL | `https://api.companycam.com/v2` |
| Auth | `BearerAuth` — `Authorization: Bearer <token>` |
| Pagination | `page` and `per_page`, both `int32` query params |
| Env var (set in Vercel, 31 Jul) | `COMPANYCAM_API_KEY` |

Timestamps across the API are **Unix `int32`**, not ISO strings. `id` fields are **strings**,
not integers, everywhere — including `company_id`, `project_id`, `creator_id`.

### `Photo`

| Field | Type | Notes |
|---|---|---|
| `id` | string | required |
| `company_id` | string | |
| `creator_id` / `creator_type` / `creator_name` | string | `creator_type` e.g. `"User"` |
| `project_id` | string | the project the photo was captured at |
| `processing_status` | enum | `pending` · `processing` · `processed` · `processing_error` · `duplicate` |
| `status` | enum | `active` · `deleted` |
| `coordinates` | `Coordinate` | `{lat, lon}`, floats |
| **`uris`** | array of `ImageURI` | **size variants — see below** |
| `hash` | string | MD5 of the photo |
| **`description`** | string | free text, e.g. *"The front of the house"* — **this is the caption** |
| **`internal`** | boolean | *"for internal use only and should not be used in marketing or other public materials"* |
| `photo_url` | string | link to the photo in the CompanyCam web app, not the image itself |
| `captured_at` | int32 | when the shutter fired |
| `created_at` | int32 | when it reached their server — **may differ from `captured_at`** |
| `updated_at` | int32 | |

### `ImageURI`

`{ type, uri, url }` — `type` and `uri` are required, `url` also appears in every example and
carries the same value. Observed types: **`original`**, **`web`**, **`thumbnail`**.

Take **`web`** for a library figure and **`thumbnail`** for a list. Pulling `original` would drag
full-resolution job photos into the app for no benefit.

### `Coordinate`

`{ lat, lon }`, both `float`, both required.

---

## Two findings that change the design

**1. `internal` is CompanyCam's own privacy flag, and the importer must respect it.**
Their wording is explicit: *should not be used in marketing or other public materials*. Whoever
took the photo already made that call. **An importer must skip `internal: true` outright** —
that is the crew's signal, not ours to override. It also happens to answer the
customers'-houses concern raised when this started.

**2. `description` is the caption field, and it solves the real problem.**
`project_photos` in Supabase has **236 rows and zero captions**, which is exactly why no query
could find "the ice dam photo". CompanyCam photos carry `description` natively. **Import it —
an uncaptioned photo library is the thing we already have and cannot use.**

---

## Not yet known — do NOT guess these

- **Whether an account-wide `GET /photos` exists.** Only `GET /v2/projects/{projectId}/photos`
  is confirmed. Without an account-wide list, an importer has to walk projects first.
- **Any date or tag filter parameters** on the photos list.
- **Tags.** `Photo` in this definition has **no tag field at all**, which matches a CompanyCam
  community thread asking for tags to be included in the list response. Assume tags need a
  separate call and find its endpoint before designing anything around them.
- **The `Project` schema** — name and address would be useful for labelling an imported photo.

The page to ask Theo for next is the **List Photos** reference page, which should settle the
first three.

---

## Constraint that shapes any build

`api/companycam.js` would run on **Vercel**, which can reach CompanyCam fine. **This session
cannot**, so an integration written here cannot be tested here — only deployed and tested by
Theo. That asymmetry is the reason to get the spec right on paper first rather than iterating
against a live endpoint.

Gate it the way `librarian.js` gates: `requireSession()`, and admin-only given it holds a
credential. Never return the key, never log it.
