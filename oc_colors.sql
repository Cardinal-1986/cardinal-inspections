-- oc_colors.sql — the Owens Corning shingle colour catalogue.
--
-- The showroom feature ("pick a colour, see Cardinal's own roofs in it") needs
-- colour rows before photographs can hang off them. This is that half. The
-- photo side waits on Theo's 28 hand-sorted iPad folders being imported.
--
-- AUDITED FIRST, per the prime doctrine. OC colours exist NOWHERE in the app
-- as data today: all 8 "Duration" hits in index.html are placeholder text
-- inside input fields ("e.g. OC Duration in Estate Gray…") plus one Resource
-- Library article; pricing_items has 5 shingle rows and zero colour names;
-- there is no colour table. This is genuinely new, not buried.
--
-- ⚠ TWO COLUMNS ARE NOT FACTS YET, AND ARE MARKED AS SUCH
--
-- hex          — approximations eyeballed for the preview mock, NOT sampled
--                from product or from Cardinal's photographs. Good enough to
--                sort a swatch wall by family, nowhere near good enough to
--                show a homeowner and call it the colour. hex_verified stays
--                false until each one is sampled off a real roof in real
--                light, which is the whole point of the feature.
-- folder_photos— deliberately absent. The counts in the mock were invented to
--                make the preview look alive. Real counts arrive with the
--                folders; inventing them here would bake fiction into a table
--                everything downstream trusts.
--
-- Status vocabulary is a whitelist, same rule as STAGES and the ITEL verdicts:
-- widen the constraint in its own migration BEFORE anything writes a new value.
--   current        in production
--   coty           Colour of the Year (Evergreen Mist, 2026)
--   new            introduced for 2026
--   discontinued   retired; replaced_by names the successor where OC named one
--
-- Sources: OC's published Duration colour guide, the 2026 colour announcement
-- (Evergreen Mist COTY, Mountain Pine new, Gray Tweed replacing Storm Cloud),
-- and the discontinued Designer colours coverage — all supplied by Theo.
-- Spellings corrected against OC's own naming: "Sierra Gray" (not Seirra Grey)
-- and "Chateau Green" (not Chateaux Green).
--
-- REVERT:  drop table if exists public.oc_colors;

create table if not exists public.oc_colors (
  id            uuid primary key default gen_random_uuid(),
  name          text not null unique,
  hex           text,
  hex_verified  boolean not null default false,
  family        text not null check (family in ('black','grey','brown','red','green')),
  product_line  text not null check (product_line in ('duration','designer','other')),
  status        text not null default 'current'
                  check (status in ('current','coty','new','discontinued')),

  -- Where OC named a successor for a retired colour, and the nearest current
  -- colour for one that has none. Text rather than a self-FK: these point at
  -- colours that may not be catalogued yet, and a dangling name is more honest
  -- than a missing row.
  replaced_by   text,
  nearest       text,

  description   text,
  sort_order    integer not null default 100,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists oc_colors_family_idx on public.oc_colors (family);
create index if not exists oc_colors_status_idx on public.oc_colors (status);

comment on table public.oc_colors is
  'Owens Corning shingle colour catalogue for the showroom. hex values are '
  'preview approximations until hex_verified is true — do not show a customer '
  'an unverified swatch and call it the colour.';

-- ── RLS ──────────────────────────────────────────────────────────────
-- A product catalogue with no customer data in it. Everyone signed in reads;
-- admins maintain it.
alter table public.oc_colors enable row level security;

drop policy if exists oc_colors_select on public.oc_colors;
create policy oc_colors_select on public.oc_colors
  for select using (auth.role() = 'authenticated');

drop policy if exists oc_colors_write on public.oc_colors;
create policy oc_colors_write on public.oc_colors
  for all using (public.is_cardinal_admin()) with check (public.is_cardinal_admin());

-- ── the catalogue ────────────────────────────────────────────────────
insert into public.oc_colors (name, hex, family, product_line, status, replaced_by, nearest, description, sort_order) values
 ('Evergreen Mist','#6E7A69','green','designer','coty',null,'Chateau Green','Muted green with grey and earthy undertones. Greener in full sun, greyer under cloud. Suits farmhouse, Cape Cod and coastal cottage.',1),
 ('Mountain Pine','#4F5B4A','green','designer','new',null,'Chateau Green','Lush green with earthy brown and grey. New for 2026.',2),
 ('Gray Tweed','#585A58','grey','designer','new',null,'Storm Cloud','Dimensional grey with soft browns and black. Introduced as the replacement for Storm Cloud.',3),
 ('Storm Cloud','#4A4E52','grey','duration','discontinued','Gray Tweed',null,'Dark grey with blue and charcoal highlights. Was popular on modern homes.',4),
 ('Onyx Black','#232427','black','duration','current',null,null,'Deep consistent black with dimensional variation. One of the top sellers nationally.',10),
 ('Black Sable','#2E3033','black','designer','current',null,null,'Near-black with charcoal depth.',11),
 ('Midnight Plum','#3A3138','black','designer','current',null,null,'Black with a plum cast in sun.',12),
 ('Estate Gray','#63666A','grey','duration','current',null,null,'Medium grey with blue undertones. Top seller in several markets.',20),
 ('Quarry Gray','#6B6F73','grey','duration','current',null,null,'Lighter than Estate with warmer undertones. Good with mixed materials.',21),
 ('Sierra Gray','#7C7F80','grey','duration','current',null,null,'Warm grey with brown accents — bridges grey and brown. Works with stone and brick.',22),
 ('Slate Grey','#565B60','grey','other','discontinued',null,'Estate Gray','Older grey, still appearing in Cardinal''s folders.',23),
 ('Shasta White','#B9B5AC','grey','duration','current',null,null,'Light with grey accents, reflects heat. Popular in hot climates.',24),
 ('Driftwood','#8A8578','brown','duration','current',null,null,'Grey, tan and weathered wood. One of the most popular colours everywhere.',30),
 ('Brownwood','#4E4238','brown','duration','current',null,null,'Rich warm brown with natural wood variation. Complements nearly anything.',31),
 ('Teak','#5C4B3A','brown','duration','current',null,null,'Warm brown with reddish undertones and golden highlights.',32),
 ('Amber','#7A6247','brown','duration','current',null,null,'Golden-brown with honey highlights. Warm and inviting.',33),
 ('Sand Dune','#A89579','brown','duration','current',null,'Driftwood','Soft sandy tones with warm highlights. Coastal styles.',34),
 ('Sedona Canyon','#7E6350','brown','designer','current',null,null,'Canyon browns, Designer collection.',35),
 ('Aged Cedar','#6B5A47','brown','other','discontinued',null,'Teak','Warm cedar tone.',36),
 ('Desert Tan','#9A8468','brown','other','discontinued',null,'Driftwood','Light tan.',37),
 ('Summer Harvest','#8B7350','brown','other','discontinued',null,'Amber','Harvest gold-brown.',38),
 ('Desert Rose','#7C5A52','red','duration','current',null,null,'Soft pinks, sandy tans and brown accents. Mediterranean and Southwestern.',40),
 ('Terra Cotta','#8A5744','red','duration','current',null,null,'Clay-inspired oranges, reds and browns. Spanish Colonial.',41),
 ('Merlot','#5A3A38','red','designer','current',null,null,'Deep wine red, Designer collection.',42),
 ('Bourbon','#6E4E3C','red','other','discontinued',null,'Terra Cotta','Warm bourbon brown-red.',43),
 ('Aged Copper','#5E6B5C','red','designer','current',null,'Chateau Green','Verdigris copper tone, Designer collection.',44),
 ('Chateau Green','#4A5647','green','duration','current',null,null,'Green, grey and brown — aged copper or forest canopy. Craftsman and colonial.',50),
 ('Harbor Blue','#41505E','green','duration','current',null,null,'Cool blue-grey with subtle depth. Distinctive without shouting.',51),
 ('Pacific Wave','#4C5A63','green','designer','current',null,null,'Blue-grey, Designer collection.',52)
on conflict (name) do nothing;

-- ── photos per colour ────────────────────────────────────────────────
-- Theo: "Make it to where I can upload photos to each section as well."
--
-- STORAGE NEEDS NOTHING NEW, and that is worth stating so nobody adds it.
-- Photos go in the existing private `photos` bucket under an `oc-colors/`
-- prefix, exactly as Showcase uses `showcase/`. The three existing policies
-- already cover it correctly:
--
--   photos_read    bucket='photos' AND name NOT LIKE 'studio/%'
--                                  AND name NOT LIKE 'private/%'   -> readable
--   photos_write   bucket='photos' AND authenticated AND is_staff()
--                                  AND name NOT LIKE 'private/%'   -> uploadable
--   photos_delete  owner = auth.uid() OR is_admin()                -> deletable
--
-- Adding a fourth policy for this prefix would be a second mechanism beside a
-- working one, which is a bug with a delay on it. Only the metadata table is
-- genuinely missing.
create table if not exists public.oc_color_photos (
  id            uuid primary key default gen_random_uuid(),
  color_id      uuid not null references public.oc_colors(id) on delete cascade,

  -- Path inside the `photos` bucket, e.g. 'oc-colors/onyx-black/1712…jpg'.
  storage_path  text not null unique,

  -- Which Cardinal roof this actually is. The entire pitch of the showroom is
  -- "these are our roofs, not a manufacturer's brochure" — a photo that cannot
  -- name its house cannot make that claim, so the address is worth carrying
  -- even though it is nullable for bulk imports.
  project_address text,
  captured_on     date,

  caption       text,
  -- One lead image per colour drives the swatch wall. Enforced by a partial
  -- unique index rather than trusted to the UI.
  is_hero       boolean not null default false,
  sort_order    integer not null default 100,

  created_by    text not null default coalesce(auth.jwt()->>'email','system'),
  created_at    timestamptz not null default now()
);

create index if not exists oc_color_photos_color_idx
  on public.oc_color_photos (color_id, sort_order);
create unique index if not exists oc_color_photos_one_hero
  on public.oc_color_photos (color_id) where is_hero;

comment on table public.oc_color_photos is
  'Cardinal roofs by Owens Corning colour. Bytes live in the photos bucket '
  'under oc-colors/; the existing photos_read / photos_write / photos_delete '
  'policies already govern that prefix — do not add a fourth.';

alter table public.oc_color_photos enable row level security;

-- Read matches the catalogue: anyone signed in. Write is staff, not admin —
-- the whole point is that whoever is on the roof can add the photo, and
-- is_staff() is what the photos bucket itself already requires for upload.
-- Gating the row tighter than the bytes would let an upload succeed and then
-- silently fail to appear.
drop policy if exists oc_color_photos_select on public.oc_color_photos;
create policy oc_color_photos_select on public.oc_color_photos
  for select using (auth.role() = 'authenticated');

drop policy if exists oc_color_photos_insert on public.oc_color_photos;
create policy oc_color_photos_insert on public.oc_color_photos
  for insert with check (public.is_staff());

drop policy if exists oc_color_photos_update on public.oc_color_photos;
create policy oc_color_photos_update on public.oc_color_photos
  for update using (public.is_staff() or public.is_cardinal_admin());

drop policy if exists oc_color_photos_delete on public.oc_color_photos;
create policy oc_color_photos_delete on public.oc_color_photos
  for delete using (created_by = public.my_email() or public.is_cardinal_admin());

-- What the swatch wall reads: one row per colour with its lead image and count.
create view public.oc_color_wall
  with (security_invoker = true) as
  select c.*,
         (select count(*) from public.oc_color_photos p where p.color_id = c.id) as photos,
         (select p.storage_path from public.oc_color_photos p
           where p.color_id = c.id order by p.is_hero desc, p.sort_order, p.created_at
           limit 1) as hero_path
    from public.oc_colors c;

-- REVERT (photos first — the view and the FK depend on it):
--   drop view if exists public.oc_color_wall;
--   drop table if exists public.oc_color_photos;
--   drop table if exists public.oc_colors;
