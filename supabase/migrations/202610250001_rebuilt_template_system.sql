-- ============================================================================
-- Rebuilt template system.
-- Forward-only migration. Requires the earlier applied migrations, in
-- particular 202610230003 (associations + private.is_associated_with) and
-- 202610240001 (templates backend, which this replaces).
--
-- Apply through the authorized migration workflow to project kwmakeexlzjdhjtkefvh.
--
-- What changes:
--   * user_profiles gains `address` and `business_email` (nullable -> existing
--     rows keep working).
--   * The prototype `templates` / `template_saves` / `template_downloads` tables
--     and their RPCs are replaced by a spec-driven design:
--       designer_templates  - manufacturer-authored, layout JSON + text + palette
--       template_shares     - per-retailer send state (sent_at / seen_at)
--       retailer_saved_templates - retailer bookmarks
--       template_downloads  - real download log
--   * A retailer only ever sees a template when they are ACTIVE-ly associated
--     with its manufacturer AND it is either shared to them or published, so
--     unlinking a retailer cuts off sent + published templates in RLS.
--   * Atomic SECURITY DEFINER RPCs: save / create+send / create+publish /
--     publish|unpublish / send / mark seen / record download / stats.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Profile columns
-- ---------------------------------------------------------------------------
alter table public.user_profiles
  add column if not exists address text,
  add column if not exists business_email text;

-- ---------------------------------------------------------------------------
-- 2. Retire the prototype objects that depended on public.templates
-- ---------------------------------------------------------------------------
drop function if exists public.record_template_download(uuid);
drop function if exists public.get_manufacturer_template_stats();

-- Storage policies that referenced the old templates table.
drop policy if exists "Associated retailers read published template assets" on storage.objects;

drop table if exists public.template_downloads;
drop table if exists public.template_saves;
drop table if exists public.templates;

-- ---------------------------------------------------------------------------
-- 3. Catalog metadata (ordering / badge source of truth lives in code; this
--    table mirrors it for reporting and future admin edits)
-- ---------------------------------------------------------------------------
create table if not exists public.template_categories (
  key text primary key,
  label text not null,
  kind text not null check (kind in ('festival', 'season')),
  occurs_on date,
  emblem text,
  sort_index int not null default 0
);

-- Seed the catalog so FK/designer_templates.category_key resolves and the save
-- RPC's existence check passes. Mirrors src/lib/templateEngine/catalog.ts.
-- Idempotent: re-running refreshes label/kind/date/emblem/sort for existing keys.
insert into public.template_categories (key, label, kind, occurs_on, emblem, sort_index) values
  ('diwali', 'Diwali', 'festival', '2026-11-08', 'diya', 0),
  ('dhanteras', 'Dhanteras', 'festival', '2026-11-06', 'diya', 1),
  ('bhaiDooj', 'Bhai Dooj', 'festival', '2026-11-10', 'rangoli', 2),
  ('chhath', 'Chhath', 'festival', '2026-11-15', 'sun', 3),
  ('guruNanak', 'Guru Nanak Jayanti', 'festival', '2026-11-24', 'sparkles', 4),
  ('christmas', 'Christmas', 'festival', '2026-12-25', 'lantern', 5),
  ('newYear', 'New Year', 'festival', '2027-01-01', 'sparkles', 6),
  ('lohri', 'Lohri', 'festival', '2027-01-13', 'sun', 7),
  ('makarSankranti', 'Makar Sankranti', 'festival', '2027-01-14', 'kite', 8),
  ('pongal', 'Pongal', 'festival', '2027-01-15', 'sun', 9),
  ('republicDay', 'Republic Day', 'festival', '2027-01-26', 'flag', 10),
  ('vasantPanchami', 'Vasant Panchami', 'festival', '2027-02-18', 'flowers', 11),
  ('valentines', 'Valentine''s Day', 'festival', '2027-02-14', 'flowers', 12),
  ('mahaShivratri', 'Maha Shivratri', 'festival', '2027-02-24', 'sparkles', 13),
  ('holi', 'Holi', 'festival', '2027-03-22', 'colorSplash', 14),
  ('goodFriday', 'Easter / Good Friday', 'festival', '2027-03-26', 'bunting', 15),
  ('ugadi', 'Gudi Padwa / Ugadi', 'festival', '2027-03-28', 'sparkles', 16),
  ('ramNavami', 'Ram Navami', 'festival', '2027-04-06', 'sparkles', 17),
  ('hanumanJayanti', 'Hanuman Jayanti', 'festival', '2027-04-13', 'sparkles', 18),
  ('eid', 'Eid', 'festival', '2027-03-10', 'crescentStar', 19),
  ('baisakhi', 'Baisakhi', 'festival', '2027-04-14', 'sun', 20),
  ('womensDay', 'Women''s Day', 'festival', '2027-03-08', 'flowers', 21),
  ('gudi', 'Mahavir Jayanti', 'festival', '2027-04-20', 'sparkles', 22),
  ('rakshaBandhan', 'Raksha Bandhan', 'festival', '2027-08-18', 'rangoli', 23),
  ('janmashtami', 'Janmashtami', 'festival', '2027-09-03', 'sparkles', 24),
  ('independenceDay', 'Independence Day', 'festival', '2027-08-15', 'flag', 25),
  ('onam', 'Onam', 'festival', '2027-09-08', 'flowers', 26),
  ('ganeshChaturthi', 'Ganesh Chaturthi', 'festival', '2027-09-07', 'diya', 27),
  ('navratri', 'Navratri', 'festival', '2027-10-02', 'sparkles', 28),
  ('durgaPuja', 'Durga Puja', 'festival', '2027-10-07', 'bunting', 29),
  ('dussehra', 'Dussehra', 'festival', '2027-10-15', 'flag', 30),
  ('karwaChauth', 'Karwa Chauth', 'festival', '2027-10-28', 'crescentStar', 31),
  ('gandhiJayanti', 'Gandhi Jayanti', 'festival', '2027-10-02', 'flag', 32),
  ('winter', 'Winter', 'season', '2026-12-01', 'snowflake', 33),
  ('summer', 'Summer', 'season', '2027-03-20', 'sun', 34),
  ('monsoon', 'Monsoon', 'season', '2027-06-15', 'rain', 35),
  ('spring', 'Spring', 'season', '2027-02-15', 'flowers', 36),
  ('autumn', 'Autumn', 'season', '2027-09-23', 'leaves', 37),
  ('wedding', 'Wedding Season', 'season', '2026-11-25', 'sparkles', 38),
  ('festiveSale', 'Festive Sale', 'season', '2026-11-28', 'lantern', 39),
  ('endOfSeason', 'End of Season Sale', 'season', '2027-01-05', 'bunting', 40),
  ('newArrivals', 'New Arrivals', 'season', '2026-12-26', 'sparkles', 41),
  ('grandOpening', 'Grand Opening', 'season', '2027-02-01', 'bunting', 42)
on conflict (key) do update set
  label = excluded.label,
  kind = excluded.kind,
  occurs_on = excluded.occurs_on,
  emblem = excluded.emblem,
  sort_index = excluded.sort_index;

-- ---------------------------------------------------------------------------
-- 4. Manufacturer-authored templates (spec + editable text + layout JSON)
-- ---------------------------------------------------------------------------
create table if not exists public.designer_templates (
  id uuid primary key default gen_random_uuid(),
  manufacturer_user_id uuid not null references auth.users(id) on delete cascade,
  category_key text not null references public.template_categories(key),
  title text not null default 'Untitled template' check (length(trim(title)) between 1 and 200),
  canvas_kind text not null check (canvas_kind in ('post', 'story')),
  layout_id text not null,
  palette_id text not null,
  variant int not null default 0,
  headline text not null default '' check (length(headline) <= 200),
  subheadline text not null default '' check (length(subheadline) <= 300),
  offer_text text not null default '' check (length(offer_text) <= 120),
  cta_text text not null default '' check (length(cta_text) <= 120),
  -- Full TemplateSpec including saved placeholder positions.
  spec jsonb not null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists designer_templates_mfr_idx on public.designer_templates (manufacturer_user_id, updated_at desc);
create index if not exists designer_templates_published_idx on public.designer_templates (category_key) where published_at is not null;

create table if not exists public.template_shares (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.designer_templates(id) on delete cascade,
  retailer_user_id uuid not null references auth.users(id) on delete cascade,
  sent_at timestamptz not null default now(),
  seen_at timestamptz,
  unique (template_id, retailer_user_id)
);
create index if not exists template_shares_retailer_idx on public.template_shares (retailer_user_id, sent_at desc);

create table if not exists public.retailer_saved_templates (
  retailer_user_id uuid not null references auth.users(id) on delete cascade,
  template_id uuid not null references public.designer_templates(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (retailer_user_id, template_id)
);

create table if not exists public.template_downloads (
  id uuid primary key default gen_random_uuid(),
  retailer_user_id uuid not null references auth.users(id) on delete cascade,
  template_id uuid not null references public.designer_templates(id) on delete cascade,
  canvas_kind text not null check (canvas_kind in ('post', 'story')),
  created_at timestamptz not null default now()
);
create index if not exists template_downloads_retailer_idx on public.template_downloads (retailer_user_id, created_at desc);
create index if not exists template_downloads_template_idx on public.template_downloads (template_id);

-- updated_at maintenance
drop trigger if exists designer_templates_touch_updated_at on public.designer_templates;
create trigger designer_templates_touch_updated_at before update on public.designer_templates
  for each row execute function private.touch_updated_at();

-- ---------------------------------------------------------------------------
-- 5. Row Level Security
-- ---------------------------------------------------------------------------
alter table public.template_categories enable row level security;
alter table public.designer_templates enable row level security;
alter table public.template_shares enable row level security;
alter table public.retailer_saved_templates enable row level security;
alter table public.template_downloads enable row level security;

revoke all on public.template_categories, public.designer_templates, public.template_shares,
  public.retailer_saved_templates, public.template_downloads from anon;

-- Catalog is read-only for signed-in users.
drop policy if exists "Authenticated read template categories" on public.template_categories;
create policy "Authenticated read template categories" on public.template_categories
  for select to authenticated using (true);

-- A retailer can only ever see a template when they are STILL actively
-- associated with its manufacturer AND it was shared to them or published.
-- (is_associated_with checks removed_at is null, so unlinking cuts access.)

drop policy if exists "Manufacturers own designer templates" on public.designer_templates;
create policy "Manufacturers own designer templates" on public.designer_templates
  for all to authenticated
  using (manufacturer_user_id = (select auth.uid()))
  with check (
    manufacturer_user_id = (select auth.uid())
    and exists (select 1 from public.user_profiles p
                where p.user_id = (select auth.uid()) and p.role = 'manufacturer')
  );

drop policy if exists "Retailers read shared or published templates" on public.designer_templates;
create policy "Retailers read shared or published templates" on public.designer_templates
  for select to authenticated
  using (
    private.is_associated_with(manufacturer_user_id)
    and (
      published_at is not null
      or exists (
        select 1 from public.template_shares s
        where s.template_id = designer_templates.id
          and s.retailer_user_id = (select auth.uid())
      )
    )
  );

-- Shares: manufacturers see shares of their own templates; retailers see their own.
drop policy if exists "Manufacturers read own shares" on public.template_shares;
create policy "Manufacturers read own shares" on public.template_shares
  for select to authenticated
  using (exists (select 1 from public.designer_templates t
                 where t.id = template_id and t.manufacturer_user_id = (select auth.uid())));

drop policy if exists "Retailers read own shares" on public.template_shares;
create policy "Retailers read own shares" on public.template_shares
  for select to authenticated
  using (retailer_user_id = (select auth.uid()));

drop policy if exists "Retailers mark own shares seen" on public.template_shares;
create policy "Retailers mark own shares seen" on public.template_shares
  for update to authenticated
  using (retailer_user_id = (select auth.uid()))
  with check (retailer_user_id = (select auth.uid()));

-- Bookmarks: owner-only, and only for a template the retailer can currently see.
drop policy if exists "Retailers read own bookmarks" on public.retailer_saved_templates;
create policy "Retailers read own bookmarks" on public.retailer_saved_templates
  for select to authenticated using (retailer_user_id = (select auth.uid()));

drop policy if exists "Retailers toggle own bookmarks" on public.retailer_saved_templates;
create policy "Retailers toggle own bookmarks" on public.retailer_saved_templates
  for insert to authenticated with check (
    retailer_user_id = (select auth.uid())
    and exists (select 1 from public.designer_templates t where t.id = template_id)
  );

drop policy if exists "Retailers remove own bookmarks" on public.retailer_saved_templates;
create policy "Retailers remove own bookmarks" on public.retailer_saved_templates
  for delete to authenticated using (retailer_user_id = (select auth.uid()));

-- Downloads: retailers read their own; writes happen only via record_download().
drop policy if exists "Retailers read own downloads" on public.template_downloads;
create policy "Retailers read own downloads" on public.template_downloads
  for select to authenticated using (retailer_user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- 6. Storage: let a retailer read the private logos of manufacturers they are
--    actively linked to (needed to render a manufacturer's logo inside a shared
--    or published template). Buckets stay private.
-- ---------------------------------------------------------------------------
drop policy if exists "Linked retailers read manufacturer profile assets" on storage.objects;
create policy "Linked retailers read manufacturer profile assets" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'profile-assets'
    and (storage.foldername(name))[1] in (
      select a.manufacturer_user_id::text
      from public.manufacturer_retailer_associations a
      where a.retailer_user_id = (select auth.uid()) and a.removed_at is null
    )
  );


-- ---------------------------------------------------------------------------
-- 7. Atomic SECURITY DEFINER RPCs (set search_path, authenticated-only,
--    role validated inside). Multi-step actions run in one function call, so
--    save-then-send / save-then-publish are all-or-nothing.
-- ---------------------------------------------------------------------------

-- Shared upsert used directly and by the composite actions.
create or replace function private.upsert_designer_template(
  p_template_id uuid,
  p_category_key text,
  p_canvas_kind text,
  p_title text,
  p_layout_id text,
  p_palette_id text,
  p_variant int,
  p_headline text,
  p_subheadline text,
  p_offer_text text,
  p_cta_text text,
  p_spec jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  out_id uuid;
begin
  if uid is null or not exists (
    select 1 from public.user_profiles where user_id = uid and role = 'manufacturer'
  ) then
    raise exception 'Manufacturer access is required.' using errcode = '42501';
  end if;
  if p_canvas_kind not in ('post', 'story') then
    raise exception 'Canvas must be post or story.' using errcode = '22023';
  end if;
  if p_spec is null or jsonb_typeof(p_spec) <> 'object' then
    raise exception 'Template spec is required.' using errcode = '22023';
  end if;
  if not exists (select 1 from public.template_categories where key = p_category_key) then
    raise exception 'Unknown template category.' using errcode = '22023';
  end if;

  if p_template_id is null then
    insert into public.designer_templates (
      manufacturer_user_id, category_key, title, canvas_kind, layout_id, palette_id,
      variant, headline, subheadline, offer_text, cta_text, spec
    ) values (
      uid, p_category_key, coalesce(nullif(trim(p_title), ''), 'Untitled template'),
      p_canvas_kind, p_layout_id, p_palette_id, coalesce(p_variant, 0),
      coalesce(p_headline, ''), coalesce(p_subheadline, ''), coalesce(p_offer_text, ''),
      coalesce(p_cta_text, ''), p_spec
    )
    returning id into out_id;
  else
    update public.designer_templates set
      category_key = p_category_key,
      title = coalesce(nullif(trim(p_title), ''), title),
      canvas_kind = p_canvas_kind,
      layout_id = p_layout_id,
      palette_id = p_palette_id,
      variant = coalesce(p_variant, variant),
      headline = coalesce(p_headline, headline),
      subheadline = coalesce(p_subheadline, subheadline),
      offer_text = coalesce(p_offer_text, offer_text),
      cta_text = coalesce(p_cta_text, cta_text),
      spec = p_spec
    where id = p_template_id and manufacturer_user_id = uid
    returning id into out_id;
    if out_id is null then
      raise exception 'Template not found or not owned by you.' using errcode = 'P0002';
    end if;
  end if;
  return out_id;
end;
$$;
revoke all on function private.upsert_designer_template(uuid,text,text,text,text,text,int,text,text,text,text,jsonb) from public, anon;
grant execute on function private.upsert_designer_template(uuid,text,text,text,text,text,int,text,text,text,text,jsonb) to authenticated;

-- (a) SAVE only.
create or replace function public.save_designer_template(
  p_template_id uuid, p_category_key text, p_canvas_kind text, p_title text,
  p_layout_id text, p_palette_id text, p_variant int, p_headline text,
  p_subheadline text, p_offer_text text, p_cta_text text, p_spec jsonb
) returns uuid
language sql security definer set search_path = '' as $$
  select private.upsert_designer_template(p_template_id, p_category_key, p_canvas_kind, p_title,
    p_layout_id, p_palette_id, p_variant, p_headline, p_subheadline, p_offer_text, p_cta_text, p_spec);
$$;
revoke all on function public.save_designer_template(uuid,text,text,text,text,text,int,text,text,text,text,jsonb) from public, anon;
grant execute on function public.save_designer_template(uuid,text,text,text,text,text,int,text,text,text,text,jsonb) to authenticated;

-- Send to retailers (validates every target is an ACTIVE association). Re-send
-- only bumps sent_at (no duplicate rows).
create or replace function public.send_designer_template(p_template_id uuid, p_retailer_ids uuid[])
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  missing int;
  n int;
begin
  if uid is null or not exists (
    select 1 from public.user_profiles where user_id = uid and role = 'manufacturer'
  ) then
    raise exception 'Manufacturer access is required.' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.designer_templates
    where id = p_template_id and manufacturer_user_id = uid
  ) then
    raise exception 'Template not found or not owned by you.' using errcode = 'P0002';
  end if;
  if p_retailer_ids is null or array_length(p_retailer_ids, 1) is null then
    raise exception 'Select at least one retailer.' using errcode = '22023';
  end if;

  select count(*) into missing
  from unnest(p_retailer_ids) as r(retailer_id)
  where not exists (
    select 1 from public.manufacturer_retailer_associations a
    where a.manufacturer_user_id = uid and a.retailer_user_id = r.retailer_id
      and a.removed_at is null
  );
  if missing > 0 then
    raise exception 'One or more retailers are not in your active network.' using errcode = '42501';
  end if;

  insert into public.template_shares (template_id, retailer_user_id, sent_at, seen_at)
  select p_template_id, r.retailer_id, now(), null
  from unnest(p_retailer_ids) as r(retailer_id)
  on conflict (template_id, retailer_user_id) do update set sent_at = excluded.sent_at;
  get diagnostics n = row_count;
  return array_length(p_retailer_ids, 1);
end;
$$;
revoke all on function public.send_designer_template(uuid, uuid[]) from public, anon;
grant execute on function public.send_designer_template(uuid, uuid[]) to authenticated;

-- Publish / unpublish to the retailer landing page.
create or replace function public.publish_designer_template(p_template_id uuid, p_publish boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then raise exception 'Authentication required.' using errcode = '42501'; end if;
  update public.designer_templates
  set published_at = case when p_publish then now() else null end
  where id = p_template_id and manufacturer_user_id = uid;
  if not found then
    raise exception 'Template not found or not owned by you.' using errcode = 'P0002';
  end if;
end;
$$;
revoke all on function public.publish_designer_template(uuid, boolean) from public, anon;
grant execute on function public.publish_designer_template(uuid, boolean) to authenticated;

-- (b) Save THEN send, atomically.
create or replace function public.create_and_send_designer_template(
  p_template_id uuid, p_category_key text, p_canvas_kind text, p_title text,
  p_layout_id text, p_palette_id text, p_variant int, p_headline text,
  p_subheadline text, p_offer_text text, p_cta_text text, p_spec jsonb, p_retailer_ids uuid[]
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  saved_id uuid;
begin
  saved_id := private.upsert_designer_template(p_template_id, p_category_key, p_canvas_kind, p_title,
    p_layout_id, p_palette_id, p_variant, p_headline, p_subheadline, p_offer_text, p_cta_text, p_spec);
  perform public.send_designer_template(saved_id, p_retailer_ids);
  return saved_id;
end;
$$;
revoke all on function public.create_and_send_designer_template(uuid,text,text,text,text,text,int,text,text,text,text,jsonb,uuid[]) from public, anon;
grant execute on function public.create_and_send_designer_template(uuid,text,text,text,text,text,int,text,text,text,text,jsonb,uuid[]) to authenticated;

-- (c) Save THEN publish, atomically.
create or replace function public.create_and_publish_designer_template(
  p_template_id uuid, p_category_key text, p_canvas_kind text, p_title text,
  p_layout_id text, p_palette_id text, p_variant int, p_headline text,
  p_subheadline text, p_offer_text text, p_cta_text text, p_spec jsonb
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  saved_id uuid;
begin
  saved_id := private.upsert_designer_template(p_template_id, p_category_key, p_canvas_kind, p_title,
    p_layout_id, p_palette_id, p_variant, p_headline, p_subheadline, p_offer_text, p_cta_text, p_spec);
  update public.designer_templates set published_at = now()
    where id = saved_id and published_at is null;
  return saved_id;
end;
$$;
revoke all on function public.create_and_publish_designer_template(uuid,text,text,text,text,text,int,text,text,text,text,jsonb) from public, anon;
grant execute on function public.create_and_publish_designer_template(uuid,text,text,text,text,text,int,text,text,text,text,jsonb) to authenticated;

-- Retailer: mark a shared template as seen (clears the new badge).
create or replace function public.mark_designer_template_seen(p_template_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.template_shares
  set seen_at = now()
  where template_id = p_template_id
    and retailer_user_id = auth.uid()
    and seen_at is null;
$$;
revoke all on function public.mark_designer_template_seen(uuid) from public, anon;
grant execute on function public.mark_designer_template_seen(uuid) to authenticated;

-- Retailer: record a real download (replaces the old stub). Only allowed for a
-- template the retailer can actually see right now.
create or replace function public.record_designer_template_download(
  p_template_id uuid, p_canvas_kind text
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null or not exists (
    select 1 from public.user_profiles where user_id = uid and role = 'retailer'
  ) then
    raise exception 'Retailer access is required.' using errcode = '42501';
  end if;
  if p_canvas_kind not in ('post', 'story') then
    raise exception 'Canvas must be post or story.' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.designer_templates t
    where t.id = p_template_id
      and private.is_associated_with(t.manufacturer_user_id)
      and (t.published_at is not null or exists (
        select 1 from public.template_shares s
        where s.template_id = t.id and s.retailer_user_id = uid
      ))
  ) then
    raise exception 'This template is not available.' using errcode = 'P0002';
  end if;
  insert into public.template_downloads (retailer_user_id, template_id, canvas_kind)
  values (uid, p_template_id, p_canvas_kind);
end;
$$;
revoke all on function public.record_designer_template_download(uuid, text) from public, anon;
grant execute on function public.record_designer_template_download(uuid, text) to authenticated;

-- Retailer feed: shared or published templates of active manufacturers, with
-- manufacturer branding resolved for auto-fill (business name / logo / contact).
create or replace function public.list_received_templates()
returns table (
  template_id uuid,
  manufacturer_user_id uuid,
  mfr_business_name text,
  mfr_logo_path text,
  mfr_phone text,
  mfr_email text,
  category_key text,
  canvas_kind text,
  spec jsonb,
  headline text,
  subheadline text,
  offer_text text,
  cta_text text,
  sent_at timestamptz,
  seen_at timestamptz,
  is_published boolean,
  is_saved boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then raise exception 'Authentication required.' using errcode = '42501'; end if;
  return query
  select
    t.id,
    t.manufacturer_user_id,
    mp.business_name,
    mp.business_logo_path,
    mp.contact_number,
    coalesce(mp.business_email, mp.email),
    t.category_key,
    t.canvas_kind,
    t.spec,
    t.headline,
    t.subheadline,
    t.offer_text,
    t.cta_text,
    s.sent_at,
    s.seen_at,
    (t.published_at is not null) as is_published,
    (rb.retailer_user_id is not null) as is_saved
  from public.designer_templates t
  join public.user_profiles mp on mp.user_id = t.manufacturer_user_id and mp.role = 'manufacturer'
  left join public.template_shares s
    on s.template_id = t.id and s.retailer_user_id = uid
  left join public.retailer_saved_templates rb
    on rb.template_id = t.id and rb.retailer_user_id = uid
  where private.is_associated_with(t.manufacturer_user_id)
    and (t.published_at is not null or s.retailer_user_id = uid)
  order by coalesce(s.sent_at, t.published_at) desc nulls last, t.updated_at desc;
end;
$$;
revoke all on function public.list_received_templates() from public, anon;
grant execute on function public.list_received_templates() to authenticated;

-- Manufacturer "Saved Templates" list, with send count + publication + stats.
create or replace function public.list_manufacturer_templates()
returns table (
  id uuid,
  category_key text,
  title text,
  canvas_kind text,
  spec jsonb,
  headline text,
  subheadline text,
  offer_text text,
  cta_text text,
  published boolean,
  sent_count bigint,
  downloads bigint,
  saves bigint,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null or not exists (
    select 1 from public.user_profiles where user_id = uid and role = 'manufacturer'
  ) then
    raise exception 'Manufacturer access is required.' using errcode = '42501';
  end if;
  return query
  select
    t.id, t.category_key, t.title, t.canvas_kind, t.spec, t.headline, t.subheadline,
    t.offer_text, t.cta_text,
    (t.published_at is not null) as published,
    (select count(*) from public.template_shares s where s.template_id = t.id) as sent_count,
    (select count(*) from public.template_downloads d where d.template_id = t.id) as downloads,
    (select count(*) from public.retailer_saved_templates b where b.template_id = t.id) as saves,
    t.updated_at
  from public.designer_templates t
  where t.manufacturer_user_id = uid
  order by t.updated_at desc;
end;
$$;
revoke all on function public.list_manufacturer_templates() from public, anon;
grant execute on function public.list_manufacturer_templates() to authenticated;

-- Who has already received a given template (for the manufacturer's send dialog).
create or replace function public.get_template_recipients(p_template_id uuid)
returns table (retailer_user_id uuid, business_name text, city text, logo_path text, sent_at timestamptz, seen_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null or not exists (
    select 1 from public.designer_templates
    where id = p_template_id and manufacturer_user_id = uid
  ) then
    raise exception 'Template not found or not owned by you.' using errcode = '42501';
  end if;
  return query
  select s.retailer_user_id, p.business_name, p.city, p.business_logo_path, s.sent_at, s.seen_at
  from public.template_shares s
  join public.user_profiles p on p.user_id = s.retailer_user_id and p.role = 'retailer'
  where s.template_id = p_template_id;
end;
$$;
revoke all on function public.get_template_recipients(uuid) from public, anon;
grant execute on function public.get_template_recipients(uuid) to authenticated;

-- Per-template usage for the signed-in manufacturer (retailer identities not exposed).
create or replace function public.get_manufacturer_template_stats()
returns table (template_id uuid, downloads bigint, saves bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not exists (
    select 1 from public.user_profiles where user_id = auth.uid() and role = 'manufacturer'
  ) then
    raise exception 'Manufacturer access is required.' using errcode = '42501';
  end if;
  return query
  select t.id,
         (select count(*) from public.template_downloads d where d.template_id = t.id),
         (select count(*) from public.retailer_saved_templates s where s.template_id = t.id)
  from public.designer_templates t
  where t.manufacturer_user_id = auth.uid();
end;
$$;
revoke all on function public.get_manufacturer_template_stats() from public, anon;
grant execute on function public.get_manufacturer_template_stats() to authenticated;
