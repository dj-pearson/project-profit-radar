import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertTriangle,
  TrendingDown,
  Users,
  Mail,
  Phone,
  Clock,
  Target,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

interface ChurnPrediction {
  id: string;
  user_id: string;
  churn_probability: number;
  predicted_churn_date: string;
  confidence_level: string;
  contributing_factors: string[];
  recommended_interventions: string[];
  intervention_attempted: boolean;
  intervention_successful: boolean;
  prediction_date: string;
  user_email: string;
  user_name: string;
  health_score: number;
  days_since_login: number;
  active_projects: number;
}

interface InterventionStats {
  total_predictions: number;
  high_risk_users: number;
  interventions_attempted: number;
  interventions_successful: number;
  success_rate: number;
  churn_prevented: number;
}

export const ChurnPrediction = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [predictions, setPredictions] = useState<ChurnPrediction[]>([]);
  const [stats, setStats] = useState<InterventionStats | null>(null);
  const [selectedTab, setSelectedTab] = useState<'high' | 'medium' | 'low'>('high');

  useEffect(() => {
    loadPredictionData();
  }, []);

  const loadPredictionData = async () => {
    setLoading(true);
    try {
      // Load churn predictions with user data
      const { data: predictionsData, error: predictionsError } = await supabase
        .from('churn_predictions')
        .select(`
          *,
          user_profiles!inner(email, first_name, last_name),
          user_health_scores!inner(health_score, days_since_login, active_projects)
        `)
        .order('churn_probability', { ascending: false });

      if (predictionsError) throw predictionsError;

      // Transform data
      const transformedPredictions: ChurnPrediction[] = (predictionsData || []).map((p: any) => ({
        id: p.id,
        user_id: p.user_id,
        churn_probability: p.churn_probability,
        predicted_churn_date: p.predicted_churn_date,
        confidence_level: p.confidence_level,
        contributing_factors: p.contributing_factors || [],
        recommended_interventions: p.recommended_interventions || [],
        intervention_attempted: p.intervention_attempted,
        intervention_successful: p.intervention_successful,
        prediction_date: p.prediction_date,
        user_email: p.user_profiles.email,
        user_name: `${p.user_profiles.first_name} ${p.user_profiles.last_name}`,
        health_score: p.user_health_scores.health_score,
        days_since_login: p.user_health_scores.days_since_login,
        active_projects: p.user_health_scores.active_projects,
      }));

      setPredictions(transformedPredictions);

      // Calculate stats
      const totalPredictions = transformedPredictions.length;
      const highRiskUsers = transformedPredictions.filter(p => p.churn_probability >= 70).length;
      const interventionsAttempted = transformedPredictions.filter(p => p.intervention_attempted).length;
      const interventionsSuccessful = transformedPredictions.filter(p => p.intervention_successful).length;
      const successRate = interventionsAttempted > 0 ? (interventionsSuccessful / interventionsAttempted) * 100 : 0;

      setStats({
        total_predictions: totalPredictions,
        high_risk_users: highRiskUsers,
        interventions_attempted: interventionsAttempted,
        interventions_successful: interventionsSuccessful,
        success_rate: successRate,
        churn_prevented: interventionsSuccessful,
      });
    } catch (error) {
      console.error('Failed to load churn predictions:', error);
      toast({
        title: 'Error',
        description: 'Failed to load churn predictions.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const generatePredictions = async () => {
    try {
      toast({
        title: 'Generating Predictions',
        description: 'Running churn prediction model...',
      });

      // Call edge function to generate predictions
      const { data, error } = await supabase.functions.invoke('generate-churn-predictions');

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Generated ${data?.count || 0} churn predictions.`,
      });

      loadPredictionData();
    } catch (error) {
      console.error('Failed to generate predictions:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate predictions.',
        variant: 'destructive',
      });
    }
  };

  const triggerIntervention = async (predictionId: string, userId: string) => {
    try {
      // Update intervention status
      const { error } = await supabase
        .from('churn_predictions')
        .update({ intervention_taken: true, intervention_type: 'email' } as any)
        .eq('id', predictionId);

      if (error) throw error;

      // Trigger intervention email
      await supabase.functions.invoke('send-intervention-email', {
        body: { userId, predictionId },
      });

      toast({
        title: 'Intervention Triggered',
        description: 'Outreach email sent to user.',
      });

      loadPredictionData();
    } catch (error) {
      console.error('Failed to trigger intervention:', error);
      toast({
        title: 'Error',
        description: 'Failed to trigger intervention.',
        variant: 'destructive',
      });
    }
  };

  const getRiskBadge = (probability: number) => {
    if (probability >= 70) return <Badge className="bg-red-500">High Risk ({probability}%)</Badge>;
    if (probability >= 40) return <Badge className="bg-orange-500">Medium Risk ({probability}%)</Badge>;
    return <Badge className="bg-yellow-500">Low Risk ({probability}%)</Badge>;
  };

  const getConfidenceBadge = (confidence: string) => {
    const config = {
      high: { color: 'bg-green-500', label: 'High Confidence' },
      medium: { color: 'bg-yellow-500', label: 'Medium Confidence' },
      low: { color: 'bg-gray-500', label: 'Low Confidence' },
    };

    const { color, label } = config[confidence as keyof typeof config] || config.low;
    return <Badge className={`${color} text-white`}>{label}</Badge>;
  };

  const filterPredictions = (riskLevel: 'high' | 'medium' | 'low') => {
    if (riskLevel === 'high') return predictions.filter(p => p.churn_probability >= 70);
    if (riskLevel === 'medium') return predictions.filter(p => p.churn_probability >= 40 && p.churn_probability < 70);
    return predictions.filter(p => p.churn_probability < 40);
  };

  if (loading) {
    return (
      <DashboardLayout title="Churn Prediction">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <AlertTriangle className="w-12 h-12 text-construction-orange animate-pulse mx-auto mb-4" />
            <p className="text-muted-foreground">Loading churn predictions...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Churn Prediction">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-construction-dark">Churn Prediction AI</h1>
            <p className="text-muted-foreground">Predict and prevent customer churn with AI-powered insights</p>
          </div>
          <Button onClick={generatePredictions}>
            <Target className="w-4 h-4 mr-2" />
            Generate Predictions
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-5">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Predictions</p>
                  <p className="text-2xl font-bold mt-2">{stats?.total_predictions || 0}</p>
                </div>
                <div className="bg-blue-100 p-3 rounded-lg">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">High Risk</p>
                  <p className="text-2xl font-bold mt-2">{stats?.high_risk_users || 0}</p>
                </div>
                <div className="bg-red-100 p-3 rounded-lg">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Interventions</p>
                  <p className="text-2xl font-bold mt-2">{stats?.interventions_attempted || 0}</p>
                </div>
                <div className="bg-orange-100 p-3 rounded-lg">
                  <Mail className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Success Rate</p>
                  <p className="text-2xl font-bold mt-2">{stats?.success_rate.toFixed(0) || 0}%</p>
                </div>
                <div className="bg-green-100 p-3 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Churn Prevented</p>
                  <p className="text-2xl font-bold mt-2">{stats?.churn_prevented || 0}</p>
                </div>
                <div className="bg-purple-100 p-3 rounded-lg">
                  <TrendingDown className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Predictions by Risk Level */}
        <Tabs value={selectedTab} onValueChange={(v) => setSelectedTab(v as any)}>
          <TabsList>
            <TabsTrigger value="high">
              High Risk ({filterPredictions('high').length})
            </TabsTrigger>
            <TabsTrigger value="medium">
              Medium Risk ({filterPredictions('medium').length})
            </TabsTrigger>
            <TabsTrigger value="low">
              Low Risk ({filterPredictions('low').length})
            </TabsTrigger>
          </TabsList>

          {/* High Risk Tab */}
          <TabsContent value="high" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>High Risk Users (70%+ Churn Probability)</CardTitle>
                <CardDescription>Users requiring immediate intervention</CardDescription>
              </CardHeader>
              <CardContent>
                {filterPredictions('high').length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
                    <p className="text-muted-foreground">No high-risk users at this time</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filterPredictions('high').map((prediction) => (
                      <div key={prediction.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="font-semibold">{prediction.user_name}</p>
                            <p className="text-sm text-muted-foreground">{prediction.user_email}</p>
                          </div>
                          <div className="flex gap-2">
                            {getRiskBadge(prediction.churn_probability)}
                            {getConfidenceBadge(prediction.confidence_level)}
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4 mb-3">
                          <div>
                            <p className="text-xs text-muted-foreground">Health Score</p>
                            <p className="font-semibold">{prediction.health_score}/100</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Days Since Login</p>
                            <p className="font-semibold">{prediction.days_since_login}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Active Projects</p>
                            <p className="font-semibold">{prediction.active_projects}</p>
                          </div>
                        </div>

                        <div className="mb-3">
                          <p className="text-sm font-medium mb-1">Contributing Factors:</p>
                          <div className="flex flex-wrap gap-1">
                            {prediction.contributing_factors.map((factor, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {factor}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        <div className="mb-3">
                          <p className="text-sm font-medium mb-1">Recommended Interventions:</p>
                          <ul className="text-sm text-muted-foreground list-disc list-inside">
                            {prediction.recommended_interventions.map((intervention, idx) => (
                              <li key={idx}>{intervention}</li>
                            ))}
                          </ul>
                        </div>

                        <div className="flex gap-2">
                          {!prediction.intervention_attempted ? (
                            <Button
                              size="sm"
                              onClick={() => triggerIntervention(prediction.id, prediction.user_id)}
                            >
                              <Mail className="w-4 h-4 mr-2" />
                              Send Intervention
                            </Button>
                          ) : (
                            <Badge className={prediction.intervention_successful ? 'bg-green-500' : 'bg-orange-500'}>
                              {prediction.intervention_successful ? (
                                <>
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Intervention Successful
                                </>
                              ) : (
                                <>
                                  <Clock className="w-3 h-3 mr-1" />
                                  Intervention In Progress
                                </>
                              )}
                            </Badge>
                          )}
                          <Button size="sm" variant="outline">
                            <Phone className="w-4 h-4 mr-2" />
                            Call User
                          </Button>
                        </div>

                        <div className="mt-2 text-xs text-muted-foreground">
                          Predicted churn date: {new Date(prediction.predicted_churn_date).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Medium Risk Tab */}
          <TabsContent value="medium" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Medium Risk Users (40-69% Churn Probability)</CardTitle>
                <CardDescription>Users requiring monitoring and engagement</CardDescription>
              </CardHeader>
              <CardContent>
                {filterPredictions('medium').length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
                    <p className="text-muted-foreground">No medium-risk users at this time</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filterPredictions('medium').map((prediction) => (
                      <div key={prediction.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-semibold">{prediction.user_name}</p>
                            <p className="text-sm text-muted-foreground">{prediction.user_email}</p>
                          </div>
                          {getRiskBadge(prediction.churn_probability)}
                        </div>

                        <div className="grid grid-cols-3 gap-4 mb-2">
                          <div>
                            <p className="text-xs text-muted-foreground">Health Score</p>
                            <p className="font-semibold">{prediction.health_score}/100</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Days Since Login</p>
                            <p className="font-semibold">{prediction.days_since_login}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Active Projects</p>
                            <p className="font-semibold">{prediction.active_projects}</p>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-1 mb-2">
                          {prediction.contributing_factors.map((factor, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {factor}
                            </Badge>
                          ))}
                        </div>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => triggerIntervention(prediction.id, prediction.user_id)}
                          disabled={prediction.intervention_attempted}
                        >
                          <Mail className="w-4 h-4 mr-2" />
                          {prediction.intervention_attempted ? 'Intervention Sent' : 'Send Engagement Email'}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Low Risk Tab */}
          <TabsContent value="low" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Low Risk Users (&lt;40% Churn Probability)</CardTitle>
                <CardDescription>Healthy users with low churn risk</CardDescription>
              </CardHeader>
              <CardContent>
                {filterPredictions('low').length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No low-risk predictions</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filterPredictions('low').map((prediction) => (
                      <div key={prediction.id} className="border rounded-lg p-3 flex items-center justify-between">
                        <div>
                          <p className="font-medium">{prediction.user_name}</p>
                          <p className="text-xs text-muted-foreground">{prediction.user_email}</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">Health Score</p>
                            <p className="font-semibold">{prediction.health_score}/100</p>
                          </div>
                          {getRiskBadge(prediction.churn_probability)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default ChurnPrediction;
