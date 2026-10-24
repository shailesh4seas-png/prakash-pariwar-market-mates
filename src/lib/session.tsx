import { useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { User as AuthUser } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { SessionContext } from "@/lib/session-context";

export type Role = "manufacturer" | "retailer";

export interface UserProfile {
  user_id: string;
  role: Role;
  full_name: string;
  email: string;
  country: string;
  state: string;
  city: string;
  business_name: string;
  business_logo_path: string;
  profile_photo_path: string;
  category: string;
  contact_number: string;
  accepted_policies: boolean;
  terms_accepted_at: string;
  created_at: string;
  businessLogoUrl?: string;
  profilePhotoUrl?: string;
  assetError?: string;
}

export interface AppUser {
  id: string;
  name: string;
  business: string;
  email: string;
  roles: Role[];
  initials: string;
  avatarUrl?: string;
}

export const ROLE_LABEL: Record<Role, string> = {
  manufacturer: "Manufacturer",
  retailer: "Retailer",
};
const SESSION_KEY = "pp-role-preference";
const PROFILE_COLUMNS =
  "user_id, role, full_name, email, country, state, city, business_name, business_logo_path, profile_photo_path, category, contact_number, accepted_policies, terms_accepted_at, created_at";

/** Returns only a role present in the authenticated user's profile set. */
export function resolveRole(roles: Role[], requested?: Role | null): Role | null {
  if (requested && roles.includes(requested)) return requested;
  return roles[0] ?? null;
}

interface LoadedAccount {
  user: AppUser;
  profiles: UserProfile[];
  activeRole: Role | null;
  activeProfile: UserProfile | null;
}

export interface SessionState {
  ready: boolean;
  user: AppUser | null;
  activeRole: Role | null;
  activeProfile: UserProfile | null;
  authUser: AuthUser | null;
  sessionError: string;
  refreshAuthUser: (preferredRole?: Role) => Promise<void>;
  switchRole: (role: Role) => boolean;
  signOut: () => Promise<void>;
}

function saveRolePreference(userId: string, role: Role) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ userId, role }));
  } catch {
    // Session persistence belongs to Supabase; role preference is optional.
  }
}

function readRolePreference(userId: string): Role | null {
  try {
    const value = JSON.parse(localStorage.getItem(SESSION_KEY) ?? "null") as {
      userId?: string;
      role?: Role;
    } | null;
    if (value?.userId === userId && (value.role === "manufacturer" || value.role === "retailer"))
      return value.role;
  } catch {
    // Ignore malformed or unavailable browser storage.
  }
  return null;
}

async function loadAccount(
  authUser: AuthUser,
  requestedRole?: Role | null,
): Promise<LoadedAccount> {
  const client = supabase;
  if (!client) throw new Error("Supabase is not configured. Check the local environment settings.");

  const { data, error } = await client
    .from("user_profiles")
    .select(PROFILE_COLUMNS)
    .eq("user_id", authUser.id);
  if (error) throw new Error("We couldn't load your business profile. Please try again.");

  const profiles = await Promise.all(
    (data ?? [])
      .filter(
        (profile): profile is typeof profile & { role: Role } =>
          profile.role === "manufacturer" || profile.role === "retailer",
      )
      .map(async (row) => {
        const profile = row as unknown as UserProfile;
        let businessLogoUrl: string | undefined;
        let profilePhotoUrl: string | undefined;
        const assetErrors: string[] = [];
        for (const [path, field] of [
          [profile.business_logo_path, "businessLogoUrl"],
          [profile.profile_photo_path, "profilePhotoUrl"],
        ] as const) {
          if (!path) continue;
          const { data: signed, error: signedError } = await client.storage
            .from("profile-assets")
            .createSignedUrl(path, 3600);
          if (signedError) assetErrors.push("A private profile image could not be loaded.");
          else if (field === "businessLogoUrl") businessLogoUrl = signed.signedUrl;
          else profilePhotoUrl = signed.signedUrl;
        }
        return {
          ...profile,
          ...(businessLogoUrl ? { businessLogoUrl } : {}),
          ...(profilePhotoUrl ? { profilePhotoUrl } : {}),
          ...(assetErrors.length ? { assetError: assetErrors[0] } : {}),
        };
      }),
  );
  const roles = [...new Set(profiles.map((profile) => profile.role))];
  const activeRole = resolveRole(roles, requestedRole ?? readRolePreference(authUser.id));
  const activeProfile = profiles.find((profile) => profile.role === activeRole) ?? null;
  const name =
    activeProfile?.full_name ??
    String(
      authUser.user_metadata["full_name"] ??
        authUser.user_metadata["name"] ??
        authUser.email ??
        "New user",
    );
  const initials = name
    .split(/\s+/)
    .map((part) => part[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const user: AppUser = {
    id: authUser.id,
    name,
    business: activeProfile?.business_name ?? name,
    email: authUser.email ?? "",
    roles,
    initials,
    ...(activeProfile?.profilePhotoUrl ? { avatarUrl: activeProfile.profilePhotoUrl } : {}),
  };
  return { user, profiles, activeRole, activeProfile };
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<AppUser | null>(null);
  const [activeRole, setActiveRole] = useState<Role | null>(null);
  const [activeProfile, setActiveProfile] = useState<UserProfile | null>(null);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [sessionError, setSessionError] = useState("");

  useEffect(() => {
    let mounted = true;
    let generation = 0;
    try {
      localStorage.removeItem("pp-session");
    } catch {
      // Ignore unavailable browser storage; Supabase remains the only auth source.
    }
    const sync = async (authenticatedUser: AuthUser | null) => {
      const currentGeneration = ++generation;
      if (!mounted) return;
      setAuthUser(authenticatedUser);
      setSessionError("");
      if (!authenticatedUser) {
        setUser(null);
        setProfiles([]);
        setActiveProfile(null);
        setActiveRole(null);
        setReady(true);
        return;
      }

      setReady(false);
      try {
        const account = await loadAccount(authenticatedUser);
        if (!mounted || currentGeneration !== generation) return;
        setUser(account.user);
        setProfiles(account.profiles);
        setActiveProfile(account.activeProfile);
        setActiveRole(account.activeRole);
        if (account.activeRole) saveRolePreference(authenticatedUser.id, account.activeRole);
      } catch (error) {
        if (!mounted || currentGeneration !== generation) return;
        setSessionError(
          error instanceof Error
            ? error.message
            : "We couldn't load your account. Please try again.",
        );
        setUser(null);
        setProfiles([]);
        setActiveProfile(null);
        setActiveRole(null);
      } finally {
        if (mounted && currentGeneration === generation) setReady(true);
      }
    };

    if (!supabase) {
      setReady(true);
      return () => {
        mounted = false;
      };
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      window.setTimeout(() => {
        void sync(session?.user ?? null);
      }, 0);
    });
    void supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (error) throw error;
        return sync(data.session?.user ?? null);
      })
      .catch(() => {
        if (!mounted) return;
        setSessionError("We couldn't restore your sign-in session. Please sign in again.");
        setReady(true);
      });
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const refreshAuthUser = useCallback(
    async (preferredRole?: Role) => {
      if (!supabase)
        throw new Error("Supabase is not configured. Check the local environment settings.");
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user)
        throw new Error("Your sign-in session expired. Please sign in again.");
      const account = await loadAccount(data.user, preferredRole ?? activeRole);
      setAuthUser(data.user);
      setUser(account.user);
      setProfiles(account.profiles);
      setActiveProfile(account.activeProfile);
      setActiveRole(account.activeRole);
      setSessionError("");
      if (account.activeRole) saveRolePreference(data.user.id, account.activeRole);
    },
    [activeRole],
  );

  const switchRole = useCallback(
    (role: Role) => {
      if (!user || resolveRole(user.roles, role) !== role) return false;
      const profile = profiles.find((item) => item.role === role) ?? null;
      const name = profile?.full_name ?? user.name;
      setActiveRole(role);
      setActiveProfile(profile);
      const updatedUser: AppUser = {
        ...user,
        name,
        business: profile?.business_name ?? name,
        initials: name
          .split(/\s+/)
          .map((part) => part[0] ?? "")
          .join("")
          .slice(0, 2)
          .toUpperCase(),
      };
      if (profile?.profilePhotoUrl) updatedUser.avatarUrl = profile.profilePhotoUrl;
      else delete updatedUser.avatarUrl;
      setUser(updatedUser);
      saveRolePreference(user.id, role);
      return true;
    },
    [profiles, user],
  );

  const signOut = useCallback(async () => {
    if (supabase) {
      const { error } = await supabase.auth.signOut();
      if (error) throw new Error("Sign-out failed. Please try again.");
    }
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch {
      // A signed-out Supabase session cannot be restored from this preference.
    }
    setUser(null);
    setProfiles([]);
    setActiveProfile(null);
    setActiveRole(null);
    setAuthUser(null);
  }, []);

  return (
    <SessionContext.Provider
      value={{
        ready,
        user,
        activeRole,
        activeProfile,
        authUser,
        sessionError,
        refreshAuthUser,
        switchRole,
        signOut,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const c = useContext(SessionContext);
  if (!c) throw new Error("useSession outside provider");
  return c;
}
