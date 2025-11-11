import { Suspense, useEffect } from "react";
import { BrowserRouter, Routes } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { TenantProvider } from "@/contexts/TenantContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import { PlatformProvider } from "@/contexts/PlatformContext";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { NotificationPermission } from "@/components/NotificationPermission";
import { Toaster } from "@/components/ui/toaster";
import { ShortcutsHelp } from '@/components/ui/shortcuts-help';
import { ContextMenuProvider } from '@/components/ui/context-menu-provider';
import CriticalErrorBoundary from "@/components/CriticalErrorBoundary";
import { DashboardSkeleton } from "@/components/ui/loading-skeleton";
import { preloadHighPriorityRoutes } from "@/utils/lazyRoutes";
import { UnifiedSEOSystem } from "@/components/seo/UnifiedSEOSystem";
import { AccessibilityProvider } from "@/components/accessibility/AccessibilityProvider";
import { CommandPalette } from "@/components/navigation/CommandPalette";
import { KeyboardShortcutsPanel } from "@/components/help/KeyboardShortcutsPanel";
import { useGlobalShortcuts } from "@/hooks/useKeyboardShortcuts";

// Import centralized route configuration
import { allRoutes } from "@/routes";

// Component that needs Router context
const AppContent = () => {
  const globalShortcuts = useGlobalShortcuts();

  return (
    <>
      <UnifiedSEOSystem autoOptimize={true} enableAnalytics={true} />
      <Suspense fallback={<DashboardSkeleton />}>
        <Routes>
          {allRoutes}
        </Routes>
      </Suspense>

      {/* PWA Components */}
      <PWAInstallPrompt />
      <OfflineIndicator />
      <NotificationPermission />
      <Toaster />
      <ShortcutsHelp />

      {/* Usability Enhancements */}
      <CommandPalette />
      <KeyboardShortcutsPanel shortcuts={globalShortcuts} />
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
