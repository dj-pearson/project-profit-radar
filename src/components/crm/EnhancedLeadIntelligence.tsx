import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/utils/formatters';
import { 
  Brain, 
  TrendingUp, 
  Target,
  DollarSign,
  Calendar,
  Activity,
  Users,
  Zap,
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3
} from 'lucide-react';

interface AILeadScore {
  id: string;
  lead_id: string;
  overall_score: number;
  confidence_level: number;
  demographic_score: number;
  behavioral_score: number;
  engagement_score: number;
  fit_score: number;
  intent_score: number;
  timing_score: number;
  conversion_probability: number;
  estimated_deal_size: number;
  estimated_close_time_days: number;
  key_insights: any;
  risk_factors: any;
  opportunities: any;
  next_best_actions: any;
  calculated_at: string;
  lead: {
    first_name: string;
    last_name: string;
    company_name?: string;
    estimated_budget?: number;
    status: string;
    priority: string;
    lead_temperature?: string;
  };
}

interface LeadSourceROI {
  id: string;
  source_name: string;
  source_type: string;
  cost_per_lead: number;
  conversion_rate: number;
  average_deal_size: number;
  roi_percentage: number;
  total_leads: number;
  qualified_leads: number;
  converted_deals: number;
}

export const EnhancedLeadIntelligence: React.FC = () => {
  const [aiLeadScores, setAiLeadScores] = useState<AILeadScore[]>([]);
  const [sourceROI, setSourceROI] = useState<LeadSourceROI[]>([]);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadIntelligenceData();
  }, []);

  const loadIntelligenceData = async () => {
    try {
      // Load AI lead scores
      const { data: scoresData, error: scoresError } = await supabase
        .from('ai_lead_scores')
        .select(`
          *,
          lead:leads(
            first_name,
            last_name,
            company_name,
            estimated_budget,
            status,
            priority,
            lead_temperature
          )
        `)
        .order('overall_score', { ascending: false })
        .limit(20);

      if (scoresError) throw scoresError;

      // Load source ROI data
      const { data: roiData, error: roiError } = await supabase
        .from('lead_sources')
        .select('*')
        .eq('is_active', true)
        .order('roi_percentage', { ascending: false });

      if (roiError) throw roiError;

      setAiLeadScores(((scoresData || []) as any).map((score: any) => ({
        ...score,
        key_insights: Array.isArray(score.key_insights) ? score.key_insights : [],
        risk_factors: Array.isArray(score.risk_factors) ? score.risk_factors : [],
        opportunities: Array.isArray(score.opportunities) ? score.opportunities : [],
        next_best_actions: Array.isArray(score.next_best_actions) ? score.next_best_actions : []
      })));
      setSourceROI((roiData || []).map(source => ({
        ...source,
        total_leads: 0,
        qualified_leads: 0,
        converted_deals: 0
      })));
    } catch (error: any) {
      toast({
        title: "Error loading intelligence data",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateEnhancedScore = async (leadId: string) => {
    setCalculating(true);
    try {
      const { data, error } = await supabase.rpc('calculate_enhanced_lead_score', {
        p_lead_id: leadId
      });

      if (error) throw error;

      // Store the enhanced score in AI lead scores table
      const { error: insertError } = await supabase
        .from('ai_lead_scores')
        .upsert({
          lead_id: leadId,
          company_id: 'your-company-id', // This should come from user context
          overall_score: (data as any)?.overall_score || 0,
          demographic_score: (data as any)?.demographic_score || 0,
          behavioral_score: (data as any)?.behavioral_score || 0,
          engagement_score: (data as any)?.engagement_score || 0,
          fit_score: (data as any)?.fit_score || 0,
          intent_score: (data as any)?.intent_score || 0,
          timing_score: (data as any)?.timing_score || 0,
          calculated_at: new Date().toISOString()
        });

      if (insertError) throw insertError;

      toast({
        title: "Enhanced score calculated",
        description: `New AI score: ${(data as any)?.overall_score || 0}`
      });

      await loadIntelligenceData();
    } catch (error: any) {
      toast({
        title: "Error calculating enhanced score",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setCalculating(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-success-foreground bg-success';
    if (score >= 60) return 'text-warning-foreground bg-warning';
    if (score >= 40) return 'text-orange-600 bg-orange-100';
    return 'text-destructive-foreground bg-destructive';
  };

  const getTemperatureColor = (temp?: string) => {
    switch (temp) {
      case 'hot': return 'text-red-600 bg-red-100';
      case 'warm': return 'text-orange-600 bg-orange-100';
      case 'cold': return 'text-blue-600 bg-blue-100';
      default: return 'text-muted-foreground bg-muted';
    }
  };

  if (loading) {
    return <div className="p-6">Loading intelligence data...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Lead Intelligence</h1>
          <p className="text-muted-foreground">AI-powered insights and predictive analytics</p>
        </div>
        <Button onClick={() => loadIntelligenceData()} disabled={calculating}>
          <Brain className="h-4 w-4 mr-2" />
          Refresh Intelligence
        </Button>
      </div>

      <Tabs defaultValue="scores" className="space-y-4">
        <TabsList>
          <TabsTrigger value="scores">AI Lead Scores</TabsTrigger>
          <TabsTrigger value="roi">Source ROI</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
          <TabsTrigger value="predictions">Predictions</TabsTrigger>
        </TabsList>

        <TabsContent value="scores" className="space-y-4">
          {aiLeadScores.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <Brain className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No AI scores available</h3>
                  <p className="text-muted-foreground mb-4">
                    AI lead scores will appear here once calculated
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {aiLeadScores.map((scoreData) => (
                <Card key={scoreData.id} className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-4">
                      <div className={`w-16 h-16 rounded-full flex items-center justify-center font-bold text-xl ${getScoreColor(scoreData.overall_score)}`}>
                        {scoreData.overall_score}
                      </div>
                      <div>
                        <h4 className="text-lg font-semibold">
                          {scoreData.lead.first_name} {scoreData.lead.last_name}
                        </h4>
                        <p className="text-muted-foreground">
                          {scoreData.lead.company_name || 'Individual'}
                        </p>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge className={getTemperatureColor(scoreData.lead.lead_temperature)}>
                            {scoreData.lead.lead_temperature || 'cold'}
                          </Badge>
                          <Badge variant="outline">
                            {Math.round(scoreData.conversion_probability)}% likely to convert
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">Estimated Deal Size</div>
                      <div className="text-xl font-bold">
                        {formatCurrency(scoreData.estimated_deal_size)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Close in {scoreData.estimated_close_time_days} days
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-6 gap-4 mb-6">
                    <div className="text-center">
                      <div className="text-sm font-medium text-muted-foreground">Demographics</div>
                      <div className="text-lg font-bold">{scoreData.demographic_score}</div>
                      <Progress value={scoreData.demographic_score} className="h-1 mt-1" />
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-medium text-muted-foreground">Behavior</div>
                      <div className="text-lg font-bold">{scoreData.behavioral_score}</div>
                      <Progress value={scoreData.behavioral_score} className="h-1 mt-1" />
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-medium text-muted-foreground">Engagement</div>
                      <div className="text-lg font-bold">{scoreData.engagement_score}</div>
                      <Progress value={scoreData.engagement_score} className="h-1 mt-1" />
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-medium text-muted-foreground">Fit</div>
                      <div className="text-lg font-bold">{scoreData.fit_score}</div>
                      <Progress value={scoreData.fit_score} className="h-1 mt-1" />
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-medium text-muted-foreground">Intent</div>
                      <div className="text-lg font-bold">{scoreData.intent_score}</div>
                      <Progress value={scoreData.intent_score} className="h-1 mt-1" />
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-medium text-muted-foreground">Timing</div>
                      <div className="text-lg font-bold">{scoreData.timing_score}</div>
                      <Progress value={scoreData.timing_score} className="h-1 mt-1" />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <h5 className="font-medium mb-2 flex items-center">
                        <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                        Key Insights
                      </h5>
                      <ul className="text-sm space-y-1">
                        {scoreData.key_insights.map((insight, idx) => (
                          <li key={idx} className="text-muted-foreground">• {insight}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h5 className="font-medium mb-2 flex items-center">
                        <AlertTriangle className="h-4 w-4 mr-2 text-orange-600" />
                        Risk Factors
                      </h5>
                      <ul className="text-sm space-y-1">
                        {scoreData.risk_factors.map((risk, idx) => (
                          <li key={idx} className="text-muted-foreground">• {risk}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h5 className="font-medium mb-2 flex items-center">
                        <Zap className="h-4 w-4 mr-2 text-blue-600" />
                        Next Actions
                      </h5>
                      <ul className="text-sm space-y-1">
                        {scoreData.next_best_actions.map((action, idx) => (
                          <li key={idx} className="text-muted-foreground">• {action}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t flex items-center justify-between">
                    <div className="text-xs text-muted-foreground">
                      Last calculated: {new Date(scoreData.calculated_at).toLocaleDateString()}
                      {scoreData.confidence_level && (
                        <span className="ml-2">
                          Confidence: {Math.round(scoreData.confidence_level)}%
                        </span>
                      )}
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => calculateEnhancedScore(scoreData.lead_id)}
                      disabled={calculating}
                    >
                      Recalculate Score
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="roi" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5" />
                <span>Lead Source ROI Analysis</span>
              </CardTitle>
              <CardDescription>
                Performance metrics for each lead source
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {sourceROI.map((source) => (
                  <div key={source.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium">{source.source_name}</h4>
                      <p className="text-sm text-muted-foreground capitalize">{source.source_type}</p>
                    </div>
                    <div className="grid grid-cols-4 gap-4 text-center">
                      <div>
                        <div className="text-sm text-muted-foreground">Cost/Lead</div>
                        <div className="font-bold">{formatCurrency(source.cost_per_lead)}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Conversion</div>
                        <div className="font-bold">{source.conversion_rate}%</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Avg Deal</div>
                        <div className="font-bold">{formatCurrency(source.average_deal_size)}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">ROI</div>
                        <div className={`font-bold ${source.roi_percentage > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {source.roi_percentage}%
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Top Performing Sources</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {sourceROI.slice(0, 3).map((source, idx) => (
                    <div key={source.id} className="flex items-center justify-between">
                      <div>
                        <span className="font-medium">#{idx + 1} {source.source_name}</span>
                      </div>
                      <Badge variant="outline">{source.roi_percentage}% ROI</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">High-Value Leads</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {aiLeadScores
                    .filter(score => score.overall_score >= 80)
                    .slice(0, 3)
                    .map((score) => (
                      <div key={score.id} className="flex items-center justify-between">
                        <div>
                          <span className="font-medium">
                            {score.lead.first_name} {score.lead.last_name}
                          </span>
                        </div>
                        <Badge className={getScoreColor(score.overall_score)}>
                          {score.overall_score}
                        </Badge>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Urgent Follow-ups</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {aiLeadScores
                    .filter(score => score.intent_score >= 70 && score.timing_score >= 70)
                    .slice(0, 3)
                    .map((score) => (
                      <div key={score.id} className="flex items-center justify-between">
                        <div>
                          <span className="font-medium">
                            {score.lead.first_name} {score.lead.last_name}
                          </span>
                        </div>
                        <Badge variant="destructive">
                          <Clock className="h-3 w-3 mr-1" />
                          Urgent
                        </Badge>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="predictions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Predictive Analytics</CardTitle>
              <CardDescription>
                AI-powered predictions for deal closure and revenue forecasting
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {aiLeadScores.filter(s => s.conversion_probability >= 70).length}
                  </div>
                  <div className="text-sm text-muted-foreground">High Probability Deals</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold">
                    {formatCurrency(
                      aiLeadScores
                        .filter(s => s.conversion_probability >= 70)
                        .reduce((sum, s) => sum + (s.estimated_deal_size * s.conversion_probability / 100), 0)
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">Weighted Pipeline Value</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold">
                    {Math.round(
                      aiLeadScores.reduce((sum, s) => sum + s.estimated_close_time_days, 0) / 
                      (aiLeadScores.length || 1)
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">Avg Days to Close</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {Math.round(
                      aiLeadScores.reduce((sum, s) => sum + s.conversion_probability, 0) / 
                      (aiLeadScores.length || 1)
                    )}%
                  </div>
                  <div className="text-sm text-muted-foreground">Avg Conversion Rate</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};