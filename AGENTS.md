<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Project rules
- Sign-in uses Supabase Google OAuth; the Supabase session is the sole authentication source. Exactly two app roles exist, manufacturer and retailer; profile rows determine available roles, and role checks go through resolveRole so a user never activates a role they lack. Browser storage may retain only the active-role preference.
- Each dashboard is a layout route (retailer.tsx, manufacturer.tsx) wrapping AppShell with ssr:false. Why: session lives in the browser.
- Retailer onboarding reuses the existing private storage bucket and transactional RPCs; deliver security changes as forward migrations without editing applied versions or issuing hosted writes outside the authorized workflow.
- Validate shared retailer URLs through the invitation helper and retain tokens only in attribution URLs; delete failed uploads only after a confirmed rejected write, never after an ambiguous network outcome.
- Use the shared upload-cleanup decision for invitation and registration writes; network failures and server errors cannot prove a transaction was rejected.
- Define session context in a separate non-component module; hot updates to the provider must not recreate the context consumed by lazy routes.
- Version new festival artwork in template specs; keep old saved specs unchanged, and use the same artwork resolver and brand overrides for preview, saved drafts and PNG export.
- Keep brand-detail inputs shared between manufacturer editor and retailer viewer; manufacturer edits persist in the existing draft spec while retailer edits remain local to their preview/export.
