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

## 4. Your account numbers (ask your ABC rep or check myABCsupply)
- **Ship-To #** (your "job account" — used for pricing and ordering)
- **Bill-To #** (used for frequent/recent items and invoices)
- **Branch #** (your home branch)
- Enter these in the app: burger → ABC Supply → Account. They save on your phone.

## 5. First test
- Burger → ABC Supply → **Test connection** (should say Connected — sandbox).
- Search "Duration" → tap **Price at my branch** on a result.
- A **$0 price is normal** for some items — the branch prices those manually; the app tells you to call them.

## One honest caveat
ABC's docs list endpoint paths but the API host base is confirmed inside their developer portal after you register. The proxy defaults to `sandbox.api.partners.abcsupply.com` / `api.partners.abcsupply.com`; if the portal shows a different host, add one more Vercel env var — `ABC_API_BASE` — with the host they show, and redeploy. That's the only value I couldn't verify from outside.

## What comes after your credentials exist (next builds, in order)
1. Response-shape tuning against real sandbox data (their fields vs my best-guess mappings — one quick build).
2. **"+ ABC Supply" inside the estimate editor** — priced items straight into line items.
3. Order placement, tested in their sandbox with ABC's API support reviewing the test orders (their prescribed process), then webhooks feeding delivery status to the production board.

Their support: apisupport@abcsupply.com — they review sandbox orders and help certify.
