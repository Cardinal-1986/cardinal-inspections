/* Injected BEFORE the app's scripts via a route-fulfilled replacement of the
   supabase-js CDN. Provides window.supabase.createClient returning a mock that:
   - reports an authenticated ADMIN session (theo@) so the app's own client-side
     role gates render the admin UI exactly as in production — nothing widened;
   - backs .from(table) with an in-memory store seeded with real-shape rows;
   - RECORDS every insert/update/delete/upsert to window.__WRITES__;
   - returns honestly-empty reads for unseeded tables.
   It transports and records; it does not reimplement Postgres semantics beyond
   the filtering the journey needs. The report states plainly what this proves
   (front-end reachability + the exact intended write) vs. what only the real
   backend proves (RLS acceptance, trigger effects — validated separately). */
(function () {
  'use strict';
  var ADMIN_EMAIL = 'theo@cardinalrenovations.net';
  var USER = {
    id: '00000000-0000-4000-8000-0000000000aa',
    email: ADMIN_EMAIL,
    role: 'authenticated',
    aud: 'authenticated',
    user_metadata: { full_name: 'Theo Dorion' },
    app_metadata: { provider: 'email' }
  };
  var SESSION = {
    access_token: 'mock-access-token',
    refresh_token: 'mock-refresh',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: 4102444800,
    user: USER
  };

  window.__WRITES__ = [];
  window.__READS__ = [];
  function rec(table, op, payload, extra) {
    window.__WRITES__.push(Object.assign({ table: table, op: op, payload: payload, ts: Date.now() }, extra || {}));
  }

  // ---- in-memory store, seeded from real row shapes (values obviously test) ----
  var STORE = (window.__SEED__ || {});
  function tbl(name) { if (!STORE[name]) STORE[name] = []; return STORE[name]; }

  function uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = (Date.now() + Math.floor(Math.random() * 1e9)) % 16;
      var v = c === 'x' ? r : (r & 0x3 | 0x8); return v.toString(16);
    });
  }

  function applyFilters(rows, filters) {
    return rows.filter(function (row) {
      return filters.every(function (f) {
        var v = row[f.col];
        if (f.type === 'eq') return v === f.val || String(v) === String(f.val);
        if (f.type === 'neq') return String(v) !== String(f.val);
        if (f.type === 'is') return f.val === null ? (v === null || v === undefined) : v === f.val;
        if (f.type === 'in') return f.val.indexOf(v) !== -1;
        if (f.type === 'gte') return v >= f.val;
        if (f.type === 'lte') return v <= f.val;
        if (f.type === 'gt') return v > f.val;
        if (f.type === 'lt') return v < f.val;
        return true;
      });
    });
  }

  function Query(table) {
    this.table = table;
    this._filters = [];
    this._op = 'select';
    this._payload = null;
    this._single = false;
    this._maybe = false;
    this._count = null;
    this._head = false;
    this._selectCols = '*';
    this._order = null;
    this._limitN = null;
  }
  var FILTERS = ['eq', 'neq', 'is', 'in', 'gte', 'lte', 'gt', 'lt'];
  FILTERS.forEach(function (t) {
    Query.prototype[t] = function (col, val) { this._filters.push({ type: t, col: col, val: val }); return this; };
  });
  ['like', 'ilike', 'contains', 'containedBy', 'or', 'filter', 'match', 'not', 'overlaps', 'textSearch']
    .forEach(function (m) { Query.prototype[m] = function () { return this; }; });
  Query.prototype.select = function (cols, opts) {
    this._selectCols = cols || '*';
    if (opts && opts.count) this._count = opts.count;
    if (opts && opts.head) this._head = true;
    return this;
  };
  Query.prototype.order = function (col, o) { this._order = { col: col, asc: !(o && o.ascending === false) }; return this; };
  Query.prototype.limit = function (n) { this._limitN = n; return this; };
  Query.prototype.range = function () { return this; };
  Query.prototype.single = function () { this._single = true; return this; };
  Query.prototype.maybeSingle = function () { this._maybe = true; return this; };
  Query.prototype.insert = function (payload) { this._op = 'insert'; this._payload = payload; return this; };
  Query.prototype.update = function (payload) { this._op = 'update'; this._payload = payload; return this; };
  Query.prototype.upsert = function (payload, opts) { this._op = 'upsert'; this._payload = payload; this._upsertOpts = opts; return this; };
  Query.prototype.delete = function () { this._op = 'delete'; return this; };

  Query.prototype._run = function () {
    var t = tbl(this.table);
    var res = { data: null, error: null, count: null, status: 200, statusText: 'OK' };
    try {
      if (this._op === 'insert' || this._op === 'upsert') {
        var rows = Array.isArray(this._payload) ? this._payload : [this._payload];
        var inserted = rows.map(function (r) {
          var row = Object.assign({}, r);
          if (row.id === undefined) row.id = uuid();
          if (row.created_at === undefined) row.created_at = new Date().toISOString();
          t.push(row); return row;
        });
        rec(this.table, this._op, this._payload);
        res.data = this._single ? inserted[0] : inserted;
      } else if (this._op === 'update') {
        var match = applyFilters(t, this._filters);
        match.forEach(function (row) { Object.assign(row, this._payload); }, this);
        rec(this.table, 'update', this._payload, { filters: this._filters });
        res.data = this._single ? (match[0] || null) : match.map(function (r) { return r; });
      } else if (this._op === 'delete') {
        var keep = [], removed = [];
        var flt = this._filters;
        t.forEach(function (row) { (applyFilters([row], flt).length ? removed : keep).push(row); });
        STORE[this.table] = keep;
        rec(this.table, 'delete', null, { filters: this._filters });
        res.data = this._single ? (removed[0] || null) : removed;
      } else {
        // select
        var out = applyFilters(t, this._filters);
        if (this._order) {
          var o = this._order;
          out = out.slice().sort(function (a, b) {
            var av = a[o.col], bv = b[o.col];
            if (av === bv) return 0;
            return (av > bv ? 1 : -1) * (o.asc ? 1 : -1);
          });
        }
        if (this._limitN != null) out = out.slice(0, this._limitN);
        res.count = (this._count ? out.length : null);
        window.__READS__.push({ table: this.table, n: out.length });
        if (this._head) { res.data = null; }
        else if (this._single) { res.data = out[0] || null; if (!out.length) { res.error = { code: 'PGRST116', message: 'no rows' }; } }
        else if (this._maybe) { res.data = out[0] || null; }
        else res.data = out;
      }
    } catch (e) { res.error = { message: String(e && e.message || e) }; }
    return res;
  };
  /* Test knobs (harness-side only; the app never sets these):
       window.__MOCK_DELAY__ = ms    — hold every query open, so a double-tap
                                       can actually overlap the first in flight
       window.__MOCK_FAIL__  = table — make that table's next write return an
                                       error, to prove a button unlocks again
     The work happens when the promise RESOLVES, so with a delay two overlapping
     taps really do produce two writes unless something stops the second. */
  Query.prototype.then = function (resolve, reject) {
    var self = this;
    var run = function () {
      try {
        var fail = (typeof window !== 'undefined') && window.__MOCK_FAIL__;
        if (fail && fail === self.table && self._op !== 'select')
          return { data: null, error: { message: 'mock failure on ' + fail } };
        return self._run();
      } catch (e) { return { data: null, error: { message: String(e) } }; }
    };
    var d = (typeof window !== 'undefined' && Number(window.__MOCK_DELAY__)) || 0;
    var p = d > 0 ? new Promise(function (r) { setTimeout(r, d); }).then(run)
                  : Promise.resolve(run());
    return p.then(resolve, reject);
  };
  Query.prototype.catch = function (f) { return Promise.resolve(this._run()).catch(f); };
  Query.prototype.finally = function (f) { return Promise.resolve(this._run()).finally(f); };

  function StorageBucket(name) { this.name = name; }
  StorageBucket.prototype.upload = function (path) { rec('storage:' + this.name, 'upload', { path: path }); return Promise.resolve({ data: { path: path }, error: null }); };
  StorageBucket.prototype.remove = function (paths) { rec('storage:' + this.name, 'remove', { paths: paths }); return Promise.resolve({ data: [], error: null }); };
  StorageBucket.prototype.list = function () { return Promise.resolve({ data: [], error: null }); };
  StorageBucket.prototype.createSignedUrl = function (p) { return Promise.resolve({ data: { signedUrl: 'blob:mock/' + p }, error: null }); };
  StorageBucket.prototype.createSignedUrls = function (ps) { return Promise.resolve({ data: (ps || []).map(function (p) { return { path: p, signedUrl: 'blob:mock/' + p, error: null }; }), error: null }); };
  StorageBucket.prototype.getPublicUrl = function (p) { return { data: { publicUrl: 'blob:mock/' + p } }; };
  StorageBucket.prototype.download = function () { return Promise.resolve({ data: new Blob([]), error: null }); };

  var authListeners = [];
  /* 729 test knob: window.__NO_SESSION__ makes this a SIGNED-OUT boot, so a gate
     can drive the showLogin() half of the app. Default is unchanged (signed in
     as admin), so every earlier gate reads exactly as it did. */
  function _sess() { try { if (typeof window !== 'undefined' && window.__NO_SESSION__) return null; } catch (e) {} return SESSION; }
  /* 729 test knob: window.__HANG_AUTH__ makes getSession() never settle, which is
     the one boot outcome that reaches NEITHER showMain() nor showLogin() — the
     only way to exercise a backstop that lifts a boot overlay on its own. */
  function _hang() { try { return typeof window !== 'undefined' && !!window.__HANG_AUTH__; } catch (e) { return false; } }
  var client = {
    auth: {
      getSession: function () { if (_hang()) return new Promise(function () {}); return Promise.resolve({ data: { session: _sess() }, error: null }); },
      getUser: function () { return Promise.resolve({ data: { user: _sess() ? USER : null }, error: null }); },
      onAuthStateChange: function (cb) {
        authListeners.push(cb);
        setTimeout(function () { try { cb('INITIAL_SESSION', _sess()); } catch (e) {} }, 0);
        return { data: { subscription: { unsubscribe: function () {} } } };
      },
      signInWithPassword: function (creds) {
        rec('auth', 'signInWithPassword', { email: creds && creds.email });
        return Promise.resolve({ data: { user: USER, session: SESSION }, error: null });
      },
      signOut: function () { return Promise.resolve({ error: null }); },
      updateUser: function (attrs) { if (attrs && attrs.data && attrs.data.full_name) USER.user_metadata.full_name = attrs.data.full_name; return Promise.resolve({ data: { user: USER }, error: null }); },
      resetPasswordForEmail: function () { return Promise.resolve({ data: {}, error: null }); },
      refreshSession: function () { return Promise.resolve({ data: { session: SESSION }, error: null }); }
    },
    from: function (table) { return new Query(table); },
    rpc: function (fn, args) { rec('rpc:' + fn, 'rpc', args); var q = new Query('rpc:' + fn); q._op = 'select'; return q; },
    storage: { from: function (b) { return new StorageBucket(b); } },
    channel: function () { var ch = { on: function () { return ch; }, subscribe: function (cb) { if (cb) try { cb('SUBSCRIBED'); } catch (e) {} return ch; }, unsubscribe: function () { return Promise.resolve('ok'); } }; return ch; },
    removeChannel: function () { return Promise.resolve('ok'); },
    getChannels: function () { return []; }
  };

  window.supabase = { createClient: function () { return client; } };
})();
