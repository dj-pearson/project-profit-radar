import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Calendar, Target } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/utils/formatters';

interface BudgetForecastProps {
  projectId?: string;
}

interface ForecastData {
  date: string;
  actual: number;
  projected: number;
  budget: number;
}

interface Project {
  id: string;
  name: string;
  budget: number;
  completion_percentage: number;
}

export const BudgetForecast: React.FC<BudgetForecastProps> = ({ projectId }) => {
  const { userProfile } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>(projectId || '');
  const [forecastData, setForecastData] = useState<ForecastData[]>([]);
  const [loading, setLoading] = useState(true);
  const [projectedCompletion, setProjectedCompletion] = useState<Date | null>(null);
  const [estimatedFinalCost, setEstimatedFinalCost] = useState<number>(0);

  useEffect(() => {
    if (userProfile?.company_id) {
      loadProjects();
    }
  }, [userProfile]);

  useEffect(() => {
    if (selectedProject) {
      generateForecast();
    }
  }, [selectedProject]);

  const loadProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, budget, completion_percentage')
        .eq('company_id', userProfile?.company_id)
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      setProjects(data || []);
      
      if (!projectId && data && data.length > 0) {
        setSelectedProject(data[0].id);
      }
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };

  const generateForecast = async () => {
    if (!selectedProject) return;
    
    setLoading(true);
    try {
      // Get project details
      const { data: project } = await supabase
        .from('projects')
        .select('*')
        .eq('id', selectedProject)
        .single();

      // Get historical cost data
      const { data: costs } = await supabase
        .from('job_costs')
        .select('created_at, labor_cost, material_cost, equipment_cost, other_cost')
        .eq('project_id', selectedProject)
        .order('created_at');

      if (!project || !costs) return;

      // Process historical data into weekly totals
      const weeklyTotals = processHistoricalData(costs);
      
      // Generate forecast based on current burn rate
      const forecast = generateProjection(weeklyTotals, project);
      
      setForecastData(forecast);
      
      // Calculate projections
      const currentSpend = weeklyTotals.reduce((sum, week) => sum + week.total, 0);
      const burnRate = calculateBurnRate(weeklyTotals);
      const remainingWork = 100 - (project.completion_percentage || 0);
      const estimatedWeeksRemaining = remainingWork / (burnRate.completionRate || 1);
      
      setEstimatedFinalCost(currentSpend + (burnRate.costRate * estimatedWeeksRemaining));
      setProjectedCompletion(new Date(Date.now() + estimatedWeeksRemaining * 7 * 24 * 60 * 60 * 1000));
      
    } catch (error) {
      console.error('Error generating forecast:', error);
    } finally {
      setLoading(false);
    }
  };

  const processHistoricalData = (costs: any[]) => {
    const weeklyData = new Map();
    
    costs.forEach(cost => {
      const weekStart = getWeekStart(new Date(cost.created_at));
      const weekKey = weekStart.toISOString().split('T')[0];
      
      const total = (cost.labor_cost || 0) + (cost.material_cost || 0) + 
                   (cost.equipment_cost || 0) + (cost.other_cost || 0);
      
      if (weeklyData.has(weekKey)) {
        weeklyData.set(weekKey, weeklyData.get(weekKey) + total);
      } else {
        weeklyData.set(weekKey, total);
      }
    });

    return Array.from(weeklyData.entries())
      .map(([date, total]) => ({ date, total }))
      .sort((a, b) => a.date.localeCompare(b.date));
  };

  const getWeekStart = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    return new Date(d.setDate(diff));
  };

  const calculateBurnRate = (weeklyData: any[]) => {
    if (weeklyData.length < 2) return { costRate: 0, completionRate: 1 };
    
    const recentWeeks = weeklyData.slice(-4); // Last 4 weeks
    const avgCostPerWeek = recentWeeks.reduce((sum, week) => sum + week.total, 0) / recentWeeks.length;
    
    return {
      costRate: avgCostPerWeek,
      completionRate: 2 // Assume 2% completion per week (adjustable)
    };
  };

  const generateProjection = (historicalData: any[], project: any) => {
    const data: ForecastData[] = [];
    let cumulativeCost = 0;
    
    // Add historical data
    historicalData.forEach(week => {
      cumulativeCost += week.total;
      data.push({
        date: week.date,
        actual: cumulativeCost,
        projected: cumulativeCost,
        budget: project.budget
      });
    });

    // Project future weeks
    const burnRate = calculateBurnRate(historicalData);
    const weeksToProject = 12; // Project 12 weeks ahead
    
    for (let i = 1; i <= weeksToProject; i++) {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + (i * 7));
      
      cumulativeCost += burnRate.costRate;
      
      data.push({
        date: futureDate.toISOString().split('T')[0],
        actual: 0, // No actual data for future
        projected: cumulativeCost,
        budget: project.budget
      });
    }

    return data;
  };

  const selectedProjectData = projects.find(p => p.id === selectedProject);

  if (loading) {
    return <div className="flex justify-center p-4">Generating forecast...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Budget Forecast
          </CardTitle>
          <CardDescription>
            Projected spending and completion timeline based on current trends
          </CardDescription>
          
          {!projectId && (
            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </CardHeader>
        
        <CardContent>
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Target className="h-4 w-4" />
                <p className="text-sm font-medium">Est. Final Cost</p>
              </div>
              <p className="text-2xl font-bold">{formatCurrency(estimatedFinalCost)}</p>
              <Badge variant={estimatedFinalCost > (selectedProjectData?.budget || 0) ? 'destructive' : 'secondary'}>
                {selectedProjectData?.budget && estimatedFinalCost > selectedProjectData.budget 
                  ? `+${formatCurrency(estimatedFinalCost - selectedProjectData.budget)} over`
                  : 'On track'
                }
              </Badge>
            </div>
            
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Calendar className="h-4 w-4" />
                <p className="text-sm font-medium">Projected Completion</p>
              </div>
              <p className="text-lg font-bold">
                {projectedCompletion?.toLocaleDateString() || 'TBD'}
              </p>
            </div>
            
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4" />
                <p className="text-sm font-medium">Budget Status</p>
              </div>
              <p className="text-lg font-bold">
                {selectedProjectData?.completion_percentage || 0}% Complete
              </p>
            </div>
          </div>

          {/* Forecast Chart */}
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={forecastData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(date) => new Date(date).toLocaleDateString()} 
                />
                <YAxis tickFormatter={(value) => formatCurrency(value)} />
                <Tooltip 
                  formatter={(value, name) => [formatCurrency(Number(value)), name]}
                  labelFormatter={(date) => new Date(date).toLocaleDateString()}
                />
                
                <ReferenceLine 
                  y={selectedProjectData?.budget || 0} 
                  stroke="#ef4444" 
                  strokeDasharray="5 5" 
                  label="Budget"
                />
                
                <Line 
                  type="monotone" 
                  dataKey="actual" 
                  stroke="#2563eb" 
                  strokeWidth={2}
                  name="Actual Costs"
                  connectNulls={false}
                />
                <Line 
                  type="monotone" 
                  dataKey="projected" 
                  stroke="#7c3aed" 
                  strokeWidth={2} 
                  strokeDasharray="5 5"
                  name="Projected Costs"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};