/* Cardinal Resource — service worker
 *
 * Push notifications + an offline shell.
 *
 * DESIGN NOTE — the app opens from the phone (build 677).
 * It used to be network-first for navigations, so every launch re-downloaded
 * the whole 3.86 MB document before anything appeared: ~30s on a weak signal,
 * measured. The shell is now served from the cache and refreshed behind the
 * response — the same stale-while-revalidate this worker already used for
 * every other same-origin asset. The document stops being the exception.
 *
 * The cost, accepted knowingly: the launch after a deploy shows the PREVIOUS
 * build. The worker therefore watches the revalidation, and when it brings
 * back a different build it messages the page ('cr-shell-updated'), which
 * offers one tap to load it. The new shell is already on disk by then, so
 * that tap is about a second, not another download. If you remove that
 * message, put something else in its place — a silently stale app is how
 * "the fix didn't work" gets misdiagnosed, twice, per CLAUDE.md.
 *
 * ONLY '/' is served from cache. Every other navigation stays network-first,
 * and that is load-bearing: an iframe load IS a navigation (build 562), so
 * without the guard /ai-field-manual.html would be answered WITH the app.
 *
 * Never cached: Supabase (auth + data) and /api/* (serverless functions).
 * Those must always hit the network so a stale session or stale claim data
 * can never be served from disk.
 *
 * CACHE is no longer a per-deploy chore. Same-origin assets are
 * stale-while-revalidate, so they self-heal on the next load; bumping CACHE is
 * now only needed to force-evict everything at once (e.g. a poisoned entry).
 * The activate handler still evicts every other version when you do.
 */
var CACHE = 'cardinal-shell-v1';
var DATA_CACHE = 'cardinal-data-v1';
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
          return (k === CACHE || k === DATA_CACHE) ? null : caches.delete(k);
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

  /* Cross-origin auth/data and our own functions.
     864 (offline-first, phase 1): Supabase REST *reads* are cached so screens
     you have already opened come back with no signal. NETWORK-FIRST — online is
     always live; the cache is only the offline fallback. Auth, storage and
     realtime stay live. The cache is a SEPARATE bucket, wiped on logout (message
     handler below) so one person's data can never show for the next. */
  if(url.hostname.indexOf('.supabase.co') !== -1){
    if(url.pathname.indexOf('/rest/v1/') === 0){
      e.respondWith(
        fetch(req).then(function(res){
          if(res && res.ok){
            var copy = res.clone();
            caches.open(DATA_CACHE).then(function(c){ c.put(req, copy); }).catch(function(){});
          }
          return res;
        }).catch(function(){
          return caches.open(DATA_CACHE).then(function(c){ return c.match(req); }).then(function(hit){
            return hit || new Response('{"offline":true}', { status: 503, headers:{ 'Content-Type':'application/json' } });
          });
        })
      );
      return;
    }
    return;
  }
  if(url.pathname.indexOf('/api/') === 0) return;

  /* ---- how the app opens ------------------------------------------------
     ONLY '/' is the app shell, and only '/' is served from cache. Build 562:
     an iframe load IS a navigation, so /ai-field-manual.html once overwrote
     the shell. Answering that path FROM the shell would be the same bug
     pointed the other way, so every other navigation keeps the old
     network-first path below, unchanged. */
  if(req.mode === 'navigate' && url.pathname === '/'){
    e.respondWith(
      /* This read is now on the critical path of every launch, where before it
         was only reached when already offline. If CacheStorage rejects — quota,
         eviction mid-read, a corrupt profile — the chain below would reject
         into respondWith, and the user gets a BROKEN front door instead of a
         slow one. Degrade to "no cache" and take the network. */
      caches.match('/').catch(function(){ return undefined; }).then(function(hit){

        /* Revalidate whatever we answer with. When this lands a DIFFERENT
           build than the one on disk, tell the page so it can offer a reload
           — the new shell is already cached by then, so that reload is fast.
           Comparing 3.86 MB of text on every launch to answer that question
           would not be worth it, so it is decided on headers alone.

           Is the fresh copy a DIFFERENT build from the one on disk?
           Compare the first header PRESENT ON BOTH sides. Applying a
           ladder to each side independently was a real bug: a cached
           response carrying only an ETag would be compared against a fresh
           one carrying only Content-Length — two different kinds of value,
           never equal, so every launch would claim an update. When there is
           nothing comparable this returns null and we say NOTHING, because
           "cannot tell" is the honest answer and a false update prompt
           trains the user to ignore the real one. */
        var changed = function(a, b){
          if(!a || !b) return false;
          var keys = ['etag', 'last-modified', 'content-length'];
          for(var i = 0; i < keys.length; i++){
            var x = a.headers.get(keys[i]), y = b.headers.get(keys[i]);
            if(x && y) return x !== y;
          }
          return false;
        };

        /* One promise for the PAGE (resolves at headers, which is when the
           document can start streaming) and one for the WORKER's lifetime.
           They are not the same promise and that distinction is the whole
           bug this replaced: fetch() resolves when the headers arrive, the
           3.86 MB body streams afterwards, and cache.put() is what reads it.
           Handing waitUntil a promise that settled at headers let the browser
           kill the worker mid-write — on exactly the weak connections this
           build is for. `settled` resolves only after the put AND the
           message, so waitUntil protects the thing that matters. */
        var netRes = fetch(req);
        var settled = netRes.then(function(res){
          if(!(res && res.ok)) return;
          var copy = res.clone();
          var isNew = changed(hit, res);
          return caches.open(CACHE).then(function(c){
            return c.put('/', copy);
          }).then(function(){
            /* Only worth saying when there WAS something to compare against
               and it genuinely changed — a first install must not announce an
               update to a build the user is already looking at. */
            if(!hit || !isNew) return;
            return self.clients.matchAll({ type:'window', includeUncontrolled:true })
              .then(function(list){
                for(var i = 0; i < list.length; i++){
                  try{ list[i].postMessage({ type:'cr-shell-updated' }); }catch(_){}
                }
              });
          });
        });
        e.waitUntil(settled.catch(function(){}));

        /* Cached shell instantly when we have one; the network only when we
           do not. The refill is already under waitUntil above, and its catch
           matters because an offline revalidation must not reject into an
           unhandled rejection — the user already has their answer. */
        if(hit) return hit;
        return netRes.catch(function(){
          return new Response(
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
      }).catch(function(){
        /* Belt and braces. The .catch on caches.match above covers a REJECTED
           read; this covers anything else that could throw synchronously in the
           branch. respondWith must never be handed a rejected promise — that is
           a broken front door, not a slow one. */
        return fetch(req);
      })
    );
    return;
  }

  /* Every OTHER navigation: network first, cached shell as the offline
     fallback. Unchanged from build 562 — see the note above for why this is
     not merged with the branch above. */
  if(req.mode === 'navigate'){
    e.respondWith(
      fetch(req)
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

  var sameOrigin = (url.origin === self.location.origin);

  e.respondWith(
    caches.match(req).then(function(hit){

      /* CDN libraries: cache-first FOREVER, and that is deliberate. index.html
         loads supabase-js@2, chart.js and papaparse from a CDN with a floating
         major, so revalidating would quietly move every user onto a new minor of
         a dependency this app has no test runner to catch. A frozen copy is the
         nearest thing to a lockfile an app with no build step gets. Do not
         "fix" this into a refresh without deciding that with Theo first. */
      if(hit && !sameOrigin) return hit;

      var net = fetch(req).then(function(res){
        if(res && res.ok && (res.type === 'basic' || res.type === 'cors')){
          var copy = res.clone();
          caches.open(CACHE).then(function(c){ c.put(req, copy); });
        }
        return res;
      });

      /* Same-origin assets: stale-while-revalidate. The cached copy is returned
         at exactly the speed it always was, then refreshed behind the response
         so the NEXT load is current.

         This is what makes a changed icon or manifest actually reach anyone.
         The header above says "bump CACHE on each deploy"; CACHE has been
         'cardinal-shell-v1' since it was written, because a manual step on
         every deploy — from a phone, through the GitHub web UI — was never
         going to hold. Self-healing beats a rule nobody can keep.

         waitUntil keeps the worker alive for the refill; the .catch matters
         because an offline revalidation must not reject into an unhandled
         rejection, and the user already has their answer either way. */
      if(hit){
        e.waitUntil(net.catch(function(){}));
        return hit;
      }
      return net;
    })
  );
});

/* ---------- 864: clear the offline data cache on logout ---------- */
self.addEventListener('message', function(e){
  if(e && e.data && e.data.type === 'cr-clear-data-cache'){
    e.waitUntil(caches.delete(DATA_CACHE).catch(function(){}));
  }
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
