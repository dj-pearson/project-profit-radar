import { Suspense, useEffect, lazy, type ReactNode } from "react";
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
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { DashboardSkeleton } from "@/components/ui/loading-skeleton";
import { preloadHighPriorityRoutes } from "@/utils/lazyRoutes";
import { AccessibilityProvider } from "@/components/accessibility/AccessibilityProvider";
import { useGlobalShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useNavigationShortcuts } from "@/hooks/useNavigationShortcuts";
import { useHubPrefetch } from "@/hooks/useHubPrefetch";
import { SharedElementRoot } from "@/components/mobile/SharedElementTransition";

// Import centralized route configuration
import { allRoutes } from "@/routes";

// Lazy load non-critical components that aren't needed for initial render
const CookieConsentBanner = lazy(() => import("@/components/legal/CookieConsentBanner"));
const PWAInstallPrompt = lazy(() => import("@/components/PWAInstallPrompt").then(m => ({ default: m.PWAInstallPrompt })));
const OfflineIndicator = lazy(() => import("@/components/OfflineIndicator").then(m => ({ default: m.OfflineIndicator })));
const SyncQueueIndicator = lazy(() => import("@/components/OfflineIndicator").then(m => ({ default: m.SyncQueueIndicator })));
const NotificationPermission = lazy(() => import("@/components/NotificationPermission").then(m => ({ default: m.NotificationPermission })));
const ShortcutsHelp = lazy(() => import("@/components/ui/shortcuts-help").then(m => ({ default: m.ShortcutsHelp })));
const UpdatePrompt = lazy(() => import("@/components/pwa/UpdatePrompt").then(m => ({ default: m.UpdatePrompt })));
const HelpLauncher = lazy(() => import("@/components/help/HelpLauncher").then(m => ({ default: m.HelpLauncher })));
const UnifiedSEOSystem = lazy(() => import("@/components/seo/UnifiedSEOSystem").then(m => ({ default: m.UnifiedSEOSystem })));
const AutoSchemaInjector = lazy(() => import("@/components/seo/AutoSchemaInjector"));
const CommandPalette = lazy(() => import("@/components/navigation/CommandPalette").then(m => ({ default: m.CommandPalette })));
const KeyboardShortcutsPanel = lazy(() => import("@/components/help/KeyboardShortcutsPanel").then(m => ({ default: m.KeyboardShortcutsPanel })));

// Component that needs Router context
const AppContent = () => {
  const globalShortcuts = useGlobalShortcuts();
  // Power-user navigation shortcuts: Shift+? overlay, G-chords, context-aware N (US-095).
  useNavigationShortcuts();
  // US-220: idle-warm likely-next route chunks + their queries on hub navigation.
  useHubPrefetch();

  return (
    <>
      {/* SEO - deferred to not block initial render */}
      <Suspense fallback={null}>
        <UnifiedSEOSystem autoOptimize={true} enableAnalytics={true} />
        <AutoSchemaInjector />
      </Suspense>

      {/* Main Routes */}
      <Suspense fallback={<DashboardSkeleton />}>
        <Routes>
          {allRoutes}
        </Routes>
      </Suspense>

      {/* Essential UI */}
      <Toaster />

      {/* Cookie consent banner — appears on every public page until the user
          makes a choice. Honors GPC, persists choices in localStorage, and
          drives Google Consent Mode v2 / PostHog opt-in. */}
      <Suspense fallback={null}>
        <CookieConsentBanner />
      </Suspense>

      {/* PWA Components - deferred, not critical for initial render */}
      <Suspense fallback={null}>
        <PWAInstallPrompt />
        <OfflineIndicator />
        <NotificationPermission />
        <ShortcutsHelp />
        {/* US-220: 'new version available' prompt → applies update via skipWaiting */}
        <UpdatePrompt />
      </Suspense>

      {/* Usability Enhancements - deferred */}
      <Suspense fallback={null}>
        <CommandPalette />
        <KeyboardShortcutsPanel shortcuts={globalShortcuts} />
        {/* US-079: floating contextual help launcher on every page */}
        <HelpLauncher />
      </Suspense>
    </>
  );
};

// Composed provider to reduce nesting from 9 to 6 levels
const UIProviders = ({ children }: { children: ReactNode }) => (
  <AccessibilityProvider>
    <ContextMenuProvider>
      <PlatformProvider>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </PlatformProvider>
    </ContextMenuProvider>
  </AccessibilityProvider>
);

const AppProviders = ({ children }: { children: ReactNode }) => (
  <ErrorBoundary variant="critical">
    <QueryClientProvider client={queryClient}>
      <TenantProvider>
        <AuthProvider>
          <SubscriptionProvider>
            <UIProviders>
              <HelmetProvider>
                {children}
              </HelmetProvider>
            </UIProviders>
          </SubscriptionProvider>
        </AuthProvider>
      </TenantProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

const App = () => {
  // Preload high-priority routes on app initialization
  useEffect(() => {
    preloadHighPriorityRoutes();
  }, []);

  return (
    <AppProviders>
      <BrowserRouter>
        <SharedElementRoot scope="brikly">
          <AppContent />
        </SharedElementRoot>
      </BrowserRouter>
    </AppProviders>
  );
};

export default App;
