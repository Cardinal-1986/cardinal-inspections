<style id="cr-insg-styles">
/* 1265: the guided inspection sheet. Light on purpose (Theo, 8 Oct: "start off in
   light mode") — the same white form sheet the checklists already use. */
#insgSheet{position:fixed;inset:0;z-index:9995;display:none;overflow:auto;-webkit-overflow-scrolling:touch;
  background:#f4f4f6;color:#161616;font:400 15px 'Segoe UI',Arial,sans-serif;}
#insgSheet.open{display:block;}
#insgSheet .ig-top{position:sticky;top:0;z-index:1;display:flex;align-items:center;gap:10px;
  padding:calc(10px + env(safe-area-inset-top,0px)) 16px 10px;background:#ffffff;border-bottom:1px solid #d9dbe1;}
#insgSheet .ig-top b{flex:1;font:700 18px 'Segoe UI',Arial,sans-serif;color:#161616;}
#insgSheet .ig-x{min-width:44px;min-height:44px;border:0;background:transparent;color:#5c6070;font:400 26px Arial,sans-serif;cursor:pointer;}
#insgSheet .ig-body{max-width:620px;margin:0 auto;padding:14px 16px 120px;display:grid;gap:14px;}
#insgSheet .ig-who{margin:0;font:400 14px 'Segoe UI',Arial,sans-serif;color:#5c6070;}
#insgSheet .ig-card{background:#ffffff;border:1px solid #d9dbe1;border-radius:14px;padding:14px;display:grid;gap:12px;}
#insgSheet .ig-card h3{margin:0;font:700 17px 'Segoe UI',Arial,sans-serif;color:#161616;}
#insgSheet .ig-lab{font:700 12px 'Segoe UI',Arial,sans-serif;letter-spacing:.06em;text-transform:uppercase;color:#5c6070;}
#insgSheet .ig-types{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
#insgSheet .ig-tbox{display:flex;align-items:center;gap:10px;min-height:52px;padding:0 12px;border:1px solid #d9dbe1;
  border-radius:12px;background:#ffffff;font:600 16px 'Segoe UI',Arial,sans-serif;color:#161616;cursor:pointer;}
#insgSheet .ig-tbox.wide{grid-column:1 / -1;min-height:60px;}
#insgSheet .ig-tbox small{display:block;font:400 13px 'Segoe UI',Arial,sans-serif;color:#5c6070;}
#insgSheet .ig-tbox input{width:22px;height:22px;flex:none;accent-color:#c8202e;}
#insgSheet .ig-tbox.on{border-color:#c8202e;}
#insgSheet label.ig-f{display:grid;gap:6px;font:600 14px 'Segoe UI',Arial,sans-serif;color:#161616;}
#insgSheet label.ig-f i{font-style:normal;font-weight:400;font-size:13px;color:#5c6070;}
#insgSheet label.ig-f select, #insgSheet label.ig-f input{width:100%;box-sizing:border-box;min-height:48px;padding:0 12px;
  border:1px solid #c9ccd4;border-radius:10px;background:#ffffff;color:#161616;font:400 16px 'Segoe UI',Arial,sans-serif;}
#insgSheet label.ig-f select[multiple]{min-height:48px;padding:6px 8px;}
#insgSheet .ig-life{border:1px dashed #1f8a55;border-radius:12px;padding:10px 12px;display:grid;gap:2px;}
#insgSheet .ig-life b{font:700 18px 'Segoe UI',Arial,sans-serif;color:#161616;}
#insgSheet .ig-life span{font:400 13px 'Segoe UI',Arial,sans-serif;color:#5c6070;}
#insgSheet .ig-err{min-height:20px;margin:0;font:600 14px 'Segoe UI',Arial,sans-serif;color:#b01b28;}
#insgSheet .ig-foot{position:fixed;left:0;right:0;bottom:0;display:flex;gap:10px;justify-content:center;
  padding:10px 16px calc(10px + env(safe-area-inset-bottom,0px));background:#ffffff;border-top:1px solid #d9dbe1;}
#insgSheet .ig-foot button{flex:1;max-width:300px;min-height:50px;border-radius:12px;font:700 15px 'Segoe UI',Arial,sans-serif;cursor:pointer;}
#insgSheet .ig-go{border:0;background:#c8202e;color:#ffffff;}
#insgSheet .ig-go[disabled]{opacity:.6;}
#insgSheet .ig-alt{border:1px solid #c9ccd4;background:#ffffff;color:#161616;}
</style>
<script id="cr-insg-script">
/* 1265: New inspection report, guided — Theo, 8 Oct. Step 1 of three.
   Tap "+ New inspection report" on Inspections and pick what was inspected
   (a quick General inspection, and/or Roof, Siding, Gutters, Fascia, Soffit,
   Windows, Doors). The next screen is ONE checklist holding only those
   sections, every question a dropdown. It SAVES INTO THE CHECKLISTS THAT
   ALREADY EXIST: the roof answers are the Roofing Inspection Checklist's own
   keys (structure, layers, decking, pitch, ...) so the report prefill, the
   findings rules and the estimates keep reading them; the ratings are the
   General Inspection Checklist's. New keys: stories (the downspout estimate
   already reads it), residential, intake_types, life_by, life_left, and an
   `insp` object for the trade extras. Then the existing creator makes the
   report. Steps 2-3 (photo picker + Claude, edit by chat) come next. */
(function(){
  'use strict';
  var GC = (typeof GC_OPTS !== 'undefined') ? GC_OPTS : [];
  var VC = ['🟢 Good', '🟡 Fair', '🟠 Poor', '🔴 Critical'];
  var TYPES = ['Roof', 'Siding', 'Gutters', 'Fascia', 'Soffit', 'Windows', 'Doors'];
  var PITCH = ['Flat / low slope'].concat([2,3,4,5,6,7,8,9,10,11,12].map(function(n){ return n + '/12'; }), ['Steeper than 12/12']);
  /* path, label, options | 'num' | 'multi:', required */
  var ROOF = [
    ['method', 'Inspection method', ['Visual, non-invasive; roof surface accessed directly', 'Visual, non-invasive; assessed from ladder at eaves', 'Drone-assisted visual inspection'], 1],
    ['structure', 'Type of structure', ['Single Family', 'Multi-Family', 'Commercial', 'Shed', 'Barn'], 1],
    ['residential', 'Residential', ['Yes', 'No'], 0],
    ['stories', 'Stories', [['1','1'], ['1.5','1½'], ['2','2'], ['2.5','2½'], ['3','3 or more']], 0],
    ['rooftype', 'Existing roof type', ['Asphalt shingle', 'Low slope', 'Flat', 'Metal'], 1],
    ['layers', 'Number of layers', ['1 Layer', '2 Layers', '3+ Layers (Code Violation)', 'Cedar Shake***'], 1],
    ['decking', 'Decking type', ['OSB', 'Plywood', '1x6 Plank / Spaced Lumber'], 1],
    ['deckcond', 'Decking condition', ['Good', 'Fair', 'Poor'], 0],
    ['pitch', 'Pitch', PITCH, 1],
    ['age', 'Roof age (years)', 'num', 1],
    ['condition', 'Overall roof condition', ['Excellent', 'Good', 'Fair', 'Poor', 'Critical'], 1],
    ['attic', 'Attic access', ['Yes', 'No'], 1],
    ['vent_types', 'Current ventilation', 'multi:Ridge Vent|Box Vents / Turtles|Power Vent|Gable Vents', 0],
    ['intake_types', 'Intake type', 'multi:Soffit vents|Continuous soffit|Edge vent|Fascia vent|None', 0],
    ['baffles', 'Is the intake blocked?', ['Clear', 'Partly blocked', 'Blocked'], 0],
    ['ventcond', 'Ventilation condition', VC, 0],
    ['life_by', 'Life expectancy', [['rule', 'Work it out from age and condition'], ['ai', 'Let the AI estimate it']], 0]
  ];
  var EXTRA = {
    Siding:  [['insp.siding_material', 'Siding material', ['Vinyl', 'Aluminum', 'Wood', 'Fiber cement', 'Brick / stone', 'Stucco']]],
    Gutters: [['insp.gutter_size', 'Gutter size', ['5"', '6"']], ['insp.gutter_guards', 'Gutter guards', ['Yes', 'No']]],
    Fascia:  [['insp.fascia_material', 'Fascia', ['Wood', 'Aluminum-wrapped', 'Vinyl']]],
    Soffit:  [['insp.soffit_material', 'Soffit', ['Vinyl', 'Aluminum', 'Wood']]],
    Windows: [['insp.window_count', 'How many windows', 'num'], ['insp.window_type', 'Window type', ['Double-hung', 'Slider', 'Casement', 'Picture', 'Mixed']]],
    Doors:   [['insp.door_count', 'How many doors', 'num']]
  };
  var BASE = { 'Asphalt shingle':25, 'Metal':45, 'Low slope':18, 'Flat':18 };
  var FACT = { 'Excellent':1.1, 'Good':1, 'Fair':0.85, 'Poor':0.65, 'Critical':0.4 };

  function igEsc(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){
    return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]; }); }
  function igProj(){ try{ return (typeof currentProject !== 'undefined') ? currentProject : null; }catch(_){ return null; } }
  function igEl(id){ return /** @type {any} */ (document.getElementById(id)); }
  /** @param {any} rooftype @param {any} age @param {any} cond */
  function igLife(rooftype, age, cond){
    var b = BASE[rooftype], f = FACT[cond], a = Number(age);
    if(!b || !f || !(a >= 0) || age === '') return '';
    var left = Math.round(b * f - a);
    if(left <= 0) return 'At or past the end of its service life';
    if(left <= 2) return 'About 1–3 years of service life left';
    return 'About ' + (left - 1) + '–' + (left + 2) + ' years of service life left';
  }
  function igGet(o, path){ var p = path.split('.'); return p.length > 1 ? ((o[p[0]] || {})[p[1]]) : o[path]; }

  var S = { types: {}, general: false, all: {} };
  var sheet = null;
  function igBuild(){
    if(sheet) return sheet;
    sheet = document.createElement('div');
    sheet.id = 'insgSheet';
    sheet.setAttribute('role', 'dialog');
    sheet.setAttribute('aria-label', 'New inspection report');
    document.body.appendChild(sheet);
    sheet.addEventListener('click', igClick);
    sheet.addEventListener('change', igChange);
    window.addEventListener('popstate', igClose);
    return sheet;
  }
  function igSel(path, label, opts, val){
    var id = 'insg_' + path.replace('.', '_');
    var inner;
    if(opts === 'num'){
      inner = '<input type="number" inputmode="numeric" min="0" max="200" id="' + id + '" value="' + igEsc(val) + '">';
    } else if(typeof opts === 'string' && opts.indexOf('multi:') === 0){
      var have = String(val || '').split(/,\s*/);
      inner = '<select multiple id="' + id + '" size="' + opts.slice(6).split('|').length + '">' + opts.slice(6).split('|').map(function(o){
        return '<option' + (have.indexOf(o) !== -1 ? ' selected' : '') + '>' + igEsc(o) + '</option>'; }).join('') + '</select>';
      label += ' <i>· pick all that apply</i>';
    } else {
      var list = opts.map(function(o){ return Array.isArray(o) ? o : [o, o]; });
      if(val && !list.some(function(o){ return o[0] === val; })) list.push([val, val]);   /* keep an older answer */
      inner = '<select id="' + id + '"><option value="">— select —</option>' + list.map(function(o){
        return '<option value="' + igEsc(o[0]) + '"' + (o[0] === val ? ' selected' : '') + '>' + igEsc(o[1]) + '</option>'; }).join('') + '</select>';
    }
    return '<label class="ig-f" data-f="' + igEsc(path) + '">' + label + inner + '</label>';
  }
  function igTop(title, back){
    return '<div class="ig-top">' + (back ? '<button type="button" class="ig-x" data-ig="back" aria-label="Back">‹</button>' : '') +
      '<b>' + title + '</b><button type="button" class="ig-x" data-ig="close" aria-label="Close">×</button></div>';
  }
  function igStep1(){
    var pr = igProj() || {};
    sheet.innerHTML = igTop('New inspection report', false) + '<div class="ig-body">' +
      '<p class="ig-who">' + igEsc(pr.name || '') + (pr.address ? ' · ' + igEsc(pr.address) : '') + '</p>' +
      '<div class="ig-card"><div class="ig-lab">What are we inspecting?</div><div class="ig-types">' +
        '<label class="ig-tbox wide' + (S.general ? ' on' : '') + '"><input type="checkbox" data-gen="1"' + (S.general ? ' checked' : '') + '>' +
          '<span>General inspection<small>Whole house, quick: a rating for each part</small></span></label>' +
        TYPES.map(function(t){ return '<label class="ig-tbox' + (S.types[t] ? ' on' : '') + '"><input type="checkbox" data-t="' + t + '"' + (S.types[t] ? ' checked' : '') + '> ' + t + '</label>'; }).join('') +
      '</div></div><p class="ig-err" id="insgErr"></p></div>' +
      '<div class="ig-foot"><button type="button" class="ig-alt" data-ig="close">Cancel</button><button type="button" class="ig-go" data-ig="next">Next</button></div>';
  }
  function igStep2(){
    var a = S.all, h = '';
    if(S.general){
      h += '<div class="ig-card"><h3>General inspection</h3>' + ['Roof'].concat(TYPES.slice(1)).map(function(t){
        var k = t.toLowerCase(); return igSel('general.' + k, t, GC, (a.general || {})[k] || ''); }).join('') + '</div>';
    }
    if(S.types.Roof){
      var res = a.residential || '';
      if(!res){ var cat = String(a.job_category || ''); res = /residential/i.test(cat) ? 'Yes' : /commercial/i.test(cat) ? 'No' : ''; }
      h += '<div class="ig-card"><h3>Roof</h3>' + ROOF.map(function(f){
        var v = f[0] === 'residential' ? res : f[0] === 'life_by' ? (a.life_by || 'rule') : (a[f[0]] == null ? '' : String(a[f[0]]));
        if(f[0] === 'pitch' && v && /^\d+$/.test(v)) v = v + '/12';
        return igSel(f[0], f[1] + (f[0] === 'residential' && !a.residential && res ? ' <i>· from the job category</i>' : ''), f[2], v);
      }).join('') + '<div class="ig-life" id="insgLife"></div></div>';
    }
    TYPES.slice(1).forEach(function(t){
      if(!S.types[t]) return;
      var k = t.toLowerCase();
      h += '<div class="ig-card"><h3>' + t + '</h3>' +
        (S.general ? '' : igSel('general.' + k, 'Condition', GC, (a.general || {})[k] || '')) +
        (EXTRA[t] || []).map(function(f){ return igSel(f[0], f[1], f[2], igGet(a, f[0]) || ''); }).join('') + '</div>';
    });
    sheet.innerHTML = igTop('Checklist', true) + '<div class="ig-body">' + h + '<p class="ig-err" id="insgErr"></p></div>' +
      '<div class="ig-foot"><button type="button" class="ig-alt" data-ig="skip">Skip checklist</button><button type="button" class="ig-go" data-ig="save">Save and start report</button></div>';
    igRefresh();
    sheet.scrollTop = 0;
  }
  function igVal(path){ var e = igEl('insg_' + path.replace('.', '_')); if(!e) return null;
    if(e.multiple) return Array.prototype.filter.call(e.options, function(o){ return o.selected; }).map(function(o){ return o.value; }).join(', ');
    return String(e.value || '').trim(); }
  function igRefresh(){
    var it = igVal('intake_types'), bl = sheet.querySelector('[data-f="baffles"]');
    if(bl) bl.style.display = (it === 'None') ? 'none' : '';
    var box = igEl('insgLife'); if(!box) return;
    if(igVal('life_by') === 'ai'){
      box.innerHTML = '<span>Life expectancy</span><b>The AI will estimate it</b><span>For a newer rep. The report will mark it as an AI estimate so it can be checked.</span>';
    } else {
      var t = igLife(igVal('rooftype'), igVal('age'), igVal('condition'));
      box.innerHTML = '<span>Life expectancy · worked out from roof type, age and condition</span><b>' +
        (t ? igEsc(t) : 'Fill in roof type, age and condition') + '</b>';
    }
  }
  function igChange(e){
    var t = e.target;
    if(t.getAttribute('data-t')){ S.types[t.getAttribute('data-t')] = t.checked; t.closest('.ig-tbox').classList.toggle('on', t.checked); return; }
    if(t.getAttribute('data-gen')){ S.general = t.checked; t.closest('.ig-tbox').classList.toggle('on', t.checked); return; }
    if(t.id === 'insg_intake_types' && t.multiple){
      var opts = Array.prototype.slice.call(t.options), none = opts.filter(function(o){ return o.value === 'None'; })[0];
      if(none && none.selected && opts.some(function(o){ return o.selected && o !== none; })){
        if(t.__noneWas) none.selected = false; else opts.forEach(function(o){ if(o !== none) o.selected = false; });
      }
      t.__noneWas = !!(none && none.selected);
    }
    igRefresh();
  }
  async function igSave(){
    var pr = igProj(); if(!pr) return;
    var err = igEl('insgErr'), all = S.all, now = new Date().toISOString(), missing = [];
    if(S.types.Roof){
      ROOF.forEach(function(f){ var v = igVal(f[0]); if(v === null) return; if(f[3] && !v) missing.push(f[1]); all[f[0]] = v; });
      if(missing.length){ err.textContent = 'Still needed for the roof: ' + missing.join(', ') + '.'; return; }
      var it = all.intake_types;
      if(it) all.soffit = (it === 'None') ? 'No' : 'Yes';
      if(it === 'None') all.baffles = '';
      if(!all.life_by) all.life_by = 'rule';
      all.life_left = all.life_by === 'rule' ? igLife(all.rooftype, all.age, all.condition) : '';
      if(!all.completed_at) all.completed_at = now;
      all.updated_at = now;
    }
    var g = Object.assign({}, all.general || {}), touched = false;
    ['roof'].concat(TYPES.slice(1).map(function(t){ return t.toLowerCase(); })).forEach(function(k){
      var v = igVal('general.' + k); if(v === null) return; g[k] = v; touched = true; });
    if(S.general){
      var gm = ['roof','siding','soffit','fascia','gutters','windows'].filter(function(k){ return !g[k]; });
      if(gm.length){ err.textContent = 'Rate every part of the general inspection (' + gm.length + ' left).'; return; }
      if(!g.completed_at) g.completed_at = now;
      g.updated_at = now;
    }
    if(touched) all.general = g;
    var insp = Object.assign({}, all.insp || {});
    Object.keys(EXTRA).forEach(function(t){ (EXTRA[t] || []).forEach(function(f){ var v = igVal(f[0]); if(v !== null) insp[f[0].split('.')[1]] = v; }); });
    insp.types = TYPES.filter(function(t){ return S.types[t]; });
    insp.general = !!S.general;
    insp.at = now;
    all.insp = insp;
    var go = sheet.querySelector('[data-ig="save"]'); if(go){ go.disabled = true; go.textContent = 'Saving…'; }
    try{
      var json = JSON.stringify(all);
      await pdb.update(pr.id, { checklist: json });
      pr.checklist = json;
      try{ var cp = cacheProjects.find(function(x){ return x.id === pr.id; }); if(cp) cp.checklist = json; }catch(_){}
      try{ renderCkStatus(); }catch(_){}
      try{ renderGcStatus(); }catch(_){}
    }catch(e2){
      err.textContent = 'Could not save: ' + ((e2 && e2.message) || e2);
      if(go){ go.disabled = false; go.textContent = 'Save and start report'; }
      return;
    }
    igStart();
  }
  function igStart(){
    /* the roof template when the roof was inspected (or nothing was picked);
       otherwise the exterior one, which covers the whole outside */
    var roof = !!S.types.Roof || (!S.general && !TYPES.some(function(t){ return S.types[t]; }));
    igClose();
    if(roof) createReportFrom(REPORT_TEMPLATE, 'Report', true);
    else createReportFrom(EXTERIOR_TEMPLATE, 'Exterior report', false);
  }
  function igClick(e){
    var b = e.target.closest('[data-ig]'); if(!b) return;
    var a = b.getAttribute('data-ig');
    if(a === 'close') return igClose();
    if(a === 'back') return igStep1();
    if(a === 'skip') return igStart();
    if(a === 'save') return igSave();
    if(a === 'next'){
      if(!S.general && !TYPES.some(function(t){ return S.types[t]; })){ igEl('insgErr').textContent = 'Check at least one, or General inspection.'; return; }
      igStep2();
    }
  }
  function igOpen(){
    var pr = igProj();
    if(!pr){ if(window.crToastErr) window.crToastErr('Open a client first — a report needs a job to belong to.'); return; }
    try{ S.all = JSON.parse(JSON.stringify(parseCkAll(pr) || {})); }catch(_){ S.all = {}; }
    var was = (S.all.insp && S.all.insp.types) || [];
    S.types = {}; TYPES.forEach(function(t){ S.types[t] = was.length ? was.indexOf(t) !== -1 : t === 'Roof'; });
    S.general = !!(S.all.insp && S.all.insp.general);
    igBuild(); igStep1();
    sheet.classList.add('open');
    sheet.scrollTop = 0;
  }
  function igClose(){ if(sheet) sheet.classList.remove('open'); }
  window.CardinalInspGuide = Object.assign(window.CardinalInspGuide || {}, { open: igOpen, close: igClose, life: igLife });
})();
</script>
