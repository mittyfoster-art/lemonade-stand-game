/**
 * CountUpAnimation - Animated number counter component.
 *
 * Smoothly animates a number from 0 (or a start value) to a target value.
 * Uses requestAnimationFrame for smooth 60fps animations.
 *
 * Props:
 *   - target: The final number to animate to
 *   - duration: Animation duration in milliseconds (default: 1000ms)
 *   - prefix: Optional string to display before the number (e.g., "$")
 *   - suffix: Optional string to display after the number (e.g., " cups")
 *   - decimals: Number of decimal places (default: 0)
 *   - className: Additional CSS classes
 *   - start: Starting value (default: 0)
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";

interface CountUpAnimationProps {
  /** The target number to animate to */
  target: number;
  /** Animation duration in milliseconds */
  duration?: number;
  /** String to display before the number (e.g., "$") */
  prefix?: string;
  /** String to display after the number (e.g., " cups") */
  suffix?: string;
  /** Number of decimal places to show */
  decimals?: number;
  /** Additional CSS classes */
  className?: string;
  /** Starting value (default: 0) */
  start?: number;
  /** Whether to show thousands separators */
  useGrouping?: boolean;
}

/**
 * Easing function for smooth animation (ease-out-cubic)
 */
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function CountUpAnimation({
  target,
  duration = 1000,
  prefix = "",
  suffix = "",
  decimals = 0,
  className,
  start = 0,
  useGrouping = true,
}: CountUpAnimationProps) {
  const [displayValue, setDisplayValue] = useState(start);
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const startValueRef = useRef(start);
  const displayValueRef = useRef(start);

  // Keep the ref in sync with state so the effect can read it without a dependency
  displayValueRef.current = displayValue;

  const formatNumber = useCallback(
    (value: number): string => {
      return new Intl.NumberFormat("en-US", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
        useGrouping,
      }).format(value);
    },
    [decimals, useGrouping]
  );

  useEffect(() => {
    // Skip animation entirely when the user prefers reduced motion
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      setDisplayValue(target);
      return;
    }

    // Reset animation when target changes
    startValueRef.current = displayValueRef.current;
    startTimeRef.current = null;

    const animate = (currentTime: number) => {
      if (startTimeRef.current === null) {
        startTimeRef.current = currentTime;
      }

      const elapsed = currentTime - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOutCubic(progress);

      const currentValue =
        startValueRef.current + (target - startValueRef.current) * easedProgress;

      setDisplayValue(currentValue);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayValue(target);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [target, duration]);

  // Screen readers get the final value immediately via sr-only text
  const finalText = `${prefix}${formatNumber(target)}${suffix}`;

  return (
    <span className={cn("tabular-nums", className)} aria-label={finalText}>
      <span aria-hidden="true">
        {prefix}
        {formatNumber(displayValue)}
        {suffix}
      </span>
      <span className="sr-only">{finalText}</span>
    </span>
  );
}

/**
 * AnimatedProgressBar - A progress bar that animates from 0 to a target value.
 */
interface AnimatedProgressBarProps {
  /** Target value (0-100) */
  value: number;
  /** Animation duration in milliseconds */
  duration?: number;
  /** Additional CSS classes for the container */
  className?: string;
  /** Color class for the progress bar (default: amber gradient) */
  colorClass?: string;
}

export function AnimatedProgressBar({
  value,
  duration = 1000,
  className,
  colorClass = "bg-gradient-to-r from-yellow-500 to-amber-500",
}: AnimatedProgressBarProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    startTimeRef.current = null;

    const animate = (currentTime: number) => {
      if (startTimeRef.current === null) {
        startTimeRef.current = currentTime;
      }

      const elapsed = currentTime - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOutCubic(progress);

      const currentValue = value * easedProgress;
      setDisplayValue(currentValue);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayValue(value);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [value, duration]);

  return (
    <div
      className={cn(
        "h-3 w-full rounded-full bg-muted overflow-hidden",
        className
      )}
      role="progressbar"
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`${Math.round(value)}% progress`}
    >
      <div
        className={cn("h-full rounded-full transition-all", colorClass)}
        style={{ width: `${displayValue}%` }}
        aria-hidden="true"
      />
    </div>
  );
}

/**
 * BudgetChangeAnimation - Shows budget change with color flash effect.
 */
interface BudgetChangeAnimationProps {
  /** Budget before the change */
  from: number;
  /** Budget after the change */
  to: number;
  /** Animation duration in milliseconds */
  duration?: number;
  /** Additional CSS classes */
  className?: string;
}

export function BudgetChangeAnimation({
  from,
  to,
  duration = 1500,
  className,
}: BudgetChangeAnimationProps) {
  const [phase, setPhase] = useState<"showing-before" | "transitioning" | "showing-after">("showing-before");
  const [displayValue, setDisplayValue] = useState(from);

  useEffect(() => {
    // Phase 1: Show "before" value briefly
    const timer1 = setTimeout(() => {
      setPhase("transitioning");
    }, 300);

    // Phase 2: Animate to "after" value
    const timer2 = setTimeout(() => {
      setPhase("showing-after");
      setDisplayValue(to);
    }, 300 + duration * 0.6);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [from, to, duration]);

  // During transition, animate the number
  useEffect(() => {
    if (phase !== "transitioning") return;

    let animationRef: number | null = null;
    const startTime = performance.now();
    const animDuration = duration * 0.6;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / animDuration, 1);
      const easedProgress = easeOutCubic(progress);

      const currentValue = from + (to - from) * easedProgress;
      setDisplayValue(currentValue);

      if (progress < 1) {
        animationRef = requestAnimationFrame(animate);
      }
    };

    animationRef = requestAnimationFrame(animate);

    return () => {
      if (animationRef !== null) {
        cancelAnimationFrame(animationRef);
      }
    };
  }, [phase, from, to, duration]);

  const change = to - from;
  const isPositive = change >= 0;

  const formatBudget = (value: number): string => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className={cn("relative", className)}>
      <span
        className={cn(
          "text-2xl font-bold tabular-nums transition-all duration-300",
          phase === "showing-after" && isPositive && "text-emerald-600",
          phase === "showing-after" && !isPositive && "text-red-500",
          phase === "transitioning" && "opacity-70"
        )}
      >
        {formatBudget(displayValue)}
      </span>
      {phase === "showing-after" && (
        <span
          className={cn(
            "ml-2 text-sm font-semibold animate-in fade-in slide-in-from-left-2 duration-300",
            isPositive ? "text-emerald-600" : "text-red-500"
          )}
        >
          {isPositive ? "+" : ""}
          {formatBudget(change)}
        </span>
      )}
    </div>
  );
}
