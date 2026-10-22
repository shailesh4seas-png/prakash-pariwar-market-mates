import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

export type Role = "manufacturer" | "retailer";

export interface DemoUser {
  id: string;
  name: string;
  business: string;
  email: string;
  roles: Role[];
  initials: string;
}

export const DEMO_USERS: DemoUser[] = [
  {
    id: "u1",
    name: "Rakesh Sharma",
    business: "Sharma Electronics",
    email: "rakesh@sharmaelectronics.in",
    roles: ["manufacturer", "retailer"],
    initials: "SE",
  },
  {
    id: "u2",
    name: "Anita Mehra",
    business: "Mehra Home Store",
    email: "anita@mehrahome.in",
    roles: ["retailer"],
    initials: "MH",
  },
  {
    id: "u3",
    name: "Vikram Joshi",
    business: "Jyoti Appliances Ltd.",
    email: "vikram@jyotiappliances.com",
    roles: ["manufacturer"],
    initials: "JA",
  },
];

export const ROLE_LABEL: Record<Role, string> = { manufacturer: "Manufacturer", retailer: "Retailer" };

/** Returns the role to activate; never returns a role the user does not hold. */
export function resolveRole(user: DemoUser, requested?: Role | null): Role {
  if (requested && user.roles.includes(requested)) return requested;
  return user.roles[0];
}

interface SessionState {
  ready: boolean;
  user: DemoUser | null;
  activeRole: Role | null;
  signIn: (userId: string, role?: Role) => Role;
  switchRole: (role: Role) => boolean;
  signOut: () => void;
}

const Ctx = createContext<SessionState | null>(null);
const KEY = "pp-session";

export function SessionProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<DemoUser | null>(null);
  const [activeRole, setActiveRole] = useState<Role | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const { userId, role } = JSON.parse(raw);
        const u = DEMO_USERS.find((x) => x.id === userId);
        if (u) {
          setUser(u);
          setActiveRole(resolveRole(u, role));
        }
      }
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  const persist = (userId: string, role: Role) => localStorage.setItem(KEY, JSON.stringify({ userId, role }));

  const signIn = useCallback((userId: string, role?: Role) => {
    const u = DEMO_USERS.find((x) => x.id === userId)!;
    const r = resolveRole(u, role);
    setUser(u);
    setActiveRole(r);
    persist(u.id, r);
    return r;
  }, []);

  const switchRole = useCallback(
    (role: Role) => {
      if (!user || !user.roles.includes(role)) return false;
      setActiveRole(role);
      persist(user.id, role);
      return true;
    },
    [user],
  );

  const signOut = useCallback(() => {
    localStorage.removeItem(KEY);
    setUser(null);
    setActiveRole(null);
  }, []);

  return <Ctx.Provider value={{ ready, user, activeRole, signIn, switchRole, signOut }}>{children}</Ctx.Provider>;
}

export function useSession() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useSession outside provider");
  return c;
}
