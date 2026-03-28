import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { TimeTrackingDashboard } from '@/components/time-tracking/TimeTrackingDashboard';
import { QuickTimeEntry } from '@/components/time-tracking/QuickTimeEntry';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate, useLocation } from 'react-router-dom';
import { Clock, Plus, BarChart3 } from 'lucide-react';
import { rememberCurrentRoute } from '@/lib/routeMemory';
import { AccessiblePageWrapper } from "@/components/accessibility/AccessiblePageWrapper";
import { TimeTrackingReports } from '@/components/time-tracking/TimeTrackingReports';

const TimeTracking = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [activeView, setActiveView] = useState<'dashboard' | 'quick-entry' | 'reports'>('dashboard');

  // Remember route before redirecting for unauthorized access
  useEffect(() => {
    if (!user) {
      rememberCurrentRoute(location);
    }
  }, [user, location]);

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const handleEntryCreated = () => {
    setActiveView('dashboard');
  };

  return (
    <AccessiblePageWrapper pageTitle="Time Tracking">
    <DashboardLayout hasAccessibleWrapper>
      <div className="min-h-screen pb-20">
        {/* Mobile Header */}
        <div className="sticky top-0 z-10 bg-background border-b px-4 py-3 sm:px-6">
          <h1 className="text-xl font-semibold sm:text-2xl">Time Tracking</h1>
          <p className="text-sm text-muted-foreground hidden sm:block">
            Track hours and manage productivity
          </p>
        </div>

        {/* Mobile Tab Navigation */}
        <div className="sticky top-[57px] z-10 bg-background border-b sm:hidden">
          <div className="flex" role="tablist" aria-label="Time tracking views">
            <button
              role="tab"
              aria-selected={activeView === 'dashboard'}
              aria-controls="time-tracking-content"
              onClick={() => setActiveView('dashboard')}
              className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
                activeView === 'dashboard'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-muted-foreground'
              }`}
            >
              <Clock className="h-4 w-4 mx-auto mb-1" aria-hidden="true" />
              Dashboard
            </button>
            <button
              role="tab"
              aria-selected={activeView === 'quick-entry'}
              aria-controls="time-tracking-content"
              onClick={() => setActiveView('quick-entry')}
              className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
                activeView === 'quick-entry'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-muted-foreground'
              }`}
            >
              <Plus className="h-4 w-4 mx-auto mb-1" aria-hidden="true" />
              Quick Entry
            </button>
            <button
              role="tab"
              aria-selected={activeView === 'reports'}
              aria-controls="time-tracking-content"
              onClick={() => setActiveView('reports')}
              className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
                activeView === 'reports'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-muted-foreground'
              }`}
            >
              <BarChart3 className="h-4 w-4 mx-auto mb-1" aria-hidden="true" />
              Reports
            </button>
          </div>
        </div>

        {/* Desktop Tab Navigation */}
        <div className="hidden sm:block border-b">
          <div className="container mx-auto px-6">
            <div className="flex gap-6" role="tablist" aria-label="Time tracking views">
              <button
                role="tab"
                aria-selected={activeView === 'dashboard'}
                aria-controls="time-tracking-content"
                onClick={() => setActiveView('dashboard')}
                className={`py-4 px-2 text-sm font-medium transition-colors ${
                  activeView === 'dashboard'
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Dashboard
              </button>
              <button
                role="tab"
                aria-selected={activeView === 'quick-entry'}
                aria-controls="time-tracking-content"
                onClick={() => setActiveView('quick-entry')}
                className={`py-4 px-2 text-sm font-medium transition-colors ${
                  activeView === 'quick-entry'
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Quick Entry
              </button>
              <button
                role="tab"
                aria-selected={activeView === 'reports'}
                aria-controls="time-tracking-content"
                onClick={() => setActiveView('reports')}
                className={`py-4 px-2 text-sm font-medium transition-colors ${
                  activeView === 'reports'
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Reports
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div id="time-tracking-content" role="tabpanel" className="container mx-auto px-4 py-6 sm:px-6" aria-label={`${activeView === 'dashboard' ? 'Dashboard' : activeView === 'quick-entry' ? 'Quick Entry' : 'Reports'} view`}>
          {activeView === 'dashboard' && <TimeTrackingDashboard />}
          
          {activeView === 'quick-entry' && (
            <QuickTimeEntry onEntryCreated={handleEntryCreated} />
          )}
          
          {activeView === 'reports' && <TimeTrackingReports />}
        </div>

        {/* Mobile FAB */}
        <div className="fixed bottom-6 right-6 z-50 sm:hidden">
          <Button
            size="lg"
            onClick={() => setActiveView('quick-entry')}
            className="h-14 w-14 rounded-full shadow-lg"
            aria-label="Add quick time entry"
          >
            <Plus className="h-6 w-6" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </DashboardLayout>
    </AccessiblePageWrapper>
  );
};

export default TimeTracking;