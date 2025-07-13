import React from 'react';
import { TaskManager } from '@/components/tasks/TaskManager';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

export const TaskManagement = () => {
  return (
    <DashboardLayout>
      <TaskManager />
    </DashboardLayout>
  );
};