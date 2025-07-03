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
      <div className="border-b bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/dashboard')}
              className="mr-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            <h1 className="text-xl font-semibold">Financial Dashboard</h1>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
      </div>
    </div>
  );
};

export default FinancialDashboard;