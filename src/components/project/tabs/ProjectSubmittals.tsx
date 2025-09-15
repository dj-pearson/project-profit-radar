import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { 
  Send, 
  Clock,
  FileText,
  PlusCircle,
  ExternalLink,
  CheckCircle,
  XCircle,
  AlertTriangle
} from 'lucide-react';

interface ProjectSubmittalsProps {
  projectId: string;
  onNavigate: (path: string) => void;
}

export const ProjectSubmittals: React.FC<ProjectSubmittalsProps> = ({
  projectId,
  onNavigate
}) => {
  const { userProfile } = useAuth();
  const [submittals, setSubmittals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (projectId && userProfile?.company_id) {
      loadSubmittals();
    }
  }, [projectId, userProfile?.company_id]);

  const loadSubmittals = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('submittals')
        .select('*')
        .eq('project_id', projectId)
        .eq('company_id', userProfile?.company_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSubmittals(data || []);
    } catch (error: any) {
      console.error('Error loading submittals:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load submittals"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'success';
      case 'submitted': return 'secondary';
      case 'rejected': return 'destructive';
      case 'under_review': return 'warning';
      case 'resubmission_required': return 'outline';
      default: return 'secondary';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'rejected': return <XCircle className="h-4 w-4 text-red-600" />;
      case 'under_review': return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'resubmission_required': return <AlertTriangle className="h-4 w-4 text-orange-600" />;
      default: return <FileText className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const isOverdue = (dueDate: string, status: string) => {
    return new Date(dueDate) < new Date() && !['approved', 'rejected'].includes(status) && dueDate;
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
            <Send className="h-5 w-5 mr-2" />
            Submittals ({submittals.length})
          </span>
          <div className="flex gap-2">
            <Button 
              size="sm" 
              onClick={() => onNavigate(`/submittals?project=${projectId}`)}
              variant="outline"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              View All
            </Button>
            <Button 
              size="sm" 
              onClick={() => onNavigate('/submittals/create')}
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              Create Submittal
            </Button>
          </div>
        </CardTitle>
        <CardDescription>Document submittals and approval tracking</CardDescription>
      </CardHeader>
      <CardContent>
        {submittals.length > 0 ? (
          <div className="space-y-4">
            {submittals.map((submittal) => (
              <div key={submittal.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(submittal.status)}
                    <span className="font-medium">{submittal.title}</span>
                    {isOverdue(submittal.due_date, submittal.status) && (
                      <Badge variant="destructive">Overdue</Badge>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={getStatusColor(submittal.status) as any}>
                      {submittal.status?.replace('_', ' ') || 'pending'}
                    </Badge>
                    {submittal.spec_section && (
                      <Badge variant="outline">
                        {submittal.spec_section}
                      </Badge>
                    )}
                  </div>
                </div>
                
                <p className="text-sm text-muted-foreground">{submittal.submittal_number}</p>
                
                {submittal.description && (
                  <p className="text-sm">{submittal.description}</p>
                )}

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Created by:</span>
                    <p className="font-medium">{submittal.created_by || 'N/A'}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  {submittal.created_at && (
                    <div className="flex items-center space-x-1">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Created:</span>
                      <span>{new Date(submittal.created_at).toLocaleDateString()}</span>
                    </div>
                  )}
                  {submittal.due_date && (
                    <div className="flex items-center space-x-1">
                      <span className="text-muted-foreground">Due:</span>
                      <span className={isOverdue(submittal.due_date, submittal.status) ? 'text-red-600 font-medium' : ''}>
                        {new Date(submittal.due_date).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>

                {submittal.approved_date && (
                  <div className="flex items-center space-x-1 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-muted-foreground">Approved:</span>
                    <span className="text-green-600 font-medium">
                      {new Date(submittal.approved_date).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Send className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">No submittals for this project yet</p>
            <Button onClick={() => onNavigate('/submittals/create')} variant="outline">
              <PlusCircle className="h-4 w-4 mr-2" />
              Create First Submittal
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};