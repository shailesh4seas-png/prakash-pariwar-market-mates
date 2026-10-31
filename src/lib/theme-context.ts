import { createContext, useContext } from "react";

// Keep context identity outside the refreshable provider module so hot updates
// to the provider never recreate the context consumed by routes (same pattern
// as session-context.ts).
export const ThemeContext = createContext<ThemeState | null>(null);

export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export interface ThemeState {
  /** The user's explicit choice; defaults to following the OS. */
  preference: ThemePreference;
  /** What is actually applied after resolving "system" against the OS setting. */
  resolved: ResolvedTheme;
  setPreference: (preference: ThemePreference) => void;
}

export const THEME_STORAGE_KEY = "pp-theme-preference";
export const THEME_COOKIE_NAME = "pp-theme-preference-resolved";

export function normalizeThemePreference(value: unknown): ThemePreference | null {
  return value === "light" || value === "dark" || value === "system" ? value : null;
}

export function readStoredThemePreference(): ThemePreference {
  try {
    return normalizeThemePreference(localStorage.getItem(THEME_STORAGE_KEY)) ?? "system";
  } catch {
    // Browser storage may be unavailable; following the system is the default.
    return "system";
  }
}

export function storeThemePreference(preference: ThemePreference) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // The in-memory preference still applies for this session.
  }
}

export function systemPrefersDark(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function resolveTheme(
  preference: ThemePreference,
  prefersDark = systemPrefersDark(),
): ResolvedTheme {
  if (preference === "system") return prefersDark ? "dark" : "light";
  return preference;
}

/**
 * A tiny cookie mirrors the resolved theme so SSR can render <html class="dark">
 * and avoid a hydration mismatch; localStorage stays the source of truth.
 */
export function syncThemeCookie(resolved: ResolvedTheme) {
  try {
    document.cookie = `${THEME_COOKIE_NAME}=${resolved};path=/;max-age=31536000;samesite=lax`;
  } catch {
    // Cookie mirroring is optional; the .dark class is what matters.
  }
}

/** Adds/removes the .dark class and reflects the theme in the browser UI chrome. */
export function applyResolvedTheme(resolved: ResolvedTheme) {
  const root = document.documentElement;
  root.classList.toggle("dark", resolved === "dark");
  syncThemeCookie(resolved);
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  const color = resolved === "dark" ? "#000000" : "#f8f8fa";
  if (meta) meta.content = color;
  else {
    const tag = document.createElement("meta");
    tag.name = "theme-color";
    tag.content = color;
    document.head.appendChild(tag);
  }
}

/**
 * Inline <head> script that applies the saved choice before first paint so no
 * light/dark flash happens on load. Kept in sync with the helpers above.
 */
export const themeInitScript = `(function () {
  try {
    var k = "${THEME_STORAGE_KEY}";
    var v = localStorage.getItem(k);
    var p = v === "light" || v === "dark" ? v : "system";
    var d = p === "dark" || (p === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", d);
    var m = document.querySelector('meta[name="theme-color"]');
    if (!m) {
      m = document.createElement("meta");
      m.name = "theme-color";
      document.head.appendChild(m);
    }
    m.content = d ? "#000000" : "#f8f8fa";
  } catch (e) {}
})();`;

export function useTheme(): ThemeState {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme outside provider");
  return context;
}
