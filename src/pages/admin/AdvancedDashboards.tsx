import { useAdvancedDashboards } from '@/hooks/useAdvancedDashboards';
import { ErrorState } from '@/components/common/ErrorState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, TrendingDown, DollarSign, BarChart3, Activity } from 'lucide-react';

const money = (n: number | null | undefined) => (n == null ? '--' : `$${n.toLocaleString()}`);
const count = (n: number | null | undefined) => (n == null ? '--' : n.toLocaleString());

export function AdvancedDashboards() {
  const dashboards = useAdvancedDashboards();
  const snapshot = dashboards.data?.snapshot ?? null;
  const kpis = dashboards.data?.kpis ?? [];

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
          <h1 className="text-3xl font-bold text-foreground">
            Advanced Dashboards
          </h1>
          <p className="text-muted-foreground mt-1">
            Real-time financial insights and performance metrics
          </p>
        </div>
        <BarChart3 className="h-12 w-12 text-purple-600 opacity-50" />
      </div>

      {dashboards.error && (
        <ErrorState
          inline
          title="Dashboard data could not be loaded"
          error={dashboards.error}
          onRetry={() => { void dashboards.refetch(); }}
        />
      )}
      {dashboards.data && !dashboards.data.snapshot && (
        <p className="text-sm text-muted-foreground">
          {dashboards.data.tenantId
            ? 'No financial snapshot has been taken yet, so these figures are blank rather than zero.'
            : 'Your profile is not linked to a tenant, so there are no snapshots to show.'}
        </p>
      )}

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
                  {money(snapshot?.total_revenue)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Costs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {money(snapshot?.total_costs)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Gross Profit</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {money(snapshot?.gross_profit)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Profit Margin</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {snapshot?.profit_margin == null ? '--' : `${snapshot.profit_margin.toFixed(1)}%`}
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
                  {money(snapshot?.cash_on_hand)}
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
                  {money(snapshot?.accounts_receivable)}
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
                  {count(snapshot?.active_projects_count)}
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
                  <p className="text-muted-foreground">
                    {dashboards.error ? 'KPIs could not be loaded; see the error above.' : 'No KPI data available'}
                  </p>
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

export default AdvancedDashboards;
