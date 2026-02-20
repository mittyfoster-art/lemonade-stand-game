/**
 * ResultsPage - Detailed breakdown of the most recently completed level.
 *
 * Shows revenue, costs, profit, cups sold, budget change visualization,
 * loan repayment info, decision recap, and full feedback messages.
 * Provides navigation to the next level or the leaderboard.
 *
 * Route: /results
 */

import { useEffect, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  ShoppingBag,
  ArrowRight,
  ArrowDown,
  Star,
  Megaphone,
  Banknote,
  Trophy,
  MessageSquare,
  BarChart3,
  Wallet,
  CheckCircle2,
  XCircle,
  Check,
  X,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useGameStore } from "@/store/game-store";
import {
  formatBudget,
  getBudgetColorClass,
} from "@/components/layout/DesktopSidebar";
import {
  CountUpAnimation,
  AnimatedProgressBar,
} from "@/components/CountUpAnimation";

export default function ResultsPage() {
  const navigate = useNavigate();

  // --- Store selectors ---
  const currentPlayer = useGameStore((s) => s.currentPlayer);
  const lastSimulationResult = useGameStore((s) => s.lastSimulationResult);

  // --- Store actions ---
  const advanceToNextLevel = useGameStore((s) => s.advanceToNextLevel);
  const getLevelScenario = useGameStore((s) => s.getLevelScenario);

  // Redirect if there is no result to display
  useEffect(() => {
    if (!lastSimulationResult || !currentPlayer) {
      navigate("/play", { replace: true });
    }
  }, [lastSimulationResult, currentPlayer, navigate]);

  // Derive the level result from the player's history (the last entry)
  const levelResult = useMemo(() => {
    if (!currentPlayer || currentPlayer.levelResults.length === 0) return null;
    return currentPlayer.levelResults[currentPlayer.levelResults.length - 1];
  }, [currentPlayer]);

  // Guard: nothing to render until data is available
  if (!currentPlayer || !lastSimulationResult || !levelResult) {
    return null;
  }

  const {
    level: completedLevel,
    scenario: scenarioTitle,
    decisions,
    cupsSold,
    revenue,
    costs,
    profit,
    budgetAfter,
    loanRepaymentDeducted,
    loanAcceptedThisLevel,
    loanAmountReceived,
    feedback,
  } = levelResult;

  // Budget before this level = budgetAfter - profit + loanRepayment - loanReceived
  // (reverse the math to show "before")
  const budgetBefore =
    Math.round(
      (budgetAfter - profit + loanRepaymentDeducted - loanAmountReceived) * 100
    ) / 100;

  const budgetChange = Math.round((budgetAfter - budgetBefore) * 100) / 100;
  const isProfitable = profit >= 0;
  const isPositiveBudgetChange = budgetChange >= 0;

  // Scenario data for additional context
  const scenarioData = getLevelScenario(completedLevel);

  // Decision quality indicators (extracted from JSX for clarity)
  const optimal = scenarioData.optimalDecision;
  const priceInRange =
    decisions.price >= optimal.priceRange[0] &&
    decisions.price <= optimal.priceRange[1];
  const qualityInRange =
    decisions.quality >= optimal.qualityRange[0] &&
    decisions.quality <= optimal.qualityRange[1];
  const marketingInRange =
    decisions.marketing >= optimal.marketingRange[0] &&
    decisions.marketing <= optimal.marketingRange[1];
  const optimalCount =
    (priceInRange ? 1 : 0) +
    (qualityInRange ? 1 : 0) +
    (marketingInRange ? 1 : 0);

  const indicators = [
    {
      label: "Price",
      actual: `$${decisions.price.toFixed(2)}`,
      range: `$${optimal.priceRange[0].toFixed(2)} - $${optimal.priceRange[1].toFixed(2)}`,
      isOptimal: priceInRange,
    },
    {
      label: "Quality",
      actual: `${decisions.quality}/5`,
      range: `${optimal.qualityRange[0]}/5 - ${optimal.qualityRange[1]}/5`,
      isOptimal: qualityInRange,
    },
    {
      label: "Marketing",
      actual: `$${decisions.marketing}`,
      range: `$${optimal.marketingRange[0]} - $${optimal.marketingRange[1]}`,
      isOptimal: marketingInRange,
    },
  ] as const;

  // Calculate the demand capacity utilization (max 150 cups)
  const capacityPercent = Math.min(100, Math.round((cupsSold / 150) * 100));

  /** Handle navigation to next level */
  const handleNextLevel = () => {
    advanceToNextLevel();
    navigate("/play");
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge
            variant="outline"
            className="border-amber-300 bg-amber-50 text-amber-800"
          >
            Level {completedLevel}
          </Badge>
          <Badge
            variant="outline"
            className="border-gray-300 text-muted-foreground"
          >
            Day {scenarioData.day}
          </Badge>
          {isProfitable ? (
            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">
              Profitable
            </Badge>
          ) : (
            <Badge className="bg-red-100 text-red-800 border-red-200">
              Loss
            </Badge>
          )}
        </div>
        <h1 className="text-2xl font-bold text-foreground">{scenarioTitle}</h1>
        <p className="text-sm text-muted-foreground">
          {scenarioData.marketCondition}
        </p>
      </div>

      {/* Primary financial metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4 text-center">
            <ShoppingBag className="mx-auto mb-1 h-5 w-5 text-blue-600" />
            <p className="text-xs text-muted-foreground">Cups Sold</p>
            <CountUpAnimation
              target={cupsSold}
              duration={1200}
              className="text-2xl font-bold text-blue-700"
            />
            <p className="text-xs text-muted-foreground mt-0.5">
              {capacityPercent}% capacity
            </p>
          </CardContent>
        </Card>

        <Card className="border-emerald-200 bg-emerald-50">
          <CardContent className="p-4 text-center">
            <DollarSign className="mx-auto mb-1 h-5 w-5 text-emerald-600" />
            <p className="text-xs text-muted-foreground">Revenue</p>
            <CountUpAnimation
              target={revenue}
              duration={1200}
              prefix="$"
              decimals={0}
              className="text-2xl font-bold text-emerald-700"
            />
            <p className="text-xs text-muted-foreground mt-0.5">
              ${(cupsSold > 0 ? revenue / cupsSold : 0).toFixed(2)}/cup
            </p>
          </CardContent>
        </Card>

        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4 text-center">
            <TrendingDown className="mx-auto mb-1 h-5 w-5 text-orange-600" />
            <p className="text-xs text-muted-foreground">Total Costs</p>
            <CountUpAnimation
              target={costs}
              duration={1200}
              prefix="$"
              decimals={0}
              className="text-2xl font-bold text-orange-700"
            />
            <p className="text-xs text-muted-foreground mt-0.5">
              Fixed + marketing + ingredients
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
            <CountUpAnimation
              target={Math.abs(profit)}
              duration={1500}
              prefix={profit >= 0 ? "+$" : "-$"}
              decimals={0}
              className={cn(
                "text-2xl font-bold",
                isProfitable ? "text-emerald-700" : "text-red-700"
              )}
            />
            <p className="text-xs text-muted-foreground mt-0.5">
              Before loan repayment
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Budget change visualization */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-amber-600" />
            <CardTitle className="text-base">Budget Change</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            {/* Before */}
            <div className="flex-1 rounded-lg bg-muted/50 p-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">Before</p>
              <p
                className={cn(
                  "text-xl font-bold tabular-nums",
                  getBudgetColorClass(budgetBefore)
                )}
              >
                {formatBudget(budgetBefore)}
              </p>
            </div>

            {/* Arrow with change amount */}
            <div className="flex flex-col items-center gap-1">
              <ArrowRight
                className={cn(
                  "h-6 w-6",
                  isPositiveBudgetChange ? "text-emerald-500" : "text-red-500"
                )}
              />
              <CountUpAnimation
                target={Math.abs(budgetChange)}
                duration={1500}
                prefix={budgetChange >= 0 ? "+$" : "-$"}
                decimals={0}
                className={cn(
                  "text-sm font-bold",
                  isPositiveBudgetChange ? "text-emerald-600" : "text-red-600"
                )}
              />
            </div>

            {/* After */}
            <div className="flex-1 rounded-lg bg-muted/50 p-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">After</p>
              <CountUpAnimation
                target={budgetAfter}
                start={budgetBefore}
                duration={1500}
                prefix="$"
                decimals={0}
                className={cn(
                  "text-xl font-bold",
                  getBudgetColorClass(budgetAfter)
                )}
              />
            </div>
          </div>

          {/* Breakdown of budget changes */}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                Level profit / loss
              </span>
              <span
                className={cn(
                  "font-medium tabular-nums",
                  profit >= 0 ? "text-emerald-600" : "text-red-600"
                )}
              >
                {profit >= 0 ? "+" : ""}
                {formatBudget(profit)}
              </span>
            </div>

            {loanAmountReceived > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Loan received
                </span>
                <span className="font-medium tabular-nums text-emerald-600">
                  +{formatBudget(loanAmountReceived)}
                </span>
              </div>
            )}

            {loanRepaymentDeducted > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Loan repayment
                </span>
                <span className="font-medium tabular-nums text-red-600">
                  -{formatBudget(loanRepaymentDeducted)}
                </span>
              </div>
            )}

            <Separator />

            <div className="flex justify-between font-medium">
              <span className="text-foreground">Net budget change</span>
              <span
                className={cn(
                  "tabular-nums",
                  isPositiveBudgetChange ? "text-emerald-600" : "text-red-600"
                )}
              >
                {budgetChange >= 0 ? "+" : ""}
                {formatBudget(budgetChange)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loan repayment info */}
      {loanRepaymentDeducted > 0 && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="flex items-start gap-3 p-4">
            <Banknote className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-blue-900">
                Loan Repayment: {formatBudget(loanRepaymentDeducted)} deducted
              </p>
              {currentPlayer.activeLoan ? (
                <p className="text-xs text-blue-700">
                  Remaining balance:{" "}
                  {formatBudget(currentPlayer.activeLoan.remainingBalance)} over{" "}
                  {currentPlayer.activeLoan.levelsRemaining} more levels.
                </p>
              ) : (
                <p className="text-xs text-emerald-700 font-medium">
                  Loan fully repaid this level!
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loan accepted this level info */}
      {loanAcceptedThisLevel && loanAmountReceived > 0 && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="flex items-start gap-3 p-4">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-amber-900">
                Loan of {formatBudget(loanAmountReceived)} accepted this level
              </p>
              <p className="text-xs text-amber-700">
                This amount was added to your budget before the simulation ran.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Decision recap */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-amber-600" />
            <CardTitle className="text-base">Your Decisions</CardTitle>
          </div>
          <CardDescription>
            How you configured your stand for this level.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="rounded-lg bg-emerald-50 p-3">
              <DollarSign className="mx-auto mb-1 h-4 w-4 text-emerald-600" />
              <p className="text-xs text-muted-foreground">Price</p>
              <p className="text-lg font-bold text-emerald-700">
                ${decisions.price.toFixed(2)}
              </p>
            </div>
            <div className="rounded-lg bg-yellow-50 p-3">
              <Star className="mx-auto mb-1 h-4 w-4 text-yellow-600" />
              <p className="text-xs text-muted-foreground">Quality</p>
              <p className="text-lg font-bold text-yellow-700">
                {decisions.quality}/5
              </p>
            </div>
            <div className="rounded-lg bg-blue-50 p-3">
              <Megaphone className="mx-auto mb-1 h-4 w-4 text-blue-600" />
              <p className="text-xs text-muted-foreground">Marketing</p>
              <p className="text-lg font-bold text-blue-700">
                ${decisions.marketing}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Decision Quality Analysis */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-amber-600" />
            <CardTitle className="text-base">Decision Quality</CardTitle>
          </div>
          <CardDescription>
            How your decisions compared to the optimal ranges for this scenario.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            {indicators.map((ind) => (
              <div
                key={ind.label}
                className={cn(
                  "flex items-center justify-between rounded-lg border p-3",
                  ind.isOptimal
                    ? "border-emerald-200 bg-emerald-50"
                    : "border-red-200 bg-red-50"
                )}
              >
                <div className="flex items-center gap-2">
                  {ind.isOptimal ? (
                    <Check className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <X className="h-4 w-4 text-red-600" />
                  )}
                  <span
                    className={cn(
                      "text-sm font-medium",
                      ind.isOptimal
                        ? "text-emerald-900"
                        : "text-red-900"
                    )}
                  >
                    {ind.label}
                  </span>
                </div>
                <div className="text-right text-sm">
                  <span
                    className={cn(
                      "font-bold tabular-nums",
                      ind.isOptimal
                        ? "text-emerald-700"
                        : "text-red-700"
                    )}
                  >
                    {ind.actual}
                  </span>
                  <span className="text-muted-foreground ml-2">
                    (optimal: {ind.range})
                  </span>
                </div>
              </div>
            ))}
          </div>
          {/* Scenario context: why these ranges are optimal */}
          <div className="rounded-lg bg-muted/50 border p-3 text-sm text-muted-foreground">
            <p>
              <span className="font-medium text-foreground">Why these ranges?</span>{" "}
              {scenarioData.targetMarket} in {scenarioData.marketCondition.toLowerCase()} conditions
              {scenarioData.deceptionLevel === "high"
                ? " — this tricky market rewarded counter-intuitive choices."
                : scenarioData.deceptionLevel === "medium"
                ? " — mixed signals meant careful reading of the market was key."
                : " — straightforward conditions rewarded matching supply to demand."}
            </p>
          </div>

          <div className="text-center pt-1">
            <Badge
              className={cn(
                "text-sm px-3 py-1",
                optimalCount === 3
                  ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                  : optimalCount >= 1
                  ? "bg-amber-100 text-amber-800 border-amber-200"
                  : "bg-red-100 text-red-800 border-red-200"
              )}
            >
              {optimalCount}/3 Optimal Decisions
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Capacity utilization bar */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Sales Capacity</CardTitle>
            <span className="text-sm font-medium text-muted-foreground tabular-nums">
              <CountUpAnimation target={cupsSold} duration={1200} /> / 150 cups
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <AnimatedProgressBar
            value={capacityPercent}
            duration={1500}
            className="h-3"
            colorClass={
              capacityPercent >= 90
                ? "bg-gradient-to-r from-emerald-500 to-green-500"
                : capacityPercent >= 60
                ? "bg-gradient-to-r from-yellow-500 to-amber-500"
                : capacityPercent >= 30
                ? "bg-gradient-to-r from-orange-400 to-orange-500"
                : "bg-gradient-to-r from-red-400 to-red-500"
            }
          />
          <p className="text-xs text-muted-foreground mt-2">
            {capacityPercent >= 90
              ? "Outstanding! You nearly maxed out your stand capacity."
              : capacityPercent >= 60
              ? "Good demand. There is still room to attract more customers."
              : capacityPercent >= 30
              ? "Moderate sales. Consider adjusting your strategy next time."
              : "Low sales. The market wanted something different this level."}
          </p>
        </CardContent>
      </Card>

      {/* Feedback messages */}
      {feedback.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-amber-600" />
              <CardTitle className="text-base">Feedback</CardTitle>
            </div>
            <CardDescription>
              What the market taught you this level.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {feedback.map((msg, i) => {
              // Determine card style based on content keywords
              const isPositive =
                msg.includes("Perfect") ||
                msg.includes("Outstanding") ||
                msg.includes("Solid") ||
                msg.includes("Good");
              const isNegative =
                msg.includes("Big loss") ||
                msg.includes("Small loss") ||
                msg.includes("too low") ||
                msg.includes("too high") ||
                msg.includes("wasn't enough") ||
                msg.includes("cost too much") ||
                msg.includes("over-") ||
                msg.includes("more than needed");

              return (
                <div
                  key={i}
                  className={cn(
                    "rounded-lg p-3 text-sm border",
                    isPositive
                      ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                      : isNegative
                      ? "bg-red-50 border-red-200 text-red-900"
                      : "bg-muted/50 border-border text-foreground/80"
                  )}
                >
                  <div className="flex items-start gap-2">
                    {isPositive ? (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                    ) : isNegative ? (
                      <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                    ) : (
                      <ArrowDown className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                    <span>{msg}</span>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Cumulative stats summary */}
      <Card className="bg-muted/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Running Totals</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div className="text-center">
              <p className="text-muted-foreground text-xs">Total Profit</p>
              <p
                className={cn(
                  "font-bold tabular-nums",
                  currentPlayer.totalProfit >= 0
                    ? "text-emerald-600"
                    : "text-red-600"
                )}
              >
                {formatBudget(currentPlayer.totalProfit)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-muted-foreground text-xs">Total Revenue</p>
              <p className="font-bold tabular-nums text-foreground">
                {formatBudget(currentPlayer.totalRevenue)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-muted-foreground text-xs">Cups Sold</p>
              <p className="font-bold tabular-nums text-foreground">
                {currentPlayer.totalCupsSold}
              </p>
            </div>
            <div className="text-center">
              <p className="text-muted-foreground text-xs">Levels Done</p>
              <p className="font-bold tabular-nums text-foreground">
                {currentPlayer.completedLevels.length} / 50
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Navigation actions */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center pb-4">
        {!currentPlayer.isGameOver && currentPlayer.currentLevel <= 50 ? (
          <Button
            onClick={handleNextLevel}
            className="bg-gradient-to-r from-yellow-500 to-amber-500 text-yellow-950 font-semibold hover:from-yellow-600 hover:to-amber-600"
            size="lg"
          >
            Next Level
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        ) : (
          <Button
            onClick={() => navigate("/play")}
            className="bg-gradient-to-r from-yellow-500 to-amber-500 text-yellow-950 font-semibold hover:from-yellow-600 hover:to-amber-600"
            size="lg"
          >
            {currentPlayer.isGameOver ? "View Game Over" : "View Final Results"}
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        )}

        <Button
          onClick={() => navigate("/leaderboard")}
          variant="outline"
          size="lg"
        >
          <Trophy className="mr-2 h-5 w-5" />
          View Leaderboard
        </Button>

        <Link to="/levels">
          <Button variant="ghost" size="lg" className="w-full sm:w-auto">
            Level Map
          </Button>
        </Link>
      </div>
    </div>
  );
}
