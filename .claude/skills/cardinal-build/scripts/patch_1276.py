#!/usr/bin/env python3
"""Build 1276 — a retail estimate shows Description and Price only (Theo, 10 Oct, pick #4 option A).

The client document dropped Qty / Unit / Unit Price for a homeowner: two
columns, each line's own amount under Price. Insurance and Community keep the
full five-column table (an adjuster or a funding partner reads the quantities).
Only the CLIENT DOCUMENT changes — the builder still prices by qty × unit price,
and every total is computed exactly as before.

usage: python3 patch_1276.py [index.html]
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import patch_lib as pl
HERE = os.path.dirname(os.path.abspath(__file__))
PATH = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, '../../../../index.html')
src = pl.load(PATH)
src = pl.sub(src, """var anyDetailed = lines.some(function(l){ return l.flat !== true; });
var COLS = anyDetailed ? 5 : 2;""", """/* 1276 (Theo, pick #4 A): a RETAIL estimate is Description + Price — a
   homeowner reads the line and its price, not qty x unit. Insurance and
   Community keep the full table. rowFor's two-column branch already prints
   each line's own amount (flat -> amount, else qty x unit price). */
var _ct = '';
try{ _ct = (project && typeof window.projClaimType === 'function') ? String(window.projClaimType(project) || '') : ''; }catch(_c){ _ct = ''; }
var packageView = _ct !== 'insurance' && _ct !== 'community';
var anyDetailed = !packageView && lines.some(function(l){ return l.flat !== true; });
var COLS = anyDetailed ? 5 : 2;""")
src = pl.sub(src, "'<tr><th>Description</th><th style=\"text-align:right;\">Amount</th></tr>';", "'<tr><th>Description</th><th style=\"text-align:right;\">' + (packageView ? 'Price' : 'Amount') + '</th></tr>';")
src = pl.sub(src, '>v2026-10-10 build 1275<', '>v2026-10-10 build 1276<')
src = pl.sub(src, '''var CHANGELOG = [
''', '''var CHANGELOG = [
  { b: 1276, d: '2026-10-10', t: 'Retail estimates: Description and Price',
    s: 'A retail estimate now shows the homeowner two columns \\u2014 what the work is, and its price. No more Qty, Unit and Unit Price columns on the client\\u2019s copy. You still price lines the same way in the builder, and the totals are the same. Insurance and Community estimates keep the full table.' },
''')
pl.write_atomic(PATH, src)
print('patched', PATH, len(src))
