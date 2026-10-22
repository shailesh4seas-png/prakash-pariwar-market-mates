# Database Setup and Verification

## Approved project

Use only `https://kwmakeexlzjdhjtkefvh.supabase.co` for Prakash Pariwar. The frontend rejects any other `VITE_SUPABASE_URL`. Configure only `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in local/deployment settings. Never use a service-role key in browser code or a `VITE_` variable.

The local `.env` was checked without printing values: the URL matches the approved project and the publishable-key variable is present. `.env` is ignored and untracked. The frontend's read-only Auth settings check reported Google enabled; this does not prove that OAuth succeeds in a browser.

## Existing schema

The repository's `supabase/setup.sql` defines `public.user_profiles` with `(user_id, role)` as its primary key, a foreign key to `auth.users(id)`, and RLS enabled. It restricts roles to `manufacturer` and `retailer`; profile reads and inserts require the authenticated user's ID, and inserts also require the JWT email. The private `profile-assets` bucket is configured for PNG/JPEG/WebP up to 5 MiB with first-folder ownership policies for insert, select, and delete.

No duplicate table or bucket is needed. Do not reset the database, disable RLS, or apply the bootstrap SQL over a database whose existing policies have not been reviewed. The public profile REST endpoint responded successfully, but its full schema and policies were not introspected. The attempted public bucket metadata request returned HTTP 400; bucket existence, privacy, size/MIME configuration, and policies are unconfirmed on the hosted project.

## Required policy migration

`supabase/migrations/202610220001_profile_and_asset_updates.sql` adds one policy only:

- `Users can update their own profiles`: UPDATE is limited to rows whose user ID and JWT email match the authenticated account; the resulting row must still have that identity and one of the two supported roles.
- Storage UPDATE is deliberately not added. The app replaces a profile image by uploading a new UUID-named object and deleting the old one under the existing owner-scoped DELETE policy; it never overwrites an object.

This is replay-safe: it drops and recreates only the exact profile UPDATE policy. It does not create tables/buckets, change data, or change RLS enablement. Existing select/insert/delete policies are left untouched. The setup script contains the same profile policy for a fresh setup.

### Apply in Supabase SQL Editor

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

Verify the profile primary key is `(user_id, role)`, expected required columns are present, `profile-assets` remains private, and its limits are 5 MiB and `image/png`, `image/jpeg`, `image/webp`.

### Rollback

Only if the new UPDATE policies need to be removed, run:

```sql
drop policy if exists "Users can update their own profiles" on public.user_profiles;
```

This leaves all profile rows, buckets, RLS settings, and other policies intact. It disables profile-row editing; it does not undo registration, image replacement, or delete uploaded files.

## OAuth redirect configuration

The app sends the callback to `${window.location.origin}/register`. Allow that exact callback URL in Supabase **Authentication → URL Configuration → Redirect URLs** for each development origin actually used. This workspace's dev server is currently on port `8081` because `8080` is occupied; if accessed as localhost, the callback is `http://localhost:8081/register`. A Codespaces browser uses the forwarded app origin instead, so allow the exact URL shown in that browser, ending in `/register`. Keep production origins separate and add one only after the real domain is selected.

In Google Cloud, the authorized redirect URI is Supabase's displayed callback for this project, `https://kwmakeexlzjdhjtkefvh.supabase.co/auth/v1/callback`. Google client credentials belong only in Supabase's Google provider settings. Never put OAuth secrets in this repository.

## Manual verification still required

The hosted migration has not been applied or verified by this workspace. After it is applied, test sign-in and registration in a browser with a real Google account, both roles on one account, role switching after refresh, sign-out/session expiry, private image upload/display/replacement, and rejection of another user's object path. Confirm the deployed/browser origin and provider settings in their dashboards; public API checks alone cannot establish these behaviors.
