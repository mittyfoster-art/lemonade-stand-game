/**
 * AmbientBackdrop - The Summer Pop "liquid citrus" environment layer.
 *
 * Three soft color blobs (zest, sea, lime) drift slowly behind every page
 * and lean toward the pointer, giving the whole app the flowing,
 * reactive-atmosphere feel from the design kit. Implemented with blurred
 * CSS gradients + the shared pointer-parallax hook instead of WebGL so it
 * costs nothing on the campers' phones and respects reduced motion.
 *
 * Rendered once inside AppLayout, fixed behind all content.
 */

import { useRef } from "react";
import { usePointerParallax } from "@/hooks/use-pointer-parallax";

function Blob({
  depth,
  className,
  duration,
  delay,
}: {
  depth: number;
  className: string;
  duration: number;
  delay: number;
}) {
  return (
    <div
      aria-hidden="true"
      className="absolute"
      style={{
        transform: `translate3d(calc(var(--par-x, 0) * ${depth}px), calc(var(--par-y, 0) * ${depth}px), 0)`,
      }}
    >
      <div
        className={`rounded-full blur-3xl motion-safe:animate-blob-drift ${className}`}
        style={{ animationDuration: `${duration}s`, animationDelay: `${delay}s` }}
      />
    </div>
  );
}

export function AmbientBackdrop() {
  const ref = useRef<HTMLDivElement>(null);
  usePointerParallax(ref);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      <div className="absolute -left-40 -top-32">
        <Blob depth={18} duration={26} delay={0} className="h-[34rem] w-[34rem] bg-pop-zest/25 dark:bg-pop-zest/10" />
      </div>
      <div className="absolute -right-48 top-1/4">
        <Blob depth={30} duration={32} delay={4} className="h-[30rem] w-[30rem] bg-pop-sea-bright/15 dark:bg-pop-sea-bright/10" />
      </div>
      <div className="absolute -bottom-40 left-1/4">
        <Blob depth={24} duration={38} delay={8} className="h-[28rem] w-[28rem] bg-pop-lime-bright/15 dark:bg-pop-lime/10" />
      </div>
    </div>
  );
}
