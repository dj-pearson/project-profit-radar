import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { 
  FileX, 
  DollarSign,
  Calendar,
  PlusCircle,
  ExternalLink,
  TrendingUp,
  TrendingDown,
  Clock
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
    if (projectId && userProfile?.company_id) {
      loadChangeOrders();
    }
  }, [projectId, userProfile?.company_id]);

  const loadChangeOrders = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('change_orders')
        .select('*')
        .eq('project_id', projectId)
        .eq('company_id', userProfile?.company_id)
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
      case 'pending': return 'warning';
      case 'rejected': return 'destructive';
      case 'draft': return 'secondary';
      case 'under_review': return 'secondary';
      default: return 'secondary';
    }
  };

  const getTypeIcon = (amount: number) => {
    if (amount > 0) {
      return <TrendingUp className="h-4 w-4 text-green-600" />;
    } else {
      return <TrendingDown className="h-4 w-4 text-red-600" />;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(Math.abs(amount));
  };

  const getTotalImpact = () => {
    return changeOrders
      .filter(co => co.status === 'approved')
      .reduce((sum, co) => sum + co.amount, 0);
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

  const totalImpact = getTotalImpact();

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
          {totalImpact !== 0 && (
            <span className={`ml-2 font-medium ${totalImpact > 0 ? 'text-green-600' : 'text-red-600'}`}>
              Total Impact: {totalImpact > 0 ? '+' : ''}{formatCurrency(totalImpact)}
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {changeOrders.length > 0 ? (
          <div className="space-y-4">
            {changeOrders.map((changeOrder) => (
              <div key={changeOrder.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {getTypeIcon(changeOrder.amount)}
                    <span className="font-medium">{changeOrder.title}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={getStatusColor(changeOrder.status) as any}>
                      {changeOrder.status?.replace('_', ' ') || 'pending'}
                    </Badge>
                    <div className="flex items-center">
                      <DollarSign className={`h-4 w-4 ${changeOrder.amount > 0 ? 'text-green-600' : 'text-red-600'}`} />
                      <span className={`font-medium ${changeOrder.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {changeOrder.amount > 0 ? '+' : ''}{formatCurrency(changeOrder.amount)}
                      </span>
                    </div>
                  </div>
                </div>
                
                <p className="text-sm text-muted-foreground">{changeOrder.change_order_number}</p>
                
                {changeOrder.description && (
                  <p className="text-sm">{changeOrder.description}</p>
                )}

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Created by:</span>
                    <p className="font-medium">{changeOrder.created_by || 'N/A'}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-1">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Created:</span>
                    <span>{new Date(changeOrder.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
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