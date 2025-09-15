import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { financialIntelligenceService, CashFlowForecast, FinancialRisk } from '@/services/FinancialIntelligenceService';
import { toast } from '@/hooks/use-toast';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Brain,
  BarChart3,
  PieChart,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

export interface FinancialIntelligenceDashboardProps {
  className?: string;
}

export const FinancialIntelligenceDashboard: React.FC<FinancialIntelligenceDashboardProps> = ({
  className = ''
}) => {
  const { userProfile } = useAuth();
  const [cashFlowForecast, setCashFlowForecast] = useState<CashFlowForecast | null>(null);
  const [financialRisks, setFinancialRisks] = useState<FinancialRisk[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadFinancialIntelligence = async () => {
    if (!userProfile?.company_id) return;

    try {
      setLoading(true);

      // Load financial intelligence data in parallel
      const [forecastResult, risksResult] = await Promise.allSettled([
        financialIntelligenceService.generateCashFlowForecast(userProfile.company_id, undefined, 12),
        financialIntelligenceService.assessFinancialRisks(userProfile.company_id)
      ]);

      if (forecastResult.status === 'fulfilled') {
        setCashFlowForecast(forecastResult.value);
      } else {
        console.error('Cash flow forecast failed:', forecastResult.reason);
      }

      if (risksResult.status === 'fulfilled') {
        setFinancialRisks(risksResult.value);
      } else {
        console.error('Financial risk assessment failed:', risksResult.reason);
      }

      setLastUpdated(new Date());

    } catch (error: any) {
      console.error('Error loading financial intelligence:', error);
      toast({
        title: "Financial Intelligence Error",
        description: "Unable to load financial insights. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userProfile?.company_id && !cashFlowForecast && !loading) {
      loadFinancialIntelligence();
    }
  }, [userProfile?.company_id]);

  const getRiskSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'warning';
      case 'low': return 'default';
      default: return 'default';
    }
  };

  const getRiskIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
      case 'high':
        return AlertTriangle;
      case 'medium':
        return TrendingUp;
      case 'low':
        return CheckCircle;
      default:
        return AlertTriangle;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getMonthName = (monthString: string) => {
    const date = new Date(monthString + '-01');
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  if (!userProfile?.company_id) {
    return null;
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Brain className="h-5 w-5 mr-2" />
            <div>
              <CardTitle>Financial Intelligence</CardTitle>
              <CardDescription>
                AI-powered financial insights and forecasting
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
            onClick={loadFinancialIntelligence}
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
            <TabsTrigger value="forecast" className="flex items-center">
              <BarChart3 className="h-4 w-4 mr-2" />
              Cash Flow Forecast
            </TabsTrigger>
            <TabsTrigger value="risks" className="flex items-center">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Financial Risks
            </TabsTrigger>
          </TabsList>

          {/* Cash Flow Forecast Tab */}
          <TabsContent value="forecast" className="space-y-4">
            {cashFlowForecast ? (
              <>
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Next 3 Months</p>
                          <p className="text-2xl font-bold">
                            {formatCurrency(
                              cashFlowForecast.monthlyForecasts
                                .slice(0, 3)
                                .reduce((sum, month) => sum + month.netCashFlow, 0)
                            )}
                          </p>
                        </div>
                        <TrendingUp className="h-8 w-8 text-green-500" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Risk Factors</p>
                          <p className="text-2xl font-bold">
                            {Math.round(
                              (cashFlowForecast.riskFactors.latePayments +
                               cashFlowForecast.riskFactors.projectDelays +
                               cashFlowForecast.riskFactors.seasonalVariation +
                               cashFlowForecast.riskFactors.marketConditions) / 4
                            )}%
                          </p>
                        </div>
                        <AlertTriangle className="h-8 w-8 text-orange-500" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">12-Month Outlook</p>
                          <p className="text-2xl font-bold">
                            {formatCurrency(
                              cashFlowForecast.monthlyForecasts[cashFlowForecast.monthlyForecasts.length - 1]?.cumulativeCashFlow || 0
                            )}
                          </p>
                        </div>
                        <PieChart className="h-8 w-8 text-blue-500" />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Monthly Forecast */}
                <div className="space-y-3">
                  <h4 className="font-semibold">Monthly Cash Flow Forecast</h4>
                  <div className="space-y-2">
                    {cashFlowForecast.monthlyForecasts.slice(0, 6).map((month, index) => (
                      <div key={month.month} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <span className="text-sm font-medium w-20">
                            {getMonthName(month.month)}
                          </span>
                          <div className="flex items-center space-x-2">
                            {month.netCashFlow >= 0 ? (
                              <ArrowUpRight className="h-4 w-4 text-green-500" />
                            ) : (
                              <ArrowDownRight className="h-4 w-4 text-red-500" />
                            )}
                            <span className={`font-medium ${
                              month.netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {formatCurrency(Math.abs(month.netCashFlow))}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline">
                            {Math.round(month.confidence * 100)}% confidence
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            Cumulative: {formatCurrency(month.cumulativeCashFlow)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Risk Factors */}
                <div className="space-y-3">
                  <h4 className="font-semibold">Risk Factor Analysis</h4>
                  <div className="grid grid-cols-2 gap-4">
                    {Object.entries(cashFlowForecast.riskFactors).map(([factor, score]) => (
                      <div key={factor} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium capitalize">
                            {factor.replace(/([A-Z])/g, ' $1').toLowerCase()}
                          </span>
                          <Badge variant={score > 60 ? 'destructive' : score > 30 ? 'warning' : 'default'}>
                            {score}%
                          </Badge>
                        </div>
                        <Progress value={score} className="h-2" />
                      </div>
                    ))}
                  </div>
                </div>

                {/* AI Recommendations */}
                {cashFlowForecast.recommendations.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-semibold">AI Recommendations</h4>
                    {cashFlowForecast.recommendations.map((recommendation, index) => (
                      <Alert key={index}>
                        <Brain className="h-4 w-4" />
                        <AlertDescription>{recommendation}</AlertDescription>
                      </Alert>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">
                  {loading ? 'Generating cash flow forecast...' : 'Click Refresh to generate cash flow forecast'}
                </p>
              </div>
            )}
          </TabsContent>

          {/* Financial Risks Tab */}
          <TabsContent value="risks" className="space-y-4">
            {financialRisks.length > 0 ? (
              <>
                {/* Risk Summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {['critical', 'high', 'medium', 'low'].map((severity) => {
                    const count = financialRisks.filter(risk => risk.severity === severity).length;
                    return (
                      <Card key={severity}>
                        <CardContent className="p-4 text-center">
                          <p className="text-2xl font-bold">{count}</p>
                          <p className="text-sm text-muted-foreground capitalize">{severity} Risk</p>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                {/* Risk List */}
                <div className="space-y-3">
                  <h4 className="font-semibold">Risk Assessment</h4>
                  {financialRisks.slice(0, 10).map((risk) => (
                    <Alert key={risk.id} variant={getRiskSeverityColor(risk.severity)}>
                      {React.createElement(getRiskIcon(risk.severity), { className: "h-4 w-4" })}
                      <AlertDescription>
                        <div className="flex items-center justify-between">
                          <div>
                            <strong className="capitalize">{risk.type.replace('_', ' ')}</strong>
                            <p className="text-sm mt-1">{risk.description}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Impact: {formatCurrency(risk.impact)} • Probability: {risk.probability}%
                            </p>
                          </div>
                          <div className="text-right">
                            <Badge variant={getRiskSeverityColor(risk.severity)}>
                              {risk.severity}
                            </Badge>
                            <p className="text-xs text-muted-foreground mt-1">
                              {risk.timeline}
                            </p>
                          </div>
                        </div>
                        {risk.mitigation.length > 0 && (
                          <div className="mt-2 pt-2 border-t">
                            <p className="text-xs font-medium">Mitigation:</p>
                            <ul className="text-xs mt-1 space-y-1">
                              {risk.mitigation.slice(0, 2).map((item, index) => (
                                <li key={index}>• {item}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">
                  {loading ? 'Assessing financial risks...' : 'Click Refresh to assess financial risks'}
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default FinancialIntelligenceDashboard;
