import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { AccessiblePageWrapper } from '@/components/accessibility/AccessiblePageWrapper';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { Shield, AlertTriangle, Eye, Settings, FileText, Database, Clock, TrendingUp, RefreshCw, Download, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useComplianceAudit } from '@/hooks/useComplianceAudit';
import { ErrorState } from '@/components/common/ErrorState';
import { format } from 'date-fns';
import { RootAdminOnly } from '@/components/PermissionGate';

const ComplianceAudit = () => {
  const audit = useComplianceAudit();
  const stats = audit.data?.stats ?? null;
  const auditEvents = audit.data?.auditEvents ?? [];
  const dataAccessLogs = audit.data?.dataAccessLogs ?? [];
  const refreshing = audit.isFetching && !audit.isLoading;
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRisk, setFilterRisk] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const { toast } = useToast();

  const handleRefresh = async () => {
    const result = await audit.refetch();
    if (result.error) {
      toast({
        title: "Could not refresh",
        description: result.error instanceof Error ? result.error.message : "Failed to load audit data",
        variant: "destructive",
      });
      return;
    }
    toast({
      title: "Refreshed",
      description: "Audit data has been updated",
    });
  };

  // Nothing generates a SOC 2 report yet. This used to toast "SOC 2 compliance
  // report is being generated..." and do nothing.
  const generateComplianceReport = () => {
    toast({
      title: "SOC 2 reports are not available yet",
      description: "No report was generated.",
    });
  };

  const getRiskBadgeVariant = (risk: string) => {
    switch (risk) {
      case 'critical':
        return 'destructive';
      case 'high':
        return 'destructive';
      case 'medium':
        return 'default';
      case 'low':
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'create':
        return <Eye className="h-4 w-4 text-green-500" />;
      case 'update':
        return <Settings className="h-4 w-4 text-blue-500" />;
      case 'delete':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'export':
        return <Download className="h-4 w-4 text-orange-500" />;
      default:
        return <FileText className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const filteredEvents = auditEvents.filter(event => {
    const matchesSearch = searchTerm === '' || 
      event.resource_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRisk = filterRisk === 'all' || event.risk_level === filterRisk;
    const matchesCategory = filterCategory === 'all' || event.compliance_category === filterCategory;
    
    return matchesSearch && matchesRisk && matchesCategory;
  });

  if (audit.isLoading) {
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
    <RootAdminOnly fallback={
      <AccessiblePageWrapper pageTitle="Access Denied">
      <DashboardLayout hasAccessibleWrapper title="Access Denied">
        <div className="text-center py-8">
          <Shield className="mx-auto h-12 w-12 mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold mb-2">System Compliance Audit</h2>
          <p className="text-muted-foreground mb-4">
            This system-wide compliance audit interface is restricted to root administrators only.
          </p>
          <p className="text-sm text-muted-foreground">
            Contact your system administrator if you need access to compliance reporting features.
          </p>
        </div>
      </DashboardLayout>
      </AccessiblePageWrapper>
    }>
      <AccessiblePageWrapper pageTitle="SOC 2 Compliance Audit">
      <DashboardLayout hasAccessibleWrapper
        title="SOC 2 Compliance Audit"
        description="System-wide audit trail for compliance monitoring and reporting (Root Admin Only)"
        headerActions={
          <div className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={handleRefresh} disabled={refreshing} className="w-full sm:w-auto">
              <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
              <span className="sm:hidden">Refresh</span>
            </Button>
            <Button onClick={generateComplianceReport} className="w-full sm:w-auto">
              <FileText className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Generate Report</span>
              <span className="sm:hidden">Report</span>
            </Button>
          </div>
        }
      >
        <div className="space-y-6">

       {audit.error && (
         <ErrorState
           inline
           title="Audit data could not be loaded"
           error={audit.error}
           onRetry={() => { void audit.refetch(); }}
         />
       )}

       {/* Statistics Cards */}
       <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-6">
         <Card>
           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
             <CardTitle className="text-xs sm:text-sm font-medium">Total Events</CardTitle>
             <FileText className="h-3 w-3 sm:h-4 sm:w-4 text-construction-orange" />
           </CardHeader>
           <CardContent>
             <div className="text-lg sm:text-2xl font-bold">{stats ? stats.totalEvents : '--'}</div>
             <p className="text-xs text-muted-foreground">Last 30 days</p>
           </CardContent>
         </Card>

         <Card>
           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
             <CardTitle className="text-xs sm:text-sm font-medium">High Risk Events</CardTitle>
             <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4 text-red-600" />
           </CardHeader>
           <CardContent>
             <div className="text-lg sm:text-2xl font-bold">{stats ? stats.highRiskEvents : '--'}</div>
             <p className="text-xs text-muted-foreground">Last 7 days</p>
           </CardContent>
         </Card>

         <Card>
           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
             <CardTitle className="text-xs sm:text-sm font-medium">Data Access</CardTitle>
             <Database className="h-3 w-3 sm:h-4 sm:w-4 text-construction-orange" />
           </CardHeader>
           <CardContent>
             <div className="text-lg sm:text-2xl font-bold">{stats ? stats.dataAccessEvents : '--'}</div>
             <p className="text-xs text-muted-foreground">Last 24 hours</p>
           </CardContent>
         </Card>

         <Card>
           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
             <CardTitle className="text-xs sm:text-sm font-medium">Config Changes</CardTitle>
             <Settings className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600" />
           </CardHeader>
           <CardContent>
             <div className="text-lg sm:text-2xl font-bold">{stats ? stats.configChanges : '--'}</div>
             <p className="text-xs text-muted-foreground">Last 7 days</p>
           </CardContent>
         </Card>

         <Card>
           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
             <CardTitle className="text-xs sm:text-sm font-medium">Today's Events</CardTitle>
             <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
           </CardHeader>
           <CardContent>
             <div className="text-lg sm:text-2xl font-bold">{stats ? stats.todayEvents : '--'}</div>
             <p className="text-xs text-muted-foreground">Since midnight</p>
           </CardContent>
         </Card>
      </div>

       {/* Main Content */}
       <Tabs defaultValue="audit-log" className="space-y-6">
         <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
           <TabsTrigger value="audit-log" className="text-xs sm:text-sm">Audit Log</TabsTrigger>
           <TabsTrigger value="data-access" className="text-xs sm:text-sm">Data Access</TabsTrigger>
           <TabsTrigger value="config-changes" className="text-xs sm:text-sm">Config Changes</TabsTrigger>
           <TabsTrigger value="reports" className="text-xs sm:text-sm">Reports</TabsTrigger>
         </TabsList>

         <TabsContent value="audit-log" className="space-y-6">
           <Card>
             <CardHeader>
               <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                 <div>
                   <CardTitle className="text-lg sm:text-xl">System Audit Log</CardTitle>
                   <CardDescription className="text-sm">
                     Comprehensive log of all system activities and user actions.
                     Entries are read-only: an audit log that can be edited is not evidence.
                   </CardDescription>
                 </div>
                 
                 {/* Filters */}
                 <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                   <div className="relative">
                     <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                     <Input
                       placeholder="Search events..."
                       value={searchTerm}
                       onChange={(e) => setSearchTerm(e.target.value)}
                       className="pl-10 w-full sm:w-64"
                     />
                   </div>
                   <div className="flex gap-2">
                     <Select value={filterRisk} onValueChange={setFilterRisk}>
                       <SelectTrigger className="w-full sm:w-32">
                         <SelectValue placeholder="Risk Level" />
                       </SelectTrigger>
                       <SelectContent>
                         <SelectItem value="all">All Risk</SelectItem>
                         <SelectItem value="low">Low</SelectItem>
                         <SelectItem value="medium">Medium</SelectItem>
                         <SelectItem value="high">High</SelectItem>
                         <SelectItem value="critical">Critical</SelectItem>
                       </SelectContent>
                     </Select>
                     <Select value={filterCategory} onValueChange={setFilterCategory}>
                       <SelectTrigger className="w-full sm:w-40">
                         <SelectValue placeholder="Category" />
                       </SelectTrigger>
                       <SelectContent>
                         <SelectItem value="all">All Categories</SelectItem>
                         <SelectItem value="data_access">Data Access</SelectItem>
                         <SelectItem value="user_management">User Management</SelectItem>
                         <SelectItem value="financial">Financial</SelectItem>
                         <SelectItem value="security">Security</SelectItem>
                         <SelectItem value="configuration_change">Config Change</SelectItem>
                       </SelectContent>
                     </Select>
                   </div>
                 </div>
               </div>
             </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredEvents.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Shield className="mx-auto h-12 w-12 mb-4" />
                    <p>No audit events match your filters</p>
                  </div>
                ) : (
                   filteredEvents.map((event) => (
                     <div key={event.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border rounded-lg gap-4">
                       <div className="flex items-center gap-3">
                         {getActionIcon(event.action_type)}
                         <div className="flex-1">
                           <div className="font-medium text-sm sm:text-base">
                             {event.action_type.toUpperCase()} {event.resource_type}
                           </div>
                           <div className="text-xs sm:text-sm text-muted-foreground">
                             {event.resource_name} • {event.user_profiles?.first_name} {event.user_profiles?.last_name}
                           </div>
                           {event.description && (
                             <div className="text-xs text-muted-foreground mt-1">
                               {event.description}
                             </div>
                           )}
                         </div>
                       </div>
                       <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:text-right">
                         <div className="flex flex-wrap gap-2">
                           <Badge variant={getRiskBadgeVariant(event.risk_level)}>
                             {event.risk_level}
                           </Badge>
                           <Badge variant="outline">
                             {event.compliance_category}
                           </Badge>
                         </div>
                         <div className="flex items-center gap-2">
                           <div className="text-xs text-muted-foreground">
                             {format(new Date(event.created_at), 'MMM d, HH:mm:ss')}
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

        <TabsContent value="data-access" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Data Access Logs</CardTitle>
              <CardDescription>
                Detailed tracking of sensitive data access for GDPR compliance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {dataAccessLogs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Database className="mx-auto h-12 w-12 mb-4" />
                    <p>No data access events recorded yet</p>
                  </div>
                ) : (
                  dataAccessLogs.map((log) => (
                    <div key={log.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Eye className="h-4 w-4 text-blue-500" />
                        <div>
                          <div className="font-medium">
                            {log.access_method.toUpperCase()} {log.data_type}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {log.resource_name} • {log.user_profiles?.first_name} {log.user_profiles?.last_name}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline">
                          {log.data_classification}
                        </Badge>
                        <div className="text-xs text-muted-foreground mt-1">
                          {format(new Date(log.created_at), 'MMM d, HH:mm:ss')}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="config-changes" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>System Configuration Changes</CardTitle>
              <CardDescription>
                Track all system configuration modifications for audit trail
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Settings className="mx-auto h-12 w-12 mb-4" />
                <p>Configuration change tracking coming soon</p>
                <p className="text-sm">Advanced change management and approval workflows</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Compliance Reports</CardTitle>
              <CardDescription>
                Generate and manage SOC 2, GDPR, and other compliance reports
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <TrendingUp className="mx-auto h-12 w-12 mb-4" />
                <p>Automated compliance reporting coming soon</p>
                <p className="text-sm">SOC 2 Type II, GDPR assessments, and custom audit reports</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
       </Tabs>

        </div>
      </DashboardLayout>
      </AccessiblePageWrapper>
    </RootAdminOnly>
   );
  };

  export default ComplianceAudit;