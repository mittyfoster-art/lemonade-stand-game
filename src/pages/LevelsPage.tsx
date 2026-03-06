/**
 * LevelsPage - Visual level map showing all 50 levels organized by camp day.
 *
 * Displays a grid of level cards grouped into 5 sections (Days 1-5, 10 levels each).
 * Each card shows the level number, scenario title, and completion status.
 * Completed levels are clickable to review results. The current level pulses with
 * an amber highlight. Locked levels appear grayed out with a lock icon.
 *
 * Route: /levels
 */

import { Fragment, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Lock,
  CheckCircle2,
  Play,
  Banknote,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Star,
  Megaphone,
  TrendingUp,
  TrendingDown,
  ShoppingBag,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useGameStore } from "@/store/game-store";
import { LEVEL_SCENARIOS, hasLoanOffer } from "@/data/scenarios";
import { formatBudget } from "@/components/layout/DesktopSidebar";
import type { LevelResult } from "@/store/game-store";

/** Day section metadata with themed names per the spec. */
const DAY_SECTIONS = [
  { day: 1, label: "Day 1: Foundations", description: "Learning the Basics" },
  { day: 2, label: "Day 2: Market Dynamics", description: "Reading the Market" },
  { day: 3, label: "Day 3: Strategic Pressure", description: "Managing Complexity" },
  { day: 4, label: "Day 4: Expert Decisions", description: "High Stakes" },
  { day: 5, label: "Day 5: Championship", description: "Final Push" },
] as const;

/** The four possible visual states for a level card. */
type LevelStatus = "completed" | "current" | "available" | "locked";

export default function LevelsPage() {
  const navigate = useNavigate();

  // --- Store selectors ---
  const currentPlayer = useGameStore((s) => s.currentPlayer);
  const currentGameRoom = useGameStore((s) => s.currentGameRoom);

  // --- Store actions ---
  const isLevelUnlocked = useGameStore((s) => s.isLevelUnlocked);

  // Track which level's result detail is expanded (null = none)
  const [expandedLevel, setExpandedLevel] = useState<number | null>(null);

  // Track which day sections are collapsed (all expanded by default)
  const [collapsedDays, setCollapsedDays] = useState<Set<number>>(new Set());

  // Redirect if no player is selected
  useEffect(() => {
    if (!currentPlayer) {
      navigate("/", { replace: true });
    }
  }, [currentPlayer, navigate]);

  // Build a set of completed levels for O(1) lookup
  const completedLevelsSet = useMemo(() => {
    if (!currentPlayer) return new Set<number>();
    return new Set(currentPlayer.completedLevels);
  }, [currentPlayer]);

  // Build a map of level results keyed by level number for quick access
  const levelResultsMap = useMemo(() => {
    if (!currentPlayer) return new Map<number, LevelResult>();
    const map = new Map<number, LevelResult>();
    for (const result of currentPlayer.levelResults) {
      map.set(result.level, result);
    }
    return map;
  }, [currentPlayer]);

  /**
   * Determine the visual status of a given level.
   */
  const getLevelStatus = (level: number): LevelStatus => {
    if (!currentPlayer) return "locked";

    if (completedLevelsSet.has(level)) return "completed";
    if (level === currentPlayer.currentLevel) return "current";

    const unlocked = isLevelUnlocked(level, currentGameRoom?.campStartDate);
    if (unlocked && level <= currentPlayer.currentLevel) return "available";

    return "locked";
  };

  /** Toggle a day section's collapsed state. */
  const toggleDayCollapse = (day: number) => {
    setCollapsedDays((prev) => {
      const next = new Set(prev);
      if (next.has(day)) {
        next.delete(day);
      } else {
        next.add(day);
      }
      return next;
    });
  };

  /** Handle clicking on a level card. */
  const handleLevelClick = (level: number, status: LevelStatus) => {
    if (status === "completed") {
      // Toggle result detail expansion
      setExpandedLevel((prev) => (prev === level ? null : level));
    } else if (status === "current" || status === "available") {
      navigate("/play");
    }
    // "locked" levels are not interactive
  };

  if (!currentPlayer) {
    return null;
  }

  // Overall progress
  const completedCount = currentPlayer.completedLevels.length;
  const progressPercent = Math.round((completedCount / 50) * 100);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-foreground">Level Map</h1>
        <p className="text-sm text-muted-foreground">
          Track your progress across all 50 business scenarios.
        </p>
      </div>

      {/* Overall progress card */}
      <Card className="border-amber-200 bg-gradient-to-r from-amber-50 to-yellow-50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-amber-600" />
              <span className="text-sm font-medium text-amber-900">
                Overall Progress
              </span>
            </div>
            <span className="text-sm font-bold tabular-nums text-amber-800">
              {completedCount} / 50 levels
            </span>
          </div>
          <div
            className="h-3 w-full rounded-full bg-amber-200/50 overflow-hidden"
            role="progressbar"
            aria-valuenow={completedCount}
            aria-valuemin={0}
            aria-valuemax={50}
            aria-label={`${completedCount} of 50 levels completed`}
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-yellow-500 to-amber-500 transition-all duration-500 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className="text-xs text-amber-700 mt-1.5">
            {currentPlayer.isGameOver
              ? "Game over. Reset to try again."
              : completedCount === 50
              ? "All levels complete! Check the leaderboard for your final rank."
              : `Currently on Level ${currentPlayer.currentLevel}`}
          </p>
        </CardContent>
      </Card>

      {/* Day sections */}
      {DAY_SECTIONS.map(({ day, label, description }) => {
        const isCollapsed = collapsedDays.has(day);
        const startLevel = (day - 1) * 10 + 1;
        const endLevel = day * 10;
        const dayScenarios = LEVEL_SCENARIOS.slice(startLevel - 1, endLevel);

        // Count completed levels in this day
        const dayCompletedCount = dayScenarios.filter((s) =>
          completedLevelsSet.has(s.level)
        ).length;

        return (
          <div key={day} className="space-y-3">
            {/* Day header */}
            <button
              onClick={() => toggleDayCollapse(day)}
              className="flex items-center justify-between w-full group"
              aria-expanded={!isCollapsed}
              aria-controls={`day-${day}-levels`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold",
                    dayCompletedCount === 10
                      ? "bg-emerald-100 text-emerald-700"
                      : dayCompletedCount > 0
                      ? "bg-amber-100 text-amber-700"
                      : "bg-gray-100 text-gray-500"
                  )}
                >
                  {day}
                </div>
                <div className="text-left">
                  <h2 className="text-lg font-semibold text-foreground">
                    {label}
                  </h2>
                  <p className="text-xs text-muted-foreground">{description}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={cn(
                    "text-xs",
                    dayCompletedCount === 10
                      ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                      : "border-gray-300 text-muted-foreground"
                  )}
                >
                  {dayCompletedCount}/10
                </Badge>
                {isCollapsed ? (
                  <ChevronDown className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                ) : (
                  <ChevronUp className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                )}
              </div>
            </button>

            {/* Per-day progress bar */}
            {!isCollapsed && (
              <div className="px-1">
                <Progress
                  value={(dayCompletedCount / 10) * 100}
                  className="h-2"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {dayCompletedCount}/10 levels completed
                </p>
              </div>
            )}

            {/* Level grid */}
            {!isCollapsed && (
              <div
                id={`day-${day}-levels`}
                className="grid grid-cols-2 sm:grid-cols-5 gap-3"
              >
                {dayScenarios.map((scenario) => {
                  const status = getLevelStatus(scenario.level);
                  const isExpanded = expandedLevel === scenario.level;
                  const result = levelResultsMap.get(scenario.level);
                  const showLoanIndicator = hasLoanOffer(scenario.level);

                  return (
                    <Fragment key={scenario.level}>
                      <button
                        onClick={() =>
                          handleLevelClick(scenario.level, status)
                        }
                        disabled={status === "locked"}
                        className={cn(
                          "relative w-full rounded-xl border-2 p-3 text-left transition-all",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          // Completed: green border
                          status === "completed" &&
                            "border-emerald-400 bg-emerald-50 hover:bg-emerald-100 hover:border-emerald-500 cursor-pointer",
                          // Current: amber border with pulse animation
                          status === "current" &&
                            "border-amber-400 bg-amber-50 hover:bg-amber-100 shadow-md motion-safe:animate-pulse cursor-pointer",
                          // Available today: blue border
                          status === "available" &&
                            "border-blue-400 bg-blue-50/30 hover:bg-blue-50 hover:border-blue-500 cursor-pointer",
                          // Locked: gray border with lock icon
                          status === "locked" &&
                            "border-gray-300 bg-gray-50 opacity-60 cursor-not-allowed"
                        )}
                        aria-label={`Level ${scenario.level}: ${scenario.title} - ${status}`}
                      >
                        {/* Level number and status icon */}
                        <div className="flex items-center justify-between mb-1">
                          <span
                            className={cn(
                              "text-xs font-bold tabular-nums",
                              status === "completed" && "text-emerald-700",
                              status === "current" && "text-amber-700",
                              status === "available" && "text-foreground",
                              status === "locked" && "text-gray-400"
                            )}
                          >
                            #{scenario.level}
                          </span>
                          <div className="flex items-center gap-1">
                            {showLoanIndicator && (
                              <Banknote
                                className={cn(
                                  "h-3.5 w-3.5",
                                  status === "locked"
                                    ? "text-gray-300"
                                    : "text-amber-500"
                                )}
                                aria-label="Loan offer available"
                              />
                            )}
                            {status === "completed" && (
                              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            )}
                            {status === "current" && (
                              <Play className="h-4 w-4 text-amber-600" />
                            )}
                            {status === "locked" && (
                              <Lock className="h-3.5 w-3.5 text-gray-400" />
                            )}
                          </div>
                        </div>

                        {/* Scenario title */}
                        <p
                          className={cn(
                            "text-xs font-medium leading-tight line-clamp-2",
                            status === "completed" && "text-emerald-900",
                            status === "current" && "text-amber-900",
                            status === "available" && "text-foreground",
                            status === "locked" && "text-gray-400"
                          )}
                        >
                          {scenario.title}
                        </p>

                        {/* Show brief profit/loss for completed levels */}
                        {status === "completed" && result && (
                          <div className="mt-1.5">
                            <span
                              className={cn(
                                "text-xs font-medium tabular-nums",
                                result.profit >= 0
                                  ? "text-emerald-600"
                                  : "text-red-600"
                              )}
                            >
                              {result.profit >= 0 ? "+" : ""}
                              {formatBudget(result.profit)}
                            </span>
                          </div>
                        )}

                        {/* Show unlock day hint for locked levels */}
                        {status === "locked" && (
                          <p className="mt-1 text-[10px] text-gray-400">
                            Unlocks Day {Math.ceil(scenario.level / 10)}
                          </p>
                        )}
                      </button>

                      {/* Expanded result detail panel (direct grid child for col-span-full) */}
                      {isExpanded && result && (
                        <Card className="border-emerald-200 col-span-full">
                          <CardContent className="p-3 space-y-3">
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div className="flex items-center gap-1">
                                <ShoppingBag className="h-3 w-3 text-blue-500" />
                                <span className="text-muted-foreground">
                                  Cups:
                                </span>
                                <span className="font-medium">
                                  {result.cupsSold}
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <DollarSign className="h-3 w-3 text-emerald-500" />
                                <span className="text-muted-foreground">
                                  Revenue:
                                </span>
                                <span className="font-medium">
                                  {formatBudget(result.revenue)}
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                {result.profit >= 0 ? (
                                  <TrendingUp className="h-3 w-3 text-emerald-500" />
                                ) : (
                                  <TrendingDown className="h-3 w-3 text-red-500" />
                                )}
                                <span className="text-muted-foreground">
                                  Profit:
                                </span>
                                <span
                                  className={cn(
                                    "font-medium",
                                    result.profit >= 0
                                      ? "text-emerald-600"
                                      : "text-red-600"
                                  )}
                                >
                                  {result.profit >= 0 ? "+" : ""}
                                  {formatBudget(result.profit)}
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <DollarSign className="h-3 w-3 text-amber-500" />
                                <span className="text-muted-foreground">
                                  Costs:
                                </span>
                                <span className="font-medium">
                                  {formatBudget(result.costs)}
                                </span>
                              </div>
                            </div>

                            <Separator />

                            <div className="flex items-center justify-between text-xs">
                              <div className="flex gap-3">
                                <span className="flex items-center gap-1">
                                  <DollarSign className="h-3 w-3 text-emerald-500" />
                                  ${result.decisions.price.toFixed(2)}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Star className="h-3 w-3 text-yellow-500" />
                                  {result.decisions.quality}/5
                                </span>
                                <span className="flex items-center gap-1">
                                  <Megaphone className="h-3 w-3 text-blue-500" />
                                  ${result.decisions.marketing}
                                </span>
                              </div>
                              {result.loanRepaymentDeducted > 0 && (
                                <Badge
                                  variant="outline"
                                  className="text-xs border-blue-200 text-blue-700"
                                >
                                  Loan: -
                                  {formatBudget(result.loanRepaymentDeducted)}
                                </Badge>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </Fragment>
                  );
                })}
              </div>
            )}

            {/* Separator between day sections */}
            {day < 5 && <Separator className="mt-2" />}
          </div>
        );
      })}

      {/* Navigation shortcuts */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center pb-4">
        {!currentPlayer.isGameOver && currentPlayer.currentLevel <= 50 && (
          <Button
            onClick={() => navigate("/play")}
            className="bg-gradient-to-r from-yellow-500 to-amber-500 text-yellow-950 font-semibold hover:from-yellow-600 hover:to-amber-600"
            size="lg"
          >
            <Play className="mr-2 h-5 w-5" />
            Play Level {currentPlayer.currentLevel}
          </Button>
        )}
        <Button
          onClick={() => navigate("/leaderboard")}
          variant="outline"
          size="lg"
        >
          View Leaderboard
        </Button>
      </div>
    </div>
  );
}
