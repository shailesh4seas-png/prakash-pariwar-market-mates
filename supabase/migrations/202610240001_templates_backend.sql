-- Templates backend: manufacturer-owned templates, retailer saves and downloads.
-- Additive only. Requires 202610230001 (manufacturer_retailer_associations) and user_profiles.
-- Visibility rule: a retailer sees PUBLISHED templates only from manufacturers they are actively associated with.

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

-- Helper used by RLS policies. Lives in a non-exposed schema so it is not callable as /rest/v1/rpc.
create or replace function private.is_associated_with(p_manufacturer_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.manufacturer_retailer_associations a
    where a.manufacturer_user_id = p_manufacturer_user_id
      and a.retailer_user_id = (select auth.uid())
      and a.removed_at is null
  );
$$;
revoke all on function private.is_associated_with(uuid) from public, anon;
grant execute on function private.is_associated_with(uuid) to authenticated;

create table if not exists public.templates (
  id uuid primary key default gen_random_uuid(),
  manufacturer_user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (length(trim(title)) between 1 and 200),
  headline text not null check (length(trim(headline)) between 1 and 200),
  sub text not null default '' check (length(sub) <= 300),
  category text not null check (category in (
    'Festival', 'Products', 'Offers', 'New Arrivals', 'Seasonal', 'Social Media', 'Business'
  )),
  image_path text check (
    image_path is null
    or (image_path like manufacturer_user_id::text || '/templates/%' and image_path ~ '[.](png|jpg|jpeg|webp)$')
  ),
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists templates_manufacturer_idx on public.templates (manufacturer_user_id, status);
create index if not exists templates_published_idx on public.templates (status, category) where status = 'published';

create table if not exists public.template_saves (
  retailer_user_id uuid not null references auth.users(id) on delete cascade,
  template_id uuid not null references public.templates(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (retailer_user_id, template_id)
);

create table if not exists public.template_downloads (
  id uuid primary key default gen_random_uuid(),
  retailer_user_id uuid not null references auth.users(id) on delete cascade,
  template_id uuid not null references public.templates(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists template_downloads_template_idx on public.template_downloads (template_id);
create index if not exists template_downloads_retailer_idx on public.template_downloads (retailer_user_id, created_at desc);

create or replace function private.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists templates_touch_updated_at on public.templates;
create trigger templates_touch_updated_at before update on public.templates
  for each row execute function private.touch_updated_at();

alter table public.templates enable row level security;
alter table public.template_saves enable row level security;
alter table public.template_downloads enable row level security;

revoke all on public.templates, public.template_saves, public.template_downloads from anon;

-- templates
drop policy if exists "Manufacturers read own templates" on public.templates;
create policy "Manufacturers read own templates" on public.templates
  for select to authenticated
  using (manufacturer_user_id = (select auth.uid()));

drop policy if exists "Associated retailers read published templates" on public.templates;
create policy "Associated retailers read published templates" on public.templates
  for select to authenticated
  using (status = 'published' and private.is_associated_with(manufacturer_user_id));

drop policy if exists "Manufacturers create own templates" on public.templates;
create policy "Manufacturers create own templates" on public.templates
  for insert to authenticated
  with check (
    manufacturer_user_id = (select auth.uid())
    and exists (
      select 1 from public.user_profiles p
      where p.user_id = (select auth.uid()) and p.role = 'manufacturer'
    )
  );

drop policy if exists "Manufacturers update own templates" on public.templates;
create policy "Manufacturers update own templates" on public.templates
  for update to authenticated
  using (manufacturer_user_id = (select auth.uid()))
  with check (manufacturer_user_id = (select auth.uid()));

drop policy if exists "Manufacturers delete own templates" on public.templates;
create policy "Manufacturers delete own templates" on public.templates
  for delete to authenticated
  using (manufacturer_user_id = (select auth.uid()));

-- template_saves: owner only, and only for templates the retailer can currently see
drop policy if exists "Retailers read own saves" on public.template_saves;
create policy "Retailers read own saves" on public.template_saves
  for select to authenticated
  using (retailer_user_id = (select auth.uid()));

drop policy if exists "Retailers save visible templates" on public.template_saves;
create policy "Retailers save visible templates" on public.template_saves
  for insert to authenticated
  with check (
    retailer_user_id = (select auth.uid())
    and exists (select 1 from public.templates t where t.id = template_id)
  );

drop policy if exists "Retailers remove own saves" on public.template_saves;
create policy "Retailers remove own saves" on public.template_saves
  for delete to authenticated
  using (retailer_user_id = (select auth.uid()));

-- template_downloads: retailers read their own history; rows are only written by record_template_download()
drop policy if exists "Retailers read own downloads" on public.template_downloads;
create policy "Retailers read own downloads" on public.template_downloads
  for select to authenticated
  using (retailer_user_id = (select auth.uid()));

create or replace function public.record_template_download(p_template_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null or not exists (
    select 1 from public.user_profiles where user_id = current_user_id and role = 'retailer'
  ) then
    raise exception 'Retailer access is required.' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.templates t
    where t.id = p_template_id and t.status = 'published'
      and private.is_associated_with(t.manufacturer_user_id)
  ) then
    raise exception 'This template is not available.' using errcode = 'P0002';
  end if;
  insert into public.template_downloads (retailer_user_id, template_id)
  values (current_user_id, p_template_id);
end;
$$;
revoke all on function public.record_template_download(uuid) from public, anon;
grant execute on function public.record_template_download(uuid) to authenticated;

-- Per-template usage for the signed-in manufacturer (retailer identities are not exposed).
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
         (select count(*) from public.template_saves s where s.template_id = t.id)
  from public.templates t
  where t.manufacturer_user_id = auth.uid();
end;
$$;
revoke all on function public.get_manufacturer_template_stats() from public, anon;
grant execute on function public.get_manufacturer_template_stats() to authenticated;

-- Private image bucket: manufacturers write under their own folder, associated retailers read published template art.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('template-assets', 'template-assets', false, 5242880, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists "Manufacturers upload own template assets" on storage.objects;
create policy "Manufacturers upload own template assets" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'template-assets' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "Manufacturers read own template assets" on storage.objects;
create policy "Manufacturers read own template assets" on storage.objects
  for select to authenticated
  using (bucket_id = 'template-assets' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "Manufacturers delete own template assets" on storage.objects;
create policy "Manufacturers delete own template assets" on storage.objects
  for delete to authenticated
  using (bucket_id = 'template-assets' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "Associated retailers read published template assets" on storage.objects;
create policy "Associated retailers read published template assets" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'template-assets'
    and exists (
      select 1 from public.templates t
      where t.image_path = name and t.status = 'published'
        and private.is_associated_with(t.manufacturer_user_id)
    )
  );
