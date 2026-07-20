/* Vercel serverless: fan out web-push to team subscriptions stored in Supabase */
import webpush from 'web-push';

const SUPA_URL = 'https://yipslubcptjoarblzbpl.supabase.co';
const SUPA_KEY = 'sb_publishable_aGsug3EBJjHX90BLKd5bLQ_zryUMqNZ';
const VAPID_PUBLIC = 'BI-nCdPXgT_WzKQA34jhHsX3dYQephRPLDKy7xr__Jyl1WergJWPlliAvbIldjztrds65MPkT5xI0TvDTg-Q_2k';
const VAPID_PRIVATE = process.env.VAPID_PRIVATE || 'vtIkMaIEJxS2yUNI0wgulFiFxze4w3dfcRXFzsG-3qU';

webpush.setVapidDetails('mailto:info@cardinalrenovations.net', VAPID_PUBLIC, VAPID_PRIVATE);

export default async function handler(req, res){
  if(req.method !== 'POST'){ res.status(405).json({ ok:false, error:'POST only' }); return; }
  try{
    var body = req.body || {};
    var emails = Array.isArray(body.emails) ? body.emails.filter(Boolean) : [];
    var title = String(body.title || 'Cardinal Resource').slice(0, 120);
    var text = String(body.body || '').slice(0, 300);
    var url = String(body.url || '/');
    if(!emails.length){ res.status(200).json({ ok:true, sent:0 }); return; }

    var q = SUPA_URL + '/rest/v1/push_subs?select=email,endpoint,sub&email=in.(' +
      emails.map(function(e){ return '"' + e.replace(/"/g,'') + '"'; }).join(',') + ')';
    var r = await fetch(q, { headers: { apikey: SUPA_KEY, Authorization: 'Bearer ' + SUPA_KEY } });
    var subs = await r.json();
    if(!Array.isArray(subs)){ res.status(200).json({ ok:true, sent:0 }); return; }

    var sent = 0;
    await Promise.all(subs.map(async function(row){
      try{
        await webpush.sendNotification(row.sub, JSON.stringify({ title:title, body:text, url:url }));
        sent++;
      }catch(err){
        if(err && (err.statusCode === 404 || err.statusCode === 410)){
          try{
            await fetch(SUPA_URL + '/rest/v1/push_subs?endpoint=eq.' + encodeURIComponent(row.endpoint),
              { method:'DELETE', headers:{ apikey: SUPA_KEY, Authorization:'Bearer ' + SUPA_KEY } });
          }catch(e2){}
        }
      }
    }));
    res.status(200).json({ ok:true, sent: sent });
  }catch(err){
    res.status(200).json({ ok:false, error: String(err && err.message || err) });
  }
};
