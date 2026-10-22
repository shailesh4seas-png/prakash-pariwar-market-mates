import { useNavigate } from "@tanstack/react-router";
import { Check, ChevronDown, Factory, LogOut, Store, UserPlus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ROLE_LABEL, useSession, type Role } from "@/lib/session";
import { toast } from "sonner";

const ICON: Record<Role, typeof Store> = { manufacturer: Factory, retailer: Store };

export function RoleMenu() {
  const { user, activeRole, authUser, switchRole, signOut } = useSession();
  const navigate = useNavigate();
  if (!user || !activeRole) return null;

  const go = (r: Role) => {
    if (r === activeRole) return;
    if (switchRole(r)) {
      toast.success(`Switched to ${ROLE_LABEL[r]} dashboard`);
      navigate({ to: r === "manufacturer" ? "/manufacturer" : "/retailer" });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex min-w-0 items-center gap-2 rounded-full py-1 pl-1 pr-2 outline-none transition hover:bg-muted">
        {user.avatarUrl ? (
          <img src={user.avatarUrl} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" />
        ) : (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-primary text-xs font-bold text-primary-foreground">
            {user.initials}
          </span>
        )}
        <span className="hidden min-w-0 text-left sm:block">
          <span className="block truncate text-sm font-semibold">{user.business}</span>
          <span className="block text-xs text-primary">{ROLE_LABEL[activeRole]}</span>
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>
          <p className="font-semibold">{user.name}</p>
          <p className="text-xs font-normal text-muted-foreground">{user.email}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {user.roles.length > 1 ? "Switch role" : "Your role"}
        </DropdownMenuLabel>
        {user.roles.map((r) => {
          const Icon = ICON[r];
          return (
            <DropdownMenuItem key={r} onClick={() => go(r)} className="gap-2">
              <Icon className="h-4 w-4" />
              <span className="flex-1">{ROLE_LABEL[r]}</span>
              {r === activeRole && <Check className="h-4 w-4 text-primary" />}
            </DropdownMenuItem>
          );
        })}
        {authUser && user.roles.length < 2 && (
          <DropdownMenuItem
            onClick={() => navigate({ to: "/register", search: { addRole: true } })}
            className="gap-2"
          >
            <UserPlus className="h-4 w-4" /> Add another role
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="gap-2"
          onClick={async () => {
            try {
              await signOut();
              navigate({ to: "/login", replace: true });
            } catch (error) {
              toast.error(
                error instanceof Error ? error.message : "Sign-out failed. Please try again.",
              );
            }
          }}
        >
          <LogOut className="h-4 w-4" /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
