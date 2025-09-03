import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface CostAlert {
  id: string;
  project_name: string;
  budget: number;
  actual_cost: number;
  variance_percentage: number;
  alert_type: 'warning' | 'critical';
  created_at: string;
}

const CostVarianceAlerts = () => {
  const { userProfile } = useAuth();
  const [alerts, setAlerts] = useState<CostAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userProfile?.company_id) {
      loadCostAlerts();
      // Set up real-time monitoring
      const interval = setInterval(checkCostVariances, 30000); // Check every 30 seconds
      return () => clearInterval(interval);
    }
  }, [userProfile?.company_id]);

  const loadCostAlerts = async () => {
    try {
      const { data: projects, error } = await supabase
        .from('projects')
        .select(`
          id, name, budget,
          job_costs(labor_cost, material_cost, equipment_cost, other_cost)
        `)
        .eq('company_id', userProfile?.company_id)
        .not('budget', 'is', null);

      if (error) throw error;

      const alertsData: CostAlert[] = [];
      
      projects?.forEach(project => {
        const totalCost = project.job_costs?.reduce((sum: number, cost: any) => 
          sum + (cost.labor_cost || 0) + (cost.material_cost || 0) + 
          (cost.equipment_cost || 0) + (cost.other_cost || 0), 0) || 0;

        const variance = ((totalCost - project.budget) / project.budget) * 100;
        
        if (variance > 10) { // Alert if over 10% budget
          alertsData.push({
            id: project.id,
            project_name: project.name,
            budget: project.budget,
            actual_cost: totalCost,
            variance_percentage: variance,
            alert_type: variance > 25 ? 'critical' : 'warning',
            created_at: new Date().toISOString()
          });
        }
      });

      setAlerts(alertsData);
    } catch (error: any) {
      console.error('Error loading cost alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkCostVariances = async () => {
    // Real-time monitoring function
    await loadCostAlerts();
  };

  const dismissAlert = (alertId: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== alertId));
    toast({
      title: "Alert Dismissed",
      description: "Cost variance alert has been acknowledged."
    });
  };

  if (loading) {
    return <div className="animate-pulse bg-muted h-32 rounded-lg"></div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-construction-orange" />
          Cost Variance Alerts
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {alerts.length === 0 ? (
          <Alert>
            <DollarSign className="h-4 w-4" />
            <AlertDescription>
              All projects are within budget parameters. Great job!
            </AlertDescription>
          </Alert>
        ) : (
          alerts.map(alert => (
            <Alert key={alert.id} variant={alert.alert_type === 'critical' ? 'destructive' : 'default'}>
              <div className="flex items-start justify-between w-full">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="font-semibold">{alert.project_name}</span>
                    <Badge variant={alert.alert_type === 'critical' ? 'destructive' : 'secondary'}>
                      {alert.variance_percentage > 0 ? (
                        <TrendingUp className="h-3 w-3 mr-1" />
                      ) : (
                        <TrendingDown className="h-3 w-3 mr-1" />
                      )}
                      {Math.abs(alert.variance_percentage).toFixed(1)}% over budget
                    </Badge>
                  </div>
                  <AlertDescription>
                    Budget: ${alert.budget.toLocaleString()} | 
                    Actual: ${alert.actual_cost.toLocaleString()} | 
                    Overage: ${(alert.actual_cost - alert.budget).toLocaleString()}
                  </AlertDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => dismissAlert(alert.id)}
                >
                  Dismiss
                </Button>
              </div>
            </Alert>
          ))
        )}
      </CardContent>
    </Card>
  );
};

export default CostVarianceAlerts;