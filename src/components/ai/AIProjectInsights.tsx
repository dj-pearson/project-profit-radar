import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Brain, 
  AlertTriangle, 
  DollarSign,
  RefreshCw,
  CheckCircle
} from 'lucide-react';

interface AIProjectInsightsProps {
  projectId: string;
  className?: string;
}

export const AIProjectInsights: React.FC<AIProjectInsightsProps> = ({ 
  projectId, 
  className 
}) => {
  const [loading, setLoading] = useState(false);
  const [riskScore] = useState(45);
  const [qualityScore] = useState(78);

  const getRiskColor = (score: number): "default" | "destructive" | "outline" | "secondary" => {
    if (score >= 80) return 'destructive';
    if (score >= 60) return 'secondary';
    return 'default';
  };

  const getQualityColor = (score: number): "default" | "destructive" | "outline" | "secondary" => {
    if (score >= 80) return 'default';
    if (score >= 60) return 'secondary';
    return 'destructive';
  };

  const refreshInsights = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 2000);
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            <Brain className="h-5 w-5 mr-2" />
            AI Project Insights
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={refreshInsights}
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
            <TabsTrigger value="risk">Risk Analysis</TabsTrigger>
            <TabsTrigger value="cost">Cost Prediction</TabsTrigger>
            <TabsTrigger value="quality">Quality Insights</TabsTrigger>
          </TabsList>

          {/* Risk Analysis Tab */}
          <TabsContent value="risk" className="space-y-4">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold flex items-center">
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Overall Risk Score
                </h4>
                <Badge variant={getRiskColor(riskScore)}>
                  {riskScore}/100
                </Badge>
              </div>
              <Progress value={riskScore} className="mb-2" />
              <p className="text-sm text-muted-foreground">
                Confidence: 85%
              </p>
            </div>

            <div className="space-y-2">
              <h5 className="font-medium">Key Risk Factors</h5>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 border rounded">
                  <span className="text-sm">Weather Delays</span>
                  <Badge variant="secondary">Medium</Badge>
                </div>
                <div className="flex items-center justify-between p-2 border rounded">
                  <span className="text-sm">Material Availability</span>
                  <Badge variant="default">Low</Badge>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Cost Prediction Tab */}
          <TabsContent value="cost" className="space-y-4">
            <div className="text-center py-8">
              <DollarSign className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">
                {loading ? 'Predicting project costs...' : 'Click Refresh to predict project costs'}
              </p>
            </div>
          </TabsContent>

          {/* Quality Insights Tab */}
          <TabsContent value="quality" className="space-y-4">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold">Quality Score</h4>
                <Badge variant={getQualityColor(qualityScore)}>
                  {qualityScore}/100
                </Badge>
              </div>
              <Progress value={qualityScore} className="mb-3" />
              
              <div className="grid grid-cols-3 gap-4 text-center text-sm">
                <div>
                  <p className="text-muted-foreground">Industry</p>
                  <p className="font-medium">72</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Company</p>
                  <p className="font-medium">75</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Project</p>
                  <p className="font-medium">{qualityScore}</p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h5 className="font-medium">Quality Recommendations</h5>
              <div className="space-y-2">
                <div className="flex items-start space-x-2 p-2 border rounded">
                  <CheckCircle className="h-4 w-4 mt-0.5 text-green-600" />
                  <span className="text-sm">Implement daily quality checkpoints</span>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default AIProjectInsights;