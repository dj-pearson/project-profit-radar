import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { 
  FileX, 
  PlusCircle,
  ExternalLink,
  DollarSign,
  User,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';

interface ProjectChangeOrdersProps {
  projectId: string;
  onNavigate: (path: string) => void;
}

export const ProjectChangeOrders: React.FC<ProjectChangeOrdersProps> = ({
  projectId,
  onNavigate
}) => {
  const { userProfile } = useAuth();
  const [changeOrders, setChangeOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (projectId) {
      loadChangeOrders();
    }
  }, [projectId]);

  const loadChangeOrders = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('change_orders')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setChangeOrders(data || []);
    } catch (error: any) {
      console.error('Error loading change orders:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load change orders"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'success';
      case 'pending': return 'secondary';
      case 'pending_approval': return 'warning';
      case 'rejected': return 'destructive';
      default: return 'secondary';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'rejected': return <XCircle className="h-4 w-4 text-red-600" />;
      case 'pending_approval': return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      default: return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center">
            <FileX className="h-5 w-5 mr-2" />
            Change Orders ({changeOrders.length})
          </span>
          <div className="flex gap-2">
            <Button 
              size="sm" 
              onClick={() => onNavigate(`/change-orders?project=${projectId}`)}
              variant="outline"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              View All
            </Button>
            <Button 
              size="sm" 
              onClick={() => onNavigate('/change-orders/create')}
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              Create Change Order
            </Button>
          </div>
        </CardTitle>
        <CardDescription>
          Project modifications and budget adjustments
        </CardDescription>
      </CardHeader>
      <CardContent>
        {changeOrders.length > 0 ? (
          <div className="space-y-4">
            {changeOrders.map((changeOrder) => (
              <div key={changeOrder.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(changeOrder.status)}
                    <span className="font-medium">{changeOrder.title}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={getStatusColor(changeOrder.status) as any}>
                      {changeOrder.status?.replace('_', ' ') || 'pending'}
                    </Badge>
                    <div className="flex items-center space-x-1">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{formatCurrency(changeOrder.amount)}</span>
                    </div>
                  </div>
                </div>
                
                <p className="text-sm text-muted-foreground">{changeOrder.change_order_number}</p>
                
                {changeOrder.description && (
                  <p className="text-sm">{changeOrder.description}</p>
                )}

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Created by:</span>
                    <span>
                      {changeOrder.created_by || 'N/A'}
                    </span>
                  </div>
                  {changeOrder.internal_approved_by && (
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Approved by:</span>
                      <span>
                        {changeOrder.internal_approved_by}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between text-sm">
                  {changeOrder.created_at && (
                    <div className="flex items-center space-x-1">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Created:</span>
                      <span>{new Date(changeOrder.created_at).toLocaleDateString()}</span>
                    </div>
                  )}
                  {changeOrder.approval_due_date && (
                    <div className="flex items-center space-x-1">
                      <span className="text-muted-foreground">Due:</span>
                      <span>{new Date(changeOrder.approval_due_date).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>

                {changeOrder.reason && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Reason:</span>
                    <p className="mt-1">{changeOrder.reason}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <FileX className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">No change orders for this project yet</p>
            <Button onClick={() => onNavigate('/change-orders/create')} variant="outline">
              <PlusCircle className="h-4 w-4 mr-2" />
              Create First Change Order
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};