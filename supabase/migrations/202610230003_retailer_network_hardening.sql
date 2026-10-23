-- Forward-only migration. Requires 202610230001 and 202610230002.
-- Review hosted definitions and apply through the authorized migration workflow.
-- No bucket writes, table creation, profile data rewrites, or RLS disablement.
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
  if p_token is null or p_token !~ '^[0-9a-f]{64}$'
     or length(trim(coalesce(p_retailer_name, ''))) not between 1 and 200
     or length(trim(coalesce(p_business_name, ''))) not between 1 and 200
     or length(trim(coalesce(p_city, ''))) not between 1 and 200
     or length(trim(coalesce(p_mobile_number, ''))) = 0
     or p_mobile_number !~ '^\+?[0-9() .-]{7,20}$'
     or length(regexp_replace(p_mobile_number, '[^0-9]', '', 'g')) not between 7 and 15
     or p_profile_photo_path is null or p_profile_photo_path not like current_user_id::text || '/manufacturer/invitation-photos/%'
     or p_profile_photo_path !~ '[.](png|jpg|jpeg|webp)$'
     or p_business_logo_path is null or p_business_logo_path not like current_user_id::text || '/manufacturer/invitation-logos/%'
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
         case when i.status = 'revoked' then 'revoked'::text when i.expires_at <= now() then 'expired'::text else 'pending'::text end,
         i.created_at, null::bigint, 'invitation'::text
  from public.retailer_invitations i
  where i.manufacturer_user_id = auth.uid() and i.status in ('pending', 'revoked');
end;
$$;

revoke all on function public.get_retailer_network() from public, anon;
grant execute on function public.get_retailer_network() to authenticated;

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
  if length(trim(coalesce(p_full_name, ''))) not between 1 and 200
     or length(trim(coalesce(p_country, ''))) not between 1 and 200
     or length(trim(coalesce(p_state, ''))) not between 1 and 200
     or length(trim(coalesce(p_city, ''))) not between 1 and 200
     or length(trim(coalesce(p_business_name, ''))) not between 1 and 200
     or length(trim(coalesce(p_category, ''))) not between 1 and 200
    or length(trim(coalesce(p_contact_number, ''))) = 0
     or p_contact_number !~ '^\+?[0-9() .-]{7,20}$'
    or length(regexp_replace(p_contact_number, '[^0-9]', '', 'g')) not between 7 and 15
     or p_accepted_policies is distinct from true
     or p_business_logo_path is null or p_business_logo_path not like current_user_id::text || '/retailer/business-logo-%'
      or p_business_logo_path !~ '[.](png|jpg|jpeg|webp)$'
    or p_profile_photo_path is null or p_profile_photo_path not like current_user_id::text || '/retailer/profile-photo-%'
      or p_profile_photo_path !~ '[.](png|jpg|jpeg|webp)$'
     or not exists (
       select 1 from storage.objects
       where bucket_id = 'profile-assets' and name = p_business_logo_path
         and metadata ->> 'mimetype' in ('image/png', 'image/jpeg', 'image/webp')
         and (metadata ->> 'size')::bigint between 1 and 5242880
     )
     or not exists (
       select 1 from storage.objects
       where bucket_id = 'profile-assets' and name = p_profile_photo_path
         and metadata ->> 'mimetype' in ('image/png', 'image/jpeg', 'image/webp')
         and (metadata ->> 'size')::bigint between 1 and 5242880
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
  ); -- Existing profiles must use associate_existing_retailer; a conflict rolls back this transaction.

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


revoke all on function public.complete_retailer_registration(text,text,text,text,text,text,text,text,text,text,text,boolean) from public, anon;
grant execute on function public.complete_retailer_registration(text,text,text,text,text,text,text,text,text,text,text,boolean) to authenticated;
