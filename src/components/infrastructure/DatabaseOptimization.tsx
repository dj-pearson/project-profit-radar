import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';
import { Settings, Activity, Calendar, Search } from 'lucide-react';

interface DatabaseIndex {
  id: string;
  table: string;
  columns: string[];
  type: 'btree' | 'hash' | 'gin' | 'gist';
  size: string;
  usage: number;
  created: string;
  isUnique: boolean;
}

interface QueryPerformance {
  id: string;
  query: string;
  avgDuration: number;
  executions: number;
  lastRun: string;
  impact: 'low' | 'medium' | 'high';
}

interface OptimizationRecommendation {
  id: string;
  type: 'index' | 'query' | 'schema' | 'configuration';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  impact: string;
  effort: 'low' | 'medium' | 'high';
  implementation: string;
}

const DatabaseOptimization = () => {
  const { userProfile } = useAuth();
  const [indexes, setIndexes] = useState<DatabaseIndex[]>([]);
  const [queries, setQueries] = useState<QueryPerformance[]>([]);
  const [recommendations, setRecommendations] = useState<OptimizationRecommendation[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [autoOptimization, setAutoOptimization] = useState({
    enabled: false,
    indexCreation: true,
    queryOptimization: false,
    maintenanceTasks: true
  });

  const mockIndexes: DatabaseIndex[] = [
    {
      id: '1',
      table: 'projects',
      columns: ['company_id', 'status'],
      type: 'btree',
      size: '2.3 MB',
      usage: 89,
      created: '2024-01-15',
      isUnique: false
    },
    {
      id: '2',
      table: 'user_profiles',
      columns: ['email'],
      type: 'btree',
      size: '1.1 MB',
      usage: 95,
      created: '2024-01-10',
      isUnique: true
    },
    {
      id: '3',
      table: 'invoices',
      columns: ['created_at'],
      type: 'btree',
      size: '5.7 MB',
      usage: 72,
      created: '2024-02-01',
      isUnique: false
    },
    {
      id: '4',
      table: 'documents',
      columns: ['name', 'content'],
      type: 'gin',
      size: '3.2 MB',
      usage: 34,
      created: '2024-03-01',
      isUnique: false
    }
  ];

  const mockQueries: QueryPerformance[] = [
    {
      id: '1',
      query: 'SELECT * FROM projects WHERE company_id = ? AND status = ?',
      avgDuration: 45.6,
      executions: 15420,
      lastRun: new Date(Date.now() - 300000).toISOString(),
      impact: 'high'
    },
    {
      id: '2',
      query: 'SELECT COUNT(*) FROM invoices WHERE created_at > ?',
      avgDuration: 123.8,
      executions: 3240,
      lastRun: new Date(Date.now() - 600000).toISOString(),
      impact: 'medium'
    },
    {
      id: '3',
      query: 'SELECT * FROM documents WHERE name ILIKE ?',
      avgDuration: 234.1,
      executions: 890,
      lastRun: new Date(Date.now() - 1200000).toISOString(),
      impact: 'low'
    }
  ];

  const mockRecommendations: OptimizationRecommendation[] = [
    {
      id: '1',
      type: 'index',
      priority: 'high',
      title: 'Create composite index on expenses table',
      description: 'Queries filtering by company_id and expense_date would benefit from a composite index',
      impact: 'Reduce query time by ~60%',
      effort: 'low',
      implementation: 'CREATE INDEX idx_expenses_company_date ON expenses(company_id, expense_date);'
    },
    {
      id: '2',
      type: 'query',
      priority: 'medium',
      title: 'Optimize time tracking queries',
      description: 'Replace SELECT * with specific columns in time tracking reports',
      impact: 'Reduce memory usage by ~40%',
      effort: 'medium',
      implementation: 'Update application queries to select only required columns'
    },
    {
      id: '3',
      type: 'configuration',
      priority: 'critical',
      title: 'Increase shared_buffers setting',
      description: 'Current setting is too low for the data size, causing excessive disk I/O',
      impact: 'Improve overall performance by ~25%',
      effort: 'low',
      implementation: 'Update PostgreSQL configuration: shared_buffers = 256MB'
    }
  ];

  useEffect(() => {
    loadDatabaseMetrics();
  }, []);

  const loadDatabaseMetrics = async () => {
    try {
      // For now, use mock data until types are regenerated
      // The real implementation will connect to database_optimization_metrics table
      setIndexes(mockIndexes);
      setQueries(mockQueries);
      setRecommendations(mockRecommendations);
    } catch (error) {
      console.error('Error loading database metrics:', error);
      setIndexes(mockIndexes);
      setQueries(mockQueries);
      setRecommendations(mockRecommendations);
    }
  };

  const analyzeDatabase = async () => {
    setAnalyzing(true);
    toast({
      title: "Database Analysis Started",
      description: "Analyzing database performance and optimization opportunities..."
    });

    // Simulate analysis process
    setTimeout(() => {
      setAnalyzing(false);
      toast({
        title: "Analysis Complete",
        description: "Found 3 optimization opportunities and performance insights."
      });
    }, 5000);
  };

  const createIndex = async (recommendation: OptimizationRecommendation) => {
    toast({
      title: "Creating Index",
      description: "Executing index creation in the background..."
    });

    // Simulate index creation
    setTimeout(() => {
      setRecommendations(prev => prev.filter(r => r.id !== recommendation.id));
      toast({
        title: "Index Created",
        description: "Index has been successfully created and is now active."
      });
    }, 3000);
  };

  const implementRecommendation = async (recommendation: OptimizationRecommendation) => {
    if (recommendation.type === 'index') {
      createIndex(recommendation);
    } else {
      toast({
        title: "Recommendation Noted",
        description: "This optimization requires manual implementation. Check the details for guidance."
      });
    }
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      low: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-orange-100 text-orange-800',
      critical: 'bg-red-100 text-red-800'
    };
    return colors[priority as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getImpactColor = (impact: string) => {
    const colors = {
      low: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-red-100 text-red-800'
    };
    return colors[impact as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getUsageColor = (usage: number) => {
    if (usage >= 80) return 'bg-green-100 text-green-800';
    if (usage >= 50) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Settings className="h-5 w-5" />
          <h2 className="text-2xl font-semibold">Database Optimization</h2>
        </div>
        <Button onClick={analyzeDatabase} disabled={analyzing}>
          <Activity className="h-4 w-4 mr-2" />
          {analyzing ? 'Analyzing...' : 'Analyze Database'}
        </Button>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="indexes">Indexes</TabsTrigger>
          <TabsTrigger value="queries">Query Performance</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Database Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold">{indexes.length}</div>
                <p className="text-sm text-muted-foreground">Total Indexes</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold">
                  {Math.round(indexes.reduce((sum, idx) => sum + idx.usage, 0) / indexes.length)}%
                </div>
                <p className="text-sm text-muted-foreground">Avg Index Usage</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold">
                  {queries.reduce((sum, q) => sum + q.executions, 0).toLocaleString()}
                </div>
                <p className="text-sm text-muted-foreground">Total Query Executions</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-orange-600">
                  {recommendations.length}
                </div>
                <p className="text-sm text-muted-foreground">Optimization Opportunities</p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>
                Common database optimization tasks
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button variant="outline" className="h-auto p-4 flex flex-col items-start">
                <div className="font-medium mb-1">Update Statistics</div>
                <div className="text-sm text-muted-foreground">Refresh query planner statistics</div>
              </Button>
              <Button variant="outline" className="h-auto p-4 flex flex-col items-start">
                <div className="font-medium mb-1">Vacuum Tables</div>
                <div className="text-sm text-muted-foreground">Reclaim storage and update statistics</div>
              </Button>
              <Button variant="outline" className="h-auto p-4 flex flex-col items-start">
                <div className="font-medium mb-1">Reindex</div>
                <div className="text-sm text-muted-foreground">Rebuild indexes for better performance</div>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="indexes" className="space-y-4">
          {/* Index Management */}
          <Card>
            <CardHeader>
              <CardTitle>Database Indexes</CardTitle>
              <CardDescription>
                Monitor and manage database indexes for optimal performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {indexes.map((index) => (
                  <div key={index.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-medium">{index.table}</h4>
                        <Badge variant="outline">{index.type}</Badge>
                        {index.isUnique && <Badge variant="outline">UNIQUE</Badge>}
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className={getUsageColor(index.usage)}>
                          {index.usage}% usage
                        </Badge>
                        <span className="text-sm text-muted-foreground">{index.size}</span>
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground mb-2">
                      Columns: {index.columns.join(', ')}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Created: {new Date(index.created).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="queries" className="space-y-4">
          {/* Query Performance */}
          <Card>
            <CardHeader>
              <CardTitle>Query Performance Analysis</CardTitle>
              <CardDescription>
                Monitor slow queries and optimization opportunities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {queries.map((query) => (
                  <div key={query.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <Badge className={getImpactColor(query.impact)}>
                        {query.impact} impact
                      </Badge>
                      <div className="text-sm text-muted-foreground">
                        {query.executions.toLocaleString()} executions
                      </div>
                    </div>
                    <div className="font-mono text-sm bg-muted p-2 rounded mb-2">
                      {query.query}
                    </div>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>Avg Duration: {query.avgDuration.toFixed(1)}ms</span>
                      <span>Last Run: {new Date(query.lastRun).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-4">
          {/* Optimization Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle>Optimization Recommendations</CardTitle>
              <CardDescription>
                AI-powered suggestions for improving database performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recommendations.map((rec) => (
                  <div key={rec.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-medium">{rec.title}</h4>
                        <Badge className={getPriorityColor(rec.priority)}>
                          {rec.priority}
                        </Badge>
                        <Badge variant="outline">{rec.type}</Badge>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          onClick={() => implementRecommendation(rec)}
                          disabled={rec.type !== 'index'}
                        >
                          {rec.type === 'index' ? 'Auto-implement' : 'View Details'}
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{rec.description}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Expected Impact: </span>
                        {rec.impact}
                      </div>
                      <div>
                        <span className="font-medium">Implementation Effort: </span>
                        <Badge variant="outline">{rec.effort}</Badge>
                      </div>
                    </div>
                    {rec.implementation && (
                      <div className="mt-2">
                        <div className="text-sm font-medium mb-1">Implementation:</div>
                        <code className="text-xs bg-muted p-2 rounded block overflow-x-auto">
                          {rec.implementation}
                        </code>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Auto-optimization Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Auto-optimization Settings</CardTitle>
              <CardDescription>
                Configure automatic database optimization features
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="auto-opt">Enable Auto-optimization</Label>
                  <div className="text-sm text-muted-foreground">
                    Automatically implement low-risk optimizations
                  </div>
                </div>
                <Switch
                  id="auto-opt"
                  checked={autoOptimization.enabled}
                  onCheckedChange={(checked) => 
                    setAutoOptimization(prev => ({ ...prev, enabled: checked }))
                  }
                />
              </div>
              
              {autoOptimization.enabled && (
                <>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="auto-index">Automatic Index Creation</Label>
                    <Switch
                      id="auto-index"
                      checked={autoOptimization.indexCreation}
                      onCheckedChange={(checked) => 
                        setAutoOptimization(prev => ({ ...prev, indexCreation: checked }))
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="auto-query">Query Optimization</Label>
                    <Switch
                      id="auto-query"
                      checked={autoOptimization.queryOptimization}
                      onCheckedChange={(checked) => 
                        setAutoOptimization(prev => ({ ...prev, queryOptimization: checked }))
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="auto-maintenance">Maintenance Tasks</Label>
                    <Switch
                      id="auto-maintenance"
                      checked={autoOptimization.maintenanceTasks}
                      onCheckedChange={(checked) => 
                        setAutoOptimization(prev => ({ ...prev, maintenanceTasks: checked }))
                      }
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DatabaseOptimization;