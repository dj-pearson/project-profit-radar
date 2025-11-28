import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import {
  ClientProjectOverview,
  ClientProgressTimeline,
  ClientBudgetSummary,
  ClientDocumentGallery,
  ClientUpdatesFeed,
  ClientMessageCenter,
  ClientChangeOrderApproval,
  type Milestone,
  type Document,
  type ProjectUpdate,
  type ChangeOrder
} from '@/components/client-portal';
import {
  Building2,
  LayoutDashboard,
  TrendingUp,
  Image as ImageIcon,
  Bell,
  MessageSquare,
  FileText,
  CreditCard,
  ExternalLink,
  CheckCircle2,
  Clock
} from 'lucide-react';

interface Project {
  id: string;
  name: string;
  description: string;
  status: string;
  completion_percentage?: number;
  budget_total?: number;
  actual_cost?: number;
  contract_value?: number;
  start_date?: string;
  end_date?: string;
  estimated_completion?: string;
  site_address?: string;
  project_address?: any;
  client_email?: string;
}

interface Invoice {
  id: string;
  invoice_number: string;
  issue_date: string;
  due_date: string;
  total_amount: number;
  amount_paid: number;
  amount_due: number;
  status: string;
  stripe_invoice_id?: string;
  notes?: string;
}

const ClientPortalEnhanced = () => {
  const { user, userProfile, loading } = useAuth();
  const navigate = useNavigate();

  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [changeOrders, setChangeOrders] = useState<ChangeOrder[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [updates, setUpdates] = useState<ProjectUpdate[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [processingPayment, setProcessingPayment] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }

    if (!loading && user && userProfile && !userProfile.company_id && userProfile.role !== 'root_admin') {
      navigate('/setup');
    }

    // Check role permissions - only client_portal role should access this
    if (!loading && userProfile && userProfile.role !== 'client_portal') {
      navigate('/dashboard');
      toast({
        variant: "destructive",
        title: "Access Denied",
        description: "This portal is only accessible to clients."
      });
      return;
    }

    if (userProfile?.company_id) {
      loadClientData();
    }
  }, [user, userProfile, loading, navigate]);

  const loadClientData = async () => {
    try {
      setLoadingData(true);

      // Load projects where user is the client
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('*')
        .eq('client_email', user?.email)
        .order('created_at', { ascending: false });

      if (projectsError) throw projectsError;
      setProjects(projectsData || []);

      if (projectsData && projectsData.length > 0) {
        setSelectedProject(projectsData[0]);
        await loadProjectDetails(projectsData[0].id);
      }
    } catch (error: any) {
      console.error('Error loading client data:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load project data"
      });
    } finally {
      setLoadingData(false);
    }
  };

  const loadProjectDetails = async (projectId: string) => {
    try {
      // Load change orders
      const { data: changeOrdersData, error: coError } = await supabase
        .from('change_orders')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (!coError && changeOrdersData) {
        setChangeOrders(changeOrdersData.map(co => ({
          ...co,
          client_approved: co.client_approved
        })));
      }

      // Load invoices
      const { data: invoicesData, error: invoicesError } = await supabase
        .from('invoices')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (!invoicesError) {
        setInvoices(invoicesData || []);
      }

      // Load documents (photos and files)
      // Note: This is placeholder - you'll need to implement document storage
      const { data: documentsData, error: docsError } = await supabase
        .from('documents')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (!docsError && documentsData) {
        setDocuments(documentsData.map(doc => ({
          id: doc.id,
          name: doc.name || doc.file_name,
          type: doc.category === 'photo' ? 'photo' : doc.category === 'plan' ? 'plan' : 'document',
          url: doc.file_url || doc.url,
          thumbnailUrl: doc.thumbnail_url,
          uploadedBy: doc.uploaded_by_name,
          uploadedDate: doc.created_at,
          description: doc.description,
          size: doc.file_size
        })));
      }

      // Load project milestones/tasks as milestones
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .eq('project_id', projectId)
        .eq('is_milestone', true)
        .order('target_date', { ascending: true });

      if (!tasksError && tasksData) {
        setMilestones(tasksData.map(task => ({
          id: task.id,
          title: task.title || task.name,
          description: task.description,
          status: task.status === 'completed' ? 'completed' :
                  task.status === 'in_progress' ? 'in_progress' :
                  task.status === 'blocked' ? 'blocked' : 'pending',
          targetDate: task.target_date || task.due_date,
          completedDate: task.completed_at,
          progress: task.progress || 0,
          phase: task.phase || task.category
        })));
      }

      // Load daily reports as project updates
      const { data: reportsData, error: reportsError } = await supabase
        .from('daily_reports')
        .select('*')
        .eq('project_id', projectId)
        .order('date', { ascending: false })
        .limit(20);

      if (!reportsError && reportsData) {
        setUpdates(reportsData.map(report => ({
          id: report.id,
          type: 'general' as const,
          title: `Daily Update - ${new Date(report.date).toLocaleDateString()}`,
          description: report.work_performed || report.notes || 'No details provided',
          timestamp: report.created_at,
          author: report.submitted_by_name,
          isRead: true
        })));
      }
    } catch (error: any) {
      console.error('Error loading project details:', error);
    }
  };

  const handleProjectSelect = (project: Project) => {
    setSelectedProject(project);
    loadProjectDetails(project.id);
  };

  const handlePayInvoice = async (invoice: Invoice) => {
    if (!invoice.stripe_invoice_id) {
      toast({
        variant: "destructive",
        title: "Payment Error",
        description: "This invoice is not set up for online payment."
      });
      return;
    }

    setProcessingPayment(invoice.id);

    try {
      const { data, error } = await supabase.functions.invoke('process-invoice-payment', {
        body: {
          invoice_id: invoice.id,
          stripe_invoice_id: invoice.stripe_invoice_id,
          action: 'create_checkout_session'
        }
      });

      if (error) throw error;

      if (data?.checkout_url) {
        window.open(data.checkout_url, '_blank');
        toast({
          title: "Redirecting to Payment",
          description: "You will be redirected to complete your payment securely.",
        });
      }
    } catch (error: any) {
      console.error('Payment processing error:', error);
      toast({
        variant: "destructive",
        title: "Payment Error",
        description: error.message || "Failed to process payment"
      });
    } finally {
      setProcessingPayment(null);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getInvoiceStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-500';
      case 'sent':
      case 'viewed':
        return 'bg-blue-500';
      case 'overdue':
        return 'bg-red-500';
      case 'draft':
        return 'bg-gray-500';
      default:
        return 'bg-gray-500';
    }
  };

  // Calculate project stats
  const getProjectStats = (project: Project) => {
    const budgetUsed = (project.actual_cost || 0) / (project.budget_total || 1);
    const budgetVariance = (project.budget_total || 0) - (project.actual_cost || 0);
    const unreadUpdates = updates.filter(u => !u.isRead).length;

    return {
      scheduleStatus: (project.completion_percentage || 0) >= 50 ? 'on_track' : 'behind' as 'ahead' | 'on_track' | 'behind',
      budgetStatus: budgetUsed <= 0.9 ? 'under' : budgetUsed <= 1.0 ? 'on_budget' : 'over' as 'under' | 'on_budget' | 'over',
      budgetVariance,
      unreadUpdates
    };
  };

  if (loading || loadingData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your projects...</p>
        </div>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <DashboardLayout title="Client Portal">
        <Card>
          <CardContent className="text-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Projects Found</h3>
            <p className="text-muted-foreground">
              No projects are associated with your account. Please contact your contractor for access.
            </p>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Client Portal">
      <div className="space-y-6">
        {/* Project Selector (if multiple projects) */}
        {projects.length > 1 && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-muted-foreground">Select Project:</span>
                {projects.map((project) => (
                  <Button
                    key={project.id}
                    variant={selectedProject?.id === project.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleProjectSelect(project)}
                  >
                    <Building2 className="h-4 w-4 mr-2" />
                    {project.name}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {selectedProject && (
          <div className="space-y-6">
            {/* Project Overview Hero */}
            <ClientProjectOverview
              project={selectedProject}
              stats={getProjectStats(selectedProject)}
            />

            {/* Main Content Tabs */}
            <Tabs defaultValue="overview" className="space-y-6">
              <TabsList className="grid w-full grid-cols-6">
                <TabsTrigger value="overview">
                  <LayoutDashboard className="h-4 w-4 mr-2" />
                  Overview
                </TabsTrigger>
                <TabsTrigger value="progress">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Progress
                </TabsTrigger>
                <TabsTrigger value="documents">
                  <ImageIcon className="h-4 w-4 mr-2" />
                  Photos & Docs
                </TabsTrigger>
                <TabsTrigger value="updates">
                  <Bell className="h-4 w-4 mr-2" />
                  Updates
                </TabsTrigger>
                <TabsTrigger value="communication">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Messages
                </TabsTrigger>
                <TabsTrigger value="billing">
                  <CreditCard className="h-4 w-4 mr-2" />
                  Billing
                </TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <ClientBudgetSummary
                    totalBudget={selectedProject.budget_total || 0}
                    actualCost={selectedProject.actual_cost || 0}
                    contractValue={selectedProject.contract_value}
                  />
                  <ClientProgressTimeline milestones={milestones.slice(0, 5)} showPhases={false} />
                </div>
                <ClientUpdatesFeed updates={updates.slice(0, 5)} />
              </TabsContent>

              {/* Progress Tab */}
              <TabsContent value="progress" className="space-y-6">
                <ClientProgressTimeline milestones={milestones} showPhases={true} />
                <ClientChangeOrderApproval changeOrders={changeOrders} />
              </TabsContent>

              {/* Documents Tab */}
              <TabsContent value="documents">
                <ClientDocumentGallery documents={documents} />
              </TabsContent>

              {/* Updates Tab */}
              <TabsContent value="updates">
                <ClientUpdatesFeed updates={updates} />
              </TabsContent>

              {/* Communication Tab */}
              <TabsContent value="communication">
                <ClientMessageCenter projectId={selectedProject.id} />
              </TabsContent>

              {/* Billing Tab */}
              <TabsContent value="billing" className="space-y-6">
                <Card>
                  <CardContent className="pt-6">
                    {invoices.length === 0 ? (
                      <div className="text-center py-12">
                        <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-medium mb-2">No Invoices</h3>
                        <p className="text-muted-foreground">
                          No invoices have been generated for this project yet
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {invoices.map((invoice) => (
                          <div key={invoice.id} className="border rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center space-x-2">
                                <h4 className="font-medium">Invoice #{invoice.invoice_number}</h4>
                                <span className={`px-2 py-1 rounded text-xs font-medium text-white ${getInvoiceStatusColor(invoice.status)}`}>
                                  {invoice.status.toUpperCase()}
                                </span>
                              </div>
                              <div className="text-right">
                                <p className="text-lg font-semibold">{formatCurrency(invoice.total_amount)}</p>
                                {invoice.amount_due > 0 && (
                                  <p className="text-sm text-muted-foreground">
                                    Due: {formatCurrency(invoice.amount_due)}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-3 text-sm">
                              <div>
                                <p className="text-muted-foreground">Issue Date</p>
                                <p>{new Date(invoice.issue_date).toLocaleDateString()}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Due Date</p>
                                <p className={invoice.status === 'overdue' ? 'text-red-600 font-medium' : ''}>
                                  {new Date(invoice.due_date).toLocaleDateString()}
                                </p>
                              </div>
                            </div>

                            {invoice.notes && (
                              <div className="mb-3">
                                <p className="text-sm text-muted-foreground mb-1">Notes</p>
                                <p className="text-sm">{invoice.notes}</p>
                              </div>
                            )}

                            {invoice.amount_due > 0 && invoice.status !== 'paid' && (
                              <div className="flex items-center justify-between pt-3 border-t">
                                <div className="flex items-center space-x-2">
                                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-sm text-muted-foreground">
                                    Secure online payment available
                                  </span>
                                </div>
                                <Button
                                  onClick={() => handlePayInvoice(invoice)}
                                  disabled={processingPayment === invoice.id || !invoice.stripe_invoice_id}
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  {processingPayment === invoice.id ? (
                                    <>
                                      <Clock className="h-4 w-4 mr-2 animate-spin" />
                                      Processing...
                                    </>
                                  ) : (
                                    <>
                                      <ExternalLink className="h-4 w-4 mr-2" />
                                      Pay Now
                                    </>
                                  )}
                                </Button>
                              </div>
                            )}

                            {invoice.status === 'paid' && (
                              <div className="flex items-center pt-3 border-t text-green-600">
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                <span className="text-sm font-medium">Payment Complete</span>
                                {invoice.amount_paid > 0 && (
                                  <span className="text-sm ml-2">
                                    - Paid {formatCurrency(invoice.amount_paid)}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Change Orders Billing Impact */}
                <ClientChangeOrderApproval changeOrders={changeOrders} />
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ClientPortalEnhanced;
