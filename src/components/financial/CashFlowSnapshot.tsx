import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Wallet,
  CreditCard,
  AlertCircle
} from 'lucide-react';

const CashFlowSnapshot = () => {
  const { userProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [cashFlowData, setCashFlowData] = useState({
    currentBalance: 0,
    accountsReceivable: 0,
    accountsPayable: 0,
    totalProjects: 0,
    activeProjects: 0
  });

  useEffect(() => {
    if (userProfile?.company_id) {
      loadCashFlowData();
    }
  }, [userProfile?.company_id]);

  const loadCashFlowData = async () => {
    try {
      setLoading(true);
      
      // Get projects data for cash flow calculation
      const { data: projects, error: projectsError } = await supabase
        .from('projects')
        .select('id, budget, completion_percentage, status')
        .eq('company_id', userProfile?.company_id);

      if (projectsError) throw projectsError;

      // Get cash flow projections
      const { data: cashFlow, error: cashFlowError } = await supabase
        .from('cash_flow_projections')
        .select('projected_income, projected_expenses, actual_income, actual_expenses')
        .eq('company_id', userProfile?.company_id)
        .gte('projection_date', new Date().toISOString().split('T')[0]);

      if (cashFlowError) throw cashFlowError;

      // Calculate metrics from available data
      const totalBudget = projects?.reduce((sum, p) => sum + (parseFloat(String(p.budget)) || 0), 0) || 0;
      const activeProjects = projects?.filter(p => p.status === 'active' || p.status === 'in_progress').length || 0;
      const completedRevenue = projects?.reduce((sum, p) => {
        const budget = parseFloat(String(p.budget)) || 0;
        const completion = p.completion_percentage || 0;
        return sum + (budget * completion / 100);
      }, 0) || 0;

      const projectedIncome = cashFlow?.reduce((sum, cf) => sum + (parseFloat(String(cf.projected_income)) || 0), 0) || totalBudget;
      const projectedExpenses = cashFlow?.reduce((sum, cf) => sum + (parseFloat(String(cf.projected_expenses)) || 0), 0) || (totalBudget * 0.7);
      const actualIncome = cashFlow?.reduce((sum, cf) => sum + (parseFloat(String(cf.actual_income)) || 0), 0) || completedRevenue;

      setCashFlowData({
        currentBalance: actualIncome - (projectedExpenses * 0.5), // Estimate current balance
        accountsReceivable: projectedIncome - actualIncome,
        accountsPayable: projectedExpenses * 0.3, // Estimate payables
        totalProjects: projects?.length || 0,
        activeProjects
      });
    } catch (error) {
      console.error('Error loading cash flow data:', error);
    } finally {
      setLoading(false);
    }
  };

  const netCashPosition = cashFlowData.currentBalance + cashFlowData.accountsReceivable - cashFlowData.accountsPayable;
  const isPositive = netCashPosition > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="h-5 w-5" />
          Cash Flow Snapshot
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              ${cashFlowData.currentBalance.toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground">Current Balance</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              ${cashFlowData.accountsReceivable.toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground">Money Coming In</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">
              ${cashFlowData.accountsPayable.toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground">Money Going Out</div>
          </div>
          <div className="text-center">
            <div className={`text-2xl font-bold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
              ${netCashPosition.toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground">Net Position</div>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <Badge variant={isPositive ? "default" : "destructive"}>
            {isPositive ? (
              <TrendingUp className="h-3 w-3 mr-1" />
            ) : (
              <TrendingDown className="h-3 w-3 mr-1" />
            )}
            {isPositive ? 'Healthy Cash Flow' : 'Cash Flow Alert'}
          </Badge>
          <Button variant="outline" size="sm">
            View Details
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default CashFlowSnapshot;