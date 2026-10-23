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

## OAuth redirect configuration

The production Supabase **Site URL** should be `https://prakash-pariwar-market-mates.lovable.app`. Add `https://prakash-pariwar-market-mates.lovable.app/register` to **Redirect URLs**. The app sends the callback to `${window.location.origin}/register`, so also allow only the actual development origins used: Vite defaults to port `8080`; if it is occupied, Vite reports and uses the next available port (verified here with `8081`). Add `http://localhost:<actual-vite-port>/register` only for the local origin in use. Codespaces uses its exact forwarded browser origin ending in `/register`.

In Google Cloud, the authorized redirect URI is Supabase's displayed callback for this project, `https://kwmakeexlzjdhjtkefvh.supabase.co/auth/v1/callback`—not the app's `/register` URL. Google client credentials belong only in Supabase's Google provider settings. Never put OAuth secrets in this repository.

## Manual verification still required

The hosted migration has not been applied or verified by this workspace. After it is applied, test sign-in and registration in a browser with a real Google account, both roles on one account, role switching after refresh, sign-out/session expiry, private image upload/display/replacement, and rejection of another user's object path. Confirm the deployed/browser origin and provider settings in their dashboards; public API checks alone cannot establish these behaviors.
