import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Users,
  Trophy,
  Download,
  ChevronDown,
  ChevronUp,
  Calendar,
  Copy,
  Check,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Target,
  DollarSign,
  BarChart3,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useGameStore, type Player } from "@/store/game-store";
import { GameRoomManager } from "@/components/GameRoomManager";
import { RoomAnalytics } from "@/components/RoomAnalytics";
import { formatBudget } from "@/components/layout/DesktopSidebar";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// CSV Export Helpers
// ---------------------------------------------------------------------------

/**
 * Escapes a value for CSV format according to RFC 4180.
 * - If value contains comma, quote, or newline, wrap in quotes
 * - Double any existing quotes
 * - Handle null/undefined gracefully
 */
function escapeCSVValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  const str = String(value);
  // If the value contains comma, double quote, or newline, wrap in quotes
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    // Escape existing double quotes by doubling them
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Converts an array of arrays (rows) to a properly escaped CSV string.
 */
function toCSV(rows: unknown[][]): string {
  return rows.map(row => row.map(escapeCSVValue).join(",")).join("\n");
}

/**
 * Triggers a browser download of a CSV file.
 * Works in both Chrome and Safari.
 */
function downloadCSV(content: string, filename: string): void {
  // Add BOM for Excel compatibility with UTF-8
  const BOM = "\uFEFF";
  const blob = new Blob([BOM + content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  // Required for Firefox
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Derives the current camp day (1-5) from the camp start date.
 * Day 1 = the start date itself. Returns 1 if no date is set.
 */
function getCampDay(campStartDate: string): number {
  if (!campStartDate) return 1;
  const start = new Date(campStartDate + "T00:00:00");
  const now = new Date();
  const diffDays = Math.floor(
    (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
  );
  return Math.min(5, Math.max(1, diffDays + 1));
}

/**
 * Returns the inclusive range [first, last] of level numbers for a given camp day.
 */
function getTodayLevelRange(campDay: number): [number, number] {
  const first = (campDay - 1) * 10 + 1;
  const last = campDay * 10;
  return [first, last];
}

/**
 * Counts how many of today's levels a player has completed.
 */
function countTodayCompletedLevels(
  player: Player,
  campDay: number,
): number {
  const [first, last] = getTodayLevelRange(campDay);
  return player.completedLevels.filter((l) => l >= first && l <= last).length;
}

/**
 * Formats a Date object as a readable date string (e.g. "Jul 13, 2026").
 */
function formatDate(dateStr: string): string {
  if (!dateStr) return "Not set";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Detects the most common suboptimal decision trend across all players.
 * Uses simple heuristics on averaged player decisions.
 */
function detectCommonMistake(players: Player[]): string {
  const activePlayers = players.filter(
    (p) => p.levelResults.length > 0,
  );
  if (activePlayers.length === 0) return "No data yet";

  let totalPrice = 0;
  let totalMarketing = 0;
  let totalQuality = 0;
  let totalDecisions = 0;

  for (const player of activePlayers) {
    for (const result of player.levelResults) {
      totalPrice += result.decisions.price;
      totalMarketing += result.decisions.marketing;
      totalQuality += result.decisions.quality;
      totalDecisions += 1;
    }
  }

  if (totalDecisions === 0) return "No data yet";

  const avgPrice = totalPrice / totalDecisions;
  const avgMarketing = totalMarketing / totalDecisions;
  const avgQuality = totalQuality / totalDecisions;

  // Heuristic thresholds for suboptimal decisions
  if (avgPrice > 1.5) return "Overpricing";
  if (avgPrice < 0.5) return "Underpricing";
  if (avgMarketing < 10) return "Undermarketing";
  if (avgQuality < 2) return "Low quality";
  if (avgMarketing > 25) return "Overspending on ads";
  if (avgQuality > 4 && avgPrice < 1.0) return "High cost, low price";

  return "Balanced decisions";
}

// ---------------------------------------------------------------------------
// Expanded Row Component
// ---------------------------------------------------------------------------

interface ExpandedPlayerRowProps {
  player: Player;
}

function ExpandedPlayerRow({ player }: ExpandedPlayerRowProps) {
  const lastResults = player.levelResults.slice(-5).reverse();

  return (
    <TableRow>
      <TableCell colSpan={8} className="bg-muted/40 p-0">
        <div className="px-4 py-4 space-y-4 sm:px-8">
          {/* Last 5 Level Results */}
          <div>
            <h4 className="text-sm font-semibold mb-2">
              Recent Level Results
            </h4>
            {lastResults.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No levels completed yet.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="py-1 pr-3 text-left font-medium">
                        Level
                      </th>
                      <th className="py-1 pr-3 text-left font-medium">
                        Scenario
                      </th>
                      <th className="py-1 pr-3 text-right font-medium">
                        Price
                      </th>
                      <th className="py-1 pr-3 text-right font-medium">
                        Quality
                      </th>
                      <th className="py-1 pr-3 text-right font-medium">
                        Marketing
                      </th>
                      <th className="py-1 text-right font-medium">
                        Profit
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {lastResults.map((result) => (
                      <tr
                        key={result.level}
                        className="border-b last:border-0"
                      >
                        <td className="py-1.5 pr-3 tabular-nums">
                          {result.level}
                        </td>
                        <td
                          className="py-1.5 pr-3 max-w-[180px] truncate"
                          title={result.scenario}
                        >
                          {result.scenario}
                        </td>
                        <td className="py-1.5 pr-3 text-right tabular-nums">
                          ${result.decisions.price.toFixed(2)}
                        </td>
                        <td className="py-1.5 pr-3 text-right tabular-nums">
                          {"*".repeat(result.decisions.quality)}
                        </td>
                        <td className="py-1.5 pr-3 text-right tabular-nums">
                          ${result.decisions.marketing.toFixed(0)}
                        </td>
                        <td
                          className={cn(
                            "py-1.5 text-right tabular-nums font-medium",
                            result.profit >= 0
                              ? "text-emerald-700"
                              : "text-red-600",
                          )}
                        >
                          {result.profit >= 0 ? "+" : ""}
                          {formatBudget(result.profit)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Budget Range and Loan Details */}
          <div className="flex flex-wrap gap-4">
            {/* Budget Range */}
            <div className="flex-1 min-w-[180px] rounded-lg border bg-card p-3">
              <p className="text-xs font-medium text-muted-foreground mb-1.5">
                Budget Range
              </p>
              <div className="flex items-center gap-3 text-sm">
                <span className="flex items-center gap-1">
                  <TrendingDown className="h-3.5 w-3.5 text-red-500" />
                  <span className="tabular-nums">
                    {formatBudget(player.lowestBudget)}
                  </span>
                </span>
                <span className="text-muted-foreground">&rarr;</span>
                <span className="flex items-center gap-1">
                  <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                  <span className="tabular-nums">
                    {formatBudget(player.peakBudget)}
                  </span>
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Current: {formatBudget(player.budget)}
              </p>
            </div>

            {/* Active Loan */}
            <div className="flex-1 min-w-[180px] rounded-lg border bg-card p-3">
              <p className="text-xs font-medium text-muted-foreground mb-1.5">
                Active Loan
              </p>
              {player.activeLoan ? (
                <div className="text-sm space-y-0.5">
                  <p>
                    <span className="text-muted-foreground">Amount:</span>{" "}
                    <span className="tabular-nums font-medium">
                      {formatBudget(player.activeLoan.amount)}
                    </span>
                  </p>
                  <p>
                    <span className="text-muted-foreground">Remaining:</span>{" "}
                    <span className="tabular-nums font-medium">
                      {formatBudget(player.activeLoan.remainingBalance)}
                    </span>
                  </p>
                  <p>
                    <span className="text-muted-foreground">Per level:</span>{" "}
                    <span className="tabular-nums">
                      {formatBudget(player.activeLoan.repaymentPerLevel)}
                    </span>{" "}
                    <span className="text-muted-foreground">
                      ({player.activeLoan.levelsRemaining} left)
                    </span>
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No active loan</p>
              )}
              {player.loanHistory.length > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  {player.loanHistory.length} loan
                  {player.loanHistory.length !== 1 ? "s" : ""} taken total
                </p>
              )}
            </div>
          </div>

          {/* View Profile button */}
          <div className="pt-1">
            <p className="text-xs text-muted-foreground italic">
              Profile view is only accessible when logged in as this player.
            </p>
          </div>
        </div>
      </TableCell>
    </TableRow>
  );
}

// ---------------------------------------------------------------------------
// Main Page Component
// ---------------------------------------------------------------------------

export default function FacilitatorPage() {
  const navigate = useNavigate();
  const currentGameRoom = useGameStore((state) => state.currentGameRoom);
  const getLeaderboard = useGameStore((state) => state.getLeaderboard);
  const refreshCurrentRoom = useGameStore((state) => state.refreshCurrentRoom);
  const subscribeToRoom = useGameStore((state) => state.subscribeToRoom);
  const realtimeStatus = useGameStore((state) => state.realtimeStatus);

  const [expandedPlayerId, setExpandedPlayerId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount, not on every room update
  }, []);

  // Ensure real-time subscription is active on mount (once)
  useEffect(() => {
    if (!currentGameRoom) return;
    subscribeToRoom();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- subscribe once, not on every room update
  }, []);

  const players = useMemo(() => currentGameRoom?.players ?? [], [currentGameRoom?.players]);
  const leaderboard = getLeaderboard();

  // Derive camp day from room start date
  const campDay = useMemo(
    () => getCampDay(currentGameRoom?.campStartDate ?? ""),
    [currentGameRoom?.campStartDate],
  );

  // Compute today's completed level count per player for badge display
  const todayProgressMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of players) {
      map.set(p.id, countTodayCompletedLevels(p, campDay));
    }
    return map;
  }, [players, campDay]);

  // Aggregate stats (memoised for performance with many players)
  const stats = useMemo(() => {
    const totalPlayers = players.length;
    if (totalPlayers === 0) {
      return {
        totalPlayers: 0,
        activePlayers: 0,
        avgLevel: 0,
        avgProfit: 0,
        completionRate: 0,
        commonMistake: "No data yet",
        avgBudget: 0,
      };
    }

    const activePlayers = players.filter((p) => !p.isGameOver);
    const totalCompletedLevels = players.reduce(
      (sum, p) => sum + p.completedLevels.length,
      0,
    );
    const totalPossibleLevels = totalPlayers * 50;

    const avgBudget =
      activePlayers.length > 0
        ? activePlayers.reduce((sum, p) => sum + p.budget, 0) /
          activePlayers.length
        : 0;

    return {
      totalPlayers,
      activePlayers: activePlayers.length,
      avgLevel:
        totalPlayers > 0
          ? players.reduce((sum, p) => sum + p.completedLevels.length, 0) /
            totalPlayers
          : 0,
      avgProfit:
        totalPlayers > 0
          ? players.reduce((sum, p) => sum + p.totalProfit, 0) / totalPlayers
          : 0,
      completionRate:
        totalPossibleLevels > 0
          ? (totalCompletedLevels / totalPossibleLevels) * 100
          : 0,
      commonMistake: detectCommonMistake(players),
      avgBudget,
    };
  }, [players]);

  // Copy room code to clipboard
  const handleCopyRoomCode = useCallback(() => {
    if (!currentGameRoom?.id) return;
    void navigator.clipboard.writeText(currentGameRoom.id).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [currentGameRoom?.id]);

  // Toggle expanded row
  const handleToggleExpand = useCallback((playerId: string) => {
    setExpandedPlayerId((prev) => (prev === playerId ? null : playerId));
  }, []);

  /**
   * Export leaderboard data as CSV with proper escaping.
   * Includes: rank, name, level, budget, profit, revenue, cups, loan status.
   */
  function handleExportLeaderboardCSV() {
    if (players.length === 0) return;
    const headers = [
      "Rank",
      "Name",
      "Level",
      "Budget",
      "Total Profit",
      "Total Revenue",
      "Cups Sold",
      "Loans Taken",
      "Active Loan Balance",
      "Status",
    ];
    const rows: unknown[][] = leaderboard.map((entry) => [
      entry.rank,
      entry.player.name,
      `${entry.player.currentLevel}/50`,
      entry.player.budget.toFixed(2),
      entry.player.totalProfit.toFixed(2),
      entry.player.totalRevenue.toFixed(2),
      entry.player.totalCupsSold,
      entry.player.loanHistory.length,
      entry.player.activeLoan ? entry.player.activeLoan.remainingBalance.toFixed(2) : "0.00",
      entry.player.isGameOver ? "Game Over" : "Active",
    ]);
    const csv = toCSV([headers, ...rows]);
    const filename = `leaderboard-${currentGameRoom?.name ?? "room"}-${new Date().toISOString().slice(0, 10)}.csv`;
    downloadCSV(csv, filename);
  }

  /**
   * Export all player histories as CSV with all level results.
   * Each row represents one level result for one player.
   */
  function handleExportPlayerHistoryCSV() {
    if (players.length === 0) return;

    const headers = [
      "Player Name",
      "Player ID",
      "Level",
      "Scenario",
      "Price",
      "Quality",
      "Marketing",
      "Cups Sold",
      "Revenue",
      "Costs",
      "Profit",
      "Budget After",
      "Loan Repayment",
      "Loan Accepted",
      "Loan Amount",
      "Timestamp",
    ];

    const rows: unknown[][] = [];

    for (const player of players) {
      for (const result of player.levelResults) {
        rows.push([
          player.name,
          player.id,
          result.level,
          result.scenario,
          result.decisions.price.toFixed(2),
          result.decisions.quality,
          result.decisions.marketing.toFixed(2),
          result.cupsSold,
          result.revenue.toFixed(2),
          result.costs.toFixed(2),
          result.profit.toFixed(2),
          result.budgetAfter.toFixed(2),
          result.loanRepaymentDeducted.toFixed(2),
          result.loanAcceptedThisLevel ? "Yes" : "No",
          result.loanAmountReceived.toFixed(2),
          result.timestamp,
        ]);
      }
    }

    const csv = toCSV([headers, ...rows]);
    const filename = `player-history-${currentGameRoom?.name ?? "room"}-${new Date().toISOString().slice(0, 10)}.csv`;
    downloadCSV(csv, filename);
  }

  /**
   * Export aggregate camp statistics as a summary report.
   */
  function handleExportStatsCSV() {
    const headers = ["Metric", "Value"];
    const rows: unknown[][] = [
      ["Room Name", currentGameRoom?.name ?? "Unknown"],
      ["Room Code", currentGameRoom?.id ?? "Unknown"],
      ["Camp Start Date", formatDate(currentGameRoom?.campStartDate ?? "")],
      ["Current Camp Day", `Day ${campDay} / 5`],
      ["Total Players", stats.totalPlayers],
      ["Active Players", stats.activePlayers],
      ["Average Level", stats.avgLevel.toFixed(1)],
      ["Average Profit", formatBudget(stats.avgProfit)],
      ["Average Budget", formatBudget(stats.avgBudget)],
      ["Completion Rate", `${stats.completionRate.toFixed(1)}%`],
      ["Common Mistake", stats.commonMistake],
      ["Export Date", new Date().toISOString()],
    ];

    const csv = toCSV([headers, ...rows]);
    const filename = `camp-stats-${currentGameRoom?.name ?? "room"}-${new Date().toISOString().slice(0, 10)}.csv`;
    downloadCSV(csv, filename);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/")}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Game
          </Button>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            Facilitator Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage game rooms and monitor player progress.
          </p>
        </div>

        {/* Room Management */}
        <div className="mb-8">
          <GameRoomManager />
        </div>

        {/* Room Info Bar */}
        {currentGameRoom && (
          <div className="mb-6 rounded-lg border bg-white/80 backdrop-blur-sm shadow-sm">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3 sm:px-6">
              {/* Room Code */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Room Code
                </span>
                <button
                  type="button"
                  onClick={handleCopyRoomCode}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5",
                    "bg-amber-100 font-mono text-lg font-bold text-amber-900",
                    "hover:bg-amber-200 transition-colors cursor-pointer",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500",
                  )}
                  title="Click to copy room code"
                >
                  {currentGameRoom.id}
                  {copied ? (
                    <Check className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <Copy className="h-4 w-4 text-amber-700" />
                  )}
                </button>
              </div>

              {/* Player Count */}
              <div className="flex items-center gap-1.5">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  <span className="font-semibold tabular-nums">
                    {players.length}
                  </span>{" "}
                  <span className="text-muted-foreground">
                    player{players.length !== 1 ? "s" : ""}
                  </span>
                </span>
              </div>

              {/* Camp Start Date */}
              <div className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  <span className="text-muted-foreground">Camp start:</span>{" "}
                  <span className="font-medium">
                    {formatDate(currentGameRoom.campStartDate)}
                  </span>
                </span>
              </div>

              {/* Current Camp Day */}
              <div className="flex items-center gap-1.5">
                <Badge
                  variant="outline"
                  className="border-amber-400 bg-amber-50 text-amber-800 font-semibold"
                >
                  Day {campDay} / 5
                </Badge>
                <span className="text-xs text-muted-foreground">
                  Levels {(campDay - 1) * 10 + 1}&ndash;{campDay * 10}
                </span>
              </div>

              {/* Sync / real-time status indicator */}
              {isRefreshing && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span className="text-xs">Syncing...</span>
                </div>
              )}
              {realtimeStatus === "connected" && (
                <Badge variant="outline" className="gap-1.5 text-emerald-600 border-emerald-200">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  Live
                </Badge>
              )}
              {realtimeStatus === "reconnecting" && (
                <Badge variant="outline" className="gap-1.5 text-amber-600 border-amber-200">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Reconnecting...
                </Badge>
              )}
              {realtimeStatus === "disconnected" && !isRefreshing && (
                <Badge variant="outline" className="gap-1.5 text-muted-foreground">
                  <span className="h-2 w-2 rounded-full bg-gray-400" />
                  Offline
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Room Analytics Dashboard - only show when a room is active */}
        {currentGameRoom && (
          <div className="mb-6">
            <RoomAnalytics
              players={players}
              campDay={campDay}
              realtimeStatus={realtimeStatus}
            />
          </div>
        )}

        {/* Player Overview - only show when a room is active */}
        {currentGameRoom && players.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Player Progress
                  </CardTitle>
                  <CardDescription>
                    {players.length} player{players.length !== 1 ? "s" : ""} in{" "}
                    {currentGameRoom.name}
                  </CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate("/awards")}
                  >
                    <Trophy className="h-4 w-4 mr-1" />
                    Awards
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportLeaderboardCSV}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Leaderboard
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportPlayerHistoryCSV}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Player History
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportStatsCSV}
                  >
                    <BarChart3 className="h-4 w-4 mr-1" />
                    Stats
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Player Table */}
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Player</TableHead>
                      <TableHead className="text-right">Level</TableHead>
                      <TableHead className="text-right">Budget</TableHead>
                      <TableHead className="text-right">Profit</TableHead>
                      <TableHead className="text-right">Cups</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-center">Today</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leaderboard.map((entry) => {
                      const todayCompleted =
                        todayProgressMap.get(entry.player.id) ?? 0;
                      const isInactive = todayCompleted === 0;
                      const isExpanded =
                        expandedPlayerId === entry.player.id;

                      return (
                        <PlayerRowGroup
                          key={entry.player.id}
                          rank={entry.rank}
                          player={entry.player}
                          todayCompleted={todayCompleted}
                          isInactive={isInactive}
                          isExpanded={isExpanded}
                          onToggle={handleToggleExpand}
                        />
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Aggregate Stats Grid */}
              <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
                <StatCard
                  value={String(stats.totalPlayers)}
                  label="Total Players"
                  icon={<Users className="h-4 w-4" />}
                />
                <StatCard
                  value={String(stats.activePlayers)}
                  label="Still Active"
                  icon={<Target className="h-4 w-4" />}
                />
                <StatCard
                  value={stats.avgLevel.toFixed(1)}
                  label="Avg Level"
                  icon={<BarChart3 className="h-4 w-4" />}
                />
                <StatCard
                  value={formatBudget(stats.avgProfit)}
                  label="Avg Profit"
                  icon={<TrendingUp className="h-4 w-4" />}
                />
                <StatCard
                  value={`${stats.completionRate.toFixed(1)}%`}
                  label="Completion Rate"
                  icon={<Target className="h-4 w-4" />}
                />
                <StatCard
                  value={stats.commonMistake}
                  label="Common Mistake"
                  icon={<AlertTriangle className="h-4 w-4" />}
                  small
                />
                <StatCard
                  value={formatBudget(stats.avgBudget)}
                  label="Avg Budget"
                  icon={<DollarSign className="h-4 w-4" />}
                />
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** A single stat card for the aggregate grid. */
function StatCard({
  value,
  label,
  icon,
  small = false,
}: {
  value: string;
  label: string;
  icon: React.ReactNode;
  small?: boolean;
}) {
  return (
    <div className="rounded-lg border bg-card p-3 text-center">
      <div className="flex justify-center mb-1 text-muted-foreground">
        {icon}
      </div>
      <p
        className={cn(
          "font-bold tabular-nums leading-tight",
          small ? "text-sm" : "text-xl",
        )}
      >
        {value}
      </p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}

/**
 * Renders a player's main table row plus the expandable detail row.
 * Extracted to keep the map body readable and allow React.Fragment keying.
 */
function PlayerRowGroup({
  rank,
  player,
  todayCompleted,
  isInactive,
  isExpanded,
  onToggle,
}: {
  rank: number;
  player: Player;
  todayCompleted: number;
  isInactive: boolean;
  isExpanded: boolean;
  onToggle: (id: string) => void;
}) {
  return (
    <>
      <TableRow
        className={cn(
          "cursor-pointer transition-colors hover:bg-muted/60",
          isInactive &&
            !player.isGameOver &&
            "bg-amber-50/70 hover:bg-amber-100/60",
          isExpanded && "bg-muted/40",
        )}
        onClick={() => onToggle(player.id)}
      >
        <TableCell className="font-medium tabular-nums">
          {rank}
        </TableCell>
        <TableCell className="font-medium">
          <div className="flex items-center gap-2">
            {player.name}
            {isExpanded ? (
              <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </div>
        </TableCell>
        <TableCell className="text-right tabular-nums">
          {player.currentLevel}/50
        </TableCell>
        <TableCell className="text-right tabular-nums">
          {formatBudget(player.budget)}
        </TableCell>
        <TableCell className="text-right tabular-nums">
          {formatBudget(player.totalProfit)}
        </TableCell>
        <TableCell className="text-right tabular-nums">
          {player.totalCupsSold}
        </TableCell>
        <TableCell className="text-center">
          {player.isGameOver ? (
            <Badge variant="destructive">Game Over</Badge>
          ) : (
            <Badge
              variant="outline"
              className="border-emerald-400 text-emerald-700"
            >
              Active
            </Badge>
          )}
        </TableCell>
        <TableCell className="text-center">
          <Badge
            variant="outline"
            className={cn(
              "tabular-nums",
              isInactive && !player.isGameOver
                ? "border-amber-400 bg-amber-50 text-amber-800"
                : todayCompleted >= 10
                  ? "border-emerald-400 bg-emerald-50 text-emerald-800"
                  : "border-slate-300 text-slate-600",
            )}
          >
            {todayCompleted}/10
          </Badge>
        </TableCell>
      </TableRow>
      {isExpanded && <ExpandedPlayerRow player={player} />}
    </>
  );
}
