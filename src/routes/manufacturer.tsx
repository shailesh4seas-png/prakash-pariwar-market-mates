import { createFileRoute, Outlet } from "@tanstack/react-router";
import { BarChart3, CalendarDays, LayoutDashboard, LayoutTemplate, Palette, PenSquare, Settings, Users } from "lucide-react";
import { AppShell, type NavItem } from "@/components/AppShell";

const items: NavItem[] = [
  { label: "Overview", to: "/manufacturer", icon: LayoutDashboard, exact: true },
  { label: "Brand Kit", to: "/manufacturer/brand", icon: Palette },
  { label: "Templates", to: "/manufacturer/templates", icon: LayoutTemplate },
  { label: "Template Editor", to: "/manufacturer/editor", icon: PenSquare },
  { label: "Campaigns", to: "/manufacturer/campaigns", icon: CalendarDays },
  { label: "Retailers", to: "/manufacturer/retailers", icon: Users },
  { label: "Analytics", to: "/manufacturer/analytics", icon: BarChart3 },
  { label: "Settings", to: "/manufacturer/settings", icon: Settings },
];

export const Route = createFileRoute("/manufacturer")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Manufacturer Dashboard · Prakash Pariwar" },
      { name: "description", content: "Manage brand templates, campaigns and your retailer network." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <AppShell role="manufacturer" items={items}>
      <Outlet />
    </AppShell>
  ),
});
