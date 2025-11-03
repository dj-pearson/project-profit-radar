import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Briefcase,
  BarChart3,
  PieChart,
  Activity
} from 'lucide-react';

interface FinancialSnapshot {
  total_revenue: number;
  total_costs: number;
  gross_profit: number;
  profit_margin: number;
  cash_on_hand: number;
  accounts_receivable: number;
  active_projects_count: number;
}

interface KPIMetric {
  metric_name: string;
  metric_value: number;
  metric_target: number;
  change_percentage: number;
  trend: string;
}

export function AdvancedDashboards() {
  const { user } = useAuth();
  const [snapshot, setSnapshot] = useState<FinancialSnapshot | null>(null);
  const [kpis, setKpis] = useState<KPIMetric[]>([]);

  useEffect(() => {
    loadFinancialSnapshot();
    loadKPIs();
  }, [user]);

  const loadFinancialSnapshot = async () => {
    try {
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('tenant_id')
        .eq('id', user?.id)
        .single();

      if (!userProfile?.tenant_id) return;

      const { data, error } = await supabase
        .from('financial_snapshots')
        .select('*')
        .eq('tenant_id', userProfile.tenant_id)
        .order('snapshot_date', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setSnapshot(data);
    } catch (error) {
      console.error('Error loading snapshot:', error);
    }
  };

  const loadKPIs = async () => {
    try {
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('tenant_id')
        .eq('id', user?.id)
        .single();

      if (!userProfile?.tenant_id) return;

      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('kpi_metrics')
        .select('*')
        .eq('tenant_id', userProfile.tenant_id)
        .eq('metric_date', today);

      if (error) throw error;
      setKpis(data || []);
    } catch (error) {
      console.error('Error loading KPIs:', error);
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'down': return <TrendingDown className="h-4 w-4 text-red-600" />;
      default: return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            Advanced Dashboards
          </h1>
          <p className="text-muted-foreground mt-1">
            Real-time financial insights and performance metrics
          </p>
        </div>
        <BarChart3 className="h-12 w-12 text-purple-600 opacity-50" />
      </div>

      <Tabs defaultValue="financial" className="space-y-4">
        <TabsList>
          <TabsTrigger value="financial">Financial Overview</TabsTrigger>
          <TabsTrigger value="kpis">Key Performance Indicators</TabsTrigger>
        </TabsList>

        {/* Financial Tab */}
        <TabsContent value="financial" className="space-y-4">
          <div className="grid grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Total Revenue
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${snapshot?.total_revenue?.toLocaleString() || 0}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Costs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${snapshot?.total_costs?.toLocaleString() || 0}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Gross Profit</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  ${snapshot?.gross_profit?.toLocaleString() || 0}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Profit Margin</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {snapshot?.profit_margin?.toFixed(1) || 0}%
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Cash Position</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">
                  ${snapshot?.cash_on_hand?.toLocaleString() || 0}
                </div>
                <p className="text-sm text-muted-foreground mt-2">Available Cash</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Receivables</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-orange-600">
                  ${snapshot?.accounts_receivable?.toLocaleString() || 0}
                </div>
                <p className="text-sm text-muted-foreground mt-2">Outstanding</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Active Projects</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {snapshot?.active_projects_count || 0}
                </div>
                <p className="text-sm text-muted-foreground mt-2">In Progress</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* KPIs Tab */}
        <TabsContent value="kpis" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {kpis.length === 0 ? (
              <Card className="col-span-2">
                <CardContent className="flex items-center justify-center py-12">
                  <p className="text-muted-foreground">No KPI data available</p>
                </CardContent>
              </Card>
            ) : (
              kpis.map((kpi, idx) => (
                <Card key={idx}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>{kpi.metric_name}</span>
                      {getTrendIcon(kpi.trend)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-end justify-between">
                      <div>
                        <div className="text-3xl font-bold">{kpi.metric_value.toLocaleString()}</div>
                        <p className="text-sm text-muted-foreground mt-1">
                          Target: {kpi.metric_target.toLocaleString()}
                        </p>
                      </div>
                      <div className={`text-lg font-semibold ${kpi.change_percentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {kpi.change_percentage >= 0 ? '+' : ''}{kpi.change_percentage.toFixed(1)}%
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
