/* Cardinal Resource — service worker
 *
 * Push notifications + an offline shell.
 *
 * DESIGN NOTE — deploys stay instant.
 * The previous version deliberately skipped caching so a new deploy was live
 * immediately. That property is preserved here: navigation requests go to the
 * network FIRST and the cache is only used when the network fails. A fresh
 * deploy is therefore picked up on the very next load, exactly as before.
 * The cache exists solely so the app still opens when a rep has no signal.
 *
 * Never cached: Supabase (auth + data) and /api/* (serverless functions).
 * Those must always hit the network so a stale session or stale claim data
 * can never be served from disk.
 *
 * Bump CACHE on each deploy — the activate handler evicts every other version.
 */
var CACHE = 'cardinal-shell-v1';
var SHELL = [
  '/',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png'
];

self.addEventListener('install', function(e){
  e.waitUntil(
    caches.open(CACHE)
      .then(function(c){ return c.addAll(SHELL); })
      .catch(function(){ /* a missing asset must not block activation */ })
      .then(function(){ return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys()
      .then(function(keys){
        return Promise.all(keys.map(function(k){
          return k === CACHE ? null : caches.delete(k);
        }));
      })
      .then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(e){
  var req = e.request;

  /* Only GETs are cacheable. */
  if(req.method !== 'GET') return;

  var url;
  try{ url = new URL(req.url); }catch(err){ return; }

  /* Cross-origin auth/data and our own functions: always live network. */
  if(url.hostname.indexOf('.supabase.co') !== -1) return;
  if(url.pathname.indexOf('/api/') === 0) return;

  /* Navigations: network first, cached shell as the offline fallback. */
  if(req.mode === 'navigate'){
    e.respondWith(
      fetch(req)
        .then(function(res){
          if(res && res.ok){
            var copy = res.clone();
            caches.open(CACHE).then(function(c){ c.put('/', copy); });
          }
          return res;
        })
        .catch(function(){
          return caches.match('/').then(function(hit){
            return hit || new Response(
              '<!doctype html><meta charset="utf-8">' +
              '<meta name="viewport" content="width=device-width,initial-scale=1">' +
              '<title>Cardinal — offline</title>' +
              '<body style="margin:0;background:#170f11;color:#f0e9ea;' +
              'font:16px/1.6 system-ui,sans-serif;display:grid;place-items:center;' +
              'height:100vh;text-align:center;padding:0 8%">' +
              '<div><p style="font-size:1.3rem;font-weight:600;margin:0 0 .4em">No signal</p>' +
              '<p style="opacity:.75;margin:0">Cardinal will load as soon as you' +
              ' have a connection. Nothing you entered has been lost.</p></div>',
              { headers: { 'Content-Type': 'text/html; charset=utf-8' }, status: 503 }
            );
          });
        })
    );
    return;
  }

  /* Same-origin static assets and CDN libraries: cache first, refill behind it. */
  e.respondWith(
    caches.match(req).then(function(hit){
      if(hit) return hit;
      return fetch(req).then(function(res){
        if(res && res.ok && (res.type === 'basic' || res.type === 'cors')){
          var copy = res.clone();
          caches.open(CACHE).then(function(c){ c.put(req, copy); });
        }
        return res;
      });
    })
  );
});

/* ---------- push (unchanged) ---------- */
self.addEventListener('push', function(e){
  var data = {};
  try{ data = e.data ? e.data.json() : {}; }catch(err){ data = { title:'Cardinal', body: e.data ? e.data.text() : '' }; }
  var title = data.title || 'Cardinal Resource';
  var opts = {
    body: data.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: { url: data.url || '/' },
    tag: data.tag || undefined
  };
  e.waitUntil(self.registration.showNotification(title, opts));
});

self.addEventListener('notificationclick', function(e){
  e.notification.close();
  var url = (e.notification.data && e.notification.data.url) || '/';
  e.waitUntil(clients.matchAll({ type:'window', includeUncontrolled:true }).then(function(list){
    for(var i=0;i<list.length;i++){
      if('focus' in list[i]){ list[i].navigate(url); return list[i].focus(); }
    }
    return clients.openWindow(url);
  }));
});
