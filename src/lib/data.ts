import diwali from "@/assets/tpl-diwali.jpg";
import appliances from "@/assets/tpl-appliances.jpg";
import navratri from "@/assets/tpl-navratri.jpg";
import holi from "@/assets/tpl-holi.jpg";
import republic from "@/assets/tpl-republic.jpg";
import kitchen from "@/assets/tpl-kitchen.jpg";
import monsoon from "@/assets/tpl-monsoon.jpg";

export type Category = "Festival" | "Products" | "Offers" | "New Arrivals" | "Seasonal" | "Social Media" | "Business";
export type TemplateStatus = "published" | "draft" | "archived";

export interface Template {
  id: string;
  title: string;
  headline: string;
  sub: string;
  category: Category;
  image: string;
  brand: string;
  status: TemplateStatus;
  uses: number;
  updated: string;
}

const t = (
  id: string,
  title: string,
  headline: string,
  sub: string,
  category: Category,
  image: string,
  status: TemplateStatus = "published",
  uses = 0,
  brand = "Jyoti Appliances",
  updated = "Oct 20, 2026",
): Template => ({ id, title, headline, sub, category, image, status, uses, brand, updated });

export const TEMPLATES: Template[] = [
  t("t1", "Diwali Offer", "Diwali Special Offer", "Up to 50% off", "Festival", diwali, "published", 1284),
  t("t2", "Home Appliances", "Upgrade Your Home Today", "Best deals", "Products", appliances, "published", 942),
  t("t3", "Navratri Collection", "Happy Navratri", "Nine nights of offers", "Festival", navratri, "published", 876),
  t("t4", "Monsoon Offer", "Monsoon Essentials", "Stay fresh this season", "Seasonal", monsoon, "published", 610),
  t("t5", "Kitchen Appliances", "Smart Kitchen, Smart Living", "Flat 20% off", "Products", kitchen, "published", 702),
  t("t6", "New Arrivals", "Just Landed", "Explore the new range", "New Arrivals", appliances, "published", 455),
  t("t7", "New Year Offer", "New Year, New Beginnings", "2027 mega sale", "Festival", diwali, "published", 120),
  t("t8", "Winter Essentials", "Winter Essentials", "Heaters from ₹1,999", "Seasonal", kitchen, "draft", 0),
  t("t9", "Republic Day", "Proud to be Indian", "Republic Day sale", "Festival", republic, "published", 340),
  t("t10", "Samsung Offer", "Smart Living", "Exchange & save", "Offers", appliances, "published", 288),
  t("t11", "Holi Special", "Holi Special Offer", "Colours of savings", "Festival", holi, "published", 512),
  t("t12", "Summer Collection", "Summer Cool Deals", "ACs & coolers", "Seasonal", monsoon, "draft", 0),
  t("t13", "Festive Combo", "Festive Combo Deals", "Buy 2, save more", "Offers", holi, "archived", 230),
  t("t14", "Store Opening", "Grand Opening", "Visit us today", "Business", kitchen, "published", 98),
  t("t15", "Insta Story Sale", "Weekend Flash Sale", "48 hours only", "Social Media", navratri, "published", 167),
];

export const byIds = (ids: string[]) => ids.map((id) => TEMPLATES.find((x) => x.id === id)!);

export const TRENDING = byIds(["t1", "t2", "t3", "t4", "t5", "t6"]);
export const NEW_TEMPLATES = byIds(["t7", "t8", "t9", "t10", "t11", "t12"]);
export const RECOMMENDED = byIds(["t5", "t10", "t1", "t14", "t15", "t2"]);

export const CATEGORIES: ("All" | Category)[] = [
  "All",
  "Festival",
  "Products",
  "Offers",
  "New Arrivals",
  "Seasonal",
  "Social Media",
  "Business",
];

export const RETAILERS = [
  { name: "Sharma Electronics", city: "Jaipur", status: "active", joined: "Jan 12, 2026", downloads: 142 },
  { name: "Mehra Home Store", city: "Delhi", status: "active", joined: "Feb 03, 2026", downloads: 98 },
  { name: "Gupta Appliances", city: "Lucknow", status: "pending", joined: "—", downloads: 0 },
  { name: "Patel Digital World", city: "Ahmedabad", status: "active", joined: "Mar 22, 2026", downloads: 211 },
  { name: "Reddy Electronics", city: "Hyderabad", status: "active", joined: "Apr 18, 2026", downloads: 76 },
  { name: "Singh Brothers", city: "Ludhiana", status: "pending", joined: "—", downloads: 0 },
  { name: "Iyer Home Needs", city: "Chennai", status: "expired", joined: "—", downloads: 0 },
] as const;

export const CAMPAIGNS = [
  { name: "Diwali Dhamaka 2026", start: "Oct 25", end: "Nov 10", templates: 8, retailers: 54, status: "live" },
  { name: "Wedding Season Appliances", start: "Nov 15", end: "Dec 20", templates: 5, retailers: 0, status: "scheduled" },
  { name: "New Year Mega Sale", start: "Dec 26", end: "Jan 05", templates: 4, retailers: 0, status: "scheduled" },
  { name: "Navratri Utsav", start: "Oct 02", end: "Oct 12", templates: 6, retailers: 61, status: "completed" },
] as const;

/** Day-of-month → events for the content calendar (November 2026). */
export const CALENDAR_EVENTS: Record<number, { label: string; tone: "festival" | "launch" | "post" }[]> = {
  1: [{ label: "Diwali teaser posts", tone: "post" }],
  5: [{ label: "Dhanteras", tone: "festival" }],
  8: [{ label: "Diwali", tone: "festival" }],
  9: [{ label: "Govardhan Puja", tone: "festival" }],
  10: [{ label: "Bhai Dooj", tone: "festival" }],
  14: [{ label: "Smart TV X5 launch", tone: "launch" }],
  15: [{ label: "Wedding campaign live", tone: "post" }],
  21: [{ label: "Black Friday offers", tone: "post" }],
  27: [{ label: "Air Purifier launch", tone: "launch" }],
};
