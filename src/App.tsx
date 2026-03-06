import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/layout";
import { PlayerRoute, FacilitatorRoute } from "@/components/ProtectedRoute";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { NetworkStatus } from "@/components/NetworkStatus";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Loader2 } from "lucide-react";

// Lazy-loaded page components for code splitting
const HomePage = lazy(() => import("@/pages/HomePage"));
const PlayPage = lazy(() => import("@/pages/PlayPage"));
const LevelsPage = lazy(() => import("@/pages/LevelsPage"));
const ResultsPage = lazy(() => import("@/pages/ResultsPage"));
const LeaderboardPage = lazy(() => import("@/pages/LeaderboardPage"));
const AwardsPage = lazy(() => import("@/pages/AwardsPage"));
const ProfilePage = lazy(() => import("@/pages/ProfilePage"));
const LoansPage = lazy(() => import("@/pages/LoansPage"));
const HowToPlayPage = lazy(() => import("@/pages/HowToPlayPage"));
const SettingsPage = lazy(() => import("@/pages/SettingsPage"));
const FacilitatorPage = lazy(() => import("@/pages/FacilitatorPage"));
const NotFoundPage = lazy(() => import("@/pages/NotFoundPage"));

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
    <TooltipProvider>
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* All game pages inside AppLayout (side nav, header, bottom tabs) */}
            <Route element={<AppLayout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/play" element={<PlayerRoute><PlayPage /></PlayerRoute>} />
              <Route path="/levels" element={<PlayerRoute><LevelsPage /></PlayerRoute>} />
              <Route path="/results" element={<PlayerRoute><ResultsPage /></PlayerRoute>} />
              <Route path="/leaderboard" element={<PlayerRoute><LeaderboardPage /></PlayerRoute>} />
              <Route path="/awards" element={<PlayerRoute><AwardsPage /></PlayerRoute>} />
              <Route path="/profile" element={<PlayerRoute><ProfilePage /></PlayerRoute>} />
              <Route path="/loans" element={<PlayerRoute><LoansPage /></PlayerRoute>} />
              <Route path="/how-to-play" element={<HowToPlayPage />} />
              <Route path="/settings" element={<PlayerRoute><SettingsPage /></PlayerRoute>} />
            </Route>
            {/* Facilitator page outside main layout */}
            <Route path="/facilitator" element={<FacilitatorRoute><FacilitatorPage /></FacilitatorRoute>} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
      <NetworkStatus />
      <Toaster />
    </TooltipProvider>
    </ErrorBoundary>
  );
}

export default App;
