import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import CalendarIntegration from '@/components/calendar/CalendarIntegration';

const CalendarSync = () => {
  return (
    <DashboardLayout title="Calendar Integration">
      <CalendarIntegration />
    </DashboardLayout>
  );
};

export default CalendarSync;