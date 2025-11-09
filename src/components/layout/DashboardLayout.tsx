
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
import { Home, Building2, DollarSign, Users, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
  showTrialBanner?: boolean;
  showBottomNav?: boolean;
  actions?: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  title = "BuildDesk",
  showTrialBanner = true,
  showBottomNav = true,
  actions
}) => {
  const { user, userProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { isImpersonating } = useImpersonation();

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
      <ImpersonationBanner />
      <div className={cn(
        "min-h-screen bg-background flex w-full",
        isImpersonating && "pt-20" // Add padding when impersonation banner is showing
      )}>
        <SimplifiedSidebar />

        <div className="flex-1 flex flex-col">
          {/* Mobile-First Header */}
          <header className={cn(
            "sticky z-30 border-b bg-background/95 backdrop-blur-sm",
            isImpersonating ? "top-20" : "top-0" // Adjust header position when banner is showing
          )}>
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
            <ResponsiveContainer className="py-4 md:py-6" padding="sm">
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
