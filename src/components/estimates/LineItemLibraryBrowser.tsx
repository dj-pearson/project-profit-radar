import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Search,
  Plus,
  DollarSign,
  Package,
  CheckCircle2,
  Filter
} from 'lucide-react';

interface LineItemLibraryItem {
  id: string;
  item_name: string;
  description: string;
  default_quantity: number;
  default_unit: string;
  default_unit_cost: number;
  category: string;
  labor_cost: number | null;
  material_cost: number | null;
  equipment_cost: number | null;
  is_global: boolean;
  use_count: number;
  last_used_at: string | null;
}

interface LineItemLibraryBrowserProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddItems: (items: LineItemLibraryItem[]) => void;
  companyId?: string;
}

export function LineItemLibraryBrowser({
  open,
  onOpenChange,
  onAddItems,
  companyId
}: LineItemLibraryBrowserProps) {
  const [libraryItems, setLibraryItems] = useState<LineItemLibraryItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadLibraryItems();
      setSelectedItems(new Set());
    }
  }, [open, companyId]);

  const loadLibraryItems = async () => {
    try {
      setLoading(true);

      let query = supabase
        .from('line_item_library')
        .select('*')
        .eq('is_active', true);

      if (companyId) {
        query = query.or(`is_global.eq.true,company_id.eq.${companyId}`);
      } else {
        query = query.eq('is_global', true);
      }

      const { data, error } = await query.order('use_count', { ascending: false });

      if (error) throw error;
      setLibraryItems(data || []);
    } catch (error: any) {
      console.error('Error loading line item library:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load line item library'
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleItemSelection = (itemId: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  };

  const handleAddSelected = async () => {
    const itemsToAdd = libraryItems.filter(item => selectedItems.has(item.id));

    if (itemsToAdd.length === 0) {
      toast({
        variant: 'destructive',
        title: 'No Items Selected',
        description: 'Please select at least one line item to add'
      });
      return;
    }

    // Increment use count for each item
    for (const item of itemsToAdd) {
      await supabase.rpc('increment_line_item_use_count', { item_id: item.id }).catch(console.error);
    }

    onAddItems(itemsToAdd);
    onOpenChange(false);

    toast({
      title: 'Items Added',
      description: `${itemsToAdd.length} ${itemsToAdd.length === 1 ? 'item' : 'items'} added to estimate`
    });
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      framing: 'Framing',
      drywall: 'Drywall',
      electrical: 'Electrical',
      plumbing: 'Plumbing',
      flooring: 'Flooring',
      painting: 'Painting',
      cabinets: 'Cabinets',
      labor: 'Labor',
      all: 'All Items'
    };
    return labels[category] || category;
  };

  const categories = Array.from(new Set(libraryItems.map(item => item.category))).filter(Boolean);

  const filteredItems = libraryItems.filter(item => {
    const matchesSearch = !searchTerm ||
      item.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Line Item Library
          </DialogTitle>
          <DialogDescription>
            Select line items from the library to add to your estimate
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search line items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Selected Count */}
          {selectedItems.size > 0 && (
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 flex items-center justify-between">
              <span className="text-sm font-medium">
                {selectedItems.size} {selectedItems.size === 1 ? 'item' : 'items'} selected
              </span>
              <Button size="sm" onClick={() => setSelectedItems(new Set())}>
                Clear Selection
              </Button>
            </div>
          )}

          {/* Category Tabs */}
          <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="flex-1 overflow-hidden flex flex-col">
            <TabsList className="w-full justify-start overflow-x-auto">
              <TabsTrigger value="all">All ({libraryItems.length})</TabsTrigger>
              {categories.map(category => (
                <TabsTrigger key={category} value={category}>
                  {getCategoryLabel(category)} ({libraryItems.filter(i => i.category === category).length})
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value={selectedCategory} className="flex-1 overflow-y-auto mt-4">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading library...</p>
                  </div>
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No items found</h3>
                  <p className="text-muted-foreground">
                    {searchTerm ? 'Try adjusting your search' : 'No line items available in this category'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2 pb-4">
                  {filteredItems.map((item) => (
                    <div
                      key={item.id}
                      className={`border rounded-lg p-3 cursor-pointer transition-all ${
                        selectedItems.has(item.id)
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50 hover:bg-muted/50'
                      }`}
                      onClick={() => toggleItemSelection(item.id)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          {/* Checkbox */}
                          <div className="mt-1">
                            <div className={`h-4 w-4 rounded border flex items-center justify-center ${
                              selectedItems.has(item.id)
                                ? 'bg-primary border-primary'
                                : 'border-muted-foreground'
                            }`}>
                              {selectedItems.has(item.id) && (
                                <CheckCircle2 className="h-3 w-3 text-primary-foreground" />
                              )}
                            </div>
                          </div>

                          {/* Item Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium text-sm leading-tight">
                                {item.item_name}
                              </h4>
                              <Badge variant="outline" className="text-xs">
                                {getCategoryLabel(item.category)}
                              </Badge>
                              {item.is_global && (
                                <Badge variant="secondary" className="text-xs">Global</Badge>
                              )}
                            </div>
                            {item.description && (
                              <p className="text-xs text-muted-foreground line-clamp-1 mb-2">
                                {item.description}
                              </p>
                            )}

                            {/* Pricing */}
                            <div className="flex items-center gap-4 text-xs">
                              <div className="flex items-center gap-1">
                                <DollarSign className="h-3 w-3" />
                                <span className="font-medium">${item.default_unit_cost.toFixed(2)}</span>
                                <span className="text-muted-foreground">/ {item.default_unit}</span>
                              </div>
                              <div className="text-muted-foreground">
                                Qty: {item.default_quantity}
                              </div>
                              {(item.labor_cost || item.material_cost) && (
                                <div className="text-muted-foreground">
                                  {item.labor_cost && `Labor: $${item.labor_cost.toFixed(2)}`}
                                  {item.labor_cost && item.material_cost && ' | '}
                                  {item.material_cost && `Material: $${item.material_cost.toFixed(2)}`}
                                </div>
                              )}
                            </div>

                            {/* Usage Info */}
                            {item.use_count > 0 && (
                              <div className="text-xs text-muted-foreground mt-1">
                                Used {item.use_count} {item.use_count === 1 ? 'time' : 'times'}
                                {item.last_used_at && (
                                  <span> • Last used {new Date(item.last_used_at).toLocaleDateString()}</span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        <div className="flex justify-between items-center pt-4 border-t gap-4">
          <p className="text-sm text-muted-foreground">
            {filteredItems.length} {filteredItems.length === 1 ? 'item' : 'items'} available
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddSelected}
              disabled={selectedItems.size === 0}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Add {selectedItems.size > 0 ? `(${selectedItems.size})` : 'Selected'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
