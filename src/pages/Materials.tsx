import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { AccessiblePageWrapper } from "@/components/accessibility/AccessiblePageWrapper";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { CreatePOFromMaterialDialog } from '@/components/materials/CreatePOFromMaterialDialog';
import { useMaterialsInventory, inventorySummary } from '@/hooks/useMaterialsInventory';
import { ErrorState } from '@/components/common/ErrorState';
import { toast } from '@/hooks/use-toast';
import { Plus, Search, Package, Truck, AlertTriangle, CheckCircle, Clock, FileText } from 'lucide-react';

export default function Materials() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTab, setSelectedTab] = useState("inventory");
  const inventory = useMaterialsInventory();
  const { materials, orders, projects } = inventory;
  const summary = inventorySummary(materials, orders);
  const [newMaterial, setNewMaterial] = useState({
    name: '',
    material_code: '',
    category: '',
    unit: '',
    quantity: '',
    cost: '',
    project_id: ''
  });
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([]);
  const [showCreatePODialog, setShowCreatePODialog] = useState(false);

  const handleCreateMaterial = async () => {
    try {
      await inventory.create({
        name: newMaterial.name,
        material_code: newMaterial.material_code,
        category: newMaterial.category,
        unit: newMaterial.unit,
        quantity_available: parseInt(newMaterial.quantity) || 0,
        unit_cost: parseFloat(newMaterial.cost) || 0,
        project_id: newMaterial.project_id || null,
      });

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
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error creating material",
        description: error instanceof Error ? error.message : undefined
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
        <Icon className="h-3 w-3" aria-hidden="true" />
        {config?.label || status}
      </Badge>
    );
  };

  return (
    <AccessiblePageWrapper pageTitle="Materials Management">
    <DashboardLayout
      hasAccessibleWrapper
      title="Materials Management"
      description="Track inventory, orders, and material costs"
      headerActions={
        <div className="flex gap-2">
          {selectedMaterials.length > 0 && (
            <Button
              onClick={() => setShowCreatePODialog(true)}
              className="bg-construction-blue hover:bg-construction-blue/90"
            >
              <FileText className="mr-2 h-4 w-4" aria-hidden="true" />
              Create PO ({selectedMaterials.length})
            </Button>
          )}
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                Add Material
              </Button>
            </DialogTrigger>
            <DialogContent aria-describedby="add-material-description">
              <DialogHeader>
                <DialogTitle>Add New Material</DialogTitle>
                <DialogDescription id="add-material-description">
                  Add a new material to your inventory
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="project">Project (Optional)</Label>
                  <Select value={newMaterial.project_id} onValueChange={(value) => setNewMaterial(prev => ({ ...prev, project_id: value }))}>
                    <SelectTrigger id="project">
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
                    <SelectTrigger id="category">
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
      }
    >
      <div className="space-y-6">
        {inventory.error && (
          <ErrorState
            inline
            title="Materials could not be loaded"
            error={inventory.error}
            onRetry={() => { void inventory.refetch(); }}
          />
        )}

        {/* Tabs */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="inventory">Inventory</TabsTrigger>
            <TabsTrigger value="orders">Purchase Orders</TabsTrigger>
            <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>

          <div className="flex items-center space-x-2" role="search" aria-label="Search materials">
            <Search className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <Input
              placeholder="Search materials, SKUs, or suppliers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
              aria-label="Search materials, SKUs, or suppliers"
            />
          </div>

          <TabsContent value="inventory" className="space-y-4">
            {selectedMaterials.length > 0 && (
              <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 rounded-lg p-3 mb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-blue-600" aria-hidden="true" />
                    <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                      {selectedMaterials.length} material(s) selected
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedMaterials([])}
                    >
                      Clear Selection
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => setShowCreatePODialog(true)}
                      className="bg-construction-blue hover:bg-construction-blue/90"
                    >
                      <FileText className="mr-2 h-4 w-4" aria-hidden="true" />
                      Create Purchase Order
                    </Button>
                  </div>
                </div>
              </div>
            )}
            <div className="grid gap-4">
              {materials.map((material) => (
                <Card key={material.id} className={`hover:shadow-md transition-shadow ${selectedMaterials.includes(material.id) ? 'ring-2 ring-construction-blue' : ''}`}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="flex items-start gap-3 flex-1">
                        <Checkbox
                          checked={selectedMaterials.includes(material.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedMaterials(prev => [...prev, material.id]);
                            } else {
                              setSelectedMaterials(prev => prev.filter(id => id !== material.id));
                            }
                          }}
                          className="mt-1"
                        />
                        <div className="space-y-1 flex-1">
                          <CardTitle className="text-lg flex items-center gap-2">
                            <Package className="h-5 w-5" aria-hidden="true" />
                            {material.name}
                          </CardTitle>
                          <CardDescription>
                            {material.material_code} • {material.category}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={(material.quantity_available ?? 0) > (material.minimum_stock_level || 0) ? "default" : "secondary"}>
                          {(material.quantity_available ?? 0) > (material.minimum_stock_level || 0) ? "In Stock" : "Low Stock"}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                      <div>
                        <div className="font-medium text-muted-foreground">Quantity</div>
                        <div className="text-lg font-semibold">
                          {material.quantity_available} {material.unit}
                        </div>
                      </div>
                      <div>
                        <div className="font-medium text-muted-foreground">Cost/Unit</div>
                        <div>${(material.unit_cost || 0).toFixed(2)}</div>
                      </div>
                      <div>
                        <div className="font-medium text-muted-foreground">Total Value</div>
                        <div className="font-semibold">${((material.quantity_available || 0) * (material.unit_cost || 0)).toFixed(2)}</div>
                      </div>
                      <div>
                        <div className="font-medium text-muted-foreground">Supplier</div>
                        <div>{material.supplier_name || 'N/A'}</div>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <div className="text-sm">
                        <span className="font-medium">Description: </span>
                        <span>{material.description || 'No description'}</span>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <Truck className="h-4 w-4 mr-2" aria-hidden="true" />
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
              {!inventory.isLoading && !inventory.error && orders.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">No purchase orders yet.</p>
              )}
              {orders.map((order) => (
                <Card key={order.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <CardTitle className="text-lg">
                          Purchase Order {order.po_number}
                        </CardTitle>
                        <CardDescription>
                          {order.vendor_name ?? 'Vendor not found'} - {order.items_count} items
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
                        <div>{new Date(order.po_date).toLocaleDateString()}</div>
                      </div>
                      <div>
                        <div className="font-medium text-muted-foreground">Expected Delivery</div>
                        <div>{order.delivery_date ? new Date(order.delivery_date).toLocaleDateString() : '--'}</div>
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
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" aria-hidden="true" />
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
                  <div className="text-2xl font-bold">
                    {inventory.error || inventory.isLoading ? '--' : `$${summary.totalValue.toFixed(2)}`}
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground">
                    Quantity on hand times unit cost
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{inventory.error || inventory.isLoading ? '--' : summary.lowStock}</div>
                  <div className="flex items-center text-sm text-yellow-600">
                    <AlertTriangle className="h-4 w-4 mr-1" aria-hidden="true" />
                    Requires attention
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{inventory.error || inventory.isLoading ? '--' : summary.pendingOrders}</div>
                  <div className="flex items-center text-sm text-blue-600">
                    <Clock className="h-4 w-4 mr-1" aria-hidden="true" />
                    Awaiting delivery
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Create PO Dialog */}
        <CreatePOFromMaterialDialog
          materialIds={selectedMaterials}
          isOpen={showCreatePODialog}
          onClose={() => setShowCreatePODialog(false)}
          onSuccess={() => {
            setShowCreatePODialog(false);
            setSelectedMaterials([]);
            void inventory.invalidate();
          }}
        />
      </div>
    </DashboardLayout>
    </AccessiblePageWrapper>
  );
}