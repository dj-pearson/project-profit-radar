import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  Package, 
  Truck, 
  AlertTriangle, 
  CheckCircle,
  Clock,
  TrendingUp,
  TrendingDown
} from 'lucide-react';

export default function Materials() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTab, setSelectedTab] = useState("inventory");
  const [projects, setProjects] = useState<any[]>([]);
  const [newMaterial, setNewMaterial] = useState({
    name: '',
    material_code: '',
    category: '',
    unit: '',
    quantity: '',
    cost: '',
    project_id: ''
  });
  const navigate = useNavigate();

  // Mock data
  const materials = [
    {
      id: "1",
      name: "Portland Cement",
      sku: "CEM-001",
      category: "Concrete",
      quantity: 150,
      unit: "bags",
      cost_per_unit: 12.50,
      total_value: 1875.00,
      reorder_level: 50,
      supplier: "BuildCo Supply",
      location: "Warehouse A-1",
      status: "in_stock"
    },
    {
      id: "2", 
      name: "Steel Rebar #4",
      sku: "REB-004",
      category: "Steel",
      quantity: 25,
      unit: "tons",
      cost_per_unit: 650.00,
      total_value: 16250.00,
      reorder_level: 10,
      supplier: "Metal Masters",
      location: "Yard B",
      status: "low_stock"
    },
    {
      id: "3",
      name: "Lumber 2x4x8",
      sku: "LUM-248",
      category: "Lumber",
      quantity: 0,
      unit: "pieces",
      cost_per_unit: 8.75,
      total_value: 0,
      reorder_level: 100,
      supplier: "Timber Corp",
      location: "Warehouse C",
      status: "out_of_stock"
    }
  ];

  const orders = [
    {
      id: "PO-001",
      supplier: "BuildCo Supply",
      order_date: "2024-04-10",
      expected_delivery: "2024-04-15",
      status: "pending",
      total_amount: 2500.00,
      items_count: 3
    },
    {
      id: "PO-002",
      supplier: "Metal Masters", 
      order_date: "2024-04-08",
      expected_delivery: "2024-04-12",
      status: "delivered",
      total_amount: 15000.00,
      items_count: 2
    }
  ];

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name')
        .order('name');
      
      if (error) throw error;
      setProjects(data || []);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error loading projects",
        description: error.message
      });
    }
  };

  const handleCreateMaterial = async () => {
    try {
      // Get company_id from user profile
      const { data: userProfile, error: profileError } = await supabase
        .from('user_profiles')
        .select('company_id')
        .eq('id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (profileError) throw profileError;

      const { error } = await supabase
        .from('materials')
        .insert({
          name: newMaterial.name,
          material_code: newMaterial.material_code,
          category: newMaterial.category,
          unit: newMaterial.unit,
          quantity_available: parseInt(newMaterial.quantity) || 0,
          unit_cost: parseFloat(newMaterial.cost) || 0,
          project_id: newMaterial.project_id || null,
          company_id: userProfile.company_id
        });

      if (error) throw error;

      setNewMaterial({
        name: '',
        material_code: '',
        category: '',
        unit: '',
        quantity: '',
        cost: '',
        project_id: ''
      });

      toast({
        title: "Material created",
        description: "Material has been added successfully."
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error creating material",
        description: error.message
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      in_stock: { variant: "default" as const, label: "In Stock", icon: CheckCircle },
      low_stock: { variant: "secondary" as const, label: "Low Stock", icon: AlertTriangle },
      out_of_stock: { variant: "destructive" as const, label: "Out of Stock", icon: AlertTriangle },
      pending: { variant: "outline" as const, label: "Pending", icon: Clock },
      delivered: { variant: "default" as const, label: "Delivered", icon: CheckCircle }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig];
    const Icon = config?.icon || Clock;
    return (
      <Badge variant={config?.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config?.label || status}
      </Badge>
    );
  };

  return (
    <DashboardLayout title="Materials Management">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Materials Management</h1>
            <p className="text-muted-foreground">Track inventory, orders, and material costs</p>
          </div>
          <div className="flex gap-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Material
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Material</DialogTitle>
                  <DialogDescription>
                    Add a new material to your inventory
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="project">Project (Optional)</Label>
                    <Select value={newMaterial.project_id} onValueChange={(value) => setNewMaterial(prev => ({ ...prev, project_id: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select project (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">No Project</SelectItem>
                        {projects.map((project) => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="name">Material Name</Label>
                    <Input 
                      id="name" 
                      placeholder="Enter material name" 
                      value={newMaterial.name}
                      onChange={(e) => setNewMaterial(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="material-code">Material Code</Label>
                    <Input 
                      id="material-code" 
                      placeholder="Enter material code" 
                      value={newMaterial.material_code}
                      onChange={(e) => setNewMaterial(prev => ({ ...prev, material_code: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="category">Category</Label>
                    <Select value={newMaterial.category} onValueChange={(value) => setNewMaterial(prev => ({ ...prev, category: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="concrete">Concrete</SelectItem>
                        <SelectItem value="steel">Steel</SelectItem>
                        <SelectItem value="lumber">Lumber</SelectItem>
                        <SelectItem value="electrical">Electrical</SelectItem>
                        <SelectItem value="plumbing">Plumbing</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="quantity">Quantity</Label>
                      <Input 
                        id="quantity" 
                        type="number" 
                        placeholder="Enter quantity"
                        value={newMaterial.quantity}
                        onChange={(e) => setNewMaterial(prev => ({ ...prev, quantity: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="unit">Unit</Label>
                      <Input 
                        id="unit" 
                        placeholder="e.g., bags, tons" 
                        value={newMaterial.unit}
                        onChange={(e) => setNewMaterial(prev => ({ ...prev, unit: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="cost">Cost per Unit</Label>
                    <Input 
                      id="cost" 
                      type="number" 
                      step="0.01" 
                      placeholder="Enter cost"
                      value={newMaterial.cost}
                      onChange={(e) => setNewMaterial(prev => ({ ...prev, cost: e.target.value }))}
                    />
                  </div>
                  <div className="flex justify-end space-x-2 pt-4">
                    <Button variant="outline" onClick={() => setNewMaterial({
                      name: '',
                      material_code: '',
                      category: '',
                      unit: '',
                      quantity: '',
                      cost: '',
                      project_id: ''
                    })}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateMaterial}>
                      Add Material
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="inventory">Inventory</TabsTrigger>
            <TabsTrigger value="orders">Purchase Orders</TabsTrigger>
            <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>

          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search materials, SKUs, or suppliers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>

          <TabsContent value="inventory" className="space-y-4">
            <div className="grid gap-4">
              {materials.map((material) => (
                <Card key={material.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Package className="h-5 w-5" />
                          {material.name}
                        </CardTitle>
                        <CardDescription>
                          {material.sku} • {material.category}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(material.status)}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                      <div>
                        <div className="font-medium text-muted-foreground">Quantity</div>
                        <div className="text-lg font-semibold">
                          {material.quantity} {material.unit}
                        </div>
                      </div>
                      <div>
                        <div className="font-medium text-muted-foreground">Cost/Unit</div>
                        <div>${material.cost_per_unit.toFixed(2)}</div>
                      </div>
                      <div>
                        <div className="font-medium text-muted-foreground">Total Value</div>
                        <div className="font-semibold">${material.total_value.toFixed(2)}</div>
                      </div>
                      <div>
                        <div className="font-medium text-muted-foreground">Location</div>
                        <div>{material.location}</div>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <div className="text-sm">
                        <span className="font-medium">Supplier: </span>
                        <span>{material.supplier}</span>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <Truck className="h-4 w-4 mr-2" />
                          Reorder
                        </Button>
                        <Button size="sm">
                          View Details
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="orders" className="space-y-4">
            <div className="grid gap-4">
              {orders.map((order) => (
                <Card key={order.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <CardTitle className="text-lg">
                          Purchase Order {order.id}
                        </CardTitle>
                        <CardDescription>
                          {order.supplier} • {order.items_count} items
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(order.status)}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm mb-4">
                      <div>
                        <div className="font-medium text-muted-foreground">Order Date</div>
                        <div>{new Date(order.order_date).toLocaleDateString()}</div>
                      </div>
                      <div>
                        <div className="font-medium text-muted-foreground">Expected Delivery</div>
                        <div>{new Date(order.expected_delivery).toLocaleDateString()}</div>
                      </div>
                      <div>
                        <div className="font-medium text-muted-foreground">Total Amount</div>
                        <div className="font-semibold">${order.total_amount.toFixed(2)}</div>
                      </div>
                    </div>
                    
                    <div className="flex justify-end">
                      <Button size="sm">
                        View Order Details
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="suppliers" className="space-y-4">
            <div className="text-center py-8">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium">Supplier Management</h3>
              <p className="text-muted-foreground">
                Manage your material suppliers and vendor relationships
              </p>
            </div>
          </TabsContent>

          <TabsContent value="reports" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Total Inventory Value</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">$18,125.00</div>
                  <div className="flex items-center text-sm text-green-600">
                    <TrendingUp className="h-4 w-4 mr-1" />
                    +5.2% from last month
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">1</div>
                  <div className="flex items-center text-sm text-yellow-600">
                    <AlertTriangle className="h-4 w-4 mr-1" />
                    Requires attention
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">1</div>
                  <div className="flex items-center text-sm text-blue-600">
                    <Clock className="h-4 w-4 mr-1" />
                    Awaiting delivery
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}