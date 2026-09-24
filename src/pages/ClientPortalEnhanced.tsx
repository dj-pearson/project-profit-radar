import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  useClientPortalProjects,
  useClientProjectDetails,
  type ClientPortalProject,
  type ClientPortalInvoice,
} from '@/hooks/useClientPortalProjects';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { AccessiblePageWrapper } from '@/components/accessibility/AccessiblePageWrapper';
import {
  ClientProjectOverview,
  ClientProgressTimeline,
  ClientBudgetSummary,
  ClientDocumentGallery,
  ClientUpdatesFeed,
  ClientMessageCenter,
  ClientChangeOrderApproval,
} from '@/components/client-portal';
import { ClientPortalSelections } from '@/components/client/ClientPortalSelections';
import { ClientPortalRFIs } from '@/components/client/ClientPortalRFIs';
import { ErrorState } from '@/components/ui/states';
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
import { DataTablePageSkeleton } from '@/components/ui/skeletons';

type Project = ClientPortalProject;
type Invoice = ClientPortalInvoice;

const DAY_MS = 24 * 60 * 60 * 1000;

const ClientPortalEnhanced = () => {
  const { user, userProfile, loading } = useAuth();
  const navigate = useNavigate();

  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [processingPayment, setProcessingPayment] = useState<string | null>(null);

  const allowed = !loading && (userProfile?.role === 'client_portal' || userProfile?.role === 'root_admin');
  // A failed load is not an empty portal. The page used to say "No Projects
  // Found" or show an empty timeline when the query had 400'd.
  const projectsQuery = useClientPortalProjects(allowed);
  const projects = projectsQuery.data ?? [];
  const selectedProject: Project | null =
    projects.find((p) => p.id === selectedProjectId) ?? projects[0] ?? null;
  const detailsQuery = useClientProjectDetails(selectedProject?.id);
  const details = detailsQuery.data;
  const changeOrders = details?.changeOrders ?? [];
  const milestones = details?.milestones ?? [];
  const documents = details?.documents ?? [];
  const updates = details?.updates ?? [];
  const invoices = details?.invoices ?? [];
  const detailsError = detailsQuery.error
    ? detailsQuery.error.message
    : details && details.failed.length > 0
      ? `Could not load ${details.failed.join(', ')} for this project.`
      : null;

  // These two components are company-scoped. Take the id from the project the
  // client is looking at rather than from their profile: a client enrolled on
  // two contractors' jobs has one profile and two companies.
  const companyIdForProject = selectedProject?.company_id ?? userProfile?.company_id ?? null;

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }

    // A client is never sent to contractor onboarding. Their access comes from
    // enrolment, not from owning a company, so a missing company_id is normal
    // for them and /setup would ask them to create a construction business.
    if (!loading && user && userProfile && !userProfile.company_id
        && userProfile.role !== 'root_admin' && userProfile.role !== 'client_portal') {
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
    }
  }, [user, userProfile, loading, navigate]);

  const handleProjectSelect = (project: Project) => {
    setSelectedProjectId(project.id);
  };

  /**
   * US-324: this used to refuse unless invoice.stripe_invoice_id was set, and
   * nothing in the product ever writes that column - its only writer is
   * payment_failures, for Brikly's own subscriptions. So the Pay button was
   * permanently disabled on every invoice ever raised.
   *
   * The session is created on demand for any invoice with a balance. If the
   * contractor has not connected a Stripe account the function says so, which
   * is the honest failure: their client cannot pay online yet.
   */
  const handlePayInvoice = async (invoice: Invoice) => {
    if (!(invoice.amount_due > 0)) {
      toast({
        variant: "destructive",
        title: "Nothing to pay",
        description: "This invoice has no outstanding balance."
      });
      return;
    }

    setProcessingPayment(invoice.id);

    try {
      const { data, error } = await supabase.functions.invoke('process-invoice-payment', {
        body: {
          invoice_id: invoice.id,
          payment_method: 'stripe_checkout'
        }
      });

      if (error) throw error;
      if (data && data.success === false) {
        throw new Error(data.error || 'This invoice could not be set up for payment.');
      }

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

  // Only what the project's own fields can answer. Spending to date is not
  // readable here, so there is no budget status; days remaining comes from
  // the end date. There is no baseline to call a job ahead or behind against.
  const getProjectStats = (project: Project) => {
    const daysRemaining = project.end_date
      ? Math.max(0, Math.ceil((new Date(project.end_date).getTime() - Date.now()) / DAY_MS))
      : undefined;
    return {
      scheduleStatus: undefined,
      budgetStatus: undefined,
      budgetVariance: undefined,
      unreadUpdates: updates.filter((u) => !u.isRead).length,
      daysRemaining,
    };
  };

  if (loading || projectsQuery.isLoading) {
    return (
      <DataTablePageSkeleton label="Loading your projects" />
    );
  }

  if (projectsQuery.error) {
    return (
      <AccessiblePageWrapper pageTitle="Client Portal">
      <DashboardLayout hasAccessibleWrapper title="Client Portal">
        <ErrorState error={projectsQuery.error.message} onRetry={() => { void projectsQuery.refetch(); }} />
      </DashboardLayout>
      </AccessiblePageWrapper>
    );
  }

  if (projects.length === 0) {
    return (
      <AccessiblePageWrapper pageTitle="Client Portal">
      <DashboardLayout hasAccessibleWrapper title="Client Portal">
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
      </AccessiblePageWrapper>
    );
  }

  return (
    <AccessiblePageWrapper pageTitle="Client Portal">
    <DashboardLayout hasAccessibleWrapper title="Client Portal">
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

            {detailsError && (
              <ErrorState
                error={detailsError}
                onRetry={() => { void detailsQuery.refetch(); }}
              />
            )}

            {/* Main Content Tabs */}
            <Tabs defaultValue="overview" className="space-y-6">
              <TabsList className="grid w-full grid-cols-4 md:grid-cols-8">
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
                {/* Absorbed from the older ClientPortal page, which was the
                    only implementation of either and was routed by nothing
                    (US-319). */}
                <TabsTrigger value="selections">
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Selections
                </TabsTrigger>
                <TabsTrigger value="rfis">
                  <FileText className="h-4 w-4 mr-2" />
                  Questions
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
                    totalBudget={selectedProject.budget_total ?? null}
                    actualCost={selectedProject.actual_cost}
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
              <TabsContent value="selections" className="space-y-4">
                {selectedProject && companyIdForProject && (
                  <ClientPortalSelections
                    projectId={selectedProject.id}
                    companyId={companyIdForProject}
                    userId={user?.id}
                  />
                )}
              </TabsContent>

              <TabsContent value="rfis" className="space-y-4">
                {selectedProject && companyIdForProject && (
                  <ClientPortalRFIs
                    projectId={selectedProject.id}
                    companyId={companyIdForProject}
                    userId={user?.id}
                  />
                )}
              </TabsContent>

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
                                  disabled={processingPayment === invoice.id}
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
    </AccessiblePageWrapper>
  );
};

export default ClientPortalEnhanced;
