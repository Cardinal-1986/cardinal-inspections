
/* 1270: the emailed copy is an .html ATTACHMENT. Opened from Mail on an iPhone
   it shows in a preview that never loads anything from the internet, so every
   picture was a "?" box: the logo (a site-relative /cardinal-report-logo.png
   that has no site to resolve against) and every photo (signed storage URLs).
   Pictures now travel INSIDE the file: each is fetched, scaled to 1400px JPEG
   (the logo stays PNG for its transparency) and written as a data: URI, inside
   a budget that keeps the request under Vercel's body limit. Past the budget,
   or if one will not load, it keeps an absolute URL — the email's own "view it
   online" link still shows it. */
var INLINE_BUDGET = 3200000;   /* characters of data: URI, total */
/** @param {any} blob */
function inlBlobToData(blob){
  return new Promise(function(res, rej){ var r = new FileReader(); r.onload = function(){ res(String(r.result)); }; r.onerror = rej; r.readAsDataURL(blob); });
}
/** @param {any} blob */
async function inlShrink(blob){
  if(/png/i.test(blob.type) && blob.size < 400000) return inlBlobToData(blob);
  var bmp = await createImageBitmap(blob);
  var k = Math.min(1, 1400 / Math.max(bmp.width, bmp.height));
  var c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(bmp.width * k)); c.height = Math.max(1, Math.round(bmp.height * k));
  var g = /** @type {any} */ (c.getContext('2d'));
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, c.width, c.height);
  g.drawImage(bmp, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', 0.82);
}
/** @param {any} html */
async function inlineDocImages(html){
  var d = new DOMParser().parseFromString(String(html || ''), 'text/html');
  var used = 0, cache = {};
  var imgs = Array.prototype.slice.call(d.querySelectorAll('img[src]'));
  for(var i = 0; i < imgs.length; i++){
    var im = imgs[i], src = im.getAttribute('src') || '';
    if(!src || /^data:/i.test(src)) continue;
    var abs = src;
    try{ abs = new URL(src, location.origin).href; }catch(_){}
    im.setAttribute('src', abs);
    if(used > INLINE_BUDGET) continue;
    try{
      if(!cache[abs]){
        var r = await fetch(abs, { credentials: 'omit' });
        if(!r.ok) throw new Error('HTTP ' + r.status);
        cache[abs] = await inlShrink(await r.blob());
        used += cache[abs].length;
      }
      if(used <= INLINE_BUDGET) im.setAttribute('src', cache[abs]);
    }catch(_){ /* keeps the absolute URL */ }
  }
  return '<!DOCTYPE html>\n' + d.documentElement.outerHTML;
}
