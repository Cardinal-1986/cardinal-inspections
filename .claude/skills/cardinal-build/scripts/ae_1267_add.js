
/* 1267: "Change the report" — the assistant panel's second mode (Theo: "an
   option to edit with the chatbox or manually"). The rep says what to change in
   plain words; /api/inspect-assist (mode 'edit') returns new text for the parts
   it changed, which are written in place, saved, and can be undone. The parts
   are a VIEW of the live document built per request (summary, each section's
   write-up, recommendations, photo captions) — nothing is stamped into the
   document, because serializeFrame()'s output is what reaches the client.
   "Add a note" is the 1068-era intake, untouched. Editing by hand is the editor
   itself: every line is already tappable. */
var assistMode = 'note';
/* typed handles on the panel's controls and the report frame (gate_types) */
var aeText = /** @type {any} */ (assistText), aeSend = /** @type {any} */ (assistSend), aeFrame = /** @type {any} */ (frame);
function setAssistMode(m){
  assistMode = m === 'edit' ? 'edit' : 'note';
  var a = document.getElementById('assistModeEdit'), b = document.getElementById('assistModeNote');
  if(a) a.setAttribute('aria-pressed', String(assistMode === 'edit'));
  if(b) b.setAttribute('aria-pressed', String(assistMode === 'note'));
  aeText.placeholder = assistMode === 'edit'
    ? 'e.g. make the summary shorter, or say the porch was outside this inspection'
    : 'e.g. Cracked boot seal on the SE slope, two nail pops on the west face';
  assistSend.textContent = assistMode === 'edit' ? 'Change' : 'Add';
}
/** @param {any} doc */
function aeBlocks(doc){
  var out = [];
  function aeTake(el, kind, where){
    if(!el) return;
    var t = (el.textContent || '').trim();
    out.push({ el: el, kind: kind, where: where, text: t.charAt(0) === '[' ? '' : t });
  }
  var sh = doc.querySelector('[data-cardinal-summary-heading]');
  for(var e = sh && sh.nextElementSibling; e && !/^H[23]$/.test(e.tagName); e = e.nextElementSibling){
    if(e.tagName === 'P' && (e.classList.contains('fill') || e.classList.contains('ph'))){ aeTake(e, 'summary', 'Overall Condition Assessment'); break; }
  }
  Array.prototype.forEach.call(doc.querySelectorAll('h2.sec'), function(h){
    var n = h.querySelector('.num'), num = n ? n.textContent.trim() : '';
    if(!/^\d+$/.test(num) || +num < 3 || +num > 9) return;
    var where = num + ' ' + h.textContent.replace(num, '').trim(), got = false;
    for(var x = h.nextElementSibling; x && !(x.tagName === 'H2' && x.classList.contains('sec')); x = x.nextElementSibling){
      if(!got && x.tagName === 'P' && (x.classList.contains('fill') || x.classList.contains('ph'))){ aeTake(x, num === '9' ? 'recommendations' : 'write-up', where); got = true; }
      Array.prototype.forEach.call(x.querySelectorAll('.cap .fill, .cap .ph'), function(c){ aeTake(c, 'photo caption', where); });
    }
  });
  return out.slice(0, 60);
}
/** @param {any} note */
async function sendAssistEdit(note){
  var doc = aeFrame.contentDocument;
  if(!doc){ assistMsg('bot err', 'Open a report first.'); return; }
  aeText.value = '';
  assistMsg('user', escHtml(note));
  var working = assistMsg('bot', 'Changing the report…');
  aeSend.disabled = true;
  var blocks = aeBlocks(doc);
  try{
    var res = await fetch('/api/inspect-assist', {
      method: 'POST', headers: await window.aiHeaders(),
      body: JSON.stringify({ mode: 'edit', instruction: note,
        blocks: blocks.map(function(b, i){ return { id: 'b' + i, kind: b.kind, where: b.where, text: b.text }; }) })
    });
    var data = null;
    try{ data = await res.json(); }catch(pe){}
    if(!res.ok || !data) throw new Error((data && (data.detail || data.error)) || ('HTTP ' + res.status));
    var undo = [];
    (data.edits || []).forEach(function(ed){
      var m = /^b(\d+)$/.exec(String(ed && ed.id || '')), b = m ? blocks[+m[1]] : null;
      if(!b || typeof ed.text !== 'string' || !ed.text.trim()) return;
      undo.push({ el: b.el, html: b.el.innerHTML, cls: b.el.className });
      b.el.textContent = ed.text.trim();
      b.el.classList.remove('ph'); b.el.classList.add('fill');
    });
    working.innerHTML = escHtml(data.reply || (undo.length ? 'Done.' : 'Nothing to change.')) +
      (undo.length ? '<br><small>Changed ' + undo.length + ' part' + (undo.length === 1 ? '' : 's') + ' and saved.</small> <button type="button" class="ae-undo">Undo</button>' : '');
    if(undo.length){
      await saveCurrent();
      var ub = /** @type {any} */ (working.querySelector('.ae-undo'));
      if(ub) ub.addEventListener('click', async function(){
        ub.disabled = true;
        undo.forEach(function(u){ if(u.el.isConnected){ u.el.innerHTML = u.html; u.el.className = u.cls; } });
        await saveCurrent();
        ub.textContent = 'Undone';
      });
    }
  }catch(e){
    working.className = 'amsg bot err';
    working.textContent = 'Could not change the report: ' + String((e && e.message) || e).slice(0, 250);
  }
  aeSend.disabled = false;
}
/* the guided report (cr-insg-script) opens the editor on a fresh AI draft */
function openAssistEdit(){
  assistantPanel.classList.add('open');
  setAssistMode('edit');
  assistMsg('bot', 'Your draft is written. Tell me what to change — “shorter summary”, “the porch was outside this inspection” — or close this and edit by hand: tap any line in the report.');
}
(function(){
  var a = document.getElementById('assistModeEdit'), b = document.getElementById('assistModeNote');
  if(a) a.addEventListener('click', function(){ setAssistMode('edit'); });
  if(b) b.addEventListener('click', function(){ setAssistMode('note'); });
})();
