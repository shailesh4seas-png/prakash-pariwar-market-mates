# Project Audit

## Findings and fixes

| Severity | Finding | Files affected | Planned fix / status |
| --- | --- | --- | --- |
| Critical | The login page and session provider accepted hardcoded sample identities without Supabase authentication. | `src/routes/login.tsx`, `src/lib/session.tsx`, `src/test/roles.test.ts` | Replaced login with Google OAuth; removed demo identities and local fake sessions; profile-derived roles only. Focused tests pass. |
| High | OAuth callback/session errors and profile query errors could be mistaken for a new account; the callback had no useful cancellation message. | `src/lib/supabase.ts`, `src/lib/session.tsx`, `src/routes/register.tsx` | Explicit PKCE/session persistence, callback error messages, session restoration, query error handling, and auth-user verification before writes. |
| High | Supabase URL was configurable to any project and the client accepted a legacy key variable. | `src/lib/supabase.ts`, `.env.example` | Client now accepts only `https://kwmakeexlzjdhjtkefvh.supabase.co` and `VITE_SUPABASE_PUBLISHABLE_KEY`. |
| High | Profile editing needed an owner-scoped row UPDATE policy. Image replacement does not need storage UPDATE because it uses new UUID paths and the existing owner-scoped DELETE policy. | `src/components/ProfileSettings.tsx`, `src/routes/register.tsx`, `supabase/setup.sql`, `supabase/migrations/202610220001_profile_and_asset_updates.sql` | Re-verify the authenticated user before writes; keep paths under that user ID; add only the narrowly scoped profile UPDATE policy. Migration is local and still must be applied/verified on the hosted project. |
| Medium | The retailer profile rendered fabricated business category, city, and join date rather than the authenticated profile. | `src/components/ProfileSettings.tsx`, `src/lib/session.tsx` | Display actual profile fields and signed URLs for private images; share editing between both role dashboards. |
| Medium | Dashboard content and actions use static sample data or local-only behavior, including template/campaign/analytics/retailer data, Brand Kits, settings, and creative downloads. | `src/lib/data.ts`, `src/lib/library.ts`, `src/routes/**`, `src/components/AppShell.tsx` | Kept the preview experience; added a visible prototype notice. These are not represented as Supabase-backed features. |
| Medium | `.env` is local configuration and must remain untracked; setup documentation was stale and claimed no credentials were configured. | `.gitignore`, `.env.example`, `SUPABASE_SETUP.md`, `DATABASE_SETUP.md` | `.env` is ignored and untracked. Added a placeholder-only example and corrected setup docs. |
| Low | No TypeScript script is declared, and there were no project migrations before this change. | `package.json`, `supabase/` | Use `bun x tsc --noEmit` for type checking; add one replay-safe, named policy migration. |

## Flow traced

1. The public landing page's Google button calls `startGoogleSignIn`; the login page now uses the same OAuth helper.
2. OAuth uses Supabase PKCE and redirects to `${window.location.origin}/register`. Supabase JS detects the callback URL, exchanges the code, persists/refreshes the session, and emits auth state changes.
3. `SessionProvider` loads profiles only for the authenticated Supabase user, selects the active role from that user's returned role rows, and keeps the role preference in browser storage. The browser preference is not an authentication credential.
4. A user without a profile selects Manufacturer or Retailer and completes registration. The flow re-verifies the Supabase identity, uploads images to the user's private bucket folder, and inserts a `(user_id, role)` profile using the verified email and user ID.
5. A second role is another profile row for the same `auth.users.id`; `RoleMenu` only switches to a role present in loaded profile rows. Dashboard layout routes reject unauthenticated users or users without that role.
6. Sign-out calls Supabase and waits for success before routing to the login screen.

## Configuration and security checks

- Local `.env` was present; `VITE_SUPABASE_URL` matched the selected project and `VITE_SUPABASE_PUBLISHABLE_KEY` was present. Credential values were not displayed.
- `.env` is ignored and not tracked. A tracked-file scan found no service-role/private-key markers.
- A read-only request to the selected project's public Auth settings returned HTTP 200 and reported Google enabled. A profile REST endpoint returned HTTP 200. The attempted bucket metadata endpoint returned HTTP 400, so hosted bucket policy/configuration is **not confirmed**.
- No hosted SQL was run. The hosted database schema, storage policies, redirect allowlist, and an end-to-end Google login remain to be manually confirmed.
- Project scripts: `build`, `lint`, `test`; no dedicated typecheck script. Run `bun x tsc --noEmit` for TypeScript.

## Verification checklist

- [x] Remove sample-account login and local fake auth.
- [x] Add selected-project allowlist and test it.
- [x] Add role and registration validation tests.
- [x] Ensure registration checks the authenticated identity and requires successful profile insert.
- [x] Add private signed URLs and one narrowly scoped local profile UPDATE policy.
- [x] Label mock dashboard functionality.
- [ ] Apply the policy migration to the selected Supabase project and verify it with the SQL queries in `DATABASE_SETUP.md`.
- [ ] In a browser, test Google success, cancellation, expired session, refresh persistence, first registration, second-role registration, role switching, sign-out, image replacement, and cross-user access denial.
- [x] Run build, complete tests, TypeScript, and focused lint for changed auth/profile files. Full-repository lint still reports pre-existing Prettier violations across legacy routes/components; `AppShell.tsx` retains its original formatting style.
- [ ] Verify the active Codespaces origin is in Supabase's redirect allowlist and complete browser-based Google/OAuth/storage tests.
