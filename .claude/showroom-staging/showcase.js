
/* Showcase — v2026-08-02 · build 574
   Curated before/after transformations, opened from the Sales Floor.

   PERMISSIONS, settled by Theo: admins add/edit/remove; sales and production
   view. The UI gate below is convenience — the real enforcement is the RLS in
   showcase_pairs.sql, because a hidden button is not a permission.

   PHOTOS: bytes are COPIED into Cardinal's own private `photos` bucket under
   showcase/, never linked from CompanyCam's CDN. A curated pair has to outlive
   the vendor. Paths are stored; signedPhotoMap() signs them for display only —
   an expiring URL is never written to a row. */
(function(){
'use strict';

var TRADES = ['roof','siding','windows','andersen','gutters','general'];
var TRADE_LABEL = { roof:'Roofing', siding:'Siding', windows:'Windows',
                    andersen:'Andersen', gutters:'Gutters', general:'Repair' };

var el = null, formEl = null;
var pairs = [], cur = 0, signed = {}, loaded = false, busy = false;
var tab = 'showcase';
/* 590: Showroom mode. Set only by open({showroom:true}); cleared by close()
   and by any ordinary open() — including the one navRestore calls — so the
   flag cannot leak into a normal session. */
var showroom = false;
var work = [], workLoaded = false;

function esc(s){
  return String(s == null ? '' : s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function sb(){ return window.supa || null; }
/* THE read-only guarantee for Showroom mode (590), and it is deliberately here
   rather than at the 14 call sites: every add / publish / remove / share /
   mark-damage / save control across all three tabs is gated on this one
   function, so one line removes all of them at once and a harness can prove
   the count is zero. Fourteen conditionals would be fourteen chances to miss
   one. Theo: "with the showroom there is no editing."
   The real enforcement is still the RLS, as the module banner says — a hidden
   button is not a permission. This is the UI half of it. */
function amAdmin(){
  if(showroom) return false;
  try{ if(window.is_admin && window.is_admin()) return true; }catch(_){}
  return false;
}
/* Privacy mode strips the address entirely rather than hiding it with CSS —
   the homeowner is holding the tablet and can select hidden text. */
function label(p){
  var priv = el && el.classList.contains('priv');
  if(priv) return 'Project ' + shortId(p) + (p.city ? ' · ' + p.city : '');
  return p.address || p.title || ('Project ' + shortId(p));
}
function shortId(p){ return 'C-' + String(p.id || '').replace(/-/g,'').slice(0,4).toUpperCase(); }

function ensure(){
  if(el) return el;
  el = document.getElementById('cr-show');
  if(!el){
    el = document.createElement('div');
    el.id = 'cr-show';
    document.body.appendChild(el);
  }
  return el;
}

/* ── data ──────────────────────────────────────────────────────────────── */
async function load(){
  var cl = sb();
  if(!cl) return;
  var q = cl.from('showcase_pairs').select('*').order('sort_order', { ascending:true })
           .order('created_at', { ascending:false });
  var r = await q;
  if(r.error){ pairs = []; loaded = true; return; }
  pairs = r.data || [];
  loaded = true;
  await sign();
}
async function loadWork(){
  var cl = sb();
  if(!cl) return;
  var r = await cl.from('workmanship_pairs').select('*')
                  .order('sort_order', { ascending:true })
                  .order('created_at', { ascending:false });
  work = (r && !r.error && r.data) ? r.data : [];
  workLoaded = true;
  await sign();
}

/* Sign for DISPLAY ONLY. The returned map is never written back onto a row —
   saveEstimate's lesson: an expiring URL in the database corrupts it forever. */
async function sign(){
  var paths = [];
  var add = function(x){ if(x){ paths.push(x); paths.push(dispPath(x)); } };
  work.forEach(function(w){ [w.bad_path, w.good_path].forEach(add); });
  pairs.forEach(function(p){ [p.before_path, p.build_path, p.after_path].forEach(add); });
  if(!paths.length) return;
  if(typeof window.signedPhotoMap !== 'function') return;
  try{ signed = await window.signedPhotoMap(paths, 3600) || {}; }catch(_){ signed = {}; }
}
function src(path){ return path ? (signed[path] || '') : ''; }

/* One stored path, two files on disk. The display copy is derived rather than
   stored, so nothing in the schema changed and pairs made before build 577 —
   which have no -d file — simply fall back to the full one. */
var FULL = { max: 3840, q: 0.92 };   // the slider, and pinching in
var DISP = { max: 1400, q: 0.82 }
/* 633: a TILE-sized rendition. DISP is sized for the Showcase compare card
   (612 CSS px, so 1224 device px at 2x). The Colors grid tile is much smaller —
   MEASURED in Chromium at Theo's 1194px iPad width, the grid resolves to four
   269.5px columns, so ~540 device px at 2x — and it was being handed DISP:
   4.8x the pixels it can show, at a measured 663 kB average. One rendition
   cannot serve two surfaces that differ by that much.
   640 rather than 800 is a deliberate trade. It gives the iPad in the report
   2.4 device pixels per CSS pixel, and a phone — one column, ~358 CSS px at 3x
   — about 1.8, which is softer than native but far better than the weight of
   the alternative. Tapping a tile still opens the full-resolution original,
   which is where sharpness actually matters.
   Declared here beside its siblings so the three stay in one place. */
var THUMB = { max: 640, q: 0.80 };   // the card grid

function dispPath(path){
  if(!path) return '';
  return path.replace(/\.jpg$/, '-d.jpg');
}
function srcD(path){
  if(!path) return '';
  return signed[dispPath(path)] || signed[path] || '';
}

/* Upload both renditions for one photograph and return the FULL path, which is
   what the row stores. A failed display copy is not fatal — srcD falls back —
   but a failed full copy is. */
async function putPhoto(cl, file, path){
  var full = await shrink(file, FULL.max, FULL.q);
  var up = await cl.storage.from('photos').upload(path, full, { contentType:'image/jpeg', upsert:true });
  if(up && up.error) throw new Error(up.error.message || ('upload failed: ' + path));
  try{
    var small = await shrink(file, DISP.max, DISP.q);
    await cl.storage.from('photos').upload(dispPath(path), small,
      { contentType:'image/jpeg', upsert:true });
  }catch(_){ /* cards fall back to the full image */ }
  return path;
}

/* ── render ────────────────────────────────────────────────────────────── */
function render(){
  ensure();
  el.innerHTML =
    (showroom ? renderExit() : '') +
    '<div class="cr-sh-wrap">' +
      '<div class="cr-sh-top">' +
        /* 590: no back arrow in the showroom — the hold-✕ is the way out.
           Not rendered rather than hidden, the same way renderAdmin() returns
           '' when the controls aren't yours. One mechanism, not two. */
        (showroom ? '' :
          '<button class="cr-sh-back" data-act="back" type="button">←</button>') +
        '<div class="cr-sh-ttl">' +
          '<h1>Show<span>case</span></h1>' +
          '<p>Cardinal Roofing · Before &amp; After</p>' +
        '</div>' +
        '<button class="cr-sh-priv" data-act="priv" type="button" role="switch" aria-checked="false">' +
          '<span class="d"></span><span class="n">Privacy off</span><span class="y">Privacy on</span>' +
        '</button>' +
      '</div>' +
      renderTabs() +
      '<div data-slot="body">' + renderBody() + '</div>' +
    '</div>';
  wire();
}

/* 590: the way out of the showroom. Fixed, and emitted OUTSIDE .cr-sh-wrap so
   it stays put while the room scrolls. */
function renderExit(){
  return '<button class="cr-sh-exit" data-act="exitroom" type="button" ' +
           'aria-label="Hold to leave the showroom">' +
           '<span class="ring"></span><span class="x">\u2715</span></button>' +
         '<div class="cr-sh-hold">hold to exit</div>';
}

/* HOLD_MS is the contract: the ring is painted from the same clock that
   decides, so what you see and what happens cannot disagree. A tap does
   nothing at all — that is the feature, not a side effect.
   Deliberately NO setPointerCapture: capture would keep pointerleave from
   firing, and sliding a thumb off the button has to cancel the hold. This is
   the opposite call from the slider (578/589), for the opposite reason. */
var HOLD_MS = 900;
var holdRaf = 0;

function wireExit(){
  var b = el.querySelector('[data-act="exitroom"]');
  if(!b) return;
  var ring = b.querySelector('.ring');
  var t0 = 0;
  function paintHold(deg){ if(ring) ring.style.setProperty('--sh-hold', deg + 'deg'); }
  function stop(){
    if(holdRaf){ cancelAnimationFrame(holdRaf); holdRaf = 0; }
    paintHold(0);
  }
  function tick(now){
    /* Re-check the node every frame: the render that owns this button can be
       replaced under a running hold (a tab switch, a repaint), and a rAF
       holding a detached node would paint into nothing forever — 567/569's
       class, and the same guard 588's ccRun uses. */
    if(!b.isConnected){ stop(); return; }
    var p = Math.min(1, (now - t0) / HOLD_MS);
    paintHold(p * 360);
    if(p < 1){ holdRaf = requestAnimationFrame(tick); return; }
    stop();
    close(true);
  }
  b.addEventListener('pointerdown', function(e){
    e.preventDefault();          /* so a tap never becomes a click */
    e.stopPropagation();
    stop();
    t0 = (window.performance && performance.now) ? performance.now() : Date.now();
    holdRaf = requestAnimationFrame(tick);
  });
  ['pointerup','pointercancel','pointerleave'].forEach(function(ev){
    b.addEventListener(ev, stop);
  });
}

/* Inspections is a LINK, not a tab. The app already has a reports list —
   openReportsView(), defined exactly once — and a second one built in here
   would be the duplicate-feature class this project keeps paying for.
   590: it is a door OUT of the showroom, so the showroom does not render it. */
function renderTabs(){
  return '<div class="cr-sh-tabs">' +
    '<button data-tab="showcase"' + (tab === 'showcase' ? ' class="on"' : '') +
      ' type="button">Showcase</button>' +
    '<button data-tab="work"' + (tab === 'work' ? ' class="on"' : '') +
      ' type="button">Hall of Fame</button>' +
    '<button data-tab="walk"' + (tab === 'walk' ? ' class="on"' : '') +
      ' type="button">The Walk</button>' +
    (showroom ? '' :
      '<button data-act="reports" type="button" class="out">Inspections \u2197</button>') +
  '</div>';
}

function renderBody(){
  if(tab === 'walk') return renderWalkTab();
  if(tab === 'work') return renderWork();
  if(!loaded) return '<div class="cr-sh-empty">Loading…</div>';
  if(!pairs.length) return renderEmpty();
  return renderShow() + renderCards() + renderAdmin();
}

function renderWork(){
  if(!workLoaded) return '<div class="cr-sh-empty">Loading…</div>';
  if(!work.length){
    return '<div class="cr-sh-empty"><b>No comparisons yet.</b>' +
      (amAdmin()
        ? 'Add a bad install beside one of ours. Two photographs explain in five ' +
          'seconds what a paragraph cannot.'
        : 'Theo hasn\u2019t added any yet.') +
      '</div>' + renderWorkAdmin();
  }
  return '<div class="cr-sh-rule">' + work.length + ' comparisons</div>' +
    work.map(function(w, i){
      return '<div class="cr-sh-wk">' +
        '<div class="cr-sh-wk-h">' + esc(w.title) +
          (w.trade ? ' <span class="cr-sh-chip">' + esc(TRADE_LABEL[w.trade] || w.trade) + '</span>' : '') +
          (amAdmin() ? '<button class="cr-sh-x" data-wdel="' + esc(w.id) + '" type="button" ' +
                       'aria-label="Remove">\u2715</button>' : '') +
        '</div>' +
        (w.lesson ? '<p class="cr-sh-wk-l">' + esc(w.lesson) + '</p>' : '') +
        '<div class="cr-sh-wk-g">' +
          side('bad', 'Industry bad install', w.bad_path, w.bad_caption, i) +
          side('good', 'Cardinal standard', w.good_path, w.good_caption, i) +
        '</div>' +
      '</div>';
    }).join('') + renderWorkAdmin();
}

function side(kind, head, path, caption, i){
  return '<div class="cr-sh-side ' + kind + '">' +
    '<div class="h"><span class="sq"></span>' + head + '</div>' +
    '<img alt="' + esc(head) + '" loading="lazy" data-lens="' + esc(path) + '" data-cap="' + esc(head) + '" src="' + esc(srcD(path)) + '">' +
    (caption ? '<p>' + esc(caption) + '</p>' : '') +
  '</div>';
}

function renderWorkAdmin(){
  if(!amAdmin()) return '';
  return '<div class="cr-sh-admin">' +
    '<button class="cr-sh-btn" data-act="waddc" type="button">Upload photos</button>' +
    '<button class="cr-sh-btn ghost" data-act="waddjob" type="button">From a job</button>' +
  '</div>';
}

function renderEmpty(){
  return '<div class="cr-sh-empty"><b>Nothing in the showcase yet.</b>' +
    (amAdmin()
      ? 'Add a pair and it appears here. <b>From a job</b> is the quick way — pick a job you already have and tap its before and after.'
      : 'Theo hasn’t added any transformations yet.') +
    '</div>' + renderAdmin();
}

function renderShow(){
  var p = pairs[cur]; if(!p) return '';
  var bits = [];
  if(p.material) bits.push(esc(p.material));
  if(p.completed_on) bits.push(esc(fmtDate(p.completed_on)));
  return '<div class="cr-sh-rule">Transformation</div>' +
    '<div class="cr-sh-show">' +
      '<div class="cr-sh-head">' +
        '<h2>' + esc(label(p)) + '</h2>' +
        (p.score != null ? '<span class="cr-sh-score">★ ' + esc(p.score) + '</span>' : '') +
        releaseBadge(p) +
        '<div class="cr-sh-step">' +
          '<button data-act="prev" type="button" aria-label="Previous">◄</button>' +
          '<span class="p">' + (cur + 1) + ' / ' + pairs.length + '</span>' +
          '<button data-act="next" type="button" aria-label="Next">►</button>' +
          '<button class="cr-sh-play" data-act="ccplay" type="button" aria-label="Let the showcase run itself" title="Let it run">\u25B6</button>' +
        '</div>' +
        (bits.length ? '<span class="s">' + bits.join(' · ') + '</span>' : '') +
      '</div>' +
      '<div class="cr-sh-cmp" data-cmp style="--sh-split:52%">' +
        '<button class="cr-sh-exp" data-act="cmpexp" type="button" aria-label="Open full screen">\u2922</button>' +
        '<img data-role="after" alt="After" decoding="async" data-path="' + esc(p.after_path) + '" src="' + esc(srcD(p.after_path)) + '">' +
        '<img class="bf" data-role="before" alt="Before" decoding="async" src="' + esc(srcD(p.before_path)) + '">' +
        '<div class="cr-sh-hd" data-hd role="slider" tabindex="0" aria-label="Before and after divider"' +
             ' aria-valuemin="0" aria-valuemax="100" aria-valuenow="52"><span class="cr-sh-grip">◄ ►</span></div>' +
        '<span class="cr-sh-tag b">Before</span>' +
        '<span class="cr-sh-tag a" data-aftertag>After</span>' +
      '</div>' +
      '<div class="cr-sh-dock">' +
        '<button data-ph="after" class="on" type="button">Final</button>' +
        '<button data-ph="build" type="button"' + (p.build_path ? '' : ' disabled') + '>During the build</button>' +
      '</div>' +
    '</div>';
}

function renderCards(){
  if(pairs.length < 2) return '';
  return '<div class="cr-sh-rule">' + pairs.length + ' transformations</div>' +
    '<div class="cr-sh-cards">' +
      pairs.map(function(p, i){
        var chips = '';
        if(p.score != null) chips += '<span class="cr-sh-score">★ ' + esc(p.score) + '</span>';
        if(p.trade) chips += '<span class="cr-sh-chip">' + esc(TRADE_LABEL[p.trade] || p.trade) + '</span>';
        if(p.material) chips += '<span class="cr-sh-chip">' + esc(p.material) + '</span>';
        return '<button class="cr-sh-card' + (i === cur ? ' on' : '') + '" data-pick="' + i + '" type="button">' +
          '<img alt="" loading="lazy" src="' + esc(srcD(p.after_path)) + '">' +
          '<div class="m"><div class="a">' + esc(label(p)) + '</div>' +
          '<div class="c">' + chips + '</div></div></button>';
      }).join('') +
    '</div>';
}

function renderAdmin(){
  if(!amAdmin()) return '';
  var p = pairs[cur];
  return '<div class="cr-sh-admin">' +
    '<button class="cr-sh-btn" data-act="add" type="button">Upload photos</button>' +
    /* 591. It lives in renderAdmin because renderEmpty() calls renderAdmin() too,
       and with zero pairs the empty state IS the day-one surface. It also
       inherits the amAdmin() gate, so Showroom hides it with no 15th
       conditional. `ghost` matches the walk tab's own From-a-job button. */
    '<button class="cr-sh-btn ghost" data-act="addjob" type="button">From a job</button>' +
    (p ? '<button class="cr-sh-btn ghost" data-act="pub" type="button">' +
           (p.published ? 'Unpublish this one' : 'Publish this one') + '</button>' +
         '<button class="cr-sh-btn ghost" data-act="del" type="button">Remove</button>' +
         ((p.release_on || p.release_by)
           ? '<button class="cr-sh-btn" data-act="share" type="button">Share\u2026</button>'
           : '<button class="cr-sh-btn ghost dead" data-act="sharedead" type="button" ' +
             'title="Record the client release first">Share\u2026</button>' +
             '<p class="cr-sh-relnote"><b>Record the client release first.</b> Until then this ' +
             'pair shows at the kitchen table and goes nowhere else.</p>') : '') +
    '</div>';
}

/* Says which of the two states a pair is in, and never guesses. Absence of a
   release is not "probably fine" — it is a photograph that must not be
   published, and it should look like one. */
function releaseBadge(p){
  /* 590: never in the showroom. This badge names a real person and states an
     internal marketing-consent fact about SOMEBODY ELSE'S house — the same
     thing privacy mode strips addresses for. It is for whoever is curating,
     not for whoever is being sold to. */
  if(showroom) return '';
  if(p.release_on || p.release_by){
    var who = p.release_by ? esc(p.release_by) : 'on file';
    var when = p.release_on ? ' · ' + esc(fmtDate(p.release_on)) : '';
    return '<span class="cr-sh-rel-b ok" title="Cleared for marketing use">' +
           'Release: ' + who + when + '</span>';
  }
  return '<span class="cr-sh-rel-b no" title="No client release recorded — ' +
         'show it at the table, do not publish it">In-app only</span>';
}

function fmtDate(d){
  try{
    var t = new Date(d + 'T00:00:00');
    return t.toLocaleDateString(undefined, { month:'short', year:'numeric' });
  }catch(_){ return String(d); }
}

function repaint(){
  var slot = el && el.querySelector('[data-slot="body"]');
  if(!slot) return;
  slot.innerHTML = renderBody();
  wireBody();
}

/* ── wiring ────────────────────────────────────────────────────────────── */
function wire(){
  el.querySelectorAll('[data-act="back"]').forEach(function(b){
    b.onclick = function(){ close(true); };
  });
  el.querySelectorAll('[data-act="priv"]').forEach(function(b){
    b.onclick = function(){
      var on = el.classList.toggle('priv');
      b.setAttribute('aria-checked', String(on));
      repaint();
    };
  });
  el.querySelectorAll('[data-tab]').forEach(function(b){
    b.onclick = function(){
      tab = b.dataset.tab;
      render();
      if(tab === 'work' && !workLoaded){
        loadWork().then(repaint, function(){ workLoaded = true; repaint(); });
      }
      if(tab === 'walk' && !walksLoaded){
        loadWalks().then(repaint, function(){ walksLoaded = true; repaint(); });
      }
    };
  });
  el.querySelectorAll('[data-act="reports"]').forEach(function(b){
    b.onclick = function(){
      /* Close first, then hand off — two full-screen views must never be open
         at once, and openReportsView calls hideAllViews itself anyway. */
      close(false);
      if(typeof window.openReportsView === 'function') window.openReportsView();
    };
  });
  wireExit();
  wireBody();
}

function wireBody(){
  el.querySelectorAll('[data-lens]').forEach(function(im){
    im.onclick = function(){ openLens({ path: im.dataset.lens, cap: im.dataset.cap || '' }); };
  });
  el.querySelectorAll('[data-act="cmpexp"]').forEach(function(b){
    b.onclick = function(e){
      e.stopPropagation();
      var p = pairs[cur]; if(!p) return;
      var img = el.querySelector('[data-role="after"]');
      openLens({ path: (img && img.dataset.path) || p.after_path, cap: label(p) });
    };
  });
  el.querySelectorAll('[data-act="rlens"]').forEach(function(b){
    b.onclick = function(){
      if(!review) return;
      openLens({ path: review.shot.path, boxes: review.list,
                 cap: walkLabel(curWalk || {}) });
    };
  });
  el.querySelectorAll('[data-act="waddc"]').forEach(function(b){ b.onclick = openWorkForm; });
  /* The wrapper is REQUIRED — see the identical note on addjob. A bare
     `b.onclick = openJobPicker` hands arg 0 a MouseEvent, which is neither
     'pair' nor 'work', so it would fall to walk mode and bail on !curWalk: a
     button that silently does nothing. */
  el.querySelectorAll('[data-act="waddjob"]').forEach(function(b){
    b.onclick = function(){ openJobPicker('work'); };
  });
  wireWalk();
  el.querySelectorAll('[data-wdel]').forEach(function(b){
    b.onclick = function(){ removeWork(b.dataset.wdel); };
  });
  el.querySelectorAll('[data-pick]').forEach(function(b){
    b.onclick = function(){ cur = parseInt(b.dataset.pick, 10) || 0; repaint(); };
  });
  el.querySelectorAll('[data-act="prev"]').forEach(function(b){
    b.onclick = function(){ if(pairs.length){ cur = (cur - 1 + pairs.length) % pairs.length; repaint(); } };
  });
  el.querySelectorAll('[data-act="next"]').forEach(function(b){
    b.onclick = function(){ if(pairs.length){ cur = (cur + 1) % pairs.length; repaint(); } };
  });
  el.querySelectorAll('[data-act="add"]').forEach(function(b){ b.onclick = openForm; });
  /* The wrapper is REQUIRED. `b.onclick = openJobPicker` would hand it a
     MouseEvent, which is not === 'pair', so it would fall to walk mode and bail
     on !curWalk — a button that silently does nothing. */
  el.querySelectorAll('[data-act="addjob"]').forEach(function(b){
    b.onclick = function(){ openJobPicker('pair'); };
  });
  el.querySelectorAll('[data-act="ccplay"]').forEach(function(b){ b.onclick = startCurtain; });
  el.querySelectorAll('[data-act="share"]').forEach(function(b){ b.onclick = openShareComposer; });
  el.querySelectorAll('[data-act="pub"]').forEach(function(b){ b.onclick = togglePublish; });
  el.querySelectorAll('[data-act="del"]').forEach(function(b){ b.onclick = removePair; });
  el.querySelectorAll('[data-ph]').forEach(function(b){
    b.onclick = function(){
      if(b.hasAttribute('disabled')) return;
      var p = pairs[cur]; if(!p) return;
      var img = el.querySelector('[data-role="after"]');
      var tag = el.querySelector('[data-aftertag]');
      var want = b.dataset.ph;
      var wantPath = want === 'build' ? p.build_path : p.after_path;
      if(img){ img.src = src(wantPath); img.dataset.path = wantPath; }
      if(tag) tag.textContent = want === 'build' ? 'During the build' : 'After';
      el.querySelectorAll('[data-ph]').forEach(function(x){ x.classList.toggle('on', x === b); });
    };
  });
  wireSlider();
}

function wireSlider(){
  var cmp = el.querySelector('[data-cmp]');
  var hd  = el.querySelector('[data-hd]');
  if(!cmp || !hd) return;
  var dragging = false;
  /* 624: one write per FRAME, not one per pointer event.
     A 120Hz digitizer delivers pointermove in bursts BETWEEN paints, so the
     shipped code did a forced layout read plus two DOM mutations per event —
     and on this app every mutation wakes all 50 document.body observers the
     other modules register. Measured on a 120-event burst dispatched in one
     frame: 121 forced reflows and 243 mutation records became 1 and 4, with
     --sh-split landing on the identical value.
     Both writes compare against a STORED last value, never a read-back of the
     DOM. That is 567/569's lesson: a guard that compares against live content
     can look right and never once succeed, because the browser's serialization
     of what you wrote is not the string you wrote. */
  var splitPct = 52, splitRect = null, splitRaf = 0, wrotePct = -1, wroteAria = -1;
  function flushSplit(){
    splitRaf = 0;
    if(splitPct !== wrotePct){
      cmp.style.setProperty('--sh-split', splitPct + '%');
      wrotePct = splitPct;
    }
    var a = Math.round(splitPct);
    if(a !== wroteAria){ hd.setAttribute('aria-valuenow', String(a)); wroteAria = a; }
  }
  function set(pct){
    splitPct = Math.max(3, Math.min(97, pct));
    if(!splitRaf) splitRaf = requestAnimationFrame(flushSplit);
  }
  function from(e){
    /* 624: cached for the gesture. The slider cannot move under the finger
       while the finger is down, so re-reading this per event bought nothing and
       cost a forced synchronous layout each time. pointerdown clears it, which
       is what makes a scroll or a rotation between gestures safe. */
    var r = splitRect || (splitRect = cmp.getBoundingClientRect());
    if(!r.width) return;
    set((e.clientX - r.left) / r.width * 100);
  }
  /* 592: `grabbing` is the only thing this class does — a scale on the knob. It
     is removed on BOTH pointerup and pointercancel, because a cancel is exactly
     what a browser sends when it steals the gesture, and a knob left swollen
     after that reads as a stuck control. */
  function grab(on){ cmp.classList.toggle('grabbing', !!on); }
  cmp.addEventListener('pointerdown', function(e){
    /* The expand button lives inside the slider. Capturing the pointer
       here would steal its pointerup and the browser would fire no
       click on it — 578's class. Let a press on the button through. */
    if(e.target.closest && e.target.closest('.cr-sh-exp')) return;
    dragging = true;
    splitRect = null;            /* 624: re-measure once, at the start of each gesture */
    grab(true);
    try{ cmp.setPointerCapture(e.pointerId); }catch(_){}
    from(e);
  });
  cmp.addEventListener('pointermove', function(e){ if(dragging) from(e); });
  cmp.addEventListener('pointerup',     function(){ dragging = false; grab(false); });
  cmp.addEventListener('pointercancel', function(){ dragging = false; grab(false); });
  hd.addEventListener('keydown', function(e){
    var now = splitPct;   /* 624: NOT the DOM — the write is deferred a frame */
    if(e.key === 'ArrowLeft'){ set(now - 4); e.preventDefault(); }
    if(e.key === 'ArrowRight'){ set(now + 4); e.preventDefault(); }
  });
}

/* ── admin: add a pair ─────────────────────────────────────────────────── */
function ensureForm(){
  if(formEl) return formEl;
  formEl = document.getElementById('cr-show-form');
  if(!formEl){
    formEl = document.createElement('div');
    formEl.id = 'cr-show-form';
    document.body.appendChild(formEl);
  }
  /* 597: closeForm()'s own comment says "the cancel/escape paths", but no escape
     path was ever wired — no backdrop click, no Escape key. With .ft hidden under
     the bottom bar that left NO way out of this modal at all. Both are added here
     rather than in openForm() so they attach exactly once: ensureForm() returns
     early on every later call. */
  formEl.onclick = function(e){ if(e.target === formEl) closeForm(); };
  document.addEventListener('keydown', function(e){
    if(e.key === 'Escape' && formEl && formEl.classList.contains('open')) closeForm();
  });
  return formEl;
}

function openForm(){
  if(!amAdmin()) return;
  ensureForm();
  /* 591, and this line is the whole reason the promote flow is safe: closeForm()
     only removes a class, so files carried over from a promoted job would still
     be sitting in `pending` the next time somebody opened this form by hand — and
     savePair's file() prefers pending, so it would upload the PREVIOUS job's
     photographs under the new pair's name, silently. Clearing here rather than in
     the callers makes "openForm always starts clean" unconditional.
     promoteToPair therefore calls openForm() first and sets pending after. */
  pending = null;
  formEl.innerHTML =
    '<div class="bx">' +
      '<h3>Add a transformation</h3>' +
      '<label>Before photo</label><input type="file" accept="image/*" data-f="before">' +
      '<label>After photo</label><input type="file" accept="image/*" data-f="after">' +
      '<label>During the build (optional)</label><input type="file" accept="image/*" data-f="build">' +
      '<label>Address</label><input type="text" data-f="address" placeholder="123 Main St">' +
      '<div class="r2"><div><label>City</label><input type="text" data-f="city" placeholder="Dayton"></div>' +
        '<div><label>Score 0-100</label><input type="number" data-f="score" min="0" max="100" placeholder="90"></div></div>' +
      '<label>Trade</label><select data-f="trade">' +
        TRADES.map(function(t){ return '<option value="' + t + '">' + esc(TRADE_LABEL[t]) + '</option>'; }).join('') +
      '</select>' +
      '<label>Material</label><input type="text" data-f="material" placeholder="Owens Corning Duration — Onyx Black">' +
      '<label>Completed</label><input type="date" data-f="completed_on">' +
      '<div class="cr-sh-rel">' +
        '<label class="ck"><input type="checkbox" data-f="has_release">' +
          '<span>Client release on file</span></label>' +
        '<div class="r2">' +
          '<div><label>Given on</label><input type="date" data-f="release_on"></div>' +
          '<div><label>By</label><input type="text" data-f="release_by" placeholder="name on the release"></div>' +
        '</div>' +
      '</div>' +
      '<div class="err" data-err></div>' +
      '<p class="note">Photographs are copied into Cardinal’s own storage, so they keep working ' +
        'whatever happens to CompanyCam. Nothing is shown to the team until you publish it.</p>' +
      '<div class="ft">' +
        '<button class="cr-sh-btn ghost" data-act="cancel" type="button">Cancel</button>' +
        '<button class="cr-sh-btn" data-act="save" type="button">Save</button>' +
      '</div>' +
    '</div>';
  formEl.classList.add('open');
  formEl.querySelector('[data-act="cancel"]').onclick = closeForm;
  formEl.querySelector('[data-act="save"]').onclick = savePair;
}
function closeForm(){
  /* Belt and braces for the cancel/escape paths. Safe: savePair has already read
     pending by the time it calls this. */
  pending = null;
  /* 1076: cleared here and NOT in saveWalk's finally, deliberately.  saveWalk
     reaches closeForm() only on success, so a FAILED save keeps the job link
     for the retry - and cancel, the backdrop and Escape all land here, so the
     Showcase's own Start a walk can never inherit a job opened an hour ago. */
  pendingProject = null;
  if(formEl) formEl.classList.remove('open');
}

function showErr(msg){
  var e = formEl && formEl.querySelector('[data-err]');
  if(e){ e.textContent = msg; e.classList.add('on'); }
}

/* Re-encode at a chosen size. Called twice per photograph — see FULL/DISP.

   The old comment here claimed 1600px "keeps it sharp when a homeowner pinches
   in". It did not: an iPad Pro is 2732x2048 native, so a photo filling the
   slider on a 2x display already wants ~2400 device pixels before anyone
   pinches at all. It was soft on the exact gesture it was justified by. */
function shrink(file, max, quality){
  /* ⚠ RELOCATED: the implementation moved to showroom-images.js so OC Colors
     can use it without reaching into this module. Showcase's public API is
     deliberately UNCHANGED — it still exports `shrink` — because four callers
     here and every gate that asserts on the API shape depend on that. */
  var U = window.CardinalShowroomImages;
  if (!U || typeof U.shrink !== 'function') {
    return Promise.reject(new Error('showroom image utility not loaded'));
  }
  return U.shrink(file, max, quality);
}

async function savePair(){
  if(busy) return;
  var cl = sb();
  if(!cl) return showErr('Not signed in.');
  var btn = formEl.querySelector('[data-act="save"]');
  var get = function(k){ var i = formEl.querySelector('[data-f="' + k + '"]'); return i ? i.value.trim() : ''; };
  /* 591: a promoted pair renders no file inputs, so its bytes cannot live in the
     DOM. `pending` is null for a hand-made pair, which is what keeps a chosen
     file winning there. Cleared at the top of openForm() — without that, this
     preference silently uploads the last job's photographs. */
  var file = function(k){
    if(pending && pending[k]) return pending[k];
    var i = formEl.querySelector('[data-f="' + k + '"]'); return i && i.files && i.files[0] ? i.files[0] : null;
  };

  var fb = file('before'), fa = file('after'), fbu = file('build');
  if(!fb || !fa) return showErr('A before and an after photo are both needed.');

  busy = true; btn.disabled = true; btn.textContent = 'Saving…';
  try{
    var id = (window.crypto && crypto.randomUUID) ? crypto.randomUUID()
           : String(Date.now()) + Math.random().toString(16).slice(2);
    var base = 'showcase/' + id + '/';
    var paths = {};
    var jobs = [['before', fb], ['after', fa]];
    if(fbu) jobs.push(['build', fbu]);

    for(var i = 0; i < jobs.length; i++){
      var kind = jobs[i][0];
      paths[kind] = await putPhoto(cl, jobs[i][1], base + kind + '.jpg');
    }

    var scoreRaw = get('score');
    var row = {
      id: id,
      /* 591: the column has existed since showcase_pairs.sql and nothing ever
         wrote it. Nullable, no foreign key, so a hand-made pair still inserts
         null and no migration ships with this build. */
      project_id: (pending && pending.projectId) || null,
      address: get('address') || null,
      city: get('city') || null,
      trade: get('trade') || null,
      material: get('material') || null,
      completed_on: get('completed_on') || null,
      before_path: paths.before,
      build_path: paths.build || null,
      after_path: paths.after,
      score: scoreRaw === '' ? null : Math.max(0, Math.min(100, parseInt(scoreRaw, 10) || 0)),
      published: true
    };

    /* The release is the difference between "we may show this" and "we published
       someone's house". Record it only when it was actually given, and record
       WHO gave it — a date with no name proves nothing a year from now. */
    var relBox = formEl.querySelector('[data-f="has_release"]');
    if(relBox && relBox.checked){
      var rby = get('release_by');
      if(!rby) throw new Error('Who gave the release? A date with no name proves nothing later.');
      row.release_on = get('release_on') || new Date().toISOString().slice(0, 10);
      row.release_by = rby;
    }
    var ins = await cl.from('showcase_pairs').insert(row).select('id');
    if(ins && ins.error) throw new Error(ins.error.message || 'could not save');
    /* An insert refused by RLS comes back with no error and no rows — the same
       silent-204 shape as a blocked delete. Check the rows, not just .error. */
    if(!ins || !ins.data || !ins.data.length) throw new Error('Saved nothing — admin only.');

    closeForm();
    loaded = false;
    await load();
    cur = 0;
    repaint();
  }catch(e){
    showErr(String(e && e.message ? e.message : e));
  }finally{
    busy = false;
    if(btn){ btn.disabled = false; btn.textContent = 'Save'; }
  }
}

function openWorkForm(){
  if(!amAdmin()) return;
  ensureForm();
  /* 628, and it is load-bearing exactly as it is on openForm: closeForm() only
     removes a class, so files carried from a promoted pick would still be in
     `pending` the next time this form was opened by hand — and saveWork's file()
     now prefers pending. Clearing here makes "opening always starts clean"
     unconditional rather than something every caller has to remember. */
  pending = null;
  formEl.innerHTML =
    '<div class="bx">' +
      '<h3>Add a comparison</h3>' +
      '<label>What is it called</label><input type="text" data-f="title" placeholder="High-nailing">' +
      '<label>Trade</label><select data-f="trade">' +
        TRADES.map(function(t){ return '<option value="' + t + '">' + esc(TRADE_LABEL[t]) + '</option>'; }).join('') +
      '</select>' +
      '<label>Why it matters, in one line</label>' +
      '<input type="text" data-f="lesson" placeholder="Nails above the line pin nothing. First wind event lifts the course.">' +
      '<label>The bad install \u2014 photo</label><input type="file" accept="image/*" data-f="bad">' +
      '<label>What went wrong</label><input type="text" data-f="bad_caption" placeholder="3 nails, 35 mm high. Voids the wind warranty on day one.">' +
      '<label>Our standard \u2014 photo</label><input type="file" accept="image/*" data-f="good">' +
      '<label>What we do instead</label><input type="text" data-f="good_caption" placeholder="Four fasteners through both courses, seated on the line.">' +
      '<div class="err" data-err></div>' +
      '<p class="note">Both photographs are copied into Cardinal\u2019s own storage. ' +
        'Nothing here reads a client record \u2014 the bad side is competitor work you ' +
        'photographed, the good side is ours.</p>' +
      '<div class="ft">' +
        '<button class="cr-sh-btn ghost" data-act="cancel" type="button">Cancel</button>' +
        '<button class="cr-sh-btn" data-act="save" type="button">Save</button>' +
      '</div>' +
    '</div>';
  formEl.classList.add('open');
  formEl.querySelector('[data-act="cancel"]').onclick = closeForm;
  formEl.querySelector('[data-act="save"]').onclick = saveWork;
}

async function saveWork(){
  if(busy) return;
  var cl = sb();
  if(!cl) return showErr('Not signed in.');
  var btn = formEl.querySelector('[data-act="save"]');
  var get = function(k){ var i = formEl.querySelector('[data-f="' + k + '"]'); return i ? i.value.trim() : ''; };
  /* 628: the same preference savePair has carried since 591. `pending` is null
     for a hand-made comparison, which is what keeps a chosen file winning there. */
  var file = function(k){
    if(pending && pending[k]) return pending[k];
    var i = formEl.querySelector('[data-f="' + k + '"]'); return i && i.files && i.files[0] ? i.files[0] : null;
  };

  var title = get('title');
  var fb = file('bad'), fg = file('good');
  if(!title) return showErr('Give it a name — it is the heading on the card.');
  if(!fb || !fg) return showErr('Both photographs are needed: the bad one and ours.');

  busy = true; btn.disabled = true; btn.textContent = 'Saving…';
  try{
    var id = (window.crypto && crypto.randomUUID) ? crypto.randomUUID()
           : String(Date.now()) + Math.random().toString(16).slice(2);
    var base = 'workmanship/' + id + '/';
    var paths = {};
    var jobs = [['bad', fb], ['good', fg]];
    for(var i = 0; i < jobs.length; i++){
      paths[jobs[i][0]] = await putPhoto(cl, jobs[i][1], base + jobs[i][0] + '.jpg');
    }
    var ins = await cl.from('workmanship_pairs').insert({
      id: id, title: title, trade: get('trade') || null, lesson: get('lesson') || null,
      bad_path: paths.bad, bad_caption: get('bad_caption') || null,
      good_path: paths.good, good_caption: get('good_caption') || null,
      published: true
    }).select('id');
    if(ins && ins.error) throw new Error(ins.error.message || 'could not save');
    /* Refused by RLS comes back with no error and no rows — check the rows. */
    if(!ins || !ins.data || !ins.data.length) throw new Error('Saved nothing — admin only.');

    closeForm();
    workLoaded = false;
    await loadWork();
    repaint();
  }catch(e){
    showErr(String(e && e.message ? e.message : e));
  }finally{
    busy = false;
    if(btn){ btn.disabled = false; btn.textContent = 'Save'; }
  }
}

async function removeWork(id){
  var cl = sb();
  if(!cl || busy) return;
  if(!await crAsk('Remove this comparison?')) return;
  busy = true;
  try{
    /* .select('id') is load-bearing: a delete refused by RLS is a silent 204. */
    var r = await cl.from('workmanship_pairs').delete().eq('id', id).select('id');
    if(r && !r.error && r.data && r.data.length){
      work = work.filter(function(w){ return String(w.id) !== String(id); });
    }
  }catch(_){}
  busy = false;
  repaint();
}

async function togglePublish(){
  var cl = sb(), p = pairs[cur];
  if(!cl || !p || busy) return;
  busy = true;
  try{
    var r = await cl.from('showcase_pairs').update({ published: !p.published, updated_at: new Date().toISOString() })
                    .eq('id', p.id).select('id');
    if(r && !r.error && r.data && r.data.length) p.published = !p.published;
  }catch(_){}
  busy = false;
  repaint();
}

async function removePair(){
  var cl = sb(), p = pairs[cur];
  if(!cl || !p || busy) return;
  if(!await crAsk('Remove this transformation from the showcase?')) return;
  busy = true;
  try{
    /* .select('id') is load-bearing: a delete refused by RLS returns a silent
       204 with no error, so the only proof it happened is a row coming back. */
    var r = await cl.from('showcase_pairs').delete().eq('id', p.id).select('id');
    if(r && !r.error && r.data && r.data.length){
      pairs.splice(cur, 1);
      if(cur >= pairs.length) cur = Math.max(0, pairs.length - 1);
    }
  }catch(_){}
  busy = false;
  repaint();
}


/* ── The Walk (579) ────────────────────────────────────────────────────────
   Theo: "circling damage ai and checking first then presenting to client is a
   good third tab. Doesn't need to be a report, so new feature then."

   The order in that sentence is the design. api/detect.js proposes located
   findings; a person accepts, nudges or rejects each one; ONLY what survives
   is written. walk_shots.findings therefore means "seen by a human", and
   reviewed_at IS NULL means "nobody has walked this yet". Present mode (580)
   reads exactly that and needs no filtering.

   NOT AN INSPECTION REPORT. inspection_reports has its own editor, its own
   print path and its own list, and the tab strip already links out to it. */

var WALK_SEV = ['crit', 'warn', 'ok'];                      // api/detect.js SEVERITIES
var SEV_LABEL = { crit:'Critical', warn:'Worth noting', ok:'Sound' };
/* Mirrors api/detect.js DEFECTS. It is a LABEL map, not a filter: an unknown
   key renders as itself rather than disappearing, because a defect the client
   cannot see is worse than one with an ugly name. The route already coerces to
   'other'; a second silent filter here would hide a real finding. */
var DEF_LABEL = {
  hail_impact:'Hail impact', wind_lifted:'Wind-lifted', missing_shingle:'Missing shingle',
  granule_loss:'Granule loss', cracked_split:'Cracked / split', nail_pop:'Nail pop',
  exposed_fastener:'Exposed fastener', flashing_failed:'Failed flashing',
  flashing_missing:'Missing flashing', pipe_boot:'Pipe boot', chimney:'Chimney',
  valley:'Valley', ridge_cap:'Ridge cap', ponding_debris:'Ponding / debris',
  decking_sag:'Decking sag', ice_dam:'Ice dam', other:'Other',
  /* 17-30 — the exterior half (596, narrowed 602). Mirrors api/detect.js DEFECTS,
     which is exterior_vocab.py on the Spark verbatim. Order is index-aligned
     with the trained model's classes; do not reorder or rename. */
  gutter_damage:'Gutter damage', downspout_damage:'Downspout damage',
  soffit_fascia_damage:'Soffit / fascia damage',
  siding_damage:'Siding damage', masonry_damage:'Masonry damage',
  vegetation_contact:'Vegetation contact',
  window_glass_damage:'Window glass', window_seal_failure:'Window seal failure',
  window_frame_damage:'Window frame', deck_penetration:'Deck penetration',
  underlayment_exposed:'Underlayment exposed', hardware_loose:'Loose hardware',
  electrical_hazard:'Electrical hazard', interior_water_damage:'Interior water damage'
};
function defLabel(k){ return DEF_LABEL[k] || String(k || 'other').replace(/_/g, ' '); }

/* What goes to the model. Small on purpose: api/detect.js refuses anything over
   5 MB x 1.4 of base64, and a 1600px frame is well inside that while still
   resolving a nail head. The stored photograph is unaffected — FULL/DISP above
   are what actually gets kept. */
var AI = { max: 1600, q: 0.85 };

var walks = [], walksLoaded = false, curWalk = null;
/* 1076: the job a walk is being started FOR.

   The Walk's only door was the Showcase tile on Sales Floor, then a tab inside
   a module that opens on 'showcase' - so in the ~250 builds since it shipped,
   `walks` has 0 rows and `walk_shots` has 0 rows.  Nobody has ever reached it.
   The job menu is where fingers already are, so that is where the door goes.

   Held in module state rather than passed as an argument, deliberately: this
   module wires `b.onclick = openWalkForm` in one place and `openJobPicker` in
   another, and 628's comment on the second one records exactly what a
   parameter costs here - arg 0 is a MouseEvent.  A project that is really a
   MouseEvent would write a null project_id while looking perfectly correct,
   which is the failure this build exists to fix.

   Set by openForProject(), read by openWalkForm() and saveWalk(), cleared by
   closeForm() and by the Showcase's own Start a walk. */
var pendingProject = null;
var shots = [], shotsLoaded = false;
var review = null;      // { shot, list:[...], sel:int, note:string } while reviewing
var jobPick = null;     // { mode, projectId, photos:[], chosen:{}, roles:{} } while picking
/* 591: files carried from a promoted job. The pair form renders no file inputs
   in that mode, so the bytes cannot live in the DOM. It is null in the ordinary
   form, which is exactly why a hand-picked file still wins there. Cleared at the
   TOP of openForm() — see the comment there; that is not tidiness, it is the
   difference between saving your photographs and saving the last job's. */
var pending = null;     // { before:File, after:File, build:File|null, projectId, address, city, raw }
var vocabWarned = false;

/* ── data ──────────────────────────────────────────────────────────────── */
async function loadWalks(){
  var cl = sb();
  if(!cl){ walksLoaded = true; return; }
  var r = await cl.from('walks').select('*')
                  .order('sort_order', { ascending:true })
                  .order('created_at', { ascending:false });
  walks = (r && !r.error && r.data) ? r.data : [];
  walksLoaded = true;
}

async function loadShots(walkId){
  var cl = sb();
  shots = []; shotsLoaded = false;
  if(!cl){ shotsLoaded = true; return; }
  var r = await cl.from('walk_shots').select('*').eq('walk_id', walkId)
                  .order('sort_order', { ascending:true })
                  .order('created_at', { ascending:true });
  shots = (r && !r.error && r.data) ? r.data : [];
  shotsLoaded = true;
  await signShots();
}

/* Shot paths join the same signing pass everything else uses. Signed for
   DISPLAY only — never written back onto a row. */
async function signShots(){
  var paths = [];
  shots.forEach(function(s){ if(s.path){ paths.push(s.path); paths.push(dispPath(s.path)); } });
  if(!paths.length || typeof window.signedPhotoMap !== 'function') return;
  try{
    var got = await window.signedPhotoMap(paths, 3600) || {};
    Object.keys(got).forEach(function(k){ signed[k] = got[k]; });
  }catch(_){}
}

/* ── render ────────────────────────────────────────────────────────────── */
function renderWalkTab(){
  if(pres) return renderPresent();
  if(review) return renderReview();
  if(curWalk) return renderOneWalk();
  return renderWalkList();
}

function renderWalkList(){
  if(!walksLoaded) return '<div class="cr-sh-empty">Loading…</div>';
  if(!walks.length){
    return '<div class="cr-sh-empty"><b>No walks yet.</b>' +
      (amAdmin()
        ? 'Start one, add a few photographs, and the AI marks what it thinks is damage. ' +
          'You check every mark before anyone else sees it.'
        : 'Theo hasn’t put one together yet.') +
      '</div>' + walkAdminBar();
  }
  return '<div class="cr-sh-rule">' + walks.length +
      (walks.length === 1 ? ' walk' : ' walks') + '</div>' +
    walks.map(function(w, i){
      return '<button class="cr-sh-wlk" data-walk="' + i + '" type="button">' +
        '<div class="t"><b>' + esc(walkLabel(w)) + '</b>' +
          '<span>' + esc(walkSub(w)) + '</span></div>' +
        (w.published ? '' : '<span class="n">Draft</span>') +
      '</button>';
    }).join('') + walkAdminBar();
}

/* Privacy mode is the Showcase's, and it applies here for the same reason: the
   homeowner may be holding the tablet. The address is REMOVED, not hidden. */
function walkLabel(w){
  if(el && el.classList.contains('priv')){
    return (w.title && !/\d/.test(w.title)) ? w.title
         : ('Walk ' + String(w.id || '').replace(/-/g,'').slice(0,4).toUpperCase());
  }
  return w.title || w.address || 'Untitled walk';
}
function walkSub(w){
  var bits = [];
  if(w.trade) bits.push(TRADE_LABEL[w.trade] || w.trade);
  if(!(el && el.classList.contains('priv')) && w.address) bits.push(w.address);
  if(w.city) bits.push(w.city);
  return bits.join(' · ') || 'No details yet';
}

function walkAdminBar(){
  if(!amAdmin()) return '';
  return '<div class="cr-sh-admin"><button class="cr-sh-btn" data-act="waddwalk" type="button">' +
    'Start a walk</button></div>';
}

function renderOneWalk(){
  var w = curWalk;
  var head = '<div class="cr-sh-rule">' + esc(walkLabel(w)) + '</div>' +
    '<div class="cr-sh-bar">' +
      '<button class="cr-sh-btn ghost" data-act="wback" type="button">← All walks</button>' +
      (presentable().length ? '<button class="cr-sh-btn" data-act="present" type="button">Present \u25B6</button>' : '') +
      (amAdmin() ? '<button class="cr-sh-btn" data-act="wphone" type="button">Add photographs</button>' +
                   '<button class="cr-sh-btn ghost" data-act="wjob" type="button">From a job</button>' +
                   '<button class="cr-sh-btn ghost" data-act="wpub" type="button">' +
                     (w.published ? 'Unpublish' : 'Publish') + '</button>' +
                   '<button class="cr-sh-btn ghost" data-act="wdelwalk" type="button">Remove</button>' : '') +
    '</div>' +
    '<input type="file" accept="image/*" multiple data-wfile style="display:none">';

  if(!shotsLoaded) return head + '<div class="cr-sh-empty">Loading…</div>';
  if(!shots.length){
    return head + '<div class="cr-sh-empty"><b>No photographs yet.</b>' +
      (amAdmin() ? 'Add a few from your phone, or pull them off a job you already have.'
                 : 'Nothing has been added to this walk.') + '</div>';
  }
  return head + '<div class="cr-sh-shots">' +
    shots.map(function(s, i){
      var n = (s.findings || []).length;
      var cls = !s.reviewed_at ? 'new' : (n ? 'hits' : 'done');
      var txt = !s.reviewed_at ? 'Not checked'
              : (n ? (n + (n === 1 ? ' finding' : ' findings')) : 'Nothing found');
      return '<button class="cr-sh-shot ' + cls + '" data-shot="' + i + '" type="button">' +
        '<img alt="" loading="lazy" src="' + esc(srcD(s.path)) + '">' +
        '<div class="st"><span class="sq"></span>' + esc(txt) + '</div>' +
      '</button>';
    }).join('') + '</div>';
}

/* The review screen. Boxes are positioned in PERCENT off the stored fractions,
   so this markup is resolution-independent by construction — the same row is
   correct on a phone and at 1180px. */
function renderReview(){
  var r = review;
  var img = signed[r.shot.path] || srcD(r.shot.path) || '';
  var boxes = r.list.map(function(f, i){
    var b = f.box || { x:0, y:0, w:0, h:0 };
    return '<div class="cr-sh-box ' + esc(f.severity) + (i === r.sel ? ' sel' : '') + '"' +
      ' data-box="' + i + '" style="left:' + pc(b.x) + ';top:' + pc(b.y) +
      ';width:' + pc(b.w) + ';height:' + pc(b.h) + '">' +
      '<span class="lb">' + esc(f.label || defLabel(f.defect)) + '</span>' +
      /* 590: no resize handle in the showroom. wireBoxes() already returns
         early there, so this is the visual half — a grip you cannot use
         still reads as an invitation. */
      (showroom ? '' : '<span class="gr" data-grip="' + i + '"></span>') +
    '</div>';
  }).join('');
  if(r.draft && r.draft.box){
    var db = r.draft.box;
    boxes += '<div class="cr-sh-draft" style="left:' + pc(db.x) + ';top:' + pc(db.y) +
      ';width:' + pc(db.w) + ';height:' + pc(db.h) + '"></div>';
  }

  return '<div class="cr-sh-rule">Checking a photograph</div>' +
    '<div class="cr-sh-bar">' +
      '<button class="cr-sh-btn ghost" data-act="rback" type="button">← Back</button>' +
      '<button class="cr-sh-btn ghost" data-act="rlens" type="button" aria-label="Open full screen">\u2922</button>' +
      /* 590: the write half of the review bar. Back and the lens stay — a client
         seeing the marked-up photograph full screen is the whole point of the
         room; asking the AI, drawing on it and saving are not. */
      (showroom ? '' :
        '<button class="cr-sh-btn ghost" data-act="rdetect" type="button">' +
        (r.list.length ? 'Ask again' : 'Ask the AI') + '</button>' +
        '<button class="cr-sh-btn ghost' + (r.arming ? ' arming' : '') + '" data-act="rmark" type="button">+ Mark damage</button>' +
        '<button class="cr-sh-btn" data-act="rsave" type="button">Save what I accepted</button>') +
    '</div>' +
    '<div class="cr-sh-rev' + (r.arming ? ' arming' : '') + '" data-rev>' +
      '<img alt="" src="' + esc(img) + '">' + boxes +
    '</div>' +
    (r.draft ? renderClassify() : '') +
    (r.note ? '<p class="cr-sh-note' + (r.noteKind ? ' ' + r.noteKind : '') + '">' +
              esc(r.note) + '</p>' : '') +
    (r.list.length
      ? r.list.map(function(f, i){
          return '<div class="cr-sh-fnd ' + esc(f.severity) + (i === r.sel ? ' sel' : '') +
            '" data-fnd="' + i + '">' +
            '<span class="sq"></span>' +
            '<div class="m"><b>' + esc(f.label || defLabel(f.defect)) + '</b>' +
              '<p>' + esc(defLabel(f.defect)) + (f.note ? ' — ' + esc(f.note) : '') +
              /* 590: confidence and provenance are OURS. "55% sure" argues against
                 the finding at a kitchen table, and "drawn by hand" is internal
                 bookkeeping for training the detector. The mark and how serious it
                 is are what the client needs. */
              (showroom ? '' :
                (f.confidence != null ? ' · ' + Math.round(f.confidence * 100) + '% sure' : '') +
                (f.source === 'human' ? ' · drawn by hand' : (f.edited ? ' · moved by hand' : ''))) + '</p>' +
              (showroom
                ? '<span class="sv">' + esc(SEV_LABEL[f.severity] || f.severity) + '</span>'
                : '<select data-sev="' + i + '">' +
                  WALK_SEV.map(function(s){
                    return '<option value="' + s + '"' + (f.severity === s ? ' selected' : '') +
                           '>' + SEV_LABEL[s] + '</option>';
                  }).join('') +
                '</select>') +
            '</div>' +
            (showroom ? '' :
              '<button class="x" data-drop="' + i + '" type="button" aria-label="Reject">✕</button>') +
          '</div>';
        }).join('')
      : '<p class="cr-sh-note">Nothing marked yet. Ask the AI, or press + Mark damage and ' +
        'draw the box yourself \u2014 then keep what is real.</p>');
}
function pc(v){ return (Math.max(0, Math.min(1, +v || 0)) * 100).toFixed(3) + '%'; }

/* ── the AI call ───────────────────────────────────────────────────────── */
/* api/detect.js hands `image` straight to Gemini as inline_data.data, which
   must be BARE base64. /api/caption is passed a full data: URL, so copying that
   call verbatim would have failed at the model rather than at the fetch — the
   shape of bug that ships looking fine. Strip the prefix, pass mime separately. */
function blobB64(blob){
  return new Promise(function(resolve, reject){
    var fr = new FileReader();
    fr.onload = function(){
      var s = String(fr.result || '');
      var c = s.indexOf(',');
      resolve(c === -1 ? s : s.slice(c + 1));
    };
    fr.onerror = function(){ reject(new Error('could not read the image')); };
    fr.readAsDataURL(blob);
  });
}

async function askDetect(blob, label){
  var small = await shrink(new File([blob], 'shot.jpg', { type:'image/jpeg' }), AI.max, AI.q);
  var res = await fetch('/api/detect', {
    method : 'POST',
    headers: await window.aiHeaders(),
    body   : JSON.stringify({ image: await blobB64(small), mime:'image/jpeg', label: label || '' })
  });
  var body = null;
  try{ body = await res.json(); }catch(_){}
  if(!res.ok) throw new Error((body && (body.detail || body.error)) || ('HTTP ' + res.status));

  /* The route echoes its vocabulary so a client can spot deploy skew between
     api/ and index.html. Warn once; never coerce on it — the route has already
     done the coercing and a second pass here could only lose information. */
  if(!vocabWarned && body && body.vocab && body.vocab.defects){
    var mine = Object.keys(DEF_LABEL).sort().join(',');
    var theirs = body.vocab.defects.slice().sort().join(',');
    if(mine !== theirs){
      vocabWarned = true;
      try{ console.warn('[walk] api/detect.js vocabulary differs from this build:',
                        { api: body.vocab.defects, app: Object.keys(DEF_LABEL) }); }catch(_){}
    }
  }
  return body || {};
}

/* Fetch the bytes of a shot back out of storage. download() rather than fetch()
   on a signed URL: the photos bucket is PRIVATE (verified), so the stored
   public-looking URLs on old project_photos rows are dead links. */
async function shotBlob(path){
  var cl = sb();
  if(!cl) throw new Error('Not signed in.');
  var d = await cl.storage.from('photos').download(path);
  if(!d || d.error || !d.data) throw new Error((d && d.error && d.error.message) || 'could not read the photo');
  return d.data;
}

async function runDetect(){
  var r = review;
  if(!r || busy) return;
  busy = true;
  r.note = 'Asking the AI…'; r.noteKind = ''; repaint();
  try{
    var blob = await shotBlob(r.shot.path);
    var out  = await askDetect(blob, curWalk ? (curWalk.trade || '') : '');
    /* Proposals REPLACE the AI's marks rather than appending — asking twice
       must not double every mark — but HAND-DRAWN marks survive: they are a
       person's decisions, and the model has no standing to erase them. */
    var mine = r.list.filter(function(f){ return f.source === 'human'; });
    r.list = mine.concat((out.findings || []).map(function(f){
      return { defect:f.defect, severity:f.severity, label:f.label, note:f.note,
               box:f.box, confidence:(f.confidence == null ? null : f.confidence), edited:false, source:'ai' };
    }));
    r.sel = r.list.length ? 0 : -1;

    var bits = [];
    if(out.quality === 'poor'){
      bits.push('The AI says this photograph is hard to read' +
                (out.quality_note ? ': ' + out.quality_note : '.'));
    }
    if(out.dropped) bits.push(out.dropped + (out.dropped === 1
      ? ' proposal had no usable location and was dropped.'
      : ' proposals had no usable location and were dropped.'));
    if(!r.list.length && !bits.length) bits.push('The AI marked nothing on this one.');
    r.note = bits.join(' ');
    r.noteKind = out.quality === 'poor' ? 'warn' : '';
  }catch(e){
    r.note = 'The AI could not read this photograph: ' + String(e && e.message ? e.message : e);
    r.noteKind = 'bad';
  }
  busy = false;
  repaint();
}

/* ── review: accept, nudge, reject ─────────────────────────────────────── */
async function saveReview(){
  var cl = sb(), r = review;
  if(!cl || !r || busy) return;
  busy = true;
  try{
    var who = '';
    try{
      var u = await cl.auth.getUser();
      who = (u && u.data && u.data.user && u.data.user.email) || '';
    }catch(_){}
    /* Only what survived. Rejected proposals are DROPPED, not flagged — the
       schema comment is the contract: anything in findings has been seen. */
    var keep = r.list.map(function(f){
      return { defect:f.defect, severity:f.severity, label:f.label, note:f.note,
               box:f.box, confidence:f.confidence, edited:!!f.edited, source:f.source || 'ai' };
    });
    var up = await cl.from('walk_shots').update({
      findings   : keep,
      reviewed_by: who || null,
      reviewed_at: new Date().toISOString()
    }).eq('id', r.shot.id).select('id');
    if(up && up.error) throw new Error(up.error.message || 'could not save');
    /* Refused by RLS comes back with no error and no rows — check the rows. */
    if(!up || !up.data || !up.data.length) throw new Error('Saved nothing — admin only.');

    r.shot.findings = keep;
    r.shot.reviewed_at = new Date().toISOString();
    r.shot.reviewed_by = who || null;
    review = null;
  }catch(e){
    r.note = String(e && e.message ? e.message : e); r.noteKind = 'bad';
  }
  busy = false;
  repaint();
}

/* ── Chalk (585): classify a hand-drawn box ──────────────────────────────── */
function renderClassify(){
  var d = review.draft;
  return '<div class="cr-sh-clsheet">' +
    '<label>What is it?</label>' +
    '<div class="cr-sh-defchips">' +
      Object.keys(DEF_LABEL).map(function(k){
        return '<button data-def="' + k + '"' + (d.defect === k ? ' class="on"' : '') +
               ' type="button">' + esc(DEF_LABEL[k]) + '</button>';
      }).join('') +
    '</div>' +
    '<span class="cr-sh-sevseg">' +
      WALK_SEV.map(function(sv){
        return '<button data-dsev="' + sv + '" class="' + (d.severity === sv ? 'on ' + sv : '') +
               '" type="button">' + SEV_LABEL[sv] + '</button>';
      }).join('') +
    '</span>' +
    '<button class="keep" data-act="dkeep" type="button">Keep this mark</button>' +
    '<button class="drop" data-act="ddrop" type="button">Discard</button>' +
  '</div>';
}
function wireClassify(){
  if(!review || !review.draft) return;
  el.querySelectorAll('[data-def]').forEach(function(b){
    b.onclick = function(){ review.draft.defect = b.dataset.def; repaint(); };
  });
  el.querySelectorAll('[data-dsev]').forEach(function(b){
    b.onclick = function(){ review.draft.severity = b.dataset.dsev; repaint(); };
  });
  el.querySelectorAll('[data-act="dkeep"]').forEach(function(b){
    b.onclick = function(){
      var d = review.draft;
      /* A hand-drawn mark: no confidence to fabricate, provenance recorded.
         It joins the working set exactly like an accepted AI mark — the
         579 contract (findings = what a person decided) already covers it. */
      review.list.push({ defect:d.defect, severity:d.severity,
        label:DEF_LABEL[d.defect] || d.defect, note:'', box:d.box,
        confidence:null, edited:true, source:'human' });
      review.sel = review.list.length - 1;
      review.draft = null; review.arming = false; review.dirty = true;
      repaint();
    };
  });
  el.querySelectorAll('[data-act="ddrop"]').forEach(function(b){
    b.onclick = function(){ review.draft = null; repaint(); };
  });
}

/* Drag to move, corner to resize. Same pointer idiom as wireSlider() — capture
   on pointerdown, convert against getBoundingClientRect, clamp exactly the way
   cleanFindings() clamps server-side so a box can never be saved off-frame. */
function wireBoxes(){
  var stage = el.querySelector('[data-rev]');
  if(!stage || !review) return;
  /* 590: in the showroom the circles are evidence to look at, not handles to
     drag. Note there is no arming step for an EXISTING box — pointerdown on
     one moves it immediately — so nothing short of not wiring this at all is
     enough. Returning here also leaves the draft/resize paths unreachable,
     since both start in this same listener. */
  if(showroom) return;
  var drag = null;

  function frac(e){
    var r = stage.getBoundingClientRect();
    if(!r.width || !r.height) return null;
    return { x:(e.clientX - r.left) / r.width, y:(e.clientY - r.top) / r.height };
  }
  stage.addEventListener('pointerdown', function(e){
    var grip = e.target.closest ? e.target.closest('[data-grip]') : null;
    var boxEl = e.target.closest ? e.target.closest('[data-box]') : null;
    /* Armed and not on an existing box: start a chalk draft instead of a
       drag. The draft lives on `review` so it survives repaints. */
    if(review.arming && !boxEl){
      var p0 = frac(e);
      if(!p0) return;
      e.preventDefault();
      try{ stage.setPointerCapture(e.pointerId); }catch(_){}
      drag = { mode:'draw', from:p0 };
      return;
    }
    if(!boxEl) return;
    var i = parseInt((grip || boxEl).dataset[grip ? 'grip' : 'box'], 10);
    var f = review.list[i];
    if(!f) return;
    var p = frac(e);
    if(!p) return;
    e.preventDefault();
    try{ stage.setPointerCapture(e.pointerId); }catch(_){}
    drag = { i:i, mode: grip ? 'size' : 'move', from:p, box:{ x:f.box.x, y:f.box.y, w:f.box.w, h:f.box.h } };
    /* Move the selection by TOGGLING CLASSES, never by repainting. repaint()
       replaces innerHTML, so the element under the finger would be destroyed
       and the pointer capture lost on the first frame of the gesture — build
       578's lesson arriving in a different shape. The full render happens on
       pointerup, where it costs nothing. */
    if(review.sel !== i){
      review.sel = i;
      el.querySelectorAll('[data-box]').forEach(function(x){
        x.classList.toggle('sel', parseInt(x.dataset.box, 10) === i);
      });
      el.querySelectorAll('[data-fnd]').forEach(function(x){
        x.classList.toggle('sel', parseInt(x.dataset.fnd, 10) === i);
      });
    }
  });
  stage.addEventListener('pointermove', function(e){
    if(!drag) return;
    var p = frac(e); if(!p) return;
    if(drag.mode === 'draw'){
      var bx = { x:Math.min(drag.from.x, p.x), y:Math.min(drag.from.y, p.y),
                 w:Math.abs(p.x - drag.from.x), h:Math.abs(p.y - drag.from.y) };
      bx.x = clamp01(bx.x, bx.w); bx.y = clamp01(bx.y, bx.h);
      drag.box = bx;
      var live = el.querySelector('.cr-sh-draft');
      if(!live){
        live = document.createElement('div');
        live.className = 'cr-sh-draft';
        stage.appendChild(live);
      }
      live.style.left = pc(bx.x); live.style.top = pc(bx.y);
      live.style.width = pc(bx.w); live.style.height = pc(bx.h);
      return;
    }
    var f = review.list[drag.i]; if(!f) return;
    var dx = p.x - drag.from.x, dy = p.y - drag.from.y, b = drag.box, n;
    if(drag.mode === 'move'){
      n = { x:clamp01(b.x + dx, b.w), y:clamp01(b.y + dy, b.h), w:b.w, h:b.h };
    }else{
      n = { x:b.x, y:b.y,
            w:Math.max(0.01, Math.min(1 - b.x, b.w + dx)),
            h:Math.max(0.01, Math.min(1 - b.y, b.h + dy)) };
    }
    f.box = n; f.edited = true;
    var live = el.querySelector('[data-box="' + drag.i + '"]');
    if(live){
      live.style.left = pc(n.x); live.style.top = pc(n.y);
      live.style.width = pc(n.w); live.style.height = pc(n.h);
    }
  });
  function stop(){
    if(!drag) return;
    if(drag.mode === 'draw'){
      /* A dot is not a location — same floor cleanFindings() enforces
         server-side. Too small: quietly drop the draft. */
      if(drag.box && drag.box.w > 0.02 && drag.box.h > 0.02){
        review.draft = { box:drag.box, defect:'hail_impact', severity:'crit' };
      }
      drag = null;
      repaint();
      return;
    }
    drag = null; review.dirty = true; repaint();
  }
  stage.addEventListener('pointerup', stop);
  stage.addEventListener('pointercancel', stop);
}
function clamp01(v, size){ return Math.max(0, Math.min(1 - (size || 0), v)); }

/* ── adding photographs ────────────────────────────────────────────────── */
async function addShots(items){
  var cl = sb();
  if(!cl || !curWalk || busy || !items.length) return;
  busy = true;
  try{
    for(var i = 0; i < items.length; i++){
      var it = items[i];
      var id = newId();
      var path = 'walks/' + curWalk.id + '/' + id + '.jpg';
      await putPhoto(cl, it.file, path);
      var ins = await cl.from('walk_shots').insert({
        id: id, walk_id: curWalk.id, path: path,
        source: it.source || 'phone',
        origin_photo_id: it.originId || null,
        sort_order: shots.length + i
      }).select('id');
      if(ins && ins.error) throw new Error(ins.error.message || 'could not add the photograph');
      if(!ins || !ins.data || !ins.data.length) throw new Error('Added nothing — admin only.');
    }
    await loadShots(curWalk.id);
  }catch(e){
    try{ window.crTell(String(e && e.message ? e.message : e)); }catch(_){}
  }
  busy = false;
  repaint();
}
function newId(){
  return (window.crypto && crypto.randomUUID) ? crypto.randomUUID()
       : String(Date.now()) + Math.random().toString(16).slice(2);
}


/* ── pulling photographs off a job ─────────────────────────────────────── */
/* photoDb lives in another block and is a plain var, not a window export, so
   this module queries project_photos itself. That is not duplication for its
   own sake: photoDb's select list has no caption and no path for the inline
   rows, and this picker needs both. */
/* 591: two callers now. The mode is compared with === 'pair' and NOT for
   truthiness, because the walk button is wired `b.onclick = openJobPicker` and
   therefore hands arg 0 a MouseEvent — `mode ||` would silently flip it into
   pair mode. String equality leaves that call site correct without touching it. */
function openJobPicker(mode){
  /* 628: three modes. Still compared with === and never for truthiness — the
     walk button is wired `b.onclick = openJobPicker`, so arg 0 is a MouseEvent
     there and any truthiness test would silently pick the wrong branch. */
  mode = (mode === 'pair' || mode === 'work') ? mode : 'walk';
  if(!amAdmin()) return;
  if(mode === 'walk' && !curWalk) return;
  /* The slots ARE the shape. Everything downstream walks this array —
     drawJobPicker's assignment, the completion test, promoteToPair — so the
     Hall of Fame needed a different array and nothing else. */
  var slots = (mode === 'work') ? ['bad', 'good'] : ['before', 'after'];
  jobPick = { mode:mode, projectId:null, project:null, projects:[], photos:[],
              chosen:{}, roles:{}, slots:slots, q:'', busy:false };
  ensureForm();
  drawJobPicker();
  formEl.classList.add('open');
  loadProjects();
}

async function loadProjects(){
  var cl = sb();
  if(!cl) return;
  var r = await cl.from('projects').select('id,name,address')
                  .order('updated_at', { ascending:false }).limit(300);
  /* Cancel nulls jobPick, deliberately, BEFORE closeForm(). Without this the
     resumed function throws on a null and nobody ever sees it. 579's, not new. */
  if(!jobPick) return;
  jobPick.projects = (r && !r.error && r.data) ? r.data : [];
  /* 627: the Studio tray enters as a PSEUDO-PROJECT rather than as a second
     mode. Everything downstream — chosen{}, roles{}, promoteToPair,
     takeJobPhotos — already works on a list of photos with a storage_path, so
     pointing the existing picker at a different source costs two seams and
     leaves the pair-builder itself untouched. A whole second picker was the
     obvious move and would have been the wrong one; this file has a standing
     rule about one pipeline per concept. */
  /* 628: TWO trays now, because Theo ticks a photo for a reason and the reason
     is either "before and after" or "theirs vs ours". Each appears only when it
     has something in it, and each is offered only to the picker shape that can
     consume it — a Hall of Fame pick cannot become a Showcase pair by accident. */
  try{
    var want = (jobPick.mode === 'work') ? 'workmanship' : 'showcase';
    var tc = await cl.from('studio_tray')
                     .select('storage_path', { count:'exact', head:true })
                     .eq('bucket', want);
    var tn = (tc && tc.count) || 0;
    if(!jobPick) return;
    if(tn) jobPick.projects.unshift({ id:TRAY_ID,
      name: (want === 'workmanship') ? '\u2605 Studio tray \u2014 hall of fame'
                                     : '\u2605 Studio tray',
      address: tn + ' photo' + (tn === 1 ? '' : 's') + ' picked in Studio' });
  }catch(_){ /* a missing tray must never break the ordinary job picker */ }
  if(!jobPick) return;
  drawJobPicker();
}

/* 627: not a real project id, and deliberately unlike one. */
var TRAY_ID = '__studio_tray__';

/* The tray's rows are shaped into what the picker already expects — a
   storage_path plus a signed _thumb. `width` rides along so the picker can warn
   about a photo too small for the compare card: the archive averages 1138px and
   only 40% of it clears 1400, while the card wants 1224 device pixels at 2x. */
async function loadTrayPhotos(){
  var cl = sb();
  if(!cl || !jobPick) return;
  /* 628: the bucket is taken from the picker's own shape rather than passed in,
     so the two can never disagree about which tray is on screen. */
  var want = (jobPick.mode === 'work') ? 'workmanship' : 'showcase';
  var r = await cl.from('studio_tray')
                  .select('storage_path,project_address,project_name,width,height,added_at,bucket')
                  .eq('bucket', want)
                  .order('added_at', { ascending:false }).limit(300);
  if(!jobPick) return;
  var rows = (r && !r.error && r.data) ? r.data : [];
  var paths = rows.map(function(p){ return p.storage_path; }).filter(Boolean);
  var map = {};
  if(paths.length && typeof window.signedPhotoMap === 'function'){
    try{ map = await window.signedPhotoMap(paths, 3600) || {}; }catch(_){}
  }
  rows.forEach(function(p){
    p.id = p.storage_path;
    p._thumb = map[p.storage_path] || '';
    p._small = (p.width || 0) < 1400;
  });
  if(!jobPick) return;   /* the signing round trip is the one worth cancelling */
  jobPick.photos = rows.filter(function(p){ return p._thumb; });
  jobPick.busy = false;
  drawJobPicker();
}

async function loadJobPhotos(pid){
  var cl = sb();
  if(!cl || !jobPick) return;
  jobPick.projectId = pid; jobPick.photos = []; jobPick.chosen = {}; jobPick.roles = {};
  jobPick.busy = true;
  /* 627: the tray is not in `projects`, so the row-keeping below would find
     nothing and jobPick.project stays null — which is correct. A tray photo has
     no job address to prefill, and inventing one would be worse than leaving
     the field empty for Theo to type. */
  if(pid === TRAY_ID){ await loadTrayPhotos(); return; }
  /* 591: keep the row. The pair prefill needs projects.address and the id, and
     both are already sitting in jobPick.projects — refetching would be a second
     source of truth for the same fact. */
  jobPick.project = null;
  for(var pi = 0; pi < jobPick.projects.length; pi++){
    if(jobPick.projects[pi].id === pid){ jobPick.project = jobPick.projects[pi]; break; }
  }
  drawJobPicker();
  var r = await cl.from('project_photos')
                  .select('id,project_id,data,storage_path,caption,created_at')
                  .eq('project_id', pid).order('created_at', { ascending:true });
  if(!jobPick) return;
  var rows = (r && !r.error && r.data) ? r.data : [];
  /* MEASURED, not assumed: 183 of 196 project_photos rows carry a
     storage_path; the other 13 are inline base64 data: URIs with no storage
     object at all. Both are real photographs and both belong in this picker —
     dropping the inline ones would lose one photo in fifteen silently. */
  var paths = rows.map(function(p){ return p.storage_path; }).filter(Boolean);
  var map = {};
  if(paths.length && typeof window.signedPhotoMap === 'function'){
    try{ map = await window.signedPhotoMap(paths, 3600) || {}; }catch(_){}
  }
  rows.forEach(function(p){
    p._thumb = p.storage_path ? (map[p.storage_path] || '')
             : (String(p.data || '').slice(0,5) === 'data:' ? p.data : '');
  });
  if(!jobPick) return;   /* the signing round trip is the one worth cancelling */
  jobPick.photos = rows.filter(function(p){ return p._thumb; });
  jobPick.busy = false;
  drawJobPicker();
}

function drawJobPicker(){
  if(!jobPick) return;
  var j = jobPick;
  var chosenN = Object.keys(j.chosen).length;
  var body;
  if(!j.projectId){
    var q = j.q.toLowerCase();
    var list = j.projects.filter(function(p){
      return !q || String(p.name || '').toLowerCase().indexOf(q) !== -1
                || String(p.address || '').toLowerCase().indexOf(q) !== -1;
    }).slice(0, 40);
    body = '<label>Which job</label>' +
      '<input type="text" data-jq placeholder="Name or address" value="' + esc(j.q) + '">' +
      (j.projects.length
        ? list.map(function(p){
            return '<button class="cr-sh-wlk" data-proj="' + esc(p.id) + '" type="button">' +
              '<div class="t"><b>' + esc(p.name) + '</b>' +
              '<span>' + esc(p.address || 'No address') + '</span></div></button>';
          }).join('') || '<p class="cr-sh-note">Nothing matches that.</p>'
        : '<p class="cr-sh-note">Loading jobs…</p>');
  }else if(j.busy){
    body = '<p class="cr-sh-note">Loading photographs…</p>';
  }else if(!j.photos.length){
    body = '<p class="cr-sh-note">That job has no photographs.</p>' +
           '<button class="cr-sh-btn ghost" data-jback type="button">← Another job</button>';
  }else if(j.mode === 'pair'){
    var taken = {};
    j.slots.forEach(function(k){ if(j.roles[k] != null) taken[j.roles[k]] = k; });
    var allFull = j.slots.every(function(k){ return j.roles[k] != null; });
    body = '<div class="cr-sh-bar">' +
        '<button class="cr-sh-btn ghost" data-jback type="button">← Another job</button>' +
        (j.slots.length < 3
          ? '<button class="cr-sh-btn ghost" data-jbuild type="button">+ During the build</button>'
          : '') +
      '</div>' +
      '<div class="cr-sh-slots">' +
        j.slots.map(function(k){
          var idx = j.roles[k];
          var ph = idx != null ? j.photos[idx] : null;
          return '<button class="cr-sh-slot' + (ph ? ' full' : '') + '" data-jslot="' + k + '" type="button">' +
            (ph ? '<img alt="" src="' + esc(ph._thumb) + '">' : '') +
            '<span class="t"><span class="k">' + esc(defSlot(k)) + '</span>' +
            '<span class="v">' + (ph ? 'tap to clear' : 'tap a photo below') + '</span></span>' +
          '</button>';
        }).join('') +
      '</div>' +
      '<div class="cr-sh-pick">' +
        j.photos.map(function(p, i){
          var role = taken[i];
          var cls = role ? ' class="on role"' : (allFull ? ' class="dim"' : '');
          return '<button data-jp="' + i + '" type="button"' + cls + '>' +
            '<img alt="" loading="lazy" src="' + esc(p._thumb) + '">' +
            (role ? '<span class="rl">' + esc(defSlot(role)) + '</span>' : '') +
          '</button>';
        }).join('') +
      '</div>';
  }else{
    body = '<div class="cr-sh-bar">' +
        '<button class="cr-sh-btn ghost" data-jback type="button">← Another job</button>' +
      '</div>' +
      '<div class="cr-sh-pick">' +
        j.photos.map(function(p, i){
          return '<button data-jp="' + i + '" type="button"' + (j.chosen[i] ? ' class="on"' : '') + '>' +
            '<img alt="" loading="lazy" src="' + esc(p._thumb) + '"></button>';
        }).join('') +
      '</div>';
  }
  var pair = jobPick.mode === 'pair';
  /* In pair mode the gate is BOTH required slots, not a count. Enabling at one
     pick would push the failure down to savePair's 'a before and an after are
     both needed' — a late error where an early disable is honest. */
  var ready = pair
    ? jobPick.slots.every(function(k){ return k === 'build' || jobPick.roles[k] != null; })
    : chosenN > 0;
  formEl.innerHTML =
    '<div class="bx">' +
      '<h3>' + (pair ? 'Build a pair from a job' : 'Add from a job') + '</h3>' + body +
      '<div class="err" data-err></div>' +
      '<p class="note">' + (pair
        ? 'The photographs are copied into the Showcase rather than linked, so the ' +
          'pair survives whatever happens to the job they came from. You fill in the ' +
          'rest on the next screen.'
        : 'The photograph is copied into this walk rather than linked. ' +
          'Deleting it from the job later would otherwise blank the walk — in front of a client.') +
      '</p>' +
      '<div class="ft">' +
        /* 598: only in pair mode. openForm() is the SHOWCASE pair form, so
           offering it from the walk-photo picker would send you to the wrong
           screen entirely. `pair` is the flag the rest of this function already
           branches on. */
        (pair
          ? '<button class="cr-sh-btn ghost" data-jupload type="button">Upload instead</button>'
          : '') +
        '<button class="cr-sh-btn ghost" data-act="cancel" type="button">Cancel</button>' +
        '<button class="cr-sh-btn" data-jadd type="button"' + (ready ? '' : ' disabled') + '>' +
          (pair ? 'Use these' : (chosenN ? 'Add ' + chosenN : 'Add')) + '</button>' +
      '</div>' +
    '</div>';
  wireJobPicker();
}

function wireJobPicker(){
  var qi = formEl.querySelector('[data-jq]');
  if(qi) qi.oninput = function(){
    jobPick.q = qi.value;
    var at = qi.selectionStart;
    drawJobPicker();
    var again = formEl.querySelector('[data-jq]');
    if(again){ again.focus(); try{ again.setSelectionRange(at, at); }catch(_){} }
  };
  formEl.querySelectorAll('[data-proj]').forEach(function(b){
    b.onclick = function(){ loadJobPhotos(b.dataset.proj); };
  });
  var up = formEl.querySelector('[data-jupload]');
  if(up) up.onclick = function(){ jobPick = null; openForm(); };
  var back = formEl.querySelector('[data-jback]');
  if(back) back.onclick = function(){
    jobPick.projectId = null; jobPick.photos = []; jobPick.chosen = {};
    jobPick.roles = {}; jobPick.project = null; drawJobPicker();
  };
  var bld = formEl.querySelector('[data-jbuild]');
  if(bld) bld.onclick = function(){
    if(jobPick.slots.indexOf('build') === -1) jobPick.slots.push('build');
    drawJobPicker();
  };
  formEl.querySelectorAll('[data-jslot]').forEach(function(b){
    b.onclick = function(){ delete jobPick.roles[b.dataset.jslot]; drawJobPicker(); };
  });
  formEl.querySelectorAll('[data-jp]').forEach(function(b){
    b.onclick = function(){
      /* dataset is a STRING. roles stores the index as a VALUE, so `=== i` would
         be 0 === '0' — false, and wrong on the FIRST tile in the grid. */
      var i = parseInt(b.dataset.jp, 10);
      if(jobPick.mode === 'pair'){
        var held = null;
        jobPick.slots.forEach(function(k){ if(jobPick.roles[k] === i) held = k; });
        if(held){ delete jobPick.roles[held]; }
        else{
          var open = null;
          for(var s = 0; s < jobPick.slots.length; s++){
            if(jobPick.roles[jobPick.slots[s]] == null){ open = jobPick.slots[s]; break; }
          }
          if(open === null) return;   /* full: inert, matching the dimmed tile */
          jobPick.roles[open] = i;
        }
      }else{
        if(jobPick.chosen[i]) delete jobPick.chosen[i]; else jobPick.chosen[i] = true;
      }
      drawJobPicker();
    };
  });
  var add = formEl.querySelector('[data-jadd]');
  if(add) add.onclick = (jobPick.mode === 'pair') ? promoteToPair : takeJobPhotos;
  var c = formEl.querySelector('[data-act="cancel"]');
  if(c) c.onclick = function(){ jobPick = null; closeForm(); };
}

/* Copy the bytes, do not reference the path. Two reasons, both measured:
   thirteen job photos have no storage object to reference at all, and deleting
   a job photo in the app also removes the storage object. See walks_schema.sql. */
/* 591: extracted so the walk and the pair share ONE blob decoder. Two of them
   would eventually disagree about the inline rows — which are 13 of 196, i.e.
   exactly the population an untested second copy would drop. */
async function jobFiles(picks){
  var items = [];
  for(var i = 0; i < picks.length; i++){
    var p = picks[i], blob;
    if(p.storage_path){
      blob = await shotBlob(p.storage_path);
    }else{
      /* An inline data: URI resolves with no network — fetch is the shortest
         correct way to turn one into a Blob. */
      blob = await (await fetch(p.data)).blob();
    }
    items.push({ file:new File([blob], 'job.jpg', { type:'image/jpeg' }),
                 source:'job', originId:p.id });
  }
  return items;
}

/* 628: 'bad' and 'good' are the column names in workmanship_pairs and they are
   the wrong words to put in front of Theo mid-pick. "Theirs" and "Ours" is how
   he described the comparison in the first place. */
function defSlot(k){
  if(k === 'build') return 'During';
  if(k === 'bad') return 'Theirs';
  if(k === 'good') return 'Ours';
  return k;
}

/* Pull a city off a job address. MEASURED against the 12 projects that actually
   have photographs, because the shape is nothing like a tidy CSV:

     3710 west third Dayton Ohio 45417        231 Delaware  Ave Dayton Ohio 46405
     3800 klepinger rd  dayton ohio46416      948 Huron            921 Testing Way
     449 Harriet, Dayton, OH 45417   <- the ONLY comma form among the twelve

   A comma split scores 1 of 12. This peels from the right instead: zip, then
   state, then take the last token as the city — 10 right, 2 correctly blank,
   0 wrong. It DECLINES rather than guesses, and whatever it returns lands in an
   editable field with the source string shown beside it.

   Never derive the city from the zip here: half these rows carry Indiana zips
   (464xx) on addresses that say Dayton, Ohio. The zip is the wrong oracle. */
function splitAddr(raw){
  /* `orig` keeps the record's own spacing. The provenance line quotes it, and
     provenance that silently tidies what it quotes is not provenance. Parsing
     still runs on the normalised copy. */
  var orig = String(raw || '').trim();
  var s = orig.replace(/\s+/g, ' ');
  if(!s) return { address:'', city:'', raw:'' };
  if(s.indexOf(',') !== -1){
    var parts = s.split(',').map(function(x){ return x.trim(); }).filter(Boolean);
    if(parts.length >= 2 && !/^(oh|ohio|in|indiana|ky|kentucky|mi|michigan)\b/i.test(parts[1])){
      return { address:parts[0], city:parts[1], raw:orig };
    }
    return { address:parts[0] || s, city:'', raw:orig };
  }
  var body = s, hit = false;
  /* no required space before the digits — 'ohio46416' is real data */
  var z = body.replace(/\s*\d{5}(?:-\d{4})?$/, '');
  if(z !== body){ body = z; hit = true; }
  var st = body.replace(/\s*\b(oh|ohio|in|indiana|ky|kentucky|mi|michigan)$/i, '');
  if(st !== body){ body = st; hit = true; }
  if(!hit) return { address:s, city:'', raw:orig };
  var tok = body.trim().split(' ').filter(Boolean);
  /* peeling a city has to leave a street behind, or it was never a city */
  if(tok.length < 3) return { address:s, city:'', raw:orig };
  var city = tok.pop();
  if(city === city.toLowerCase()) city = city.charAt(0).toUpperCase() + city.slice(1);
  return { address:tok.join(' '), city:city, raw:orig };
}

/* Copy the two (or three) picks, then hand the ordinary pair form the bytes and
   the prefill. Deliberately NOT a second save path: savePair already carries the
   release rule, the score clamp and the RLS silent-204 check. */
async function promoteToPair(){
  if(!jobPick || busy) return;
  var cl = sb();
  if(!cl) return;
  var slots = jobPick.slots.slice();
  var picks = [], keys = [];
  slots.forEach(function(k){
    var i = jobPick.roles[k];
    if(i != null && jobPick.photos[i]){ keys.push(k); picks.push(jobPick.photos[i]); }
  });
  /* 628: was a hardcoded before/after test. The rule is the same one the Use
     these button already enforces — every slot filled except `build`, which is
     the only optional one — so it now reads off jobPick.slots and covers both
     shapes rather than naming one. */
  var missing = jobPick.slots.some(function(k){
    return k !== 'build' && keys.indexOf(k) === -1;
  });
  if(missing) return;
  var toWork = (jobPick.mode === 'work');
  var btn = formEl.querySelector('[data-jadd]');
  if(btn){ btn.disabled = true; btn.textContent = 'Copying\u2026'; }
  /* busy is NOT taken here. takeJobPhotos does not take it either — addShots
     does. If the copy threw before a finally the module would wedge, and the
     wedge is invisible by construction: savePair's first line is `if(busy)
     return;`, which returns before it can write into [data-err]. */
  var proj = jobPick.project, pid = jobPick.projectId;
  try{
    var items = await jobFiles(picks);
    var byRole = {}, thumbs = {};
    keys.forEach(function(k, n){ byRole[k] = items[n].file; thumbs[k] = picks[n]._thumb; });
    var split = splitAddr(proj && proj.address);
    jobPick = null;
    /* Both forms clear `pending` as their first act, so the open must run FIRST.
       628 gave openWorkForm the same clear — it did not have one, and the moment
       saveWork started preferring carried files that omission would have uploaded
       the previous pick's photographs under a new comparison's name, silently.
       Exactly the failure the 591 comment on openForm describes. */
    if(toWork){
      openWorkForm();
      pending = { bad:byRole.bad, good:byRole.good, slots:['bad','good'],
                  thumbs:thumbs, projectId:pid };
    }else{
      openForm();
      pending = { before:byRole.before, after:byRole.after, build:byRole.build || null,
                  slots:['before','after','build'],
                  thumbs:thumbs, projectId:pid, address:split.address, city:split.city,
                  raw:split.raw };
    }
    paintPrefill();
  }catch(e){
    showErr(String(e && e.message ? e.message : e));
    if(btn){ btn.disabled = false; btn.textContent = 'Use these'; }
  }
}

/* Put the guess on screen WITH the string it came from. A guess that shows its
   source is auditable; a guess that hides it is a lie the client reads off the
   placard later. Nothing here is readonly — editable-with-provenance beats
   locked-with-confidence. */
function paintPrefill(){
  if(!pending || !formEl) return;
  var set = function(k, v){
    var i = formEl.querySelector('[data-f="' + k + '"]');
    if(i && v) i.value = v;
  };
  /* The three file inputs are a lie in this mode: they read 'No file chosen'
     while two photographs ARE chosen, and anything attached to them would be
     ignored because savePair prefers the carried files. Show what was picked
     instead. Thumbs are the picker's already-loaded URLs, so no object URL is
     minted here and none leaks. */
  var strip = document.createElement('div');
  strip.className = 'cr-sh-from';
  /* 628: the shape rides along on `pending` instead of being assumed here. */
  (pending.slots || ['before','after','build']).forEach(function(k){
    var inp = formEl.querySelector('[data-f="' + k + '"]');
    if(!inp) return;
    var lab = inp.previousElementSibling;
    if(lab && lab.tagName === 'LABEL') lab.style.display = 'none';
    inp.style.display = 'none';
    if(!pending[k]) return;
    var fig = document.createElement('figure');
    fig.innerHTML = '<img alt="" src="' + esc((pending.thumbs && pending.thumbs[k]) || '') + '">' +
      '<figcaption>' + esc(defSlot(k)) + '</figcaption>';
    strip.appendChild(fig);
  });
  var first = formEl.querySelector('.bx > h3');
  if(first && strip.childNodes.length) first.parentNode.insertBefore(strip, first.nextSibling);
  /* A Hall of Fame comparison has no address field — and should not: the bad
     side is somebody else's roof and naming it is not our business. */
  if(!pending.address && !pending.city) return;
  set('address', pending.address);
  set('city', pending.city);
  var host = formEl.querySelector('[data-f="city"]');
  host = host && host.parentNode && host.parentNode.parentNode;
  if(host && pending.raw){
    var p = document.createElement('p');
    p.className = 'cr-sh-prov';
    p.innerHTML = 'Filled in from <b>' + esc(pending.raw) + '</b>' +
      (pending.city ? ' \u2014 check the city.' : ' \u2014 no city in it; add one.');
    host.parentNode.insertBefore(p, host.nextSibling);
  }
}

async function takeJobPhotos(){
  if(!jobPick || busy) return;
  var cl = sb();
  var picks = Object.keys(jobPick.chosen).map(function(i){ return jobPick.photos[i]; }).filter(Boolean);
  if(!picks.length || !cl) return;
  var btn = formEl.querySelector('[data-jadd]');
  if(btn){ btn.disabled = true; btn.textContent = 'Copying…'; }
  try{
    var items = await jobFiles(picks);
    jobPick = null;
    closeForm();
    await addShots(items);
  }catch(e){
    showErr(String(e && e.message ? e.message : e));
    if(btn){ btn.disabled = false; btn.textContent = 'Add'; }
  }
}

/* ── admin: a walk ─────────────────────────────────────────────────────── */
function openWalkForm(){
  if(!amAdmin()) return;
  ensureForm();
  /* 1076: prefilled from the job when the job door opened this.
     `projects` has no city column - one `address` string holds the lot -
     so street and city are split off the commas the same way qiAddr builds one
     back up.  Both land in EDITABLE fields: a wrong guess costs one tap, and
     leaving them blank costs Theo typing an address the job already knows. */
  var pp = pendingProject;
  var _bits = String((pp && pp.address) || '').split(',')
                .map(function(s){ return s.trim(); })
                .filter(Boolean);
  var pStreet = _bits.length ? _bits[0] : '';
  var pCity   = _bits.length > 2 ? _bits[1] : '';
  var pTitle  = pp ? [(pp.name || ''), pStreet].filter(Boolean).join(' — ') : '';
  formEl.innerHTML =
    '<div class="bx">' +
      '<h3>Start a walk</h3>' +
      (pp ? '<p class="note">On <b>' + esc(pp.name || pStreet || 'this job') +
            '</b>. It stays attached to that job.</p>' : '') +
      '<label>What to call it</label>' +
      '<input type="text" data-f="title" value="' + esc(pTitle) + '" placeholder="4212 Wilmington Pike — hail">' +
      '<label>Address</label><input type="text" data-f="address" value="' + esc(pStreet) + '" placeholder="4212 Wilmington Pike">' +
      '<div class="r2"><div><label>City</label><input type="text" data-f="city" value="' + esc(pCity) + '" placeholder="Dayton"></div>' +
        '<div><label>Trade</label><select data-f="trade">' +
          TRADES.map(function(t){ return '<option value="' + t + '">' + esc(TRADE_LABEL[t]) + '</option>'; }).join('') +
        '</select></div></div>' +
      '<label>Notes</label><input type="text" data-f="notes" placeholder="Anything worth remembering">' +
      '<div class="err" data-err></div>' +
      '<p class="note">Add photographs next. The AI marks what it thinks is damage and ' +
        'nothing is shown to anyone until you have been through every mark.</p>' +
      '<div class="ft">' +
        '<button class="cr-sh-btn ghost" data-act="cancel" type="button">Cancel</button>' +
        '<button class="cr-sh-btn" data-act="save" type="button">Start</button>' +
      '</div>' +
    '</div>';
  formEl.classList.add('open');
  formEl.querySelector('[data-act="cancel"]').onclick = closeForm;
  formEl.querySelector('[data-act="save"]').onclick = saveWalk;
}

async function saveWalk(){
  if(busy) return;
  var cl = sb();
  if(!cl) return showErr('Not signed in.');
  var get = function(k){ var i = formEl.querySelector('[data-f="' + k + '"]'); return i ? i.value.trim() : ''; };
  var title = get('title') || get('address');
  if(!title) return showErr('Give it a name — it is the heading on the card.');
  var btn = formEl.querySelector('[data-act="save"]');
  busy = true; btn.disabled = true; btn.textContent = 'Starting…';
  try{
    var who = '';
    try{
      var u = await cl.auth.getUser();
      who = (u && u.data && u.data.user && u.data.user.email) || '';
    }catch(_){}
    var id = newId();
    var ins = await cl.from('walks').insert({
      id:id, title:title, address:get('address') || null, city:get('city') || null,
      trade:get('trade') || null, notes:get('notes') || null,
      /* 1076: the column has been on `walks` - with its own index - since the
         schema shipped, and nothing has ever written it, so every walk made
         through this form was orphaned from its job.  Measured before this
         landed: 0 rows in `walks`, so there is nothing to backfill. */
      project_id: (pendingProject && pendingProject.id) || null,
      created_by: who || null, published:true
    }).select('id');
    if(ins && ins.error) throw new Error(ins.error.message || 'could not save');
    if(!ins || !ins.data || !ins.data.length) throw new Error('Saved nothing — admin only.');
    closeForm();
    walksLoaded = false;
    await loadWalks();
    curWalk = walks.filter(function(w){ return String(w.id) === String(id); })[0] || null;
    if(curWalk) await loadShots(curWalk.id);
  }catch(e){
    showErr(String(e && e.message ? e.message : e));
  }finally{
    busy = false;
    if(btn){ btn.disabled = false; btn.textContent = 'Start'; }
    repaint();
  }
}

async function toggleWalkPublish(){
  var cl = sb();
  if(!cl || !curWalk || busy) return;
  busy = true;
  try{
    var r = await cl.from('walks').update({ published: !curWalk.published, updated_at:new Date().toISOString() })
                    .eq('id', curWalk.id).select('id');
    if(r && !r.error && r.data && r.data.length) curWalk.published = !curWalk.published;
  }catch(_){}
  busy = false;
  repaint();
}

async function removeWalk(){
  var cl = sb();
  if(!cl || !curWalk || busy) return;
  if(!await crAsk('Remove this walk and every photograph in it?')) return;
  busy = true;
  try{
    /* .select('id') is load-bearing: a delete refused by RLS is a silent 204.
       walk_shots go with it through the on delete cascade. */
    var r = await cl.from('walks').delete().eq('id', curWalk.id).select('id');
    if(r && !r.error && r.data && r.data.length){
      walks = walks.filter(function(w){ return String(w.id) !== String(curWalk.id); });
      curWalk = null; shots = []; review = null;
    }
  }catch(_){}
  busy = false;
  repaint();
}

/* ── wiring ────────────────────────────────────────────────────────────── */
function wireWalk(){
  el.querySelectorAll('[data-walk]').forEach(function(b){
    b.onclick = function(){
      curWalk = walks[parseInt(b.dataset.walk, 10)] || null;
      review = null;
      repaint();
      if(curWalk) loadShots(curWalk.id).then(repaint, repaint);
    };
  });
  el.querySelectorAll('[data-act="present"]').forEach(function(b){ b.onclick = openPresent; });
  wirePresent();
  el.querySelectorAll('[data-act="wback"]').forEach(function(b){
    b.onclick = function(){ curWalk = null; shots = []; review = null; repaint(); };
  });
  /* 1076: a wrapper for the same reason 628 wrote one on waddjob, plus one
     more.  Arg 0 is harmless here, but this button must also CLEAR any job
     carried in from the job door - otherwise Start a walk on the Showcase
     silently attaches the next walk to whatever job was opened an hour ago. */
  el.querySelectorAll('[data-act="waddwalk"]').forEach(function(b){
    b.onclick = function(){ pendingProject = null; openWalkForm(); };
  });
  el.querySelectorAll('[data-act="wjob"]').forEach(function(b){ b.onclick = openJobPicker; });
  el.querySelectorAll('[data-act="wpub"]').forEach(function(b){ b.onclick = toggleWalkPublish; });
  el.querySelectorAll('[data-act="wdelwalk"]').forEach(function(b){ b.onclick = removeWalk; });

  var fi = el.querySelector('[data-wfile]');
  el.querySelectorAll('[data-act="wphone"]').forEach(function(b){
    b.onclick = function(){ if(fi) fi.click(); };
  });
  if(fi) fi.onchange = function(){
    var files = Array.prototype.slice.call(fi.files || []);
    fi.value = '';
    if(files.length) addShots(files.map(function(f){ return { file:f, source:'phone' }; }));
  };

  el.querySelectorAll('[data-shot]').forEach(function(b){
    b.onclick = function(){
      var s = shots[parseInt(b.dataset.shot, 10)];
      if(!s) return;
      /* Re-open on what was SAVED, so a second visit edits the accepted set
         rather than starting from a blank overlay. */
      review = { shot:s, list:(s.findings || []).map(function(f){ return JSON.parse(JSON.stringify(f)); }),
                 sel:(s.findings || []).length ? 0 : -1, note:'', noteKind:'', dirty:false };
      repaint();
      if(!s.reviewed_at && !review.list.length) runDetect();
    };
  });

  el.querySelectorAll('[data-act="rback"]').forEach(function(b){
    b.onclick = async function(){
      if(review.dirty && !await crAsk('Discard the changes you have not saved?')) return;
      review = null; repaint();
    };
  });
  el.querySelectorAll('[data-act="rmark"]').forEach(function(b){
    b.onclick = function(){ review.arming = !review.arming; review.draft = null; repaint(); };
  });
  wireClassify();
  el.querySelectorAll('[data-act="rdetect"]').forEach(function(b){
    b.onclick = async function(){
      if(review.dirty && !await crAsk('Asking again replaces the AI\u2019s marks — your hand-drawn marks stay — ' +
        'discard the changes you have not saved?')) return;
      runDetect();
    };
  });
  el.querySelectorAll('[data-act="rsave"]').forEach(function(b){ b.onclick = saveReview; });
  el.querySelectorAll('[data-drop]').forEach(function(b){
    b.onclick = function(){
      var i = parseInt(b.dataset.drop, 10);
      review.list.splice(i, 1);
      if(review.sel >= review.list.length) review.sel = review.list.length - 1;
      review.dirty = true;
      repaint();
    };
  });
  el.querySelectorAll('[data-sev]').forEach(function(s){
    s.onchange = function(){
      var f = review.list[parseInt(s.dataset.sev, 10)];
      if(f){ f.severity = s.value; f.edited = true; review.dirty = true; repaint(); }
    };
  });
  el.querySelectorAll('[data-fnd]').forEach(function(d){
    d.onclick = function(e){
      if(e.target.closest('button') || e.target.closest('select')) return;
      review.sel = parseInt(d.dataset.fnd, 10);
      repaint();
    };
  });
  wireBoxes();
}


/* ── Spotlight — present mode (584) ────────────────────────────────────────
   One finding at a time, in front of the homeowner. Steps are flattened
   across the walk's reviewed shots: every accepted finding is one step, and
   the photograph swaps when the step crosses into the next shot. Only
   reviewed_at-stamped shots with findings enter — the 579 contract means
   anything shown here has been through a person's hands, with no filtering
   logic to get wrong. The caption is label/note/severity only; the address
   never appears, so privacy mode has nothing to leak. */
var pres = null;   // { steps:[{shot,f}], i } while presenting

function presentable(){
  return shots.filter(function(s){ return s.reviewed_at && (s.findings || []).length; });
}
function openPresent(){
  var ok = presentable();
  if(!ok.length) return;
  var steps = [];
  ok.forEach(function(s){ (s.findings || []).forEach(function(f){ steps.push({ shot:s, f:f }); }); });
  pres = { steps:steps, i:0 };
  el.classList.add('presenting');
  repaint();
}
function exitPresent(){
  pres = null;
  if(el) el.classList.remove('presenting');
}

var PR_SEV = { crit:['CRITICAL','#E5484D'], warn:['WORTH NOTING','#E8A33D'], ok:['SOUND','#46A758'] };

function renderPresent(){
  var st = pres.steps[pres.i], f = st.f, b = f.box || { x:0, y:0, w:0, h:0 };
  var sev = PR_SEV[f.severity] || PR_SEV.ok;
  var cx = (b.x + b.w/2)*100, cy = (b.y + b.h/2)*100;
  /* The FULL rendition, not the display copy — this is the surface the
     3840px files exist for. */
  var img = signed[st.shot.path] || srcD(st.shot.path) || '';
  return '<div class="cr-sh-pres">' +
    '<div class="cr-sh-pr-segs">' +
      pres.steps.map(function(_, k){
        return '<i' + (k <= pres.i ? ' class="done"' : '') + '></i>';
      }).join('') +
    '</div>' +
    '<span class="cr-sh-pr-n">' + (pres.i+1) + ' / ' + pres.steps.length + '</span>' +
    '<button class="cr-sh-pr-x" data-act="prx" type="button" aria-label="End the walkthrough">\u2715</button>' +
    '<div class="cr-sh-pr-photo"><img alt="" src="' + esc(img) + '"></div>' +
    '<div class="cr-sh-pr-veil" style="background:radial-gradient(circle 150px at ' +
      cx.toFixed(2) + '% ' + cy.toFixed(2) + '%,transparent 0 90px,rgba(3,4,6,.6) 145px,rgba(3,4,6,.94) 300px)"></div>' +
    '<div class="cr-sh-pr-ring" style="left:' + (b.x*100).toFixed(3) + '%;top:' + (b.y*100).toFixed(3) +
      '%;width:' + (b.w*100).toFixed(3) + '%;height:' + (b.h*100).toFixed(3) +
      '%;border-color:' + sev[1] + ';box-shadow:0 0 0 1px rgba(0,0,0,.6),0 0 34px ' + sev[1] + '88"></div>' +
    '<div class="cr-sh-pr-zone" style="left:0;width:33%" data-prgo="-1"></div>' +
    '<div class="cr-sh-pr-zone" style="right:0;width:67%" data-prgo="1"></div>' +
    '<div class="cr-sh-pr-cap">' +
      '<span class="cr-sh-pr-sev" style="color:' + sev[1] + ';border-color:' + sev[1] + '99">' + sev[0] + '</span>' +
      '<h3>' + esc(f.label || defLabel(f.defect)) + '</h3>' +
      (f.note ? '<p>' + esc(f.note) + '</p>' : '') +
    '</div>' +
  '</div>';
}

function wirePresent(){
  el.querySelectorAll('[data-act="prx"]').forEach(function(b){
    b.onclick = function(){ exitPresent(); repaint(); };
  });
  el.querySelectorAll('[data-prgo]').forEach(function(z){
    z.onclick = function(){
      var n = pres.i + parseInt(z.dataset.prgo, 10);
      /* Story mechanics: back on the first step stays; forward past the last
         step ends the show — the homeowner has seen everything. */
      if(n < 0) return;
      if(n >= pres.steps.length){ exitPresent(); repaint(); return; }
      pres.i = n;
      repaint();
    };
  });
}


/* ── The Lens (586) ────────────────────────────────────────────────────────
   A self-contained overlay appended to the module root, outside the body
   slot: repaint() leaves it alone; render() (tab switches, navigation)
   removes it, which is the correct close. Pinch is two-pointer distance on
   the same pointer-capture idiom as wireSlider(); pan clamps to the frame;
   double-tap toggles 2.5x at the tap point. */
var lensEl = null;

function exitLens(){
  if(lensEl && lensEl.parentNode) lensEl.parentNode.removeChild(lensEl);
  lensEl = null;
}

function openLens(opts){
  exitLens();
  ensure();
  var url = signed[opts.path] || srcD(opts.path) || '';
  if(!url) return;
  lensEl = document.createElement('div');
  lensEl.className = 'cr-sh-lens';
  lensEl.innerHTML =
    '<div class="w">' +
      '<img alt="" src="' + esc(url) + '">' +
      (opts.boxes || []).map(function(f){
        var b = f.box || { x:0, y:0, w:0, h:0 };
        return '<div class="cr-sh-ln-box ' + esc(f.severity) + '" style="left:' + pc(b.x) +
               ';top:' + pc(b.y) + ';width:' + pc(b.w) + ';height:' + pc(b.h) + '"></div>';
      }).join('') +
    '</div>' +
    '<div class="cr-sh-ln-top"><b>' + esc(opts.cap || '') + '</b></div>' +
    '<button class="cr-sh-ln-x" type="button" aria-label="Close">\u2715</button>' +
    '<div class="cr-sh-ln-btns">' +
      '<button data-lz="in" type="button" aria-label="Zoom in">+</button>' +
      '<button data-lz="out" type="button" aria-label="Zoom out">\u2212</button>' +
    '</div>' +
    '<span class="cr-sh-ln-zc">1.0\u00d7</span>' +
    '<span class="cr-sh-ln-hint">pinch \u00b7 drag \u00b7 double-tap</span>';
  el.appendChild(lensEl);

  var world = lensEl.querySelector('.w');
  var zc = lensEl.querySelector('.cr-sh-ln-zc');
  var s = 1, tx = 0, ty = 0, ptrs = {}, lastDist = 0, lastTap = 0;

  function apply(){
    var r = lensEl.getBoundingClientRect();
    var maxX = (s - 1) * r.width, maxY = (s - 1) * r.height;
    tx = Math.min(0, Math.max(-maxX, tx));
    ty = Math.min(0, Math.max(-maxY, ty));
    world.style.transform = 'translate(' + tx + 'px,' + ty + 'px) scale(' + s + ')';
    zc.textContent = s.toFixed(1) + '\u00d7';
  }
  function zoomAt(f, cx, cy){
    var r = lensEl.getBoundingClientRect();
    var ns = Math.max(1, Math.min(5, s * f));
    var px = (cx - r.left - tx) / s, py = (cy - r.top - ty) / s;
    tx = cx - r.left - px * ns; ty = cy - r.top - py * ns; s = ns;
    apply();
  }
  lensEl.addEventListener('pointerdown', function(e){
    if(e.target.closest('.cr-sh-ln-btns') || e.target.closest('.cr-sh-ln-x')) return;
    ptrs[e.pointerId] = e;
    try{ lensEl.setPointerCapture(e.pointerId); }catch(_){}
    var now = Date.now();
    if(Object.keys(ptrs).length === 1 && now - lastTap < 300){
      zoomAt(s > 1.5 ? 1 / s : 2.5, e.clientX, e.clientY);
      lastTap = 0;
    } else lastTap = now;
  });
  lensEl.addEventListener('pointermove', function(e){
    if(!ptrs[e.pointerId]) return;
    var prev = ptrs[e.pointerId];
    ptrs[e.pointerId] = e;
    var ids = Object.keys(ptrs);
    if(ids.length === 2){
      var a = ptrs[ids[0]], b = ptrs[ids[1]];
      var d = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      if(lastDist) zoomAt(d / lastDist, (a.clientX + b.clientX) / 2, (a.clientY + b.clientY) / 2);
      lastDist = d;
    } else if(ids.length === 1){
      tx += e.clientX - prev.clientX;
      ty += e.clientY - prev.clientY;
      apply();
    }
  });
  function lup(e){ delete ptrs[e.pointerId]; lastDist = 0; }
  lensEl.addEventListener('pointerup', lup);
  lensEl.addEventListener('pointercancel', lup);
  lensEl.querySelector('.cr-sh-ln-x').onclick = exitLens;
  lensEl.querySelectorAll('[data-lz]').forEach(function(b){
    b.onclick = function(){
      var r = lensEl.getBoundingClientRect();
      zoomAt(b.dataset.lz === 'in' ? 1.4 : 1 / 1.4, r.left + r.width / 2, r.top + r.height / 2);
    };
  });
  apply();
}


/* ── The Release (587) — share cards ───────────────────────────────────────
   The card is drawn on a canvas from bytes fetched through shotBlob() — the
   authenticated download the Walk already uses — never from a cross-origin
   URL, so the canvas is never tainted and toBlob() cannot throw for origin
   reasons. A canvas re-encode carries zero EXIF by construction. The card's
   inputs are trade, material and CITY — p.address is never passed in. */
var SHARE_FMT = {
  sq: { w:1080, h:1080, label:'Square' },
  st: { w:1080, h:1920, label:'Story' },
  wd: { w:1200, h:630,  label:'Wide' }
};
var SHARE_STY = {
  classic : { bg:'#FFFFFF', brand:'#C8202E', sub:'#555555', label:'Classic' },
  blackout: { bg:'#0A0B0C', brand:'#9AA4AE', sub:'#6B747E', label:'Blackout' },
  kraft   : { bg:'#E8DCC8', brand:'#4A3524', sub:'#6B5B47', label:'Kraft' }
};

/* Draw one half of the pair into a rect, cropped to cover. */
function coverDraw(cx, img, dx, dy, dw, dh){
  var s = Math.max(dw / img.width, dh / img.height);
  var sw = dw / s, shh = dh / s;
  var sx = (img.width - sw) / 2, sy = (img.height - shh) / 2;
  cx.drawImage(img, sx, sy, sw, shh, dx, dy, dw, dh);
}

function loadBlobImage(blob){
  return new Promise(function(resolve, reject){
    var u = URL.createObjectURL(blob);
    var im = new Image();
    im.onload = function(){ resolve(im); };
    im.onerror = function(){ URL.revokeObjectURL(u); reject(new Error('could not read the photo')); };
    im.src = u;
  });
}

function drawCard(imgs, p, fmtKey, styKey){
  var F = SHARE_FMT[fmtKey], T = SHARE_STY[styKey];
  var c = document.createElement('canvas');
  c.width = F.w; c.height = F.h;
  var x = c.getContext('2d');
  x.fillStyle = T.bg; x.fillRect(0, 0, F.w, F.h);
  var m = Math.round(F.w * 0.04);
  var footH = Math.round(F.h * 0.10);
  var pw = F.w - 2 * m, ph = F.h - 2 * m - footH;
  var split = Math.round(pw * 0.5);
  coverDraw(x, imgs.before, m, m, split, ph);
  coverDraw(x, imgs.after, m + split, m, pw - split, ph);
  x.fillStyle = '#FFFFFF';
  x.fillRect(m + split - 2, m, 4, ph);
  x.fillStyle = 'rgba(10,10,10,.55)';
  var tagW = Math.round(F.w * 0.105), tagH = Math.round(F.h * 0.034);
  x.fillRect(m + 10, m + 10, tagW, tagH);
  x.fillRect(F.w - m - 10 - tagW, m + 10, tagW, tagH);
  x.fillStyle = '#FFFFFF';
  x.font = '700 ' + Math.round(F.w * 0.016) + 'px ui-monospace, Menlo, monospace';
  x.textBaseline = 'middle';
  x.fillText('BEFORE', m + 20, m + 10 + tagH / 2);
  x.fillText('AFTER', F.w - m - tagW + 4, m + 10 + tagH / 2);
  x.textAlign = 'center';
  x.fillStyle = T.brand;
  x.font = '700 ' + Math.round(F.w * 0.036) + 'px Georgia, serif';
  x.fillText('CARDINAL ROOFING', F.w / 2, F.h - m - footH * 0.55);
  x.fillStyle = T.sub;
  x.font = Math.round(F.w * 0.017) + 'px -apple-system, Arial, sans-serif';
  var bits = [];
  if(p.trade) bits.push(TRADE_LABEL[p.trade] || p.trade);
  if(p.material) bits.push(p.material);
  if(p.city) bits.push(p.city + ', OH');
  x.fillText(bits.join(' \u00b7 '), F.w / 2, F.h - m - footH * 0.18);
  x.textAlign = 'left';
  return c;
}

async function openShareComposer(){
  var p = pairs[cur];
  if(!p || !(p.release_on || p.release_by) || !amAdmin()) return;
  ensureForm();
  formEl.innerHTML =
    '<div class="bx">' +
      '<h3>Share this transformation</h3>' +
      '<label>Format</label>' +
      '<div class="cr-sh-seg" data-shfmt>' +
        Object.keys(SHARE_FMT).map(function(k){
          return '<button data-k="' + k + '"' + (k === 'sq' ? ' class="on"' : '') +
                 ' type="button">' + SHARE_FMT[k].label + '</button>';
        }).join('') +
      '</div>' +
      '<label>Frame</label>' +
      '<div class="cr-sh-seg" data-shsty>' +
        Object.keys(SHARE_STY).map(function(k){
          return '<button data-k="' + k + '"' + (k === 'classic' ? ' class="on"' : '') +
                 ' type="button">' + SHARE_STY[k].label + '</button>';
        }).join('') +
      '</div>' +
      '<div class="cr-sh-shwrap" data-shslot></div>' +
      '<div class="err" data-err></div>' +
      '<p class="note">City only, never the street. The saved picture carries no location ' +
        'data at all \u2014 that is how the file is made, not a setting.</p>' +
      '<div class="ft">' +
        '<button class="cr-sh-btn ghost" data-act="cancel" type="button">Close</button>' +
        (navigator.share ? '<button class="cr-sh-btn ghost" data-act="shnative" type="button">Share\u2026</button>' : '') +
        '<button class="cr-sh-btn" data-act="shdl" type="button">Download</button>' +
      '</div>' +
    '</div>';
  formEl.classList.add('open');
  formEl.querySelector('[data-act="cancel"]').onclick = closeForm;

  var state = { fmt:'sq', sty:'classic', imgs:null };
  function redraw(){
    if(!state.imgs) return;
    var c = drawCard(state.imgs, p, state.fmt, state.sty);
    c.className = 'cr-sh-shprev';
    var slot = formEl.querySelector('[data-shslot]');
    slot.innerHTML = '';
    slot.appendChild(c);
    return c;
  }
  formEl.querySelectorAll('[data-shfmt] button').forEach(function(b){
    b.onclick = function(){
      state.fmt = b.dataset.k;
      formEl.querySelectorAll('[data-shfmt] button').forEach(function(x){ x.classList.toggle('on', x === b); });
      redraw();
    };
  });
  formEl.querySelectorAll('[data-shsty] button').forEach(function(b){
    b.onclick = function(){
      state.sty = b.dataset.k;
      formEl.querySelectorAll('[data-shsty] button').forEach(function(x){ x.classList.toggle('on', x === b); });
      redraw();
    };
  });
  function toPng(cb){
    var c = redraw();
    if(c) c.toBlob(cb, 'image/png');
  }
  formEl.querySelector('[data-act="shdl"]').onclick = function(){
    toPng(function(b){
      if(!b) return;
      var a = document.createElement('a');
      a.href = URL.createObjectURL(b);
      a.download = 'cardinal-before-after.png';
      a.click();
    });
  };
  var nat = formEl.querySelector('[data-act="shnative"]');
  if(nat) nat.onclick = function(){
    toPng(function(b){
      if(!b) return;
      var f = new File([b], 'cardinal-before-after.png', { type:'image/png' });
      try{ navigator.share({ files:[f] }).catch(function(){}); }catch(_){}
    });
  };

  try{
    var slot = formEl.querySelector('[data-shslot]');
    slot.innerHTML = '<p class="cr-sh-note">Building the preview\u2026</p>';
    var pair = await Promise.all([shotBlob(p.before_path), shotBlob(p.after_path)]);
    state.imgs = { before: await loadBlobImage(pair[0]), after: await loadBlobImage(pair[1]) };
    redraw();
  }catch(e){
    showErr(String(e && e.message ? e.message : e));
  }
}


/* ── Curtain Call (588) ────────────────────────────────────────────────────
   Every timer and frame is tracked in ccRun and cleared by stopCurtain();
   each async step re-checks the layer is still attached, so a tab switch
   (render() rewrites the module's DOM) self-heals instead of leaking a
   loop — the 567/569 always-repainting class, designed against here. */
var ccRun = null;   // { layer, i, timers:[], raf } while the show runs

function stopCurtain(handOver){
  if(!ccRun) return;
  ccRun.timers.forEach(clearTimeout);
  if(ccRun.raf) cancelAnimationFrame(ccRun.raf);
  if(ccRun.layer && ccRun.layer.parentNode) ccRun.layer.parentNode.removeChild(ccRun.layer);
  var at = ccRun.i;
  ccRun = null;
  if(handOver && pairs.length){
    /* Hand the real slider over ON THE PAIR THAT WAS SHOWING — whoever
       tapped was interested in that one. */
    cur = at % pairs.length;
    repaint();
  }
}

function ccWait(ms, fn){
  if(!ccRun) return;
  ccRun.timers.push(setTimeout(function(){
    if(!ccRun || !ccRun.layer.isConnected){ stopCurtain(false); return; }
    fn();
  }, ms));
}

function startCurtain(){
  if(ccRun || !pairs.length) return;
  ensure();
  var reduced = false;
  try{ reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches; }catch(_){}
  var layer = document.createElement('div');
  layer.className = 'cr-sh-cc';
  layer.innerHTML =
    '<div class="fr"><div class="ph">' +
      '<img class="bf" alt="">' +
      '<img class="af" alt="">' +
      '<div class="dv"></div>' +
    '</div></div>' +
    '<div class="plac"><h4></h4><hr><p></p></div>' +
    '<span class="stopnote">any touch stops the show</span>';
  el.appendChild(layer);
  layer.addEventListener('pointerdown', function(){ stopCurtain(true); });
  ccRun = { layer: layer, i: cur, timers: [], raf: 0 };
  ccStep(reduced);
}

function ccWipe(ph, from, to, ms, done){
  var t0 = performance.now();
  function frame(now){
    if(!ccRun || !ccRun.layer.isConnected){ stopCurtain(false); return; }
    var k = Math.min(1, (now - t0) / ms);
    var e = k < .5 ? 2*k*k : 1 - Math.pow(-2*k + 2, 2) / 2;
    ph.style.setProperty('--cc-wipe', (from + (to - from) * e) + '%');
    if(k < 1){ ccRun.raf = requestAnimationFrame(frame); }
    else done();
  }
  ccRun.raf = requestAnimationFrame(frame);
}

function ccStep(reduced){
  if(!ccRun) return;
  var p = pairs[ccRun.i % pairs.length];
  var L = ccRun.layer;
  var ph = L.querySelector('.ph');
  var bf = L.querySelector('img.bf'), af = L.querySelector('img.af');
  var plac = L.querySelector('.plac');
  plac.classList.remove('show');
  L.classList.remove('kb');
  /* 624: the display copy here too. Curtain Call swaps these on EVERY step,
     so the full-resolution version was re-downloading and re-decoding a
     multi-megapixel pair on a loop while the tablet sold by itself. */
  bf.src = srcD(p.before_path);
  af.src = srcD(p.after_path);
  /* Start fully on the BEFORE: the after pane is clipped away, then the
     divider sweeps it in — the same story the hand slider tells. */
  ph.style.setProperty('--cc-wipe', '100%');
  var bits = [];
  if(p.material) bits.push(p.material);
  if(p.trade) bits.push(TRADE_LABEL[p.trade] || p.trade);
  if(p.score != null) bits.push('\u2605 ' + p.score);
  plac.querySelector('h4').textContent = label(p);
  plac.querySelector('p').textContent = bits.join(' \u00b7 ');
  if(!reduced) L.classList.add('kb');
  ccWait(reduced ? 500 : 2200, function(){
    ccWipe(ph, 100, 0, reduced ? 0 : 2600, function(){
      plac.classList.add('show');
      ccWait(reduced ? 2600 : 3600, function(){
        ccRun.i++;
        ccStep(reduced);
      });
    });
  });
}

/* ── open / close ──────────────────────────────────────────────────────── */
function open(opts){
  ensure();
  var want = !!(opts && opts.showroom);
  /* Showroom is a presentation surface. Below 820px there is not enough screen
     to present from, and Theo said so plainly: "presenting in phone wouldn't be
     very good." Fall back to the ordinary Showcase rather than refusing — the
     phone keeps every feature, it is only this mode it isn't offered. */
  if(want && (window.innerWidth || 0) < 820) want = false;
  showroom = want;
  el.classList.toggle('showroom', showroom);
  /* Entering the room always starts clean: the transformation, not whatever
     tab and half-finished review were left open in the ordinary Showcase an
     hour ago. Handing a tablet to a homeowner that lands mid-review of
     somebody else's roof is the whole thing this mode exists to avoid.
     Same fields reload() resets, minus the refetch. */
  if(showroom){
    tab = 'showcase';
    curWalk = null; shots = []; review = null;
  }
  render();
  if(typeof window.hideAllViews === 'function'){
    try{ window.hideAllViews(); }catch(_){}
  }
  el.classList.add('open');
  el.scrollTop = 0;
  if(typeof window.navSetView === 'function'){
    try{ window.navSetView('showcase'); }catch(_){}
  }
  if(tab === 'work' && !workLoaded){
    loadWork().then(function(){ repaint(); }, function(){ workLoaded = true; repaint(); });
  }
  if(!loaded){
    load().then(function(){ repaint(); }, function(){ loaded = true; repaint(); });
  }else{
    /* Signed URLs expire; re-sign on every open rather than trusting the map
       from an hour ago. */
    sign().then(function(){ repaint(); }, function(){});
  }
}

/* 1076: the door from a job.  Everything it needs already existed - the walk
   tab, loadWalks(), loadShots(), the start form - and none of it was reachable
   from where the work actually happens.  Extend, don't add: no second walk
   screen, no second list, one new entry point.

   No history case and no hideAllViews() entry: open() already registers
   'showcase' with navSetView and calls hideAllViews itself.  This is a
   different TAB of a view that is already wired, not a fifteenth view. */
async function openForProject(pr, opts){
  if(!pr || !pr.id) return;
  tab = 'walk';
  curWalk = null; shots = []; review = null; pendingProject = null;
  /* 1161: The Appointment drives this door in showroom mode. open()'s
     showroom path deliberately resets tab to 'showcase' (a handed-over
     tablet must start clean), so the walk tab is re-asserted after. */
  open(opts);
  if(opts && opts.showroom) tab = 'walk';
  if(!walksLoaded){
    try{ await loadWalks(); }catch(_){ walksLoaded = true; }
  }
  var w = null;
  for(var i = 0; i < walks.length; i++){
    if(String(walks[i].project_id || '') === String(pr.id)){ w = walks[i]; break; }
  }
  if(w){
    curWalk = w;
    repaint();
    try{ await loadShots(w.id); }catch(_){}
    repaint();
    return;
  }
  repaint();
  /* A rep lands on the walk list, which is exactly what walks_schema.sql lets
     them have: read published walks, write nothing.  The job-menu tile is
     admin-gated too, so this is the belt to that brace rather than the only
     check - and it means a rep who reaches this any other way still gets a
     working screen rather than a form the database would refuse. */
  if(!amAdmin()) return;
  pendingProject = pr;
  openWalkForm();
}

function close(goHome){
  closeForm();
  exitPresent();
  exitLens();
  stopCurtain(false);
  if(holdRaf){ cancelAnimationFrame(holdRaf); holdRaf = 0; }
  showroom = false;
  if(el) el.classList.remove('open', 'showroom');
  if(goHome !== false && typeof window.showHome === 'function') window.showHome();
}

window.CardinalShowcase = Object.assign(window.CardinalShowcase || {}, {
  open  : open,
  close : close,
  /* 1076: called by the job menu's The Walk tile. */
  openForProject : openForProject,
  /* 630: OC Colors uploaded RAW camera files and the photos bucket refuses
     anything over 10 MB, so big shots failed outright and the ones that fitted
     made a 40 MB grid. This module already had the answer. Exported rather
     than copied — a second shrinker would drift from FULL/DISP and reintroduce
     624 on a different screen. */
  shrink: shrink,
  renditions: { full: FULL, disp: DISP, thumb: THUMB },
  inShowroom: function(){ return showroom; },
  reload: function(){ loaded = false; workLoaded = false; walksLoaded = false;
    curWalk = null; shots = []; review = null; exitPresent();
    return Promise.all([load(), loadWork(), loadWalks()]); }
});
})();
