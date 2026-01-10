import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import RefundWorkflow from '@/components/billing/RefundWorkflow';
import ChargebackManager from '@/components/billing/ChargebackManager';
import FailedPaymentRecovery from '@/components/billing/FailedPaymentRecovery';
import BillingAutomationRules from '@/components/billing/BillingAutomationRules';
import PaymentFailureAlert from '@/components/billing/PaymentFailureAlert';
import UsageDashboard from '@/components/billing/UsageDashboard';
import {
  CreditCard,
  RefreshCw,
  Shield,
  AlertTriangle,
  Zap,
  BarChart3
} from 'lucide-react';

const BillingManagement: React.FC = () => {
  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Payment Failure Alert - Shows at top if there are issues */}
      <PaymentFailureAlert />

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Billing Management</h1>
          <p className="text-muted-foreground">
            Manage refunds, chargebacks, payment recovery, and billing automation
          </p>
        </div>
      </div>

      <Tabs defaultValue="refunds" className="space-y-6">
        <TabsList className="grid grid-cols-2 md:grid-cols-6 gap-2 h-auto p-1">
          <TabsTrigger value="refunds" className="flex items-center gap-2 py-2">
            <RefreshCw className="w-4 h-4" />
            <span className="hidden md:inline">Refunds</span>
          </TabsTrigger>
          <TabsTrigger value="chargebacks" className="flex items-center gap-2 py-2">
            <Shield className="w-4 h-4" />
            <span className="hidden md:inline">Chargebacks</span>
          </TabsTrigger>
          <TabsTrigger value="recovery" className="flex items-center gap-2 py-2">
            <AlertTriangle className="w-4 h-4" />
            <span className="hidden md:inline">Recovery</span>
          </TabsTrigger>
          <TabsTrigger value="automation" className="flex items-center gap-2 py-2">
            <Zap className="w-4 h-4" />
            <span className="hidden md:inline">Automation</span>
          </TabsTrigger>
          <TabsTrigger value="usage" className="flex items-center gap-2 py-2">
            <BarChart3 className="w-4 h-4" />
            <span className="hidden md:inline">Usage</span>
          </TabsTrigger>
          <TabsTrigger value="overview" className="flex items-center gap-2 py-2">
            <CreditCard className="w-4 h-4" />
            <span className="hidden md:inline">Overview</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="refunds">
          <RefundWorkflow />
        </TabsContent>

        <TabsContent value="chargebacks">
          <ChargebackManager />
        </TabsContent>

        <TabsContent value="recovery">
          <FailedPaymentRecovery />
        </TabsContent>

        <TabsContent value="automation">
          <BillingAutomationRules />
        </TabsContent>

        <TabsContent value="usage">
          <UsageDashboard />
        </TabsContent>

        <TabsContent value="overview">
          <BillingOverview />
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Overview Component
const BillingOverview: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <RefreshCw className="w-4 h-4" />
              Refunds
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$0.00</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Chargebacks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">Active disputes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Failed Payments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">Pending recovery</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Automation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">Active rules</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common billing tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <QuickActionItem
              icon={RefreshCw}
              title="Process Refund"
              description="Issue a refund to a customer"
            />
            <QuickActionItem
              icon={Shield}
              title="Respond to Dispute"
              description="Submit evidence for a chargeback"
            />
            <QuickActionItem
              icon={AlertTriangle}
              title="Retry Failed Payment"
              description="Attempt to recover a failed payment"
            />
            <QuickActionItem
              icon={Zap}
              title="Create Automation Rule"
              description="Set up automated billing workflows"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Billing Health</CardTitle>
            <CardDescription>Key metrics at a glance</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <MetricItem
              label="Payment Success Rate"
              value="99.2%"
              status="good"
            />
            <MetricItem
              label="Chargeback Rate"
              value="0.1%"
              status="good"
            />
            <MetricItem
              label="Refund Rate"
              value="1.5%"
              status="warning"
            />
            <MetricItem
              label="Recovery Rate"
              value="85%"
              status="good"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

interface QuickActionItemProps {
  icon: React.ElementType;
  title: string;
  description: string;
}

const QuickActionItem: React.FC<QuickActionItemProps> = ({ icon: Icon, title, description }) => (
  <div className="flex items-center gap-4 p-3 rounded-lg border hover:bg-accent cursor-pointer transition-colors">
    <div className="p-2 bg-primary/10 rounded-lg">
      <Icon className="w-5 h-5 text-primary" />
    </div>
    <div>
      <div className="font-medium">{title}</div>
      <div className="text-sm text-muted-foreground">{description}</div>
    </div>
  </div>
);

interface MetricItemProps {
  label: string;
  value: string;
  status: 'good' | 'warning' | 'critical';
}

const MetricItem: React.FC<MetricItemProps> = ({ label, value, status }) => {
  const statusColors = {
    good: 'text-green-600',
    warning: 'text-yellow-600',
    critical: 'text-red-600'
  };

  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-semibold ${statusColors[status]}`}>{value}</span>
    </div>
  );
};

export default BillingManagement;
