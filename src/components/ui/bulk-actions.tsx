import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { 
  MoreVertical, 
  Trash2, 
  Copy, 
  Archive, 
  Download, 
  Edit,
  CheckCircle2,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface BulkAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  action: (selectedIds: string[]) => void;
  variant?: 'default' | 'destructive';
  requiresConfirmation?: boolean;
}

interface BulkActionsProps {
  items: Array<{ id: string; [key: string]: any }>;
  selectedIds: string[];
  onSelectionChange: (selectedIds: string[]) => void;
  actions: BulkAction[];
  className?: string;
}

interface SelectableItemProps {
  id: string;
  selected: boolean;
  onSelectionChange: (id: string, selected: boolean) => void;
  children: React.ReactNode;
  className?: string;
}

export const useBulkSelection = (items: Array<{ id: string }>) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const handleSelectAll = useCallback((checked: boolean) => {
    setSelectedIds(checked ? items.map(item => item.id) : []);
  }, [items]);

  const handleSelectItem = useCallback((id: string, checked: boolean) => {
    setSelectedIds(prev => 
      checked 
        ? [...prev, id]
        : prev.filter(selectedId => selectedId !== id)
    );
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds([]);
  }, []);

  const isAllSelected = selectedIds.length === items.length && items.length > 0;
  const isSomeSelected = selectedIds.length > 0 && selectedIds.length < items.length;

  return {
    selectedIds,
    setSelectedIds,
    handleSelectAll,
    handleSelectItem,
    clearSelection,
    isAllSelected,
    isSomeSelected,
    selectedCount: selectedIds.length
  };
};

export const BulkActionsBar = ({ 
  items, 
  selectedIds, 
  onSelectionChange, 
  actions, 
  className 
}: BulkActionsProps) => {
  const { 
    handleSelectAll, 
    isAllSelected, 
    isSomeSelected,
    selectedCount
  } = useBulkSelection(items);

  const handleExecuteAction = (action: BulkAction) => {
    if (action.requiresConfirmation) {
      const confirmed = window.confirm(
        `Are you sure you want to ${action.label.toLowerCase()} ${selectedCount} item${selectedCount > 1 ? 's' : ''}?`
      );
      if (!confirmed) return;
    }
    
    action.action(selectedIds);
    onSelectionChange([]);
  };

  if (selectedCount === 0) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <Checkbox
          checked={isAllSelected}
          onCheckedChange={(checked) => {
            handleSelectAll(!!checked);
            onSelectionChange(!!checked ? items.map(item => item.id) : []);
          }}
        />
        <span className="text-sm text-muted-foreground">
          Select all ({items.length})
        </span>
      </div>
    );
  }

  return (
    <div className={cn(
      "flex items-center gap-2 p-3 bg-primary/10 border border-primary/20 rounded-lg",
      className
    )}>
      <Checkbox
        checked={isAllSelected}
        onCheckedChange={(checked) => {
          handleSelectAll(!!checked);
          onSelectionChange(!!checked ? items.map(item => item.id) : []);
        }}
      />
      
      <Badge variant="secondary" className="ml-2">
        {selectedCount} selected
      </Badge>

      <div className="flex items-center gap-1 ml-auto">
        {actions.slice(0, 3).map((action) => (
          <Button
            key={action.id}
            variant={action.variant === 'destructive' ? 'destructive' : 'secondary'}
            size="sm"
            onClick={() => handleExecuteAction(action)}
            className="h-8"
          >
            {action.icon}
            <span className="ml-1 hidden sm:inline">{action.label}</span>
          </Button>
        ))}
        
        {actions.length > 3 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="sm" className="h-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {actions.slice(3).map((action) => (
                <DropdownMenuItem
                  key={action.id}
                  onClick={() => handleExecuteAction(action)}
                  className={action.variant === 'destructive' ? 'text-destructive' : ''}
                >
                  {action.icon}
                  <span className="ml-2">{action.label}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        <Button
          variant="ghost"
          size="sm"
          onClick={() => onSelectionChange([])}
          className="h-8 ml-2"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export const SelectableItem = ({ 
  id, 
  selected, 
  onSelectionChange, 
  children, 
  className 
}: SelectableItemProps) => {
  return (
    <div 
      className={cn(
        "relative group transition-colors",
        selected && "bg-primary/5 ring-1 ring-primary/20",
        className
      )}
    >
      <div className="absolute left-2 top-2 z-10">
        <Checkbox
          checked={selected}
          onCheckedChange={(checked) => onSelectionChange(id, !!checked)}
          className={cn(
            "transition-opacity",
            selected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          )}
        />
      </div>
      <div className={cn(selected && "pl-8")}>
        {children}
      </div>
    </div>
  );
};

// Common bulk actions for construction management
export const defaultBulkActions: BulkAction[] = [
  {
    id: 'complete',
    label: 'Mark Complete',
    icon: <CheckCircle2 className="h-4 w-4" />,
    action: (ids) => console.log('Mark complete:', ids)
  },
  {
    id: 'duplicate',
    label: 'Duplicate',
    icon: <Copy className="h-4 w-4" />,
    action: (ids) => console.log('Duplicate:', ids)
  },
  {
    id: 'archive',
    label: 'Archive',
    icon: <Archive className="h-4 w-4" />,
    action: (ids) => console.log('Archive:', ids)
  },
  {
    id: 'export',
    label: 'Export',
    icon: <Download className="h-4 w-4" />,
    action: (ids) => console.log('Export:', ids)
  },
  {
    id: 'delete',
    label: 'Delete',
    icon: <Trash2 className="h-4 w-4" />,
    variant: 'destructive' as const,
    requiresConfirmation: true,
    action: (ids) => console.log('Delete:', ids)
  }
];

/**
 * Create bulk actions for invoices
 * @param handlers - Object containing handler functions for each action
 */
export const createInvoiceBulkActions = (handlers: {
  onMarkSent?: (ids: string[]) => Promise<void>;
  onMarkPaid?: (ids: string[]) => Promise<void>;
  onExport?: (ids: string[]) => Promise<void>;
  onSendReminder?: (ids: string[]) => Promise<void>;
  onArchive?: (ids: string[]) => Promise<void>;
  onDelete?: (ids: string[]) => Promise<void>;
}): BulkAction[] => [
  ...(handlers.onMarkSent ? [{
    id: 'mark-sent',
    label: 'Mark Sent',
    icon: <CheckCircle2 className="h-4 w-4" />,
    action: handlers.onMarkSent
  }] : []),
  ...(handlers.onMarkPaid ? [{
    id: 'mark-paid',
    label: 'Mark Paid',
    icon: <CheckCircle2 className="h-4 w-4" />,
    action: handlers.onMarkPaid
  }] : []),
  ...(handlers.onSendReminder ? [{
    id: 'send-reminder',
    label: 'Send Reminder',
    icon: <Edit className="h-4 w-4" />,
    action: handlers.onSendReminder
  }] : []),
  ...(handlers.onExport ? [{
    id: 'export',
    label: 'Export',
    icon: <Download className="h-4 w-4" />,
    action: handlers.onExport
  }] : []),
  ...(handlers.onArchive ? [{
    id: 'archive',
    label: 'Archive',
    icon: <Archive className="h-4 w-4" />,
    action: handlers.onArchive,
    requiresConfirmation: true
  }] : []),
  ...(handlers.onDelete ? [{
    id: 'delete',
    label: 'Delete',
    icon: <Trash2 className="h-4 w-4" />,
    variant: 'destructive' as const,
    requiresConfirmation: true,
    action: handlers.onDelete
  }] : [])
];

/**
 * Create bulk actions for expenses
 * @param handlers - Object containing handler functions for each action
 */
export const createExpenseBulkActions = (handlers: {
  onApprove?: (ids: string[]) => Promise<void>;
  onReject?: (ids: string[]) => Promise<void>;
  onCategorize?: (ids: string[], category: string) => Promise<void>;
  onExport?: (ids: string[]) => Promise<void>;
  onMarkReimbursed?: (ids: string[]) => Promise<void>;
  onDelete?: (ids: string[]) => Promise<void>;
}): BulkAction[] => [
  ...(handlers.onApprove ? [{
    id: 'approve',
    label: 'Approve',
    icon: <CheckCircle2 className="h-4 w-4" />,
    action: handlers.onApprove
  }] : []),
  ...(handlers.onReject ? [{
    id: 'reject',
    label: 'Reject',
    icon: <X className="h-4 w-4" />,
    variant: 'destructive' as const,
    action: handlers.onReject
  }] : []),
  ...(handlers.onMarkReimbursed ? [{
    id: 'mark-reimbursed',
    label: 'Mark Reimbursed',
    icon: <CheckCircle2 className="h-4 w-4" />,
    action: handlers.onMarkReimbursed
  }] : []),
  ...(handlers.onExport ? [{
    id: 'export',
    label: 'Export',
    icon: <Download className="h-4 w-4" />,
    action: handlers.onExport
  }] : []),
  ...(handlers.onDelete ? [{
    id: 'delete',
    label: 'Delete',
    icon: <Trash2 className="h-4 w-4" />,
    variant: 'destructive' as const,
    requiresConfirmation: true,
    action: handlers.onDelete
  }] : [])
];

/**
 * Create bulk actions for tasks
 * @param handlers - Object containing handler functions for each action
 */
export const createTaskBulkActions = (handlers: {
  onMarkComplete?: (ids: string[]) => Promise<void>;
  onAssign?: (ids: string[], assigneeId: string) => Promise<void>;
  onChangePriority?: (ids: string[], priority: string) => Promise<void>;
  onArchive?: (ids: string[]) => Promise<void>;
  onDuplicate?: (ids: string[]) => Promise<void>;
  onDelete?: (ids: string[]) => Promise<void>;
}): BulkAction[] => [
  ...(handlers.onMarkComplete ? [{
    id: 'mark-complete',
    label: 'Mark Complete',
    icon: <CheckCircle2 className="h-4 w-4" />,
    action: handlers.onMarkComplete
  }] : []),
  ...(handlers.onDuplicate ? [{
    id: 'duplicate',
    label: 'Duplicate',
    icon: <Copy className="h-4 w-4" />,
    action: handlers.onDuplicate
  }] : []),
  ...(handlers.onArchive ? [{
    id: 'archive',
    label: 'Archive',
    icon: <Archive className="h-4 w-4" />,
    action: handlers.onArchive,
    requiresConfirmation: true
  }] : []),
  ...(handlers.onDelete ? [{
    id: 'delete',
    label: 'Delete',
    icon: <Trash2 className="h-4 w-4" />,
    variant: 'destructive' as const,
    requiresConfirmation: true,
    action: handlers.onDelete
  }] : [])
];