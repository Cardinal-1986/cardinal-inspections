/* 1273: Email to client opens a sheet instead of a bare address prompt — Theo,
   9 Oct: "allow us to edit the email subject and body". To, Subject and the
   message come prefilled with exactly what the email has always said; whatever
   the rep leaves is what /api/senddoc sends. The rep's name, the company
   address and the view-online link are still added below the message by the
   server, so a client always sees who it is from. Resolves null on Cancel. */
function crEmailSheet(o){
  return new Promise(function(resolve){
    var sh = document.getElementById('crEmailSheet');
    if(!sh){
      sh = document.createElement('div');
      sh.id = 'crEmailSheet';
      sh.setAttribute('role', 'dialog');
      sh.setAttribute('aria-label', 'Email to client');
      document.body.appendChild(sh);
    }
    sh.innerHTML = '<div class="q"><b>Email to client</b>' +
      '<p>Change anything before it goes. Your name, the company address and the view-online link go below your message.</p>' +
      '<label><span id="emShTo"></span><input id="emShAddr" type="email" inputmode="email" autocomplete="email" autocapitalize="off" spellcheck="false"></label>' +
      '<label>Subject<input id="emShSubj" type="text" autocomplete="off" maxlength="200"></label>' +
      '<label>Message<textarea id="emShMsg" rows="9" maxlength="5000"></textarea></label>' +
      '<div class="st" id="emShSt" role="status"></div>' +
      '<div class="row"><button type="button" class="pri" id="emShGo">Send</button><button type="button" class="no" id="emShNo">Cancel</button></div></div>';
    var emQ = function(id){ return /** @type {any} */ (document.getElementById(id)); };
    emQ('emShTo').textContent = o.toLabel || 'Send to';
    emQ('emShAddr').value = o.to || '';
    emQ('emShSubj').value = o.subject || '';
    emQ('emShMsg').value = o.message || '';
    function emDone(v){ sh.classList.remove('open'); try{ document.removeEventListener('keydown', emKey); }catch(_){} resolve(v); }
    function emKey(e){ if(e.key === 'Escape') emDone(null); }
    document.addEventListener('keydown', emKey);
    emQ('emShNo').addEventListener('click', function(){ emDone(null); });
    emQ('emShGo').addEventListener('click', function(){
      var to = String(emQ('emShAddr').value || '').trim();
      var subj = String(emQ('emShSubj').value || '').replace(/[\r\n]+/g, ' ').trim();
      var msg = String(emQ('emShMsg').value || '').trim();
      if(!to || to.indexOf('@') === -1){ emQ('emShSt').textContent = 'Enter a valid email address.'; return; }
      if(!subj){ emQ('emShSt').textContent = 'Add a subject.'; return; }
      if(!msg){ emQ('emShSt').textContent = 'Add a message.'; return; }
      emDone({ to: to, subject: subj, message: msg });
    });
    sh.classList.add('open');
    try{ emQ(o.to ? 'emShSubj' : 'emShAddr').focus(); }catch(_){}
  });
}
