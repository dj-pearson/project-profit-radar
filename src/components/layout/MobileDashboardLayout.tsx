import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { SimplifiedSidebar } from '@/components/navigation/SimplifiedSidebar';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { ResponsiveContainer } from '@/components/layout/ResponsiveContainer';
import { MobileBottomNav } from '@/components/mobile/MobileBottomNav';
import { useIsMobile } from '@/hooks/useMediaQuery';
import TrialStatusBanner from '@/components/TrialStatusBanner';
import {
  Home,
  Building2,
  DollarSign,
  Users,
  Settings,
  Menu,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileDashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
  showTrialBanner?: boolean;
  showBottomNav?: boolean;
  actions?: React.ReactNode;
}

/**
 * Enhanced mobile-first dashboard layout
 */
export const MobileDashboardLayout: React.FC<MobileDashboardLayoutProps> = ({
  children,
  title = "BuildDesk",
  showTrialBanner = true,
  showBottomNav = true,
  actions,
}) => {
  const { user, userProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

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
      <div className="min-h-screen bg-background flex w-full">
        <SimplifiedSidebar />

        <div className="flex-1 flex flex-col">
          {/* Mobile-First Header */}
          <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur-sm">
            <div className="flex items-center justify-between h-14 md:h-16 px-3 md:px-6">
              {/* Left: Menu + Title */}
              <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
                <SidebarTrigger className="flex-shrink-0" />
                <h1 className="text-base md:text-xl lg:text-2xl font-bold truncate">
                  {title}
                </h1>
              </div>

              {/* Right: Actions + User */}
              <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
                {actions}

                {/* Desktop User Info */}
                <span className="hidden lg:block text-sm text-muted-foreground max-w-[150px] truncate">
                  {userProfile?.first_name || user?.email}
                </span>

                <ThemeToggle />

                {/* Sign Out Button */}
                <Button
                  variant="outline"
                  size="sm"
                  className="hidden md:flex h-9"
                  onClick={handleSignOut}
                >
                  Sign Out
                </Button>

                {/* Mobile Exit Button */}
                <Button
                  variant="outline"
                  size="sm"
                  className="md:hidden h-9 px-3"
                  onClick={handleSignOut}
                >
                  Exit
                </Button>
              </div>
            </div>
          </header>

          {/* Main Content Area */}
          <main className={cn(
            'flex-1 overflow-auto',
            showBottomNav && isMobile && 'pb-16', // Space for bottom nav
          )}>
            <ResponsiveContainer
              className="py-4 md:py-6"
              padding="sm"
            >
              {showTrialBanner && <TrialStatusBanner />}
              {children}
            </ResponsiveContainer>
          </main>

          {/* Mobile Bottom Navigation */}
          {showBottomNav && isMobile && (
            <MobileBottomNav items={bottomNavItems} />
          )}
        </div>
      </div>
    </SidebarProvider>
  );
};

/**
 * Simplified mobile page wrapper for simple pages
 */
export const MobilePageLayout: React.FC<{
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  headerAction?: React.ReactNode;
  backButton?: boolean;
}> = ({ children, title, subtitle, headerAction, backButton = false }) => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  return (
    <div className="min-h-screen bg-background">
      {/* Simple Mobile Header */}
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur-sm">
        <div className="flex items-center justify-between h-14 md:h-16 px-4 md:px-6">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {backButton && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(-1)}
                className="flex-shrink-0"
              >
                ←
              </Button>
            )}
            <div className="min-w-0">
              <h1 className="text-lg md:text-xl font-bold truncate">{title}</h1>
              {subtitle && (
                <p className="text-xs md:text-sm text-muted-foreground truncate">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          {headerAction && (
            <div className="flex-shrink-0">{headerAction}</div>
          )}
        </div>
      </header>

      {/* Content */}
      <main className="p-4 md:p-6">
        {children}
      </main>
    </div>
  );
};
