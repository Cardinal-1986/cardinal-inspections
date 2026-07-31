// /api/config.js
// The one route index.html asks for that has never existed.
//
// WHAT WAS BROKEN. `loadConfig()` in the cr-gmap-script module fetches
// /api/config and reads `googleMapsKey`. There was no api/config.js and no
// rewrite in vercel.json, so the fetch 404s, the .catch sets API_KEY = '', and
// EVERY consumer in that module short-circuits on the empty key:
//
//   * address autocomplete never attaches      (loadMaps throws 'no google maps key configured')
//   * staticMapUrl() returns ''                 - so the satellite property image is blank
//   * insertMap() returns before building the block, which takes the
//     Directions and View-on-Maps buttons with it, even though those two
//     URLs need no key at all
//
// It degrades silently and cleanly - nothing throws where a user can see it -
// which is exactly why it survived. CLAUDE.md recorded it as "address
// autocomplete is silently off"; the module is inert end to end.
//
// WHY THIS ROUTE IS NOT BEHIND THE SIGNED-IN GATE the other routes use.
// A Google Maps *browser* key cannot be kept secret: the Maps JS API is loaded
// by putting the key in a <script src> in the page, so any user who can see a
// map can read it. Secrecy is not the control - HTTP REFERRER RESTRICTION is.
//
// There is also a concrete trap in gating it. loadConfig() memoises its promise
// forever, including the failure path. If the first call happened before sign
// in, a 401 would cache API_KEY = '' for the rest of the session and maps would
// stay dead after signing in. Gating would buy no real security and cost that.
//
//   >>> BEFORE SETTING GOOGLE_MAPS_API_KEY, RESTRICT THE KEY IN GOOGLE CLOUD <<<
//   Application restrictions -> HTTP referrers -> app.cardinalroster.com/*
//   API restrictions -> Maps JavaScript API, Places API, Maps Static API
//   An unrestricted key served from here can be lifted and billed to Cardinal.
//
// Unset env var means this returns an empty key, which is byte-for-byte the
// behaviour the app has today. Shipping this cannot regress anything; it only
// makes the feature reachable once the key exists.

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.status(405).json({ error: 'GET or POST only' });
    return;
  }

  const key = (process.env.GOOGLE_MAPS_API_KEY || '').trim();

  /* Never cached at the edge. A key can be rotated or pulled in Google Cloud,
     and a CDN holding the old one would keep a revoked key in circulation. */
  res.setHeader('Cache-Control', 'no-store');

  res.status(200).json({
    googleMapsKey: key,
    /* So the app can tell "no key configured" apart from "route missing", which
       is the distinction that made this invisible for as long as it was. */
    configured: !!key
  });
}
