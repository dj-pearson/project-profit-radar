import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Package, 
  Minus, 
  Plus, 
  Search, 
  AlertTriangle,
  CheckCircle,
  QrCode
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Material {
  id: string;
  name: string;
  quantity_available: number;
  unit: string;
  minimum_stock_level: number;
  unit_cost: number;
  category: string;
  location?: string;
}

interface MobileMaterialScannerProps {
  onUsageRecorded: () => void;
  projectId: string;
  companyId: string;
}

const MobileMaterialScanner: React.FC<MobileMaterialScannerProps> = ({
  onUsageRecorded,
  projectId,
  companyId
}) => {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [filteredMaterials, setFilteredMaterials] = useState<Material[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [usageQuantity, setUsageQuantity] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [showUsageDialog, setShowUsageDialog] = useState(false);

  React.useEffect(() => {
    loadMaterials();
  }, [companyId]);

  React.useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = materials.filter(material =>
        material.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        material.category.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredMaterials(filtered);
    } else {
      setFilteredMaterials(materials);
    }
  }, [searchQuery, materials]);

  const loadMaterials = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('materials')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setMaterials(data || []);
      setFilteredMaterials(data || []);
    } catch (error) {
      console.error('Error loading materials:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load materials"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleMaterialSelect = (material: Material) => {
    setSelectedMaterial(material);
    setUsageQuantity(1);
    setShowUsageDialog(true);
  };

  const recordUsage = async () => {
    if (!selectedMaterial || usageQuantity <= 0) return;

    try {
      setIsLoading(true);
      
      const totalCost = usageQuantity * selectedMaterial.unit_cost;
      
      const { error } = await supabase
        .from('material_usage')
        .insert([{
          material_id: selectedMaterial.id,
          project_id: projectId,
          quantity_used: usageQuantity,
          unit_cost: selectedMaterial.unit_cost,
          total_cost: totalCost,
          date_used: new Date().toISOString().split('T')[0]
        }]);

      if (error) throw error;

      // Update material quantity
      const newQuantity = selectedMaterial.quantity_available - usageQuantity;
      await supabase
        .from('materials')
        .update({ quantity_available: newQuantity })
        .eq('id', selectedMaterial.id);

      toast({
        title: "Usage Recorded",
        description: `${usageQuantity} ${selectedMaterial.unit} of ${selectedMaterial.name} recorded`
      });

      setShowUsageDialog(false);
      setSelectedMaterial(null);
      loadMaterials();
      onUsageRecorded();
      
    } catch (error) {
      console.error('Error recording usage:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to record material usage"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStockStatus = (material: Material) => {
    if (material.quantity_available <= 0) return 'out';
    if (material.quantity_available <= material.minimum_stock_level) return 'low';
    return 'good';
  };

  const getStockBadge = (material: Material) => {
    const status = getStockStatus(material);
    switch (status) {
      case 'out':
        return <Badge variant="destructive">Out of Stock</Badge>;
      case 'low':
        return <Badge variant="outline" className="border-yellow-500 text-yellow-600">Low Stock</Badge>;
      default:
        return <Badge variant="secondary">In Stock</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search materials..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Materials List */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-sm text-muted-foreground mt-2">Loading materials...</p>
          </div>
        ) : filteredMaterials.length === 0 ? (
          <div className="text-center py-8">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No materials found</p>
          </div>
        ) : (
          filteredMaterials.map((material) => (
            <Card 
              key={material.id} 
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => handleMaterialSelect(material)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="font-medium">{material.name}</h3>
                    <p className="text-sm text-muted-foreground">{material.category}</p>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="text-sm">
                        {material.quantity_available} {material.unit}
                      </span>
                      {material.location && (
                        <span className="text-xs text-muted-foreground">
                          📍 {material.location}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    {getStockBadge(material)}
                    <p className="text-sm font-medium mt-1">
                      ${material.unit_cost}/{material.unit}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Usage Dialog */}
      <Dialog open={showUsageDialog} onOpenChange={setShowUsageDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Record Usage</DialogTitle>
          </DialogHeader>
          
          {selectedMaterial && (
            <div className="space-y-4">
              <div>
                <h3 className="font-medium">{selectedMaterial.name}</h3>
                <p className="text-sm text-muted-foreground">
                  Available: {selectedMaterial.quantity_available} {selectedMaterial.unit}
                </p>
              </div>

              <div>
                <Label htmlFor="quantity">Quantity Used</Label>
                <div className="flex items-center space-x-2 mt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setUsageQuantity(Math.max(0, usageQuantity - 1))}
                    disabled={usageQuantity <= 0}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Input
                    id="quantity"
                    type="number"
                    value={usageQuantity}
                    onChange={(e) => setUsageQuantity(Number(e.target.value))}
                    className="text-center"
                    min="0"
                    max={selectedMaterial.quantity_available}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setUsageQuantity(Math.min(selectedMaterial.quantity_available, usageQuantity + 1))}
                    disabled={usageQuantity >= selectedMaterial.quantity_available}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Cost: ${(usageQuantity * selectedMaterial.unit_cost).toFixed(2)}
                </p>
              </div>

              {usageQuantity > selectedMaterial.quantity_available && (
                <div className="flex items-center space-x-2 text-yellow-600">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm">Insufficient stock available</span>
                </div>
              )}

              <div className="flex space-x-2">
                <Button 
                  variant="outline" 
                  onClick={() => setShowUsageDialog(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={recordUsage}
                  disabled={isLoading || usageQuantity <= 0 || usageQuantity > selectedMaterial.quantity_available}
                  className="flex-1"
                >
                  {isLoading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Record
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MobileMaterialScanner;