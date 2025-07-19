import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { SecurityDashboard } from '@/components/security/SecurityDashboard';

const SecuritySettings = () => {
  return (
    <DashboardLayout title="Security Settings">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Security & Privacy</h1>
          <p className="text-muted-foreground">
            Manage your account security settings and monitor suspicious activity
          </p>
        </div>
        
        <SecurityDashboard />
      </div>
    </DashboardLayout>
  );
};

export default SecuritySettings;