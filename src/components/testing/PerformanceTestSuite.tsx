import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { 
  Zap, 
  Activity, 
  Clock, 
  Users, 
  Server, 
  Database,
  Globe,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  TrendingDown
} from 'lucide-react';

interface PerformanceMetric {
  id: string;
  name: string;
  category: 'load_time' | 'throughput' | 'response_time' | 'cpu' | 'memory' | 'database';
  current_value: number;
  threshold: number;
  unit: string;
  status: 'good' | 'warning' | 'critical';
  trend: 'up' | 'down' | 'stable';
}

interface LoadTestResult {
  id: string;
  name: string;
  concurrent_users: number;
  duration_minutes: number;
  avg_response_time: number;
  max_response_time: number;
  requests_per_second: number;
  error_rate: number;
  cpu_usage: number;
  memory_usage: number;
  status: 'running' | 'completed' | 'failed';
  created_at: string;
}

const PerformanceTestSuite = () => {
  const { userProfile } = useAuth();
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);
  const [loadTests, setLoadTests] = useState<LoadTestResult[]>([]);
  const [performanceData, setPerformanceData] = useState<any[]>([]);
  const [activeTest, setActiveTest] = useState<LoadTestResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadPerformanceMetrics();
    loadTestResults();
    generatePerformanceData();
  }, []);

  const loadPerformanceMetrics = async () => {
    try {
      // Mock performance metrics
      const mockMetrics: PerformanceMetric[] = [
        {
          id: '1',
          name: 'Page Load Time',
          category: 'load_time',
          current_value: 1.2,
          threshold: 2.0,
          unit: 'seconds',
          status: 'good',
          trend: 'down'
        },
        {
          id: '2',
          name: 'API Response Time',
          category: 'response_time',
          current_value: 245,
          threshold: 500,
          unit: 'ms',
          status: 'good',
          trend: 'stable'
        },
        {
          id: '3',
          name: 'Database Query Time',
          category: 'database',
          current_value: 85,
          threshold: 100,
          unit: 'ms',
          status: 'warning',
          trend: 'up'
        },
        {
          id: '4',
          name: 'Server CPU Usage',
          category: 'cpu',
          current_value: 75,
          threshold: 80,
          unit: '%',
          status: 'warning',
          trend: 'up'
        },
        {
          id: '5',
          name: 'Memory Usage',
          category: 'memory',
          current_value: 68,
          threshold: 85,
          unit: '%',
          status: 'good',
          trend: 'stable'
        },
        {
          id: '6',
          name: 'Requests per Second',
          category: 'throughput',
          current_value: 450,
          threshold: 300,
          unit: 'req/s',
          status: 'good',
          trend: 'up'
        }
      ];

      setMetrics(mockMetrics);
    } catch (error) {
      console.error('Error loading performance metrics:', error);
    }
  };

  const loadTestResults = async () => {
    try {
      // Mock load test results
      const mockResults: LoadTestResult[] = [
        {
          id: '1',
          name: 'Peak Hour Load Test',
          concurrent_users: 500,
          duration_minutes: 30,
          avg_response_time: 285,
          max_response_time: 1200,
          requests_per_second: 425,
          error_rate: 0.5,
          cpu_usage: 78,
          memory_usage: 72,
          status: 'completed',
          created_at: new Date(Date.now() - 86400000).toISOString()
        },
        {
          id: '2',
          name: 'Stress Test - 1000 Users',
          concurrent_users: 1000,
          duration_minutes: 15,
          avg_response_time: 520,
          max_response_time: 2800,
          requests_per_second: 380,
          error_rate: 2.1,
          cpu_usage: 95,
          memory_usage: 88,
          status: 'completed',
          created_at: new Date(Date.now() - 172800000).toISOString()
        },
        {
          id: '3',
          name: 'Endurance Test - 24h',
          concurrent_users: 200,
          duration_minutes: 1440,
          avg_response_time: 195,
          max_response_time: 800,
          requests_per_second: 350,
          error_rate: 0.1,
          cpu_usage: 65,
          memory_usage: 70,
          status: 'completed',
          created_at: new Date(Date.now() - 259200000).toISOString()
        }
      ];

      setLoadTests(mockResults);
    } catch (error) {
      console.error('Error loading test results:', error);
    }
  };

  const generatePerformanceData = () => {
    // Generate sample performance data for charts
    const data = [];
    for (let i = 0; i < 24; i++) {
      data.push({
        hour: `${i}:00`,
        response_time: 200 + Math.random() * 300,
        cpu_usage: 50 + Math.random() * 40,
        memory_usage: 40 + Math.random() * 30,
        requests_per_second: 300 + Math.random() * 200
      });
    }
    setPerformanceData(data);
  };

  const startLoadTest = async (users: number, duration: number) => {
    setLoading(true);
    
    const newTest: LoadTestResult = {
      id: Date.now().toString(),
      name: `Load Test - ${users} Users`,
      concurrent_users: users,
      duration_minutes: duration,
      avg_response_time: 0,
      max_response_time: 0,
      requests_per_second: 0,
      error_rate: 0,
      cpu_usage: 0,
      memory_usage: 0,
      status: 'running',
      created_at: new Date().toISOString()
    };

    setActiveTest(newTest);
    setLoadTests(prev => [newTest, ...prev]);

    // Simulate test execution
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Generate random results
    const completedTest: LoadTestResult = {
      ...newTest,
      avg_response_time: 200 + Math.random() * 300,
      max_response_time: 800 + Math.random() * 1500,
      requests_per_second: 300 + Math.random() * 200,
      error_rate: Math.random() * 3,
      cpu_usage: 60 + Math.random() * 30,
      memory_usage: 50 + Math.random() * 30,
      status: 'completed'
    };

    setLoadTests(prev => prev.map(test => 
      test.id === newTest.id ? completedTest : test
    ));
    setActiveTest(null);
    setLoading(false);
  };

  const getMetricIcon = (category: string) => {
    const icons = {
      load_time: Clock,
      throughput: TrendingUp,
      response_time: Activity,
      cpu: Server,
      memory: Database,
      database: Database
    };
    return icons[category as keyof typeof icons] || Activity;
  };

  const getStatusColor = (status: string) => {
    const colors = {
      good: 'text-green-600 bg-green-100',
      warning: 'text-yellow-600 bg-yellow-100',
      critical: 'text-red-600 bg-red-100'
    };
    return colors[status as keyof typeof colors] || 'text-gray-600 bg-gray-100';
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      default:
        return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Zap className="h-5 w-5" />
          <h2 className="text-2xl font-semibold">Performance Testing Suite</h2>
        </div>
        <div className="flex space-x-2">
          <Button 
            onClick={() => startLoadTest(100, 10)}
            disabled={loading}
            variant="outline"
          >
            Quick Test (100 users)
          </Button>
          <Button 
            onClick={() => startLoadTest(500, 30)}
            disabled={loading}
          >
            <Zap className="h-4 w-4 mr-2" />
            Run Load Test
          </Button>
        </div>
      </div>

      {/* Performance Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {metrics.map((metric) => {
          const MetricIcon = getMetricIcon(metric.category);
          const isOverThreshold = metric.current_value > metric.threshold;
          
          return (
            <Card key={metric.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <MetricIcon className="h-5 w-5" />
                    <span className="font-medium">{metric.name}</span>
                  </div>
                  {getTrendIcon(metric.trend)}
                </div>
                <div className="mt-2">
                  <div className="text-2xl font-bold">
                    {metric.current_value}{metric.unit}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Threshold: {metric.threshold}{metric.unit}
                  </div>
                </div>
                <div className="mt-2">
                  <Badge className={getStatusColor(metric.status)}>
                    {metric.status}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Performance Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Response Time Trends</CardTitle>
            <CardDescription>24-hour response time performance</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="response_time" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2} 
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Resource Usage</CardTitle>
            <CardDescription>CPU and Memory utilization</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="cpu_usage" 
                  stroke="hsl(var(--destructive))" 
                  strokeWidth={2} 
                  name="CPU Usage (%)"
                />
                <Line 
                  type="monotone" 
                  dataKey="memory_usage" 
                  stroke="hsl(var(--secondary))" 
                  strokeWidth={2} 
                  name="Memory Usage (%)"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Active Test Status */}
      {activeTest && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="h-5 w-5 animate-pulse text-blue-600" />
              <span>Running: {activeTest.name}</span>
            </CardTitle>
            <CardDescription>
              Testing {activeTest.concurrent_users} concurrent users for {activeTest.duration_minutes} minutes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span>Test in progress...</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Load Test Results */}
      <Card>
        <CardHeader>
          <CardTitle>Load Test Results</CardTitle>
          <CardDescription>Historical performance test results</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96">
            <div className="space-y-4">
              {loadTests.map((test) => (
                <div key={test.id} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="font-medium">{test.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {new Date(test.created_at).toLocaleDateString()} • 
                        {test.concurrent_users} users • {test.duration_minutes}min
                      </p>
                    </div>
                    <Badge 
                      variant={test.status === 'completed' ? 'secondary' : 'outline'}
                    >
                      {test.status}
                    </Badge>
                  </div>
                  
                  {test.status === 'completed' && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="font-medium">Avg Response</p>
                        <p className="text-muted-foreground">{test.avg_response_time}ms</p>
                      </div>
                      <div>
                        <p className="font-medium">Requests/sec</p>
                        <p className="text-muted-foreground">{test.requests_per_second}</p>
                      </div>
                      <div>
                        <p className="font-medium">Error Rate</p>
                        <p className={`${test.error_rate > 1 ? 'text-red-600' : 'text-green-600'}`}>
                          {test.error_rate}%
                        </p>
                      </div>
                      <div>
                        <p className="font-medium">CPU Usage</p>
                        <p className="text-muted-foreground">{test.cpu_usage}%</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

export default PerformanceTestSuite;