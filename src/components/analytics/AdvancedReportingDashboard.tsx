import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter, RadarChart, 
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Area, AreaChart 
} from 'recharts';
import { 
  TrendingUp, TrendingDown, DollarSign, Clock, Users, AlertTriangle, 
  Target, Calendar, Download, Filter, RefreshCw, BarChart3, PieChart as PieChartIcon,
  Activity, Zap, Award, Shield
} from 'lucide-react';

interface ProjectMetrics {
  id: string;
  name: string;
  budget: number;
  spent: number;
  progress: number;
  daysRemaining: number;
  profitMargin: number;
  riskLevel: 'low' | 'medium' | 'high';
  teamSize: number;
}

interface FinancialData {
  month: string;
  revenue: number;
  costs: number;
  profit: number;
  margin: number;
}

interface ProductivityMetrics {
  category: string;
  planned: number;
  actual: number;
  efficiency: number;
}

interface SafetyMetrics {
  month: string;
  incidents: number;
  nearMisses: number;
  trainingHours: number;
  complianceScore: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

export const AdvancedReportingDashboard = () => {
  const [dateRange, setDateRange] = useState('30d');
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [reportType, setReportType] = useState('overview');
  const [isLoading, setIsLoading] = useState(false);
  const [projectMetrics, setProjectMetrics] = useState<ProjectMetrics[]>([]);
  const [financialData, setFinancialData] = useState<FinancialData[]>([]);
  const [productivityData, setProductivityData] = useState<ProductivityMetrics[]>([]);
  const [safetyData, setSafetyData] = useState<SafetyMetrics[]>([]);
  const { userProfile } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    loadDashboardData();
  }, [dateRange, selectedProjects]);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      
      // Generate mock data for demonstration
      await generateMockData();
      
      toast({
        title: "Dashboard Updated",
        description: "Analytics data has been refreshed",
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast({
        title: "Loading Error",
        description: "Failed to load dashboard data",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const generateMockData = async () => {
    // Mock project metrics
    const mockProjects: ProjectMetrics[] = [
      {
        id: '1',
        name: 'Downtown Office Complex',
        budget: 2500000,
        spent: 1875000,
        progress: 75,
        daysRemaining: 45,
        profitMargin: 12.5,
        riskLevel: 'medium',
        teamSize: 24
      },
      {
        id: '2',
        name: 'Residential Development',
        budget: 3200000,
        spent: 2240000,
        progress: 70,
        daysRemaining: 60,
        profitMargin: 18.2,
        riskLevel: 'low',
        teamSize: 32
      },
      {
        id: '3',
        name: 'Infrastructure Upgrade',
        budget: 1800000,
        spent: 1620000,
        progress: 90,
        daysRemaining: 15,
        profitMargin: 8.7,
        riskLevel: 'high',
        teamSize: 18
      }
    ];

    // Mock financial data
    const mockFinancial: FinancialData[] = [
      { month: 'Jan', revenue: 850000, costs: 680000, profit: 170000, margin: 20 },
      { month: 'Feb', revenue: 920000, costs: 736000, profit: 184000, margin: 20 },
      { month: 'Mar', revenue: 1100000, costs: 825000, profit: 275000, margin: 25 },
      { month: 'Apr', revenue: 980000, costs: 784000, profit: 196000, margin: 20 },
      { month: 'May', revenue: 1250000, costs: 937500, profit: 312500, margin: 25 },
      { month: 'Jun', revenue: 1180000, costs: 944000, profit: 236000, margin: 20 }
    ];

    // Mock productivity data
    const mockProductivity: ProductivityMetrics[] = [
      { category: 'Foundation', planned: 100, actual: 95, efficiency: 95 },
      { category: 'Framing', planned: 100, actual: 108, efficiency: 108 },
      { category: 'Electrical', planned: 100, actual: 92, efficiency: 92 },
      { category: 'Plumbing', planned: 100, actual: 88, efficiency: 88 },
      { category: 'Finishing', planned: 100, actual: 98, efficiency: 98 }
    ];

    // Mock safety data
    const mockSafety: SafetyMetrics[] = [
      { month: 'Jan', incidents: 2, nearMisses: 8, trainingHours: 120, complianceScore: 92 },
      { month: 'Feb', incidents: 1, nearMisses: 5, trainingHours: 140, complianceScore: 95 },
      { month: 'Mar', incidents: 0, nearMisses: 3, trainingHours: 160, complianceScore: 98 },
      { month: 'Apr', incidents: 1, nearMisses: 4, trainingHours: 180, complianceScore: 96 },
      { month: 'May', incidents: 0, nearMisses: 2, trainingHours: 200, complianceScore: 99 },
      { month: 'Jun', incidents: 0, nearMisses: 1, trainingHours: 220, complianceScore: 100 }
    ];

    setProjectMetrics(mockProjects);
    setFinancialData(mockFinancial);
    setProductivityData(mockProductivity);
    setSafetyData(mockSafety);
  };

  const exportReport = async () => {
    try {
      toast({
        title: "Exporting Report",
        description: "Preparing your analytics report...",
      });

      // Simulate export delay
      setTimeout(() => {
        toast({
          title: "Report Ready",
          description: "Your analytics report has been generated",
        });
      }, 2000);
    } catch (error) {
      toast({
        title: "Export Error",
        description: "Failed to export report",
        variant: "destructive"
      });
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'low': return 'bg-green-500';
      case 'medium': return 'bg-yellow-500';
      case 'high': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(value);
  };

  const calculateKPIs = () => {
    const totalBudget = projectMetrics.reduce((sum, p) => sum + p.budget, 0);
    const totalSpent = projectMetrics.reduce((sum, p) => sum + p.spent, 0);
    const avgProgress = projectMetrics.reduce((sum, p) => sum + p.progress, 0) / projectMetrics.length || 0;
    const avgMargin = projectMetrics.reduce((sum, p) => sum + p.profitMargin, 0) / projectMetrics.length || 0;
    const totalTeamSize = projectMetrics.reduce((sum, p) => sum + p.teamSize, 0);
    const highRiskProjects = projectMetrics.filter(p => p.riskLevel === 'high').length;

    return {
      totalBudget,
      totalSpent,
      avgProgress,
      avgMargin,
      totalTeamSize,
      highRiskProjects,
      budgetUtilization: (totalSpent / totalBudget) * 100
    };
  };

  const kpis = calculateKPIs();

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Advanced Analytics Dashboard
              </CardTitle>
              <CardDescription>
                Comprehensive insights and reporting for construction operations
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                  <SelectItem value="90d">Last 90 days</SelectItem>
                  <SelectItem value="1y">Last year</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={loadDashboardData} disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button onClick={exportReport}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Budget</p>
                <p className="text-3xl font-bold">{formatCurrency(kpis.totalBudget)}</p>
                <p className="text-sm text-muted-foreground">
                  {kpis.budgetUtilization.toFixed(1)}% utilized
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Progress</p>
                <p className="text-3xl font-bold">{kpis.avgProgress.toFixed(1)}%</p>
                <Progress value={kpis.avgProgress} className="mt-2" />
              </div>
              <Target className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Profit Margin</p>
                <p className="text-3xl font-bold">{kpis.avgMargin.toFixed(1)}%</p>
                <div className="flex items-center mt-1">
                  <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                  <span className="text-sm text-green-500">+2.3%</span>
                </div>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Risk Projects</p>
                <p className="text-3xl font-bold">{kpis.highRiskProjects}</p>
                <p className="text-sm text-muted-foreground">
                  {kpis.totalTeamSize} team members
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Analytics */}
      <Tabs defaultValue="financial" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="financial">Financial</TabsTrigger>
          <TabsTrigger value="productivity">Productivity</TabsTrigger>
          <TabsTrigger value="safety">Safety</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
        </TabsList>

        {/* Financial Analytics */}
        <TabsContent value="financial" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Revenue & Profit Trends</CardTitle>
                <CardDescription>Monthly financial performance</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={financialData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    <Legend />
                    <Area type="monotone" dataKey="revenue" stackId="1" stroke="#8884d8" fill="#8884d8" name="Revenue" />
                    <Area type="monotone" dataKey="costs" stackId="1" stroke="#82ca9d" fill="#82ca9d" name="Costs" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Profit Margins</CardTitle>
                <CardDescription>Monthly margin percentage</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={financialData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => `${value}%`} />
                    <Legend />
                    <Line type="monotone" dataKey="margin" stroke="#ff7300" strokeWidth={3} name="Profit Margin %" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Productivity Analytics */}
        <TabsContent value="productivity" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Work Category Efficiency</CardTitle>
                <CardDescription>Planned vs actual performance</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={productivityData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="category" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="planned" fill="#8884d8" name="Planned" />
                    <Bar dataKey="actual" fill="#82ca9d" name="Actual" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Efficiency Scores</CardTitle>
                <CardDescription>Performance by work category</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={productivityData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="category" />
                    <PolarRadiusAxis domain={[0, 120]} />
                    <Radar name="Efficiency" dataKey="efficiency" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Safety Analytics */}
        <TabsContent value="safety" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Safety Incidents & Training</CardTitle>
                <CardDescription>Monthly safety performance</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={safetyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="incidents" fill="#ff7300" name="Incidents" />
                    <Bar dataKey="nearMisses" fill="#ffc658" name="Near Misses" />
                    <Bar dataKey="trainingHours" fill="#8884d8" name="Training Hours" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Compliance Score Trend</CardTitle>
                <CardDescription>Monthly compliance rating</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={safetyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis domain={[80, 100]} />
                    <Tooltip formatter={(value) => `${value}%`} />
                    <Legend />
                    <Line type="monotone" dataKey="complianceScore" stroke="#00C49F" strokeWidth={3} name="Compliance %" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Project Analytics */}
        <TabsContent value="projects" className="space-y-6">
          <div className="space-y-4">
            {projectMetrics.map((project) => (
              <Card key={project.id}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-lg">{project.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {project.teamSize} team members • {project.daysRemaining} days remaining
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{project.profitMargin.toFixed(1)}% margin</Badge>
                      <div className={`w-3 h-3 rounded-full ${getRiskColor(project.riskLevel)}`} />
                    </div>
                  </div>
                  
                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <div className="flex justify-between text-sm">
                        <span>Progress</span>
                        <span>{project.progress}%</span>
                      </div>
                      <Progress value={project.progress} className="mt-1" />
                    </div>
                    
                    <div>
                      <div className="flex justify-between text-sm">
                        <span>Budget Used</span>
                        <span>{((project.spent / project.budget) * 100).toFixed(1)}%</span>
                      </div>
                      <Progress value={(project.spent / project.budget) * 100} className="mt-1" />
                    </div>
                    
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Budget</p>
                      <p className="font-semibold">{formatCurrency(project.budget)}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(project.spent)} spent
                      </p>
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