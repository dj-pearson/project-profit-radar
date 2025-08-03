import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, TrendingUp, TrendingDown, Bell, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface BudgetItem {
  id: string;
  project_id: string;
  category: string;
  budgeted_amount: number;
  actual_amount: number;
  variance: number;
  variance_percentage: number;
  status: 'on_track' | 'warning' | 'overbudget';
  last_updated: string;
}

interface BudgetAlert {
  id: string;
  project_id: string;
  category: string;
  alert_type: 'warning' | 'overbudget' | 'critical';
  message: string;
  threshold_exceeded: number;
  created_at: string;
  acknowledged: boolean;
}

export default function LiveBudgetTracking() {
  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>([]);
  const [alerts, setAlerts] = useState<BudgetAlert[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBudgetData();
    loadAlerts();
    
    // Set up real-time subscriptions
    const budgetSubscription = supabase
      .channel('budget_tracking')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'budget_tracking' },
        () => loadBudgetData()
      )
      .subscribe();

    const alertsSubscription = supabase
      .channel('budget_alerts')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'budget_alerts' },
        () => loadAlerts()
      )
      .subscribe();

    return () => {
      budgetSubscription.unsubscribe();
      alertsSubscription.unsubscribe();
    };
  }, [selectedProject]);

  const loadBudgetData = async () => {
    try {
      let query = supabase
        .from('budget_tracking')
        .select('*')
        .order('last_updated', { ascending: false });

      if (selectedProject !== 'all') {
        query = query.eq('project_id', selectedProject);
      }

      const { data, error } = await query;
      if (error) throw error;

      const processedData = data?.map(item => ({
        ...item,
        variance: item.actual_amount - item.budgeted_amount,
        variance_percentage: ((item.actual_amount - item.budgeted_amount) / item.budgeted_amount) * 100,
        status: getStatusFromVariance((item.actual_amount - item.budgeted_amount) / item.budgeted_amount * 100)
      })) || [];

      setBudgetItems(processedData);
    } catch (error) {
      console.error('Error loading budget data:', error);
      toast.error('Failed to load budget data');
    }
  };

  const loadAlerts = async () => {
    try {
      let query = supabase
        .from('budget_alerts')
        .select('*')
        .eq('acknowledged', false)
        .order('created_at', { ascending: false });

      if (selectedProject !== 'all') {
        query = query.eq('project_id', selectedProject);
      }

      const { data, error } = await query;
      if (error) throw error;

      setAlerts(data || []);
    } catch (error) {
      console.error('Error loading alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusFromVariance = (percentage: number): 'on_track' | 'warning' | 'overbudget' => {
    if (percentage > 10) return 'overbudget';
    if (percentage > 5) return 'warning';
    return 'on_track';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'on_track': return 'bg-success text-success-foreground';
      case 'warning': return 'bg-warning text-warning-foreground';
      case 'overbudget': return 'bg-destructive text-destructive-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'warning': return 'bg-warning text-warning-foreground';
      case 'overbudget': return 'bg-destructive text-destructive-foreground';
      case 'critical': return 'bg-destructive text-destructive-foreground animate-pulse';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const acknowledgeAlert = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('budget_alerts')
        .update({ acknowledged: true })
        .eq('id', alertId);

      if (error) throw error;

      setAlerts(alerts.filter(alert => alert.id !== alertId));
      toast.success('Alert acknowledged');
    } catch (error) {
      console.error('Error acknowledging alert:', error);
      toast.error('Failed to acknowledge alert');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Active Alerts */}
      {alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Active Budget Alerts ({alerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {alerts.map((alert) => (
              <div key={alert.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  <div>
                    <Badge className={getAlertColor(alert.alert_type)}>
                      {alert.alert_type.toUpperCase()}
                    </Badge>
                    <p className="text-sm font-medium mt-1">{alert.category}</p>
                    <p className="text-xs text-muted-foreground">{alert.message}</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => acknowledgeAlert(alert.id)}
                >
                  Acknowledge
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Budget Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Live Budget vs. Actual Tracking
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {budgetItems.map((item) => (
              <div key={item.id} className="space-y-3 p-4 border rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">{item.category}</h3>
                    <p className="text-sm text-muted-foreground">
                      Budget: {formatCurrency(item.budgeted_amount)} | 
                      Actual: {formatCurrency(item.actual_amount)}
                    </p>
                  </div>
                  <Badge className={getStatusColor(item.status)}>
                    {item.status.replace('_', ' ').toUpperCase()}
                  </Badge>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progress</span>
                    <span>{((item.actual_amount / item.budgeted_amount) * 100).toFixed(1)}%</span>
                  </div>
                  <Progress 
                    value={Math.min((item.actual_amount / item.budgeted_amount) * 100, 100)}
                    className="w-full"
                  />
                </div>

                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    {item.variance >= 0 ? (
                      <TrendingUp className="h-4 w-4 text-destructive" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-success" />
                    )}
                    <span className={item.variance >= 0 ? 'text-destructive' : 'text-success'}>
                      {item.variance >= 0 ? '+' : ''}{formatCurrency(item.variance)}
                    </span>
                    <span className={item.variance >= 0 ? 'text-destructive' : 'text-success'}>
                      ({item.variance_percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <span className="text-muted-foreground">
                    Updated: {new Date(item.last_updated).toLocaleString()}
                  </span>
                </div>
              </div>
            ))}

            {budgetItems.length === 0 && (
              <div className="text-center py-8">
                <Eye className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No Budget Data</h3>
                <p className="text-muted-foreground">
                  Start tracking project costs to see budget vs. actual comparisons
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}