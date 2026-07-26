// api/abc.js — ABC Supply API proxy (ESM, per api/package.json "type":"module")
// Env vars (Vercel): ABC_CLIENT_ID, ABC_CLIENT_SECRET, ABC_ENV ("sandbox" | "production"),
// optional ABC_API_BASE to override the API host if the developer portal shows a different one.
// Auth per https://apidocs.abcsupply.com/authorization-methods/ (Client Credentials, Individuals & Businesses).

const AUTH = {
  sandbox: 'https://sandbox.auth.partners.abcsupply.com/oauth2/aus1vp07knpuqf6Xz0h8/v1/token',
  production: 'https://auth.partners.abcsupply.com/oauth2/ausvvp0xuwGKLenYy357/v1/token',
};
const API_DEFAULT = {
  sandbox: 'https://sandbox.api.partners.abcsupply.com',
  production: 'https://api.partners.abcsupply.com',
};
const SCOPE = 'location.read product.read account.read pricing.read allOrder.read order.write notification.read notification.write invoice.read invoice.history.read';

let tokenCache = { token: null, exp: 0, env: '' };

function env() { return (process.env.ABC_ENV || 'sandbox').toLowerCase() === 'production' ? 'production' : 'sandbox'; }
function apiBase() { return process.env.ABC_API_BASE || API_DEFAULT[env()]; }

async function getToken() {
  const e = env();
  if (tokenCache.token && tokenCache.env === e && Date.now() < tokenCache.exp) return tokenCache.token;
  const id = process.env.ABC_CLIENT_ID, secret = process.env.ABC_CLIENT_SECRET;
  if (!id || !secret) { const err = new Error('ABC credentials not configured'); err.code = 'NOT_CONFIGURED'; throw err; }
  const r = await fetch(AUTH[e], {
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

async function abc(method, path, payload) {
  const token = await getToken();
  const r = await fetch(apiBase() + path, {
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
    const err = new Error('ABC ' + method + ' ' + path + ' -> HTTP ' + r.status);
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
        // availability-aware search per ABC best practices; falls back to plain catalog search
        const body = b.payload || { query: b.query || '', branchNumbers: b.branchNumber ? [String(b.branchNumber)] : undefined, page: 1, pageSize: 20 };
        try { return res.status(200).json(await abc('POST', '/search/availability/items', body)); }
        catch (e1) { return res.status(200).json(await abc('POST', '/search/items', body)); }
      }
      case 'priceItems': {
        // POST /prices — ship-to + branch + items [{itemNumber, unitOfMeasure?, quantity?, variation?}]
        const body = b.payload || {
          shipToNumber: String(b.shipTo || ''),
          branchNumber: String(b.branchNumber || ''),
          items: (b.items || []).map(it => ({ itemNumber: String(it.itemNumber), quantity: it.quantity || 1, unitOfMeasure: it.uom || undefined, variation: it.variation || undefined })),
        };
        return res.status(200).json(await abc('POST', '/prices', body));
      }
      case 'frequents': return res.status(200).json(await abc('GET', '/api/product/v1/items/' + encodeURIComponent(String(b.billTo || '')) + '/frequents'));
      case 'recents': return res.status(200).json(await abc('GET', '/api/product/v1/items/' + encodeURIComponent(String(b.billTo || '')) + '/recents'));
      case 'templates': return res.status(200).json(await abc('GET', '/orderTemplates'));
      case 'branches': return res.status(200).json(await abc('GET', '/branches' + (b.query ? '?' + String(b.query) : '')));
      case 'itemAvailability': return res.status(200).json(await abc('GET', '/availability/items/' + encodeURIComponent(String(b.itemNumber || '')) + '/branches'));
      case 'placeOrder': return res.status(200).json(await abc('POST', '/orders', b.payload || {}));
      case 'getOrder': return res.status(200).json(await abc('GET', '/orders' + (b.query ? '?' + String(b.query) : '')));
      default: return res.status(400).json({ error: 'Unknown action: ' + a });
    }
  } catch (e) {
    if (e && e.code === 'NOT_CONFIGURED') return res.status(200).json({ configured: false, env: env() });
    return res.status(e.status || 500).json({ error: String(e.message || e), detail: e.detail || null });
  }
}
