/**
 * PlayPage - Main gameplay page where players make business decisions for their current level.
 *
 * Displays the current scenario narrative, three decision sliders (price, quality, marketing),
 * budget status, optional loan offers, and simulation results. Handles level-locked states,
 * game-over states, and the full decision-to-results flow.
 *
 * Route: /play
 */

import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  DollarSign,
  Star,
  Megaphone,
  Play,
  Lock,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Users,
  Cloud,
  Lightbulb,
  Banknote,
  ArrowRight,
  RotateCcw,
  ShoppingBag,
  XCircle,
  CheckCircle2,
  Target,
} from "lucide-react";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { useGameStore } from "@/store/game-store";
import {
  formatBudget,
  getBudgetColorClass,
} from "@/components/layout/DesktopSidebar";
import BudgetWarningBanner from "@/components/BudgetWarningBanner";

/** Quality level labels mapped by 1-indexed quality value. */
const QUALITY_LABELS: Record<number, string> = {
  1: "Basic",
  2: "Good",
  3: "Great",
  4: "Premium",
  5: "Gourmet",
};

/** Per-cup ingredient cost labels mapped by quality level. */
const QUALITY_COSTS: Record<number, string> = {
  1: "$0.10",
  2: "$0.12",
  3: "$0.15",
  4: "$0.20",
  5: "$0.28",
};

/** Fixed costs deducted per level, mirroring the store constant. */
const FIXED_COSTS_PER_LEVEL = 20;

export default function PlayPage() {
  const navigate = useNavigate();

  // --- Store selectors ---
  const currentPlayer = useGameStore((s) => s.currentPlayer);
  const currentDecision = useGameStore((s) => s.currentDecision);
  const lastSimulationResult = useGameStore((s) => s.lastSimulationResult);
  const isSimulating = useGameStore((s) => s.isSimulating);
  const currentGameRoom = useGameStore((s) => s.currentGameRoom);

  // --- Store actions ---
  const updateDecision = useGameStore((s) => s.updateDecision);
  const runSimulation = useGameStore((s) => s.runSimulation);
  const acceptLoan = useGameStore((s) => s.acceptLoan);
  const declineLoan = useGameStore((s) => s.declineLoan);
  const resetGame = useGameStore((s) => s.resetGame);
  const isLevelUnlocked = useGameStore((s) => s.isLevelUnlocked);
  const getLevelScenario = useGameStore((s) => s.getLevelScenario);

  // Redirect to home if no active player is selected
  useEffect(() => {
    if (!currentPlayer) {
      navigate("/", { replace: true });
    }
  }, [currentPlayer, navigate]);

  // Derive the scenario for the player's current level
  const scenario = useMemo(() => {
    if (!currentPlayer) return null;
    return getLevelScenario(currentPlayer.currentLevel);
  }, [currentPlayer, getLevelScenario]);

  // Determine whether the current level is time-gated
  const levelUnlocked = useMemo(() => {
    if (!currentPlayer) return false;
    return isLevelUnlocked(
      currentPlayer.currentLevel,
      currentGameRoom?.campStartDate
    );
  }, [currentPlayer, currentGameRoom?.campStartDate, isLevelUnlocked]);

  // All 50 levels complete check
  const allLevelsComplete = currentPlayer
    ? currentPlayer.currentLevel > 50
    : false;

  // Budget-derived values
  const budget = currentPlayer?.budget ?? 0;
  const maxAffordableMarketing = Math.max(
    0,
    Math.floor(budget - FIXED_COSTS_PER_LEVEL)
  );
  const canAffordToPlay = budget >= FIXED_COSTS_PER_LEVEL;

  // Loan state checks
  const loanAvailable =
    scenario?.loanOffer != null && currentPlayer?.activeLoan == null;
  const loanAlreadyAccepted =
    currentPlayer?.activeLoan != null &&
    currentPlayer.activeLoan.acceptedAtLevel === currentPlayer.currentLevel;

  // Guard: nothing to render until player data is available
  if (!currentPlayer || !scenario) {
    return null;
  }

  // =========================================================================
  // Game Over State
  // =========================================================================
  if (currentPlayer.isGameOver) {
    return (
      <div className="space-y-6">
        <Card className="border-red-300 bg-red-50">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
            <CardTitle className="text-2xl text-red-900">
              Business Closed
            </CardTitle>
            <CardDescription className="text-red-700">
              Your budget dropped below the minimum operating threshold.
              {currentPlayer.gameOverAtLevel != null && (
                <span className="block mt-1">
                  Game ended at Level {currentPlayer.gameOverAtLevel}.
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            {/* Comprehensive stats grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
              <div className="rounded-lg bg-white p-3">
                <p className="text-muted-foreground">Levels Completed</p>
                <p className="text-lg font-bold text-foreground">
                  {currentPlayer.completedLevels.length}
                </p>
              </div>
              <div className="rounded-lg bg-white p-3">
                <p className="text-muted-foreground">Peak Budget</p>
                <p className="text-lg font-bold text-emerald-600">
                  {formatBudget(currentPlayer.peakBudget)}
                </p>
              </div>
              <div className="rounded-lg bg-white p-3">
                <p className="text-muted-foreground">Total Profit</p>
                <p
                  className={cn(
                    "text-lg font-bold",
                    currentPlayer.totalProfit >= 0
                      ? "text-emerald-600"
                      : "text-red-600"
                  )}
                >
                  {formatBudget(currentPlayer.totalProfit)}
                </p>
              </div>
              <div className="rounded-lg bg-white p-3">
                <p className="text-muted-foreground">Total Revenue</p>
                <p className="text-lg font-bold text-foreground">
                  {formatBudget(currentPlayer.totalRevenue)}
                </p>
              </div>
              <div className="rounded-lg bg-white p-3">
                <p className="text-muted-foreground">Cups Sold</p>
                <p className="text-lg font-bold text-foreground">
                  {currentPlayer.totalCupsSold.toLocaleString()}
                </p>
              </div>
              <div className="rounded-lg bg-white p-3">
                <p className="text-muted-foreground">Closed at Level</p>
                <p className="text-lg font-bold text-red-600">
                  {currentPlayer.gameOverAtLevel ?? "N/A"}
                </p>
              </div>
            </div>

            {/* Lessons learned */}
            {currentPlayer.levelResults.length > 0 && (() => {
              const results = currentPlayer.levelResults;
              const profitableLevels = results.filter(r => r.profit > 0).length;
              const avgProfit = results.reduce((sum, r) => sum + r.profit, 0) / results.length;
              const bestLevel = results.reduce((best, r) => r.profit > best.profit ? r : best, results[0]!);
              const worstLevel = results.reduce((worst, r) => r.profit < worst.profit ? r : worst, results[0]!);

              return (
                <Card className="text-left">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Lightbulb className="h-4 w-4 text-amber-600" />
                      Lessons Learned
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm text-muted-foreground">
                    <p>
                      You were profitable in <span className="font-semibold text-foreground">{profitableLevels}</span> of{" "}
                      <span className="font-semibold text-foreground">{results.length}</span> levels
                      (avg profit: {formatBudget(Math.round(avgProfit * 100) / 100)}).
                    </p>
                    <p>
                      Best level: <span className="font-semibold text-emerald-600">Level {bestLevel.level}</span> ({formatBudget(bestLevel.profit)} profit).
                    </p>
                    <p>
                      Toughest level: <span className="font-semibold text-red-600">Level {worstLevel.level}</span> ({formatBudget(worstLevel.profit)} profit).
                    </p>
                    {profitableLevels < results.length / 2 && (
                      <p className="italic">Tip: Matching price and quality to each scenario's target market is key to staying profitable.</p>
                    )}
                  </CardContent>
                </Card>
              );
            })()}

            {/* Active loan warning */}
            {currentPlayer.activeLoan && (
              <Alert className="border-red-200 bg-red-100/50 text-left">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  You had an outstanding loan of{" "}
                  {formatBudget(currentPlayer.activeLoan.remainingBalance)}{" "}
                  remaining when your business closed.
                </AlertDescription>
              </Alert>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                onClick={() => {
                  resetGame();
                  navigate("/play");
                }}
                className="bg-gradient-to-r from-yellow-500 to-amber-500 text-yellow-950 font-semibold hover:from-yellow-600 hover:to-amber-600"
                size="lg"
              >
                <RotateCcw className="mr-2 h-5 w-5" />
                Start Fresh
              </Button>
              <Button
                onClick={() => navigate("/leaderboard")}
                variant="outline"
                size="lg"
              >
                View Leaderboard
              </Button>
              <Button
                onClick={() => navigate("/profile")}
                variant="outline"
                size="lg"
              >
                View Profile
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // =========================================================================
  // All Levels Complete State
  // =========================================================================
  if (allLevelsComplete) {
    return (
      <div className="space-y-6">
        <Card className="border-amber-300 bg-gradient-to-br from-yellow-50 to-amber-50">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100">
              <CheckCircle2 className="h-8 w-8 text-amber-600" />
            </div>
            <CardTitle className="text-2xl text-amber-900">
              Congratulations!
            </CardTitle>
            <CardDescription className="text-amber-700">
              You have completed all 50 levels of the Lemonade Stand Business
              Game.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="rounded-lg bg-white p-3">
                <p className="text-muted-foreground">Final Budget</p>
                <p
                  className={cn(
                    "text-lg font-bold",
                    getBudgetColorClass(budget)
                  )}
                >
                  {formatBudget(budget)}
                </p>
              </div>
              <div className="rounded-lg bg-white p-3">
                <p className="text-muted-foreground">Total Profit</p>
                <p
                  className={cn(
                    "text-lg font-bold",
                    currentPlayer.totalProfit >= 0
                      ? "text-emerald-600"
                      : "text-red-600"
                  )}
                >
                  {formatBudget(currentPlayer.totalProfit)}
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                onClick={() => navigate("/leaderboard")}
                className="bg-gradient-to-r from-yellow-500 to-amber-500 text-yellow-950 font-semibold hover:from-yellow-600 hover:to-amber-600"
                size="lg"
              >
                <Target className="mr-2 h-5 w-5" />
                View Leaderboard
              </Button>
              <Button
                onClick={() => navigate("/levels")}
                variant="outline"
                size="lg"
              >
                Review Levels
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // =========================================================================
  // Level Locked State
  // =========================================================================
  if (!levelUnlocked) {
    const levelDay = Math.ceil(currentPlayer.currentLevel / 10);
    return (
      <div className="space-y-6">
        <Card className="border-gray-300 bg-gray-50">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-gray-200">
              <Lock className="h-8 w-8 text-gray-500" />
            </div>
            <CardTitle className="text-2xl text-gray-700">
              Level {currentPlayer.currentLevel} - Locked
            </CardTitle>
            <CardDescription className="text-gray-600">
              This level unlocks on Camp Day {levelDay} at 7:00 AM.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-sm text-muted-foreground">
              Levels {(levelDay - 1) * 10 + 1} through {levelDay * 10} become
              available on Day {levelDay} of camp. Check back when the next day
              begins.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                onClick={() => navigate("/levels")}
                variant="outline"
                size="lg"
              >
                View Level Map
              </Button>
              <Button
                onClick={() => navigate("/leaderboard")}
                variant="outline"
                size="lg"
              >
                View Leaderboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // =========================================================================
  // Simulation Running State
  // =========================================================================
  if (isSimulating) {
    return (
      <LoadingSpinner
        message="Simulating your business day..."
        submessage="Customers are arriving at your stand and making purchasing decisions based on your price, quality, and marketing."
      />
    );
  }

  // =========================================================================
  // Simulation Results Inline Preview
  // =========================================================================
  if (lastSimulationResult) {
    const { cupsSold, revenue, costs, profit, feedback } =
      lastSimulationResult;
    const isProfitable = profit >= 0;

    // The player's level was advanced after simulation, so the result
    // pertains to (currentLevel - 1).
    const completedLevel = currentPlayer.currentLevel - 1;

    return (
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-foreground">
            Level {completedLevel} Complete
          </h2>
          <p className="text-muted-foreground">
            {getLevelScenario(completedLevel)?.title ?? ""}
          </p>
        </div>

        {/* Key metric cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-4 text-center">
              <ShoppingBag className="mx-auto mb-1 h-5 w-5 text-blue-600" />
              <p className="text-xs text-muted-foreground">Cups Sold</p>
              <p className="text-xl font-bold tabular-nums text-blue-700">
                {cupsSold}
              </p>
            </CardContent>
          </Card>
          <Card className="border-emerald-200 bg-emerald-50">
            <CardContent className="p-4 text-center">
              <DollarSign className="mx-auto mb-1 h-5 w-5 text-emerald-600" />
              <p className="text-xs text-muted-foreground">Revenue</p>
              <p className="text-xl font-bold tabular-nums text-emerald-700">
                {formatBudget(revenue)}
              </p>
            </CardContent>
          </Card>
          <Card className="border-orange-200 bg-orange-50">
            <CardContent className="p-4 text-center">
              <TrendingDown className="mx-auto mb-1 h-5 w-5 text-orange-600" />
              <p className="text-xs text-muted-foreground">Costs</p>
              <p className="text-xl font-bold tabular-nums text-orange-700">
                {formatBudget(costs)}
              </p>
            </CardContent>
          </Card>
          <Card
            className={cn(
              "border-2",
              isProfitable
                ? "border-emerald-300 bg-emerald-50"
                : "border-red-300 bg-red-50"
            )}
          >
            <CardContent className="p-4 text-center">
              {isProfitable ? (
                <TrendingUp className="mx-auto mb-1 h-5 w-5 text-emerald-600" />
              ) : (
                <TrendingDown className="mx-auto mb-1 h-5 w-5 text-red-600" />
              )}
              <p className="text-xs text-muted-foreground">Net Profit</p>
              <p
                className={cn(
                  "text-xl font-bold tabular-nums",
                  isProfitable ? "text-emerald-700" : "text-red-700"
                )}
              >
                {profit >= 0 ? "+" : ""}
                {formatBudget(profit)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Brief feedback preview */}
        {feedback.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Quick Feedback</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {feedback.slice(0, 3).map((msg, i) => (
                <p key={i} className="text-sm text-muted-foreground">
                  {msg}
                </p>
              ))}
              {feedback.length > 3 && (
                <p className="text-xs text-muted-foreground italic">
                  + {feedback.length - 3} more on the results page
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Navigation to full results */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            onClick={() => navigate("/results")}
            className="bg-gradient-to-r from-yellow-500 to-amber-500 text-yellow-950 font-semibold hover:from-yellow-600 hover:to-amber-600"
            size="lg"
          >
            Continue to Results
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </div>
    );
  }

  // =========================================================================
  // Decision-Making Phase (primary state)
  // =========================================================================
  return (
    <div className="space-y-6">
      {/* Level header with badges */}
      <div className="space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge
            variant="outline"
            className="border-amber-300 bg-amber-50 text-amber-800"
          >
            Level {currentPlayer.currentLevel} / 50
          </Badge>
          <Badge
            variant="outline"
            className="border-gray-300 text-muted-foreground"
          >
            Day {scenario.day}
          </Badge>
          {scenario.deceptionLevel === "high" && (
            <Badge variant="destructive" className="text-xs">
              Tricky Market
            </Badge>
          )}
          {scenario.deceptionLevel === "medium" && (
            <Badge
              variant="outline"
              className="border-yellow-300 bg-yellow-50 text-yellow-800 text-xs"
            >
              Mixed Signals
            </Badge>
          )}
        </div>
        <h1 className="text-2xl font-bold text-foreground">{scenario.title}</h1>
      </div>

      {/* Budget warning banner (shown when budget is low) */}
      <BudgetWarningBanner />

      {/* Scenario narrative card */}
      <Card>
        <CardContent className="p-5 space-y-4">
          <p className="text-sm leading-relaxed text-foreground/90">
            {scenario.story}
          </p>

          <Separator />

          <div className="grid sm:grid-cols-2 gap-3 text-sm">
            <div className="flex items-start gap-2">
              <Users className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <div>
                <p className="font-medium text-foreground">Target Market</p>
                <p className="text-muted-foreground">{scenario.targetMarket}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Cloud className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
              <div>
                <p className="font-medium text-foreground">Market Condition</p>
                <p className="text-muted-foreground">
                  {scenario.marketCondition}
                </p>
              </div>
            </div>
          </div>

          {/* Strategic hint */}
          <div className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 border border-amber-200">
            <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <p className="text-sm text-amber-900 italic">{scenario.hint}</p>
          </div>
        </CardContent>
      </Card>

      {/* Budget display card */}
      <Card
        className={cn(
          "border-2",
          budget >= 100
            ? "border-emerald-200 bg-emerald-50/50"
            : budget >= 50
            ? "border-amber-200 bg-amber-50/50"
            : "border-red-200 bg-red-50/50"
        )}
      >
        <CardContent className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full",
                budget >= 100
                  ? "bg-emerald-100"
                  : budget >= 50
                  ? "bg-amber-100"
                  : "bg-red-100"
              )}
            >
              <DollarSign
                className={cn(
                  "h-5 w-5",
                  budget >= 100
                    ? "text-emerald-600"
                    : budget >= 50
                    ? "text-amber-600"
                    : "text-red-600"
                )}
              />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                Current Budget
              </p>
              <p className="text-xs text-muted-foreground">
                Fixed costs: ${FIXED_COSTS_PER_LEVEL}/level
              </p>
            </div>
          </div>
          <div className="text-right">
            <p
              className={cn(
                "text-2xl font-bold tabular-nums",
                getBudgetColorClass(budget)
              )}
            >
              {formatBudget(budget)}
            </p>
            {currentPlayer.activeLoan && (
              <p className="text-xs text-muted-foreground">
                Loan payment: -${currentPlayer.activeLoan.repaymentPerLevel}
                /level
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Loan offer card (only if scenario has one and player has no active loan) */}
      {loanAvailable && !loanAlreadyAccepted && (
        <Card className="border-2 border-amber-400 bg-gradient-to-r from-amber-50 to-yellow-50">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Banknote className="h-5 w-5 text-amber-600" />
              <CardTitle className="text-lg text-amber-900">
                Loan Offer Available
              </CardTitle>
            </div>
            <CardDescription className="text-amber-700">
              A lender is offering you capital to grow your business.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div className="rounded-lg bg-white p-3 text-center">
                <p className="text-muted-foreground text-xs">Loan Amount</p>
                <p className="text-lg font-bold text-emerald-600">
                  +{formatBudget(scenario.loanOffer!.amount)}
                </p>
              </div>
              <div className="rounded-lg bg-white p-3 text-center">
                <p className="text-muted-foreground text-xs">Per Level</p>
                <p className="text-lg font-bold text-orange-600">
                  -${scenario.loanOffer!.repaymentPerLevel}
                </p>
              </div>
              <div className="rounded-lg bg-white p-3 text-center">
                <p className="text-muted-foreground text-xs">Total Repayment</p>
                <p className="text-lg font-bold text-foreground">
                  {formatBudget(scenario.loanOffer!.totalRepayment)}
                </p>
              </div>
              <div className="rounded-lg bg-white p-3 text-center">
                <p className="text-muted-foreground text-xs">Duration</p>
                <p className="text-lg font-bold text-foreground">
                  {scenario.loanOffer!.durationLevels} levels
                </p>
              </div>
            </div>

            <Alert className="border-amber-200 bg-amber-100/50">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800 text-xs">
                Interest cost:{" "}
                {formatBudget(
                  scenario.loanOffer!.totalRepayment - scenario.loanOffer!.amount
                )}
                . Repayments are automatically deducted from your budget after
                each level until the loan is fully repaid.
              </AlertDescription>
            </Alert>

            <div className="flex gap-3">
              <Button
                onClick={acceptLoan}
                className="flex-1 bg-gradient-to-r from-yellow-500 to-amber-500 text-yellow-950 font-semibold hover:from-yellow-600 hover:to-amber-600"
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Accept Loan
              </Button>
              <Button
                onClick={declineLoan}
                variant="outline"
                className="flex-1"
              >
                <XCircle className="mr-2 h-4 w-4" />
                Decline
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loan accepted confirmation banner */}
      {loanAlreadyAccepted && (
        <Alert className="border-emerald-200 bg-emerald-50">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <AlertDescription className="text-emerald-800">
            Loan of {formatBudget(currentPlayer.activeLoan!.amount)} accepted.
            Repayment of ${currentPlayer.activeLoan!.repaymentPerLevel}/level
            will be deducted automatically for{" "}
            {currentPlayer.activeLoan!.levelsRemaining} levels.
          </AlertDescription>
        </Alert>
      )}

      {/* Active loan reminder from a prior level */}
      {currentPlayer.activeLoan && !loanAlreadyAccepted && (
        <Alert className="border-blue-200 bg-blue-50">
          <Banknote className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            Active loan: ${currentPlayer.activeLoan.repaymentPerLevel} will be
            deducted after this level.{" "}
            {formatBudget(currentPlayer.activeLoan.remainingBalance)} remaining
            over {currentPlayer.activeLoan.levelsRemaining} levels.
          </AlertDescription>
        </Alert>
      )}

      {/* ---- Decision Sliders ---- */}
      <div className="space-y-5">
        <h2 className="text-lg font-semibold text-foreground">
          Your Decisions
        </h2>

        {/* Price slider */}
        <Card>
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100">
                  <DollarSign className="h-4 w-4 text-emerald-600" />
                </div>
                <div>
                  <p className="font-medium text-foreground text-sm">
                    Cup Price
                  </p>
                  <p className="text-xs text-muted-foreground">
                    $0.25 - $2.00 per cup
                  </p>
                </div>
              </div>
              <p className="text-xl font-bold tabular-nums text-emerald-600">
                ${currentDecision.price.toFixed(2)}
              </p>
            </div>
            <Slider
              value={[currentDecision.price]}
              min={0.25}
              max={2.0}
              step={0.05}
              onValueChange={([value]) => updateDecision({ price: value })}
              aria-label="Cup price"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>$0.25 (Cheap)</span>
              <span>$2.00 (Premium)</span>
            </div>
          </CardContent>
        </Card>

        {/* Quality slider */}
        <Card>
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-yellow-100">
                  <Star className="h-4 w-4 text-yellow-600" />
                </div>
                <div>
                  <p className="font-medium text-foreground text-sm">
                    Lemonade Quality
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Higher quality costs more per cup
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-yellow-600">
                  {currentDecision.quality}/5
                </p>
                <p className="text-xs text-muted-foreground">
                  {QUALITY_LABELS[currentDecision.quality]} &middot;{" "}
                  {QUALITY_COSTS[currentDecision.quality]}/cup
                </p>
              </div>
            </div>
            <Slider
              value={[currentDecision.quality]}
              min={1}
              max={5}
              step={1}
              onValueChange={([value]) => updateDecision({ quality: value })}
              aria-label="Lemonade quality"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>1 (Basic)</span>
              <span>5 (Gourmet)</span>
            </div>
          </CardContent>
        </Card>

        {/* Marketing slider */}
        <Card>
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100">
                  <Megaphone className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-foreground text-sm">
                    Marketing Budget
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Spend on advertising to attract customers
                  </p>
                </div>
              </div>
              <p className="text-xl font-bold tabular-nums text-blue-600">
                ${currentDecision.marketing}
              </p>
            </div>
            <Slider
              value={[currentDecision.marketing]}
              min={0}
              max={30}
              step={1}
              onValueChange={([value]) => updateDecision({ marketing: value })}
              aria-label="Marketing budget"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>$0 (None)</span>
              <span>$30 (Max)</span>
            </div>
            {currentDecision.marketing > maxAffordableMarketing && (
              <p className="text-xs text-red-600 font-medium">
                Your marketing spend exceeds what you can afford after fixed
                costs. The simulation will cap it automatically.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Cannot afford to play */}
      {!canAffordToPlay && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            You do not have enough budget to cover the $
            {FIXED_COSTS_PER_LEVEL} fixed operating costs.
          </AlertDescription>
        </Alert>
      )}

      {/* Submit button */}
      <div className="flex flex-col items-center gap-3 pt-2 pb-4">
        <Button
          onClick={runSimulation}
          disabled={!canAffordToPlay}
          size="lg"
          className="w-full sm:w-auto bg-gradient-to-r from-yellow-500 to-amber-500 text-yellow-950 font-semibold text-lg px-10 py-6 hover:from-yellow-600 hover:to-amber-600 disabled:opacity-50"
        >
          <Play className="mr-2 h-5 w-5" />
          Open for Business!
        </Button>
        <p className="text-xs text-muted-foreground text-center max-w-sm">
          Your decisions will be simulated against the current market conditions.
        </p>
      </div>
    </div>
  );
}
