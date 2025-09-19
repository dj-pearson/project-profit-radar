import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  ComposedChart,
  Area,
  AreaChart
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertCircle,
  Target,
  Calendar,
  Filter,
  Download
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProjectCostData {
  id: string;
  name: string;
  budgetAmount: number;
  actualCost: number;
  variance: number;
  variancePercentage: number;
  category: string;
  startDate: string;
  endDate: string;
  status: 'planning' | 'active' | 'completed' | 'on_hold';
  phases: Array<{
    name: string;
    budget: number;
    actual: number;
    progress: number;
  }>;
}

interface CostCategoryData {
  category: string;
  budget: number;
  actual: number;
  variance: number;
  projects: number;
}

const COLORS = {
  positive: 'hsl(var(--success))',
  negative: 'hsl(var(--destructive))',
  neutral: 'hsl(var(--muted))',
  budget: 'hsl(var(--primary))',
  actual: 'hsl(var(--secondary))'
};

export const CostVarianceVisualization: React.FC = () => {
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [timeRange, setTimeRange] = useState('3m');
  const [viewType, setViewType] = useState<'overview' | 'heatmap' | 'trends'>('overview');

  const projectData: ProjectCostData[] = useMemo(() => [
    {
      id: 'proj-001',
      name: 'Kitchen Remodel - Johnson',
      budgetAmount: 45000,
      actualCost: 38500,
      variance: -6500,
      variancePercentage: -14.4,
      category: 'Residential',
      startDate: '2024-01-15',
      endDate: '2024-03-30',
      status: 'active',
      phases: [
        { name: 'Demolition', budget: 8000, actual: 7200, progress: 100 },
        { name: 'Plumbing', budget: 12000, actual: 11500, progress: 100 },
        { name: 'Electrical', budget: 9000, actual: 8800, progress: 90 },
        { name: 'Cabinets', budget: 16000, actual: 11000, progress: 70 }
      ]
    },
    {
      id: 'proj-002',
      name: 'Office Renovation - TechCorp',
      budgetAmount: 87500,
      actualCost: 92300,
      variance: 4800,
      variancePercentage: 5.5,
      category: 'Commercial',
      startDate: '2024-02-01',
      endDate: '2024-05-15',
      status: 'active',
      phases: [
        { name: 'Planning', budget: 10000, actual: 12000, progress: 100 },
        { name: 'Demolition', budget: 15000, actual: 16500, progress: 100 },
        { name: 'Construction', budget: 45000, actual: 42000, progress: 60 },
        { name: 'Finishing', budget: 17500, actual: 21800, progress: 40 }
      ]
    },
    {
      id: 'proj-003',
      name: 'Bathroom Addition - Smith',
      budgetAmount: 32000,
      actualCost: 29800,
      variance: -2200,
      variancePercentage: -6.9,
      category: 'Residential',
      startDate: '2024-01-01',
      endDate: '2024-02-28',
      status: 'completed',
      phases: [
        { name: 'Foundation', budget: 8000, actual: 7500, progress: 100 },
        { name: 'Framing', budget: 6000, actual: 5800, progress: 100 },
        { name: 'Plumbing', budget: 9000, actual: 8700, progress: 100 },
        { name: 'Finishing', budget: 9000, actual: 7800, progress: 100 }
      ]
    },
    {
      id: 'proj-004',
      name: 'Retail Fitout - Local Store',
      budgetAmount: 65000,
      actualCost: 71200,
      variance: 6200,
      variancePercentage: 9.5,
      category: 'Commercial',
      startDate: '2024-03-01',
      endDate: '2024-04-30',
      status: 'active',
      phases: [
        { name: 'Design', budget: 8000, actual: 9200, progress: 100 },
        { name: 'Electrical', budget: 18000, actual: 19500, progress: 85 },
        { name: 'Flooring', budget: 22000, actual: 24000, progress: 70 },
        { name: 'Fixtures', budget: 17000, actual: 18500, progress: 50 }
      ]
    }
  ], []);

  const categoryData: CostCategoryData[] = useMemo(() => {
    const categories = projectData.reduce((acc, project) => {
      const existing = acc.find(c => c.category === project.category);
      if (existing) {
        existing.budget += project.budgetAmount;
        existing.actual += project.actualCost;
        existing.variance += project.variance;
        existing.projects += 1;
      } else {
        acc.push({
          category: project.category,
          budget: project.budgetAmount,
          actual: project.actualCost,
          variance: project.variance,
          projects: 1
        });
      }
      return acc;
    }, [] as CostCategoryData[]);

    return categories;
  }, [projectData]);

  const getVarianceColor = (variance: number) => {
    if (variance > 1000) return 'text-red-600 bg-red-100';
    if (variance > 0) return 'text-orange-600 bg-orange-100';
    if (variance < -1000) return 'text-green-600 bg-green-100';
    return 'text-blue-600 bg-blue-100';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'active': return 'bg-blue-100 text-blue-800';
      case 'planning': return 'bg-gray-100 text-gray-800';
      case 'on_hold': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const HeatMapView: React.FC = () => {
    const heatmapData = projectData.map(project => ({
      name: project.name.split(' - ')[1] || project.name,
      variance: project.variancePercentage,
      budget: project.budgetAmount,
      category: project.category
    }));

    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Variance Heatmap</CardTitle>
              <CardDescription>
                Project performance by variance percentage
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                {heatmapData.map((item, index) => (
                  <div
                    key={index}
                    className={cn(
                      "p-3 rounded text-center text-sm font-medium transition-all hover:scale-105 cursor-pointer",
                      item.variance > 5 ? "bg-red-500 text-white" :
                      item.variance > 0 ? "bg-orange-400 text-white" :
                      item.variance > -5 ? "bg-yellow-300 text-gray-800" :
                      "bg-green-500 text-white"
                    )}
                  >
                    <div className="font-semibold">{item.name}</div>
                    <div className="text-xs mt-1">{item.variance.toFixed(1)}%</div>
                    <div className="text-xs">${(item.budget / 1000).toFixed(0)}k</div>
                  </div>
                ))}
              </div>
              
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <div className="flex items-center gap-2 text-xs">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-red-500 rounded" />
                    <span>Over Budget (&gt;5%)</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-green-500 rounded" />
                    <span>Under Budget (&lt;-5%)</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Category Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {categoryData.map((category, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <div className="font-medium">{category.category}</div>
                      <div className="text-sm text-muted-foreground">
                        {category.projects} projects
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">
                        {category.variance > 0 ? '+' : ''}${category.variance.toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {((category.variance / category.budget) * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  const TrendsView: React.FC = () => {
    const trendData = [
      { month: 'Jan', budget: 180000, actual: 172000, variance: -8000 },
      { month: 'Feb', budget: 220000, actual: 235000, variance: 15000 },
      { month: 'Mar', budget: 190000, actual: 185000, variance: -5000 },
      { month: 'Apr', budget: 150000, actual: 162000, variance: 12000 },
      { month: 'May', budget: 280000, actual: 265000, variance: -15000 },
      { month: 'Jun', budget: 320000, actual: 340000, variance: 20000 }
    ];

    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Cost Variance Trends</CardTitle>
            <CardDescription>
              Budget vs actual costs over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value, name) => [
                      new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: 'USD'
                      }).format(value as number),
                      name
                    ]}
                  />
                  <Bar dataKey="budget" fill={COLORS.budget} name="Budget" />
                  <Bar dataKey="actual" fill={COLORS.actual} name="Actual" />
                  <Line 
                    type="monotone" 
                    dataKey="variance" 
                    stroke={COLORS.negative} 
                    strokeWidth={3}
                    name="Variance"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const filteredProjects = selectedProject === 'all' 
    ? projectData 
    : projectData.filter(p => p.id === selectedProject);

  const totalBudget = filteredProjects.reduce((sum, p) => sum + p.budgetAmount, 0);
  const totalActual = filteredProjects.reduce((sum, p) => sum + p.actualCost, 0);
  const totalVariance = totalActual - totalBudget;
  const variancePercentage = (totalVariance / totalBudget) * 100;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Cost Variance Analysis</h2>
          <p className="text-muted-foreground">
            Track budget performance and identify cost trends
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {projectData.map(project => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Budget</p>
                <p className="text-2xl font-bold">
                  ${totalBudget.toLocaleString()}
                </p>
              </div>
              <Target className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Actual Cost</p>
                <p className="text-2xl font-bold">
                  ${totalActual.toLocaleString()}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Variance</p>
                <p className={cn(
                  "text-2xl font-bold",
                  totalVariance > 0 ? "text-red-600" : "text-green-600"
                )}>
                  {totalVariance > 0 ? '+' : ''}${totalVariance.toLocaleString()}
                </p>
              </div>
              {totalVariance > 0 ? 
                <TrendingUp className="h-8 w-8 text-red-600" /> :
                <TrendingDown className="h-8 w-8 text-green-600" />
              }
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Variance %</p>
                <p className={cn(
                  "text-2xl font-bold",
                  variancePercentage > 0 ? "text-red-600" : "text-green-600"
                )}>
                  {variancePercentage > 0 ? '+' : ''}{variancePercentage.toFixed(1)}%
                </p>
              </div>
              <AlertCircle className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={viewType} onValueChange={(value) => setViewType(value as any)}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="heatmap">Heat Map</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Project Cards */}
          <div className="grid gap-4 md:grid-cols-2">
            {filteredProjects.map((project) => (
              <Card key={project.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{project.name}</CardTitle>
                    <Badge className={getStatusColor(project.status)}>
                      {project.status}
                    </Badge>
                  </div>
                  <CardDescription>{project.category}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span>Budget</span>
                      <span className="font-medium">${project.budgetAmount.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>Actual</span>
                      <span className="font-medium">${project.actualCost.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>Variance</span>
                      <Badge className={getVarianceColor(project.variance)}>
                        {project.variance > 0 ? '+' : ''}${project.variance.toLocaleString()}
                        ({project.variancePercentage.toFixed(1)}%)
                      </Badge>
                    </div>

                    {/* Phase Breakdown */}
                    <div className="pt-3 border-t">
                      <p className="text-xs font-medium mb-2">Phase Progress</p>
                      <div className="space-y-2">
                        {project.phases.slice(0, 3).map((phase, index) => (
                          <div key={index} className="flex items-center justify-between text-xs">
                            <span>{phase.name}</span>
                            <div className="flex items-center gap-2">
                              <Progress value={phase.progress} className="w-12 h-1" />
                              <span>{phase.progress}%</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="heatmap">
          <HeatMapView />
        </TabsContent>

        <TabsContent value="trends">
          <TrendsView />
        </TabsContent>
      </Tabs>
    </div>
  );
};