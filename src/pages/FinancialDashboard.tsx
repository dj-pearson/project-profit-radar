import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const FinancialDashboard = () => {
  const { user, userProfile, loading } = useAuth();
  const navigate = useNavigate();

  if (!loading && !user) {
    navigate('/auth');
    return null;
  }

  if (!loading && user && userProfile && !userProfile.company_id) {
    navigate('/setup');
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-construction-blue mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading financial dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
          <div className="flex items-center h-14 sm:h-16 lg:h-18">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/dashboard')}
              className="mr-2 sm:mr-3 lg:mr-4 flex-shrink-0"
            >
              <ArrowLeft className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Back to Dashboard</span>
              <span className="sm:hidden">Back</span>
            </Button>
            <h1 className="text-base sm:text-lg lg:text-xl font-semibold text-foreground truncate">Financial Dashboard</h1>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto py-4 sm:py-6 px-2 sm:px-4 lg:px-8">
        <Tabs defaultValue="overview" className="space-y-6">
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

          <TabsContent value="reports" className="space-y-6">
            <div className="grid grid-cols-1 gap-6">
              <ProfitLossSummary />
              <JobProfitabilityOverview />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default FinancialDashboard;