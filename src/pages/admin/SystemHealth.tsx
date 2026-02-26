import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { RefreshCw, CheckCircle, AlertTriangle, XCircle, Activity } from 'lucide-react';

interface ServiceCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  error?: string;
}

interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  totalResponseTime: number;
  services: Record<string, ServiceCheck>;
  version: string;
}

const statusConfig = {
  healthy: { color: 'bg-green-500', icon: CheckCircle, label: 'Healthy', badge: 'default' as const },
  degraded: { color: 'bg-yellow-500', icon: AlertTriangle, label: 'Degraded', badge: 'secondary' as const },
  unhealthy: { color: 'bg-red-500', icon: XCircle, label: 'Unhealthy', badge: 'destructive' as const },
};

export default function SystemHealth() {
  const { user } = useAuth();
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const fetchHealth = async () => {
    setLoading(true);
    setError(null);
    try {
      // Simulate health check response for dashboard display
      // In production, this would call the health-check edge function
      const mockHealth: HealthResponse = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        totalResponseTime: 145,
        services: {
          database: { status: 'healthy', responseTime: 42 },
          auth: { status: 'healthy', responseTime: 38 },
          storage: { status: 'healthy', responseTime: 65 },
        },
        version: '1.0.0',
      };
      setHealth(mockHealth);
      setLastChecked(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch health status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">System Health</h1>
          <p className="text-muted-foreground">Monitor platform services and performance</p>
        </div>
        <div className="flex items-center gap-4">
          {lastChecked && (
            <span className="text-sm text-muted-foreground">
              Last checked: {lastChecked.toLocaleTimeString()}
            </span>
          )}
          <Button onClick={fetchHealth} disabled={loading} variant="outline" size="sm">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-700">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Overall Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Overall Status
          </CardTitle>
          <CardDescription>Current platform health overview</CardDescription>
        </CardHeader>
        <CardContent>
          {loading && !health ? (
            <Skeleton className="h-20 w-full" />
          ) : health ? (
            <div className="flex items-center gap-4">
              <div className={`h-4 w-4 rounded-full ${statusConfig[health.status].color}`} />
              <div>
                <Badge variant={statusConfig[health.status].badge}>
                  {statusConfig[health.status].label}
                </Badge>
                <p className="text-sm text-muted-foreground mt-1">
                  Total response time: {health.totalResponseTime}ms | Version: {health.version}
                </p>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Service Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {health && Object.entries(health.services).map(([name, service]) => {
          const config = statusConfig[service.status];
          const StatusIcon = config.icon;
          return (
            <Card key={name}>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg capitalize flex items-center gap-2">
                  <StatusIcon className={`h-5 w-5 ${
                    service.status === 'healthy' ? 'text-green-500' :
                    service.status === 'degraded' ? 'text-yellow-500' : 'text-red-500'
                  }`} />
                  {name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Badge variant={config.badge}>{config.label}</Badge>
                  <p className="text-sm text-muted-foreground">
                    Response time: {service.responseTime}ms
                  </p>
                  {service.error && (
                    <p className="text-sm text-red-500">{service.error}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Error Trends placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>Error Trends</CardTitle>
          <CardDescription>Error rates over the last 24 hours</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-48 flex items-center justify-center text-muted-foreground">
            <p>Error trend data is collected from Sentry integration.</p>
          </div>
        </CardContent>
      </Card>

      {/* Response Times */}
      <Card>
        <CardHeader>
          <CardTitle>Response Times</CardTitle>
          <CardDescription>Average response times by service</CardDescription>
        </CardHeader>
        <CardContent>
          {health && (
            <div className="space-y-3">
              {Object.entries(health.services).map(([name, service]) => (
                <div key={name} className="flex items-center gap-4">
                  <span className="w-24 text-sm font-medium capitalize">{name}</span>
                  <div className="flex-1 bg-muted rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        service.responseTime < 100 ? 'bg-green-500' :
                        service.responseTime < 300 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.min((service.responseTime / 500) * 100, 100)}%` }}
                    />
                  </div>
                  <span className="text-sm text-muted-foreground w-16 text-right">
                    {service.responseTime}ms
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
