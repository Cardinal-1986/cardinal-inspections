"""Build 1327 — the assistant (Theo's picks: 1A a floating Ask button on every screen, 2C it can
change anything you could change by hand, 3B Owner Review stays Theo's; and one for Joan that
reads and writes too). The server half is api/assistant.js.

Browser half, one module (cr-ai-styles / cr-ai-script, window.CardinalAssistant):
  - a floating "Ask" button, bottom right above the bottom bar, drawn only for Theo's two logins
    and Joan's (the server refuses everyone else anyway)
  - a chat sheet: question in, answer out; jobs it names are tappable and open the job
  - when it proposes changes, an APPROVE card listing each one (deletes in red). Nothing happens
    until Approve. Then the browser applies each change with the person's OWN session — the same
    permissions and refusals as doing it by hand — moves stages through setStage() so the stage
    date is written, logs each change to Activity as "via the assistant", and reloads.
No body observer, no scroll lock, not a view (an overlay, like the change-order sheet).
Usage: python3 patch_1327.py [index.html]
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import patch_lib as pl
FILE = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../../../index.html')
s = pl.load(FILE)
def one(old, new):
    global s
    assert s.count(old) == 1, (old[:90], s.count(old))
    s = s.replace(old, new)

BLOCK = r"""<style id="cr-ai-styles">
/* 1327: the assistant. Own tokens with literal fallbacks; dark here, light twin below. */
#cr-ai-root{
  --ai-sheet:#141619; --ai-ink:#f2f4f7; --ai-dim:#a8b0ba; --ai-line:#2a2e35; --ai-well:#1b1f24;
  --ai-red:#C8202E; --ai-due:#f08a90; --ai-pos:#34d399; --ai-warn:#e0a94f;
  font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;
}
:root[data-theme="rb-light"] #cr-ai-root{
  --ai-sheet:#FFFFFF; --ai-ink:#0F172A; --ai-dim:#475569; --ai-line:#E2E8F0; --ai-well:#F8FAFC;
  --ai-due:#B91C1C; --ai-pos:#047857; --ai-warn:#8a6420;
}
#cr-ai-fab{position:fixed; right:16px; bottom:calc(84px + env(safe-area-inset-bottom)); z-index:9400; display:none;
  height:48px; padding:0 18px; border-radius:99px; border:0; background:var(--ai-red,#C8202E); color:#fff;
  font:inherit; font-size:15px; font-weight:800; letter-spacing:.02em; cursor:pointer; box-shadow:0 6px 20px rgba(0,0,0,.35);}
#cr-ai-fab.on{display:inline-flex; align-items:center; gap:8px;}
#cr-ai-sheet{position:fixed; inset:0; z-index:12500; display:none;}
#cr-ai-sheet.open{display:block;}
#cr-ai-sheet .ai-scrim{position:absolute; inset:0; background:rgba(0,0,0,.55);}
#cr-ai-sheet .ai-box{position:absolute; left:0; right:0; bottom:0; top:8vh; max-width:640px; margin:0 auto;
  display:flex; flex-direction:column; background:var(--ai-sheet,#141619); color:var(--ai-ink,#f2f4f7);
  border-radius:18px 18px 0 0; border:1px solid var(--ai-line,#2a2e35);}
#cr-ai-sheet .ai-hd{display:flex; align-items:center; justify-content:space-between; gap:8px; padding:10px 12px 8px 16px; border-bottom:1px solid var(--ai-line,#2a2e35);}
#cr-ai-sheet .ai-t{font-size:18px; font-weight:800;}
#cr-ai-sheet .ai-sub{font-size:12px; color:var(--ai-dim,#a8b0ba);}
#cr-ai-sheet .ai-log{flex:1; overflow:auto; padding:12px 14px; display:flex; flex-direction:column; gap:10px;}
#cr-ai-sheet .ai-me{align-self:flex-end; max-width:86%; background:var(--ai-red,#C8202E); color:#fff; border-radius:14px 14px 4px 14px; padding:9px 12px; font-size:15px; white-space:pre-wrap;}
#cr-ai-sheet .ai-it{align-self:flex-start; max-width:94%; background:var(--ai-well,#1b1f24); border:1px solid var(--ai-line,#2a2e35); border-radius:14px 14px 14px 4px; padding:10px 12px; font-size:15px; line-height:1.45;}
#cr-ai-sheet .ai-it.err{border-color:var(--ai-due,#f08a90);}
#cr-ai-sheet .ai-empty{color:var(--ai-dim,#a8b0ba); font-size:14px;}
#cr-ai-sheet .ai-job{display:inline; min-height:0; padding:0; border:0; background:none; color:inherit; font:inherit; font-weight:700;
  text-decoration:underline; text-underline-offset:2px; cursor:pointer;}
#cr-ai-sheet .ai-card{border:2px solid var(--ai-warn,#e0a94f); border-radius:12px; padding:10px 12px; background:var(--ai-sheet,#141619);}
#cr-ai-sheet .ai-card .t{font-weight:800; margin-bottom:6px;}
#cr-ai-sheet .ai-card ul{margin:0 0 6px; padding-left:18px;} #cr-ai-sheet .ai-card li{margin:3px 0;}
#cr-ai-sheet .ai-card li.del{color:var(--ai-due,#f08a90); font-weight:700;}
#cr-ai-sheet .ai-row{display:flex; gap:8px; margin-top:8px;}
#cr-ai-sheet .ai-btn{flex:1; min-height:44px; min-width:44px; border-radius:10px; border:1px solid var(--ai-line,#2a2e35); background:transparent;
  color:var(--ai-ink,#f2f4f7); font:inherit; font-size:15px; font-weight:700; cursor:pointer;}
#cr-ai-sheet .ai-btn.primary{background:var(--ai-red,#C8202E); border-color:var(--ai-red,#C8202E); color:#fff;}
#cr-ai-sheet .ai-btn[disabled]{opacity:.5; cursor:default;}
#cr-ai-sheet .ai-x{flex:none; width:44px;}
#cr-ai-sheet .ai-in{display:flex; gap:8px; padding:10px 12px calc(10px + env(safe-area-inset-bottom)); border-top:1px solid var(--ai-line,#2a2e35);}
#cr-ai-sheet .ai-in textarea{flex:1; min-height:44px; max-height:140px; resize:none; font:inherit; font-size:16px;
  color:var(--ai-ink,#f2f4f7); background:var(--ai-well,#1b1f24); border:1px solid var(--ai-line,#2a2e35); border-radius:10px; padding:10px 12px;}
#cr-ai-sheet .ai-in .ai-btn{flex:none; width:72px;}
</style>
<div id="cr-ai-root" role="region" aria-label="Assistant">
  <button id="cr-ai-fab" type="button" aria-label="Ask the assistant">&#10022; Ask</button>
  <div id="cr-ai-sheet" aria-hidden="true">
    <div class="ai-scrim" data-ai-close="1"></div>
    <div class="ai-box" role="dialog" aria-modal="true" aria-labelledby="aiTitle">
      <div class="ai-hd"><div><div class="ai-t" id="aiTitle">Assistant</div><div class="ai-sub">Knows the whole app. Changes nothing until you approve.</div></div>
        <button class="ai-btn ai-x" type="button" data-ai-close="1" aria-label="Close">&#215;</button></div>
      <div class="ai-log" id="aiLog" aria-live="polite"></div>
      <div class="ai-in"><textarea id="aiText" rows="1" placeholder="Ask about any job, money, crew… or tell it what to change" aria-label="Ask the assistant"></textarea>
        <button class="ai-btn primary" type="button" id="aiSend">Ask</button></div>
    </div>
  </div>
</div>
<script id="cr-ai-script">
/* 1327: the assistant, browser half. The server (api/assistant.js) reads with the person's own
   permissions and can only PROPOSE changes; this module shows the proposal and, on Approve,
   applies it with the person's own session. */
(function(){
  'use strict';
  var AI_PEOPLE = { 'theo@cardinalrenovations.net':1, 'theodorion1986@gmail.com':1, 'joan@cardinalrenovations.net':1 };
  var AI_PK = { owner_review_rules:'rule', team_profiles:'email' };
  var aiHist = [], aiBusy = false, aiPending = null, aiShown = null;
  function aiQ(id){ return document.getElementById(id); }
  function aiMe(){ try{ return String((window.my_email && window.my_email()) || '').trim().toLowerCase(); }catch(e){ return ''; } }
  function aiAllowed(){ return !!AI_PEOPLE[aiMe()]; }
  function aiEsc(s){ return String(s == null ? '' : s).replace(/[<>&"']/g, function(c){ return { '<':'&lt;', '>':'&gt;', '&':'&amp;', '"':'&quot;', "'":'&#39;' }[c]; }); }
  /* escape FIRST, then promote a small marker set — the librarian's rule (lbRich) */
  function aiFmt(t){
    var h = aiEsc(t);
    h = h.replace(/\[([^\]\n]{1,80})\]\(job:([0-9a-fA-F-]{8,40})\)/g, function(_, name, id){ return '<button type="button" class="ai-job" data-ai-job="' + id + '">' + name + '</button>'; });
    h = h.replace(/\*\*([^*\n]{1,120})\*\*/g, '<b>$1</b>');
    return h.replace(/\n/g, '<br>');
  }
  /* the button follows who is signed in; written only when it changes (the 567/569 lesson) */
  function aiPaintFab(){
    var f = aiQ('cr-ai-fab'); if(!f) return;
    var on = aiAllowed();
    if(on !== aiShown){ aiShown = on; f.classList.toggle('on', on); if(!on) aiClose(); }
  }
  function aiRender(){
    var log = aiQ('aiLog'); if(!log) return;
    var h = aiHist.length ? '' : '<div class="ai-empty">Try: “Who owes me money?” · “What is on the schedule this week?” · “Move the Lawson job to Completed.”</div>';
    aiHist.forEach(function(m){
      h += m.role === 'user' ? '<div class="ai-me">' + aiEsc(m.text) + '</div>' : '<div class="ai-it' + (m.err ? ' err' : '') + '">' + aiFmt(m.text) + '</div>';
    });
    if(aiPending){
      h += '<div class="ai-card" id="aiCard"><div class="t">Approve ' + aiPending.changes.length + (aiPending.changes.length === 1 ? ' change?' : ' changes?') + '</div>'
        + (aiPending.summary ? '<div class="ai-sub" style="margin-bottom:6px">' + aiEsc(aiPending.summary) + '</div>' : '')
        + '<ul>' + aiPending.changes.map(function(c){ return '<li class="' + (c.action === 'delete' ? 'del' : '') + '">' + (c.action === 'delete' ? 'Delete: ' : '') + aiEsc(c.label) + '</li>'; }).join('') + '</ul>'
        + '<div class="ai-row"><button class="ai-btn" type="button" data-ai-cancel="1">Cancel</button><button class="ai-btn primary" type="button" data-ai-approve="1"' + (aiBusy ? ' disabled' : '') + '>Approve</button></div></div>';
    }
    if(aiBusy) h += '<div class="ai-it">' + (aiPending ? 'Applying…' : 'Looking it up…') + '</div>';
    log.innerHTML = h;
    log.scrollTop = log.scrollHeight;
    var b = aiQ('aiSend'); if(b instanceof HTMLButtonElement) b.disabled = aiBusy;
  }
  function aiOpen(){
    if(!aiAllowed()) return;
    var sh = aiQ('cr-ai-sheet'); if(!sh) return;
    sh.classList.add('open'); sh.setAttribute('aria-hidden', 'false');
    aiRender();
    var t = aiQ('aiText'); if(t) try{ t.focus(); }catch(_){}
  }
  function aiClose(){ var sh = aiQ('cr-ai-sheet'); if(sh){ sh.classList.remove('open'); sh.setAttribute('aria-hidden', 'true'); } }
  async function aiSend(){
    var ta = aiQ('aiText'), q = ta instanceof HTMLTextAreaElement ? ta.value.trim() : '';
    if(!q || aiBusy || !aiAllowed()) return;
    if(aiPending){ aiHist.push({ role:'ai', text:'(Left unapproved: ' + aiPending.summary + ')' }); aiPending = null; }
    var history = aiHist.filter(function(m){ return !m.err; }).slice(-20).map(function(m){ return { role:m.role, text:m.text }; });
    aiHist.push({ role:'user', text:q });
    if(ta instanceof HTMLTextAreaElement) ta.value = '';
    aiBusy = true; aiRender();
    try{
      var hd = (typeof window.aiHeaders === 'function') ? await window.aiHeaders() : { 'Content-Type':'application/json' };
      var r = await fetch('/api/assistant', { method:'POST', headers:hd, body:JSON.stringify({ history:history, question:q }) });
      var j = null; try{ j = await r.json(); }catch(_){}
      if(!r.ok || !j) throw new Error((j && (j.error + (j.detail ? ': ' + j.detail : ''))) || ('HTTP ' + r.status));
      if(j.reply) aiHist.push({ role:'ai', text:String(j.reply) });
      if(j.proposals && Array.isArray(j.proposals.changes) && j.proposals.changes.length) aiPending = j.proposals;
    }catch(e){
      aiHist.push({ role:'ai', text:'Could not get an answer: ' + ((e && e.message) || e), err:true });
    }
    aiBusy = false; aiRender();
  }
  async function aiApply(c){
    var cx = window.supa || window.sb;
    if(!cx || !cx.from) throw new Error('not signed in');
    var pk = AI_PK[c.table] || 'id', vals = c.values ? Object.assign({}, c.values) : null;
    /* a stage move goes through the app's own setStage, which writes the stage date */
    if(c.table === 'projects' && c.action === 'update' && vals && vals.stage != null && typeof window.setStage === 'function'){
      await window.setStage(c.id, String(vals.stage));
      delete vals.stage;
      if(!Object.keys(vals).length) return;
    }
    var q = c.action === 'insert' ? cx.from(c.table).insert(vals)
          : c.action === 'update' ? cx.from(c.table).update(vals).eq(pk, c.id)
          : cx.from(c.table).delete().eq(pk, c.id);
    var res = await q.select();
    if(res && res.error) throw new Error(res.error.message || 'refused');
    /* .select() turns a refused write into an empty answer rather than a silent success */
    if(!res || !Array.isArray(res.data) || !res.data.length) throw new Error('nothing was changed (not allowed, or the row is gone)');
  }
  async function aiApprove(){
    if(!aiPending || aiBusy) return;
    var p = aiPending; aiBusy = true; aiRender();
    var ok = [], bad = [];
    for(var i = 0; i < p.changes.length; i++){
      var c = p.changes[i];
      try{
        await aiApply(c); ok.push(c.label);
        var pid = c.table === 'projects' ? c.id : (c.values && c.values.project_id) || null;
        try{ if(typeof window.auditLog === 'function') window.auditLog('assistant', 'Via the assistant: ' + c.label, pid); }catch(_a){}
      }catch(e){ bad.push(c.label + ' — ' + ((e && e.message) || e)); }
    }
    aiPending = null; aiBusy = false;
    aiHist.push({ role:'ai', text:(ok.length ? 'Done: ' + ok.join('; ') + '.' : '') + (bad.length ? (ok.length ? '\n' : '') + 'Not done: ' + bad.join('; ') + '.' : ''), err:!ok.length });
    aiRender();
    try{ if(typeof window.reload === 'function') await window.reload(); }catch(_r){}
  }
  var root = aiQ('cr-ai-root');
  if(root) root.addEventListener('click', function(e){
    var el = e.target instanceof Element ? e.target : null; if(!el) return;
    var t;
    if(el.closest('#cr-ai-fab')){ aiOpen(); return; }
    if(el.closest('[data-ai-close]')){ aiClose(); return; }
    if(el.closest('#aiSend')){ aiSend(); return; }
    if(el.closest('[data-ai-approve]')){ aiApprove(); return; }
    if(el.closest('[data-ai-cancel]')){ aiPending = null; aiHist.push({ role:'ai', text:'Cancelled — nothing was changed.' }); aiRender(); return; }
    if((t = el.closest('[data-ai-job]'))){ var id = t.getAttribute('data-ai-job'); aiClose(); if(typeof window.openProject === 'function') window.openProject(id); return; }
  });
  var ta0 = aiQ('aiText');
  if(ta0) ta0.addEventListener('keydown', function(e){ if(e.key === 'Enter' && !e.shiftKey){ e.preventDefault(); aiSend(); } });
  /* who is signed in changes rarely; a cheap timer, not an observer */
  aiPaintFab(); setInterval(aiPaintFab, 3000);
  window.CardinalAssistant = Object.assign(window.CardinalAssistant || {}, { open:aiOpen, close:aiClose, paint:aiPaintFab });
})();
</script>

"""
one("""<style id="cr-orv-styles">""", BLOCK + """<style id="cr-orv-styles">""")

one(""">v2026-10-12 build 1326<button""", """>v2026-10-12 build 1327<button""")
CL = "{ b: 1326, d:'2026-10-12',"
assert s.count(CL) == 1
s = s.replace(CL, "{ b: 1327, d:'2026-10-12', t:'An assistant for the office', s:'Theo and Joan get an Ask button in the corner of every screen. Ask it anything about jobs, money, crews or the schedule, or tell it what to change. It shows each change first and does nothing until you tap Approve.' },\n  " + CL, 1)
pl.write_atomic(FILE, s)
print('1327 applied')
