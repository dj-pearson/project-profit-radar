import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line } from 'recharts';
import { 
  Clock, 
  Zap,
  TrendingUp, 
  Calendar,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  Shuffle,
  Target,
  Lightbulb
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface OptimizationMetrics {
  currentSchedule: Array<{
    projectId: string;
    projectName: string;
    startDate: string;
    endDate: string;
    duration: number;
    criticalPath: boolean;
    dependencies: string[];
    resourceRequirements: Array<{
      type: string;
      amount: number;
      period: string;
    }>;
  }>;
  optimizedSchedule: Array<{
    projectId: string;
    projectName: string;
    originalStartDate: string;
    optimizedStartDate: string;
    originalEndDate: string;
    optimizedEndDate: string;
    timeSaved: number;
    resourceEfficiency: number;
    optimization_type: string;
  }>;
  resourceOptimization: Array<{
    period: string;
    currentUtilization: number;
    optimizedUtilization: number;
    efficiency_gain: number;
    bottlenecks: string[];
  }>;
  criticalPathAnalysis: Array<{
    projectId: string;
    projectName: string;
    criticalTasks: Array<{
      taskName: string;
      duration: number;
      slack: number;
      impact: number;
    }>;
    totalDuration: number;
    optimization_potential: number;
  }>;
  recommendations: Array<{
    type: 'schedule' | 'resource' | 'dependency' | 'critical_path';
    priority: 'low' | 'medium' | 'high';
    title: string;
    description: string;
    impact: string;
    effort: string;
    timeframe: string;
  }>;
}

const TimelineOptimization = () => {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [optimizationData, setOptimizationData] = useState<OptimizationMetrics | null>(null);

  useEffect(() => {
    if (userProfile?.company_id) {
      loadTimelineOptimization();
    }
  }, [userProfile]);

  const loadTimelineOptimization = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-timeline-optimization', {
        body: { company_id: userProfile?.company_id }
      });

      if (error) throw error;
      setOptimizationData(data);
    } catch (error: any) {
      console.error('Error loading timeline optimization:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load timeline optimization"
      });
    } finally {
      setLoading(false);
    }
  };

  const applyOptimizations = async () => {
    setOptimizing(true);
    try {
      const { error } = await supabase.functions.invoke('apply-timeline-optimization', {
        body: { 
          company_id: userProfile?.company_id,
          optimizations: optimizationData?.optimizedSchedule 
        }
      });

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Timeline optimizations have been applied to your projects"
      });
      
      loadTimelineOptimization(); // Refresh data
    } catch (error: any) {
      console.error('Error applying optimizations:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to apply timeline optimizations"
      });
    } finally {
      setOptimizing(false);
    }
  };

  const getOptimizationColor = (type: string) => {
    switch (type) {
      case 'schedule': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'resource': return 'bg-green-100 text-green-800 border-green-200';
      case 'dependency': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'critical_path': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const chartConfig = {
    current: {
      label: "Current",
      color: "hsl(var(--chart-1))",
    },
    optimized: {
      label: "Optimized",
      color: "hsl(var(--chart-2))",
    },
    efficiency: {
      label: "Efficiency",
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

  const totalTimeSaved = optimizationData?.optimizedSchedule.reduce((sum, proj) => sum + proj.timeSaved, 0) || 0;
  const avgEfficiencyGain = optimizationData?.resourceOptimization.reduce((sum, period) => sum + period.efficiency_gain, 0) / (optimizationData?.resourceOptimization.length || 1) || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Zap className="h-6 w-6 text-primary" />
          <div>
            <h2 className="text-2xl font-bold">Timeline Optimization</h2>
            <p className="text-muted-foreground">AI-powered schedule optimization and resource allocation</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={loadTimelineOptimization} disabled={loading}>
            <Shuffle className="h-4 w-4 mr-2" />
            Re-optimize
          </Button>
          <Button onClick={applyOptimizations} disabled={optimizing || !optimizationData}>
            <CheckCircle className="h-4 w-4 mr-2" />
            {optimizing ? 'Applying...' : 'Apply Optimizations'}
          </Button>
        </div>
      </div>

      {/* Optimization Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600" />
              Time Saved
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{totalTimeSaved}</div>
            <p className="text-sm text-muted-foreground">Days across all projects</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              Efficiency Gain
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{avgEfficiencyGain.toFixed(1)}%</div>
            <p className="text-sm text-muted-foreground">Resource utilization</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-orange-600" />
              Projects Optimized
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {optimizationData?.optimizedSchedule.length || 0}
            </div>
            <p className="text-sm text-muted-foreground">Out of {optimizationData?.currentSchedule.length || 0} total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-purple-600" />
              Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {optimizationData?.recommendations.length || 0}
            </div>
            <p className="text-sm text-muted-foreground">Optimization opportunities</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="schedule" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="schedule">Schedule Changes</TabsTrigger>
          <TabsTrigger value="resources">Resource Optimization</TabsTrigger>
          <TabsTrigger value="critical">Critical Path</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
        </TabsList>

        <TabsContent value="schedule" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Optimized Project Schedule</CardTitle>
              <CardDescription>Comparison of current vs optimized project timelines</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {optimizationData?.optimizedSchedule.map((project) => (
                  <div key={project.projectId} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-medium">{project.projectName}</h4>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline">
                          {project.optimization_type}
                        </Badge>
                        {project.timeSaved > 0 && (
                          <Badge className="bg-green-100 text-green-800">
                            -{project.timeSaved} days
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <h5 className="font-medium text-sm text-muted-foreground">Current Schedule</h5>
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">
                            {new Date(project.originalStartDate).toLocaleDateString()} → {new Date(project.originalEndDate).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <h5 className="font-medium text-sm text-green-600">Optimized Schedule</h5>
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4 text-green-600" />
                          <span className="text-sm">
                            {new Date(project.optimizedStartDate).toLocaleDateString()} → {new Date(project.optimizedEndDate).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-green-600">
                          <TrendingUp className="h-4 w-4" />
                          <span>{project.resourceEfficiency.toFixed(1)}% efficiency improvement</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Timeline Comparison</CardTitle>
              <CardDescription>Visual comparison of project durations before and after optimization</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[400px]">
                <BarChart data={optimizationData?.optimizedSchedule.map(proj => ({
                  name: proj.projectName.substring(0, 20) + (proj.projectName.length > 20 ? '...' : ''),
                  original: Math.ceil((new Date(proj.originalEndDate).getTime() - new Date(proj.originalStartDate).getTime()) / (1000 * 60 * 60 * 24)),
                  optimized: Math.ceil((new Date(proj.optimizedEndDate).getTime() - new Date(proj.optimizedStartDate).getTime()) / (1000 * 60 * 60 * 24))
                })) || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <ChartTooltip 
                    content={<ChartTooltipContent />}
                    formatter={(value, name) => [`${value} days`, name === 'original' ? 'Original Duration' : 'Optimized Duration']}
                  />
                  <Bar dataKey="original" fill="var(--color-current)" name="Original" />
                  <Bar dataKey="optimized" fill="var(--color-optimized)" name="Optimized" />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="resources" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Resource Utilization Optimization</CardTitle>
              <CardDescription>Current vs optimized resource allocation over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[400px]">
                <LineChart data={optimizationData?.resourceOptimization || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis />
                  <ChartTooltip 
                    content={<ChartTooltipContent />}
                    formatter={(value, name) => [`${Number(value).toFixed(1)}%`, name]}
                  />
                  <Line
                    type="monotone"
                    dataKey="currentUtilization"
                    stroke="var(--color-current)"
                    strokeWidth={2}
                    name="Current Utilization"
                  />
                  <Line
                    type="monotone"
                    dataKey="optimizedUtilization"
                    stroke="var(--color-optimized)"
                    strokeWidth={2}
                    name="Optimized Utilization"
                  />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Resource Bottlenecks</CardTitle>
              <CardDescription>Identified constraints and efficiency opportunities</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {optimizationData?.resourceOptimization.map((period, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium">{period.period}</h4>
                      <Badge className="bg-green-100 text-green-800">
                        +{period.efficiency_gain.toFixed(1)}% efficiency
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h5 className="font-medium text-sm mb-2">Utilization</h5>
                        <div className="flex items-center space-x-4">
                          <div className="text-sm">
                            <span className="text-muted-foreground">Current:</span> {period.currentUtilization.toFixed(1)}%
                          </div>
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                          <div className="text-sm">
                            <span className="text-green-600">Optimized:</span> {period.optimizedUtilization.toFixed(1)}%
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <h5 className="font-medium text-sm mb-2">Bottlenecks</h5>
                        <div className="flex flex-wrap gap-1">
                          {period.bottlenecks.map((bottleneck, bIndex) => (
                            <Badge key={bIndex} variant="outline" className="text-xs">
                              {bottleneck}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="critical" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Critical Path Analysis</CardTitle>
              <CardDescription>Tasks that directly impact project completion dates</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {optimizationData?.criticalPathAnalysis.map((project) => (
                  <div key={project.projectId} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-medium">{project.projectName}</h4>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline">
                          {project.totalDuration} days total
                        </Badge>
                        <Badge className="bg-blue-100 text-blue-800">
                          {project.optimization_potential} days optimizable
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <h5 className="font-medium text-sm">Critical Tasks</h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {project.criticalTasks.map((task, index) => (
                          <div key={index} className="border rounded p-3">
                            <div className="flex items-center justify-between mb-2">
                              <h6 className="font-medium text-sm">{task.taskName}</h6>
                              {task.slack === 0 && (
                                <AlertCircle className="h-4 w-4 text-red-500" />
                              )}
                            </div>
                            <div className="space-y-1 text-xs text-muted-foreground">
                              <div>Duration: {task.duration} days</div>
                              <div>Slack: {task.slack} days</div>
                              <div>Impact Score: {task.impact}/10</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-6">
          <div className="grid grid-cols-1 gap-4">
            {optimizationData?.recommendations.map((rec, index) => (
              <Card key={index} className="border-l-4 border-l-primary">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge className={getOptimizationColor(rec.type)}>
                        {rec.type.replace('_', ' ').toUpperCase()}
                      </Badge>
                      <span>{rec.title}</span>
                    </div>
                    <Badge variant={
                      rec.priority === 'high' ? 'destructive' :
                      rec.priority === 'medium' ? 'secondary' : 'outline'
                    }>
                      {rec.priority.toUpperCase()} PRIORITY
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">{rec.description}</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <h6 className="font-medium mb-1">Expected Impact</h6>
                      <p className="text-muted-foreground">{rec.impact}</p>
                    </div>
                    <div>
                      <h6 className="font-medium mb-1">Implementation Effort</h6>
                      <p className="text-muted-foreground">{rec.effort}</p>
                    </div>
                    <div>
                      <h6 className="font-medium mb-1">Timeframe</h6>
                      <p className="text-muted-foreground">{rec.timeframe}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TimelineOptimization;