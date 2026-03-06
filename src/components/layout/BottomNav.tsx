/**
 * BottomNav - Fixed bottom tab bar for mobile/tablet viewports (< 1024px).
 *
 * Displays the five most-used navigation destinations as icon+label tabs.
 * Uses React Router's NavLink with `end` matching on the home route to
 * provide clear active-state highlighting via the primary colour.
 *
 * Height: h-16 (4rem) with safe-area padding for devices with home indicators.
 */

import { NavLink } from "react-router-dom";
import { Home, Play, Map, Trophy, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface BottomTab {
  label: string;
  ariaLabel: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
}

const BOTTOM_TABS: BottomTab[] = [
  { label: "Home", ariaLabel: "Home page", to: "/", icon: Home },
  { label: "Play", ariaLabel: "Play current level", to: "/play", icon: Play },
  { label: "Levels", ariaLabel: "Level map", to: "/levels", icon: Map },
  { label: "Board", ariaLabel: "Leaderboard", to: "/leaderboard", icon: Trophy },
  { label: "Profile", ariaLabel: "Player profile", to: "/profile", icon: User },
];

export default function BottomNav() {
  return (
    <nav
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-card/95 backdrop-blur-sm supports-[backdrop-filter]:bg-card/80"
      aria-label="Quick navigation"
    >
      <div className="flex items-center justify-around h-16 px-1 pb-safe">
        {BOTTOM_TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.to === "/"}
            aria-label={tab.ariaLabel}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center justify-center gap-0.5 flex-1 h-full rounded-lg transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                isActive
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground/80"
              )
            }
          >
            {({ isActive }) => (
              <>
                <div
                  className={cn(
                    "flex items-center justify-center w-10 h-7 rounded-full transition-all duration-200",
                    isActive
                      ? "bg-primary/20 scale-110"
                      : "bg-transparent"
                  )}
                >
                  <tab.icon
                    className={cn(
                      "h-5 w-5 transition-colors",
                      isActive ? "text-primary-foreground stroke-[2.5px]" : ""
                    )}
                    aria-hidden="true"
                  />
                </div>
                <span
                  className={cn(
                    "text-[10px] leading-tight font-medium transition-colors",
                    isActive ? "font-bold" : ""
                  )}
                >
                  {tab.label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
