import { cn } from "@/lib/utils";
import { PALETTE_COLORS, PALETTE_LABEL, PALETTE_DOT_CLASSES } from "@/lib/categoryColors";
import type { PaletteColor } from "@/generated/prisma/enums";

export function CategoryColorPicker({
  name,
  idPrefix,
  defaultValue = "DEFAULT",
}: {
  name: string;
  idPrefix: string;
  defaultValue?: PaletteColor;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {PALETTE_COLORS.map((color) => {
        const inputId = `${idPrefix}-${color}`;
        return (
          <div key={color}>
            <input
              type="radio"
              id={inputId}
              name={name}
              value={color}
              defaultChecked={color === defaultValue}
              className="peer sr-only"
            />
            <label
              htmlFor={inputId}
              className="flex cursor-pointer items-center gap-1.5 rounded-full border border-card-border px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors peer-checked:border-accent peer-checked:text-foreground"
            >
              <span className={cn("h-2.5 w-2.5 rounded-full", PALETTE_DOT_CLASSES[color])} />
              {PALETTE_LABEL[color]}
            </label>
          </div>
        );
      })}
    </div>
  );
}
