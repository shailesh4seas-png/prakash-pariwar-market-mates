import { createFileRoute, Outlet } from "@tanstack/react-router";
import {
  Calendar,
  CircleHelp,
  Home,
  Images,
  LayoutTemplate,
  Megaphone,
  Palette,
  User,
} from "lucide-react";
import { AppShell, type NavItem } from "@/components/AppShell";

const items: NavItem[] = [
  { label: "Home", to: "/retailer", icon: Home, exact: true },
  { label: "Templates", to: "/retailer/templates", icon: LayoutTemplate },
  { label: "My Creatives", to: "/retailer/creatives", icon: Images },
  { label: "Campaigns", to: "/retailer/campaigns", icon: Megaphone },
  { label: "Calendar", to: "/retailer/calendar", icon: Calendar },
  { label: "Brand Kit", to: "/retailer/brand-kit", icon: Palette },
  { label: "Profile", to: "/retailer/profile", icon: User },
  { label: "Help & Support", to: "/retailer/help", icon: CircleHelp },
];

export const Route = createFileRoute("/retailer")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Retailer Home · Prakash Pariwar" },
      {
        name: "description",
        content: "Discover festive and product templates ready to brand for your store.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <AppShell role="retailer" items={items}>
      <Outlet />
    </AppShell>
  ),
});
