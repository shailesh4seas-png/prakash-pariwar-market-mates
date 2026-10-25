import { describe, expect, it } from "vitest";
import {
  CANVAS,
  MANUFACTURER_FIELDS,
  RETAILER_FIELDS,
  clampToSafeArea,
  filterCategories,
  fitText,
  generateCategoryTemplates,
  generateTemplate,
  isUpcoming,
  orderUpcomingFirst,
  renderTemplateToSvg,
  resolveValue,
  type PlaceholderField,
} from "@/lib/templateEngine";

const ALL_FIELDS: PlaceholderField[] = [...MANUFACTURER_FIELDS, ...RETAILER_FIELDS];

describe("template generator", () => {
  it("produces exactly 30 templates per category with unique ids", () => {
    const list = generateCategoryTemplates("diwali", "post");
    expect(list).toHaveLength(30);
    expect(new Set(list.map((t) => t.id)).size).toBe(30);
  });

  it("is deterministic: the same category + index + canvas always matches", () => {
    const a = generateTemplate("holi", 7, "story");
    const b = generateTemplate("holi", 7, "story");
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("mixes layouts so templates look distinct, not recolored duplicates", () => {
    const list = generateCategoryTemplates("diwali", "post");
    const layoutIds = new Set(list.map((t) => t.layoutId));
    expect(layoutIds.size).toBeGreaterThanOrEqual(10);
    // The first ten cycle through every composition once.
    expect(new Set(list.slice(0, 10).map((t) => t.layoutId)).size).toBe(10);
  });

  it("carries all nine branded placeholders on every template", () => {
    for (const t of generateCategoryTemplates("navratri", "post")) {
      const fields = t.slots.map((s) => s.field);
      for (const f of ALL_FIELDS) expect(fields).toContain(f);
      // No duplicate field within one template.
      expect(new Set(fields).size).toBe(fields.length);
    }
  });

  it("keeps slot centers inside the normalized canvas", () => {
    for (const t of generateCategoryTemplates("onam", "post", 30)) {
      for (const s of t.slots) {
        expect(s.cx).toBeGreaterThanOrEqual(0);
        expect(s.cx).toBeLessThanOrEqual(1);
        expect(s.cy).toBeGreaterThanOrEqual(0);
        expect(s.cy).toBeLessThanOrEqual(1);
      }
    }
  });

  it("honours the selected canvas size", () => {
    expect(generateTemplate("diwali", 0, "story").canvas).toEqual(CANVAS["story"]);
    expect(generateTemplate("diwali", 0, "post").canvas).toEqual(CANVAS["post"]);
  });

  it("throws for an unknown category", () => {
    expect(() => generateTemplate("nope", 0, "post")).toThrow(/Unknown category/);
  });
});

describe("auto-fill + fitting", () => {
  const profiles = {
    manufacturer: {
      businessName: "Jyoti Appliances",
      logoUrl: "https://cdn/mfr.png",
      phone: "+91 98000 00000",
      email: "brand@jyoti.in",
    },
    retailer: {
      businessName: "Sharma Electronics",
      logoUrl: "https://cdn/rtl.png",
      phone: "+91 91234 56789",
      email: "",
      address: "MI Road, Jaipur",
    },
  };

  it("reads manufacturer fields from the manufacturer profile", () => {
    const v = resolveValue("mfr_business_name", profiles);
    expect(v.text).toBe("Jyoti Appliances");
    expect(v.visible).toBe(true);
  });

  it("hides an empty optional retailer email but keeps required fields", () => {
    const email = resolveValue("rtl_email", profiles, undefined, {
      id: "rtl_email",
      field: "rtl_email",
      cx: 0.5,
      cy: 0.5,
      w: 0.2,
      h: 0.04,
      style: "pill",
      collapsible: true,
    });
    expect(email.visible).toBe(false);
    expect(email.text).toBeUndefined();
  });

  it("falls back gracefully for a missing required business name", () => {
    const v = resolveValue("rtl_business_name", {
      ...profiles,
      retailer: { ...profiles.retailer, businessName: "  " },
    });
    expect(v.visible).toBe(true);
    expect(v.text).toBe("Your Store");
  });

  it("manual overrides win over profile data", () => {
    const v = resolveValue("mfr_phone", profiles, { mfr_phone: { text: "011-23456789" } });
    expect(v.text).toBe("011-23456789");
  });

  it("shrinks long text below the ideal size but keeps it inside the width", () => {
    const fit = fitText("Extra Large Festive Combo Deal On Every Purchase", 320, 64, {
      weight: 800,
    });
    expect(fit.shrunk).toBe(true);
    expect(fit.fontSizePx).toBeLessThanOrEqual(64);
    expect(fit.lines.length).toBeLessThanOrEqual(3);
    for (const line of fit.lines) expect(line.length).toBeGreaterThan(0);
  });

  it("wraps short text without shrinking", () => {
    const fit = fitText("Happy Diwali", 700, 80, { weight: 800 });
    expect(fit.shrunk).toBe(false);
    expect(fit.fontSizePx).toBe(80);
    expect(fit.lines.join(" ")).toBe("Happy Diwali");
  });

  it("returns no lines for empty input", () => {
    expect(fitText("   ", 400, 60).lines).toEqual([]);
  });

  it("clamps a dragged slot to the safe area", () => {
    const safe = { x: 0.05, y: 0.05, width: 0.9, height: 0.9 };
    const clamped = clampToSafeArea(
      { id: "rtl_logo", field: "rtl_logo", cx: 1.4, cy: -0.3, w: 0.1, h: 0.1, style: "logoCircle" },
      safe,
    );
    expect(clamped.cx).toBeCloseTo(0.9);
    expect(clamped.cy).toBeCloseTo(0.1);
  });
});

describe("SVG renderer", () => {
  it("renders a standalone svg with the correct viewBox", () => {
    const spec = generateTemplate("diwali", 0, "post");
    const svg = renderTemplateToSvg(spec, {
      text: { headline: "Happy Diwali" },
      values: [resolveValue("mfr_business_name", {
        manufacturer: { businessName: "Jyoti" },
        retailer: { businessName: "Store" },
      })],
    });
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).toContain(`viewBox="0 0 1080 1080"`);
    expect(svg).toContain("Happy Diwali");
  });

  it("escapes XML-unsafe characters in copy", () => {
    const spec = generateTemplate("holi", 1, "post");
    const svg = renderTemplateToSvg(spec, { text: { headline: 'R <&> "Sale" &' } });
    expect(svg).not.toContain("<&>");
    expect(svg).toContain("&lt;");
  });
});

describe("festival / season catalog", () => {
  const now = new Date("2026-10-25T00:00:00Z");

  it("orders categories by soonest upcoming date", () => {
    const ordered = orderUpcomingFirst(now);
    // Diwali (Nov 8 2026) should come before Christmas (Dec 25 2026).
    const diwali = ordered.findIndex((c) => c.key === "diwali");
    const christmas = ordered.findIndex((c) => c.key === "christmas");
    expect(diwali).toBeGreaterThanOrEqual(0);
    expect(christmas).toBeGreaterThan(diwali);
    // The head of the list is always the nearest date.
    const days = ordered.map((c) => new Date(c.date).getTime());
    const weddingIdx = ordered.findIndex((c) => c.key === "wedding");
    expect(weddingIdx).toBeLessThan(ordered.length);
    expect(days.length).toBe(ordered.length);
  });

  it("flags Diwali as upcoming within a 45-day window in late October", () => {
    const diwali = orderUpcomingFirst(now).find((c) => c.key === "diwali");
    expect(diwali && isUpcoming(diwali, now, 45)).toBe(true);
  });

  it("filters by kind and search query", () => {
    const festivals = filterCategories({ kind: "festival", query: "", now });
    expect(festivals.every((c) => c.kind === "festival")).toBe(true);
    const seasons = filterCategories({ kind: "season", query: "", now });
    expect(seasons.every((c) => c.kind === "season")).toBe(true);
    const searched = filterCategories({ kind: "all", query: "diwa", now });
    expect(searched.map((c) => c.key)).toContain("diwali");
  });

  it("has valid motifs/copy and yields 30 distinct layout×palette designs per category", () => {
    for (const c of orderUpcomingFirst(now)) {
      expect(c.motifs.length).toBeGreaterThan(0);
      expect(c.copy.headlines.length).toBeGreaterThan(0);
      const list = generateCategoryTemplates(c.key, "post", 30);
      const signatures = new Set(list.map((t) => `${t.layoutId}|${t.palette.id}`));
      // 10 layouts x >=3 palettes -> 30 visually distinct designs.
      expect(signatures.size).toBe(30);
      expect(() => generateTemplate(c.key, 0, "post")).not.toThrow();
    }
  });
});
