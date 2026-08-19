// api/storm.js  [v1 · 2026-08-19 · build 927]
// ═════════════════════════════════════════════════════════════════════
// Hail and wind storm reports around a point — the data behind Storm Data
// on the Sales Floor.
//
// WHY THIS SOURCE.
// Theo asked for "hail swath, wind damage". A true hail SWATH — the
// interpolated polygon showing where hail actually fell — is a paid vendor
// product (HailTrace and the like): an account, a subscription, and a bill
// that recurs whether anyone knocks a door that month. This route uses the
// free official alternative instead: NWS Local Storm Reports, served as
// GeoJSON by the Iowa State Mesonet. They are POINTS, not polygons — a
// trained spotter or a gauge said "1.75in hail here at 18:40" — so they
// answer "which neighbourhoods got hit, and when" without answering
// "exactly which parcels". Measured before it was written: 355 hail/wind
// reports inside 60 miles of Dayton across five months, naming Kettering,
// Beavercreek, West Carrollton and Northridge.
//
// If a swath vendor is ever bought, this route is where the second source
// goes — the front end reads normalised rows and does not care who measured.
//
// THE THREE EVENT TYPES, and why only these three.
//   H = hail          → magnitude is inches
//   G = wind gust     → magnitude is knots or mph (unit comes with it)
//   D = wind damage   → no magnitude; the damage IS the report
// Everything else the LSR feed carries (rain, flood, snow, fog, tornado…)
// is dropped: this screen exists to find roofs to look at.
//
// PUBLIC, deliberately. Every byte returned is US government weather data
// about the sky, not about a customer. No key, no session, nothing from
// Supabase. The only cost of it being open is a little upstream politeness,
// which the cache header below covers.
// ═════════════════════════════════════════════════════════════════════

const FEED = 'https://mesonet.agron.iastate.edu/geojson/lsr.geojson';
const TIMEOUT_MS = 12000;

/* Cardinal's yard. Overridable, but this is the answer 99% of the time. */
const HOME = { lat: 39.7589, lon: -84.1916 };
const STATES = 'OH,IN,KY';

const KIND = {
  H: { key: 'hail',   label: 'Hail' },
  G: { key: 'gust',   label: 'Wind gust' },
  D: { key: 'damage', label: 'Wind damage' },
};

/* Equirectangular is plenty at this scale and costs no trig library —
   at 60 miles the error against haversine is under a tenth of a mile. */
function milesBetween(aLat, aLon, bLat, bLon) {
  const p = Math.PI / 180;
  const x = (bLon - aLon) * p * Math.cos(((aLat + bLat) * p) / 2);
  const y = (bLat - aLat) * p;
  return 3958.8 * Math.sqrt(x * x + y * y);
}

function num(v, fallback) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function iso(d) { return new Date(d).toISOString().slice(0, 19) + 'Z'; }

export default async function handler(req, res) {
  const q = req.query || {};
  const lat    = num(q.lat, HOME.lat);
  const lon    = num(q.lon, HOME.lon);
  const radius = Math.min(250, Math.max(5,  num(q.radius, 60)));
  const days   = Math.min(730, Math.max(1,  num(q.days, 120)));

  const ets = new Date();
  const sts = new Date(ets.getTime() - days * 86400000);
  const url = FEED + '?states=' + encodeURIComponent(STATES) +
              '&sts=' + encodeURIComponent(iso(sts)) +
              '&ets=' + encodeURIComponent(iso(ets));

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  let raw;
  try {
    const r = await fetch(url, { signal: ctrl.signal, headers: { accept: 'application/json' } });
    if (!r.ok) throw new Error('storm feed returned HTTP ' + r.status);
    raw = await r.json();
  } catch (e) {
    clearTimeout(timer);
    /* Say which half failed. A screen that reports "no storms" when the
       feed was simply unreachable is the lie this project keeps paying for. */
    return res.status(502).json({
      ok: false,
      error: 'The National Weather Service report feed could not be reached.',
      detail: String((e && e.message) || e).slice(0, 200),
    });
  }
  clearTimeout(timer);

  const feats = Array.isArray(raw && raw.features) ? raw.features : [];
  const rows = [];
  for (const f of feats) {
    const p = (f && f.properties) || {};
    const k = KIND[p.type];
    if (!k) continue;
    const c = (f.geometry && f.geometry.coordinates) || [];
    const plat = num(c[1], NaN), plon = num(c[0], NaN);
    if (!Number.isFinite(plat) || !Number.isFinite(plon)) continue;
    const miles = milesBetween(lat, lon, plat, plon);
    if (miles > radius) continue;
    rows.push({
      kind:      k.key,
      label:     k.label,
      magnitude: p.magnitude === '' || p.magnitude == null ? null : num(p.magnitude, null),
      unit:      p.unit || (k.key === 'hail' ? 'in' : null),
      city:      p.city || '',
      county:    p.county || '',
      state:     p.st || '',
      at:        p.valid || '',
      miles:     Math.round(miles * 10) / 10,
      lat: plat, lon: plon,
      remark:    (p.remark || '').slice(0, 400),
      source:    p.source || '',
    });
  }

  /* Newest first — a rep is canvassing the last storm, not the biggest one
     of the year. Ties break by distance so the near ones lead. */
  rows.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : a.miles - b.miles));

  const counts = { hail: 0, gust: 0, damage: 0 };
  let worstHail = null;
  for (const r of rows) {
    counts[r.kind]++;
    if (r.kind === 'hail' && r.magnitude != null &&
        (worstHail == null || r.magnitude > worstHail)) worstHail = r.magnitude;
  }

  /* Group by storm DAY: "Aug 7" is how a canvasser thinks, not "18:40Z". */
  const byDay = {};
  for (const r of rows) {
    const d = String(r.at).slice(0, 10);
    if (!byDay[d]) byDay[d] = { day: d, hail: 0, gust: 0, damage: 0, worstHail: null, places: [] };
    const g = byDay[d];
    g[r.kind]++;
    if (r.kind === 'hail' && r.magnitude != null &&
        (g.worstHail == null || r.magnitude > g.worstHail)) g.worstHail = r.magnitude;
    if (r.city && g.places.length < 8 && !g.places.includes(r.city)) g.places.push(r.city);
  }
  const days_ = Object.values(byDay).sort((a, b) => (a.day < b.day ? 1 : -1));

  res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=3600');
  return res.status(200).json({
    ok: true,
    center: { lat, lon }, radius, days,
    window: { from: iso(sts), to: iso(ets) },
    counts, worstHail,
    total: rows.length,
    days_grouped: days_,
    reports: rows.slice(0, 400),
    source: 'NWS Local Storm Reports via Iowa State Mesonet',
  });
}
