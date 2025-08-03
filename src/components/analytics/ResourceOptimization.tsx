import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, BarChart, Bar, ScatterChart, Scatter } from 'recharts';
import { 
  Zap, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  Settings,
  Play,
  Users,
  Wrench,
  TrendingUp,
  Calendar,
  Target,
  Activity
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface OptimizationConfig {
  id?: string;
  company_id?: string;
  optimization_strategy: string;
  max_crew_utilization: number;
  max_equipment_utilization: number;
  prefer_dedicated_crews: boolean;
  allow_overtime: boolean;
  max_overtime_hours: number;
  travel_time_factor: number;
  skill_matching_weight: number;
  availability_weight: number;
  cost_weight: number;
  priority_weight: number;
  weather_consideration: boolean;
  auto_reschedule: boolean;
  notification_enabled: boolean;
  created_at?: string;
  updated_at?: string;
}

interface OptimizationRun {
  id: string;
  company_id: string;
  status: string;
  started_at: string;
  completed_at?: string;
  total_resources_analyzed: number;
  conflicts_detected: number;
  conflicts_resolved: number;
  efficiency_improvement_percentage: number;
  cost_savings_estimated: number;
  recommendations: any;
  optimization_data?: any;
  ai_model_used?: string;
  run_type?: string;
  optimization_scope?: string;
  scope_id?: string;
  date_range_start?: string;
  date_range_end?: string;
  processing_time_seconds?: number;
  error_message?: string;
  created_by?: string;
  created_at?: string;
}

interface ResourceConflict {
  id: string;
  conflict_type: string;
  severity: string;
  resource_type: string;
  status: string;
  conflict_start_datetime: string;
  conflict_end_datetime: string;
  overlap_duration_minutes: number;
  auto_resolvable: boolean;
}

const ResourceOptimization = () => {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [config, setConfig] = useState<OptimizationConfig>({
    optimization_strategy: 'balanced',
    max_crew_utilization: 85,
    max_equipment_utilization: 90,
    prefer_dedicated_crews: true,
    allow_overtime: true,
    max_overtime_hours: 10,
    travel_time_factor: 1.5,
    skill_matching_weight: 0.7,
    availability_weight: 0.8,
    cost_weight: 0.6,
    priority_weight: 0.9,
    weather_consideration: true,
    auto_reschedule: false,
    notification_enabled: true
  });
  const [runs, setRuns] = useState<OptimizationRun[]>([]);
  const [conflicts, setConflicts] = useState<ResourceConflict[]>([]);
  const [dateRange, setDateRange] = useState({
    start: new Date().toISOString().split('T')[0],
    end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  });

  useEffect(() => {
    if (userProfile?.company_id) {
      loadData();
    }
  }, [userProfile]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [configResult, runsResult, conflictsResult] = await Promise.all([
        supabase.from('resource_optimization_configs')
          .select('*')
          .eq('company_id', userProfile?.company_id)
          .maybeSingle(),
        supabase.from('resource_optimization_runs')
          .select('*')
          .eq('company_id', userProfile?.company_id)
          .order('created_at', { ascending: false })
          .limit(10),
        supabase.from('resource_conflicts')
          .select('*')
          .eq('company_id', userProfile?.company_id)
          .eq('status', 'detected')
          .order('severity', { ascending: false })
      ]);

      if (configResult.data) {
        setConfig(configResult.data);
      }
      
      setRuns(runsResult.data || []);
      setConflicts(conflictsResult.data || []);
    } catch (error: any) {
      console.error('Error loading data:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load optimization data"
      });
    } finally {
      setLoading(false);
    }
  };

  const runOptimization = async () => {
    setOptimizing(true);
    try {
      const { data, error } = await supabase.functions.invoke('optimize-resources', {
        body: {
          company_id: userProfile?.company_id,
          optimization_scope: 'company',
          date_range_start: dateRange.start,
          date_range_end: dateRange.end,
          config_id: config.id
        }
      });

      if (error) throw error;

      toast({
        title: "Optimization Complete",
        description: `Found ${data.optimizations?.length || 0} optimization opportunities with estimated savings of $${data.summary?.estimated_cost_savings?.toLocaleString() || 0}`
      });

      loadData(); // Refresh data
    } catch (error: any) {
      console.error('Error running optimization:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to run resource optimization"
      });
    } finally {
      setOptimizing(false);
    }
  };

  const saveConfig = async () => {
    try {
      const { error } = await supabase.from('resource_optimization_configs')
        .upsert({
          ...config,
          company_id: userProfile?.company_id,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      toast({
        title: "Settings Saved",
        description: "Optimization configuration updated successfully"
      });
    } catch (error: any) {
      console.error('Error saving config:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save configuration"
      });
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-700 bg-red-50 border-red-200';
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-50 border-green-200';
      case 'running': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'failed': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const chartConfig = {
    efficiency: {
      label: "Efficiency",
      color: "hsl(var(--chart-1))",
    },
    savings: {
      label: "Savings", 
      color: "hsl(var(--chart-2))",
    },
    conflicts: {
      label: "Conflicts",
      color: "hsl(var(--chart-3))",
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Zap className="h-6 w-6 text-primary" />
          <div>
            <h2 className="text-2xl font-bold">Resource Optimization</h2>
            <p className="text-muted-foreground">AI-powered crew and equipment scheduling</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={loadData} disabled={loading}>
            <Activity className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={runOptimization} disabled={optimizing} className="bg-primary">
            <Play className="h-4 w-4 mr-2" />
            {optimizing ? 'Optimizing...' : 'Run Optimization'}
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Active Conflicts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{conflicts.length}</div>
            <p className="text-sm text-muted-foreground">Scheduling conflicts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              Avg Efficiency Gain
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {runs.length > 0 ? 
                Math.round(runs.reduce((sum, run) => sum + run.efficiency_improvement_percentage, 0) / runs.length) 
                : 0}%
            </div>
            <p className="text-sm text-muted-foreground">Last 10 runs</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-600" />
              Total Savings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              ${runs.reduce((sum, run) => sum + run.cost_savings_estimated, 0).toLocaleString()}
            </div>
            <p className="text-sm text-muted-foreground">Estimated savings</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Success Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {runs.length > 0 ? 
                Math.round((runs.filter(r => r.status === 'completed').length / runs.length) * 100) 
                : 0}%
            </div>
            <p className="text-sm text-muted-foreground">Optimization success</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="optimize" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="optimize">Run Optimization</TabsTrigger>
          <TabsTrigger value="conflicts">Conflicts</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="optimize" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Optimization Parameters</CardTitle>
              <CardDescription>Configure the date range and scope for optimization</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start-date">Start Date</Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="end-date">End Date</Label>
                  <Input
                    id="end-date"
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="strategy">Optimization Strategy</Label>
                <Select value={config.optimization_strategy} onValueChange={(value: any) => setConfig(prev => ({ ...prev, optimization_strategy: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select strategy" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="efficiency">Maximize Efficiency</SelectItem>
                    <SelectItem value="cost">Minimize Cost</SelectItem>
                    <SelectItem value="balanced">Balanced Approach</SelectItem>
                    <SelectItem value="deadline">Meet Deadlines</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={runOptimization} disabled={optimizing} className="w-full">
                <Play className="h-4 w-4 mr-2" />
                {optimizing ? 'Running Optimization...' : 'Start Optimization'}
              </Button>
            </CardContent>
          </Card>

          {runs.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Optimization Performance Trends</CardTitle>
                <CardDescription>Efficiency improvements and cost savings over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[300px]">
                  <LineChart data={runs.slice(0, 10).reverse()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="started_at" 
                      tickFormatter={(value) => new Date(value).toLocaleDateString()} 
                    />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="efficiency_improvement_percentage"
                      stroke="var(--color-efficiency)"
                      strokeWidth={2}
                      name="Efficiency Gain %"
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="cost_savings_estimated"
                      stroke="var(--color-savings)"
                      strokeWidth={2}
                      name="Cost Savings $"
                    />
                  </LineChart>
                </ChartContainer>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="conflicts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Resource Conflicts</CardTitle>
              <CardDescription>Detected scheduling conflicts requiring attention</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {conflicts.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-green-700">No Conflicts Detected</h3>
                    <p className="text-muted-foreground">All resources are optimally scheduled</p>
                  </div>
                ) : (
                  conflicts.map((conflict) => (
                    <div key={conflict.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-medium capitalize">{conflict.conflict_type.replace('_', ' ')}</h4>
                          <Badge className={getSeverityColor(conflict.severity)}>
                            {conflict.severity.toUpperCase()}
                          </Badge>
                          {conflict.auto_resolvable && (
                            <Badge variant="secondary">Auto-Resolvable</Badge>
                          )}
                        </div>
                        <div className="mt-2 text-sm text-muted-foreground">
                          <p>Resource: {conflict.resource_type}</p>
                          <p>Duration: {conflict.overlap_duration_minutes} minutes</p>
                          <p>Period: {new Date(conflict.conflict_start_datetime).toLocaleString()} - {new Date(conflict.conflict_end_datetime).toLocaleString()}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button variant="outline" size="sm">
                          Resolve
                        </Button>
                        <Button variant="ghost" size="sm">
                          Details
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Optimization History</CardTitle>
              <CardDescription>Previous optimization runs and their results</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {runs.map((run) => (
                  <div key={run.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-medium">
                          Optimization Run - {new Date(run.started_at).toLocaleDateString()}
                        </h4>
                        <Badge className={getStatusColor(run.status)}>
                          {run.status.toUpperCase()}
                        </Badge>
                      </div>
                      <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Resources: </span>
                          {run.total_resources_analyzed}
                        </div>
                        <div>
                          <span className="text-muted-foreground">Efficiency Gain: </span>
                          {run.efficiency_improvement_percentage.toFixed(1)}%
                        </div>
                        <div>
                          <span className="text-muted-foreground">Cost Savings: </span>
                          ${run.cost_savings_estimated.toLocaleString()}
                        </div>
                        <div>
                          <span className="text-muted-foreground">Conflicts: </span>
                          {run.conflicts_resolved}/{run.conflicts_detected}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
                      <Button variant="ghost" size="sm">
                        Apply
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Optimization Configuration
              </CardTitle>
              <CardDescription>Configure how the AI optimizes your resources</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="max-crew-util">Max Crew Utilization (%)</Label>
                    <Input
                      id="max-crew-util"
                      type="number"
                      min="0"
                      max="100"
                      value={config.max_crew_utilization}
                      onChange={(e) => setConfig(prev => ({ ...prev, max_crew_utilization: parseFloat(e.target.value) }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="max-equipment-util">Max Equipment Utilization (%)</Label>
                    <Input
                      id="max-equipment-util"
                      type="number"
                      min="0"
                      max="100"
                      value={config.max_equipment_utilization}
                      onChange={(e) => setConfig(prev => ({ ...prev, max_equipment_utilization: parseFloat(e.target.value) }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="max-overtime">Max Overtime Hours</Label>
                    <Input
                      id="max-overtime"
                      type="number"
                      min="0"
                      max="20"
                      value={config.max_overtime_hours}
                      onChange={(e) => setConfig(prev => ({ ...prev, max_overtime_hours: parseInt(e.target.value) }))}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="travel-factor">Travel Time Factor</Label>
                    <Input
                      id="travel-factor"
                      type="number"
                      min="1"
                      max="3"
                      step="0.1"
                      value={config.travel_time_factor}
                      onChange={(e) => setConfig(prev => ({ ...prev, travel_time_factor: parseFloat(e.target.value) }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="skill-weight">Skill Matching Weight</Label>
                    <Input
                      id="skill-weight"
                      type="number"
                      min="0"
                      max="1"
                      step="0.1"
                      value={config.skill_matching_weight}
                      onChange={(e) => setConfig(prev => ({ ...prev, skill_matching_weight: parseFloat(e.target.value) }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="cost-weight">Cost Weight</Label>
                    <Input
                      id="cost-weight"
                      type="number"
                      min="0"
                      max="1"
                      step="0.1"
                      value={config.cost_weight}
                      onChange={(e) => setConfig(prev => ({ ...prev, cost_weight: parseFloat(e.target.value) }))}
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <Button onClick={saveConfig}>
                  Save Configuration
                </Button>
                <Button variant="outline" onClick={loadData}>
                  Reset to Default
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ResourceOptimization;