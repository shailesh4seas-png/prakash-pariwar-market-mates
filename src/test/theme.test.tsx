import { beforeEach, describe, expect, it } from "vitest";
import { act, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { ThemeProvider } from "@/lib/theme";
import {
  THEME_COOKIE_NAME,
  THEME_STORAGE_KEY,
  applyResolvedTheme,
  normalizeThemePreference,
  readStoredThemePreference,
  resolveTheme,
  storeThemePreference,
  themeInitScript,
  useTheme,
} from "@/lib/theme-context";

function Probe(): ReactNode {
  const { preference, resolved, setPreference } = useTheme();
  return (
    <div>
      <span data-testid="preference">{preference}</span>
      <span data-testid="resolved">{resolved}</span>
      <button
        onClick={() => {
          setPreference("dark");
        }}
      >
        go dark
      </button>
    </div>
  );
}

/** jsdom matchMedia stub with a controllable value and live change listeners. */
function stubMatchMedia(initial: boolean) {
  const listeners = new Set<(event: { matches: boolean }) => void>();
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      get matches() {
        return initial;
      },
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: (_: string, cb: (event: { matches: boolean }) => void) => listeners.add(cb),
      removeEventListener: (_: string, cb: (event: { matches: boolean }) => void) =>
        listeners.delete(cb),
      dispatchEvent: () => false,
    }),
  });
  return {
    set(value: boolean) {
      initial = value;
      listeners.forEach((cb) => cb({ matches: value }));
    },
  };
}

describe("theme preference helpers", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("dark");
  });

  it("defaults to system when nothing is stored", () => {
    expect(readStoredThemePreference()).toBe("system");
  });

  it("normalizes only valid preferences", () => {
    expect(normalizeThemePreference("dark")).toBe("dark");
    expect(normalizeThemePreference("navy")).toBeNull();
    expect(normalizeThemePreference(undefined)).toBeNull();
  });

  it("remembers the choice in localStorage", () => {
    storeThemePreference("dark");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
    expect(readStoredThemePreference()).toBe("dark");
  });

  it("resolves explicit and system preferences", () => {
    expect(resolveTheme("light", false)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
  });

  it("applies the .dark class and mirrors it to the SSR cookie", () => {
    applyResolvedTheme("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.cookie).toContain(`${THEME_COOKIE_NAME}=dark`);
    applyResolvedTheme("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(document.cookie).toContain(`${THEME_COOKIE_NAME}=light`);
  });

  it("runs the pre-paint init script without syntax errors", () => {
    document.documentElement.classList.remove("dark");
    localStorage.setItem(THEME_STORAGE_KEY, "dark");
    // Throws SyntaxError if the inline script is malformed.
    expect(() => window.eval(themeInitScript)).not.toThrow();
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.content).toBe(
      "#000000",
    );

    localStorage.setItem(THEME_STORAGE_KEY, "light");
    window.eval(themeInitScript);
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.content).toBe(
      "#f8f8fa",
    );
  });
});

describe("ThemeProvider", () => {
  let system: { set(value: boolean): void };

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("dark");
    system = stubMatchMedia(false);
  });

  it("starts in system mode and follows the OS setting", () => {
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    expect(screen.getByTestId("preference").textContent).toBe("system");
    expect(screen.getByTestId("resolved").textContent).toBe("light");
  });

  it("switches live when the OS setting changes in system mode", () => {
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    act(() => system.set(true));
    expect(screen.getByTestId("resolved").textContent).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);

    act(() => system.set(false));
    expect(screen.getByTestId("resolved").textContent).toBe("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("stores an explicit choice and stops following the OS", () => {
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    act(() => screen.getByText("go dark").click());
    expect(screen.getByTestId("preference").textContent).toBe("dark");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);

    act(() => system.set(false));
    expect(screen.getByTestId("resolved").textContent).toBe("dark");
  });
});
