import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Calculator, 
  Clock, 
  DollarSign, 
  TrendingUp,
  RefreshCw,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';

interface TimeEntrySummary {
  project_id: string;
  project_name: string;
  cost_code_id: string;
  cost_code: string;
  cost_code_name: string;
  total_hours: number;
  estimated_labor_rate: number;
  calculated_labor_cost: number;
  entry_count: number;
  date_range: string;
}

interface JobCostIntegrationStatus {
  project_id: string;
  project_name: string;
  time_entries_hours: number;
  job_cost_hours: number;
  hours_difference: number;
  needs_update: boolean;
  last_sync: string | null;
}

const TimeTrackingJobCostingIntegration = () => {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  
  const [timeEntrySummary, setTimeEntrySummary] = useState<TimeEntrySummary[]>([]);
  const [integrationStatus, setIntegrationStatus] = useState<JobCostIntegrationStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [selectedDateRange, setSelectedDateRange] = useState('week');

  useEffect(() => {
    if (userProfile?.company_id) {
      loadTimeTrackingData();
      loadIntegrationStatus();
    }
  }, [userProfile?.company_id, selectedDateRange]);

  const getDateFilter = () => {
    const now = new Date();
    let startDate: Date;
    
    switch (selectedDateRange) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }
    
    return startDate.toISOString();
  };

  const loadTimeTrackingData = async () => {
    try {
      const startDate = getDateFilter();
      
      const { data: timeData, error } = await supabase
        .from('time_entries')
        .select(`
          project_id,
          cost_code_id,
          total_hours,
          start_time,
          projects!inner(name),
          cost_codes(id, code, name)
        `)
        .eq('projects.company_id', userProfile?.company_id)
        .gte('start_time', startDate)
        .not('total_hours', 'is', null);

      if (error) throw error;

      // Aggregate time entries by project and cost code
      const aggregated = timeData?.reduce((acc: any[], entry: any) => {
        const key = `${entry.project_id}-${entry.cost_code_id || 'no-cost-code'}`;
        const existing = acc.find(item => item.key === key);
        
        if (existing) {
          existing.total_hours += Number(entry.total_hours) || 0;
          existing.entry_count += 1;
        } else {
          acc.push({
            key,
            project_id: entry.project_id,
            project_name: entry.projects.name,
            cost_code_id: entry.cost_code_id,
            cost_code: entry.cost_codes?.code || 'No Code',
            cost_code_name: entry.cost_codes?.name || 'Unassigned',
            total_hours: Number(entry.total_hours) || 0,
            estimated_labor_rate: 65, // Default rate - could be pulled from user profile or cost codes
            entry_count: 1
          });
        }
        
        return acc;
      }, []) || [];

      // Calculate labor costs
      const summaryWithCosts = aggregated.map(item => ({
        ...item,
        calculated_labor_cost: item.total_hours * item.estimated_labor_rate,
        date_range: selectedDateRange
      }));

      setTimeEntrySummary(summaryWithCosts);
    } catch (error) {
      console.error('Error loading time tracking data:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load time tracking data"
      });
    }
  };

  const loadIntegrationStatus = async () => {
    try {
      setLoading(true);
      const startDate = getDateFilter();

      // Get time entries summary
      const { data: timeData } = await supabase
        .from('time_entries')
        .select(`
          project_id,
          total_hours,
          projects!inner(name)
        `)
        .eq('projects.company_id', userProfile?.company_id)
        .gte('start_time', startDate)
        .not('total_hours', 'is', null);

      // Get job costs summary
      const { data: jobCostData } = await supabase
        .from('job_costs')
        .select(`
          project_id,
          labor_hours,
          updated_at,
          projects!inner(name)
        `)
        .eq('projects.company_id', userProfile?.company_id);

      // Compare and create status
      const projectTimeHours = timeData?.reduce((acc: any, entry: any) => {
        const projectId = entry.project_id;
        if (!acc[projectId]) {
          acc[projectId] = {
            project_name: entry.projects.name,
            hours: 0
          };
        }
        acc[projectId].hours += Number(entry.total_hours) || 0;
        return acc;
      }, {}) || {};

      const projectJobCostHours = jobCostData?.reduce((acc: any, cost: any) => {
        const projectId = cost.project_id;
        if (!acc[projectId]) {
          acc[projectId] = {
            project_name: cost.projects.name,
            hours: 0,
            last_sync: cost.updated_at
          };
        }
        acc[projectId].hours += Number(cost.labor_hours) || 0;
        return acc;
      }, {}) || {};

      // Create integration status
      const allProjectIds = new Set([
        ...Object.keys(projectTimeHours),
        ...Object.keys(projectJobCostHours)
      ]);

      const status: JobCostIntegrationStatus[] = Array.from(allProjectIds).map(projectId => {
        const timeHours = projectTimeHours[projectId]?.hours || 0;
        const jobCostHours = projectJobCostHours[projectId]?.hours || 0;
        const difference = Math.abs(timeHours - jobCostHours);
        
        return {
          project_id: projectId,
          project_name: projectTimeHours[projectId]?.project_name || projectJobCostHours[projectId]?.project_name || 'Unknown',
          time_entries_hours: timeHours,
          job_cost_hours: jobCostHours,
          hours_difference: difference,
          needs_update: difference > 0.1, // Consider significant if difference > 0.1 hours
          last_sync: projectJobCostHours[projectId]?.last_sync || null
        };
      });

      setIntegrationStatus(status);
    } catch (error) {
      console.error('Error loading integration status:', error);
    } finally {
      setLoading(false);
    }
  };

  const syncTimeEntriesToJobCosts = async () => {
    try {
      setSyncing(true);
      
      const startDate = getDateFilter();
      
      // Get time entries grouped by project and cost code and date
      const { data: timeEntries, error: timeError } = await supabase
        .from('time_entries')
        .select(`
          project_id,
          cost_code_id,
          total_hours,
          start_time,
          user_id,
          projects!inner(company_id)
        `)
        .eq('projects.company_id', userProfile?.company_id)
        .gte('start_time', startDate)
        .not('total_hours', 'is', null);

      if (timeError) throw timeError;

      // Group by project, cost code, and date
      const groupedEntries = timeEntries?.reduce((acc: any, entry: any) => {
        const date = entry.start_time.split('T')[0];
        const key = `${entry.project_id}-${entry.cost_code_id || 'null'}-${date}`;
        
        if (!acc[key]) {
          acc[key] = {
            project_id: entry.project_id,
            cost_code_id: entry.cost_code_id,
            date: date,
            total_hours: 0,
            labor_cost: 0
          };
        }
        
        acc[key].total_hours += Number(entry.total_hours);
        acc[key].labor_cost += Number(entry.total_hours) * 65; // Default rate
        
        return acc;
      }, {}) || {};

      // Insert or update job_costs entries
      const jobCostUpdates = Object.values(groupedEntries).map((entry: any) => ({
        project_id: entry.project_id,
        cost_code_id: entry.cost_code_id,
        date: entry.date,
        description: `Labor costs from time tracking (${entry.date})`,
        labor_hours: entry.total_hours,
        labor_cost: entry.labor_cost,
        material_cost: 0,
        equipment_cost: 0,
        other_cost: 0,
        total_cost: entry.labor_cost,
        created_by: userProfile?.id
      }));

      // Use upsert to insert or update
      for (const update of jobCostUpdates) {
        const { error: upsertError } = await supabase
          .from('job_costs')
          .upsert(update, {
            onConflict: 'project_id,cost_code_id,date',
            ignoreDuplicates: false
          });

        if (upsertError) {
          console.error('Error upserting job cost:', upsertError);
        }
      }

      toast({
        title: "Sync Complete",
        description: `Updated job costs for ${jobCostUpdates.length} entries`
      });

      // Reload data
      await loadTimeTrackingData();
      await loadIntegrationStatus();
      
    } catch (error) {
      console.error('Error syncing time entries:', error);
      toast({
        variant: "destructive",
        title: "Sync Error",
        description: "Failed to sync time entries to job costs"
      });
    } finally {
      setSyncing(false);
    }
  };

  const totalHoursTracked = timeEntrySummary.reduce((sum, item) => sum + item.total_hours, 0);
  const totalLaborCost = timeEntrySummary.reduce((sum, item) => sum + item.calculated_labor_cost, 0);
  const projectsNeedingSync = integrationStatus.filter(status => status.needs_update).length;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Time Tracking Integration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">Loading integration data...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium">Total Hours</span>
            </div>
            <div className="text-2xl font-bold">{totalHoursTracked.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">Tracked this {selectedDateRange}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium">Labor Cost</span>
            </div>
            <div className="text-2xl font-bold">${totalLaborCost.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">From time entries</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-orange-500" />
              <span className="text-sm font-medium">Sync Status</span>
            </div>
            <div className="text-2xl font-bold">{projectsNeedingSync}</div>
            <p className="text-xs text-muted-foreground">Projects need sync</p>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Time Entry to Job Costing Integration
            </div>
            <div className="flex items-center gap-2">
              <select
                value={selectedDateRange}
                onChange={(e) => setSelectedDateRange(e.target.value)}
                className="border rounded px-3 py-1 text-sm"
              >
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
              </select>
              <Button
                onClick={syncTimeEntriesToJobCosts}
                disabled={syncing || timeEntrySummary.length === 0}
                size="sm"
              >
                {syncing ? (
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Sync to Job Costs
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            This integration automatically creates job cost entries from completed time tracking data,
            ensuring your financial reports reflect actual labor costs.
          </p>
          
          {/* Integration Status */}
          <div className="space-y-3">
            <h4 className="font-medium">Project Integration Status</h4>
            {integrationStatus.map((status) => (
              <div key={status.project_id} className="flex items-center justify-between p-3 border rounded">
                <div>
                  <div className="font-medium">{status.project_name}</div>
                  <div className="text-sm text-muted-foreground">
                    Time: {status.time_entries_hours.toFixed(1)}h | Job Costs: {status.job_cost_hours.toFixed(1)}h
                    {status.hours_difference > 0.1 && (
                      <span className="text-orange-600 ml-2">
                        ({status.hours_difference.toFixed(1)}h difference)
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {status.needs_update ? (
                    <Badge variant="destructive" className="flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Needs Sync
                    </Badge>
                  ) : (
                    <Badge variant="default" className="flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Synced
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Time Entry Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Time Entry Summary by Cost Code</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {timeEntrySummary.map((summary, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded">
                <div>
                  <div className="font-medium">{summary.project_name}</div>
                  <div className="text-sm text-muted-foreground">
                    {summary.cost_code} - {summary.cost_code_name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {summary.entry_count} time entries
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold">{summary.total_hours.toFixed(1)} hours</div>
                  <div className="text-sm text-green-600">
                    ${summary.calculated_labor_cost.toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    @ ${summary.estimated_labor_rate}/hr
                  </div>
                </div>
              </div>
            ))}
            
            {timeEntrySummary.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No time entries found for the selected period.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TimeTrackingJobCostingIntegration;