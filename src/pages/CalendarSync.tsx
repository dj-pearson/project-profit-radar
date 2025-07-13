import React from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { SimplifiedSidebar } from '@/components/navigation/SimplifiedSidebar';
import CalendarIntegration from '@/components/calendar/CalendarIntegration';

const CalendarSync = () => {
  return (
    <SidebarProvider>
      <div className="flex w-full min-h-screen bg-background">
        <SimplifiedSidebar />
        <div className="flex-1">
          <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6">
            <CalendarIntegration />
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default CalendarSync;