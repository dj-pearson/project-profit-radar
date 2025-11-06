import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Activity, CheckCircle2, XCircle, Clock, TrendingUp, Zap } from 'lucide-react';
import { workflowExecutionService } from '@/services/WorkflowExecutionService';
import { format } from 'date-fns';

interface WorkflowAnalyticsProps {
  workflowId?: string;
}

export function WorkflowAnalytics({ workflowId }: WorkflowAnalyticsProps) {
  const [executions, setExecutions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadExecutions();
  }, [workflowId]);

  const loadExecutions = async () => {
    setLoading(true);
    try {
      const data = workflowId 
        ? await workflowExecutionService.getExecutionHistory(workflowId)
        : await workflowExecutionService.getRecentExecutions();
      setExecutions(data || []);
    } finally {
      setLoading(false);
    }
  };

  const stats = {
    total: executions.length,
    successful: executions.filter(e => e.status === 'completed').length,
    failed: executions.filter(e => e.status === 'failed').length,
    running: executions.filter(e => e.status === 'running').length,
    avgDuration: executions.length > 0 
      ? executions
          .filter(e => e.completed_at && e.started_at)
          .reduce((acc, e) => {
            const duration = new Date(e.completed_at).getTime() - new Date(e.started_at).getTime();
            return acc + duration;
          }, 0) / executions.filter(e => e.completed_at && e.started_at).length / 1000
      : 0
  };

  const successRate = stats.total > 0 ? (stats.successful / stats.total) * 100 : 0;

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <div className="h-4 bg-muted animate-pulse rounded" />
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Executions</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{successRate.toFixed(1)}%</div>
            <Progress value={successRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg Duration</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgDuration.toFixed(1)}s</div>
            <p className="text-xs text-muted-foreground">Per execution</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Now</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.running}</div>
            <p className="text-xs text-muted-foreground">Currently running</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Executions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {executions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No executions yet</p>
                <p className="text-sm">Workflow executions will appear here</p>
              </div>
            ) : (
              executions.slice(0, 20).map((execution) => (
                <div
                  key={execution.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    {execution.status === 'completed' && (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    )}
                    {execution.status === 'failed' && (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                    {execution.status === 'running' && (
                      <Clock className="h-5 w-5 text-blue-500 animate-pulse" />
                    )}
                    
                    <div>
                      <div className="font-medium">
                        {execution.workflow_definitions?.name || 'Workflow'}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {format(new Date(execution.started_at), 'MMM d, yyyy h:mm a')}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {execution.completed_at && execution.started_at && (
                      <span className="text-sm text-muted-foreground">
                        {((new Date(execution.completed_at).getTime() - 
                           new Date(execution.started_at).getTime()) / 1000).toFixed(1)}s
                      </span>
                    )}
                    <Badge
                      variant={
                        execution.status === 'completed' ? 'default' :
                        execution.status === 'failed' ? 'destructive' :
                        'secondary'
                      }
                    >
                      {execution.status}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
