/**
 * LoadingSpinner - Lemon-themed loading indicator.
 *
 * Displays an animated spinning lemon icon with a customisable message.
 * Used during simulation processing and other async operations.
 */

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  /** Primary message displayed below the spinner */
  message?: string;
  /** Secondary / hint message displayed below the primary */
  submessage?: string;
  /** Additional Tailwind classes for the outer wrapper */
  className?: string;
}

export function LoadingSpinner({
  message = "Loading...",
  submessage,
  className,
}: LoadingSpinnerProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-20 space-y-6",
        className
      )}
      role="status"
      aria-live="polite"
    >
      {/* Animated lemon circle */}
      <div className="relative">
        <div className="h-20 w-20 rounded-full bg-gradient-to-br from-yellow-300 to-amber-400 flex items-center justify-center animate-pulse shadow-lg shadow-yellow-200/50">
          <span className="text-4xl" role="img" aria-hidden="true">
            🍋
          </span>
        </div>
        <Loader2 className="absolute -top-2 -right-2 h-8 w-8 text-amber-500 animate-spin" />
      </div>

      {/* Messages */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-foreground">{message}</h2>
        {submessage && (
          <p className="text-muted-foreground text-sm max-w-xs">{submessage}</p>
        )}
      </div>

      {/* Animated dots */}
      <div className="flex gap-1.5" aria-hidden="true">
        <div className="h-2 w-2 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: "0ms" }} />
        <div className="h-2 w-2 rounded-full bg-yellow-400 animate-bounce" style={{ animationDelay: "150ms" }} />
        <div className="h-2 w-2 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: "300ms" }} />
      </div>

    </div>
  );
}
