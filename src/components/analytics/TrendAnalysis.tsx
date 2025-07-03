import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, ComposedChart, Bar } from 'recharts';
import { TrendingUp, TrendingDown, Activity, BarChart3 } from 'lucide-react';

interface TrendMetric {
  period: string;
  value: number;
  change?: number;
  forecast?: number;
}

interface TrendAnalysisProps {
  title: string;
  data: TrendMetric[];
  metric: string;
  timeframe: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  showForecast?: boolean;
}

const TrendAnalysis: React.FC<TrendAnalysisProps> = ({
  title,
  data,
  metric,
  timeframe,
  showForecast = false
}) => {
  const [selectedView, setSelectedView] = useState<'trend' | 'comparison' | 'forecast'>('trend');

  const chartConfig = {
    value: {
      label: metric,
      color: "hsl(var(--chart-1))",
    },
    forecast: {
      label: "Forecast",
      color: "hsl(var(--chart-2))",
    },
    change: {
      label: "Change %",
      color: "hsl(var(--chart-3))",
    }
  };

  const calculateTrend = () => {
    if (data.length < 2) return { direction: 'neutral', percentage: 0 };
    
    const recent = data.slice(-3).reduce((sum, item) => sum + item.value, 0) / 3;
    const previous = data.slice(-6, -3).reduce((sum, item) => sum + item.value, 0) / 3;
    
    const percentage = previous > 0 ? ((recent - previous) / previous) * 100 : 0;
    const direction = percentage > 5 ? 'up' : percentage < -5 ? 'down' : 'neutral';
    
    return { direction, percentage };
  };

  const trend = calculateTrend();

  const getTrendIcon = () => {
    switch (trend.direction) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      default:
        return <Activity className="h-4 w-4 text-yellow-600" />;
    }
  };

  const getTrendColor = () => {
    switch (trend.direction) {
      case 'up':
        return 'text-green-600';
      case 'down':
        return 'text-red-600';
      default:
        return 'text-yellow-600';
    }
  };

  const renderChart = () => {
    switch (selectedView) {
      case 'trend':
        return (
          <ChartContainer config={chartConfig} className="h-[300px]">
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" />
              <YAxis />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area
                type="monotone"
                dataKey="value"
                stroke="var(--color-value)"
                fill="var(--color-value)"
                fillOpacity={0.6}
              />
            </AreaChart>
          </ChartContainer>
        );
      
      case 'comparison':
        return (
          <ChartContainer config={chartConfig} className="h-[300px]">
            <ComposedChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar 
                yAxisId="left"
                dataKey="value" 
                fill="var(--color-value)"
                fillOpacity={0.8}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="change"
                stroke="var(--color-change)"
                strokeWidth={2}
              />
            </ComposedChart>
          </ChartContainer>
        );
      
      case 'forecast':
        return (
          <ChartContainer config={chartConfig} className="h-[300px]">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" />
              <YAxis />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line
                type="monotone"
                dataKey="value"
                stroke="var(--color-value)"
                strokeWidth={2}
                strokeDasharray="0"
              />
              {showForecast && (
                <Line
                  type="monotone"
                  dataKey="forecast"
                  stroke="var(--color-forecast)"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                />
              )}
            </LineChart>
          </ChartContainer>
        );
      
      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <span>{title}</span>
              {getTrendIcon()}
            </CardTitle>
            <CardDescription>
              {timeframe.charAt(0).toUpperCase() + timeframe.slice(1)} trend analysis for {metric.toLowerCase()}
            </CardDescription>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">
              {data[data.length - 1]?.value.toLocaleString()}
            </div>
            <div className={`text-sm flex items-center ${getTrendColor()}`}>
              {trend.percentage > 0 ? '+' : ''}{trend.percentage.toFixed(1)}%
              <span className="ml-1 text-muted-foreground">vs avg</span>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={selectedView} onValueChange={(value: any) => setSelectedView(value)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="trend">Trend View</SelectItem>
              <SelectItem value="comparison">Comparison</SelectItem>
              {showForecast && <SelectItem value="forecast">Forecast</SelectItem>}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {renderChart()}
        
        {/* Key Insights */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="font-medium text-muted-foreground">Peak Period</div>
            <div className="text-lg font-bold">
              {data.reduce((max, item) => item.value > max.value ? item : max, data[0])?.period}
            </div>
          </div>
          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="font-medium text-muted-foreground">Average</div>
            <div className="text-lg font-bold">
              {(data.reduce((sum, item) => sum + item.value, 0) / data.length).toLocaleString()}
            </div>
          </div>
          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="font-medium text-muted-foreground">Volatility</div>
            <div className="text-lg font-bold">
              {trend.direction === 'neutral' ? 'Low' : trend.direction === 'up' ? 'Growing' : 'Declining'}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TrendAnalysis;