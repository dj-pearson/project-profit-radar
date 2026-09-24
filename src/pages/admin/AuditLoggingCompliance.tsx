import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, AlertCircle, CheckCircle, XCircle, Download, Search, Clock, Users, Database, Lock, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuditLoggingCompliance } from '@/hooks/useAuditLoggingCompliance';
import { ErrorState } from '@/components/common/ErrorState';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { AccessiblePageWrapper } from '@/components/accessibility/AccessiblePageWrapper';
import { DataTablePageSkeleton } from '@/components/ui/skeletons';

export const AuditLoggingCompliance = () => {
  const { toast } = useToast();
  const compliance = useAuditLoggingCompliance();
  const auditLogs = compliance.data?.auditLogs ?? [];
  const gdprRequests = compliance.data?.gdprRequests ?? [];
  const retentionPolicies = compliance.data?.retentionPolicies ?? [];
  const complianceReports = compliance.data?.complianceReports ?? [];
  // Counts only from a read that came back; a failed one shows '--', not 0.
  const shown = (n: number) => (compliance.data ? n : '--');

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [eventTypeFilter, setEventTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const generateComplianceReport = async () => {
    try {
      await compliance.queueReport();

      toast({
        title: 'Report Queued',
        description: 'Compliance report generation has been queued.',
      });
    } catch (error) {
      console.error('Failed to generate report:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to generate compliance report.',
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
      await compliance.setGdprStatus(requestId, newStatus);

      toast({
        title: 'Status Updated',
        description: `GDPR request has been marked as ${newStatus}.`,
      });
    } catch (error) {
      console.error('Failed to update GDPR request:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update GDPR request status.',
        variant: 'destructive',
      });
    }
  };

  const toggleRetentionPolicy = async (policyId: string, currentStatus: boolean) => {
    try {
      await compliance.setPolicyActive(policyId, !currentStatus);

      toast({
        title: currentStatus ? 'Policy Disabled' : 'Policy Enabled',
        description: currentStatus
          ? 'Retention policy has been disabled.'
          : 'Retention policy is now active.',
      });
    } catch (error) {
      console.error('Failed to toggle policy:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update retention policy.',
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

  if (compliance.isLoading) {
    return (
      <AccessiblePageWrapper pageTitle="Audit & Compliance">
      <DashboardLayout hasAccessibleWrapper title="Audit & Compliance">
        <DataTablePageSkeleton label="Loading compliance data" />
      </DashboardLayout>
      </AccessiblePageWrapper>
    );
  }

  return (
    <AccessiblePageWrapper pageTitle="Audit & Compliance">
    <DashboardLayout hasAccessibleWrapper
      title="Audit & Compliance"
      description="Track all activity, manage GDPR requests, and maintain compliance"
      headerActions={
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
      }
    >
      <div className="space-y-6">
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

        {compliance.error && (
          <ErrorState
            inline
            title="Compliance data could not be loaded"
            error={compliance.error}
            onRetry={() => { void compliance.refetch(); }}
          />
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Audit Logs</p>
                  <p className="text-2xl font-bold">{shown(compliance.data?.auditLogTotal ?? 0)}</p>
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
                    {shown(gdprRequests.filter((r) => r.status === 'pending').length)}
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
                    {shown(retentionPolicies.filter((p) => p.is_active).length)}
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
                  <p className="text-2xl font-bold">{shown(complianceReports.length)}</p>
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
    </AccessiblePageWrapper>
  );
};

export default AuditLoggingCompliance;
