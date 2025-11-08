import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { HubNavigationSection } from '@/components/hub/HubNavigationSection';
import { hierarchicalNavigation } from '@/components/navigation/HierarchicalNavigationConfig';
import { QuickBooksSyncStatus } from '@/components/integrations/QuickBooksSyncStatus';

const FinancialHub = () => {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const [metrics, setMetrics] = useState({
    totalRevenue: 0,
    activePOs: 0,
    cashFlowProjections: 0,
    contractorPayments: 0
  });

  const financialArea = hierarchicalNavigation.find(area => area.id === 'financial');
  
  useEffect(() => {
    const fetchMetrics = async () => {
      if (!userProfile?.company_id) return;

      try {
        // Fetch purchase orders count
        const { count: poCount } = await supabase
          .from('purchase_orders')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', userProfile.company_id)
          .eq('status', 'approved');

        // Fetch cash flow projections
        const { count: cashFlowCount } = await supabase
          .from('cash_flow_projections')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', userProfile.company_id);

        // Fetch contractor payments sum for this year
        const { data: paymentsData } = await supabase
          .from('contractor_payments')
          .select('amount')
          .eq('company_id', userProfile.company_id)
          .gte('payment_date', new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]);

        const totalPayments = paymentsData?.reduce((sum, payment) => sum + Number(payment.amount), 0) || 0;

        // Calculate total revenue from projects (using a placeholder since contract_value doesn't exist)
        const { count: projectsCount } = await supabase
          .from('projects')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', userProfile.company_id)
          .eq('status', 'active');

        // Placeholder calculation - would need actual contract values
        const totalRevenue = (projectsCount || 0) * 50000; // Assuming average project value

        setMetrics({
          totalRevenue,
          activePOs: poCount || 0,
          cashFlowProjections: cashFlowCount || 0,
          contractorPayments: totalPayments
        });
      } catch (error) {
        console.error('Error fetching financial metrics:', error);
      }
    };

    fetchMetrics();
  }, [userProfile?.company_id]);
  
  if (!financialArea) {
    return <div>Area not found</div>;
  }


  return (
    <DashboardLayout title={financialArea.title}>
      <div>
        {/* QuickBooks Sync Status - Prominent Widget */}
        <QuickBooksSyncStatus />

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                  <p className="text-2xl font-bold">${(metrics.totalRevenue / 1000).toFixed(0)}K</p>
                </div>
                <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                  <financialArea.icon className="h-4 w-4 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Cash Flow Items</p>
                  <p className="text-2xl font-bold">{metrics.cashFlowProjections}</p>
                </div>
                <div className="h-8 w-8 bg-yellow-100 rounded-full flex items-center justify-center">
                  <financialArea.icon className="h-4 w-4 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active POs</p>
                  <p className="text-2xl font-bold">{metrics.activePOs}</p>
                </div>
                <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <financialArea.icon className="h-4 w-4 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Contractor Payments</p>
                  <p className="text-2xl font-bold">${(metrics.contractorPayments / 1000).toFixed(0)}K</p>
                </div>
                <div className="h-8 w-8 bg-purple-100 rounded-full flex items-center justify-center">
                  <financialArea.icon className="h-4 w-4 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => navigate('/purchase-orders/new')}>
              Create Purchase Order
            </Button>
            <Button variant="outline" onClick={() => navigate('/vendors')}>
              Add Vendor
            </Button>
            <Button variant="outline" onClick={() => navigate('/reports')}>
              Generate Report
            </Button>
          </div>
        </div>

        {/* Navigation Categories */}
        <div className="space-y-8">
          {financialArea.sections.map((section) => (
            <HubNavigationSection 
              key={section.id} 
              label={section.label} 
              items={section.items} 
            />
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
};


export default FinancialHub;