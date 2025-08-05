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
import { Plus, Edit, Eye, CheckCircle, XCircle, Clock, DollarSign, Calendar, FileText, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

interface ChangeOrder {
  id: string;
  number: string;
  title: string;
  description?: string;
  justification?: string;
  category: string;
  status: string;
  priority: string;
  amount: number;
  labor_cost: number;
  material_cost: number;
  equipment_cost: number;
  overhead_cost: number;
  impact_days: number;
  project_id: string;
  project?: { name: string };
  requested_by?: string;
  assigned_to?: string;
  approved_by?: string;
  created_at: string;
  submitted_at?: string;
  approved_at?: string;
}

export const ChangeOrderManagement: React.FC = () => {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const [changeOrders, setChangeOrders] = useState<ChangeOrder[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<ChangeOrder | null>(null);
  const [formData, setFormData] = useState({
    project_id: '',
    title: '',
    description: '',
    justification: '',
    category: 'scope_change',
    priority: 'medium',
    amount: 0,
    labor_cost: 0,
    material_cost: 0,
    equipment_cost: 0,
    overhead_cost: 0,
    impact_days: 0
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
        description: "Failed to load change orders",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!userProfile?.company_id || !formData.project_id || !formData.title) return;

    try {
      const orderData = {
        ...formData,
        company_id: userProfile.company_id,
        number: `CO-${Date.now().toString().slice(-8)}`,
        requested_by: userProfile.id,
        status: 'draft'
      };

      if (editingOrder) {
        const { error } = await supabase
          .from('change_orders')
          .update(orderData)
          .eq('id', editingOrder.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Change order updated successfully"
        });
      } else {
        const { error } = await supabase
          .from('change_orders')
          .insert([orderData]);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Change order created successfully"
        });
      }

      setDialogOpen(false);
      setEditingOrder(null);
      setFormData({
        project_id: '',
        title: '',
        description: '',
        justification: '',
        category: 'scope_change',
        priority: 'medium',
        amount: 0,
        labor_cost: 0,
        material_cost: 0,
        equipment_cost: 0,
        overhead_cost: 0,
        impact_days: 0
      });
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

  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    try {
      const updateData: any = { status: newStatus };
      
      if (newStatus === 'submitted') {
        updateData.submitted_at = new Date().toISOString();
      } else if (newStatus === 'approved') {
        updateData.approved_at = new Date().toISOString();
        updateData.approved_by = userProfile?.id;
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
      console.error('Error updating status:', error);
      toast({
        title: "Error",
        description: "Failed to update change order status",
        variant: "destructive"
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'secondary';
      case 'submitted': return 'default';
      case 'approved': return 'default';
      case 'rejected': return 'destructive';
      case 'implemented': return 'default';
      default: return 'secondary';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'secondary';
    }
  };

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
          <p className="text-muted-foreground">Manage project change requests and approvals</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setEditingOrder(null);
              setFormData({
                project_id: '',
                title: '',
                description: '',
                justification: '',
                category: 'scope_change',
                priority: 'medium',
                amount: 0,
                labor_cost: 0,
                material_cost: 0,
                equipment_cost: 0,
                overhead_cost: 0,
                impact_days: 0
              });
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Create Change Order
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingOrder ? 'Edit Change Order' : 'Create New Change Order'}</DialogTitle>
              <DialogDescription>
                Fill out the details for the change order
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="project">Project *</Label>
                  <Select 
                    value={formData.project_id} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, project_id: value }))}
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
                  <Label htmlFor="category">Category</Label>
                  <Select 
                    value={formData.category} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="scope_change">Scope Change</SelectItem>
                      <SelectItem value="design_change">Design Change</SelectItem>
                      <SelectItem value="material_change">Material Change</SelectItem>
                      <SelectItem value="schedule_change">Schedule Change</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Change order title"
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Detailed description of the change"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="justification">Justification</Label>
                <Textarea
                  id="justification"
                  value={formData.justification}
                  onChange={(e) => setFormData(prev => ({ ...prev, justification: e.target.value }))}
                  placeholder="Reason for the change"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="priority">Priority</Label>
                  <Select 
                    value={formData.priority} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="impact_days">Schedule Impact (Days)</Label>
                  <Input
                    id="impact_days"
                    type="number"
                    value={formData.impact_days}
                    onChange={(e) => setFormData(prev => ({ ...prev, impact_days: parseInt(e.target.value) || 0 }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="labor_cost">Labor Cost</Label>
                  <Input
                    id="labor_cost"
                    type="number"
                    step="0.01"
                    value={formData.labor_cost}
                    onChange={(e) => setFormData(prev => ({ ...prev, labor_cost: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
                <div>
                  <Label htmlFor="material_cost">Material Cost</Label>
                  <Input
                    id="material_cost"
                    type="number"
                    step="0.01"
                    value={formData.material_cost}
                    onChange={(e) => setFormData(prev => ({ ...prev, material_cost: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="equipment_cost">Equipment Cost</Label>
                  <Input
                    id="equipment_cost"
                    type="number"
                    step="0.01"
                    value={formData.equipment_cost}
                    onChange={(e) => setFormData(prev => ({ ...prev, equipment_cost: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
                <div>
                  <Label htmlFor="overhead_cost">Overhead Cost</Label>
                  <Input
                    id="overhead_cost"
                    type="number"
                    step="0.01"
                    value={formData.overhead_cost}
                    onChange={(e) => setFormData(prev => ({ ...prev, overhead_cost: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
              </div>

              <div>
                <Label>Total Amount: ${(formData.labor_cost + formData.material_cost + formData.equipment_cost + formData.overhead_cost).toLocaleString()}</Label>
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

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All Orders</TabsTrigger>
          <TabsTrigger value="draft">Draft</TabsTrigger>
          <TabsTrigger value="submitted">Submitted</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Change Orders</CardTitle>
              <CardDescription>All change orders for your projects</CardDescription>
            </CardHeader>
            <CardContent>
              {changeOrders.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Change Orders</h3>
                  <p className="text-muted-foreground mb-4">Get started by creating your first change order</p>
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
                      <TableHead>Status</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Impact</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {changeOrders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">{order.number}</TableCell>
                        <TableCell>{order.project?.name}</TableCell>
                        <TableCell>{order.title}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusColor(order.status)}>
                            {order.status.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getPriorityColor(order.priority)}>
                            {order.priority}
                          </Badge>
                        </TableCell>
                        <TableCell>${order.amount.toLocaleString()}</TableCell>
                        <TableCell>{order.impact_days} days</TableCell>
                        <TableCell>{format(new Date(order.created_at), 'MMM d, yyyy')}</TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingOrder(order);
                                setFormData({
                                  project_id: order.project_id,
                                  title: order.title,
                                  description: order.description || '',
                                  justification: order.justification || '',
                                  category: order.category,
                                  priority: order.priority,
                                  amount: order.amount,
                                  labor_cost: order.labor_cost,
                                  material_cost: order.material_cost,
                                  equipment_cost: order.equipment_cost,
                                  overhead_cost: order.overhead_cost,
                                  impact_days: order.impact_days
                                });
                                setDialogOpen(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            {order.status === 'draft' && (
                              <Button
                                size="sm"
                                onClick={() => handleStatusUpdate(order.id, 'submitted')}
                              >
                                Submit
                              </Button>
                            )}
                            {order.status === 'submitted' && ['admin', 'project_manager'].includes(userProfile?.role) && (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => handleStatusUpdate(order.id, 'approved')}
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleStatusUpdate(order.id, 'rejected')}
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

        {/* Filter tabs by status */}
        {['draft', 'submitted', 'approved'].map(status => (
          <TabsContent key={status} value={status} className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{status.charAt(0).toUpperCase() + status.slice(1)} Change Orders</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Number</TableHead>
                      <TableHead>Project</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Impact</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {changeOrders.filter(order => order.status === status).map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">{order.number}</TableCell>
                        <TableCell>{order.project?.name}</TableCell>
                        <TableCell>{order.title}</TableCell>
                        <TableCell>
                          <Badge variant={getPriorityColor(order.priority)}>
                            {order.priority}
                          </Badge>
                        </TableCell>
                        <TableCell>${order.amount.toLocaleString()}</TableCell>
                        <TableCell>{order.impact_days} days</TableCell>
                        <TableCell>{format(new Date(order.created_at), 'MMM d, yyyy')}</TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingOrder(order);
                                setFormData({
                                  project_id: order.project_id,
                                  title: order.title,
                                  description: order.description || '',
                                  justification: order.justification || '',
                                  category: order.category,
                                  priority: order.priority,
                                  amount: order.amount,
                                  labor_cost: order.labor_cost,
                                  material_cost: order.material_cost,
                                  equipment_cost: order.equipment_cost,
                                  overhead_cost: order.overhead_cost,
                                  impact_days: order.impact_days
                                });
                                setDialogOpen(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            {order.status === 'draft' && (
                              <Button
                                size="sm"
                                onClick={() => handleStatusUpdate(order.id, 'submitted')}
                              >
                                Submit
                              </Button>
                            )}
                            {order.status === 'submitted' && ['admin', 'project_manager'].includes(userProfile?.role) && (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => handleStatusUpdate(order.id, 'approved')}
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleStatusUpdate(order.id, 'rejected')}
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
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};