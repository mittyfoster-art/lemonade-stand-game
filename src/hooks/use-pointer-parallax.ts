/**
 * usePointerParallax - Tracks the pointer over `ref` and writes smoothed,
 * normalized offsets (-0.5 .. 0.5) to the element as --par-x / --par-y
 * custom properties. Layers consume them via
 * `calc(var(--par-x) * <depth>px)` transforms.
 *
 * Skipped entirely under prefers-reduced-motion and on coarse pointers,
 * so touch devices pay zero cost.
 */

import { useEffect } from "react";

export function usePointerParallax(ref: React.RefObject<HTMLElement>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      !window.matchMedia("(pointer: fine)").matches
    ) {
      return;
    }

    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;
    let frame = 0;

    const tick = () => {
      // Lerp toward the target for a weighty, liquid feel
      currentX += (targetX - currentX) * 0.08;
      currentY += (targetY - currentY) * 0.08;
      el.style.setProperty("--par-x", currentX.toFixed(4));
      el.style.setProperty("--par-y", currentY.toFixed(4));

      if (Math.abs(targetX - currentX) + Math.abs(targetY - currentY) > 0.001) {
        frame = requestAnimationFrame(tick);
      } else {
        frame = 0;
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      targetX = (e.clientX - rect.left) / rect.width - 0.5;
      targetY = (e.clientY - rect.top) / rect.height - 0.5;
      if (!frame) frame = requestAnimationFrame(tick);
    };

    const onPointerLeave = () => {
      targetX = 0;
      targetY = 0;
      if (!frame) frame = requestAnimationFrame(tick);
    };

    el.addEventListener("pointermove", onPointerMove);
    el.addEventListener("pointerleave", onPointerLeave);

    return () => {
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerleave", onPointerLeave);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [ref]);
}
