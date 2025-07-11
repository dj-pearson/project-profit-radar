import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Shield, 
  AlertTriangle, 
  Eye, 
  FileText, 
  Clock,
  Users,
  Database,
  Settings,
  Download,
  Search,
  Plus,
  CheckCircle,
  XCircle,
  Calendar,
  ArrowLeft
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { format, addDays } from 'date-fns';

interface GDPRStats {
  activeRequests: number;
  overdueSoon: number;
  consentRecords: number;
  retentionPolicies: number;
  processingActivities: number;
}

interface DataSubjectRequest {
  id: string;
  request_type: string;
  requester_email: string;
  requester_name: string | null;
  status: string;
  priority: string;
  verification_status: string;
  due_date: string | null;
  created_at: string;
  assigned_to: string | null;
  user_profiles?: {
    first_name: string;
    last_name: string;
  } | null;
}

interface ConsentRecord {
  id: string;
  user_id: string | null;
  email: string | null;
  consent_type: string;
  purpose: string;
  consent_given: boolean;
  lawful_basis: string;
  created_at: string;
  withdrawal_date: string | null;
}

const GDPRCompliance = () => {
  const [stats, setStats] = useState<GDPRStats>({
    activeRequests: 0,
    overdueSoon: 0,
    consentRecords: 0,
    retentionPolicies: 0,
    processingActivities: 0
  });
  const [requests, setRequests] = useState<DataSubjectRequest[]>([]);
  const [consents, setConsents] = useState<ConsentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewRequestForm, setShowNewRequestForm] = useState(false);
  const [newRequest, setNewRequest] = useState({
    request_type: '',
    requester_email: '',
    requester_name: '',
    request_details: ''
  });
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchGDPRData();
    }
  }, [user]);

  const fetchGDPRData = async () => {
    try {
      // Fetch statistics
      const [requestsResult, overdueResult, consentsResult, policiesResult, activitiesResult] = await Promise.all([
        // Active data subject requests
        supabase
          .from('data_subject_requests')
          .select('id')
          .not('status', 'in', '(completed,rejected,cancelled)'),
        
        // Requests due soon (within 7 days)
        supabase
          .from('data_subject_requests')
          .select('id')
          .not('status', 'in', '(completed,rejected,cancelled)')
          .gte('due_date', new Date().toISOString().split('T')[0])
          .lte('due_date', addDays(new Date(), 7).toISOString().split('T')[0]),
        
        // Total consent records
        supabase
          .from('consent_records')
          .select('id'),
        
        // Active retention policies
        supabase
          .from('data_retention_policies')
          .select('id')
          .eq('is_active', true),
        
        // Processing activities
        supabase
          .from('processing_activities')
          .select('id')
          .eq('is_active', true)
      ]);

      // Fetch recent data subject requests
      const { data: recentRequests } = await supabase
        .from('data_subject_requests')
        .select(`
          *,
          user_profiles:assigned_to (
            first_name,
            last_name
          )
        `)
        .order('created_at', { ascending: false })
        .limit(20);

      // Fetch recent consent records
      const { data: recentConsents } = await supabase
        .from('consent_records')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      setStats({
        activeRequests: requestsResult.data?.length || 0,
        overdueSoon: overdueResult.data?.length || 0,
        consentRecords: consentsResult.data?.length || 0,
        retentionPolicies: policiesResult.data?.length || 0,
        processingActivities: activitiesResult.data?.length || 0
      });

      const processedRequests = (recentRequests || []).map(request => ({
        id: request.id,
        request_type: request.request_type,
        requester_email: request.requester_email,
        requester_name: request.requester_name,
        status: request.status,
        priority: request.priority,
        verification_status: request.verification_status,
        due_date: request.due_date,
        created_at: request.created_at,
        assigned_to: request.assigned_to,
        user_profiles: request.user_profiles && !('error' in request.user_profiles) ? request.user_profiles : null
      }));
      
      setRequests(processedRequests);
      setConsents(recentConsents || []);
    } catch (error) {
      console.error('Error fetching GDPR data:', error);
      toast({
        title: "Error",
        description: "Failed to load GDPR data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

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
      // Get user's company ID
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('company_id')
        .eq('id', user?.id)
        .single();

      if (!userProfile?.company_id) {
        throw new Error('Company not found');
      }

      const { error } = await supabase
        .from('data_subject_requests')
        .insert([{
          company_id: userProfile.company_id,
          request_type: newRequest.request_type,
          requester_email: newRequest.requester_email,
          requester_name: newRequest.requester_name || null,
          request_details: newRequest.request_details ? { details: newRequest.request_details } : null
        }]);

      if (error) throw error;

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
      
      await fetchGDPRData();
    } catch (error) {
      console.error('Error creating request:', error);
      toast({
        title: "Error",
        description: "Failed to create data subject request",
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
        return <XCircle className="h-4 w-4 text-red-500" />;
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

  return (
    <DashboardLayout title="GDPR Compliance">
      <div className="space-y-6">
         {/* Header */}
         <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
           <div className="text-center sm:text-left">
             <p className="text-sm sm:text-base text-muted-foreground">
               Data subject rights management, consent tracking, and privacy controls
             </p>
           </div>
         <Button onClick={() => setShowNewRequestForm(true)} className="w-full sm:w-auto">
           <Plus className="mr-2 h-4 w-4" />
           <span className="hidden sm:inline">New Request</span>
           <span className="sm:hidden">New</span>
         </Button>
       </div>

       {/* Statistics Cards */}
       <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Requests</CardTitle>
            <FileText className="h-4 w-4 text-construction-orange" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeRequests}</div>
            <p className="text-xs text-muted-foreground">Data subject requests</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Due Soon</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.overdueSoon}</div>
            <p className="text-xs text-muted-foreground">Within 7 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Consent Records</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.consentRecords}</div>
            <p className="text-xs text-muted-foreground">Total consents</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Retention Policies</CardTitle>
            <Database className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.retentionPolicies}</div>
            <p className="text-xs text-muted-foreground">Active policies</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Processing Activities</CardTitle>
            <Settings className="h-4 w-4 text-construction-orange" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.processingActivities}</div>
            <p className="text-xs text-muted-foreground">Article 30 register</p>
          </CardContent>
        </Card>
      </div>

      {/* New Request Form */}
      {showNewRequestForm && (
        <Card>
          <CardHeader>
            <CardTitle>New Data Subject Request</CardTitle>
            <CardDescription>Create a new GDPR data subject request</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
               <div>
                 <Label htmlFor="request_type">Request Type *</Label>
                 <Select value={newRequest.request_type} onValueChange={(value) => setNewRequest({...newRequest, request_type: value})}>
                   <SelectTrigger>
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
                 <Label htmlFor="requester_email">Requester Email *</Label>
                 <Input
                   id="requester_email"
                   type="email"
                   value={newRequest.requester_email}
                   onChange={(e) => setNewRequest({...newRequest, requester_email: e.target.value})}
                   placeholder="requester@example.com"
                 />
               </div>
             </div>
            <div>
              <Label htmlFor="requester_name">Requester Name</Label>
              <Input
                id="requester_name"
                value={newRequest.requester_name}
                onChange={(e) => setNewRequest({...newRequest, requester_name: e.target.value})}
                placeholder="Full name (optional)"
              />
            </div>
            <div>
              <Label htmlFor="request_details">Request Details</Label>
              <Textarea
                id="request_details"
                value={newRequest.request_details}
                onChange={(e) => setNewRequest({...newRequest, request_details: e.target.value})}
                placeholder="Additional details about the request..."
                rows={3}
              />
            </div>
             <div className="flex flex-col sm:flex-row gap-3">
               <Button onClick={handleCreateRequest} className="w-full sm:w-auto">Create Request</Button>
               <Button variant="outline" onClick={() => setShowNewRequestForm(false)} className="w-full sm:w-auto">Cancel</Button>
             </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      <Tabs defaultValue="requests" className="space-y-6">
        <TabsList>
          <TabsTrigger value="requests">Data Subject Requests</TabsTrigger>
          <TabsTrigger value="consent">Consent Management</TabsTrigger>
          <TabsTrigger value="retention">Data Retention</TabsTrigger>
          <TabsTrigger value="processing">Processing Activities</TabsTrigger>
        </TabsList>

        <TabsContent value="requests" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Data Subject Requests</CardTitle>
              <CardDescription>
                Manage GDPR data subject rights requests and compliance deadlines
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {requests.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="mx-auto h-12 w-12 mb-4" />
                    <p>No data subject requests yet</p>
                  </div>
                ) : (
                  requests.map((request) => (
                    <div key={request.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {getRequestTypeIcon(request.request_type)}
                        <div>
                          <div className="font-medium">
                            {request.request_type.charAt(0).toUpperCase() + request.request_type.slice(1)} Request
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {request.requester_name || request.requester_email}
                          </div>
                          {request.due_date && (
                            <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                              <Calendar className="h-3 w-3" />
                              Due: {format(new Date(request.due_date), 'MMM d, yyyy')}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex gap-2 mb-2">
                          {getRequestStatusBadge(request.status)}
                          {getPriorityBadge(request.priority)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(request.created_at), 'MMM d, HH:mm')}
                        </div>
                        {request.user_profiles && (
                          <div className="text-xs text-muted-foreground">
                            Assigned: {request.user_profiles.first_name} {request.user_profiles.last_name}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="consent" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Consent Management</CardTitle>
              <CardDescription>
                Track user consents and manage withdrawal requests
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {consents.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="mx-auto h-12 w-12 mb-4" />
                    <p>No consent records yet</p>
                  </div>
                ) : (
                  consents.slice(0, 10).map((consent) => (
                    <div key={consent.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {consent.consent_given ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                        <div>
                          <div className="font-medium">
                            {consent.consent_type.charAt(0).toUpperCase() + consent.consent_type.slice(1)} Consent
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {consent.email} • {consent.purpose}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Lawful basis: {consent.lawful_basis}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant={consent.consent_given ? "default" : "destructive"}>
                          {consent.consent_given ? "Granted" : "Withdrawn"}
                        </Badge>
                        <div className="text-xs text-muted-foreground mt-1">
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
          <Card>
            <CardHeader>
              <CardTitle>Data Retention Policies</CardTitle>
              <CardDescription>
                Manage data retention schedules and deletion policies
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Database className="mx-auto h-12 w-12 mb-4" />
                <p>Data retention management coming soon</p>
                <p className="text-sm">Automated data lifecycle and deletion policies</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="processing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Processing Activities Register</CardTitle>
              <CardDescription>
                GDPR Article 30 register of processing activities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Settings className="mx-auto h-12 w-12 mb-4" />
                <p>Processing activities register coming soon</p>
                <p className="text-sm">Complete Article 30 compliance documentation</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default GDPRCompliance;