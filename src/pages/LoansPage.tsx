/**
 * LoansPage - Loan management dashboard showing active loan, history,
 * upcoming loan offers, and educational content about the loan system.
 *
 * Data sources:
 *   - Current player's activeLoan and loanHistory from the game store
 *   - LEVEL_SCENARIOS / LOAN_OFFERS for upcoming offer schedule
 *
 * Route: /loans
 */

import { Link } from "react-router-dom";
import {
  Banknote,
  CalendarClock,
  CheckCircle2,
  XCircle,
  Clock,
  DollarSign,
  Info,
  ArrowRight,
  ShieldAlert,
  GraduationCap,
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
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import { useGameStore } from "@/store/game-store";
import { LEVEL_SCENARIOS, LOAN_OFFERS, hasLoanOffer } from "@/data/scenarios";
import { formatBudget } from "@/components/layout/DesktopSidebar";

/** Levels where loan offers are available, derived via hasLoanOffer utility */
const LOAN_LEVELS = Array.from({ length: 50 }, (_, i) => i + 1)
  .filter(hasLoanOffer);

export default function LoansPage() {
  const currentPlayer = useGameStore((s) => s.currentPlayer);

  // No player selected: show a prompt
  if (!currentPlayer) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Banknote className="h-16 w-16 text-muted-foreground/30 mb-6" />
        <h1 className="text-2xl font-bold text-foreground mb-2">Loan Center</h1>
        <p className="text-muted-foreground mb-6 max-w-md">
          Join a game and select your player to view loan information and
          manage your business financing.
        </p>
        <Button
          asChild
          className="bg-gradient-to-r from-yellow-500 to-amber-500 text-yellow-950 font-semibold"
        >
          <Link to="/">Join a Game</Link>
        </Button>
      </div>
    );
  }

  const { activeLoan, loanHistory, currentLevel, levelResults } = currentPlayer;

  // Aggregate loan stats
  const totalBorrowed = loanHistory.reduce((sum, l) => sum + l.amount, 0)
    + (activeLoan ? activeLoan.amount : 0);
  const totalInterestCommitted = loanHistory.reduce((sum, l) => sum + (l.totalRepayment - l.amount), 0)
    + (activeLoan ? (activeLoan.totalRepayment - activeLoan.amount) : 0);
  const hasAnyLoanActivity = totalBorrowed > 0;

  /**
   * Determine the status of a loan offer at a given level.
   * - "taken": Player accepted a loan at this level (in history or active)
   * - "missed": Level has passed and loan was not accepted
   * - "available": This is the current level
   * - "upcoming": Level has not been reached yet
   */
  const getLoanOfferStatus = (
    level: number
  ): "taken" | "missed" | "available" | "upcoming" => {
    // Check if this loan was taken (in history or currently active)
    const wasTaken =
      loanHistory.some((l) => l.acceptedAtLevel === level) ||
      (activeLoan != null && activeLoan.acceptedAtLevel === level);
    if (wasTaken) return "taken";

    if (level < currentLevel) return "missed";
    if (level === currentLevel) return "available";
    return "upcoming";
  };

  /**
   * Calculate the ROI for a completed (repaid) loan.
   * ROI = (profit earned during loan period) - (interest paid)
   */
  const calculateLoanROI = (loan: (typeof loanHistory)[0]) => {
    const profitDuringLoan = levelResults
      .filter(
        (r) => r.level >= loan.acceptedAtLevel && r.level <= loan.settledAtLevel
      )
      .reduce((sum, r) => sum + r.profit, 0);
    const interestPaid = loan.totalRepayment - loan.amount;
    return Math.round((profitDuringLoan - interestPaid) * 100) / 100;
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Banknote className="h-6 w-6 text-amber-500" />
          Loan Center
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your business financing and view loan history
        </p>
      </div>

      {/* Aggregate loan summary */}
      {hasAnyLoanActivity && (
        <div className="grid grid-cols-3 gap-3">
          <Card className="p-3 text-center">
            <p className="text-xs text-muted-foreground">Total Borrowed</p>
            <p className="text-lg font-bold tabular-nums text-foreground">
              {formatBudget(totalBorrowed)}
            </p>
          </Card>
          <Card className="p-3 text-center">
            <p className="text-xs text-muted-foreground">Total Interest</p>
            <p className="text-lg font-bold tabular-nums text-red-500">
              {formatBudget(totalInterestCommitted)}
            </p>
          </Card>
          <Card className="p-3 text-center">
            <p className="text-xs text-muted-foreground">Net Loan Impact</p>
            <p className={cn(
              "text-lg font-bold tabular-nums",
              totalBorrowed - totalInterestCommitted >= 0 ? "text-emerald-600" : "text-red-500"
            )}>
              {totalBorrowed - totalInterestCommitted >= 0 ? "+" : ""}
              {formatBudget(totalBorrowed - totalInterestCommitted)}
            </p>
          </Card>
        </div>
      )}

      {/* One-loan-at-a-time notice (when player has an active loan) */}
      {activeLoan && (
        <Alert className="border-blue-200 bg-blue-50">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <strong>One loan at a time.</strong> You cannot accept a new loan
            until your current loan is fully repaid. You have{" "}
            {activeLoan.levelsRemaining} repayment level
            {activeLoan.levelsRemaining !== 1 ? "s" : ""} remaining.
          </AlertDescription>
        </Alert>
      )}

      {/* Active loan card */}
      {activeLoan ? (
        <Card className="border-amber-200 bg-gradient-to-br from-amber-50/50 to-yellow-50/30">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-600" />
                Active Loan
              </CardTitle>
              <Badge
                variant="secondary"
                className="bg-amber-100 text-amber-700"
              >
                In Repayment
              </Badge>
            </div>
            <CardDescription>
              Accepted at Level {activeLoan.acceptedAtLevel}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Loan stats grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Amount Received
                </p>
                <p className="text-lg font-bold text-foreground tabular-nums">
                  {formatBudget(activeLoan.amount)}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Total Owed
                </p>
                <p className="text-lg font-bold text-foreground tabular-nums">
                  {formatBudget(activeLoan.totalRepayment)}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Per Level Deduction
                </p>
                <p className="text-lg font-bold text-red-500 tabular-nums">
                  -{formatBudget(activeLoan.repaymentPerLevel)}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Levels Remaining
                </p>
                <p className="text-lg font-bold text-amber-600 tabular-nums">
                  {activeLoan.levelsRemaining}
                </p>
              </div>
            </div>

            {/* Repayment progress */}
            <div>
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                <span>Repayment Progress</span>
                <span className="tabular-nums">
                  {formatBudget(
                    activeLoan.totalRepayment - activeLoan.remainingBalance
                  )}{" "}
                  / {formatBudget(activeLoan.totalRepayment)}
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
                className="h-3"
              />
              <div className="flex items-center justify-between text-xs text-muted-foreground mt-1.5">
                <span>
                  Remaining balance:{" "}
                  <span className="font-semibold text-foreground">
                    {formatBudget(activeLoan.remainingBalance)}
                  </span>
                </span>
                <span>
                  {activeLoan.levelsRemaining} level
                  {activeLoan.levelsRemaining !== 1 ? "s" : ""} remaining
                  &middot; {formatBudget(activeLoan.repaymentPerLevel)}/level
                </span>
              </div>
            </div>

            {/* Interest cost breakdown */}
            <div className="rounded-lg bg-amber-100/50 p-3 text-sm">
              <p className="text-amber-800">
                <strong>Interest cost:</strong>{" "}
                {formatBudget(activeLoan.totalRepayment - activeLoan.amount)} (
                {Math.round(
                  ((activeLoan.totalRepayment - activeLoan.amount) /
                    activeLoan.amount) *
                    100
                )}
                % of principal). This amount is automatically deducted from your
                budget after each level.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            You do not have an active loan. Loan offers appear at specific levels
            during gameplay. Check the schedule below.
          </AlertDescription>
        </Alert>
      )}

      {/* Loan history */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarClock className="h-4 w-4" />
            Loan History
          </CardTitle>
          <CardDescription>
            {loanHistory.length === 0
              ? "No past loans on record"
              : `${loanHistory.length} loan${loanHistory.length !== 1 ? "s" : ""} on record`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loanHistory.length === 0 ? (
            <div className="py-6 text-center text-muted-foreground">
              <Banknote className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p>No loan history yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Level</TableHead>
                  <TableHead className="text-right">Received</TableHead>
                  <TableHead className="text-right">Total Repaid</TableHead>
                  <TableHead className="text-right">Interest</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loanHistory.map((loan, index) => {
                  const interest = loan.totalRepayment - loan.amount;
                  const isRepaid = loan.status === "repaid";
                  return (
                    <TableRow key={`${loan.acceptedAtLevel}-${index}`}>
                      <TableCell>
                        <span className="font-medium">
                          Lvl {loan.acceptedAtLevel}
                        </span>
                        <span className="text-xs text-muted-foreground ml-1">
                          - {loan.settledAtLevel}
                        </span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatBudget(loan.amount)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatBudget(loan.totalRepayment)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {formatBudget(interest)}
                      </TableCell>
                      <TableCell className="text-center">
                        {isRepaid ? (
                          <Badge
                            variant="secondary"
                            className="gap-1 bg-emerald-100 text-emerald-700"
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            Repaid
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="gap-1">
                            <XCircle className="h-3 w-3" />
                            Defaulted
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Loan ROI Analysis (for completed/repaid loans) */}
      {loanHistory.filter((l) => l.status === "repaid").length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-emerald-500" />
              Loan ROI Analysis
            </CardTitle>
            <CardDescription>
              Return on investment for your completed loans
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Loan</TableHead>
                    <TableHead className="text-right">Received</TableHead>
                    <TableHead className="text-right">Interest Paid</TableHead>
                    <TableHead className="text-right">
                      Profit During Loan
                    </TableHead>
                    <TableHead className="text-right">Net ROI</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loanHistory
                    .filter((l) => l.status === "repaid")
                    .map((loan, index) => {
                      const interestPaid = loan.totalRepayment - loan.amount;
                      const profitDuringLoan = currentPlayer.levelResults
                        .filter(
                          (r) =>
                            r.level >= loan.acceptedAtLevel &&
                            r.level <= loan.settledAtLevel
                        )
                        .reduce((sum, r) => sum + r.profit, 0);
                      const roi = calculateLoanROI(loan);
                      const isPositiveROI = roi >= 0;

                      return (
                        <TableRow key={`roi-${loan.acceptedAtLevel}-${index}`}>
                          <TableCell>
                            <span className="font-medium">
                              Lvl {loan.acceptedAtLevel} - {loan.settledAtLevel}
                            </span>
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatBudget(loan.amount)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-red-500">
                            -{formatBudget(interestPaid)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatBudget(
                              Math.round(profitDuringLoan * 100) / 100
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <span
                              className={cn(
                                "font-bold tabular-nums",
                                isPositiveROI
                                  ? "text-emerald-600"
                                  : "text-red-500"
                              )}
                            >
                              {isPositiveROI ? "+" : ""}
                              {formatBudget(roi)}
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              ROI is calculated as: (total profit earned during loan period) -
              (interest paid). A positive ROI means the loan helped grow your
              business.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Upcoming loan offers */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-amber-500" />
            Loan Offer Schedule
          </CardTitle>
          <CardDescription>
            Loan offers are available at levels{" "}
            {LOAN_LEVELS.join(", ")}. You can only have one active loan
            at a time.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {LOAN_LEVELS.map((level) => {
              const offer = LOAN_OFFERS[level];
              if (!offer) return null;
              const status = getLoanOfferStatus(level);
              const scenario = LEVEL_SCENARIOS[level - 1];
              const interest = offer.totalRepayment - offer.amount;
              const interestRate = Math.round(
                (interest / offer.amount) * 100
              );

              return (
                <div
                  key={level}
                  className={cn(
                    "flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg border p-3 transition-colors",
                    status === "available" && "border-amber-300 bg-amber-50/50",
                    status === "taken" && "border-emerald-200 bg-emerald-50/30",
                    (status === "missed" || status === "upcoming") && "opacity-60"
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Badge
                      variant={status === "available" ? "default" : "outline"}
                      className={cn(
                        "shrink-0",
                        status === "available" &&
                          "bg-gradient-to-r from-yellow-500 to-amber-500 text-yellow-950"
                      )}
                    >
                      Lvl {level}
                    </Badge>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {scenario?.title ?? `Level ${level}`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Day {scenario?.day ?? Math.ceil(level / 10)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm shrink-0">
                    <div className="text-right">
                      <p className="font-bold tabular-nums text-foreground">
                        {formatBudget(offer.amount)}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        receive
                      </p>
                    </div>
                    <ArrowRight className="h-3 w-3 text-muted-foreground hidden sm:block" />
                    <div className="text-right">
                      <p className="font-bold tabular-nums text-foreground">
                        {formatBudget(offer.totalRepayment)}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        repay ({interestRate}% interest)
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold tabular-nums text-muted-foreground">
                        -{formatBudget(offer.repaymentPerLevel)}/lvl
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        for {offer.durationLevels} levels
                      </p>
                    </div>
                    {status === "taken" && (
                      <Badge
                        variant="secondary"
                        className="gap-1 bg-emerald-100 text-emerald-700 text-[10px]"
                      >
                        <CheckCircle2 className="h-3 w-3" />
                        Taken
                      </Badge>
                    )}
                    {status === "missed" && (
                      <Badge
                        variant="outline"
                        className="gap-1 text-[10px] text-muted-foreground"
                      >
                        <XCircle className="h-3 w-3" />
                        Missed
                      </Badge>
                    )}
                    {status === "available" && (
                      <Badge
                        variant="secondary"
                        className="bg-amber-100 text-amber-700 text-[10px]"
                      >
                        Available Now
                      </Badge>
                    )}
                    {status === "upcoming" && (
                      <Badge variant="outline" className="text-[10px]">
                        <Clock className="h-3 w-3 mr-0.5" />
                        Upcoming
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Educational section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-amber-500" />
            Understanding Loans
          </CardTitle>
          <CardDescription>
            Learn how loans work in the Lemonade Stand Business Game
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="multiple" className="w-full">
            <AccordionItem value="what-are-loans">
              <AccordionTrigger className="text-sm font-medium">
                What are loans and when are they offered?
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground space-y-2">
                <p>
                  Loans are optional cash injections offered at specific levels
                  during the game: levels {LOAN_LEVELS.join(", ")}. When you
                  reach one of these levels, you will see a loan offer before
                  making your business decisions.
                </p>
                <p>
                  You can choose to accept or decline each offer. You can only
                  have one active loan at a time, so if you already have an
                  unpaid loan, you cannot take a new one.
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="how-repayment-works">
              <AccordionTrigger className="text-sm font-medium">
                How does repayment work?
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground space-y-2">
                <p>
                  When you accept a loan, the full loan amount is added to your
                  budget immediately. Starting from the next level, a fixed
                  repayment amount is automatically deducted from your budget
                  after each level's simulation completes.
                </p>
                <p>
                  This deduction happens whether you make a profit or a loss on
                  that level. It continues for the specified number of levels
                  until the full repayment amount (principal + interest) is paid
                  off.
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="interest-explained">
              <AccordionTrigger className="text-sm font-medium">
                How does interest work?
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground space-y-2">
                <p>
                  Every loan comes with interest, meaning you repay more than
                  you received. For example, a $100 loan with 20% interest means
                  you must repay $120 in total.
                </p>
                <p>
                  Interest rates vary between 7% and 20% depending on the loan.
                  Generally, larger loans later in the game have lower interest
                  rates because you have proven yourself as a more experienced
                  business operator.
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="risks">
              <AccordionTrigger className="text-sm font-medium">
                What are the risks of taking a loan?
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground space-y-2">
                <div className="rounded-lg bg-red-50 border border-red-200 p-3 mb-2">
                  <p className="flex items-start gap-2 text-red-700">
                    <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>
                      <strong>Budget risk:</strong> The per-level repayment reduces
                      your operating budget every round. If your budget drops below
                      $20 (the minimum operating budget), your game is over -- even
                      if you still owe money on the loan.
                    </span>
                  </p>
                </div>
                <p>
                  Only take a loan if you are confident you can generate enough
                  profit in the upcoming levels to cover both fixed costs and
                  the loan repayment. A poorly-timed loan can accelerate a
                  downward spiral.
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="strategy-tips">
              <AccordionTrigger className="text-sm font-medium">
                Strategic tips for loans
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground space-y-2">
                <ul className="list-disc pl-4 space-y-1.5">
                  <li>
                    <strong>Take loans when your budget is shrinking</strong> --
                    a cash injection can give you the breathing room to recover
                    with smarter decisions.
                  </li>
                  <li>
                    <strong>Avoid loans when you are already profitable</strong>{" "}
                    -- the interest is a net cost to your total profit. If you
                    do not need the money, declining is usually the better
                    financial choice.
                  </li>
                  <li>
                    <strong>Check the upcoming scenarios</strong> -- if you know
                    high-demand levels are coming (concerts, festivals, heat
                    waves), a loan can help you invest more in marketing and
                    quality for bigger returns.
                  </li>
                  <li>
                    <strong>One loan at a time</strong> -- you cannot stack
                    loans, so use each one wisely before the next opportunity
                    comes.
                  </li>
                </ul>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}
