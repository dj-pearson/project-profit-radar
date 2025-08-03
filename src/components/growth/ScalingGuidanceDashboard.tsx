import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { 
  TrendingUp, 
  Users, 
  Target, 
  CheckCircle, 
  AlertTriangle, 
  Clock,
  DollarSign,
  BarChart3,
  Lightbulb,
  Award
} from 'lucide-react';

interface CompanyMetrics {
  revenue: number;
  teamSize: number;
  projectCount: number;
  averageProjectValue: number;
  currentStage: string;
}

interface ScalingRecommendation {
  category: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  estimatedImpact: string;
  timeframe: string;
  investment: string;
  actionItems: Array<{
    action: string;
    timeframe: string;
    responsible: string;
    success_metric: string;
  }>;
}

interface ScalingAssessment {
  id: string;
  current_score: number;
  target_score: number;
  recommendations: any; // JSON type from Supabase
  priority_level: string;
  created_at: string;
}

interface ScalingMilestone {
  id: string;
  milestone_category: string;
  milestone_name: string;
  description: string;
  target_value: number;
  current_value: number;
  unit_type: string;
  target_date: string;
  is_achieved: boolean;
  difficulty_level: string;
}

export const ScalingGuidanceDashboard: React.FC = () => {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const [assessments, setAssessments] = useState<ScalingAssessment[]>([]);
  const [milestones, setMilestones] = useState<ScalingMilestone[]>([]);
  const [guidance, setGuidance] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [metrics, setMetrics] = useState<CompanyMetrics>({
    revenue: 0,
    teamSize: 0,
    projectCount: 0,
    averageProjectValue: 0,
    currentStage: 'small'
  });

  useEffect(() => {
    loadScalingData();
    loadGuidance();
  }, [userProfile]);

  const loadScalingData = async () => {
    if (!userProfile?.company_id) return;

    try {
      // Load assessments
      const { data: assessmentData, error: assessmentError } = await supabase
        .from('scaling_assessments')
        .select('*')
        .eq('company_id', userProfile.company_id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (assessmentError) throw assessmentError;
      setAssessments(assessmentData || []);

      // Load milestones
      const { data: milestoneData, error: milestoneError } = await supabase
        .from('scaling_milestones')
        .select('*')
        .eq('company_id', userProfile.company_id)
        .order('target_date', { ascending: true });

      if (milestoneError) throw milestoneError;
      setMilestones(milestoneData || []);

    } catch (error) {
      console.error('Error loading scaling data:', error);
      toast({
        title: "Error",
        description: "Failed to load scaling data",
        variant: "destructive"
      });
    }
  };

  const loadGuidance = async () => {
    try {
      const { data, error } = await supabase
        .from('scaling_guidance')
        .select('*')
        .eq('is_active', true)
        .order('priority_score', { ascending: false })
        .limit(10);

      if (error) throw error;
      setGuidance(data || []);
    } catch (error) {
      console.error('Error loading guidance:', error);
    }
  };

  const generateScalingPlan = async () => {
    if (!userProfile?.company_id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-scaling-plan', {
        body: {
          company_id: userProfile.company_id,
          current_metrics: metrics
        }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Scaling plan generated successfully",
      });

      loadScalingData();
    } catch (error) {
      console.error('Error generating scaling plan:', error);
      toast({
        title: "Error",
        description: "Failed to generate scaling plan",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'destructive';
      case 'high': return 'default';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'secondary';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'team_expansion': return <Users className="w-4 h-4" />;
      case 'financial_planning': return <DollarSign className="w-4 h-4" />;
      case 'process_optimization': return <BarChart3 className="w-4 h-4" />;
      case 'technology_adoption': return <Lightbulb className="w-4 h-4" />;
      default: return <Target className="w-4 h-4" />;
    }
  };

  const latestAssessment = assessments[0];
  const activeMilestones = milestones.filter(m => !m.is_achieved);
  const completedMilestones = milestones.filter(m => m.is_achieved);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Scaling Guidance</h1>
          <p className="text-muted-foreground">
            Strategic guidance and best practices for growing your construction business
          </p>
        </div>
        <Button onClick={generateScalingPlan} disabled={loading}>
          {loading ? 'Generating...' : 'Generate New Plan'}
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Score</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {latestAssessment?.current_score || 0}/100
            </div>
            <Progress 
              value={latestAssessment?.current_score || 0} 
              className="mt-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Target Score</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {latestAssessment?.target_score || 0}/100
            </div>
            <p className="text-xs text-muted-foreground">
              +{(latestAssessment?.target_score || 0) - (latestAssessment?.current_score || 0)} point improvement
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Milestones</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeMilestones.length}</div>
            <p className="text-xs text-muted-foreground">
              {completedMilestones.length} completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Priority Level</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <Badge variant={getPriorityColor(latestAssessment?.priority_level || 'medium')}>
              {latestAssessment?.priority_level || 'Medium'}
            </Badge>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="recommendations" className="space-y-4">
        <TabsList>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
          <TabsTrigger value="milestones">Milestones</TabsTrigger>
          <TabsTrigger value="guidance">Best Practices</TabsTrigger>
          <TabsTrigger value="assessment">New Assessment</TabsTrigger>
        </TabsList>

        <TabsContent value="recommendations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Scaling Recommendations</CardTitle>
              <CardDescription>
                Personalized recommendations based on your current business metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              {latestAssessment?.recommendations?.length > 0 ? (
                <div className="space-y-4">
                  {(Array.isArray(latestAssessment.recommendations) ? latestAssessment.recommendations : []).map((rec: any, index: number) => (
                    <Card key={index} className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          {getCategoryIcon(rec.category)}
                          <h3 className="font-semibold">{rec.title}</h3>
                        </div>
                        <Badge variant={getPriorityColor(rec.priority)}>
                          {rec.priority}
                        </Badge>
                      </div>
                      
                      <p className="text-sm text-muted-foreground mb-3">
                        {rec.description}
                      </p>
                      
                      <div className="grid grid-cols-3 gap-4 mb-3 text-sm">
                        <div>
                          <span className="font-medium">Impact:</span> {rec.estimatedImpact}
                        </div>
                        <div>
                          <span className="font-medium">Timeframe:</span> {rec.timeframe}
                        </div>
                        <div>
                          <span className="font-medium">Investment:</span> {rec.investment}
                        </div>
                      </div>
                      
                      {rec.actionItems?.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="font-medium text-sm">Action Items:</h4>
                          {rec.actionItems.map((item: any, itemIndex: number) => (
                            <div key={itemIndex} className="flex items-center gap-2 text-sm">
                              <CheckCircle className="w-4 h-4 text-muted-foreground" />
                              <span>{item.action}</span>
                              <Badge variant="outline" className="ml-auto">
                                {item.timeframe}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No recommendations available. Create a new assessment to get started.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="milestones" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Active Milestones</CardTitle>
                <CardDescription>Goals currently being worked towards</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {activeMilestones.map((milestone) => (
                  <div key={milestone.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium">{milestone.milestone_name}</h3>
                      <Badge variant="outline">{milestone.difficulty_level}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {milestone.description}
                    </p>
                    <div className="flex items-center justify-between text-sm">
                      <span>
                        {milestone.current_value} / {milestone.target_value} {milestone.unit_type}
                      </span>
                      <span>Due: {new Date(milestone.target_date).toLocaleDateString()}</span>
                    </div>
                    <Progress 
                      value={(milestone.current_value / milestone.target_value) * 100} 
                    />
                  </div>
                ))}
                {activeMilestones.length === 0 && (
                  <p className="text-center text-muted-foreground py-4">
                    No active milestones
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Completed Milestones</CardTitle>
                <CardDescription>Successfully achieved goals</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {completedMilestones.map((milestone) => (
                  <div key={milestone.id} className="flex items-center gap-3">
                    <Award className="w-5 h-5 text-green-600" />
                    <div>
                      <h3 className="font-medium">{milestone.milestone_name}</h3>
                      <p className="text-sm text-muted-foreground">
                        Completed milestone
                      </p>
                    </div>
                  </div>
                ))}
                {completedMilestones.length === 0 && (
                  <p className="text-center text-muted-foreground py-4">
                    No completed milestones yet
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="guidance" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {guidance.map((guide) => (
              <Card key={guide.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{guide.title}</CardTitle>
                    <Badge variant="outline">{guide.implementation_difficulty}</Badge>
                  </div>
                  <CardDescription>{guide.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-sm space-y-1">
                    <div><strong>Timeframe:</strong> {guide.estimated_timeframe}</div>
                    <div><strong>Investment:</strong> {guide.investment_required}</div>
                    <div><strong>Expected ROI:</strong> {guide.expected_roi}</div>
                  </div>
                  
                  {guide.step_by_step_guide?.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">Key Steps:</h4>
                      <ul className="text-sm space-y-1">
                        {guide.step_by_step_guide.slice(0, 3).map((step: any, index: number) => (
                          <li key={index} className="flex items-start gap-2">
                            <span className="text-muted-foreground">{index + 1}.</span>
                            <span>{step.title || step.description}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="assessment" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Create New Assessment</CardTitle>
              <CardDescription>
                Provide your current business metrics to generate personalized scaling recommendations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="revenue">Annual Revenue ($)</Label>
                  <Input
                    id="revenue"
                    type="number"
                    value={metrics.revenue}
                    onChange={(e) => setMetrics({...metrics, revenue: Number(e.target.value)})}
                    placeholder="500000"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="teamSize">Team Size</Label>
                  <Input
                    id="teamSize"
                    type="number"
                    value={metrics.teamSize}
                    onChange={(e) => setMetrics({...metrics, teamSize: Number(e.target.value)})}
                    placeholder="15"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="projectCount">Active Projects</Label>
                  <Input
                    id="projectCount"
                    type="number"
                    value={metrics.projectCount}
                    onChange={(e) => setMetrics({...metrics, projectCount: Number(e.target.value)})}
                    placeholder="8"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="averageProjectValue">Average Project Value ($)</Label>
                  <Input
                    id="averageProjectValue"
                    type="number"
                    value={metrics.averageProjectValue}
                    onChange={(e) => setMetrics({...metrics, averageProjectValue: Number(e.target.value)})}
                    placeholder="75000"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="currentStage">Current Business Stage</Label>
                <select
                  id="currentStage"
                  value={metrics.currentStage}
                  onChange={(e) => setMetrics({...metrics, currentStage: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="startup">Startup (0-2 years)</option>
                  <option value="early_growth">Early Growth (2-5 years)</option>
                  <option value="rapid_expansion">Rapid Expansion (5-10 years)</option>
                  <option value="maturity">Maturity (10+ years)</option>
                </select>
              </div>

              <Button 
                onClick={generateScalingPlan} 
                disabled={loading}
                className="w-full"
              >
                {loading ? 'Generating Assessment...' : 'Generate Scaling Plan'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};