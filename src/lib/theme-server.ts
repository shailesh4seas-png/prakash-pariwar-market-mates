import { createIsomorphicFn } from "@tanstack/react-start";
import { getCookie } from "@tanstack/react-start/server";
import { THEME_COOKIE_NAME, type ResolvedTheme } from "@/lib/theme-context";

/**
 * Theme class for SSR/hydration: server reads the mirrored cookie, client reuses
 * whatever the pre-paint inline script already applied to <html>.
 */
export const getServerResolvedTheme = createIsomorphicFn()
  .server((): ResolvedTheme | undefined => {
    try {
      const value = getCookie(THEME_COOKIE_NAME);
      return value === "dark" || value === "light" ? value : undefined;
    } catch {
      return undefined;
    }
  })
  .client((): ResolvedTheme | undefined => {
    if (typeof document === "undefined") return undefined;
    return document.documentElement.classList.contains("dark") ? "dark" : "light";
  });
