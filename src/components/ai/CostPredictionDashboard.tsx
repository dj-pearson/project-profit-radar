/**
 * Cost Prediction Dashboard
 * Interactive UI for AI-powered cost predictions
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  DollarSign,
  Calculator,
  BarChart3,
  Target,
  Sparkles,
} from 'lucide-react';
import { costPredictionService, CostPredictionInput, CostPrediction } from '@/services/ai/costPrediction';
import { formatCurrency } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

export function CostPredictionDashboard() {
  const [loading, setLoading] = useState(false);
  const [prediction, setPrediction] = useState<CostPrediction | null>(null);
  const [input, setInput] = useState<CostPredictionInput>({
    projectType: '',
    squareFootage: undefined,
    location: '',
    duration: undefined,
    complexity: 'medium',
  });

  const { toast } = useToast();

  const handlePredict = async () => {
    if (!input.projectType) {
      toast({
        variant: 'destructive',
        title: 'Missing Information',
        description: 'Please select a project type',
      });
      return;
    }

    setLoading(true);
    try {
      const result = await costPredictionService.predictCost(input);
      setPrediction(result);
      toast({
        title: 'Prediction Complete',
        description: `Estimated cost: ${formatCurrency(result.estimatedCost)}`,
      });
    } catch (error) {
      console.error('Prediction error:', error);
      toast({
        variant: 'destructive',
        title: 'Prediction Failed',
        description: 'Unable to generate cost prediction. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (score: number) => {
    if (score < 40) return 'text-green-600';
    if (score < 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getRiskBadge = (score: number) => {
    if (score < 40) return <Badge className="bg-green-100 text-green-800">Low Risk</Badge>;
    if (score < 70) return <Badge className="bg-yellow-100 text-yellow-800">Medium Risk</Badge>;
    return <Badge className="bg-red-100 text-red-800">High Risk</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            <div>
              <CardTitle>AI Cost Prediction</CardTitle>
              <CardDescription>
                Get accurate cost estimates using historical data and machine learning
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            {/* Input Form */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="projectType">Project Type *</Label>
                <Select
                  value={input.projectType}
                  onValueChange={(value) => setInput({ ...input, projectType: value })}
                >
                  <SelectTrigger id="projectType">
                    <SelectValue placeholder="Select project type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="commercial">Commercial Building</SelectItem>
                    <SelectItem value="residential">Residential</SelectItem>
                    <SelectItem value="industrial">Industrial</SelectItem>
                    <SelectItem value="renovation">Renovation</SelectItem>
                    <SelectItem value="infrastructure">Infrastructure</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="squareFootage">Square Footage</Label>
                <Input
                  id="squareFootage"
                  type="number"
                  placeholder="e.g., 5000"
                  value={input.squareFootage || ''}
                  onChange={(e) =>
                    setInput({ ...input, squareFootage: e.target.value ? Number(e.target.value) : undefined })
                  }
                />
              </div>

              <div>
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  placeholder="e.g., New York, NY"
                  value={input.location}
                  onChange={(e) => setInput({ ...input, location: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="duration">Estimated Duration (days)</Label>
                <Input
                  id="duration"
                  type="number"
                  placeholder="e.g., 90"
                  value={input.duration || ''}
                  onChange={(e) =>
                    setInput({ ...input, duration: e.target.value ? Number(e.target.value) : undefined })
                  }
                />
              </div>

              <div>
                <Label htmlFor="complexity">Project Complexity</Label>
                <Select
                  value={input.complexity}
                  onValueChange={(value: 'low' | 'medium' | 'high') =>
                    setInput({ ...input, complexity: value })
                  }
                >
                  <SelectTrigger id="complexity">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={handlePredict} disabled={loading} className="w-full">
                {loading ? (
                  <>
                    <Calculator className="mr-2 h-4 w-4 animate-spin" />
                    Calculating...
                  </>
                ) : (
                  <>
                    <Calculator className="mr-2 h-4 w-4" />
                    Predict Cost
                  </>
                )}
              </Button>
            </div>

            {/* Prediction Results */}
            {prediction && (
              <div className="space-y-4">
                {/* Estimated Cost */}
                <Card className="bg-primary/5 border-primary/20">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">Estimated Cost</span>
                      {getRiskBadge(prediction.riskScore)}
                    </div>
                    <div className="text-3xl font-bold text-primary">
                      {formatCurrency(prediction.estimatedCost)}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      Range: {formatCurrency(prediction.range.low)} - {formatCurrency(prediction.range.high)}
                    </div>
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span>Confidence</span>
                        <span className="font-medium">{Math.round(prediction.confidenceLevel * 100)}%</span>
                      </div>
                      <Progress value={prediction.confidenceLevel * 100} className="h-2" />
                    </div>
                  </CardContent>
                </Card>

                {/* Risk Score */}
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Risk Score</span>
                      <span className={`text-2xl font-bold ${getRiskColor(prediction.riskScore)}`}>
                        {prediction.riskScore}/100
                      </span>
                    </div>
                    <Progress
                      value={prediction.riskScore}
                      className={`h-2 ${
                        prediction.riskScore < 40
                          ? 'bg-green-100'
                          : prediction.riskScore < 70
                          ? 'bg-yellow-100'
                          : 'bg-red-100'
                      }`}
                    />
                  </CardContent>
                </Card>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 gap-2">
                  <Card>
                    <CardContent className="pt-4 pb-4">
                      <div className="text-xs text-muted-foreground">Similar Projects</div>
                      <div className="text-xl font-bold">{prediction.similarProjects.length}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4 pb-4">
                      <div className="text-xs text-muted-foreground">Cost Factors</div>
                      <div className="text-xl font-bold">{prediction.factors.length}</div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Detailed Results */}
      {prediction && (
        <>
          {/* Cost Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Cost Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(prediction.breakdown).map(([category, amount]) => {
                  const percentage = (amount / prediction.estimatedCost) * 100;
                  return (
                    <div key={category}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium capitalize">{category}</span>
                        <span className="text-sm font-bold">{formatCurrency(amount)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress value={percentage} className="flex-1 h-2" />
                        <span className="text-xs text-muted-foreground w-12 text-right">
                          {percentage.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Cost Factors */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Key Cost Factors
              </CardTitle>
              <CardDescription>Factors affecting your project cost</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {prediction.factors.map((factor, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 rounded-lg border">
                    {factor.impact > 0 ? (
                      <TrendingUp className="h-5 w-5 text-red-500 mt-0.5" />
                    ) : (
                      <TrendingDown className="h-5 w-5 text-green-500 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{factor.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {factor.impact > 0 ? '+' : ''}
                          {(factor.impact * 100).toFixed(0)}%
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{factor.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Recommendations
              </CardTitle>
              <CardDescription>Actions to control costs</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {prediction.recommendations.map((rec, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">{rec}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Similar Projects */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Similar Completed Projects
              </CardTitle>
              <CardDescription>Learn from past projects</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {prediction.similarProjects.map((project) => (
                  <div key={project.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{project.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {Math.round(project.similarity * 100)}% match
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{formatCurrency(project.actualCost)}</span>
                        <span>•</span>
                        <span>{project.duration} days</span>
                        {project.variance !== 0 && (
                          <>
                            <span>•</span>
                            <span className={project.variance > 0 ? 'text-red-600' : 'text-green-600'}>
                              {project.variance > 0 ? '+' : ''}
                              {project.variance.toFixed(1)}% variance
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Risk Alert */}
          {prediction.riskScore >= 70 && (
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-900">
                <strong>High Risk Detected:</strong> This project has multiple cost risk factors.
                Consider adding 15-20% contingency and implementing strict cost controls from day one.
              </AlertDescription>
            </Alert>
          )}
        </>
      )}
    </div>
  );
}
