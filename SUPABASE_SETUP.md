# Supabase Application Setup

## Project configuration

Use only the Prakash Pariwar Supabase project at `https://kwmakeexlzjdhjtkefvh.supabase.co`.

Required app environment variables:

- `VITE_SUPABASE_URL=https://kwmakeexlzjdhjtkefvh.supabase.co`
- `VITE_SUPABASE_PUBLISHABLE_KEY=<project publishable key>`

The frontend only reads the publishable key and refuses an unexpected project URL. Never use a service-role key or OAuth client secret in frontend code or any `VITE_` variable. Copy `.env.example` to `.env` for local configuration; `.env` is ignored by Git.

## Google provider

1. In the selected project's Supabase Dashboard, open **Authentication → Providers → Google** and confirm the provider is enabled.
2. Store the Google OAuth client ID and secret in Supabase provider settings only.
3. In Google Cloud, authorize the Supabase callback shown for this project: `https://kwmakeexlzjdhjtkefvh.supabase.co/auth/v1/callback`.
4. In **Authentication → URL Configuration**, add the exact app callback `${window.location.origin}/register` for each development origin. This workspace currently runs Vite on port `8081` because `8080` is occupied, so the localhost callback is `http://localhost:8081/register`. For Codespaces, use the forwarded app URL shown in the browser, followed by `/register`.
5. Keep production origins separate. Do not invent or add an unselected production hostname.

The app uses Google OAuth with PKCE and redirects back to `/register`. Supabase JS exchanges the callback code and persists the authenticated session. The client displays cancellation and session errors; registration is not completed unless the profile insert succeeds.

## Database and storage

Review [DATABASE_SETUP.md](DATABASE_SETUP.md) before any hosted SQL operation. The existing setup script documents the intended owner-scoped profile policies and private `profile-assets` bucket. The new migration adds only authenticated-owner UPDATE policies. No hosted schema change has been run or confirmed by this workspace.
