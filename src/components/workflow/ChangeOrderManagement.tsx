import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Edit, Eye, CheckCircle, XCircle, Clock, DollarSign, TrendingUp, FileText } from 'lucide-react';
import { format } from 'date-fns';

interface ChangeOrder {
  id: string;
  change_order_number: string;
  project_id: string;
  title: string;
  description: string;
  justification?: string;
  amount: number;
  status: string;
  requested_by?: string;
  approved_by?: string;
  approval_date?: string;
  created_at: string;
  projects?: { name: string };
}

export const ChangeOrderManagement: React.FC = () => {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const [changeOrders, setChangeOrders] = useState<ChangeOrder[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<ChangeOrder | null>(null);
  const [activeTab, setActiveTab] = useState('all');

  const [changeOrderForm, setChangeOrderForm] = useState({
    project_id: '',
    title: '',
    description: '',
    justification: '',
    amount: 0
  });

  useEffect(() => {
    loadData();
  }, [userProfile?.company_id]);

  const loadData = async () => {
    if (!userProfile?.company_id) return;

    try {
      // Load change orders
      const { data: ordersData, error: ordersError } = await supabase
        .from('change_orders')
        .select(`
          *,
          projects:project_id(name)
        `)
        .eq('company_id', userProfile.company_id)
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

      // Load projects for dropdown
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('id, name')
        .eq('company_id', userProfile.company_id)
        .order('name');

      if (projectsError) throw projectsError;

      setChangeOrders(ordersData || []);
      setProjects(projectsData || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Error",
        description: "Failed to load change order data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!userProfile?.company_id || !changeOrderForm.project_id || !changeOrderForm.title) return;

    try {
      const changeOrderData = {
        company_id: userProfile.company_id,
        change_order_number: `CO-${Date.now().toString().slice(-8)}`,
        requested_by: userProfile.id,
        status: 'pending',
        ...changeOrderForm
      };

      if (editingOrder) {
        const { error } = await supabase
          .from('change_orders')
          .update(changeOrderData)
          .eq('id', editingOrder.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Change order updated successfully"
        });
      } else {
        const { error } = await supabase
          .from('change_orders')
          .insert([changeOrderData]);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Change order created successfully"
        });
      }

      setDialogOpen(false);
      setEditingOrder(null);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Error saving change order:', error);
      toast({
        title: "Error",
        description: "Failed to save change order",
        variant: "destructive"
      });
    }
  };

  const updateStatus = async (orderId: string, newStatus: string) => {
    try {
      const updateData: any = { status: newStatus };
      
      if (newStatus === 'approved') {
        updateData.approved_by = userProfile?.id;
        updateData.approval_date = new Date().toISOString();
      }

      const { error } = await supabase
        .from('change_orders')
        .update(updateData)
        .eq('id', orderId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Change order ${newStatus} successfully`
      });
      
      loadData();
    } catch (error) {
      console.error('Error updating change order:', error);
      toast({
        title: "Error",
        description: "Failed to update change order",
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setChangeOrderForm({
      project_id: '',
      title: '',
      description: '',
      justification: '',
      amount: 0
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'default';
      case 'approved': return 'default';
      case 'rejected': return 'destructive';
      case 'implemented': return 'default';
      default: return 'secondary';
    }
  };

  const filteredOrders = changeOrders.filter(order => {
    if (activeTab === 'all') return true;
    return order.status === activeTab;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Change Order Management</h2>
          <p className="text-muted-foreground">Track and manage project changes and their impacts</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setEditingOrder(null);
              resetForm();
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Create Change Order
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingOrder ? 'Edit Change Order' : 'Create New Change Order'}</DialogTitle>
              <DialogDescription>
                Document project changes, scope modifications, and cost impacts
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="project">Project *</Label>
                <Select 
                  value={changeOrderForm.project_id} 
                  onValueChange={(value) => setChangeOrderForm(prev => ({ ...prev, project_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map(project => (
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
                  value={changeOrderForm.title}
                  onChange={(e) => setChangeOrderForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Brief description of the change"
                />
              </div>

              <div>
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  value={changeOrderForm.description}
                  onChange={(e) => setChangeOrderForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Detailed description of the change"
                  rows={4}
                />
              </div>

              <div>
                <Label htmlFor="justification">Justification</Label>
                <Textarea
                  id="justification"
                  value={changeOrderForm.justification}
                  onChange={(e) => setChangeOrderForm(prev => ({ ...prev, justification: e.target.value }))}
                  placeholder="Reason for the change order"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="amount">Cost Impact ($) *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={changeOrderForm.amount}
                  onChange={(e) => setChangeOrderForm(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                  placeholder="0.00"
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleSubmit}>
                  {editingOrder ? 'Update' : 'Create'} Change Order
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All ({changeOrders.length})</TabsTrigger>
          <TabsTrigger value="pending">Pending ({changeOrders.filter(o => o.status === 'pending').length})</TabsTrigger>
          <TabsTrigger value="approved">Approved ({changeOrders.filter(o => o.status === 'approved').length})</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Change Orders</CardTitle>
              <CardDescription>All project change orders and modifications</CardDescription>
            </CardHeader>
            <CardContent>
              {filteredOrders.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Change Orders</h3>
                  <p className="text-muted-foreground mb-4">Create your first change order</p>
                  <Button onClick={() => setDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Change Order
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Number</TableHead>
                      <TableHead>Project</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">{order.change_order_number}</TableCell>
                        <TableCell>{order.projects?.name}</TableCell>
                        <TableCell className="max-w-xs truncate">{order.title}</TableCell>
                        <TableCell>${order.amount.toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusColor(order.status)}>
                            {order.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{format(new Date(order.created_at), 'MMM d, yyyy')}</TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            {order.status === 'pending' && ['admin', 'project_manager'].includes(userProfile?.role) && (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => updateStatus(order.id, 'approved')}
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => updateStatus(order.id, 'rejected')}
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingOrder(order);
                                setChangeOrderForm({
                                  project_id: order.project_id,
                                  title: order.title,
                                  description: order.description,
                                  justification: order.justification || '',
                                  amount: order.amount
                                });
                                setDialogOpen(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pending">
          <Card>
            <CardHeader>
              <CardTitle>Pending Change Orders</CardTitle>
              <CardDescription>Change orders awaiting approval</CardDescription>
            </CardHeader>
            <CardContent>
              {changeOrders.filter(o => o.status === 'pending').length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Pending Change Orders</h3>
                  <p className="text-muted-foreground">All change orders have been reviewed</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Number</TableHead>
                      <TableHead>Project</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {changeOrders.filter(o => o.status === 'pending').map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">{order.change_order_number}</TableCell>
                        <TableCell>{order.projects?.name}</TableCell>
                        <TableCell className="max-w-xs truncate">{order.title}</TableCell>
                        <TableCell>${order.amount.toLocaleString()}</TableCell>
                        <TableCell>{format(new Date(order.created_at), 'MMM d, yyyy')}</TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            {['admin', 'project_manager'].includes(userProfile?.role) && (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => updateStatus(order.id, 'approved')}
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => updateStatus(order.id, 'rejected')}
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="approved">
          <Card>
            <CardHeader>
              <CardTitle>Approved Change Orders</CardTitle>
              <CardDescription>Change orders that have been approved</CardDescription>
            </CardHeader>
            <CardContent>
              {changeOrders.filter(o => o.status === 'approved').length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Approved Change Orders</h3>
                  <p className="text-muted-foreground">No change orders have been approved yet</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Number</TableHead>
                      <TableHead>Project</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Approved Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {changeOrders.filter(o => o.status === 'approved').map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">{order.change_order_number}</TableCell>
                        <TableCell>{order.projects?.name}</TableCell>
                        <TableCell className="max-w-xs truncate">{order.title}</TableCell>
                        <TableCell>${order.amount.toLocaleString()}</TableCell>
                        <TableCell>
                          {order.approval_date ? format(new Date(order.approval_date), 'MMM d, yyyy') : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Change Orders</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{changeOrders.length}</div>
                <p className="text-xs text-muted-foreground">
                  {changeOrders.filter(o => o.status === 'pending').length} pending approval
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Value</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${changeOrders.reduce((sum, order) => sum + order.amount, 0).toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  All change orders combined
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Approval Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {changeOrders.filter(o => ['approved', 'rejected'].includes(o.status)).length > 0 ? 
                    Math.round((changeOrders.filter(o => o.status === 'approved').length / 
                    changeOrders.filter(o => ['approved', 'rejected'].includes(o.status)).length) * 100) : 0}%
                </div>
                <p className="text-xs text-muted-foreground">
                  Of reviewed change orders
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Average Value</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${changeOrders.length > 0 ? 
                    Math.round(changeOrders.reduce((sum, order) => sum + order.amount, 0) / changeOrders.length).toLocaleString() : 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Per change order
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};