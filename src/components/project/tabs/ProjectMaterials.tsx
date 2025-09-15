import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { 
  Package, 
  PlusCircle,
  ExternalLink,
  Edit,
  Trash2,
  AlertTriangle,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  User
} from 'lucide-react';

interface Material {
  id: string;
  name: string;
  description?: string;
  category: string;
  unit: string;
  unit_cost: number;
  quantity_available: number;
  minimum_stock_level: number;
  supplier_name?: string;
  supplier_contact?: string;
  material_code?: string;
  location?: string;
  is_active: boolean;
  created_at: string;
  created_by?: string;
}

interface MaterialUsage {
  id: string;
  material_id: string;
  project_id: string;
  quantity_used: number;
  unit_cost: number;
  total_cost: number;
  date_used: string;
  notes?: string;
  used_by?: string;
  created_at: string;
  material?: Material;
  user_profile?: {
    first_name: string;
    last_name: string;
  };
}

interface ProjectMaterialsProps {
  projectId: string;
  onNavigate: (path: string) => void;
}

const materialCategories = [
  'concrete',
  'lumber',
  'steel',
  'electrical',
  'plumbing',
  'insulation',
  'roofing',
  'flooring',
  'paint',
  'hardware',
  'other'
];

const materialUnits = [
  'each',
  'sqft',
  'linear_ft',
  'cubic_ft',
  'cubic_yard',
  'ton',
  'lb',
  'gallon',
  'case',
  'box',
  'roll'
];

export const ProjectMaterials: React.FC<ProjectMaterialsProps> = ({
  projectId,
  onNavigate
}) => {
  const { userProfile } = useAuth();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [materialUsage, setMaterialUsage] = useState<MaterialUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddMaterial, setShowAddMaterial] = useState(false);
  const [showAddUsage, setShowAddUsage] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);

  const [newMaterial, setNewMaterial] = useState({
    name: '',
    description: '',
    category: '',
    unit: 'each',
    unit_cost: '',
    quantity_available: '',
    minimum_stock_level: '',
    supplier_name: '',
    supplier_contact: '',
    material_code: '',
    location: ''
  });

  const [newUsage, setNewUsage] = useState({
    material_id: '',
    quantity_used: '',
    unit_cost: '',
    date_used: new Date().toISOString().split('T')[0],
    notes: ''
  });

  useEffect(() => {
    if (projectId && userProfile?.company_id) {
      loadMaterials();
      loadMaterialUsage();
    }
  }, [projectId, userProfile?.company_id]);

  const loadMaterials = async () => {
    try {
      const { data, error } = await supabase
        .from('materials')
        .select('*')
        .eq('company_id', userProfile?.company_id)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setMaterials(data || []);
    } catch (error: any) {
      console.error('Error loading materials:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load materials"
      });
    }
  };

  const loadMaterialUsage = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('material_usage')
        .select(`
          *,
          material:materials(*),
          user_profile:user_profiles!used_by(first_name, last_name)
        `)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMaterialUsage(data || []);
    } catch (error: any) {
      console.error('Error loading material usage:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load material usage"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMaterial = async () => {
    try {
      const materialData = {
        ...newMaterial,
        company_id: userProfile?.company_id,
        unit_cost: parseFloat(newMaterial.unit_cost) || 0,
        quantity_available: parseInt(newMaterial.quantity_available) || 0,
        minimum_stock_level: parseInt(newMaterial.minimum_stock_level) || 0,
        created_by: userProfile?.id
      };

      const { data, error } = await supabase
        .from('materials')
        .insert([materialData])
        .select()
        .single();

      if (error) throw error;

      setMaterials([...materials, data]);
      setNewMaterial({
        name: '',
        description: '',
        category: '',
        unit: 'each',
        unit_cost: '',
        quantity_available: '',
        minimum_stock_level: '',
        supplier_name: '',
        supplier_contact: '',
        material_code: '',
        location: ''
      });
      setShowAddMaterial(false);

      toast({
        title: "Success",
        description: "Material created successfully"
      });
    } catch (error: any) {
      console.error('Error creating material:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to create material"
      });
    }
  };

  const handleCreateUsage = async () => {
    try {
      const quantity = parseFloat(newUsage.quantity_used);
      const unitCost = parseFloat(newUsage.unit_cost);
      
      const usageData = {
        material_id: newUsage.material_id,
        project_id: projectId,
        quantity_used: quantity,
        unit_cost: unitCost,
        total_cost: quantity * unitCost,
        date_used: newUsage.date_used,
        notes: newUsage.notes || null,
        used_by: userProfile?.id
      };

      const { data, error } = await supabase
        .from('material_usage')
        .insert([usageData])
        .select(`
          *,
          material:materials(*),
          user_profile:user_profiles!used_by(first_name, last_name)
        `)
        .single();

      if (error) throw error;

      setMaterialUsage([data, ...materialUsage]);
      setNewUsage({
        material_id: '',
        quantity_used: '',
        unit_cost: '',
        date_used: new Date().toISOString().split('T')[0],
        notes: ''
      });
      setShowAddUsage(false);

      toast({
        title: "Success",
        description: "Material usage recorded successfully"
      });
    } catch (error: any) {
      console.error('Error creating usage:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to record material usage"
      });
    }
  };

  const handleDeleteUsage = async (usageId: string) => {
    try {
      const { error } = await supabase
        .from('material_usage')
        .delete()
        .eq('id', usageId);

      if (error) throw error;

      setMaterialUsage(materialUsage.filter(usage => usage.id !== usageId));
      toast({
        title: "Success",
        description: "Material usage deleted successfully"
      });
    } catch (error: any) {
      console.error('Error deleting usage:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete material usage"
      });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getTotalCost = () => {
    return materialUsage.reduce((sum, usage) => sum + usage.total_cost, 0);
  };

  const getMaterialStats = () => {
    const totalItems = materialUsage.length;
    const uniqueMaterials = new Set(materialUsage.map(u => u.material_id)).size;
    const totalCost = getTotalCost();
    
    return { totalItems, uniqueMaterials, totalCost };
  };

  const stats = getMaterialStats();

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Usage Entries</p>
                <p className="text-2xl font-bold">{stats.totalItems}</p>
              </div>
              <Package className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Unique Materials</p>
                <p className="text-2xl font-bold">{stats.uniqueMaterials}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Cost</p>
                <p className="text-xl font-bold text-green-600">{formatCurrency(stats.totalCost)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Materials Usage */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center">
              <Package className="h-5 w-5 mr-2" />
              Material Usage ({materialUsage.length})
            </span>
            <div className="flex gap-2">
              <Button 
                size="sm" 
                onClick={() => onNavigate(`/materials?project=${projectId}`)}
                variant="outline"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Manage Materials
              </Button>
              <Dialog open={showAddUsage} onOpenChange={setShowAddUsage}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Record Usage
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Record Material Usage</DialogTitle>
                    <DialogDescription>
                      Record materials used on this project
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="material">Material</Label>
                      <Select value={newUsage.material_id} onValueChange={(value) => setNewUsage({...newUsage, material_id: value})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select material" />
                        </SelectTrigger>
                        <SelectContent>
                          {materials.map((material) => (
                            <SelectItem key={material.id} value={material.id}>
                              {material.name} ({material.unit})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="quantity">Quantity Used</Label>
                        <Input
                          id="quantity"
                          type="number"
                          step="0.01"
                          value={newUsage.quantity_used}
                          onChange={(e) => setNewUsage({...newUsage, quantity_used: e.target.value})}
                          placeholder="0.00"
                        />
                      </div>
                      <div>
                        <Label htmlFor="unit_cost">Unit Cost</Label>
                        <Input
                          id="unit_cost"
                          type="number"
                          step="0.01"
                          value={newUsage.unit_cost}
                          onChange={(e) => setNewUsage({...newUsage, unit_cost: e.target.value})}
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="date_used">Date Used</Label>
                      <Input
                        id="date_used"
                        type="date"
                        value={newUsage.date_used}
                        onChange={(e) => setNewUsage({...newUsage, date_used: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label htmlFor="notes">Notes (Optional)</Label>
                      <Textarea
                        id="notes"
                        value={newUsage.notes}
                        onChange={(e) => setNewUsage({...newUsage, notes: e.target.value})}
                        placeholder="Additional notes..."
                        rows={3}
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setShowAddUsage(false)}>
                        Cancel
                      </Button>
                      <Button 
                        onClick={handleCreateUsage}
                        disabled={!newUsage.material_id || !newUsage.quantity_used || !newUsage.unit_cost}
                      >
                        Record Usage
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              <Dialog open={showAddMaterial} onOpenChange={setShowAddMaterial}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="secondary">
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Add Material
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Add New Material</DialogTitle>
                    <DialogDescription>
                      Add a new material to your inventory
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    <div>
                      <Label htmlFor="name">Material Name *</Label>
                      <Input
                        id="name"
                        value={newMaterial.name}
                        onChange={(e) => setNewMaterial({...newMaterial, name: e.target.value})}
                        placeholder="e.g., 2x4 Lumber"
                      />
                    </div>
                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={newMaterial.description}
                        onChange={(e) => setNewMaterial({...newMaterial, description: e.target.value})}
                        placeholder="Material description..."
                        rows={2}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="category">Category</Label>
                        <Select value={newMaterial.category} onValueChange={(value) => setNewMaterial({...newMaterial, category: value})}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            {materialCategories.map((category) => (
                              <SelectItem key={category} value={category}>
                                {category.charAt(0).toUpperCase() + category.slice(1)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="unit">Unit</Label>
                        <Select value={newMaterial.unit} onValueChange={(value) => setNewMaterial({...newMaterial, unit: value})}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select unit" />
                          </SelectTrigger>
                          <SelectContent>
                            {materialUnits.map((unit) => (
                              <SelectItem key={unit} value={unit}>
                                {unit}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="unit_cost">Unit Cost</Label>
                        <Input
                          id="unit_cost"
                          type="number"
                          step="0.01"
                          value={newMaterial.unit_cost}
                          onChange={(e) => setNewMaterial({...newMaterial, unit_cost: e.target.value})}
                          placeholder="0.00"
                        />
                      </div>
                      <div>
                        <Label htmlFor="quantity_available">Quantity</Label>
                        <Input
                          id="quantity_available"
                          type="number"
                          value={newMaterial.quantity_available}
                          onChange={(e) => setNewMaterial({...newMaterial, quantity_available: e.target.value})}
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <Label htmlFor="minimum_stock_level">Min Stock</Label>
                        <Input
                          id="minimum_stock_level"
                          type="number"
                          value={newMaterial.minimum_stock_level}
                          onChange={(e) => setNewMaterial({...newMaterial, minimum_stock_level: e.target.value})}
                          placeholder="0"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="supplier_name">Supplier</Label>
                        <Input
                          id="supplier_name"
                          value={newMaterial.supplier_name}
                          onChange={(e) => setNewMaterial({...newMaterial, supplier_name: e.target.value})}
                          placeholder="Supplier name"
                        />
                      </div>
                      <div>
                        <Label htmlFor="material_code">Material Code</Label>
                        <Input
                          id="material_code"
                          value={newMaterial.material_code}
                          onChange={(e) => setNewMaterial({...newMaterial, material_code: e.target.value})}
                          placeholder="SKU/Code"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="location">Location</Label>
                      <Input
                        id="location"
                        value={newMaterial.location}
                        onChange={(e) => setNewMaterial({...newMaterial, location: e.target.value})}
                        placeholder="Storage location"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setShowAddMaterial(false)}>
                        Cancel
                      </Button>
                      <Button 
                        onClick={handleCreateMaterial}
                        disabled={!newMaterial.name || !newMaterial.category}
                      >
                        Add Material
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardTitle>
          <CardDescription>Track material consumption and costs for this project</CardDescription>
        </CardHeader>
        <CardContent>
          {materialUsage.length > 0 ? (
            <div className="space-y-4">
              {materialUsage.map((usage) => (
                <div key={usage.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{usage.material?.name}</span>
                        {usage.material?.category && (
                          <Badge variant="outline">
                            {usage.material.category}
                          </Badge>
                        )}
                      </div>
                      {usage.material?.description && (
                        <p className="text-sm text-muted-foreground mt-1">{usage.material.description}</p>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="text-right">
                        <div className="flex items-center">
                          <DollarSign className="h-4 w-4 text-green-600" />
                          <span className="font-medium text-green-600">
                            {formatCurrency(usage.total_cost)}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {usage.quantity_used} {usage.material?.unit} × {formatCurrency(usage.unit_cost)}
                        </p>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleDeleteUsage(usage.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Used:</span>
                      <span>{new Date(usage.date_used).toLocaleDateString()}</span>
                    </div>
                    {usage.user_profile && (
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">By:</span>
                        <span>
                          {`${usage.user_profile.first_name} ${usage.user_profile.last_name}`.trim()}
                        </span>
                      </div>
                    )}
                  </div>

                  {usage.notes && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Notes:</span>
                      <p className="mt-1">{usage.notes}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">No material usage recorded for this project yet</p>
              <Button onClick={() => setShowAddUsage(true)} variant="outline">
                <PlusCircle className="h-4 w-4 mr-2" />
                Record First Usage
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
