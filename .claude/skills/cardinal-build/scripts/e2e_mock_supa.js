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
  /* Who is signed in. Defaults to theo@ (admin) so every gate written against
     this mock behaves exactly as before. A setup file that runs BEFORE this
     one may set window.__AS__ = {email, name} to sign in as somebody else —
     which is the only way to see what a production or sales user sees, since
     half this app's surfaces are gated on role. Scottie reported text he
     could not read; an admin-only sweep cannot answer that. */
  var AS = window.__AS__ || null;
  var ADMIN_EMAIL = (AS && AS.email) || 'theo@cardinalrenovations.net';
  var USER = {
    id: '00000000-0000-4000-8000-0000000000aa',
    email: ADMIN_EMAIL,
    role: 'authenticated',
    aud: 'authenticated',
    user_metadata: { full_name: (AS && AS.name) || 'Theo Dorion' },
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
  /* 732: the mock enforced NO constraints, and that is how a broken value went
     green. Build 722 wrote contracts.status = 'voided'; the real table's CHECK
     permits only ('draft','sent','signed','void','change_ordered'), so every Void
     was refused by Postgres — while gate_722 asserted the value I had assumed and
     passed. A mock with no constraints does not model the database, it models the
     author's beliefs.

     These mirror the LIVE schema of project yipslubcptjoarblzbpl, read with:
       select conname, pg_get_constraintdef(oid) from pg_constraint
        where conrelid='public.contracts'::regclass and contype='c';
     Keep them in step with the real table, or delete the entry rather than let it
     drift — a stale constraint here is worse than none. */
  var CHECKS = {
    contracts: {
      status:   ['draft', 'sent', 'signed', 'void', 'change_ordered'],
      template: ['roofing', 'siding', 'windows']
    },
    projects: {
      stage: ['Lead', 'Prospect', 'OnHold', 'Approved', 'Scheduled', 'Completed', 'Invoiced', 'Closed', 'Lost']
    },
    studio_tray: { bucket: ['showcase', 'workmanship', 'colors'] }
  };
  /* 775: the mock applied NO COLUMN DEFAULTS, and that made it lie about a real
     screen. Publishing an estimate goes save -> loadForProject() -> publish(),
     and loadForProject filters `.eq('archived', false)`. The mock stored the new
     row without `archived` at all, so the row it had just written was invisible
     to the very next read: the harness reported "Could not find the saved
     estimate to publish" and no document — a defect the app does not have.

     These mirror the LIVE defaults of project yipslubcptjoarblzbpl, read with:
       select column_name, column_default from information_schema.columns
        where table_schema='public' and table_name='estimates';
     Same rule as CHECKS above: keep them in step with the real table, or delete
     the entry rather than let it drift. A default that only exists in the
     database is a default the harness has to model, or every read-after-write
     it performs is testing fiction. */
  var SEQ = { estimate_number: 0 };
  var DEFAULTS = {
    estimates: {
      archived: false,
      status: 'draft',
      estimate_number: function () {
        SEQ.estimate_number += 1;
        return 'EST-2026-' + String(SEQ.estimate_number).padStart(4, '0');
      }
    },
    punch_items: { status: 'open', steps: [] },
    projects: { stage: 'Lead' },
    contracts: { status: 'draft' },
    studio_tray: { bucket: 'showcase' }
  };
  function applyDefaults(table, row) {
    var d = DEFAULTS[table];
    if (!d) return row;
    for (var col in d) {
      if (row[col] === undefined || row[col] === null) {
        row[col] = (typeof d[col] === 'function') ? d[col]() : d[col];
      }
    }
    return row;
  }
  function checkViolation(table, payload) {
    var rules = CHECKS[table];
    if (!rules || !payload) return null;
    var rows = Array.isArray(payload) ? payload : [payload];
    for (var i = 0; i < rows.length; i++) {
      for (var col in rules) {
        if (!Object.prototype.hasOwnProperty.call(rows[i], col)) continue;
        var v = rows[i][col];
        if (v == null) continue;
        if (rules[col].indexOf(v) === -1) {
          return { message: 'new row for relation "' + table + '" violates check constraint "' +
                            table + '_' + col + '_check"',
                   details: 'Failing row contains ' + col + ' = ' + JSON.stringify(v) +
                            '; permitted: ' + rules[col].join(', '),
                   code: '23514' };
        }
      }
    }
    return null;
  }
  /* 734: the mock had no TRIGGERS either, and one of them is load-bearing.
     commission_on_collection = AFTER INSERT ON collections EXECUTE make_commission()
     is why the app cannot know a commission was created at the moment it inserts a
     check — the row appears server-side, out of band. A harness that does not model
     that cannot test anything downstream of it, so this reproduces the one trigger
     the UI actually observes. Rate and rep mirror the SQL function.
     window.__MOCK_NO_TRIGGERS__ opts out. */
  var COMMISSION_RATE = 0.10;
  function fireTriggers(table, op, rows) {
    try { if (typeof window !== 'undefined' && window.__MOCK_NO_TRIGGERS__) return; } catch (e) { return; }
    if (table !== 'collections' || op !== 'insert') return;
    rows.forEach(function (row) {
      var projects = (STORE.projects || []);
      var pr = projects.filter(function (p) { return String(p.id) === String(row.project_id); })[0];
      var rep = pr && pr.sales_rep;
      if (!rep) return;                       /* no rep on the job — no commission, not an error */
      tbl('commissions').push({
        id: uuid(), project_id: row.project_id, rep_email: rep,
        amount: Math.round((Number(row.amount) || 0) * COMMISSION_RATE * 100) / 100,
        basis: 'collection', status: 'unpaid', rate_pct: COMMISSION_RATE * 100,
        collection_id: row.id, project_name: pr && pr.name,
        created_at: new Date().toISOString(), created_by: null
      });
    });
  }
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
        var _table = this.table;   /* map() gets no thisArg — `this` is undefined under 'use strict' */
        var inserted = rows.map(function (r) {
          var row = Object.assign({}, r);
          if (row.id === undefined) row.id = uuid();
          if (row.created_at === undefined) row.created_at = new Date().toISOString();
          applyDefaults(_table, row);   /* 775: model the table's DEFAULTs, not just its columns */
          t.push(row); return row;
        });
        rec(this.table, this._op, this._payload);
        fireTriggers(this.table, 'insert', inserted);   /* 734: AFTER INSERT, like the real one */
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
        /* 732: refuse a write the real table's CHECK would refuse, and refuse it
           the way PostgREST does — an error object, not a throw — so a gate sees
           what the app sees. Opt out for one call with __MOCK_NO_CHECKS__ if you
           are deliberately testing the rejection path itself. */
        if (self._op === 'insert' || self._op === 'update' || self._op === 'upsert') {
          var noChecks = (typeof window !== 'undefined') && window.__MOCK_NO_CHECKS__;
          if (!noChecks) {
            var v = checkViolation(self.table, self._payload);
            if (v) { rec(self.table, self._op + ':REFUSED', self._payload, { violation: v }); return { data: null, error: v }; }
          }
        }
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
