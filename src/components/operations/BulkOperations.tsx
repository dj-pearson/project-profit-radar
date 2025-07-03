import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Settings, File, Calendar, Bell } from 'lucide-react';

interface BulkItem {
  id: string;
  name: string;
  type: 'project' | 'invoice' | 'expense' | 'document' | 'task';
  status: string;
  lastModified: string;
  metadata?: Record<string, any>;
}

interface BulkOperation {
  id: string;
  name: string;
  description: string;
  appliesTo: string[];
  action: string;
  parameters?: Record<string, any>;
}

const BulkOperations = () => {
  const { userProfile } = useAuth();
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [items, setItems] = useState<BulkItem[]>([]);
  const [operations, setOperations] = useState<BulkOperation[]>([]);
  const [selectedOperation, setSelectedOperation] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [filter, setFilter] = useState<string>('all');

  const bulkOperations: BulkOperation[] = [
    {
      id: 'update_status',
      name: 'Update Status',
      description: 'Change the status of multiple items at once',
      appliesTo: ['project', 'invoice', 'task'],
      action: 'status_change',
      parameters: { statusOptions: ['active', 'completed', 'cancelled', 'on_hold'] }
    },
    {
      id: 'archive_items',
      name: 'Archive Items',
      description: 'Archive multiple items to keep workspace clean',
      appliesTo: ['project', 'document', 'task'],
      action: 'archive'
    },
    {
      id: 'delete_items',
      name: 'Delete Items',
      description: 'Permanently delete selected items',
      appliesTo: ['document', 'task', 'expense'],
      action: 'delete'
    },
    {
      id: 'export_data',
      name: 'Export Data',
      description: 'Export selected items to CSV or PDF',
      appliesTo: ['project', 'invoice', 'expense'],
      action: 'export',
      parameters: { formats: ['csv', 'pdf', 'excel'] }
    },
    {
      id: 'send_notifications',
      name: 'Send Notifications',
      description: 'Send email notifications about selected items',
      appliesTo: ['project', 'invoice', 'task'],
      action: 'notify'
    },
    {
      id: 'assign_users',
      name: 'Assign Users',
      description: 'Assign team members to multiple items',
      appliesTo: ['project', 'task'],
      action: 'assign'
    }
  ];

  useEffect(() => {
    loadItems();
    setOperations(bulkOperations);
  }, [userProfile, filter]);

  const loadItems = async () => {
    if (!userProfile?.company_id) return;

    try {
      const items: BulkItem[] = [];

      // Load projects
      if (filter === 'all' || filter === 'project') {
        const { data: projects, error: projectError } = await supabase
          .from('projects')
          .select('id, name, status, updated_at')
          .eq('company_id', userProfile.company_id)
          .order('updated_at', { ascending: false });

        if (!projectError && projects) {
          items.push(...projects.map(p => ({
            id: `project-${p.id}`,
            name: p.name,
            type: 'project' as const,
            status: p.status || 'active',
            lastModified: p.updated_at,
            metadata: { originalId: p.id, table: 'projects' }
          })));
        }
      }

      // Load invoices
      if (filter === 'all' || filter === 'invoice') {
        const { data: invoices, error: invoiceError } = await supabase
          .from('invoices')
          .select('id, invoice_number, client_name, status, updated_at, total_amount')
          .eq('company_id', userProfile.company_id)
          .order('updated_at', { ascending: false });

        if (!invoiceError && invoices) {
          items.push(...invoices.map(i => ({
            id: `invoice-${i.id}`,
            name: `${i.invoice_number} - ${i.client_name || 'Unknown Client'}`,
            type: 'invoice' as const,
            status: i.status || 'draft',
            lastModified: i.updated_at,
            metadata: { originalId: i.id, table: 'invoices', amount: i.total_amount }
          })));
        }
      }

      // Load documents
      if (filter === 'all' || filter === 'document') {
        const { data: documents, error: documentError } = await supabase
          .from('documents')
          .select('id, name, updated_at')
          .eq('company_id', userProfile.company_id)
          .order('updated_at', { ascending: false });

        if (!documentError && documents) {
          items.push(...documents.map(d => ({
            id: `document-${d.id}`,
            name: d.name,
            type: 'document' as const,
            status: 'active',
            lastModified: d.updated_at,
            metadata: { originalId: d.id, table: 'documents' }
          })));
        }
      }

      // Add mock tasks and expenses for demonstration
      if (filter === 'all' || filter === 'task') {
        const mockTasks = [
          { id: 'task-1', name: 'Site Inspection', status: 'pending' },
          { id: 'task-2', name: 'Material Delivery', status: 'completed' },
          { id: 'task-3', name: 'Safety Review', status: 'in_progress' }
        ].map(t => ({
          id: t.id,
          name: t.name,
          type: 'task' as const,
          status: t.status,
          lastModified: new Date().toISOString(),
          metadata: { originalId: t.id, table: 'tasks' }
        }));
        items.push(...mockTasks);
      }

      setItems(items);
    } catch (error) {
      console.error('Error loading items:', error);
    }
  };

  const toggleItemSelection = (itemId: string) => {
    setSelectedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const toggleAllItems = () => {
    if (selectedItems.length === filteredItems.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(filteredItems.map(item => item.id));
    }
  };

  const getApplicableOperations = () => {
    if (selectedItems.length === 0) return [];

    const selectedTypes = new Set(
      selectedItems.map(id => items.find(item => item.id === id)?.type).filter(Boolean)
    );

    return operations.filter(op => 
      Array.from(selectedTypes).some(type => op.appliesTo.includes(type!))
    );
  };

  const executeBulkOperation = async () => {
    if (!selectedOperation || selectedItems.length === 0) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select an operation and items to process."
      });
      return;
    }

    const operation = operations.find(op => op.id === selectedOperation);
    if (!operation) return;

    setIsProcessing(true);
    setProgress(0);

    try {
      const selectedItemsData = selectedItems.map(id => items.find(item => item.id === id)).filter(Boolean);
      const totalItems = selectedItemsData.length;

      for (let i = 0; i < selectedItemsData.length; i++) {
        const item = selectedItemsData[i];
        
        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 500));

        // Execute the operation based on type
        switch (operation.action) {
          case 'status_change':
            await updateItemStatus(item!, 'completed');
            break;
          case 'archive':
            await archiveItem(item!);
            break;
          case 'delete':
            await deleteItem(item!);
            break;
          case 'export':
            // Export would be handled differently
            break;
          case 'notify':
            await sendNotification(item!);
            break;
          case 'assign':
            await assignUser(item!);
            break;
        }

        setProgress(((i + 1) / totalItems) * 100);
      }

      toast({
        title: "Bulk Operation Complete",
        description: `Successfully processed ${selectedItemsData.length} items.`
      });

      // Refresh items and clear selection
      setSelectedItems([]);
      loadItems();

    } catch (error) {
      console.error('Bulk operation error:', error);
      toast({
        variant: "destructive",
        title: "Operation Failed",
        description: "Some items could not be processed. Please try again."
      });
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  const updateItemStatus = async (item: BulkItem, newStatus: string) => {
    if (!item.metadata?.originalId || !item.metadata?.table) return;

    const { error } = await supabase
      .from(item.metadata.table)
      .update({ status: newStatus })
      .eq('id', item.metadata.originalId);

    if (error) throw error;
  };

  const archiveItem = async (item: BulkItem) => {
    // Archive implementation would depend on schema
    console.log('Archiving item:', item.name);
  };

  const deleteItem = async (item: BulkItem) => {
    if (!item.metadata?.originalId || !item.metadata?.table) return;

    const { error } = await supabase
      .from(item.metadata.table)
      .delete()
      .eq('id', item.metadata.originalId);

    if (error) throw error;
  };

  const sendNotification = async (item: BulkItem) => {
    // Send notification via email service
    console.log('Sending notification for:', item.name);
  };

  const assignUser = async (item: BulkItem) => {
    // Assign user implementation
    console.log('Assigning user to:', item.name);
  };

  const filteredItems = items.filter(item => 
    filter === 'all' || item.type === filter
  );

  const getTypeColor = (type: string) => {
    const colors = {
      project: 'bg-blue-100 text-blue-800',
      invoice: 'bg-green-100 text-green-800',
      document: 'bg-yellow-100 text-yellow-800',
      task: 'bg-purple-100 text-purple-800',
      expense: 'bg-red-100 text-red-800'
    };
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <Settings className="h-5 w-5" />
        <h2 className="text-2xl font-semibold">Bulk Operations</h2>
      </div>

      {/* Filter and Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Items</CardTitle>
          <CardDescription>
            Choose items to perform bulk operations on
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Items</SelectItem>
                  <SelectItem value="project">Projects</SelectItem>
                  <SelectItem value="invoice">Invoices</SelectItem>
                  <SelectItem value="document">Documents</SelectItem>
                  <SelectItem value="task">Tasks</SelectItem>
                </SelectContent>
              </Select>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={selectedItems.length === filteredItems.length && filteredItems.length > 0}
                  onCheckedChange={toggleAllItems}
                />
                <span className="text-sm text-muted-foreground">
                  Select All ({selectedItems.length} of {filteredItems.length} selected)
                </span>
              </div>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto border rounded-lg">
            {filteredItems.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                No items found for the selected filter.
              </div>
            ) : (
              <div className="space-y-1 p-2">
                {filteredItems.map((item) => (
                  <div key={item.id} className="flex items-center space-x-3 p-2 hover:bg-muted/50 rounded">
                    <Checkbox
                      checked={selectedItems.includes(item.id)}
                      onCheckedChange={() => toggleItemSelection(item.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium truncate">{item.name}</span>
                        <span className={`px-2 py-1 text-xs rounded-full ${getTypeColor(item.type)}`}>
                          {item.type}
                        </span>
                        <span className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded-full">
                          {item.status}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Modified: {new Date(item.lastModified).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Operations */}
      {selectedItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Available Operations</CardTitle>
            <CardDescription>
              Select an operation to perform on {selectedItems.length} selected items
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select value={selectedOperation} onValueChange={setSelectedOperation}>
              <SelectTrigger>
                <SelectValue placeholder="Choose an operation" />
              </SelectTrigger>
              <SelectContent>
                {getApplicableOperations().map((operation) => (
                  <SelectItem key={operation.id} value={operation.id}>
                    {operation.name} - {operation.description}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedOperation && (
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  This operation will be applied to {selectedItems.length} selected items
                </div>
                <Button 
                  onClick={executeBulkOperation} 
                  disabled={isProcessing}
                  className="min-w-32"
                >
                  {isProcessing ? 'Processing...' : 'Execute Operation'}
                </Button>
              </div>
            )}

            {isProcessing && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Processing items...</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Available Operations Reference */}
      <Card>
        <CardHeader>
          <CardTitle>Available Operations</CardTitle>
          <CardDescription>
            All bulk operations supported by the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {operations.map((operation) => (
              <div key={operation.id} className="p-4 border rounded-lg">
                <h4 className="font-medium mb-1">{operation.name}</h4>
                <p className="text-sm text-muted-foreground mb-2">{operation.description}</p>
                <div className="flex flex-wrap gap-1">
                  {operation.appliesTo.map((type) => (
                    <span key={type} className={`px-2 py-1 text-xs rounded-full ${getTypeColor(type)}`}>
                      {type}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BulkOperations;