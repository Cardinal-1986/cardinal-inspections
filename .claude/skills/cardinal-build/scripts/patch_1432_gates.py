"""Build 1432 — the two gates that tested the retired Supplement card now test that it stays retired.
gate_1425 C/D asserted the card drew, opened its sheet and repainted; gate_1429 #34 read its heading's glyph."""
import sys
sys.path.insert(0, '/home/user/cardinal-inspections/.claude/skills/cardinal-build/scripts')
import patch_lib as pl
D = '/home/user/cardinal-inspections/.claude/skills/cardinal-build/scripts/'
g = pl.load(D + 'gate_1425.mjs')
def one(s, a, b):
    assert s.count(a) == 1, (s.count(a), a[:80]); return s.replace(a, b, 1)
g = one(g, """ *   C  the Supplement card is drawn, and File a supplement still opens its sheet
 *   D  the card still repaints when the claim changes (the guard compares, it does not freeze)""",
""" *   C  (1432) the Supplement card stays retired: no mount, no sheet — it was the busiest idle writer here""")
a = g.index("    sp: !!document.querySelector('#cr-sp-mount .cr-sp-card'),")
b = g.index("  ok(after && after !== before && after !== 'no claim object', 'D  the card repaints when the claim changes', JSON.stringify({ before, after }));")
b = b + len("  ok(after && after !== before && after !== 'no claim object', 'D  the card repaints when the claim changes', JSON.stringify({ before, after }));")
g = g[:a] + """    sp: !!document.getElementById('cr-sp-mount'),
    modal: !!document.getElementById('cr-sp-modal')
  }));
  ok(/^Advance to /.test(lab.fw) && lab.opts.some(t => /^Advance to /.test(t)), 'B  the arrow and the ⋮ menu still say where the job goes next', JSON.stringify({ fw: lab.fw, opts: lab.opts.slice(0, 3) }));
  ok(!lab.sp && !lab.modal, 'C  (1432) the Supplement card stays retired: no mount, no sheet', JSON.stringify(lab));""" + g[b:]
g = one(g, """    btn: !!document.querySelector('#cr-sp-mount [data-act="file"]')
  }));
  ok(/^Advance to /.test(lab.fw) && lab.opts.some(t => /^Advance to /.test(t)), 'B  the arrow and the ⋮ menu still say where the job goes next', JSON.stringify({ fw: lab.fw, opts: lab.opts.slice(0, 3) }));
""", "") if """    btn: !!document.querySelector('#cr-sp-mount [data-act="file"]')""" in g else g
pl.write_atomic(D + 'gate_1425.mjs', g)
h = pl.load(D + 'gate_1429.mjs')
a = h.index("    const s = await page.evaluate(() => { const t = document.querySelector('#cr-sp-mount .cr-sp-hd .t');")
b = h.index("need('#34 the Supplement card heading: no emoji, a drawn glyph', s && !s.emoji && s.svg && s.t === 'Supplement', JSON.stringify(s));", a)
b = b + len("need('#34 the Supplement card heading: no emoji, a drawn glyph', s && !s.emoji && s.svg && s.t === 'Supplement', JSON.stringify(s));")
h = h[:a] + """    /* 1432: the Supplement card is retired (Theo: "Retire card"), so its heading's glyph has nothing to check */
    const s = await page.evaluate(() => ({ mount: !!document.getElementById('cr-sp-mount') }));
    need('#34 the Supplement card is retired (1432), so no emoji is left on it', !s.mount, JSON.stringify(s));""" + h[b:]
pl.write_atomic(D + 'gate_1429.mjs', h)
print('gates updated')
