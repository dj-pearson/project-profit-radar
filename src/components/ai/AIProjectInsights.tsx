import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useOptimizedProject } from '@/hooks/useOptimizedQueries';
import { aiConstructionService, ProjectRiskAssessment, CostPrediction, QualityInsight } from '@/services/AIConstructionService';
import { toast } from '@/hooks/use-toast';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  DollarSign,
  Calendar,
  Shield,
  Brain,
  Zap,
  Target,
  Activity,
  RefreshCw
} from 'lucide-react';

export interface AIProjectInsightsProps {
  projectId: string;
  className?: string;
}

export const AIProjectInsights: React.FC<AIProjectInsightsProps> = ({
  projectId,
  className = ''
}) => {
  const { data: project, isLoading: projectLoading } = useOptimizedProject(projectId);
  const [riskAssessment, setRiskAssessment] = useState<ProjectRiskAssessment | null>(null);
  const [costPrediction, setCostPrediction] = useState<CostPrediction | null>(null);
  const [qualityInsight, setQualityInsight] = useState<QualityInsight | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadAIInsights = async () => {
    if (!projectId || !project) return;

    try {
      setLoading(true);
      
      // Load all AI insights in parallel
      const [risk, cost, quality] = await Promise.allSettled([
        aiConstructionService.analyzeProjectRisk(projectId),
        aiConstructionService.predictProjectCosts(projectId),
        aiConstructionService.generateQualityInsights(projectId)
      ]);

      if (risk.status === 'fulfilled') {
        setRiskAssessment(risk.value);
      } else {
        console.error('Risk assessment failed:', risk.reason);
      }

      if (cost.status === 'fulfilled') {
        setCostPrediction(cost.value);
      } else {
        console.error('Cost prediction failed:', cost.reason);
      }

      if (quality.status === 'fulfilled') {
        setQualityInsight(quality.value);
      } else {
        console.error('Quality insight failed:', quality.reason);
      }

      setLastUpdated(new Date());

    } catch (error: any) {
      console.error('Error loading AI insights:', error);
      toast({
        title: "AI Analysis Error",
        description: "Unable to load AI insights. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Auto-load insights when project data is available
  useEffect(() => {
    if (project && !riskAssessment && !loading) {
      loadAIInsights();
    }
  }, [project, projectId]);

  const getRiskColor = (score: number) => {
    if (score >= 80) return 'destructive';
    if (score >= 60) return 'warning';
    if (score >= 40) return 'default';
    return 'success';
  };

  const getRiskIcon = (score: number) => {
    if (score >= 80) return AlertTriangle;
    if (score >= 60) return TrendingUp;
    if (score >= 40) return Activity;
    return CheckCircle;
  };

  if (projectLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center">
            <Brain className="h-5 w-5 mr-2" />
            <CardTitle>AI Project Insights</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Brain className="h-5 w-5 mr-2" />
            <div>
              <CardTitle>AI Project Insights</CardTitle>
              <CardDescription>
                Powered by construction intelligence
                {lastUpdated && (
                  <span className="ml-2 text-xs">
                    Updated {lastUpdated.toLocaleTimeString()}
                  </span>
                )}
              </CardDescription>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadAIInsights}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Analyzing...' : 'Refresh'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="risk" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="risk" className="flex items-center">
              <Shield className="h-4 w-4 mr-2" />
              Risk Analysis
            </TabsTrigger>
            <TabsTrigger value="cost" className="flex items-center">
              <DollarSign className="h-4 w-4 mr-2" />
              Cost Prediction
            </TabsTrigger>
            <TabsTrigger value="quality" className="flex items-center">
              <Target className="h-4 w-4 mr-2" />
              Quality Insights
            </TabsTrigger>
          </TabsList>

          {/* Risk Analysis Tab */}
          <TabsContent value="risk" className="space-y-4">
            {riskAssessment ? (
              <>
                {/* Overall Risk Score */}
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold flex items-center">
                      {React.createElement(getRiskIcon(riskAssessment.riskScore), { 
                        className: "h-4 w-4 mr-2" 
                      })}
                      Overall Risk Score
                    </h4>
                    <Badge variant={getRiskColor(riskAssessment.riskScore)}>
                      {riskAssessment.riskScore}/100
                    </Badge>
                  </div>
                  <Progress 
                    value={riskAssessment.riskScore} 
                    className="mb-2"
                  />
                  <p className="text-sm text-muted-foreground">
                    Confidence: {Math.round(riskAssessment.confidenceLevel * 100)}%
                  </p>
                </div>

                {/* Risk Factors Breakdown */}
                <div className="space-y-3">
                  <h4 className="font-semibold">Risk Factors</h4>
                  {Object.entries(riskAssessment.riskFactors).map(([factor, score]) => (
                    <div key={factor} className="flex items-center justify-between">
                      <span className="text-sm capitalize">
                        {factor.replace(/([A-Z])/g, ' $1').toLowerCase()}
                      </span>
                      <div className="flex items-center space-x-2">
                        <Progress value={score} className="w-20" />
                        <span className="text-xs w-8 text-right">{score}%</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Recommendations */}
                {riskAssessment.recommendations.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-semibold">AI Recommendations</h4>
                    {riskAssessment.recommendations.map((recommendation, index) => (
                      <Alert key={index}>
                        <Zap className="h-4 w-4" />
                        <AlertDescription>{recommendation}</AlertDescription>
                      </Alert>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8">
                <Brain className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">
                  {loading ? 'Analyzing project risks...' : 'Click Refresh to analyze project risks'}
                </p>
              </div>
            )}
          </TabsContent>

          {/* Cost Prediction Tab */}
          <TabsContent value="cost" className="space-y-4">
            {costPrediction ? (
              <>
                {/* Cost Overview */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Predicted Final Cost</span>
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <p className="text-2xl font-bold">
                      ${costPrediction.predictedFinalCost.toLocaleString()}
                    </p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Budget Variance</span>
                      {costPrediction.varianceFromBudget >= 0 ? (
                        <TrendingUp className="h-4 w-4 text-red-500" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-green-500" />
                      )}
                    </div>
                    <p className={`text-2xl font-bold ${
                      costPrediction.varianceFromBudget >= 0 ? 'text-red-500' : 'text-green-500'
                    }`}>
                      {costPrediction.varianceFromBudget >= 0 ? '+' : ''}
                      ${costPrediction.varianceFromBudget.toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Completion Probability */}
                <div className="p-4 border rounded-lg">
                  <h4 className="font-semibold mb-3">Completion Probability</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">On Budget</span>
                      <span className="text-sm font-medium">
                        {costPrediction.completionProbability.onBudget}%
                      </span>
                    </div>
                    <Progress value={costPrediction.completionProbability.onBudget} />
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Within 5%</span>
                      <span className="text-sm font-medium">
                        {costPrediction.completionProbability.within5Percent}%
                      </span>
                    </div>
                    <Progress value={costPrediction.completionProbability.within5Percent} />
                  </div>
                </div>

                {/* Key Drivers */}
                {costPrediction.keyDrivers.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-semibold">Key Cost Drivers</h4>
                    {costPrediction.keyDrivers.map((driver, index) => (
                      <Alert key={index}>
                        <TrendingUp className="h-4 w-4" />
                        <AlertDescription>{driver}</AlertDescription>
                      </Alert>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8">
                <DollarSign className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">
                  {loading ? 'Predicting project costs...' : 'Click Refresh to predict project costs'}
                </p>
              </div>
            )}
          </TabsContent>

          {/* Quality Insights Tab */}
          <TabsContent value="quality" className="space-y-4">
            {qualityInsight ? (
              <>
                {/* Quality Score */}
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold">Quality Score</h4>
                    <Badge variant={qualityInsight.qualityScore >= 80 ? 'success' : 
                                   qualityInsight.qualityScore >= 60 ? 'warning' : 'destructive'}>
                      {qualityInsight.qualityScore}/100
                    </Badge>
                  </div>
                  <Progress value={qualityInsight.qualityScore} className="mb-3" />
                  
                  {/* Benchmark Comparison */}
                  <div className="grid grid-cols-3 gap-4 text-center text-sm">
                    <div>
                      <p className="text-muted-foreground">Industry</p>
                      <p className="font-medium">{qualityInsight.benchmarkComparison.industryAverage}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Company</p>
                      <p className="font-medium">{qualityInsight.benchmarkComparison.companyAverage}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Best</p>
                      <p className="font-medium">{qualityInsight.benchmarkComparison.bestInClass}</p>
                    </div>
                  </div>
                </div>

                {/* Defect Predictions */}
                {qualityInsight.defectPredictions.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-semibold">Defect Predictions</h4>
                    {qualityInsight.defectPredictions.map((prediction, index) => (
                      <Alert key={index} variant={
                        prediction.riskLevel === 'high' ? 'destructive' :
                        prediction.riskLevel === 'medium' ? 'default' : 'default'
                      }>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          <strong>{prediction.area}</strong> - {prediction.probability * 100}% risk
                          <br />
                          <span className="text-sm">{prediction.impact}</span>
                        </AlertDescription>
                      </Alert>
                    ))}
                  </div>
                )}

                {/* Inspection Recommendations */}
                {qualityInsight.inspectionRecommendations.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-semibold">Inspection Recommendations</h4>
                    {qualityInsight.inspectionRecommendations.map((recommendation, index) => (
                      <Alert key={index}>
                        <CheckCircle className="h-4 w-4" />
                        <AlertDescription>{recommendation}</AlertDescription>
                      </Alert>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8">
                <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">
                  {loading ? 'Analyzing quality metrics...' : 'Click Refresh to analyze quality metrics'}
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default AIProjectInsights;
