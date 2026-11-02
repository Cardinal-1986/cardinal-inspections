(function(){ var S=window.__SEED__; if(!S) return;
  var stages=['Lead','Lead','Prospect','Prospect','Approved','Scheduled','Scheduled','Completed','Invoiced','Closed','Lost','OnHold'];
  var crms=['retail','retail','insurance','community','retail','insurance'];
  var reps=['rep@cardinalrenovations.net','theo@cardinalrenovations.net','joan@cardinalrenovations.net',null];
  var streets=['Maple','Cedar','Birch','Walnut','Ash','Spruce','Hickory','Willow','Poplar','Chestnut'];
  function iso(d){ return new Date(Date.now()+d*86400000).toISOString(); }
  for(var i=0;i<36;i++){
    var crm=crms[i%crms.length], st=stages[i%stages.length];
    var lead={ claim_type:crm, assigned:[] };
    if(crm==='community'){ lead.partner_id='cpH'; lead.partner_name='Habitat for Humanity of Greater Dayton'; lead.homeowner_name='Test Occupant '+i; }
    S.projects.push({ id:'X'+i, name:'Test Client '+String.fromCharCode(65+(i%26))+(i>25?'2':''), address:(100+i)+' '+streets[i%10]+' Ave', city:'Dayton', state:'OH', zip:'4540'+(i%9),
      stage:st, crm:crm, created_by:reps[i%3], sales_rep:reps[i%4], phone:'93755502'+(10+i), email:'t'+i+'@example.com',
      checklist: JSON.stringify({lead:lead, po:3000+i, bid_amount:(5000+i*731)}), created_at:iso(-(i*3+2)), updated_at:iso(-(i%9)), stage_since:iso(-(i%14)) });
  }
  function dk(o){ var d=new Date(Date.now()+o*86400000); return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2); }
  var kinds=['job','drop','appt','team','appt','job'];
  for(var j=0;j<18;j++){ S.appointments.push({ id:'ap'+j, project_id:'X'+(j%20), title:['Tear-off','Shingle drop','Inspection','Team meeting','Estimate visit','Gutter install'][j%6], appt_date:dk((j*5)%13), appt_time:('0'+(8+(j%9))).slice(-2)+':00', kind:kinds[j%6], created_by:'theo@cardinalrenovations.net', created_at:iso(-3) }); }
})();
