# -*- coding: utf-8 -*-
"""Patch the two contract masters' Terms and Conditions — REVIEW COPIES ONLY.

   Theo asked for the same two changes he approved on the HTML page:
     * former clause 7 (bond insurance premiums) REMOVED
     * former clause 8 REWORDED so roof jacks and flashing are always included
       on a replacement roof, new and deteriorated-replacement alike
     * clauses 9-16 renumber to 8-15

   BOTH the roofing and the gutter master carry the identical clause 8. The
   siding master does not (its clause 8 covers sheathing, framing, fascia and
   trim) and is NOT touched.

   ⚠️ THESE ARE REVIEW COPIES. They are written to the scratchpad, never over
   docs/*.pdf, and nothing is committed. A signed-contract master is Theo's to
   replace, not mine.

   HOW, and why not the obvious way:
     * The left column (clauses 1-9) runs x 40-297 at 6.6pt Helvetica, 8.4pt
       leading, and ENDS at y=622.4 with the signature block at y=678.7 — so
       there is 56pt of slack. That is what makes this possible at all: the new
       clause is longer than the one it replaces.
     * Text is re-wrapped MANUALLY with pymupdf.get_text_length() against the
       same base-14 Helvetica the original uses, rather than through the HTML
       story engine, so the line breaks are computed on the document's own font
       metrics instead of a second engine's approximation.
     * The clause NUMBER is bold and the body is not — measured from the spans,
       where line 1 is [Helvetica-Bold '8.'] + [Helvetica ' Replacement...'] and
       continuation lines start back at x=40. Reproduced exactly.
     * The right column (10-16) needs ONLY its numbers changed, so only the
       number span is redacted and redrawn. Redacting whole paragraphs to change
       one glyph would risk re-flowing text that has no reason to move.
"""
import pymupdf, re, shutil, os

SRC = '/home/user/cardinal-inspections/docs/'
OUT = '/tmp/claude-0/-home-user-cardinal-inspections/f3a6e9a6-4280-517c-92b7-d56b9e8a504e/scratchpad/out/'

NEW7 = ("Replacement of deteriorated decking, fascia boards, ventilators, or other materials, "
        "unless otherwise STATED IN THIS AGREEMENT, are NOT INCLUDED and will be charged as an "
        "extra, on a time and material basis. Roof jacks and flashing are not among the foregoing "
        "exclusions: on a replacement roof, new roof jacks and new flashing, and the replacement "
        "of any deteriorated roof jacks and flashing, ARE INCLUDED in the quotation on the face "
        "hereof at no additional charge.")

def blocks_of(page):
    out = []
    for b in page.get_text('dict')['blocks']:
        if b['type'] != 0: continue
        t = ' '.join(s['text'] for l in b['lines'] for s in l['spans']).strip()
        m = re.match(r'^(\d{1,2})\.\s', t)
        if m: out.append((int(m.group(1)), b, t))
    return out

def wrap(text, fs, first_w, rest_w):
    """Greedy wrap on the document's own Helvetica metrics."""
    words, lines, cur = text.split(), [], ''
    w = first_w
    for word in words:
        trial = (cur + ' ' + word).strip()
        if pymupdf.get_text_length(trial, fontname='helv', fontsize=fs) <= w:
            cur = trial
        else:
            lines.append(cur); cur = word; w = rest_w
    if cur: lines.append(cur)
    return lines


def number_rect(block, span):
    """A redaction box that covers the clause NUMBER and nothing else.

    ⚠️ apply_redactions() deletes any glyph whose box merely INTERSECTS the
    rectangle. A 6.6pt span is ~7.9pt tall on 8.4pt leading, so padding the box
    by 0.5pt reaches into the line below -- and that line also starts at x=40.
    The first attempt did exactly that and turned "MIDNIGHT" into "DNIGHT":
    two characters of a cancellation clause silently destroyed, invisible at
    thumbnail size and caught only by a clause-by-clause compare.

    So: pad horizontally (safe, nothing sits beside the number) and clamp the
    bottom to just above the next line's top.
    """
    x0, y0, x1, y1 = span['bbox']
    lines = block['lines']
    if len(lines) > 1:
        y1 = min(y1, lines[1]['bbox'][1] - 0.4)
    return pymupdf.Rect(x0 - 0.6, y0, x1 + 0.6, y1)

def patch(name):
    doc = pymupdf.open(SRC + name)
    page = doc[2]
    bl = {n: (b, t) for n, b, t in blocks_of(page)}
    assert set(bl) == set(range(1, 17)), 'expected clauses 1-16, got %s' % sorted(bl)

    b7, t7 = bl[7]; b8, t8 = bl[8]; b9, t9 = bl[9]
    assert 'bond insurance premiums' in t7, 'clause 7 is not the bond-insurance one'
    assert 'roof jacks' in t8 and 'flashing' in t8, 'clause 8 is not the exclusions one'
    assert t9.startswith('9.'), 'clause 9 moved'

    span = b8['lines'][0]['spans'][0]
    fs = round(span['size'], 2)
    lead = round(b8['lines'][1]['bbox'][1] - b8['lines'][0]['bbox'][1], 2)
    x0 = b8['bbox'][0]; x1 = b8['bbox'][2]
    body_x = round(b8['lines'][0]['spans'][1]['bbox'][0], 2)
    top = b7['bbox'][1]                      # start where the DELETED clause 7 began
    gap = round(b8['bbox'][1] - b7['bbox'][3], 2)
    print('  %-34s fs=%.2f lead=%.2f col=%.1f-%.1f bodyx=%.1f top=%.1f gap=%.1f'
          % (name, fs, lead, x0, x1, body_x, top, gap))

    # the baseline sits a little below the line's top edge; take it from the original
    base_off = round(b8['lines'][0]['spans'][0]['origin'][1] - b8['lines'][0]['bbox'][1], 2)

    # ⚠️ THE ORIGINAL'S BODY SPAN STARTS WITH LITERAL SPACES ('  Replacement of...').
    # They are what puts a readable gap after the bold number AND what makes the
    # text extract as "8.   Replacement" rather than "8.Replacement". Dropping them
    # shifted the body 3.7pt left and made the extracted text run together -- caught
    # by the verifier, not by eye.
    lead_ws = re.match(r'\s*', b8['lines'][0]['spans'][1]['text']).group(0)
    assert lead_ws, 'expected leading whitespace in the body span'

    # ── ONLY the two clauses that actually change are cleared ───────────────
    # ⚠️ THE FIRST VERSION OF THIS ALSO REDREW CLAUSE 9, AND CORRUPTED IT.
    # Re-rendering through base-14 Helvetica turned the apostrophe in
    # "Company\u2019s" into a middle dot -- U+2019 is not in the encoding the
    # standard font is written with. On a signed contract that is unacceptable,
    # and it was invisible in a thumbnail: only a clause-by-clause text compare
    # against the original caught it.
    # So NO EXISTING LEGAL TEXT IS RE-RENDERED. Old clause 9 keeps its original
    # glyphs exactly where they are; only its NUMBER is restruck, the same
    # technique the right column uses. The one thing drawn from scratch is the
    # new clause 7, which is pure ASCII by construction (asserted below).
    assert NEW7.isascii(), 'the new clause must be ASCII to survive base-14 encoding'
    room = b9['bbox'][1] - gap - top
    clear = pymupdf.Rect(x0 - 2, top - 1.5, x1 + 2, b8['bbox'][3] + 1.5)
    page.add_redact_annot(clear)
    page.apply_redactions(images=pymupdf.PDF_REDACT_IMAGE_NONE)

    # ── draw the new clause 7 into the space old 7 + old 8 occupied ─────────
    first_w = x1 - body_x - pymupdf.get_text_length(lead_ws, fontname='helv', fontsize=fs)
    lines = wrap(NEW7, fs, first_w, x1 - x0)
    need = len(lines) * lead
    assert need <= room, ('the new clause needs %.1fpt but only %.1fpt is free before '
                          'clause 9 -- it would collide' % (need, room))
    print('       new clause 7: %d lines, %.1fpt of %.1fpt available' % (len(lines), need, room))
    # ⚠️ EVERY OTHER CLAUSE ON THIS PAGE IS JUSTIFIED to both margins. Setting the
    # replacement ragged-right leaves one paragraph visibly different from the
    # fourteen around it -- the render caught what the text compare could not.
    # insert_text() has no justification, so each line is placed word by word with
    # the slack shared across its inter-word gaps. The LAST line of a paragraph is
    # left ragged, which is what justified setting does.
    def put_justified(px, by, words, avail, last):
        nat = sum(pymupdf.get_text_length(w, fontname='helv', fontsize=fs) for w in words)
        sp = pymupdf.get_text_length(' ', fontname='helv', fontsize=fs)
        if last or len(words) < 2:
            page.insert_text((px, by), ' '.join(words), fontname='helv', fontsize=fs)
            return
        extra = (avail - nat) / (len(words) - 1)
        if extra < sp: extra = sp                 # never tighten below a real space
        cx = px
        for w in words:
            page.insert_text((cx, by), w, fontname='helv', fontsize=fs)
            cx += pymupdf.get_text_length(w, fontname='helv', fontsize=fs) + extra

    y = top
    for i, ln in enumerate(lines):
        by = y + base_off
        last = (i == len(lines) - 1)
        if i == 0:
            page.insert_text((x0, by), '7.', fontname='hebo', fontsize=fs)
            lw = pymupdf.get_text_length(lead_ws, fontname='helv', fontsize=fs)
            put_justified(body_x + lw, by, ln.split(), x1 - body_x - lw, last)
        else:
            put_justified(x0, by, ln.split(), x1 - x0, last)
        y += lead

    # ── clause 9 stays put; restrike its number as 8 ────────────────────────
    s9 = b9['lines'][0]['spans'][0]
    assert s9['text'].strip() == '9.'
    page.add_redact_annot(number_rect(b9, s9))
    page.apply_redactions(images=pymupdf.PDF_REDACT_IMAGE_NONE)
    page.insert_text((s9['origin'][0], s9['origin'][1]), '8.',
                     fontname='hebo', fontsize=round(s9['size'], 2))

    # ── right column: renumber 10..16 -> 9..15, number glyph only ───────────
    for n in range(10, 17):
        b, _ = bl[n]
        s = b['lines'][0]['spans'][0]
        assert s['text'].strip() == '%d.' % n, 'unexpected number span %r' % s['text']
        page.add_redact_annot(number_rect(b, s))
    page.apply_redactions(images=pymupdf.PDF_REDACT_IMAGE_NONE)
    for n in range(10, 17):
        b, _ = bl[n]
        s = b['lines'][0]['spans'][0]
        page.insert_text((s['origin'][0], s['origin'][1]), '%d.' % (n - 1),
                         fontname='hebo', fontsize=round(s['size'], 2))

    out = OUT + name.replace('.pdf', '_REVISED.pdf')
    doc.save(out, garbage=3, deflate=True)
    doc.close()
    return out

os.makedirs(OUT, exist_ok=True)
for f in ['Cardinal_Roofing_Contract.pdf', 'Cardinal_Gutter_Contract.pdf']:
    print(patch(f))
