import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ResponsiveContainer } from '@/components/layout/ResponsiveContainer';
import { mobileGridClasses, mobileFilterClasses, mobileButtonClasses, mobileTextClasses, mobileCardClasses } from '@/utils/mobileHelpers';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  ArrowLeft, 
  FileText,
  DollarSign,
  PlusCircle,
  CheckCircle,
  XCircle,
  Clock,
  Users,
  CalendarIcon,
  Edit
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";
import { AccessiblePageWrapper } from "@/components/accessibility/AccessiblePageWrapper";
import { AccessibleTable, type TableColumn } from "@/components/accessibility/AccessibleTable";

interface Project {
  id: string;
  name: string;
  client_name: string;
  status: string;
}

interface ChangeOrder {
  id: string;
  project_id: string;
  change_order_number: string;
  title: string;
  description: string;
  amount: number;
  status: string;
  reason: string;
  client_approved: boolean;
  internal_approved: boolean;
  client_approved_date: string;
  internal_approved_date: string;
  assigned_approvers: string[];
  approval_due_date: string;
  approval_notes: string;
  created_at: string;
  projects: { name: string; client_name: string };
}

interface UserProfile {
  id: string;
  first_name: string;
  last_name: string;
  role: string;
}

const ChangeOrders = () => {
  const { user, userProfile, loading } = useAuth();
  const navigate = useNavigate();
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [changeOrders, setChangeOrders] = useState<ChangeOrder[]>([]);
  const [companyUsers, setCompanyUsers] = useState<UserProfile[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [approvalDueDate, setApprovalDueDate] = useState<Date>();
  const [selectedApprovers, setSelectedApprovers] = useState<string[]>([]);
  const [editingOrder, setEditingOrder] = useState<ChangeOrder | null>(null);
  const [isRejectionDialogOpen, setIsRejectionDialogOpen] = useState(false);
  const [rejectionOrderId, setRejectionOrderId] = useState<string>('');
  const [rejectionType, setRejectionType] = useState<'internal' | 'client'>('internal');
  const [rejectionReason, setRejectionReason] = useState('');
  
  const [newOrder, setNewOrder] = useState({
    project_id: '',
    title: '',
    description: '',
    amount: '',
    reason: '',
    approval_notes: ''
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
    
    if (!loading && user && userProfile && !userProfile.company_id && userProfile.role !== 'root_admin') {
      navigate('/setup');
    }
    
    // Check role permissions
    if (!loading && userProfile && !['admin', 'project_manager', 'root_admin'].includes(userProfile.role)) {
      navigate('/dashboard');
      toast({
        variant: "destructive",
        title: "Access Denied",
        description: "You don't have permission to access change orders."
      });
      return;
    }
    
    if (userProfile?.company_id) {
      loadData();
    }
  }, [user, userProfile, loading, navigate]);

  const loadData = async () => {
    try {
      setLoadingOrders(true);
      
      // Load projects
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('id, name, client_name, status')
        .eq('company_id', userProfile?.company_id)
        .order('name');

      if (projectsError) throw projectsError;
      setProjects(projectsData || []);

      // Load company users for approver assignment
      const { data: usersData, error: usersError } = await supabase
        .from('user_profiles')
        .select('id, first_name, last_name, role')
        .eq('company_id', userProfile?.company_id)
        .in('role', ['admin', 'project_manager', 'superintendent', 'root_admin']);

      if (usersError) throw usersError;
      setCompanyUsers(usersData || []);

      // Load change orders
      const { data: ordersData, error: ordersError } = await supabase.functions.invoke('change-orders', {
        body: { action: 'list' }
      });


      if (ordersError) {
        console.error('Change orders error:', ordersError);
        throw ordersError;
      }
      
      if (ordersData?.changeOrders) {
        setChangeOrders(ordersData.changeOrders);
      } else {
        setChangeOrders([]);
      }

    } catch (error: unknown) {
      console.error('Error loading data:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load change orders data"
      });
    } finally {
      setLoadingOrders(false);
    }
  };

  const handleCreateOrder = async () => {
    // Validate required fields
    if (!newOrder.project_id || !newOrder.title || !newOrder.amount.trim()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please fill in all required fields."
      });
      return;
    }

    // Validate amount is a valid number greater than 0
    const amount = parseFloat(newOrder.amount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        variant: "destructive",
        title: "Validation Error", 
        description: "Please enter a valid amount greater than 0"
      });
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('change-orders', {
        body: { 
          action: 'create',
          ...newOrder,
          amount: amount,
          assigned_approvers: selectedApprovers,
          approval_due_date: approvalDueDate ? format(approvalDueDate, 'yyyy-MM-dd') : null
        }
      });


      if (error) throw error;

      toast({
        title: "Success",
        description: "Change order created successfully"
      });

      setIsCreateDialogOpen(false);
      setNewOrder({
        project_id: '',
        title: '',
        description: '',
        amount: '',
        reason: '',
        approval_notes: ''
      });
      setSelectedApprovers([]);
      setApprovalDueDate(undefined);
      setEditingOrder(null);
      
      loadData();
    } catch (error: unknown) {
      console.error('Error creating change order:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create change order"
      });
    }
  };

  const handleUpdateOrder = async () => {
    if (!editingOrder) return;

    // Validate required fields
    if (!newOrder.project_id || !newOrder.title || !newOrder.amount.trim()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please fill in all required fields."
      });
      return;
    }

    // Validate amount is a valid number greater than 0
    const amount = parseFloat(newOrder.amount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        variant: "destructive",
        title: "Validation Error", 
        description: "Please enter a valid amount greater than 0"
      });
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('change-orders', {
        body: { 
          action: 'update',
          orderId: editingOrder.id,
          ...newOrder,
          amount: amount,
          assigned_approvers: selectedApprovers,
          approval_due_date: approvalDueDate ? format(approvalDueDate, 'yyyy-MM-dd') : null
        }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Change order updated successfully"
      });

      setIsCreateDialogOpen(false);
      setNewOrder({
        project_id: '',
        title: '',
        description: '',
        amount: '',
        reason: '',
        approval_notes: ''
      });
      setSelectedApprovers([]);
      setApprovalDueDate(undefined);
      setEditingOrder(null);
      
      loadData();
    } catch (error: unknown) {
      console.error('Error updating change order:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update change order"
      });
    }
  };

  const handleApproval = async (orderId: string, approvalType: 'internal' | 'client', approved: boolean) => {
    try {
      const { data, error } = await supabase.functions.invoke('change-orders', {
        body: { 
          action: 'approve',
          orderId,
          approvalType,
          approved
        }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Change order ${approved ? 'approved' : 'rejected'} successfully`
      });
      
      loadData();
    } catch (error: unknown) {
      console.error('Error updating approval:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update approval status"
      });
    }
  };

  const handleRejectWithReason = (orderId: string, approvalType: 'internal' | 'client') => {
    setRejectionOrderId(orderId);
    setRejectionType(approvalType);
    setRejectionReason('');
    setIsRejectionDialogOpen(true);
  };

  const submitRejection = async () => {
    if (!rejectionReason.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please provide a reason for rejection"
      });
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('change-orders', {
        body: { 
          action: 'approve',
          orderId: rejectionOrderId,
          approvalType: rejectionType,
          approved: false,
          rejectionReason: rejectionReason
        }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Change order rejected successfully"
      });
      
      setIsRejectionDialogOpen(false);
      setRejectionReason('');
      loadData();
    } catch (error: unknown) {
      console.error('Error rejecting change order:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to reject change order"
      });
    }
  };

  const getStatusBadge = (order: ChangeOrder) => {
    if (order.status === 'rejected') {
      return <Badge variant="destructive" aria-label="Status: Rejected">Rejected</Badge>;
    } else if (order.client_approved && order.internal_approved) {
      return <Badge className="bg-green-500" aria-label="Status: Approved">Approved</Badge>;
    } else if (!order.client_approved && !order.internal_approved) {
      return <Badge variant="secondary" aria-label="Status: Pending">Pending</Badge>;
    } else {
      return <Badge variant="outline" aria-label="Status: Partial Approval">Partial Approval</Badge>;
    }
  };

  const filteredOrders = selectedProject && selectedProject !== 'all'
    ? changeOrders.filter(order => order.project_id === selectedProject)
    : changeOrders;

  const changeOrderColumns: TableColumn<ChangeOrder>[] = [
    {
      key: 'change_order_number',
      header: 'CO #',
      sortable: true,
      render: (value) => <Badge variant="outline" className="font-mono" aria-label={`Change order number ${value}`}>#{value}</Badge>,
    },
    {
      key: 'title',
      header: 'Title',
      sortable: true,
      render: (value) => <span className="font-medium">{value}</span>,
    },
    {
      key: 'projects',
      header: 'Project',
      hideOnMobile: true,
      render: (value) => (
        <span className="text-sm text-muted-foreground">
          {value?.name || '-'}
        </span>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      sortable: true,
      align: 'right',
      render: (value) => (
        <span className="font-mono font-medium">
          <DollarSign className="h-3 w-3 inline mr-0.5" aria-hidden="true" />
          {Number(value).toLocaleString()}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (_value, order) => getStatusBadge(order),
    },
    {
      key: 'internal_approved',
      header: 'Internal',
      hideOnMobile: true,
      render: (value) => value ? (
        <CheckCircle className="h-4 w-4 text-green-500" aria-label="Internally approved" />
      ) : (
        <Clock className="h-4 w-4 text-yellow-500" aria-label="Internal approval pending" />
      ),
    },
    {
      key: 'client_approved',
      header: 'Client',
      hideOnMobile: true,
      render: (value) => value ? (
        <CheckCircle className="h-4 w-4 text-green-500" aria-label="Client approved" />
      ) : (
        <Clock className="h-4 w-4 text-yellow-500" aria-label="Client approval pending" />
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      headerRender: () => <span className="sr-only">Actions</span>,
      render: (_value, order) => (
        <div className="flex items-center gap-1">
          {!order.internal_approved && order.status !== 'rejected' && (
            <>
              <Button size="sm" variant="outline" onClick={() => handleApproval(order.id, 'internal', true)} aria-label={`Approve ${order.title} internally`}>
                <CheckCircle className="h-3 w-3" aria-hidden="true" />
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleRejectWithReason(order.id, 'internal')} aria-label={`Reject ${order.title} internally`}>
                <XCircle className="h-3 w-3" aria-hidden="true" />
              </Button>
            </>
          )}
          <Button
            variant="outline"
            size="sm"
            aria-label={`Edit change order ${order.title}`}
            onClick={() => {
              setNewOrder({
                project_id: order.project_id,
                title: order.title,
                description: order.description || '',
                amount: order.amount.toString(),
                reason: order.reason || '',
                approval_notes: order.approval_notes || ''
              });
              setSelectedApprovers(order.assigned_approvers || []);
              setApprovalDueDate(order.approval_due_date ? new Date(order.approval_due_date) : undefined);
              setEditingOrder(order);
              setIsCreateDialogOpen(true);
            }}
          >
            <Edit className="h-3 w-3" aria-hidden="true" />
          </Button>
        </div>
      ),
    },
  ];

  if (loading || loadingOrders) {
    return (
      <AccessiblePageWrapper pageTitle="Change Orders">
      <DashboardLayout title="Change Orders" hasAccessibleWrapper>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-construction-blue mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading change orders...</p>
          </div>
        </div>
      </DashboardLayout>
      </AccessiblePageWrapper>
    );
  }

  return (
    <AccessiblePageWrapper pageTitle="Change Orders">
    <DashboardLayout title="Change Orders" hasAccessibleWrapper>
      <div className="space-y-6">
        {/* Header */}
        <div className={mobileCardClasses.header}>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/dashboard')}
                className={mobileButtonClasses.secondary}
              >
                <ArrowLeft className="h-4 w-4 mr-2" aria-hidden="true" />
                Back to Dashboard
              </Button>
              <Separator orientation="vertical" className="h-6 hidden sm:block" />
              <div>
                <h1 className={mobileTextClasses.title}>Change Orders</h1>
                <p className={mobileTextClasses.muted}>Client approval workflows and project modifications</p>
              </div>
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className={mobileButtonClasses.primary}>
                  <PlusCircle className="h-4 w-4 mr-2" aria-hidden="true" />
                  Create Change Order
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl" aria-describedby="change-order-dialog-description">
                <DialogHeader>
                  <DialogTitle>{editingOrder ? 'Edit Change Order' : 'Create Change Order'}</DialogTitle>
                  <DialogDescription id="change-order-dialog-description">
                    {editingOrder ? 'Update the change order details and approval workflow.' : 'Create a new change order for project modifications that require client approval.'}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="project">Project *</Label>
                    <Select value={newOrder.project_id} onValueChange={(value) => setNewOrder({...newOrder, project_id: value})}>
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

                  <div>
                    <Label htmlFor="title">Title *</Label>
                    <Input
                      id="title"
                      placeholder="Brief description of the change"
                      value={newOrder.title}
                      onChange={(e) => setNewOrder({...newOrder, title: e.target.value})}
                    />
                  </div>

                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Detailed description of the change order..."
                      value={newOrder.description}
                      onChange={(e) => setNewOrder({...newOrder, description: e.target.value})}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="amount">Amount ($) *</Label>
                      <Input
                        id="amount"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={newOrder.amount}
                        onChange={(e) => setNewOrder({...newOrder, amount: e.target.value})}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="reason">Reason</Label>
                      <Select value={newOrder.reason} onValueChange={(value) => setNewOrder({...newOrder, reason: value})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select reason" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="scope_change">Scope Change</SelectItem>
                          <SelectItem value="material_upgrade">Material Upgrade</SelectItem>
                          <SelectItem value="design_change">Design Change</SelectItem>
                          <SelectItem value="unforeseen_conditions">Unforeseen Conditions</SelectItem>
                          <SelectItem value="client_request">Client Request</SelectItem>
                          <SelectItem value="code_requirement">Code Requirement</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Approval Assignment Section */}
                  <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4" aria-hidden="true" />
                      <Label className="text-sm font-medium">Approval Assignment</Label>
                    </div>
                    
                    <div>
                      <Label htmlFor="approvers">Assign Approvers</Label>
                      <div className="grid grid-cols-1 gap-2 mt-2 max-h-40 overflow-y-auto">
                        {companyUsers.map((user) => (
                          <div key={user.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`approver-${user.id}`}
                              checked={selectedApprovers.includes(user.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedApprovers([...selectedApprovers, user.id]);
                                } else {
                                  setSelectedApprovers(selectedApprovers.filter(id => id !== user.id));
                                }
                              }}
                            />
                            <Label htmlFor={`approver-${user.id}`} className="text-sm cursor-pointer">
                              {user.first_name} {user.last_name} ({user.role})
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Approval Due Date</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className="w-full justify-start text-left font-normal"
                              aria-label="Select approval due date"
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" aria-hidden="true" />
                              {approvalDueDate ? format(approvalDueDate, "PPP") : "Select date"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={approvalDueDate}
                              onSelect={setApprovalDueDate}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      
                      <div>
                        <Label htmlFor="approval_notes">Approval Notes</Label>
                        <Textarea
                          id="approval_notes"
                          placeholder="Special instructions for approvers..."
                          value={newOrder.approval_notes}
                          onChange={(e) => setNewOrder({...newOrder, approval_notes: e.target.value})}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => {
                      setIsCreateDialogOpen(false);
                      setEditingOrder(null);
                      setNewOrder({
                        project_id: '',
                        title: '',
                        description: '',
                        amount: '',
                        reason: '',
                        approval_notes: ''
                      });
                      setSelectedApprovers([]);
                      setApprovalDueDate(undefined);
                    }}>
                      Cancel
                    </Button>
                    <Button onClick={editingOrder ? handleUpdateOrder : handleCreateOrder}>
                      {editingOrder ? 'Update Change Order' : 'Create Change Order'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Filters */}
        <Card className={mobileCardClasses.container}>
          <CardContent className={mobileCardClasses.content}>
            <div className="flex flex-col sm:flex-row sm:items-center gap-4" role="search" aria-label="Filter change orders">
              <div className="flex-1">
                <Label htmlFor="project-filter" className={mobileTextClasses.body}>Filter by Project</Label>
                <Select value={selectedProject} onValueChange={setSelectedProject}>
                  <SelectTrigger className={mobileFilterClasses.input} aria-label="Filter by project">
                    <SelectValue placeholder="All projects" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All projects</SelectItem>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Change Orders Table */}
        <Card>
          <CardContent className="pt-6">
            <AccessibleTable<ChangeOrder>
              caption="Change Orders"
              hideCaption
              columns={changeOrderColumns}
              data={filteredOrders}
              emptyContent={
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" aria-hidden="true" />
                  <h3 className="font-medium mb-2">No Change Orders</h3>
                  <p className="text-muted-foreground mb-4">
                    {selectedProject && selectedProject !== 'all' ? 'No change orders found for selected project' : 'No change orders have been created yet'}
                  </p>
                  <Button onClick={() => setIsCreateDialogOpen(true)}>
                    <PlusCircle className="h-4 w-4 mr-2" aria-hidden="true" />
                    Create First Change Order
                  </Button>
                </div>
              }
            />
          </CardContent>
        </Card>
      </div>

      {/* Rejection Reason Dialog */}
      <Dialog open={isRejectionDialogOpen} onOpenChange={setIsRejectionDialogOpen}>
        <DialogContent className="max-w-md" aria-describedby="rejection-dialog-description">
          <DialogHeader>
            <DialogTitle>Reject Change Order</DialogTitle>
            <DialogDescription id="rejection-dialog-description">
              Please provide a reason for rejecting this change order. This will be recorded and visible to all stakeholders.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="rejection-reason">Rejection Reason *</Label>
              <Textarea
                id="rejection-reason"
                placeholder="Explain why this change order is being rejected..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
                className="resize-none"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsRejectionDialogOpen(false);
                  setRejectionReason('');
                }}
              >
                Cancel
              </Button>
              <Button 
                variant="destructive"
                onClick={submitRejection}
                disabled={!rejectionReason.trim()}
              >
                <XCircle className="h-4 w-4 mr-2" aria-hidden="true" />
                Reject Change Order
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
    </AccessiblePageWrapper>
  );
};

export default ChangeOrders;