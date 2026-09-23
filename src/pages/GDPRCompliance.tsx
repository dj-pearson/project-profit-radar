import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertTriangle, Eye, FileText, Database, Settings, Download, Plus, CheckCircle, XCircle, Calendar, Edit } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ErrorState } from '@/components/common/ErrorState';
import {
  useGDPRCompliance,
  type ConsentRecord,
  type DataSubjectRequest,
  type GDPRStats,
} from '@/hooks/useGDPRCompliance';
import { format } from 'date-fns';
import { MobilePageWrapper, MobileStatsGrid, mobileCardClasses, mobileButtonClasses, mobileTextClasses, mobileFilterClasses } from "@/utils/mobileHelpers";

const EMPTY_STATS: GDPRStats = {
  activeRequests: 0,
  overdueSoon: 0,
  consentRecords: 0,
  retentionPolicies: 0,
  processingActivities: 0
};

const message = (error: unknown) => (error instanceof Error ? error.message : String(error));

const GDPRCompliance = () => {
  const gdpr = useGDPRCompliance();
  const stats = gdpr.data?.stats ?? EMPTY_STATS;
  const requests = gdpr.data?.requests ?? [];
  const consents = gdpr.data?.consents ?? [];
  const loading = gdpr.isLoading;
  const [showNewRequestForm, setShowNewRequestForm] = useState(false);
  const [newRequest, setNewRequest] = useState({
    request_type: '',
    requester_email: '',
    requester_name: '',
    request_details: ''
  });
  
  // Edit states
  const [editingRequest, setEditingRequest] = useState<DataSubjectRequest | null>(null);
  const [editingConsent, setEditingConsent] = useState<ConsentRecord | null>(null);
  const [editRequestDialogOpen, setEditRequestDialogOpen] = useState(false);
  const [editConsentDialogOpen, setEditConsentDialogOpen] = useState(false);
  
  const { toast } = useToast();

  const handleCreateRequest = async () => {
    if (!newRequest.request_type || !newRequest.requester_email) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    try {
      await gdpr.createRequest(newRequest);

      toast({
        title: "Request Created",
        description: "Data subject request has been created successfully",
      });

      setShowNewRequestForm(false);
      setNewRequest({
        request_type: '',
        requester_email: '',
        requester_name: '',
        request_details: ''
      });
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to create data subject request: ${message(error)}`,
        variant: "destructive"
      });
    }
  };

  const handleEditRequest = async () => {
    if (!editingRequest) return;

    try {
      await gdpr.updateRequest(editingRequest);

      toast({
        title: "Request Updated",
        description: "Data subject request has been updated successfully",
      });

      setEditRequestDialogOpen(false);
      setEditingRequest(null);
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to update data subject request: ${message(error)}`,
        variant: "destructive"
      });
    }
  };

  const handleEditConsent = async () => {
    if (!editingConsent) return;

    try {
      await gdpr.updateConsent(editingConsent);

      toast({
        title: "Consent Updated",
        description: "Consent record has been updated successfully",
      });

      setEditConsentDialogOpen(false);
      setEditingConsent(null);
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to update consent record: ${message(error)}`,
        variant: "destructive"
      });
    }
  };

  const getRequestStatusBadge = (status: string) => {
    switch (status) {
      case 'submitted':
        return <Badge variant="secondary">Submitted</Badge>;
      case 'in_progress':
        return <Badge variant="default">In Progress</Badge>;
      case 'completed':
        return <Badge variant="outline">Completed</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <Badge variant="destructive">Urgent</Badge>;
      case 'high':
        return <Badge variant="destructive">High</Badge>;
      case 'normal':
        return <Badge variant="default">Normal</Badge>;
      case 'low':
        return <Badge variant="secondary">Low</Badge>;
      default:
        return <Badge variant="secondary">{priority}</Badge>;
    }
  };

  const getRequestTypeIcon = (type: string) => {
    switch (type) {
      case 'access':
        return <Eye className="h-4 w-4 text-blue-500" />;
      case 'portability':
        return <Download className="h-4 w-4 text-green-500" />;
      case 'erasure':
        return <XCircle className="h-4 w-4 text-red-500" aria-hidden="true" />;
      case 'rectification':
        return <Settings className="h-4 w-4 text-orange-500" />;
      default:
        return <FileText className="h-4 w-4 text-muted-foreground" />;
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (gdpr.error) {
    return (
      <MobilePageWrapper title="GDPR Compliance">
        <ErrorState
          title="GDPR data could not be loaded"
          error={gdpr.error}
          onRetry={() => { void gdpr.refetch(); }}
        />
      </MobilePageWrapper>
    );
  }

  return (
    <MobilePageWrapper title="GDPR Compliance">
      <p className={`${mobileTextClasses.muted} mb-6`}>
        Data subject rights management, consent tracking, and privacy controls
      </p>
      
      <div className="flex justify-end mb-6">
        <Button onClick={() => setShowNewRequestForm(true)} className={mobileButtonClasses.primary}>
          <Plus className="mr-2 h-3 w-3 sm:h-4 sm:w-4" aria-hidden="true" />
          <span className="hidden sm:inline">New Request</span>
          <span className="sm:hidden">New</span>
        </Button>
      </div>

      {/* Statistics Cards */}
      <MobileStatsGrid className="grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        <Card className={mobileCardClasses.container}>
          <CardHeader className={mobileCardClasses.header}>
            <CardTitle className={mobileTextClasses.cardTitle}>Active</CardTitle>
            <FileText className="h-4 w-4 text-construction-orange" aria-hidden="true" />
          </CardHeader>
          <CardContent>
            <div className={`${mobileTextClasses.header} font-bold`}>{stats.activeRequests}</div>
            <p className={mobileTextClasses.muted}>Requests</p>
          </CardContent>
        </Card>

        <Card className={mobileCardClasses.container}>
          <CardHeader className={mobileCardClasses.header}>
            <CardTitle className={mobileTextClasses.cardTitle}>Due Soon</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" aria-hidden="true" />
          </CardHeader>
          <CardContent>
            <div className={`${mobileTextClasses.header} font-bold`}>{stats.overdueSoon}</div>
            <p className={mobileTextClasses.muted}>Within 7d</p>
          </CardContent>
        </Card>

        <Card className={mobileCardClasses.container}>
          <CardHeader className={mobileCardClasses.header}>
            <CardTitle className={mobileTextClasses.cardTitle}>Consents</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" aria-hidden="true" />
          </CardHeader>
          <CardContent>
            <div className={`${mobileTextClasses.header} font-bold`}>{stats.consentRecords}</div>
            <p className={mobileTextClasses.muted}>Total</p>
          </CardContent>
        </Card>

        <Card className={mobileCardClasses.container}>
          <CardHeader className={mobileCardClasses.header}>
            <CardTitle className={mobileTextClasses.cardTitle}>Retention</CardTitle>
            <Database className="h-4 w-4 text-blue-600" aria-hidden="true" />
          </CardHeader>
          <CardContent>
            <div className={`${mobileTextClasses.header} font-bold`}>{stats.retentionPolicies}</div>
            <p className={mobileTextClasses.muted}>Policies</p>
          </CardContent>
        </Card>

        <Card className={mobileCardClasses.container}>
          <CardHeader className={mobileCardClasses.header}>
            <CardTitle className={mobileTextClasses.cardTitle}>Processing</CardTitle>
            <Settings className="h-4 w-4 text-construction-orange" aria-hidden="true" />
          </CardHeader>
          <CardContent>
            <div className={`${mobileTextClasses.header} font-bold`}>{stats.processingActivities}</div>
            <p className={mobileTextClasses.muted}>Activities</p>
          </CardContent>
        </Card>
      </MobileStatsGrid>

      {/* New Request Form */}
      {showNewRequestForm && (
        <Card className={mobileCardClasses.container}>
          <CardHeader className={mobileCardClasses.header}>
            <CardTitle className={mobileTextClasses.cardTitle}>New Data Subject Request</CardTitle>
            <CardDescription className={mobileTextClasses.muted}>Create a new GDPR data subject request</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="request_type" className={mobileTextClasses.body}>Request Type *</Label>
                <Select value={newRequest.request_type} onValueChange={(value) => setNewRequest({...newRequest, request_type: value})}>
                  <SelectTrigger className={mobileFilterClasses.input} aria-required="true">
                    <SelectValue placeholder="Select request type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="access">Right of Access</SelectItem>
                    <SelectItem value="portability">Data Portability</SelectItem>
                    <SelectItem value="rectification">Rectification</SelectItem>
                    <SelectItem value="erasure">Right to be Forgotten</SelectItem>
                    <SelectItem value="restriction">Restriction of Processing</SelectItem>
                    <SelectItem value="objection">Right to Object</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="requester_email" className={mobileTextClasses.body}>Requester Email *</Label>
                <Input
                  id="requester_email"
                  type="email"
                  value={newRequest.requester_email}
                  onChange={(e) => setNewRequest({...newRequest, requester_email: e.target.value})}
                  placeholder="requester@example.com"
                  className={mobileFilterClasses.input}
                  aria-required="true"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="requester_name" className={mobileTextClasses.body}>Requester Name</Label>
              <Input
                id="requester_name"
                value={newRequest.requester_name}
                onChange={(e) => setNewRequest({...newRequest, requester_name: e.target.value})}
                placeholder="Full name (optional)"
                className={mobileFilterClasses.input}
              />
            </div>
            <div>
              <Label htmlFor="request_details" className={mobileTextClasses.body}>Request Details</Label>
              <Textarea
                id="request_details"
                value={newRequest.request_details}
                onChange={(e) => setNewRequest({...newRequest, request_details: e.target.value})}
                placeholder="Additional details about the request..."
                rows={3}
                className={mobileFilterClasses.input}
              />
            </div>
            <div className={mobileFilterClasses.buttonGroup}>
              <Button onClick={handleCreateRequest} className={mobileButtonClasses.primary}>Create Request</Button>
              <Button variant="outline" onClick={() => setShowNewRequestForm(false)} className={mobileButtonClasses.secondary}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      <Tabs defaultValue="requests" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 text-xs sm:text-sm">
          <TabsTrigger value="requests" className={mobileTextClasses.body}>Requests</TabsTrigger>
          <TabsTrigger value="consent" className={mobileTextClasses.body}>Consents</TabsTrigger>
          <TabsTrigger value="retention" className={mobileTextClasses.body}>Retention</TabsTrigger>
          <TabsTrigger value="processing" className={mobileTextClasses.body}>Processing</TabsTrigger>
        </TabsList>

        <TabsContent value="requests" className="space-y-6">
          <Card className={mobileCardClasses.container}>
            <CardHeader className={mobileCardClasses.header}>
              <CardTitle className={mobileTextClasses.cardTitle}>Data Subject Requests</CardTitle>
              <CardDescription className={mobileTextClasses.muted}>
                Manage GDPR data subject rights requests and compliance deadlines
              </CardDescription>
            </CardHeader>
            <CardContent className={mobileCardClasses.content}>
              <div className="space-y-4">
                {requests.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="mx-auto h-8 w-8 sm:h-12 sm:w-12 mb-4" aria-hidden="true" />
                    <p className={mobileTextClasses.body}>No data subject requests yet</p>
                  </div>
                ) : (
                  requests.map((request) => (
                    <div key={request.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 border rounded-lg gap-3">
                      <div className="flex items-center gap-3">
                        {getRequestTypeIcon(request.request_type)}
                        <div>
                          <div className={`${mobileTextClasses.cardTitle} font-medium`}>
                            {request.request_type.charAt(0).toUpperCase() + request.request_type.slice(1)} Request
                          </div>
                          <div className={`${mobileTextClasses.body} text-muted-foreground`}>
                            {request.requester_name || request.requester_email}
                          </div>
                          {request.due_date && (
                            <div className={`${mobileTextClasses.muted} flex items-center gap-1 mt-1`}>
                              <Calendar className="h-3 w-3" aria-hidden="true" />
                              Due: {format(new Date(request.due_date), 'MMM d, yyyy')}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between sm:justify-end sm:flex-col sm:text-right gap-2">
                        <div className={`${mobileCardClasses.badges} sm:mb-2`}>
                          {getRequestStatusBadge(request.status)}
                          {getPriorityBadge(request.priority)}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingRequest(request);
                              setEditRequestDialogOpen(true);
                            }}
                            className={mobileButtonClasses.secondary}
                          >
                            <Edit className="h-3 w-3 sm:h-4 sm:w-4" aria-hidden="true" />
                            <span className="hidden sm:inline ml-1">Edit</span>
                          </Button>
                          <div className={`${mobileTextClasses.muted} text-right`}>
                            <div>{format(new Date(request.created_at), 'MMM d, HH:mm')}</div>
                            {request.user_profiles && (
                              <div>
                                Assigned: {request.user_profiles.first_name} {request.user_profiles.last_name}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="consent" className="space-y-6">
          <Card className={mobileCardClasses.container}>
            <CardHeader className={mobileCardClasses.header}>
              <CardTitle className={mobileTextClasses.cardTitle}>Consent Management</CardTitle>
              <CardDescription className={mobileTextClasses.muted}>
                Track user consents and manage withdrawal requests
              </CardDescription>
            </CardHeader>
            <CardContent className={mobileCardClasses.content}>
              <div className="space-y-4">
                {consents.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="mx-auto h-8 w-8 sm:h-12 sm:w-12 mb-4" aria-hidden="true" />
                    <p className={mobileTextClasses.body}>No consent records yet</p>
                  </div>
                ) : (
                  consents.slice(0, 10).map((consent) => (
                    <div key={consent.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 border rounded-lg gap-3">
                      <div className="flex items-center gap-3">
                        {consent.consent_given ? (
                          <CheckCircle className="h-4 w-4 text-green-500" aria-hidden="true" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" aria-hidden="true" />
                        )}
                        <div>
                          <div className={`${mobileTextClasses.cardTitle} font-medium`}>
                            {consent.consent_type.charAt(0).toUpperCase() + consent.consent_type.slice(1)} Consent
                          </div>
                          <div className={`${mobileTextClasses.body} text-muted-foreground`}>
                            {consent.email} • {consent.purpose}
                          </div>
                          <div className={`${mobileTextClasses.muted}`}>
                            Lawful basis: {consent.lawful_basis}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between sm:justify-end sm:flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingConsent(consent);
                              setEditConsentDialogOpen(true);
                            }}
                            className={mobileButtonClasses.secondary}
                          >
                            <Edit className="h-3 w-3 sm:h-4 sm:w-4" aria-hidden="true" />
                            <span className="hidden sm:inline ml-1">Edit</span>
                          </Button>
                          <Badge variant={consent.consent_given ? "default" : "destructive"} className={mobileCardClasses.badge}>
                            {consent.consent_given ? "Granted" : "Withdrawn"}
                          </Badge>
                        </div>
                        <div className={`${mobileTextClasses.muted} text-right`}>
                          {consent.withdrawal_date 
                            ? `Withdrawn: ${format(new Date(consent.withdrawal_date), 'MMM d, yyyy')}`
                            : format(new Date(consent.created_at), 'MMM d, yyyy')
                          }
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="retention" className="space-y-6">
          <Card className={mobileCardClasses.container}>
            <CardHeader className={mobileCardClasses.header}>
              <CardTitle className={mobileTextClasses.cardTitle}>Data Retention Policies</CardTitle>
              <CardDescription className={mobileTextClasses.muted}>
                Manage data retention schedules and deletion policies
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Database className="mx-auto h-8 w-8 sm:h-12 sm:w-12 mb-4" aria-hidden="true" />
                <p className={mobileTextClasses.body}>Data retention management coming soon</p>
                <p className={mobileTextClasses.muted}>Automated data lifecycle and deletion policies</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="processing" className="space-y-6">
          <Card className={mobileCardClasses.container}>
            <CardHeader className={mobileCardClasses.header}>
              <CardTitle className={mobileTextClasses.cardTitle}>Processing Activities Register</CardTitle>
              <CardDescription className={mobileTextClasses.muted}>
                GDPR Article 30 register of processing activities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Settings className="mx-auto h-8 w-8 sm:h-12 sm:w-12 mb-4" aria-hidden="true" />
                <p className={mobileTextClasses.body}>Processing activities register coming soon</p>
                <p className={mobileTextClasses.muted}>Complete Article 30 compliance documentation</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Request Dialog */}
      <Dialog open={editRequestDialogOpen} onOpenChange={setEditRequestDialogOpen}>
        <DialogContent className="max-w-md mx-auto" aria-describedby="edit-request-description">
          <DialogHeader>
            <DialogTitle className={mobileTextClasses.header}>Edit Data Subject Request</DialogTitle>
            <DialogDescription id="edit-request-description" className={mobileTextClasses.muted}>
              Update the request details
            </DialogDescription>
          </DialogHeader>
          {editingRequest && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-request-type" className={mobileTextClasses.body}>Request Type</Label>
                <Select
                  value={editingRequest.request_type}
                  onValueChange={(value) => setEditingRequest({...editingRequest, request_type: value})}
                >
                  <SelectTrigger className={mobileFilterClasses.input}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="access">Right of Access</SelectItem>
                    <SelectItem value="portability">Data Portability</SelectItem>
                    <SelectItem value="rectification">Rectification</SelectItem>
                    <SelectItem value="erasure">Right to be Forgotten</SelectItem>
                    <SelectItem value="restriction">Restriction of Processing</SelectItem>
                    <SelectItem value="objection">Right to Object</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="edit-requester-email" className={mobileTextClasses.body}>Requester Email</Label>
                <Input
                  id="edit-requester-email"
                  type="email"
                  value={editingRequest.requester_email}
                  onChange={(e) => setEditingRequest({...editingRequest, requester_email: e.target.value})}
                  className={mobileFilterClasses.input}
                />
              </div>

              <div>
                <Label htmlFor="edit-requester-name" className={mobileTextClasses.body}>Requester Name</Label>
                <Input
                  id="edit-requester-name"
                  value={editingRequest.requester_name || ''}
                  onChange={(e) => setEditingRequest({...editingRequest, requester_name: e.target.value})}
                  className={mobileFilterClasses.input}
                />
              </div>

              <div>
                <Label htmlFor="edit-request-status" className={mobileTextClasses.body}>Status</Label>
                <Select
                  value={editingRequest.status}
                  onValueChange={(value) => setEditingRequest({...editingRequest, status: value})}
                >
                  <SelectTrigger className={mobileFilterClasses.input}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="submitted">Submitted</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="edit-request-priority" className={mobileTextClasses.body}>Priority</Label>
                <Select
                  value={editingRequest.priority}
                  onValueChange={(value) => setEditingRequest({...editingRequest, priority: value})}
                >
                  <SelectTrigger className={mobileFilterClasses.input}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="edit-verification-status" className={mobileTextClasses.body}>Verification Status</Label>
                <Select
                  value={editingRequest.verification_status}
                  onValueChange={(value) => setEditingRequest({...editingRequest, verification_status: value})}
                >
                  <SelectTrigger className={mobileFilterClasses.input}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="verified">Verified</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className={mobileFilterClasses.buttonGroup}>
                <Button
                  variant="outline"
                  onClick={() => setEditRequestDialogOpen(false)}
                  className={mobileButtonClasses.secondary}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleEditRequest}
                  className={mobileButtonClasses.primary}
                >
                  Update Request
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Consent Dialog */}
      <Dialog open={editConsentDialogOpen} onOpenChange={setEditConsentDialogOpen}>
        <DialogContent className="max-w-md mx-auto" aria-describedby="edit-consent-description">
          <DialogHeader>
            <DialogTitle className={mobileTextClasses.header}>Edit Consent Record</DialogTitle>
            <DialogDescription id="edit-consent-description" className={mobileTextClasses.muted}>
              Update the consent record details
            </DialogDescription>
          </DialogHeader>
          {editingConsent && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-consent-type" className={mobileTextClasses.body}>Consent Type</Label>
                <Input
                  id="edit-consent-type"
                  value={editingConsent.consent_type}
                  onChange={(e) => setEditingConsent({...editingConsent, consent_type: e.target.value})}
                  className={mobileFilterClasses.input}
                />
              </div>

              <div>
                <Label htmlFor="edit-consent-purpose" className={mobileTextClasses.body}>Purpose</Label>
                <Input
                  id="edit-consent-purpose"
                  value={editingConsent.purpose}
                  onChange={(e) => setEditingConsent({...editingConsent, purpose: e.target.value})}
                  className={mobileFilterClasses.input}
                />
              </div>

              <div>
                <Label htmlFor="edit-consent-given" className={mobileTextClasses.body}>Consent Status</Label>
                <Select
                  value={editingConsent.consent_given.toString()}
                  onValueChange={(value) => setEditingConsent({...editingConsent, consent_given: value === 'true'})}
                >
                  <SelectTrigger className={mobileFilterClasses.input}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Granted</SelectItem>
                    <SelectItem value="false">Withdrawn</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="edit-lawful-basis" className={mobileTextClasses.body}>Lawful Basis</Label>
                <Input
                  id="edit-lawful-basis"
                  value={editingConsent.lawful_basis}
                  onChange={(e) => setEditingConsent({...editingConsent, lawful_basis: e.target.value})}
                  className={mobileFilterClasses.input}
                />
              </div>

              <div className={mobileFilterClasses.buttonGroup}>
                <Button
                  variant="outline"
                  onClick={() => setEditConsentDialogOpen(false)}
                  className={mobileButtonClasses.secondary}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleEditConsent}
                  className={mobileButtonClasses.primary}
                >
                  Update Consent
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </MobilePageWrapper>
  );
};

export default GDPRCompliance;