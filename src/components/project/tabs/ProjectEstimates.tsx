import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { 
  Calculator, 
  DollarSign,
  Calendar,
  PlusCircle,
  ExternalLink,
  FileText
} from 'lucide-react';

interface Estimate {
  id: string;
  estimate_number: string;
  title: string;
  client_name: string;
  total_amount: number;
  status: string;
  created_at: string;
  valid_until: string;
}

interface ProjectEstimatesProps {
  projectId: string;
  onNavigate: (path: string) => void;
}

export const ProjectEstimates: React.FC<ProjectEstimatesProps> = ({
  projectId,
  onNavigate
}) => {
  const { userProfile } = useAuth();
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (projectId && userProfile?.company_id) {
      loadEstimates();
    }
  }, [projectId, userProfile?.company_id]);

  const loadEstimates = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('estimates')
        .select('*')
        .eq('project_id', projectId)
        .eq('company_id', userProfile?.company_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEstimates(data || []);
    } catch (error: any) {
      console.error('Error loading estimates:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load estimates"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted': return 'success';
      case 'sent': return 'secondary';
      case 'rejected': return 'destructive';
      case 'expired': return 'outline';
      default: return 'secondary';
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
            <Calculator className="h-5 w-5 mr-2" />
            Estimates ({estimates.length})
          </span>
          <div className="flex gap-2">
            <Button 
              size="sm" 
              onClick={() => onNavigate(`/estimates?project=${projectId}`)}
              variant="outline"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              View All
            </Button>
            <Button 
              size="sm" 
              onClick={() => onNavigate('/estimates/create')}
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              Create Estimate
            </Button>
          </div>
        </CardTitle>
        <CardDescription>Cost estimates and proposals for this project</CardDescription>
      </CardHeader>
      <CardContent>
        {estimates.length > 0 ? (
          <div className="space-y-4">
            {estimates.map((estimate) => (
              <div key={estimate.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center space-x-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{estimate.title}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{estimate.estimate_number}</p>
                  </div>
                  <Badge variant={getStatusColor(estimate.status) as any}>
                    {estimate.status}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Client</p>
                    <p className="font-medium">{estimate.client_name}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Total Amount</p>
                    <div className="flex items-center">
                      <DollarSign className="h-4 w-4 text-green-600" />
                      <span className="font-medium text-green-600">
                        {formatCurrency(estimate.total_amount)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-1">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Created:</span>
                    <span>{new Date(estimate.created_at).toLocaleDateString()}</span>
                  </div>
                  {estimate.valid_until && (
                    <div className="flex items-center space-x-1">
                      <span className="text-muted-foreground">Valid until:</span>
                      <span>{new Date(estimate.valid_until).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Calculator className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">No estimates for this project yet</p>
            <Button onClick={() => onNavigate('/estimates/create')} variant="outline">
              <PlusCircle className="h-4 w-4 mr-2" />
              Create First Estimate
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};