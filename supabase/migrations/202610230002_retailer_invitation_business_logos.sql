alter table public.retailer_invitations
  add column if not exists business_logo_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-assets',
  'profile-assets',
  false,
  5242880,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do nothing;

do $$
declare
  profile_assets storage.buckets%rowtype;
begin
  select * into profile_assets
  from storage.buckets
  where id = 'profile-assets';

  if not found
     or profile_assets.public is distinct from false
     or profile_assets.file_size_limit is distinct from 5242880
     or not coalesce(
       profile_assets.allowed_mime_types @> array['image/png', 'image/jpeg', 'image/webp']
       and profile_assets.allowed_mime_types <@ array['image/png', 'image/jpeg', 'image/webp'],
       false
     ) then
    raise exception 'The profile-assets bucket is missing or does not match the required private image configuration.';
  end if;
end;
$$;

create or replace function public.prevent_user_profile_role_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.role is distinct from old.role then
    raise exception 'Profile roles cannot be changed.' using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke all on function public.prevent_user_profile_role_change() from public, anon, authenticated;

drop trigger if exists prevent_user_profile_role_change on public.user_profiles;
create trigger prevent_user_profile_role_change
  before update of role on public.user_profiles
  for each row execute function public.prevent_user_profile_role_change();

drop function if exists public.create_retailer_invitation(text, text, text, text, text, text);

create or replace function public.create_retailer_invitation(
  p_token text,
  p_retailer_name text,
  p_mobile_number text,
  p_business_name text,
  p_city text,
  p_profile_photo_path text,
  p_business_logo_path text
)
returns table (invitation_id uuid, expires_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null or not exists (
    select 1 from public.user_profiles
    where user_id = current_user_id and role = 'manufacturer'
  ) then
    raise exception 'Manufacturer access is required.' using errcode = '42501';
  end if;
  if p_token !~ '^[0-9a-f]{64}$'
     or length(trim(coalesce(p_retailer_name, ''))) = 0
     or length(trim(coalesce(p_business_name, ''))) = 0
     or length(trim(coalesce(p_city, ''))) = 0
     or length(trim(coalesce(p_mobile_number, ''))) = 0
     or p_mobile_number !~ '^\+?[0-9() .-]{7,20}$'
     or length(regexp_replace(p_mobile_number, '[^0-9]', '', 'g')) not between 7 and 15
     or p_profile_photo_path not like current_user_id::text || '/manufacturer/invitation-photos/%'
     or p_profile_photo_path !~ '[.](png|jpg|jpeg|webp)$'
     or p_business_logo_path not like current_user_id::text || '/manufacturer/invitation-logos/%'
     or p_business_logo_path !~ '[.](png|jpg|jpeg|webp)$'
     or not exists (
       select 1 from storage.objects
       where bucket_id = 'profile-assets' and name = p_profile_photo_path
         and metadata ->> 'mimetype' in ('image/png', 'image/jpeg', 'image/webp')
         and (metadata ->> 'size')::bigint between 1 and 5242880
     )
     or not exists (
       select 1 from storage.objects
       where bucket_id = 'profile-assets' and name = p_business_logo_path
         and metadata ->> 'mimetype' in ('image/png', 'image/jpeg', 'image/webp')
         and (metadata ->> 'size')::bigint between 1 and 5242880
     ) then
    raise exception 'Invitation details are invalid.' using errcode = '22023';
  end if;

  return query
  insert into public.retailer_invitations (
    manufacturer_user_id, token_hash, retailer_name, mobile_number,
    business_name, city, profile_photo_path, business_logo_path
  ) values (
    current_user_id,
    encode(extensions.digest(convert_to(p_token, 'UTF8'), 'sha256'), 'hex'),
    trim(p_retailer_name), trim(p_mobile_number), trim(p_business_name), trim(p_city),
    p_profile_photo_path, p_business_logo_path
  )
  returning id, retailer_invitations.expires_at;
end;
$$;

revoke all on function public.create_retailer_invitation(text, text, text, text, text, text, text)
  from public, anon;
grant execute on function public.create_retailer_invitation(text, text, text, text, text, text, text)
  to authenticated;

drop function if exists public.get_retailer_network();

create function public.get_retailer_network()
returns table (
  id uuid,
  retailer_user_id uuid,
  retailer_name text,
  email text,
  business_name text,
  city text,
  state text,
  country text,
  category text,
  contact_number text,
  profile_photo_path text,
  business_logo_path text,
  status text,
  joined_at timestamptz,
  downloads bigint,
  record_type text
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not exists (
    select 1 from public.user_profiles
    where user_id = auth.uid() and role = 'manufacturer'
  ) then
    raise exception 'Manufacturer access is required.' using errcode = '42501';
  end if;

  return query
  select a.retailer_user_id, a.retailer_user_id, p.full_name, p.email,
         p.business_name, p.city, p.state, p.country, p.category,
         p.contact_number, p.profile_photo_path, p.business_logo_path,
         'active'::text, p.created_at, null::bigint, 'retailer'::text
  from public.manufacturer_retailer_associations a
  join public.user_profiles p on p.user_id = a.retailer_user_id and p.role = 'retailer'
  where a.manufacturer_user_id = auth.uid() and a.removed_at is null
  union all
  select i.id, null::uuid, i.retailer_name, null::text, i.business_name,
         i.city, null::text, null::text, null::text, i.mobile_number,
         i.profile_photo_path, i.business_logo_path,
         case when i.expires_at <= now() then 'expired'::text else 'pending'::text end,
         null::timestamptz, null::bigint, 'invitation'::text
  from public.retailer_invitations i
  where i.manufacturer_user_id = auth.uid() and i.status = 'pending';
end;
$$;

revoke all on function public.get_retailer_network() from public, anon;
grant execute on function public.get_retailer_network() to authenticated;

create or replace function public.can_read_associated_retailer_photo(p_object_path text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null and (
    exists (
      select 1
      from public.retailer_invitations i
      join public.manufacturer_retailer_associations a
        on a.manufacturer_user_id = i.manufacturer_user_id
       and a.removed_at is null
      where p_object_path in (i.profile_photo_path, i.business_logo_path)
        and i.status = 'accepted'
        and ((a.retailer_user_id = auth.uid() and i.accepted_by = auth.uid())
          or a.manufacturer_user_id = auth.uid())
    )
    or exists (
      select 1
      from public.user_profiles p
      join public.manufacturer_retailer_associations a
        on a.retailer_user_id = p.user_id and a.removed_at is null
      where p.role = 'retailer'
        and p_object_path in (p.profile_photo_path, p.business_logo_path)
        and a.manufacturer_user_id = auth.uid()
    )
  );
$$;

revoke all on function public.can_read_associated_retailer_photo(text) from public, anon;
grant execute on function public.can_read_associated_retailer_photo(text) to authenticated;

drop policy if exists "Users can upload their own profile assets" on storage.objects;
create policy "Users can upload their own profile assets"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'profile-assets'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Users can read their own profile assets" on storage.objects;
create policy "Users can read their own profile assets"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'profile-assets'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Users can delete their own profile assets" on storage.objects;
create policy "Users can delete their own profile assets"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'profile-assets'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Retailers can read their accepted invitation photo" on storage.objects;
create policy "Retailers can read their accepted invitation photo"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'profile-assets'
    and public.can_read_associated_retailer_photo(name)
  );
