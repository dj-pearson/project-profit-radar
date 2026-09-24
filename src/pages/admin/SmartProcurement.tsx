import { toast } from 'sonner';
import { useSmartProcurement } from '@/hooks/useSmartProcurement';
import { ErrorState } from '@/components/common/ErrorState';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ShoppingCart, TrendingUp, DollarSign, Package, CheckCircle2, AlertTriangle } from 'lucide-react';
import { AIGeneratedBadge } from '@/components/ui/ai-generated-badge';

export function SmartProcurement() {
  const procurement = useSmartProcurement();
  const forecasts = procurement.data?.forecasts ?? [];
  const suppliers = procurement.data?.suppliers ?? [];
  const recommendations = procurement.data?.recommendations ?? [];
  // Figures only once a read has come back; a load or a failure shows '--', not 0.
  const loaded = !!procurement.data && !procurement.error;

  const approveRecommendation = async (recId: string) => {
    try {
      await procurement.approve(recId);
      toast.success('Recommendation approved');
    } catch (error) {
      toast.error('Could not approve that recommendation', {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Smart Procurement
          </h1>
          <p className="text-muted-foreground mt-1">
            AI-powered material forecasting and supplier optimization
          </p>
        </div>
        <ShoppingCart className="h-12 w-12 text-green-600 opacity-50" />
      </div>

      {procurement.error && (
        <ErrorState
          inline
          title="Procurement data could not be loaded"
          error={procurement.error}
          onRetry={() => { void procurement.refetch(); }}
        />
      )}
      {procurement.data && !procurement.data.tenantId && (
        <p className="text-sm text-muted-foreground">
          Your profile is not linked to a tenant, so there are no forecasts, suppliers or recommendations to show.
        </p>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Package className="h-4 w-4" />
              Active Forecasts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loaded ? forecasts.length : '--'}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              Suppliers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loaded ? new Set(suppliers.map(s => s.supplier_name)).size : '--'}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Pending Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{loaded ? recommendations.length : '--'}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Potential Savings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {loaded ? `$${recommendations.reduce((sum, r) => sum + (r.estimated_savings || 0), 0).toLocaleString()}` : '--'}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="recommendations" className="space-y-4">
        <TabsList>
          <TabsTrigger value="recommendations">Purchase Recommendations</TabsTrigger>
          <TabsTrigger value="forecasts">Material Forecasts</TabsTrigger>
          <TabsTrigger value="suppliers">Supplier Catalog</TabsTrigger>
        </TabsList>

        {/* Recommendations Tab */}
        <TabsContent value="recommendations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Purchase Recommendations
                <AIGeneratedBadge />
              </CardTitle>
              <CardDescription>
                Purchasing suggestions based on forecasts and supplier data. Review before ordering.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {procurement.isLoading ? (
                  <Skeleton className="h-16 w-full" />
                ) : recommendations.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    {procurement.error ? 'Could not be loaded; see the error above.' : 'No pending recommendations'}
                  </p>
                ) : (
                  recommendations.map((rec) => (
                    <div key={rec.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Package className="h-4 w-4 text-muted-foreground" />
                          <p className="font-semibold">{rec.material_name}</p>
                          <Badge variant="outline">
                            {rec.recommended_quantity} units
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Supplier: {rec.supplier_catalog?.supplier_name || 'Unknown'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Order by: {new Date(rec.recommended_order_date).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Estimated Cost</p>
                          <p className="text-lg font-bold">${rec.estimated_cost?.toLocaleString()}</p>
                        </div>
                        {rec.estimated_savings > 0 && (
                          <div className="text-right">
                            <p className="text-sm text-muted-foreground">Savings</p>
                            <p className="text-lg font-bold text-green-600">
                              ${rec.estimated_savings.toLocaleString()}
                            </p>
                          </div>
                        )}
                        <Button size="sm" onClick={() => approveRecommendation(rec.id)}>
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                          Approve
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Forecasts Tab */}
        <TabsContent value="forecasts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Material Demand Forecasts</CardTitle>
              <CardDescription>
                AI-predicted material needs based on project schedules
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {procurement.isLoading ? (
                  <Skeleton className="h-16 w-full" />
                ) : forecasts.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    {procurement.error ? 'Could not be loaded; see the error above.' : 'No active forecasts'}
                  </p>
                ) : (
                  forecasts.map((forecast) => (
                    <div key={forecast.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <TrendingUp className="h-4 w-4 text-blue-600" />
                          <p className="font-semibold">{forecast.material_name}</p>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {forecast.forecast_quantity} {forecast.forecast_unit}
                        </p>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Confidence</p>
                          <p className="font-bold">{forecast.confidence_score}%</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Lead Time</p>
                          <p className="font-bold">{forecast.estimated_lead_time_days}d</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Order By</p>
                          <p className="font-bold">
                            {new Date(forecast.recommended_order_date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Suppliers Tab */}
        <TabsContent value="suppliers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Supplier Catalog</CardTitle>
              <CardDescription>
                Manage supplier pricing and availability data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {procurement.isLoading ? (
                  <Skeleton className="h-16 w-full" />
                ) : suppliers.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    {procurement.error ? 'Could not be loaded; see the error above.' : 'No suppliers configured'}
                  </p>
                ) : (
                  suppliers.map((supplier) => (
                    <div key={supplier.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <p className="font-semibold">{supplier.supplier_name}</p>
                        <p className="text-sm text-muted-foreground">{supplier.material_name}</p>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Price</p>
                          <p className="font-bold">${supplier.unit_price.toLocaleString()}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Lead Time</p>
                          <p className="font-bold">{supplier.lead_time_days}d</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Rating</p>
                          <p className="font-bold">{supplier.supplier_rating?.toFixed(1) || 'N/A'} ★</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default SmartProcurement;
