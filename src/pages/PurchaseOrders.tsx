import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { RoleGuard, ROLE_GROUPS } from '@/components/auth/RoleGuard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Plus, 
  Search, 
  Filter,
  Package,
  Eye,
  Edit,
  Trash2,
  Send,
  Check,
  ArrowLeft
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface PurchaseOrder {
  id: string;
  po_number: string;
  vendor_name: string;
  project_name: string | null;
  status: string;
  po_date: string;
  delivery_date: string | null;
  total_amount: number;
  created_by_name: string;
}

const PurchaseOrders = () => {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadPurchaseOrders();
  }, [userProfile?.company_id]);

  const loadPurchaseOrders = async () => {
    if (!userProfile?.company_id) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('purchase_orders')
        .select(`
          *,
          vendors!inner(name),
          projects(name),
          created_by_profile:user_profiles!purchase_orders_created_by_fkey(first_name, last_name)
        `)
        .eq('company_id', userProfile.company_id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedData = data?.map(po => ({
        id: po.id,
        po_number: po.po_number,
        vendor_name: po.vendors?.name || 'Unknown Vendor',
        project_name: po.projects?.name || null,
        status: po.status,
        po_date: po.po_date,
        delivery_date: po.delivery_date,
        total_amount: po.total_amount,
        created_by_name: po.created_by_profile 
          ? `${po.created_by_profile.first_name} ${po.created_by_profile.last_name}`.trim()
          : 'Unknown'
      })) || [];

      setPurchaseOrders(formattedData);
    } catch (error) {
      console.error('Error loading purchase orders:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load purchase orders"
      });
    } finally {
      setLoading(false);
    }
  };

  const updatePOStatus = async (id: string, status: string) => {
    try {
      const updateData: any = { status };
      
      if (status === 'sent') {
        updateData.sent_at = new Date().toISOString();
      } else if (status === 'approved') {
        updateData.approved_at = new Date().toISOString();
        updateData.approved_by = userProfile?.id;
      } else if (status === 'received') {
        updateData.received_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('purchase_orders')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Status Updated",
        description: `Purchase order status updated to ${status}`
      });

      loadPurchaseOrders();
    } catch (error) {
      console.error('Error updating PO status:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update purchase order status"
      });
    }
  };

  const deletePO = async (id: string) => {
    if (!confirm('Are you sure you want to delete this purchase order?')) return;

    try {
      const { error } = await supabase
        .from('purchase_orders')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Purchase Order Deleted",
        description: "Purchase order has been deleted successfully"
      });

      loadPurchaseOrders();
    } catch (error) {
      console.error('Error deleting purchase order:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete purchase order"
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { variant: 'secondary' as const, label: 'Draft' },
      sent: { variant: 'default' as const, label: 'Sent' },
      approved: { variant: 'default' as const, label: 'Approved' },
      received: { variant: 'default' as const, label: 'Received' },
      cancelled: { variant: 'destructive' as const, label: 'Cancelled' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    return <Badge variant={config.variant} aria-label={`Status: ${config.label}`}>{config.label}</Badge>;
  };

  const filteredPOs = purchaseOrders.filter(po => {
    const matchesSearch = !searchTerm || 
      po.po_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      po.vendor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      po.project_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || po.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const totalValue = filteredPOs.reduce((sum, po) => sum + po.total_amount, 0);
  const pendingCount = purchaseOrders.filter(po => ['draft', 'sent'].includes(po.status)).length;

  return (
    <RoleGuard allowedRoles={ROLE_GROUPS.FINANCIAL_VIEWERS}>
      <DashboardLayout title="Purchase Orders">
        <main aria-label="Purchase orders management" className="space-y-6">
        {/* Summary Cards */}
        <section aria-label="Purchase order statistics" className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Purchase Orders</p>
                  <p className="text-2xl font-bold">{purchaseOrders.length}</p>
                </div>
                <Package className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Pending Approval</p>
                  <p className="text-2xl font-bold text-amber-600">{pendingCount}</p>
                </div>
                <Package className="h-8 w-8 text-amber-600" aria-hidden="true" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Value</p>
                  <p className="text-2xl font-bold text-construction-orange">${totalValue.toLocaleString()}</p>
                </div>
                <Package className="h-8 w-8 text-construction-orange" aria-hidden="true" />
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Filters and Search */}
        <Card>
          <CardContent className="pt-6">
            <div role="search" aria-label="Filter purchase orders" className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <Input
                  placeholder="Search PO number, vendor, or project..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-64"
                  aria-label="Search purchase orders"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40" aria-label="Filter by status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="received">Received</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Purchase Orders List */}
        <Card>
          <CardHeader>
            <CardTitle>Purchase Orders</CardTitle>
            <CardDescription>
              {filteredPOs.length} purchase order{filteredPOs.length !== 1 ? 's' : ''} found
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">{[1,2,3,4,5].map(i => <div key={i} className="h-8 bg-muted animate-pulse rounded" />)}</div>
            ) : filteredPOs.length === 0 ? (
              <div className="text-center py-8">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" aria-hidden="true" />
                <h3 className="text-lg font-medium mb-2">No Purchase Orders Found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm || statusFilter !== 'all' 
                    ? 'No purchase orders match your current filters'
                    : 'Get started by creating your first purchase order'
                  }
                </p>
                {!searchTerm && statusFilter === 'all' && (
                  <Button onClick={() => navigate('/purchase-orders/new')}>
                    <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
                    Create Purchase Order
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredPOs.map(po => (
                  <div key={po.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50" role="article" aria-label={`Purchase order ${po.po_number}`}>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-medium">{po.po_number}</h3>
                        {getStatusBadge(po.status)}
                      </div>
                      <div className="text-sm text-muted-foreground grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <span className="font-medium">Vendor:</span> {po.vendor_name}
                        </div>
                        <div>
                          <span className="font-medium">Project:</span> {po.project_name || 'No Project'}
                        </div>
                        <div>
                          <span className="font-medium">Date:</span> {new Date(po.po_date).toLocaleDateString()}
                        </div>
                        <div>
                          <span className="font-medium">Amount:</span> ${po.total_amount.toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/purchase-orders/${po.id}`)}
                        aria-label={`View ${po.po_number}`}
                      >
                        <Eye className="h-4 w-4" aria-hidden="true" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/purchase-orders/${po.id}/edit`)}
                        aria-label={`Edit ${po.po_number}`}
                      >
                        <Edit className="h-4 w-4" aria-hidden="true" />
                      </Button>
                      {po.status === 'draft' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updatePOStatus(po.id, 'sent')}
                          aria-label={`Send ${po.po_number}`}
                        >
                          <Send className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      )}
                      {po.status === 'sent' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updatePOStatus(po.id, 'approved')}
                          aria-label={`Approve ${po.po_number}`}
                        >
                          <Check className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deletePO(po.id)}
                        aria-label={`Delete ${po.po_number}`}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        </main>
      </DashboardLayout>
    </RoleGuard>
  );
};

export default PurchaseOrders;