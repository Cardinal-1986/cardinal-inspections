(function(){
  var S = window.__SEED__; if(!S) return;
  function dk(o){ var d=new Date(Date.now()+o*86400000); return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2); }
  S.projects.push(
    { id:'p7', name:'Sample Insurance Job', address:'10 Oak St', city:'Dayton', state:'OH', zip:'45402', stage:'Scheduled', created_by:'theo@cardinalrenovations.net', checklist: JSON.stringify({ po:1101, lead:{claim_type:'insurance'} }), phone:'937-555-0190', crm:'insurance', created_at:'2026-09-01T10:00:00Z', updated_at:'2026-09-20T10:00:00Z', stage_since:'2026-09-20T10:00:00Z' },
    { id:'p8', name:'Sample Community Job', address:'22 Elm St', city:'Dayton', state:'OH', zip:'45403', stage:'Approved', created_by:'joan@cardinalrenovations.net', checklist: JSON.stringify({ po:1102, lead:{claim_type:'community'} }), crm:'community', created_at:'2026-09-02T10:00:00Z', updated_at:'2026-09-20T10:00:00Z', stage_since:'2026-09-20T10:00:00Z' }
  );
  S.appointments.push({ id:'a9', project_id:'p7', kind:'job', appt_date: dk(0), appt_time:'08:00', when:new Date().toISOString(), note:'Install day', created_by:'theo@cardinalrenovations.net' });
  S.punch_items.push(
    { id:'i6', project_id:'p7', title:'Tarp over rear slope', detail:'Leak in bedroom', kind:'tarp', priority:'high', status:'open', assigned_to:'scottie@cardinalrenovations.net', created_by:'curtis@cardinalrenovations.net', created_at:'2026-10-20T12:00:00Z', scheduled_at: dk(0), scheduled_time:'13:00:00', photos:[], comments:[], steps:[], template:null, visits:[] },
    { id:'i7', project_id:'p6', title:'Callback: drip at skylight', detail:null, kind:'callback', priority:'normal', status:'open', assigned_to:null, created_by:'theo@cardinalrenovations.net', created_at:'2026-10-18T12:00:00Z', scheduled_at:null, scheduled_time:null, photos:[], comments:[], steps:[], template:null, visits:[] },
    { id:'i8', project_id:'p8', title:'Repair fascia', detail:null, kind:'repair', priority:'normal', status:'open', assigned_to:'curtis@cardinalrenovations.net', created_by:'theo@cardinalrenovations.net', created_at:'2026-10-18T12:00:00Z', scheduled_at:dk(1), scheduled_time:null, photos:[], comments:[], steps:[], template:null, visits:[] }
  );
  S.crew_docs = [ { id:'d1', crew_id:'c1', kind:'coi', title:'COI 2026', expires_on: dk(10), path:'crews/c1/coi.pdf', created_at:'2026-09-01T10:00:00Z' }, { id:'d2', crew_id:'c1', kind:'w9', title:'W-9', expires_on:null, path:'crews/c1/w9.pdf', created_at:'2026-09-01T10:00:00Z' } ];
  S.crew_rates = [ { id:'r1', crew_id:'c1', pricing_item_id:null, name:'Tear-off', unit:'SQ', rate: 55 } ];
  S.crew_payments = [ { id:'cp1', crew_id:'c1', project_id:'p1', amount: 4200, paid_on:'2026-09-10', note:'check 1001' } ];
  S.commissions = [ { id:'cm1', project_id:'p1', rep_email:'nick@cardinalrenovations.net', amount: 900, status:'owed' } ];
  S.project_photos = [ { id:'ph1', project_id:'p1', url:'https://example.com/a.jpg', caption:'Front', created_at:'2026-09-01T10:00:00Z' } ];
  S.inspection_reports.push({ id:'ct1', project_id:'p1', title:'Contract — Mark Diamond', total: 18450, signed_at:'2026-08-09T10:00:00Z', status:'signed', html:'<p>contract $18,450</p>', created_at:'2026-08-08T10:00:00Z', updated_at:'2026-08-09T10:00:00Z' });
  S.estimates.push({ id:'e1', project_id:'p1', estimate_number:'EST-2026-0007', status:'accepted', total:18450, archived:false, line_items:[], created_at:'2026-08-05T10:00:00Z', updated_at:'2026-08-05T10:00:00Z' });
  S.job_costs = [ { id:'jc1', project_id:'p1', amount: 6000, kind:'materials', note:'ABC' } ];
  S.collections = [ { id:'col1', project_id:'p1', amount: 9000, received_at:'2026-08-20', method:'check' } ];
})();
