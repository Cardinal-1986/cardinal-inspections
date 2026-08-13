// api/abc.js — ABC Supply API proxy (ESM, per api/package.json "type":"module")
// Env vars (Vercel): ABC_CLIENT_ID, ABC_CLIENT_SECRET, ABC_ENV ("sandbox" | "production"),
// optional ABC_API_BASE to override the API host, kept as an escape hatch only —
// API_DEFAULT below is no longer a guess (see the note on it).
// Auth per https://apidocs.abcsupply.com/authorization-methods/ (Client Credentials, Individuals & Businesses).

const AUTH = {
  sandbox: 'https://sandbox.auth.partners.abcsupply.com/oauth2/aus1vp07knpuqf6Xz0h8/v1/token',
  production: 'https://auth.partners.abcsupply.com/oauth2/ausvvp0xuwGKLenYy357/v1/token',
};
/* CONFIRMED 13 Aug 2026 against apidocs.abcsupply.com's own endpoint reference
   pages (get-branch, get-frequent-items, search-items, price-items, and five
   more — every one of them shows the same two hosts), not guessed. The old
   guess (api.partners.abcsupply.com / sandbox.api.partners.abcsupply.com) does
   not exist in DNS at all — confirmed live in production, ENOTFOUND, once the
   auth step (a genuinely different host, always correct) started succeeding.
   partners-sb, not sandbox.partners — the sandbox marker is a hyphenated
   suffix, not a subdomain prefix, unlike every other host in this file. */
const API_DEFAULT = {
  sandbox: 'https://partners-sb.abcsupply.com',
  production: 'https://partners.abcsupply.com',
};
const SCOPE = 'location.read product.read account.read pricing.read allOrder.read order.write notification.read notification.write invoice.read invoice.history.read';

let tokenCache = { token: null, exp: 0, env: '' };

function env() { return (process.env.ABC_ENV || 'sandbox').toLowerCase() === 'production' ? 'production' : 'sandbox'; }
function apiBase() { return process.env.ABC_API_BASE || API_DEFAULT[env()]; }

/* Node's own fetch throws a bare "TypeError: fetch failed" on any network-level
   failure (bad host, connection refused, timeout, TLS) and puts the ACTUAL
   reason on `.cause` — which the two raw fetch() calls below were discarding,
   so a wrong ABC_API_BASE and a genuinely down endpoint both read identically
   as "fetch failed" with nothing to tell them apart. This wraps every outbound
   call so the host and the real cause survive into the error the UI shows. */
async function netFetch(url, opts) {
  try {
    return await fetch(url, opts);
  } catch (e) {
    const host = (() => { try { return new URL(url).host; } catch (_) { return url; } })();
    let cause = e && e.cause;
    if (cause && Array.isArray(cause.errors) && cause.errors.length) cause = cause.errors[0];
    const why = cause ? (cause.code ? (cause.code + ': ' + (cause.message || '')) : String(cause.message || cause))
                       : String(e.message || e);
    const err = new Error('Could not reach ' + host + ' (' + why + ')');
    err.code = 'NETWORK';
    throw err;
  }
}

async function getToken() {
  const e = env();
  if (tokenCache.token && tokenCache.env === e && Date.now() < tokenCache.exp) return tokenCache.token;
  const id = process.env.ABC_CLIENT_ID, secret = process.env.ABC_CLIENT_SECRET;
  if (!id || !secret) { const err = new Error('ABC credentials not configured'); err.code = 'NOT_CONFIGURED'; throw err; }
  const r = await netFetch(AUTH[e], {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + Buffer.from(id + ':' + secret).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials&scope=' + encodeURIComponent(SCOPE),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.access_token) {
    const err = new Error('ABC auth failed: ' + (j.error_description || j.error || ('HTTP ' + r.status)));
    err.code = 'AUTH_FAILED';
    throw err;
  }
  // tokens live 30 min; cache 25
  tokenCache = { token: j.access_token, exp: Date.now() + 25 * 60 * 1000, env: e };
  return j.access_token;
}

/* ABC states the actual reason for a 4xx in the RESPONSE BODY, which nobody
   downstream ever saw: abc() put the parsed body on err.detail, the handler
   passed it back as a separate `detail` field, and index.html's api() reads
   only `j.error` — so the body was dropped one layer short of the screen and
   every rejection rendered as a bare "-> HTTP 400" with no reason attached.
   Same class as the bare "fetch failed" defect: the answer was already in
   hand and thrown away.

   Field names are not documented and differ per endpoint, so this pulls the
   shapes REST APIs actually use and falls back to the raw body rather than
   inventing a schema and silently matching nothing. detail still travels
   intact for anyone who wants the whole object. */
function abcReason(j) {
  if (j == null) return '';
  if (typeof j === 'string') return j;
  if (typeof j !== 'object') return String(j);
  const pick = (o) => (o && typeof o === 'object')
    ? (o.message || o.detail || o.description || o.error_description ||
       o.errorMessage || o.reason || o.title || '')
    : (typeof o === 'string' ? o : '');
  let m = pick(j);
  for (const key of ['errors', 'messages', 'details', 'errorMessages']) {
    if (m) break;
    const arr = j[key];
    if (Array.isArray(arr) && arr.length) {
      m = arr.map(x => pick(x) || (typeof x === 'string' ? x : (x && x.code) || ''))
             .filter(Boolean).join('; ');
    }
  }
  if (!m && typeof j.error === 'string') m = j.error;
  if (!m && j.raw) m = String(j.raw);
  if (!m) { try { m = JSON.stringify(j); } catch (_) { m = ''; } }
  m = String(m).replace(/\s+/g, ' ').trim();
  return m.length > 300 ? m.slice(0, 299) + '…' : m;
}

/* The paginated item lists (frequents/recents) all take the same trio. */
function pageQs(b) {
  const p = new URLSearchParams();
  p.set('pageNumber', String(b.pageNumber || 1));
  p.set('itemsPerPage', String(b.itemsPerPage || 25));
  if (b.branchNumber) p.set('branchNumber', String(b.branchNumber));
  return '?' + p.toString();
}

async function abc(method, path, payload) {
  const token = await getToken();
  const r = await netFetch(apiBase() + path, {
    method,
    headers: {
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: payload === undefined ? undefined : JSON.stringify(payload),
  });
  const text = await r.text();
  let j; try { j = JSON.parse(text); } catch (_) { j = { raw: text }; }
  if (!r.ok) {
    const reason = abcReason(j);
    const err = new Error('ABC ' + method + ' ' + path + ' -> HTTP ' + r.status +
                          (reason ? ' — ' + reason : ''));
    err.status = r.status; err.detail = j;
    throw err;
  }
  return j;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  const b = req.body || {};
  const a = String(b.action || '');
  try {
    switch (a) {
      case 'status': {
        if (!process.env.ABC_CLIENT_ID || !process.env.ABC_CLIENT_SECRET) {
          return res.status(200).json({ configured: false, env: env() });
        }
        await getToken();
        return res.status(200).json({ configured: true, connected: true, env: env(), apiBase: apiBase() });
      }
      case 'searchItems': {
        /* https://apidocs.abcsupply.com/search-items/ — the real request shape.
           `{query, branchNumbers, page, pageSize}` was this file's invention;
           none of those fields exist. ABC takes a filters[] array and a
           pagination object, and the ONLY filter key that matches free text is
           itemDescription (the availability-search endpoint accepts just
           itemNumber/branchNumber, so it cannot serve the catalog box at all —
           which is why the old availability-first ladder is gone rather than
           reordered). `embed:['branches']` carries per-branch availability back
           with each hit, which is what "Search my branch" wants; a branchNumber
           FILTER would instead drop every item the branch does not stock, and
           that is a narrowing decision to make against real data, not now. */
        const q = String(b.query || '').trim();
        const page = { itemsPerPage: b.itemsPerPage || 20, pageNumber: b.pageNumber || 1 };
        const byDesc = {
          filters: [{ key: 'itemDescription', condition: 'contains', values: [q] }],
          embed: ['branches'],
          pagination: page,
        };
        let out = await abc('POST', '/api/product/v1/search/items', b.payload || byDesc);
        /* Theo works from invoices full of item codes (02OCTDDML, 14ANADE15W).
           A code will not match a description search, so when a single-token
           query finds nothing, try it as an exact item number before giving up.
           Guarded and non-fatal: a failure here keeps the first result. */
        if (!b.payload && q && !/\s/.test(q) &&
            !(out && Array.isArray(out.items) && out.items.length)) {
          try {
            out = await abc('POST', '/api/product/v1/search/items', {
              filters: [{ key: 'itemNumber', condition: 'equals', values: [q] }],
              embed: ['branches'],
              pagination: page,
            });
          } catch (_) { /* keep the description-search result */ }
        }
        return res.status(200).json(out);
      }
      case 'priceItems': {
        // POST /api/pricing/v2/prices — https://apidocs.abcsupply.com/price-items/
        // Required: shipToNumber, branchNumber, purpose (estimating|quoting|ordering), lines[]
        // (each line: id, itemNumber, quantity required; uom, length optional). requestId is
        // optional but only ever echoed back if supplied, so always sending one costs nothing.
        // 'items'/'unitOfMeasure'/'variation' were this file's own invented shape, not ABC's —
        // real field names are 'lines'/'uom', and 'variation' does not exist in their schema.
        const body = b.payload || {
          requestId: b.requestId || ('cr-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8)),
          shipToNumber: String(b.shipTo || ''),
          branchNumber: String(b.branchNumber || ''),
          purpose: b.purpose || 'estimating',
          lines: (b.items || []).map((it, i) => {
            const line = { id: String(i + 1), itemNumber: String(it.itemNumber), quantity: it.quantity || 1 };
            if (it.uom) line.uom = it.uom;
            if (it.length) line.length = it.length;
            return line;
          }),
        };
        return res.status(200).json(await abc('POST', '/api/pricing/v2/prices', body));
      }
      /* ⚠ pageNumber is REQUIRED here, and ABC's own docs say it is optional.
         Measured, not assumed: production answered
         "Bad Request: Required query parameter pageNumber not specified".
         itemsPerPage rides along because it is the other half of the pair and
         appears in every one of ABC's own examples; branchNumber is genuinely
         optional (it enriches each row with availability at that branch) and is
         sent only when the caller has one. Trust the error, not the doc. */
      case 'frequents': return res.status(200).json(await abc('GET', '/api/product/v1/items/' + encodeURIComponent(String(b.billTo || '')) + '/frequents' + pageQs(b)));
      case 'recents': return res.status(200).json(await abc('GET', '/api/product/v1/items/' + encodeURIComponent(String(b.billTo || '')) + '/recents' + pageQs(b)));
      /* https://apidocs.abcsupply.com/search-accounts/ — ask ABC which ship-to
         accounts this key may actually price against, instead of guessing.
         Earned the hard way: the ship-to shown on an invoice ("Ship To: 0003")
         is a display code, NOT the API's identifier, exactly as the account
         number on the myABCsupply portal was not the API's bill-to. Real
         ship-to numbers are independent 7-digit values (ABC's own example:
         1163698). Each row carries name + address + its parent billTo, so a
         human can recognise the job rather than decode a number. */
      case 'accounts': {
        const body = b.payload || {
          filters: [
            { key: 'accountType', condition: 'equals', values: ['Ship-to'], joinCondition: 'and' },
            { key: 'storefront', condition: 'equals', values: ['abc'] },
          ],
          pagination: { itemsPerPage: b.itemsPerPage || 100, pageNumber: b.pageNumber || 1 },
        };
        return res.status(200).json(await abc('POST', '/api/account/v1/search/accounts', body));
      }
      case 'templates': return res.status(200).json(await abc('GET', '/api/order/v2/orders/templates' + (b.query ? '?' + String(b.query) : '')));
      case 'branches': return res.status(200).json(await abc('GET', '/api/location/v1/branches' + (b.query ? '?' + String(b.query) : '')));
      case 'itemAvailability': return res.status(200).json(await abc('GET', '/api/product/v1/availability/items/' + encodeURIComponent(String(b.itemNumber || '')) + '/branches'));
      case 'placeOrder': return res.status(200).json(await abc('POST', '/api/order/v2/orders', b.payload || {}));
      case 'getOrder': return res.status(200).json(await abc('GET', '/api/order/v2/orders' + (b.query ? '?' + String(b.query) : '')));
      default: return res.status(400).json({ error: 'Unknown action: ' + a });
    }
  } catch (e) {
    if (e && e.code === 'NOT_CONFIGURED') return res.status(200).json({ configured: false, env: env() });
    return res.status(e.status || 500).json({ error: String(e.message || e), detail: e.detail || null });
  }
}
