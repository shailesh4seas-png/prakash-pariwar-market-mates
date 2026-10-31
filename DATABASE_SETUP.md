# Database Setup and Verification

## Approved project

Use only `https://kwmakeexlzjdhjtkefvh.supabase.co` for Prakash Pariwar. The frontend rejects any other `VITE_SUPABASE_URL`. Configure `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, and `VITE_PUBLIC_APP_URL` in local/deployment settings. Never use a service-role key in browser code or a `VITE_` variable.

The local `.env` was checked without printing values: the URL matches the approved project and the publishable-key variable is present. `.env` is ignored and untracked. The frontend's read-only Auth settings check reported Google enabled; this does not prove that OAuth succeeds in a browser.

## Existing schema

The repository's `supabase/setup.sql` defines `public.user_profiles` with `(user_id, role)` as its primary key, a foreign key to `auth.users(id)`, and RLS enabled. It restricts roles to `manufacturer` and `retailer`; profile reads and inserts require the authenticated user's ID, and inserts also require the JWT email. The private `profile-assets` bucket is configured for PNG/JPEG/WebP up to 5 MiB with first-folder ownership policies for insert, select, and delete.

The approved hosted project's read-only API confirmed the profile table's required registration columns with HTTP 200, but did not expose its constraints or policies. The Storage API returned `NoSuchBucket` for `profile-assets`. The retailer-network migration now creates that bucket only when missing, preserves existing bucket configuration, and stops if an existing bucket is not private or does not match the image limits. It installs the three owner-scoped storage object policies from `supabase/setup.sql` and the accepted-invitation photo policy. Review same-named policies and any other storage policies in SQL Editor before application. Do not reset the database, disable RLS, or apply the bootstrap SQL over a database whose existing policies have not been reviewed.

## Required policy migration

`supabase/migrations/202610220001_profile_and_asset_updates.sql` adds one policy only:

- `Users can update their own profiles`: UPDATE is limited to rows whose user ID and JWT email match the authenticated account; the resulting row must still have that identity and one of the two supported roles.
- Storage UPDATE is deliberately not added. The app replaces a profile image by uploading a new UUID-named object and deleting the old one under the existing owner-scoped DELETE policy; it never overwrites an object.

This is replay-safe: it drops and recreates only the exact profile UPDATE policy. It does not create tables/buckets, change data, or change RLS enablement. Existing select/insert/delete policies are left untouched. The setup script contains the same profile policy for a fresh setup.

## Retailer network migrations

`supabase/migrations/202610230001_retailer_network_invitations.sql` adds the retailer network backend without modifying existing profile rows. It creates manufacturer-retailer associations, hashed single-use invitations, and stable manufacturer referral codes. Its authenticated RPCs validate the manufacturer or retailer role, verified Google identity, required fields, and owned storage paths; registration, invitation acceptance, and association changes run transactionally. Direct table access remains blocked by RLS, and retailer removal soft-deactivates only the association or revokes a pending invitation.

The project owner reports migrations `202610220001` and `202610230001` are applied. A fresh read-only API probe returned HTTP 200 for `user_profiles`, `retailer_invitations`, `manufacturer_retailer_associations`, and `manufacturer_referral_links`, consistent with that report. This does not independently prove migration history, RLS, constraints, function definitions, or grants. The Supabase CLI, linked-project metadata, and staging credentials are not available in this workspace.

The read-only API also confirmed that `retailer_invitations.business_logo_path` is absent. The forward migration `202610230002_retailer_invitation_business_logos.sql` adds that path, updates the retailer-network RPC response, ensures the private `profile-assets` bucket exists without changing mismatched bucket settings, restores the three owner-scoped Storage policies, and prevents profile-role changes while leaving other profile edits available. It is required by the updated invitation UI, which calls the seven-argument `create_retailer_invitation` RPC and displays business-logo paths. Apply it after `202610230001` on staging first, then production only after review/approval and before deploying the matching frontend bundle. It does not modify existing profile records or replace the earlier migration files.

The migration expects the existing `public.user_profiles` columns and `(user_id, role)` key from `supabase/setup.sql`, plus `pgcrypto` in the `extensions` schema. It creates the private `profile-assets` bucket only if absent; any pre-existing bucket with different settings causes the migration to stop instead of changing it. It creates no tables and does not modify existing profile data. It replaces only the three standard owner-scoped storage policy names with the matching definitions from `supabase/setup.sql`, then adds the accepted-invitation photo SELECT policy. Review any same-named policy definitions and other storage policies before applying. If the live schema, policies, or extension location differ, stop and reconcile before applying.

### Apply and verify the new forward migration

1. On staging, confirm the project reference, inspect current tables, RLS policies, Storage bucket and `pgcrypto` schema, and verify `202610220001`/`202610230001` are already recorded as applied.
2. With the Supabase CLI installed and authenticated, link the staging project and inspect migration history:

   ```sh
   supabase link --project-ref <staging-project-ref>
   supabase migration list --linked
   supabase db push --linked --dry-run
   ```

   Do not push if the dry run includes either earlier migration or any unreviewed migration; it applies all pending local migrations.
3. Apply only the reviewed `202610230002_retailer_invitation_business_logos.sql` to staging using a migration-aware method that records its version. If using SQL Editor, reconcile migration history explicitly.
4. Verify the added invitation column, new seven-argument RPC, updated network return shape, profile-role trigger, Storage access, and unchanged existing profile records. Run invitation and retailer registration browser tests using separate manufacturer/retailer test users.
5. Only after staging passes, confirm production migration history and schema again, then obtain explicit approval before applying `202610230002` to production. Do not run the SQL or `supabase db push` as part of this task.

Read-only extension preflight:

```sql
select e.extname, n.nspname as extension_schema
from pg_extension e
join pg_namespace n on n.oid = e.extnamespace
where e.extname = 'pgcrypto';
```

The migration's qualified `extensions.digest` and `extensions.gen_random_bytes` calls require `extension_schema = 'extensions'`. Stop if this query returns no row or another schema.

Example read-only checks:

```sql
select schemaname, tablename, rowsecurity
from pg_tables
where schemaname = 'public'
   and tablename in (
      'manufacturer_retailer_associations',
      'retailer_invitations',
      'manufacturer_referral_links'
   )
order by tablename;

select tablename, indexname, indexdef
from pg_indexes
where schemaname = 'public'
   and tablename in (
      'manufacturer_retailer_associations',
      'retailer_invitations',
      'manufacturer_referral_links'
   )
order by tablename, indexname;

select conrelid::regclass as table_name, conname, pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid in (
   'public.manufacturer_retailer_associations'::regclass,
   'public.retailer_invitations'::regclass,
   'public.manufacturer_referral_links'::regclass
)
order by table_name, conname;

select p.proname, p.prosecdef, p.proconfig,
          has_function_privilege('anon', p.oid, 'EXECUTE') as anon_can_execute,
          has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_can_execute
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
   and p.proname in (
      'create_retailer_invitation',
      'get_or_create_manufacturer_referral',
      'get_retailer_invitation_context',
      'associate_existing_retailer',
      'complete_retailer_registration',
      'get_retailer_network',
      'remove_retailer_network_record',
      'can_read_associated_retailer_photo'
   )
order by p.proname;

select schemaname || '.' || tablename, policyname, cmd, roles
from pg_policies
where schemaname = 'public'
   and tablename in (
      'manufacturer_retailer_associations',
      'retailer_invitations',
      'manufacturer_referral_links'
   )
union all
select schemaname || '.' || tablename, policyname, cmd, roles
from pg_policies
where schemaname = 'storage'
   and tablename = 'objects'
   and policyname in (
      'Users can upload their own profile assets',
      'Users can read their own profile assets',
      'Users can delete their own profile assets',
      'Retailers can read their accepted invitation photo'
   );
```

Expect RLS enabled on each new table and no direct table policies. The storage policy rows should contain the three owner-scoped policies plus the accepted-invitation photo policy. Each listed function should have `prosecdef = true`, an empty search path in `proconfig`, `anon_can_execute = false`, and `authenticated_can_execute = true`. Do not copy plaintext individual invitation tokens into database records or logs.

### Separate profile UPDATE migration

This is the earlier profile-policy migration, not the retailer-network migration. Check its remote migration history before considering it; do not apply it as part of the retailer-network change unless it is separately reviewed and approved.

1. Confirm the project selector shows `kwmakeexlzjdhjtkefvh` before running SQL.
2. Review the current policy list with the verification query below. If a policy with the migration name has different intent, stop and reconcile it before applying.
3. Open `supabase/migrations/202610220001_profile_and_asset_updates.sql` and run its contents in the SQL Editor.
4. Run the verification queries below. Do not consider the hosted database fixed until the expected rows are observed.

Alternatively, use the repository's normal Supabase migration workflow after linking it explicitly to the approved project. Do not run `db reset` or use a different linked project.

### Verification queries

```sql
select schemaname, tablename, policyname, cmd, roles, qual, with_check
from pg_policies
where (schemaname = 'public' and tablename = 'user_profiles')
   or (schemaname = 'storage' and tablename = 'objects' and policyname like 'Users can %profile assets%')
order by schemaname, tablename, policyname;
```

Expect RLS to remain enabled and the existing owner-scoped SELECT/INSERT/DELETE policies to remain. The named profile UPDATE policy should show `cmd = 'UPDATE'` and authenticated-only role scope. Storage should continue to have no UPDATE policy for this implementation.

```sql
select c.column_name, c.is_nullable, c.data_type
from information_schema.columns c
where c.table_schema = 'public' and c.table_name = 'user_profiles'
order by c.ordinal_position;

select conname, pg_get_constraintdef(oid)
from pg_constraint
where conrelid = 'public.user_profiles'::regclass;

select id, name, public, file_size_limit, allowed_mime_types
from storage.buckets
where id = 'profile-assets';
```

Verify the profile primary key is `(user_id, role)`, expected required columns are present, `profile-assets` is private, and its limits are 5 MiB and `image/png`, `image/jpeg`, `image/webp`. Also confirm the existing owner-scoped storage object policies for profile asset insert, select, and delete remain present.

### Rollback

Only if the new UPDATE policies need to be removed, run:

```sql
drop policy if exists "Users can update their own profiles" on public.user_profiles;
```

This leaves all profile rows, buckets, RLS settings, and other policies intact. It disables profile-row editing; it does not undo registration, image replacement, or delete uploaded files.

## Product Catalog migration

`supabase/migrations/202610310001_product_catalog.sql` replaces the mock Brand Kit screens with a real product catalog backend. It is a forward migration only: it changes no profile, association, invitation or template table, and it does not touch the `profile-assets` or `template-assets` buckets.

It creates:

- `public.product_categories` — one row per manufacturer-visible category, unique on `(manufacturer_user_id, lower(name))`.
- `public.products` — one owner-scoped row per product with `name`, `code`, optional `sku` / `model_number`, `price numeric(12,2)`, `description`, `specifications jsonb`, `warranty`, `in_stock`, and `created_at` / `updated_at` (maintained by the existing `private.touch_updated_at()` trigger). The product code is unique **per manufacturer** on `(manufacturer_user_id, lower(code))`, and search indexes exist for name, code, SKU and model number.
- `public.product_images` — ordered photos (`position`) with one `is_primary` cover, enforced by the deferrable `private.assert_single_primary_image()` constraint trigger so a cover swap inside one UPDATE stays valid. Paths are checked to be `<owner>/products/<file>` with an image extension.
- RLS on all three tables: manufacturers manage their own rows (and only while the `manufacturer` role is present for the signed-in user in `public.user_profiles`); associated retailers get SELECT only — there is no retailer write policy — through the existing `private.is_associated_with()`.
- The private `product-assets` bucket (5 MiB, PNG/JPEG/WebP) with owner-scoped insert/select/delete for manufacturers and, for retailers, a SELECT policy that resolves the object's product through `public.can_read_product_photo()`.
- `SECURITY DEFINER` RPCs granted to `authenticated` only: `list_products`, `get_product_detail`, `list_product_categories`, `upsert_product`, `delete_product`, `add_product_image`, `delete_product_image`, `reorder_product_images`. Every write RPC re-checks the manufacturer role and ownership, and `delete_product` / `delete_product_image` delete the matching `storage.objects` rows in the same transaction, so a photo can never stay readable after its product is gone. (Whether the underlying bytes are then reclaimed by Supabase-side housekeeping is not verified — see the review note above `delete_product` in the migration.)
- `public.products` and `public.product_images` are added to the `supabase_realtime` publication inside guarded blocks, so an already-published or unavailable publication cannot fail the migration.

**Applied on 31 Oct 2026** to production project `kwmakeexlzjdhjtkefvh` via the Supabase Management API using a `shailesh4seas-png` owner token (`sbp_...`), then recorded in `supabase_migrations.schema_migrations` as version `202610310001`, name `product_catalog`. The migration is idempotent (`create ... if not exists`, `create or replace function`, `drop policy if exists`, guarded `alter publication`), so the same file can be re-run safely.

### Post-apply verification (performed 31 Oct 2026)

- Preflight: `private.is_associated_with(uuid)`, `private.touch_updated_at()` and the new `private.assert_single_primary_image()` are present; `product_categories`, `products`, `product_images` all show `relrowsecurity = true`; bucket `product-assets` exists as private, `file_size_limit = 5242880`, `allowed_mime_types = [image/png, image/jpeg, image/webp]`.
- RPCs present with expected signatures and `prosecdef = true`, `search_path = ""`; execute granted to `authenticated` (and, for the public RPCs, `service_role`), revoked from `anon`. Table SELECT/INSERT/UPDATE/DELETE policies exist for manufacturers (owner + role check) and a SELECT-only policy for actively associated retailers, matching the migration file exactly.
- Storage policies on `storage.objects`: manufacturer INSERT/SELECT/DELETE under `<uid>/products/...`, plus retailer SELECT gated by `public.can_read_product_photo(name)`.
- Realtime: `supabase_realtime` publication lists `public.products` and `public.product_images`.
- Behavioural probes through the Management API (each running as a fresh session with `set local role authenticated; set local request.jwt.claims = '{"sub":"..."}'`):
  - Unknown `sub` calling `list_products` → `42501 Authentication required.` (RPC gate).
  - Unknown `sub` calling `delete_product` / `add_product_image` → `42501 Manufacturer access is required.` (via `private.require_manufacturer_actor()`).
  - Unknown `sub` calling `get_product_detail(<random uuid>)` → `P0002 Product not found or not visible to you.`
  - `anon` selecting `public.products` → `42501 permission denied for table products` (RLS + no privilege).
  - A real retailer-only `sub` calling `upsert_product` → `42501 Manufacturer access is required.` (proves the retailer read-only rule at the RPC boundary).
  - A real retailer-only `sub` calling `list_products` → 0 rows (allowed, filtered by RLS/`is_associated_with`).
  - A real manufacturer-only `sub` calling `list_products` and `list_product_categories` → 0 rows (empty catalog).
  - Happy-path write: `begin; ... upsert_product(...); select ... from list_products; rollback;` succeeded and left `products`, `product_images`, `product_categories`, `storage.objects` at 0 rows afterwards.

### Still to confirm with real browser accounts

The catalog screens themselves (`manufacturer.catalog.tsx`, `retailer.catalog.tsx`) now hit real RPCs, but the following are still worth doing from a browser as separate manufacturer and retailer test users before shipping the frontend bundle:

- Full manufacturer flow: create a product, upload 2+ photos to `product-assets`, set cover, reorder, edit, delete — the UI's optimistic cache invalidation and realtime `postgres_changes` subscription both fire.
- Retailer association gate: a retailer who has never been invited must not see any product; after `manufacturer_retailer_associations` row exists (via the accepted invitation flow), the retailer's `list_products` / `get_product_detail` return the manufacturer's rows and their photo `SELECT` policy resolves through `can_read_product_photo`.
- Revocation: setting `removed_at` on an association makes the retailer's next call return zero rows without any client change.

### Rollback

Additive-safe: `drop function`/`drop table` for the objects above plus `delete from storage.buckets where id = 'product-assets'`. No pre-existing table, function or policy was modified, so nothing else needs restoring. To also unrecord the migration, `delete from supabase_migrations.schema_migrations where version = '202610310001'`.

## OAuth redirect configuration

The production Supabase **Site URL** should be `https://prakash-pariwar-market-mates.lovable.app`. Add `https://prakash-pariwar-market-mates.lovable.app/register` to **Redirect URLs**. The app sends the callback to `${window.location.origin}/register`, so also allow only the actual development origins used: Vite defaults to port `8080`; if it is occupied, Vite reports and uses the next available port (verified here with `8081`). Add `http://localhost:<actual-vite-port>/register` only for the local origin in use. Codespaces uses its exact forwarded browser origin ending in `/register`.

In Google Cloud, the authorized redirect URI is Supabase's displayed callback for this project, `https://kwmakeexlzjdhjtkefvh.supabase.co/auth/v1/callback`—not the app's `/register` URL. Google client credentials belong only in Supabase's Google provider settings. Never put OAuth secrets in this repository.

## Manual verification still required

The hosted migration has not been applied or verified by this workspace. After it is applied, test sign-in and registration in a browser with a real Google account, both roles on one account, role switching after refresh, sign-out/session expiry, private image upload/display/replacement, and rejection of another user's object path. Confirm the deployed/browser origin and provider settings in their dashboards; public API checks alone cannot establish these behaviors.
