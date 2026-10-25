import { useRef, useState } from "react";
import { fieldOwner, type PlaceholderField, type TemplateSpec } from "@/lib/templateEngine";
import { cn } from "@/lib/utils";

interface PlaceholderEditorProps {
  spec: TemplateSpec;
  /** Only slots whose field is in this set are interactive (draggable / resizable). */
  editableFields: Set<PlaceholderField>;
  onMove: (slotId: string, next: { cx: number; cy: number }) => void;
  onResize: (slotId: string, next: { w: number; h: number }) => void;
  onSelect?: (slotId: string | null) => void;
}

const STEP = 0.01;

/**
 * Transparent overlay drawn on top of a template (rendered with its own slots
 * hidden). Each branded placeholder becomes a draggable / resizable box using
 * pointer events (mouse + touch) and arrow-key nudging, so it works with both a
 * mouse and a touchscreen and stays keyboard-accessible.
 */
export function PlaceholderEditor({
  spec,
  editableFields,
  onMove,
  onResize,
  onSelect,
}: PlaceholderEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: string; mode: "move" | "resize"; ox: number; oy: number } | null>(
    null,
  );
  const [active, setActive] = useState<string | null>(null);

  const rect = () => containerRef.current?.getBoundingClientRect();

  const norm = (e: React.PointerEvent) => {
    const box = rect();
    if (!box) return null;
    return { x: (e.clientX - box.left) / box.width, y: (e.clientY - box.top) / box.height };
  };

  const begin = (e: React.PointerEvent, id: string, mode: "move" | "resize") => {
    e.preventDefault();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    const slot = spec.slots.find((s) => s.id === id);
    const p = norm(e);
    drag.current = {
      id,
      mode,
      ox: slot && p ? slot.cx - p.x : 0,
      oy: slot && p ? slot.cy - p.y : 0,
    };
    setActive(id);
    onSelect?.(id);
  };

  const move = (e: React.PointerEvent) => {
    if (!drag.current) return;
    const p = norm(e);
    if (!p) return;
    const { id, mode, ox, oy } = drag.current;
    if (mode === "move") onMove(id, { cx: p.x + ox, cy: p.y + oy });
    else {
      const slot = spec.slots.find((s) => s.id === id);
      if (!slot) return;
      onResize(id, { w: p.x - slot.cx + slot.w / 2, h: p.y - slot.cy + slot.h / 2 });
    }
  };

  const end = (e: React.PointerEvent) => {
    (e.target as Element).releasePointerCapture?.(e.pointerId);
    drag.current = null;
  };

  const keyNudge = (e: React.KeyboardEvent, slotId: string) => {
    const slot = spec.slots.find((s) => s.id === slotId);
    if (!slot) return;
    let { cx, cy } = slot;
    if (e.key === "ArrowLeft") cx -= STEP;
    else if (e.key === "ArrowRight") cx += STEP;
    else if (e.key === "ArrowUp") cy -= STEP;
    else if (e.key === "ArrowDown") cy += STEP;
    else return;
    e.preventDefault();
    onMove(slotId, { cx, cy });
  };

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 touch-none select-none"
      onPointerMove={move}
      onPointerUp={end}
      onPointerCancel={end}
    >
      {spec.slots.map((slot) => {
        const editable = editableFields.has(slot.field);
        return (
          <div
            key={slot.id}
            role={editable ? "button" : undefined}
            tabIndex={editable ? 0 : undefined}
            aria-label={editable ? `Move ${slot.field} placeholder` : undefined}
            onKeyDown={editable ? (e) => keyNudge(e, slot.id) : undefined}
            onPointerDown={editable ? (e) => begin(e, slot.id, "move") : undefined}
            className={cn(
              "absolute rounded-md border-2",
              editable
                ? "cursor-move border-gold/80 bg-gold/10"
                : "pointer-events-none border-transparent",
              active === slot.id && editable && "border-gold bg-gold/20 ring-2 ring-gold/40",
            )}
            style={{
              left: `${(slot.cx - slot.w / 2) * 100}%`,
              top: `${(slot.cy - slot.h / 2) * 100}%`,
              width: `${slot.w * 100}%`,
              height: `${slot.h * 100}%`,
            }}
          >
            {editable && (
              <>
                <span className="absolute left-1 top-1 max-w-full truncate rounded bg-gold px-1 text-[10px] font-semibold text-gold-foreground">
                  {slot.field.replace(/^(mfr|rtl)_/, "").replace(/_/g, " ")}
                  {fieldOwner(slot.field) === "manufacturer" ? " · M" : " · R"}
                </span>
                <span
                  onPointerDown={(e) => begin(e, slot.id, "resize")}
                  className="absolute -bottom-1.5 -right-1.5 h-4 w-4 cursor-nwse-resize rounded-full border-2 border-gold bg-card"
                  aria-hidden="true"
                />
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
