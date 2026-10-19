-- owner_files.sql — Build 1381
-- APPLIED 19 Oct 2026 (Theo ran it before the HTML). Idempotent; do not treat as pending.
-- My Files (Owner Console): the reports, reviews and plans Claude makes for the owner,
-- filed in five categories that ONLY the owner's login can see. They live in the same
-- table as The Vault (owner_docs) so they share its upload / open / remove code, but:
--
--   * the five new categories are readable and writable by theo@ only (RLS below).
--     Joan and any other admin keep seeing the Vault's six categories and nothing else.
--   * the files go to photos/private/<owner email>/owner-files/..., which the existing
--     studio_private_* storage policies already fence to that one login. No storage
--     policy changes here.
--
-- Apply this BEFORE the index.html change: until it runs, the new categories fail
-- the check constraint and an upload to My Files is refused. Idempotent.

begin;

alter table public.owner_docs drop constraint if exists owner_docs_category_check;
alter table public.owner_docs add constraint owner_docs_category_check
  check (category in ('formation','insurance','license','tax','banking','other',
                      'sales','team','coaching','billing','partners'));

-- admins (theo, joan, team_profiles admins): the Vault's six categories only
drop policy if exists owner_docs_admin on public.owner_docs;
create policy owner_docs_admin on public.owner_docs
  for all
  using (public.is_cardinal_admin()
         and category in ('formation','insurance','license','tax','banking','other'))
  with check (public.is_cardinal_admin()
         and category in ('formation','insurance','license','tax','banking','other'));

-- the owner: every category, including My Files
drop policy if exists owner_docs_owner on public.owner_docs;
create policy owner_docs_owner on public.owner_docs
  for all
  using (auth.email() = 'theo@cardinalrenovations.net')
  with check (auth.email() = 'theo@cardinalrenovations.net');

commit;

-- check: both policies listed, constraint shows 11 categories
select policyname from pg_policies where schemaname = 'public' and tablename = 'owner_docs' order by 1;
