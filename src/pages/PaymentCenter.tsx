import React, { useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PaymentDashboard } from '@/components/payments/PaymentDashboard';
import { PaymentMethodManager } from '@/components/payments/PaymentMethodManager';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate, useLocation } from 'react-router-dom';
import { rememberCurrentRoute } from '@/lib/routeMemory';

const PaymentCenter = () => {
  const { user } = useAuth();
  const location = useLocation();

  // Remember route before redirecting for unauthorized access
  useEffect(() => {
    if (!user) {
      rememberCurrentRoute(location);
    }
  }, [user, location]);

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Payment Center</h1>
            <p className="text-muted-foreground">
              Comprehensive payment management for your construction business
            </p>
          </div>
        </div>

        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="methods">Payment Methods</TabsTrigger>
            <TabsTrigger value="invoices">Invoices</TabsTrigger>
            <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <PaymentDashboard />
          </TabsContent>

          <TabsContent value="methods">
            <PaymentMethodManager />
          </TabsContent>

          <TabsContent value="invoices">
            <div className="text-center py-12">
              <h3 className="text-lg font-medium mb-2">Invoice Management</h3>
              <p className="text-muted-foreground">
                Invoice management features coming soon
              </p>
            </div>
          </TabsContent>

          <TabsContent value="subscriptions">
            <div className="text-center py-12">
              <h3 className="text-lg font-medium mb-2">Subscription Management</h3>
              <p className="text-muted-foreground">
                Subscription management features coming soon
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default PaymentCenter;