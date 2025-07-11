
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { HierarchicalSidebar } from '@/components/navigation/HierarchicalSidebar';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { ResponsiveContainer } from '@/components/layout/ResponsiveContainer';
import TrialStatusBanner from '@/components/TrialStatusBanner';

interface DashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
  showTrialBanner?: boolean;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ 
  children, 
  title = "Build Desk",
  showTrialBanner = true 
}) => {
  const { user, userProfile, signOut } = useAuth();

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-background flex w-full">
        <HierarchicalSidebar />
        
        <div className="flex-1">
          {/* Header */}
          <nav className="border-b bg-background/95 backdrop-blur-sm">
            <div className="flex justify-between h-14 sm:h-16 px-3 sm:px-4 lg:px-6">
              <div className="flex items-center min-w-0 flex-1">
                <SidebarTrigger className="mr-2 sm:mr-3 flex-shrink-0" />
                <h1 className="text-base sm:text-lg lg:text-2xl font-bold text-foreground truncate">
                  {title}
                </h1>
              </div>
              <div className="flex items-center space-x-2 sm:space-x-3 lg:space-x-4 flex-shrink-0">
                <span className="hidden md:block text-xs sm:text-sm text-muted-foreground truncate max-w-32 lg:max-w-none">
                  Welcome, {userProfile?.first_name || user?.email}
                </span>
                <ThemeToggle />
                <Button variant="outline" size="sm" className="hidden sm:flex text-xs lg:text-sm px-2 lg:px-3" onClick={signOut}>
                  Sign Out
                </Button>
                <Button variant="outline" size="sm" className="sm:hidden text-xs px-2" onClick={signOut}>
                  Exit
                </Button>
              </div>
            </div>
          </nav>

          {/* Main Content */}
          <ResponsiveContainer className="py-4 sm:py-6" padding="sm">
            {showTrialBanner && <TrialStatusBanner />}
            {children}
          </ResponsiveContainer>
        </div>
      </div>
    </SidebarProvider>
  );
};
