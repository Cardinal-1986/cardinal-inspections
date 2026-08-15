/* sentinel_probe — everything the sentinel asks the PAGE, in one function.
 *
 * This lives in its own file for one reason, and it is not tidiness: when it
 * was a template literal inside sentinel.js, every backslash in every regex
 * needed doubling, and getting that wrong turned a /var\(/ into /var(/ — an
 * unterminated group that killed the whole probe. It surfaced as "SENTINEL
 * COULD NOT RUN", which is the same silence the tool exists to prevent. A
 * file has no escaping layer, so the hazard is gone rather than documented.
 * It is also `node --check`-able, which a string is not.
 *
 * Read as text and handed to page.evaluate. Nothing here may reference
 * anything outside the page.
 */
globalThis.__sentinelProbe = () => {
  const out = { ink: [], collapse: [], overlap: [], dead: [], unwired: [], overflow: null };

  /* ── colour ─────────────────────────────────────────────────────────── */
  function parse(c) {
    if (!c) return null;
    const m = String(c).match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const p = m[1].split(',').map(s => parseFloat(s.trim()));
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  }
  function over(fg, bg) {                       /* fg composited onto bg */
    const a = fg.a;
    return { r: fg.r*a + bg.r*(1-a), g: fg.g*a + bg.g*(1-a), b: fg.b*a + bg.b*(1-a), a: 1 };
  }
  function lum(c) {
    const f = v => { v /= 255; return v <= 0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4); };
    return 0.2126*f(c.r) + 0.7152*f(c.g) + 0.0722*f(c.b);
  }
  function ratio(a, b) {
    const l1 = lum(a), l2 = lum(b);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  }

  /* TRAP: backgroundColor is not the background. Cards here paint gradients,
     which are background-IMAGES, so an ancestor walk reading only
     backgroundColor sails straight past the card and reports the page behind
     it. Every gradient stop is a ground too. */
  function paints(cs) {
    const list = [];
    const bc = parse(cs.backgroundColor);
    if (bc && bc.a > 0.01) list.push(bc);
    const bi = cs.backgroundImage || '';
    if (bi && bi !== 'none')
      for (const stop of (bi.match(/rgba?\([^)]+\)/g) || [])) {
        const p = parse(stop);
        if (p && p.a > 0.01) list.push(p);
      }
    return list;
  }

  /* TRAP, and the first version of this function got it WRONG in a way worth
     recording, because it is the same mistake wearing a new coat.

     The naive walk collects every colour an ancestor paints and scores the
     ink against each AS IF IT WERE OPAQUE. On this app that reported a
     perfectly readable label at 1.39:1, because .crow paints
     rgba(200,32,46,0.09) — a NINE PERCENT red wash over a dark panel. Nine
     percent red is not red. Treating it as red invents a failure, and an
     instrument that invents failures gets muted, which is worse than having
     no instrument at all.

     A translucent layer must be COMPOSITED over what is behind it. So: walk
     up until something opaque is found, then composite back down toward the
     element one layer at a time. A gradient contributes each of its stops as
     a separate candidate, because different parts of the element genuinely
     sit over different stops — the ink is then scored against the WORST
     candidate, never an average. */
  function grounds(el) {
    const layers = [];                 /* element-first; each a list of paints */
    let node = el, base = null;
    while (node && node.nodeType === 1) {
      const own = paints(getComputedStyle(node));
      if (own.length) {
        const solid = own.find(c => c.a >= 0.999);
        if (solid) { layers.push(own.filter(c => c !== solid)); base = solid; break; }
        layers.push(own);
      }
      node = node.parentElement;
    }
    if (!base) {
      const body = parse(getComputedStyle(document.body).backgroundColor);
      base = (body && body.a >= 0.999) ? body : { r: 255, g: 255, b: 255, a: 1 };
    }
    let cands = [base];
    for (let i = layers.length - 1; i >= 0; i--) {
      const stack = layers[i];
      if (!stack || !stack.length) continue;
      const next = [];
      for (const c of cands) for (const paint of stack) next.push(over(paint, c));
      /* Bounded: the lightest and the darkest decide the worst ratio, and
         everything between them is dominated by one of the two. */
      next.sort((a, b) => lum(a) - lum(b));
      cands = next.length > 6 ? [next[0], next[next.length >> 1], next[next.length - 1]] : next;
    }
    return cands.length ? cands : [base];
  }

  /* ── shared helpers ─────────────────────────────────────────────────── */
  function ownText(el) {
    let t = '';
    for (const n of el.childNodes) if (n.nodeType === 3) t += n.nodeValue;
    return t.trim();
  }
  function visible(el, r) {
    if (!r) r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return false;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none') return false;
    if (parseFloat(cs.opacity) < 0.05) return false;
    return true;
  }
  function where(el) {
    let s = el.tagName.toLowerCase();
    if (el.id) s += '#' + el.id;
    else if (el.className && typeof el.className === 'string')
      s += '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.');
    return s;
  }

  const all = document.querySelectorAll('*');

  /* ── INK ─────────────────────────────────────────────────────────────
     Builds 448, 487, 527, 557, 573, 630, 681 — seven times, every one
     reported by Theo as "can't read this", every one invisible to a gate
     that reads CSS text. */
  for (const el of all) {
    const txt = ownText(el);
    if (!txt || txt.length < 2) continue;
    const r = el.getBoundingClientRect();
    if (!visible(el, r)) continue;
    const cs = getComputedStyle(el);
    const fg = parse(cs.color);
    if (!fg) continue;
    /* Transparent ink is clip-to-text, a deliberate technique and a DIFFERENT
       class with its own script. Not a contrast failure. */
    if (fg.a < 0.05) continue;
    const size = parseFloat(cs.fontSize) || 16;
    const bold = (parseInt(cs.fontWeight, 10) || 400) >= 700;
    const large = size >= 24 || (size >= 18.66 && bold);
    const floor = large ? 3.0 : 4.5;
    let worst = Infinity, worstBg = null;
    for (const g of grounds(el)) {
      const eff = fg.a < 0.999 ? over(fg, g) : fg;
      const v = ratio(eff, g);
      if (v < worst) { worst = v; worstBg = g; }
    }
    if (worst < floor)
      out.ink.push({ el: where(el), text: txt.slice(0, 46), ratio: +worst.toFixed(2), floor,
        size: +size.toFixed(1),
        fg: 'rgb(' + [fg.r, fg.g, fg.b].map(Math.round).join(',') + ')',
        bg: worstBg ? 'rgb(' + [worstBg.r, worstBg.g, worstBg.b].map(Math.round).join(',') + ')' : '?' });
  }

  /* ── COLLAPSE ────────────────────────────────────────────────────────
     Build 817 exactly: a 362x14 tile holding a 358x168 photograph.
     aspect-ratio on a grid item does not size the implicit row, and a grid
     row sizes from the item's INTRINSIC contribution, ignoring a child's
     explicit height. Nothing that reads a stylesheet can see this. */
  for (const el of all) {
    const r = el.getBoundingClientRect();
    if (!visible(el, r)) continue;
    /* ⚠ DO NOT skip overflow:hidden here, however reasonable it sounds.
       The first version did, calling it "a deliberate crop", and it therefore
       stayed silent on build 816 — a 362x44 tile holding a 358x168 image,
       which is the exact defect this check was written for. .cctile clips,
       so the exemption swallowed it whole.

       A deliberate crop does not look like this. With object-fit the image
       element's own box is sized by CSS to the container, so a cropped
       photograph reports the SAME height as its tile. An image whose own box
       is far taller than its parent is not cropped — it is overflowing. */
    for (const kid of el.children) {
      if (kid.tagName !== 'IMG' && kid.tagName !== 'CANVAS' && kid.tagName !== 'VIDEO') continue;
      const kcs = getComputedStyle(kid);
      if (kcs.position === 'absolute' || kcs.position === 'fixed') continue;
      const kr = kid.getBoundingClientRect();
      if (kr.height < 24) continue;
      if (r.height < kr.height * 0.6)
        out.collapse.push({ el: where(el), box: Math.round(r.width) + 'x' + Math.round(r.height),
          child: where(kid), childBox: Math.round(kr.width) + 'x' + Math.round(kr.height) });
    }
  }

  /* ── OVERLAP ─────────────────────────────────────────────────────────
     Build 814: tile 1 spanned y 86-255 while tile 7 began at 163. 15% of the
     smaller box is the threshold the Vision-suite audit settled on. */
  const containers = [];
  for (const el of all) {
    const d = getComputedStyle(el).display;
    if (d === 'grid' || d === 'flex' || d === 'inline-grid' || d === 'inline-flex') containers.push(el);
  }
  for (const c of containers) {
    const kids = [...c.children].filter(k => {
      const kcs = getComputedStyle(k);
      if (kcs.position === 'absolute' || kcs.position === 'fixed') return false;
      return visible(k);
    }).slice(0, 60);
    for (let i = 0; i < kids.length; i++)
      for (let j = i + 1; j < kids.length; j++) {
        const a = kids[i].getBoundingClientRect(), b = kids[j].getBoundingClientRect();
        const w = Math.min(a.right, b.right) - Math.max(a.left, b.left);
        const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
        if (w <= 1 || h <= 1) continue;
        const small = Math.min(a.width * a.height, b.width * b.height) || 1;
        const pct = (w * h) / small;
        if (pct > 0.15)
          out.overlap.push({ container: where(c), a: where(kids[i]), b: where(kids[j]),
            pct: Math.round(pct * 100) });
      }
  }

  /* ── OVERFLOW ────────────────────────────────────────────────────────── */
  out.overflow = document.documentElement.scrollWidth - document.documentElement.clientWidth;

  /* ── DEAD ─────────────────────────────────────────────────────────────
     A rule that parses, balances, matches real elements, and loses on every
     one of them. Build 481 and build 817. Every mechanical gate was green
     both times, because every mechanical gate reads TEXT. */
  const probe = document.createElement('div');
  probe.style.position = 'absolute';
  probe.style.visibility = 'hidden';
  document.body.appendChild(probe);
  function normalise(prop, value) {
    probe.style.cssText = '';
    try { probe.style.setProperty(prop, value); } catch (e) { return null; }
    return getComputedStyle(probe).getPropertyValue(prop);
  }

  /* Specificity (a,b,c) folded into one number. Approximate but honest: it
     counts what the cascade counts, and for a selector LIST it takes the
     branch that actually matches the element in hand. */
  function spec(sel) {
    const s = sel.replace(/\([^)]*\)/g, '');
    const a = (s.match(/#[\w-]+/g) || []).length;
    const b = (s.match(/\.[\w-]+|\[[^\]]+\]|:(?!:)[\w-]+/g) || []).length;
    const c = (s.match(/(^|[\s>+~])[a-zA-Z][\w-]*|::[\w-]+/g) || []).length;
    return a * 10000 + b * 100 + c;
  }
  function specFor(sel, el) {
    let best = -1;
    for (const branch of sel.split(',')) {
      const t = branch.trim();
      if (!t) continue;
      try { if (el.matches(t)) best = Math.max(best, spec(t)); } catch (e) {}
    }
    return best < 0 ? spec(sel) : best;
  }

  const WATCH = new Set(['height', 'width', 'min-height', 'max-height',
    'background-color', 'color', 'display', 'font-size', 'border-radius']);

  /* ⚠ ONLY context-independent declared values can be compared this way, and
     learning that cost the first run of this script eleven false positives.

       - A SHORTHAND CONTAINING var(). `background: var(--x,#161918)` is stored
         as pending-substitution, so getPropertyValue('background-color')
         returns "" — and "" normalises to rgba(0,0,0,0), which matches almost
         nothing. Every one of those reads as a dead rule.

       - A RELATIVE LENGTH. `width:100%` resolves against the element's own
         container; a hidden probe div resolves it against something else
         entirely, so the comparison is meaningless even when the rule wins.

     A colour or an absolute px length resolves the same everywhere, which is
     what makes it safe. Both historical instances survive the narrowing:
     build 481 was a losing colour, build 817 a losing `height:150px`. */
  function comparable(prop, raw) {
    const v = String(raw || '').trim();
    if (!v) return false;
    if (/var\(|calc\(|inherit|initial|unset|revert|currentColor/i.test(v)) return false;
    if (/[\d.](%|em|rem|ex|ch|vw|vh|vmin|vmax)\b/i.test(v)) return false;
    if (prop === 'color' || prop === 'background-color')
      return /^(#|rgb|hsl|transparent$|[a-z]+$)/i.test(v);
    if (prop === 'display') return /^[a-z-]+$/i.test(v);
    return /^-?[\d.]+px$/i.test(v);
  }

  /* Pass 1 — every style rule actually IN PLAY, in cascade order.
     ⚠ Descending into a @media block whose condition does NOT match is how
     this check earns a reputation for crying wolf: a rule inside
     `@media (max-width:640px)` is not dead at 1194px, it is simply not in
     play. The first run of this reported the build-817 mobile tile rule as
     dead at desktop width — the very rule that FIXED the bug it exists to
     catch.
     ⚠ And in modern Chromium every CSSStyleRule exposes an empty .cssRules
     for CSS nesting, so descending BEFORE examining skips every style rule
     and reports a clean zero. Examine, then descend. */
  const live = [];
  function walk(rules, depth) {
    if (depth > 5) return;
    for (const r of rules) {
      if (r.type === 1 && r.selectorText) live.push(r);
      if (r.media && typeof r.media.mediaText === 'string') {
        let ok = true;
        try { ok = matchMedia(r.media.mediaText).matches; } catch (e) {}
        if (!ok) continue;
      }
      if (r.type === 12 && r.conditionText) {
        let ok = true;
        try { ok = CSS.supports(r.conditionText); } catch (e) {}
        if (!ok) continue;
      }
      if (r.cssRules && r.cssRules.length) walk(r.cssRules, depth + 1);
    }
  }
  for (const sheet of document.styleSheets) {
    let rules = null;
    try { rules = sheet.cssRules; } catch (e) { continue; }   /* cross-origin */
    if (rules) walk(rules, 0);
  }

  /* Pass 2 — did the rule win anywhere, and if not, what beat it?
     Losing to something MORE SPECIFIC is the cascade doing its job. Losing to
     something no more specific than itself is a source-order accident, which
     is a defect every time — build 817, where a later .cctile beat the
     mobile one at equal specificity. */
  for (let ri = 0; ri < live.length; ri++) {
    const r = live[ri];
    let els = [];
    try { els = [...document.querySelectorAll(r.selectorText)]; } catch (e) { continue; }
    if (!els.length) continue;               /* not dead — just not on this screen */
    for (let i = 0; i < r.style.length; i++) {
      const prop = r.style[i];
      if (!WATCH.has(prop)) continue;
      if (r.style.getPropertyPriority(prop) === 'important') continue;
      const raw = r.style.getPropertyValue(prop);
      if (!comparable(prop, raw)) continue;
      const want = normalise(prop, raw);
      if (want == null || want === '') continue;

      let won = 0, seen = 0, outranked = false;
      for (const el of els.slice(0, 30)) {
        if (!visible(el)) continue;
        seen++;
        if (getComputedStyle(el).getPropertyValue(prop) === want) { won++; continue; }
        if (el.style && el.style.getPropertyValue(prop)) { outranked = true; continue; }
        const mine = specFor(r.selectorText, el);
        for (let wi = 0; wi < live.length; wi++) {
          if (wi === ri) continue;
          const w = live[wi];
          if (!w.style.getPropertyValue(prop)) continue;
          let m = false;
          try { m = el.matches(w.selectorText); } catch (e) {}
          if (!m) continue;
          if (w.style.getPropertyPriority(prop) === 'important') { outranked = true; break; }
          if (specFor(w.selectorText, el) > mine) { outranked = true; break; }
        }
      }
      if (seen >= 1 && won === 0)
        out.dead.push({ selector: r.selectorText.slice(0, 70), prop,
          declared: raw.slice(0, 30), matched: seen, outranked });
    }
  }
  probe.remove();

  /* ── UNWIRED ──────────────────────────────────────────────────────────
     BUG_CLASSES 16 — the Studio Archive button was drawn and dead from build
     614 to 632. Collected here, judged outside: listing an element's own
     listeners needs CDP, which the page cannot do to itself. */
  let n = 0;
  for (const el of document.querySelectorAll('button, [role="button"]')) {
    if (!visible(el)) continue;
    if (el.type === 'submit' || el.closest('form')) continue;
    if (el.hasAttribute('onclick')) continue;
    if (el.disabled) continue;
    el.setAttribute('data-sentinel-id', 'sb' + n);
    out.unwired.push({ id: 'sb' + n, el: where(el),
      label: (el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 32) });
    n++;
  }

  return out;
};
