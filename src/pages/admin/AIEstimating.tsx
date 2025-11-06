import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Brain,
  TrendingUp,
  DollarSign,
  FileText,
  Target,
  AlertCircle,
  CheckCircle,
  Clock,
  Sparkles
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AIEstimate {
  id: string;
  estimate_name: string;
  project_type: string;
  square_footage: number;
  predicted_total_cost: number;
  recommended_bid_amount: number;
  win_probability: number;
  confidence_score: number;
  status: string;
  created_at: string;
}

export function AIEstimating() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [estimates, setEstimates] = useState<AIEstimate[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Form state
  const [projectName, setProjectName] = useState('');
  const [projectType, setProjectType] = useState('residential_new');
  const [squareFootage, setSquareFootage] = useState('');
  const [locationZip, setLocationZip] = useState('');
  const [durationDays, setDurationDays] = useState('30');

  // Result state
  const [currentEstimate, setCurrentEstimate] = useState<any>(null);

  useEffect(() => {
    fetchEstimates();
  }, []);

  const fetchEstimates = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('ai_cost_predictions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20) as any;

      if (error) throw error;
      setEstimates(data as any || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const generateEstimate = async () => {
    if (!projectName || !squareFootage || !locationZip) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    setGenerating(true);
    try {
      // Get tenant_id from user profile
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('tenant_id')
        .eq('id', user?.id)
        .single();

      const response = await fetch(`https://ilhzuvemiuyfuxfegtlv.supabase.co/functions/v1/ai-estimating`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({
          tenant_id: profile?.tenant_id,
          user_id: user?.id,
          project_name: projectName,
          project_type: projectType,
          square_footage: parseFloat(squareFootage),
          location_zip: locationZip,
          estimated_duration_days: parseInt(durationDays)
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to generate estimate');
      }

      setCurrentEstimate(result.estimate);
      fetchEstimates();

      toast({
        title: 'Estimate Generated!',
        description: 'AI has analyzed your project and created an estimate',
      });

      // Clear form
      setProjectName('');
      setSquareFootage('');
      setLocationZip('');
      setDurationDays('30');

    } catch (error: any) {
      console.error('Generate estimate error:', error);
      toast({
        title: 'Generation Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setGenerating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { color: string; label: string }> = {
      draft: { color: 'bg-gray-500', label: 'Draft' },
      reviewed: { color: 'bg-blue-500', label: 'Reviewed' },
      approved: { color: 'bg-green-500', label: 'Approved' },
      submitted: { color: 'bg-purple-500', label: 'Submitted' },
      won: { color: 'bg-green-600', label: 'Won' },
      lost: { color: 'bg-red-500', label: 'Lost' }
    };

    const variant = variants[status] || variants.draft;
    return <Badge className={variant.color}>{variant.label}</Badge>;
  };

  const getConfidenceBadge = (score: number) => {
    if (score >= 80) return <Badge className="bg-green-500">High Confidence</Badge>;
    if (score >= 60) return <Badge className="bg-yellow-500">Medium Confidence</Badge>;
    return <Badge className="bg-orange-500">Low Confidence</Badge>;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Brain className="h-8 w-8" />
              AI Estimating
            </h1>
            <p className="text-muted-foreground">
              Generate accurate project estimates using AI and machine learning
            </p>
          </div>
          <Badge className="bg-gradient-to-r from-purple-500 to-pink-500">
            <Sparkles className="h-4 w-4 mr-1" />
            AI Powered
          </Badge>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="generate" className="space-y-4">
          <TabsList>
            <TabsTrigger value="generate">
              <Brain className="h-4 w-4 mr-2" />
              Generate Estimate
            </TabsTrigger>
            <TabsTrigger value="history">
              <Clock className="h-4 w-4 mr-2" />
              Estimate History
            </TabsTrigger>
            {currentEstimate && (
              <TabsTrigger value="results">
                <Target className="h-4 w-4 mr-2" />
                Latest Results
              </TabsTrigger>
            )}
          </TabsList>

          {/* Generate Estimate Tab */}
          <TabsContent value="generate" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>New AI Estimate</CardTitle>
                <CardDescription>
                  Provide project details and our AI will generate a detailed cost estimate
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  {/* Project Name */}
                  <div className="space-y-2">
                    <Label htmlFor="projectName">Project Name *</Label>
                    <Input
                      id="projectName"
                      placeholder="123 Main St Renovation"
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                    />
                  </div>

                  {/* Project Type */}
                  <div className="space-y-2">
                    <Label htmlFor="projectType">Project Type *</Label>
                    <Select value={projectType} onValueChange={setProjectType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="residential_new">Residential - New Construction</SelectItem>
                        <SelectItem value="residential_renovation">Residential - Renovation</SelectItem>
                        <SelectItem value="commercial_new">Commercial - New Construction</SelectItem>
                        <SelectItem value="commercial_renovation">Commercial - Renovation</SelectItem>
                        <SelectItem value="industrial">Industrial</SelectItem>
                        <SelectItem value="multi_family">Multi-Family</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Square Footage */}
                  <div className="space-y-2">
                    <Label htmlFor="squareFootage">Square Footage *</Label>
                    <Input
                      id="squareFootage"
                      type="number"
                      placeholder="2500"
                      value={squareFootage}
                      onChange={(e) => setSquareFootage(e.target.value)}
                    />
                  </div>

                  {/* Location ZIP */}
                  <div className="space-y-2">
                    <Label htmlFor="locationZip">Location ZIP Code *</Label>
                    <Input
                      id="locationZip"
                      placeholder="12345"
                      maxLength={5}
                      value={locationZip}
                      onChange={(e) => setLocationZip(e.target.value)}
                    />
                  </div>

                  {/* Duration */}
                  <div className="space-y-2">
                    <Label htmlFor="durationDays">Estimated Duration (days)</Label>
                    <Input
                      id="durationDays"
                      type="number"
                      placeholder="30"
                      value={durationDays}
                      onChange={(e) => setDurationDays(e.target.value)}
                    />
                  </div>
                </div>

                <Button
                  onClick={generateEstimate}
                  disabled={generating}
                  className="w-full"
                  size="lg"
                >
                  {generating ? (
                    <>
                      <Brain className="h-5 w-5 mr-2 animate-pulse" />
                      Generating AI Estimate...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-5 w-5 mr-2" />
                      Generate AI Estimate
                    </>
                  )}
                </Button>

                <p className="text-sm text-muted-foreground text-center">
                  AI will analyze historical data, market trends, and similar projects to generate your estimate
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Estimate History Tab */}
          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Estimate History</CardTitle>
                <CardDescription>
                  View all AI-generated estimates
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {estimates.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No estimates yet</p>
                      <p className="text-sm">Generate your first AI estimate to get started</p>
                    </div>
                  ) : (
                    estimates.map((estimate) => (
                      <Card key={estimate.id} className="hover:shadow-md transition-shadow">
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <div>
                              <CardTitle className="text-lg">{estimate.estimate_name}</CardTitle>
                              <p className="text-sm text-muted-foreground">
                                {estimate.project_type.replace('_', ' ')} • {estimate.square_footage.toLocaleString()} sq ft
                              </p>
                            </div>
                            <div className="text-right space-y-1">
                              {getStatusBadge(estimate.status)}
                              {getConfidenceBadge(estimate.confidence_score)}
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-3 gap-4">
                            <div>
                              <p className="text-sm text-muted-foreground">Estimated Cost</p>
                              <p className="text-xl font-bold">{formatCurrency(estimate.predicted_total_cost)}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Recommended Bid</p>
                              <p className="text-xl font-bold text-green-600">
                                {formatCurrency(estimate.recommended_bid_amount)}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Win Probability</p>
                              <p className="text-xl font-bold">{estimate.win_probability}%</p>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground mt-4">
                            Created {formatDate(estimate.created_at)}
                          </p>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Latest Results Tab */}
          {currentEstimate && (
            <TabsContent value="results" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-6 w-6 text-green-500" />
                    Estimate Generated Successfully
                  </CardTitle>
                  <CardDescription>
                    {currentEstimate.estimate_name}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Recommendations */}
                  <div className="grid gap-4 md:grid-cols-3">
                    <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium">Estimated Cost</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-3xl font-bold">
                          {formatCurrency(currentEstimate.predictions.total_cost)}
                        </p>
                      </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium">Recommended Bid</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-3xl font-bold text-green-700 dark:text-green-300">
                          {formatCurrency(currentEstimate.recommendations.bid_amount)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {currentEstimate.recommendations.markup_percentage}% markup
                        </p>
                      </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium">Win Probability</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-3xl font-bold text-purple-700 dark:text-purple-300">
                          {currentEstimate.recommendations.win_probability}%
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Based on market data
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Cost Breakdown */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Cost Breakdown</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                        <span>Labor ({currentEstimate.predictions.labor_hours} hours)</span>
                        <span className="font-semibold">{formatCurrency(currentEstimate.predictions.labor_cost)}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                        <span>Materials</span>
                        <span className="font-semibold">{formatCurrency(currentEstimate.predictions.material_cost)}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                        <span>Equipment</span>
                        <span className="font-semibold">{formatCurrency(currentEstimate.predictions.equipment_cost)}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                        <span>Subcontractors</span>
                        <span className="font-semibold">{formatCurrency(currentEstimate.predictions.subcontractor_cost)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Confidence Indicator */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Confidence Analysis</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between mb-2">
                        <span>Confidence Score</span>
                        {getConfidenceBadge(currentEstimate.confidence.score)}
                      </div>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <p>• Based on {currentEstimate.confidence.similar_projects} similar projects</p>
                        <p>• Data quality: {currentEstimate.confidence.data_quality}</p>
                      </div>
                    </CardContent>
                  </Card>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
