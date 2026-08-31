/* showroom-images.js — the ONE Showroom-owned image utility.
 *
 * WHY IT EXISTS. In Cardinal, OC Colors reached into Showcase for this:
 *     var S = window.CardinalShowcase;
 *     if(!S || typeof S.shrink !== 'function') ...
 * One presentation module depending on another's internals is exactly the seam
 * that made "move Showcase first" impossible — Colors' uploads would have
 * refused the moment Showcase left the page. Theo's decision was to move both
 * together and give them ONE Showroom-owned utility rather than duplicate the
 * helper as temporary production debt.
 *
 * So the implementation lives HERE, lifted verbatim from cr-show-script, and
 * both modules call it. Neither depends on the other any more.
 *
 * ⚠ THE RENDITIONS ARE PART OF THE CONTRACT, not decoration. Three sizes are
 * declared together on purpose (build 633): FULL is the lightbox and the pinch,
 * DISP is the compare card, THUMB is the Colors grid tile. Splitting them, or
 * writing a second shrinker beside this one, is what reintroduced build 624 —
 * a 1400px card being handed an 8 MB original.
 */
(function () {
  'use strict';

  function shrink(file, max, quality){
    return new Promise(function(resolve, reject){
      var img = new Image(), url = URL.createObjectURL(file);
      img.onload = function(){
        URL.revokeObjectURL(url);
        var w = img.naturalWidth, h = img.naturalHeight;
        var scale = Math.min(1, (max || 3840) / Math.max(w, h));
        var c = document.createElement('canvas');
        c.width = Math.round(w * scale); c.height = Math.round(h * scale);
        var cx = c.getContext('2d');
        /* Downscaling in one step aliases badly on detail like shingle granules
           and nail heads — the very thing these photographs are shown to prove. */
        cx.imageSmoothingEnabled = true;
        cx.imageSmoothingQuality = 'high';
        cx.drawImage(img, 0, 0, c.width, c.height);
        c.toBlob(function(b){ b ? resolve(b) : reject(new Error('encode failed')); },
                 'image/jpeg', quality || 0.9);
      };
      img.onerror = function(){ URL.revokeObjectURL(url); reject(new Error('could not read that image')); };
      img.src = url;
    });
  }

  window.CardinalShowroomImages = Object.assign(window.CardinalShowroomImages || {}, {
    shrink: shrink,
    renditions: { full: { max: 3840, q: 0.92 },
                  disp: { max: 1400, q: 0.82 },
                  thumb: { max: 640,  q: 0.80 } }
  });
})();
