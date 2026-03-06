/**
 * ProfilePage - Player stats dashboard and level history.
 *
 * Displays:
 *   - Player identity (name, room, current level)
 *   - Financial stats grid (budget, profit, revenue, cups, peak/low budget)
 *   - Visual performance bars for level-by-level profit/loss
 *   - Scrollable level results history
 *   - Loan summary and active loan status
 *
 * Redirects to "/" if no player is selected.
 *
 * Route: /profile
 */

import { useEffect, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  User,
  DollarSign,
  TrendingUp,
  TrendingDown,
  CupSoda,
  ArrowUpRight,
  ArrowDownRight,
  Banknote,
  Layers,
  BarChart3,
  History,
  AlertTriangle,
  LineChart as LineChartIcon,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useGameStore } from "@/store/game-store";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import {
  formatBudget,
  getBudgetColorClass,
} from "@/components/layout/DesktopSidebar";

/**
 * A single stat card displayed in the stats grid.
 */
function StatCard({
  label,
  value,
  icon: Icon,
  colorClass,
  subtext,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  colorClass?: string;
  subtext?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-4 pb-4 px-4">
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground">{label}</p>
            <p
              className={cn(
                "text-lg font-bold tabular-nums mt-0.5 truncate",
                colorClass ?? "text-foreground"
              )}
            >
              {value}
            </p>
            {subtext && (
              <p className="text-[10px] text-muted-foreground mt-0.5">{subtext}</p>
            )}
          </div>
          <Icon className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const currentPlayer = useGameStore((s) => s.currentPlayer);
  const currentGameRoom = useGameStore((s) => s.currentGameRoom);

  // Redirect if no player is selected
  useEffect(() => {
    if (!currentPlayer) {
      navigate("/", { replace: true });
    }
  }, [currentPlayer, navigate]);

  // Extract data with stable references so downstream useMemo hooks don't re-run on every render
  const levelResults = useMemo(() => currentPlayer?.levelResults ?? [], [currentPlayer?.levelResults]);
  const completedLevels = useMemo(() => currentPlayer?.completedLevels ?? [], [currentPlayer?.completedLevels]);
  const totalProfit = currentPlayer?.totalProfit ?? 0;
  const loanHistory = useMemo(() => currentPlayer?.loanHistory ?? [], [currentPlayer?.loanHistory]);
  const activeLoan = currentPlayer?.activeLoan ?? null;

  // Decision pattern averages
  const avgDecisions = useMemo(() => {
    if (levelResults.length === 0) return null;
    const totals = levelResults.reduce(
      (acc, r) => ({
        price: acc.price + r.decisions.price,
        quality: acc.quality + r.decisions.quality,
        marketing: acc.marketing + r.decisions.marketing,
      }),
      { price: 0, quality: 0, marketing: 0 }
    );
    const n = levelResults.length;
    return {
      price: Math.round((totals.price / n) * 100) / 100,
      quality: Math.round((totals.quality / n) * 10) / 10,
      marketing: Math.round((totals.marketing / n) * 100) / 100,
    };
  }, [levelResults]);

  /** Budget over time: starting point + budget after each level */
  const budgetOverTimeData = useMemo(() => {
    const data = [{ level: 0, budget: 500 }];
    for (const result of levelResults) {
      data.push({ level: result.level, budget: result.budgetAfter });
    }
    return data;
  }, [levelResults]);

  /** Profit per level: for the bar chart with green/red coloring */
  const profitPerLevelData = useMemo(() => {
    return levelResults.map((r) => ({
      level: r.level,
      profit: Math.round(r.profit * 100) / 100,
    }));
  }, [levelResults]);

  /** Cumulative profit: running total across levels */
  const cumulativeProfitData = useMemo(() => {
    let cumulative = 0;
    return levelResults.map((r) => {
      cumulative += r.profit;
      return {
        level: r.level,
        cumulative: Math.round(cumulative * 100) / 100,
      };
    });
  }, [levelResults]);

  if (!currentPlayer) {
    return (
      <LoadingSpinner
        message="Loading your profile..."
        submessage="Preparing your stats and history"
      />
    );
  }

  const {
    name,
    currentLevel,
    budget,
    totalRevenue,
    totalCupsSold,
    peakBudget,
    lowestBudget,
    isGameOver,
  } = currentPlayer;

  const levelProgress = Math.min(((currentLevel - 1) / 50) * 100, 100);

  // Compute max absolute profit across levels for the performance chart scaling
  const maxAbsProfit =
    levelResults.length > 0
      ? Math.max(...levelResults.map((r) => Math.abs(r.profit)), 1)
      : 1;

  // Average profit per level
  const avgProfitPerLevel =
    completedLevels.length > 0
      ? Math.round((totalProfit / completedLevels.length) * 100) / 100
      : 0;

  // Best and worst levels
  const bestLevel = levelResults.length > 0
    ? levelResults.reduce((best, r) => (r.profit > best.profit ? r : best), levelResults[0]!)
    : null;
  const worstLevel = levelResults.length > 0
    ? levelResults.reduce((worst, r) => (r.profit < worst.profit ? r : worst), levelResults[0]!)
    : null;

  // Loan summary stats
  const loansRepaid = loanHistory.filter((l) => l.status === "repaid").length;
  const loansDefaulted = loanHistory.filter((l) => l.status === "defaulted").length;
  const totalLoansAccepted = loanHistory.length + (activeLoan ? 1 : 0);

  return (
    <div className="space-y-6">
      {/* Player header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <User className="h-6 w-6 text-amber-500" />
            {name}
          </h1>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            {currentGameRoom && (
              <Badge variant="outline" className="text-xs">
                Room: {currentGameRoom.id}
              </Badge>
            )}
            <Badge variant="secondary" className="text-xs">
              Level {currentLevel > 50 ? 50 : currentLevel}/50
            </Badge>
            {isGameOver && (
              <Badge variant="destructive" className="text-xs">
                Game Over
              </Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to="/loans">
              <Banknote className="h-4 w-4 mr-1" />
              Loans
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to="/leaderboard">
              <BarChart3 className="h-4 w-4 mr-1" />
              Leaderboard
            </Link>
          </Button>
        </div>
      </div>

      {/* Level progress */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">
              Level Progress
            </span>
            <span className="text-sm font-bold tabular-nums">
              {completedLevels.length}
              <span className="text-muted-foreground font-normal">/50 completed</span>
            </span>
          </div>
          <Progress value={levelProgress} className="h-3" />
        </CardContent>
      </Card>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <StatCard
          label="Current Budget"
          value={formatBudget(budget)}
          icon={DollarSign}
          colorClass={getBudgetColorClass(budget)}
        />
        <StatCard
          label="Total Profit"
          value={formatBudget(totalProfit)}
          icon={totalProfit >= 0 ? TrendingUp : TrendingDown}
          colorClass={totalProfit >= 0 ? "text-emerald-600" : "text-red-500"}
        />
        <StatCard
          label="Total Revenue"
          value={formatBudget(totalRevenue)}
          icon={DollarSign}
        />
        <StatCard
          label="Total Cups Sold"
          value={totalCupsSold.toLocaleString()}
          icon={CupSoda}
          subtext={
            completedLevels.length > 0
              ? `${Math.round(totalCupsSold / completedLevels.length)} avg/level`
              : undefined
          }
        />
        <StatCard
          label="Peak Budget"
          value={formatBudget(peakBudget)}
          icon={ArrowUpRight}
          colorClass="text-emerald-600"
        />
        <StatCard
          label="Lowest Budget"
          value={formatBudget(lowestBudget)}
          icon={ArrowDownRight}
          colorClass={lowestBudget < 50 ? "text-red-500" : "text-amber-500"}
        />
        <StatCard
          label="Avg Profit/Level"
          value={formatBudget(avgProfitPerLevel)}
          icon={avgProfitPerLevel >= 0 ? TrendingUp : TrendingDown}
          colorClass={avgProfitPerLevel >= 0 ? "text-emerald-600" : "text-red-500"}
          subtext={completedLevels.length > 0 ? `across ${completedLevels.length} levels` : undefined}
        />
      </div>

      {/* Best & Worst Levels + Decision Patterns */}
      {levelResults.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Best & Worst */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Best & Worst Levels</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {bestLevel && (
                <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50/50 p-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Best</p>
                    <p className="text-sm font-medium">Level {bestLevel.level}: {bestLevel.scenario}</p>
                  </div>
                  <span className="text-sm font-bold text-emerald-600 tabular-nums">
                    +{formatBudget(bestLevel.profit)}
                  </span>
                </div>
              )}
              {worstLevel && (
                <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50/50 p-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Worst</p>
                    <p className="text-sm font-medium">Level {worstLevel.level}: {worstLevel.scenario}</p>
                  </div>
                  <span className={cn(
                    "text-sm font-bold tabular-nums",
                    worstLevel.profit >= 0 ? "text-emerald-600" : "text-red-500"
                  )}>
                    {worstLevel.profit >= 0 ? "+" : ""}{formatBudget(worstLevel.profit)}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Decision Patterns */}
          {avgDecisions && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Decision Patterns</CardTitle>
                <CardDescription>Your average decisions across all levels</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Avg Price</span>
                  <span className="text-sm font-bold tabular-nums">${avgDecisions.price.toFixed(2)}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Avg Quality</span>
                  <span className="text-sm font-bold tabular-nums">{avgDecisions.quality.toFixed(1)}/5</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Avg Marketing</span>
                  <span className="text-sm font-bold tabular-nums">${avgDecisions.marketing.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Performance chart (CSS bar chart) */}
      {levelResults.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-amber-500" />
              Level Performance
            </CardTitle>
            <CardDescription>
              Profit/loss per level. Green bars indicate profit, red bars indicate
              loss.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="w-full">
              <div className="flex items-end gap-1 min-w-[300px] sm:min-w-[600px] h-40 pt-4">
                {levelResults.map((result) => {
                  const isProfit = result.profit >= 0;
                  const heightPercent =
                    (Math.abs(result.profit) / maxAbsProfit) * 100;
                  const barHeight = Math.max(heightPercent * 0.8, 2); // min 2% height so the bar is visible

                  return (
                    <div
                      key={result.level}
                      className="flex-1 flex flex-col items-center justify-end h-full group relative"
                    >
                      {/* Tooltip on hover */}
                      <div className="absolute bottom-full mb-1 hidden group-hover:block z-10 whitespace-nowrap rounded bg-popover px-2 py-1 text-xs shadow-md border">
                        <p className="font-medium">Level {result.level}</p>
                        <p className={isProfit ? "text-emerald-600" : "text-red-500"}>
                          {isProfit ? "+" : ""}
                          {formatBudget(result.profit)}
                        </p>
                      </div>
                      {/* Bar */}
                      <div
                        className={cn(
                          "w-full rounded-t-sm transition-all",
                          isProfit
                            ? "bg-emerald-500/80"
                            : "bg-red-500/80"
                        )}
                        style={{ height: `${barHeight}%` }}
                      />
                      {/* Level label (shown every 5th or if few levels) */}
                      {(result.level % 5 === 0 ||
                        levelResults.length <= 10) && (
                        <span className="text-[9px] text-muted-foreground mt-1 tabular-nums">
                          {result.level}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Performance Charts (recharts) */}
      {levelResults.length > 0 ? (
        <div className="space-y-6">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <LineChartIcon className="h-5 w-5 text-amber-500" />
            Performance Charts
          </h2>

          {/* Budget Over Time (Line Chart) */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Budget Over Time</CardTitle>
              <CardDescription>
                Track how your budget has changed across levels.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200} aria-label="Budget over time line chart">
                <LineChart data={budgetOverTimeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="level"
                    tick={{ fontSize: 11 }}
                    label={{
                      value: "Level",
                      position: "insideBottomRight",
                      offset: -5,
                      fontSize: 11,
                    }}
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v: number) => `$${v}`}
                  />
                  <Tooltip
                    formatter={(value: number) => [
                      `$${value.toFixed(2)}`,
                      "Budget",
                    ]}
                    labelFormatter={(label: number) =>
                      label === 0 ? "Start" : `Level ${label}`
                    }
                  />
                  <Line
                    type="monotone"
                    dataKey="budget"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    dot={{ r: 3, fill: "#f59e0b" }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Profit Per Level (Bar Chart) */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Profit Per Level</CardTitle>
              <CardDescription>
                Green bars indicate profit, red bars indicate loss.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200} aria-label="Profit per level bar chart">
                <BarChart data={profitPerLevelData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="level"
                    tick={{ fontSize: 11 }}
                    label={{
                      value: "Level",
                      position: "insideBottomRight",
                      offset: -5,
                      fontSize: 11,
                    }}
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v: number) => `$${v}`}
                  />
                  <Tooltip
                    formatter={(value: number) => [
                      `$${value.toFixed(2)}`,
                      "Profit",
                    ]}
                    labelFormatter={(label: number) => `Level ${label}`}
                  />
                  <Bar dataKey="profit" radius={[2, 2, 0, 0]}>
                    {profitPerLevelData.map((entry, index) => (
                      <Cell
                        key={`bar-${index}`}
                        fill={entry.profit >= 0 ? "#10b981" : "#ef4444"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Cumulative Profit (Area Chart) */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Cumulative Profit</CardTitle>
              <CardDescription>
                Running total of profit across all completed levels.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200} aria-label="Cumulative profit area chart">
                <AreaChart data={cumulativeProfitData}>
                  <defs>
                    <linearGradient
                      id="cumulativeGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                      <stop
                        offset="95%"
                        stopColor="#f59e0b"
                        stopOpacity={0.05}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="level"
                    tick={{ fontSize: 11 }}
                    label={{
                      value: "Level",
                      position: "insideBottomRight",
                      offset: -5,
                      fontSize: 11,
                    }}
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v: number) => `$${v}`}
                  />
                  <Tooltip
                    formatter={(value: number) => [
                      `$${value.toFixed(2)}`,
                      "Cumulative Profit",
                    ]}
                    labelFormatter={(label: number) => `Level ${label}`}
                  />
                  <Area
                    type="monotone"
                    dataKey="cumulative"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    fill="url(#cumulativeGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <LineChartIcon className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p>Play some levels to see your charts!</p>
          </CardContent>
        </Card>
      )}

      {/* Active loan */}
      {activeLoan && (
        <Card className="border-amber-200 bg-amber-50/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Banknote className="h-4 w-4 text-amber-600" />
              Active Loan
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Received</p>
                <p className="font-bold">{formatBudget(activeLoan.amount)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Remaining</p>
                <p className="font-bold text-amber-600">
                  {formatBudget(activeLoan.remainingBalance)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Per Level</p>
                <p className="font-bold">
                  -{formatBudget(activeLoan.repaymentPerLevel)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Levels Left</p>
                <p className="font-bold">{activeLoan.levelsRemaining}</p>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                <span>Repayment progress</span>
                <span>
                  {formatBudget(activeLoan.totalRepayment - activeLoan.remainingBalance)} /{" "}
                  {formatBudget(activeLoan.totalRepayment)}
                </span>
              </div>
              <Progress
                value={
                  activeLoan.totalRepayment > 0
                    ? ((activeLoan.totalRepayment - activeLoan.remainingBalance) /
                        activeLoan.totalRepayment) *
                      100
                    : 0
                }
                className="h-2"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loan history summary */}
      {totalLoansAccepted > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Banknote className="h-4 w-4" />
              Loan Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3 text-sm">
              <Badge variant="outline" className="gap-1 py-1">
                Total accepted: {totalLoansAccepted}
              </Badge>
              {loansRepaid > 0 && (
                <Badge
                  variant="secondary"
                  className="gap-1 py-1 bg-emerald-100 text-emerald-700"
                >
                  Repaid: {loansRepaid}
                </Badge>
              )}
              {loansDefaulted > 0 && (
                <Badge variant="destructive" className="gap-1 py-1">
                  Defaulted: {loansDefaulted}
                </Badge>
              )}
              {activeLoan && (
                <Badge
                  variant="secondary"
                  className="gap-1 py-1 bg-amber-100 text-amber-700"
                >
                  <AlertTriangle className="h-3 w-3" />
                  1 active
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Level results history */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <History className="h-4 w-4 text-amber-500" />
            Level History
          </CardTitle>
          <CardDescription>
            {levelResults.length === 0
              ? "Complete levels to see your history here."
              : `${levelResults.length} level${levelResults.length !== 1 ? "s" : ""} completed`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {levelResults.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <Layers className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p>No levels completed yet. Head to Play Level to get started!</p>
            </div>
          ) : (
            <ScrollArea className="max-h-80">
              <div className="space-y-2">
                {[...levelResults].reverse().map((result) => {
                  const isProfit = result.profit >= 0;
                  return (
                    <div
                      key={result.level}
                      className="flex items-center justify-between rounded-lg border p-3 text-sm"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">
                            Lvl {result.level}
                          </Badge>
                          <span className="font-medium truncate">
                            {result.scenario}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span>{result.cupsSold} cups</span>
                          <span>{formatBudget(result.revenue)} rev</span>
                          {result.loanRepaymentDeducted > 0 && (
                            <span className="text-amber-600">
                              -{formatBudget(result.loanRepaymentDeducted)} loan
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-3">
                        <p
                          className={cn(
                            "font-bold tabular-nums",
                            isProfit ? "text-emerald-600" : "text-red-500"
                          )}
                        >
                          {isProfit ? "+" : ""}
                          {formatBudget(result.profit)}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          Budget: {formatBudget(result.budgetAfter)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
