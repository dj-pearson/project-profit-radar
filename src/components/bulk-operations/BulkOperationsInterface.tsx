import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Download, Upload, Edit, Trash2, Archive, Tag, Users, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface BulkItem {
  id: string;
  type: 'project' | 'task' | 'user' | 'document';
  name: string;
  status?: string;
  assignee?: string;
  dueDate?: string;
}

interface BulkOperationsInterfaceProps {
  items: BulkItem[];
  onBulkAction: (action: string, selectedIds: string[], data?: any) => Promise<void>;
  className?: string;
}

export const BulkOperationsInterface: React.FC<BulkOperationsInterfaceProps> = ({
  items,
  onBulkAction,
  className = ''
}) => {
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleSelectAll = useCallback(() => {
    if (selectedItems.size === items.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(items.map(item => item.id)));
    }
  }, [items, selectedItems]);

  const handleItemSelect = useCallback((itemId: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  }, [selectedItems]);

  const handleBulkAction = useCallback(async () => {
    if (!bulkAction || selectedItems.size === 0) return;

    setIsProcessing(true);
    try {
      await onBulkAction(bulkAction, Array.from(selectedItems));
      
      toast({
        title: "Bulk Action Completed",
        description: `Successfully applied ${bulkAction} to ${selectedItems.size} items`,
      });

      setSelectedItems(new Set());
      setBulkAction('');
    } catch (error) {
      toast({
        title: "Bulk Action Failed",
        description: "Failed to apply bulk action. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  }, [bulkAction, selectedItems, onBulkAction, toast]);

  const bulkActions = [
    { value: 'edit-status', label: 'Change Status', icon: Edit },
    { value: 'assign-user', label: 'Assign User', icon: Users },
    { value: 'set-due-date', label: 'Set Due Date', icon: Calendar },
    { value: 'add-tags', label: 'Add Tags', icon: Tag },
    { value: 'archive', label: 'Archive', icon: Archive },
    { value: 'delete', label: 'Delete', icon: Trash2, destructive: true },
    { value: 'export', label: 'Export', icon: Download },
  ];

  const selectedCount = selectedItems.size;
  const allSelected = selectedCount === items.length && items.length > 0;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Bulk Actions Toolbar */}
      <div className="flex flex-wrap items-center gap-3 p-4 bg-muted/50 rounded-lg border">
        <div className="flex items-center gap-2">
          <Checkbox
            checked={allSelected}
            onCheckedChange={handleSelectAll}
            aria-label="Select all items"
          />
          <span className="text-sm font-medium">
            {selectedCount > 0 ? `${selectedCount} selected` : 'Select all'}
          </span>
        </div>

        {selectedCount > 0 && (
          <>
            <Separator orientation="vertical" className="h-6" />
            
            <Select value={bulkAction} onValueChange={setBulkAction}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Choose action..." />
              </SelectTrigger>
              <SelectContent>
                {bulkActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <SelectItem 
                      key={action.value} 
                      value={action.value}
                      className={action.destructive ? 'text-destructive' : ''}
                    >
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        {action.label}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>

            <Button
              onClick={handleBulkAction}
              disabled={!bulkAction || isProcessing}
              variant={bulkAction === 'delete' ? 'destructive' : 'default'}
              size="sm"
            >
              {isProcessing ? 'Processing...' : 'Apply'}
            </Button>

            <Button
              onClick={() => setSelectedItems(new Set())}
              variant="outline"
              size="sm"
            >
              Clear Selection
            </Button>
          </>
        )}

        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export All
          </Button>
        </div>
      </div>

      {/* Items List */}
      <div className="space-y-2">
        {items.map((item) => (
          <div
            key={item.id}
            className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
              selectedItems.has(item.id) 
                ? 'bg-primary/5 border-primary/20' 
                : 'bg-background hover:bg-muted/50'
            }`}
          >
            <Checkbox
              checked={selectedItems.has(item.id)}
              onCheckedChange={() => handleItemSelect(item.id)}
              aria-label={`Select ${item.name}`}
            />
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="font-medium truncate">{item.name}</h4>
                <Badge variant="outline" className="text-xs">
                  {item.type}
                </Badge>
              </div>
              
              <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                {item.status && (
                  <span>Status: {item.status}</span>
                )}
                {item.assignee && (
                  <span>Assigned: {item.assignee}</span>
                )}
                {item.dueDate && (
                  <span>Due: {item.dueDate}</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {selectedCount > 0 && (
        <div className="flex items-center justify-between p-3 bg-primary/5 rounded-lg border border-primary/20">
          <span className="text-sm font-medium text-primary">
            {selectedCount} item{selectedCount !== 1 ? 's' : ''} selected
          </span>
          <div className="flex gap-2">
            <Button
              onClick={() => setBulkAction('export')}
              variant="outline"
              size="sm"
            >
              Export Selected
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};