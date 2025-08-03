import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, TrendingUp, TrendingDown, RefreshCw, Search, Plus, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface MaterialItem {
  id: string;
  name: string;
  category: string;
  supplier: string;
  current_price: number;
  last_price: number;
  price_change: number;
  sku: string;
  unit: string;
  last_updated: string;
  price_alerts_enabled: boolean;
  alert_threshold: number;
}

interface Supplier {
  id: string;
  name: string;
  api_endpoint: string;
  api_key_configured: boolean;
  last_sync: string;
  status: 'active' | 'inactive' | 'error';
}

export default function MaterialCostIntegration() {
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncInProgress, setSyncInProgress] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddMaterial, setShowAddMaterial] = useState(false);
  const [newMaterial, setNewMaterial] = useState({
    name: '',
    category: '',
    supplier: '',
    sku: '',
    unit: 'each',
    alert_threshold: 10
  });

  useEffect(() => {
    loadMaterials();
    loadSuppliers();
  }, []);

  const loadMaterials = async () => {
    try {
      const { data, error } = await supabase
        .from('material_costs')
        .select('*')
        .order('name');

      if (error) throw error;

      // Mock data for demonstration
      const mockMaterials: MaterialItem[] = [
        {
          id: '1',
          name: '2x4 Lumber 8ft',
          category: 'Lumber',
          supplier: 'Home Depot',
          current_price: 4.87,
          last_price: 4.65,
          price_change: 4.7,
          sku: 'HD-2X4-8',
          unit: 'piece',
          last_updated: new Date().toISOString(),
          price_alerts_enabled: true,
          alert_threshold: 10
        },
        {
          id: '2',
          name: 'Concrete Mix 80lb',
          category: 'Concrete',
          supplier: 'Lowes',
          current_price: 6.48,
          last_price: 6.75,
          price_change: -4.0,
          sku: 'LW-CON-80',
          unit: 'bag',
          last_updated: new Date().toISOString(),
          price_alerts_enabled: true,
          alert_threshold: 15
        },
        {
          id: '3',
          name: 'Drywall Sheet 4x8',
          category: 'Drywall',
          supplier: 'Home Depot',
          current_price: 15.98,
          last_price: 14.50,
          price_change: 10.2,
          sku: 'HD-DRY-48',
          unit: 'sheet',
          last_updated: new Date().toISOString(),
          price_alerts_enabled: true,
          alert_threshold: 8
        }
      ];

      setMaterials(data || mockMaterials);
    } catch (error) {
      console.error('Error loading materials:', error);
      toast.error('Failed to load material costs');
    } finally {
      setLoading(false);
    }
  };

  const loadSuppliers = async () => {
    try {
      const { data, error } = await supabase
        .from('material_suppliers')
        .select('*')
        .order('name');

      if (error) throw error;

      // Mock data for demonstration
      const mockSuppliers: Supplier[] = [
        {
          id: '1',
          name: 'Home Depot',
          api_endpoint: 'https://api.homedepot.com/v1',
          api_key_configured: true,
          last_sync: new Date().toISOString(),
          status: 'active'
        },
        {
          id: '2',
          name: 'Lowes',
          api_endpoint: 'https://api.lowes.com/v1',
          api_key_configured: true,
          last_sync: new Date().toISOString(),
          status: 'active'
        },
        {
          id: '3',
          name: 'Menards',
          api_endpoint: 'https://api.menards.com/v1',
          api_key_configured: false,
          last_sync: '',
          status: 'inactive'
        }
      ];

      setSuppliers(data || mockSuppliers);
    } catch (error) {
      console.error('Error loading suppliers:', error);
      toast.error('Failed to load suppliers');
    }
  };

  const syncPrices = async (supplierId?: string) => {
    setSyncInProgress(true);
    try {
      // Simulate API sync
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Update materials with new prices
      const updatedMaterials = materials.map(material => {
        if (!supplierId || material.supplier === getSupplierName(supplierId)) {
          const priceChange = (Math.random() - 0.5) * 0.5; // Random price change
          const newPrice = Number((material.current_price * (1 + priceChange)).toFixed(2));
          return {
            ...material,
            last_price: material.current_price,
            current_price: newPrice,
            price_change: Number(((newPrice - material.current_price) / material.current_price * 100).toFixed(1)),
            last_updated: new Date().toISOString()
          };
        }
        return material;
      });

      setMaterials(updatedMaterials);
      toast.success(`Prices synced successfully${supplierId ? ` for ${getSupplierName(supplierId)}` : ''}`);
    } catch (error) {
      console.error('Error syncing prices:', error);
      toast.error('Failed to sync prices');
    } finally {
      setSyncInProgress(false);
    }
  };

  const getSupplierName = (supplierId: string) => {
    return suppliers.find(s => s.id === supplierId)?.name || 'Unknown';
  };

  const filteredMaterials = materials.filter(material => {
    const matchesSearch = material.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         material.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSupplier = selectedSupplier === 'all' || material.supplier === getSupplierName(selectedSupplier);
    return matchesSearch && matchesSupplier;
  });

  const addMaterial = async () => {
    try {
      const materialData = {
        ...newMaterial,
        id: Date.now().toString(),
        current_price: 0,
        last_price: 0,
        price_change: 0,
        last_updated: new Date().toISOString(),
        price_alerts_enabled: true
      };

      const { error } = await supabase
        .from('material_costs')
        .insert([materialData]);

      if (error) throw error;

      setMaterials([...materials, materialData]);
      setNewMaterial({
        name: '',
        category: '',
        supplier: '',
        sku: '',
        unit: 'each',
        alert_threshold: 10
      });
      setShowAddMaterial(false);
      toast.success('Material added successfully');
    } catch (error) {
      console.error('Error adding material:', error);
      toast.error('Failed to add material');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading material costs...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Material Cost Integration</h2>
          <p className="text-muted-foreground">Live material pricing from major suppliers</p>
        </div>
        <Button onClick={() => syncPrices()} disabled={syncInProgress}>
          <RefreshCw className={`w-4 h-4 mr-2 ${syncInProgress ? 'animate-spin' : ''}`} />
          {syncInProgress ? 'Syncing...' : 'Sync All Prices'}
        </Button>
      </div>

      {/* Supplier Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {suppliers.map((supplier) => (
          <Card key={supplier.id}>
            <CardContent className="p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-medium">{supplier.name}</h3>
                  <Badge variant={supplier.status === 'active' ? 'default' : 'secondary'}>
                    {supplier.status}
                  </Badge>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => syncPrices(supplier.id)}
                  disabled={syncInProgress || supplier.status !== 'active'}
                >
                  <RefreshCw className={`w-3 h-3 ${syncInProgress ? 'animate-spin' : ''}`} />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Last sync: {supplier.last_sync ? new Date(supplier.last_sync).toLocaleDateString() : 'Never'}
              </p>
              {!supplier.api_key_configured && (
                <div className="flex items-center mt-2 text-amber-600">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  <span className="text-xs">API key not configured</span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="materials" className="w-full">
        <TabsList>
          <TabsTrigger value="materials">Material Costs</TabsTrigger>
          <TabsTrigger value="alerts">Price Alerts</TabsTrigger>
          <TabsTrigger value="analytics">Cost Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="materials" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <Label htmlFor="search">Search Materials</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="search"
                      placeholder="Search by name or SKU..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="supplier">Filter by Supplier</Label>
                  <select
                    id="supplier"
                    value={selectedSupplier}
                    onChange={(e) => setSelectedSupplier(e.target.value)}
                    className="w-full px-3 py-2 border border-input rounded-md"
                  >
                    <option value="all">All Suppliers</option>
                    {suppliers.map((supplier) => (
                      <option key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end">
                  <Button onClick={() => setShowAddMaterial(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Material
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Materials List */}
          <Card>
            <CardHeader>
              <CardTitle>Material Pricing ({filteredMaterials.length} items)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredMaterials.map((material) => (
                  <div key={material.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium">{material.name}</h3>
                        <Badge variant="outline">{material.category}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {material.supplier} • SKU: {material.sku} • Unit: {material.unit}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold">
                        ${material.current_price.toFixed(2)}
                      </div>
                      <div className="flex items-center gap-1">
                        {material.price_change > 0 ? (
                          <TrendingUp className="w-3 h-3 text-red-500" />
                        ) : material.price_change < 0 ? (
                          <TrendingDown className="w-3 h-3 text-green-500" />
                        ) : null}
                        <span className={`text-sm ${
                          material.price_change > 0 ? 'text-red-500' : 
                          material.price_change < 0 ? 'text-green-500' : 
                          'text-muted-foreground'
                        }`}>
                          {material.price_change > 0 ? '+' : ''}{material.price_change}%
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Updated: {new Date(material.last_updated).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <Button size="sm" variant="outline">
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button size="sm" variant="outline">
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Price Alert Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Configure automatic alerts when material prices change beyond your threshold.
              </p>
              <div className="space-y-4">
                {materials.filter(m => m.price_alerts_enabled).map((material) => (
                  <div key={material.id} className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <span className="font-medium">{material.name}</span>
                      <p className="text-sm text-muted-foreground">Alert threshold: ±{material.alert_threshold}%</p>
                    </div>
                    <Badge variant={Math.abs(material.price_change) > material.alert_threshold ? 'destructive' : 'default'}>
                      {Math.abs(material.price_change) > material.alert_threshold ? 'Alert Triggered' : 'Within Range'}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-green-600">-2.3%</div>
                <p className="text-sm text-muted-foreground">Average price change (7 days)</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold">12</div>
                <p className="text-sm text-muted-foreground">Price alerts triggered</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold">$2,847</div>
                <p className="text-sm text-muted-foreground">Estimated savings this month</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Add Material Modal */}
      {showAddMaterial && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>Add New Material</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Material Name</Label>
                <Input
                  id="name"
                  value={newMaterial.name}
                  onChange={(e) => setNewMaterial({...newMaterial, name: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  value={newMaterial.category}
                  onChange={(e) => setNewMaterial({...newMaterial, category: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="supplier">Supplier</Label>
                <select
                  id="supplier"
                  value={newMaterial.supplier}
                  onChange={(e) => setNewMaterial({...newMaterial, supplier: e.target.value})}
                  className="w-full px-3 py-2 border border-input rounded-md"
                >
                  <option value="">Select Supplier</option>
                  {suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.name}>
                      {supplier.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="sku">SKU</Label>
                <Input
                  id="sku"
                  value={newMaterial.sku}
                  onChange={(e) => setNewMaterial({...newMaterial, sku: e.target.value})}
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setShowAddMaterial(false)}>
                  Cancel
                </Button>
                <Button onClick={addMaterial}>
                  Add Material
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}