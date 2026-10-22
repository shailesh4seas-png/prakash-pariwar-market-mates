import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Logo } from "@/components/Logo";
import { DEMO_USERS, ROLE_LABEL, useSession } from "@/lib/session";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in · Prakash Pariwar" },
      { name: "description", content: "Sign in to your Prakash Pariwar manufacturer or retailer workspace." },
      { property: "og:title", content: "Sign in · Prakash Pariwar" },
      { property: "og:description", content: "Access your manufacturer or retailer dashboard." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Login,
});

function Login() {
  const { signIn } = useSession();
  const navigate = useNavigate();
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-night px-4 py-10">
      <div className="w-full max-w-lg">
        <Link to="/" className="mb-8 flex justify-center"><Logo /></Link>
        <div className="rounded-3xl bg-card p-6 shadow-glow sm:p-8">
          <h1 className="text-2xl font-bold">Welcome back</h1>
          <p className="mt-1 text-sm text-muted-foreground">Demo mode — pick an account to sign in.</p>
          <div className="mt-6 space-y-3">
            {DEMO_USERS.map((u) => (
              <button
                key={u.id}
                onClick={() => {
                  const r = signIn(u.id);
                  navigate({ to: r === "manufacturer" ? "/manufacturer" : "/retailer" });
                }}
                className="flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition hover:border-primary hover:bg-accent"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-primary text-sm font-bold text-primary-foreground">{u.initials}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{u.business}</span>
                  <span className="mt-1 flex flex-wrap gap-1.5">
                    {u.roles.map((r) => <span key={r} className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">{ROLE_LABEL[r]}</span>)}
                  </span>
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
