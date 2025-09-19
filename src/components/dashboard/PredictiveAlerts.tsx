import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertTriangle,
  TrendingDown,
  Calendar,
  DollarSign,
  Users,
  Cloud,
  Wrench,
  Bell,
  Eye,
  X,
  CheckCircle,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

interface PredictiveAlert {
  id: string;
  type: 'budget' | 'timeline' | 'weather' | 'resource' | 'safety' | 'quality';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  prediction: string;
  confidence: number;
  projectId?: string;
  projectName?: string;
  dueDate?: Date;
  currentValue?: number;
  thresholdValue?: number;
  suggestedActions?: Array<{
    action: string;
    impact: 'high' | 'medium' | 'low';
  }>;
  dismissed?: boolean;
  acknowledged?: boolean;
  createdAt: Date;
}

const ALERT_ICONS = {
  budget: DollarSign,
  timeline: Calendar,
  weather: Cloud,
  resource: Users,
  safety: AlertTriangle,
  quality: Wrench
};

const SEVERITY_COLORS = {
  low: 'border-blue-200 bg-blue-50 text-blue-800',
  medium: 'border-yellow-200 bg-yellow-50 text-yellow-800',
  high: 'border-orange-200 bg-orange-50 text-orange-800',
  critical: 'border-red-200 bg-red-50 text-red-800'
};

export const PredictiveAlerts: React.FC = () => {
  const [alerts, setAlerts] = useState<PredictiveAlert[]>([
    {
      id: '1',
      type: 'budget',
      severity: 'high',
      title: 'Budget Overrun Warning',
      description: 'Kitchen Remodel - Johnson project is projected to exceed budget',
      prediction: '15% over budget by completion (Est. $51,750 vs $45,000 budget)',
      confidence: 87,
      projectId: 'proj-001',
      projectName: 'Kitchen Remodel - Johnson',
      currentValue: 38500,
      thresholdValue: 45000,
      suggestedActions: [
        { action: 'Review change orders and reduce scope', impact: 'high' },
        { action: 'Negotiate better material pricing', impact: 'medium' },
        { action: 'Optimize labor allocation', impact: 'medium' }
      ],
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000)
    },
    {
      id: '2',
      type: 'timeline',
      severity: 'medium',
      title: 'Project Delay Risk',
      description: 'Office Renovation - TechCorp showing signs of potential delay',
      prediction: '8-12 days behind schedule due to permit processing delays',
      confidence: 73,
      projectId: 'proj-002',
      projectName: 'Office Renovation - TechCorp',
      dueDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
      suggestedActions: [
        { action: 'Expedite permit application process', impact: 'high' },
        { action: 'Prepare alternative work sequence', impact: 'medium' }
      ],
      createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000)
    },
    {
      id: '3',
      type: 'weather',
      severity: 'medium',
      title: 'Weather Impact Alert',
      description: 'Heavy rain expected this week may affect outdoor work',
      prediction: '3-4 days of potential work stoppage for exterior projects',
      confidence: 82,
      suggestedActions: [
        { action: 'Reschedule outdoor activities', impact: 'high' },
        { action: 'Focus on interior work items', impact: 'medium' },
        { action: 'Secure materials and equipment', impact: 'low' }
      ],
      createdAt: new Date(Date.now() - 30 * 60 * 1000)
    },
    {
      id: '4',
      type: 'resource',
      severity: 'critical',
      title: 'Resource Conflict Detected',
      description: 'Double-booked crew assignments for next week',
      prediction: 'Team Alpha scheduled for 2 projects simultaneously on Mon-Wed',
      confidence: 100,
      suggestedActions: [
        { action: 'Reassign Team Beta to secondary project', impact: 'high' },
        { action: 'Hire temporary crew members', impact: 'medium' }
      ],
      createdAt: new Date(Date.now() - 10 * 60 * 1000)
    }
  ]);

  const [filter, setFilter] = useState<'all' | PredictiveAlert['type']>('all');
  const [showDismissed, setShowDismissed] = useState(false);

  const handleDismiss = (alertId: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId ? { ...alert, dismissed: true } : alert
    ));
    toast({
      title: "Alert Dismissed",
      description: "Alert has been hidden from your dashboard.",
    });
  };

  const handleAcknowledge = (alertId: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId ? { ...alert, acknowledged: true } : alert
    ));
    toast({
      title: "Alert Acknowledged",
      description: "Alert marked as seen and acknowledged.",
    });
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return 'text-green-600 bg-green-100';
    if (confidence >= 70) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getTimeAgo = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    
    if (minutes < 60) return `${minutes}m ago`;
    return `${hours}h ago`;
  };

  const filteredAlerts = alerts.filter(alert => {
    if (!showDismissed && alert.dismissed) return false;
    if (filter === 'all') return true;
    return alert.type === filter;
  });

  const criticalAlerts = filteredAlerts.filter(alert => alert.severity === 'critical' && !alert.dismissed);
  const highAlerts = filteredAlerts.filter(alert => alert.severity === 'high' && !alert.dismissed);

  const AlertCard: React.FC<{ alert: PredictiveAlert }> = ({ alert }) => {
    const Icon = ALERT_ICONS[alert.type];
    
    return (
      <Card className={cn(
        "relative transition-all duration-200 hover:shadow-md",
        alert.dismissed && "opacity-60",
        SEVERITY_COLORS[alert.severity]
      )}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <Icon className="h-5 w-5" />
              <div>
                <CardTitle className="text-base">{alert.title}</CardTitle>
                <CardDescription className="text-sm mt-1">
                  {alert.projectName && (
                    <Badge variant="outline" className="mr-2">
                      {alert.projectName}
                    </Badge>
                  )}
                  {getTimeAgo(alert.createdAt)}
                </CardDescription>
              </div>
            </div>
            
            <div className="flex items-center gap-1">
              <Badge className={getConfidenceColor(alert.confidence)}>
                {alert.confidence}%
              </Badge>
              
              {!alert.dismissed && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => handleDismiss(alert.id)}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <p className="text-sm mb-3">{alert.description}</p>
          
          <div className="bg-white/50 rounded p-3 mb-3">
            <p className="text-sm font-medium">Prediction:</p>
            <p className="text-sm text-muted-foreground">{alert.prediction}</p>
          </div>

          {alert.currentValue && alert.thresholdValue && (
            <div className="mb-3">
              <div className="flex justify-between text-sm mb-1">
                <span>Progress</span>
                <span>
                  ${alert.currentValue.toLocaleString()} / ${alert.thresholdValue.toLocaleString()}
                </span>
              </div>
              <Progress 
                value={(alert.currentValue / alert.thresholdValue) * 100} 
                className="h-2"
              />
            </div>
          )}

          {alert.suggestedActions && alert.suggestedActions.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Suggested Actions:</p>
              {alert.suggestedActions.slice(0, 2).map((action, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <span>• {action.action}</span>
                  <Badge variant={action.impact === 'high' ? 'default' : 'outline'}>
                    {action.impact} impact
                  </Badge>
                </div>
              ))}
              
              {alert.suggestedActions.length > 2 && (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="link" size="sm" className="h-auto p-0 text-xs">
                      View all {alert.suggestedActions.length} actions
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{alert.title} - Action Plan</DialogTitle>
                      <DialogDescription>
                        Recommended actions to address this alert
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-3">
                      {alert.suggestedActions.map((action, index) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded">
                          <span className="text-sm">{action.action}</span>
                          <Badge variant={action.impact === 'high' ? 'default' : 
                                       action.impact === 'medium' ? 'secondary' : 'outline'}>
                            {action.impact} impact
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          )}

          <div className="flex items-center justify-between mt-4 pt-3 border-t">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              Confidence: {alert.confidence}%
            </div>
            
            {!alert.acknowledged && !alert.dismissed && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleAcknowledge(alert.id)}
              >
                <CheckCircle className="h-3 w-3 mr-1" />
                Acknowledge
              </Button>
            )}
            
            {alert.acknowledged && (
              <Badge variant="secondary">
                <CheckCircle className="h-3 w-3 mr-1" />
                Acknowledged
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header with Summary */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Predictive Alerts</h2>
          <p className="text-muted-foreground">
            AI-powered insights and early warning system
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {criticalAlerts.length > 0 && (
            <Badge variant="destructive" className="animate-pulse">
              {criticalAlerts.length} Critical
            </Badge>
          )}
          {highAlerts.length > 0 && (
            <Badge variant="secondary">
              {highAlerts.length} High Priority
            </Badge>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Alerts</p>
                <p className="text-2xl font-bold">{filteredAlerts.length}</p>
              </div>
              <Bell className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Critical</p>
                <p className="text-2xl font-bold text-red-600">{criticalAlerts.length}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Confidence</p>
                <p className="text-2xl font-bold">
                  {Math.round(filteredAlerts.reduce((acc, alert) => acc + alert.confidence, 0) / filteredAlerts.length)}%
                </p>
              </div>
              <TrendingDown className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Acknowledged</p>
                <p className="text-2xl font-bold text-green-600">
                  {alerts.filter(a => a.acknowledged).length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('all')}
        >
          All
        </Button>
        {Object.keys(ALERT_ICONS).map((type) => (
          <Button
            key={type}
            variant={filter === type ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(type as PredictiveAlert['type'])}
          >
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </Button>
        ))}
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowDismissed(!showDismissed)}
        >
          {showDismissed ? 'Hide' : 'Show'} Dismissed
        </Button>
      </div>

      {/* Alerts Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        {filteredAlerts.length > 0 ? (
          filteredAlerts.map((alert) => (
            <AlertCard key={alert.id} alert={alert} />
          ))
        ) : (
          <Card className="col-span-full">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
              <h3 className="text-lg font-semibold">No Active Alerts</h3>
              <p className="text-muted-foreground text-center">
                All projects are running smoothly. We'll notify you if any issues are detected.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};