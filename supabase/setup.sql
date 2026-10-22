create table if not exists public.user_profiles (
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('manufacturer', 'retailer')),
  full_name text not null,
  email text not null,
  country text not null,
  state text not null,
  city text not null,
  business_name text not null,
  business_logo_path text not null,
  profile_photo_path text not null,
  category text not null,
  contact_number text not null,
  accepted_policies boolean not null check (accepted_policies is true),
  terms_accepted_at timestamptz not null,
  created_at timestamptz not null default now(),
  primary key (user_id, role)
);

alter table public.user_profiles enable row level security;

drop policy if exists "Users can read their own profiles" on public.user_profiles;
create policy "Users can read their own profiles"
  on public.user_profiles for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Users can register their own roles" on public.user_profiles;
create policy "Users can register their own roles"
  on public.user_profiles for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and email = (select auth.jwt() ->> 'email')
    and role in ('manufacturer', 'retailer')
  );

drop policy if exists "Users can update their own profiles" on public.user_profiles;
create policy "Users can update their own profiles"
  on public.user_profiles for update to authenticated
  using (
    user_id = (select auth.uid())
    and email = (select auth.jwt() ->> 'email')
  )
  with check (
    user_id = (select auth.uid())
    and email = (select auth.jwt() ->> 'email')
    and role in ('manufacturer', 'retailer')
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('profile-assets', 'profile-assets', false, 5242880, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

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