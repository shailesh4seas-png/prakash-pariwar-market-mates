import { createFileRoute } from "@tanstack/react-router";
import { ProfileSettings } from "@/components/ProfileSettings";

export const Route = createFileRoute("/retailer/profile")({
  head: () => ({
    meta: [
      { title: "Retailer profile · Prakash Pariwar" },
      { name: "description", content: "Retailer profile for Prakash Pariwar business members." },
      { property: "og:title", content: "Retailer profile · Prakash Pariwar" },
      {
        property: "og:description",
        content: "Retailer profile for Prakash Pariwar business members.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProfileSettings,
});
