/* 1268: print a document that lives in an iframe — Jacob, 8 Oct: "If I click
   print/pdf it doesn't do anything". Every Print button here called
   frame.contentWindow.print(). On an iPhone or iPad that call can return without
   doing anything — no dialog, no error — so the button looked dead. There the
   page itself is printed instead: a copy of the document goes into a hidden
   host on the main page, inside a shadow root so the document's CSS and the
   app's CSS cannot touch each other, every other part of the page is hidden for
   print, and window.print() runs. Computers keep the iframe print they already
   had — it works there and its page breaks are what the print gates measure.
   window.__crPrintHost = true forces the host path (the gate uses it). */
function isAppleTouch(){
  var ua = navigator.userAgent || '';
  return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && (navigator.maxTouchPoints || 0) > 1);
}
var PAGE_RULE = /@page[^{]*\{(?:[^{}]|\{[^{}]*\})*\}/g;
/** @param {any} d @param {any} win */
function printDoc(d, win){
  if(!d || !d.documentElement || !d.body) return false;
  if(!window.__crPrintHost && !isAppleTouch() && win){
    try{ win.focus(); win.print(); return true; }catch(_){}
  }
  var old = document.getElementById('crPrintHost'); if(old) old.remove();
  var oldSt = document.getElementById('crPrintHostStyle'); if(oldSt) oldSt.remove();
  var css = Array.prototype.map.call(d.querySelectorAll('style'), function(s){ return s.textContent || ''; }).join('\n');
  var pages = (css.match(PAGE_RULE) || []).join('\n');
  /* the document's html/body rules become rules on two wrapper divs, because a
     shadow root has no html or body of its own */
  css = css.replace(PAGE_RULE, '')
           .replace(/(^|[\s,{}>+~(])(html|body)(?=[\s,.:#\[{>+~)]|$)/g, '$1.crp-$2')
           .replace(/:root\b/g, '.crp-html');
  var links = Array.prototype.map.call(d.querySelectorAll('link[rel="stylesheet"]'), function(l){ return l.outerHTML; }).join('');
  var host = document.createElement('div');
  host.id = 'crPrintHost';
  var root = host.attachShadow({ mode: 'open' });
  var bodyCls = String(d.body.className || '').replace(/"/g, '');
  var bodySty = String(d.body.getAttribute('style') || '').replace(/"/g, '&quot;');
  root.innerHTML = links + '<style>' + css + '</style>' +
    '<div class="crp-html"><div class="crp-body ' + bodyCls + '" style="' + bodySty + '">' + d.body.innerHTML + '</div></div>';
  var st = document.createElement('style');
  st.id = 'crPrintHostStyle';
  st.textContent = '@media screen{#crPrintHost{display:none !important;}}' +
    '@media print{html,body{background:#fff !important;margin:0 !important;padding:0 !important;height:auto !important;' +
    'min-height:0 !important;overflow:visible !important;position:static !important;}' +
    'body > *:not(#crPrintHost){display:none !important;}' +
    /* two ids: the app's own print rules (body > :not(#cr-ce-view), …) carry an
       id inside :not() and would otherwise outrank a single #crPrintHost */
    'body > #crPrintHost#crPrintHost{display:block !important;}}' + pages;
  document.head.appendChild(st);
  document.body.appendChild(host);
  var done = false;
  function clean(){ if(done) return; done = true; host.remove(); st.remove(); window.removeEventListener('afterprint', clean); }
  window.addEventListener('afterprint', clean);
  /* iOS may return from print() before the sheet closes; the host is invisible
     on screen, so a late clean-up costs nothing */
  setTimeout(clean, 10 * 60 * 1000);
  try{ window.print(); }catch(e){ clean(); crTell('Print failed: ' + (e.message || e)); return false; }
  return true;
}
/** @param {any} frame */
function printFrame(frame){
  var d = frame && (frame.contentDocument || (frame.contentWindow && frame.contentWindow.document));
  return printDoc(d, frame && frame.contentWindow);
}
window.CardinalPrint = Object.assign(window.CardinalPrint || {}, { doc: printDoc, frame: printFrame, appleTouch: isAppleTouch });
