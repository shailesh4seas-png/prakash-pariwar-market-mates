# Supabase Application Setup

## Project configuration

Use only the Prakash Pariwar Supabase project at `https://kwmakeexlzjdhjtkefvh.supabase.co`.

Required app environment variables:

- `VITE_SUPABASE_URL=https://kwmakeexlzjdhjtkefvh.supabase.co`
- `VITE_SUPABASE_PUBLISHABLE_KEY=<project publishable key>`
- `VITE_PUBLIC_APP_URL=https://prakash-pariwar-market-mates.lovable.app`

The frontend only reads the publishable key and refuses an unexpected project URL. Never use a service-role key or OAuth client secret in frontend code or any `VITE_` variable. Copy `.env.example` to `.env` for local configuration; `.env` is ignored by Git.

## Google provider

1. In the selected project's Supabase Dashboard, open **Authentication → Providers → Google** and confirm the provider is enabled.
2. Store the Google OAuth client ID and secret in Supabase provider settings only.
3. In Google Cloud, authorize the Supabase callback shown for this project: `https://kwmakeexlzjdhjtkefvh.supabase.co/auth/v1/callback`.
4. In **Authentication → URL Configuration**, set **Site URL** to `https://prakash-pariwar-market-mates.lovable.app` (origin only). Add `https://prakash-pariwar-market-mates.lovable.app/register` to **Redirect URLs**. OAuth redirects preserve the `invite` or `referral` query parameter on this path. Vite defaults to `http://localhost:8080`; if the port is occupied, it selects the next available port (8081 was reproduced here). Allow the exact local callback in use; for Codespaces allow the exact forwarded browser origin ending in `/register`. Do not set the production Site URL to localhost.

The app uses Google OAuth with PKCE and redirects back to `/register` on the current browser origin, preserving retailer invitation/referral attribution in the callback URL. Supabase JS exchanges the callback code and persists the authenticated session. Standard registration writes the profile directly under existing RLS; attributed registration uses the transactional migration RPC. Registration is not completed unless the backend confirms the write.

The Google Cloud authorized redirect URI is **not** the app's `/register` route. For this project it is `https://kwmakeexlzjdhjtkefvh.supabase.co/auth/v1/callback`, as shown in Supabase's Google provider configuration.

## Database and storage

Review [DATABASE_SETUP.md](DATABASE_SETUP.md) before any hosted SQL operation. The existing setup script documents the intended owner-scoped profile policies and private `profile-assets` bucket. The read-only Storage API probe reported that the approved project currently has no `profile-assets` bucket. The retailer network migration now creates it only if missing, leaving an existing bucket's configuration unchanged, and installs the three owner-scoped object policies from `supabase/setup.sql`. It also adds the association-scoped retailer-photo read policy. Review same-named and other storage policies before applying. The profile UPDATE and retailer network migrations are reported as applied by the project owner; verify remote migration history before relying on that. A new forward migration, `202610230002_retailer_invitation_business_logos.sql`, is required for the current invitation form and must be applied before deploying the matching frontend.

The repository README identifies `https://prakash-pariwar-market-mates.lovable.app` as the live app, and that origin returned HTTP 200 during this task. `VITE_PUBLIC_APP_URL` is set to that origin in `.env.example`; set the same exact value in Lovable's deployment environment and rebuild/redeploy. Keep `/register` out of this variable. Individual and permanent retailer links use this origin.
