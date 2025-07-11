import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { 
  Shield, 
  AlertTriangle, 
  Eye, 
  Lock, 
  Activity,
  Users,
  Clock,
  TrendingUp,
  RefreshCw,
  Download
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { MobilePageWrapper, MobileStatsGrid, MobileFilters, mobileGridClasses, mobileFilterClasses, mobileButtonClasses } from '@/utils/mobileHelpers';

interface SecurityStats {
  totalEvents: number;
  failedLogins: number;
  suspiciousActivity: number;
  activeUsers: number;
  todayEvents: number;
}

interface SecurityEvent {
  id: string;
  event_type: string;
  user_id: string | null;
  ip_address: unknown;
  user_agent: string | null;
  details: any;
  created_at: string;
}

const SecurityMonitoring = () => {
  const [stats, setStats] = useState<SecurityStats>({
    totalEvents: 0,
    failedLogins: 0,
    suspiciousActivity: 0,
    activeUsers: 0,
    todayEvents: 0
  });
  const [recentEvents, setRecentEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchSecurityData();
      
      // Set up real-time subscription for security logs
      const channel = supabase
        .channel('security-monitoring')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'security_logs'
          },
          (payload) => {
            setRecentEvents(prev => [payload.new as SecurityEvent, ...prev.slice(0, 49)]);
            updateStatsWithNewEvent(payload.new as SecurityEvent);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const fetchSecurityData = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Fetch security statistics
      const [eventsResult, failedLoginsResult, todayEventsResult, recentEventsResult] = await Promise.all([
        // Total events (last 30 days)
        supabase
          .from('security_logs')
          .select('id')
          .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
        
        // Failed login attempts (last 7 days)
        supabase
          .from('security_logs')
          .select('id')
          .eq('event_type', 'login_failed')
          .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
        
        // Today's events
        supabase
          .from('security_logs')
          .select('id')
          .gte('created_at', `${today}T00:00:00.000Z`)
          .lt('created_at', `${today}T23:59:59.999Z`),
        
        // Recent events (last 50)
        supabase
          .from('security_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50)
      ]);

      // Count suspicious activity (multiple failed logins from same IP)
      const suspiciousCount = await countSuspiciousActivity();

      // Count active users (logged in last 24 hours)
      const { data: activeUsersData } = await supabase
        .from('security_logs')
        .select('user_id')
        .eq('event_type', 'login_success')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      const uniqueActiveUsers = new Set(activeUsersData?.map(log => log.user_id).filter(Boolean)).size;

      setStats({
        totalEvents: eventsResult.data?.length || 0,
        failedLogins: failedLoginsResult.data?.length || 0,
        suspiciousActivity: suspiciousCount,
        activeUsers: uniqueActiveUsers,
        todayEvents: todayEventsResult.data?.length || 0
      });

      setRecentEvents(recentEventsResult.data || []);
    } catch (error) {
      console.error('Error fetching security data:', error);
      toast({
        title: "Error",
        description: "Failed to load security data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const countSuspiciousActivity = async () => {
    try {
      // Get failed logins in last 24 hours grouped by IP
      const { data } = await supabase
        .from('security_logs')
        .select('ip_address')
        .eq('event_type', 'login_failed')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      if (!data) return 0;

      // Count IPs with 3+ failed attempts
      const ipCounts = data.reduce((acc: any, log) => {
        const ip = log.ip_address as string;
        if (ip) {
          acc[ip] = (acc[ip] || 0) + 1;
        }
        return acc;
      }, {});

      return Object.values(ipCounts).filter((count: any) => count >= 3).length;
    } catch (error) {
      console.error('Error counting suspicious activity:', error);
      return 0;
    }
  };

  const updateStatsWithNewEvent = (event: SecurityEvent) => {
    setStats(prev => ({
      ...prev,
      todayEvents: prev.todayEvents + 1,
      totalEvents: prev.totalEvents + 1,
      ...(event.event_type === 'login_failed' && { failedLogins: prev.failedLogins + 1 })
    }));
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchSecurityData();
    setRefreshing(false);
    toast({
      title: "Refreshed",
      description: "Security data has been updated",
    });
  };

  const getEventSeverity = (eventType: string) => {
    switch (eventType) {
      case 'login_failed':
      case 'account_locked':
        return 'high';
      case 'password_changed':
      case 'two_factor_disabled':
        return 'medium';
      case 'login_success':
      case 'logout':
        return 'low';
      default:
        return 'medium';
    }
  };

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'login_failed':
      case 'account_locked':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'login_success':
        return <Shield className="h-4 w-4 text-green-500" />;
      case 'password_changed':
      case 'two_factor_enabled':
        return <Lock className="h-4 w-4 text-blue-500" />;
      default:
        return <Activity className="h-4 w-4 text-muted-foreground" />;
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-construction-dark">Security Monitoring</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Monitor security events, failed logins, and suspicious activities
          </p>
        </div>
        <div className={mobileFilterClasses.buttonGroup}>
          <Button variant="outline" onClick={handleRefresh} disabled={refreshing} className="flex-1 sm:flex-none">
            <RefreshCw className={`mr-1 sm:mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
            <span className="sm:hidden">Sync</span>
          </Button>
          <Button variant="outline" className="flex-1 sm:flex-none">
            <Download className="mr-1 sm:mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Export Logs</span>
            <span className="sm:hidden">Export</span>
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Events</CardTitle>
            <Activity className="h-4 w-4 text-construction-orange" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalEvents}</div>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed Logins</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.failedLogins}</div>
            <p className="text-xs text-muted-foreground">Last 7 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Suspicious Activity</CardTitle>
            <Eye className="h-4 w-4 text-construction-orange" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.suspiciousActivity}</div>
            <p className="text-xs text-muted-foreground">Last 24 hours</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeUsers}</div>
            <p className="text-xs text-muted-foreground">Last 24 hours</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Today's Events</CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{stats.todayEvents}</div>
            <p className="text-xs text-muted-foreground">Since midnight</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="events" className="space-y-6">
        <div className="grid w-full grid-cols-1 sm:grid-cols-3 rounded-md bg-muted p-1">
          <TabsTrigger value="events" className="text-xs sm:text-sm">
            <span className="hidden sm:inline">Recent Events</span>
            <span className="sm:hidden">Events</span>
          </TabsTrigger>
          <TabsTrigger value="analysis" className="text-xs sm:text-sm">
            <span className="hidden sm:inline">Threat Analysis</span>
            <span className="sm:hidden">Analysis</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="text-xs sm:text-sm">
            <span className="hidden sm:inline">Alert Settings</span>
            <span className="sm:hidden">Settings</span>
          </TabsTrigger>
        </div>

        <TabsContent value="events" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Security Events</CardTitle>
              <CardDescription>
                Real-time security events and authentication activities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentEvents.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Shield className="mx-auto h-12 w-12 mb-4" />
                    <p>No security events recorded yet</p>
                  </div>
                ) : (
                  recentEvents.map((event) => (
                    <div key={event.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg gap-3">
                      <div className="flex items-center gap-3">
                        {getEventIcon(event.event_type)}
                        <div className="min-w-0 flex-1">
                          <div className="font-medium capitalize text-sm sm:text-base">
                            {event.event_type.replace('_', ' ')}
                          </div>
                          <div className="text-xs sm:text-sm text-muted-foreground break-all">
                            {event.ip_address && `IP: ${String(event.ip_address)}`}
                            {event.user_agent && ` • ${event.user_agent.substring(0, 30)}...`}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 sm:gap-1">
                        <Badge variant={getEventSeverity(event.event_type) === 'high' ? 'destructive' : 'secondary'} className="text-xs">
                          {getEventSeverity(event.event_type)}
                        </Badge>
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

        <TabsContent value="analysis" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Threat Analysis</CardTitle>
              <CardDescription>
                Security patterns and potential threats
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <TrendingUp className="mx-auto h-12 w-12 mb-4" />
                <p>Threat analysis dashboard coming soon</p>
                <p className="text-sm">Advanced analytics and pattern detection</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Security Alert Settings</CardTitle>
              <CardDescription>
                Configure security monitoring and alert preferences
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Shield className="mx-auto h-12 w-12 mb-4" />
                <p>Alert configuration coming soon</p>
                <p className="text-sm">Set up email alerts, thresholds, and notification preferences</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SecurityMonitoring;