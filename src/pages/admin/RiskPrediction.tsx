import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import {
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Shield,
  DollarSign,
  Clock,
  CheckCircle2,
  XCircle,
  Brain,
  Target,
  ArrowRight,
  AlertTriangle
} from 'lucide-react';

interface RiskPrediction {
  id: string;
  project_id: string;
  overall_risk_score: number;
  delay_risk_score: number;
  budget_risk_score: number;
  safety_risk_score: number;
  quality_risk_score: number;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  predicted_delay_days: number;
  predicted_cost_overrun: number;
  predicted_completion_date: string;
  confidence_score: number;
  prediction_date: string;
  created_at: string;
}

interface RiskFactor {
  id: string;
  factor_type: string;
  factor_name: string;
  description: string;
  impact_score: number;
  likelihood: number;
  mitigation_strategy: string;
  is_mitigated: boolean;
}

interface RiskRecommendation {
  id: string;
  recommendation_type: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  title: string;
  description: string;
  expected_cost_savings: number;
  expected_time_savings: number;
  success_probability: number;
  status: 'pending' | 'in_progress' | 'completed' | 'declined';
}

interface RiskAlert {
  id: string;
  alert_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  status: 'active' | 'acknowledged' | 'resolved' | 'dismissed';
  created_at: string;
}

interface Project {
  id: string;
  name: string;
  status: string;
}

export function RiskPrediction() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [prediction, setPrediction] = useState<RiskPrediction | null>(null);
  const [factors, setFactors] = useState<RiskFactor[]>([]);
  const [recommendations, setRecommendations] = useState<RiskRecommendation[]>([]);
  const [alerts, setAlerts] = useState<RiskAlert[]>([]);
  const [history, setHistory] = useState<RiskPrediction[]>([]);

  // Load projects on mount
  useEffect(() => {
    loadProjects();
  }, [user]);

  // Load prediction when project changes
  useEffect(() => {
    if (selectedProjectId) {
      loadLatestPrediction(selectedProjectId);
    }
  }, [selectedProjectId]);

  const loadProjects = async () => {
    try {
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('tenant_id')
        .eq('id', user?.id)
        .single();

      if (!userProfile?.tenant_id) return;

      const { data, error } = await supabase
        .from('projects')
        .select('id, name, status')
        .eq('tenant_id', userProfile.tenant_id)
        .in('status', ['planning', 'active', 'on_hold'])
        .order('name');

      if (error) throw error;
      setProjects(data || []);

      if (data && data.length > 0 && !selectedProjectId) {
        setSelectedProjectId(data[0].id);
      }
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };

  const loadLatestPrediction = async (projectId: string) => {
    setLoading(true);
    try {
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('tenant_id')
        .eq('id', user?.id)
        .single();

      if (!userProfile?.tenant_id) return;

      // Get latest prediction
      const { data: predictionData, error: predError } = await supabase
        .from('risk_predictions')
        .select('*')
        .eq('project_id', projectId)
        .eq('tenant_id', userProfile.tenant_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (predError && predError.code !== 'PGRST116') {
        throw predError;
      }

      if (predictionData) {
        setPrediction(predictionData);

        // Load risk factors
        const { data: factorsData } = await supabase
          .from('risk_factors')
          .select('*')
          .eq('risk_prediction_id', predictionData.id);
        setFactors(factorsData || []);

        // Load recommendations
        const { data: recsData } = await supabase
          .from('risk_recommendations')
          .select('*')
          .eq('risk_prediction_id', predictionData.id)
          .order('priority', { ascending: false });
        setRecommendations(recsData || []);

        // Load active alerts
        const { data: alertsData } = await supabase
          .from('risk_alerts')
          .select('*')
          .eq('project_id', projectId)
          .eq('status', 'active')
          .order('severity', { ascending: false });
        setAlerts(alertsData || []);
      } else {
        setPrediction(null);
        setFactors([]);
        setRecommendations([]);
        setAlerts([]);
      }

      // Load prediction history
      const { data: historyData } = await supabase
        .from('risk_predictions')
        .select('*')
        .eq('project_id', projectId)
        .eq('tenant_id', userProfile.tenant_id)
        .order('created_at', { ascending: false })
        .limit(10);
      setHistory(historyData || []);

    } catch (error) {
      console.error('Error loading prediction:', error);
    } finally {
      setLoading(false);
    }
  };

  const generatePrediction = async () => {
    if (!selectedProjectId) return;

    setGenerating(true);
    try {
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('tenant_id')
        .eq('id', user?.id)
        .single();

      if (!userProfile?.tenant_id) return;

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const response = await fetch(
        `${supabase.supabaseUrl}/functions/v1/risk-prediction`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            tenant_id: userProfile.tenant_id,
            project_id: selectedProjectId,
            user_id: user?.id
          })
        }
      );

      if (!response.ok) {
        throw new Error('Failed to generate prediction');
      }

      const result = await response.json();

      // Reload data
      await loadLatestPrediction(selectedProjectId);

    } catch (error) {
      console.error('Error generating prediction:', error);
      alert('Failed to generate risk prediction. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const acknowledgeAlert = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('risk_alerts')
        .update({
          status: 'acknowledged',
          acknowledged_by: user?.id,
          acknowledged_at: new Date().toISOString()
        })
        .eq('id', alertId);

      if (error) throw error;

      // Refresh alerts
      setAlerts(alerts.filter(a => a.id !== alertId));
    } catch (error) {
      console.error('Error acknowledging alert:', error);
    }
  };

  const updateRecommendationStatus = async (recId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('risk_recommendations')
        .update({ status: newStatus })
        .eq('id', recId);

      if (error) throw error;

      // Update local state
      setRecommendations(recommendations.map(r =>
        r.id === recId ? { ...r, status: newStatus as any } : r
      ));
    } catch (error) {
      console.error('Error updating recommendation:', error);
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'critical': return 'text-red-600 bg-red-50';
      case 'high': return 'text-orange-600 bg-orange-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-600 bg-red-50';
      case 'high': return 'text-orange-600 bg-orange-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-blue-600 bg-blue-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'in_progress': return <Clock className="h-4 w-4 text-blue-600" />;
      case 'declined': return <XCircle className="h-4 w-4 text-red-600" />;
      default: return <AlertCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            AI Risk Prediction
          </h1>
          <p className="text-muted-foreground mt-1">
            Predictive analytics to identify project risks before they become problems
          </p>
        </div>
        <Brain className="h-12 w-12 text-purple-600 opacity-50" />
      </div>

      {/* Project Selection & Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Select Project</CardTitle>
          <CardDescription>
            Choose a project to analyze risk factors and generate predictions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select a project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name} ({project.status})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={generatePrediction}
              disabled={!selectedProjectId || generating}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              {generating ? (
                <>
                  <Brain className="mr-2 h-4 w-4 animate-pulse" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Brain className="mr-2 h-4 w-4" />
                  Generate Prediction
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Active Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert) => (
            <Alert key={alert.id} variant={alert.severity === 'critical' || alert.severity === 'high' ? 'destructive' : 'default'}>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle className="flex items-center justify-between">
                <span>{alert.title}</span>
                <div className="flex gap-2">
                  <Badge className={getRiskColor(alert.severity)}>
                    {alert.severity.toUpperCase()}
                  </Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => acknowledgeAlert(alert.id)}
                  >
                    Acknowledge
                  </Button>
                </div>
              </AlertTitle>
              <AlertDescription>{alert.message}</AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {loading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center space-y-4">
              <Brain className="h-12 w-12 animate-pulse text-purple-600 mx-auto" />
              <p className="text-muted-foreground">Loading risk data...</p>
            </div>
          </CardContent>
        </Card>
      ) : !prediction ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center space-y-4">
              <Target className="h-12 w-12 text-muted-foreground mx-auto" />
              <div>
                <p className="text-lg font-semibold">No Risk Prediction Available</p>
                <p className="text-muted-foreground">
                  Generate a new risk prediction to analyze this project
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="factors">Risk Factors</TabsTrigger>
            <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            {/* Overall Risk Score */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Overall Risk Assessment</span>
                  <Badge className={getRiskColor(prediction.risk_level)}>
                    {prediction.risk_level.toUpperCase()} RISK
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Prediction generated on {new Date(prediction.prediction_date).toLocaleDateString()}
                  {' '}with {prediction.confidence_score}% confidence
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Overall Risk Score</span>
                      <span className="text-2xl font-bold">{prediction.overall_risk_score.toFixed(1)}/100</span>
                    </div>
                    <Progress value={prediction.overall_risk_score} className="h-3" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-medium">Budget Risk</span>
                      </div>
                      <Progress value={prediction.budget_risk_score} className="h-2" />
                      <span className="text-xs text-muted-foreground">
                        {prediction.budget_risk_score.toFixed(1)}%
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-medium">Delay Risk</span>
                      </div>
                      <Progress value={prediction.delay_risk_score} className="h-2" />
                      <span className="text-xs text-muted-foreground">
                        {prediction.delay_risk_score.toFixed(1)}%
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-orange-600" />
                        <span className="text-sm font-medium">Safety Risk</span>
                      </div>
                      <Progress value={prediction.safety_risk_score} className="h-2" />
                      <span className="text-xs text-muted-foreground">
                        {prediction.safety_risk_score.toFixed(1)}%
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Target className="h-4 w-4 text-purple-600" />
                        <span className="text-sm font-medium">Quality Risk</span>
                      </div>
                      <Progress value={prediction.quality_risk_score} className="h-2" />
                      <span className="text-xs text-muted-foreground">
                        {prediction.quality_risk_score.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Predictions */}
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Predicted Delay
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {prediction.predicted_delay_days} days
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Expected completion delay
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Predicted Overrun
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    ${prediction.predicted_cost_overrun.toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Expected cost overrun
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    New Completion Date
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {new Date(prediction.predicted_completion_date).toLocaleDateString()}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Adjusted timeline
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Risk Factors Tab */}
          <TabsContent value="factors" className="space-y-4">
            {factors.length === 0 ? (
              <Card>
                <CardContent className="flex items-center justify-center py-12">
                  <p className="text-muted-foreground">No risk factors identified</p>
                </CardContent>
              </Card>
            ) : (
              factors.map((factor) => (
                <Card key={factor.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>{factor.factor_name}</span>
                      <Badge variant="outline" className="capitalize">
                        {factor.factor_type}
                      </Badge>
                    </CardTitle>
                    <CardDescription>{factor.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium">Impact Score</span>
                          <span className="text-sm font-bold">{factor.impact_score.toFixed(0)}%</span>
                        </div>
                        <Progress value={factor.impact_score} className="h-2" />
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium">Likelihood</span>
                          <span className="text-sm font-bold">{factor.likelihood.toFixed(0)}%</span>
                        </div>
                        <Progress value={factor.likelihood} className="h-2" />
                      </div>
                    </div>
                    {factor.mitigation_strategy && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <p className="text-sm font-medium text-blue-900 mb-1">Mitigation Strategy</p>
                        <p className="text-sm text-blue-700">{factor.mitigation_strategy}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Recommendations Tab */}
          <TabsContent value="recommendations" className="space-y-4">
            {recommendations.length === 0 ? (
              <Card>
                <CardContent className="flex items-center justify-center py-12">
                  <p className="text-muted-foreground">No recommendations available</p>
                </CardContent>
              </Card>
            ) : (
              recommendations.map((rec) => (
                <Card key={rec.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        {getStatusIcon(rec.status)}
                        {rec.title}
                      </span>
                      <Badge className={getPriorityColor(rec.priority)}>
                        {rec.priority.toUpperCase()}
                      </Badge>
                    </CardTitle>
                    <CardDescription>{rec.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      {rec.expected_cost_savings > 0 && (
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-green-600" />
                          <div>
                            <p className="text-xs text-muted-foreground">Potential Savings</p>
                            <p className="font-semibold">${rec.expected_cost_savings.toLocaleString()}</p>
                          </div>
                        </div>
                      )}
                      {rec.expected_time_savings > 0 && (
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-blue-600" />
                          <div>
                            <p className="text-xs text-muted-foreground">Time Savings</p>
                            <p className="font-semibold">{rec.expected_time_savings} days</p>
                          </div>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Target className="h-4 w-4 text-purple-600" />
                        <div>
                          <p className="text-xs text-muted-foreground">Success Rate</p>
                          <p className="font-semibold">{rec.success_probability}%</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {rec.status === 'pending' && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => updateRecommendationStatus(rec.id, 'in_progress')}
                          >
                            <ArrowRight className="mr-1 h-3 w-3" />
                            Start Implementation
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateRecommendationStatus(rec.id, 'declined')}
                          >
                            Decline
                          </Button>
                        </>
                      )}
                      {rec.status === 'in_progress' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateRecommendationStatus(rec.id, 'completed')}
                        >
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                          Mark Complete
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-4">
            {history.length === 0 ? (
              <Card>
                <CardContent className="flex items-center justify-center py-12">
                  <p className="text-muted-foreground">No prediction history available</p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Prediction History</CardTitle>
                  <CardDescription>Track risk trends over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {history.map((pred, index) => (
                      <div
                        key={pred.id}
                        className={`flex items-center justify-between p-4 border rounded-lg ${
                          index === 0 ? 'border-purple-200 bg-purple-50' : 'border-gray-200'
                        }`}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <Badge className={getRiskColor(pred.risk_level)}>
                              {pred.risk_level}
                            </Badge>
                            <span className="font-semibold">
                              {pred.overall_risk_score.toFixed(1)}% Overall Risk
                            </span>
                            {index === 0 && (
                              <Badge variant="outline">Current</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {new Date(pred.created_at).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex gap-6 text-sm">
                          <div>
                            <p className="text-muted-foreground">Delay</p>
                            <p className="font-semibold">{pred.predicted_delay_days}d</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Overrun</p>
                            <p className="font-semibold">${(pred.predicted_cost_overrun / 1000).toFixed(0)}k</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Confidence</p>
                            <p className="font-semibold">{pred.confidence_score}%</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
