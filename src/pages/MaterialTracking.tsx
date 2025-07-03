import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  ArrowLeft, 
  Package,
  PlusCircle,
  Search,
  AlertTriangle,
  TrendingDown,
  Calendar
} from 'lucide-react';

interface Material {
  id: string;
  name: string;
  description: string;
  category: string;
  unit: string;
  unit_cost: number;
  quantity_available: number;
  minimum_stock_level: number;
  supplier_name: string;
  supplier_contact: string;
  last_ordered_date: string;
  location: string;
  material_code: string;
  is_active: boolean;
  created_at: string;
}

interface MaterialUsage {
  id: string;
  material_id: string;
  project_id: string;
  quantity_used: number;
  unit_cost: number;
  total_cost: number;
  date_used: string;
  notes: string;
  materials?: { name: string };
  projects?: { name: string };
}

const MaterialTracking = () => {
  const { user, userProfile, loading } = useAuth();
  const navigate = useNavigate();
  
  const [materials, setMaterials] = useState<Material[]>([]);
  const [materialUsage, setMaterialUsage] = useState<MaterialUsage[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isUsageDialogOpen, setIsUsageDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  
  const [newMaterial, setNewMaterial] = useState({
    name: '',
    description: '',
    category: '',
    unit: 'unit',
    unit_cost: 0,
    quantity_available: 0,
    minimum_stock_level: 0,
    supplier_name: '',
    supplier_contact: '',
    location: '',
    material_code: ''
  });

  const [newUsage, setNewUsage] = useState({
    material_id: '',
    project_id: '',
    quantity_used: 0,
    unit_cost: 0,
    notes: ''
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
    
    if (!loading && user && userProfile && !userProfile.company_id) {
      navigate('/setup');
    }
    
    if (userProfile?.company_id) {
      loadData();
    }
  }, [user, userProfile, loading, navigate]);

  const loadData = async () => {
    try {
      setLoadingData(true);
      
      // Load materials
      const { data: materialsData, error: materialsError } = await supabase
        .from('materials')
        .select('*')
        .eq('company_id', userProfile?.company_id)
        .eq('is_active', true)
        .order('name');

      if (materialsError) throw materialsError;
      setMaterials(materialsData || []);

      // Load material usage with material and project names
      const { data: usageData, error: usageError } = await supabase
        .from('material_usage')
        .select(`
          *,
          materials(name),
          projects(name)
        `)
        .order('date_used', { ascending: false })
        .limit(50);

      if (usageError) throw usageError;
      setMaterialUsage(usageData || []);

      // Load projects
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('id, name, status')
        .eq('company_id', userProfile?.company_id)
        .in('status', ['active', 'in_progress'])
        .order('name');

      if (projectsError) throw projectsError;
      setProjects(projectsData || []);

    } catch (error: any) {
      console.error('Error loading data:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load materials data"
      });
    } finally {
      setLoadingData(false);
    }
  };

  const handleCreateMaterial = async () => {
    if (!newMaterial.name || !newMaterial.category) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please fill in all required fields."
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('materials')
        .insert([{
          ...newMaterial,
          company_id: userProfile?.company_id,
          created_by: user?.id
        }]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Material created successfully"
      });

      setIsCreateDialogOpen(false);
      setNewMaterial({
        name: '',
        description: '',
        category: '',
        unit: 'unit',
        unit_cost: 0,
        quantity_available: 0,
        minimum_stock_level: 0,
        supplier_name: '',
        supplier_contact: '',
        location: '',
        material_code: ''
      });
      
      loadData();
    } catch (error: any) {
      console.error('Error creating material:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create material"
      });
    }
  };

  const handleCreateUsage = async () => {
    if (!newUsage.material_id || !newUsage.project_id || !newUsage.quantity_used) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please fill in all required fields."
      });
      return;
    }

    try {
      const material = materials.find(m => m.id === newUsage.material_id);
      if (!material) throw new Error('Material not found');

      const totalCost = newUsage.quantity_used * (newUsage.unit_cost || material.unit_cost);

      const { error } = await supabase
        .from('material_usage')
        .insert([{
          ...newUsage,
          unit_cost: newUsage.unit_cost || material.unit_cost,
          total_cost: totalCost,
          used_by: user?.id
        }]);

      if (error) throw error;

      // Update material quantity
      const { error: updateError } = await supabase
        .from('materials')
        .update({
          quantity_available: material.quantity_available - newUsage.quantity_used
        })
        .eq('id', newUsage.material_id);

      if (updateError) throw updateError;

      toast({
        title: "Success",
        description: "Material usage recorded successfully"
      });

      setIsUsageDialogOpen(false);
      setNewUsage({
        material_id: '',
        project_id: '',
        quantity_used: 0,
        unit_cost: 0,
        notes: ''
      });
      
      loadData();
    } catch (error: any) {
      console.error('Error recording usage:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to record material usage"
      });
    }
  };

  const categories = [...new Set(materials.map(m => m.category))].filter(Boolean);
  
  const filteredMaterials = materials.filter(material => {
    const matchesSearch = material.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         material.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         material.material_code?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || material.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const lowStockMaterials = materials.filter(m => m.quantity_available <= m.minimum_stock_level);

  if (loading || loadingData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-construction-blue mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading materials...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/dashboard')}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
              <Separator orientation="vertical" className="h-6" />
              <div>
                <h1 className="text-xl font-semibold">Material Tracking</h1>
                <p className="text-sm text-muted-foreground">Inventory management and usage tracking</p>
              </div>
            </div>
            <div className="flex space-x-2">
              <Dialog open={isUsageDialogOpen} onOpenChange={setIsUsageDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <TrendingDown className="h-4 w-4 mr-2" />
                    Record Usage
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Record Material Usage</DialogTitle>
                    <DialogDescription>
                      Log material usage for a project and update inventory.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="usage-material">Material *</Label>
                        <Select value={newUsage.material_id} onValueChange={(value) => setNewUsage({...newUsage, material_id: value})}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select material" />
                          </SelectTrigger>
                          <SelectContent>
                            {materials.map((material) => (
                              <SelectItem key={material.id} value={material.id}>
                                {material.name} (Available: {material.quantity_available} {material.unit})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label htmlFor="usage-project">Project *</Label>
                        <Select value={newUsage.project_id} onValueChange={(value) => setNewUsage({...newUsage, project_id: value})}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select project" />
                          </SelectTrigger>
                          <SelectContent>
                            {projects.map((project) => (
                              <SelectItem key={project.id} value={project.id}>
                                {project.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="quantity_used">Quantity Used *</Label>
                        <Input
                          id="quantity_used"
                          type="number"
                          min="0"
                          step="0.01"
                          value={newUsage.quantity_used}
                          onChange={(e) => setNewUsage({...newUsage, quantity_used: Number(e.target.value)})}
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="usage_unit_cost">Unit Cost (leave blank to use default)</Label>
                        <Input
                          id="usage_unit_cost"
                          type="number"
                          min="0"
                          step="0.01"
                          value={newUsage.unit_cost}
                          onChange={(e) => setNewUsage({...newUsage, unit_cost: Number(e.target.value)})}
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="usage_notes">Notes</Label>
                      <Textarea
                        id="usage_notes"
                        placeholder="Additional notes about this usage..."
                        value={newUsage.notes}
                        onChange={(e) => setNewUsage({...newUsage, notes: e.target.value})}
                      />
                    </div>

                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" onClick={() => setIsUsageDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleCreateUsage}>
                        Record Usage
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Add Material
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Add New Material</DialogTitle>
                    <DialogDescription>
                      Add a new material to your inventory management system.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="name">Name *</Label>
                        <Input
                          id="name"
                          placeholder="Material name"
                          value={newMaterial.name}
                          onChange={(e) => setNewMaterial({...newMaterial, name: e.target.value})}
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="category">Category *</Label>
                        <Input
                          id="category"
                          placeholder="e.g., Lumber, Hardware, Tools"
                          value={newMaterial.category}
                          onChange={(e) => setNewMaterial({...newMaterial, category: e.target.value})}
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        placeholder="Material description..."
                        value={newMaterial.description}
                        onChange={(e) => setNewMaterial({...newMaterial, description: e.target.value})}
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="unit">Unit</Label>
                        <Select value={newMaterial.unit} onValueChange={(value) => setNewMaterial({...newMaterial, unit: value})}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unit">Unit</SelectItem>
                            <SelectItem value="ft">Feet</SelectItem>
                            <SelectItem value="lbs">Pounds</SelectItem>
                            <SelectItem value="pcs">Pieces</SelectItem>
                            <SelectItem value="gal">Gallons</SelectItem>
                            <SelectItem value="sqft">Square Feet</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label htmlFor="unit_cost">Unit Cost</Label>
                        <Input
                          id="unit_cost"
                          type="number"
                          min="0"
                          step="0.01"
                          value={newMaterial.unit_cost}
                          onChange={(e) => setNewMaterial({...newMaterial, unit_cost: Number(e.target.value)})}
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="quantity_available">Current Quantity</Label>
                        <Input
                          id="quantity_available"
                          type="number"
                          min="0"
                          value={newMaterial.quantity_available}
                          onChange={(e) => setNewMaterial({...newMaterial, quantity_available: Number(e.target.value)})}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="minimum_stock_level">Minimum Stock Level</Label>
                        <Input
                          id="minimum_stock_level"
                          type="number"
                          min="0"
                          value={newMaterial.minimum_stock_level}
                          onChange={(e) => setNewMaterial({...newMaterial, minimum_stock_level: Number(e.target.value)})}
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="location">Location</Label>
                        <Input
                          id="location"
                          placeholder="Storage location"
                          value={newMaterial.location}
                          onChange={(e) => setNewMaterial({...newMaterial, location: e.target.value})}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="supplier_name">Supplier Name</Label>
                        <Input
                          id="supplier_name"
                          placeholder="Supplier name"
                          value={newMaterial.supplier_name}
                          onChange={(e) => setNewMaterial({...newMaterial, supplier_name: e.target.value})}
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="supplier_contact">Supplier Contact</Label>
                        <Input
                          id="supplier_contact"
                          placeholder="Phone or email"
                          value={newMaterial.supplier_contact}
                          onChange={(e) => setNewMaterial({...newMaterial, supplier_contact: e.target.value})}
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="material_code">Material Code</Label>
                      <Input
                        id="material_code"
                        placeholder="SKU or material code"
                        value={newMaterial.material_code}
                        onChange={(e) => setNewMaterial({...newMaterial, material_code: e.target.value})}
                      />
                    </div>

                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
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
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Low Stock Alert */}
        {lowStockMaterials.length > 0 && (
          <Card className="mb-6 border-yellow-200 bg-yellow-50">
            <CardHeader>
              <CardTitle className="flex items-center text-yellow-800">
                <AlertTriangle className="h-5 w-5 mr-2" />
                Low Stock Alert
              </CardTitle>
              <CardDescription className="text-yellow-700">
                {lowStockMaterials.length} material(s) are at or below minimum stock level
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {lowStockMaterials.slice(0, 3).map((material) => (
                  <div key={material.id} className="flex justify-between items-center text-sm">
                    <span className="font-medium">{material.name}</span>
                    <Badge variant="outline" className="text-yellow-800">
                      {material.quantity_available} {material.unit} remaining
                    </Badge>
                  </div>
                ))}
                {lowStockMaterials.length > 3 && (
                  <p className="text-sm text-yellow-700">
                    and {lowStockMaterials.length - 3} more...
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="inventory" className="space-y-6">
          <TabsList>
            <TabsTrigger value="inventory">Inventory</TabsTrigger>
            <TabsTrigger value="usage">Usage History</TabsTrigger>
          </TabsList>

          <TabsContent value="inventory" className="space-y-6">
            {/* Filters */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="flex-1">
                    <Label htmlFor="search">Search Materials</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="search"
                        placeholder="Search by name, description, or code..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="category-filter">Category</Label>
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="All categories" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All categories</SelectItem>
                        {categories.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Materials Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredMaterials.length === 0 ? (
                <Card className="col-span-full">
                  <CardContent className="text-center py-12">
                    <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Materials Found</h3>
                    <p className="text-muted-foreground mb-4">
                      {searchTerm || selectedCategory !== 'all' 
                        ? 'No materials match your current filters' 
                        : 'No materials have been added yet'
                      }
                    </p>
                    <Button onClick={() => setIsCreateDialogOpen(true)}>
                      <PlusCircle className="h-4 w-4 mr-2" />
                      Add First Material
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                filteredMaterials.map((material) => (
                  <Card key={material.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{material.name}</CardTitle>
                        <Badge variant={material.quantity_available <= material.minimum_stock_level ? "destructive" : "secondary"}>
                          {material.category}
                        </Badge>
                      </div>
                      {material.description && (
                        <CardDescription>{material.description}</CardDescription>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-muted-foreground">Available</p>
                          <p className="font-medium">{material.quantity_available} {material.unit}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Unit Cost</p>
                          <p className="font-medium">${material.unit_cost}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Min. Stock</p>
                          <p className="font-medium">{material.minimum_stock_level} {material.unit}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Location</p>
                          <p className="font-medium">{material.location || 'Not set'}</p>
                        </div>
                      </div>
                      
                      {material.supplier_name && (
                        <div className="text-sm">
                          <p className="text-muted-foreground">Supplier</p>
                          <p className="font-medium">{material.supplier_name}</p>
                        </div>
                      )}
                      
                      {material.material_code && (
                        <div className="text-sm">
                          <p className="text-muted-foreground">Code</p>
                          <p className="font-mono text-xs">{material.material_code}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="usage" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Material Usage</CardTitle>
                <CardDescription>Track material consumption across projects</CardDescription>
              </CardHeader>
              <CardContent>
                {materialUsage.length === 0 ? (
                  <div className="text-center py-8">
                    <TrendingDown className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No material usage recorded yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {materialUsage.map((usage) => (
                      <div key={usage.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <h4 className="font-medium">{usage.materials?.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            Project: {usage.projects?.name}
                          </p>
                          {usage.notes && (
                            <p className="text-xs text-muted-foreground mt-1">{usage.notes}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{usage.quantity_used} units</p>
                          <p className="text-sm text-muted-foreground">${usage.total_cost}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(usage.date_used).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default MaterialTracking;