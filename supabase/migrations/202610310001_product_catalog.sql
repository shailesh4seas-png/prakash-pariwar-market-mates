-- ============================================================================
-- Product Catalog (replaces the prototype Brand Kit screens).
-- Forward-only migration. Requires the applied migrations 202610230001/0003
-- (manufacturer_retailer_associations + private.is_associated_with) and
-- 202610240001 (private schema, private.touch_updated_at).
--
-- Apply through the authorized migration workflow to project kwmakeexlzjdhjtkefvh.
--
-- What it adds:
--   public.product_categories  - per-manufacturer category names (find-or-create)
--   public.products            - one row per product, scoped to its manufacturer
--   public.product_images      - up to 12 ordered photos, one primary per product
--   storage bucket 'product-assets' (private, 5 MB, png/jpeg/webp)
--   Atomic SECURITY DEFINER RPCs for search, detail, upsert, delete and photo
--   management, so a manufacturer's edits are all-or-nothing on the server.
--   Visibility rule: a retailer can only ever read products (and photos) of a
--   manufacturer they are ACTIVE-ly associated with -> enforced in RLS *and*
--   inside every RPC. There is no retailer write path at all.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Roles / helpers
-- ---------------------------------------------------------------------------
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

-- True when the signed-in user holds the requested role in user_profiles.
-- SECURITY DEFINER so RLS policies can consult it without recursing into
-- user_profiles' own policies.
create or replace function private.actor_has_role(p_role text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_role in ('manufacturer', 'retailer')
    and auth.uid() is not null
    and exists (
      select 1 from public.user_profiles
      where user_id = auth.uid() and role = p_role
    );
$$;
revoke all on function private.actor_has_role(text) from public, anon;
grant execute on function private.actor_has_role(text) to authenticated;

-- The current manufacturer actor, or a raised permission error. Used by every
-- write RPC so a retailer (or an anonymous caller) can never reach a mutation.
create or replace function private.require_manufacturer_actor()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null or not private.actor_has_role('manufacturer') then
    raise exception 'Manufacturer access is required.' using errcode = '42501';
  end if;
  return uid;
end;
$$;
revoke all on function private.require_manufacturer_actor() from public, anon;
grant execute on function private.require_manufacturer_actor() to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Tables
-- ---------------------------------------------------------------------------
create table if not exists public.product_categories (
  id uuid primary key default gen_random_uuid(),
  manufacturer_user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 80),
  created_at timestamptz not null default now()
);
create unique index if not exists product_categories_per_manufacturer_name
  on public.product_categories (manufacturer_user_id, lower(name));
create index if not exists product_categories_manufacturer_idx
  on public.product_categories (manufacturer_user_id, name);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  manufacturer_user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid references public.product_categories(id) on delete set null,
  name text not null check (length(trim(name)) between 1 and 200),
  -- Unique product code; uniqueness is enforced per manufacturer below.
  code text not null check (length(trim(code)) between 1 and 80),
  sku text check (sku is null or length(trim(sku)) <= 80),
  model_number text check (model_number is null or length(trim(model_number)) <= 80),
  price numeric(12,2) not null check (price >= 0 and price <= 99999999.99),
  description text not null default '' check (length(description) <= 4000),
  -- JSON array of { label, value } pairs; validated by the upsert RPC so the
  -- shape stays flexible (any industry's attributes) but always well-formed.
  specifications jsonb not null default '[]'::jsonb check (jsonb_typeof(specifications) = 'array'),
  warranty text check (warranty is null or length(trim(warranty)) <= 120),
  in_stock boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- Scope: the same code may exist at two different manufacturers, never twice
-- for one manufacturer.
create unique index if not exists products_manufacturer_code_key
  on public.products (manufacturer_user_id, lower(code));
create index if not exists products_manufacturer_updated_idx
  on public.products (manufacturer_user_id, updated_at desc);
create index if not exists products_category_idx on public.products (category_id);
create index if not exists products_name_search_idx on public.products (lower(name));
create index if not exists products_code_search_idx on public.products (lower(code));
create index if not exists products_sku_search_idx on public.products (lower(coalesce(sku, '')));
create index if not exists products_model_search_idx
  on public.products (lower(coalesce(model_number, '')));

create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  -- Denormalised owner: makes storage paths and RLS checks cheap and explicit.
  manufacturer_user_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null unique check (
    storage_path like manufacturer_user_id::text || '/products/%'
    and storage_path ~ '[.](png|jpg|jpeg|webp)$'
  ),
  position int not null default 0 check (position >= 0),
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists product_images_product_idx
  on public.product_images (product_id, position);
create index if not exists product_images_primary_idx
  on public.product_images (product_id) where is_primary;

-- Exactly one cover photo per product. A deferrable constraint trigger (not a
-- unique index) because swapping the cover from one row to another happens in a
-- single UPDATE, which a non-deferred unique index would reject mid-statement.
create or replace function private.assert_single_primary_image()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from public.product_images where product_id = new.product_id and is_primary) > 1 then
    raise exception 'A product can only have one cover photo.' using errcode = '23505';
  end if;
  return null;
end;
$$;
revoke all on function private.assert_single_primary_image() from public, anon;
grant execute on function private.assert_single_primary_image() to authenticated;

drop trigger if exists product_images_single_primary on public.product_images;
create constraint trigger product_images_single_primary
  after insert or update of is_primary on public.product_images
  deferrable initially deferred
  for each row when (new.is_primary)
  execute function private.assert_single_primary_image();

drop trigger if exists products_touch_updated_at on public.products;
create trigger products_touch_updated_at before update on public.products
  for each row execute function private.touch_updated_at();

-- Can the current user read this product? Manufacturer owner, or an actively
-- associated retailer. Single source of truth for RPC visibility checks.
-- Deliberately defined here, after the tables above: a LANGUAGE SQL function's
-- body is parsed and its relations resolved when the function is created, so
-- creating it before public.products exists fails with 42P01. (The plpgsql
-- helpers above are not validated at creation time, which is why they can live
-- in section 1.)
create or replace function private.can_view_product(p_product_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.products p
    where p.id = p_product_id
      and (
        p.manufacturer_user_id = auth.uid()
        or (private.actor_has_role('retailer') and private.is_associated_with(p.manufacturer_user_id))
      )
  );
$$;
revoke all on function private.can_view_product(uuid) from public, anon;
grant execute on function private.can_view_product(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Row Level Security
-- ---------------------------------------------------------------------------
alter table public.product_categories enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;

revoke all on public.product_categories, public.products, public.product_images from anon;

-- Manufacturers manage their own catalog rows.
drop policy if exists "Manufacturers own product categories" on public.product_categories;
create policy "Manufacturers own product categories" on public.product_categories
  for all to authenticated
  using (manufacturer_user_id = (select auth.uid()))
  with check (
    manufacturer_user_id = (select auth.uid())
    and private.actor_has_role('manufacturer')
  );

drop policy if exists "Manufacturers own products" on public.products;
create policy "Manufacturers own products" on public.products
  for all to authenticated
  using (manufacturer_user_id = (select auth.uid()))
  with check (
    manufacturer_user_id = (select auth.uid())
    and private.actor_has_role('manufacturer')
  );

drop policy if exists "Manufacturers own product images" on public.product_images;
create policy "Manufacturers own product images" on public.product_images
  for all to authenticated
  using (manufacturer_user_id = (select auth.uid()))
  with check (
    manufacturer_user_id = (select auth.uid())
    and private.actor_has_role('manufacturer')
  );

-- Retailers: SELECT only, and only for actively associated manufacturers. There
-- is deliberately no insert/update/delete policy for the retailer role, so a
-- retailer write attempt fails at RLS even if the client is tampered with.
drop policy if exists "Associated retailers read products" on public.products;
create policy "Associated retailers read products" on public.products
  for select to authenticated
  using (private.actor_has_role('retailer') and private.is_associated_with(manufacturer_user_id));

drop policy if exists "Associated retailers read product categories" on public.product_categories;
create policy "Associated retailers read product categories" on public.product_categories
  for select to authenticated
  using (private.actor_has_role('retailer') and private.is_associated_with(manufacturer_user_id));

drop policy if exists "Associated retailers read product images" on public.product_images;
create policy "Associated retailers read product images" on public.product_images
  for select to authenticated
  using (private.actor_has_role('retailer') and private.is_associated_with(manufacturer_user_id));

-- ---------------------------------------------------------------------------
-- 4. Storage bucket + policies
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-assets',
  'product-assets',
  false,
  5242880,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do nothing;

do $$
declare
  product_bucket storage.buckets%rowtype;
begin
  select * into product_bucket from storage.buckets where id = 'product-assets';
  if not found then
    raise exception 'The product-assets bucket could not be created.';
  end if;
  if product_bucket.public is distinct from false
     or product_bucket.file_size_limit is distinct from 5242880
     or not coalesce(
       product_bucket.allowed_mime_types @> array['image/png', 'image/jpeg', 'image/webp']
       and product_bucket.allowed_mime_types <@ array['image/png', 'image/jpeg', 'image/webp'],
       false
     ) then
    raise exception 'The existing product-assets bucket does not match the required private image configuration.';
  end if;
end;
$$;

-- Object-level read check used by the retailer storage policy: the path must
-- belong to a photo row of a product the caller can currently see.
create or replace function public.can_read_product_photo(p_object_path text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_object_path is not null and exists (
    select 1
    from public.product_images i
    join public.products p on p.id = i.product_id
    where i.storage_path = p_object_path
      and (
        p.manufacturer_user_id = auth.uid()
        or (private.actor_has_role('retailer') and private.is_associated_with(p.manufacturer_user_id))
      )
  );
$$;
revoke all on function public.can_read_product_photo(text) from public, anon;
grant execute on function public.can_read_product_photo(text) to authenticated;

drop policy if exists "Manufacturers upload their own product photos" on storage.objects;
create policy "Manufacturers upload their own product photos" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'product-assets'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and private.actor_has_role('manufacturer')
  );

drop policy if exists "Manufacturers read their own product photos" on storage.objects;
create policy "Manufacturers read their own product photos" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'product-assets'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Manufacturers delete their own product photos" on storage.objects;
create policy "Manufacturers delete their own product photos" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'product-assets'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Associated retailers read product photos" on storage.objects;
create policy "Associated retailers read product photos" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'product-assets'
    and public.can_read_product_photo(name)
  );

-- ---------------------------------------------------------------------------
-- 5. Read RPCs
-- ---------------------------------------------------------------------------
-- Catalog list for whichever role is signed in. p_search matches name, code,
-- SKU or model number (case-insensitive substring); p_category_id filters.
create or replace function public.list_products(p_search text default null, p_category_id uuid default null)
returns table (
  id uuid,
  name text,
  code text,
  sku text,
  model_number text,
  price numeric,
  category_id uuid,
  category_name text,
  description text,
  specifications jsonb,
  warranty text,
  in_stock boolean,
  manufacturer_user_id uuid,
  manufacturer_name text,
  created_at timestamptz,
  updated_at timestamptz,
  primary_image_path text,
  image_paths text[]
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  needle text := lower(trim(coalesce(p_search, '')));
begin
  if uid is null or not (private.actor_has_role('manufacturer') or private.actor_has_role('retailer')) then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  return query
  select
    p.id,
    p.name,
    p.code,
    p.sku,
    p.model_number,
    p.price,
    p.category_id,
    c.name,
    p.description,
    p.specifications,
    p.warranty,
    p.in_stock,
    p.manufacturer_user_id,
    m.business_name,
    p.created_at,
    p.updated_at,
    (select i.storage_path from public.product_images i
      where i.product_id = p.id order by i.is_primary desc, i.position limit 1),
    coalesce(
      array_agg(i.storage_path order by i.is_primary desc, i.position)
      filter (where i.storage_path is not null),
      '{}'::text[]
    )
  from public.products p
  left join public.product_categories c on c.id = p.category_id
  left join public.user_profiles m on m.user_id = p.manufacturer_user_id and m.role = 'manufacturer'
  left join public.product_images i on i.product_id = p.id
  where (
    (p.manufacturer_user_id = uid and private.actor_has_role('manufacturer'))
    or (private.actor_has_role('retailer') and private.is_associated_with(p.manufacturer_user_id))
  )
  and (p_category_id is null or p.category_id = p.category_id)
  and (
    needle = ''
    or strpos(lower(p.name), needle) > 0
    or strpos(lower(p.code), needle) > 0
    or strpos(lower(coalesce(p.sku, '')), needle) > 0
    or strpos(lower(coalesce(p.model_number, '')), needle) > 0
  )
  group by
    -- p.updated_at is listed explicitly (rather than relying on functional
    -- dependency through the grouped p.id primary key) so the ORDER BY below is
    -- unambiguously a grouping key on every supported Postgres version.
    p.id, p.updated_at, c.name, m.business_name
  order by p.updated_at desc;
end;
$$;
revoke all on function public.list_products(text, uuid) from public, anon;
grant execute on function public.list_products(text, uuid) to authenticated;

-- One product with its ordered photos, for the detail / edit views.
create or replace function public.get_product_detail(p_product_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  payload jsonb;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;
  if not private.can_view_product(p_product_id) then
    raise exception 'Product not found or not visible to you.' using errcode = 'P0002';
  end if;

  select jsonb_build_object(
    'id', p.id,
    'name', p.name,
    'code', p.code,
    'sku', p.sku,
    'model_number', p.model_number,
    'price', p.price,
    'category_id', p.category_id,
    'category_name', c.name,
    'description', p.description,
    'specifications', p.specifications,
    'warranty', p.warranty,
    'in_stock', p.in_stock,
    'manufacturer_user_id', p.manufacturer_user_id,
    'manufacturer_name', m.business_name,
    'created_at', p.created_at,
    'updated_at', p.updated_at,
    'images', coalesce(
      (
        select jsonb_agg(jsonb_build_object(
          'id', i.id,
          'storage_path', i.storage_path,
          'position', i.position,
          'is_primary', i.is_primary
        ) order by i.position, i.created_at)
        from public.product_images i
        where i.product_id = p.id
      ),
      '[]'::jsonb
    )
  )
  into payload
  from public.products p
  left join public.product_categories c on c.id = p.category_id
  left join public.user_profiles m on m.user_id = p.manufacturer_user_id and m.role = 'manufacturer'
  where p.id = p_product_id;

  if payload is null then
    raise exception 'Product not found or not visible to you.' using errcode = 'P0002';
  end if;
  return payload;
end;
$$;
revoke all on function public.get_product_detail(uuid) from public, anon;
grant execute on function public.get_product_detail(uuid) to authenticated;

-- Category picker source: the manufacturer's own categories, or (for a
-- retailer) the categories in use across the manufacturers they are linked to.
create or replace function public.list_product_categories()
returns table (id uuid, name text, product_count bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  if private.actor_has_role('manufacturer') then
    return query
    select c.id, c.name, count(p.id)
    from public.product_categories c
    left join public.products p on p.category_id = c.id
    where c.manufacturer_user_id = uid
    group by c.id, c.name
    order by c.name;
  else
    return query
    select c.id, c.name, count(p.id)
    from public.products p
    join public.product_categories c on c.id = p.category_id
    where private.actor_has_role('retailer')
      and private.is_associated_with(p.manufacturer_user_id)
    group by c.id, c.name
    order by c.name;
  end if;
end;
$$;
revoke all on function public.list_product_categories() from public, anon;
grant execute on function public.list_product_categories() to authenticated;

-- ---------------------------------------------------------------------------
-- 6. Product write RPCs (manufacturer only)
-- ---------------------------------------------------------------------------
create or replace function public.upsert_product(
  p_id uuid,
  p_name text,
  p_code text,
  p_sku text,
  p_model_number text,
  p_price numeric,
  p_category_name text,
  p_description text,
  p_specifications jsonb,
  p_warranty text,
  p_in_stock boolean
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := private.require_manufacturer_actor();
  clean_name text := btrim(coalesce(p_name, ''));
  clean_code text := btrim(coalesce(p_code, ''));
  clean_sku text := nullif(btrim(coalesce(p_sku, '')), '');
  clean_model text := nullif(btrim(coalesce(p_model_number, '')), '');
  clean_description text := coalesce(p_description, '');
  clean_warranty text := nullif(btrim(coalesce(p_warranty, '')), '');
  clean_category text := nullif(btrim(coalesce(p_category_name, '')), '');
  chosen_category uuid;
  previous_category uuid;
  saved_id uuid;
  duplicate uuid;
  item jsonb;
begin
  if length(clean_name) < 1 or length(clean_name) > 200 then
    raise exception 'Product name must be between 1 and 200 characters.' using errcode = '22023';
  end if;
  if length(clean_code) < 1 or length(clean_code) > 80 then
    raise exception 'Product code must be between 1 and 80 characters.' using errcode = '22023';
  end if;
  if clean_sku is not null and length(clean_sku) > 80 then
    raise exception 'SKU must be 80 characters or fewer.' using errcode = '22023';
  end if;
  if clean_model is not null and length(clean_model) > 80 then
    raise exception 'Model number must be 80 characters or fewer.' using errcode = '22023';
  end if;
  if p_price is null or p_price < 0 or p_price > 99999999.99 then
    raise exception 'Price must be between 0 and 99999999.99.' using errcode = '22023';
  end if;
  if length(clean_description) > 4000 then
    raise exception 'Description must be 4000 characters or fewer.' using errcode = '22023';
  end if;
  if clean_warranty is not null and length(clean_warranty) > 120 then
    raise exception 'Warranty must be 120 characters or fewer.' using errcode = '22023';
  end if;
  if p_in_stock is null then
    raise exception 'Availability is required.' using errcode = '22023';
  end if;

  -- Specifications: a flexible array of { label, value } pairs.
  if p_specifications is null or jsonb_typeof(p_specifications) <> 'array' then
    raise exception 'Specifications must be a list.' using errcode = '22023';
  end if;
  if jsonb_array_length(p_specifications) > 40 then
    raise exception 'A product can carry at most 40 specifications.' using errcode = '22023';
  end if;
  for item in select * from jsonb_array_elements(p_specifications) loop
    if jsonb_typeof(item) <> 'object'
       or coalesce(length(btrim(item ->> 'label')), 0) < 1
       or length(item ->> 'label') > 60
       or length(coalesce(item ->> 'value', '')) > 200 then
      raise exception 'Each specification needs a label (1-60 characters) and a value (200 characters or fewer).'
        using errcode = '22023';
    end if;
  end loop;

  -- Unique within the manufacturer's own catalog.
  select id into duplicate
  from public.products
  where manufacturer_user_id = uid
    and lower(code) = lower(clean_code)
    and (p_id is null or id <> p_id)
  limit 1;
  if duplicate is not null then
    raise exception 'You already have a product with the code %.', clean_code using errcode = '23505';
  end if;

  if clean_category is not null then
    if length(clean_category) > 80 then
      raise exception 'Category must be 80 characters or fewer.' using errcode = '22023';
    end if;
    insert into public.product_categories (manufacturer_user_id, name)
    values (uid, clean_category)
    on conflict (manufacturer_user_id, lower(name)) do nothing;

    select c.id into chosen_category
    from public.product_categories c
    where c.manufacturer_user_id = uid and lower(c.name) = lower(clean_category)
    limit 1;
  end if;

  if p_id is null then
    insert into public.products (
      manufacturer_user_id, category_id, name, code, sku, model_number, price,
      description, specifications, warranty, in_stock
    ) values (
      uid, chosen_category, clean_name, clean_code, clean_sku, clean_model, round(p_price::numeric, 2),
      clean_description, p_specifications, clean_warranty, p_in_stock
    )
    returning id into saved_id;
  else
    select p.category_id into previous_category
    from public.products p where p.id = p_id and p.manufacturer_user_id = uid;

    update public.products p
    set name = clean_name,
        code = clean_code,
        sku = clean_sku,
        model_number = clean_model,
        price = round(p_price::numeric, 2),
        category_id = chosen_category,
        description = clean_description,
        specifications = p_specifications,
        warranty = clean_warranty,
        in_stock = p_in_stock
    where p.id = p_id and p.manufacturer_user_id = uid
    returning p.id into saved_id;
    if saved_id is null then
      raise exception 'Product not found or not owned by you.' using errcode = 'P0002';
    end if;
  end if;

  -- Prune only the category this product just left, and only if it is now
  -- empty; categories the manufacturer deliberately keeps stay untouched.
  if previous_category is not null and previous_category is distinct from chosen_category then
    delete from public.product_categories c
    where c.id = previous_category
      and c.manufacturer_user_id = uid
      and not exists (select 1 from public.products p where p.category_id = c.id);
  end if;

  return saved_id;
end;
$$;
revoke all on function public.upsert_product(uuid,text,text,text,text,numeric,text,text,jsonb,text,boolean) from public, anon;
grant execute on function public.upsert_product(uuid,text,text,text,text,numeric,text,text,jsonb,text,boolean) to authenticated;

-- Delete the product, its photo rows and the storage objects they point at, in
-- one transaction: the app can never be left referencing a missing file.
-- Review note: this deletes the storage.objects rows through SQL, which makes
-- the bytes unreachable through the Storage API. Whether the bucket object
-- itself is reclaimed depends on Supabase-side housekeeping and has NOT been
-- verified from this workspace. If synchronous blob deletion is required,
-- drop the storage.objects delete here and call storage.remove() from the client
-- after this RPC succeeds (the manufacturer DELETE policy already allows it).
create or replace function public.delete_product(p_product_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := private.require_manufacturer_actor();
  paths text[];
  owner uuid;
  old_category uuid;
begin
  select manufacturer_user_id, category_id into owner, old_category
  from public.products where id = p_product_id and manufacturer_user_id = uid;
  if owner is null then
    raise exception 'Product not found or not owned by you.' using errcode = 'P0002';
  end if;

  select coalesce(array_agg(i.storage_path), '{}'::text[]) into paths
  from public.product_images i where i.product_id = p_product_id;

  delete from public.product_images where product_id = p_product_id;
  delete from public.products where id = p_product_id and manufacturer_user_id = uid;

  if array_length(paths, 1) > 0 then
    delete from storage.objects where bucket_id = 'product-assets' and name = any(paths);
  end if;

  delete from public.product_categories c
  where c.id = old_category
    and c.manufacturer_user_id = uid
    and not exists (select 1 from public.products p where p.category_id = c.id);
end;
$$;
revoke all on function public.delete_product(uuid) from public, anon;
grant execute on function public.delete_product(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 7. Photo write RPCs (manufacturer only)
-- ---------------------------------------------------------------------------
-- Attach an already-uploaded object. The object must exist, be an allowed image
-- type within the size limit, and live under the caller's own /products/ folder.
create or replace function public.add_product_image(p_product_id uuid, p_storage_path text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := private.require_manufacturer_actor();
  image_id uuid;
  total int;
begin
  if not exists (
    select 1 from public.products p
    where p.id = p_product_id and p.manufacturer_user_id = uid
  ) then
    raise exception 'Product not found or not owned by you.' using errcode = 'P0002';
  end if;
  if p_storage_path is null
     or p_storage_path not like uid::text || '/products/%'
     or p_storage_path !~ '[.](png|jpg|jpeg|webp)$' then
    raise exception 'Photo path is invalid.' using errcode = '22023';
  end if;
  if not exists (
    select 1 from storage.objects
    where bucket_id = 'product-assets' and name = p_storage_path
      and metadata ->> 'mimetype' in ('image/png', 'image/jpeg', 'image/webp')
      and (metadata ->> 'size')::bigint between 1 and 5242880
  ) then
    raise exception 'The uploaded photo could not be verified in storage.' using errcode = '22023';
  end if;
  if exists (select 1 from public.product_images i where i.storage_path = p_storage_path) then
    raise exception 'This photo is already attached to a product.' using errcode = '23505';
  end if;

  select count(*) into total from public.product_images where product_id = p_product_id;
  if total >= 12 then
    raise exception 'A product can have at most 12 photos.' using errcode = '22023';
  end if;

  insert into public.product_images (product_id, manufacturer_user_id, storage_path, position, is_primary)
  values (
    p_product_id, uid, p_storage_path, total,
    not exists (select 1 from public.product_images i where i.product_id = p_product_id and i.is_primary)
  )
  returning id into image_id;
  return image_id;
end;
$$;
revoke all on function public.add_product_image(uuid, text) from public, anon;
grant execute on function public.add_product_image(uuid, text) to authenticated;

-- Remove one photo (row + storage object). The first remaining photo becomes
-- the cover if the deleted one was primary.
create or replace function public.delete_product_image(p_image_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := private.require_manufacturer_actor();
  target public.product_images%rowtype;
  successor uuid;
begin
  select * into target
  from public.product_images
  where id = p_image_id and manufacturer_user_id = uid;
  if not found then
    raise exception 'Photo not found or not owned by you.' using errcode = 'P0002';
  end if;

  delete from public.product_images where id = p_image_id;
  delete from storage.objects where bucket_id = 'product-assets' and name = target.storage_path;

  if target.is_primary then
    select i.id into successor
    from public.product_images i
    where i.product_id = target.product_id
    order by i.position, i.created_at
    limit 1;
    if successor is not null then
      update public.product_images set is_primary = true where id = successor;
    end if;
  end if;
end;
$$;
revoke all on function public.delete_product_image(uuid) from public, anon;
grant execute on function public.delete_product_image(uuid) to authenticated;

-- Final ordering + cover selection. p_image_ids must be exactly the product's
-- current photos, so a stale editor cannot lose or invent images.
create or replace function public.reorder_product_images(
  p_product_id uuid,
  p_image_ids uuid[],
  p_primary_image_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := private.require_manufacturer_actor();
  total int;
  listed int;
begin
  if not exists (
    select 1 from public.products p
    where p.id = p_product_id and p.manufacturer_user_id = uid
  ) then
    raise exception 'Product not found or not owned by you.' using errcode = 'P0002';
  end if;
  if p_image_ids is null then
    raise exception 'Photo order is required.' using errcode = '22023';
  end if;

  select count(*) into total from public.product_images where product_id = p_product_id;
  select count(distinct m.value::uuid) into listed
  from unnest(coalesce(p_image_ids, '{}'::uuid[])) as m(value)
  where exists (
    select 1 from public.product_images i
    where i.id = m.value::uuid and i.product_id = p_product_id
  );
  if listed <> total or array_length(p_image_ids, 1) <> total then
    raise exception 'The photo order does not match the saved product photos.' using errcode = '22023';
  end if;
  if p_primary_image_id is not null
     and not exists (
       select 1 from public.product_images i
       where i.id = p_primary_image_id and i.product_id = p_product_id
     ) then
    raise exception 'The selected cover photo is not part of this product.' using errcode = '22023';
  end if;

  update public.product_images i
  set position = ord.idx - 1,
      is_primary = (
        case when p_primary_image_id is not null
          then i.id = p_primary_image_id
          else ord.idx = 1
        end
      )
  from (
    select ordinality as idx, value::uuid as image_id
    from unnest(p_image_ids) with ordinality
  ) as ord
  where i.id = ord.image_id and i.product_id = p_product_id;
end;
$$;
revoke all on function public.reorder_product_images(uuid, uuid[], uuid) from public, anon;
grant execute on function public.reorder_product_images(uuid, uuid[], uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 8. Realtime: cross-session catalog sync
--    Any change to a product or its photos is broadcast to subscribers, whose
--    visibility is still filtered by the RLS policies above.
-- ---------------------------------------------------------------------------
do $$
declare
  pub oid;
begin
  select oid into pub from pg_publication where pubname = 'supabase_realtime';
  if pub is null then
    begin
      execute 'create publication supabase_realtime';
      select oid into pub from pg_publication where pubname = 'supabase_realtime';
    exception when others then
      pub := null;
    end;
  end if;
  if pub is not null then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'products'
    ) then
      begin
        execute 'alter publication supabase_realtime add table public.products';
      exception when others then
        raise notice 'Realtime publication for public.products skipped: %', sqlerrm;
      end;
    end if;
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'product_images'
    ) then
      begin
        execute 'alter publication supabase_realtime add table public.product_images';
      exception when others then
        raise notice 'Realtime publication for public.product_images skipped: %', sqlerrm;
      end;
    end if;
  end if;
end;
$$;
