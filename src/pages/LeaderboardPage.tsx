/**
 * LeaderboardPage - Displays ranked player standings for the current game room.
 *
 * Players are sorted by totalProfit (descending) with tiebreakers on
 * totalRevenue, totalCupsSold, and levels completed.
 *
 * Visual treatment:
 *   - Gold (#1), Silver (#2), Bronze (#3) row highlights
 *   - Current player's row is visually distinct with a ring accent
 *   - Responsive: full table on desktop, stacked cards on mobile
 *
 * Route: /leaderboard
 */

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Trophy,
  Medal,
  Award,
  Users,
  Crown,
  CupSoda,
  DollarSign,
  TrendingUp,
  Layers,
  RefreshCw,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { useGameStore } from "@/store/game-store";
import { formatBudget } from "@/components/layout/DesktopSidebar";

/**
 * Returns rank-specific icon for the top 3, or a numeric badge for the rest.
 */
function RankIndicator({ rank }: { rank: number }) {
  switch (rank) {
    case 1:
      return <Trophy className="h-5 w-5 text-yellow-500" aria-label="1st place" />;
    case 2:
      return <Medal className="h-5 w-5 text-gray-400" aria-label="2nd place" />;
    case 3:
      return <Award className="h-5 w-5 text-amber-600" aria-label="3rd place" />;
    default:
      return (
        <span className="inline-flex h-5 w-5 items-center justify-center text-xs font-bold text-muted-foreground">
          {rank}
        </span>
      );
  }
}

/**
 * Returns Tailwind classes for rank-based row backgrounds and borders.
 */
function getRankRowClasses(rank: number): string {
  switch (rank) {
    case 1:
      return "bg-gradient-to-r from-yellow-50 to-amber-50 border-l-4 border-l-yellow-400";
    case 2:
      return "bg-gradient-to-r from-gray-50 to-slate-50 border-l-4 border-l-gray-400";
    case 3:
      return "bg-gradient-to-r from-amber-50 to-orange-50 border-l-4 border-l-amber-500";
    default:
      return "";
  }
}

export default function LeaderboardPage() {
  const currentGameRoom = useGameStore((s) => s.currentGameRoom);
  const currentPlayer = useGameStore((s) => s.currentPlayer);
  const getLeaderboard = useGameStore((s) => s.getLeaderboard);
  const refreshCurrentRoom = useGameStore((s) => s.refreshCurrentRoom);
  const subscribeToRoom = useGameStore((s) => s.subscribeToRoom);
  const realtimeStatus = useGameStore((s) => s.realtimeStatus);

  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch fresh room data from Supabase on mount
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
  }, [currentGameRoom, refreshCurrentRoom]);

  // Ensure real-time subscription is active on mount
  useEffect(() => {
    if (!currentGameRoom) return;
    subscribeToRoom();
  }, [currentGameRoom, subscribeToRoom]);

  // No room joined: prompt user to join one
  if (!currentGameRoom) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Trophy className="h-16 w-16 text-muted-foreground/30 mb-6" />
        <h1 className="text-2xl font-bold text-foreground mb-2">Leaderboard</h1>
        <p className="text-muted-foreground mb-6 max-w-md">
          Join a room to see the leaderboard and compete with other players.
        </p>
        <Button asChild className="bg-gradient-to-r from-yellow-500 to-amber-500 text-yellow-950 font-semibold">
          <Link to="/">Go to Home</Link>
        </Button>
      </div>
    );
  }

  const entries = getLeaderboard();

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Trophy className="h-6 w-6 text-yellow-500" />
          Leaderboard
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Player rankings for{" "}
          <span className="font-medium text-foreground">{currentGameRoom.name}</span>
          {" "}({currentGameRoom.id})
        </p>
      </div>

      {/* Summary badges */}
      <div className="flex flex-wrap gap-2">
        <Badge variant="outline" className="gap-1">
          <Users className="h-3 w-3" />
          {entries.length} player{entries.length !== 1 ? "s" : ""}
        </Badge>
        {currentPlayer && (
          <Badge variant="secondary" className="gap-1">
            <Crown className="h-3 w-3" />
            Your rank: #{entries.find((e) => e.player.id === currentPlayer.id)?.rank ?? "?"}
          </Badge>
        )}
        {isRefreshing && (
          <Badge variant="outline" className="gap-1 text-muted-foreground animate-pulse">
            <RefreshCw className="h-3 w-3 animate-spin" />
            Syncing...
          </Badge>
        )}
        {realtimeStatus === "connected" && (
          <Badge variant="outline" className="gap-1 text-emerald-600 border-emerald-200">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Live
          </Badge>
        )}
        {realtimeStatus === "reconnecting" && (
          <Badge variant="outline" className="gap-1 text-amber-600 border-amber-200">
            <RefreshCw className="h-3 w-3 animate-spin" />
            Reconnecting...
          </Badge>
        )}
        {realtimeStatus === "disconnected" && !isRefreshing && (
          <Badge variant="outline" className="gap-1 text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-gray-400" />
            Offline
          </Badge>
        )}
      </div>

      {/* Empty state */}
      {entries.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Users className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">
              No players have joined this room yet. Share the room code to get started!
            </p>
            <p className="text-lg font-bold text-foreground mt-2">
              Room code: {currentGameRoom.id}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Top 3 podium cards (shown only when 3+ players exist) */}
          {entries.length >= 3 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {entries.slice(0, 3).map((entry) => {
                const isCurrentPlayer = currentPlayer?.id === entry.player.id;
                const podiumColors = [
                  "from-yellow-400 to-amber-500 text-yellow-950",
                  "from-gray-300 to-gray-400 text-gray-800",
                  "from-amber-500 to-orange-500 text-amber-950",
                ];
                return (
                  <Card
                    key={entry.player.id}
                    className={cn(
                      "relative overflow-hidden",
                      isCurrentPlayer && "ring-2 ring-amber-400 ring-offset-2"
                    )}
                  >
                    <div
                      className={cn(
                        "h-2 bg-gradient-to-r",
                        podiumColors[entry.rank - 1]
                      )}
                    />
                    <CardContent className="pt-4 pb-4 text-center">
                      <RankIndicator rank={entry.rank} />
                      <p className="mt-2 font-bold text-sm truncate" title={entry.player.name}>
                        {entry.player.name}
                      </p>
                      <p className="text-lg font-bold tabular-nums text-foreground mt-1">
                        {formatBudget(entry.player.totalProfit)}
                      </p>
                      <p className="text-xs text-muted-foreground">profit</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          <Separator />

          {/* Desktop table view */}
          <Card className="hidden md:block">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Full Rankings</CardTitle>
              <CardDescription>
                Sorted by total profit, then revenue, cups sold, and levels completed
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Rank</TableHead>
                    <TableHead>Player</TableHead>
                    <TableHead className="text-right">
                      <span className="inline-flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" /> Profit
                      </span>
                    </TableHead>
                    <TableHead className="text-right">
                      <span className="inline-flex items-center gap-1">
                        <DollarSign className="h-3 w-3" /> Revenue
                      </span>
                    </TableHead>
                    <TableHead className="text-right">
                      <span className="inline-flex items-center gap-1">
                        <CupSoda className="h-3 w-3" /> Cups
                      </span>
                    </TableHead>
                    <TableHead className="text-right">
                      <span className="inline-flex items-center gap-1">
                        <Layers className="h-3 w-3" /> Level
                      </span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry) => {
                    const isCurrentPlayer = currentPlayer?.id === entry.player.id;
                    return (
                      <TableRow
                        key={entry.player.id}
                        className={cn(
                          getRankRowClasses(entry.rank),
                          isCurrentPlayer && "ring-2 ring-inset ring-amber-400 bg-amber-50/50"
                        )}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <RankIndicator rank={entry.rank} />
                            <span className="text-xs font-medium text-muted-foreground">
                              #{entry.rank}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm">
                              {entry.player.name}
                            </span>
                            {isCurrentPlayer && (
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                You
                              </Badge>
                            )}
                            {entry.player.isGameOver && (
                              <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                                Game Over
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-bold tabular-nums">
                          {formatBudget(entry.player.totalProfit)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">
                          {formatBudget(entry.player.totalRevenue)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">
                          {entry.player.totalCupsSold.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">
                          {entry.player.currentLevel > 50 ? 50 : entry.player.currentLevel}
                          <span className="text-xs">/50</span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Mobile card view */}
          <div className="md:hidden space-y-2">
            {entries.map((entry) => {
              const isCurrentPlayer = currentPlayer?.id === entry.player.id;
              return (
                <Card
                  key={entry.player.id}
                  className={cn(
                    getRankRowClasses(entry.rank),
                    isCurrentPlayer && "ring-2 ring-amber-400 ring-offset-1"
                  )}
                >
                  <CardContent className="py-3 px-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <RankIndicator rank={entry.rank} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-sm truncate">
                              {entry.player.name}
                            </span>
                            {isCurrentPlayer && (
                              <Badge variant="secondary" className="text-[10px] px-1 py-0 shrink-0">
                                You
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Level {entry.player.currentLevel > 50 ? 50 : entry.player.currentLevel}/50
                            {entry.player.isGameOver && " - Game Over"}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-2">
                        <p className="font-bold tabular-nums text-sm">
                          {formatBudget(entry.player.totalProfit)}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {formatBudget(entry.player.totalRevenue)} rev | {entry.player.totalCupsSold} cups
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
