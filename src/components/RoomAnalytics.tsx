import { useMemo } from "react";
import {
  Users,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Target,
  BarChart3,
  Activity,
  Zap,
  Clock,
  Award,
  CreditCard,
  ShoppingCart,
  Percent,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Player } from "@/store/game-store";
import { formatBudget } from "@/components/layout/DesktopSidebar";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RoomAnalyticsProps {
  players: Player[];
  campDay: number;
  realtimeStatus: "disconnected" | "connected" | "reconnecting";
}

interface AnalyticsSummary {
  totalPlayers: number;
  activePlayers: number;
  gameOverPlayers: number;
  avgLevel: number;
  avgBudget: number;
  avgProfit: number;
  avgRevenue: number;
  totalCupsSold: number;
  avgCupsPerPlayer: number;
  completionRate: number;
  playersWithLoans: number;
  totalLoanAmount: number;
  avgPriceDecision: number;
  avgQualityDecision: number;
  avgMarketingDecision: number;
  peakBudget: { player: string; value: number } | null;
  lowestBudget: { player: string; value: number } | null;
  topPerformer: { player: string; profit: number } | null;
  mostImproved: { player: string; gain: number } | null;
  todayActiveCount: number;
  levelsPlayedToday: number;
}

// ---------------------------------------------------------------------------
// Analytics Calculation
// ---------------------------------------------------------------------------

function calculateAnalytics(
  players: Player[],
  campDay: number
): AnalyticsSummary {
  if (players.length === 0) {
    return {
      totalPlayers: 0,
      activePlayers: 0,
      gameOverPlayers: 0,
      avgLevel: 0,
      avgBudget: 0,
      avgProfit: 0,
      avgRevenue: 0,
      totalCupsSold: 0,
      avgCupsPerPlayer: 0,
      completionRate: 0,
      playersWithLoans: 0,
      totalLoanAmount: 0,
      avgPriceDecision: 0,
      avgQualityDecision: 0,
      avgMarketingDecision: 0,
      peakBudget: null,
      lowestBudget: null,
      topPerformer: null,
      mostImproved: null,
      todayActiveCount: 0,
      levelsPlayedToday: 0,
    };
  }

  const totalPlayers = players.length;
  const activePlayers = players.filter((p) => !p.isGameOver);
  const gameOverPlayers = players.filter((p) => p.isGameOver);

  // Today's level range
  const todayFirst = (campDay - 1) * 10 + 1;
  const todayLast = campDay * 10;

  // Calculate today's progress
  let todayActiveCount = 0;
  let levelsPlayedToday = 0;
  for (const p of players) {
    const todayLevels = p.completedLevels.filter(
      (l) => l >= todayFirst && l <= todayLast
    );
    if (todayLevels.length > 0) {
      todayActiveCount++;
      levelsPlayedToday += todayLevels.length;
    }
  }

  // Aggregate metrics
  const avgLevel =
    players.reduce((sum, p) => sum + p.completedLevels.length, 0) / totalPlayers;
  const avgBudget =
    activePlayers.length > 0
      ? activePlayers.reduce((sum, p) => sum + p.budget, 0) / activePlayers.length
      : 0;
  const avgProfit =
    players.reduce((sum, p) => sum + p.totalProfit, 0) / totalPlayers;
  const avgRevenue =
    players.reduce((sum, p) => sum + p.totalRevenue, 0) / totalPlayers;
  const totalCupsSold = players.reduce((sum, p) => sum + p.totalCupsSold, 0);
  const avgCupsPerPlayer = totalCupsSold / totalPlayers;

  // Completion rate
  const totalPossibleLevels = totalPlayers * 50;
  const totalCompletedLevels = players.reduce(
    (sum, p) => sum + p.completedLevels.length,
    0
  );
  const completionRate =
    totalPossibleLevels > 0
      ? (totalCompletedLevels / totalPossibleLevels) * 100
      : 0;

  // Loan analytics
  const playersWithLoans = players.filter((p) => p.activeLoan !== null).length;
  const totalLoanAmount = players.reduce((sum, p) => {
    if (p.activeLoan) {
      return sum + p.activeLoan.remainingBalance;
    }
    return sum;
  }, 0);

  // Decision pattern analysis (from all level results)
  let totalDecisions = 0;
  let sumPrice = 0;
  let sumQuality = 0;
  let sumMarketing = 0;

  for (const player of players) {
    for (const result of player.levelResults) {
      sumPrice += result.decisions.price;
      sumQuality += result.decisions.quality;
      sumMarketing += result.decisions.marketing;
      totalDecisions++;
    }
  }

  const avgPriceDecision = totalDecisions > 0 ? sumPrice / totalDecisions : 0;
  const avgQualityDecision = totalDecisions > 0 ? sumQuality / totalDecisions : 0;
  const avgMarketingDecision = totalDecisions > 0 ? sumMarketing / totalDecisions : 0;

  // Find extremes
  let peakBudget: { player: string; value: number } | null = null;
  let lowestBudget: { player: string; value: number } | null = null;
  let topPerformer: { player: string; profit: number } | null = null;

  for (const p of players) {
    if (!peakBudget || p.peakBudget > peakBudget.value) {
      peakBudget = { player: p.name, value: p.peakBudget };
    }
    if (!lowestBudget || p.lowestBudget < lowestBudget.value) {
      lowestBudget = { player: p.name, value: p.lowestBudget };
    }
    if (!topPerformer || p.totalProfit > topPerformer.profit) {
      topPerformer = { player: p.name, profit: p.totalProfit };
    }
  }

  // Most improved: player with largest budget gain from start ($500)
  let mostImproved: { player: string; gain: number } | null = null;
  for (const p of activePlayers) {
    const gain = p.budget - 500; // Starting budget is $500
    if (!mostImproved || gain > mostImproved.gain) {
      mostImproved = { player: p.name, gain };
    }
  }

  return {
    totalPlayers,
    activePlayers: activePlayers.length,
    gameOverPlayers: gameOverPlayers.length,
    avgLevel,
    avgBudget,
    avgProfit,
    avgRevenue,
    totalCupsSold,
    avgCupsPerPlayer,
    completionRate,
    playersWithLoans,
    totalLoanAmount,
    avgPriceDecision,
    avgQualityDecision,
    avgMarketingDecision,
    peakBudget,
    lowestBudget,
    topPerformer,
    mostImproved,
    todayActiveCount,
    levelsPlayedToday,
  };
}

// ---------------------------------------------------------------------------
// Level Distribution Component
// ---------------------------------------------------------------------------

function LevelDistribution({ players }: { players: Player[] }) {
  const distribution = useMemo(() => {
    const buckets = [
      { label: "1-10", count: 0 },
      { label: "11-20", count: 0 },
      { label: "21-30", count: 0 },
      { label: "31-40", count: 0 },
      { label: "41-50", count: 0 },
    ];

    for (const p of players) {
      const level = p.currentLevel;
      if (level <= 10) buckets[0]!.count++;
      else if (level <= 20) buckets[1]!.count++;
      else if (level <= 30) buckets[2]!.count++;
      else if (level <= 40) buckets[3]!.count++;
      else buckets[4]!.count++;
    }

    const max = Math.max(...buckets.map((b) => b.count), 1);
    return buckets.map((b) => ({ ...b, percent: (b.count / max) * 100 }));
  }, [players]);

  if (players.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        No player data yet
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {distribution.map((bucket) => (
        <div key={bucket.label} className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground w-12">
            L{bucket.label}
          </span>
          <div className="flex-1 h-5 bg-muted rounded-sm overflow-hidden">
            <div
              className="h-full bg-amber-400 transition-all duration-500"
              style={{ width: `${bucket.percent}%` }}
            />
          </div>
          <span className="text-xs font-medium tabular-nums w-8 text-right">
            {bucket.count}
          </span>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Budget Distribution Component
// ---------------------------------------------------------------------------

function BudgetDistribution({ players }: { players: Player[] }) {
  const distribution = useMemo(() => {
    const activePlayers = players.filter((p) => !p.isGameOver);
    const buckets = [
      { label: "$0-100", count: 0, color: "bg-red-400" },
      { label: "$101-300", count: 0, color: "bg-orange-400" },
      { label: "$301-500", count: 0, color: "bg-yellow-400" },
      { label: "$501-800", count: 0, color: "bg-lime-400" },
      { label: "$800+", count: 0, color: "bg-emerald-400" },
    ];

    for (const p of activePlayers) {
      if (p.budget <= 100) buckets[0]!.count++;
      else if (p.budget <= 300) buckets[1]!.count++;
      else if (p.budget <= 500) buckets[2]!.count++;
      else if (p.budget <= 800) buckets[3]!.count++;
      else buckets[4]!.count++;
    }

    const max = Math.max(...buckets.map((b) => b.count), 1);
    return buckets.map((b) => ({ ...b, percent: (b.count / max) * 100 }));
  }, [players]);

  const activePlayers = players.filter((p) => !p.isGameOver);

  if (activePlayers.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        No active players
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {distribution.map((bucket) => (
        <div key={bucket.label} className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground w-16">
            {bucket.label}
          </span>
          <div className="flex-1 h-5 bg-muted rounded-sm overflow-hidden">
            <div
              className={cn("h-full transition-all duration-500", bucket.color)}
              style={{ width: `${bucket.percent}%` }}
            />
          </div>
          <span className="text-xs font-medium tabular-nums w-8 text-right">
            {bucket.count}
          </span>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Decision Patterns Component
// ---------------------------------------------------------------------------

function DecisionPatterns({ analytics }: { analytics: AnalyticsSummary }) {
  const patterns = [
    {
      label: "Avg Price",
      value: `$${analytics.avgPriceDecision.toFixed(2)}`,
      icon: DollarSign,
      analysis:
        analytics.avgPriceDecision > 1.5
          ? "High pricing"
          : analytics.avgPriceDecision < 0.7
          ? "Low pricing"
          : "Moderate pricing",
    },
    {
      label: "Avg Quality",
      value: analytics.avgQualityDecision.toFixed(1),
      icon: Award,
      analysis:
        analytics.avgQualityDecision > 4
          ? "Premium focus"
          : analytics.avgQualityDecision < 2
          ? "Budget focus"
          : "Balanced quality",
    },
    {
      label: "Avg Marketing",
      value: `$${analytics.avgMarketingDecision.toFixed(0)}`,
      icon: Zap,
      analysis:
        analytics.avgMarketingDecision > 20
          ? "Heavy marketing"
          : analytics.avgMarketingDecision < 5
          ? "Light marketing"
          : "Moderate marketing",
    },
  ];

  if (analytics.totalPlayers === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        No decision data yet
      </p>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-3">
      {patterns.map((pattern) => (
        <div
          key={pattern.label}
          className="rounded-lg border bg-card p-3 text-center"
        >
          <div className="flex justify-center mb-1">
            <pattern.icon className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="text-lg font-bold tabular-nums">{pattern.value}</p>
          <p className="text-xs text-muted-foreground">{pattern.label}</p>
          <Badge
            variant="outline"
            className="mt-1 text-[10px] px-1.5 py-0"
          >
            {pattern.analysis}
          </Badge>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function RoomAnalytics({
  players,
  campDay,
  realtimeStatus,
}: RoomAnalyticsProps) {
  const analytics = useMemo(
    () => calculateAnalytics(players, campDay),
    [players, campDay]
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Room Analytics
            </CardTitle>
            <CardDescription>
              Real-time analytics for all players in this room
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {realtimeStatus === "connected" && (
              <Badge variant="outline" className="gap-1.5 text-emerald-600 border-emerald-200">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                Live Data
              </Badge>
            )}
            {realtimeStatus === "reconnecting" && (
              <Badge variant="outline" className="gap-1.5 text-amber-600 border-amber-200">
                <Activity className="h-3 w-3 animate-pulse" />
                Syncing...
              </Badge>
            )}
            {realtimeStatus === "disconnected" && (
              <Badge variant="outline" className="gap-1.5 text-muted-foreground">
                <span className="h-2 w-2 rounded-full bg-gray-400" />
                Offline
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          <MetricCard
            icon={<Users className="h-4 w-4" />}
            value={analytics.totalPlayers}
            label="Total Players"
          />
          <MetricCard
            icon={<Activity className="h-4 w-4" />}
            value={analytics.activePlayers}
            label="Still Active"
            highlight={analytics.gameOverPlayers > 0}
            subtext={`${analytics.gameOverPlayers} game over`}
          />
          <MetricCard
            icon={<Target className="h-4 w-4" />}
            value={analytics.avgLevel.toFixed(1)}
            label="Avg Level"
          />
          <MetricCard
            icon={<DollarSign className="h-4 w-4" />}
            value={formatBudget(analytics.avgBudget)}
            label="Avg Budget"
          />
          <MetricCard
            icon={<TrendingUp className="h-4 w-4" />}
            value={formatBudget(analytics.avgProfit)}
            label="Avg Profit"
          />
          <MetricCard
            icon={<Percent className="h-4 w-4" />}
            value={`${analytics.completionRate.toFixed(1)}%`}
            label="Completion"
          />
        </div>

        {/* Today's Activity */}
        <div className="rounded-lg border bg-amber-50/50 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="h-4 w-4 text-amber-600" />
            <h4 className="font-semibold text-amber-900">
              Today's Activity (Day {campDay})
            </h4>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p className="text-2xl font-bold text-amber-900 tabular-nums">
                {analytics.todayActiveCount}
              </p>
              <p className="text-xs text-amber-700">Players active today</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-900 tabular-nums">
                {analytics.levelsPlayedToday}
              </p>
              <p className="text-xs text-amber-700">Levels played today</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-900 tabular-nums">
                {analytics.totalPlayers > 0
                  ? Math.round(
                      (analytics.todayActiveCount / analytics.totalPlayers) * 100
                    )
                  : 0}
                %
              </p>
              <p className="text-xs text-amber-700">Participation rate</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-900 tabular-nums">
                {analytics.todayActiveCount > 0
                  ? (analytics.levelsPlayedToday / analytics.todayActiveCount).toFixed(
                      1
                    )
                  : 0}
              </p>
              <p className="text-xs text-amber-700">Avg levels per active player</p>
            </div>
          </div>
        </div>

        {/* Distribution Charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-lg border bg-card p-4">
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              Level Distribution
            </h4>
            <LevelDistribution players={players} />
          </div>
          <div className="rounded-lg border bg-card p-4">
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              Budget Distribution
            </h4>
            <BudgetDistribution players={players} />
          </div>
        </div>

        {/* Decision Patterns */}
        <div className="rounded-lg border bg-card p-4">
          <h4 className="font-semibold mb-3 flex items-center gap-2">
            <Zap className="h-4 w-4 text-muted-foreground" />
            Average Decision Patterns
          </h4>
          <DecisionPatterns analytics={analytics} />
        </div>

        {/* Highlights */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <HighlightCard
            icon={<TrendingUp className="h-4 w-4 text-emerald-500" />}
            label="Peak Budget"
            value={analytics.peakBudget ? formatBudget(analytics.peakBudget.value) : "—"}
            subtext={analytics.peakBudget?.player ?? "No data"}
          />
          <HighlightCard
            icon={<TrendingDown className="h-4 w-4 text-red-500" />}
            label="Lowest Budget"
            value={analytics.lowestBudget ? formatBudget(analytics.lowestBudget.value) : "—"}
            subtext={analytics.lowestBudget?.player ?? "No data"}
          />
          <HighlightCard
            icon={<Award className="h-4 w-4 text-amber-500" />}
            label="Top Performer"
            value={analytics.topPerformer ? formatBudget(analytics.topPerformer.profit) : "—"}
            subtext={analytics.topPerformer?.player ?? "No data"}
          />
          <HighlightCard
            icon={<CreditCard className="h-4 w-4 text-blue-500" />}
            label="Active Loans"
            value={String(analytics.playersWithLoans)}
            subtext={`${formatBudget(analytics.totalLoanAmount)} outstanding`}
          />
        </div>

        {/* Additional Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg border bg-card p-3 text-center">
            <ShoppingCart className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
            <p className="text-lg font-bold tabular-nums">
              {analytics.totalCupsSold.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">Total Cups Sold</p>
          </div>
          <div className="rounded-lg border bg-card p-3 text-center">
            <DollarSign className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
            <p className="text-lg font-bold tabular-nums">
              {formatBudget(analytics.avgRevenue)}
            </p>
            <p className="text-xs text-muted-foreground">Avg Revenue</p>
          </div>
          <div className="rounded-lg border bg-card p-3 text-center">
            <ShoppingCart className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
            <p className="text-lg font-bold tabular-nums">
              {Math.round(analytics.avgCupsPerPlayer)}
            </p>
            <p className="text-xs text-muted-foreground">Avg Cups/Player</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Helper Components
// ---------------------------------------------------------------------------

function MetricCard({
  icon,
  value,
  label,
  highlight = false,
  subtext,
}: {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  highlight?: boolean;
  subtext?: string;
}) {
  return (
    <div className="rounded-lg border bg-card p-3 text-center">
      <div className="flex justify-center mb-1 text-muted-foreground">{icon}</div>
      <p className="text-xl font-bold tabular-nums leading-tight">{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
      {subtext && (
        <p
          className={cn(
            "text-[10px] mt-0.5",
            highlight ? "text-red-500" : "text-muted-foreground"
          )}
        >
          {subtext}
        </p>
      )}
    </div>
  );
}

function HighlightCard({
  icon,
  label,
  value,
  subtext,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtext: string;
}) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className="text-lg font-bold tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground truncate" title={subtext}>
        {subtext}
      </p>
    </div>
  );
}

export default RoomAnalytics;
