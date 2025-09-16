import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Package, TrendingDown, TrendingUp, AlertTriangle, 
  CheckCircle, Truck, MapPin, Clock, DollarSign, Barcode
} from 'lucide-react';

interface Material {
  id: string;
  name: string;
  category: 'lumber' | 'concrete' | 'steel' | 'electrical' | 'plumbing' | 'other';
  sku: string;
  unit: string;
  currentStock: number;
  minimumStock: number;
  maximumStock: number;
  unitCost: number;
  totalValue: number;
  supplier: string;
  location: string;
  lastRestocked: Date;
  expirationDate?: Date;
}

interface MaterialOrder {
  id: string;
  orderId: string;
  supplierId: string;
  supplierName: string;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  orderDate: Date;
  expectedDelivery: Date;
  totalAmount: number;
  items: MaterialOrderItem[];
}

interface MaterialOrderItem {
  materialId: string;
  materialName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface MaterialUsage {
  id: string;
  materialId: string;
  projectId: string;
  projectName: string;
  quantityUsed: number;
  usedBy: string;
  usageDate: Date;
  costCentre: string;
}

export const MaterialTrackingSystem: React.FC = () => {
  const [materials, setMaterials] = useState<Material[]>([
    {
      id: '1',
      name: '2x4 Lumber - 8ft',
      category: 'lumber',
      sku: 'LMB-2X4-8',
      unit: 'piece',
      currentStock: 150,
      minimumStock: 50,
      maximumStock: 500,
      unitCost: 8.50,
      totalValue: 1275,
      supplier: 'ABC Building Supply',
      location: 'Warehouse A - Bay 3',
      lastRestocked: new Date('2024-01-10')
    },
    {
      id: '2',
      name: 'Portland Cement - 50lb',
      category: 'concrete',
      sku: 'CNT-PRT-50',
      unit: 'bag',
      currentStock: 25,
      minimumStock: 30,
      maximumStock: 200,
      unitCost: 12.75,
      totalValue: 318.75,
      supplier: 'Metro Concrete Supply',
      location: 'Warehouse B - Section 1',
      lastRestocked: new Date('2024-01-05')
    },
    {
      id: '3',
      name: 'Rebar #4 - 20ft',
      category: 'steel',
      sku: 'STL-RBR-4-20',
      unit: 'piece',
      currentStock: 80,
      minimumStock: 25,
      maximumStock: 150,
      unitCost: 15.25,
      totalValue: 1220,
      supplier: 'Steel Supply Co',
      location: 'Yard - Section C',
      lastRestocked: new Date('2024-01-08')
    }
  ]);

  const [orders, setOrders] = useState<MaterialOrder[]>([
    {
      id: '1',
      orderId: 'PO-2024-001',
      supplierId: 'supplier-1',
      supplierName: 'ABC Building Supply',
      status: 'shipped',
      orderDate: new Date('2024-01-12'),
      expectedDelivery: new Date('2024-01-15'),
      totalAmount: 2450.00,
      items: [
        {
          materialId: '1',
          materialName: '2x4 Lumber - 8ft',
          quantity: 100,
          unitPrice: 8.50,
          totalPrice: 850.00
        }
      ]
    }
  ]);

  const [usageRecords, setUsageRecords] = useState<MaterialUsage[]>([
    {
      id: '1',
      materialId: '1',
      projectId: 'proj-1',
      projectName: 'Downtown Office Building',
      quantityUsed: 45,
      usedBy: 'Construction Crew A',
      usageDate: new Date('2024-01-12'),
      costCentre: 'Framing Phase'
    }
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  
  const filteredMaterials = materials.filter(material =>
    material.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    material.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStockStatus = (material: Material) => {
    if (material.currentStock <= material.minimumStock) return 'low';
    if (material.currentStock >= material.maximumStock) return 'high';
    return 'normal';
  };

  const getStockPercentage = (material: Material) => {
    return (material.currentStock / material.maximumStock) * 100;
  };

  const renderMaterialCard = (material: Material) => {
    const stockStatus = getStockStatus(material);
    const stockPercentage = getStockPercentage(material);

    return (
      <Card key={material.id} className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Package className="h-4 w-4" />
              <h4 className="font-medium">{material.name}</h4>
            </div>
            <p className="text-sm text-muted-foreground">SKU: {material.sku}</p>
            <p className="text-xs text-muted-foreground capitalize">{material.category}</p>
          </div>
          
          <Badge variant={
            stockStatus === 'low' ? 'destructive' :
            stockStatus === 'high' ? 'secondary' : 'default'
          }>
            {stockStatus === 'low' ? 'Low Stock' :
             stockStatus === 'high' ? 'Overstock' : 'Normal'}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm mb-3">
          <div>
            <span className="text-muted-foreground">Current Stock:</span>
            <p className="font-medium">{material.currentStock} {material.unit}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Unit Cost:</span>
            <p className="font-medium">${material.unitCost}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Total Value:</span>
            <p className="font-medium">${material.totalValue.toLocaleString()}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Supplier:</span>
            <p className="font-medium text-xs">{material.supplier}</p>
          </div>
        </div>

        <div className="space-y-2 mb-3">
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-3 w-3" />
            <span>{material.location}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-3 w-3" />
            <span>Last restocked: {material.lastRestocked.toLocaleDateString()}</span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span>Stock Level</span>
            <span>{material.currentStock}/{material.maximumStock}</span>
          </div>
          <Progress 
            value={stockPercentage} 
            className={`h-2 ${stockStatus === 'low' ? 'bg-destructive/20' : ''}`}
          />
        </div>

        <div className="flex gap-2 mt-3">
          <Button size="sm" variant="outline">
            <TrendingUp className="h-3 w-3 mr-1" />
            Reorder
          </Button>
          <Button size="sm" variant="ghost">
            <Barcode className="h-3 w-3 mr-1" />
            Details
          </Button>
        </div>
      </Card>
    );
  };

  const renderOrderCard = (order: MaterialOrder) => (
    <Card key={order.id} className="p-4">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h4 className="font-medium">{order.orderId}</h4>
          <p className="text-sm text-muted-foreground">{order.supplierName}</p>
        </div>
        <Badge variant={
          order.status === 'delivered' ? 'default' :
          order.status === 'shipped' ? 'secondary' :
          order.status === 'cancelled' ? 'destructive' : 'outline'
        }>
          {order.status}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm mb-3">
        <div>
          <span className="text-muted-foreground">Order Date:</span>
          <p className="font-medium">{order.orderDate.toLocaleDateString()}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Expected:</span>
          <p className="font-medium">{order.expectedDelivery.toLocaleDateString()}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Total Amount:</span>
          <p className="font-medium">${order.totalAmount.toLocaleString()}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Items:</span>
          <p className="font-medium">{order.items.length}</p>
        </div>
      </div>

      <div className="space-y-2">
        {order.items.map((item, index) => (
          <div key={index} className="flex justify-between text-sm p-2 bg-muted/50 rounded">
            <span>{item.materialName}</span>
            <span>{item.quantity} × ${item.unitPrice}</span>
          </div>
        ))}
      </div>

      <div className="flex gap-2 mt-3">
        {order.status === 'shipped' && (
          <Button size="sm">
            <CheckCircle className="h-3 w-3 mr-1" />
            Confirm Receipt
          </Button>
        )}
        <Button size="sm" variant="ghost">
          Details
        </Button>
      </div>
    </Card>
  );

  const renderUsageCard = (usage: MaterialUsage) => {
    const material = materials.find(m => m.id === usage.materialId);
    
    return (
      <Card key={usage.id} className="p-4">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h4 className="font-medium">{material?.name}</h4>
            <p className="text-sm text-muted-foreground">{usage.projectName}</p>
          </div>
          <span className="text-sm font-medium">-{usage.quantityUsed} {material?.unit}</span>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Used By:</span>
            <p className="font-medium">{usage.usedBy}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Date:</span>
            <p className="font-medium">{usage.usageDate.toLocaleDateString()}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Cost Centre:</span>
            <p className="font-medium">{usage.costCentre}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Value:</span>
            <p className="font-medium">${((material?.unitCost || 0) * usage.quantityUsed).toFixed(2)}</p>
          </div>
        </div>
      </Card>
    );
  };

  const totalInventoryValue = materials.reduce((sum, material) => sum + material.totalValue, 0);
  const lowStockItems = materials.filter(m => getStockStatus(m) === 'low').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Material Tracking & Inventory</h2>
          <p className="text-muted-foreground">
            Manage materials, track usage, and optimize inventory levels
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Truck className="h-4 w-4 mr-2" />
            Create Order
          </Button>
          <Button>
            <Package className="h-4 w-4 mr-2" />
            Add Material
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Items</p>
                <p className="text-2xl font-bold">{materials.length}</p>
              </div>
              <Package className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Inventory Value</p>
                <p className="text-2xl font-bold">${totalInventoryValue.toLocaleString()}</p>
              </div>
              <DollarSign className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Low Stock Alerts</p>
                <p className="text-2xl font-bold text-destructive">{lowStockItems}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Orders</p>
                <p className="text-2xl font-bold">{orders.filter(o => o.status !== 'delivered').length}</p>
              </div>
              <Truck className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <Input
            placeholder="Search materials by name or SKU..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-md"
          />
        </CardContent>
      </Card>

      <Tabs defaultValue="inventory" className="space-y-4">
        <TabsList>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="usage">Usage History</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="inventory">
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredMaterials.map(renderMaterialCard)}
          </div>
        </TabsContent>

        <TabsContent value="orders">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Material Orders</h3>
              <Button>Create New Order</Button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {orders.map(renderOrderCard)}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="usage">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Usage History</h3>
              <Button variant="outline">Record Usage</Button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {usageRecords.map(renderUsageCard)}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="analytics">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Stock Levels</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {materials.map(material => (
                    <div key={material.id}>
                      <div className="flex justify-between text-sm mb-1">
                        <span>{material.name}</span>
                        <span>{material.currentStock}/{material.maximumStock}</span>
                      </div>
                      <Progress value={getStockPercentage(material)} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Usage Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  Material usage trends and forecasting coming soon
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};