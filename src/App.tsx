import { Suspense, useEffect, lazy } from "react";
import { BrowserRouter, Routes } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { TenantProvider } from "@/contexts/TenantContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import { PlatformProvider } from "@/contexts/PlatformContext";
import { Toaster } from "@/components/ui/toaster";
import { ContextMenuProvider } from '@/components/ui/context-menu-provider';
import CriticalErrorBoundary from "@/components/CriticalErrorBoundary";
import { DashboardSkeleton } from "@/components/ui/loading-skeleton";
import { preloadHighPriorityRoutes } from "@/utils/lazyRoutes";
import { AccessibilityProvider } from "@/components/accessibility/AccessibilityProvider";
import { useGlobalShortcuts } from "@/hooks/useKeyboardShortcuts";

// Import centralized route configuration
import { allRoutes } from "@/routes";

// Lazy load non-critical components that aren't needed for initial render
const PWAInstallPrompt = lazy(() => import("@/components/PWAInstallPrompt").then(m => ({ default: m.PWAInstallPrompt })));
const OfflineIndicator = lazy(() => import("@/components/OfflineIndicator").then(m => ({ default: m.OfflineIndicator })));
const NotificationPermission = lazy(() => import("@/components/NotificationPermission").then(m => ({ default: m.NotificationPermission })));
const ShortcutsHelp = lazy(() => import("@/components/ui/shortcuts-help").then(m => ({ default: m.ShortcutsHelp })));
const UnifiedSEOSystem = lazy(() => import("@/components/seo/UnifiedSEOSystem").then(m => ({ default: m.UnifiedSEOSystem })));
const CommandPalette = lazy(() => import("@/components/navigation/CommandPalette").then(m => ({ default: m.CommandPalette })));
const KeyboardShortcutsPanel = lazy(() => import("@/components/help/KeyboardShortcutsPanel").then(m => ({ default: m.KeyboardShortcutsPanel })));

// Component that needs Router context
const AppContent = () => {
  const globalShortcuts = useGlobalShortcuts();

  return (
    <>
      {/* SEO - deferred to not block initial render */}
      <Suspense fallback={null}>
        <UnifiedSEOSystem autoOptimize={true} enableAnalytics={true} />
      </Suspense>

      {/* Main Routes */}
      <Suspense fallback={<DashboardSkeleton />}>
        <Routes>
          {allRoutes}
        </Routes>
      </Suspense>

      {/* Essential UI */}
      <Toaster />

      {/* PWA Components - deferred, not critical for initial render */}
      <Suspense fallback={null}>
        <PWAInstallPrompt />
        <OfflineIndicator />
        <NotificationPermission />
        <ShortcutsHelp />
      </Suspense>

      {/* Usability Enhancements - deferred */}
      <Suspense fallback={null}>
        <CommandPalette />
        <KeyboardShortcutsPanel shortcuts={globalShortcuts} />
      </Suspense>
    </>
  );
};

const App = () => {
  // Preload high-priority routes on app initialization
  useEffect(() => {
    preloadHighPriorityRoutes();
  }, []);

  return (
    <CriticalErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TenantProvider>
          <AuthProvider>
            <SubscriptionProvider>
              <AccessibilityProvider>
                <ContextMenuProvider>
                  <PlatformProvider>
                    <ThemeProvider>
                      <HelmetProvider>
                        <BrowserRouter>
                          <AppContent />
                        </BrowserRouter>
                      </HelmetProvider>
                    </ThemeProvider>
                  </PlatformProvider>
                </ContextMenuProvider>
              </AccessibilityProvider>
            </SubscriptionProvider>
          </AuthProvider>
        </TenantProvider>
      </QueryClientProvider>
    </CriticalErrorBoundary>
  );
};

export default App;
