/**
 * EntryScene - Parallax animated entry experience for the join screen.
 *
 * A golden-hour Cayman sky: a rising sun, drifting clouds, and lemon
 * slices floating at different depths that follow the pointer, with a
 * teal sea band grounding the join card. The scene is purely decorative
 * chrome around whatever children it wraps (the join/create flow) —
 * no game logic lives here.
 *
 * Motion notes:
 *   - Pointer parallax is lerped through requestAnimationFrame and
 *     written to CSS custom properties (--par-x / --par-y); each layer
 *     multiplies them by its own depth.
 *   - Every animation is disabled when the user prefers reduced motion.
 *   - Touch devices get the ambient float/drift only (no pointer chase).
 */

import { useRef } from "react";
import { usePointerParallax } from "@/hooks/use-pointer-parallax";

// ---------------------------------------------------------------------------
// Decorative pieces
// ---------------------------------------------------------------------------

/** A drawn lemon slice: rind, flesh, and segments. Purely decorative. */
function LemonSlice({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      aria-hidden="true"
      className="drop-shadow-[0_6px_12px_rgba(180,120,0,0.25)]"
    >
      <circle cx="50" cy="50" r="48" fill="#F5C518" />
      <circle cx="50" cy="50" r="42" fill="#FFF6C9" />
      <g fill="#FFE066">
        {Array.from({ length: 8 }, (_, i) => {
          const angle = (i * Math.PI) / 4;
          const x1 = 50 + Math.cos(angle - 0.32) * 38;
          const y1 = 50 + Math.sin(angle - 0.32) * 38;
          const x2 = 50 + Math.cos(angle + 0.32) * 38;
          const y2 = 50 + Math.sin(angle + 0.32) * 38;
          return (
            <path key={i} d={`M50 50 L${x1} ${y1} A38 38 0 0 1 ${x2} ${y2} Z`} />
          );
        })}
      </g>
      <circle cx="50" cy="50" r="5" fill="#FFF6C9" />
    </svg>
  );
}

/**
 * One floating slice positioned in the scene. `depth` scales how far it
 * shifts with the pointer (px at full offset); float timing is varied per
 * slice so the sky never moves in lockstep.
 */
function FloatingSlice({
  size,
  depth,
  className,
  tilt,
  duration,
  delay,
}: {
  size: number;
  depth: number;
  className: string;
  tilt: number;
  duration: number;
  delay: number;
}) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute ${className}`}
      style={{
        transform: `translate3d(calc(var(--par-x, 0) * ${depth}px), calc(var(--par-y, 0) * ${depth}px), 0)`,
      }}
    >
      <div
        className="motion-safe:animate-lemon-float"
        style={
          {
            "--tilt": `${tilt}deg`,
            animationDuration: `${duration}s`,
            animationDelay: `${delay}s`,
          } as React.CSSProperties
        }
      >
        <LemonSlice size={size} />
      </div>
    </div>
  );
}

/** A soft cloud puff built from blurred ellipses. */
function Cloud({
  depth,
  className,
  scale = 1,
  duration,
}: {
  depth: number;
  className: string;
  scale?: number;
  duration: number;
}) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute ${className}`}
      style={{
        transform: `translate3d(calc(var(--par-x, 0) * ${depth}px), calc(var(--par-y, 0) * ${depth * 0.6}px), 0)`,
      }}
    >
      <div
        className="motion-safe:animate-cloud-drift"
        style={{ animationDuration: `${duration}s` }}
      >
        <div
          className="relative h-16 w-48 opacity-80 dark:opacity-30"
          style={{ transform: `scale(${scale})` }}
        >
          <div className="absolute left-0 top-4 h-10 w-24 rounded-full bg-white blur-md" />
          <div className="absolute left-14 top-0 h-14 w-28 rounded-full bg-white blur-md" />
          <div className="absolute right-0 top-5 h-9 w-20 rounded-full bg-white blur-md" />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Scene
// ---------------------------------------------------------------------------

interface EntrySceneProps {
  children: React.ReactNode;
}

export function EntryScene({ children }: EntrySceneProps) {
  const sceneRef = useRef<HTMLDivElement>(null);
  usePointerParallax(sceneRef);

  return (
    <div
      ref={sceneRef}
      className="relative isolate -mx-4 -my-6 min-h-[calc(100dvh-7.5rem)] overflow-hidden px-4 pt-10 pb-36 sm:-mx-6 sm:px-6 sm:pb-44 lg:-mx-8 lg:-my-8 lg:min-h-dvh lg:px-8 lg:pt-14"
    >
      {/* Sky */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-30 bg-gradient-to-b from-[#FFF9C4] via-[#FFECB3] to-[#FFB35C] dark:from-[#241B3A] dark:via-[#4A2E55] dark:to-[#B65A38]"
      />

      {/* Sun — deepest layer, barely moves */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-[16%] -z-20 motion-safe:animate-sun-rise"
        style={{
          transform:
            "translate3d(calc(-50% + var(--par-x, 0) * -14px), calc(var(--par-y, 0) * -10px), 0)",
        }}
      >
        <div className="h-64 w-64 rounded-full bg-[radial-gradient(circle,#FFE27A_0%,#FFCB4D_45%,rgba(255,203,77,0)_72%)] sm:h-96 sm:w-96 dark:bg-[radial-gradient(circle,#FFAE5C_0%,#E8794A_45%,rgba(232,121,74,0)_72%)]" />
      </div>

      {/* Caribbean sea band */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-28 sm:h-36"
        style={{
          transform:
            "translate3d(calc(var(--par-x, 0) * 10px), calc(var(--par-y, 0) * 6px), 0)",
        }}
      >
        <svg
          viewBox="0 0 1440 140"
          preserveAspectRatio="none"
          className="h-full w-full"
          aria-hidden="true"
        >
          <path
            d="M0 48 C 240 20, 480 76, 720 48 S 1200 20, 1440 48 L1440 140 L0 140 Z"
            fill="#5BC8C5"
            className="dark:fill-[#1E5E66]"
          />
          <path
            d="M0 70 C 260 44, 520 96, 780 70 S 1240 44, 1440 70 L1440 140 L0 140 Z"
            fill="#3FB0AF"
            opacity="0.85"
            className="dark:fill-[#164A52]"
          />
        </svg>
      </div>

      {/* Clouds — far layer */}
      <Cloud depth={-24} duration={26} className="left-[4%] top-[10%]" scale={0.8} />
      <Cloud depth={-18} duration={34} className="right-[8%] top-[20%]" />
      <Cloud depth={-30} duration={30} className="left-[22%] top-[34%] hidden sm:block" scale={0.6} />

      {/* Lemon slices — near layers, larger depth = closer */}
      <FloatingSlice size={96} depth={46} tilt={-12} duration={7} delay={0} className="left-[6%] top-[24%] hidden md:block" />
      <FloatingSlice size={56} depth={30} tilt={18} duration={5.5} delay={1.2} className="right-[10%] top-[14%] hidden sm:block" />
      <FloatingSlice size={72} depth={56} tilt={8} duration={6.5} delay={0.6} className="right-[6%] bottom-[22%] hidden sm:block" />
      <FloatingSlice size={44} depth={22} tilt={-24} duration={5} delay={1.8} className="left-[12%] bottom-[26%]" />

      {/* Content — mid depth, drifts just enough to feel inside the scene */}
      <div
        className="relative mx-auto max-w-2xl motion-safe:animate-scene-rise"
        style={{
          animationDelay: "0.15s",
          transform:
            "translate3d(calc(var(--par-x, 0) * 8px), calc(var(--par-y, 0) * 8px), 0)",
        }}
      >
        {children}
      </div>
    </div>
  );
}
