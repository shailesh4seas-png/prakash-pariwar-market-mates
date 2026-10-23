import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { Logo } from "@/components/Logo";
import { useSession } from "@/lib/session";
import { startGoogleSignIn } from "@/lib/supabase";

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>) => ({
    ...(typeof search["invite"] === "string" ? { invite: search["invite"] } : {}),
    ...(typeof search["referral"] === "string" ? { referral: search["referral"] } : {}),
  }),
  head: () => ({
    meta: [
      { title: "Sign in · Prakash Pariwar" },
      {
        name: "description",
        content: "Sign in to your Prakash Pariwar manufacturer or retailer workspace.",
      },
      { property: "og:title", content: "Sign in · Prakash Pariwar" },
      { property: "og:description", content: "Access your manufacturer or retailer dashboard." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Login,
});

function Login() {
  const { invite, referral } = Route.useSearch();
  const { ready, user, authUser, activeRole, sessionError, refreshAuthUser } = useSession();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!ready || !authUser || sessionError) return;
    if (invite || referral) {
      void navigate({ to: "/register", search: { ...(invite ? { invite } : {}), ...(referral ? { referral } : {}) }, replace: true });
      return;
    }
    const role = activeRole ?? user?.roles[0];
    void navigate({
      to:
        role === "manufacturer" ? "/manufacturer" : role === "retailer" ? "/retailer" : "/register",
      replace: true,
    });
  }, [activeRole, authUser, invite, referral, navigate, ready, sessionError, user]);

  const signIn = async () => {
    setError("");
    setLoading(true);
    try {
      await startGoogleSignIn({
        ...(invite ? { invite } : {}),
        ...(referral ? { referral } : {}),
      });
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Google sign-in could not start. Please try again.",
      );
      setLoading(false);
    }
  };

  const retryProfileLoad = async () => {
    setRetrying(true);
    setError("");
    try {
      await refreshAuthUser();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Your account could not be loaded. Please try again.",
      );
    } finally {
      setRetrying(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-night px-4 py-10">
      <div className="w-full max-w-lg">
        <Link to="/" className="mb-8 flex justify-center">
          <Logo />
        </Link>
        <div className="rounded-3xl bg-card p-6 shadow-glow sm:p-8">
          <h1 className="text-2xl font-bold">Welcome back</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sign in securely with your Google account.
          </p>
          {(error || sessionError || !ready) && (
            <p
              role={error || sessionError ? "alert" : "status"}
              className="mt-5 rounded-lg bg-muted p-3 text-sm"
            >
              {error || sessionError || "Checking your session..."}
            </p>
          )}
          {!error && ready && !authUser && (
            <button
              type="button"
              onClick={() => void signIn()}
              disabled={loading}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3.5 font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-wait disabled:opacity-70"
            >
              {loading ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <GoogleMark />}
              {loading ? "Connecting to Google..." : "Continue with Google"}
              {!loading && <ArrowRight className="h-4 w-4" />}
            </button>
          )}
          {authUser && (sessionError || error) && (
            <button
              type="button"
              onClick={() => void retryProfileLoad()}
              disabled={retrying}
              className="mt-4 text-sm font-semibold text-primary disabled:opacity-60"
            >
              {retrying ? "Retrying..." : "Retry loading account"}
            </button>
          )}
          {error && (
            <button
              type="button"
              onClick={() => void signIn()}
              className="mt-4 text-sm font-semibold text-primary"
            >
              Try again
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function GoogleMark() {
  return (
    <span
      aria-hidden="true"
      className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-sm font-bold text-[#4285F4]"
    >
      G
    </span>
  );
}
