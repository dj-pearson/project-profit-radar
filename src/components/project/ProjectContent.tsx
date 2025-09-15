import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ProjectWithRelations } from '@/services/projectService';
import ProjectEquipmentView from '@/components/equipment/ProjectEquipmentView';
import { ConstructionTimelineManager } from '@/components/construction/ConstructionTimelineManager';
import { ProjectDailyReports } from '@/components/project/tabs/ProjectDailyReports';
import { ProjectEstimates } from '@/components/project/tabs/ProjectEstimates';
import { ProjectRFIs } from '@/components/project/tabs/ProjectRFIs';
import { ProjectSubmittals } from '@/components/project/tabs/ProjectSubmittals';
import { ProjectChangeOrders } from '@/components/project/tabs/ProjectChangeOrders';
import { ProjectMaterials } from '@/components/project/tabs/ProjectMaterials';
import { ProjectJobCosting } from '@/components/project/tabs/ProjectJobCosting';
import { ProjectContacts } from '@/components/project/tabs/ProjectContacts';
import { ProjectPermits } from '@/components/project/tabs/ProjectPermits';
import { ProjectPunchList } from '@/components/project/tabs/ProjectPunchList';
import {
  Building2,
  Calendar,
  DollarSign,
  MapPin,
  User,
  TrendingUp,
  CheckCircle2,
  Clock,
  FileText,
  Package,
  Hammer,
  Calculator,
  Receipt,
  FileX,
  MessageSquare,
  HelpCircle,
  Send,
  Users,
  Shield,
  CheckSquare,
  FolderOpen
} from 'lucide-react';

interface ProjectContentProps {
  project: ProjectWithRelations;
  activeTab: string;
  onNavigate: (path: string) => void;
}

export const ProjectContent: React.FC<ProjectContentProps> = ({
  project,
  activeTab,
  onNavigate
}) => {
  const formatCurrency = (amount: number | null | undefined) => {
    return amount ? `$${amount.toLocaleString()}` : 'N/A';
  };

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Project Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Progress</p>
                <p className="text-2xl font-bold">{project.completion_percentage}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-primary" />
            </div>
            <Progress value={project.completion_percentage} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Budget</p>
                <p className="text-xl font-bold">{formatCurrency(project.budget)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Tasks</p>
                <p className="text-2xl font-bold">{project.tasks?.length || 0}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Duration</p>
                <p className="text-lg font-bold">
                  {project.start_date && project.end_date
                    ? `${Math.ceil(
                        (new Date(project.end_date).getTime() - new Date(project.start_date).getTime()) /
                        (1000 * 60 * 60 * 24)
                      )} days`
                    : 'N/A'}
                </p>
              </div>
              <Clock className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Project Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Building2 className="h-5 w-5 mr-2" />
            Project Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Client</p>
              <p className="text-sm">{project.client_name}</p>
              {project.client_email && (
                <p className="text-sm text-muted-foreground">{project.client_email}</p>
              )}
            </div>
            
            {project.site_address && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Location</p>
                <div className="flex items-start">
                  <MapPin className="h-4 w-4 mr-1 mt-0.5 text-muted-foreground" />
                  <p className="text-sm">{project.site_address}</p>
                </div>
              </div>
            )}

            {project.project_type && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Project Type</p>
                <p className="text-sm capitalize">{project.project_type.replace('_', ' ')}</p>
              </div>
            )}

            <div>
              <p className="text-sm font-medium text-muted-foreground">Timeline</p>
              <div className="flex items-center text-sm">
                <Calendar className="h-4 w-4 mr-1 text-muted-foreground" />
                {project.start_date && project.end_date ? (
                  <>
                    {new Date(project.start_date).toLocaleDateString()} - {new Date(project.end_date).toLocaleDateString()}
                  </>
                ) : (
                  'Not specified'
                )}
              </div>
            </div>
          </div>

          {project.description && (
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">Description</p>
              <p className="text-sm text-muted-foreground">{project.description}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const renderProgress = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center">
            <TrendingUp className="h-5 w-5 mr-2" />
            Project Progress
          </span>
          <Button onClick={() => onNavigate('/progress-tracking')}>
            Manage Progress
          </Button>
        </CardTitle>
        <CardDescription>Track project milestones and completion status</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Overall Progress</span>
            <span className="text-sm text-muted-foreground">{project.completion_percentage}%</span>
          </div>
          <Progress value={project.completion_percentage} className="w-full" />
          
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="text-center p-3 border rounded-lg">
              <p className="text-lg font-bold">{project.tasks?.length || 0}</p>
              <p className="text-xs text-muted-foreground">Total Tasks</p>
            </div>
            <div className="text-center p-3 border rounded-lg">
              <p className="text-lg font-bold">
                {project.tasks?.filter((task: any) => task.status === 'completed')?.length || 0}
              </p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </div>
          </div>
          
          <div className="mt-4">
            <Button onClick={() => onNavigate('/progress-tracking')} variant="outline" className="w-full">
              View Detailed Progress
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderTasks = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center">
            <CheckCircle2 className="h-5 w-5 mr-2" />
            Project Tasks
          </span>
          <Button size="sm" onClick={() => onNavigate(`/projects/${project.id}/tasks/new`)}>
            Add Task
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {project.tasks && project.tasks.length > 0 ? (
          <div className="space-y-2">
            {project.tasks.map((task: any) => (
              <div key={task.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">{task.name}</p>
                  {task.description && (
                    <p className="text-sm text-muted-foreground">{task.description}</p>
                  )}
                </div>
                <Badge variant={task.status === 'completed' ? 'secondary' : 'outline'}>
                  {task.status || 'pending'}
                </Badge>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-8">No tasks created yet</p>
        )}
      </CardContent>
    </Card>
  );

  const renderDailyReports = () => (
    <ProjectDailyReports projectId={project.id} onNavigate={onNavigate} />
  );

  const renderMaterials = () => (
    <ProjectMaterials projectId={project.id} onNavigate={onNavigate} />
  );

  const renderEquipment = () => (
    <ProjectEquipmentView projectId={project.id} />
  );

  const renderEstimates = () => (
    <ProjectEstimates projectId={project.id} onNavigate={onNavigate} />
  );

  const renderJobCosting = () => (
    <ProjectJobCosting 
      projectId={project.id} 
      projectBudget={project.budget}
      onNavigate={onNavigate} 
    />
  );

  const renderInvoicing = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center">
            <Receipt className="h-5 w-5 mr-2" />
            Invoicing
          </span>
          <Button onClick={() => onNavigate('/invoicing')}>
            Manage Invoices
          </Button>
        </CardTitle>
        <CardDescription>Manage project invoices and billing</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8">
          <Receipt className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-4">Create and manage invoices for this project</p>
          <Button onClick={() => onNavigate('/invoicing')} variant="outline">
            Go to Invoicing
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderChangeOrders = () => (
    <ProjectChangeOrders projectId={project.id} onNavigate={onNavigate} />
  );

  const renderCommunication = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center">
            <MessageSquare className="h-5 w-5 mr-2" />
            Messages
          </span>
          <Button onClick={() => onNavigate('/messages')}>
            View Messages
          </Button>
        </CardTitle>
        <CardDescription>Project communications and messaging</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8">
          <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-4">View and send messages for this project</p>
          <Button onClick={() => onNavigate('/messages')} variant="outline">
            Go to Messages
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderRFIs = () => (
    <ProjectRFIs projectId={project.id} onNavigate={onNavigate} />
  );

  const renderSubmittals = () => (
    <ProjectSubmittals projectId={project.id} onNavigate={onNavigate} />
  );

  const renderContacts = () => (
    <ProjectContacts projectId={project.id} onNavigate={onNavigate} />
  );

  const renderPermits = () => (
    <ProjectPermits projectId={project.id} onNavigate={onNavigate} />
  );

  const renderWarranties = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center">
            <Clock className="h-5 w-5 mr-2" />
            Warranties
          </span>
          <Button onClick={() => onNavigate('/warranty-management')}>
            Manage Warranties
          </Button>
        </CardTitle>
        <CardDescription>Manage product and service warranties</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8">
          <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-4">Manage product and service warranties</p>
          <Button onClick={() => onNavigate('/warranty-management')} variant="outline">
            Go to Warranties
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderPunchList = () => (
    <ProjectPunchList projectId={project.id} onNavigate={onNavigate} />
  );

  const renderDocuments = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center">
            <FolderOpen className="h-5 w-5 mr-2" />
            Project Documents
          </span>
          <Button size="sm" onClick={() => onNavigate(`/projects/${project.id}/documents/upload`)}>
            Upload Document
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {project.documents && project.documents.length > 0 ? (
          <div className="space-y-2">
            {project.documents.map((document: any) => (
              <div key={document.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center">
                  <FileText className="h-5 w-5 mr-2 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{document.name}</p>
                  </div>
                </div>
                <Button variant="outline" size="sm">View</Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-8">No documents uploaded yet</p>
        )}
      </CardContent>
    </Card>
  );

  // Content mapping
  const contentMap: Record<string, () => React.ReactNode> = {
    overview: renderOverview,
    progress: renderProgress,
    tasks: renderTasks,
    dailyreports: renderDailyReports,
    materials: renderMaterials,
    equipment: renderEquipment,
    estimates: renderEstimates,
    jobcosting: renderJobCosting,
    invoicing: renderInvoicing,
    changeorders: renderChangeOrders,
    communication: renderCommunication,
    rfis: renderRFIs,
    submittals: renderSubmittals,
    contacts: renderContacts,
    permits: renderPermits,
    warranties: renderWarranties,
    punchlist: renderPunchList,
    documents: renderDocuments,
  };

  const renderContent = contentMap[activeTab] || renderOverview;

  return (
    <div className="space-y-6">
      {renderContent()}
    </div>
  );
};