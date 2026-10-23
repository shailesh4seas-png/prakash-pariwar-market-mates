create extension if not exists pgcrypto with schema extensions;

do $$
begin
  if not exists (
    select 1
    from pg_extension e
    join pg_namespace n on n.oid = e.extnamespace
    where e.extname = 'pgcrypto' and n.nspname = 'extensions'
  ) then
    raise exception 'pgcrypto must be installed in the extensions schema.';
  end if;
end;
$$;

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

  if not found then
    raise exception 'The profile-assets bucket could not be created.';
  end if;
  if profile_assets.public is distinct from false
     or profile_assets.file_size_limit is distinct from 5242880
     or not coalesce(
       profile_assets.allowed_mime_types @> array['image/png', 'image/jpeg', 'image/webp']
       and profile_assets.allowed_mime_types <@ array['image/png', 'image/jpeg', 'image/webp'],
       false
     ) then
    raise exception 'The existing profile-assets bucket does not match the required private image configuration.';
  end if;
end;
$$;

create table if not exists public.manufacturer_retailer_associations (
  manufacturer_user_id uuid not null references auth.users (id) on delete cascade,
  retailer_user_id uuid not null references auth.users (id) on delete cascade,
  linked_by text not null check (linked_by in ('invitation', 'referral')),
  created_at timestamptz not null default now(),
  removed_at timestamptz,
  primary key (manufacturer_user_id, retailer_user_id)
);

create index if not exists manufacturer_retailers_by_retailer
  on public.manufacturer_retailer_associations (retailer_user_id)
  where removed_at is null;

create table if not exists public.retailer_invitations (
  id uuid primary key default gen_random_uuid(),
  manufacturer_user_id uuid not null references auth.users (id) on delete cascade,
  token_hash text not null unique,
  retailer_name text not null,
  mobile_number text not null,
  business_name text not null,
  city text not null,
  profile_photo_path text not null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked')),
  expires_at timestamptz not null default (now() + interval '30 days'),
  accepted_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  revoked_at timestamptz
);

create index if not exists retailer_invitations_by_manufacturer
  on public.retailer_invitations (manufacturer_user_id, created_at desc);

create table if not exists public.manufacturer_referral_links (
  manufacturer_user_id uuid primary key references auth.users (id) on delete cascade,
  referral_code text not null unique,
  created_at timestamptz not null default now()
);

alter table public.manufacturer_retailer_associations enable row level security;
alter table public.retailer_invitations enable row level security;
alter table public.manufacturer_referral_links enable row level security;

create or replace function public.create_retailer_invitation(
  p_token text,
  p_retailer_name text,
  p_mobile_number text,
  p_business_name text,
  p_city text,
  p_profile_photo_path text
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
     or not exists (
       select 1 from storage.objects
       where bucket_id = 'profile-assets' and name = p_profile_photo_path
         and metadata ->> 'mimetype' in ('image/png', 'image/jpeg', 'image/webp')
         and (metadata ->> 'size')::bigint <= 5242880
     ) then
    raise exception 'Invitation details are invalid.' using errcode = '22023';
  end if;

  return query
  insert into public.retailer_invitations (
    manufacturer_user_id, token_hash, retailer_name, mobile_number,
    business_name, city, profile_photo_path
  ) values (
    current_user_id,
    encode(extensions.digest(convert_to(p_token, 'UTF8'), 'sha256'), 'hex'),
    trim(p_retailer_name), trim(p_mobile_number), trim(p_business_name), trim(p_city),
    p_profile_photo_path
  )
  returning id, retailer_invitations.expires_at;
end;
$$;

create or replace function public.get_or_create_manufacturer_referral()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  code text;
begin
  if current_user_id is null or not exists (
    select 1 from public.user_profiles
    where user_id = current_user_id and role = 'manufacturer'
  ) then
    raise exception 'Manufacturer access is required.' using errcode = '42501';
  end if;

  insert into public.manufacturer_referral_links (manufacturer_user_id, referral_code)
  values (current_user_id, encode(extensions.gen_random_bytes(32), 'hex'))
  on conflict (manufacturer_user_id) do nothing;

  select referral_code into code
  from public.manufacturer_referral_links
  where manufacturer_user_id = current_user_id;
  return code;
end;
$$;

create or replace function public.get_retailer_invitation_context(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  invite public.retailer_invitations%rowtype;
begin
  if auth.uid() is null or p_token !~ '^[0-9a-f]{64}$' then
    raise exception 'This invitation is not valid.' using errcode = '22023';
  end if;
  select * into invite
  from public.retailer_invitations
  where token_hash = encode(extensions.digest(convert_to(p_token, 'UTF8'), 'sha256'), 'hex');
  if not found or invite.status <> 'pending' or invite.expires_at <= now() then
    raise exception 'This invitation is expired, revoked, or already used.' using errcode = '22023';
  end if;
  return jsonb_build_object(
    'retailer_name', invite.retailer_name,
    'mobile_number', invite.mobile_number,
    'business_name', invite.business_name,
    'city', invite.city
  );
end;
$$;

create or replace function public.associate_existing_retailer(
  p_invitation_token text default null,
  p_referral_token text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  manufacturer_id uuid;
  invite public.retailer_invitations%rowtype;
begin
  if current_user_id is null or not exists (
    select 1 from public.user_profiles
    where user_id = current_user_id and role = 'retailer'
  ) or not exists (
    select 1 from auth.users
    where id = current_user_id
      and email_confirmed_at is not null
      and raw_app_meta_data ->> 'provider' = 'google'
  ) then
    raise exception 'A registered retailer account is required.' using errcode = '42501';
  end if;
  if (p_invitation_token is null) = (p_referral_token is null) then
    raise exception 'Provide exactly one valid retailer link.' using errcode = '22023';
  end if;

  if p_invitation_token is not null then
    if p_invitation_token !~ '^[0-9a-f]{64}$' then
      raise exception 'This invitation is not valid.' using errcode = '22023';
    end if;
    select * into invite
    from public.retailer_invitations
    where token_hash = encode(extensions.digest(convert_to(p_invitation_token, 'UTF8'), 'sha256'), 'hex')
    for update;
    if not found or invite.status = 'revoked' or invite.expires_at <= now() then
      raise exception 'This invitation is expired, revoked, or invalid.' using errcode = '22023';
    end if;
    if invite.status = 'accepted' then
      if invite.accepted_by = current_user_id and exists (
        select 1 from public.manufacturer_retailer_associations
        where manufacturer_user_id = invite.manufacturer_user_id
          and retailer_user_id = current_user_id and removed_at is null
      ) then
        return;
      end if;
      raise exception 'This invitation has already been used.' using errcode = '22023';
    end if;
    manufacturer_id := invite.manufacturer_user_id;
  else
    select manufacturer_user_id into manufacturer_id
    from public.manufacturer_referral_links
    where referral_code = p_referral_token;
    if not found then
      raise exception 'This retailer registration link is invalid.' using errcode = '22023';
    end if;
  end if;

  insert into public.manufacturer_retailer_associations (
    manufacturer_user_id, retailer_user_id, linked_by, removed_at
  ) values (
    manufacturer_id, current_user_id,
    case when p_invitation_token is not null then 'invitation' else 'referral' end,
    null
  )
  on conflict (manufacturer_user_id, retailer_user_id) do update
  set linked_by = excluded.linked_by, removed_at = null;

  if p_invitation_token is not null then
    update public.retailer_invitations
    set status = 'accepted', accepted_by = current_user_id, accepted_at = now()
    where id = invite.id and status = 'pending';
  end if;
end;
$$;

create or replace function public.complete_retailer_registration(
  p_invitation_token text,
  p_referral_token text,
  p_full_name text,
  p_country text,
  p_state text,
  p_city text,
  p_business_name text,
  p_category text,
  p_contact_number text,
  p_business_logo_path text,
  p_profile_photo_path text,
  p_accepted_policies boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  verified_email text;
  manufacturer_id uuid;
  invite public.retailer_invitations%rowtype;
  retailer_photo_path text;
begin
  if current_user_id is null or (p_invitation_token is null) = (p_referral_token is null) then
    raise exception 'A valid retailer link and authenticated account are required.' using errcode = '42501';
  end if;
  select email into verified_email from auth.users
  where id = current_user_id
    and email_confirmed_at is not null
    and raw_app_meta_data ->> 'provider' = 'google';
  if verified_email is null then
    raise exception 'A verified Google email is required.' using errcode = '42501';
  end if;
  if length(trim(coalesce(p_full_name, ''))) = 0
     or length(trim(coalesce(p_country, ''))) = 0
     or length(trim(coalesce(p_state, ''))) = 0
     or length(trim(coalesce(p_city, ''))) = 0
     or length(trim(coalesce(p_business_name, ''))) = 0
     or length(trim(coalesce(p_category, ''))) = 0
    or length(trim(coalesce(p_contact_number, ''))) = 0
     or p_contact_number !~ '^\+?[0-9() .-]{7,20}$'
    or length(regexp_replace(p_contact_number, '[^0-9]', '', 'g')) not between 7 and 15
     or p_accepted_policies is distinct from true
     or p_business_logo_path not like current_user_id::text || '/retailer/business-logo-%'
      or p_business_logo_path !~ '[.](png|jpg|jpeg|webp)$'
    or p_profile_photo_path not like current_user_id::text || '/retailer/profile-photo-%'
      or p_profile_photo_path !~ '[.](png|jpg|jpeg|webp)$'
     or not exists (
       select 1 from storage.objects
       where bucket_id = 'profile-assets' and name = p_business_logo_path
         and metadata ->> 'mimetype' in ('image/png', 'image/jpeg', 'image/webp')
         and (metadata ->> 'size')::bigint <= 5242880
     )
     or not exists (
       select 1 from storage.objects
       where bucket_id = 'profile-assets' and name = p_profile_photo_path
         and metadata ->> 'mimetype' in ('image/png', 'image/jpeg', 'image/webp')
         and (metadata ->> 'size')::bigint <= 5242880
     ) then
    raise exception 'Retailer registration details are incomplete or invalid.' using errcode = '22023';
  end if;

  if p_invitation_token is not null then
    if p_invitation_token !~ '^[0-9a-f]{64}$' then
      raise exception 'This invitation is not valid.' using errcode = '22023';
    end if;
    select * into invite
    from public.retailer_invitations
    where token_hash = encode(extensions.digest(convert_to(p_invitation_token, 'UTF8'), 'sha256'), 'hex')
    for update;
    if not found or invite.status = 'revoked' or invite.expires_at <= now() then
      raise exception 'This invitation is expired, revoked, or invalid.' using errcode = '22023';
    end if;
    if invite.status = 'accepted' then
      if invite.accepted_by = current_user_id and exists (
        select 1 from public.manufacturer_retailer_associations
        where manufacturer_user_id = invite.manufacturer_user_id
          and retailer_user_id = current_user_id and removed_at is null
      ) then
        return;
      end if;
      raise exception 'This invitation has already been used.' using errcode = '22023';
    end if;
    manufacturer_id := invite.manufacturer_user_id;
    retailer_photo_path := p_profile_photo_path;
  else
    select manufacturer_user_id into manufacturer_id
    from public.manufacturer_referral_links
    where referral_code = p_referral_token;
    if not found then
      raise exception 'This retailer registration link is invalid.' using errcode = '22023';
    end if;
    retailer_photo_path := p_profile_photo_path;
  end if;

  insert into public.user_profiles (
    user_id, role, full_name, email, country, state, city, business_name,
    business_logo_path, profile_photo_path, category, contact_number,
    accepted_policies, terms_accepted_at
  ) values (
    current_user_id, 'retailer', trim(p_full_name), verified_email, trim(p_country),
    trim(p_state), trim(p_city), trim(p_business_name), p_business_logo_path,
    retailer_photo_path, trim(p_category), trim(p_contact_number), true, now()
  ) on conflict (user_id, role) do nothing;

  insert into public.manufacturer_retailer_associations (
    manufacturer_user_id, retailer_user_id, linked_by, removed_at
  ) values (
    manufacturer_id, current_user_id,
    case when p_invitation_token is not null then 'invitation' else 'referral' end,
    null
  )
  on conflict (manufacturer_user_id, retailer_user_id) do update
  set linked_by = excluded.linked_by, removed_at = null;

  if p_invitation_token is not null then
    update public.retailer_invitations
    set status = 'accepted', accepted_by = current_user_id, accepted_at = now()
    where id = invite.id and status = 'pending';
  end if;
end;
$$;

create or replace function public.get_retailer_network()
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
         p.contact_number, p.profile_photo_path, 'active'::text,
         p.created_at, null::bigint, 'retailer'::text
  from public.manufacturer_retailer_associations a
  join public.user_profiles p on p.user_id = a.retailer_user_id and p.role = 'retailer'
  where a.manufacturer_user_id = auth.uid() and a.removed_at is null
  union all
  select i.id, null::uuid, i.retailer_name, null::text, i.business_name,
         i.city, null::text, null::text, null::text, i.mobile_number,
         i.profile_photo_path,
         case when i.expires_at <= now() then 'expired'::text else 'pending'::text end,
         null::timestamptz, null::bigint, 'invitation'::text
  from public.retailer_invitations i
  where i.manufacturer_user_id = auth.uid() and i.status = 'pending';
end;
$$;

create or replace function public.remove_retailer_network_record(
  p_record_id uuid,
  p_record_type text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  affected integer;
begin
  if current_user_id is null or not exists (
    select 1 from public.user_profiles
    where user_id = current_user_id and role = 'manufacturer'
  ) then
    raise exception 'Manufacturer access is required.' using errcode = '42501';
  end if;

  if p_record_type = 'invitation' then
    update public.retailer_invitations
    set status = 'revoked', revoked_at = now()
    where id = p_record_id and manufacturer_user_id = current_user_id
      and status = 'pending';
  elsif p_record_type = 'retailer' then
    update public.manufacturer_retailer_associations
    set removed_at = now()
    where manufacturer_user_id = current_user_id and retailer_user_id = p_record_id
      and removed_at is null;
  else
    raise exception 'Network record type is invalid.' using errcode = '22023';
  end if;
  get diagnostics affected = row_count;
  if affected <> 1 then
    raise exception 'This network record is no longer available.' using errcode = 'P0002';
  end if;
end;
$$;

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
      where i.profile_photo_path = p_object_path
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
        and p.profile_photo_path = p_object_path
        and a.manufacturer_user_id = auth.uid()
    )
  );
$$;

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

revoke all on function public.create_retailer_invitation(text, text, text, text, text, text) from public, anon;
revoke all on function public.get_or_create_manufacturer_referral() from public, anon;
revoke all on function public.get_retailer_invitation_context(text) from public, anon;
revoke all on function public.associate_existing_retailer(text, text) from public, anon;
revoke all on function public.complete_retailer_registration(text, text, text, text, text, text, text, text, text, text, text, boolean) from public, anon;
revoke all on function public.get_retailer_network() from public, anon;
revoke all on function public.remove_retailer_network_record(uuid, text) from public, anon;
revoke all on function public.can_read_associated_retailer_photo(text) from public, anon;

grant execute on function public.create_retailer_invitation(text, text, text, text, text, text) to authenticated;
grant execute on function public.get_or_create_manufacturer_referral() to authenticated;
grant execute on function public.get_retailer_invitation_context(text) to authenticated;
grant execute on function public.associate_existing_retailer(text, text) to authenticated;
grant execute on function public.complete_retailer_registration(text, text, text, text, text, text, text, text, text, text, text, boolean) to authenticated;
grant execute on function public.get_retailer_network() to authenticated;
grant execute on function public.remove_retailer_network_record(uuid, text) to authenticated;
grant execute on function public.can_read_associated_retailer_photo(text) to authenticated;