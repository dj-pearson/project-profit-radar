import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ProjectWithRelations } from '@/services/projectService';
import ProjectEquipmentView from '@/components/equipment/ProjectEquipmentView';
import { ConstructionTimelineManager } from '@/components/construction/ConstructionTimelineManager';
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
        <CardTitle className="flex items-center">
          <TrendingUp className="h-5 w-5 mr-2" />
          Project Progress
        </CardTitle>
        <CardDescription>Track project milestones and completion status</CardDescription>
      </CardHeader>
      <CardContent>
        <ConstructionTimelineManager projectId={project.id} />
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Daily Reports
          </span>
          <Button onClick={() => onNavigate('/daily-reports')}>
            Manage Daily Reports
          </Button>
        </CardTitle>
        <CardDescription>View and manage daily progress reports</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-4">View all daily reports for this project</p>
          <Button onClick={() => onNavigate('/daily-reports')} variant="outline">
            Go to Daily Reports
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderMaterials = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center">
            <Package className="h-5 w-5 mr-2" />
            Materials & Inventory
          </span>
          <Button size="sm" onClick={() => onNavigate(`/projects/${project.id}/materials/new`)}>
            Add Material
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {project.materials && project.materials.length > 0 ? (
          <div className="space-y-2">
            {project.materials.map((material: any) => (
              <div key={material.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">{material.name}</p>
                  {material.description && (
                    <p className="text-sm text-muted-foreground">{material.description}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-8">No materials added yet</p>
        )}
      </CardContent>
    </Card>
  );

  const renderEquipment = () => (
    <ProjectEquipmentView projectId={project.id} />
  );

  const renderEstimates = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center">
            <Calculator className="h-5 w-5 mr-2" />
            Project Estimates
          </span>
          <Button onClick={() => onNavigate('/estimates')}>
            Manage Estimates
          </Button>
        </CardTitle>
        <CardDescription>Manage project cost estimates and proposals</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8">
          <Calculator className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-4">Create and manage estimates for this project</p>
          <Button onClick={() => onNavigate('/estimates')} variant="outline">
            Go to Estimates
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderJobCosting = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <DollarSign className="h-5 w-5 mr-2" />
          Job Costing
        </CardTitle>
        <CardDescription>Track actual costs vs. estimates</CardDescription>
      </CardHeader>
      <CardContent>
        {project.job_costs && project.job_costs.length > 0 ? (
          <div className="space-y-2">
            {project.job_costs.map((cost: any) => (
              <div key={cost.id} className="flex items-center justify-between p-2 border rounded">
                <span>Job Cost</span>
                <div className="text-right">
                  <p className="text-sm">Total: {formatCurrency(cost.total_cost)}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-4">No cost data available</p>
        )}
      </CardContent>
    </Card>
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <FileX className="h-5 w-5 mr-2" />
          Change Orders
        </CardTitle>
        <CardDescription>Track project modifications and approvals</CardDescription>
      </CardHeader>
      <CardContent>
        {project.change_orders && project.change_orders.length > 0 ? (
          <div className="space-y-2">
            {project.change_orders.map((order: any) => (
              <div key={order.id} className="flex items-center justify-between p-2 border rounded">
                <div>
                  <p className="font-medium">{order.title}</p>
                  <p className="text-sm text-muted-foreground">{order.status}</p>
                </div>
                <p className="font-medium">{formatCurrency(order.amount)}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-4">No change orders</p>
        )}
      </CardContent>
    </Card>
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center">
            <HelpCircle className="h-5 w-5 mr-2" />
            RFI's (Requests for Information)
          </span>
          <Button onClick={() => onNavigate('/rfis')}>
            Manage RFIs
          </Button>
        </CardTitle>
        <CardDescription>Manage project questions and clarifications</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8">
          <HelpCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-4">Create and track RFIs for this project</p>
          <Button onClick={() => onNavigate('/rfis')} variant="outline">
            Go to RFIs
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderSubmittals = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center">
            <Send className="h-5 w-5 mr-2" />
            Submittals
          </span>
          <Button onClick={() => onNavigate('/submittals')}>
            Manage Submittals
          </Button>
        </CardTitle>
        <CardDescription>Track submittal documents and approvals</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8">
          <Send className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-4">Track submittal documents and approvals</p>
          <Button onClick={() => onNavigate('/submittals')} variant="outline">
            Go to Submittals
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderContacts = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center">
            <Users className="h-5 w-5 mr-2" />
            Project Contacts
          </span>
          <Button onClick={() => onNavigate('/crm/contacts')}>
            Manage Contacts
          </Button>
        </CardTitle>
        <CardDescription>Manage project team and stakeholder contacts</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8">
          <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-4">Manage project team and stakeholder contacts</p>
          <Button onClick={() => onNavigate('/crm/contacts')} variant="outline">
            Go to Contacts
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderPermits = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center">
            <Shield className="h-5 w-5 mr-2" />
            Permits
          </span>
          <Button onClick={() => onNavigate('/permit-management')}>
            Manage Permits
          </Button>
        </CardTitle>
        <CardDescription>Track required permits and approvals</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8">
          <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-4">Track required permits and approvals</p>
          <Button onClick={() => onNavigate('/permit-management')} variant="outline">
            Go to Permits
          </Button>
        </div>
      </CardContent>
    </Card>
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center">
            <CheckSquare className="h-5 w-5 mr-2" />
            Punch List
          </span>
          <Button onClick={() => onNavigate('/punch-list')}>
            Manage Punch List
          </Button>
        </CardTitle>
        <CardDescription>Track final items and project completion tasks</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8">
          <CheckSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-4">Track final items and project completion tasks</p>
          <Button onClick={() => onNavigate('/punch-list')} variant="outline">
            Go to Punch List
          </Button>
        </div>
      </CardContent>
    </Card>
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