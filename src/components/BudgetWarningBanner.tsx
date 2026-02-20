/**
 * BudgetWarningBanner - Displays a contextual warning when the player's budget
 * drops below safe thresholds.
 *
 * Thresholds:
 *   - budget < 30: Red "destructive" alert (critical / business at risk)
 *   - budget < 50: Amber warning alert (budget is getting low)
 *   - budget >= 50: No banner shown (returns null)
 *
 * Used on PlayPage and HomePage to keep the player informed about budget risk.
 */

import { AlertTriangle, ShieldAlert } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useGameStore } from "@/store/game-store";

export default function BudgetWarningBanner() {
  const budget = useGameStore((s) => s.currentPlayer?.budget ?? 500);

  // No warning needed when budget is healthy
  if (budget >= 50) {
    return null;
  }

  // Critical threshold: business is about to close
  if (budget < 30) {
    return (
      <Alert variant="destructive" className="border-red-400 bg-red-50" role="alert">
        <ShieldAlert className="h-4 w-4" />
        <AlertTitle className="text-red-900">
          CRITICAL: Business at Risk
        </AlertTitle>
        <AlertDescription className="text-red-800">
          Budget below $30. Your business will close if budget drops below $20.
        </AlertDescription>
      </Alert>
    );
  }

  // Warning threshold: budget is low but not yet critical
  return (
    <Alert className="border-amber-400 bg-amber-50" role="status">
      <AlertTriangle className="h-4 w-4 text-amber-600" />
      <AlertTitle className="text-amber-900">Budget Warning</AlertTitle>
      <AlertDescription className="text-amber-800">
        Your budget is low. Focus on profitable decisions.
      </AlertDescription>
    </Alert>
  );
}
