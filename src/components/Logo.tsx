import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={cn("h-9 w-9 text-gold", className)} fill="none" aria-hidden>
      <path d="M20 4c3 5 6 8 6 13a6 6 0 0 1-12 0c0-5 3-8 6-13Z" fill="currentColor" />
      <path d="M20 14c1.4 2.3 2.6 3.7 2.6 5.8a2.6 2.6 0 0 1-5.2 0c0-2.1 1.2-3.5 2.6-5.8Z" fill="var(--sidebar)" opacity=".55" />
      <path
        d="M4 24c5 0 10 2 16 10 6-8 11-10 16-10-1 7-7 12-16 12S5 31 4 24Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M11 22c3 1 6 4 9 9 3-5 6-8 9-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ className, tone = "light" }: { className?: string; tone?: "light" | "dark" }) {
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <LogoMark />
      <span className={cn("font-display text-xl font-semibold", tone === "light" ? "text-gold" : "text-foreground")}>
        Prakash <span className={tone === "light" ? "text-sidebar-accent-foreground" : "text-primary"}>Pariwar</span>
      </span>
    </span>
  );
}
