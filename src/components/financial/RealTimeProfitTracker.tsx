import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCw
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';

interface ProjectFinancials {
  project_id: string;
  project_name: string;
  total_budget: number;
  actual_costs: number;
  revenue: number;
  profit_margin: number;
  margin_status: 'healthy' | 'warning' | 'critical';
  last_updated: string;
  trend: 'up' | 'down' | 'stable';
}

interface CompanyMetrics {
  total_active_projects: number;
  average_margin: number;
  healthy_projects: number;
  at_risk_projects: number;
  total_revenue: number;
  total_profit: number;
}

export const RealTimeProfitTracker = () => {
  const [projects, setProjects] = useState<ProjectFinancials[]>([]);
  const [metrics, setMetrics] = useState<CompanyMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    loadFinancialData();

    // Set up real-time subscription
    const subscription = supabase
      .channel('financial_updates')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'financial_records' },
        () => {
          if (autoRefresh) {
            loadFinancialData();
          }
        }
      )
      .subscribe();

    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      if (autoRefresh) {
        loadFinancialData();
      }
    }, 30000);

    return () => {
      subscription.unsubscribe();
      clearInterval(interval);
    };
  }, [autoRefresh]);

  const loadFinancialData = async () => {
    try {
      // In production, this would call your edge function or query
      // For now, simulating with realistic data
      const mockProjects: ProjectFinancials[] = [
        {
          project_id: '1',
          project_name: 'Downtown Office Renovation',
          total_budget: 485000,
          actual_costs: 412500,
          revenue: 485000,
          profit_margin: 14.9,
          margin_status: 'healthy',
          last_updated: new Date().toISOString(),
          trend: 'stable'
        },
        {
          project_id: '2',
          project_name: 'Residential Kitchen Remodel',
          total_budget: 87500,
          actual_costs: 79200,
          revenue: 87500,
          profit_margin: 9.5,
          margin_status: 'warning',
          last_updated: new Date().toISOString(),
          trend: 'down'
        },
        {
          project_id: '3',
          project_name: 'Warehouse Expansion',
          total_budget: 1250000,
          actual_costs: 987500,
          revenue: 1250000,
          profit_margin: 21.0,
          margin_status: 'healthy',
          last_updated: new Date().toISOString(),
          trend: 'up'
        },
        {
          project_id: '4',
          project_name: 'Medical Office Build-Out',
          total_budget: 325000,
          actual_costs: 298750,
          revenue: 325000,
          profit_margin: 8.1,
          margin_status: 'critical',
          last_updated: new Date().toISOString(),
          trend: 'down'
        }
      ];

      const totalProjects = mockProjects.length;
      const avgMargin = mockProjects.reduce((sum, p) => sum + p.profit_margin, 0) / totalProjects;
      const healthyCount = mockProjects.filter(p => p.margin_status === 'healthy').length;
      const atRiskCount = mockProjects.filter(p => p.margin_status === 'warning' || p.margin_status === 'critical').length;
      const totalRev = mockProjects.reduce((sum, p) => sum + p.revenue, 0);
      const totalCosts = mockProjects.reduce((sum, p) => sum + p.actual_costs, 0);

      setProjects(mockProjects);
      setMetrics({
        total_active_projects: totalProjects,
        average_margin: avgMargin,
        healthy_projects: healthyCount,
        at_risk_projects: atRiskCount,
        total_revenue: totalRev,
        total_profit: totalRev - totalCosts
      });
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error loading financial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMarginColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-50 border-green-200';
      case 'warning': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getMarginLabel = (margin: number) => {
    if (margin >= 15) return 'Excellent';
    if (margin >= 10) return 'Good';
    if (margin >= 5) return 'Fair';
    return 'At Risk';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-8 w-8 animate-spin text-construction-orange" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Live Status */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-construction-dark flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-construction-orange" />
            Real-Time Profit Intelligence
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Live profit margins • Updates every 30s • Last updated: {formatTime(lastUpdate)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={autoRefresh ? "default" : "outline"} className="animate-pulse">
            <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
            LIVE
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            {autoRefresh ? 'Pause' : 'Resume'} Updates
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={loadFinancialData}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Now
          </Button>
        </div>
      </div>

      {/* Company-Wide Metrics */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-2 border-construction-orange/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Average Margin
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-construction-orange">
                {metrics.average_margin.toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Across {metrics.total_active_projects} active projects
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Healthy Projects
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600 flex items-center gap-2">
                {metrics.healthy_projects}
                <CheckCircle className="h-6 w-6" />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {((metrics.healthy_projects / metrics.total_active_projects) * 100).toFixed(0)}% of portfolio
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                At-Risk Projects
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-yellow-600 flex items-center gap-2">
                {metrics.at_risk_projects}
                <AlertTriangle className="h-6 w-6" />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Require immediate attention
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Profit (YTD)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-construction-dark">
                {formatCurrency(metrics.total_profit)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                On {formatCurrency(metrics.total_revenue)} revenue
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Project-Level Details */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList>
          <TabsTrigger value="all">All Projects ({projects.length})</TabsTrigger>
          <TabsTrigger value="healthy">
            Healthy ({projects.filter(p => p.margin_status === 'healthy').length})
          </TabsTrigger>
          <TabsTrigger value="warning">
            Warning ({projects.filter(p => p.margin_status === 'warning').length})
          </TabsTrigger>
          <TabsTrigger value="critical">
            Critical ({projects.filter(p => p.margin_status === 'critical').length})
          </TabsTrigger>
        </TabsList>

        {['all', 'healthy', 'warning', 'critical'].map(tab => (
          <TabsContent key={tab} value={tab} className="space-y-4">
            {projects
              .filter(p => tab === 'all' || p.margin_status === tab)
              .map((project) => (
                <Card key={project.project_id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{project.project_name}</CardTitle>
                        <CardDescription className="flex items-center gap-2 mt-1">
                          <Clock className="h-3 w-3" />
                          Last updated: {new Date(project.last_updated).toLocaleTimeString()}
                        </CardDescription>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Badge className={getMarginColor(project.margin_status)}>
                          {project.profit_margin.toFixed(1)}% • {getMarginLabel(project.profit_margin)}
                        </Badge>
                        {project.trend === 'up' && (
                          <div className="flex items-center text-green-600 text-sm">
                            <TrendingUp className="h-4 w-4 mr-1" />
                            Improving
                          </div>
                        )}
                        {project.trend === 'down' && (
                          <div className="flex items-center text-red-600 text-sm">
                            <TrendingDown className="h-4 w-4 mr-1" />
                            Declining
                          </div>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Financial Breakdown */}
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Budget</p>
                        <p className="font-semibold">{formatCurrency(project.total_budget)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Actual Costs</p>
                        <p className="font-semibold">{formatCurrency(project.actual_costs)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Profit</p>
                        <p className="font-semibold text-construction-orange">
                          {formatCurrency(project.revenue - project.actual_costs)}
                        </p>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Cost vs Budget</span>
                        <span className="font-medium">
                          {((project.actual_costs / project.total_budget) * 100).toFixed(1)}%
                        </span>
                      </div>
                      <Progress
                        value={(project.actual_costs / project.total_budget) * 100}
                        className="h-2"
                      />
                    </div>

                    {/* Alerts for At-Risk Projects */}
                    {project.margin_status !== 'healthy' && (
                      <div className={`p-3 rounded-lg border ${getMarginColor(project.margin_status)}`}>
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                          <div className="text-sm">
                            {project.margin_status === 'critical' && (
                              <>
                                <p className="font-semibold">Critical: Margin below 10%</p>
                                <p className="mt-1">
                                  This project needs immediate attention. Consider cost reduction measures or scope adjustments.
                                </p>
                              </>
                            )}
                            {project.margin_status === 'warning' && (
                              <>
                                <p className="font-semibold">Warning: Margin declining</p>
                                <p className="mt-1">
                                  Monitor costs closely. Current margin is below your 15% target.
                                </p>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default RealTimeProfitTracker;
