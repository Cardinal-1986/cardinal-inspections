# Showroom hostname cutover — rollback record

**Recorded 31 Aug 2026, 23:50 UTC, immediately before the cutover.** Everything below is
measured, not configured-and-assumed. Nothing in this document was changed by writing it.

## ⚠ THE CUTOVER IS NOT A DNS CHANGE

`showroom.cardinalroster.com` **already resolves to Vercel.** All three Cardinal hostnames
answer `server: Vercel` and return byte-identical content from *different* IPs, because Vercel
routes by `Host` header. The cutover is a **project-domain reassignment inside Vercel**.

**Do not edit the DNS records. They are correct as they stand and are not part of the change.**

## Rollback state — the exact values

### DNS (unchanged by the cutover; recorded so a wrong "fix" can be undone)

| host | type | value | TTL |
|---|---|---|---|
| **`showroom.cardinalroster.com`** | **A** (no CNAME) | **`216.150.16.129`**, **`216.150.16.1`** | **1800** |
| `presentation.cardinalroster.com` | A (no CNAME) | `216.150.16.1`, `216.150.1.65` | 1800 |
| `app.cardinalroster.com` | CNAME | `bbc01c28dda6bf13.vercel-dns-017.com.` | 60 |
| `cardinal-showroom.vercel.app` | A | `64.29.17.131`, `216.198.79.131` | 300 |

### Vercel domain assignment — the thing that actually changes

| | |
|---|---|
| **from** | `showroom.cardinalroster.com` → project **`cardinal-inspections`** (`prj_H6uDE65cj42ZqHuBdi7dPYKeZbno`), team `team_8AjRcRdvhTep7yNMk2OP6yh0` |
| **to** | the Showroom project (serving `cardinal-showroom.vercel.app`) |
| **ROLLBACK** | **re-add `showroom.cardinalroster.com` to `cardinal-inspections`.** No registrar step, no propagation wait, no TTL exposure |

**Proof of the current binding, measured 23:49 UTC — not inferred:** the `8f6e025` production
deploy landed minutes earlier, and **all three Cardinal hostnames immediately served build 1189
at hash `ffa58d03efa861157addb93abc8e5f5935ecc145`**, 5,456,372 bytes, `<title>Cardinal Client
Resources</title>`. A hostname cannot serve a project's new production deployment unless it is
bound to that project. `cardinal-showroom.vercel.app` served 32,581 bytes titled
`Cardinal Showroom` at hash `67b72b935b428a4454beacf464f49d5bcc26e32c`.

### HTTP / TLS before the cutover

`HTTP/2 200` · `server: Vercel` · `strict-transport-security: max-age=63072000` ·
TLSv1.3, ALPN h2, subject **`CN=*.cardinalroster.com`**. The certificate is a **wildcard**, so it
covers the hostname under either project — TLS is not part of the cutover risk.

## The two clicks

1. Vercel → `cardinal-inspections` → Settings → Domains → **remove** `showroom.cardinalroster.com`
2. the Showroom project → Settings → Domains → **add** `showroom.cardinalroster.com`

## Verification

```bash
bash .claude/skills/cardinal-build/scripts/verify_showroom_cutover.sh
```

30 checks over the real network: the hostname serves the Showroom **by title and by hash against
the repo**, the Cardinal CRM is *gone* from it, all five sibling module files resolve there, every
launcher destination is fetched and title-checked, Cardinal is still on build 1189, and TLS still
covers the name. It prints the rollback instruction on any failure.

**Run pre-cutover it is RED — 14 passed, 16 failed**, naming exactly what the cutover changes. It
is not an inert script.

⚠ **Its own control caught a bug in it within the minute:** the Cardinal build check read the
FIRST `build NNNN` in `index.html`, which is a comment citing an old build, and failed a correct
tree. It anchors on `data-cr-footer` now — the same anchor `check_build.py`'s `app_stamp()` uses,
for the same reason.

⚠ **Chromium has no outbound network path in the build container** — measured: agent proxy,
proxy + certificate override, and direct all return `ERR_CONNECTION_RESET`, while curl reaches the
internet normally. So the live hostname is checked with curl and the *behaviour* of what it serves
is proved by running the gates against the bytes it returned, with a hash comparison closing the
seam. A live in-browser drive of a production hostname is not available here and must not be
claimed.
