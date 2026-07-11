/**
 * Sticker - Summer Pop gamified accent.
 *
 * A rotated, die-cut badge (thick white border + sharp drop shadow) that
 * looks stuck onto the screen glass. Used for game-state moments:
 * PROFIT!, LOSS, LVL UP, DAY N. Display face, loud on purpose.
 */

import { cn } from "@/lib/utils";

const STICKER_COLORS = {
  zest: "bg-pop-zest text-pop-charcoal",
  sea: "bg-pop-sea-bright text-pop-charcoal",
  lime: "bg-pop-lime-bright text-pop-charcoal",
  red: "bg-red-500 text-white",
} as const;

interface StickerProps {
  children: React.ReactNode;
  color?: keyof typeof STICKER_COLORS;
  /** Rotation in degrees; the kit calls for 5-7deg either way. */
  rotate?: number;
  className?: string;
}

export function Sticker({
  children,
  color = "zest",
  rotate = -6,
  className,
}: StickerProps) {
  return (
    <span
      className={cn(
        "inline-block select-none rounded-lg border-[3px] border-white px-3 py-1",
        "font-display text-lg font-extrabold uppercase tracking-wider",
        "shadow-[3px_4px_0_rgba(22,29,31,0.35)]",
        STICKER_COLORS[color],
        className
      )}
      style={{ transform: `rotate(${rotate}deg)` }}
    >
      {children}
    </span>
  );
}
