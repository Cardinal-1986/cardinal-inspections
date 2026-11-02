#!/usr/bin/env python3
"""patch_1443_a11y.py — build 1443, round-1 leftovers: accessibility and sheets (builder A5, made on build 1438).

  P07.05  the document editor's Back chip is a real <button> with a 44px hit area
  P07.06  under-44px targets: Open full claim (+ the whole claim card opens the claim),
          Community partner buttons, the punch card's + Add, the stage-band menu (now a
          labelled <button>), Remember me / Forgot password, punch search, document title
  P07.10  dimmed-by-opacity numbers become solid muted inks (Production out-of-month days,
          Community zero counts, the Clients bar counts)
  P07.11  keyboard: the top bar and the home / Clients list cards take focus and Enter/Space;
          the .projform modal family and the estimate builder are role=dialog aria-modal,
          and ONE shared focus trap keeps Tab inside whatever is on top
  P07.12  accessible names for the listed unnamed controls
  P10.03  Escape and Back close the Ask sheet (crSheets() sees inside #cr-ai-root);
          Escape closes Self Check

No build stamp, no CHANGELOG entry: the integrator does both.

    python3 patch_1443_a11y.py <index.html>
"""
import sys
sys.path.insert(0, '/home/user/cardinal-inspections/.claude/skills/cardinal-build/scripts')
import patch_lib as pl

P = sys.argv[1]
s = pl.load(P)


def one(s, a, b):
    n = s.count(a)
    assert n == 1, (n, a[:120])
    return s.replace(a, b, 1)


# ───────────────────────── P07.05 the editor's Back chip ─────────────────────────
s = one(s,
    '<span class="edchip edlink" id="edClientChip" title="Back to client overview" style="display:none;"></span>',
    '<button type="button" class="edchip edlink" id="edClientChip" title="Back to client overview" style="display:none;"></button>')
# the pad must reach past the 22px pill vertically, and .edchip's overflow:hidden would clip it with the
# name. overflow-x:clip keeps the name's horizontal clip exactly as it was; overflow-y:visible lets the pad out.
s = one(s,
    '#edClientChip{max-width:210px;}',
    '#edClientChip{max-width:210px;}\n'
    '/* 1443 P07.05: the chip is a <button> now (it was a span the keyboard could not reach). Its tap target is the\n'
    '   ::after, 46px tall so a half-pixel position cannot round it under 44, centred on the 22/24px pill.\n'
    '   overflow-x:clip still cuts a long name at the pill\'s edge; -y:visible is what lets the pad out. */\n'
    '#edClientChip{overflow-x:clip;overflow-y:visible;position:relative;--cr-stack:"1443 P07.05: the 44px pad must not be clipped; #edRepChip keeps .edchip\'s overflow";}\n'
    '#edClientChip::after{content:\'\';position:absolute;left:0;right:0;top:50%;height:46px;margin-top:-23px;}')

# ───────────────────────── P07.06 tap targets ─────────────────────────
# the insurance claim strip: Open full claim is a button with a 44px pad, and the whole card opens the claim
s = one(s,
    "      '<span class=\"go\" data-act=\"open\">Open full claim \\u203a</span>';",
    "      '<button type=\"button\" class=\"go\" data-act=\"open\">Open full claim \\u203a</button>';")
s = one(s,
    "    var go = host.querySelector('[data-act=\"open\"]');\n"
    "    if(go) go.onclick = function(){\n"
    "      if(window.CardinalClaims && window.CardinalClaims.openOne) window.CardinalClaims.openOne(claim.id);\n"
    "    };\n",
    "    /* 1443 P07.06: the whole card opens the claim (a tap on its body did nothing), and the\n"
    "       Open full claim button inside it reaches here by bubbling, so it opens it once. */\n"
    "    host.classList.add('tap');\n"
    "    host.onclick = function(){\n"
    "      if(window.CardinalClaims && window.CardinalClaims.openOne) window.CardinalClaims.openOne(claim.id);\n"
    "    };\n")
s = one(s,
    ".cr-claimstrip .go{\n    display:inline-block; margin-top:10px; cursor:pointer;\n",
    ".cr-claimstrip .go{\n    display:inline-block; margin-top:10px; cursor:pointer; position:relative; background:none; border:0; padding:0;\n")
s = one(s,
    "  .cr-claimstrip .go:hover{ color:var(--ct-red-deep); }\n",
    "  .cr-claimstrip .go:hover{ color:var(--ct-red-deep); }\n"
    "  /* 1443 P07.06: the 14px link gets a 46px tap target; the card around it is a tap target too */\n"
    "  .cr-claimstrip .go::after{ content:''; position:absolute; left:0; right:0; top:-16px; bottom:-16px; }\n"
    "  .cr-claimstrip.tap{ cursor:pointer; }\n")

# Community partner & property buttons (30px): an 8px pad above and below (46px, so a half-pixel
# position cannot round it under 44); a wrapped row gets a 16px row gap so two rows' pads never meet
s = one(s,
    "#cr-cc .cc-pp .ppacts{display:flex;gap:7px;margin-top:7px;flex-wrap:wrap}",
    "#cr-cc .cc-pp .ppacts{display:flex;gap:16px 7px;margin-top:7px;flex-wrap:wrap}")
s = one(s,
    "#cr-cc .cc-pp .ppacts button{background:transparent;",
    "#cr-cc .cc-pp .ppacts button{position:relative;background:transparent;")
s = one(s,
    "#cr-cc .cc-pp .ppacts button:active{background:var(--ccm-line,#2a2f2c)}",
    "#cr-cc .cc-pp .ppacts button:active{background:var(--ccm-line,#2a2f2c)}\n"
    "/* 1443 P07.06: 30px buttons, 46px targets — the pad sits in the row's 7px margin above and 9px padding below */\n"
    "#cr-cc .cc-pp .ppacts button::after{content:'';position:absolute;left:0;right:0;top:-8px;bottom:-8px}")

# the punch card's + Add (28px), inside a header with 13px of padding
s = one(s,
    ".cr-pp-hd .add{flex:0 0 auto;",
    ".cr-pp-hd .add{flex:0 0 auto;position:relative;")
s = one(s,
    ".cr-pp-hd .add:hover{background:#e0940f}",
    ".cr-pp-hd .add:hover{background:#e0940f}.cr-pp-hd .add::after{content:'';position:absolute;left:0;right:0;top:-9px;bottom:-9px}")

# the stage band's ⋮ — a labelled <button>, 44x44 (it was a 34x26 span the keyboard could not reach)
s = one(s,
    '<span class="dots" id="msDots" style="cursor:pointer;font-size:22px;color:inherit;padding:0 6px;">&#8942;</span>',
    '<button type="button" class="dots" id="msDots" aria-label="More stage actions" aria-haspopup="true" style="cursor:pointer;font-size:22px;color:inherit;padding:0 6px;">&#8942;</button>')
# the drop hangs from the button's bottom edge: 100% of a 44px box lands where 130% of the old 28px one did
s = one(s,
    'top:130%;z-index:70;background:#fff;border:1px solid #c9c2bf;',
    'top:100%;z-index:70;background:#fff;border:1px solid #c9c2bf;')
s = one(s,
    ".msmenu .dots{cursor:pointer;font:800 18px/1 'Segoe UI',-apple-system,BlinkMacSystemFont,Roboto,sans-serif;color:var(--red);padding:4px 8px;border-radius:6px;}",
    ".msmenu .dots{cursor:pointer;font:800 18px/1 'Segoe UI',-apple-system,BlinkMacSystemFont,Roboto,sans-serif;color:var(--red);padding:4px 8px;border-radius:6px;"
    "display:flex;align-items:center;justify-content:center;min-width:44px;min-height:44px;background:none;border:0;}/* 1443 P07.06: a 44x44 button */")
# the phone rule's padding never applied (the inline padding beats it) and its -9px/-8px margins
# would now pull the 44px button over the forward arrow — retired; min-width/min-height do its job
s = one(s, '  .msmenu .dots{padding:11px 14px;margin:-9px -8px;}\n', '')

# sign-in: Remember me (22px label) and Forgot password (16px link) get 44px pads
s = one(s,
    '.rememberlbl{display:inline-flex;align-items:center;gap:7px;cursor:pointer;}',
    '.rememberlbl{display:inline-flex;align-items:center;gap:7px;cursor:pointer;position:relative;}\n'
    '/* 1443 P07.06: 44px targets without moving the row — the pads sit in the 12px above it */\n'
    ".rememberlbl::after{content:'';position:absolute;left:0;right:0;top:-12px;bottom:-12px;}")
s = one(s,
    '.forgotlink{color:#1d4f91;text-decoration:none;font-weight:700;}',
    '.forgotlink{color:#1d4f91;text-decoration:none;font-weight:700;position:relative;}\n'
    ".forgotlink::after{content:'';position:absolute;left:0;right:0;top:-15px;bottom:-15px;}")

# punch search: the input fills its 44px box (it sat 23px tall in the middle of it)
s = one(s,
    ".pu-srch input{flex:1;background:none;border:0;outline:0;color:var(--rbe-ink);font:600 13px 'Segoe UI',-apple-system,BlinkMacSystemFont,Roboto,Arial,sans-serif;min-width:0;}",
    ".pu-srch input{flex:1;background:none;border:0;outline:0;color:var(--rbe-ink);font:600 13px 'Segoe UI',-apple-system,BlinkMacSystemFont,Roboto,Arial,sans-serif;min-width:0;align-self:stretch;margin:-2px 0;}/* 1443 P07.06: 46px — it has no ground of its own, so it can overhang the box's 1px border */")

# the document title: 34px -> 44px
s = one(s,
    '#reportTitle{height:34px;font-size:13px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.18);\n  color:#f3e9dc;border-radius:8px;width:100%;padding:0 12px;box-sizing:border-box;}',
    '#reportTitle{height:44px;font-size:13px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.18);\n  color:#f3e9dc;border-radius:8px;width:100%;padding:0 12px;}/* 1443 P07.06: 34 -> 44px; box-sizing dropped, the global * rule already sets it */')

# ───────────────────────── P07.10 solid muted inks ─────────────────────────
# Production out-of-month days: the number takes --pb-mut (dark 7.01 / light 5.80 / Sun 9.06
# on the day cell) instead of the whole cell at 45% (2.91 light / 4.04 dark). Sun already did
# exactly this; its two twins are now the base rule's own result and are retired.
s = one(s,
    '#cr-pb .pbday.out{ opacity:.45; }',
    '#cr-pb .pbday.out .dn{ color:var(--pb-mut,#9aa3ab); --cr-stack:"1443 P07.10: the out-of-month state of the day number; the base .dn ink stays for in-month days"; }/* 1443 P07.10: was the whole cell at opacity .45 (2.91:1 light, 4.04:1 dark); Sun\'s pattern, for every theme */')
s = one(s, ':root[data-cr-sun][data-theme="rb-light"] #cr-pb .pbday.out{opacity:1;--cr-stack:"Sun"}\n', '')
s = one(s, ':root[data-cr-sun][data-theme="rb-light"] #cr-pb .pbday.out .dn{color:var(--pb-mut,#444951);--cr-stack:"Sun"}\n', '')
# Community zero counts: --ccm-dim at full strength (5.10:1 dark and light on --ccm-card)
s = one(s,
    '#cr-cc .cc-jmb .n.z{color:var(--ccm-dim);opacity:.6}',
    '#cr-cc .cc-jmb .n.z{color:var(--ccm-dim,#828c86);--cr-stack:"1443 P07.10: the zero state of the count, edited in place; the .n ink stays for live counts"}/* 1443 P07.10: opacity .6 put it at 2.38:1 light / 2.66:1 dark */')
# the Clients bar counts: --rbe-mute2, the count ink .ljopt .cnt and .cre-row .c already use
# (dark 6.41 chip / 7.22 bar, light 5.10 chip / 4.93 bar) instead of the label at 70%
s = one(s,
    ".cd-crmchip b{font:800 11px ui-monospace,Menlo,monospace;opacity:.7;}",
    ".cd-crmchip b{font:800 11px ui-monospace,Menlo,monospace;color:var(--rbe-mute2,#9aa0a8);}/* 1443 P07.10: was opacity .7 — All 2.86:1 in light */")

# ───────────────────────── P07.11 keyboard ─────────────────────────
# the top bar: the two dropdowns carry their role on a label span, because the menu lives inside them
# and a button may not hold focusable items. (The plain items and the menu items get theirs at runtime,
# below, so the 755 pill markup stays byte-for-byte what gate_755 holds it to.)
for dd, lab in (('prod', 'Production'), ('tools', 'Tools')):
    s = one(s,
        '<span class="cbn cbdd" data-dd="%s">%s <b class="car">&#9660;</b>' % (dd, lab),
        '<span class="cbn cbdd" data-dd="%s"><span class="cbl" role="button" tabindex="0" aria-haspopup="true" aria-expanded="false">%s <b class="car">&#9660;</b></span>' % (dd, lab))
s = one(s,
    "if(document.readyState === 'loading'){ document.addEventListener('DOMContentLoaded', resolveHide); }\nelse { resolveHide(); }\n",
    "if(document.readyState === 'loading'){ document.addEventListener('DOMContentLoaded', resolveHide); }\nelse { resolveHide(); }\n"
    "/* 1443 P07.11: every destination on the bar and in its menus is a tab stop that Enter / Space fires (the one\n"
    "   delegated handler beside the sheet mechanism). Set once, here, rather than in the markup: relocateNav()\n"
    "   and paintCrmPills() move and relabel these same elements, and the 755 pills stay as written. */\n"
    "Array.prototype.forEach.call(B.querySelectorAll('.cbn[data-go], .cbi[data-go]'), function(el){\n"
    "  if(el.getAttribute('role') !== 'button'){ el.setAttribute('role', 'button'); el.setAttribute('tabindex', '0'); }\n"
    "});\n")
# above 900px the bar sits flush between 44px controls (the job menu and work-order button over it on a
# job, the left rail's first button under it), so there is no pixel to pad into: the items grow to 44px
# instead (padding 11 -> 12/13, the bar 42 -> 45px; fixHeadPad() measures the header, so the page follows)
s = one(s,
    "#crBanner .cbn{position:relative;display:flex;align-items:center;gap:5px;padding:11px 12px;color:#c8cdd4;",
    "#crBanner .cbn{position:relative;display:flex;align-items:center;gap:5px;padding:12px 12px 13px;color:#c8cdd4;")
s = one(s,
    "font:700 13px 'Segoe UI',-apple-system,BlinkMacSystemFont,Roboto,Arial,sans-serif;cursor:pointer;border-bottom:3px solid transparent;user-select:none;}\n",
    "font:700 13px 'Segoe UI',-apple-system,BlinkMacSystemFont,Roboto,Arial,sans-serif;cursor:pointer;border-bottom:3px solid transparent;user-select:none;}\n"
    "/* 1443 P07.11: the bar's items are role=buttons now, so the 44px floor measures them (padding 12/13 above makes\n"
    "   them 44px). A dropdown's button is its label span, because the menu lives inside it and a button may not\n"
    "   hold focusable items; laid out exactly as the bare text and caret were, and its pad fills the whole item. */\n"
    "#crBanner .cbl{display:inline-flex;align-items:center;gap:5px;}\n"
    "#crBanner .cbdd .cbl::after{content:'';position:absolute;left:0;right:0;top:0;bottom:-3px;}\n"
    )
s = one(s,
    "  #crBanner .cbn{padding:9px 9px;font-size:13px;}\n",
    "  #crBanner .cbn{padding:9px 9px;font-size:13px;}\n"
    "  /* 1443 P07.11: on a phone the items stay 37px (the bar is unchanged) and carry a pad instead: it fills the\n"
    "     item and the bar and overhangs 2px into the header's own ground above and the page's padding below. */\n"
    "  #crBanner .cbn:not(.cbdd)::after,#crBanner .cbdd .cbl::after{content:'';position:absolute;left:0;right:0;top:-4px;bottom:-8px;}\n")
s = one(s,
    "function closeMenus(){\n  Array.prototype.forEach.call(B.querySelectorAll('.cbdd.open'), function(x){ x.classList.remove('open'); });\n}",
    "function closeMenus(){\n  Array.prototype.forEach.call(B.querySelectorAll('.cbdd.open'), function(x){ x.classList.remove('open'); ddExpanded(x, false); });\n}\n"
    "/* 1443 P07.11: the dropdown's label says whether its menu is open; written only on a change */\n"
    "function ddExpanded(dd, on){\n  var l = dd.querySelector('.cbl');\n  if(l && l.getAttribute('aria-expanded') !== String(on)) l.setAttribute('aria-expanded', String(on));\n}")
s = one(s,
    "    if(!was){ dd.classList.add('open'); gateDoors(dd); fitMenu(dd); }",
    "    if(!was){ dd.classList.add('open'); ddExpanded(dd, true); gateDoors(dd); fitMenu(dd); }")

# the home list cards (Recent leads, Today, Gone quiet): one click handler, so all three rows
s = one(s,
    "    return '<div class=\"kplrow\" data-proj=\"' + p.id + '\" style=\"--sc:' + sc + ';--scl:' + stageInk(st) + '\">' +",
    "    return '<div class=\"kplrow\" role=\"button\" tabindex=\"0\" data-proj=\"' + p.id + '\" style=\"--sc:' + sc + ';--scl:' + stageInk(st) + '\">' +")
s = one(s,
    "    return '<div class=\"kptrow\"' + (pr ? ' data-proj=\"' + pr.id + '\"' : '') + '>' +",
    "    return '<div class=\"kptrow\"' + (pr ? ' role=\"button\" tabindex=\"0\" data-proj=\"' + pr.id + '\"' : '') + '>' +")
s = one(s,
    "      return '<div class=\"kpqrow' + (x.days >= 30 ? ' qstale' : '') + '\" data-proj=\"' + x.p.id + '\">' +",
    "      return '<div class=\"kpqrow' + (x.days >= 30 ? ' qstale' : '') + '\" role=\"button\" tabindex=\"0\" data-proj=\"' + x.p.id + '\">' +")
# the Clients card: the stop is the card's body, because the card also holds the Call and Text
# links and a button may not contain them
s = one(s,
    "    '<span class=\"cd-selck\">' + (on ? '\\u2713' : '') + '</span>' +\n    '<div class=\"bd\">' +",
    "    '<span class=\"cd-selck\">' + (on ? '\\u2713' : '') + '</span>' +\n    '<div class=\"bd\" role=\"button\" tabindex=\"0\">' +")
# the home A/R card is a doorway for admins only, so only an admin gets the tab stop
s = one(s,
    "function markDoorway(){ try{ if(isAdm()) document.body.classList.add('cr-ar-adm'); }catch(e){} }",
    "function markDoorway(){ try{ if(isAdm()){ document.body.classList.add('cr-ar-adm');\n"
    "    var c = document.getElementById('arCard');   /* 1443 P07.11: and a keyboard can open it */\n"
    "    if(c && c.getAttribute('role') !== 'button'){ c.setAttribute('role', 'button'); c.setAttribute('tabindex', '0');\n"
    "      c.setAttribute('data-cr-delegate', 'cr-ar-script'); } } }catch(e){} }   /* its click is this module's document-level delegate */")

# the .projform modal family + the estimate builder: dialogs, so the shared trap below takes them
for mid, name in (('projModal', 'aria-labelledby="projModalTitle"'),
                  ('ckModal', 'aria-label="Roofing inspection checklist"'),
                  ('gcModal', 'aria-label="General inspection checklist"'),
                  ('leadModal', 'aria-label="Leads from this inspection"'),
                  ('leadFormModal', 'aria-label="New lead"'),
                  ('apptModal', 'aria-label="Appointments"'),
                  ('sigModal', 'aria-label="Client signature"')):
    s = one(s, '<div id="%s" style="display:none;' % mid,
               '<div id="%s" role="dialog" aria-modal="true" %s style="display:none;' % (mid, name))
s = one(s,
    "view.id = 'cr-est-view';",
    "view.id = 'cr-est-view';\n"
    "/* 1443 P07.11: a full-screen editor over the app — Tab stays in it (the shared trap reads aria-modal) */\n"
    "view.setAttribute('role', 'dialog'); view.setAttribute('aria-modal', 'true'); view.setAttribute('aria-label', 'Estimate builder');")
# its Preview opens OVER the builder (opaque, z 9550): a dialog too, so the trap follows it to the top
s = one(s,
    "previewEl.id = 'cr-epub-preview';",
    "previewEl.id = 'cr-epub-preview';\n"
    "previewEl.setAttribute('role', 'dialog'); previewEl.setAttribute('aria-modal', 'true'); previewEl.setAttribute('aria-label', 'Estimate preview');   /* 1443 P07.11 */")

# ONE shared trap + ONE Enter/Space handler, beside the 1430 sheet mechanism they extend
TRAP = r"""
  /* 1443 P07.11: ONE focus trap, for whatever is on top. The top layer is the highest of the open sheets
     (the mechanism above) and the visible [aria-modal="true"] dialogs — the .projform family, the
     estimate builder, crAsk, the Ask box and the rest. Tab past its last control comes back to its
     first (Shift+Tab the other way), and focus that lands outside it is brought back in. A control in a
     layer stacked ABOVE it (the installed tab bar) is left alone: the person can see and tap it. Only
     the keyboard is touched; a program that moves focus is never second-guessed. */
  var crTabAt = 0, crTabBack = false;
  function crLayerZ(el){
    var z = 0;
    for(var n = el; n && n.nodeType === 1 && n !== document.body; n = n.parentElement){
      var cs = getComputedStyle(n);
      if(cs.position !== 'static'){ var v = parseInt(cs.zIndex, 10); if(!isNaN(v) && v > z) z = v; }
    }
    return z;
  }
  function crShownLayer(el){
    if(!el.getClientRects().length || getComputedStyle(el).visibility === 'hidden') return false;
    for(var n = el; n && n.nodeType === 1; n = n.parentElement){ if(parseFloat(getComputedStyle(n).opacity) < 0.05) return false; }
    return true;
  }
  function crTrapBox(){
    var c = [];
    try{ c = crSheets().slice(); }catch(_e){}
    var m = document.querySelectorAll('[aria-modal="true"]');
    for(var i = 0; i < m.length; i++){ if(c.indexOf(m[i]) === -1 && crShownLayer(m[i])) c.push(m[i]); }
    var best = null, bz = -1;
    c.forEach(function(el){
      var z = crLayerZ(el);
      if(!best || z > bz || (z === bz && (best.compareDocumentPosition(el) & 4))){ best = el; bz = z; }
    });
    return best;
  }
  function crTabStops(box){
    var q = box.querySelectorAll('a[href],button,input,select,textarea,iframe,summary,[tabindex],[contenteditable="true"],[contenteditable=""]');
    var out = [];
    for(var i = 0; i < q.length; i++){
      var n = /** @type {any} */ (q[i]);
      if(n.tabIndex < 0 || n.disabled || (n.tagName === 'INPUT' && n.type === 'hidden') || n.closest('[inert]')) continue;
      if(!n.getClientRects().length || getComputedStyle(n).visibility === 'hidden') continue;
      out.push(n);
    }
    return out;
  }
  function crAboveLayer(a, box){
    if(!(a instanceof Element) || a === document.body || box.contains(a)) return false;
    return crLayerZ(a) > crLayerZ(box);
  }
  document.addEventListener('keydown', function(e){
    if(e.key !== 'Tab' || e.altKey || e.ctrlKey || e.metaKey) return;
    crTabAt = Date.now(); crTabBack = !!e.shiftKey;
    if(e.defaultPrevented) return;
    var box = crTrapBox(); if(!box) return;
    var f = crTabStops(box); if(!f.length) return;
    var a = document.activeElement;
    if(!a || !box.contains(a)){
      if(crAboveLayer(a, box)) return;
      e.preventDefault(); (e.shiftKey ? f[f.length - 1] : f[0]).focus(); return;
    }
    if(e.shiftKey ? a === f[0] : a === f[f.length - 1]){ e.preventDefault(); (e.shiftKey ? f[f.length - 1] : f[0]).focus(); }
  });
  /* the backstop: a radio group or a positive tabindex can carry focus out past the last stop */
  document.addEventListener('focusin', function(e){
    if(Date.now() - crTabAt > 600) return;
    var t = e.target;
    if(!(t instanceof Element)) return;
    var box = crTrapBox(); if(!box || box.contains(t) || crAboveLayer(t, box)) return;
    var f = crTabStops(box); if(!f.length) return;
    (crTabBack ? f[f.length - 1] : f[0]).focus();
  }, true);
  /* 1443 P07.11: Enter / Space on an element that SAYS it is a button (role="button") clicks it, the way a
     <button> already does. Delegated once, for every one in the file — the top bar, the list cards and
     the older role=button rows that had a tab stop and no key (the insurance header, Balance due, the
     convert banner). A module that handles its own keys calls preventDefault and is left alone. */
  document.addEventListener('keydown', function(e){
    if(e.defaultPrevented || e.repeat || e.altKey || e.ctrlKey || e.metaKey) return;
    if(e.key !== 'Enter' && e.key !== ' ' && e.key !== 'Spacebar') return;
    var t = /** @type {any} */ (e.target);
    if(!(t instanceof HTMLElement) || t.getAttribute('role') !== 'button' || t.isContentEditable) return;
    if(/^(BUTTON|A|INPUT|SELECT|TEXTAREA|SUMMARY)$/.test(t.tagName)) return;
    e.preventDefault();
    t.click();
  });"""
s = one(s,
    "  window.CardinalSheets = Object.assign(window.CardinalSheets || {}, {\n    list: crSheets, top: crTopSheet, close: crCloseSheet, closeAll: crCloseAllSheets\n  });",
    "  window.CardinalSheets = Object.assign(window.CardinalSheets || {}, {\n    list: crSheets, top: crTopSheet, close: crCloseSheet, closeAll: crCloseAllSheets\n  });" + TRAP)

# ───────────────────────── P07.12 accessible names ─────────────────────────
s = one(s, '<input type="search" id="ljSearch" placeholder="Search Results">',
           '<input type="search" id="ljSearch" placeholder="Search Results" aria-label="Search leads and jobs">')
s = one(s, '<select class="ljsortsel" id="ljSortSel"></select>',
           '<select class="ljsortsel" id="ljSortSel" aria-label="Sort leads and jobs"></select>')
s = one(s, '<select class="cd-sortsel" id="cdSortSel"></select>',
           '<select class="cd-sortsel" id="cdSortSel" aria-label="Sort clients"></select>')
s = one(s, '<select class="cre-sortsel" data-cre-sortsel></select>',
           '<select class="cre-sortsel" data-cre-sortsel aria-label="Sort estimates"></select>')
s = one(s, '<select id="jobMenuSel" class="jobmenu jobmenu-head" style="display:none;">',
           '<select id="jobMenuSel" class="jobmenu jobmenu-head" aria-label="Job section" style="display:none;">')
s = one(s, '<input type="text" id="qiAddrInp" placeholder="Type an address&#8230;"',
           '<input type="text" id="qiAddrInp" placeholder="Type an address&#8230;" aria-label="Property address"')
s = one(s,
    "'<input type=\"text\" data-f=\"title\" value=\"' + esc(s.title) + '\" placeholder=\"Estimate title\" />' +",
    "'<input type=\"text\" data-f=\"title\" value=\"' + esc(s.title) + '\" placeholder=\"Estimate title\" aria-label=\"Estimate title\" />' +")
s = one(s,
    "    (kind === 'phone' ? 'Phone number' : 'Email address') + '\">' +\n    '<select>'",
    "    (kind === 'phone' ? 'Phone number' : 'Email address') + '\" aria-label=\"' + (kind === 'phone' ? 'Phone number' : 'Email address') + '\">' +\n"
    "    '<select aria-label=\"' + (kind === 'phone' ? 'Phone type' : 'Email type') + '\">'")
s = one(s, '<button class="calnav" id="calPrev">&#8249;</button>',
           '<button class="calnav" id="calPrev" aria-label="Previous month">&#8249;</button>')
s = one(s, '<button class="calnav" id="calNext">&#8250;</button>',
           '<button class="calnav" id="calNext" aria-label="Next month">&#8250;</button>')
s = one(s,
    "var out = '<div class=\"calhead\"><button class=\"calnav\" data-mc=\"p\">&#8249;</button><b>' +",
    "var out = '<div class=\"calhead\"><button class=\"calnav\" data-mc=\"p\" aria-label=\"Previous month\">&#8249;</button><b>' +")
s = one(s,
    "MO[mo] + ' ' + yr + '</b><button class=\"calnav\" data-mc=\"n\">&#8250;</button></div><div class=\"calgrid\">';",
    "MO[mo] + ' ' + yr + '</b><button class=\"calnav\" data-mc=\"n\" aria-label=\"Next month\">&#8250;</button></div><div class=\"calgrid\">';")

# ───────────────────────── P10.03 sheets ─────────────────────────
s = one(s,
    "  var CR_SHEET_CANCEL = { projModal: 'pfCancel', sigModal: 'sigCancel' };   /* 1341's pair, kept first */",
    "  var CR_SHEET_CANCEL = { projModal: 'pfCancel', sigModal: 'sigCancel' };   /* 1341's pair, kept first */\n"
    "  /* 1443 P10.03: a sheet may sit one level down, in a body-level wrapper that is not itself laid out over\n"
    "     the page. The Ask sheet (#cr-ai-sheet) lives in #cr-ai-root beside its button, so Escape did nothing\n"
    "     and Back moved the page under it. */\n"
    "  var CR_SHEET_HOSTS = { 'cr-ai-root': 1 };")
s = one(s,
    "    if(!el || el.parentNode !== document.body || el.style.display === 'none') return false;",
    "    var up = el ? el.parentElement : null;\n"
    "    if(!el || !(up === document.body || (up && CR_SHEET_HOSTS[up.id])) || el.style.display === 'none') return false;")
s = one(s,
    "    var out = [], k = document.body ? document.body.children : [];",
    "    var out = [], k = document.body ? Array.prototype.slice.call(document.body.children) : [];\n"
    "    Object.keys(CR_SHEET_HOSTS).forEach(function(id){\n"
    "      var h = document.getElementById(id);\n"
    "      if(h && h.parentElement === document.body) k = k.concat(Array.prototype.slice.call(h.children));\n"
    "    });")
# Self Check: an opaque full-screen panel (so not a sheet), released on Back but deaf to Escape
s = one(s,
    "window.addEventListener('popstate', releaseIfOpen);\n",
    "window.addEventListener('popstate', releaseIfOpen);\n"
    "/* 1443 P10.03: Escape closes it too, through the same close(). Not while a run has it hidden: the run\n"
    "   re-opens it when it finishes, and closing under it would strand the panel without its lock. */\n"
    "document.addEventListener('keydown', function(e){\n"
    "if((e.key !== 'Escape' && e.key !== 'Esc') || e.defaultPrevented) return;\n"
    "if(!panel || !panel.classList.contains('open') || panel.style.visibility === 'hidden') return;\n"
    "e.preventDefault(); close();\n"
    "});\n")

pl.write_atomic(P, s)
print('patch_1443_a11y applied ->', P)
