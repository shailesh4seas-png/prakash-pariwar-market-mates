import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/AppShell";
import { CalendarView } from "@/components/shared";

export const Route = createFileRoute("/retailer/calendar")({
  component: () => (
    <>
      <PageHeader title="Festival Calendar" desc="Plan your posts around upcoming festivals and launches." />
      <CalendarView />
    </>
  ),
});
