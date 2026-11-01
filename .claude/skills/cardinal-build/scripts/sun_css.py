# sun_css.py — exec'd by patch_S.py. Defines build_sun_css(src) -> the body of cr-sun-styles.
# Pure function of the input file: same input, same bytes.
import re as _re

_SCOPE = _re.compile(r'#cr-pb\b|#cr-pk\b|#cr-disp\b|#punchView\b|#puQueue\b|\.pu-[\w-]|\.pl-[\w-]|#navMenu\b|#pwaNav\b|#crToasts\b|#crAsk\b|#cr-lnav\b|#cr-nav-palette-hint\b')
_MARK = '--cr-stack:"Sun"'

_HEAD = r'''/* ============================================================================
   SUN  ·  Theo's T8 C pick  ·  a third appearance for a roof in daylight
   ----------------------------------------------------------------------------
   Asked: "On a roof in daylight, what should Scottie and Curtis see: the dark
   default, the existing light mode, or a high-contrast Sun mode?" — Sun.

   Sun is NOT a new theme system. It is the light theme (data-theme="rb-light",
   every --rbe-* and module light twin) plus data-cr-sun="1" on :root, set by the
   same apply() in cr-rbtheme-toggle-script from the same key. Three things:
     1. INKS   every text colour on the covered screens clears 7:1 on its worst
               ground (light floors are 4.5). Hue kept, darkened by computation
               (sRGB scale until 7.3:1), not picked: stage, urgency and money
               colours stay recognisable. Bars, dots and spines keep their brights.
               Grounds go white.
     2. WEIGHT one step heavier: 400->600, 600->700, 700->800, 800->900. GENERATED
               from every covered rule that sets a weight (section 3), so the
               relative hierarchy is the module's own.
     3. SIZE   one Text size step up — in cr-textsize-styles, not here.
   Colour and weight only. NEVER font-family: Production's typeface is changing
   under this in the same release, and Sun must not care which one it is.

   Covered (complete in Sun at 390 and desktop): the Production board, its day
   sheet and calendar, a box list, Punch & Repairs, the punch card and its photo
   slots, Crew Dispatch, the drawer (and the desktop left nav), the bottom tab
   bar, the desktop header, toasts and the crAsk sheet. Every other screen is
   plain Light plus the size step (and the weight step where a covered rule
   reaches it).

   EVERY rule here out-specifies an existing one ON PURPOSE and says so with
   --cr-stack: each is a Sun twin of a Light rule that must stay for Light.
   Colour rules start :root[data-cr-sun][data-theme="rb-light"] (0,3,0) — one
   class above the light twins they replace, so position in the file is moot.
   ========================================================================== */
'''

_COLOUR = r'''
/* ── 1. grounds and inks, by token ───────────────────────────────────────── */
/* Production board + its day sheet (the sheet is #cr-pb-modal, outside #cr-pb) */
SUN #cr-pb,SUN #cr-pb-modal{--pb-g:#ffffff;--pb-c:#ffffff;--pb-ink:#0e1013;--pb-mut:#444951;--pb-dim:#444950;
  --pb-acc:#78121b;--pb-hot:#792d1a;--pb-ok:#1f5238;--pb-wx:#114b7d;--pb-line:#cdd2d8;MARK}
SUN #cr-pb .pbday.out{opacity:1;MARK}
/* desktop: four 94px tiles is what a 1366 screen leaves after the size step, and
   "SCHEDULED" in its tracked caps does not fit one (the same clip Text size Large has on
   1433). In Sun the boxes go 2x2 on desktop, and back to 4-up only where the row holds
   four readable tiles at that zoom step (a media query sees the unzoomed viewport, so
   the threshold is per step: 1700px at Sun's 1.15, 1950 with Large, 2200 with Larger). */
SUN body.cr-lnav-on #cr-pb .pbtiles{grid-template-columns:repeat(2,minmax(0,1fr));MARK}
@media (min-width:1100px){SUN body #cr-pb .pbtiles{grid-template-columns:repeat(2,minmax(0,1fr));MARK}}
@media (min-width:1700px){SUN:not([data-cr-text]) body #cr-pb .pbtiles{grid-template-columns:repeat(4,minmax(0,1fr));MARK}}
@media (min-width:1950px){SUN[data-cr-text="lg"] body #cr-pb .pbtiles{grid-template-columns:repeat(4,minmax(0,1fr));MARK}}
@media (min-width:2200px){SUN[data-cr-text="xl"] body #cr-pb .pbtiles{grid-template-columns:repeat(4,minmax(0,1fr));MARK}}
SUN #cr-pb .pbday.out .dn{color:var(--pb-mut,#444951);MARK}
SUN #cr-pb-modal .sheet{background:#ffffff;color:#0e1013;MARK}
SUN #cr-pb-modal label{color:#444951;MARK}
SUN #cr-pb-modal .cancel{color:#444951;MARK}
/* the punch card. .pkvis is a DARK band in both themes and re-declares its own
   tokens, so it gets a light-on-dark Sun ink of its own */
SUN #cr-pk{--pk-g:#ffffff;--pk-c:#ffffff;--pk-ink:#0e1013;--pk-mut:#444951;--pk-dim:#444950;
  --pk-acc:#78121b;--pk-accl:#78121b;--pk-hot:#792d1a;--pk-ok:#1f5238;--pk-line:#cdd2d8;MARK}
SUN #cr-pk .pkvis{--pk-dim:#c3c9d1;MARK}
SUN #cr-pk .pkbang{background:#a81b27;MARK}
/* Crew Dispatch (its light twin exists; the header switch is hidden there, the theme still applies) */
SUN #cr-disp{--disp-bg:#ffffff;--disp-ink:#0e1013;--disp-dim:#434951;--disp-mute:#44484f;--disp-band:#414955;
  --disp-wkend:#454951;--disp-accent:#4a5058;--disp-need:#6d470b;--disp-curtis:#0a515a;--disp-scottie:#523b88;
  --disp-repair:#99131c;--disp-wx:#114b7d;--disp-line:#cdd2d8;MARK}
/* Punch & Repairs */
SUN #punchView{--bg:#ffffff;--rbe-mute:#454545;--pl-tarp:#1e468c;--pl-ticket:#664103;--pl-callback:#563985;
  --pl-punch:#185234;--pl-late:#9c141e;--pl-live:#135733;MARK}
SUN #puQueue .ph2 b,SUN .pu-age{color:#714600;MARK}
SUN .pu-age.hot{color:#a01a25;MARK}
SUN .pu-new{background:#a81b27;MARK}
SUN .pl-flag.rain{color:#173f66;MARK}
/* the drawer: white, near-black, section heads in the portal's own accent taken
   toward black (45% keeps amber amber and teal teal, both over 7:1). Each ink is
   written for the phone drawer (body:not(.cr-lnav-on), where the light rules carry
   that prefix and outrank a bare #navMenu) AND for the desktop popover. */
SUN body:not(.cr-lnav-on) #navMenu{background:#ffffff !important;MARK}
SUN body:not(.cr-lnav-on) #navMenu .navsec,SUN body:not(.cr-lnav-on) #navMenu .navsec::before,SUN body.cr-lnav-on #navMenu .navsec,SUN body.cr-lnav-on #navMenu .navsec::before{color:color-mix(in srgb,var(--hac,#376CA0) 45%,#000) !important;MARK}
SUN body:not(.cr-lnav-on) #navMenu .navsec::after,SUN body:not(.cr-lnav-on) #navMenu .navopt::after,SUN body.cr-lnav-on #navMenu .navsec::after,SUN body.cr-lnav-on #navMenu .navopt::after,SUN #navMenu .cr-ts .lb{color:#3b4450;MARK}
SUN body:not(.cr-lnav-on) #navMenu .cr-dh-co{opacity:1;color:#3b4450;MARK}
SUN body:not(.cr-lnav-on) #navMenu #cr-nav-palette-hint,SUN body.cr-lnav-on #navMenu #cr-nav-palette-hint,SUN #navMenu [data-cr-footer]{color:#3b4450 !important;MARK}
SUN #cr-nav-palette-hint kbd{color:#2b3036;MARK}
/* the build line's weight is an inline style; only !important reaches it */
SUN #navMenu [data-cr-footer]{font-weight:700 !important;MARK}
SUN #navMenu .cr-ts button[aria-pressed="true"]{background:color-mix(in srgb,var(--lnav-crmc,#c8202e) 80%,#000);border-color:color-mix(in srgb,var(--lnav-crmc,#c8202e) 80%,#000);MARK}
/* placeholders: the UA grey (#757575) is 4.4:1 — a hint is still text Scottie reads */
SUN :is(#cr-pb,#cr-pb-modal,#cr-pk,#cr-disp,#punchView,#navMenu,#crAsk) :is(input,textarea)::placeholder{color:#4a4f57;opacity:1;MARK}
/* desktop: the left nav (body.cr-lnav-on) is the drawer there. Its grey rail stays —
   it is what separates the nav from a white page — and every ink on it clears 7:1 */
SUN #cr-lnav{--rbe-mute:#454545;--lnav-ink:color-mix(in srgb,var(--lnav-ink-lt,#8f1620) 62%,#000);MARK}
SUN #cr-lnav .lnav-sec{color:#3b4450;MARK}
SUN #cr-lnav .lnav-ver{opacity:1;color:#3b4450;MARK}
SUN #cr-lnav .lnav-item[data-k="cardinaltruth"] .lnav-tx{color:#901721;MARK}
SUN #cr-lnav .lnav-item[data-k="communityhub"] .lnav-tx{color:#03543d;MARK}
/* the portal colour behind white ink (the tab bar's +, and every --crm-id fill) */
SUN body.standalone #pwaNav .pwaplus b{background:color-mix(in srgb,var(--crm-id,#c8202e) 80%,#000);MARK}
SUN body[data-crm="retail"]{--crm-id:#a81b27;MARK}
SUN body[data-crm="insurance"]{--crm-id:#0c615a;MARK}
SUN body[data-crm="community"]{--crm-id:#036247;MARK}
/* desktop header's + (Curtis sees it over Production at 1440): the portal fill toward black.
   .cr-ib is in the selector only to clear the light rule's !important (2,3,1) */
SUN #cr-hd2-bar #addProjectBtn.cr-ib{background:color-mix(in srgb,var(--crm-id,var(--hac,#376CA0)) 75%,#000) !important;MARK}
/* toasts: the green ground deepened to 7:1 under white, and the x at full strength */
SUN #crToasts .crt.ok{background:#196331;border-color:#196331;MARK}
SUN #crToasts .crt .crtx{opacity:1;MARK}
/* the crAsk sheet */
SUN #crAsk .askwhy,SUN #crAsk .askpick small{color:#3b4450;MARK}
SUN #crAsk .askgo{background:#a81b27;MARK}
SUN #crAsk .askpick.askdanger{color:#a3101c;MARK}
'''


def _decls(body):
    body = _re.sub(r'/\*.*?\*/', '', body, flags=_re.S)
    out = []
    depth = 0
    cur = ''
    for ch in body:
        if ch == '(':
            depth += 1
        elif ch == ')':
            depth -= 1
        if ch == ';' and depth == 0:
            out.append(cur)
            cur = ''
            continue
        cur += ch
    out.append(cur)
    res = []
    for d in out:
        if ':' not in d:
            continue
        p, v = d.split(':', 1)
        p = p.strip().lower()
        v = v.strip()
        imp = bool(_re.search(r'!\s*important\s*$', v))
        v = _re.sub(r'!\s*important\s*$', '', v).strip()
        res.append((p, v, imp))
    return res


_SIZE = _re.compile(r'^(?:[\d.]+(?:px|em|rem|%|pt|vw|vh|ex|ch|vmin|vmax)(?:/.*)?|xx-small|x-small|small|medium|large|x-large|xx-large|smaller|larger|(?:calc|clamp|min|max)\(.*)$', _re.I)


def _weight(p, v):
    """the weight a declaration sets, or None when it cannot be known statically"""
    if 'var(' in v and p == 'font-weight':
        return None
    if p == 'font-weight':
        if v.isdigit():
            return int(v)
        return {'normal': 400, 'bold': 700}.get(v.lower())
    # font shorthand
    if v.lower() in ('inherit', 'initial', 'unset', 'revert', 'caption', 'icon', 'menu', 'message-box', 'small-caption', 'status-bar') or v.startswith('var('):
        return None
    toks = v.split()
    pre = []
    for t in toks:
        if _SIZE.match(t):
            break
        if t.startswith('var('):
            return None
        pre.append(t)
    else:
        return None                       # no size token: not a font shorthand we understand
    for t in pre:
        if t.isdigit():
            return int(t)
        if t.lower() == 'bold':
            return 700
        if t.lower() in ('bolder', 'lighter'):
            return None
    return 400


def _bump(w):
    if w < 500:
        return 600
    if w < 700:
        return 700
    if w < 800:
        return 800
    if w < 900:
        return 900
    return None


def _split_sel(sel):
    parts, depth, cur = [], 0, ''
    for ch in sel:
        if ch in '([':
            depth += 1
        elif ch in ')]':
            depth -= 1
        if ch == ',' and depth == 0:
            parts.append(cur.strip())
            cur = ''
            continue
        cur += ch
    parts.append(cur.strip())
    return [p for p in parts if p]


def _sunify(s):
    s = _re.sub(r'\s+', ' ', s)
    if s.startswith(':root'):
        return ':root[data-cr-sun]' + s          # :root[data-cr-sun]:root[data-theme=...] — one compound
    if s.startswith('html'):
        return 'html:root[data-cr-sun]' + s[4:]
    return ':root[data-cr-sun] ' + s


def build_sun_css(src):
    sun = ':root[data-cr-sun][data-theme="rb-light"]'
    colour = _re.sub(r'\bSUN(?=[ :\[])', sun, _COLOUR).replace('MARK', _MARK)
    twins = []      # (media tuple, selector list, weight, important)
    n_rules = 0
    for r in csswalk.rules(src):
        if r.block == 'cr-sun-styles':
            continue
        if any('print' in m for m in r.media):
            continue
        parts = [p for p in _split_sel(r.selector) if _SCOPE.search(p)]
        if not parts:
            continue
        ds = _decls(r.body)
        cand = [(p, v, imp) for (p, v, imp) in ds if p in ('font-weight', 'font')]
        if not cand:
            continue
        imps = [c for c in cand if c[2]]
        p, v, imp = (imps or cand)[-1]
        w = _weight(p, v)
        if w is None:
            continue
        nw = _bump(w)
        if nw is None:
            continue
        twins.append((r.media, [_sunify(x) for x in parts], nw, imp))
        n_rules += 1
    out = [_HEAD, colour,
           '\n/* ── 2. the covered screens\' own ground weight (text no rule weighs) ─── */\n',
           ':root[data-cr-sun] :where(#cr-pb,#cr-pb-modal,#cr-pk,#cr-disp,#punchView,#navMenu,#pwaNav,#crToasts,#crAsk){font-weight:600;' + _MARK + '}\n',
           ':root[data-cr-sun] :where(#cr-pb,#cr-pb-modal,#cr-pk,#cr-disp,#punchView,#navMenu,#crAsk) :where(input,textarea,select,button){font-weight:600;' + _MARK + '}\n',
           '\n/* ── 3. weights, one step heavier — GENERATED by patch_S.py from the %d covered\n'
           '   rules that set one (font-weight, or the weight inside a font: shorthand).\n'
           '   Each twin is its rule\'s selector under :root[data-cr-sun] (+0,2,0), so twins keep\n'
           '   the order their originals had among themselves. Regenerate, never hand-edit. */\n' % n_rules]
    cur_media = None
    buf = []

    def flush():
        if not buf:
            return
        body = ''.join(buf)
        if cur_media:
            opens = ''.join(m + '{' for m in cur_media)
            out.append(opens + '\n' + body + '}' * len(cur_media) + '\n')
        else:
            out.append(body)
        buf.clear()
    for media, sels, nw, imp in twins:
        if media != cur_media:
            flush()
            cur_media = media
        buf.append(','.join(sels) + '{font-weight:%d%s;%s}\n' % (nw, ' !important' if imp else '', _MARK))
    flush()
    return ''.join(out)
