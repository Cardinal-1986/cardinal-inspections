#!/usr/bin/env python3
"""Build 1263 — Leads & Jobs sorts Newest first (Theo, 8 Oct).

Theo: "make the filters for leads, prospects, etc be able to go from newest to
oldest". The Leads & Jobs list (every pipeline circle opens it, filtered to
that stage) had no date-created sort at all — the default was Age in Status
(stage_since, oldest first), and the only reverse was an unlabelled ⇅ icon.

Adds Newest first / Oldest first (by created_at) at the top of LJ_SORTS and
makes Newest first the default, so a tap on Leads or Prospects shows the newest
lead on top. Every other sort and the ⇅ reverse are unchanged.
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import patch_lib as pl
HERE = os.path.dirname(os.path.abspath(__file__))
PATH = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, '../../../../index.html')
src = pl.load(PATH)
src = pl.sub(src, """var LJ_SORTS = [
  { key:'status',   label:'Age in Status' },""", """var LJ_SORTS = [
  /* 1263: Theo — "be able to go from newest to oldest" */
  { key:'newest',   label:'Newest first' },
  { key:'oldest',   label:'Oldest first' },
  { key:'status',   label:'Age in Status' },""")
src = pl.sub(src, """  if(s === 'status'){
    r = alpha(ca.stage_since || a.updated_at || a.created_at, cb.stage_since || b.updated_at || b.created_at);""", """  if(s === 'newest' || s === 'oldest'){
    r = alpha(b.created_at || b.updated_at, a.created_at || a.updated_at);
    if(s === 'oldest') r = -r;
  } else if(s === 'status'){
    r = alpha(ca.stage_since || a.updated_at || a.created_at, cb.stage_since || b.updated_at || b.created_at);""")
src = pl.sub(src, "var ljState = { sel:null, sort:'status', dir:1,", "var ljState = { sel:null, sort:'newest', dir:1,")
src = pl.sub(src, '<button class="ljsortchip" id="ljSortChip">Age in Status</button>', '<button class="ljsortchip" id="ljSortChip">Newest first</button>')
src = pl.sub(src, '>v2026-10-08 build 1262<', '>v2026-10-08 build 1263<')
src = pl.sub(src, '''var CHANGELOG = [
''', '''var CHANGELOG = [
  { b: 1263, d: '2026-10-08', t: 'Leads and Prospects show newest first',
    s: 'Tap Leads, Prospects or any stage circle and the list now opens <b>Newest first</b> \\u2014 the lead entered most recently is on top. Sort by also has <b>Oldest first</b>, and every other sort is still there.' },
''')
pl.write_atomic(PATH, src)
print('patched', PATH, len(src))
