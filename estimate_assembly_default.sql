-- estimate_assembly_default.sql — Build 1139. A per-user "default" assembly.
--
-- Adds one boolean to estimate_assemblies (build 1098). When a staff member
-- stars one of THEIR saved assemblies, it pins to the top of the +Assembly
-- picker as their default — one tap to drop into any estimate. Per user:
-- each person's own default, synced across their devices.
--
-- APPLY BEFORE deploying the 1139 index.html. The app degrades gracefully if
-- the column is absent (the star just no-ops with a toast). Idempotent.
--
-- No new policy needed: ea_update already lets a user update their own rows
-- (is_cardinal_admin() OR created_by = my_email()), which is exactly the write
-- this feature makes. "One default per user" is enforced app-side (the star
-- clears the user's other defaults before setting the new one).

alter table public.estimate_assemblies
  add column if not exists is_default boolean not null default false;

-- speeds the "find my current default to clear it" write; harmless if it exists
create index if not exists estimate_assemblies_default_idx
  on public.estimate_assemblies (created_by) where is_default;
