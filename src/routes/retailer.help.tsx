import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/AppShell";
import { Panel } from "@/components/shared";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const Route = createFileRoute("/retailer/help")({
  head: () => ({
    meta: [
      { title: "Retailer support · Prakash Pariwar" },
      { name: "description", content: "Retailer support for Prakash Pariwar business members." },
      { property: "og:title", content: "Retailer support · Prakash Pariwar" },
      {
        property: "og:description",
        content: "Retailer support for Prakash Pariwar business members.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

const FAQ: [string, string][] = [
  [
    "How do I add my store name to a template?",
    "Open any template, fill in your store name, phone and address, then download. Your profile details pre-fill these fields.",
  ],
  [
    "Can I change products in the Product Catalog?",
    "No. The Product Catalog is published by the manufacturers you are linked with — you can browse, search and view photos, prices, specifications and availability, but only the manufacturer can add, edit or delete a product.",
  ],
  [
    "How soon do new products appear in my catalog?",
    "As soon as the manufacturer saves them. The catalog is read live from their account, so there is nothing to sync or download.",
  ],
  [
    "Can I post directly to Instagram or WhatsApp?",
    "Download the creative in Post or Story format and share it from your phone.",
  ],
  [
    "Where do new templates come from?",
    "Manufacturers you're connected with publish templates for festivals and product launches.",
  ],
];

function Page() {
  return (
    <>
      <PageHeader title="Help & Support" desc="Questions? We're here — support@prakashpariwar.in" />
      <Panel>
        <Accordion type="single" collapsible>
          {FAQ.map(([q, a]) => (
            <AccordionItem key={q} value={q}>
              <AccordionTrigger>{q}</AccordionTrigger>
              <AccordionContent>{a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </Panel>
    </>
  );
}
