import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Brain, 
  BarChart3, 
  AlertTriangle,
  DollarSign,
  RefreshCw
} from 'lucide-react';

interface FinancialIntelligenceDashboardProps {
  className?: string;
}

export const FinancialIntelligenceDashboard: React.FC<FinancialIntelligenceDashboardProps> = ({ 
  className 
}) => {
  const [loading, setLoading] = useState(false);

  const refreshAnalysis = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 2000);
  };

  const getRiskSeverityColor = (severity: string): "default" | "destructive" | "outline" | "secondary" => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      default: return 'default';
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            <Brain className="h-5 w-5 mr-2" />
            Financial Intelligence Dashboard
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={refreshAnalysis}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Analyzing...' : 'Refresh'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="forecast" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="forecast">Cash Flow</TabsTrigger>
            <TabsTrigger value="risks">Financial Risks</TabsTrigger>
          </TabsList>

          {/* Cash Flow Forecast Tab */}
          <TabsContent value="forecast" className="space-y-4">
            <div className="text-center py-8">
              <BarChart3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">
                {loading ? 'Generating cash flow forecast...' : 'Click Refresh to generate cash flow forecast'}
              </p>
            </div>
          </TabsContent>

          {/* Financial Risks Tab */}
          <TabsContent value="risks" className="space-y-4">
            {/* Risk Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {['critical', 'high', 'medium', 'low'].map((severity) => (
                <Card key={severity}>
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold">
                      {severity === 'medium' ? 3 : severity === 'low' ? 5 : 1}
                    </p>
                    <p className="text-sm text-muted-foreground capitalize">{severity} Risk</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Sample Risk Items */}
            <div className="space-y-3">
              <h4 className="font-semibold">Risk Assessment</h4>
              
              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    <span className="font-medium">Payment Delays</span>
                  </div>
                  <Badge variant={getRiskSeverityColor('medium')}>Medium</Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  Client payment history shows potential 15-day delays
                </p>
                <div className="flex items-center justify-between text-xs">
                  <span>Impact: $25,000</span>
                  <span>Probability: 35%</span>
                </div>
              </div>

              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <DollarSign className="h-4 w-4 mr-2" />
                    <span className="font-medium">Material Cost Volatility</span>
                  </div>
                  <Badge variant={getRiskSeverityColor('low')}>Low</Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  Steel prices show upward trend over next quarter
                </p>
                <div className="flex items-center justify-between text-xs">
                  <span>Impact: $8,500</span>
                  <span>Probability: 20%</span>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default FinancialIntelligenceDashboard;