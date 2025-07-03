import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  ArrowLeft, 
  DollarSign, 
  TrendingUp,
  TrendingDown,
  Calculator,
  FileText,
  PlusCircle,
  Eye
} from 'lucide-react';

interface JobCost {
  id: string;
  date: string;
  description: string;
  labor_cost: number;
  material_cost: number;
  equipment_cost: number;
  other_cost: number;
  total_cost: number;
  labor_hours: number;
  cost_codes: { code: string; name: string };
  projects: { name: string };
}

interface ChangeOrder {
  id: string;
  change_order_number: string;
  title: string;
  description: string;
  amount: number;
  status: string;
  client_approved: boolean;
  internal_approved: boolean;
  created_at: string;
  projects: { name: string; client_name: string };
}

const FinancialDashboard = () => {
  const { user, userProfile, loading } = useAuth();
  const navigate = useNavigate();
  
  const [jobCosts, setJobCosts] = useState<JobCost[]>([]);
  const [changeOrders, setChangeOrders] = useState<ChangeOrder[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [financialSummary, setFinancialSummary] = useState({
    totalRevenue: 0,
    totalCosts: 0,
    grossProfit: 0,
    profitMargin: 0,
    activeChangeOrders: 0,
    pendingApprovals: 0
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
    
    if (!loading && user && userProfile && !userProfile.company_id) {
      navigate('/setup');
    }
    
    // Check role permissions
    if (!loading && userProfile && !['admin', 'project_manager', 'accounting', 'root_admin'].includes(userProfile.role)) {
      navigate('/dashboard');
      toast({
        variant: "destructive",
        title: "Access Denied",
        description: "You don't have permission to access financial data."
      });
      return;
    }
    
    if (userProfile?.company_id) {
      loadFinancialData();
    }
  }, [user, userProfile, loading, navigate]);

  const loadFinancialData = async () => {
    try {
      setLoadingData(true);
      
      // Load job costs
      const { data: jobCostsData, error: jobCostsError } = await supabase
        .from('job_costs')
        .select(`
          *,
          cost_codes(code, name),
          projects(name)
        `)
        .eq('projects.company_id', userProfile?.company_id)
        .order('date', { ascending: false })
        .limit(50);

      if (jobCostsError) throw jobCostsError;
      setJobCosts(jobCostsData || []);

      // Load change orders
      const { data: changeOrdersData, error: changeOrdersError } = await supabase
        .from('change_orders')
        .select(`
          *,
          projects(name, client_name, company_id)
        `)
        .eq('projects.company_id', userProfile?.company_id)
        .order('created_at', { ascending: false });

      if (changeOrdersError) throw changeOrdersError;
      setChangeOrders(changeOrdersData || []);

      // Calculate financial summary
      const totalCosts = jobCostsData?.reduce((sum, cost) => sum + (cost.total_cost || 0), 0) || 0;
      const totalChangeOrderValue = changeOrdersData?.reduce((sum, co) => sum + (co.amount || 0), 0) || 0;
      const activeChangeOrders = changeOrdersData?.filter(co => co.status === 'pending').length || 0;
      const pendingApprovals = changeOrdersData?.filter(co => !co.client_approved).length || 0;

      // Get project budgets for revenue calculation
      const { data: projectsData } = await supabase
        .from('projects')
        .select('budget')
        .eq('company_id', userProfile?.company_id);

      const totalRevenue = (projectsData?.reduce((sum, p) => sum + (p.budget || 0), 0) || 0) + totalChangeOrderValue;
      const grossProfit = totalRevenue - totalCosts;
      const profitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

      setFinancialSummary({
        totalRevenue,
        totalCosts,
        grossProfit,
        profitMargin,
        activeChangeOrders,
        pendingApprovals
      });

    } catch (error: any) {
      console.error('Error loading financial data:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load financial data"
      });
    } finally {
      setLoadingData(false);
    }
  };

  if (loading || loadingData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-construction-blue mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading financial data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/dashboard')}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
              <Separator orientation="vertical" className="h-6" />
              <div>
                <h1 className="text-xl font-semibold">Financial Management</h1>
                <p className="text-sm text-muted-foreground">Job costing, change orders, and financial analysis</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Financial Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6 mb-8">
          <Card className="lg:col-span-2">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                  <p className="text-2xl font-bold text-green-600">
                    ${financialSummary.totalRevenue.toLocaleString()}
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Costs</p>
                  <p className="text-2xl font-bold text-red-600">
                    ${financialSummary.totalCosts.toLocaleString()}
                  </p>
                </div>
                <Calculator className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Gross Profit</p>
                  <p className={`text-2xl font-bold ${financialSummary.grossProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ${financialSummary.grossProfit.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {financialSummary.profitMargin.toFixed(1)}% margin
                  </p>
                </div>
                {financialSummary.grossProfit >= 0 ? (
                  <TrendingUp className="h-8 w-8 text-green-600" />
                ) : (
                  <TrendingDown className="h-8 w-8 text-red-600" />
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="job-costing" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="job-costing">Job Costing</TabsTrigger>
            <TabsTrigger value="change-orders">Change Orders</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>

          <TabsContent value="job-costing" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Job Costing</h2>
              <Button>
                <PlusCircle className="h-4 w-4 mr-2" />
                Add Cost Entry
              </Button>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle>Recent Cost Entries</CardTitle>
                <CardDescription>Latest job costs across all projects</CardDescription>
              </CardHeader>
              <CardContent>
                {jobCosts.length === 0 ? (
                  <div className="text-center py-8">
                    <Calculator className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No job costs recorded yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {jobCosts.map((cost) => (
                      <div key={cost.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <h4 className="font-medium">{cost.projects?.name}</h4>
                            <Badge variant="outline">
                              {cost.cost_codes?.code} - {cost.cost_codes?.name}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{cost.description}</p>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                            <div>
                              <span className="text-muted-foreground">Labor:</span>
                              <span className="ml-1">${cost.labor_cost?.toLocaleString() || 0}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Materials:</span>
                              <span className="ml-1">${cost.material_cost?.toLocaleString() || 0}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Equipment:</span>
                              <span className="ml-1">${cost.equipment_cost?.toLocaleString() || 0}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Hours:</span>
                              <span className="ml-1">{cost.labor_hours || 0}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-lg">
                            ${cost.total_cost?.toLocaleString() || 0}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(cost.date).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="change-orders" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Change Orders</h2>
              <Button>
                <PlusCircle className="h-4 w-4 mr-2" />
                Create Change Order
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Active Change Orders</p>
                      <p className="text-2xl font-bold">{financialSummary.activeChangeOrders}</p>
                    </div>
                    <FileText className="h-8 w-8 text-construction-blue" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Pending Approvals</p>
                      <p className="text-2xl font-bold">{financialSummary.pendingApprovals}</p>
                    </div>
                    <Eye className="h-8 w-8 text-yellow-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Change Order History</CardTitle>
                <CardDescription>All change orders for your projects</CardDescription>
              </CardHeader>
              <CardContent>
                {changeOrders.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No change orders yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {changeOrders.map((changeOrder) => (
                      <div key={changeOrder.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <h4 className="font-medium">{changeOrder.title}</h4>
                            <Badge variant="outline">#{changeOrder.change_order_number}</Badge>
                            <Badge variant={changeOrder.status === 'approved' ? 'default' : 'secondary'}>
                              {changeOrder.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {changeOrder.projects?.name} - {changeOrder.projects?.client_name}
                          </p>
                          <p className="text-sm text-muted-foreground">{changeOrder.description}</p>
                          <div className="flex items-center space-x-4 mt-2 text-xs">
                            <span className={`${changeOrder.client_approved ? 'text-green-600' : 'text-yellow-600'}`}>
                              Client: {changeOrder.client_approved ? 'Approved' : 'Pending'}
                            </span>
                            <span className={`${changeOrder.internal_approved ? 'text-green-600' : 'text-yellow-600'}`}>
                              Internal: {changeOrder.internal_approved ? 'Approved' : 'Pending'}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-lg">
                            ${changeOrder.amount.toLocaleString()}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(changeOrder.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports" className="space-y-6">
            <h2 className="text-2xl font-bold">Financial Reports</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader>
                  <CardTitle className="text-lg">Profit & Loss</CardTitle>
                  <CardDescription>Revenue vs costs by project</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Current Margin:</span>
                      <span className={financialSummary.profitMargin >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {financialSummary.profitMargin.toFixed(1)}%
                      </span>
                    </div>
                    <Progress value={Math.max(0, Math.min(100, financialSummary.profitMargin))} />
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader>
                  <CardTitle className="text-lg">Cost Analysis</CardTitle>
                  <CardDescription>Breakdown by cost categories</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-construction-blue">
                      {jobCosts.length}
                    </div>
                    <p className="text-sm text-muted-foreground">Cost entries</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader>
                  <CardTitle className="text-lg">Cash Flow</CardTitle>
                  <CardDescription>Incoming vs outgoing funds</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-construction-blue">
                      ${(financialSummary.totalRevenue - financialSummary.totalCosts).toLocaleString()}
                    </div>
                    <p className="text-sm text-muted-foreground">Net flow</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default FinancialDashboard;