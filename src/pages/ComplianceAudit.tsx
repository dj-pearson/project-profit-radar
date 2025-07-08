import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { 
  Shield, 
  AlertTriangle, 
  Eye, 
  Settings, 
  FileText,
  Users,
  Database,
  Clock,
  TrendingUp,
  RefreshCw,
  Download,
  Search,
  Filter,
  ArrowLeft
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';

interface AuditStats {
  totalEvents: number;
  highRiskEvents: number;
  dataAccessEvents: number;
  configChanges: number;
  todayEvents: number;
}

interface AuditEvent {
  id: string;
  action_type: string;
  resource_type: string;
  resource_name: string | null;
  risk_level: string;
  compliance_category: string;
  user_id: string;
  description: string | null;
  created_at: string;
  user_profiles?: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

interface DataAccessLog {
  id: string;
  data_type: string;
  data_classification: string;
  resource_name: string | null;
  access_method: string;
  user_id: string;
  created_at: string;
  user_profiles?: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

const ComplianceAudit = () => {
  const [stats, setStats] = useState<AuditStats>({
    totalEvents: 0,
    highRiskEvents: 0,
    dataAccessEvents: 0,
    configChanges: 0,
    todayEvents: 0
  });
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [dataAccessLogs, setDataAccessLogs] = useState<DataAccessLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRisk, setFilterRisk] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      fetchAuditData();
      
      // Set up real-time subscription for audit logs
      const auditChannel = supabase
        .channel('audit-monitoring')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'audit_logs'
          },
          (payload) => {
            setAuditEvents(prev => [payload.new as AuditEvent, ...prev.slice(0, 49)]);
            updateStatsWithNewEvent();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(auditChannel);
      };
    }
  }, [user]);

  const fetchAuditData = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Fetch audit statistics
      const [eventsResult, highRiskResult, dataAccessResult, configResult, todayResult] = await Promise.all([
        // Total events (last 30 days)
        supabase
          .from('audit_logs')
          .select('id')
          .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
        
        // High risk events (last 7 days)
        supabase
          .from('audit_logs')
          .select('id')
          .in('risk_level', ['high', 'critical'])
          .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
        
        // Data access events (last 24 hours)
        supabase
          .from('data_access_logs')
          .select('id')
          .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
        
        // Config changes (last 7 days)
        supabase
          .from('system_config_changes')
          .select('id')
          .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
        
        // Today's events
        supabase
          .from('audit_logs')
          .select('id')
          .gte('created_at', `${today}T00:00:00.000Z`)
          .lt('created_at', `${today}T23:59:59.999Z`)
      ]);

      // Fetch recent audit events with user details
      const { data: recentEvents } = await supabase
        .from('audit_logs')
        .select(`
          *,
          user_profiles:user_id (
            first_name,
            last_name,
            email
          )
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      // Fetch recent data access logs
      const { data: recentAccess } = await supabase
        .from('data_access_logs')
        .select(`
          *,
          user_profiles:user_id (
            first_name,
            last_name,
            email
          )
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      setStats({
        totalEvents: eventsResult.data?.length || 0,
        highRiskEvents: highRiskResult.data?.length || 0,
        dataAccessEvents: dataAccessResult.data?.length || 0,
        configChanges: configResult.data?.length || 0,
        todayEvents: todayResult.data?.length || 0
      });

      setAuditEvents(recentEvents || []);
      setDataAccessLogs(recentAccess || []);
    } catch (error) {
      console.error('Error fetching audit data:', error);
      toast({
        title: "Error",
        description: "Failed to load audit data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const updateStatsWithNewEvent = () => {
    setStats(prev => ({
      ...prev,
      todayEvents: prev.todayEvents + 1,
      totalEvents: prev.totalEvents + 1
    }));
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAuditData();
    setRefreshing(false);
    toast({
      title: "Refreshed",
      description: "Audit data has been updated",
    });
  };

  const generateComplianceReport = async () => {
    try {
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);

      // This would typically call an edge function to generate a comprehensive report
      toast({
        title: "Report Generation Started",
        description: "SOC 2 compliance report is being generated...",
      });
    } catch (error) {
      console.error('Error generating report:', error);
      toast({
        title: "Error",
        description: "Failed to generate compliance report",
        variant: "destructive"
      });
    }
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/dashboard')}
              className="mr-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            <h1 className="text-xl font-semibold">SOC 2 Compliance Audit</h1>
          </div>
        </div>
      </div>
      
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-muted-foreground mt-2">
              Comprehensive audit trail for compliance monitoring and reporting
            </p>
          </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={generateComplianceReport}>
            <FileText className="mr-2 h-4 w-4" />
            Generate Report
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Events</CardTitle>
            <FileText className="h-4 w-4 text-construction-orange" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalEvents}</div>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Risk Events</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.highRiskEvents}</div>
            <p className="text-xs text-muted-foreground">Last 7 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Data Access</CardTitle>
            <Database className="h-4 w-4 text-construction-orange" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.dataAccessEvents}</div>
            <p className="text-xs text-muted-foreground">Last 24 hours</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Config Changes</CardTitle>
            <Settings className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.configChanges}</div>
            <p className="text-xs text-muted-foreground">Last 7 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Events</CardTitle>
            <Clock className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.todayEvents}</div>
            <p className="text-xs text-muted-foreground">Since midnight</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="audit-log" className="space-y-6">
        <TabsList>
          <TabsTrigger value="audit-log">Audit Log</TabsTrigger>
          <TabsTrigger value="data-access">Data Access</TabsTrigger>
          <TabsTrigger value="config-changes">Config Changes</TabsTrigger>
          <TabsTrigger value="reports">Compliance Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="audit-log" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>System Audit Log</CardTitle>
                  <CardDescription>
                    Comprehensive log of all system activities and user actions
                  </CardDescription>
                </div>
                
                {/* Filters */}
                <div className="flex gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search events..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 w-64"
                    />
                  </div>
                  <Select value={filterRisk} onValueChange={setFilterRisk}>
                    <SelectTrigger className="w-32">
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
                    <SelectTrigger className="w-40">
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
                    <div key={event.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {getActionIcon(event.action_type)}
                        <div>
                          <div className="font-medium">
                            {event.action_type.toUpperCase()} {event.resource_type}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {event.resource_name} • {event.user_profiles?.first_name} {event.user_profiles?.last_name}
                          </div>
                          {event.description && (
                            <div className="text-xs text-muted-foreground mt-1">
                              {event.description}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex gap-2 mb-2">
                          <Badge variant={getRiskBadgeVariant(event.risk_level)}>
                            {event.risk_level}
                          </Badge>
                          <Badge variant="outline">
                            {event.compliance_category}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(event.created_at), 'MMM d, HH:mm:ss')}
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
    </div>
  );
};

export default ComplianceAudit;