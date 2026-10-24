import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SessionProvider, useSession } from "@/lib/session";

vi.mock("@/lib/supabase", () => ({ supabase: null }));

afterEach(cleanup);

function SessionConsumer() {
  const session = useSession();
  return <div>{session.ready ? "Session ready" : "Session pending"}</div>;
}

describe("session provider wiring", () => {
  it("provides session state to nested route consumers", async () => {
    render(
      <SessionProvider>
        <SessionConsumer />
      </SessionProvider>,
    );
    expect(await screen.findByText("Session ready")).toBeInTheDocument();
  });

  it("does not silently invent a session outside the provider", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      expect(() => render(<SessionConsumer />)).toThrow("useSession outside provider");
    } finally {
      consoleError.mockRestore();
    }
  });
});
