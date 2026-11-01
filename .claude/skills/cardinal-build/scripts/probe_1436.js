/* probeS.js — Builder S's in-page instrument for the Sun appearance.
 * Installed as an init script; exposes window.__sunProbe(scope, floor).
 *
 * Scores EVERY visible piece of text inside `scope` — own text nodes, input
 * values, shown placeholders and quoted ::before/::after content — against its
 * WORST composited ground, at a 7:1 floor (Theo's Sun rule: no text under 7:1).
 *
 * The ground logic is the sentinel's (sentinel_probe.js): composite translucent
 * layers down to the first opaque one, every gradient stop is a candidate, a
 * border-box layer under a tighter clip is a ring and not a ground. Two
 * additions the 7:1 job needs that INK does not:
 *   · ancestor OPACITY is multiplied into the ink's alpha — `.pbday.out` paints
 *     its number at opacity .45, which is a grey however black its ink is;
 *   · single characters count. Calendar day numbers ("1".."31"), "!" and "‹"
 *     are text Scottie reads; INK skips anything under two characters.
 * It also reports the rendered size (computed px × the effective CSS zoom) and
 * the computed weight of each piece, and the hit box of every control.
 * Nothing here references anything outside the page.
 */
(function () {
  function parse(c) {
    if (!c) return null;
    /* a computed color-mix() serialises as color(srgb r g b / a) with 0..1 channels */
    const k = String(c).match(/color\(srgb\s+([^)]+)\)/);
    if (k) { const q = k[1].split(/[\s\/]+/).filter(Boolean).map(parseFloat); return { r: q[0] * 255, g: q[1] * 255, b: q[2] * 255, a: q.length > 3 ? q[3] : 1 }; }
    const m = String(c).match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const p = m[1].split(/[\s,\/]+/).filter(Boolean).map(parseFloat);
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  }
  function over(fg, bg) { const a = fg.a; return { r: fg.r * a + bg.r * (1 - a), g: fg.g * a + bg.g * (1 - a), b: fg.b * a + bg.b * (1 - a), a: 1 }; }
  function lum(c) { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); }
  function ratio(a, b) { const l1 = lum(a), l2 = lum(b); return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05); }
  function splitLayers(s) { const out = []; let d = 0, cur = ''; for (const ch of s) { if (ch === '(') d++; else if (ch === ')') d--; if (ch === ',' && d === 0) { out.push(cur); cur = ''; continue; } cur += ch; } if (cur.trim()) out.push(cur); return out; }
  function paints(cs) {
    const list = [];
    const bc = parse(cs.backgroundColor); if (bc && bc.a > 0.01) list.push(bc);
    const bi = cs.backgroundImage || '';
    if (bi && bi !== 'none') {
      const layers = splitLayers(bi); const clips = splitLayers(cs.backgroundClip || '').map(c => c.trim());
      const tighter = clips.some(c => c === 'padding-box' || c === 'content-box');
      layers.forEach((layer, i) => { const clip = (clips[i] !== undefined ? clips[i] : clips[clips.length - 1]) || 'border-box';
        if (tighter && clip === 'border-box') return;
        for (const stop of (layer.match(/rgba?\([^)]+\)|color\(srgb[^)]+\)/g) || [])) { const p = parse(stop); if (p && p.a > 0.01) list.push(p); } });
    }
    return list;
  }
  function grounds(el) {
    const layers = []; let node = el, base = null;
    while (node && node.nodeType === 1) {
      const own = paints(getComputedStyle(node));
      if (own.length) { const solid = own.find(c => c.a >= 0.999); if (solid) { layers.push(own.filter(c => c !== solid)); base = solid; break; } layers.push(own); }
      node = node.parentElement;
    }
    if (!base) { const b = parse(getComputedStyle(document.body).backgroundColor); base = (b && b.a >= 0.999) ? b : { r: 255, g: 255, b: 255, a: 1 }; }
    let cands = [base];
    for (let i = layers.length - 1; i >= 0; i--) { const st = layers[i]; if (!st || !st.length) continue; const next = [];
      for (const c of cands) for (const p of st) next.push(over(p, c));
      next.sort((a, b) => lum(a) - lum(b)); cands = next.length > 6 ? [next[0], next[next.length >> 1], next[next.length - 1]] : next; }
    return cands;
  }
  function opacityOf(el) { let o = 1; for (let n = el; n && n.nodeType === 1; n = n.parentElement) { const v = parseFloat(getComputedStyle(n).opacity); if (!isNaN(v)) o *= v; } return o; }
  function offCanvasFixed(el, r) { if (r.right > 0 && r.left < innerWidth) return false; for (let n = el, h = 0; n && h++ < 40; n = n.parentElement) if (getComputedStyle(n).position === 'fixed') return true; return false; }
  function visible(el, r) {
    if (!r) r = el.getBoundingClientRect();
    if (r.width <= 1.5 || r.height <= 1.5) return false;             /* sr-only boxes are 1x1 */
    for (let n = el; n && n.nodeType === 1; n = n.parentElement) { const cs = getComputedStyle(n);
      if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) < 0.05) return false; }
    if (offCanvasFixed(el, r)) return false;
    return true;
  }
  function where(el) { let s = el.tagName.toLowerCase(); if (el.id) s += '#' + el.id; else if (el.className && typeof el.className === 'string') s += '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.');
    const p = el.parentElement; if (p && !el.id) { let ps = p.tagName.toLowerCase(); if (p.id) ps += '#' + p.id; else if (p.className && typeof p.className === 'string') ps += '.' + p.className.trim().split(/\s+/)[0]; s = ps + '>' + s; } return s; }
  function zoomOf(el) { if (typeof el.currentCSSZoom === 'number') return el.currentCSSZoom; let z = 1; for (let n = el; n && n.nodeType === 1; n = n.parentElement) { const v = parseFloat(getComputedStyle(n).zoom); if (v && !isNaN(v)) z *= v; } return z; }
  const PICTO = /^[\s‍︎️\p{Extended_Pictographic}]+$/u;

  function score(el, txt, fgStr, cs, kind) {
    let fg = parse(fgStr); if (!fg || fg.a < 0.05) return null;
    const op = opacityOf(el); fg = { r: fg.r, g: fg.g, b: fg.b, a: fg.a * op };
    let worst = Infinity, wb = null;
    for (const g of grounds(el)) { const v = ratio(over(fg, g), g); if (v < worst) { worst = v; wb = g; } }
    const z = zoomOf(el);
    return { el: where(el), kind, text: txt.replace(/\s+/g, ' ').slice(0, 40), ratio: +worst.toFixed(2),
      fg: 'rgb(' + [fg.r, fg.g, fg.b].map(Math.round).join(',') + (op < 1 || fg.a < 1 ? ',' + (+fg.a.toFixed(2)) : '') + ')',
      bg: wb ? 'rgb(' + [wb.r, wb.g, wb.b].map(Math.round).join(',') + ')' : '?',
      px: +parseFloat(cs.fontSize).toFixed(2), rpx: +(parseFloat(cs.fontSize) * z).toFixed(2), zoom: +z.toFixed(3),
      w: parseInt(cs.fontWeight, 10) || 400 };
  }


  /* which declaration supplies `prop` on el (or its pseudo): walks the CSSOM, applies
     only media that match, picks the winner by !important then specificity then order. */
  function specOf(sel) { let s = sel.replace(/:not\(([^()]*)\)/g, ' $1').replace(/:is\(([^()]*)\)/g, ' $1').replace(/:where\([^()]*\)/g, '');
    const i = (s.match(/#[\w-]+/g) || []).length; const c = (s.match(/[.\[][\w-]+|:(?!:)[\w-]+/g) || []).length; const e = (s.match(/(^|[\s>+~])[a-z][\w-]*/gi) || []).length; return i * 10000 + c * 100 + e; }
  function why(el, prop, pseudo) {
    const cands = []; let order = 0;
    const walk = (list, sheetId) => { for (const r of list) {
      if (r.selectorText) { order++; const v = r.style.getPropertyValue(prop); if (!v) continue;
        for (const sel of r.selectorText.split(/,(?![^()]*\))/)) { let base = sel.trim(), ps = '';
          const m = base.match(/::?(before|after|placeholder)$/); if (m) { ps = '::' + m[1]; base = base.slice(0, m.index); }
          if ((pseudo || '') !== ps) continue; let ok = false; try { ok = el.matches(base || '*'); } catch (e) {}
          if (ok) cands.push({ sel: sel.trim(), v, imp: r.style.getPropertyPriority(prop) === 'important', sp: specOf(sel), order, sheet: sheetId }); } }
      else if (r.cssRules) { const c = r.conditionText; let ap = true; if (c != null) { try { ap = /Supports/.test(r.constructor.name) ? CSS.supports(c) : matchMedia(c).matches; } catch (e) { ap = false; } } if (ap) walk(r.cssRules, sheetId); } } };
    for (const sh of document.styleSheets) { let rr = null; try { rr = sh.cssRules; } catch (e) {} if (rr) walk(rr, (sh.ownerNode && sh.ownerNode.id) || '?'); }
    if (!pseudo && el.style && el.style.getPropertyValue(prop)) return { sel: '[inline]', v: el.style.getPropertyValue(prop), sheet: 'inline' };
    if (!cands.length) return { sel: '(inherited)', v: '', sheet: '' };
    cands.sort((a, b) => (a.imp - b.imp) || (a.sp - b.sp) || (a.order - b.order));
    const w = cands[cands.length - 1]; return { sel: w.sel, v: w.v, sheet: w.sheet };
  }
  window.__sunWhy = function (scopeSel, floor) {
    const r = window.__sunProbe(scopeSel, floor || 7); const out = [];
    const roots = [...document.querySelectorAll(scopeSel)];
    const els = new Map();
    for (const root of roots) for (const el of [root, ...root.querySelectorAll('*')]) els.set(where(el), els.get(where(el)) || el);
    for (const t of r.list) { const el = els.get(t.el); if (!el) { out.push(Object.assign({ src: '?' }, t)); continue; }
      const ps = t.kind.startsWith('::') ? t.kind : (t.kind === 'placeholder' ? '::placeholder' : '');
      let w = why(el, 'color', ps); let hop = el;
      for (let k = 0; w.sel === '(inherited)' && hop.parentElement && k < 12; k++) { hop = hop.parentElement; w = why(hop, 'color', ''); w = Object.assign({}, w, { sel: w.sel + ' ⇐' + k }); }
      let op = ''; for (let n = el; n; n = n.parentElement) { const o = getComputedStyle(n).opacity; if (o !== '1') { const wo = why(n, 'opacity', ''); op = 'opacity ' + o + ' via ' + wo.sel; break; } }
      out.push(Object.assign({ src: w.sheet + ' | ' + w.sel + ' { color: ' + w.v + ' }', op }, t)); }
    return out;
  };
  window.__sunWhyW = function (el, ps) { return why(el, 'font-weight', ps || ''); };

  window.__sunProbe = function (scopeSel, floor) {
    floor = floor || 7;
    const roots = [...document.querySelectorAll(scopeSel)].filter(r => r.getClientRects().length);
    const texts = [], targets = [];
    for (const root of roots) for (const el of [root, ...root.querySelectorAll('*')]) {
      if (el.closest('svg') && el.tagName.toLowerCase() !== 'svg') continue;
      const r = el.getBoundingClientRect();
      if (!visible(el, r)) continue;
      const cs = getComputedStyle(el);
      let own = ''; for (const n of el.childNodes) if (n.nodeType === 3) own += n.nodeValue;
      own = own.trim();
      if (own && !PICTO.test(own)) { const s = score(el, own, cs.color, cs, 'text'); if (s) texts.push(s); }
      const tag = el.tagName;
      if ((tag === 'INPUT' && !/^(checkbox|radio|range|color|file|hidden|button|submit|reset|image)$/i.test(el.type)) || tag === 'TEXTAREA') {
        if (el.value && el.value.trim()) { const s = score(el, el.value, cs.color, cs, 'value'); if (s) texts.push(s); }
        else if (el.placeholder) { const pcs = getComputedStyle(el, '::placeholder'); const s = score(el, el.placeholder, pcs.color, cs, 'placeholder'); if (s) texts.push(s); }
      }
      if (tag === 'SELECT' && el.selectedOptions && el.selectedOptions[0]) { const t = el.selectedOptions[0].textContent.trim(); if (t) { const s = score(el, t, cs.color, cs, 'select'); if (s) texts.push(s); } }
      for (const ps of ['::before', '::after']) {
        const pcs = getComputedStyle(el, ps); const c = pcs.content;
        if (!c || c === 'none' || c === 'normal') continue;
        const m = c.match(/^"(.*)"$/); if (!m) continue;
        const t = m[1].replace(/\\[0-9a-f]+ ?/gi, '').trim();
        if (!t || PICTO.test(t)) continue;
        if (pcs.display === 'none' || pcs.visibility === 'hidden') continue;
        const s = score(el, t, pcs.color, pcs, ps); if (s) texts.push(s);
      }
      if (el.matches('button, a[href], [role=button], input:not([type=hidden]), select, textarea, [data-go], [data-day], [data-box], .navopt, label[for]')) {
        targets.push({ el: where(el), text: (el.textContent || el.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 30), w: +r.width.toFixed(1), h: +r.height.toFixed(1) });
      }
    }
    const under = texts.filter(t => t.ratio < floor).sort((a, b) => a.ratio - b.ratio);
    const med = a => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); return s[s.length >> 1]; };
    return { n: texts.length, under: under.length, list: under, texts,
      medW: med(texts.map(t => t.w)), meanW: texts.length ? +(texts.reduce((a, t) => a + t.w, 0) / texts.length).toFixed(1) : null,
      medPx: med(texts.map(t => t.rpx)), minRpx: texts.length ? Math.min(...texts.map(t => t.rpx)) : null,
      minPx: texts.length ? Math.min(...texts.map(t => t.px)) : null,
      targets, roots: roots.length,
      theme: document.documentElement.getAttribute('data-theme') || '', sun: document.documentElement.getAttribute('data-cr-sun') || '',
      zoom: getComputedStyle(document.documentElement).zoom };
  };
})();
