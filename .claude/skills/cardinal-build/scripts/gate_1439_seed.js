(function(){ var S=window.__SEED__; if(!S) return;
  function iso(d){ return new Date(Date.now()+d*86400000).toISOString(); }
  S.projects.push({ id:'R9', name:'Sample Homeowner Nine', address:'1400 Maple Ridge Dr, Kettering, OH 45429', street:'1400 Maple Ridge Dr', city:'Kettering', state:'OH', zip:'45429', stage:'Prospect', crm:'retail',
    created_by:'theo@cardinalrenovations.net', sales_rep:'theo@cardinalrenovations.net', phone:'9375550199', email:'homeowner9@example.com',
    checklist: JSON.stringify({ lead:{ claim_type:'retail', assigned:[] }, po:2009, meas:{ squares:28.4, pitch:'6/12' } }), created_at:iso(-12), updated_at:iso(-2), stage_since:iso(-2) });
  S.estimates.push({ id:'eR9', project_id:'R9', estimate_number:'EST-2026-0209', status:'accepted', title:'Roof Replacement — OC Duration', total:16167.3, subtotal:16167.3, deposit_pct:30, archived:false,
    valid_through: new Date(Date.now()+30*86400000).toISOString().slice(0,10),
    notes:'Price includes full tear-off to the deck, replacement of up to 3 sheets of damaged decking, and Owens Corning Duration shingles in Driftwood.',
    payment_instructions:'30% deposit at signing, balance due on completion.',
    line_items:[
      { id:'l1', name:'Tear-off existing roofing layers & haul away', description:'Up to 2 layers', qty:28.4, unit:'SQ', unit_price:85 },
      { id:'l2', name:'Synthetic underlayment', description:'ProArmor / Deck Defense', qty:28.4, unit:'SQ', unit_price:22 },
      { id:'l3', name:'Ice & Water Shield', description:'Eaves, valleys and penetrations', qty:180, unit:'LF', unit_price:4.5 },
      { id:'l4', name:'Drip edge flashing', description:'Perimeter', qty:210, unit:'LF', unit_price:3.25 },
      { id:'l5', name:'Starter strip shingles', description:'Eaves & rakes', qty:210, unit:'LF', unit_price:2.1 },
      { id:'l6', name:'OC Duration architectural shingles', description:'SureNail — includes 10% waste', qty:31.2, unit:'SQ', unit_price:310 },
      { id:'l7', name:'Shingle-over ridge vent', description:'SkyRunner', qty:42, unit:'LF', unit_price:9 },
      { id:'l8', name:'Hip & ridge cap shingles', description:'ProEdge / RIZERidge', qty:60, unit:'LF', unit_price:6 },
      { id:'l9', name:'Pipe flashing boots', description:'Neoprene / silicone', qty:3, unit:'EA', unit_price:45 },
      { id:'l10', name:'Dump trailer, magnetic sweep & site cleanup', description:'', qty:0, unit:'', unit_price:650, flat:true, amount:650 }
    ], created_by:'theo@cardinalrenovations.net', created_at:iso(-5), updated_at:iso(-3) });
})();
(function(){ var S=window.__SEED__; if(!S) return;
  function iso(d){ return new Date(Date.now()+d*86400000).toISOString(); }
  var base=S.estimates.find(function(e){return e.id==='eR9';});
  function clone(id,num,title,total,shingle,price){ var e=JSON.parse(JSON.stringify(base)); e.id=id; e.estimate_number=num; e.title=title; e.total=total; e.subtotal=total; e.status='draft';
    e.line_items.forEach(function(l){ if(/Duration/.test(l.name)){ l.name=shingle; l.unit_price=price; } }); return e; }
  S.estimates.push(clone('eR9g','EST-2026-0210','Good — OC Supreme',12891.3,'OC Supreme 3-tab shingles',205));
  S.estimates.push(clone('eR9b','EST-2026-0211','Best — OC Duration Designer',20691.3,'OC Duration Designer shingles',455));
})();
