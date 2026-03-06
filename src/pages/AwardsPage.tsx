/**
 * AwardsPage - Displays final awards and daily recognition for the current game room.
 *
 * Enhanced for projection during the awards ceremony:
 *   - Large text and prominent winner names
 *   - Clear visual hierarchy for viewing from a distance
 *   - Handles edge cases: no players, single player, ties, and missing qualifiers
 *
 * Layout:
 *   - Tab bar: "Final Awards" | "Day 1" | "Day 2" | "Day 3" | "Day 4" | "Day 5"
 *   - Final Awards tab: 7 award cards in a responsive grid
 *   - Day tabs: up to 6 recognition cards (3 leaderboard + 3 daily awards)
 *   - Warm amber/yellow theme consistent with the lemon branding
 *
 * Route: /awards
 */

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Award, Trophy, Users, RefreshCw } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useGameStore } from "@/store/game-store";
import {
  computeFinalAwards,
  computeDailyRecognition,
  type AwardResult,
} from "@/lib/awards";

// ============================================================================
// Award Card Component (ceremony-optimised)
// ============================================================================

/**
 * Renders a single award as a styled card optimised for projection.
 * Winner names are displayed prominently in large text so they are
 * visible from the back of a room.
 */
function AwardCard({ award }: { award: AwardResult }) {
  const hasWinner = award.winnerId !== null;

  return (
    <Card
      className={cn(
        "relative overflow-hidden transition-all duration-300",
        hasWinner
          ? "border-amber-200 bg-gradient-to-br from-amber-50/80 to-yellow-50/60 hover:shadow-lg hover:shadow-amber-200/40"
          : "border-muted bg-muted/30 opacity-60"
      )}
    >
      {/* Top accent bar -- thicker for projection visibility */}
      <div
        className={cn(
          "h-2",
          hasWinner
            ? "bg-gradient-to-r from-yellow-400 via-amber-400 to-orange-400"
            : "bg-muted"
        )}
      />

      <CardHeader className="pb-2 pt-5 px-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {/* Larger emoji for projection */}
            <span
              className="text-4xl shrink-0"
              role="img"
              aria-hidden="true"
            >
              {award.emoji}
            </span>
            <div className="min-w-0">
              <CardTitle className="text-base font-bold leading-tight">
                {award.name}
              </CardTitle>
              <CardDescription className="text-sm mt-0.5 line-clamp-2">
                {award.description}
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-1 pb-5 px-5">
        {hasWinner ? (
          <div className="space-y-2">
            {/* Winner name -- large and prominent for ceremony projection */}
            <p
              className="text-2xl font-extrabold text-foreground truncate"
              title={award.winnerName ?? ""}
            >
              {award.winnerName}
            </p>
            <Badge
              variant="secondary"
              className="bg-amber-100 text-amber-800 border-amber-200 font-bold text-sm px-3 py-1"
            >
              {award.valueLabel}
            </Badge>
          </div>
        ) : (
          <p className="text-base text-muted-foreground italic">
            No qualifier yet
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Grid Components
// ============================================================================

/**
 * Responsive grid for award cards.
 * 1 column on mobile, 2 on tablet, 3 on desktop.
 */
function AwardGrid({ awards }: { awards: AwardResult[] }) {
  if (awards.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-10 text-center">
          <Award className="h-10 w-10 text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground">
            No awards to display for this category yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {awards.map((award) => (
        <AwardCard key={award.id} award={award} />
      ))}
    </div>
  );
}

// ============================================================================
// Main Page
// ============================================================================

export default function AwardsPage() {
  const currentGameRoom = useGameStore((s) => s.currentGameRoom);
  const refreshCurrentRoom = useGameStore((s) => s.refreshCurrentRoom);
  const players = currentGameRoom?.players ?? [];

  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch fresh room data from Supabase on mount (once)
  useEffect(() => {
    if (!currentGameRoom) return;
    let cancelled = false;
    setIsRefreshing(true);
    refreshCurrentRoom()
      .catch((err: unknown) => {
        if (!cancelled) console.warn("Failed to refresh room data:", err);
      })
      .finally(() => {
        if (!cancelled) setIsRefreshing(false);
      });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
  }, []);

  // No room joined: prompt user
  if (!currentGameRoom) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Award className="h-16 w-16 text-muted-foreground/30 mb-6" />
        <h1 className="text-3xl font-bold text-foreground mb-2">Awards</h1>
        <p className="text-lg text-muted-foreground mb-6 max-w-md">
          Join a room to see awards and recognition for all players.
        </p>
        <Button
          asChild
          className="bg-gradient-to-r from-yellow-500 to-amber-500 text-yellow-950 font-semibold"
          size="lg"
        >
          <Link to="/">Go to Home</Link>
        </Button>
      </div>
    );
  }

  // Pre-compute awards for all tabs so tab switching is instant.
  // computeFinalAwards and computeDailyRecognition already handle the
  // edge cases of empty player arrays, single players, and ties
  // internally (via findMaxPlayer returning null for no-qualifier).
  const finalAwards = computeFinalAwards(players);
  const dailyAwards: Record<number, AwardResult[]> = {};
  for (let day = 1; day <= 5; day++) {
    dailyAwards[day] = computeDailyRecognition(players, day);
  }

  // Count awards that have been claimed
  const claimedFinalAwards = finalAwards.filter(
    (a) => a.winnerId !== null
  ).length;

  return (
    <div className="space-y-8">
      {/* Page header -- large for projection */}
      <div className="text-center sm:text-left">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground flex items-center justify-center sm:justify-start gap-3">
          <Award className="h-8 w-8 text-amber-500" />
          Awards Ceremony
        </h1>
        <p className="text-base text-muted-foreground mt-2">
          Recognition and awards for{" "}
          <span className="font-semibold text-foreground">
            {currentGameRoom.name}
          </span>{" "}
          <span className="text-sm">({currentGameRoom.id})</span>
        </p>
      </div>

      {/* Summary badges -- larger for projection */}
      <div className="flex flex-wrap gap-3 justify-center sm:justify-start">
        <Badge variant="outline" className="gap-1.5 text-sm px-3 py-1">
          <Users className="h-4 w-4" />
          {players.length} player{players.length !== 1 ? "s" : ""}
        </Badge>
        <Badge variant="outline" className="gap-1.5 text-sm px-3 py-1">
          <Trophy className="h-4 w-4" />
          {claimedFinalAwards} of {finalAwards.length} awards claimed
        </Badge>
        {isRefreshing && (
          <Badge variant="outline" className="gap-1.5 text-sm px-3 py-1 text-muted-foreground animate-pulse">
            <RefreshCw className="h-4 w-4 animate-spin" />
            Syncing...
          </Badge>
        )}
      </div>

      {/* Empty state: no players */}
      {players.length === 0 ? (
        <Card className="border-amber-200">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Users className="h-16 w-16 text-muted-foreground/30 mb-6" />
            <p className="text-xl text-muted-foreground">
              No players have joined this room yet.
            </p>
            <p className="text-muted-foreground mt-1">
              Awards will appear once players start completing levels.
            </p>
            <p className="text-2xl font-bold text-foreground mt-4">
              Room code: {currentGameRoom.id}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="final" className="w-full">
          <TabsList className="w-full flex flex-wrap h-auto gap-1.5 bg-amber-50/50 dark:bg-amber-950/20 p-1.5">
            <TabsTrigger
              value="final"
              className="data-[state=active]:bg-amber-100 data-[state=active]:text-amber-900 dark:data-[state=active]:bg-amber-900 dark:data-[state=active]:text-amber-100 text-sm sm:text-base font-semibold"
            >
              Final Awards
            </TabsTrigger>
            {[1, 2, 3, 4, 5].map((day) => (
              <TabsTrigger
                key={day}
                value={`day-${day}`}
                className="data-[state=active]:bg-amber-100 data-[state=active]:text-amber-900 dark:data-[state=active]:bg-amber-900 dark:data-[state=active]:text-amber-100 text-sm sm:text-base font-semibold"
              >
                Day {day}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Final Awards Tab */}
          <TabsContent value="final" className="mt-6">
            <div className="space-y-5">
              <div>
                <h2 className="text-2xl font-bold text-foreground">
                  Final Awards
                </h2>
                <p className="text-base text-muted-foreground mt-1">
                  Determined by cumulative performance across all 50 levels.
                </p>
              </div>

              {/* Single-player notice */}
              {players.length === 1 && (
                <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800">
                  <CardContent className="py-4 text-center">
                    <p className="text-sm text-blue-800 dark:text-blue-300">
                      Only one player in this room. All qualified awards go to{" "}
                      <span className="font-bold">{players[0]?.name}</span>.
                    </p>
                  </CardContent>
                </Card>
              )}

              <AwardGrid awards={finalAwards} />
            </div>
          </TabsContent>

          {/* Day Tabs */}
          {[1, 2, 3, 4, 5].map((day) => (
            <TabsContent key={day} value={`day-${day}`} className="mt-6">
              <div className="space-y-5">
                <div>
                  <h2 className="text-2xl font-bold text-foreground">
                    Day {day} Recognition
                  </h2>
                  <p className="text-base text-muted-foreground mt-1">
                    Awards for performance during levels{" "}
                    {(day - 1) * 10 + 1}-{day * 10}.
                  </p>
                </div>
                <AwardGrid awards={dailyAwards[day] ?? []} />
              </div>
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}
