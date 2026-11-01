#!/usr/bin/env python3
"""patch_1434_gates.py <scripts-dir> (build 1434) — minimal updates to existing gates that asserted the design
Theo has just changed (T2, T9, T10). Each edit is exact-match with an asserted count, in place.
Run against .claude/skills/cardinal-build/scripts. Every updated gate is GREEN on the patched tree
and RED on 1433 (its control), measured — see the build report.
"""
import os, sys
sys.path.insert(0, '/home/user/cardinal-inspections/.claude/skills/cardinal-build/scripts')
import patch_lib as pl

D = sys.argv[1] if len(sys.argv) > 1 else '/home/user/cardinal-inspections/.claude/skills/cardinal-build/scripts'
EDITS = {}
def edit(name, old, new, count=1):
    EDITS.setdefault(name, []).append((old, new, count))

# ── harness_drawer1115.js — T2: every opening is Daily-open, the rest folded (was: all folded) ──
H = 'harness_drawer1115.js'
edit(H, "if(!mod || !/var secOpen = \\{\\}/.test(mod)){",
        "if(!mod || !/var secOpen = /.test(mod)){   /* T2: freshOpen() since Theo's pick B */")
# seed the rail's store with Daily CLOSED and Office OPEN: neither may reach the drawer
edit(H, "w.localStorage.setItem(RAIL_KEY, JSON.stringify({ office:1, daily:1 }));",
        "w.localStorage.setItem(RAIL_KEY, JSON.stringify({ office:1, daily:0 }));   /* T2: rail says Daily closed */")
edit(H, "JSON.stringify({ office:1, daily:1 }),", "JSON.stringify({ office:1, daily:0 }),", count=2)
edit(H, """  ok(expandedCount() === 0,
     'FIRST opening: every section is collapsed (' + expandedCount() + ' expanded)');
  ok(hidden() === rows() && rows() === 4,
     'every row under a heading is hidden (' + hidden() + '/' + rows() + ')');""",
        """  const dailySec = () => secs().find(s => s.textContent.trim() === 'Daily');
  ok(expandedCount() === 1 && dailySec().getAttribute('aria-expanded') === 'true',
     'FIRST opening: Daily is open and every other section is collapsed (T2; ' + expandedCount() + ' expanded)');
  ok(hidden() === 2 && rows() === 4,
     'Daily\\u2019s two rows show and the others are hidden (' + hidden() + '/' + rows() + ' hidden)');""")
edit(H, "  ok(hidden() === 3, 'its row is revealed and the others stay hidden (' + hidden() + ' hidden)');\n"
        "  ok(expandedCount() === 1, 'only the tapped section opened');",
        "  ok(hidden() === 1, 'its row is revealed and the others stay hidden (' + hidden() + ' hidden)');\n"
        "  ok(expandedCount() === 2, 'only the tapped section opened beside Daily');\n"
        "  /* T2: fold Daily too, so the reopen below has to put it back */\n"
        "  dailySec().dispatchEvent(new w.MouseEvent('click', { bubbles:true }));\n"
        "  await raf();\n"
        "  ok(dailySec().getAttribute('aria-expanded') === 'false', 'Daily folds when tapped, like any section');")
edit(H, """  ok(expandedCount() === 0,
     'SECOND opening: everything is collapsed again (' + expandedCount() + ' expanded)');
  ok(hidden() === rows(), 'and every row is hidden again (' + hidden() + '/' + rows() + ')');""",
        """  ok(expandedCount() === 1 && dailySec().getAttribute('aria-expanded') === 'true',
     'SECOND opening: Daily open again, Office folded \\u2014 nothing remembered (' + expandedCount() + ' expanded)');
  ok(hidden() === rows() - 2, 'and only Daily\\u2019s rows show again (' + hidden() + '/' + rows() + ' hidden)');""")

# ── gate_1115.mjs — T2: same change, read in Chromium at 390 ──
G = 'gate_1115.mjs'
edit(G, """    secs       : [...document.querySelectorAll('#navMenu .navsec')]
                   .map(s => s.getAttribute('aria-expanded')),""",
        """    secs       : [...document.querySelectorAll('#navMenu .navsec')]
                   .map(s => s.textContent.trim().toLowerCase() + ':' + s.getAttribute('aria-expanded')),
    dailyCount : +((document.querySelector('#navMenu .navsec[data-crsec="daily"]') || { getAttribute: () => -1 }).getAttribute('data-crcount')),""")
edit(G, """  ok(r.secs.length > 0 && r.secs.every(v => v === 'false'),
     'every section renders collapsed (' + r.secs.filter(v => v === 'true').length + ' expanded of ' +
     r.secs.length + ')');
  ok(r.shownRows === 0,
     'so no nav row is on screen until you tap a heading (' + r.shownRows + ' shown, ' +
     r.hiddenRows + ' hidden)');""",
        """  const exp = r.secs.filter(v => /:true$/.test(v));
  ok(r.secs.length > 0 && exp.length === 1 && /^daily:/.test(exp[0]),
     'T2: Daily opens with the drawer and every other section renders collapsed (' + exp.join(',') + ' of ' +
     r.secs.length + ')');
  ok(r.shownRows > 0 && r.shownRows === r.dailyCount,
     'so the rows on screen are Daily\\u2019s and no others (' + r.shownRows + ' shown, Daily counts ' +
     r.dailyCount + ', ' + r.hiddenRows + ' hidden)');""")

# ── gate_1430.mjs — T9: + New has no separate Contact form; New lead stays sales/admin, so a
#    production account's + New is Task, Reminder, Punch-out ──
G = 'gate_1430.mjs'
edit(G, """    /* choose Contact: the client form must be the thing on screen, over the view */
    await ev(page, () => { const b = document.querySelector('#newMenu [data-new="contact"]'); if (b && b.getBoundingClientRect().height) b.click(); }); await pause(page, 600);
    const pf = await onTop(page, '#projModal .projform, #projModal form, #projModal > div');
    ok(pf.found && pf.top, `#7 ${nm}: + New → Contact opens the client form ON TOP (hit-test)`, JSON.stringify(pf));
    await ev(page, () => { const c = document.getElementById('pfCancel'); if (c) c.click(); else document.getElementById('projModal').style.display = 'none'; }); await pause(page, 300);
""",
        """    /* T9 (Theo's pick B): + New has no separate Contact form; New lead is the one way to start a
       client and stays sales/admin, so a production account sees Task, Reminder, Punch-out */
    ok(Array.isArray(hits) && !hits.some(h => /^contact$/i.test(h.t)) && hits.map(h => h.t).join(',') === 'Task,Reminder,Punch-out', `#7 ${nm}: + New offers no separate Contact form (T9)`, JSON.stringify(hits && hits.map(h => h.t)));
    await ev(page, () => { document.getElementById('newMenu').style.display = 'none'; }); await pause(page, 200);
""")

# ── render_navicons.js — T9: the Contact row is gone; the five that remain keep their glyphs ──
G = 'render_navicons.js'
edit(G, """  ['[data-new="task"]','clipboard'], ['[data-new="contact"]','person'],""",
        """  ['[data-new="task"]','clipboard'],   /* T9: the + New "Contact" row is retired */""")

# ── gate_1035.mjs — T10: the rail no longer mirrors "Switch portal" (the page title is the desktop's
#    one portal switcher), so there is no rail row left to paint gold; Clients must still read ──
G = 'gate_1035.mjs'
edit(G, """function judge(dark, lite) {
  const fails = [];
  const [d, dn] = String(dark).split('|'), [l, ln] = String(lite).split('|');
  if (d === 'MISSING' || d !== dn || d === 'rgb(240, 198, 81)') fails.push(`Switch portal dark ${d} (want the normal rail ink ${dn}, not the yellow)`);
  if (l === 'MISSING' || l !== ln || l === 'rgb(138, 97, 0)') fails.push(`Switch portal light ${l} (want the normal rail ink ${ln}, not the amber)`);
  return fails;
}""", """/* T10 (Theo kept the page title as the desktop's one portal switcher): the rail no longer
   mirrors "Switch portal" at all — the row stays in the phone drawer — so J16's question
   (normal ink, never the yellow or the amber) is answered by its absence. Its neighbour
   Clients must still be there and read. */
function judge(dark, lite) {
  const fails = [];
  const [d, dn] = String(dark).split('|'), [l, ln] = String(lite).split('|');
  if (d !== 'MISSING' || dn === 'MISSING') fails.push(`dark: Switch portal ${d} is still a rail row (T10 wants it MISSING; Clients reads ${dn})`);
  if (l !== 'MISSING' || ln === 'MISSING') fails.push(`light: Switch portal ${l} is still a rail row (T10 wants it MISSING; Clients reads ${ln})`);
  return fails;
}""")
edit(G, "'GATE 1035 GREEN — Switch portal wears the normal rail ink in both themes (J16)'",
        "'GATE 1035 GREEN — no Switch portal row in the desktop rail, both themes (T10); Clients reads'")

# ── gate_1299.mjs C — T10: the rail carries no "Switch portal" row any more (the page title is the
#    desktop switcher; the row stays in the phone drawer), so the J16 ink check becomes an absence check ──
G = 'gate_1299.mjs'
edit(G, """  ok(c[0] !== 'MISSING' && c[0] === c[1] && c[0] !== old, 'C  Switch portal row ' + (light ? 'light' : 'dark') + ': the normal rail ink (J16)', c.join(' vs ')); await ctx.close();""",
        """  /* T10: the rail no longer mirrors "Switch portal" (the page title is the desktop's one portal
     switcher), so there is no row left to wear the old yellow / amber; Clients must still be there */
  ok(c[0] === 'MISSING' && c[1] !== 'MISSING' && c[1] !== 'ERR' && c[1] !== old, 'C  no Switch portal row in the desktop rail ' + (light ? 'light' : 'dark') + ' (T10); Clients reads', c.join(' vs ')); await ctx.close();""")

# ── gate_1430.mjs #24 — T10: the rail's open sections (Daily + Sell) show 10 rows, not 11, now that
#    "Switch portal" is not mirrored; the coverage floor was "> 10" and moves to ">= 10" ──
edit('gate_1430.mjs', "ok(D.length > 10 && Lt.length === D.length, '#24 rig: the rail rendered in both themes', D.length + ' / ' + Lt.length);",
        "ok(D.length >= 10 && Lt.length === D.length, '#24 rig: the rail rendered in both themes', D.length + ' / ' + Lt.length);   /* T10: Daily lost its Switch portal row (11 -> 10) */")

# ── gate_1287.mjs E — T6 (Theo's pick B): Production's board moved to the app's one sans with
#    tabular figures, so "Production keeps its own monospace" becomes "Production shows no monospace" ──
edit('gate_1287.mjs', "ok(prodOdd.length > 0, 'E  dark: Production keeps its own type (excluded at 1299)', String(prodOdd.length));",
        "ok(prodOdd.length === 0, 'E  dark: Production is in the one sans now (T6, Theo\\u2019s pick B; 1299 had excluded it)', prodOdd.slice(0, 3).join(', ') || 'none');")
edit('gate_1287.mjs', "     E  dark: Production keeps its own type (1299 — Theo: Production and Dispatch are left alone)",
        "     E  dark: Production is in the one sans (T6, Theo's pick B — 1299 had left Production and Dispatch alone; Dispatch still is)")

# ── gate_1418.mjs H/X — T10: the banner's pill strip (whose Community dot H read), the rail's
#    Retail | Insurance | Community segment (H, dark + light) and the rail's "Switch portal" row (X)
#    are gone on the desktop. Each colour check becomes the check that the element is gone, with the
#    page title still there as the one switcher; nothing else in 1418 changes. ──
G = 'gate_1418.mjs'
edit(G, """  const h = await ev(page, () => { const dot = document.querySelector('#cbCrm b[data-crm-go="community"] i'); const seg = __J.q('#cr-lnav .lnav-crm button.on'); return { dot: dot && __J.bg(dot), seg: seg && __J.bg(seg), segInk: __J.ink(seg) }; });
  ok(h.dot === '#34d399', 'H  Community portal-pill dot is #34d399 (was #8ad0f5)', h.dot);
  ok(h.seg === '#c8202e' && R(h.segInk, 4.5), 'H  Retail rail segment is #c8202e (was #3e6ca8), white ≥ 4.5', h.seg + ' ' + fmt(h.segInk));""",
        """  /* T10 (Theo kept the page title): the pill strip and the rail segment H coloured are gone on the desktop */
  const h = await ev(page, () => ({ pills: !!document.querySelector('#cbCrm, #crBanner .cbcrm'), seg: !!document.querySelector('#cr-lnav .lnav-crm'), title: !!document.querySelector('#brandTitle h1') }));
  ok(!h.pills && h.title, 'H  no portal-pill strip in the top bar; the page title is the switcher (T10)', JSON.stringify(h));
  ok(!h.seg, 'H  no Retail | Insurance | Community segment in the rail (T10)', JSON.stringify(h));""")
edit(G, """  ok(sp.a && sp.a === sp.b, 'X  "Switch portal" wears the normal rail ink (was gold #f0c651)', JSON.stringify(sp));""",
        """  ok(!sp.a && !!sp.b, 'X  no "Switch portal" row in the desktop rail (T10); Clients reads', JSON.stringify(sp));""")
edit(G, """  const h = await ev(page, () => { const seg = __J.q('#cr-lnav .lnav-crm button.on'); return { seg: seg && __J.bg(seg), ink: __J.ink(seg) }; });
  ok(h.seg === '#c8202e' && R(h.ink, 4.5), 'H  light Retail rail segment #c8202e, white ≥ 4.5', h.seg + ' ' + fmt(h.ink));""",
        """  const h = await ev(page, () => ({ seg: !!document.querySelector('#cr-lnav .lnav-crm'), title: !!document.querySelector('#brandTitle h1') }));
  ok(!h.seg && h.title, 'H  light: no rail segment; the page title is the switcher (T10)', JSON.stringify(h));""")

# ── gate_1393.mjs C — T10: '#cr-lnav .lnav-crm button.on' no longer exists; the rail's section
#    counts are still scored ──
edit('gate_1393.mjs', "chk('C ' + th + ' desktop rail', await page.evaluate(SCORE, ['#cr-lnav .lnav-crm button.on', '#cr-lnav .lnav-sec .cnt']));",
        "chk('C ' + th + ' desktop rail', await page.evaluate(SCORE, ['#cr-lnav .lnav-sec .cnt']));   /* T10: the CRM segment is retired */")

# ── gate_754.mjs — T10: "the explicit switcher still works from a shared screen" drove the banner's
#    pill; the explicit switcher is now the page title -> Front Door -> Cardinal Truth ──
edit('gate_754.mjs', """const switched = await go(`document.querySelector('#cbCrm [data-crm-go="insurance"]').click()`);""",
        """/* T10: the banner pills are gone; the one explicit switcher is the page title's Front Door */
await go(`document.getElementById('brandTitle').click()`);
const switched = await go(`document.querySelector('#cr-fd [data-fd="insurance"]').click()`);""")

# ── gate_952.mjs — T10: the rail's Retail | Insurance | Community segment is retired, so the
#    portal switch is driven through the one switcher that stays (page title -> Front Door), and the
#    three segment-colour checks become one check that the segment is gone. The strip / icon
#    palette 952 exists for is asserted unchanged. ──
G = 'gate_952.mjs'
edit(G, """async function chip(k){ await page.evaluate(k=>{const b=document.querySelector('#cr-lnav .lnav-crm button[data-crm="'+k+'"]'); if(b)b.click();},k); await page.waitForTimeout(900); }""",
        """/* T10: the rail segment is retired; switch through the page title's Front Door, the one switcher left */
async function chip(k){ await page.evaluate(()=>{const t=document.getElementById('brandTitle'); if(t)t.click();}); await page.waitForTimeout(700);
  await page.evaluate(k=>{const b=document.querySelector('#cr-fd [data-fd="'+k+'"]'); if(b)b.click();},k); await page.waitForTimeout(1200); }""")
edit(G, """  need('retail chip is the retail identity red (J16; was slate blue)', r.chipBg==='rgb(200, 32, 46)', String(r.chipBg));""",
        """  need('no CRM segment in the rail (T10: the page title is the desktop switcher)', r.chipBg===null, String(r.chipBg));""")
edit(G, """  need('retail chip label clears 4.5:1', cb&&ci&&ratio(cb,ci)>=4.5, cb&&ci?ratio(cb,ci).toFixed(2):'unparsed');\n""",
        """  void cb; void ci;   /* T10: no segment label left to score */\n""")
edit(G, """need('insurance chip is the insurance identity teal (J16; was red)', !!r && r.chipBg==='rgb(45, 212, 191)', r?String(r.chipBg):'');\n""",
        "")

# ── gate_775.mjs — T2: the drawer now opens with Daily expanded and the rest folded, so "the median
#    row" over EVERY row was the median of mostly-folded (0px) rows. Open the Production row's
#    section on either tree and take the median over rows on screen. ──
G = 'gate_775.mjs'
edit(G, """console.log('\\n--- 1. the icon is an icon ---');
const m = await page.evaluate(() => {""",
        """console.log('\\n--- 1. the icon is an icon ---');
/* T2: Daily opens with the drawer (Theo's pick B); older trees fold every section. Open the
   Production row's section either way, and measure rows that are on screen. */
await page.evaluate(() => { const b = document.getElementById('cr-nav-production'); let s = b && b.previousElementSibling;
  while (s && !s.classList.contains('navsec')) s = s.previousElementSibling;
  if (s && s.getAttribute('aria-expanded') === 'false') s.click(); });
await page.waitForTimeout(400);
const m = await page.evaluate(() => {""")
edit(G, """  const rows = [...menu.querySelectorAll('.navopt')].map(o => Math.round(o.getBoundingClientRect().height));""",
        """  const rows = [...menu.querySelectorAll('.navopt')].map(o => Math.round(o.getBoundingClientRect().height)).filter(h => h > 0);   /* T2: on-screen rows */""")

# ── gate_953.mjs / gate_954.mjs — T10: their chip() drove the rail segment, which is retired; the
#    portal switch goes through the page title's Front Door, the one switcher left on the desktop.
#    What both gates assert (Sell / Insurance sections hiding per portal) is unchanged. ──
for G, wait in (('gate_953.mjs', 900), ('gate_954.mjs', 1000)):
    edit(G, "async function chip(k){ await page.evaluate(k=>{const b=document.querySelector('#cr-lnav .lnav-crm button[data-crm=\"'+k+'\"]'); if(b)b.click();},k); await page.waitForTimeout(%d); }" % wait,
            "/* T10: the rail segment is retired; switch through the page title's Front Door */\n"
            "async function chip(k){ await page.evaluate(()=>{const t=document.getElementById('brandTitle'); if(t)t.click();}); await page.waitForTimeout(700);\n"
            "  await page.evaluate(k=>{const b=document.querySelector('#cr-fd [data-fd=\"'+k+'\"]'); if(b)b.click();},k); await page.waitForTimeout(%d); }" % (wait + 300))

# ── gate_955.mjs / gate_956.mjs — T10: "the CRM switcher (door to community) is present" read the
#    rail segment; the switcher is now the page title's Front Door, whose Community door is read ──
for G in ('gate_955.mjs', 'gate_956.mjs'):
    edit(G, """  crmSwitcher: !!document.querySelector('#cr-lnav .lnav-crm button[data-crm="community"]'),""",
            """  /* T10: the page title's Front Door is the switcher; read its Community door */
  crmSwitcher: (()=>{ try{ window.CardinalFrontDoor.open(); }catch(_){} const ok=!!document.getElementById('brandTitle') && !!document.querySelector('#cr-fd [data-fd="community"]'); try{ window.CardinalFrontDoor.close(); }catch(_){} return ok; })(),""")

# ── gate_944.mjs — T10: the banner's portal pills (and the 44px ::after pad the proof clicked) are
#    gone. Where no pill exists, the proof is that none is left to pad; the old proof still runs
#    unchanged on a tree that has them. ──
edit('gate_944.mjs', """  } else console.log('PAD  — insurance chip not found');""",
        """  } else {
    padOK = await page.evaluate(()=>!document.querySelector('#crBanner .cbcrm, #cbCrm'));
    console.log('PAD  — no banner portal pills left to pad (T10: the page title is the desktop switcher)'+(padOK?'':' — but a .cbcrm is still in the DOM'));
  }""")

# ── gate_952.mjs (cont.) — a Front Door switch re-asserts the stored theme, which reverts a bare
#    data-theme attribute within 50ms on BOTH trees (measured); so light is set the real way, through
#    the app's own Appearance -> Light control ──
edit('gate_952.mjs', "await page.evaluate(()=>{ document.documentElement.setAttribute('data-theme','rb-light'); });",
        "await page.evaluate(()=>{ const b=document.querySelector('[data-cr-appear=\"light\"]'); if(b) b.click(); else document.documentElement.setAttribute('data-theme','rb-light'); });   /* T10: the real control */")

total = 0
for name, eds in EDITS.items():
    p = os.path.join(D, name)
    src = pl.load(p)
    for old, new, count in eds:
        src = pl.sub(src, old, new, count)
        total += 1
    pl.write_atomic(p, src)
    print('patched', name, len(eds), 'edit(s)')
print('patch_1434_gates:', total, 'edits in', len(EDITS), 'files under', D)
