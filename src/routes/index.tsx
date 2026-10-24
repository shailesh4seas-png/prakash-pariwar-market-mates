import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BarChart3,
  Download,
  Factory,
  Palette,
  Send,
  Sparkles,
  Store,
  Users,
  Zap,
} from "lucide-react";
import heroDiwali from "@/assets/hero-diwali.jpg";
import { Logo } from "@/components/Logo";
import { TemplatePoster } from "@/components/TemplateCard";
import { TEMPLATES } from "@/lib/data";
import { startGoogleSignIn } from "@/lib/supabase";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Prakash Pariwar — Festive marketing templates for brands & retailers" },
      {
        name: "description",
        content:
          "Manufacturers publish branded festival and product templates. Retailers add their store details and post in seconds.",
      },
      { property: "og:title", content: "Prakash Pariwar — Branded content made easy" },
      {
        property: "og:description",
        content:
          "Ready-to-use Diwali, Holi and product creatives shared from manufacturers to retailers.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const NAV = [
  ["Home", "#top"],
  ["Features", "#features"],
  ["Templates", "#templates"],
  ["About", "#about"],
];

function Landing() {
  const preview = TEMPLATES.filter((t) => ["t1", "t3", "t11", "t9", "t5", "t2"].includes(t.id));
  const continueWithGoogle = async () => {
    try {
      await startGoogleSignIn();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Google sign-in could not start.");
    }
  };
  return (
    <div id="top" className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 bg-sidebar/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Logo />
          <nav className="hidden items-center gap-7 text-sm font-medium text-sidebar-foreground md:flex">
            {NAV.map(([l, h]) => (
              <a key={l} href={h} className="hover:text-gold">
                {l}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Link
              to="/login"
              className="hidden rounded-xl px-4 py-2 text-sm font-semibold text-sidebar-accent-foreground hover:bg-sidebar-accent sm:block"
            >
              Login
            </Link>
            <Link
              to="/login"
              className="rounded-xl bg-gold px-4 py-2 text-sm font-bold text-gold-foreground"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden bg-sidebar">
        <img
          src={heroDiwali}
          alt=""
          width={1792}
          height={768}
          className="absolute inset-0 h-full w-full object-cover opacity-50"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-sidebar via-sidebar/85 to-sidebar/30" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:py-28">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-gold/50 px-3 py-1 text-xs font-semibold text-gold">
              <Sparkles className="h-3.5 w-3.5" /> Diwali 2026 templates are live
            </span>
            <h1 className="mt-5 font-display text-4xl font-semibold leading-[1.1] text-primary-foreground sm:text-6xl">
              Your brand's festive posts, <span className="text-gold">in every store's</span>{" "}
              WhatsApp.
            </h1>
            <p className="mt-5 max-w-lg text-lg text-sidebar-foreground">
              Manufacturers publish on-brand templates once. Retailers add their store name and
              phone, and post in under a minute.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/login"
                className="flex items-center gap-2 rounded-xl bg-gradient-primary px-6 py-3.5 font-semibold text-primary-foreground shadow-glow"
              >
                Get Started free <ArrowRight className="h-4 w-4" />
              </Link>
              <button
                type="button"
                onClick={continueWithGoogle}
                className="flex items-center gap-2 rounded-xl border border-sidebar-border bg-card px-5 py-3.5 font-semibold text-foreground transition hover:bg-muted"
              >
                <GoogleMark /> Continue with Google
              </button>
              <a
                href="#how"
                className="rounded-xl border border-sidebar-border px-6 py-3.5 font-semibold text-sidebar-accent-foreground hover:bg-sidebar-accent"
              >
                See how it works
              </a>
            </div>
          </div>
          <div id="templates" className="grid scroll-mt-20 grid-cols-3 gap-3">
            {preview.map((t, i) => (
              <TemplatePoster
                key={t.id}
                t={t}
                className={`shadow-glow ring-1 ring-sidebar-border ${i % 3 === 1 ? "translate-y-6" : ""}`}
              />
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-20 sm:px-6">
        <h2 className="text-center font-display text-3xl font-semibold sm:text-4xl">
          Built for both sides of the counter
        </h2>
        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          {[
            {
              icon: Factory,
              title: "For manufacturers",
              points: [
                [Palette, "Lock your logo, colours and fonts into every creative"],
                [Send, "Publish festival campaigns to your whole network at once"],
                [BarChart3, "See which retailers use what, and which designs perform"],
              ],
            },
            {
              icon: Store,
              title: "For retailers",
              points: [
                [Zap, "Fresh Diwali, Holi and product posts, ready every week"],
                [Users, "Add your shop name, phone and address automatically"],
                [Download, "Download for Instagram posts or WhatsApp stories"],
              ],
            },
          ].map((b) => (
            <div key={b.title} className="rounded-3xl bg-card p-8 shadow-card">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-primary text-primary-foreground">
                <b.icon className="h-6 w-6" />
              </span>
              <h3 className="mt-5 text-2xl font-bold">{b.title}</h3>
              <ul className="mt-5 space-y-4">
                {b.points.map(([Icon, txt]) => {
                  const I = Icon as typeof Zap;
                  return (
                    <li key={txt as string} className="flex gap-3">
                      <I className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                      <span className="text-muted-foreground">{txt as string}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section id="how" className="scroll-mt-20 bg-card py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <h2 className="text-center font-display text-3xl font-semibold sm:text-4xl">
            How it works
          </h2>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {[
              [
                "01",
                "Brand designs",
                "The manufacturer creates templates with their logo, products and offers.",
              ],
              [
                "02",
                "Retailer personalises",
                "Retailers pick a template and add their store details in one tap.",
              ],
              [
                "03",
                "Customers see it",
                "The finished post goes out on WhatsApp, Instagram and Facebook.",
              ],
            ].map(([n, t, d]) => (
              <div key={n} className="rounded-3xl border p-7">
                <p className="font-display text-5xl font-semibold text-gold">{n}</p>
                <h3 className="mt-4 text-xl font-bold">{t}</h3>
                <p className="mt-2 text-muted-foreground">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="about" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-20 sm:px-6">
        <div className="rounded-3xl bg-gradient-festive p-10 text-center sm:p-16">
          <h2 className="font-display text-3xl font-semibold text-primary-foreground sm:text-5xl">
            One family. Every festival. Every store.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-primary-foreground/85">
            Prakash Pariwar connects Indian brands with the shops that sell them, so every
            celebration looks its best.
          </p>
          <Link
            to="/login"
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-card px-6 py-3.5 font-semibold text-foreground"
          >
            Start for free <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <footer className="bg-sidebar py-10 text-sidebar-foreground">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6">
          <Logo />
          <p className="text-sm">© 2026 Prakash Pariwar. Made in India.</p>
        </div>
      </footer>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 48 48" className="h-5 w-5 shrink-0">
      <path
        fill="#4285F4"
        d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.2v5.1h6.6c3.9-3.6 6.1-8.8 6.1-15Z"
      />
      <path
        fill="#34A853"
        d="M24 44c5.5 0 10.1-1.8 13.5-4.8l-6.6-5.1c-1.8 1.2-4.1 2-6.9 2-5.3 0-9.8-3.6-11.4-8.4H5.8v5.2A20 20 0 0 0 24 44Z"
      />
      <path fill="#FBBC05" d="M12.6 27.7a12 12 0 0 1 0-7.4v-5.2H5.8a20 20 0 0 0 0 17.8l6.8-5.2Z" />
      <path
        fill="#EA4335"
        d="M24 11.9c3 0 5.7 1 7.8 3.1l5.8-5.8C34.1 5.9 29.5 4 24 4A20 20 0 0 0 5.8 15.1l6.8 5.2c1.6-4.8 6.1-8.4 11.4-8.4Z"
      />
    </svg>
  );
}
