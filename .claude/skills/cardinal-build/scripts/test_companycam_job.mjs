/* test_companycam_job.mjs — build 1228: the permission rules of
   api/companycam-job.js, run against a fake Supabase (global fetch stubbed).
   The route itself is imported and executed; nothing is re-implemented here.

     1. no session -> 401
     2. a client the caller's RLS hides -> 404 (the DB decides, not the route)
     3. a rep, linked job at the SAME street -> photos
     4. a rep, linked job at a DIFFERENT street -> 403 (the anti-snoop rail)
     5. an admin, linked job at a different street -> photos (typo'd addresses)
     6. a rep's suggestions are only same-street jobs; an admin's search ignores that
     7. not linked -> linked:false
   usage:  node test_companycam_job.mjs [path/to/companycam-job.js]
*/
import { resolve, dirname } from 'path';
import { pathToFileURL } from 'url';
const here = dirname(new URL(import.meta.url).pathname);
const ROUTE = resolve(process.argv[2] || resolve(here, '../../../../api/companycam-job.js'));
process.env.SUPABASE_SERVICE_ROLE_KEY = 'svc';
const { default: handler } = await import(pathToFileURL(ROUTE).href);
let pass = 0, fail = 0;
const ok = (c, m, d = '') => { console.log((c ? '  PASS  ' : '  FAIL  ') + m + (d !== '' ? '  → ' + d : '')); c ? pass++ : fail++; };

const USERS = { tok_rep: 'nick@cardinalrenovations.net', tok_admin: 'theo@cardinalrenovations.net' };
const CLIENTS = { c1: { id: 'c1', address: '807 Browning Ave, Dayton, OH', owner: 'nick@cardinalrenovations.net', checklist: '{"cc_project_id":"100"}' },
                  c2: { id: 'c2', address: '807 Browning Ave', owner: 'nick@cardinalrenovations.net', checklist: '{"cc_project_id":"200"}' },
                  c3: { id: 'c3', address: '12 Elm St', owner: 'joey@cardinalrenovations.net', checklist: '{}' },
                  c4: { id: 'c4', address: '807 Browning Ave', owner: 'nick@cardinalrenovations.net', checklist: '{}' } };
const JOBS = { '100': { id: '100', name: '807 Browning Ave', address: '807 Browning Ave' },
               '200': { id: '200', name: 'Elsewhere', address: '55 Other Rd' },
               '300': { id: '300', name: 'Browning (gutters)', address: '807 Browning Ave, Dayton' } };
const json = (b, h = {}) => new Response(JSON.stringify(b), { status: 200, headers: Object.assign({ 'content-type': 'application/json' }, h) });
globalThis.fetch = async (url, opt = {}) => {
  const u = String(url), auth = (opt.headers && opt.headers.Authorization) || '';
  const bearer = auth.replace('Bearer ', '');
  if (u.includes('/auth/v1/user')) return USERS[bearer] ? json({ email: USERS[bearer] }) : new Response('no', { status: 401 });
  if (u.includes('/rest/v1/team_profiles')) return json([]);
  if (u.includes('/rest/v1/projects')) {           /* RLS, as the caller: admin sees all, a rep sees their own */
    const id = decodeURIComponent((u.match(/id=eq\.([^&]+)/) || [])[1] || '');
    const me = USERS[bearer], c = CLIENTS[id];
    const visible = c && (me === 'theo@cardinalrenovations.net' || c.owner === me);
    return json(visible ? [c] : []);
  }
  if (u.includes('/rest/v1/companycam_projects')) {
    if (bearer !== 'svc') return json([]);
    const id = (u.match(/id=eq\.([^&]+)/) || [])[1];
    if (id) return json(JOBS[decodeURIComponent(id)] ? [JOBS[decodeURIComponent(id)]] : []);
    if (u.includes('or=')) return json(Object.values(JOBS));
    return json(Object.values(JOBS).filter(j => /^807/.test(j.address)));
  }
  if (u.includes('/rest/v1/companycam_photos')) {
    const pid = decodeURIComponent((u.match(/project_id=eq\.([^&]+)/) || [])[1] || '');
    const rows = [{ id: 'p' + pid, thumb_url: 'https://static.companycam.com/x.jpeg?d=250x250', preview_url: 'https://static.companycam.com/x.jpeg?d=400x400', captured_at: '2026-01-01T00:00:00Z', description: '', creator_name: 'Jerry', annotated: false }];
    return json(rows, { 'content-range': '0-0/7' });
  }
  return new Response('unexpected ' + u, { status: 500 });
};
async function call(token, body) {
  let status = 0, out = null;
  const res = { status(s) { status = s; return this; }, json(o) { out = o; return this; } };
  await handler({ method: 'POST', headers: token ? { authorization: 'Bearer ' + token } : {}, body }, res);
  return { status, out };
}
let r;
r = await call(null, { action: 'photos', client_id: 'c1' });                ok(r.status === 401, 'no session is refused', r.status);
r = await call('tok_rep', { action: 'photos', client_id: 'c3' });           ok(r.status === 404, "a rep cannot reach someone else's client", r.status);
r = await call('tok_rep', { action: 'photos', client_id: 'c1' });           ok(r.status === 200 && r.out.photos.length === 1 && r.out.total === 7, 'a rep sees the same-street job', JSON.stringify({ s: r.status, n: r.out && r.out.photos && r.out.photos.length }));
r = await call('tok_rep', { action: 'photos', client_id: 'c2' });           ok(r.status === 403, 'a rep is refused a job at a different street', r.status);
r = await call('tok_admin', { action: 'photos', client_id: 'c2' });         ok(r.status === 200 && r.out.photos.length === 1, 'an admin may see a different-street link', r.status);
r = await call('tok_rep', { action: 'photos', client_id: 'c4' });           ok(r.status === 200 && r.out.linked === false, 'not linked reads as not linked', JSON.stringify(r.out));
r = await call('tok_rep', { action: 'suggest', client_id: 'c4' });          ok(r.status === 200 && r.out.suggestions.length === 2 && r.out.suggestions.every(s => s.match), "a rep's suggestions are same-street only", JSON.stringify(r.out && r.out.suggestions.map(s => s.id)));
r = await call('tok_rep', { action: 'suggest', client_id: 'c4', q: 'Elsewhere' }); ok(r.out && r.out.suggestions.every(s => s.match), "a rep's free-text search is ignored", JSON.stringify(r.out && r.out.suggestions.map(s => s.id)));
r = await call('tok_admin', { action: 'suggest', client_id: 'c4', q: 'Elsewhere' }); ok(r.out && r.out.suggestions.some(s => s.id === '200'), "an admin's search reaches any job", JSON.stringify(r.out && r.out.suggestions.map(s => s.id)));
r = await call('tok_rep', { action: 'photos', client_id: 'c1;drop' });      ok(r.status === 400, 'a malformed client id is rejected before any query', r.status);
console.log('\n' + (fail ? 'TEST RED' : 'TEST GREEN') + ' — ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
