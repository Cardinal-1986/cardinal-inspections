# ABC Supply — your setup checklist (build 327 is waiting on these)

The app side is done and deployed with build 327: burger menu → **🧱 ABC Supply** gives you connection status, account settings, live catalog search, branch pricing, and frequent items. It shows "Not connected yet" until you finish the steps below. Everything here is on your side of the fence.

## 1. Register (one time, ~10 min)
- Go to **apidocs.abcsupply.com** → Getting Started → **Individual Business Integration Track**.
- You need your active ABC Supply account and myABCsupply login.
- Create your application in their developer portal. You'll get a **Client ID** and **Client Secret** — sandbox first, production after their certification step.

## 2. Vercel environment variables (2 min)
In the Vercel project settings → Environment Variables, add:

| Name | Value |
|---|---|
| `ABC_CLIENT_ID` | from the developer portal |
| `ABC_CLIENT_SECRET` | from the developer portal |
| `ABC_ENV` | `sandbox` (switch to `production` only after certification) |

Then **redeploy** (any deploy picks them up). Never put these in the app file.

## 3. Upload the API file (1 min)
- Put **`abc.js`** into the repo at **`api/abc.js`** (same folder as the other API functions). It follows the existing ESM convention.

## ⚠ 4. Your account numbers — THE WORKING VALUES, confirmed live 13 Aug 2026

**Bill-To # = `2153354-1`** — confirmed working against production; returns real
frequent items. **This was not guessable and cost five attempts.** The same
account is rendered three different ways across ABC's own surfaces, and only
one of them is what the API accepts:

| Where you see it | Value | API? |
|---|---|---|
| **`account.abcsupply.com` "Account #"** | `2153354-2` | ❌ 401 — "does not have access to the requested data" |
| **Invoice "Customer Number"** | `2153354-0001` | ❌ |
| **Neither — a third form** | **`2153354-1`** | ✅ **this one** |

The 401 text is the tell: ABC provisions API access per bill-to sub-account, so
a number that is perfectly valid for buying can still be refused by the API.
**If this ever stops working, do not re-derive it by guessing — the error names
itself, and `apisupport@abcsupply.com` can say which sub-account is enabled.**

**Branch # = `106`** (Dayton, Old Troy Pike) — confirmed on two ABC documents.
**Ship-To #** is per delivery address (`0003` was the Habitat/Stormont job), so
it changes per job rather than being a fixed account setting.

## The old guidance (kept for context)
- **Ship-To #** (your "job account" — used for pricing and ordering)
- **Bill-To #** (used for frequent/recent items and invoices)
- **Branch #** (your home branch)
- Enter these in the app: burger → ABC Supply → Account. They save on your phone.

## 5. First test
- Burger → ABC Supply → **Test connection** (should say Connected — sandbox).
- Search "Duration" → tap **Price at my branch** on a result.
- A **$0 price is normal** for some items — the branch prices those manually; the app tells you to call them.

## ✅ The "one honest caveat" above was right to be nervous — and it was the bug

This file used to say the API host was the one value that could not be verified
from outside, and that the proxy's defaults were `api.partners.abcsupply.com` /
`sandbox.api.partners.abcsupply.com`. **Those hosts do not exist.** They were a
guess, they never resolved in DNS, and every data call failed on them for
months while auth (a genuinely different host) kept succeeding — which is
exactly why the screen said "Connected" and still returned nothing.

**Confirmed 13 Aug 2026 against eleven of ABC's own endpoint reference pages:**

| | Host |
|---|---|
| Production | **`partners.abcsupply.com`** |
| Sandbox | **`partners-sb.abcsupply.com`** (hyphenated suffix, *not* a `sandbox.` prefix) |

Both are now the built-in defaults in `api/abc.js`. `ABC_API_BASE` remains as an
override but should not be needed. Also corrected at the same time: every data
path needed its real `/api/{family}/v{n}` prefix, `pageNumber` is **required**
on frequent/recent items despite ABC's docs calling it optional, and the catalog
search and price lookup were both using field names ABC has never accepted.

## What comes after your credentials exist (next builds, in order)
1. Response-shape tuning against real sandbox data (their fields vs my best-guess mappings — one quick build).
2. **"+ ABC Supply" inside the estimate editor** — priced items straight into line items.
3. Order placement, tested in their sandbox with ABC's API support reviewing the test orders (their prescribed process), then webhooks feeding delivery status to the production board.

Their support: apisupport@abcsupply.com — they review sandbox orders and help certify.
