// /api/measure.js
// Build 838 — an INSTANT, ADVISORY roof size for an address, from Google's
// Solar API. Not a measurement report and never presented as one.
//
// WHAT THIS IS FOR. Three jobs, all of them "before you spend money":
//   * pre-qualify a lead at the door or on the phone, before paying $13-19 for
//     a Roofr/Hover report on a job that may not close
//   * canvass a storm street and rank by roof size
//   * sanity-check a report you already bought — a parse that says 41 SQ against
//     a satellite estimate of 24 SQ has eaten a siding figure (the exact failure
//     /api/hover's own header warns about)
//
// WHAT IT IS NOT. It is not a measurement. It NEVER writes checklist.meas, and
// nothing in this repo may make it do so. That field feeds the Construction
// Agreement, the crew work order and the Supplement Desk — documents a carrier
// reads — and a $0.01 satellite estimate has no business being indistinguishable
// from a number somebody stood on the roof for. aerialMerge() deliberately is
// not called from here. Same family of rule as The Walk and the Visualizer:
// a machine may propose, a person disposes.
//
// IT ALSO PERSISTS NOTHING. Google's terms allow caching Solar Data for at most
// 30 consecutive days; checklist rows live for the life of the job. Rather than
// build an expiry sweeper for an advisory number, this route stores nothing at
// all and the browser holds the answer only as long as the panel is open. The
// ToS question then cannot arise, and "advisory" is enforced by construction
// rather than by everybody remembering.
//
// ⚠ THE KEY IS NOT THE ONE IN /api/config. That one is a BROWSER key: HTTP
// referrer restricted (so it cannot be used server-side at all) and API
// restricted to Maps JavaScript / Places / Static per CLAUDE.md. This route
// needs a SECOND, server-side key with **Solar API + Geocoding API** enabled and
// no referrer restriction. Set GOOGLE_SOLAR_KEY in Vercel. Unset means this
// route answers 503 and says so — it never silently falls back to the browser
// key, which would leak a referrer-restricted key into server logs for nothing.

const SUPABASE_URL = (process.env.SUPABASE_URL || 'https://yipslubcptjoarblzbpl.supabase.co').trim();
const SUPABASE_ANON_KEY = (process.env.SUPABASE_ANON_KEY || 'sb_publishable_aGsug3EBJjHX90BLKd5bLQ_zryUMqNZ').trim();

/* Same gate as /api/librarian: only a signed-in Cardinal user may spend the
   key. A new /api route is PUBLIC until it is given one of these — /api/notify
   was public until build 642 and the hardcoded anon key below is not an auth
   check, it is a published constant. */
async function requireUser(req, res) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) { res.status(401).json({ error: 'Sign in required' }); return null; }
  try {
    const who = await fetch(SUPABASE_URL + '/auth/v1/user', {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: 'Bearer ' + token }
    });
    if (!who.ok) { res.status(401).json({ error: 'Invalid session' }); return null; }
    const user = await who.json();
    if (!user || !user.email) { res.status(401).json({ error: 'Invalid session' }); return null; }
    return user;
  } catch (e) {
    res.status(401).json({ error: 'Could not verify session' });
    return null;
  }
}

/* ── the wrong-state fence ──────────────────────────────────────────────────
   MEASURED, not imagined. Geocoding all 42 addresses on `projects` through the
   app's own geocoder: 13 failed outright, and TWO came back confidently wrong —
   "948 Huron" resolved to San Francisco and "2420 Brookline" to Oklahoma City,
   because neither row carries a city. A silent wrong answer is far worse here
   than a refusal: the panel would have shown a real roof, correctly measured,
   belonging to a stranger 2,000 miles away.

   So every result is checked against a generous radius of Dayton. This is not a
   service-area policy — 100 miles is far wider than Cardinal works, and it is
   meant to be. It exists only to catch a geocode that landed in the wrong part
   of the country, which is the failure that actually occurred. */
const HOME = { lat: 39.7589, lon: -84.1916 };   /* downtown Dayton */
const FENCE_MILES = 100;

function milesFrom(lat, lon, from) {
  const R = 3958.8, rad = Math.PI / 180;
  const dLa = (lat - from.lat) * rad, dLo = (lon - from.lon) * rad;
  const a = Math.sin(dLa / 2) ** 2 +
            Math.cos(from.lat * rad) * Math.cos(lat * rad) * Math.sin(dLo / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

/* Roofers speak rise-over-12, Google speaks degrees. rise = 12·tan(θ).
   Kept to one decimal rather than snapped to a whole number: a facet reading
   6.4/12 is genuinely between two standard pitches, and rounding it to 6/12
   would present a guess as a reading. The caller decides how to show it. */
function riseOver12(deg) {
  if (deg == null || !isFinite(deg)) return null;
  return Math.round(12 * Math.tan(deg * Math.PI / 180) * 10) / 10;
}

const M2_TO_FT2 = 10.7639;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'POST only' });
    return;
  }
  const user = await requireUser(req, res);
  if (!user) return;

  const key = (process.env.GOOGLE_SOLAR_KEY || '').trim();
  if (!key) {
    /* Say which failure this is. A correct state with no explanation is its own
       defect — build 808 exists because a grey chip was accurate and told
       nobody the render machine had never been connected. */
    res.status(503).json({
      error: 'not_configured',
      detail: 'GOOGLE_SOLAR_KEY is not set in Vercel. This route needs its own server-side key with the Solar API and Geocoding API enabled — the browser key behind /api/config is referrer-restricted and cannot be used here.'
    });
    return;
  }

  try {
    const body = req.body || {};
    const address = typeof body.address === 'string' ? body.address.trim() : '';
    /* 839: stop after the geocode and the fence, and never spend a Solar call.
       The Address Check screen asks "would this address resolve, and to the
       right part of the country" for every client in the CRM — the roof is
       irrelevant to that question and billing one buildingInsights per client
       to answer it would be waste.

       It is a MODE of this route rather than a route of its own on purpose:
       the geocoder and the wrong-state fence must never exist in two places.
       A second copy would drift, and the fence is the thing standing between a
       typo and a confidently measured stranger's roof. One fence, one file. */
    const checkOnly = body.check_only === true;
    let lat = Number(body.lat), lon = Number(body.lon);
    let resolved = null, partial = false;

    if (!isFinite(lat) || !isFinite(lon)) {
      if (address.length < 6) {
        res.status(400).json({ error: 'no_address', detail: 'No address to look up.' });
        return;
      }
      const g = await fetch('https://maps.googleapis.com/maps/api/geocode/json?address=' +
        encodeURIComponent(address) + '&key=' + encodeURIComponent(key));
      const gj = await g.json().catch(() => null);
      if (!gj || gj.status !== 'OK' || !gj.results || !gj.results.length) {
        /* 13 of 42 real rows fail here. Name the address so the user can see
           WHICH one is unreadable rather than being told "it didn't work". */
        res.status(422).json({
          error: 'geocode_failed',
          detail: 'Could not find "' + address + '" on the map' +
                  (gj && gj.status && gj.status !== 'ZERO_RESULTS' ? ' (' + gj.status + ')' : '') +
                  '. Check the street, city and ZIP on the client record.'
        });
        return;
      }
      const hit = gj.results[0];
      lat = hit.geometry.location.lat;
      lon = hit.geometry.location.lng;
      resolved = hit.formatted_address || null;
      /* Google's own low-confidence flag. Surfaced rather than swallowed —
         partial_match is exactly the state that produced the San Francisco
         answer for "948 Huron". */
      partial = !!hit.partial_match;
    }

    const away = milesFrom(lat, lon, HOME);
    if (away > FENCE_MILES) {
      res.status(422).json({
        error: 'out_of_area',
        detail: 'That address resolved to a point ' + Math.round(away) +
                ' miles from Dayton' + (resolved ? ' (' + resolved + ')' : '') +
                ' — almost certainly the wrong place, not the wrong roof. ' +
                'Add the city and ZIP to the client record and try again.',
        resolved: resolved, miles_away: Math.round(away)
      });
      return;
    }

    if (checkOnly) {
      res.setHeader('Cache-Control', 'no-store');
      res.status(200).json({
        ok: true,
        check_only: true,
        resolved_address: resolved,
        partial_match: partial,
        miles_from_dayton: Math.round(away)
      });
      return;
    }

    const url = 'https://solar.googleapis.com/v1/buildingInsights:findClosest' +
      '?location.latitude=' + encodeURIComponent(lat) +
      '&location.longitude=' + encodeURIComponent(lon) +
      '&requiredQuality=BASE&key=' + encodeURIComponent(key);
    const r = await fetch(url);
    const j = await r.json().catch(() => null);

    if (!r.ok) {
      const gerr = (j && j.error && j.error.message) || ('HTTP ' + r.status);
      /* NOT_FOUND is the ordinary answer for a building Google has not modelled,
         not a fault. Measured 16 Aug: all 29 geocodable Cardinal addresses fall
         inside HIGH or MEDIUM coverage, so this should be rare here — but a new
         build, a barn or a re-roofed outbuilding can still miss. */
      if (r.status === 404) {
        res.status(404).json({
          error: 'no_building',
          detail: 'Google has no roof model for that spot. New construction and outbuildings are the usual reason. Order a report for this one.',
          resolved: resolved
        });
        return;
      }
      res.status(502).json({ error: 'solar_failed', detail: String(gerr).slice(0, 300) });
      return;
    }

    const segs = Array.isArray(j.solarPotential && j.solarPotential.roofSegmentStats)
      ? j.solarPotential.roofSegmentStats : [];
    if (!segs.length) {
      res.status(404).json({ error: 'no_facets', detail: 'Google returned no roof facets for that building.', resolved: resolved });
      return;
    }

    /* areaMeters2 is the SLOPED surface — "the roof area (accounting for tilt),
       not the ground footprint" — so there is no pitch multiplier to apply here
       and applying one would double-count the slope. */
    let areaM2 = 0, groundM2 = 0;
    const byPitch = new Map();
    segs.forEach(s => {
      const a = Number(s.stats && s.stats.areaMeters2) || 0;
      const gnd = Number(s.stats && s.stats.groundAreaMeters2) || 0;
      areaM2 += a; groundM2 += gnd;
      const rise = riseOver12(Number(s.pitchDegrees));
      const label = rise == null ? 'unknown' : (Math.round(rise) + '/12');
      byPitch.set(label, (byPitch.get(label) || 0) + a);
    });

    /* Google's own caveat, applied rather than quoted: wholeRoofStats "may not
       include the entire building", and the docs recommend scaling the assigned
       roof area by the ratio of the ground areas to recover the rest. When the
       building footprint is bigger than the footprint of the facets Google could
       assign, the difference is roof it did not model. Reported as a SEPARATE
       figure, never folded silently into the headline number. */
    const wholeGround = Number(
      j.solarPotential && j.solarPotential.wholeRoofStats &&
      j.solarPotential.wholeRoofStats.groundAreaMeters2) || 0;
    const bldGround = Number(
      j.solarPotential && j.solarPotential.buildingStats &&
      j.solarPotential.buildingStats.groundAreaMeters2) || 0;
    let unmodelled_pct = null;
    if (bldGround > 0 && wholeGround > 0 && bldGround > wholeGround) {
      unmodelled_pct = Math.round((1 - wholeGround / bldGround) * 100);
    }

    const areaFt2 = areaM2 * M2_TO_FT2;
    const pitches = [...byPitch.entries()]
      .map(([pitch, m2]) => ({
        pitch,
        area_sqft: Math.round(m2 * M2_TO_FT2),
        percent: Math.round((m2 / areaM2) * 1000) / 10
      }))
      .sort((a, b) => b.area_sqft - a.area_sqft);

    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({
      source: 'Satellite (Google Solar)',
      advisory: true,                          /* the client refuses to file it without this */
      area_sqft: Math.round(areaFt2),
      squares: Math.round(areaFt2 / 100 * 10) / 10,
      facet_count: segs.length,
      pitch: pitches.length ? pitches[0].pitch : null,
      pitch_breakdown: pitches,
      imagery_quality: j.imageryQuality || null,
      imagery_date: j.imageryDate
        ? [j.imageryDate.year, j.imageryDate.month, j.imageryDate.day].filter(v => v != null).join('-')
        : null,
      resolved_address: resolved,
      partial_match: partial,
      unmodelled_pct: unmodelled_pct,
      miles_from_dayton: Math.round(away)
    });
  } catch (err) {
    res.status(500).json({ error: 'server_error', detail: String(err && err.message || err).slice(0, 300) });
  }
}
