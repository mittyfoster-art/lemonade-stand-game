/**
 * HowToPlayPage - Static game instructions and strategy guide.
 *
 * Uses shadcn/ui Accordion for collapsible sections covering:
 *   - Game overview and camp context
 *   - Decision explanations (price, quality, marketing)
 *   - Budget system and game-over rules
 *   - Level unlock schedule across camp days
 *   - Loan system overview
 *   - Scoring and leaderboard info
 *   - Strategic tips
 *
 * This page has no store dependencies -- all content is static.
 *
 * Route: /how-to-play
 */

import {
  HelpCircle,
  DollarSign,
  Star,
  Megaphone,
  Wallet,
  CalendarDays,
  Banknote,
  Trophy,
  Lightbulb,
  Target,
  ShieldAlert,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Alert, AlertDescription } from "@/components/ui/alert";

/**
 * Small icon + text card used in the "Key Decisions" section.
 */
function DecisionInfoCard({
  icon: Icon,
  title,
  range,
  description,
  iconColor,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  range: string;
  description: string;
  iconColor: string;
}) {
  return (
    <Card>
      <CardContent className="pt-4 pb-4 px-4">
        <div className="flex items-start gap-3">
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${iconColor}`}
          >
            <Icon className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="font-semibold text-sm text-foreground">{title}</p>
            <Badge variant="outline" className="mt-1 text-[10px]">
              {range}
            </Badge>
            <p className="text-sm text-muted-foreground mt-1.5">
              {description}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Schedule row for a single camp day showing which levels unlock.
 */
function DayScheduleRow({
  day,
  levels,
  description,
}: {
  day: number;
  levels: string;
  description: string;
}) {
  return (
    <div className="flex items-center gap-4 py-2">
      <Badge
        variant="secondary"
        className="shrink-0 bg-amber-100 text-amber-700 font-bold w-16 justify-center"
      >
        Day {day}
      </Badge>
      <div>
        <p className="text-sm font-medium text-foreground">{levels}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

export default function HowToPlayPage() {
  return (
    <div className="space-y-6">
      {/* Welcome header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <HelpCircle className="h-6 w-6 text-amber-500" />
          How to Play
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Everything you need to know to run a successful lemonade stand
        </p>
      </div>

      {/* Welcome card */}
      <Card className="border-amber-200 bg-gradient-to-br from-yellow-50/60 to-amber-50/40">
        <CardHeader>
          <CardTitle className="text-lg">
            Welcome to TeenPreneurship Camp 2026!
          </CardTitle>
          <CardDescription>
            Lemonade Stand Business Simulation v2.0
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            You are about to run your very own lemonade stand business! Over{" "}
            <strong className="text-foreground">5 camp days</strong>, you will
            play through{" "}
            <strong className="text-foreground">50 unique levels</strong>, each
            presenting a different market scenario set in the Cayman Islands.
          </p>
          <p>
            Every level, you will make three key business decisions: how much to
            charge, what quality to produce, and how much to spend on marketing.
            The market will respond to your decisions, and your lemonade stand
            will either thrive or struggle.
          </p>
          <p>
            Your goal is to finish with the{" "}
            <strong className="text-foreground">highest total profit</strong>{" "}
            among all players in your room. Read the scenarios carefully, think
            strategically, and learn from each level!
          </p>
        </CardContent>
      </Card>

      {/* Accordion sections */}
      <Accordion type="multiple" defaultValue={["decisions"]} className="w-full">
        {/* ---- Key Decisions ---- */}
        <AccordionItem value="decisions">
          <AccordionTrigger className="text-base font-semibold">
            <span className="flex items-center gap-2">
              <Target className="h-4 w-4 text-amber-500" />
              Your Three Key Decisions
            </span>
          </AccordionTrigger>
          <AccordionContent className="space-y-3 pt-2">
            <p className="text-sm text-muted-foreground mb-4">
              Each level, you choose your price, quality, and marketing spend.
              The right combination depends on the scenario -- there is no
              single strategy that works every time.
            </p>
            <div className="grid gap-3 sm:grid-cols-1 md:grid-cols-3">
              <DecisionInfoCard
                icon={DollarSign}
                title="Cup Price"
                range="$0.25 - $2.00"
                description="Lower prices attract more customers but earn less per cup. Higher prices mean bigger margins but fewer buyers. Read the crowd to find the sweet spot."
                iconColor="bg-emerald-500"
              />
              <DecisionInfoCard
                icon={Star}
                title="Quality Level"
                range="1 - 5 stars"
                description="Higher quality costs more per cup to produce ($0.10 to $0.28) but boosts customer satisfaction and demand. Match quality to what the market values."
                iconColor="bg-yellow-500"
              />
              <DecisionInfoCard
                icon={Megaphone}
                title="Marketing Budget"
                range="$0 - $30"
                description="Advertising attracts more customers to your stand. Useful for big events, but wasteful in low-traffic areas. Spend wisely."
                iconColor="bg-blue-500"
              />
            </div>

            {/* Quality cost breakdown */}
            <Card className="bg-muted/30">
              <CardContent className="pt-4 pb-4">
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  Quality Cost Per Cup
                </p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { stars: 1, label: "Basic", cost: "$0.10" },
                    { stars: 2, label: "Good", cost: "$0.12" },
                    { stars: 3, label: "Great", cost: "$0.15" },
                    { stars: 4, label: "Premium", cost: "$0.20" },
                    { stars: 5, label: "Gourmet", cost: "$0.28" },
                  ].map((q) => (
                    <Badge
                      key={q.stars}
                      variant="outline"
                      className="gap-1 py-1 text-xs"
                    >
                      {q.stars}/5 {q.label} = {q.cost}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </AccordionContent>
        </AccordionItem>

        {/* ---- Budget System ---- */}
        <AccordionItem value="budget">
          <AccordionTrigger className="text-base font-semibold">
            <span className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-amber-500" />
              Budget System
            </span>
          </AccordionTrigger>
          <AccordionContent className="space-y-3 pt-2">
            <div className="grid gap-3 sm:grid-cols-3">
              <Card>
                <CardContent className="pt-4 pb-4 text-center">
                  <p className="text-2xl font-bold text-emerald-600">$500</p>
                  <p className="text-xs text-muted-foreground">
                    Starting budget
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-4 text-center">
                  <p className="text-2xl font-bold text-amber-600">$20</p>
                  <p className="text-xs text-muted-foreground">
                    Fixed costs per level
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-4 text-center">
                  <p className="text-2xl font-bold text-red-500">&lt; $20</p>
                  <p className="text-xs text-muted-foreground">Game over!</p>
                </CardContent>
              </Card>
            </div>

            <div className="text-sm text-muted-foreground space-y-2">
              <p>
                Every player starts with <strong>$500</strong>. Each level, you
                pay <strong>$20 in fixed costs</strong> (stand setup, permits,
                and basic supplies) before anything else happens.
              </p>
              <p>
                After that, your profit or loss from selling lemonade is added
                to (or subtracted from) your budget. Any active loan repayment
                is also deducted automatically.
              </p>
            </div>

            <Alert variant="destructive">
              <ShieldAlert className="h-4 w-4" />
              <AlertDescription>
                If your budget falls below <strong>$20</strong> at the end of a
                level, your business closes permanently. You cannot afford the
                fixed costs to continue operating. Choose your decisions
                carefully to avoid going bankrupt!
              </AlertDescription>
            </Alert>
          </AccordionContent>
        </AccordionItem>

        {/* ---- Level Schedule ---- */}
        <AccordionItem value="schedule">
          <AccordionTrigger className="text-base font-semibold">
            <span className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-amber-500" />
              Level Unlock Schedule
            </span>
          </AccordionTrigger>
          <AccordionContent className="space-y-3 pt-2">
            <p className="text-sm text-muted-foreground mb-3">
              New levels unlock each camp day at{" "}
              <strong className="text-foreground">7:00 AM</strong>. You can
              always go back and play levels from previous days if you have not
              finished them.
            </p>
            <Card>
              <CardContent className="pt-4 pb-4 divide-y">
                <DayScheduleRow
                  day={1}
                  levels="Levels 1 - 10"
                  description="Foundations: Learning the basics with clear market signals"
                />
                <DayScheduleRow
                  day={2}
                  levels="Levels 11 - 20"
                  description="Market Dynamics: Mixed signals and first loan offers"
                />
                <DayScheduleRow
                  day={3}
                  levels="Levels 21 - 30"
                  description="Strategic Pressure: Counter-intuitive markets and larger loans"
                />
                <DayScheduleRow
                  day={4}
                  levels="Levels 31 - 40"
                  description="Expert Decisions: High stakes and tight budget pressure"
                />
                <DayScheduleRow
                  day={5}
                  levels="Levels 41 - 50"
                  description="Championship: Final push for the top of the leaderboard"
                />
              </CardContent>
            </Card>
            <p className="text-xs text-muted-foreground">
              Each day introduces progressively harder scenarios. Day 1 has
              clear market signals (low deception), while Day 5 features
              counter-intuitive markets where the obvious choice is often wrong.
            </p>
          </AccordionContent>
        </AccordionItem>

        {/* ---- Loan System ---- */}
        <AccordionItem value="loans">
          <AccordionTrigger className="text-base font-semibold">
            <span className="flex items-center gap-2">
              <Banknote className="h-4 w-4 text-amber-500" />
              Loan System
            </span>
          </AccordionTrigger>
          <AccordionContent className="space-y-3 pt-2">
            <p className="text-sm text-muted-foreground">
              At certain levels (15, 20, 25, 30, 35, and 40), you will be
              offered a business loan. Loans give you an immediate cash boost
              but come with interest -- you repay more than you borrowed.
            </p>
            <div className="text-sm text-muted-foreground space-y-2">
              <p>
                <strong className="text-foreground">How it works:</strong> When
                you accept a loan, the money is added to your budget
                immediately. Starting from the next level, a fixed amount is
                automatically deducted from your budget each level until the
                full repayment (principal + interest) is complete.
              </p>
              <p>
                <strong className="text-foreground">One at a time:</strong> You
                can only have one active loan. If you still owe money on a
                previous loan, you cannot accept a new one.
              </p>
              <p>
                <strong className="text-foreground">Risk:</strong> Loan
                repayments are deducted whether you make a profit or not. If
                your budget drops below $20 due to loan repayments plus losses,
                your game is over.
              </p>
            </div>
            <Alert>
              <Lightbulb className="h-4 w-4" />
              <AlertDescription>
                <strong>Tip:</strong> Loans are most useful when you are
                struggling and need a lifeline, or when you can see big
                earning opportunities coming up. If you are already profitable
                and growing, declining the loan often leads to a higher total
                profit.
              </AlertDescription>
            </Alert>
          </AccordionContent>
        </AccordionItem>

        {/* ---- Scoring ---- */}
        <AccordionItem value="scoring">
          <AccordionTrigger className="text-base font-semibold">
            <span className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-500" />
              Scoring and Rankings
            </span>
          </AccordionTrigger>
          <AccordionContent className="space-y-3 pt-2">
            <p className="text-sm text-muted-foreground">
              Players are ranked on the leaderboard by{" "}
              <strong className="text-foreground">
                cumulative total profit
              </strong>{" "}
              -- the sum of your net profit (revenue minus costs minus loan
              repayments) across all completed levels.
            </p>
            <div className="text-sm text-muted-foreground space-y-2">
              <p>
                <strong className="text-foreground">Tiebreakers:</strong> If two
                players have the same total profit, ties are broken by total
                revenue, then total cups sold, then number of levels completed.
              </p>
              <p>
                <strong className="text-foreground">What counts:</strong> Every
                level counts. A small profit is better than a small loss. Even a
                $1 profit on a tough level adds up over 50 rounds.
              </p>
            </div>
            <Card className="bg-muted/30">
              <CardContent className="pt-4 pb-4">
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  Profit Formula
                </p>
                <div className="space-y-1 text-sm font-mono text-foreground">
                  <p>Revenue = Cups Sold x Price Per Cup</p>
                  <p>
                    Costs = $20 fixed + Marketing + (Cups Sold x Ingredient
                    Cost)
                  </p>
                  <p>Net Profit = Revenue - Costs</p>
                  <p className="text-muted-foreground text-xs">
                    (Loan repayments are deducted separately after profit
                    calculation)
                  </p>
                </div>
              </CardContent>
            </Card>
          </AccordionContent>
        </AccordionItem>

        {/* ---- Scenarios ---- */}
        <AccordionItem value="scenarios">
          <AccordionTrigger className="text-base font-semibold">
            <span className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-500" />
              Understanding Scenarios
            </span>
          </AccordionTrigger>
          <AccordionContent className="space-y-3 pt-2">
            <p className="text-sm text-muted-foreground">
              Every level puts you in a unique market scenario -- a sunny park
              day, a cruise ship port, a rainy afternoon, or a packed concert.
              Each scenario has different customer expectations and conditions.
            </p>
            <div className="text-sm text-muted-foreground space-y-2">
              <p>
                <strong className="text-foreground">Weather effects</strong>{" "}
                influence foot traffic. Hot, sunny days bring more customers.
                Storms and rain drastically reduce traffic.
              </p>
              <p>
                <strong className="text-foreground">Deception levels</strong>{" "}
                indicate how tricky the scenario is. Early levels have "low"
                deception -- what you see is what you get. Later levels may have
                "high" deception -- the obvious strategy might be wrong.
              </p>
              <p>
                <strong className="text-foreground">Hints</strong> are provided
                for each scenario. Pay close attention to them -- they contain
                clues about what the market actually wants.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="gap-1">
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
                Low deception: Clear signals
              </Badge>
              <Badge variant="outline" className="gap-1">
                <span className="inline-block h-2 w-2 rounded-full bg-amber-500" />
                Medium deception: Mixed signals
              </Badge>
              <Badge variant="outline" className="gap-1">
                <span className="inline-block h-2 w-2 rounded-full bg-red-500" />
                High deception: Counter-intuitive
              </Badge>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* ---- Tips ---- */}
        <AccordionItem value="tips">
          <AccordionTrigger className="text-base font-semibold">
            <span className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-amber-500" />
              Strategic Tips
            </span>
          </AccordionTrigger>
          <AccordionContent className="space-y-3 pt-2">
            <div className="grid gap-3 sm:grid-cols-2">
              <Card>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start gap-2">
                    <TrendingUp className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        Read the Scenario First
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Every scenario tells you who your customers are and what
                        they value. A tourist crowd is very different from a
                        group of students. Match your strategy to the audience.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start gap-2">
                    <DollarSign className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        Volume vs. Margin
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Sometimes selling 100 cups at $0.50 beats selling 20
                        cups at $1.50. Figure out whether the scenario rewards
                        high volume or high margins.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start gap-2">
                    <Wallet className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        Watch Your Budget
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Going below $20 ends your game. If your budget is
                        getting low, play it safe -- lower marketing spend and
                        aim for small, reliable profits.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start gap-2">
                    <Star className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        Quality Costs Money
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Higher quality attracts more customers, but each cup
                        costs more to make. Do not go max quality when the
                        market just wants cheap refreshment.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start gap-2">
                    <Megaphone className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        Marketing is Not Always the Answer
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        In low-traffic areas (rainy days, quiet streets), heavy
                        marketing spend is wasted money. Save it for big events
                        and crowded venues.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start gap-2">
                    <Users className="h-4 w-4 text-violet-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        Learn From Others
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Check the leaderboard to see how you compare. If someone
                        is consistently outperforming you, think about what they
                        might be doing differently.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Separator className="my-2" />

            <Alert>
              <Lightbulb className="h-4 w-4" />
              <AlertDescription>
                <strong>The most important lesson:</strong> There is no single
                "best" strategy. The market changes every level. The best
                business owners adapt their decisions to the specific situation
                in front of them. Stay flexible, read the clues, and have fun
                learning!
              </AlertDescription>
            </Alert>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
