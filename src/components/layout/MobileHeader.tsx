/**
 * MobileHeader - Top bar rendered on viewports smaller than the `lg` breakpoint (< 1024px).
 *
 * Contains:
 *   - A hamburger button (left) that opens a slide-out navigation drawer (Sheet).
 *   - The game title (centre).
 *   - A budget badge (right) colour-coded by financial health.
 *
 * The slide-out drawer reuses the same navigation items and status section
 * as the DesktopSidebar for consistency.
 */

import { useState } from "react";
import { NavLink } from "react-router-dom";
import { Menu } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useGameStore } from "@/store/game-store";
import {
  NAV_ITEMS,
  getBudgetColorClass,
  formatBudget,
} from "@/components/layout/DesktopSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SyncStatus } from "@/components/SyncStatus";
import { CampCountdown } from "@/components/CampCountdown";

export default function MobileHeader() {
  const [isOpen, setIsOpen] = useState(false);
  const currentPlayer = useGameStore((state) => state.currentPlayer);
  const budget = currentPlayer?.budget ?? 0;
  const currentLevel = currentPlayer?.currentLevel ?? 1;
  const playerName = currentPlayer?.name ?? null;

  /** Close the drawer when a navigation link is tapped. */
  function handleNavClick() {
    setIsOpen(false);
  }

  return (
    <>
      {/* ---- Fixed top bar ---- */}
      <header
        className="lg:hidden fixed top-0 inset-x-0 z-40 flex items-center justify-between h-14 px-4 border-b border-border bg-card/95 backdrop-blur-sm supports-[backdrop-filter]:bg-card/80"
        role="banner"
      >
        {/* Hamburger button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsOpen(true)}
          aria-label="Open navigation menu"
          className="shrink-0"
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Centred title */}
        <div className="flex items-center gap-1.5">
          <span className="text-xl" role="img" aria-label="Lemon">
            🍋
          </span>
          <span className="text-base font-bold tracking-tight text-foreground">
            Lemonade Stand
          </span>
        </div>

        {/* Sync status + budget badge + theme toggle */}
        <div className="flex items-center gap-1.5">
          <SyncStatus />
          <Badge
            variant="outline"
            className={cn(
              "tabular-nums font-bold text-xs border-2 shrink-0",
              budget < 50
                ? "border-red-400 bg-red-50 text-red-600"
                : budget < 100
                  ? "border-amber-400 bg-amber-50 text-amber-600"
                  : "border-emerald-400 bg-emerald-50 text-emerald-700"
            )}
          >
            {formatBudget(budget)}
          </Badge>
          <ThemeToggle />
        </div>
      </header>

      {/* ---- Slide-out navigation drawer ---- */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent side="left" className="w-72 p-0">
          {/* Drawer header */}
          <SheetHeader className="px-6 pt-6 pb-4">
            <SheetTitle className="flex items-center gap-2 text-left">
              <span className="text-2xl" role="img" aria-label="Lemon">
                🍋
              </span>
              <span className="text-lg font-bold">Lemonade Stand</span>
            </SheetTitle>
            <SheetDescription className="sr-only">
              Game navigation and player status
            </SheetDescription>
          </SheetHeader>

          <Separator />

          {/* Navigation links */}
          <ScrollArea className="flex-1 h-[calc(100vh-280px)]">
            <nav className="flex flex-col gap-1 px-3 py-4" aria-label="Game navigation">
              {NAV_ITEMS.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === "/"}
                  onClick={handleNavClick}
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
                  <item.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </ScrollArea>

          {/* Camp day countdown */}
          <CampCountdown />

          <Separator />

          {/* Status section (mirrors DesktopSidebar) */}
          <div className="px-6 py-4 space-y-3">
            {playerName && (
              <p className="text-xs font-medium text-muted-foreground truncate">
                Playing as{" "}
                <span className="text-foreground font-semibold">
                  {playerName}
                </span>
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

              {/* Progress bar */}
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
        </SheetContent>
      </Sheet>
    </>
  );
}
