import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { 
  HelpCircle, 
  Clock,
  User,
  PlusCircle,
  ExternalLink,
  AlertTriangle
} from 'lucide-react';

interface ProjectRFIsProps {
  projectId: string;
  onNavigate: (path: string) => void;
}

export const ProjectRFIs: React.FC<ProjectRFIsProps> = ({
  projectId,
  onNavigate
}) => {
  const { userProfile } = useAuth();
  const [rfis, setRFIs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (projectId && userProfile?.company_id) {
      loadRFIs();
    }
  }, [projectId, userProfile?.company_id]);

  const loadRFIs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('rfis')
        .select('*')
        .eq('project_id', projectId)
        .eq('company_id', userProfile?.company_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRFIs(data || []);
    } catch (error: any) {
      console.error('Error loading RFIs:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load RFIs"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'secondary';
      case 'pending_response': return 'warning';
      case 'answered': return 'success';
      case 'closed': return 'outline';
      default: return 'secondary';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-green-600';
      default: return 'text-muted-foreground';
    }
  };

  const getPriorityIcon = (priority: string) => {
    if (priority === 'high') {
      return <AlertTriangle className="h-4 w-4 text-red-600" />;
    }
    return null;
  };

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date() && dueDate;
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
            <HelpCircle className="h-5 w-5 mr-2" />
            RFIs ({rfis.length})
          </span>
          <div className="flex gap-2">
            <Button 
              size="sm" 
              onClick={() => onNavigate(`/rfis?project=${projectId}`)}
              variant="outline"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              View All
            </Button>
            <Button 
              size="sm" 
              onClick={() => onNavigate('/rfis/create')}
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              Create RFI
            </Button>
          </div>
        </CardTitle>
        <CardDescription>Requests for information and clarifications</CardDescription>
      </CardHeader>
      <CardContent>
        {rfis.length > 0 ? (
          <div className="space-y-4">
            {rfis.map((rfi) => (
              <div key={rfi.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {getPriorityIcon(rfi.priority)}
                    <span className="font-medium">{rfi.subject}</span>
                    {isOverdue(rfi.due_date) && (
                      <Badge variant="destructive">Overdue</Badge>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={getStatusColor(rfi.status) as any}>
                      {rfi.status?.replace('_', ' ') || 'open'}
                    </Badge>
                    <span className={`text-sm font-medium ${getPriorityColor(rfi.priority)}`}>
                      {rfi.priority || 'medium'}
                    </span>
                  </div>
                </div>
                
                <p className="text-sm text-muted-foreground">{rfi.rfi_number}</p>
                
                <p className="text-sm">{rfi.description}</p>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">From:</span>
                    <span>{rfi.created_by || 'N/A'}</span>
                  </div>
                </div>

                {rfi.due_date && (
                  <div className="flex items-center space-x-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Due:</span>
                    <span className={isOverdue(rfi.due_date) ? 'text-red-600 font-medium' : ''}>
                      {new Date(rfi.due_date).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <HelpCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">No RFIs for this project yet</p>
            <Button onClick={() => onNavigate('/rfis/create')} variant="outline">
              <PlusCircle className="h-4 w-4 mr-2" />
              Create First RFI
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};