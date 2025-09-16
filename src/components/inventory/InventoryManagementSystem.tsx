import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Package, Truck, AlertTriangle, CheckCircle, Clock, 
  BarChart3, TrendingDown, MapPin, Search, Plus, Edit
} from 'lucide-react';

interface InventoryItem {
  id: string;
  name: string;
  category: 'materials' | 'tools' | 'equipment' | 'supplies' | 'safety';
  sku: string;
  description: string;
  currentStock: number;
  minStock: number;
  maxStock: number;
  unit: string;
  costPerUnit: number;
  totalValue: number;
  location: string;
  supplier: string;
  lastRestocked: Date;
  nextReorder: Date;
  status: 'in_stock' | 'low_stock' | 'out_of_stock' | 'on_order';
}

interface StockMovement {
  id: string;
  itemId: string;
  type: 'in' | 'out' | 'adjustment' | 'transfer';
  quantity: number;
  reason: string;
  projectId?: string;
  location: string;
  performedBy: string;
  timestamp: Date;
  notes?: string;
}

export const InventoryManagementSystem: React.FC = () => {
  const [inventory, setInventory] = useState<InventoryItem[]>([
    {
      id: '1',
      name: '2x4 Lumber - 8ft',
      category: 'materials',
      sku: 'LMB-2X4-8',
      description: 'Standard 2x4 lumber, 8 feet length',
      currentStock: 450,
      minStock: 100,
      maxStock: 1000,
      unit: 'pieces',
      costPerUnit: 6.50,
      totalValue: 2925,
      location: 'Warehouse A - Section 1',
      supplier: 'ABC Lumber Co.',
      lastRestocked: new Date('2024-01-10'),
      nextReorder: new Date('2024-02-15'),
      status: 'in_stock'
    },
    {
      id: '2', 
      name: 'Portland Cement - 50lb',
      category: 'materials',
      sku: 'CEM-PORT-50',
      description: 'Type I Portland cement, 50lb bags',
      currentStock: 15,
      minStock: 25,
      maxStock: 200,
      unit: 'bags',
      costPerUnit: 12.95,
      totalValue: 194.25,
      location: 'Warehouse B - Dry Storage',
      supplier: 'Concrete Supply Inc.',
      lastRestocked: new Date('2024-01-05'),
      nextReorder: new Date('2024-02-01'),
      status: 'low_stock'
    },
    {
      id: '3',
      name: 'Safety Helmet - Hard Hat',
      category: 'safety',
      sku: 'SAF-HLM-001',
      description: 'ANSI approved safety helmet',
      currentStock: 0,
      minStock: 10,
      maxStock: 50,
      unit: 'pieces',
      costPerUnit: 25.00,
      totalValue: 0,
      location: 'Safety Equipment Room',
      supplier: 'Safety First Equipment',
      lastRestocked: new Date('2023-12-20'),
      nextReorder: new Date('2024-01-25'),
      status: 'out_of_stock'
    }
  ]);

  const [movements, setMovements] = useState<StockMovement[]>([
    {
      id: '1',
      itemId: '1',
      type: 'out',
      quantity: 50,
      reason: 'Project allocation',
      projectId: 'proj-001',
      location: 'Downtown Office Building',
      performedBy: 'Mike Johnson',
      timestamp: new Date('2024-01-15'),
      notes: 'Framing materials for Phase 1'
    },
    {
      id: '2',
      itemId: '2',
      type: 'in',
      quantity: 40,
      reason: 'Purchase order',
      location: 'Warehouse B - Dry Storage',
      performedBy: 'Sarah Chen',
      timestamp: new Date('2024-01-10'),
      notes: 'PO #12345 - Emergency restock'
    }
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const filteredInventory = inventory.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getStatusColor = (status: InventoryItem['status']) => {
    switch (status) {
      case 'in_stock': return 'default';
      case 'low_stock': return 'secondary';
      case 'out_of_stock': return 'destructive';
      case 'on_order': return 'outline';
      default: return 'outline';
    }
  };

  const getStockLevel = (item: InventoryItem) => {
    return (item.currentStock / item.maxStock) * 100;
  };

  const getCategoryIcon = (category: InventoryItem['category']) => {
    switch (category) {
      case 'materials': return <Package className="h-4 w-4" />;
      case 'tools': return <Edit className="h-4 w-4" />;
      case 'equipment': return <Truck className="h-4 w-4" />;
      case 'supplies': return <Package className="h-4 w-4" />;
      case 'safety': return <AlertTriangle className="h-4 w-4" />;
      default: return <Package className="h-4 w-4" />;
    }
  };

  const renderInventoryCard = (item: InventoryItem) => {
    const stockLevel = getStockLevel(item);
    
    return (
      <Card key={item.id} className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              {getCategoryIcon(item.category)}
              <h4 className="font-medium">{item.name}</h4>
            </div>
            <p className="text-sm text-muted-foreground">{item.description}</p>
            <p className="text-xs text-muted-foreground">SKU: {item.sku}</p>
          </div>
          
          <div className="flex flex-col items-end gap-1">
            <Badge variant={getStatusColor(item.status)}>
              {item.status.replace('_', ' ')}
            </Badge>
            {item.status === 'low_stock' && (
              <Badge variant="secondary">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Reorder
              </Badge>
            )}
          </div>
        </div>

        <div className="space-y-2 mb-3">
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-3 w-3" />
            <span>{item.location}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Package className="h-3 w-3" />
            <span>{item.currentStock} {item.unit} available</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Value:</span>
            <span className="font-medium">${item.totalValue.toLocaleString()}</span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span>Stock Level</span>
            <span>{item.currentStock}/{item.maxStock}</span>
          </div>
          <Progress value={stockLevel} className="h-2" />
          
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Min: {item.minStock}</span>
            <span>Cost: ${item.costPerUnit}/{item.unit}</span>
          </div>
        </div>

        <div className="flex gap-2 mt-3">
          <Button size="sm" variant="outline">
            <Edit className="h-3 w-3 mr-1" />
            Adjust
          </Button>
          <Button size="sm" variant="ghost">
            History
          </Button>
        </div>
      </Card>
    );
  };

  const renderMovementCard = (movement: StockMovement) => {
    const item = inventory.find(i => i.id === movement.itemId);
    
    return (
      <Card key={movement.id} className="p-4">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h4 className="font-medium">{item?.name}</h4>
            <p className="text-sm text-muted-foreground">{movement.reason}</p>
          </div>
          <Badge variant={
            movement.type === 'in' ? 'default' :
            movement.type === 'out' ? 'secondary' : 'outline'
          }>
            {movement.type === 'in' ? '+' : '-'}{movement.quantity} {item?.unit}
          </Badge>
        </div>
        
        <div className="grid grid-cols-2 gap-4 text-sm mb-3">
          <div>
            <span className="text-muted-foreground">Location:</span>
            <p className="font-medium">{movement.location}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Date:</span>
            <p className="font-medium">{movement.timestamp.toLocaleDateString()}</p>
          </div>
          <div>
            <span className="text-muted-foreground">By:</span>
            <p className="font-medium">{movement.performedBy}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Type:</span>
            <p className="font-medium capitalize">{movement.type}</p>
          </div>
        </div>
        
        {movement.notes && (
          <div className="text-sm">
            <span className="text-muted-foreground">Notes:</span>
            <p className="mt-1">{movement.notes}</p>
          </div>
        )}
      </Card>
    );
  };

  // Calculate statistics
  const totalItems = inventory.length;
  const lowStockItems = inventory.filter(item => item.status === 'low_stock').length;
  const outOfStockItems = inventory.filter(item => item.status === 'out_of_stock').length;
  const totalValue = inventory.reduce((sum, item) => sum + item.totalValue, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Inventory Management</h2>
          <p className="text-muted-foreground">
            Track stock levels, manage suppliers, and monitor inventory costs
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Truck className="h-4 w-4 mr-2" />
            Receive Order
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Item
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
                <p className="text-2xl font-bold">{totalItems}</p>
              </div>
              <Package className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Low Stock</p>
                <p className="text-2xl font-bold text-orange-500">{lowStockItems}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Out of Stock</p>
                <p className="text-2xl font-bold text-destructive">{outOfStockItems}</p>
              </div>
              <TrendingDown className="h-8 w-8 text-destructive" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Value</p>
                <p className="text-2xl font-bold text-green-600">${totalValue.toLocaleString()}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4 items-center">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <select 
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 border rounded-md"
            >
              <option value="all">All Categories</option>
              <option value="materials">Materials</option>
              <option value="tools">Tools</option>
              <option value="equipment">Equipment</option>
              <option value="supplies">Supplies</option>
              <option value="safety">Safety</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="inventory" className="space-y-4">
        <TabsList>
          <TabsTrigger value="inventory">Inventory Items</TabsTrigger>
          <TabsTrigger value="movements">Stock Movements</TabsTrigger>
          <TabsTrigger value="reorder">Reorder Management</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="inventory">
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredInventory.map(renderInventoryCard)}
          </div>
        </TabsContent>

        <TabsContent value="movements">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Recent Stock Movements</h3>
              <Button>Record Movement</Button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {movements.map(renderMovementCard)}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="reorder">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Reorder Management</h3>
              <Button>Generate Purchase Orders</Button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {inventory
                .filter(item => item.status === 'low_stock' || item.status === 'out_of_stock')
                .map(renderInventoryCard)}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="analytics">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Inventory Turnover</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  Inventory turnover analysis and trends coming soon
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Cost Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>Materials</span>
                    <span className="font-medium">
                      ${inventory.filter(i => i.category === 'materials').reduce((s, i) => s + i.totalValue, 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tools & Equipment</span>
                    <span className="font-medium">
                      ${inventory.filter(i => ['tools', 'equipment'].includes(i.category)).reduce((s, i) => s + i.totalValue, 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Safety Equipment</span>
                    <span className="font-medium">
                      ${inventory.filter(i => i.category === 'safety').reduce((s, i) => s + i.totalValue, 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};