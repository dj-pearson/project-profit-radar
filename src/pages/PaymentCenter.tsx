import { useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { AccessiblePageWrapper } from '@/components/accessibility/AccessiblePageWrapper';
import { PaymentDashboard } from '@/components/payments/PaymentDashboard';
import { PaymentMethodManager } from '@/components/payments/PaymentMethodManager';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
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
    <AccessiblePageWrapper pageTitle="Payment Center">
    <DashboardLayout hasAccessibleWrapper
      title="Payment Center"
      description="Comprehensive payment management for your construction business"
    >
      <div className="container mx-auto py-8 space-y-6">
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
              <p className="text-muted-foreground mb-4">
                Create, send and track invoices on the Invoices page.
              </p>
              <Button asChild>
                <Link to="/invoices">Open Invoices</Link>
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="subscriptions">
            <div className="text-center py-12">
              <h3 className="text-lg font-medium mb-2">Subscription Management</h3>
              <p className="text-muted-foreground mb-4">
                Change your plan or billing details in Subscription Settings.
              </p>
              <Button asChild>
                <Link to="/subscription-settings">Open Subscription Settings</Link>
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
    </AccessiblePageWrapper>
  );
};

export default PaymentCenter;