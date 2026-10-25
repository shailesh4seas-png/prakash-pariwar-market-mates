import { describe, expect, it } from "vitest";
import {
  SAFE_AREA,
  copyFromSpec,
  cycleBackgroundVariant,
  generateTemplate,
  moveSlot,
  paletteChoicesFor,
  recomposeSpec,
  resetLayout,
  resizeSlot,
  setBlockText,
} from "@/lib/templateEngine";

function slotOf(spec: ReturnType<typeof generateTemplate>, field: string) {
  const slot = spec.slots.find((s) => s.field === field);
  if (!slot) throw new Error(`no slot for ${field}`);
  return slot;
}

describe("editor copy operations", () => {
  it("reads and writes text block copy without mutating the source spec", () => {
    const spec = generateTemplate("diwali", 0, "post");
    const before = copyFromSpec(spec);
    const updated = setBlockText(spec, "headline", "Diwali Dhamaka 2027");

    expect(before.headline).toBe(spec.blocks.find((b) => b.role === "headline")?.defaultText);
    expect(copyFromSpec(updated).headline).toBe("Diwali Dhamaka 2027");
    // Original untouched (immutability the editor's undo/preview relies on).
    expect(spec.blocks.find((b) => b.role === "headline")?.defaultText).toBe(before.headline);
  });
});

describe("editor geometry operations", () => {
  it("snaps a dragged slot to a centre guide", () => {
    const spec = generateTemplate("diwali", 0, "post");
    const rtl = slotOf(spec, "rtl_business_name");
    // 0.5 is a snap guide; nudge just inside the threshold.
    const moved = moveSlot(spec, rtl.id, { cx: 0.5 + 0.005, cy: rtl.cy });
    const after = slotOf(moved, "rtl_business_name");
    expect(after.cx).toBeCloseTo(0.5, 5);
  });

  it("clamps a slot centre inside the safe area", () => {
    const spec = generateTemplate("diwali", 0, "post");
    const logo = slotOf(spec, "rtl_logo");
    const moved = moveSlot(spec, logo.id, { cx: 5, cy: -5 });
    const after = slotOf(moved, "rtl_logo");
    const halfW = after.w / 2;
    const halfH = after.h / 2;
    expect(after.cx).toBeLessThanOrEqual(SAFE_AREA.x + SAFE_AREA.width - halfW + 1e-9);
    expect(after.cx).toBeGreaterThanOrEqual(SAFE_AREA.x + halfW - 1e-9);
    expect(after.cy).toBeGreaterThanOrEqual(SAFE_AREA.y + halfH - 1e-9);
    expect(after.cy).toBeLessThanOrEqual(SAFE_AREA.y + SAFE_AREA.height - halfH + 1e-9);
  });

  it("keeps a resize within bounds and leaves other slots alone", () => {
    const spec = generateTemplate("diwali", 0, "post");
    const name = slotOf(spec, "rtl_business_name");
    const resized = resizeSlot(spec, name.id, { w: 2, h: 2 });
    const after = slotOf(resized, "rtl_business_name");
    expect(after.w).toBeLessThanOrEqual(0.9);
    expect(after.h).toBeLessThanOrEqual(0.9);
    // A different slot is byte-for-byte unchanged.
    expect(slotOf(resized, "mfr_business_name")).toEqual(slotOf(spec, "mfr_business_name"));
  });

  it("reset layout restores the original composition geometry", () => {
    const fresh = generateTemplate("diwali", 0, "post");
    const name = slotOf(fresh, "rtl_business_name");
    const moved = moveSlot(fresh, name.id, { cx: 0.5, cy: 0.5 });
    const reset = resetLayout(moved);
    expect(slotOf(reset, "rtl_business_name")).toEqual(name);
  });
});

describe("editor design operations", () => {
  it("re-colouring keeps moved slot geometry and swaps the palette + background", () => {
    const spec = generateTemplate("diwali", 0, "post");
    const choices = paletteChoicesFor("diwali");
    const other = choices.find((p) => p !== spec.palette.id);
    expect(other).toBeTruthy();

    const name = slotOf(spec, "rtl_business_name");
    const moved = moveSlot(spec, name.id, { cx: 0.5, cy: 0.5 });
    const recolored = recomposeSpec(moved, { paletteId: other as string });

    expect(recolored.palette.id).toBe(other);
    expect(recolored.background.from).toBe(recolored.palette.bgFrom);
    // The retailer's manual reposition survives a palette change.
    expect(slotOf(recolored, "rtl_business_name").cx).toBeCloseTo(0.5, 5);
  });

  it("canvas switching keeps the moved geometry but resizes the canvas", () => {
    const spec = generateTemplate("holi", 3, "post");
    const logo = slotOf(spec, "mfr_logo");
    const moved = moveSlot(spec, logo.id, { cx: 0.5, cy: 0.5 });
    const story = recomposeSpec(moved, { canvasKind: "story" });
    expect(story.canvas.kind).toBe("story");
    expect(story.canvas.height).toBe(1920);
    expect(slotOf(story, "mfr_logo").cy).toBeCloseTo(0.5, 5);
  });

  it("background variant cycles angle + scrim and increments the index", () => {
    const spec = generateTemplate("diwali", 0, "post");
    const next = cycleBackgroundVariant(spec);
    expect(next.variant).toBe(spec.variant + 1);
    expect(next.background.angle).toBe((spec.background.angle + 45) % 360);
  });

  it("offers at least three palettes so the 30 designs stay varied", () => {
    expect(paletteChoicesFor("diwali").length).toBeGreaterThanOrEqual(3);
  });
});
