(function(){ var S=window.__SEED__; if(!S) return;
 function iso(d){ return new Date(Date.now()+d*86400000).toISOString(); }
 var who=(location.search.match(/[?&]as=([\w.]+)/)||[])[1];
 if(who==='curtis') window.__AS__={email:'curtis@cardinalrenovations.net',name:'Curtis'};
 if(who==='scottie') window.__AS__={email:'scottie@cardinalrenovations.net',name:'Scottie'};
 S.team_profiles.push({email:'scottie@cardinalrenovations.net',name:'Scottie',role:'field'},{email:'rep2@cardinalrenovations.net',name:'Sample Rep Two',role:'sales'});
 S.projects.push(
  { id:'R2', name:"Sample O'Brien", address:'7 Maple Ave', city:'Kettering', state:'OH', zip:'45429', stage:'Lead', crm:'retail', created_by:'rep2@cardinalrenovations.net', sales_rep:'rep2@cardinalrenovations.net', phone:'+1 (937) 555-0177', email:'ob@example.com', checklist:JSON.stringify({lead:{claim_type:'retail',assigned:['rep2@cardinalrenovations.net']},po:3001}), created_at:iso(-3), updated_at:iso(-1), stage_since:iso(-1)},
  { id:'R3', name:'Sample José Núñez', address:'9 Café Ct', city:'Dayton', state:'OH', zip:'45405', stage:'Prospect', crm:'retail', created_by:'rep@cardinalrenovations.net', phone:'937.555.0188', email:'jn@example.com', checklist:JSON.stringify({lead:{claim_type:'retail',assigned:['rep@cardinalrenovations.net'],phones:[{v:'(513) 555-0111'}]},po:3002}), created_at:iso(-2), updated_at:iso(-1), stage_since:iso(-1)},
  { id:'C3', name:'Sample Occupant Three', address:'30 Elm St', city:'Dayton', state:'OH', zip:'45403', stage:'OnHold', crm:'community', created_by:'joan@cardinalrenovations.net', phone:'9375550199', checklist:JSON.stringify({lead:{claim_type:'community',assigned:[],partner_id:'cpB',partner_name:'Brookside Repair Network',homeowner_name:'Sample Occupant Three'},po:3003}), created_at:iso(-400), updated_at:iso(-200), stage_since:iso(-300)}
 );
 S.community_partners.push({ id:'cpZ', name:'Zeta Confidential GC', partner_type:'general_contractor', confidential:true, contact_name:'Sample Z', contact_email:'z@example.org', contact_phone:'9375550309', prospective:false });
 S.crew_payments.push({id:'cp1',crew_id:'cw1',amount:4321,paid_at:iso(-3),project_id:'R1'});
 S.crews.push({id:'cw1',name:'Sample Crew',trade:'roofing'});
})();
;(function(){var S=window.__SEED__; if(!S) return; S.community_partners.forEach(function(p){p.archived=false;});
S.community_partners.push({id:'cpG',name:'Acme Builders GC',partner_type:'general_contractor',archived:false,prospective:false,contact_email:'acme@example.org'});
S.projects.push({ id:'C4', name:'Sample Occupant Four', address:'40 Elm St, Dayton OH', stage:'Lead', crm:'community', created_by:'theo@cardinalrenovations.net', phone:'9375550140', email:'occupant4@example.com', checklist:JSON.stringify({lead:{claim_type:'community',assigned:[]}}), created_at:new Date().toISOString(), updated_at:new Date().toISOString(), stage_since:new Date().toISOString()});
S.inspection_reports.push({ id:'bidC4', project_id:'C4', title:'Estimate — Sample Occupant Four', total:5000, status:'draft', html:'<p>Bid</p>', created_by:'theo@cardinalrenovations.net', created_at:new Date().toISOString(), updated_at:new Date().toISOString()});})();
