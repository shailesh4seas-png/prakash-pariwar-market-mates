import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  ThemeContext,
  applyResolvedTheme,
  readStoredThemePreference,
  storeThemePreference,
  type ResolvedTheme,
  type ThemePreference,
} from "@/lib/theme-context";
import { getServerResolvedTheme } from "@/lib/theme-server";

export function ThemeProvider({ children }: { children: ReactNode }) {
  // SSR-safe: the pre-paint head script has already set the class, and this
  // initializer only runs in the browser (and hydrates with the same value the
  // inline script applied).
  const [preference, setPreferenceState] = useState<ThemePreference>(() =>
    typeof window === "undefined" ? "system" : readStoredThemePreference(),
  );
  const [systemDark, setSystemDark] = useState<boolean>(() => {
    // Seed from the SSR-resolved theme (server cookie / client <html> class) so
    // the first client render matches the server HTML; the media-query effect
    // below immediately rebalances to the real OS value.
    if (typeof window === "undefined") return getServerResolvedTheme() === "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  // Follow OS setting changes live while the preference is "system".
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (event: MediaQueryListEvent) => setSystemDark(event.matches);
    mq.addEventListener("change", onChange);
    setSystemDark(mq.matches);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const resolved: ResolvedTheme =
    preference === "system" ? (systemDark ? "dark" : "light") : preference;

  useEffect(() => {
    applyResolvedTheme(resolved);
  }, [resolved]);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    storeThemePreference(next);
  }, []);

  return (
    <ThemeContext.Provider value={{ preference, resolved, setPreference }}>
      {children}
    </ThemeContext.Provider>
  );
}
