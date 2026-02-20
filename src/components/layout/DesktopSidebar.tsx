/**
 * DesktopSidebar - Persistent left navigation panel for desktop viewports (>1024px).
 *
 * Renders the game logo, primary navigation links with active-state highlighting,
 * and a live status section showing the player's budget, level progress, and rank.
 *
 * Budget color coding:
 *   - Green:  >= $100  (healthy)
 *   - Amber:  >= $50 and < $100  (caution)
 *   - Red:    < $50  (danger / near bankruptcy)
 */

import { NavLink } from "react-router-dom";
import {
  Home,
  Play,
  Map,
  Trophy,
  Award,
  User,
  Banknote,
  HelpCircle,
  Settings,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useGameStore } from "@/store/game-store";
import { ThemeToggle } from "@/components/ThemeToggle";
import { CampCountdown } from "@/components/CampCountdown";

/** Navigation route definitions used by both desktop sidebar and mobile drawer. */
export interface NavItem {
  label: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Home", to: "/", icon: Home },
  { label: "Play Level", to: "/play", icon: Play },
  { label: "Level Map", to: "/levels", icon: Map },
  { label: "Leaderboard", to: "/leaderboard", icon: Trophy },
  { label: "Awards", to: "/awards", icon: Award },
  { label: "My Profile", to: "/profile", icon: User },
  { label: "Loans", to: "/loans", icon: Banknote },
  { label: "How to Play", to: "/how-to-play", icon: HelpCircle },
  { label: "Settings", to: "/settings", icon: Settings },
];

/**
 * Returns the Tailwind text-color class based on the player's current budget.
 * Used consistently across sidebar and mobile header.
 */
export function getBudgetColorClass(budget: number): string {
  if (budget < 50) return "text-red-500";
  if (budget < 100) return "text-amber-500";
  return "text-emerald-600";
}

/**
 * Formats a numeric dollar amount as a localized currency string.
 * Examples: 487 -> "$487.00", 1234.5 -> "$1,234.50"
 */
export function formatBudget(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function DesktopSidebar() {
  const currentPlayer = useGameStore((state) => state.currentPlayer);
  const budget = currentPlayer?.budget ?? 0;
  const currentLevel = currentPlayer?.currentLevel ?? 1;
  const playerName = currentPlayer?.name ?? null;

  return (
    <aside
      className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:w-64 lg:border-r lg:border-border lg:bg-card"
      aria-label="Main navigation"
    >
      {/* ---- Logo / Title ---- */}
      <div className="flex items-center gap-2 px-6 py-5">
        <span className="text-3xl" role="img" aria-label="Lemon">
          🍋
        </span>
        <h1 className="text-xl font-bold tracking-tight text-foreground">
          Lemonade Stand
        </h1>
      </div>

      <Separator />

      {/* ---- Navigation links ---- */}
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="flex flex-col gap-1" aria-label="Game navigation">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  "hover:bg-primary/10 hover:text-foreground",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isActive
                    ? "bg-primary/15 text-foreground shadow-sm"
                    : "text-muted-foreground"
                )
              }
            >
              <item.icon
                className={cn("h-5 w-5 shrink-0")}
                aria-hidden="true"
              />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </ScrollArea>

      {/* ---- Camp day countdown ---- */}
      <CampCountdown />

      <Separator />

      {/* ---- Theme toggle ---- */}
      <div className="flex items-center justify-between px-6 py-2">
        <span className="text-xs font-medium text-muted-foreground">Theme</span>
        <ThemeToggle />
      </div>

      <Separator />

      {/* ---- Status section ---- */}
      <div className="px-6 py-4 space-y-3">
        {playerName && (
          <p className="text-xs font-medium text-muted-foreground truncate">
            Playing as{" "}
            <span className="text-foreground font-semibold">{playerName}</span>
          </p>
        )}

        <div className="space-y-2">
          {/* Budget */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              Budget
            </span>
            <span
              className={cn(
                "text-sm font-bold tabular-nums",
                getBudgetColorClass(budget)
              )}
            >
              {formatBudget(budget)}
            </span>
          </div>

          {/* Level */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              Level
            </span>
            <span className="text-sm font-bold tabular-nums text-foreground">
              {currentLevel}
              <span className="text-muted-foreground font-normal">/50</span>
            </span>
          </div>

          {/* Level progress bar */}
          <div
            className="h-2 w-full rounded-full bg-muted overflow-hidden"
            role="progressbar"
            aria-valuenow={Math.min(currentLevel - 1, 50)}
            aria-valuemin={0}
            aria-valuemax={50}
            aria-label={`Level ${Math.min(currentLevel - 1, 50)} of 50 completed`}
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-secondary transition-all duration-500 ease-out"
              style={{ width: `${Math.min(((currentLevel - 1) / 50) * 100, 100)}%` }}
            />
          </div>
        </div>
      </div>
    </aside>
  );
}
