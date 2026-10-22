import { createClient } from "@supabase/supabase-js";

const env = import.meta.env;
const SELECTED_PROJECT_URL = "https://kwmakeexlzjdhjtkefvh.supabase.co";
const configuredUrl = (env["VITE_SUPABASE_URL"] as string | undefined)?.replace(/\/+$/, "");
const supabaseKey = env["VITE_SUPABASE_PUBLISHABLE_KEY"] as string | undefined;

export function isApprovedSupabaseUrl(url?: string): boolean {
  return url?.replace(/\/+$/, "") === SELECTED_PROJECT_URL;
}

const projectMatches = isApprovedSupabaseUrl(configuredUrl);

export const supabase =
  projectMatches && supabaseKey
    ? createClient(SELECTED_PROJECT_URL, supabaseKey, {
        auth: {
          flowType: "pkce",
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      })
    : null;

export const SUPABASE_SETUP_MESSAGE =
  !configuredUrl || !supabaseKey
    ? "Google sign-in is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in the local environment."
    : !projectMatches
      ? "The configured Supabase project is not the approved Prakash Pariwar project. Check VITE_SUPABASE_URL."
      : "Google sign-in is unavailable. Check the Google provider settings in Supabase Auth.";

export async function startGoogleSignIn() {
  if (!supabase) throw new Error(SUPABASE_SETUP_MESSAGE);

  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: new URL("/register", window.location.origin).toString() },
  });

  if (error) throw error;
}
