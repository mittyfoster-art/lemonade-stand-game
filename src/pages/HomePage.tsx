/**
 * HomePage - Welcome screen and player dashboard for Lemonade Stand Business Game v2.
 *
 * Two modes:
 *   1. **No player logged in**: Shows a welcome banner, the GameRoomManager
 *      (handles room join/create), a brief game description, and a link
 *      to the How to Play page.
 *   2. **Player logged in**: Shows a personalized dashboard with budget,
 *      level progress, total profit, cups sold, quick-action buttons,
 *      active loan summary, recent level results, and room info.
 *
 * This page is rendered inside AppLayout -- it should NOT include its own
 * sidebar, header, or layout chrome.
 */

import { Link } from "react-router-dom";
import { useGameStore } from "@/store/game-store";
import { GameRoomManager } from "@/components/GameRoomManager";
import { formatBudget, getBudgetColorClass } from "@/components/layout/DesktopSidebar";
import BudgetWarningBanner from "@/components/BudgetWarningBanner";
import { CampCountdown } from "@/components/CampCountdown";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  DollarSign,
  TrendingUp,
  GlassWater,
  Map,
  Play,
  Trophy,
  Banknote,
  HelpCircle,
  Users,
  ChevronRight,
} from "lucide-react";

// =============================================================================
// Constants
// =============================================================================

/** Total number of levels in the game, used for progress calculations. */
const MAX_LEVEL = 50;

// =============================================================================
// Component
// =============================================================================

function HomePage() {
  const { currentPlayer, currentGameRoom, getLeaderboard } = useGameStore();

  // --------------------------------------------------------------------------
  // No player logged in -- welcome / join flow
  // --------------------------------------------------------------------------
  if (!currentPlayer) {
    return (
      <div className="space-y-8">
        {/* Welcome header */}
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center gap-3">
            <span className="text-5xl" role="img" aria-label="Lemon">
              🍋
            </span>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
              Lemonade Stand Business
            </h1>
          </div>
          <p className="text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Run your own lemonade stand! Set prices, choose quality, plan your
            marketing, and navigate 50 unique market scenarios. Compete with
            other players to build the most profitable business.
          </p>
        </div>

        {/* Room join / create flow */}
        <GameRoomManager />

        {/* How to Play link */}
        <div className="text-center">
          <Link
            to="/how-to-play"
            className="inline-flex items-center gap-2 text-sm font-medium text-amber-700 hover:text-amber-900 transition-colors"
          >
            <HelpCircle className="h-4 w-4" />
            Learn how to play
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // Player is logged in -- dashboard
  // --------------------------------------------------------------------------

  const levelProgress = Math.min(
    ((currentPlayer.currentLevel - 1) / MAX_LEVEL) * 100,
    100
  );

  // Recent level results: last 3 completed levels, most recent first
  const recentResults = [...currentPlayer.levelResults]
    .reverse()
    .slice(0, 3);

  // Leaderboard rank for current player
  const leaderboard = getLeaderboard();
  const playerRankEntry = leaderboard.find(
    (entry) => entry.player.id === currentPlayer.id
  );
  const playerRank = playerRankEntry?.rank ?? null;

  return (
    <div className="space-y-8">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          Welcome back, {currentPlayer.name}!
        </h1>
        <p className="text-muted-foreground mt-1">
          Here is your business at a glance.
        </p>
      </div>

      {/* Camp day countdown */}
      <CampCountdown variant="card" />

      {/* Budget warning banner (shown when budget is low) */}
      <BudgetWarningBanner />

      {/* ------------------------------------------------------------------ */}
      {/* Dashboard stat cards                                                */}
      {/* ------------------------------------------------------------------ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Budget */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Budget
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p
              className={`text-2xl font-bold tabular-nums ${getBudgetColorClass(
                currentPlayer.budget
              )}`}
            >
              {formatBudget(currentPlayer.budget)}
            </p>
            {currentPlayer.isGameOver && (
              <Badge variant="destructive" className="mt-1 text-xs">
                Business Closed
              </Badge>
            )}
          </CardContent>
        </Card>

        {/* Level Progress */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Level
            </CardTitle>
            <Map className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums text-foreground">
              {currentPlayer.currentLevel > MAX_LEVEL
                ? MAX_LEVEL
                : currentPlayer.currentLevel}
              <span className="text-sm font-normal text-muted-foreground">
                /{MAX_LEVEL}
              </span>
            </p>
            <Progress value={levelProgress} className="mt-2 h-2" />
          </CardContent>
        </Card>

        {/* Total Profit */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Profit
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p
              className={`text-2xl font-bold tabular-nums ${
                currentPlayer.totalProfit >= 0
                  ? "text-emerald-600"
                  : "text-red-500"
              }`}
            >
              {formatBudget(currentPlayer.totalProfit)}
            </p>
            {playerRank !== null && (
              <p className="text-xs text-muted-foreground mt-1">
                Rank #{playerRank} of {leaderboard.length}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Cups Sold */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Cups Sold
            </CardTitle>
            <GlassWater className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums text-foreground">
              {currentPlayer.totalCupsSold.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Across {currentPlayer.completedLevels.length} level
              {currentPlayer.completedLevels.length !== 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Quick action buttons                                                */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex flex-wrap gap-3">
        {!currentPlayer.isGameOver && currentPlayer.currentLevel <= MAX_LEVEL && (
          <Button
            asChild
            size="lg"
            className="bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 text-yellow-950 font-semibold"
          >
            <Link to="/play">
              <Play className="mr-2 h-5 w-5" />
              Play Next Level
            </Link>
          </Button>
        )}
        <Button asChild variant="outline" size="lg">
          <Link to="/leaderboard">
            <Trophy className="mr-2 h-5 w-5" />
            Leaderboard
          </Link>
        </Button>
        <Button asChild variant="outline" size="lg">
          <Link to="/levels">
            <Map className="mr-2 h-5 w-5" />
            Level Map
          </Link>
        </Button>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Active loan summary                                                 */}
      {/* ------------------------------------------------------------------ */}
      {currentPlayer.activeLoan && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Banknote className="h-5 w-5 text-amber-600" />
              Active Loan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Remaining Balance</p>
                <p className="font-semibold text-foreground">
                  {formatBudget(currentPlayer.activeLoan.remainingBalance)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Per-Level Payment</p>
                <p className="font-semibold text-foreground">
                  {formatBudget(currentPlayer.activeLoan.repaymentPerLevel)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Levels Remaining</p>
                <p className="font-semibold text-foreground">
                  {currentPlayer.activeLoan.levelsRemaining}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Accepted at Level</p>
                <p className="font-semibold text-foreground">
                  {currentPlayer.activeLoan.acceptedAtLevel}
                </p>
              </div>
            </div>
            <div className="mt-3">
              <Button asChild variant="outline" size="sm">
                <Link to="/loans">
                  View Loan Details
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Recent level results                                                */}
      {/* ------------------------------------------------------------------ */}
      {recentResults.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recent Results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentResults.map((result) => (
              <div
                key={result.level}
                className="flex items-center justify-between rounded-lg border px-4 py-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    Level {result.level}: {result.scenario}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {result.cupsSold} cups sold &middot; Revenue{" "}
                    {formatBudget(result.revenue)}
                  </p>
                </div>
                <div className="ml-4 text-right shrink-0">
                  <p
                    className={`text-sm font-bold tabular-nums ${
                      result.profit >= 0 ? "text-emerald-600" : "text-red-500"
                    }`}
                  >
                    {result.profit >= 0 ? "+" : ""}
                    {formatBudget(result.profit)}
                  </p>
                </div>
              </div>
            ))}
            {currentPlayer.levelResults.length > 3 && (
              <div className="text-center pt-1">
                <Button asChild variant="ghost" size="sm">
                  <Link to="/profile">
                    View all results
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Room info                                                           */}
      {/* ------------------------------------------------------------------ */}
      {currentGameRoom && (
        <Card className="border-muted">
          <CardContent className="flex items-center gap-4 py-4">
            <Users className="h-5 w-5 text-amber-600 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {currentGameRoom.name}
              </p>
              <p className="text-xs text-muted-foreground">
                Room code:{" "}
                <span className="font-mono font-semibold">
                  {currentGameRoom.id}
                </span>{" "}
                &middot; {currentGameRoom.players.length} player
                {currentGameRoom.players.length !== 1 ? "s" : ""}
              </p>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link to="/leaderboard">View Room</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default HomePage;
