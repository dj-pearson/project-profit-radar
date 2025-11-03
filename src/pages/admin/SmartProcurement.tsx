import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ShoppingCart,
  TrendingUp,
  DollarSign,
  Package,
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle
} from 'lucide-react';

interface MaterialForecast {
  id: string;
  material_name: string;
  forecast_quantity: number;
  forecast_unit: string;
  confidence_score: number;
  estimated_lead_time_days: number;
  recommended_order_date: string;
}

interface SupplierCatalog {
  id: string;
  supplier_name: string;
  material_name: string;
  unit_price: number;
  lead_time_days: number;
  supplier_rating: number;
}

interface PurchaseRecommendation {
  id: string;
  material_name: string;
  recommended_quantity: number;
  estimated_cost: number;
  estimated_savings: number;
  recommended_order_date: string;
  status: string;
  supplier_catalog: { supplier_name: string };
}

export function SmartProcurement() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [forecasts, setForecasts] = useState<MaterialForecast[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierCatalog[]>([]);
  const [recommendations, setRecommendations] = useState<PurchaseRecommendation[]>([]);

  useEffect(() => {
    loadForecasts();
    loadSuppliers();
    loadRecommendations();
  }, [user]);

  const loadForecasts = async () => {
    try {
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('tenant_id')
        .eq('id', user?.id)
        .single();

      if (!userProfile?.tenant_id) return;

      const { data, error } = await supabase
        .from('material_forecasts')
        .select('*')
        .eq('tenant_id', userProfile.tenant_id)
        .gte('forecast_date', new Date().toISOString().split('T')[0])
        .order('forecast_date')
        .limit(20);

      if (error) throw error;
      setForecasts(data || []);
    } catch (error) {
      console.error('Error loading forecasts:', error);
    }
  };

  const loadSuppliers = async () => {
    try {
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('tenant_id')
        .eq('id', user?.id)
        .single();

      if (!userProfile?.tenant_id) return;

      const { data, error } = await supabase
        .from('supplier_catalog')
        .select('*')
        .eq('tenant_id', userProfile.tenant_id)
        .eq('is_active', true)
        .order('material_name');

      if (error) throw error;
      setSuppliers(data || []);
    } catch (error) {
      console.error('Error loading suppliers:', error);
    }
  };

  const loadRecommendations = async () => {
    try {
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('tenant_id')
        .eq('id', user?.id)
        .single();

      if (!userProfile?.tenant_id) return;

      const { data, error } = await supabase
        .from('purchase_recommendations')
        .select(`
          *,
          supplier_catalog (
            supplier_name
          )
        `)
        .eq('tenant_id', userProfile.tenant_id)
        .eq('status', 'pending')
        .order('recommended_order_date');

      if (error) throw error;
      setRecommendations(data as any || []);
    } catch (error) {
      console.error('Error loading recommendations:', error);
    }
  };

  const approveRecommendation = async (recId: string) => {
    try {
      const { error } = await supabase
        .from('purchase_recommendations')
        .update({ status: 'approved' })
        .eq('id', recId);

      if (error) throw error;
      loadRecommendations();
    } catch (error) {
      console.error('Error approving recommendation:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'ordered': return 'bg-blue-100 text-blue-800';
      case 'received': return 'bg-gray-100 text-gray-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
            Smart Procurement
          </h1>
          <p className="text-muted-foreground mt-1">
            AI-powered material forecasting and supplier optimization
          </p>
        </div>
        <ShoppingCart className="h-12 w-12 text-green-600 opacity-50" />
      </div>

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
            <div className="text-2xl font-bold">{forecasts.length}</div>
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
            <div className="text-2xl font-bold">{new Set(suppliers.map(s => s.supplier_name)).size}</div>
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
            <div className="text-2xl font-bold text-orange-600">{recommendations.length}</div>
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
              ${recommendations.reduce((sum, r) => sum + (r.estimated_savings || 0), 0).toLocaleString()}
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
              <CardTitle>AI-Generated Purchase Recommendations</CardTitle>
              <CardDescription>
                Optimized purchasing decisions based on forecasts and supplier data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recommendations.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No pending recommendations
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
                {forecasts.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No active forecasts
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
                {suppliers.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No suppliers configured
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
