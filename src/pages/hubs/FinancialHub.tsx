import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight } from 'lucide-react';
import { dashboardAreas } from '@/components/navigation/NavigationConfig';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';

const FinancialHub = () => {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const [metrics, setMetrics] = useState({
    totalRevenue: 0,
    activePOs: 0,
    cashFlowProjections: 0,
    contractorPayments: 0
  });

  const financialArea = dashboardAreas.find(area => area.id === 'financial');
  
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

  const filterItemsByRole = (items: any[]) => {
    return items.filter(item => {
      return userProfile?.role === 'root_admin' || item.roles.includes(userProfile?.role || '');
    });
  };

  return (
    <DashboardLayout title={financialArea.title}>
      <div>
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
          {financialArea.subcategories.map((category) => {
            const visibleItems = filterItemsByRole(category.items);
            
            if (visibleItems.length === 0) return null;
            
            return (
              <div key={category.label}>
                <h2 className="text-lg font-semibold mb-4">{category.label}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {visibleItems.map((item) => (
                    <Card 
                      key={item.url} 
                      className="hover:shadow-md transition-shadow cursor-pointer group"
                      onClick={() => navigate(item.url)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="h-10 w-10 bg-construction-blue/10 rounded-lg flex items-center justify-center">
                              <item.icon className="h-5 w-5 text-construction-blue" />
                            </div>
                            <div>
                              <CardTitle className="text-base">{item.title}</CardTitle>
                              {item.badge && (
                                <Badge variant="destructive" className="text-xs mt-1">
                                  {item.badge}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <CardDescription>
                          {getItemDescription(item.title)}
                        </CardDescription>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
};

// Helper function to get descriptions for items
const getItemDescription = (title: string): string => {
  const descriptions: { [key: string]: string } = {
    'Financial Dashboard': 'Overview of financial performance and KPIs',
    'Reports & Analytics': 'Generate financial reports and analytics',
    'Purchase Orders': 'Create and manage purchase orders',
    'Vendors': 'Manage vendor relationships and contacts',
    'QuickBooks Routing': 'Sync financial data with QuickBooks'
  };
  
  return descriptions[title] || 'Access this feature';
};

export default FinancialHub;