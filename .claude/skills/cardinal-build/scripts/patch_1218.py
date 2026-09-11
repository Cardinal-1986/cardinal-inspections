#!/usr/bin/env python3
"""Build 1218 — the Accounts Receivable dashboard and the payment sheet go dark.

WHY THIS BUILD EXISTS, AND THE CORRECTION IT CARRIES
----------------------------------------------------
Build 1216/1217 closed item 1 of the design programme ("kill the white
surfaces") against a sweep of EIGHT screens.  A sweep of all 32 sentinel
states, run before starting the button system, found a THIRD paper-white
surface the eight-screen read never visited: `#cr-ar-view`, the Accounts
Receivable dashboard, measured at rgb(244,244,245) with the app in DARK
mode.  So "item 1 is done" was true of what had been measured and false of
the app.  This build makes it true.

It also carries the seam 1216 opened and nobody could see: the offline
payment sheet (`#cr-pay-modal`) is hardcoded porcelain, and its two footer
buttons are `.crji-btn`, which 1216 turned DARK.  Since 1216 the sheet has
been a white card with dark grey buttons on it.  Not a contrast failure —
each button is readable against its own fill — but it is exactly the
"two apps in one window" inconsistency this programme exists to remove,
and it is reached from both surfaces this build darkens.

HOW (the 573 pattern, which 1216 also used)
-------------------------------------------
`--est-*` is declared at exactly TWO sites in the file (measured):
`#cr-est-view` at 71409 and `#cr-ar-view` at 85020.  They are independent
rules, so re-valuing the AR copy cannot reach the estimate builder.  Dark
values go in the base rule; the ORIGINAL porcelain values are restored
byte-for-byte under `:root[data-theme="rb-light"] #cr-ar-view`, so light
mode is unchanged.

The values are 1216's `--crji-*` palette, deliberately, not a new one: the
AR dashboard and the profile's Invoices & Payments card are the same money
language and are seen minutes apart.  A second dark palette for the same
job is the defect this programme is removing.

FIVE LITERALS COULD NOT BE CARRIED, and they are why this is not a
find-and-replace.  Measured with contrast.py on the dark card #141619:

    #166534 (reminders ON)   2.54:1   FAIL
    #C8202E (as INK)         3.20:1   FAIL
    #047857 (paid green)     3.31:1   FAIL
    #8a6420 (--est-warn)     3.39:1   FAIL
    #64748B (--crar-mist)    3.81:1   FAIL

Their dark twins all clear 4.5:1 on every dark ground in the view
(#0c0d0f page, #141619 card, #1b1f24 KPI tile):

    #34d399  9.43 / 8.61 / 10.11     #f08a90  7.55 / 6.89 / 8.09
    #e0a94f  8.59                    #a8b0ba  8.27 / 7.56 / 8.87

⚠ `--est-red` is TWO ROLES IN ONE TOKEN and is deliberately NOT re-valued.
It is a fill (`.crar-btn.primary`), a spine (`.crar-row.od` border-left)
and an ink (four rules).  Re-valuing it to the readable pink would turn
the brand button and the overdue spine pink; leaving it red leaves four
inks at 3.20:1.  So the INK role moves to a new `--crar-alert` and the
fill/spine role keeps `--est-red` at #C8202E in both themes.  CLAUDE.md's
rule that "bars, spines and dots keep the bright originals" is what says
the spine stays.

The status pills (`.crar-pill.*`) are deliberately untouched: they are
chips carrying their own light ground, they clear the floor on it, and
they already render on the dark client profile today.
"""
import sys, os, re
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import patch_lib as pl

SRC = sys.argv[1]
DST = sys.argv[2]
src = pl.load(SRC)
orig = src

# ─────────────────────────────────────────────────────────────────────────
# 1. the token rule: dark base + the porcelain restored under rb-light
# ─────────────────────────────────────────────────────────────────────────
TOK_OLD = """#cr-ar-view{
  /* the real --est-* porcelain tokens, declared here so every var() resolves
     even though this view is appended to <body>, not inside #cr-est-view. */
  --est-bg:#F4F4F5; --est-panel:#FFFFFF; --est-ink:#0F172A; --est-dim:#475569;
  --est-line:#E2E8F0; --est-well:#F8FAFC; --est-red:#C8202E; --est-focus:rgba(200,32,46,.22);
  --est-numbg:#EAEEF3; --est-inset:inset 4px 4px 9px #D1D9E6, inset -4px -4px 9px #FFFFFF;
  --est-lift:0 1px 2px rgba(15,23,42,.06),0 6px 16px rgba(15,23,42,.09);
  --est-hover:0 2px 4px rgba(15,23,42,.08),0 12px 26px rgba(15,23,42,.12);
  --crar-mist:#64748B;
  position:fixed; inset:0; z-index:9500; display:none; overflow:auto;
  background:var(--est-bg); color:var(--est-ink);
  font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;
  -webkit-font-smoothing:antialiased;
}"""

TOK_NEW = """#cr-ar-view{
  /* 1218: the AR dashboard was the THIRD paper-white surface — measured at
     rgb(244,244,245) with the app in dark mode, on a sweep of all 32 sentinel
     states. (The eight-screen read that drove 1216/1217 never opened it.)
     Dark values here; the ORIGINAL porcelain restored under the light theme
     below, so light mode is byte-for-byte what shipped.

     These are 1216's --crji-* values on purpose, not a second dark palette:
     this dashboard and the profile's Invoices & Payments card are the same
     money language, seen minutes apart.

     --est-* is declared at exactly two sites in this file (#cr-est-view and
     here) and they are independent rules, so this cannot reach the estimate
     builder. --est-red is NOT re-valued: it is a fill and a spine as well as
     an ink, and the ink role moved to --crar-alert. */
  --est-bg:#0c0d0f; --est-panel:#141619; --est-ink:#f2f4f7; --est-dim:#a8b0ba;
  --est-line:#262a30; --est-well:#1b1f24; --est-red:#C8202E; --est-focus:rgba(200,32,46,.22);
  --est-numbg:#1b1f24; --est-inset:inset 4px 4px 9px #0d0f12, inset -4px -4px 9px #23282e;
  --est-lift:0 1px 2px rgba(0,0,0,.45),0 6px 16px rgba(0,0,0,.5);
  --est-hover:0 2px 4px rgba(0,0,0,.5),0 12px 26px rgba(0,0,0,.6);
  --est-warn:#e0a94f;
  --crar-mist:#a8b0ba; --crar-alert:#f08a90; --crar-pos:#34d399; --crar-on:#34d399;
  --crar-mastersh:0 1px 2px rgba(0,0,0,.45);
  position:fixed; inset:0; z-index:9500; display:none; overflow:auto;
  background:var(--est-bg); color:var(--est-ink);
  font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;
  -webkit-font-smoothing:antialiased;
}
:root[data-theme="rb-light"] #cr-ar-view{
  /* the porcelain exactly as it shipped through 1217 — do not "tidy" a value
     here without recomputing it; #475569, #166534 and #8a6420 were each
     computed against white at 1108/1156/1157 and are recorded in the rules. */
  --est-bg:#F4F4F5; --est-panel:#FFFFFF; --est-ink:#0F172A; --est-dim:#475569;
  --est-line:#E2E8F0; --est-well:#F8FAFC; --est-red:#C8202E; --est-focus:rgba(200,32,46,.22);
  --est-numbg:#EAEEF3; --est-inset:inset 4px 4px 9px #D1D9E6, inset -4px -4px 9px #FFFFFF;
  --est-lift:0 1px 2px rgba(15,23,42,.06),0 6px 16px rgba(15,23,42,.09);
  --est-hover:0 2px 4px rgba(15,23,42,.08),0 12px 26px rgba(15,23,42,.12);
  --est-warn:#8a6420;
  --crar-mist:#64748B; --crar-alert:#C8202E; --crar-pos:#047857; --crar-on:#166534;
  --crar-mastersh:0 1px 2px rgba(15,23,42,.05);
}"""
src = pl.sub(src, TOK_OLD, TOK_NEW)

# ─────────────────────────────────────────────────────────────────────────
# 2. the four INK uses of --est-red move to --crar-alert.
#    The fill (.crar-btn.primary) and the spine (.crar-row.od) keep it.
# ─────────────────────────────────────────────────────────────────────────
INK_RED = [
    ('#cr-ar-view .crar-kpi.alert .crar-v{color:var(--est-red);}',
     '#cr-ar-view .crar-kpi.alert .crar-v{color:var(--crar-alert,#f08a90);}'),
    ('#cr-ar-view .crar-grp.over .crar-grphd b{color:var(--est-red);}',
     '#cr-ar-view .crar-grp.over .crar-grphd b{color:var(--crar-alert,#f08a90);}'),
    ('#cr-ar-view .crar-mv.bal.od{color:var(--est-red);}',
     '#cr-ar-view .crar-mv.bal.od{color:var(--crar-alert,#f08a90);}'),
    ('#cr-ar-view .crar-age.od{color:var(--est-red);}',
     '#cr-ar-view .crar-age.od{color:var(--crar-alert,#f08a90);}'),
]
for o, n in INK_RED:
    src = pl.sub(src, o, n)

# ─────────────────────────────────────────────────────────────────────────
# 3. the paid-green literal, twice (#047857 is 3.31:1 on the dark card)
# ─────────────────────────────────────────────────────────────────────────
src = pl.sub(src, '#cr-ar-view .crar-v.pos{color:#047857;}',
                  '#cr-ar-view .crar-v.pos{color:var(--crar-pos,#34d399);}')
src = pl.sub(src, '#cr-ar-view .crar-mv.pos{color:#047857;}',
                  '#cr-ar-view .crar-mv.pos{color:var(--crar-pos,#34d399);}')

# ─────────────────────────────────────────────────────────────────────────
# 3b. gate_stack exemptions.
#
# ⚠ gate_stack flags `.crar-v.pos` and `.crar-kpi.alert .crar-v` as NEW stacks
#   over `.crar-v`'s base ink. THE RELATIONSHIP IS PRE-EXISTING — in 1217 the
#   same two rules displaced the same base, as `color:#047857` and
#   `color:var(--est-red)`. The gate sees them as new because this build
#   rewrote the winning declaration, which is the same shape as 1217's sentinel
#   reporting four untouched `.cr-est-totals` rules as new findings.
#
#   The displaced rule must stay: most KPI numbers are plain ink and `.pos` /
#   `.alert` are STATE MODIFIERS on top of it. That is precisely what the
#   --cr-stack escape hatch is for, so it is declared rather than silenced.
# ─────────────────────────────────────────────────────────────────────────
src = pl.sub(src,
  '#cr-ar-view .crar-v.pos{color:var(--crar-pos,#34d399);}',
  '#cr-ar-view .crar-v.pos{color:var(--crar-pos,#34d399); --cr-stack:"state modifier on .crar-v: a KPI that is money COLLECTED reads green; the base ink must stay for the other two tiles";}')
src = pl.sub(src,
  '#cr-ar-view .crar-kpi.alert .crar-v{color:var(--crar-alert,#f08a90);}',
  '#cr-ar-view .crar-kpi.alert .crar-v{color:var(--crar-alert,#f08a90); --cr-stack:"state modifier on .crar-v: the overdue tile alerts; the base ink must stay for the other two tiles";}')

# ─────────────────────────────────────────────────────────────────────────
# 4. the reminders master row — a hardcoded #FFFFFF card and a 2.54:1 "on"
# ─────────────────────────────────────────────────────────────────────────
src = pl.sub(src,
  '#cr-ar-view .crar-master{display:flex; align-items:center; justify-content:space-between; gap:10px; flex-wrap:wrap; margin:2px 0 14px; padding:12px 16px; background:#FFFFFF; border:1px solid var(--est-line,#E2E8F0); border-radius:14px; box-shadow:0 1px 2px rgba(15,23,42,.05);}',
  '#cr-ar-view .crar-master{display:flex; align-items:center; justify-content:space-between; gap:10px; flex-wrap:wrap; margin:2px 0 14px; padding:12px 16px; background:var(--est-panel,#141619); border:1px solid var(--est-line,#262a30); border-radius:14px; box-shadow:var(--crar-mastersh,0 1px 2px rgba(0,0,0,.45));}')
src = pl.sub(src, '#cr-ar-view .crar-mstate.on{color:#166534;}',
                  '#cr-ar-view .crar-mstate.on{color:var(--crar-on,#34d399);}')

# ─────────────────────────────────────────────────────────────────────────
# 5. the offline payment sheet. Hardcoded porcelain since 1108; since 1216
#    its own footer buttons (.crji-btn) have been dark, so the sheet has
#    been white paper carrying dark grey controls.
#    #cr-pay-modal is a SIBLING of #cr-ar-view, not a child — it is appended
#    to <body> — so it needs its own declaration, not inheritance.
# ─────────────────────────────────────────────────────────────────────────
PAY_OLD = """#cr-pay-modal{position:fixed;inset:0;z-index:12000;display:none;}"""
PAY_NEW = """/* 1218: tokenised. The sheet is reached from the AR dashboard and from the
   profile's Invoices & Payments card — both dark as of this build — and since
   1216 its footer buttons (.crji-btn ghost / primary) have themselves been
   dark, on white paper. Same --crji-* values, same light restoration rule. */
#cr-pay-modal{
  --crpay-sheet:#141619; --crpay-ink:#f2f4f7; --crpay-sub:#a8b0ba;
  --crpay-well:#1b1f24; --crpay-well-lo:#0d0f12; --crpay-well-hi:#23282e;
  --crpay-field:#1b1f24; --crpay-line:#262a30;
  --crpay-on:#262a30; --crpay-on-sh:0 1px 2px rgba(0,0,0,.45),0 4px 10px rgba(0,0,0,.5);
  --crpay-scrim:rgba(0,0,0,.62);
  position:fixed;inset:0;z-index:12000;display:none;}
:root[data-theme="rb-light"] #cr-pay-modal{
  --crpay-sheet:#F4F4F5; --crpay-ink:#0F172A; --crpay-sub:#475569;
  --crpay-well:#EAEEF3; --crpay-well-lo:#D1D9E6; --crpay-well-hi:#FFFFFF;
  --crpay-field:#FFFFFF; --crpay-line:#E2E8F0;
  --crpay-on:#FFFFFF; --crpay-on-sh:0 1px 2px rgba(15,23,42,.06),0 4px 10px rgba(15,23,42,.1);
  --crpay-scrim:rgba(15,23,42,.55);}"""
src = pl.sub(src, PAY_OLD, PAY_NEW)

PAY = [
 ('#cr-pay-modal .crpay-backdrop{position:absolute;inset:0;background:rgba(15,23,42,.55);}',
  '#cr-pay-modal .crpay-backdrop{position:absolute;inset:0;background:var(--crpay-scrim,rgba(0,0,0,.62));}'),
 ("#cr-pay-modal .crpay-box{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:min(420px,92vw);max-height:88vh;overflow:auto;background:#F4F4F5;border-radius:18px;box-shadow:0 24px 64px rgba(0,0,0,.45);padding:20px;color:#0F172A;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;}",
  "#cr-pay-modal .crpay-box{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:min(420px,92vw);max-height:88vh;overflow:auto;background:var(--crpay-sheet,#141619);border-radius:18px;box-shadow:0 24px 64px rgba(0,0,0,.45);padding:20px;color:var(--crpay-ink,#f2f4f7);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;}"),
 ('#cr-pay-modal .crpay-h{font-weight:800;font-size:19px;letter-spacing:-.01em;color:#0F172A;}',
  '#cr-pay-modal .crpay-h{font-weight:800;font-size:19px;letter-spacing:-.01em;color:var(--crpay-ink,#f2f4f7);}'),
 ('#cr-pay-modal .crpay-sub{color:#475569;font-size:13px;margin:3px 0 14px;}',
  '#cr-pay-modal .crpay-sub{color:var(--crpay-sub,#a8b0ba);font-size:13px;margin:3px 0 14px;}'),
 ('#cr-pay-modal .crpay-l{display:block;font-size:12px;font-weight:600;letter-spacing:.03em;text-transform:uppercase;color:#475569;margin:13px 0 6px;}',
  '#cr-pay-modal .crpay-l{display:block;font-size:12px;font-weight:600;letter-spacing:.03em;text-transform:uppercase;color:var(--crpay-sub,#a8b0ba);margin:13px 0 6px;}'),
 ('#cr-pay-modal .crpay-amt{display:flex;align-items:center;gap:6px;background:#EAEEF3;border-radius:12px;padding:2px 12px;box-shadow:inset 4px 4px 9px #D1D9E6, inset -4px -4px 9px #FFFFFF;}',
  '#cr-pay-modal .crpay-amt{display:flex;align-items:center;gap:6px;background:var(--crpay-well,#1b1f24);border-radius:12px;padding:2px 12px;box-shadow:inset 4px 4px 9px var(--crpay-well-lo,#0d0f12), inset -4px -4px 9px var(--crpay-well-hi,#23282e);}'),
 ('#cr-pay-modal .crpay-amt span{font-weight:800;color:#475569;font-size:18px;}',
  '#cr-pay-modal .crpay-amt span{font-weight:800;color:var(--crpay-sub,#a8b0ba);font-size:18px;}'),
 ('#cr-pay-modal .crpay-amt input{flex:1;border:0;background:transparent;font-size:22px;font-weight:800;color:#0F172A;padding:10px 0;outline:none;}',
  '#cr-pay-modal .crpay-amt input{flex:1;border:0;background:transparent;font-size:22px;font-weight:800;color:var(--crpay-ink,#f2f4f7);padding:10px 0;outline:none;}'),
 ('#cr-pay-modal .crpay-in{width:100%;background:#FFFFFF;border:1px solid #E2E8F0;border-radius:10px;padding:11px 12px;font-size:15px;color:#0F172A;outline:none;}',
  '#cr-pay-modal .crpay-in{width:100%;background:var(--crpay-field,#1b1f24);border:1px solid var(--crpay-line,#262a30);border-radius:10px;padding:11px 12px;font-size:15px;color:var(--crpay-ink,#f2f4f7);outline:none;}'),
 ('#cr-pay-modal .crpay-seg{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;background:#EAEEF3;border-radius:12px;padding:4px;}',
  '#cr-pay-modal .crpay-seg{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;background:var(--crpay-well,#1b1f24);border-radius:12px;padding:4px;}'),
 ('#cr-pay-modal .crpay-seg button{border:0;background:transparent;color:#475569;font-size:13px;font-weight:600;padding:10px 6px;border-radius:9px;cursor:pointer;}',
  '#cr-pay-modal .crpay-seg button{border:0;background:transparent;color:var(--crpay-sub,#a8b0ba);font-size:13px;font-weight:600;padding:10px 6px;border-radius:9px;cursor:pointer;}'),
 ('#cr-pay-modal .crpay-seg button.on{background:#FFFFFF;color:#0F172A;box-shadow:0 1px 2px rgba(15,23,42,.06),0 4px 10px rgba(15,23,42,.1);}',
  '#cr-pay-modal .crpay-seg button.on{background:var(--crpay-on,#262a30);color:var(--crpay-ink,#f2f4f7);box-shadow:var(--crpay-on-sh,0 1px 2px rgba(0,0,0,.45),0 4px 10px rgba(0,0,0,.5));}'),
]
for o, n in PAY:
    src = pl.sub(src, o, n)

# ─────────────────────────────────────────────────────────────────────────
# app stamp + changelog
# ─────────────────────────────────────────────────────────────────────────
src = pl.sub(src, 'v2026-09-11 build 1217<button', 'v2026-09-11 build 1218<button')

CL_ANCHOR = "[\n  { b: 1217, d: '2026-09-11',"
CL_NEW = ("[\n  { b: 1218, d: '2026-09-11', t: 'Invoices, aging and the payment sheet stop being a white page',\n"
  "    s: 'The Accounts Receivable screen &#8212; who owes what, and how late &#8212; was still a white page on a black app, "
  "and so was the sheet that opens when you record a payment. Both are dark now, in the same colours as the Invoices &amp; Payments card "
  "on a client profile, so the whole money side of Cardinal looks like one thing instead of three. Nothing moved and nothing was renamed: "
  "the KPIs, the aging groups, the invoice rows and the status pills are exactly where they were. <b>Five colours had to be re-chosen rather than carried over</b> "
  "&#8212; the paid green, the overdue red, the reminders ON green, the warning amber and the small grey column labels were all picked for white paper "
  "and were between 2.5 and 3.8 to 1 on the dark card, under the 4.5 floor for text. Their replacements were computed, not eyeballed, and every one of them clears it. "
  "The red Record-payment button and the red stripe down an overdue row are deliberately unchanged &#8212; those are the brand, not text. "
  "Light mode is exactly what it was.' },\n  { b: 1217, d: '2026-09-11',")
src = pl.sub(src, CL_ANCHOR, CL_NEW)

# ─────────────────────────────────────────────────────────────────────────
# self-computing assertions
# ─────────────────────────────────────────────────────────────────────────
def block(s, sid):
    i = s.find('<style id="%s"' % sid)
    return s[i:s.find('</style>', i)]

ob, nb = block(orig, 'cr-ar-styles'), block(src, 'cr-ar-styles')

# ⚠ THE FIRST VERSION OF THIS ASSERTION FAILED CORRECT CODE, and it is the
#   trap CLAUDE.md names: `nb.count('color:var(--est-red)')` is a SUBSTRING
#   count, so it matched inside `border-color:var(--est-red)` in the primary
#   button — a declaration that is supposed to survive. It reported "an
#   --est-red ink use survived" on a patch that had moved all four. Anchor the
#   ink role on the brace that opens its declaration block.
INK_USES = re.findall(r'\{\s*color:var\(--est-red\)', nb)
assert len(INK_USES) == 0, 'an --est-red ink use survived: %r' % INK_USES
assert len(re.findall(r'\{\s*color:var\(--est-red\)', ob)) == 4, \
       'expected 4 --est-red inks before the patch'
assert nb.count('background:var(--est-red)') == ob.count('background:var(--est-red)') == 1
assert nb.count('border-left:3px solid var(--est-red)') == 1, 'the overdue spine lost its red'

# the four inks moved, and nothing else gained --crar-alert
assert nb.count('var(--crar-alert') == 4, 'expected 4 --crar-alert inks, got %d' % nb.count('var(--crar-alert')

def rule(s, head):
    """the declaration body of one rule, by its opening selector."""
    i = s.find(head)
    assert i >= 0, 'rule not found: %s' % head
    return s[i:s.find('}', i)]

base  = rule(nb, '#cr-ar-view{')
light = rule(nb, ':root[data-theme="rb-light"] #cr-ar-view{')
pbase = rule(nb, '#cr-pay-modal{')
plite = rule(nb, ':root[data-theme="rb-light"] #cr-pay-modal{')

# the light restoration carries every porcelain declaration byte-for-byte
porcelain = [l.strip() for l in TOK_OLD.split('\n')
             if l.strip().startswith('--est-') or l.strip().startswith('--crar-mist')]
assert porcelain, 'the porcelain extractor captured nothing'
print('  porcelain declarations restored under rb-light: %d' % len(porcelain))
for decl in porcelain:
    assert decl in light, 'light restoration lost: %s' % decl

# and the DARK rules carry none of it — this is the whole point of the build
PORCELAIN_LITERALS = ['#F4F4F5', '#FFFFFF', '#0F172A', '#475569', '#E2E8F0',
                      '#F8FAFC', '#EAEEF3', '#D1D9E6', '#047857', '#166534',
                      '#64748B', '#8a6420', 'rgba(15,23,42']
for dead in PORCELAIN_LITERALS:
    assert dead not in base,  'the dark AR rule still carries %s'  % dead
    assert dead not in pbase, 'the dark pay rule still carries %s' % dead
    assert dead in light or dead in plite or dead in ('#F8FAFC',), \
        '%s vanished instead of moving to the light rule' % dead

# the pay sheet lost every hardcoded porcelain background
pay = nb[nb.find('#cr-pay-modal{'):nb.find('#cr-ar-view .crar-rem{')]
for gone in ['background:#F4F4F5', 'background:#EAEEF3', 'background:#FFFFFF']:
    assert gone not in pay, 'pay sheet still hardcodes %s' % gone

# scope: exactly the regions we meant, nothing else
changed = len(src) - len(orig)
print('  cr-ar-styles: %d -> %d chars (+%d)' % (len(ob), len(nb), len(nb) - len(ob)))
print('  file: %d -> %d chars (+%d)' % (len(orig), len(src), changed))

pl.write_atomic(DST, src)
pl.assert_in(DST, '--crar-alert:#f08a90')
pl.assert_in(DST, ':root[data-theme="rb-light"] #cr-pay-modal{')
pl.assert_in(DST, 'v2026-09-11 build 1218')
print('  OK ->', DST)
