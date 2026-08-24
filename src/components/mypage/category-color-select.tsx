"use client";

import { useId, useState } from "react";
import type { PaletteColor } from "@/generated/prisma/enums";
import { PALETTE_COLORS, PALETTE_DOT_CLASSES, PALETTE_LABEL } from "@/lib/categoryColors";
import { cn } from "@/lib/utils";

export function CategoryColorSelect({
  name,
  defaultValue = "DEFAULT",
  onValueChange,
}: {
  name: string;
  defaultValue?: PaletteColor;
  onValueChange?: (value: PaletteColor) => void;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState<PaletteColor>(defaultValue);
  const listboxId = useId();

  return (
    <div className="relative min-w-28">
      <input type="hidden" name={name} value={value} />
      <button
        type="button"
        role="combobox"
        aria-label="색상"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-haspopup="listbox"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center gap-2 rounded-lg border border-card-border bg-background px-2.5 py-2 text-left text-[12px] outline-none transition-colors hover:border-accent"
      >
        <span className={cn("h-3.5 w-3.5 shrink-0 rounded-[3px] border border-card-border", PALETTE_DOT_CLASSES[value])} />
        <span className="flex-1">{PALETTE_LABEL[value]}</span>
        <span className="text-[10px] text-muted-foreground">⌄</span>
      </button>

      {open && (
        <div
          id={listboxId}
          role="listbox"
          className="absolute left-0 top-[calc(100%+4px)] z-30 w-32 overflow-hidden rounded-lg border border-card-border bg-card p-1 shadow-lg"
        >
          {PALETTE_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              role="option"
              aria-selected={color === value}
              onClick={() => {
                setValue(color);
                setOpen(false);
                onValueChange?.(color);
              }}
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[11.5px] hover:bg-background",
                color === value && "font-semibold",
              )}
            >
              <span className={cn("h-3.5 w-3.5 rounded-[3px] border border-card-border", PALETTE_DOT_CLASSES[color])} />
              <span className="flex-1">{PALETTE_LABEL[color]}</span>
              {color === value && <span className="text-accent">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
