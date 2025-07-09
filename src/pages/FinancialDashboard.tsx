import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { gtag } from '@/hooks/useGoogleAnalytics';
import CashFlowSnapshot from '@/components/financial/CashFlowSnapshot';
import JobProfitabilityOverview from '@/components/financial/JobProfitabilityOverview';
import InvoicingPayments from '@/components/financial/InvoicingPayments';
import ExpensesByCategory from '@/components/financial/ExpensesByCategory';
import UpcomingPayments from '@/components/financial/UpcomingPayments';
import ProjectPipeline from '@/components/financial/ProjectPipeline';
import EstimateTracking from '@/components/financial/EstimateTracking';
import ProfitLossSummary from '@/components/financial/ProfitLossSummary';
import { BudgetVsActualTracking } from '@/components/financial/BudgetVsActualTracking';
import { CashFlowForecasting } from '@/components/financial/CashFlowForecasting';
import { ExpenseTracker } from '@/components/financial/ExpenseTracker';
import InvoiceGenerator from '@/components/InvoiceGenerator';
import Form1099Manager from '@/components/financial/Form1099Manager';
import StripePaymentProcessor from '@/components/financial/StripePaymentProcessor';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const FinancialDashboard = () => {
  React.useEffect(() => {
    gtag.trackFeature('financial_dashboard', 'page_view');
  }, []);

  return (
    <DashboardLayout title="Financial Dashboard">
      <div className="space-y-6">
        <Tabs defaultValue="overview" className="space-y-6" onValueChange={(value) => gtag.trackFeature('financial_dashboard', 'tab_change', value)}>
          <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6 gap-1">
            <TabsTrigger value="overview" className="text-xs sm:text-sm">Overview</TabsTrigger>
            <TabsTrigger value="budgets" className="text-xs sm:text-sm">
              <span className="hidden sm:inline">Budget Tracking</span>
              <span className="sm:hidden">Budget</span>
            </TabsTrigger>
            <TabsTrigger value="cash-flow" className="text-xs sm:text-sm">
              <span className="hidden sm:inline">Cash Flow</span>
              <span className="sm:hidden">Cash</span>
            </TabsTrigger>
            <TabsTrigger value="expenses" className="text-xs sm:text-sm">Expenses</TabsTrigger>
            <TabsTrigger value="invoices" className="text-xs sm:text-sm">Invoices</TabsTrigger>
            <TabsTrigger value="payments" className="text-xs sm:text-sm">Payments</TabsTrigger>
            <TabsTrigger value="1099s" className="text-xs sm:text-sm">1099s</TabsTrigger>
            <TabsTrigger value="reports" className="text-xs sm:text-sm">
              <span className="hidden sm:inline">P&L Reports</span>
              <span className="sm:hidden">P&L</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 sm:space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
              {/* Top Row - Key Metrics */}
              <div className="lg:col-span-2">
                <CashFlowSnapshot />
              </div>
              <div>
                <UpcomingPayments />
              </div>

              {/* Second Row */}
              <div className="lg:col-span-2">
                <JobProfitabilityOverview />
              </div>
              <div>
                <ProjectPipeline />
              </div>

              {/* Third Row */}
              <div>
                <InvoicingPayments />
              </div>
              <div>
                <ExpensesByCategory />
              </div>
              <div>
                <EstimateTracking />
              </div>

              {/* Bottom Row */}
              <div className="lg:col-span-3">
                <ProfitLossSummary />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="budgets" className="space-y-6">
            <BudgetVsActualTracking />
          </TabsContent>

          <TabsContent value="cash-flow" className="space-y-6">
            <CashFlowForecasting />
          </TabsContent>

          <TabsContent value="expenses" className="space-y-6">
            <ExpenseTracker />
          </TabsContent>

          <TabsContent value="invoices" className="space-y-6">
            <div className="space-y-6">
              <InvoiceGenerator />
              <InvoicingPayments />
            </div>
          </TabsContent>

          <TabsContent value="payments" className="space-y-6">
            <StripePaymentProcessor />
          </TabsContent>

          <TabsContent value="1099s" className="space-y-6">
            <Form1099Manager />
          </TabsContent>

          <TabsContent value="reports" className="space-y-6">
            <div className="grid grid-cols-1 gap-6">
              <ProfitLossSummary />
              <JobProfitabilityOverview />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default FinancialDashboard;