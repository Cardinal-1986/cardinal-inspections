  /* ---- 1266: step 2 — pick photos, talk to the assistant, write the report ---- */
  var P = { list: [], picked: {}, chat: [], busy: false, loaded: false };
  var PIC_MAX = 16;
  function igPhotoSrc(p){ return p._thumb || p._src || p.data || ''; }
  function igPickedList(){ return P.list.filter(function(p){ return P.picked[p.id]; }); }
  function igStep3(){
    sheet.innerHTML = igTop('Photos and assistant', false) + '<div class="ig-body">' +
      '<p class="ig-who">Check the photos for the report, up to ' + PIC_MAX + '. Then tell the assistant anything the photos don’t show.</p>' +
      '<div class="ig-card"><div class="ig-lab" id="insgPicN"></div><div class="ig-grid" id="insgGrid"><p class="ig-who">Loading photos…</p></div></div>' +
      '<div class="ig-card"><div class="ig-lab">Assistant · Claude</div><div class="ig-chat" id="insgChat" aria-live="polite"></div>' +
        '<div class="ig-say"><textarea id="insgSay" rows="2" aria-label="Message to the assistant" placeholder="e.g. homeowner says it leaks in the front bedroom when it rains hard"></textarea>' +
        '<button type="button" class="ig-go ig-send" data-ig="send">Send</button></div></div>' +
      '<p class="ig-err" id="insgErr"></p></div>' +
      '<div class="ig-foot"><button type="button" class="ig-alt" data-ig="plain">Start without AI</button><button type="button" class="ig-go" data-ig="write">Write report</button></div>';
    if(!P.chat.length) P.chat.push({ role: 'ai', text: 'I have your checklist. Check the photos you want in the report, and tell me anything they don’t show — a reported leak, how long, what the homeowner wants. Tap Write report when you’re ready.' });
    igChatPaint();
    sheet.scrollTop = 0;
    igLoadPhotos();
  }
  async function igLoadPhotos(){
    var pr = igProj(); if(!pr) return;
    if(!P.loaded){
      try{ P.list = (await photoDb.listByProject(pr.id)) || []; }catch(e){ P.list = []; var er = igEl('insgErr'); if(er) er.textContent = 'Could not load the photos: ' + ((e && e.message) || e); }
      P.loaded = true;
      var ids = []; try{ ids = getInspPhotoIds(pr) || []; }catch(_){}
      ids.slice(0, PIC_MAX).forEach(function(id){ if(P.list.some(function(p){ return String(p.id) === String(id); })) P.picked[id] = true; });
    }
    igGridPaint();
  }
  function igGridPaint(){
    var g = igEl('insgGrid'); if(!g) return;
    var n = igPickedList().length;
    var lab = igEl('insgPicN'); if(lab) lab.textContent = P.list.length ? ('Photos · ' + n + ' of ' + PIC_MAX + ' checked') : 'Photos';
    if(!P.list.length){ g.innerHTML = '<p class="ig-who">No photos on this job yet. Add them in the Photo Album, or write the report from the checklist and the chat.</p>'; return; }
    g.innerHTML = P.list.map(function(p){
      var on = !!P.picked[p.id];
      return '<button type="button" class="ig-ph' + (on ? ' on' : '') + '" data-ph="' + igEsc(p.id) + '" aria-pressed="' + on + '" aria-label="Photo' + (p.caption ? ': ' + igEsc(p.caption) : '') + '">' +
        '<img src="' + igEsc(igPhotoSrc(p)) + '" alt="" loading="lazy"><i></i></button>'; }).join('');
  }
  function igChatPaint(){
    var c = igEl('insgChat'); if(!c) return;
    c.innerHTML = P.chat.map(function(m){ return '<div class="ig-m ' + (m.role === 'ai' ? 'ai' : 'me') + '">' + igEsc(m.text) + '</div>'; }).join('') +
      (P.busy ? '<div class="ig-m ai ig-wait">Thinking…</div>' : '');
    c.scrollTop = c.scrollHeight;
  }
  function igFacts(){
    var a = S.all || {}, f = {};
    if(S.types.Roof) ROOF.forEach(function(r){ var v = a[r[0]]; if(v != null && v !== '' && r[0] !== 'life_by') f[r[1]] = String(v); });
    var g = a.general || {};
    ['roof','siding','soffit','fascia','gutters','windows','doors'].forEach(function(k){ if(g[k] && (S.general || S.types[k.charAt(0).toUpperCase() + k.slice(1)])) f['Condition: ' + k] = String(g[k]); });
    var ins = a.insp || {};
    Object.keys(EXTRA).forEach(function(t){ if(!S.types[t]) return; (EXTRA[t] || []).forEach(function(x){ var k = x[0].split('.')[1]; if(ins[k]) f[x[1]] = String(ins[k]); }); });
    if(a.notes) f['Field notes'] = String(a.notes);
    return f;
  }
  function igSections(){
    var roof = !!S.types.Roof || (!S.general && !TYPES.some(function(t){ return S.types[t]; }));
    var tpl = roof ? REPORT_TEMPLATE : EXTERIOR_TEMPLATE;
    var d = new DOMParser().parseFromString(tpl, 'text/html'), out = [];
    Array.prototype.forEach.call(d.querySelectorAll('h2.sec'), function(h){
      var n = h.querySelector('.num'); var num = n ? n.textContent.trim() : '';
      if(!/^[3-8]$/.test(num)) return;
      var name = h.textContent.replace(num, '').trim();
      out.push({ num: Number(num), name: name });
    });
    return { roof: roof, list: out };
  }
  function igPayload(mode){
    return { mode: mode, trades: TYPES.filter(function(t){ return S.types[t]; }), general: !!S.general,
      facts: igFacts(), life_by: (S.types.Roof && S.all.life_by === 'ai') ? 'ai' : 'rule',
      photos: igPickedList().filter(function(p){ return !!p._src; }).map(function(p){ return { id: String(p.id), url: p._src }; }),
      history: P.chat.slice(1), sections: igSections().list };
  }
  async function igAsk(mode){
    var r = await fetch('/api/inspect-assist', { method: 'POST', headers: await window.aiHeaders(), body: JSON.stringify(igPayload(mode)) });
    var j = null; try{ j = await r.json(); }catch(_){}
    if(!r.ok || !j) throw new Error((j && (j.error + (j.detail ? ' — ' + j.detail : ''))) || ('The assistant is unavailable (' + r.status + ')'));
    return j;
  }
  async function igSend(){
    var box = igEl('insgSay'); var t = box ? String(box.value || '').trim() : '';
    if(!t || P.busy) return;
    box.value = '';
    P.chat.push({ role: 'me', text: t }); P.busy = true; igChatPaint();
    try{ var j = await igAsk('chat'); P.chat.push({ role: 'ai', text: j.reply || '…' }); }
    catch(e){ P.chat.push({ role: 'ai', text: 'I couldn’t answer that: ' + ((e && e.message) || e) + '. Your notes are kept; try again, or tap Write report.' }); }
    P.busy = false; igChatPaint();
  }
  async function igWrite(){
    if(P.busy) return;
    var err = igEl('insgErr'), go = sheet.querySelector('[data-ig="write"]');
    P.busy = true; if(go){ go.disabled = true; go.textContent = 'Writing… up to a minute'; }
    if(err) err.textContent = '';
    var j;
    try{ j = await igAsk('write'); }
    catch(e){
      P.busy = false; if(go){ go.disabled = false; go.textContent = 'Write report'; }
      if(err) err.textContent = 'The report was not written: ' + ((e && e.message) || e) + '. Nothing was saved; try again, or tap Start without AI.';
      return;
    }
    P.busy = false;
    var pr = igProj();
    if(pr && S.types.Roof && S.all.life_by === 'ai' && j.life_estimate){
      S.all.life_left = 'AI estimate: ' + j.life_estimate;
      try{ var json = JSON.stringify(S.all); await pdb.update(pr.id, { checklist: json }); pr.checklist = json;
        try{ var cp = cacheProjects.find(function(x){ return x.id === pr.id; }); if(cp) cp.checklist = json; }catch(_){} }catch(_){}
    }
    var secs = igSections();
    igClose();
    var title = (pr && pr.name || 'Inspection') + (pr && pr.address ? ' — ' + pr.address : '');
    createReportFrom(secs.roof ? REPORT_TEMPLATE : EXTERIOR_TEMPLATE, secs.roof ? 'Report' : 'Exterior report', secs.roof,
      { title: title, fill: function(id){ return igFill(id, j, secs.list); } });
  }
  /** @param {any} id @param {any} j @param {any} secs */
  async function igFill(id, j, secs){
    var full = await db.get(id); if(!full) return;
    var doc = new DOMParser().parseFromString(full.html, 'text/html');
    var nums = secs.map(function(s){ return s.num; }), dflt = nums.indexOf(5) !== -1 ? 5 : (nums[0] || 5);
    var picked = igPickedList(), byId = {};
    picked.forEach(function(p){ byId[String(p.id)] = p; });
    var urls = await signedPhotoMap(picked.map(photoPathOf).filter(Boolean), PHOTO_DOC_URL_TTL);
    function srcOf(p){ var k = photoPathOf(p); return (k && urls[k]) || p.data; }
    var done = {};
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
    function fillAfter(head, text, attr){
      if(!head || !text) return null;
      var el = head.nextElementSibling;
      while(el && !(el.tagName === 'H2' && el.classList.contains('sec'))){
        if(el.tagName === 'P' && el.classList.contains('ph') && /^\[/.test((el.textContent || '').trim())){
          el.textContent = text; el.classList.remove('ph'); el.classList.add('fill'); el.setAttribute(attr, '1'); return el;
        }
        el = el.nextElementSibling;
      }
      return null;
    }
    (j.sections || []).forEach(function(s){ if(nums.indexOf(s.num) !== -1) fillAfter(findSectionHeading(doc, s.num), s.narrative, 'data-ai-narrative'); });
    fillAfter(doc.querySelector('[data-cardinal-summary-heading]'), j.summary, 'data-ai-summary');
    var recH = null;
    Array.prototype.forEach.call(doc.querySelectorAll('h2.sec'), function(h){ if(!recH && /Recommendation/i.test(h.textContent)) recH = h; });
    if(recH && (j.recommendations || []).length){
      var rp = fillAfter(recH, j.recommendations.map(function(r, i){ return (i + 1) + '. ' + r; }).join('\n'), 'data-ai-narrative');
      if(rp) rp.style.whiteSpace = 'pre-line';
    }
    await db.update(id, { html: '<!DOCTYPE html>\n' + doc.documentElement.outerHTML });
    var pr = igProj();
    if(pr && picked.length){ try{ await pdb.update(pr.id, { photos_transferred: true }); }catch(_){} }
  }
