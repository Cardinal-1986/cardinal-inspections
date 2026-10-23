(function(){
  try { localStorage.setItem('cr-push-nudge-dismissed', '1'); } catch (e) {}
  try { var who=(location.search.match(/[?&]as=([\w.]+)/)||[])[1];
    if(who==='joan') window.__AS__={email:'joan@cardinalrenovations.net',name:'Sample Admin'};
    if(who==='rep') window.__AS__={email:'rep@cardinalrenovations.net',name:'Sample Rep'}; } catch(e){}
  function iso(d){ return new Date(Date.now()+d*86400000).toISOString(); }
  function dk(o){ var d=new Date(Date.now()+o*86400000); return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2); }
  function ck(type, extra){ return JSON.stringify(Object.assign({ lead:Object.assign({ claim_type:type, assigned:[] }, (extra&&extra.lead)||{}) }, extra&&extra.rest||{})); }
  var BOX = '<div data-cr-inspart="1"><table><tr><td>Your deductible</td><td><span class="fill" data-ip="ded">$1,000.00</span></td></tr>'
   + '<tr><td>Upgrades</td><td><span class="fill" data-ip="upg">$500.00</span></td></tr><tr><td>Your total out of pocket</td><td><b data-ip="oop">$1,500.00</b></td></tr></table></div>';
  window.__SEED__ = {
    team_profiles: [
      { email:'theo@cardinalrenovations.net', name:'Sample Owner', role:'admin', title:'Owner', phone:'937-555-0101' },
      { email:'joan@cardinalrenovations.net', name:'Sample Admin', role:'admin', phone:null },
      { email:'curtis@cardinalrenovations.net', name:'Curtis', role:'production' },
      { email:'rep@cardinalrenovations.net', name:'Sample Rep', role:'sales' }
    ],
    projects: [
      { id:'I1', name:'Sample Insured One', address:'10 Oak St', city:'Dayton', state:'OH', zip:'45402', stage:'Scheduled', crm:'insurance',
        created_by:'theo@cardinalrenovations.net', sales_rep:'rep@cardinalrenovations.net', phone:'9375550190', email:'ins1@example.com',
        checklist: ck('insurance',{rest:{po:2001}}), created_at:iso(-40), updated_at:iso(-5), stage_since:iso(-5) },
      { id:'I2', name:'Sample Insured Two', address:'12 Oak St', city:'Dayton', state:'OH', zip:'45402', stage:'Invoiced', crm:'insurance',
        created_by:'theo@cardinalrenovations.net', sales_rep:null, phone:'9375550191', email:'ins2@example.com',
        checklist: ck('insurance',{rest:{po:2002}}), created_at:iso(-60), updated_at:iso(-10), stage_since:iso(-10) },
      { id:'C1', name:'Sample Occupant One', address:'22 Elm St', city:'Dayton', state:'OH', zip:'45403', stage:'Approved', crm:'community',
        created_by:'joan@cardinalrenovations.net', phone:'9375550192', email:'occupant1@example.com',
        checklist: ck('community',{lead:{partner_id:'cpH', partner_name:'Habitat for Humanity of Greater Dayton', homeowner_name:'Sample Occupant One'}, rest:{po:2003}}), created_at:iso(-30), updated_at:iso(-3), stage_since:iso(-3) },
      { id:'C2', name:'Sample Occupant Two', address:'24 Elm St', city:'Dayton', state:'OH', zip:'45403', stage:'Invoiced', crm:'community',
        created_by:'joan@cardinalrenovations.net', phone:'9375550193', email:'occupant2@example.com',
        checklist: ck('community',{lead:{partner_id:'cpA', partner_name:'Aardvark Housing Fund', homeowner_name:'Sample Occupant Two'}, rest:{po:2004}}), created_at:iso(-50), updated_at:iso(-8), stage_since:iso(-8) },
      { id:'R1', name:'Sample Retail One', address:'5 Pine St', city:'Dayton', state:'OH', zip:'45405', stage:'Invoiced', crm:'retail',
        created_by:'theo@cardinalrenovations.net', sales_rep:'rep@cardinalrenovations.net', phone:'9375550194', email:'retail1@example.com',
        checklist: ck('retail',{rest:{po:2005}}), created_at:iso(-45), updated_at:iso(-6), stage_since:iso(-6) }
    ],
    insurance_claims: [
      { id:'clI1', project_id:'I1', homeowner_name:'Sample Insured One', carrier:'Sample Mutual', claim_number:'SM-1001', cause_of_loss:'Hail',
        approved_rcv:12000, approved_acv:9000, approved_depreciation:3000, first_scope_rcv:12000, deductible:1000, deductible_waived:false,
        status:'approved', filed_at:iso(-35), created_by:'theo@cardinalrenovations.net', created_at:iso(-35), updated_at:iso(-10) },
      { id:'clI2', project_id:'I2', homeowner_name:'Sample Insured Two', carrier:'Example Casualty', claim_number:'EC-2002', cause_of_loss:'Wind',
        approved_rcv:9000, approved_acv:6000, approved_depreciation:3000, first_scope_rcv:8000, deductible:1000, deductible_waived:false,
        supplement_status:'approved', supplement_filed:1000, supplement_approved:1000,
        status:'approved', filed_at:iso(-55), created_by:'theo@cardinalrenovations.net', created_at:iso(-55), updated_at:iso(-12) }
    ],
    insurance_payments: [],
    inspection_reports: [
      { id:'ctI1', project_id:'I1', title:'Contract — Sample Insured One', total:12500, signed_at:iso(-20), status:'signed', html:'<p>Roofing agreement</p>'+BOX, created_at:iso(-21), updated_at:iso(-20) },
      { id:'ctI2', project_id:'I2', title:'Contract — Sample Insured Two', total:10000, signed_at:iso(-40), status:'signed', html:'<p>Roofing agreement</p>'+BOX, created_at:iso(-41), updated_at:iso(-40) },
      { id:'invI2', project_id:'I2', title:'Invoice — Sample Insured Two', total:10000, status:'sent', sent_at:iso(-9), html:'<p>invoice</p>', share_token:'aaaaaaaa-bbbb-cccc-dddd-000000000012', created_at:iso(-9), updated_at:iso(-9) },
      { id:'ctC1', project_id:'C1', title:'Contract — Sample Occupant One', total:8000, signed_at:iso(-10), status:'signed', html:'<p>Community agreement</p>', created_at:iso(-11), updated_at:iso(-10) },
      { id:'ctC2', project_id:'C2', title:'Contract — Sample Occupant Two', total:6000, signed_at:iso(-30), status:'signed', html:'<p>Community agreement</p>', created_at:iso(-31), updated_at:iso(-30) },
      { id:'invC2', project_id:'C2', title:'Invoice — Sample Occupant Two', total:6000, status:'draft', html:'<p>invoice</p>', created_at:iso(-7), updated_at:iso(-7) },
      { id:'ctR1', project_id:'R1', title:'Contract — Sample Retail One', total:15000, signed_at:iso(-30), status:'signed', html:'<p>agreement</p>', created_at:iso(-31), updated_at:iso(-30) },
      { id:'invR1', project_id:'R1', title:'Invoice — Sample Retail One', total:15000, status:'sent', sent_at:iso(-40), html:'<p>invoice</p>', share_token:'aaaaaaaa-bbbb-cccc-dddd-000000000015', created_at:iso(-40), updated_at:iso(-40) }
    ],
    collections: [
      { id:'k1', project_id:'I1', amount:9000, source:'insurance', type:'deposit', method:'check', collected_at:dk(-15), created_at:iso(-15), created_by:'theo@cardinalrenovations.net' },
      { id:'k2', project_id:'I1', amount:500, source:'homeowner', type:'deposit', method:'check', collected_at:dk(-14), created_at:iso(-14), created_by:'theo@cardinalrenovations.net' },
      { id:'k3', project_id:'I2', amount:6000, source:'insurance', type:'deposit', method:'check', collected_at:dk(-30), created_at:iso(-30), created_by:'theo@cardinalrenovations.net' },
      { id:'k4', project_id:'C2', amount:2000, source:'partner', type:'deposit', method:'check', collected_at:dk(-20), created_at:iso(-20), created_by:'joan@cardinalrenovations.net' },
      { id:'k5', project_id:'R1', amount:5000, source:'homeowner', type:'deposit', method:'check', collected_at:dk(-28), created_at:iso(-28), created_by:'theo@cardinalrenovations.net' }
    ],
    commissions: [
      { id:'cm1', project_id:'I1', rep_email:'rep@cardinalrenovations.net', amount:950, basis:'collection', status:'pending', rate_pct:10, collection_id:'k1', project_name:'Sample Insured One', created_at:iso(-15) },
      { id:'cm2', project_id:'R1', rep_email:'rep@cardinalrenovations.net', amount:500, basis:'collection', status:'paid', rate_pct:10, collection_id:'k5', project_name:'Sample Retail One', created_at:iso(-28), paid_at:iso(-20) }
    ],
    community_partners: [
      { id:'cpA', name:'Aardvark Housing Fund', partner_type:'nonprofit', contact_name:'Sample Contact A', contact_email:'aardvark@example.org', contact_phone:'9375550300', prospective:false },
      { id:'cpH', name:'Habitat for Humanity of Greater Dayton', partner_type:'nonprofit', contact_name:'Sample Contact H', contact_email:'habitat@example.org', contact_phone:'9375550301', prospective:false },
      { id:'cpB', name:'Brookside Repair Network', partner_type:'city', contact_name:null, contact_email:null, contact_phone:null, prospective:false }
    ],
    estimates: [
      { id:'eC1', project_id:'C1', estimate_number:'EST-2026-0101', status:'accepted', total:8000, archived:false, line_items:[{name:'Roof',qty:1,price:8000}], created_by:'joan@cardinalrenovations.net', created_at:iso(-12), updated_at:iso(-12) }
    ],
    contracts: [], appointments: [], punch_items: [], job_costs: [], crew_payments: [], draws: [],
    app_settings: [{ key:'payment_reminders_enabled', value:false }], payment_reminders: [],
    crews: [], crew_work_orders: [], owner_tasks: [], owner_items: [], owner_reminders: [], owner_ledger: [], owner_ledger_txns: [], owner_docs: [], pricing_items: []
  };
})();
(function(){ var v=(location.search.match(/[?&]v=(\w+)/)||[])[1]; var S=window.__SEED__; if(!S||!v) return;
  if(v==='ded'){ S.projects.find(p=>p.id==='I2').stage='Completed';
    S.collections.push({ id:'k7', project_id:'I2', amount:1000, source:'homeowner', type:'final', method:'check', collected_at:'2026-10-20', created_at:new Date().toISOString() });
    S.owner_review_rules=[{key:'ded_uncollected',on:true}]; }
})();
