/**
 * AppLayout - Root layout wrapper for the Lemonade Stand Business Game.
 *
 * Renders the appropriate navigation chrome depending on the viewport width:
 *   - Desktop (>= 1024px / Tailwind `lg:`): DesktopSidebar pinned to the left.
 *   - Mobile / Tablet (< 1024px): MobileHeader at top + BottomNav at bottom.
 *
 * Page content is injected via React Router's <Outlet />.
 * The main content area accounts for fixed header, sidebar, and bottom-nav
 * heights so that scrollable content is never obscured.
 */

import { Outlet } from "react-router-dom";
import DesktopSidebar from "@/components/layout/DesktopSidebar";
import MobileHeader from "@/components/layout/MobileHeader";
import BottomNav from "@/components/layout/BottomNav";

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-background">
      {/* Skip-to-content link for keyboard / screen-reader users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[60] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:shadow-lg"
      >
        Skip to main content
      </a>

      {/* Desktop sidebar - hidden on mobile, visible on lg+ */}
      <DesktopSidebar />

      {/* Mobile header - visible on mobile/tablet, hidden on lg+ */}
      <MobileHeader />

      {/* Main content area */}
      <main
        id="main-content"
        className={[
          // On mobile: offset for fixed header (h-14) at top and bottom nav (h-16) at bottom
          "pt-14 pb-16",
          // On desktop: remove top/bottom offsets; offset for sidebar width instead
          "lg:pt-0 lg:pb-0 lg:pl-64",
          // Content padding and min-height
          "min-h-screen",
        ].join(" ")}
      >
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <Outlet />
        </div>
      </main>

      {/* Mobile bottom navigation - hidden on lg+ */}
      <BottomNav />
    </div>
  );
}
