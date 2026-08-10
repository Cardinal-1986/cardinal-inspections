/* Build 677 — the app opens from the phone, not from the network.

   This EXECUTES the shipped sw.js. The file is read, run inside a sandbox that
   supplies a fake `self`, `caches`, `fetch`, `Response` and `URL`, and the real
   fetch handler it registers is then driven through the scenarios that matter.
   Nothing here re-implements the worker; if sw.js changes, this moves with it.

   A service worker is the highest-blast-radius file in the repo — a bad one
   serves the wrong document to every user until it is replaced — so the
   scenarios below are deliberately weighted toward the ways this change could
   serve the WRONG thing, not the ways it could be fast.

   Usage: node harness_677.js [sw.js] [index.html]
   Point it at the previous sw.js as the negative control — must go red.     */
const fs = require('fs');
const path = require('path');

const SWF = path.resolve(process.argv[2] || '/home/user/cardinal-inspections/sw.js');
const IDXF = path.resolve(process.argv[3] || '/home/user/cardinal-inspections/index.html');
const SW = fs.readFileSync(SWF, 'utf8');
const IDX = fs.readFileSync(IDXF, 'utf8');

let pass = 0, fail = 0;
const ok = (l, c, n) => { if (c) { pass++; console.log('  PASS ' + l); }
  else { fail++; console.log('  FAIL ' + l + (n !== undefined ? '  → ' + n : '')); } };

/* ── a service-worker environment, small but honest ──────────────────────── */
function makeEnv(opts) {
  const o = opts || {};
  const log = { fetched: [], put: [], putDone: [], posted: [], waitUntil: 0, waited: [] };

  class Hdrs {
    constructor(h) { this.h = {}; for (const k in (h || {})) this.h[k.toLowerCase()] = h[k]; }
    get(k) { const v = this.h[String(k).toLowerCase()]; return v === undefined ? null : v; }
  }
  class Res {
    constructor(body, init) {
      init = init || {};
      this.body = body; this.status = init.status === undefined ? 200 : init.status;
      this.ok = this.status >= 200 && this.status < 300;
      this.headers = new Hdrs(init.headers);
      this.type = init.type || 'basic';
      this.__tag = init.__tag || null;          // test-only identity
    }
    clone() { const r = new Res(this.body, { status: this.status, headers: this.headers.h,
      type: this.type, __tag: this.__tag }); return r; }
  }

  /* the Cache API surface the worker actually uses */
  const store = new Map();
  for (const k in (o.cached || {})) store.set(k, o.cached[k]);
  const cacheObj = {
    /* put() is deliberately SLOW and records when it FINISHES. cache.put reads
       the response body, which for a 3.86 MB shell is not instant — an instant
       mock cannot tell "waitUntil waited for the write" from "waitUntil settled
       at the headers", which is exactly the critical bug this build shipped and
       had to fix. */
    put: (k, v) => { const key = typeof k === 'string' ? k : k.url;
      log.put.push(key);
      return new Promise(r => setTimeout(() => {
        store.set(key, v); log.putDone.push(key); r();
      }, 30)); },
    addAll: () => Promise.resolve(),
    match: k => Promise.resolve(store.get(typeof k === 'string' ? k : k.url))
  };
  const caches = {
    open: () => Promise.resolve(cacheObj),
    keys: () => Promise.resolve([]),
    delete: () => Promise.resolve(true),
    /* CacheStorage really can reject — quota, eviction mid-read, a corrupt
       profile. This read is on the critical path of every launch now. */
    match: k => o.matchRejects ? Promise.reject(new Error('CacheStorage failed'))
                               : cacheObj.match(k)
  };

  const clientList = [{ postMessage: m => log.posted.push(m) },
                      { postMessage: m => log.posted.push(m) }];

  const handlers = {};
  const self = {
    addEventListener: (t, fn) => { (handlers[t] = handlers[t] || []).push(fn); },
    skipWaiting: () => Promise.resolve(),
    location: { origin: 'https://app.cardinalroster.com' },
    clients: { claim: () => Promise.resolve(),
               matchAll: () => Promise.resolve(clientList) },
    registration: { showNotification: () => Promise.resolve() }
  };

  const fetchImpl = req => {
    log.fetched.push(typeof req === 'string' ? req : req.url);
    if (o.offline) return Promise.reject(new Error('offline'));
    return Promise.resolve(o.netRes ? o.netRes(Res) : new Res('NETWORK', { __tag: 'network' }));
  };

  // eslint-disable-next-line no-new-func
  new Function('self', 'caches', 'fetch', 'clients', 'Response', 'URL', 'Headers', SW)(
    self, caches, fetchImpl, self.clients, Res, URL, Hdrs);

  return { handlers, log, Res, store, self };
}

async function drive(env, url, mode) {
  let answered = null, waits = [];
  const e = {
    request: { url, method: 'GET', mode: mode || 'navigate' },
    respondWith: p => { answered = p; },
    waitUntil: p => {
      env.log.waitUntil++; waits.push(p);
      /* record what the cache looked like at the MOMENT this promise settled —
         if it settles before the write, the worker was free to die mid-write */
      Promise.resolve(p).then(
        () => env.log.waited.push(env.log.putDone.slice()),
        () => env.log.waited.push(env.log.putDone.slice()));
    }
  };
  const fns = env.handlers.fetch || [];
  for (const fn of fns) fn(e);
  const res = answered ? await answered : null;
  env.coldAnsweredBeforeWrite = !env.log.putDone.length;
  await Promise.all(waits.map(p => Promise.resolve(p).catch(() => {})));
  /* let the cache-write / postMessage microtask chain settle */
  for (let i = 0; i < 12; i++) await Promise.resolve();
  await new Promise(r => setImmediate(r));
  return res;
}

const ORIGIN = 'https://app.cardinalroster.com';

(async () => {
  console.log('── the worker parses and registers its handlers ──');
  {
    const env = makeEnv({});
    ok('sw.js runs and registers a fetch handler', (env.handlers.fetch || []).length === 1);
    ok('…and still registers install / activate / push / notificationclick',
      ['install', 'activate', 'push', 'notificationclick'].every(k => (env.handlers[k] || []).length === 1));
  }

  console.log('\n── the launch Theo complained about: "/" with a shell on the phone ──');
  {
    const env = makeEnv({
      cached: { '/': new (makeEnv({}).Res)('CACHED-SHELL', { headers: { etag: 'W/"old"' }, __tag: 'cached' }) },
      netRes: R => new R('NETWORK-SHELL', { headers: { etag: 'W/"new"' }, __tag: 'network' })
    });
    const res = await drive(env, ORIGIN + '/');
    ok('the CACHED shell is what gets answered — this is the whole build',
      res && res.__tag === 'cached', res ? res.__tag : 'no response');
    ok('…and the network is still asked, in the background',
      env.log.fetched.length === 1, JSON.stringify(env.log.fetched));
    /* Says only what it checks. The first wording was "kept alive with
       waitUntil so the refill cannot be killed mid-write" — which counts the
       CALL and claims the GUARANTEE, and passed on code that did not provide
       it. That is BUG_CLASSES 15, an assertion matching its own prose. The
       guarantee is the ordering assertion below; this one is bookkeeping. */
    ok('…and waitUntil is called exactly once for the launch',
      env.log.waitUntil === 1, env.log.waitUntil);
    ok('…and the fresh copy really was written to the cache',
      env.log.put.includes('/'), JSON.stringify(env.log.put));
    ok('…and because the build CHANGED, the page is told',
      env.log.posted.length === 2 && env.log.posted[0].type === 'cr-shell-updated',
      JSON.stringify(env.log.posted));

    /* THE CRITICAL ONE. fetch() resolves at the HEADERS; the 3.86 MB body
       streams afterwards and cache.put() is what reads it. The first version of
       this build handed waitUntil a promise that settled at headers, so the
       browser was free to kill the worker mid-write — on exactly the weak
       connections this build is for. Found by an adversarial review, confirmed
       with a standalone probe, and this is the assertion that keeps it dead. */
    ok('waitUntil waits for the CACHE WRITE, not just the headers',
      env.log.waited.length === 1 && env.log.waited[0].includes('/'),
      'cache written when waitUntil settled: ' + JSON.stringify(env.log.waited));
  }

  console.log('\n── the same launch when NOTHING changed ──');
  {
    const env = makeEnv({
      cached: { '/': new (makeEnv({}).Res)('SHELL', { headers: { etag: 'W/"same"' }, __tag: 'cached' }) },
      netRes: R => new R('SHELL', { headers: { etag: 'W/"same"' }, __tag: 'network' })
    });
    const res = await drive(env, ORIGIN + '/');
    ok('still answered from cache', res && res.__tag === 'cached');
    ok('and the page is NOT nagged about an update it already has',
      env.log.posted.length === 0, JSON.stringify(env.log.posted));
  }

  console.log('\n── first ever launch: nothing cached yet ──');
  {
    const env = makeEnv({ netRes: R => new R('SHELL', { headers: { etag: 'W/"a"' }, __tag: 'network' }) });
    const res = await drive(env, ORIGIN + '/');
    ok('the network answer is used — there is nothing else to use',
      res && res.__tag === 'network', res ? res.__tag : 'none');
    ok('it is cached for next time', env.log.put.includes('/'));
    /* The trap on the OTHER side of the waitUntil fix, and the reason the fix
       keeps two separate promises: on a COLD install the response IS what the
       page gets, so if respondWith were handed the write-chain the document
       would be withheld until all 3.86 MB had downloaded AND been written to
       disk. It must settle at the headers. */
    ok('…and the page is NOT made to wait for that write before it can render',
      env.coldAnsweredBeforeWrite === true,
      'respondWith settled after the cache write — the cold path is blocked');
    ok('and a FIRST install does not announce an update to the build on screen',
      env.log.posted.length === 0, JSON.stringify(env.log.posted));
  }

  console.log('\n── THE 562 GUARD: an iframe load is a navigation ──');
  {
    const env = makeEnv({
      cached: { '/': new (makeEnv({}).Res)('APP-SHELL', { headers: { etag: 'W/"x"' }, __tag: 'cached' }) },
      netRes: R => new R('THE-BOOK', { __tag: 'book' })
    });
    const res = await drive(env, ORIGIN + '/ai-field-manual.html');
    ok('the AI Field Manual is NOT answered with the app shell',
      res && res.__tag !== 'cached', res ? res.__tag : 'none');
    ok('…it is fetched from the network, like before', res && res.__tag === 'book');
    ok('…and it does NOT overwrite the shell in the cache',
      !env.log.put.includes('/'), JSON.stringify(env.log.put));
    const shell = await env.store.get('/');
    ok('…the cached shell is still the app', shell && shell.body === 'APP-SHELL',
      shell ? shell.body : 'gone');
  }

  console.log('\n── CacheStorage itself fails ──');
  {
    /* Before this build, caches.match was only reached when already offline.
       It is now the FIRST thing every launch does, so a rejection there would
       reject respondWith — and the user gets a broken front door instead of a
       slow one. It must degrade to "no cache" and take the network. */
    const env = makeEnv({ matchRejects: true,
      netRes: R => new R('SHELL', { headers: { etag: 'W/"a"' }, __tag: 'network' }) });
    let threw = false, res = null;
    try { res = await drive(env, ORIGIN + '/'); } catch (_) { threw = true; }
    ok('a rejecting CacheStorage does not break the front door', !threw);
    ok('…it falls through to the network', res && res.__tag === 'network',
      res ? res.__tag : 'no response');
  }

  console.log('\n── no signal ──');
  {
    const env = makeEnv({
      offline: true,
      cached: { '/': new (makeEnv({}).Res)('SHELL', { headers: { etag: 'W/"x"' }, __tag: 'cached' }) }
    });
    const res = await drive(env, ORIGIN + '/');
    ok('offline WITH a shell still opens the app', res && res.__tag === 'cached');
  }
  {
    const env = makeEnv({ offline: true });
    const res = await drive(env, ORIGIN + '/');
    ok('offline with NO shell shows the "No signal" page',
      res && res.status === 503 && /No signal/.test(res.body), res ? res.status : 'none');
    ok('…and that page still says nothing was lost',
      res && /Nothing you entered has been lost/.test(res.body));
  }
  {
    const env = makeEnv({ offline: true,
      cached: { '/': new (makeEnv({}).Res)('SHELL', { __tag: 'cached' }) } });
    const res = await drive(env, ORIGIN + '/popup.html');
    ok('another page offline falls back to the shell, as it did before',
      res && res.__tag === 'cached', res ? res.__tag : 'none');
  }

  console.log('\n── what must NOT have changed ──');
  {
    const env = makeEnv({ netRes: R => new R('DATA', { __tag: 'net' }) });
    const res = await drive(env, 'https://yipslubcptjoarblzbpl.supabase.co/rest/v1/projects', 'cors');
    ok('Supabase is never intercepted', res === null);
  }
  {
    const env = makeEnv({ netRes: R => new R('FN', { __tag: 'net' }) });
    const res = await drive(env, ORIGIN + '/api/supplement', 'cors');
    ok('/api/* is never intercepted', res === null);
  }
  {
    const env = makeEnv({
      cached: { [ORIGIN + '/icon-192.png']: new (makeEnv({}).Res)('OLD-ICON', { __tag: 'cached' }) },
      netRes: R => new R('NEW-ICON', { __tag: 'network' })
    });
    const res = await drive(env, ORIGIN + '/icon-192.png', 'no-cors');
    ok('same-origin assets are still stale-while-revalidate',
      res && res.__tag === 'cached' && env.log.fetched.length === 1,
      (res ? res.__tag : 'none') + ', fetched ' + env.log.fetched.length);
  }
  {
    const env = makeEnv({
      cached: { 'https://cdn.jsdelivr.net/npm/chart.js@4.4.3': new (makeEnv({}).Res)('PINNED', { type: 'cors', __tag: 'cached' }) },
      netRes: R => new R('NEWER', { type: 'cors', __tag: 'network' })
    });
    const res = await drive(env, 'https://cdn.jsdelivr.net/npm/chart.js@4.4.3', 'no-cors');
    ok('CDN libraries are still frozen — the no-lockfile decision holds',
      res && res.__tag === 'cached' && env.log.fetched.length === 0,
      (res ? res.__tag : 'none') + ', fetched ' + env.log.fetched.length);
  }
  ok('CACHE was not bumped — there is nothing poisoned to evict',
    /var CACHE = 'cardinal-shell-v1';/.test(SW));

  console.log('\n── the page side: one tap, never automatic ──');
  ok('index.html listens for the worker\'s message',
    /addEventListener\('message'[\s\S]{0,400}cr-shell-updated/.test(IDX));
  ok('…and offers a Reload control', /crUpdateBar/.test(IDX) && /'Reload'/.test(IDX));
  {
    /* The whole listener, BRACE-MATCHED out of the file — assert on IT, not on
       the 3.8 MB document and not on a fixed-width window either. The first
       version sliced a + 3000 chars and went red the moment the block grew by
       four fixes: a fixed window over a block that grows is the same trap
       CLAUDE.md records against measure_counts.py. */
    const a0 = IDX.indexOf("navigator.serviceWorker.addEventListener('message'");
    let blk = '';
    if (a0 > 0) {
      let d = 0, i = IDX.indexOf('{', a0), start = i;
      for (; i < IDX.length; i++) {
        const c = IDX[i];
        if (c === '{') d++;
        else if (c === '}') { d--; if (d === 0) { i++; break; } }
      }
      blk = IDX.slice(a0, i);
      void start;
    }
    ok('the listener block was located and brace-matched', blk.length > 400,
      blk.length + ' chars');
    ok('the reload happens on a CLICK, not on a timer',
      /onclick\s*=\s*function\(\)\{\s*location\.reload\(\)/.test(blk));
    ok('nothing reloads the page by itself',
      !/setTimeout[\s\S]{0,120}location\.reload/.test(blk) &&
      !/setInterval[\s\S]{0,120}location\.reload/.test(blk));
    ok('the bar can be dismissed', /bar\.remove\(\)/.test(blk));
    ok('only one bar at a time — it does not stack', /if\(shown\) return;/.test(blk));
    ok('both controls are at least 44px — this is used on a phone',
      /min-height:44px/.test(blk) && /width:44px;height:44px/.test(blk));
    ok('it carries its own styling, so it cannot repeat build 676',
      /style\.cssText/.test(blk) && !/class=/.test(blk));
    ok('it sits ABOVE the installed app\'s bottom nav, not on top of it',
      /pwaNav/.test(blk) && /lift/.test(blk),
      'must measure #pwaNav and offset by it');
    ok('…and below every dialog — an update notice must not cover a modal',
      /z-index:170/.test(blk) && !/2147483000/.test(blk));
    ok('dismissing hides THIS notice, not every future one',
      /shown = false/.test(blk));
    ok('it never appears on the client-facing Vision door',
      /vision=1/.test(blk) && /showroom\./.test(blk));
  }

  console.log('\nRESULT: ' + (fail ? 'FAIL' : 'PASS') + '  (' + pass + ' passed, ' + fail + ' failed)');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('HARNESS CRASHED:', e); process.exit(1); });
