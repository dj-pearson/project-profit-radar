
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { SimplifiedSidebar } from '@/components/navigation/SimplifiedSidebar';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { ResponsiveContainer } from '@/components/layout/ResponsiveContainer';
import { MobileBottomNav } from '@/components/mobile/MobileBottomNav';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { useImpersonation } from '@/hooks/useImpersonation';
import TrialStatusBanner from '@/components/TrialStatusBanner';
import { ImpersonationBanner } from '@/components/admin/ImpersonationBanner';
import { AutoBreadcrumb } from '@/components/navigation/AutoBreadcrumb';
import { PageHeader } from '@/components/ui/PageHeader';
import { Home, Building2, DollarSign, Users, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RealtimeNotificationCenter } from '@/components/realtime/RealtimeNotificationCenter';
import { DashboardSearchTrigger } from '@/components/search/DashboardSearchTrigger';

interface DashboardLayoutProps {
  children: React.ReactNode;
  /**
   * The page's heading. When set, the layout renders it as the page's one
   * <h1> through PageHeader, so the page itself must not render another.
   */
  title?: string;
  /** Line under the title, rendered by PageHeader. */
  description?: React.ReactNode;
  /** Page-level buttons rendered beside the title by PageHeader. */
  headerActions?: React.ReactNode;
  showTrialBanner?: boolean;
  showBottomNav?: boolean;
  actions?: React.ReactNode;
  /** When true, suppresses <main> and <SkipLinks> since an outer AccessiblePageWrapper provides them */
  hasAccessibleWrapper?: boolean;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  title,
  description,
  headerActions,
  showTrialBanner = true,
  showBottomNav = true,
  actions,
  hasAccessibleWrapper = false,
}) => {
  const { user, userProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { isImpersonating } = useImpersonation();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  // Detail pages pass the entity name as `title`; the generic default
  // ("Brikly") and empty titles shouldn't override the route-derived label.
  const breadcrumbLabel =
    title && title !== 'Brikly' ? title : undefined;
  // Pages that pass no title keep the legacy "Brikly" <h1> in the top bar;
  // every other page gets its one <h1> from PageHeader in the content area.
  const hasPageHeader = Boolean(breadcrumbLabel);

  const breadcrumb = <AutoBreadcrumb currentLabel={breadcrumbLabel} />;
  const pageHeader = hasPageHeader ? (
    <PageHeader
      title={title}
      description={description}
      actions={headerActions}
      breadcrumb={breadcrumb}
    />
  ) : (
    breadcrumb
  );

  // Mobile bottom navigation items
  const bottomNavItems = [
    { icon: Home, label: 'Home', href: '/dashboard' },
    { icon: Building2, label: 'Projects', href: '/projects-hub' },
    { icon: DollarSign, label: 'Financial', href: '/financial-hub' },
    { icon: Users, label: 'People', href: '/people-hub' },
    { icon: Settings, label: 'Admin', href: '/admin-hub' },
  ];

  return (
    <SidebarProvider>
      {/* Skip links are rendered once, app-wide, by AccessibilityProvider
          (first in tab order). No per-layout copy — that produced duplicate
          "Skip to main content" links on authenticated pages. */}
      <ImpersonationBanner />
      <div className={cn(
        "min-h-screen bg-background flex w-full",
        isImpersonating && "pt-20" // Add padding when impersonation banner is showing
      )}>
        {/* Navigation Sidebar */}
        <SimplifiedSidebar />

        <div className="flex-1 flex flex-col">
          {/* Dashboard Header */}
          <header
            className={cn(
              "sticky z-30 border-b bg-background/95 backdrop-blur-sm",
              isImpersonating ? "top-20" : "top-0"
            )}
            role="banner"
            aria-label="Dashboard header"
          >
            <div className="flex items-center justify-between h-14 md:h-16 px-3 md:px-6">
              {/* Left: Menu + Title */}
              <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
                <SidebarTrigger
                  className="flex-shrink-0"
                  aria-label="Toggle navigation menu"
                />
                {hasPageHeader ? (
                  // Compact label so the page name stays visible on phones once
                  // the PageHeader scrolls away. Hidden from AT: the <h1> below
                  // already names the page.
                  <span
                    className="md:hidden text-base font-semibold truncate"
                    aria-hidden="true"
                  >
                    {title}
                  </span>
                ) : (
                  <h1
                    className="text-base md:text-xl lg:text-2xl font-bold truncate"
                    id="page-title"
                  >
                    Brikly
                  </h1>
                )}
              </div>

              {/* Right: Actions + User */}
              <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
                {actions}

                {/* Global Search Trigger */}
                <DashboardSearchTrigger />

                {/* Notification Bell */}
                <RealtimeNotificationCenter />

                {/* Desktop User Info */}
                <span
                  className="hidden lg:block text-sm text-muted-foreground max-w-[150px] truncate"
                  aria-label={`Logged in as ${userProfile?.first_name || user?.email}`}
                >
                  {userProfile?.first_name || user?.email}
                </span>

                <ThemeToggle />

                {/* Sign Out Button */}
                <Button
                  variant="outline"
                  size="sm"
                  className="hidden md:flex h-9"
                  onClick={handleSignOut}
                  aria-label="Sign out of your account"
                >
                  Sign Out
                </Button>

                {/* Mobile Exit Button */}
                <Button
                  variant="outline"
                  size="sm"
                  className="md:hidden h-9 px-3"
                  onClick={handleSignOut}
                  aria-label="Sign out"
                >
                  Exit
                </Button>
              </div>
            </div>
          </header>

          {/* Main Content Area - renders as <div> when outer AccessiblePageWrapper provides <main> */}
          {hasAccessibleWrapper ? (
            <div
              className={cn(
                'flex-1 overflow-auto',
                showBottomNav && isMobile && 'pb-16',
              )}
            >
              <ResponsiveContainer className="py-4 md:py-6" padding="sm">
                {pageHeader}
                {showTrialBanner && <TrialStatusBanner />}
                {children}
              </ResponsiveContainer>
            </div>
          ) : (
            <main
              id="main-content"
              className={cn(
                'flex-1 overflow-auto',
                showBottomNav && isMobile && 'pb-16',
              )}
              role="main"
              aria-labelledby="page-title"
              tabIndex={-1}
            >
              <ResponsiveContainer className="py-4 md:py-6" padding="sm">
                {pageHeader}
                {showTrialBanner && <TrialStatusBanner />}
                {children}
              </ResponsiveContainer>
            </main>
          )}

          {/* Mobile Bottom Navigation */}
          {showBottomNav && isMobile && (
            <nav
              aria-label="Mobile navigation"
              role="navigation"
            >
              <MobileBottomNav items={bottomNavItems} />
            </nav>
          )}
        </div>
      </div>
    </SidebarProvider>
  );
};
