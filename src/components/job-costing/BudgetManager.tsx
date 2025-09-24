import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Save, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface BudgetManagerProps {
  projectId: string;
}

interface BudgetItem {
  id: string;
  category: string;
  description: string;
  budgeted_quantity: number;
  budgeted_unit_cost: number;
  budgeted_total: number;
  actual_quantity: number;
  actual_total: number;
  variance: number;
  cost_code_id?: string;
}

interface CostCode {
  id: string;
  code: string;
  name: string;
  category: string;
}

export const BudgetManager: React.FC<BudgetManagerProps> = ({ projectId }) => {
  const { toast } = useToast();
  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>([]);
  const [costCodes, setCostCodes] = useState<CostCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<BudgetItem | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const categories = ['labor', 'materials', 'equipment', 'subcontractors', 'overhead'];

  useEffect(() => {
    if (projectId) {
      loadData();
    }
  }, [projectId]);

  const loadData = async () => {
    try {
      // Load budget items
      const { data: budgetData, error: budgetError } = await supabase
        .from('budget_line_items')
        .select('*')
        .eq('project_id', projectId)
        .order('category', { ascending: true });

      if (budgetError) throw budgetError;

      // Load cost codes
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('company_id')
        .eq('id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (userProfile) {
        const { data: costCodeData, error: costCodeError } = await supabase
          .from('cost_codes')
          .select('*')
          .eq('company_id', userProfile.company_id)
          .eq('is_active', true)
          .order('code');

        if (costCodeError) throw costCodeError;
        setCostCodes(costCodeData || []);
      }

      setBudgetItems(budgetData || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Error",
        description: "Failed to load budget data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (item: Partial<BudgetItem>) => {
    try {
    const itemData = {
      project_id: projectId,
      category: item.category || 'materials',
      description: item.description || '',
      budgeted_quantity: item.budgeted_quantity || 1,
      budgeted_unit_cost: item.budgeted_unit_cost || 0,
      budgeted_total: (item.budgeted_quantity || 0) * (item.budgeted_unit_cost || 0),
      actual_quantity: item.actual_quantity || 0,
      actual_total: item.actual_total || 0,
      variance: (item.actual_total || 0) - ((item.budgeted_quantity || 0) * (item.budgeted_unit_cost || 0)),
      cost_code_id: item.cost_code_id || null
    };

      if (editingItem) {
        const { error } = await supabase
          .from('budget_line_items')
          .update(itemData)
          .eq('id', editingItem.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('budget_line_items')
          .insert(itemData);

        if (error) throw error;
      }

      await loadData();
      setEditingItem(null);
      setIsDialogOpen(false);
      
      toast({
        title: "Success",
        description: editingItem ? "Budget item updated" : "Budget item created",
      });
    } catch (error) {
      console.error('Error saving budget item:', error);
      toast({
        title: "Error",
        description: "Failed to save budget item",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from('budget_line_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      await loadData();
      toast({
        title: "Success",
        description: "Budget item deleted",
      });
    } catch (error) {
      console.error('Error deleting budget item:', error);
      toast({
        title: "Error",
        description: "Failed to delete budget item",
        variant: "destructive",
      });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getVarianceBadge = (variance: number) => {
    if (variance > 0) return <Badge variant="destructive">Over Budget</Badge>;
    if (variance < 0) return <Badge variant="secondary">Under Budget</Badge>;
    return <Badge variant="outline">On Budget</Badge>;
  };

  const BudgetItemForm = ({ item, onSave, onCancel }: {
    item?: BudgetItem;
    onSave: (item: Partial<BudgetItem>) => void;
    onCancel: () => void;
  }) => {
    const [formData, setFormData] = useState({
      category: item?.category || '',
      description: item?.description || '',
      budgeted_quantity: item?.budgeted_quantity || 1,
      budgeted_unit_cost: item?.budgeted_unit_cost || 0,
      actual_quantity: item?.actual_quantity || 0,
      actual_total: item?.actual_total || 0,
      cost_code_id: item?.cost_code_id || ''
    });

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="category">Category</Label>
            <Select value={formData.category} onValueChange={(value) => setFormData({...formData, category: value})}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map(category => (
                  <SelectItem key={category} value={category}>
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="cost-code">Cost Code (Optional)</Label>
            <Select value={formData.cost_code_id} onValueChange={(value) => setFormData({...formData, cost_code_id: value})}>
              <SelectTrigger>
                <SelectValue placeholder="Select cost code" />
              </SelectTrigger>
              <SelectContent>
                {costCodes.map(code => (
                  <SelectItem key={code.id} value={code.id}>
                    {code.code} - {code.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label htmlFor="description">Description</Label>
          <Input
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
            placeholder="Enter description"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="quantity">Budgeted Quantity</Label>
            <Input
              id="quantity"
              type="number"
              value={formData.budgeted_quantity}
              onChange={(e) => setFormData({...formData, budgeted_quantity: parseFloat(e.target.value) || 0})}
            />
          </div>
          
          <div>
            <Label htmlFor="unit-cost">Unit Cost</Label>
            <Input
              id="unit-cost"
              type="number"
              step="0.01"
              value={formData.budgeted_unit_cost}
              onChange={(e) => setFormData({...formData, budgeted_unit_cost: parseFloat(e.target.value) || 0})}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="actual-quantity">Actual Quantity</Label>
            <Input
              id="actual-quantity"
              type="number"
              value={formData.actual_quantity}
              onChange={(e) => setFormData({...formData, actual_quantity: parseFloat(e.target.value) || 0})}
            />
          </div>
          
          <div>
            <Label htmlFor="actual-total">Actual Total Cost</Label>
            <Input
              id="actual-total"
              type="number"
              step="0.01"
              value={formData.actual_total}
              onChange={(e) => setFormData({...formData, actual_total: parseFloat(e.target.value) || 0})}
            />
          </div>
        </div>

        <div className="p-4 bg-muted rounded-lg">
          <p className="text-sm font-medium">Budget Total: {formatCurrency(formData.budgeted_quantity * formData.budgeted_unit_cost)}</p>
          <p className="text-sm">Variance: {formatCurrency(formData.actual_total - (formData.budgeted_quantity * formData.budgeted_unit_cost))}</p>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={() => onSave(formData)}>
            <Save className="h-4 w-4 mr-2" />
            Save
          </Button>
        </div>
      </div>
    );
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Budget vs Actual Costs</CardTitle>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => setEditingItem(null)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Budget Item
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingItem ? 'Edit Budget Item' : 'Add Budget Item'}
                  </DialogTitle>
                </DialogHeader>
                <BudgetItemForm
                  item={editingItem || undefined}
                  onSave={handleSave}
                  onCancel={() => {
                    setEditingItem(null);
                    setIsDialogOpen(false);
                  }}
                />
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Category</th>
                  <th className="text-left p-2">Description</th>
                  <th className="text-right p-2">Budget</th>
                  <th className="text-right p-2">Actual</th>
                  <th className="text-right p-2">Variance</th>
                  <th className="text-center p-2">Status</th>
                  <th className="text-center p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {budgetItems.map((item) => (
                  <tr key={item.id} className="border-b hover:bg-muted/50">
                    <td className="p-2">
                      <Badge variant="outline">
                        {item.category.charAt(0).toUpperCase() + item.category.slice(1)}
                      </Badge>
                    </td>
                    <td className="p-2">{item.description}</td>
                    <td className="p-2 text-right">{formatCurrency(item.budgeted_total)}</td>
                    <td className="p-2 text-right">{formatCurrency(item.actual_total)}</td>
                    <td className="p-2 text-right">
                      <span className={item.variance > 0 ? 'text-destructive' : item.variance < 0 ? 'text-green-600' : ''}>
                        {formatCurrency(item.variance)}
                      </span>
                    </td>
                    <td className="p-2 text-center">
                      {getVarianceBadge(item.variance)}
                    </td>
                    <td className="p-2">
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingItem(item);
                            setIsDialogOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {budgetItems.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No budget items found. Add your first budget item to get started.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};