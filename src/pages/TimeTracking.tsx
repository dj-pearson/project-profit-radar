import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { TimeTrackingDashboard } from '@/components/time-tracking/TimeTrackingDashboard';
import { QuickTimeEntry } from '@/components/time-tracking/QuickTimeEntry';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';

const TimeTracking = () => {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const handleEntryCreated = () => {
    // Refresh the dashboard when a new entry is created
    window.location.reload();
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Time Tracking</h1>
            <p className="text-muted-foreground">
              Track your work hours and manage productivity across projects
            </p>
          </div>
        </div>

        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="quick-entry">Quick Entry</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <TimeTrackingDashboard />
          </TabsContent>

          <TabsContent value="quick-entry">
            <QuickTimeEntry onEntryCreated={handleEntryCreated} />
          </TabsContent>

          <TabsContent value="reports">
            <div className="text-center py-12">
              <h3 className="text-lg font-medium mb-2">Time Reports</h3>
              <p className="text-muted-foreground">
                Detailed time tracking reports coming soon
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default TimeTracking;