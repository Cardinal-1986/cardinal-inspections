/* Build 1408 — make_commission() with a second rep, run in a REAL Postgres (PGlite, Postgres compiled to WASM).

   Loads the make_commission() definition out of a .sql file, attaches it to collections exactly as production
   does (AFTER INSERT, trigger commission_on_collection), and inserts collections against minimal tables shaped
   like the live ones (projects.checklist is TEXT, team_profiles.role, commissions' partial unique index).

       node harness_1408_sql.mjs                                  # second_rep_commission.sql -> GREEN
       node harness_1408_sql.mjs ../../../../commission_clawback.sql   # the live 1368 body -> RED (control)

   Needs @electric-sql/pglite (npm install @electric-sql/pglite in the git-ignored node_modules). Missing is a
   usage failure (exit 2), never a pass. Theo, 26 Oct 2026: "I'm paying Jacob 10% of total cost during the
   training." / "I will never pay myself a commission."                                                        */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FILE = process.argv[2] || path.resolve(HERE, '../../../../second_rep_commission.sql');
let PGlite;
try { ({ PGlite } = await import('@electric-sql/pglite')); }
catch (e) { console.error('harness_1408_sql: @electric-sql/pglite is not installed — ' + e.message); process.exit(2); }

let pass = 0, fail = 0;
const ok = (l, c, n) => { if (c) { pass++; console.log('  PASS ' + l); } else { fail++; console.log('  FAIL ' + l + (n !== undefined ? '  -> ' + n : '')); } };

const sql = fs.readFileSync(FILE, 'utf8');
const m = sql.match(/create or replace function public\.make_commission\(\)[\s\S]{0,6000}?\$(function)?\$;/i);
if (!m) { console.error('harness_1408_sql: no make_commission() in ' + FILE); process.exit(2); }

const THEO = 'theo@cardinalrenovations.net', JACOB = 'jacob@cardinalrenovations.net',
      JOAN = 'joan@cardinalrenovations.net', CURTIS = 'curtis@cardinalrenovations.net',
      REPA = 'rep.a@example.test';
const db = new PGlite();
await db.exec(`
  create table team_profiles (email text primary key, role text);
  insert into team_profiles values ('${THEO}','admin'),('${JOAN}','admin'),('${CURTIS}','production'),
                                   ('${JACOB}','sales'),('${REPA}','sales');
  create table projects (id text primary key, name text, sales_rep text, checklist text);
  create table collections (id serial primary key, project_id text, amount numeric, type text default 'deposit',
                            keep_commission boolean not null default false, created_by text);
  create table commissions (id serial primary key, collection_id int, project_id text, project_name text,
                            rep_email text, amount numeric, rate_pct numeric, basis text, status text,
                            created_by text, created_at timestamptz default clock_timestamp());
  create unique index on commissions (collection_id) where collection_id is not null;
`);
await db.exec(m[0]);
await db.exec(`create trigger commission_on_collection after insert on collections
               for each row execute function make_commission();`);

const ck = a => JSON.stringify({ lead: { assigned: a } });
async function job(id, rep, checklist) {
  await db.query('insert into projects values ($1,$2,$3,$4)', [id, 'Job ' + id, rep, checklist]);
}
async function collect(id, amt) {
  try { await db.query('insert into collections (project_id, amount) values ($1,$2)', [id, amt]); return null; }
  catch (e) { return e.message; }
}
const comms = async id => (await db.query('select rep_email, amount::float as amount, rate_pct::float as rate from commissions where project_id = $1 order by id', [id])).rows;

console.log('make_commission() from ' + path.basename(FILE));
await job('t1', THEO, ck([THEO, JACOB]));
await collect('t1', 1000);
let r = await comms('t1');
ok('Theo primary + Jacob second -> one commission for Jacob, $100 at 10%',
   r.length === 1 && r[0].rep_email === JACOB && r[0].amount === 100 && r[0].rate === 10, JSON.stringify(r));
await collect('t1', -200);
r = await comms('t1');
ok('a refund on that job takes 10% back from Jacob (1368 rule)',
   r.length === 2 && r[1].rep_email === JACOB && r[1].amount === -20, JSON.stringify(r));

await job('r1', REPA, ck([REPA, JACOB]));
await collect('r1', 1000);
r = await comms('r1');
ok('rep primary + Jacob second -> the primary only (unchanged)', r.length === 1 && r[0].rep_email === REPA && r[0].amount === 100, JSON.stringify(r));

await job('n1', THEO, ck([THEO]));
await collect('n1', 1000);
ok('Theo job, no second rep -> no commission (unchanged)', (await comms('n1')).length === 0);

await job('ts', REPA, ck([REPA, THEO]));
await collect('ts', 1000);
r = await comms('ts');
ok('Theo as SECOND under a rep primary -> the primary gets the 10%, Theo nothing', r.length === 1 && r[0].rep_email === REPA, JSON.stringify(r));

await job('tt', THEO, ck([CURTIS, THEO]));
await collect('tt', 1000);
ok('Theo as second on an owner job -> no commission ("I will never pay myself a commission")', (await comms('tt')).length === 0);

await job('pc', THEO, ck([THEO, CURTIS]));
await collect('pc', 1000);
ok('a non-sales second rep (production) earns nothing', (await comms('pc')).length === 0);

await job('jn', null, ck([JOAN, JACOB]));
await collect('jn', 500);
r = await comms('jn');
ok('no sales_rep, Joan (admin) primary + Jacob second -> Jacob, $50', r.length === 1 && r[0].rep_email === JACOB && r[0].amount === 50, JSON.stringify(r));

await job('bad', THEO, '{not json');
const err = await collect('bad', 100);
ok('a malformed checklist never blocks the collection', err === null, err);
ok('...and books nothing', (await comms('bad')).length === 0);

/* ---------- RLS: the second rep reads the job's rows; a rep not on the job does not ----------
   Policies come out of second_rep_rls.sql. With --revert they come out of that file's REVERT block instead,
   which is the live state as read on 26 Oct — the negative control. my_email() is the production body
   (auth.jwt() ->> 'email'), with auth.jwt() reading request.jwt.claims the way PostgREST sets it. */
const REVERT = process.argv.includes('--revert');
const RLS_FILE = process.argv.find((a, i) => i > 2 && a.endsWith('.sql')) || path.resolve(HERE, '../../../../second_rep_rls.sql');
console.log('\nRLS from ' + path.basename(RLS_FILE) + (REVERT ? ' (REVERT block = live 26 Oct)' : ''));
try {
  let rls = fs.readFileSync(RLS_FILE, 'utf8');
  if (REVERT) {
    const a = rls.indexOf('-- REVERT-BEGIN'), b = rls.indexOf('-- REVERT-END');
    if (a < 0 || b < 0) throw new Error('no REVERT block');
    rls = rls.slice(a, b).split('\n').map(l => l.replace(/^-- ?/, '')).join('\n').replace(/^drop function if exists public\.project_has_rep[^\n]*$/m, '');
  }
  const fnHas = rls.match(/create or replace function public\.project_has_rep\([\s\S]{0,1200}?\$\$;/i);
  const pols = (name) => { const m2 = rls.match(new RegExp('create policy ' + name + ' on public\\.\\w+[\\s\\S]*?\\);(?=\\s*\\n)', 'i')); if (!m2) throw new Error('no policy ' + name); return m2[0]; };
  const fnSee = rls.match(/create or replace function public\.can_see_claim\(cid uuid\)[\s\S]{0,1500}?\$function\$;/i);
  if (!fnSee) throw new Error('no can_see_claim()');
  const R = new PGlite();
  await R.exec(`
    create schema auth;
    create function auth.jwt() returns jsonb language sql stable as $$ select nullif(current_setting('request.jwt.claims', true), '')::jsonb $$;
    create function my_email() returns text language sql stable as $$ select auth.jwt() ->> 'email' $$;
    create function is_full_access() returns boolean language sql stable as $$ select my_email() in ('${THEO}','${JOAN}') $$;
    create function is_field() returns boolean language sql stable as $$ select false $$;
    create function is_cardinal_admin() returns boolean language sql stable as $$ select my_email() in ('${THEO}','${JOAN}') $$;
    create function project_assigned_rep(ck text) returns text language sql immutable as $$
      select case when ck is null or ck = '' then null else (ck::jsonb #>> '{lead,assigned,0}') end $$;
    create table projects (id text primary key, name text, sales_rep text, created_by text, checklist text);
    create table commissions (id serial primary key, collection_id int, status text);
    create table collections (id serial primary key, project_id text, amount numeric, created_by text, created_at timestamptz default now());
    create table contracts (id serial primary key, project_id text, created_by text);
    create table insurance_claims (id uuid primary key, project_id text, created_by text);
    create table claim_notes (id serial primary key, claim_id uuid, body text);
  `);
  if (fnHas) await R.exec(fnHas[0]);
  for (const p of ['projects_select', 'collections_select', 'contracts_select']) await R.exec(pols(p));
  await R.exec(fnSee[0].replace(/security definer/i, ''));   /* PGlite runs one role; definer-ness is not what is under test */
  await R.exec(`create policy claim_notes_select on public.claim_notes as permissive for select to public using (can_see_claim(claim_id));`);
  await R.exec(`
    insert into projects values ('j1','Owner job','${THEO}','${THEO}','${ck([THEO, JACOB]).replace(/'/g, "''")}');
    insert into collections (project_id, amount, created_by) values ('j1', 1000, '${JOAN}');
    insert into contracts (project_id, created_by) values ('j1', '${THEO}');
    insert into insurance_claims values ('00000000-0000-0000-0000-000000000001','j1','${THEO}');
    insert into claim_notes (claim_id, body) values ('00000000-0000-0000-0000-000000000001','note');
    create role app_user nologin;
    grant usage on schema public, auth to app_user;
    grant select on all tables in schema public to app_user;
    alter table projects enable row level security; alter table collections enable row level security;
    alter table contracts enable row level security; alter table claim_notes enable row level security;
    alter table insurance_claims enable row level security;
    create policy ic_all on insurance_claims for select to public using (true);
  `);
  const as = async (em, table) => {
    await R.exec(`reset role; set request.jwt.claims = '${JSON.stringify({ email: em })}'; set role app_user;`);
    const n = (await R.query(`select count(*)::int as n from ${table}`)).rows[0].n;
    await R.exec('reset role;');
    return n;
  };
  for (const t of ['projects', 'collections', 'contracts', 'claim_notes']) {
    ok('second rep (Jacob) can read the job\'s ' + t + ' row', (await as(JACOB, t)) === 1);
    ok('a rep NOT on the job cannot read ' + t, (await as(REPA, t)) === 0);
  }
  ok('the primary still reads collections (sales_rep / assigned[0])', (await as(THEO, 'collections')) === 1);
} catch (e) { ok('RLS section ran', false, e && e.message); }

console.log('\n' + (fail ? 'RED' : 'GREEN') + ' — ' + pass + ' passed, ' + fail + ' failed  (' + path.basename(FILE) + ')');
process.exit(fail ? 1 : 0);
