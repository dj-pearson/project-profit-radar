import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuditLog } from '@/hooks/useAuditLog';
import {
  CheckSquare,
  Square,
  X,
  Archive,
  UserPlus,
  Download,
  RefreshCw,
  Tag
} from 'lucide-react';

interface BulkActionsToolbarProps {
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onClearSelection: () => void;
  selectedProjectIds: string[];
  onActionComplete: () => void;
  allSelected: boolean;
}

export function BulkActionsToolbar({
  selectedCount,
  totalCount,
  onSelectAll,
  onClearSelection,
  selectedProjectIds,
  onActionComplete,
  allSelected
}: BulkActionsToolbarProps) {
  const { toast } = useToast();
  const { logAuditEvent, logDataAccess } = useAuditLog();
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [newStatus, setNewStatus] = useState<string>('');
  const [processing, setProcessing] = useState(false);

  const handleBulkStatusChange = async () => {
    if (!newStatus) {
      toast({
        variant: 'destructive',
        title: 'No Status Selected',
        description: 'Please select a status to apply'
      });
      return;
    }

    setProcessing(true);
    try {
      const { error } = await supabase
        .from('projects')
        .update({ status: newStatus })
        .in('id', selectedProjectIds);

      if (error) throw error;

      // AUDIT: Log bulk status change
      await logAuditEvent({
        actionType: 'bulk_update',
        resourceType: 'project',
        resourceName: `${selectedCount} projects`,
        newValues: { status: newStatus, projectIds: selectedProjectIds },
        riskLevel: 'medium',
        complianceCategory: 'data_access',
        description: `Bulk status change: ${selectedCount} projects updated to ${newStatus}`,
        metadata: { projectCount: selectedCount, newStatus }
      });

      toast({
        title: 'Status Updated',
        description: `${selectedCount} ${selectedCount === 1 ? 'project' : 'projects'} updated to ${newStatus.replace('_', ' ')}`
      });

      setShowStatusDialog(false);
      onActionComplete();
      onClearSelection();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to update project status'
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleBulkArchive = async () => {
    setProcessing(true);
    try {
      const { error } = await supabase
        .from('projects')
        .update({ status: 'archived', archived_at: new Date().toISOString() })
        .in('id', selectedProjectIds);

      if (error) throw error;

      // AUDIT: Log bulk archive action
      await logAuditEvent({
        actionType: 'bulk_archive',
        resourceType: 'project',
        resourceName: `${selectedCount} projects`,
        newValues: { status: 'archived', projectIds: selectedProjectIds },
        riskLevel: 'high',
        complianceCategory: 'data_access',
        description: `Bulk archive: ${selectedCount} projects archived`,
        metadata: { projectCount: selectedCount, action: 'archive' }
      });

      toast({
        title: 'Projects Archived',
        description: `${selectedCount} ${selectedCount === 1 ? 'project' : 'projects'} archived successfully`
      });

      setShowArchiveDialog(false);
      onActionComplete();
      onClearSelection();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to archive projects'
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleBulkExport = async () => {
    // Export selected projects to CSV
    try {
      const { data: projects, error } = await supabase
        .from('projects')
        .select('*')
        .in('id', selectedProjectIds);

      if (error) throw error;

      if (!projects || projects.length === 0) {
        toast({
          variant: 'destructive',
          title: 'No Data',
          description: 'No projects to export'
        });
        return;
      }

      // Convert to CSV
      const headers = ['Name', 'Client', 'Status', 'Budget', 'Start Date', 'End Date', 'Completion %'];
      const csvRows = [
        headers.join(','),
        ...projects.map(p => [
          `"${p.name}"`,
          `"${p.client_name}"`,
          p.status,
          p.budget || 0,
          p.start_date || '',
          p.end_date || '',
          p.completion_percentage || 0
        ].join(','))
      ];

      const csvContent = csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `projects-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      // AUDIT: Log data export (GDPR-relevant)
      await logDataAccess({
        dataType: 'project',
        dataClassification: 'internal',
        resourceId: selectedProjectIds.join(','),
        resourceName: `${selectedCount} projects exported`,
        accessMethod: 'export',
        accessPurpose: 'Data export to CSV',
        lawfulBasis: 'Legitimate interests'
      });

      toast({
        title: 'Export Complete',
        description: `${selectedCount} ${selectedCount === 1 ? 'project' : 'projects'} exported to CSV`
      });

      onClearSelection();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Export Failed',
        description: error.message || 'Failed to export projects'
      });
    }
  };

  if (selectedCount === 0) return null;

  return (
    <>
      <div className="bg-primary/10 border border-primary/30 rounded-lg p-3 sm:p-4 mb-4 sticky top-0 z-10 backdrop-blur-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          {/* Selection Info */}
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={allSelected ? onClearSelection : onSelectAll}
              className="gap-2"
            >
              {allSelected ? (
                <>
                  <CheckSquare className="h-4 w-4" />
                  <span className="hidden sm:inline">All Selected</span>
                </>
              ) : (
                <>
                  <Square className="h-4 w-4" />
                  <span className="hidden sm:inline">Select All</span>
                </>
              )}
            </Button>
            <div className="flex items-center gap-2">
              <Badge variant="default" className="font-semibold">
                {selectedCount} selected
              </Badge>
              <span className="text-sm text-muted-foreground hidden sm:inline">
                of {totalCount} projects
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowStatusDialog(true)}
              className="gap-2 flex-1 sm:flex-none"
            >
              <RefreshCw className="h-4 w-4" />
              <span className="hidden sm:inline">Change Status</span>
              <span className="sm:hidden">Status</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowArchiveDialog(true)}
              className="gap-2 flex-1 sm:flex-none"
            >
              <Archive className="h-4 w-4" />
              <span className="hidden sm:inline">Archive</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleBulkExport}
              className="gap-2 flex-1 sm:flex-none"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Export CSV</span>
              <span className="sm:hidden">Export</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={onClearSelection}
              className="gap-2"
            >
              <X className="h-4 w-4" />
              <span className="hidden sm:inline">Clear</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Change Status Dialog */}
      <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Project Status</DialogTitle>
            <DialogDescription>
              Update the status for {selectedCount} selected {selectedCount === 1 ? 'project' : 'projects'}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Select value={newStatus} onValueChange={setNewStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Select new status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="planning">Planning</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="on_hold">On Hold</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStatusDialog(false)} disabled={processing}>
              Cancel
            </Button>
            <Button onClick={handleBulkStatusChange} disabled={processing || !newStatus}>
              {processing ? 'Updating...' : 'Update Status'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Archive Dialog */}
      <Dialog open={showArchiveDialog} onOpenChange={setShowArchiveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Archive Projects</DialogTitle>
            <DialogDescription>
              Are you sure you want to archive {selectedCount} {selectedCount === 1 ? 'project' : 'projects'}?
              Archived projects can be restored later.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowArchiveDialog(false)} disabled={processing}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleBulkArchive} disabled={processing}>
              {processing ? 'Archiving...' : 'Archive Projects'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
