import { createContext } from "react";
import type { SessionState } from "@/lib/session";

// Keep context identity outside the refreshable provider module so lazy routes
// and an already-mounted provider always refer to the same context after HMR.
export const SessionContext = createContext<SessionState | null>(null);