"""Builder F — inspections after judge 4 (Inspections) and the inspection-report items of judge 11
(client-facing documents). index.html only; no SQL; no new AI call; no photo bytes altered; the 31-finding
taxonomy, the GPS/EXIF exclusion and the white .projform sheets are untouched. No build stamp or CHANGELOG
here — the merging build adds those.

  F1  guided report: each placed photo wears ITS severity. The template's empty boxes carry a sample HIGH
      chip and igPut skipped when a .tag was present, so every AI-placed photo read HIGH.
  F2  guided report: photos the assistant rated HIGH / MODERATE become rows in the Summary of Findings table
      (the table never heard about them). Uses the assistant's own ratings — no new call.
  F3  guided report: "Start without AI" takes the guide's title (no native prompt) and places the checked photos.
  F4  Quick Inspection: the Who sheet's three buttons read (1.2:1 → white on the start step's black), the open
      tab is marked; the client search finds "5 Pine St Dayton OH" (no commas) and never dead-ends.
  F5  Quick Inspection: Finish files the walk's photos into Inspection Photos, says where they went in a
      neutral sheet, and offers "Start the report" — the guide opens with those photos checked and the notes in
      its chat. The red toast pointing at a gallery that read 0 is gone.
  F6  Quick Inspection: photo captions — label and ✓ on one line, Analyze (13px) and the time on the next.
  F7  report editor, phone: the toolbar folds to one row while you scroll down the document (and while the
      assistant is open); the how-to panel folds to its heading after the first time; the banner is one line;
      "N to fill" stops counting Contents page numbers and empty photo boxes (neither prints).
  F8  report editor, phone: the Inspection Assistant sizes to its content (it was cut off at the screen edge)
      and its header folds it.
  F9  guided sheet: no 10px sideways overflow at 390px.
  F10 the "no checklist" question's words match its buttons.
  F11 the client's Inspections list no longer files invoices and change orders as inspection reports; they
      keep their own heading there.
  F12 printed report: the cover ends its own page (Inspector / Report No. stayed on page 2), signature lines
      keep their labels, the findings header keeps its first row, an empty "Overall Condition Assessment"
      heading no longer prints alone, and MODERATE is dark ink on amber (2.17:1 → 8.9:1).

Usage: python3 patch_F.py <index.html>   (writes in place, atomically)
"""
import sys
sys.path.insert(0, '/home/user/cardinal-inspections/.claude/skills/cardinal-build/scripts')
import patch_lib as pl

P = sys.argv[1] if len(sys.argv) > 1 else 'index.html'
s = pl.load(P)


def one(s, a, b):
    n = s.count(a)
    assert n == 1, (n, a[:120])
    return s.replace(a, b, 1)


def block(s, open_tag, close_tag='</script>'):
    i = s.index(open_tag)
    j = s.index(close_tag, i)
    return i, j


def in_block(s, open_tag, a, b, close_tag='</script>'):
    """exact-match INSIDE one block, and the anchor must not occur anywhere else in the file either"""
    i, j = block(s, open_tag, close_tag)
    blk = s[i:j]
    assert blk.count(a) == 1, ('block', open_tag, blk.count(a), a[:120])
    assert s.count(a) == 1, ('file', open_tag, s.count(a), a[:120])
    return s[:i] + blk.replace(a, b, 1) + s[j:]


INSG = '<script id="cr-insg-script">'

# ---------------------------------------------------------------- F1 + F2: igPut severity, findings rows
s = in_block(s, INSG, """    var done = {};
    function igPut(p, num, cap, sev){
      var src = srcOf(p); if(!src) return;
      if(!placePhotoInSection(doc, nums.indexOf(num) !== -1 ? num : dflt, src, cap || '', true)) return;
      done[String(p.id)] = true;
      var imgs = doc.querySelectorAll('.fig .frame img'), img = imgs[imgs.length - 1];
      for(var i = imgs.length - 1; i >= 0; i--){ if(imgs[i].getAttribute('src') === src){ img = imgs[i]; break; } }
      var fr = img && img.parentElement;
      if(fr && CK_PR[sev] && !fr.querySelector('.tag')){
        var tag = doc.createElement('span'); tag.className = 'tag';
        tag.innerHTML = '<span class="chip ' + CK_PR[sev][0] + '">' + CK_PR[sev][1] + '</span>';
        fr.insertBefore(tag, fr.firstChild);
      }
      var cp = fr && fr.parentElement && fr.parentElement.querySelector('.cap .ph');
      if(cp && cap){ cp.classList.remove('ph'); cp.classList.add('fill'); }
    }
    (j.photos || []).forEach(function(x){ var p = byId[x.id]; if(p && !done[x.id]) igPut(p, x.section, x.caption, x.severity); });
    picked.forEach(function(p){ if(!done[String(p.id)]) igPut(p, dflt, '', 'none'); });
""", """    var done = {}, found = [];
    function igPut(p, num, cap, sev){
      var src = srcOf(p); if(!src) return;
      var at = nums.indexOf(num) !== -1 ? num : dflt;
      if(!placePhotoInSection(doc, at, src, cap || '', true)) return;
      done[String(p.id)] = true;
      var imgs = doc.querySelectorAll('.fig .frame img'), img = imgs[imgs.length - 1];
      for(var i = imgs.length - 1; i >= 0; i--){ if(imgs[i].getAttribute('src') === src){ img = imgs[i]; break; } }
      var fr = img && img.parentElement;
      /* F (judge 4): the template's empty photo boxes carry a SAMPLE chip (HIGH in 3, 5 and 6, MODERATE in 8),
         and this used to add the photo's own chip only when no .tag was there — so the sample won and every
         photo the assistant placed read HIGH, a "monitor" granule-loss photo included. The photo's severity
         replaces whatever was there; a photo with no severity gets no chip. */
      if(fr) Array.prototype.forEach.call(fr.querySelectorAll('.tag'), function(t){ t.remove(); });
      if(fr && CK_PR[sev]){
        var tag = doc.createElement('span'); tag.className = 'tag';
        tag.innerHTML = '<span class="chip ' + CK_PR[sev][0] + '">' + CK_PR[sev][1] + '</span>';
        fr.insertBefore(tag, fr.firstChild);
      }
      if(cap && (sev === 'high' || sev === 'mod')) found.push({ num: at, cap: cap, sev: sev });
      var cp = fr && fr.parentElement && fr.parentElement.querySelector('.cap .ph');
      if(cp && cap){ cp.classList.remove('ph'); cp.classList.add('fill'); }
    }
    (j.photos || []).forEach(function(x){ var p = byId[x.id]; if(p && !done[x.id]) igPut(p, x.section, x.caption, x.severity); });
    picked.forEach(function(p){ if(!done[String(p.id)]) igPut(p, dflt, '', 'none'); });
    igFindingRows(doc, found);
""")

s = in_block(s, INSG, """  function igClick(e){
    var ph = e.target.closest('[data-ph]');""", """  /* F (judge 4): the Summary of Findings table never heard about the photos — the cracked boots the photos
     were tagged for, and that Recommendation 1 said to replace now, were missing from it, so the table and
     the rest of the report disagreed. Each photo the assistant rated HIGH or MODERATE becomes a row: its
     section, its caption, its chip. Rows the checklist wrote and rows typed by hand stay; the template's
     [Area] sample rows go, and one blank row is kept at the end for adding by hand, as
     injectChecklistFindings() leaves it. No new call: these are the ratings the assistant already returned. */
  /** @param {any} doc @param {any} list */
  function igFindingRows(doc, list){
    var table = /** @type {any} */ (doc.querySelector('table.concerns'));
    if(!table || !list.length) return;
    var rank = { high: 0, mod: 1 };
    list = list.slice().sort(function(a, b){ return rank[a.sev] - rank[b.sev]; });
    var rows = Array.prototype.filter.call(table.querySelectorAll('tr'), function(tr){ return !tr.querySelector('th'); });
    var body = rows.length ? rows[rows.length - 1].parentNode : (table.tBodies[table.tBodies.length - 1] || table);
    rows.forEach(function(tr){
      var cells = Array.prototype.filter.call(tr.querySelectorAll('td'), function(td){ return !td.classList.contains('n') && !td.classList.contains('pr'); });
      var sample = cells.length && cells.every(function(td){ var t = (td.textContent || '').trim(); return !t || t.charAt(0) === '['; });
      if(sample) tr.remove();
    });
    var have = String(table.textContent || '').toLowerCase();
    list.forEach(function(f){
      if(have.indexOf(String(f.cap).toLowerCase()) !== -1) return;
      var pr = CK_PR[f.sev], tr = doc.createElement('tr');
      tr.setAttribute('data-ai-finding', '1');
      tr.innerHTML = '<td class="n"></td><td><b class="fill">' + igEsc(sectionName(doc, f.num)) + '</b></td>' +
        '<td><span class="fill">' + igEsc(f.cap) + '</span></td>' +
        '<td class="pr"><span class="chip ' + pr[0] + '">' + pr[1] + '</span></td>';
      body.appendChild(tr);
    });
    var blank = doc.createElement('tr');
    blank.innerHTML = '<td class="n"></td><td><b class="ph">[Area]</b></td><td><span class="ph">[Finding.]</span></td>' +
      '<td class="pr"><span class="chip mon">MONITOR</span></td>';
    body.appendChild(blank);
    var n = 0;
    Array.prototype.forEach.call(table.querySelectorAll('td.n'), function(td){ td.textContent = String(++n); });
  }
  function igClick(e){
    var ph = e.target.closest('[data-ph]');""")

# ---------------------------------------------------------------- F3: Start without AI
s = in_block(s, INSG, """  function igStart(){
    /* the roof template when the roof was inspected (or nothing was picked);
       otherwise the exterior one, which covers the whole outside */
    var roof = !!S.types.Roof || (!S.general && !TYPES.some(function(t){ return S.types[t]; }));
    igClose();
    if(roof) createReportFrom(REPORT_TEMPLATE, 'Report', true);
    else createReportFrom(EXTERIOR_TEMPLATE, 'Exterior report', false);
  }""", """  function igStart(){
    /* the roof template when the roof was inspected (or nothing was picked);
       otherwise the exterior one, which covers the whole outside (igSections decides it the same way) */
    var secs = igSections(), pr = igProj();
    igClose();
    /* F (judge 4): "Start without AI" named the report through the browser's own prompt() and dropped every
       photo just checked. It takes the same title Write report uses, and the checked photos go into the report
       with no caption and no chip — igFill with an empty draft places them and writes nothing else. */
    var title = (pr && pr.name || 'Inspection') + (pr && pr.address ? ' — ' + pr.address : '');
    var opts = /** @type {any} */ ({ title: title });
    if(igPickedList().length) opts.fill = function(id){ return igFill(id, {}, secs.list); };
    return createReportFrom(secs.roof ? REPORT_TEMPLATE : EXTERIOR_TEMPLATE, secs.roof ? 'Report' : 'Exterior report', secs.roof, opts);
  }""")

# ---------------------------------------------------------------- F5 (guide half): photos + notes handed over
s = in_block(s, INSG, """  var P = { list: [], picked: {}, chat: [], busy: false, loaded: false };""",
"""  var P = /** @type {any} */ ({ list: [], picked: {}, chat: [], busy: false, loaded: false, seedPick: null, seedNote: '' });""")

s = in_block(s, INSG, """      var ids = []; try{ ids = getInspPhotoIds(pr) || []; }catch(_){}
      ids.slice(0, PIC_MAX)""", """      var ids = []; try{ ids = getInspPhotoIds(pr) || []; }catch(_){}
      /* F: opened from a finished Quick Inspection, the walk's own photos are the ones checked */
      if(P.seedPick && P.seedPick.length) ids = P.seedPick;
      ids.slice(0, PIC_MAX)""")

s = in_block(s, INSG, """    if(!P.chat.length) P.chat.push({ role: 'ai', text: 'I have your checklist. Check the photos you want in the report, and tell me anything they don’t show — a reported leak, how long, what the homeowner wants. Tap Write report when you’re ready.' });
""", """    if(!P.chat.length) P.chat.push({ role: 'ai', text: 'I have your checklist. Check the photos you want in the report, and tell me anything they don’t show — a reported leak, how long, what the homeowner wants. Tap Write report when you’re ready.' });
    /* F: a Quick Inspection's notes arrive as the rep's own first message — shown, and sent only with Send or Write report */
    if(P.seedNote){ P.chat.push({ role: 'me', text: 'From the Quick Inspection:\\n' + P.seedNote }); P.seedNote = ''; }
""")

s = in_block(s, INSG, """  function igOpen(){
    var pr = igProj();""", """  /** @param {any} [o] */
  function igOpen(o){
    var pr = igProj();""")

s = in_block(s, INSG, """    P.list = []; P.picked = {}; P.chat = []; P.busy = false; P.loaded = false;
    igBuild(); igStep1();""", """    P.list = []; P.picked = {}; P.chat = []; P.busy = false; P.loaded = false;
    /* F: from Quick Inspection's Finish — { pick: [photo ids], note: 'the walk\\'s notes' } (qiOfferReport) */
    P.seedPick = (o && Array.isArray(o.pick) && o.pick.length) ? o.pick.map(String) : null;
    P.seedNote = (o && o.note) ? String(o.note) : '';
    igBuild(); igStep1();""")

# ---------------------------------------------------------------- F9: guided sheet overflow
s = one(s, """#insgSheet .ig-body{max-width:620px;margin:0 auto;padding:14px 16px 120px;display:grid;gap:14px;}""",
"""#insgSheet .ig-body{max-width:620px;margin:0 auto;padding:14px 16px 120px;display:grid;grid-template-columns:minmax(0,1fr);gap:14px;}
/* F (judge 4): an auto grid column took its widest card's min-content — 10px wider than a 390px phone */""")
s = one(s, """#insgSheet .ig-card{background:#ffffff;border:1px solid #d9dbe1;border-radius:14px;padding:14px;display:grid;gap:12px;}""",
"""#insgSheet .ig-card{background:#ffffff;border:1px solid #d9dbe1;border-radius:14px;padding:14px;display:grid;grid-template-columns:minmax(0,1fr);gap:12px;min-width:0;}""")

# ---------------------------------------------------------------- F4: Who sheet ink, tabs, search
s = one(s, """#qiStartView .chipbtn:hover{
  box-shadow:0 11px 24px rgba(0,0,0,.55), inset 0 0 0 1px rgba(255,255,255,.16);
  transform:translateY(-2px);
}""", """#qiStartView .chipbtn:hover{
  box-shadow:0 11px 24px rgba(0,0,0,.55), inset 0 0 0 1px rgba(255,255,255,.16);
  transform:translateY(-2px);
}
/* F (judge 4): the "Who is this inspection for?" sheet is a WHITE card, and its three buttons kept the dark
   theme's light chip ink — rgb(230,233,238) on #fff, 1.2:1, so "New prospect" (the only way to start for
   someone not in the system) read as an empty box. They take the start step's black chip; the open tab is
   the module's red, the same as the active shot chip. Both themes: the card is white in both. */
#qiWhoModal .chipbtn{--cr-stack:"F the Who sheet is a white card in both themes; the app's chip ink was 1.2:1 on it";
  background:#14110c;color:#ffffff;-webkit-text-fill-color:#ffffff;border:0;min-height:44px;}
#qiWhoModal .chipbtn[aria-pressed="true"]{--cr-stack:"F the open tab of the Who sheet";background:#c8202e;}""")

s = one(s, """  /* prefill the client search with the pinned address's street portion so
     the list is scoped to nearby matches -- user can edit or clear to widen */
  var streetPart = qiAddr ? qiAddr.split(',')[0] : '';
  document.getElementById('qiCliSearch').value = streetPart;
  qiRenderCliList(streetPart);
});""", """  /* prefill the client search with the pinned address's street portion so
     the list is scoped to nearby matches -- user can edit or clear to widen */
  var streetPart = qiAddr ? qiAddr.split(',')[0] : '';
  /* F (judge 4): typed "5 Pine St Dayton OH" has no comma, so the WHOLE line went into the search and found
     nobody. The house number and the first word of the street find the client; the rest only narrows. */
  var _qiHn = /^\\s*(\\d+[A-Za-z]?\\s+[^\\s,]+)/.exec(streetPart);
  if(_qiHn) streetPart = _qiHn[1];
  document.getElementById('qiCliSearch').value = streetPart;
  qiRenderCliList(streetPart);
  qiWhoTab('exist');
});""")

s = one(s, """document.getElementById('qiTabExist').addEventListener('click', function(){
  document.getElementById('qiExistPane').style.display = 'block';
  document.getElementById('qiNewPane').style.display = 'none';
});
document.getElementById('qiTabNew').addEventListener('click', function(){
  document.getElementById('qiExistPane').style.display = 'none';
  document.getElementById('qiNewPane').style.display = 'block';
});
function qiRenderCliList(q){
  var qq = (q || '').toLowerCase();
  var list = cacheProjects.filter(function(p){
    return !qq || (p.name || '').toLowerCase().indexOf(qq) >= 0 || (p.address || '').toLowerCase().indexOf(qq) >= 0;
  }).slice(0, 30);
  document.getElementById('qiCliList').innerHTML = list.map(function(p){
    return '<button class="estopt" data-qicli="' + p.id + '" style="display:block;width:100%;text-align:left;">' +
      esc(p.name || 'Unnamed') + (p.address ? ' <small style="color:#9a8c85;">\\u00b7 ' + esc(p.address) + '</small>' : '') + '</button>';
  }).join('') || '<div class="subnote">No matches.</div>';
}""", """/* F (judge 4): the two tabs had no selected state at all; aria-pressed carries it and the CSS reads it */
function qiWhoTab(which){
  var ex = which !== 'new';
  document.getElementById('qiExistPane').style.display = ex ? 'block' : 'none';
  document.getElementById('qiNewPane').style.display = ex ? 'none' : 'block';
  document.getElementById('qiTabExist').setAttribute('aria-pressed', String(ex));
  document.getElementById('qiTabNew').setAttribute('aria-pressed', String(!ex));
}
document.getElementById('qiTabExist').addEventListener('click', function(){ qiWhoTab('exist'); });
document.getElementById('qiTabNew').addEventListener('click', function(){ qiWhoTab('new'); });
function qiRenderCliList(q){
  /* F (judge 4): one substring of the whole query found nobody for "5 Pine St Dayton OH". Now every word must
     START a word of the name, address, city, state or zip — "5 pine st dayton" finds 5 Pine St, and "5" does
     not find 15 Pine St. Finding nobody shows everyone, with a line saying so, instead of a dead end. */
  var words = String(q || '').toLowerCase().split(/[\\s,]+/).map(function(w){ return w.replace(/[^a-z0-9]+/g, ''); }).filter(Boolean);
  function qiCliHit(p){
    var hay = ' ' + [p.name, p.address, p.city, p.state, p.zip].filter(Boolean).join(' ').toLowerCase().replace(/[^a-z0-9]+/g, ' ') + ' ';
    return words.every(function(w){ return hay.indexOf(' ' + w) !== -1; });
  }
  var list = cacheProjects.filter(function(p){ return !words.length || qiCliHit(p); });
  var none = !list.length && words.length > 0;
  if(none) list = cacheProjects.slice();
  list = list.slice(0, 30);
  document.getElementById('qiCliList').innerHTML =
    (none ? '<div class="subnote" data-qi-nomatch="1" style="color:#5c5c5c;margin:0 0 8px;">No client matches \\u201c' + esc(q) + '\\u201d \\u2014 here is everyone. Or use New prospect.</div>' : '') +
    (list.map(function(p){
    return '<button class="estopt" data-qicli="' + p.id + '" style="display:block;width:100%;text-align:left;">' +
      esc(p.name || 'Unnamed') + (p.address ? ' <small style="color:#9a8c85;">\\u00b7 ' + esc(p.address) + '</small>' : '') + '</button>';
  }).join('') || '<div class="subnote" style="color:#5c5c5c;">No clients yet \\u2014 use New prospect.</div>');
}""")

# ---------------------------------------------------------------- F6: QI photo caption
s = one(s, """      qiBubble('ph', '<img src="' + du + '" alt=""><div class="qicap"><span>' + esc(qi.label || 'Photo') +
        ' <em id="qiup' + pidx + '" style="font-style:normal;color:#b3924a;">\\u23F3</em></span>' +
        '<span><button class="chipbtn" data-qiai="' + pidx + '" style="padding:3px 10px;font-size:11px;">&#128269; Analyze</button> ' +
        at.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'}) + '</span></div>');""",
"""      /* F (judge 4): two rows — the label and its upload mark, then Analyze (13px, was 11) and the time,
         which no longer wraps "3:04 / AM" onto two lines */
      qiBubble('ph', '<img src="' + du + '" alt=""><div class="qicap"><span>' + esc(qi.label || 'Photo') +
        ' <em id="qiup' + pidx + '" style="font-style:normal;color:#b3924a;">\\u23F3</em></span>' +
        '<span><button class="chipbtn" data-qiai="' + pidx + '" style="padding:3px 12px;font-size:13px;">&#128269; Analyze</button> ' +
        '<time>' + at.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'}) + '</time></span></div>');""")

s = one(s, """.qibub .qicap{display:flex;justify-content:space-between;gap:10px;padding:6px 4px 2px;
  font:700 11px 'Segoe UI',-apple-system,BlinkMacSystemFont,Roboto,Arial,sans-serif;color:#6d5e56;}""",
""".qibub .qicap{display:flex;flex-direction:column;gap:6px;padding:6px 4px 2px;
  font:700 13px 'Segoe UI',-apple-system,BlinkMacSystemFont,Roboto,Arial,sans-serif;color:#6d5e56;}
/* F (judge 4): one row per thing — label + upload mark, then Analyze + time — instead of a wrapped jumble */
.qibub .qicap > span{display:flex;align-items:center;justify-content:space-between;gap:8px;}
.qibub .qicap time{white-space:nowrap;font-weight:600;}""")

# ---------------------------------------------------------------- F5: QI Finish
s = one(s, """    auditLog('doc', 'Quick Inspection \\u2014 ' + total + ' photo(s) attached', pid);
    localStorage.removeItem('qi_session');
    qi = { projectId:null, projectName:'', photos:[], label:null, stamp:false, startedAt:null, ai:false };
    await reload();
    openProject(pid);
    setTimeout(function(){
      crTell('Photos are in this client\\u2019s Photo Gallery.\\n\\nSame rules as a regular inspection: complete the Roofing Inspection Checklist, then transfer the gallery photos into a new inspection report.');
    }, 600);""", """    auditLog('doc', 'Quick Inspection \\u2014 ' + total + ' photo(s) attached', pid);
    /* F (judge 4): Finish used to end on a RED toast that sent the rep to a "Photo Gallery" reading 0 (the
       photos are in the Photo Album; the gallery on Inspections is the curated Inspection Photos set), and
       nothing the walk captured became part of an inspection. Now the walk's photos join Inspection Photos,
       and a plain question says where they went and offers the report with them checked. */
    var _qiStarted = qi.startedAt, _qiIds = [];
    try{ _qiIds = await qiMarkInspPhotos(pid, total, _qiStarted); }catch(_mk){}
    localStorage.removeItem('qi_session');
    qi = { projectId:null, projectName:'', photos:[], label:null, stamp:false, startedAt:null, ai:false };
    await reload();
    openProject(pid);
    setTimeout(function(){ qiOfferReport(pid, total, _qiIds, noteLines); }, 600);""")

s = one(s, """/* ---------- 682: the metallic emoji wrapper is GONE ----------------------""",
"""/* F (judge 4): the Quick Inspection's photos, found by who took them and when — photoDb.add returns no id.
   The newest `n` this user added to the job since the walk began (2 minutes' grace for a phone clock) join
   the job's Inspection Photos set (INSP_MAX), through patchProjectCk like the gallery's own "To Inspection".
   Returns the ids, oldest first. A failure leaves the set as it was. */
async function qiMarkInspPhotos(pid, n, since){
  var me = (currentUser && currentUser.email) || '';
  var t0 = since ? (Date.parse(since) - 120000) : 0;
  var rows = (await photoDb.listByProject(pid)) || [];
  var ids = rows.filter(function(p){
    return (!me || !p.created_by || p.created_by === me) && (!t0 || !(Date.parse(p.created_at || '') < t0));
  }).sort(function(a, b){ return String(b.created_at || '').localeCompare(String(a.created_at || '')); })
    .slice(0, Math.max(0, n)).map(function(p){ return String(p.id); }).reverse();
  if(!ids.length) return [];
  var pr = cacheProjects.find(function(x){ return x.id === pid; });
  if(!pr) return ids;
  var cur = getInspPhotoIds(pr);
  var add = ids.filter(function(x){ return cur.indexOf(x) === -1; }).slice(0, Math.max(0, INSP_MAX - cur.length));
  if(add.length) await patchProjectCk(pr, { insp_photos: cur.concat(add) });
  return ids;
}
/* F (judge 4): the end of a Quick Inspection, said plainly — where the photos went, and the report one tap away */
async function qiOfferReport(pid, n, ids, notes){
  var where = 'in this client\\u2019s Photo Album' + (ids && ids.length ? ' and in Inspection Photos' : '');
  var go = await crAsk('Inspection saved \\u2014 ' + n + ' photo' + (n === 1 ? ' is ' : 's are ') + where + '.\\n\\n' +
    'Start the inspection report now? The guide opens with these photos checked' + (notes ? ' and your notes in its chat' : '') +
    '. Nothing is written until you tap Write report or Start without AI.',
    { verb: 'Start the report', cancel: 'Not now', tone: 'plain' });
  if(!go) return;
  if(!currentProject || currentProject.id !== pid) openProject(pid);
  try{ showTab('inspections'); }catch(_t){}
  try{ refreshInspGalN(); }catch(_g){}
  if(window.CardinalInspGuide && window.CardinalInspGuide.open) window.CardinalInspGuide.open({ pick: ids || [], note: notes || '' });
}

/* ---------- 682: the metallic emoji wrapper is GONE ----------------------""")

# ---------------------------------------------------------------- F10: crAsk wording
s = one(s, """    if(!await crAsk('No Roofing Inspection Checklist on file \\u2014 its baseline specs normally feed the report.\\n\\n' +
                'OK = create the report anyway (blank specs, fill by hand)\\nCancel = go complete the checklist first')){""",
"""    /* F (judge 4): the words said "OK = … / Cancel = …" over buttons that read Continue / Cancel */
    if(!await crAsk('No Roofing Inspection Checklist on file \\u2014 its baseline specs normally feed the report.\\n\\n' +
                'Create the report anyway and fill the specs by hand, or do the checklist first.',
                { verb: 'Create it anyway', cancel: 'Do the checklist first', tone: 'plain' })){""")

# ---------------------------------------------------------------- F11: Inspections list
s = one(s, """  var insp = docs.filter(function(r){ return !isEstimateDoc(r) && !isContractTitle(r.title) && !isWorkOrderTitle(r.title) && !isFileDoc(r.title); });
  document.getElementById('inspDocsMount').innerHTML = insp.length ? docTable(insp)
    : '<div class="empty"><b>No inspection reports yet.</b><br>Create one above, or transfer gallery photos into a new report.</div>';""",
"""  /* F (judge 4): 1397 took invoices out of the GLOBAL Inspections list only — this one still filed every
     invoice (and change order) as an inspection report, with Open / Mark unsent / Delete beside it. They keep
     a heading of their own here, so none becomes unreachable (the overview's Invoice card opens only the
     newest invoice). The overview's own count (inspN) has excluded both since it was written. */
  var bill = docs.filter(function(r){ return !isEstimateDoc(r) && /^\\s*(invoice|change order)\\b/i.test(r.title || ''); });
  var insp = docs.filter(function(r){ return !isEstimateDoc(r) && !isContractTitle(r.title) && !isWorkOrderTitle(r.title) && !isFileDoc(r.title) && bill.indexOf(r) === -1; });
  document.getElementById('inspDocsMount').innerHTML = (insp.length ? docTable(insp)
    : '<div class="empty"><b>No inspection reports yet.</b><br>Create one above, or transfer gallery photos into a new report.</div>') +
    (bill.length ? '<h3 class="projsec" data-insp-bill="1" style="margin:18px 0 6px;">Invoices &amp; change orders</h3>' + docTable(bill) : '');""")

# ---------------------------------------------------------------- F7: N to fill
s = one(s, """    if(el.closest('[data-sig]')) return;                 /* signing is its own step */""",
"""    if(el.closest('[data-sig]')) return;                 /* signing is its own step */
    /* F (judge 4): a Contents page number and the caption of an EMPTY photo box are optional — neither prints
       when left blank (compactForPrint) — and together they made a blank report read "51 to fill" */
    if(el.closest('.toc-row')) return;
    var _fig = el.closest('.fig');
    if(_fig && !_fig.querySelector('.frame img')) return;""")

# ---------------------------------------------------------------- F7: banner + how-to fold (editor load)
s = one(s, """          '@media screen{.howto{display:block !important;}}' +""",
"""          '@media screen{.howto{display:block !important;}}' +
          /* F (judge 4): folded, the how-to panel is its heading line; tap the heading to open it */
          '@media screen{.howto.crfold{box-sizing:content-box;max-height:1.6em;overflow:hidden;padding:10px 14px !important;margin-bottom:16px !important;}' +
          '.howto h4{cursor:pointer;}.howto.crfold h4{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}' +
          '.howto.crfold h4::before{content:"\\\\25B8  ";}}' +
          /* F (docs judge): MODERATE was white on amber, 2.17:1 */
          '@media screen{.chip.mod{color:#1b1b1b;}}' +
          '@media screen and (max-width:640px){.toc-row .t{white-space:normal;}}' +   /* F: Contents rows ran past a phone */""")

s = one(s, """      hint.textContent = 'Editing mode — click any text to type over it. Yellow highlights are fill-in fields. Use the toolbar above to Save or Print/PDF.';
      doc.body.insertBefore(hint, doc.body.firstChild);""",
"""      /* F (judge 4): on a phone this sticky banner was three lines (64px) over every screen of the document */
      hint.textContent = (window.innerWidth <= 760)
        ? 'Editing mode \\u2014 tap any text to type. Yellow = fill in.'
        : 'Editing mode — click any text to type over it. Yellow highlights are fill-in fields. Use the toolbar above to Save or Print/PDF.';
      doc.body.insertBefore(hint, doc.body.firstChild);
      /* F (judge 4): the report opened on 510px of instructions. The how-to panel shows open the first time this
         device opens a document that has one, and folded to its heading after that; its heading toggles it. */
      try{
        var _ho = doc.querySelector('.howto');
        if(_ho){
          var _seen = false;
          try{ _seen = localStorage.getItem('cr-howto-seen') === '1'; localStorage.setItem('cr-howto-seen', '1'); }catch(_ls){}
          _ho.classList.toggle('crfold', _seen);
          var _h4 = /** @type {any} */ (_ho.querySelector('h4'));
          if(_h4 && !_h4.__crFold){
            _h4.__crFold = 1; _h4.setAttribute('role', 'button'); _h4.setAttribute('tabindex', '0');
            _h4.addEventListener('click', function(){ _ho.classList.toggle('crfold'); });
          }
        }
      }catch(_hf){}""")

# ---------------------------------------------------------------- F7: the folding phone toolbar
s = one(s, """document.getElementById('fillChipBtn').addEventListener('click', jumpNextBlank);""",
"""document.getElementById('fillChipBtn').addEventListener('click', jumpNextBlank);
/* F (judge 4): on a 390x844 phone the editor toolbar is 363px — 43% of the screen — and it stayed while you
   worked, leaving the document a 481px window. Scrolling DOWN the document folds it to one row (title, Save,
   More); scrolling back up 48px, or reaching the top, opens it again. The three sends stay primary (1204) in
   the open toolbar. Phones only (760px, the toolbar's own breakpoint); wider screens never fold. A short
   quiet spell after each change stops the frame's own resize from flipping it straight back. */
(function(){
  var ev = document.getElementById('editorView'), fr = /** @type {any} */ (document.getElementById('reportFrame'));
  if(!ev || !fr) return;
  var mq = window.matchMedia ? window.matchMedia('(max-width:760px)') : null;
  var lastY = 0, acc = 0, quiet = 0;
  function edFold(on){
    if(ev.classList.contains('edcompact') === on) return;
    ev.classList.toggle('edcompact', on);
    quiet = Date.now() + 400;
  }
  function onScroll(){
    var w = fr.contentWindow; if(!w) return;
    var y = w.scrollY || 0, d = y - lastY; lastY = y;
    if(!mq || !mq.matches){ edFold(false); return; }
    if(Date.now() < quiet) return;
    if(y < 40){ acc = 0; edFold(false); return; }
    acc = ((d > 0) === (acc > 0)) ? acc + d : d;
    if(acc > 48) edFold(true); else if(acc < -48) edFold(false);
  }
  fr.addEventListener('load', function(){
    lastY = 0; acc = 0; ev.classList.remove('edcompact');
    try{ fr.contentWindow.addEventListener('scroll', onScroll, { passive: true }); }catch(_){}
  });
})();""")

s = one(s, """  .editor-body{flex-direction:column;}
  #assistantPanel{width:100%;height:46%;border-left:0;border-top:4px solid var(--red);}
}""", """  .editor-body{flex-direction:column;}
  /* F (judge 4): a fixed 46% made the panel 221px tall around 227px of controls — the input and its button
     were cut off under the screen edge and the messages got 24px. It now sizes to its content up to 55%,
     the messages scroll, and tapping its header folds it to that one line. */
  #assistantPanel{width:100%;height:auto;max-height:55%;border-left:0;border-top:4px solid var(--red);}
  #assistantPanel .assist-msgs{--cr-stack:"F phone layout of the assistant; the desktop side panel keeps the base";flex:1 1 auto;min-height:64px;}
  #assistantPanel > :not(.assist-msgs){flex:none;}
  #assistantPanel .assist-inputrow{--cr-stack:"F phone layout of the assistant; the desktop side panel keeps the base";padding:8px 12px 10px;}
  #assistantPanel .assist-inputrow textarea{min-width:0;}
  #assistantPanel .assist-inputrow button{min-width:76px;min-height:44px;}
  #assistantPanel .assist-head{--cr-stack:"F phone layout of the assistant; the desktop side panel keeps the base";cursor:pointer;min-height:44px;box-sizing:border-box;justify-content:flex-start;padding:0 4px 0 14px;}
  #assistantPanel .assist-head button{margin-left:auto;min-width:44px;min-height:44px;}
  #assistantPanel .assist-head::before{content:"\\25BE";margin-right:8px;}
  #assistantPanel.min .assist-head::before{content:"\\25B8";}
  #assistantPanel.min > :not(.assist-head){display:none;}
}
@media (max-width:760px){
  /* F (judge 4): the folded phone toolbar — one row: the title, Save, More. On while the document is
     scrolled down (the edcompact class) and while the assistant is open, so the panel does not have to
     share the screen with 363px of buttons. Scrolling up, or closing the assistant, opens it again. The
     !important beats the inline display JS writes on each button (1069's reason for its wrapper). */
  #editorView.edcompact .toolbar,
  #editorView:has(#assistantPanel.open) .toolbar{--cr-stack:"F the folded phone toolbar is a state of the editor, not a restyle";
    flex-wrap:nowrap;padding:6px 10px;gap:6px;}
  #editorView.edcompact .toolbar > :not(.grow):not(.edbtns),
  #editorView:has(#assistantPanel.open) .toolbar > :not(.grow):not(.edbtns){--cr-stack:"F phone fold state";display:none !important;}
  #editorView.edcompact .toolbar .grow,
  #editorView:has(#assistantPanel.open) .toolbar .grow{--cr-stack:"F phone fold state";order:0;flex:1 1 0;min-width:0;}
  #editorView.edcompact .toolbar .edbtns,
  #editorView:has(#assistantPanel.open) .toolbar .edbtns{--cr-stack:"F phone fold state";order:1;flex:0 0 auto;width:auto;display:flex;margin:0;gap:6px;}
  #editorView.edcompact .toolbar .edbtns > .btn:not(#saveBtn):not(#edMoreBtn),
  #editorView:has(#assistantPanel.open) .toolbar .edbtns > .btn:not(#saveBtn):not(#edMoreBtn){--cr-stack:"F phone fold state";display:none !important;}
  #editorView.edcompact .toolbar .edbtns .btn,
  #editorView:has(#assistantPanel.open) .toolbar .edbtns .btn{--cr-stack:"F phone fold state";width:auto;}
  #editorView.edcompact .toolbar #reportTitle,
  #editorView:has(#assistantPanel.open) .toolbar #reportTitle{--cr-stack:"F phone fold state";font-size:15px;padding:8px 10px;}
}""")

# the assistant header folds the panel (phones; the CSS above is what shows it)
s = one(s, """function openAssistEdit(){
  assistantPanel.classList.add('open');""", """/* F (judge 4): tapping the panel's header (not its close button) folds it to that line and back */
(function(){
  var h = document.querySelector('#assistantPanel .assist-head');
  if(h) h.addEventListener('click', function(e){
    var t = /** @type {any} */ (e.target);
    if(t && t.closest && t.closest('button')) return;
    assistantPanel.classList.toggle('min');
  });
})();
function openAssistEdit(){
  assistantPanel.classList.remove('min');
  assistantPanel.classList.add('open');""")

# ---------------------------------------------------------------- F12: printed report
s = one(s, """    '.cover{min-height:226mm !important;}' +   /* 1405: 246mm overflowed Letter under these margins */""",
"""    /* F (docs judge): min-height alone could not hold the cover to one sheet — with the logo, its photo and all
       seven detail rows it is ~266mm against a 237mm page, so Client Contact, Inspector and Report No. printed on
       page 2 above Contents (and on the iPhone path Contents began at the foot of the cover). The cover now ends
       its own page and is sized to fit with room for a wrapped address: logo 190px, photo 85mm (was 110), the
       gaps and the detail rows a little tighter. The rules name report-only classes; contracts and estimates
       have no .cover. */
    '.cover{min-height:0 !important;break-after:page;}' +
    '.cover-logo{width:190px !important;margin:0 0 5mm !important;}.cover-band{margin-bottom:6mm !important;}' +
    '.cover-photo{height:85mm !important;}.cover-title{margin:6mm 0 1mm !important;}.cover-sub{margin-bottom:5mm !important;}' +
    '.cover-meta{padding-top:4mm !important;}.cover-meta td{padding:2px 0 !important;}' +
    /* F: signature lines printed on one page and their labels on the next; the findings header sat alone at the
       foot of a page. Scoped to inspection reports (the summary heading's siblings) — .sign is shared. */
    '[data-cardinal-summary-heading] ~ .sign,[data-cardinal-summary-heading] ~ .sign .col{break-inside:avoid;}' +
    '[data-cardinal-summary-heading] ~ table.concerns tr:first-child{break-after:avoid;}' +
    '.chip.mod{color:#1b1b1b !important;}' +   /* F: MODERATE, white on amber, was 2.17:1 */""")

s = one(s, """  d.querySelectorAll('tr').forEach(function(tr){
    tr.removeAttribute('data-emptyblock');
    if(!tr.querySelector('[data-emptyph]')) return;
    var cells = Array.prototype.filter.call(tr.querySelectorAll('td'), function(td){
      return !td.classList.contains('k') && !td.classList.contains('n') && !td.classList.contains('pr');
    });
    if(!cells.length) return;
    var allBlank = true;
    for(var i = 0; i < cells.length; i++){ if(!blank(cells[i])){ allBlank = false; break; } }
    if(allBlank) tr.setAttribute('data-emptyblock','1');
  });""", """  d.querySelectorAll('tr').forEach(function(tr){
    tr.removeAttribute('data-emptyblock');
    if(!tr.querySelector('[data-emptyph]')) return;
    var cells = Array.prototype.filter.call(tr.querySelectorAll('td'), function(td){
      return !td.classList.contains('k') && !td.classList.contains('n') && !td.classList.contains('pr');
    });
    if(!cells.length) return;
    var allBlank = true;
    for(var i = 0; i < cells.length; i++){ if(!blank(cells[i])){ allBlank = false; break; } }
    if(allBlank) tr.setAttribute('data-emptyblock','1');
  });
  /* F (docs judge): a sub-heading whose only content was left blank printed alone — "Overall Condition
     Assessment" in red over nothing, whenever the summary was still its [prompt]. A heading is hidden when
     everything after it, up to the next heading, is hidden. */
  d.querySelectorAll('h3').forEach(function(h){
    h.removeAttribute('data-emptyblock');
    var any = false;
    for(var el = h.nextElementSibling; el && !/^H[23]$/.test(el.tagName); el = el.nextElementSibling){
      if(el.tagName === 'BUTTON' || (el.classList && el.classList.contains('page-break'))) continue;
      if(el.getAttribute('data-emptyblock') || el.getAttribute('data-emptyrow') ||
         el.getAttribute('data-emptyfig') || el.getAttribute('data-emptyph')) continue;
      any = true; break;
    }
    if(!any) h.setAttribute('data-emptyblock','1');
  });""")

# both report templates: MODERATE ink + the print rules, so a NEW report carries them in its own CSS too
# (the share page prints the stored document; printFix above covers every report printed from the app)
A = """.chip.mod{background:var(--amber);}"""
assert s.count(A) == 2, s.count(A)
ri = s.index('var REPORT_TEMPLATE = `'); xi = s.index('var EXTERIOR_TEMPLATE = `')
p1 = s.find(A); p2 = s.find(A, p1 + 1)
assert ri < p1 < xi < p2, (ri, p1, xi, p2)
s = s.replace(A, """.chip.mod{background:var(--amber);color:#1b1b1b;}   /* F: white on amber was 2.17:1 */""", 2)

B = """small.hint{color:#b06a00;font-size:8.5pt;}\n</style>"""
assert s.count(B) == 2, s.count(B)
p1 = s.find(B); p2 = s.find(B, p1 + 1)
assert ri < p1 < xi < p2 < s.find('`;', xi), (ri, p1, xi, p2)
s = s.replace(B, """small.hint{color:#b06a00;font-size:8.5pt;}
/* F: on paper the cover ends its own page and fits on it (logo, photo and all seven detail rows measured
   ~266mm against a 237mm page); signature lines keep their labels; the findings header keeps its first row.
   LAST in this sheet on purpose, so it outranks the base .cover / .cover-photo rules above it. */
@media print{
  .cover{min-height:0;break-after:page;}
  .cover-logo{width:190px;margin:0 0 5mm;}
  .cover-band{margin-bottom:6mm;}
  .cover-photo{height:85mm;}
  .cover-title{margin:6mm 0 1mm;}
  .cover-sub{margin-bottom:5mm;}
  .cover-meta{padding-top:4mm;}
  .cover-meta td{padding:2px 0;}
  .sign,.sign .col{break-inside:avoid;}
  table.concerns tr:first-child{break-after:avoid;}
}
/* F: on a phone the Contents rows (nowrap) were the one thing wider than the screen — 472px at 390 —
   which widens the whole layout and shrinks the page again. Last in the sheet so it beats .toc-row .t. */
@media screen and (max-width:640px){ .toc-row .t{white-space:normal;} }
</style>""", 2)

s = one(s, """  /* unfilled yellow placeholders never print */
  d.querySelectorAll('.ph').forEach(function(el){""", """  /* F: a mark left by an EARLIER print on something since filled (typed, or drafted ph -> fill) hid it from
     every later print in the session — this pass only visits .ph, so it never cleared the stale mark */
  d.querySelectorAll('[data-emptyph]').forEach(function(el){ if(!el.classList.contains('ph')) el.removeAttribute('data-emptyph'); });
  /* unfilled yellow placeholders never print */
  d.querySelectorAll('.ph').forEach(function(el){""")

# the index.html half of "the shared report is a shrunken 980px page on a phone" (judge 4 #0, judge 11 #2):
# a NEW report carries its own viewport, so the template's phone rules (@media max-width:640px) apply wherever
# the stored document is opened — the share link, a downloaded copy. Reports already saved need api/share.js
# (Builder D) to add the same. text-size-adjust stops a phone's autosizer inflating paragraphs and not tables.
for title in ['Roof Inspection Report', 'Exterior Inspection Report']:
    s = one(s, '<meta charset="utf-8">\n<title>Cardinal Roofing &amp; Renovations — ' + title + '</title>',
            '<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1">\n' +
            '<title>Cardinal Roofing &amp; Renovations — ' + title + '</title>')
C = """*{box-sizing:border-box;}\nhtml,body{margin:0;padding:0;}"""
ri = s.index('var REPORT_TEMPLATE = `'); re_ = s.index('`;', ri)
xi = s.index('var EXTERIOR_TEMPLATE = `'); xe = s.index('`;', xi)
for lo, hi in [(xi, xe), (ri, re_)]:          # the later slice first, so the earlier offsets stay true
    blk = s[lo:hi]
    assert blk.count(C) == 1, blk.count(C)
    s = s[:lo] + blk.replace(C, C + """\nhtml{-webkit-text-size-adjust:100%;text-size-adjust:100%;}   /* F: no phone autosizing */""", 1) + s[hi:]

pl.write_atomic(P, s)
print('ok F', len(s))
