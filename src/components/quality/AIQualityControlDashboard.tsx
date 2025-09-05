import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { AlertTriangle, CheckCircle, XCircle, Camera, TrendingUp, TrendingDown } from 'lucide-react';

interface AIQualityControlDashboardProps {
  projectId: string;
}

interface QualityMetrics {
  overall_quality_score: number;
  total_inspections: number;
  critical_defects: number;
  resolved_defects: number;
  pending_inspections: number;
  compliance_score: number;
  trend_data: { date: string; score: number }[];
}

export const AIQualityControlDashboard: React.FC<AIQualityControlDashboardProps> = ({ 
  projectId 
}) => {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<QualityMetrics>({
    overall_quality_score: 87.5,
    total_inspections: 42,
    critical_defects: 3,
    resolved_defects: 24,
    pending_inspections: 2,
    compliance_score: 94.2,
    trend_data: [
      { date: '2024-01-01', score: 85 },
      { date: '2024-01-02', score: 87 },
      { date: '2024-01-03', score: 88 },
      { date: '2024-01-04', score: 90 },
      { date: '2024-01-05', score: 87.5 },
    ],
  });

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => setLoading(false), 1000);
    return () => clearTimeout(timer);
  }, [projectId]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="space-y-0 pb-2">
                <div className="h-4 bg-muted animate-pulse rounded" />
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">AI Quality Control</h2>
          <p className="text-muted-foreground">
            Automated quality inspection and defect detection
          </p>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overall Quality Score</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.overall_quality_score}%</div>
            <p className="text-xs text-muted-foreground">
              <TrendingUp className="inline h-3 w-3 mr-1" />
              +2.5% from last week
            </p>
            <Progress value={metrics.overall_quality_score} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Inspections</CardTitle>
            <Camera className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.total_inspections}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.pending_inspections} pending
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Defects</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{metrics.critical_defects}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.resolved_defects} resolved total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Compliance Score</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.compliance_score}%</div>
            <p className="text-xs text-muted-foreground">
              Building code compliance
            </p>
            <Progress value={metrics.compliance_score} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Quality Trends */}
      <Tabs defaultValue="trends" className="space-y-4">
        <TabsList>
          <TabsTrigger value="trends">Quality Trends</TabsTrigger>
          <TabsTrigger value="defects">Defect Analysis</TabsTrigger>
          <TabsTrigger value="inspections">Recent Inspections</TabsTrigger>
        </TabsList>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Quality Score Trend</CardTitle>
              <CardDescription>Quality scores over the last 30 days</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={metrics.trend_data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="defects" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Defect Distribution</CardTitle>
              <CardDescription>Types and severity of detected defects</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Cracks</span>
                  <Badge variant="destructive">Critical: 2</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Surface Defects</span>
                  <Badge variant="secondary">Minor: 5</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Alignment Issues</span>
                  <Badge variant="outline">Moderate: 3</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inspections" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Inspections</CardTitle>
              <CardDescription>Latest AI-powered quality inspections</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">Foundation Inspection</p>
                    <p className="text-sm text-muted-foreground">2 hours ago</p>
                  </div>
                  <Badge variant="outline">Score: 92%</Badge>
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">Wall Framing Check</p>
                    <p className="text-sm text-muted-foreground">5 hours ago</p>
                  </div>
                  <Badge variant="destructive">Critical Issues</Badge>
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">Roof Installation</p>
                    <p className="text-sm text-muted-foreground">1 day ago</p>
                  </div>
                  <Badge variant="outline">Score: 88%</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};