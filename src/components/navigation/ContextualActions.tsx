import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { integrationService } from '@/services/IntegrationService';
import { toast } from '@/hooks/use-toast';
import {
  ArrowRight,
  Building2,
  DollarSign,
  FileText,
  Users,
  Calendar,
  Zap,
  ExternalLink,
  Plus,
  Link
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

export interface ContextualAction {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  action: () => void;
  badge?: string;
  variant?: 'default' | 'secondary' | 'outline';
  disabled?: boolean;
}

export interface ContextualActionsProps {
  context: {
    module: 'crm' | 'projects' | 'financial' | 'materials' | 'tasks';
    entityType: string;
    entityId: string;
    entityData?: any;
  };
  className?: string;
}

export const ContextualActions: React.FC<ContextualActionsProps> = ({
  context,
  className = ''
}) => {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const [actions, setActions] = useState<ContextualAction[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateProjectDialog, setShowCreateProjectDialog] = useState(false);
  const [projectData, setProjectData] = useState({
    name: '',
    estimatedBudget: 0,
    startDate: new Date().toISOString().split('T')[0],
    projectType: 'general'
  });

  useEffect(() => {
    generateContextualActions();
  }, [context]);

  const generateContextualActions = () => {
    const contextActions: ContextualAction[] = [];

    switch (context.module) {
      case 'crm':
        if (context.entityType === 'opportunity' && context.entityData?.status === 'won') {
          contextActions.push({
            id: 'create-project',
            title: 'Create Project',
            description: 'Convert this won opportunity into a project',
            icon: Building2,
            action: () => setShowCreateProjectDialog(true),
            badge: 'Recommended',
            variant: 'default'
          });
        }

        if (context.entityType === 'lead' && context.entityData?.status === 'qualified') {
          contextActions.push({
            id: 'create-opportunity',
            title: 'Create Opportunity',
            description: 'Convert this qualified lead to an opportunity',
            icon: DollarSign,
            action: () => navigate(`/crm/opportunities/new?leadId=${context.entityId}`),
            variant: 'outline'
          });
        }

        contextActions.push({
          id: 'view-related-projects',
          title: 'Related Projects',
          description: 'View projects associated with this contact',
          icon: ExternalLink,
          action: () => navigate(`/projects?contactId=${context.entityId}`),
          variant: 'outline'
        });
        break;

      case 'projects':
        if (context.entityData?.status === 'active' || context.entityData?.status === 'in_progress') {
          contextActions.push({
            id: 'create-invoice',
            title: 'Create Invoice',
            description: 'Generate invoice based on project costs',
            icon: FileText,
            action: () => handleCreateInvoice(),
            variant: 'default'
          });

          contextActions.push({
            id: 'add-materials',
            title: 'Add Materials',
            description: 'Add materials to this project',
            icon: Plus,
            action: () => navigate(`/projects/${context.entityId}?tab=materials`),
            variant: 'outline'
          });

          contextActions.push({
            id: 'view-job-costing',
            title: 'Job Costing',
            description: 'View detailed cost breakdown',
            icon: DollarSign,
            action: () => navigate(`/projects/${context.entityId}?tab=jobcosting`),
            variant: 'outline'
          });
        }

        contextActions.push({
          id: 'view-crm-opportunity',
          title: 'View Opportunity',
          description: 'Go to the original CRM opportunity',
          icon: Link,
          action: () => {
            if (context.entityData?.opportunity_id) {
              navigate(`/crm/opportunities/${context.entityData.opportunity_id}`);
            } else {
              toast({
                title: "No linked opportunity",
                description: "This project was not created from a CRM opportunity",
                variant: "destructive"
              });
            }
          },
          variant: 'outline',
          disabled: !context.entityData?.opportunity_id
        });
        break;

      case 'materials':
        contextActions.push({
          id: 'update-job-costing',
          title: 'Update Job Costs',
          description: 'Update project job costing with new material costs',
          icon: Calculator,
          action: () => handleUpdateJobCosting(),
          variant: 'outline'
        });

        contextActions.push({
          id: 'view-usage-projects',
          title: 'View Usage',
          description: 'See which projects are using this material',
          icon: Building2,
          action: () => navigate(`/projects?materialId=${context.entityId}`),
          variant: 'outline'
        });
        break;

      case 'financial':
        if (context.entityType === 'invoice' && context.entityData?.project_id) {
          contextActions.push({
            id: 'view-project',
            title: 'View Project',
            description: 'Go to the associated project',
            icon: Building2,
            action: () => navigate(`/projects/${context.entityData.project_id}`),
            variant: 'outline'
          });
        }
        break;

      case 'tasks':
        if (context.entityData?.project_id) {
          contextActions.push({
            id: 'view-project',
            title: 'View Project',
            description: 'Go to the project this task belongs to',
            icon: Building2,
            action: () => navigate(`/projects/${context.entityData.project_id}`),
            variant: 'outline'
          });
        }
        break;
    }

    // Common actions available across modules
    contextActions.push({
      id: 'create-task',
      title: 'Create Task',
      description: 'Create a new task related to this item',
      icon: Calendar,
      action: () => navigate(`/tasks/new?relatedId=${context.entityId}&relatedType=${context.entityType}`),
      variant: 'outline'
    });

    setActions(contextActions);
  };

  const handleCreateProject = async () => {
    try {
      setLoading(true);
      const result = await integrationService.createProjectFromOpportunity({
        opportunityId: context.entityId,
        projectName: projectData.name,
        estimatedBudget: projectData.estimatedBudget,
        startDate: projectData.startDate,
        projectType: projectData.projectType
      });

      if (result.success && result.projectId) {
        setShowCreateProjectDialog(false);
        navigate(`/projects/${result.projectId}`);
      }
    } catch (error) {
      console.error('Error creating project:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInvoice = async () => {
    try {
      setLoading(true);
      const result = await integrationService.createInvoiceFromProject(context.entityId);
      
      if (result.success && result.invoiceId) {
        navigate(`/financial/invoices/${result.invoiceId}`);
      }
    } catch (error) {
      console.error('Error creating invoice:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateJobCosting = async () => {
    try {
      setLoading(true);
      // This would need project IDs that use this material
      // Implementation would depend on specific material usage tracking
      toast({
        title: "Feature Coming Soon",
        description: "Job costing updates from material changes will be available soon",
      });
    } catch (error) {
      console.error('Error updating job costing:', error);
    } finally {
      setLoading(false);
    }
  };

  if (actions.length === 0) {
    return null;
  }

  return (
    <>
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center">
            <Zap className="h-4 w-4 mr-2" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {actions.slice(0, 3).map((action) => (
            <Button
              key={action.id}
              variant={action.variant || 'outline'}
              size="sm"
              onClick={action.action}
              disabled={action.disabled || loading}
              className="w-full justify-start"
            >
              <action.icon className="h-4 w-4 mr-2" />
              {action.title}
              {action.badge && (
                <Badge variant="secondary" className="ml-auto text-xs">
                  {action.badge}
                </Badge>
              )}
            </Button>
          ))}
          
          {actions.length > 3 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full">
                  More Actions ({actions.length - 3})
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56">
                <DropdownMenuLabel>Additional Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {actions.slice(3).map((action) => (
                  <DropdownMenuItem
                    key={action.id}
                    onClick={action.action}
                    disabled={action.disabled || loading}
                  >
                    <action.icon className="h-4 w-4 mr-2" />
                    {action.title}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </CardContent>
      </Card>

      {/* Create Project Dialog */}
      <Dialog open={showCreateProjectDialog} onOpenChange={setShowCreateProjectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Project from Opportunity</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="projectName" className="text-right">
                Project Name
              </Label>
              <Input
                id="projectName"
                value={projectData.name}
                onChange={(e) => setProjectData({ ...projectData, name: e.target.value })}
                className="col-span-3"
                placeholder={context.entityData?.name || 'Enter project name'}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="estimatedBudget" className="text-right">
                Budget
              </Label>
              <Input
                id="estimatedBudget"
                type="number"
                value={projectData.estimatedBudget}
                onChange={(e) => setProjectData({ ...projectData, estimatedBudget: parseFloat(e.target.value) })}
                className="col-span-3"
                placeholder={context.entityData?.estimated_value?.toString() || '0'}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="startDate" className="text-right">
                Start Date
              </Label>
              <Input
                id="startDate"
                type="date"
                value={projectData.startDate}
                onChange={(e) => setProjectData({ ...projectData, startDate: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="projectType" className="text-right">
                Type
              </Label>
              <Input
                id="projectType"
                value={projectData.projectType}
                onChange={(e) => setProjectData({ ...projectData, projectType: e.target.value })}
                className="col-span-3"
                placeholder={context.entityData?.project_type || 'general'}
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setShowCreateProjectDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateProject} disabled={loading}>
              {loading ? 'Creating...' : 'Create Project'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ContextualActions;
