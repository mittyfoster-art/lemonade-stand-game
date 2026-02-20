/**
 * CampCountdown - Shows the current camp day, its theme, and a countdown
 * to the next day's level unlock.
 *
 * Camp runs for 5 days, each with a named theme. Levels 1-10 unlock on
 * Day 1 at 7:00 AM, 11-20 on Day 2, etc.
 *
 * Displayed in the sidebar between navigation items and the player status section.
 */

import { useState, useEffect } from "react";
import { Calendar, Clock } from "lucide-react";
import { useGameStore } from "@/store/game-store";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Theme names for each of the 5 camp days. */
const DAY_THEMES: readonly string[] = [
  "Foundations",
  "Market Dynamics",
  "Strategic Pressure",
  "Expert Decisions",
  "Championship",
] as const;

/** Number of levels unlocked each camp day. */
const LEVELS_PER_DAY = 10;

/** Hour (24h) when new levels unlock. */
const UNLOCK_HOUR = 7;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Calculate the camp day number (1-5) from the current date and start date.
 * Returns 0 if camp has not started, or 6+ if camp is over.
 */
function getCampDay(campStartDate: string): number {
  const now = new Date();
  const start = new Date(campStartDate);

  const nowMidnight = Date.UTC(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );
  const startMidnight = Date.UTC(
    start.getFullYear(),
    start.getMonth(),
    start.getDate()
  );

  const diffMs = nowMidnight - startMidnight;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 0;
  return diffDays + 1;
}

/**
 * Format a duration in milliseconds as "Xh Ym" or "Ym" if under an hour.
 */
function formatTimeRemaining(ms: number): string {
  if (ms <= 0) return "Unlocked!";

  const totalMinutes = Math.ceil(ms / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

/**
 * Compute milliseconds until the next day's levels unlock.
 * Returns 0 if levels are already unlocked or camp is over.
 */
function getTimeUntilNextUnlock(
  campStartDate: string,
  campDay: number
): number {
  if (campDay <= 0 || campDay > 5) return 0;

  const start = new Date(campStartDate);
  const now = new Date();

  // The next batch unlocks at the start of the *next* camp day at UNLOCK_HOUR.
  // If it is before UNLOCK_HOUR on the current day, the "next unlock" is today's batch.
  const currentHour = now.getHours();

  // Determine which day's unlock we are waiting for
  let targetDay = campDay;
  if (currentHour >= UNLOCK_HOUR) {
    // Today's levels are already unlocked; wait for next day
    targetDay = campDay + 1;
  }

  if (targetDay > 5) return 0; // Camp is finished

  // Target unlock date = campStartDate + (targetDay - 1) days, at UNLOCK_HOUR:00
  const targetDate = new Date(start);
  targetDate.setDate(targetDate.getDate() + (targetDay - 1));
  targetDate.setHours(UNLOCK_HOUR, 0, 0, 0);

  const remaining = targetDate.getTime() - now.getTime();
  return Math.max(0, remaining);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CampCountdown() {
  const currentGameRoom = useGameStore((s) => s.currentGameRoom);
  const campStartDate = currentGameRoom?.campStartDate;

  // Update the countdown every 60 seconds
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(interval);
  }, []);

  // Nothing to show if there is no camp start date configured
  if (!campStartDate) return null;

  const campDay = getCampDay(campStartDate);

  // Camp hasn't started yet
  if (campDay <= 0) {
    const start = new Date(campStartDate);
    const now = new Date();
    const daysUntil = Math.ceil(
      (start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    return (
      <div className="px-3 py-3">
        <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3 space-y-1.5">
          <div className="flex items-center gap-1.5 text-amber-800 dark:text-amber-300">
            <Calendar className="h-3.5 w-3.5" />
            <span className="text-xs font-semibold">Camp starts in {daysUntil} day{daysUntil !== 1 ? "s" : ""}</span>
          </div>
          <p className="text-xs text-amber-700 dark:text-amber-400">
            {start.toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
      </div>
    );
  }

  // Camp is over (past day 5)
  if (campDay > 5) {
    return (
      <div className="px-3 py-3">
        <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 p-3 space-y-1.5">
          <div className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300">
            <Calendar className="h-3.5 w-3.5" />
            <span className="text-xs font-semibold">Camp Complete</span>
          </div>
          <p className="text-xs text-emerald-700 dark:text-emerald-400">
            All 50 levels are unlocked. Good luck!
          </p>
        </div>
      </div>
    );
  }

  // Active camp day (1-5)
  const dayTheme = DAY_THEMES[campDay - 1];
  const levelStart = (campDay - 1) * LEVELS_PER_DAY + 1;
  const levelEnd = campDay * LEVELS_PER_DAY;
  const timeUntilNext = getTimeUntilNextUnlock(campStartDate, campDay);

  return (
    <div className="px-3 py-3">
      <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3 space-y-2">
        {/* Current day info */}
        <div className="flex items-center gap-1.5 text-amber-800 dark:text-amber-300">
          <Calendar className="h-3.5 w-3.5" />
          <span className="text-xs font-semibold">
            Day {campDay}: {dayTheme}
          </span>
        </div>

        <p className="text-xs text-amber-700 dark:text-amber-400">
          Levels {levelStart}-{levelEnd} unlocked
        </p>

        {/* Countdown to next unlock */}
        {timeUntilNext > 0 && campDay < 5 && (
          <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-500">
            <Clock className="h-3 w-3" />
            <span>
              Day {campDay + 1} unlocks in{" "}
              <span className="font-semibold">
                {formatTimeRemaining(timeUntilNext)}
              </span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
