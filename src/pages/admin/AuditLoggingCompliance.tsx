import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Shield,
  FileText,
  AlertCircle,
  CheckCircle,
  XCircle,
  Download,
  Search,
  Filter,
  Clock,
  Users,
  Database,
  Lock,
  Eye,
  Trash2,
  Archive,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

interface AuditLog {
  id: string;
  event_type: string;
  action: string;
  resource_type: string;
  resource_name: string;
  status: string;
  user_id: string;
  ip_address: string;
  created_at: string;
  changes: any;
  is_sensitive: boolean;
}

interface GDPRRequest {
  id: string;
  request_type: string;
  status: string;
  requester_email: string;
  requester_name: string;
  deadline: string;
  is_overdue: boolean;
  created_at: string;
  completed_at: string;
}

interface RetentionPolicy {
  id: string;
  name: string;
  resource_type: string;
  retention_period_days: number;
  action_on_expiry: string;
  is_active: boolean;
  last_applied_at: string;
  created_at: string;
}

interface ComplianceReport {
  id: string;
  report_type: string;
  report_name: string;
  status: string;
  date_range_start: string;
  date_range_end: string;
  generated_at: string;
  file_url: string;
  compliance_standard: string;
}

export const AuditLoggingCompliance = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [gdprRequests, setGDPRRequests] = useState<GDPRRequest[]>([]);
  const [retentionPolicies, setRetentionPolicies] = useState<RetentionPolicy[]>([]);
  const [complianceReports, setComplianceReports] = useState<ComplianceReport[]>([]);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [eventTypeFilter, setEventTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    loadComplianceData();
  }, []);

  const loadComplianceData = async () => {
    setLoading(true);
    try {
      // Load audit logs (last 100)
      const { data: logsData, error: logsError } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (logsError) throw logsError;
      setAuditLogs(logsData || []);

      // Load GDPR requests
      const { data: gdprData, error: gdprError } = await supabase
        .from('gdpr_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (gdprError) throw gdprError;
      setGDPRRequests(gdprData || []);

      // Load retention policies
      const { data: policiesData, error: policiesError } = await supabase
        .from('data_retention_policies')
        .select('*')
        .order('created_at', { ascending: false });

      if (policiesError) throw policiesError;
      setRetentionPolicies(policiesData || []);

      // Load compliance reports
      const { data: reportsData, error: reportsError } = await supabase
        .from('compliance_reports')
        .select('*')
        .order('generated_at', { ascending: false });

      if (reportsError) throw reportsError;
      setComplianceReports(reportsData || []);
    } catch (error) {
      console.error('Failed to load compliance data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load compliance data.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const generateComplianceReport = async () => {
    try {
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 1);
      const endDate = new Date();

      const { error } = await supabase
        .from('compliance_reports')
        .insert({
          report_type: 'audit_summary',
          report_name: `Monthly Compliance Report - ${endDate.toLocaleDateString()}`,
          date_range_start: startDate.toISOString().split('T')[0],
          date_range_end: endDate.toISOString().split('T')[0],
          status: 'pending',
          generated_by: user?.id,
        });

      if (error) throw error;

      toast({
        title: 'Report Queued',
        description: 'Compliance report generation has been queued.',
      });

      loadComplianceData();
    } catch (error) {
      console.error('Failed to generate report:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate compliance report.',
        variant: 'destructive',
      });
    }
  };

  const exportAuditLogs = () => {
    const csv = [
      ['Date', 'Event Type', 'Action', 'Resource', 'User', 'Status', 'IP Address'].join(','),
      ...auditLogs.map((log) =>
        [
          new Date(log.created_at).toLocaleString(),
          log.event_type,
          log.action,
          `${log.resource_type}: ${log.resource_name || 'N/A'}`,
          log.user_id,
          log.status,
          log.ip_address || 'N/A',
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString()}.csv`;
    a.click();

    toast({
      title: 'Export Complete',
      description: 'Audit logs have been exported to CSV.',
    });
  };

  const updateGDPRRequestStatus = async (requestId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('gdpr_requests')
        .update({
          status: newStatus,
          completed_at: newStatus === 'completed' ? new Date().toISOString() : null,
        })
        .eq('id', requestId);

      if (error) throw error;

      toast({
        title: 'Status Updated',
        description: `GDPR request has been marked as ${newStatus}.`,
      });

      loadComplianceData();
    } catch (error) {
      console.error('Failed to update GDPR request:', error);
      toast({
        title: 'Error',
        description: 'Failed to update GDPR request status.',
        variant: 'destructive',
      });
    }
  };

  const toggleRetentionPolicy = async (policyId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('data_retention_policies')
        .update({ is_active: !currentStatus })
        .eq('id', policyId);

      if (error) throw error;

      toast({
        title: currentStatus ? 'Policy Disabled' : 'Policy Enabled',
        description: currentStatus
          ? 'Retention policy has been disabled.'
          : 'Retention policy is now active.',
      });

      loadComplianceData();
    } catch (error) {
      console.error('Failed to toggle policy:', error);
      toast({
        title: 'Error',
        description: 'Failed to update retention policy.',
        variant: 'destructive',
      });
    }
  };

  const getEventTypeBadge = (eventType: string) => {
    const config = {
      create: { color: 'bg-green-500', icon: '➕' },
      update: { color: 'bg-blue-500', icon: '✏️' },
      delete: { color: 'bg-red-500', icon: '🗑️' },
      view: { color: 'bg-gray-500', icon: '👁️' },
      export: { color: 'bg-purple-500', icon: '📥' },
      login: { color: 'bg-teal-500', icon: '🔓' },
      logout: { color: 'bg-orange-500', icon: '🔒' },
      permission_change: { color: 'bg-yellow-500', icon: '🔑' },
    };

    const { color, icon } = config[eventType as keyof typeof config] || {
      color: 'bg-gray-500',
      icon: '📋',
    };

    return (
      <Badge className={`${color} text-white text-xs`}>
        {icon} {eventType}
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    const config = {
      success: { color: 'bg-green-500', icon: CheckCircle },
      failure: { color: 'bg-red-500', icon: XCircle },
      error: { color: 'bg-orange-500', icon: AlertCircle },
      pending: { color: 'bg-yellow-500', icon: Clock },
      in_progress: { color: 'bg-blue-500', icon: Clock },
      completed: { color: 'bg-green-500', icon: CheckCircle },
    };

    const { color, icon: Icon } = config[status as keyof typeof config] || {
      color: 'bg-gray-500',
      icon: AlertCircle,
    };

    return (
      <Badge className={`${color} text-white`}>
        <Icon className="w-3 h-3 mr-1" />
        {status}
      </Badge>
    );
  };

  const getRequestTypeBadge = (type: string) => {
    const labels: Record<string, string> = {
      data_export: 'Data Export',
      data_deletion: 'Data Deletion',
      data_correction: 'Data Correction',
      data_portability: 'Data Portability',
      consent_withdrawal: 'Consent Withdrawal',
    };

    return <Badge variant="outline">{labels[type] || type}</Badge>;
  };

  const filteredAuditLogs = auditLogs.filter((log) => {
    const matchesSearch =
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.resource_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesEventType = eventTypeFilter === 'all' || log.event_type === eventTypeFilter;
    const matchesStatus = statusFilter === 'all' || log.status === statusFilter;
    return matchesSearch && matchesEventType && matchesStatus;
  });

  const overdueGDPRRequests = gdprRequests.filter((req) => req.is_overdue && req.status === 'pending');

  if (loading) {
    return (
      <DashboardLayout title="Audit & Compliance">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Shield className="w-12 h-12 text-construction-orange animate-pulse mx-auto mb-4" />
            <p className="text-muted-foreground">Loading compliance data...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Audit & Compliance">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-construction-dark flex items-center gap-2">
              <Shield className="w-8 h-8 text-construction-orange" />
              Audit & Compliance
            </h1>
            <p className="text-muted-foreground">
              Track all activity, manage GDPR requests, and maintain compliance
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportAuditLogs}>
              <Download className="w-4 h-4 mr-2" />
              Export Logs
            </Button>
            <Button onClick={generateComplianceReport}>
              <FileText className="w-4 h-4 mr-2" />
              Generate Report
            </Button>
          </div>
        </div>

        {/* Alert for overdue GDPR requests */}
        {overdueGDPRRequests.length > 0 && (
          <Card className="border-red-500 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-red-900">
                    {overdueGDPRRequests.length} Overdue GDPR Request(s)
                  </h3>
                  <p className="text-sm text-red-800">
                    You have GDPR requests that have exceeded the 30-day deadline. Immediate action
                    required.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Audit Logs</p>
                  <p className="text-2xl font-bold">{auditLogs.length}</p>
                </div>
                <FileText className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pending GDPR Requests</p>
                  <p className="text-2xl font-bold">
                    {gdprRequests.filter((r) => r.status === 'pending').length}
                  </p>
                </div>
                <Users className="w-8 h-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Policies</p>
                  <p className="text-2xl font-bold">
                    {retentionPolicies.filter((p) => p.is_active).length}
                  </p>
                </div>
                <Database className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Compliance Reports</p>
                  <p className="text-2xl font-bold">{complianceReports.length}</p>
                </div>
                <Lock className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="audit-logs">
          <TabsList>
            <TabsTrigger value="audit-logs">Audit Logs ({auditLogs.length})</TabsTrigger>
            <TabsTrigger value="gdpr">GDPR Requests ({gdprRequests.length})</TabsTrigger>
            <TabsTrigger value="retention">
              Retention Policies ({retentionPolicies.length})
            </TabsTrigger>
            <TabsTrigger value="reports">Reports ({complianceReports.length})</TabsTrigger>
          </TabsList>

          {/* Audit Logs Tab */}
          <TabsContent value="audit-logs" className="space-y-4">
            <div className="flex gap-4 items-center">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Search audit logs..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Event Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="create">Create</SelectItem>
                  <SelectItem value="update">Update</SelectItem>
                  <SelectItem value="delete">Delete</SelectItem>
                  <SelectItem value="view">View</SelectItem>
                  <SelectItem value="export">Export</SelectItem>
                  <SelectItem value="login">Login</SelectItem>
                  <SelectItem value="logout">Logout</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="failure">Failure</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              {filteredAuditLogs.map((log) => (
                <Card key={log.id}>
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          {getEventTypeBadge(log.event_type)}
                          <code className="text-sm font-mono">{log.action}</code>
                          {getStatusBadge(log.status)}
                          {log.is_sensitive && (
                            <Badge className="bg-orange-500 text-white">
                              <Lock className="w-3 h-3 mr-1" />
                              Sensitive
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Resource: {log.resource_type}
                          {log.resource_name && ` • ${log.resource_name}`}
                        </p>
                        {log.ip_address && (
                          <p className="text-xs text-muted-foreground mt-1">
                            IP: {log.ip_address}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">
                          {new Date(log.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {filteredAuditLogs.length === 0 && (
              <Card>
                <CardContent className="pt-6 text-center py-12">
                  <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No audit logs found</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* GDPR Requests Tab */}
          <TabsContent value="gdpr" className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Manage GDPR data subject requests (30-day deadline per GDPR Article 12)
            </p>

            {gdprRequests.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center py-12">
                  <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No GDPR requests</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {gdprRequests.map((request) => (
                  <Card key={request.id} className={request.is_overdue ? 'border-red-500' : ''}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="font-semibold">{request.requester_name || 'Anonymous'}</h4>
                            {getRequestTypeBadge(request.request_type)}
                            {getStatusBadge(request.status)}
                            {request.is_overdue && (
                              <Badge className="bg-red-500 text-white">
                                <AlertCircle className="w-3 h-3 mr-1" />
                                Overdue
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{request.requester_email}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4 mb-4">
                        <div>
                          <p className="text-xs text-muted-foreground">Deadline</p>
                          <p className="font-semibold">
                            {new Date(request.deadline).toLocaleDateString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Created</p>
                          <p className="font-semibold">
                            {new Date(request.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Completed</p>
                          <p className="font-semibold">
                            {request.completed_at
                              ? new Date(request.completed_at).toLocaleDateString()
                              : 'Pending'}
                          </p>
                        </div>
                      </div>

                      {request.status === 'pending' && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => updateGDPRRequestStatus(request.id, 'in_progress')}
                          >
                            Start Processing
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateGDPRRequestStatus(request.id, 'completed')}
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Mark Complete
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Retention Policies Tab */}
          <TabsContent value="retention" className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Automated data retention and deletion policies for compliance
            </p>

            {retentionPolicies.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center py-12">
                  <Database className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">No retention policies configured</p>
                  <Button>Create Retention Policy</Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {retentionPolicies.map((policy) => (
                  <Card key={policy.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="font-semibold">{policy.name}</h4>
                            {policy.is_active ? (
                              <Badge className="bg-green-500 text-white">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Active
                              </Badge>
                            ) : (
                              <Badge className="bg-gray-500 text-white">
                                <XCircle className="w-3 h-3 mr-1" />
                                Inactive
                              </Badge>
                            )}
                            <Badge variant="outline">{policy.resource_type}</Badge>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4 mb-4">
                        <div>
                          <p className="text-xs text-muted-foreground">Retention Period</p>
                          <p className="font-semibold">{policy.retention_period_days} days</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Action on Expiry</p>
                          <p className="font-semibold capitalize">{policy.action_on_expiry}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Last Applied</p>
                          <p className="font-semibold">
                            {policy.last_applied_at
                              ? new Date(policy.last_applied_at).toLocaleDateString()
                              : 'Never'}
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant={policy.is_active ? 'outline' : 'default'}
                          onClick={() => toggleRetentionPolicy(policy.id, policy.is_active)}
                        >
                          {policy.is_active ? 'Disable' : 'Enable'}
                        </Button>
                        <Button size="sm" variant="outline">
                          Edit Policy
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Compliance Reports Tab */}
          <TabsContent value="reports" className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Generated compliance reports for audits and attestation
            </p>

            {complianceReports.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center py-12">
                  <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">No compliance reports generated</p>
                  <Button onClick={generateComplianceReport}>
                    <FileText className="w-4 h-4 mr-2" />
                    Generate First Report
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {complianceReports.map((report) => (
                  <Card key={report.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="font-semibold">{report.report_name}</h4>
                            {getStatusBadge(report.status)}
                            {report.compliance_standard && (
                              <Badge variant="outline">{report.compliance_standard}</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {new Date(report.date_range_start).toLocaleDateString()} -{' '}
                            {new Date(report.date_range_end).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        {report.file_url && (
                          <Button size="sm" variant="outline" asChild>
                            <a href={report.file_url} download>
                              <Download className="w-4 h-4 mr-2" />
                              Download
                            </a>
                          </Button>
                        )}
                        <Button size="sm" variant="outline">
                          <Eye className="w-4 h-4 mr-2" />
                          View Details
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default AuditLoggingCompliance;
