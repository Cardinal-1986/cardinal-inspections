"""Build 1439 (written by builder A3) — round-1 leftovers on build 1438 (documents, editor, money labels).

    python3 patch_1439_docs.py <index.html> [<api/share.js>]

Items: P02.03 P02.11 P03.08 P03.09 P03.11/J15.08 P11.05 P11.07 P11.11 P11.13 P04.03
P05.07 P05.11 P12.14, and V3's extra (the phone invoice editor's Bill To table).
No build stamp, no CHANGELOG entry: the integrator does both. api/senddoc.js is NOT edited —
the emailed contract is cleaned in the app, before the POST (see crContractAttach below).
"""
import sys
sys.path.insert(0, '/home/user/cardinal-inspections/.claude/skills/cardinal-build/scripts')
import patch_lib as pl

P = sys.argv[1]
SHARE = sys.argv[2] if len(sys.argv) > 2 else None


def one(s, a, b):
    assert s.count(a) == 1, (s.count(a), a[:90])
    return s.replace(a, b, 1)


s = pl.load(P)

# ── P12.14: the Estimates empty state names all three ways in ─────────────────────────────
s = one(s,
    "Use <b>\\uFF0B From a template</b> to start from a trade template, or <b>Upload estimate</b> for one written on paper or in another program.</div>",
    "Use <b>\\uFF0B From a template</b> to start from a trade template, <b>Blank estimate</b> to add the lines yourself, or <b>Upload estimate</b> for one written on paper or in another program.</div>")

# ── P05.07: the Activity Count strip says what it counts. Every tile in it (Money Collected too)
#    reads every board's jobs and collections; the A/R card beside it is board-scoped. Label only. ──
s = one(s, "</svg>Activity Count: Last 30 Days</div>", "</svg>Activity Count: All Boards, Last 30 Days</div>")

# ── P05.11: on a phone the Owed table hides Draws, never Net (the amount actually paid). The other
#    #payView tables keep the column 4 rule they had. ──
s = one(s, "  #payView th:nth-child(4),#payView td:nth-child(4){display:none;}\n}",
    "  #payView table:not(.pay-owed) th:nth-child(4),#payView table:not(.pay-owed) td:nth-child(4){display:none;}\n"
    "  /* P05.11: column 4 of the Owed table is Net, the amount actually paid; it hides Draws instead */\n"
    "  #payView .pay-owed th:nth-child(3),#payView .pay-owed td:nth-child(3){display:none;}\n}")
s = one(s, "h += '<table><thead><tr><th>Rep</th><th class=\"pay-r\">Owed</th><th class=\"pay-r\">Draws</th>' +",
    "h += '<table class=\"pay-owed\"><thead><tr><th>Rep</th><th class=\"pay-r\">Owed</th><th class=\"pay-r\">Draws</th>' +")

# ── P02.11 + P11.11 + P11.13 (estimate stylesheet, buildDocHtml) ─────────────────────────
s = one(s, "--muted:#6b6b6b;--faint:#8a8a8a;--hair:#e5e2dc;--wash:#faf8f4;--amber:#E8A33D}",
    "--muted:#6b6b6b;--faint:#6b6b6b;--hair:#e5e2dc;--wash:#faf8f4;--amber:#E8A33D}")   # P11.11: 3.45:1 -> 5.33:1
s = one(s, "'table.meta td.k{padding:8px 0 1px;border-top:1px solid var(--hair)}\\n' +",
    "'table.meta td.k{width:100%;padding:8px 0 1px;border-top:1px solid var(--hair)}\\n' +")   # P02.11: the base 20% won here
s = one(s,
    "'.foot{margin-top:28px;padding-top:10px;border-top:1px solid var(--hair);font-size:9.5pt;color:var(--faint);text-align:center;font-family:\"Segoe UI\",-apple-system,BlinkMacSystemFont,Roboto,Arial,sans-serif;letter-spacing:.03em}\\n' +",
    "'.foot{margin-top:28px;padding-top:10px;border-top:1px solid var(--hair);font-size:9.5pt;color:var(--faint);text-align:center;font-family:\"Segoe UI\",-apple-system,BlinkMacSystemFont,Roboto,Arial,sans-serif;letter-spacing:.03em;break-before:avoid;break-inside:avoid}\\n' +")   # P11.13

# ── P11.11 + P11.13 (Roof Options stylesheet, buildGbbHtml) ─────────────────────────────
s = one(s, "--muted:#6b6b6b;--faint:#8a8a8a;--hair:#e5e2dc;--wash:#faf8f4}\\n' +",
    "--muted:#6b6b6b;--faint:#6b6b6b;--hair:#e5e2dc;--wash:#faf8f4}\\n' +")
s = one(s,
    "    '.foot{margin-top:22px;padding-top:9px;border-top:1px solid var(--hair);font-size:9pt;color:var(--faint);text-align:center;font-family:\"Segoe UI\",-apple-system,BlinkMacSystemFont,Roboto,Arial,sans-serif;letter-spacing:.03em}\\n' +",
    "    '.foot{margin-top:22px;padding-top:9px;border-top:1px solid var(--hair);font-size:9pt;color:var(--faint);text-align:center;font-family:\"Segoe UI\",-apple-system,BlinkMacSystemFont,Roboto,Arial,sans-serif;letter-spacing:.03em;break-before:avoid;break-inside:avoid}\\n' +\n"
    "    /* P11.13: a three-option sheet overflowed one Letter page by its last few lines (the fine print and the\n"
    "       company line printed alone on page 2). Paper only: the same layout, with less air in it. */\n"
    "    '@media print{.est-logo{width:1.5in}.est-ocpc{width:1.3in;margin-top:7px}.gbb-title{line-height:1.15}.rule{margin:6px 0 10px}' +\n"
    "    '.gbb-intro{max-width:none;margin:4px 0 10px}.gbb-col{padding:12px 14px 10px}.gbb-price{margin-top:4px}.gbb-feat{gap:3px;margin-bottom:8px}' +\n"
    "    '.gbb-terms{margin-top:10px;padding:8px 14px;row-gap:4px}.gbb-sign{margin-top:18px}.gbb-fine{margin-top:10px;break-inside:avoid}.foot{margin-top:12px;padding-top:6px}}\\n' +")

# ── P11.11: the printed footer (the editor's print/PDF furniture). The left and right boxes of a
#    report's own footer take the same ink, so the three read as one line. ──
s = one(s,
    "'font-family:\"Segoe UI\",-apple-system,BlinkMacSystemFont,Roboto,Arial,sans-serif;font-size:8pt;color:#8a8a8a;}}';",
    "'font-family:\"Segoe UI\",-apple-system,BlinkMacSystemFont,Roboto,Arial,sans-serif;font-size:8pt;color:#6b6b6b;}' +\n"
    "    '@bottom-left{color:#6b6b6b;}@bottom-right{color:#6b6b6b;}}';   /* P11.11: #8a8a8a was 3.45:1 on paper; 5.33:1 */")

# ── P03.11 / J15.08: the Contracts tab. One red main action (Buttons A); the upload is the outline
#    .chipbtn with Blank estimate's spacing; the intro loses what repeats the heading. ──
s = one(s,
    "      <p class=\"subnote\">Client contracts &#8212; roofing, siding and gutters, each the trade&#8217;s own\n"
    "      Construction Agreement, prefilled from this profile. Signed on paper, or a windows job?\n",
    "      <p class=\"subnote\">Roofing, siding and gutter Construction Agreements, prefilled from this profile.\n"
    "      Signed on paper, or a windows job?\n")
s = one(s, "      <b>Upload signed contract</b> keeps a photo or PDF of it and opens the invoice.",
    "      <b>Upload signed contract</b> keeps a photo or PDF and opens the invoice.")
# Blank estimate's spacing (6px beside, 4px below) as the row's gap, so a wrapped button starts in line, not 8px in
s = one(s, "      <div style=\"margin:6px 0 12px;\">\n        <span id=\"pContractWrap\" style=\"position:relative;\">",
    "      <div style=\"margin:6px 0 12px;display:flex;flex-wrap:wrap;align-items:center;gap:4px 6px;\">\n        <span id=\"pContractWrap\" style=\"position:relative;\">")
s = one(s, "<button class=\"btn\" id=\"pUploadContractBtn\" type=\"button\" style=\"margin-left:8px;\">Upload signed contract</button>",
    "<button class=\"chipbtn\" id=\"pUploadContractBtn\" type=\"button\">Upload signed contract</button>")
# docRowHtml: a signed document is past sent/unsent (the editor has hidden this since 1392)
s = one(s,
    "      '<button class=\"chipbtn\" data-act=\"toggle\" data-id=\"'+r.id+'\">'+toggleLabel+'</button>' +",
    "      (r.signed_at ? '' : '<button class=\"chipbtn\" data-act=\"toggle\" data-id=\"'+r.id+'\">'+toggleLabel+'</button>') +   /* P03.11: as 1392 does in the editor */")

# ── P02.03: the editor's chip. An estimate document reads DRAFT (its card's word); the back chip
#    says what the number is; a successful Email to client updates the open document. ──
s = one(s, "    statusChip.textContent = status.toUpperCase();",
    "    /* P02.03: an estimate document reads the builder's word for not-sent-yet, as its card does (docRowHtml) */\n"
    "    statusChip.textContent = (status !== 'sent' && current && isEstimateDoc({ id: current.id, title: titleInput ? /** @type {any} */ (titleInput).value : '' }))\n"
    "      ? 'DRAFT' : status.toUpperCase();")
s = one(s, "+ (po ? '<small>' + esc(String(po)) + ':</small> ' : '')",
    "+ (po ? '<small><span class=\"edpo\">PO </span>' + esc(String(po)) + ':</small> ' : '')")
# ...but not on a phone: the 46vw chip has no 11px to spare, and the label would cut the client's name (1204: the
# name is how a rep knows whose document is open). Which one gets the room there is Theo's call.
s = one(s, "  #edClientChip{max-width:46vw;}\n}",
    "  #edClientChip{max-width:46vw;}\n  #edClientChip .edpo{display:none;}   /* P02.03: no room for the PO label beside the name at phone width */\n}")
s = one(s,
    "    await db.update(current.id, { status: 'sent', sent_at: new Date().toISOString() });\n    crDocSent(current.id);",
    "    var _sentAt = new Date().toISOString();\n"
    "    await db.update(current.id, { status: 'sent', sent_at: _sentAt });\n"
    "    crDocSent(current.id);\n"
    "    /* P02.03: the row is sent, so the open document's chip and its Mark sent button say so */\n"
    "    if(current){ current.status = 'sent'; current.sent_at = _sentAt; setEditorStatus('sent', _sentAt, current.signed_at); }")

# ── P03.08: Client signature joins the sends in the phone's main row. MOVED out of #edSecondary,
#    never copied: the drawer builds its rows from that span, so a copy would offer it twice. ──
SIG = "      <button class=\"btn dark\" id=\"sigBtn\" style=\"display:none;\" data-cri=\"pencil\"><span class=\"bl\">Client signature</span></button>\n"
s = one(s, SIG, "")
s = one(s,
    "      <button class=\"btn dark\" id=\"shareBtn\" data-cri=\"paperclip\"><span class=\"bl\">Share link</span></button>\n",
    "      <button class=\"btn dark\" id=\"shareBtn\" data-cri=\"paperclip\"><span class=\"bl\">Share link</span></button>\n"
    "      <!-- P03.08: in-person signing is a send too; moved here out of #edSecondary like 1204's three -->\n" + SIG)

# the stylesheet's display (inline-flex, the sends' layout: icon then label, left-aligned) instead of an
# inline inline-block, which centred it and dropped the icon gap once it sat in the phone grid
s = one(s, "  b.style.display = (doc && (doc.querySelector('.sign') || doc.querySelector('.ac-sign') || doc.querySelector('[data-sig]'))) ? 'inline-block' : 'none';",
    "  b.style.display = (doc && (doc.querySelector('.sign') || doc.querySelector('.ac-sign') || doc.querySelector('[data-sig]'))) ? '' : 'none';   /* P03.08: '' = the row's own inline-flex */")

# ── P03.09: signing confirms once. saveCurrent({quiet:true}) skips its Saved toast; the sign path
#    raises "Signed — buyer" right after. Every other caller (and the Save button's MouseEvent) is unchanged. ──
s = one(s, "async function saveCurrent(){\n  if(!current) return;",
    "async function saveCurrent(opts){\n  if(!current) return;\n  var _quiet = !!(opts && opts.quiet === true);   /* P03.09 */")
s = one(s,
    "    try{ if(window.crToastOk) window.crToastOk('Saved \\u2014 ' + ((titleInput.value || '').trim() || 'document')); }catch(_){}",
    "    try{ if(window.crToastOk && !_quiet) window.crToastOk('Saved \\u2014 ' + ((titleInput.value || '').trim() || 'document')); }catch(_){}")
s = one(s, "      sigModal.style.display = 'none';\n      await saveCurrent();\n      try{\n        /* Only the BUYER",
    "      sigModal.style.display = 'none';\n      await saveCurrent({ quiet: true });   /* P03.09: the Signed toast below is the one confirmation */\n      try{\n        /* Only the BUYER")

# ── P11.07: the printed invoice ─────────────────────────────────────────────────────────
s = one(s, "    if(p) p.innerHTML = '&#8722;' + fmtMoney(paid, true);",
    "    if(p) p.innerHTML = (Math.abs(paid) < 0.005 ? '' : '&#8722;') + fmtMoney(paid, true);   /* P11.07: $0.00, not -$0.00 */")
s = one(s, "  #cr-inv-ledger tfoot{display:table-row-group;}   /* E: Total paid once, after the last payment */\n}`;",
    "  #cr-inv-ledger tfoot{display:table-row-group;}   /* E: Total paid once, after the last payment */\n"
    "  #cr-inv-live:not(.paid){display:none;}   /* P11.07: the status pill is the app's; paper keeps PAID IN FULL and the history */\n}`;")
s = one(s, "    out = out.replace(SIGN_FOOTER, '');\n  }\n  /* 889:",
    "    out = out.replace(SIGN_FOOTER, '');\n"
    "    /* P11.07: a bill's Terms are two sentences; they follow the summary instead of starting page 3 */\n"
    "    out = out.replace('<h2 class=\"sec page-break\">Terms</h2>', '<h2 class=\"sec\">Terms</h2>');\n  }\n  /* 889:")

# ── V3 extra: the phone editor's invoice header table (an invoice with no lines is laid out at the
#    phone's width) ran 427px in a 390px frame. Fixed layout + breaking a long address/email. ──
s = one(s,
    "'@media screen and (max-width:640px){.figrow{flex-direction:column;}.fig .frame{height:auto;aspect-ratio:4/3;}' +",
    "'@media screen and (max-width:640px){.figrow{flex-direction:column;}.fig .frame{height:auto;aspect-ratio:4/3;}' +\n"
    "          'table.meta{table-layout:fixed;}table.meta td{overflow-wrap:anywhere;}' +   /* V3: the Bill To table ran off the frame */")

# ── P04.03 (app print path): figure captions renumber with their section ──────────────────
s = one(s,
    "    num++;\n    if(!sp.getAttribute('data-orignum')) sp.setAttribute('data-orignum', sp.textContent);\n    sp.textContent = String(num);\n  });",
    "    num++;\n    if(!sp.getAttribute('data-orignum')) sp.setAttribute('data-orignum', sp.textContent);\n    sp.textContent = String(num);\n"
    "    /* P04.03: \"Fig. 5.1\" under a section that now prints as 3 reads \"Fig. 3.1\". Only a caption that still\n"
    "       carries its section's own number is touched; restorePrintMarks() puts it back. */\n"
    "    var _on = String(sp.getAttribute('data-orignum')).trim();\n"
    "    for(var _el = h.nextElementSibling; _el && !(_el.tagName === 'H2' && _el.classList.contains('sec')); _el = _el.nextElementSibling){\n"
    "      Array.prototype.forEach.call(_el.querySelectorAll ? _el.querySelectorAll('.fig .cap > b:first-child') : [], function(b){\n"
    "        var _ot = b.getAttribute('data-origfig') || b.textContent;\n"
    "        var _m = /^(\\s*Fig\\.\\s*)(\\d+)(\\.\\d+)/.exec(_ot);\n"
    "        if(!_m || _m[2] !== _on) return;\n"
    "        if(!b.getAttribute('data-origfig')) b.setAttribute('data-origfig', _ot);\n"
    "        b.textContent = _m[1] + num + _m[3] + _ot.slice(_m[0].length);\n"
    "      });\n"
    "    }\n  });")
RESTORE_FIG = ("  d.querySelectorAll('.fig .cap b[data-origfig]').forEach(function(b){   /* P04.03 */\n"
               "    b.textContent = b.getAttribute('data-origfig');\n"
               "    b.removeAttribute('data-origfig');\n"
               "  });\n")
s = one(s,
    "  d.querySelectorAll('.toc-row .t[data-origtoc]').forEach(function(t){\n    t.textContent = t.getAttribute('data-origtoc');\n    t.removeAttribute('data-origtoc');\n  });\n}",
    "  d.querySelectorAll('.toc-row .t[data-origtoc]').forEach(function(t){\n    t.textContent = t.getAttribute('data-origtoc');\n    t.removeAttribute('data-origtoc');\n  });\n"
    + RESTORE_FIG +
    "  crContractBlanksRestore(d);   /* P11.05 */\n}")
s = one(s,
    "  clone.querySelectorAll('.toc-row .t[data-origtoc]').forEach(function(t){\n    t.textContent = t.getAttribute('data-origtoc');\n    t.removeAttribute('data-origtoc');\n  });\n  var sf = clone.querySelector('#screenFix');",
    "  clone.querySelectorAll('.toc-row .t[data-origtoc]').forEach(function(t){\n    t.textContent = t.getAttribute('data-origtoc');\n    t.removeAttribute('data-origtoc');\n  });\n"
    + RESTORE_FIG.replace("  d.querySelectorAll", "  clone.querySelectorAll") +
    "  crContractBlanksRestore(clone);   /* P11.05: a print's blanks are never what is saved */\n"
    "  var sf = clone.querySelector('#screenFix');")

# ── P11.05: a contract's unfilled [prompts] and unchosen "— select —" boxes. Print gets blank lines
#    (reversible); the emailed attachment gets the share page's clean-up (api/share.js CONTRACT_FIX,
#    1427) done to a copy before it is posted, so it reads right with or without script. Filled fields,
#    the rows of the agreement and its legal text are never touched. ──
s = one(s,
    "  if(!d.querySelector('[data-cardinal-summary-heading]')) return;\n  /* F: a mark left",
    "  try{ if(crIsContractDoc(d, titleInput ? /** @type {any} */ (titleInput).value : '')) crContractBlanks(d, false); }catch(_cb){}   /* P11.05 */\n"
    "  if(!d.querySelector('[data-cardinal-summary-heading]')) return;\n  /* F: a mark left")
CONTRACT_FNS = r"""/* P11.05: a contract's unfilled fields, the way api/share.js CONTRACT_FIX (1427) shows them on the client's
   page: a [prompt] is a blank line, an unchosen dropdown a blank, the editor's leftover Notes line and its
   heading go. KEEP IN SYNC with CONTRACT_FIX. A field the rep filled never starts with "[", so it is never
   touched, and no row of the agreement is removed. attach=false (Print / Download): reversible marks, undone
   by crContractBlanksRestore() from restorePrintMarks() and serializeFrame(). attach=true: done to the COPY
   that is emailed (crContractAttach), with the dropdowns frozen to text and the screen-only hint removed. */
function crIsContractDoc(d, title){
  var t = String(title || '').trim();
  if(/^invoice/i.test(t)) return false;
  return /^contract/i.test(t) || !!(d && d.querySelector && d.querySelector('[data-sig="buyer"]'));
}
function crContractBlanks(d, attach){
  if(!d || !d.body) return;
  var EM = '  ';
  d.querySelectorAll('.ph').forEach(function(el){
    if(el.hasAttribute('data-origph')) return;
    var t = (el.textContent || '').trim();
    if(t.charAt(0) !== '[') return;
    if(/^(P|DIV|LI)$/.test(el.tagName)){ el.setAttribute('data-emptyblock', '1'); el.setAttribute('data-crblank', '1'); return; }
    if(!attach) el.setAttribute('data-origph', el.innerHTML);
    el.setAttribute('data-blankph', '1');
    el.textContent = EM;
  });
  d.querySelectorAll('select').forEach(function(sel){
    var o = sel.options[sel.selectedIndex];
    var v = (o && o.value) ? (o.textContent || '').trim() : '';
    if(attach){
      var sp = d.createElement('span');
      sp.className = 'crsel-ro';
      if(v) sp.textContent = v; else { sp.setAttribute('data-blankph', '1'); sp.textContent = EM; }
      sel.parentNode.replaceChild(sp, sel);
    }else if(o && !o.value && !o.hasAttribute('data-origtxt')){
      o.setAttribute('data-origtxt', o.textContent || '');
      o.textContent = EM;
    }
  });
  /* a heading left over nothing (the Notes line); a .note box carries its own bold label */
  d.querySelectorAll('h2.sec').forEach(function(h){
    var el = h.nextElementSibling, gone = 0, keep = 0;
    while(el && !(el.tagName === 'H2' && el.classList.contains('sec'))){
      if(el.getAttribute('data-crblank')) gone++;
      else if(!(el.classList.contains('note') || el.tagName === 'SCRIPT' || el.tagName === 'STYLE')){ keep = 1; break; }
      el = el.nextElementSibling;
    }
    if(gone && !keep){ h.setAttribute('data-emptyblock', '1'); h.setAttribute('data-crblank', '1'); }
  });
  if(attach){
    d.querySelectorAll('[data-crblank]').forEach(function(el){ el.remove(); });
    d.querySelectorAll('.items-hint').forEach(function(el){ el.remove(); });   /* "Tap a box to check it" is the editor's */
  }
}
function crContractBlanksRestore(d){
  if(!d || !d.querySelectorAll) return;
  d.querySelectorAll('.ph[data-origph]').forEach(function(el){
    el.innerHTML = el.getAttribute('data-origph');
    el.removeAttribute('data-origph');
    el.removeAttribute('data-blankph');
  });
  d.querySelectorAll('option[data-origtxt]').forEach(function(o){
    o.textContent = o.getAttribute('data-origtxt');
    o.removeAttribute('data-origtxt');
  });
  d.querySelectorAll('[data-crblank]').forEach(function(el){
    el.removeAttribute('data-crblank');
    el.removeAttribute('data-emptyblock');
  });
}
/* the emailed copy: parsed (scripts inert), cleaned, serialized. If anything fails it goes as it was. */
function crContractAttach(html, title){
  try{
    var dd = new DOMParser().parseFromString(String(html || ''), 'text/html');
    if(!crIsContractDoc(dd, title)) return html;
    crContractBlanks(dd, true);
    var st = dd.createElement('style');
    st.id = 'crContractFix';
    st.textContent = '.ph[data-blankph],.crsel-ro[data-blankph]{background:none !important;border-bottom:1px solid #1b1b1b;border-radius:0 !important;padding:0 !important;display:inline-block;min-width:3.2em}' +
      '.crsel-ro{border-bottom:1px solid #555;padding:0 2px}.cbx{cursor:default}a[data-cr-master]{color:#9c1822}';
    (dd.head || dd.documentElement).appendChild(st);
    return '<!DOCTYPE html>\n' + dd.documentElement.outerHTML;
  }catch(_e){ return html; }
}
"""
s = one(s, "function compactForPrint(d){\n", CONTRACT_FNS + "function compactForPrint(d){\n")
# the blank line prints as a rule, not a yellow box (print and Download only; a no-op until compactForPrint marks one)
s = one(s,
    "  st.textContent = '@media print{body{width:auto !important;margin:0 !important;padding:0 !important;}' +",
    "  st.textContent = '@media print{body{width:auto !important;margin:0 !important;padding:0 !important;}' +\n"
    "    '.ph[data-blankph]{background:none !important;border-bottom:1px solid #1b1b1b;border-radius:0 !important;padding:0 !important;display:inline-block;min-width:3.2em;}' +   /* P11.05 */")
s = one(s, "        html: await inlineDocImages(serializeFrame()),   /* 1270 */",
    "        html: await inlineDocImages(crContractAttach(serializeFrame(), (row && row.title) || /** @type {any} */ (titleInput).value || '')),   /* 1270; P11.05 */")

pl.write_atomic(P, s)
print('ok 1439 index.html', P)

# ── api/share.js ────────────────────────────────────────────────────────────────────────
if SHARE:
    j = pl.load(SHARE)
    # P04.03: the share page's renumber pass carries each section's figure captions with it
    j = one(j,
        "      'num++;sp.textContent=String(num);});' +",
        "      'num++;var on=(sp.textContent||\"\").trim();sp.textContent=String(num);' +\n"
        "      /* P04.03: \"Fig. 5.1\" under the section now numbered 3 reads \"Fig. 3.1\" (KEEP IN SYNC with compactForPrint) */\n"
        "      'for(var el=h.nextElementSibling;el&&!(el.tagName===\"H2\"&&el.classList.contains(\"sec\"));el=el.nextElementSibling){' +\n"
        "      'if(el.querySelectorAll)el.querySelectorAll(\".fig .cap > b:first-child\").forEach(function(b){' +\n"
        "      'var m=/^(\\\\s*Fig\\\\.\\\\s*)(\\\\d+)(\\\\.\\\\d+)/.exec(b.textContent);if(m&&m[2]===on)b.textContent=m[1]+num+m[3]+b.textContent.slice(m[0].length);});}});' +")
    # P11.11: the client's own print of the page carries the same footer ink as the editor's
    j = one(j, "      'font-family:\\'Segoe UI\\',Arial,sans-serif;font-size:8pt;color:#8a8a8a}}}</style>' +",
        "      'font-family:\\'Segoe UI\\',Arial,sans-serif;font-size:8pt;color:#6b6b6b}@bottom-left{color:#6b6b6b}@bottom-right{color:#6b6b6b}}}</style>' +   /* P11.11 */")
    # P11.07: an invoice with nothing paid says $0.00, not -$0.00
    j = one(j, "  cell(/(<td[^>]*id=\"invPaid\"[^>]*>)[\\s\\S]*?<\\/td>/, '&#8722;' + usd(o.paidCents));\n  cell(/(Payments Received<\\/td>\\s*<td[^>]*>)[\\s\\S]*?<\\/td>/, '&#8722;' + usd(o.paidCents));",
        "  const paidTxt = (o.paidCents ? '&#8722;' : '') + usd(o.paidCents);   /* P11.07 */\n"
        "  cell(/(<td[^>]*id=\"invPaid\"[^>]*>)[\\s\\S]*?<\\/td>/, paidTxt);\n  cell(/(Payments Received<\\/td>\\s*<td[^>]*>)[\\s\\S]*?<\\/td>/, paidTxt);")
    pl.write_atomic(SHARE, j)
    print('ok 1439 share.js', SHARE)
