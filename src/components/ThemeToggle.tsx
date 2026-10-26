import { Monitor, Moon, Sun } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "@/lib/theme-context";
import type { ThemePreference } from "@/lib/theme-context";
import { cn } from "@/lib/utils";

const OPTIONS: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

/** Quick access to the current option: sun / moon / monitor for light / dark / system. */
function CurrentIcon({ className }: { className?: string }) {
  const { resolved, preference } = useTheme();
  const active = preference === "system" ? resolved : preference;
  const Icon = active === "dark" ? Moon : Sun;
  return <Icon className={cn("h-5 w-5", className)} />;
}

export function ThemeToggle({
  className,
  label = "Theme",
  showText = false,
}: {
  className?: string;
  label?: string;
  showText?: boolean;
}) {
  const { preference, resolved, setPreference } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={label}
        title={label}
        className={cn("flex items-center gap-2 rounded-xl p-2 transition outline-none", className)}
      >
        <CurrentIcon />
        {showText && <span className="text-sm font-medium">{label}</span>}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuLabel className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Appearance
        </DropdownMenuLabel>
        {OPTIONS.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onSelect={() => setPreference(option.value)}
            className={cn(
              "gap-2",
              option.value === preference &&
                "bg-accent text-accent-foreground focus:bg-accent focus:text-accent-foreground",
            )}
          >
            <option.icon className="h-4 w-4" />
            <span className="flex-1">{option.label}</span>
            {option.value === "system" && (
              <span className="text-xs text-muted-foreground capitalize">{resolved}</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Radio-style selector used on settings pages. */
export function ThemePreferencePicker() {
  const { preference, setPreference } = useTheme();
  return (
    <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Theme mode">
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={preference === option.value}
          onClick={() => setPreference(option.value)}
          className={cn(
            "flex flex-col items-center gap-2 rounded-xl border px-3 py-4 text-sm font-medium transition",
            preference === option.value
              ? "border-primary bg-primary/10 text-foreground"
              : "border-input bg-background text-muted-foreground hover:border-primary/50",
          )}
        >
          <option.icon className="h-5 w-5" />
          {option.label}
        </button>
      ))}
    </div>
  );
}
