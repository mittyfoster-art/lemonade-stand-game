import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/layout";
import HomePage from "@/pages/HomePage";
import PlayPage from "@/pages/PlayPage";
import LevelsPage from "@/pages/LevelsPage";
import ResultsPage from "@/pages/ResultsPage";
import LeaderboardPage from "@/pages/LeaderboardPage";
import AwardsPage from "@/pages/AwardsPage";
import ProfilePage from "@/pages/ProfilePage";
import LoansPage from "@/pages/LoansPage";
import HowToPlayPage from "@/pages/HowToPlayPage";
import SettingsPage from "@/pages/SettingsPage";
import FacilitatorPage from "@/pages/FacilitatorPage";
import NotFoundPage from "@/pages/NotFoundPage";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

function App() {
  return (
    <TooltipProvider>
      <BrowserRouter>
        <Routes>
          {/* All game pages inside AppLayout (side nav, header, bottom tabs) */}
          <Route element={<AppLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/play" element={<PlayPage />} />
            <Route path="/levels" element={<LevelsPage />} />
            <Route path="/results" element={<ResultsPage />} />
            <Route path="/leaderboard" element={<LeaderboardPage />} />
            <Route path="/awards" element={<AwardsPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/loans" element={<LoansPage />} />
            <Route path="/how-to-play" element={<HowToPlayPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
          {/* Facilitator page outside main layout */}
          <Route path="/facilitator" element={<FacilitatorPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
      <Toaster />
    </TooltipProvider>
  );
}

export default App;
