import { Link, Navigate, useRouterState, type LinkProps } from "@tanstack/react-router";
import { Bell, Menu, Search, Sparkles, type LucideIcon } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Logo } from "@/components/Logo";
import { RoleMenu } from "@/components/RoleMenu";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { ROLE_LABEL, useSession, type Role } from "@/lib/session";
import { cn } from "@/lib/utils";

export interface NavItem {
  label: string;
  to: NonNullable<LinkProps["to"]>;
  icon: LucideIcon;
  exact?: boolean;
}

function SidebarBody({ items, role, onNav }: { items: NavItem[]; role: Role; onNav?: () => void }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="flex h-full flex-col bg-sidebar px-4 py-5 text-sidebar-foreground">
      <Link to="/" className="px-1">
        <Logo />
      </Link>
      <span className="mt-4 inline-flex w-fit items-center gap-1.5 rounded-full border border-sidebar-border px-3 py-1 text-xs font-medium text-gold">
        <span className="h-1.5 w-1.5 rounded-full bg-gold" /> {ROLE_LABEL[role]} workspace
      </span>
      <nav className="mt-6 space-y-1">
        {items.map((it) => {
          const active = it.exact ? path === it.to : path === it.to || path.startsWith(String(it.to) + "/");
          return (
            <Link
              key={it.to}
              to={it.to}
              onClick={onNav}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                active
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-glow"
                  : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              )}
            >
              <it.icon className="h-[18px] w-[18px] shrink-0" />
              {it.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto rounded-2xl bg-gradient-night p-5 ring-1 ring-sidebar-border">
        <div className="flex items-start justify-between">
          <p className="font-display text-xl font-semibold leading-tight text-sidebar-accent-foreground">
            Create
            <br />
            Engage
            <br />
            Grow
          </p>
          <Sparkles className="h-5 w-5 text-primary-glow" />
        </div>
        <p className="mt-3 text-xs leading-relaxed text-sidebar-foreground">Branded content made easy for your business.</p>
      </div>
    </div>
  );
}

export function AppShell({ role, items, children }: { role: Role; items: NavItem[]; children: ReactNode }) {
  const { ready, user, activeRole } = useSession();
  const [open, setOpen] = useState(false);

  if (!ready) return <div className="min-h-screen bg-background" />;
  if (!user) return <Navigate to="/login" replace />;
  if (!user.roles.includes(role)) return <Navigate to={activeRole === "manufacturer" ? "/manufacturer" : "/retailer"} replace />;

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 lg:block">
        <SidebarBody items={items} role={role} />
      </aside>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-72 border-none p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SidebarBody items={items} role={role} onNav={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b bg-card/90 px-4 py-3 backdrop-blur sm:px-6">
          <button onClick={() => setOpen(true)} className="rounded-lg p-2 hover:bg-muted lg:hidden" aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </button>
          <div className="relative col-start-2 max-w-xl">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              placeholder={role === "retailer" ? "Search templates, festivals, offers..." : "Search templates, campaigns, retailers..."}
              className="w-full rounded-xl border bg-muted/60 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-primary focus:bg-card"
            />
          </div>
          <div className="flex items-center gap-1 sm:gap-3">
            <button className="relative rounded-full p-2 hover:bg-muted" aria-label="Notifications">
              <Bell className="h-5 w-5" />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-destructive" />
            </button>
            <RoleMenu />
          </div>
        </header>
        <main className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6">{children}</main>
      </div>
    </div>
  );
}

export function PageHeader({ title, desc, action }: { title: string; desc?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
        {desc && <p className="mt-1 text-sm text-muted-foreground">{desc}</p>}
      </div>
      {action}
    </div>
  );
}
