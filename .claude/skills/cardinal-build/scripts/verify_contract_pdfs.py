import pymupdf, re
SRC='/home/user/cardinal-inspections/docs/'

def reading_order(page):
    """Reconstruct the page in TRUE reading order from span geometry.
       Block order is useless here: text inserted by the patch lands at the END
       of the content stream, and a restruck clause number becomes its own block
       separate from the body it belongs to. Sorting spans by
       (column, baseline, x) puts everything back where a reader sees it."""
    spans=[]
    for b in page.get_text('dict')['blocks']:
        if b['type']!=0: continue
        for l in b['lines']:
            for sp in l['spans']:
                if not sp['text'].strip(): continue
                spans.append((0 if sp['bbox'][0]<300 else 1, round(sp['origin'][1],1),
                              round(sp['bbox'][0],1), sp['text']))
    spans.sort()
    # ⚠️ JOIN EVERY SPAN WITH A SPACE, not just across lines. Justified text is
    # inserted WORD BY WORD, so each word is its own span; concatenating spans
    # within a line produced "Replacementofdeteriorated" and made the verifier
    # report the clause as missing from a document where it renders perfectly.
    out, prev = [], None
    for col,y,x,t in spans:
        if prev is not None: out.append(' ')
        out.append(t); prev=(col,y)
    return re.sub(r'\s+',' ',''.join(out)).strip()

def clause_map(page):
    t=reading_order(page)
    d={}
    # A clause number is a 1-2 digit run preceded by whitespace and followed by
    # a capital. The fancier version of this required the previous character to
    # be a full stop and silently lost clause 10, whose number follows a SPACE
    # after the column break -- which then made clause 9 swallow clause 10 and
    # reported a diff in text that had not changed. Out-of-range hits (e.g. the
    # "23." in "ORC 1345.23. It is") are dropped by the 1..16 filter below.
    parts=re.split(r'\s(\d{1,2})\.\s+(?=[A-Z"\u201c])', ' '+t)
    for i in range(1,len(parts)-1,2):
        k=int(parts[i])
        if 1<=k<=16 and k not in d: d[k]=parts[i+1].strip()
    return d

for name in ['Cardinal_Roofing_Contract.pdf','Cardinal_Gutter_Contract.pdf']:
    o=pymupdf.open(SRC+name); n=pymupdf.open('out/'+name.replace('.pdf','_REVISED.pdf'))
    print('\n=== %s ==='%name)
    O,N=clause_map(o[2]),clause_map(n[2])
    ot,nt=o[2].get_text(), n[2].get_text()
    ntn=re.sub(r'\s+',' ',nt)

    assert o.page_count==n.page_count;                               print('  page count unchanged (%d)'%n.page_count)
    assert 'roof jacks, ventilators, flashing' not in ntn;           print('  old exclusion list gone')
    assert 'ARE INCLUDED in the quotation on the face hereof' in ntn; print('  new inclusion wording present')
    # NORMALISE BOTH SIDES. The PDF hard-wraps lines, so the master stores
    # "bond\ninsurance" and a raw substring test finds nothing -- which would read
    # as "the clause was never there" rather than "my matcher is line-blind".
    otn=re.sub(r'\s+',' ',ot)
    assert 'bond insurance premiums' in otn, 'clause 7 not found in the ORIGINAL'
    assert 'bond insurance premiums' not in ntn, 'clause 7 survives in the revision'
    print('  bond-insurance clause removed (present in original, absent in revision)')

    # SELF-COMPUTING: the new number/body spacing must match the ORIGINAL's,
    # not a hardcoded guess. The original body span starts with literal spaces.
    # Compare the number/body separation on NORMALISED reading order. The raw
    # whitespace cannot match: the original draws two literal space glyphs, the
    # justified replacement positions each word instead. What must hold is that
    # the number and the body are SEPARATE tokens, not run together.
    oro, nro = reading_order(o[2]), reading_order(n[2])
    assert re.search(r'(?<!\d)8\. Replacement of deteriorated', oro), 'original not as expected'
    assert re.search(r'(?<!\d)7\. Replacement of deteriorated', nro), 'number and body run together'
    print('  clause number and body extract as separate tokens')

    for k in range(1,7): assert O[k]==N[k], 'clause %d changed'%k
    print('  clauses 1-6 byte-identical')
    for k in range(9,17): assert O[k]==N[k-1], 'old %d != new %d'%(k,k-1)
    print('  old clauses 9-16 reproduced verbatim as 8-15')
    assert len(O)==16 and len(N)==15;                                print('  16 clauses -> 15, none lost')
    for i in range(o.page_count):
        if i!=2: assert re.sub(r'\s+','',o[i].get_text())==re.sub(r'\s+','',n[i].get_text()), 'page %d changed'%i
    print('  every other page unchanged')

    bs=[b for b in n[2].get_text('dict')['blocks'] if b['type']==0]
    sig=[b for b in bs if 'signing below' in ' '.join(s['text'] for l in b['lines'] for s in l['spans'])][0]['bbox'][1]
    low=max(b['bbox'][3] for b in bs if b['bbox'][0]<300 and b['bbox'][3]<sig)
    assert low<sig-4
    print('  left column ends y=%.1f, signature at y=%.1f -- clear by %.1f pt'%(low,sig,sig-low))

    tag=name.split('_')[1]
    n[2].get_pixmap(dpi=150).save('out/%s_AFTER.png'%tag)
    o[2].get_pixmap(dpi=150).save('out/%s_BEFORE.png'%tag)
print('\nALL VERIFICATIONS PASS')
