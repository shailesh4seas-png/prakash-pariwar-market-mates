import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/AppShell";
import { CalendarView } from "@/components/shared";

export const Route = createFileRoute("/retailer/calendar")({
  head: () => ({
    meta: [
      { title: "Festival calendar · Prakash Pariwar" },
      { name: "description", content: "Festival calendar for Prakash Pariwar business members." },
      { property: "og:title", content: "Festival calendar · Prakash Pariwar" },
      {
        property: "og:description",
        content: "Festival calendar for Prakash Pariwar business members.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <>
      <PageHeader
        title="Festival Calendar"
        desc="Plan your posts around upcoming festivals and launches."
      />
      <CalendarView />
    </>
  ),
});
