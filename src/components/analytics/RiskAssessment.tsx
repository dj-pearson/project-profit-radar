import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { 
  AlertTriangle, 
  Shield, 
  TrendingDown, 
  Clock,
  DollarSign,
  Users,
  Wrench,
  FileText,
  RefreshCw,
  CheckCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface RiskMetrics {
  overallRiskScore: number;
  riskCategories: Array<{
    category: string;
    score: number;
    level: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    factors: string[];
  }>;
  projectRisks: Array<{
    projectId: string;
    projectName: string;
    riskScore: number;
    topRisks: Array<{
      type: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      probability: number;
      impact: number;
      description: string;
      mitigation?: string;
    }>;
  }>;
  riskTrends: Array<{
    period: string;
    overallRisk: number;
    budgetRisk: number;
    scheduleRisk: number;
    qualityRisk: number;
    resourceRisk: number;
  }>;
  recommendations: Array<{
    priority: 'low' | 'medium' | 'high' | 'critical';
    title: string;
    description: string;
    actionItems: string[];
    expectedImpact: string;
  }>;
}

const RiskAssessment = () => {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [riskData, setRiskData] = useState<RiskMetrics | null>(null);

  useEffect(() => {
    if (userProfile?.company_id) {
      loadRiskAssessment();
    }
  }, [userProfile]);

  const loadRiskAssessment = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-risk-assessment', {
        body: { company_id: userProfile?.company_id }
      });

      if (error) throw error;
      setRiskData(data);
    } catch (error: any) {
      console.error('Error loading risk assessment:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load risk assessment"
      });
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'critical': return 'text-red-800 bg-red-100 border-red-300';
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getRiskIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'budget': return DollarSign;
      case 'schedule': return Clock;
      case 'quality': return Shield;
      case 'resources': return Users;
      case 'technical': return Wrench;
      case 'compliance': return FileText;
      default: return AlertTriangle;
    }
  };

  const chartConfig = {
    overallRisk: {
      label: "Overall Risk",
      color: "hsl(var(--chart-1))",
    },
    budgetRisk: {
      label: "Budget Risk",
      color: "hsl(var(--chart-2))",
    },
    scheduleRisk: {
      label: "Schedule Risk",
      color: "hsl(var(--chart-3))",
    },
    qualityRisk: {
      label: "Quality Risk",
      color: "hsl(var(--chart-4))",
    },
    resourceRisk: {
      label: "Resource Risk",
      color: "hsl(var(--chart-5))",
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
          <Shield className="h-6 w-6 text-primary" />
          <div>
            <h2 className="text-2xl font-bold">Risk Assessment</h2>
            <p className="text-muted-foreground">AI-powered risk analysis and mitigation recommendations</p>
          </div>
        </div>
        <Button onClick={loadRiskAssessment} disabled={loading}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh Assessment
        </Button>
      </div>

      {/* Overall Risk Score */}
      <Card className="border-l-4 border-l-primary">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Overall Risk Score</span>
            <Badge variant={
              (riskData?.overallRiskScore || 0) >= 80 ? 'destructive' :
              (riskData?.overallRiskScore || 0) >= 60 ? 'secondary' : 'default'
            }>
              {riskData?.overallRiskScore || 0}/100
            </Badge>
          </CardTitle>
          <CardDescription>
            Company-wide risk assessment based on all active projects and operations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Progress value={riskData?.overallRiskScore || 0} className="h-3" />
          <div className="flex justify-between text-sm text-muted-foreground mt-2">
            <span>Low Risk</span>
            <span>Critical Risk</span>
          </div>
        </CardContent>
      </Card>

      {/* Risk Categories */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {riskData?.riskCategories.map((category) => {
          const IconComponent = getRiskIcon(category.category);
          return (
            <Card key={category.category}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <IconComponent className="h-5 w-5" />
                    {category.category}
                  </div>
                  <Badge className={getRiskColor(category.level)}>
                    {category.level.toUpperCase()}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <div className="text-2xl font-bold">{category.score}/100</div>
                    <Progress value={category.score} className="h-2 mt-1" />
                  </div>
                  <p className="text-sm text-muted-foreground">{category.description}</p>
                  <div className="space-y-1">
                    {category.factors.slice(0, 3).map((factor, index) => (
                      <div key={index} className="text-xs text-muted-foreground flex items-center gap-1">
                        <div className="w-1 h-1 bg-current rounded-full"></div>
                        {factor}
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Risk Radar Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Risk Profile Analysis</CardTitle>
          <CardDescription>Multi-dimensional risk visualization across all categories</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[400px]">
            <RadarChart data={riskData?.riskCategories.map(cat => ({
              category: cat.category,
              score: cat.score
            })) || []}>
              <PolarGrid />
              <PolarAngleAxis dataKey="category" />
              <PolarRadiusAxis angle={90} domain={[0, 100]} />
              <Radar
                name="Risk Score"
                dataKey="score"
                stroke="var(--color-overallRisk)"
                fill="var(--color-overallRisk)"
                fillOpacity={0.3}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
            </RadarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Project-Specific Risks */}
      <Card>
        <CardHeader>
          <CardTitle>Project Risk Analysis</CardTitle>
          <CardDescription>Individual project risk assessments and key risk factors</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {riskData?.projectRisks.map((project) => (
              <div key={project.projectId} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-medium">{project.projectName}</h4>
                  <Badge variant={
                    project.riskScore >= 80 ? 'destructive' :
                    project.riskScore >= 60 ? 'secondary' : 'default'
                  }>
                    Risk Score: {project.riskScore}/100
                  </Badge>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {project.topRisks.map((risk, index) => (
                    <div key={index} className="border rounded p-3">
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="font-medium text-sm">{risk.type}</h5>
                        <Badge className={getRiskColor(risk.severity)}>
                          {risk.severity}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">{risk.description}</p>
                      <div className="flex justify-between text-xs">
                        <span>Probability: {Math.round(risk.probability * 100)}%</span>
                        <span>Impact: {risk.impact}/10</span>
                      </div>
                      {risk.mitigation && (
                        <div className="mt-2 p-2 bg-green-50 rounded text-xs">
                          <strong>Mitigation:</strong> {risk.mitigation}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Risk Trends */}
      <Card>
        <CardHeader>
          <CardTitle>Risk Trend Analysis</CardTitle>
          <CardDescription>Historical risk patterns and trending indicators</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[400px]">
            <BarChart data={riskData?.riskTrends || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" />
              <YAxis />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="budgetRisk" fill="var(--color-budgetRisk)" name="Budget" />
              <Bar dataKey="scheduleRisk" fill="var(--color-scheduleRisk)" name="Schedule" />
              <Bar dataKey="qualityRisk" fill="var(--color-qualityRisk)" name="Quality" />
              <Bar dataKey="resourceRisk" fill="var(--color-resourceRisk)" name="Resources" />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>Risk Mitigation Recommendations</CardTitle>
          <CardDescription>AI-generated action items to reduce risk exposure</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {riskData?.recommendations.map((rec, index) => (
              <Alert key={index} className={
                rec.priority === 'critical' ? 'border-red-200 bg-red-50' :
                rec.priority === 'high' ? 'border-orange-200 bg-orange-50' :
                rec.priority === 'medium' ? 'border-yellow-200 bg-yellow-50' :
                'border-green-200 bg-green-50'
              }>
                <div className="flex items-start space-x-3">
                  <AlertTriangle className={`h-5 w-5 mt-0.5 ${
                    rec.priority === 'critical' ? 'text-red-600' :
                    rec.priority === 'high' ? 'text-orange-600' :
                    rec.priority === 'medium' ? 'text-yellow-600' :
                    'text-green-600'
                  }`} />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{rec.title}</h4>
                      <Badge className={getRiskColor(rec.priority)}>
                        {rec.priority.toUpperCase()} PRIORITY
                      </Badge>
                    </div>
                    <AlertDescription className="mb-3">
                      {rec.description}
                    </AlertDescription>
                    <div className="space-y-2">
                      <h5 className="font-medium text-sm">Action Items:</h5>
                      <ul className="list-disc list-inside space-y-1">
                        {rec.actionItems.map((item, itemIndex) => (
                          <li key={itemIndex} className="text-sm text-muted-foreground">{item}</li>
                        ))}
                      </ul>
                      <div className="mt-2 p-2 bg-white rounded border">
                        <strong className="text-sm">Expected Impact:</strong>
                        <p className="text-sm text-muted-foreground">{rec.expectedImpact}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </Alert>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RiskAssessment;