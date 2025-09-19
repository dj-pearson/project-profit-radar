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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
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
  Cell
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Users,
  AlertTriangle,
  ChevronRight,
  Settings,
  Eye,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DashboardMetric {
  id: string;
  title: string;
  value: number | string;
  change?: number;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: React.ReactNode;
  drillDownData?: any[];
  format?: 'currency' | 'percentage' | 'number' | 'text';
}

interface DrillDownData {
  category: string;
  value: number;
  details?: Array<{
    name: string;
    value: number;
    status?: string;
  }>;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

export const InteractiveDashboard: React.FC = () => {
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState('30d');
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [visibleWidgets, setVisibleWidgets] = useState<string[]>([
    'revenue',
    'projects',
    'budget',
    'timeline',
    'crew',
    'alerts'
  ]);

  const dashboardMetrics: DashboardMetric[] = useMemo(() => [
    {
      id: 'revenue',
      title: 'Total Revenue',
      value: '$284,750',
      change: 12.5,
      changeType: 'positive',
      icon: <DollarSign className="h-4 w-4" />,
      format: 'currency',
      drillDownData: [
        { category: 'Residential Projects', value: 165000, details: [
          { name: 'Kitchen Remodel - Johnson', value: 45000, status: 'completed' },
          { name: 'Bathroom Addition - Smith', value: 32000, status: 'in_progress' },
          { name: 'Deck Installation - Brown', value: 18000, status: 'completed' }
        ]},
        { category: 'Commercial Projects', value: 119750, details: [
          { name: 'Office Renovation - TechCorp', value: 87500, status: 'in_progress' },
          { name: 'Retail Fitout - Local Store', value: 32250, status: 'planning' }
        ]}
      ]
    },
    {
      id: 'projects',
      title: 'Active Projects',
      value: 12,
      change: 2,
      changeType: 'positive',
      icon: <Calendar className="h-4 w-4" />,
      format: 'number',
      drillDownData: [
        { category: 'Planning Phase', value: 3 },
        { category: 'In Progress', value: 7 },
        { category: 'Review Phase', value: 2 }
      ]
    },
    {
      id: 'budget',
      title: 'Budget Performance',
      value: '87%',
      change: -2.3,
      changeType: 'negative',
      icon: <TrendingUp className="h-4 w-4" />,
      format: 'percentage',
      drillDownData: [
        { category: 'On Budget', value: 8 },
        { category: 'Over Budget', value: 3 },
        { category: 'Under Budget', value: 1 }
      ]
    },
    {
      id: 'crew',
      title: 'Crew Utilization',
      value: '92%',
      change: 5.7,
      changeType: 'positive',
      icon: <Users className="h-4 w-4" />,
      format: 'percentage',
      drillDownData: [
        { category: 'Fully Utilized', value: 15 },
        { category: 'Partially Utilized', value: 4 },
        { category: 'Available', value: 2 }
      ]
    }
  ], []);

  const formatValue = (value: number | string, format?: string) => {
    if (typeof value === 'string') return value;
    
    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD'
        }).format(value);
      case 'percentage':
        return `${value}%`;
      case 'number':
        return value.toLocaleString();
      default:
        return value;
    }
  };

  const getChangeIcon = (changeType?: string) => {
    switch (changeType) {
      case 'positive':
        return <TrendingUp className="h-3 w-3 text-green-600" />;
      case 'negative':
        return <TrendingDown className="h-3 w-3 text-red-600" />;
      default:
        return null;
    }
  };

  const getChangeColor = (changeType?: string) => {
    switch (changeType) {
      case 'positive':
        return 'text-green-600';
      case 'negative':
        return 'text-red-600';
      default:
        return 'text-muted-foreground';
    }
  };

  const MetricCard: React.FC<{ metric: DashboardMetric }> = ({ metric }) => (
    <Card 
      className={cn(
        "cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-[1.02]",
        selectedMetric === metric.id && "ring-2 ring-primary"
      )}
      onClick={() => setSelectedMetric(metric.id)}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{metric.title}</CardTitle>
        <div className="flex items-center gap-2">
          {metric.icon}
          <ChevronRight className="h-3 w-3 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{formatValue(metric.value, metric.format)}</div>
        {metric.change !== undefined && (
          <div className={cn("flex items-center gap-1 text-xs", getChangeColor(metric.changeType))}>
            {getChangeIcon(metric.changeType)}
            <span>{Math.abs(metric.change)}% from last {timeRange === '7d' ? 'week' : 'month'}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const DrillDownView: React.FC<{ metric: DashboardMetric }> = ({ metric }) => {
    if (!metric.drillDownData) return null;

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">{metric.title} - Breakdown</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedMetric(null)}
          >
            Back to Overview
          </Button>
        </div>

        {/* Chart Visualization */}
        <Card>
          <CardHeader>
            <CardTitle>Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={metric.drillDownData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="hsl(var(--primary))"
                    dataKey="value"
                    label={({category, value}) => `${category}: ${formatValue(value, metric.format)}`}
                  >
                    {metric.drillDownData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatValue(value as number, metric.format)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Detailed Breakdown */}
        <div className="grid gap-4">
          {metric.drillDownData.map((category, index) => (
            <Card key={index}>
              <CardHeader>
                <CardTitle className="text-base">{category.category}</CardTitle>
                <CardDescription>
                  {formatValue(category.value, metric.format)}
                </CardDescription>
              </CardHeader>
              {category.details && (
                <CardContent>
                  <div className="space-y-2">
                    {category.details.map((detail, detailIndex) => (
                      <div key={detailIndex} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{detail.name}</span>
                          {detail.status && (
                            <Badge variant={
                              detail.status === 'completed' ? 'secondary' :
                              detail.status === 'in_progress' ? 'default' : 'outline'
                            }>
                              {detail.status.replace('_', ' ')}
                            </Badge>
                          )}
                        </div>
                        <span className="font-medium">
                          {formatValue(detail.value, metric.format)}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      </div>
    );
  };

  const CustomizationPanel: React.FC = () => (
    <Sheet open={isCustomizing} onOpenChange={setIsCustomizing}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="h-4 w-4 mr-2" />
          Customize
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Customize Dashboard</SheetTitle>
          <SheetDescription>
            Select which widgets to display on your dashboard
          </SheetDescription>
        </SheetHeader>
        
        <div className="space-y-4 mt-6">
          <div>
            <label className="text-sm font-medium">Time Range</label>
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="1y">Last year</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium">Visible Widgets</label>
            <div className="mt-2 space-y-2">
              {dashboardMetrics.map((metric) => (
                <div key={metric.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {metric.icon}
                    <span className="text-sm">{metric.title}</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={visibleWidgets.includes(metric.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setVisibleWidgets(prev => [...prev, metric.id]);
                      } else {
                        setVisibleWidgets(prev => prev.filter(id => id !== metric.id));
                      }
                    }}
                    className="rounded"
                  />
                </div>
              ))}
            </div>
          </div>

          <Button 
            onClick={() => setIsCustomizing(false)}
            className="w-full"
          >
            Apply Changes
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );

  const selectedMetricData = dashboardMetrics.find(m => m.id === selectedMetric);
  const visibleMetrics = dashboardMetrics.filter(m => visibleWidgets.includes(m.id));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Dashboard Overview</h2>
          <p className="text-muted-foreground">
            Interactive insights for the {timeRange === '7d' ? 'last 7 days' : timeRange === '30d' ? 'last 30 days' : timeRange === '90d' ? 'last 90 days' : 'last year'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <CustomizationPanel />
        </div>
      </div>

      {/* Main Content */}
      {selectedMetricData ? (
        <DrillDownView metric={selectedMetricData} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {visibleMetrics.map((metric) => (
            <MetricCard key={metric.id} metric={metric} />
          ))}
        </div>
      )}

      {/* Real-time Updates Indicator */}
      <Card className="border-green-200 bg-green-50">
        <CardContent className="flex items-center gap-2 py-3">
          <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-sm text-green-700">Live data - Last updated 2 minutes ago</span>
        </CardContent>
      </Card>
    </div>
  );
};