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
