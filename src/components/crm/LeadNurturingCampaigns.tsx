import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Mail, 
  Plus, 
  Play, 
  Pause,
  Users,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  Edit,
  Trash2
} from 'lucide-react';

interface NurturingCampaign {
  id: string;
  campaign_name: string;
  description?: string;
  campaign_type: string;
  total_steps: number;
  is_active: boolean;
  auto_enrollment: boolean;
  enrollment_count: number;
  completion_count: number;
  conversion_count: number;
  created_at: string;
}

interface CampaignStep {
  id: string;
  step_number: number;
  step_name: string;
  step_type: string;
  subject_line?: string;
  content?: string;
  delay_value: number;
  delay_unit: string;
  is_active: boolean;
}

interface CampaignEnrollment {
  id: string;
  status: string;
  current_step: number;
  steps_completed: number;
  emails_sent: number;
  emails_opened: number;
  emails_clicked: number;
  converted: boolean;
  enrolled_at: string;
  lead: {
    first_name: string;
    last_name: string;
    company_name?: string;
  };
}

export const LeadNurturingCampaigns: React.FC = () => {
  const [campaigns, setCampaigns] = useState<NurturingCampaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<NurturingCampaign | null>(null);
  const [campaignSteps, setCampaignSteps] = useState<CampaignStep[]>([]);
  const [enrollments, setEnrollments] = useState<CampaignEnrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();

  const [newCampaign, setNewCampaign] = useState({
    campaign_name: '',
    description: '',
    campaign_type: 'drip',
    auto_enrollment: false,
    score_threshold: 50
  });

  const [newStep, setNewStep] = useState({
    step_name: '',
    step_type: 'email',
    subject_line: '',
    content: '',
    delay_value: 1,
    delay_unit: 'days'
  });

  useEffect(() => {
    loadCampaigns();
  }, []);

  const loadCampaigns = async () => {
    try {
      const { data, error } = await supabase
        .from('lead_nurturing_campaigns')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCampaigns(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading campaigns",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadCampaignDetails = async (campaignId: string) => {
    try {
      // Load steps
      const { data: stepsData, error: stepsError } = await supabase
        .from('nurturing_campaign_steps')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('step_number');

      if (stepsError) throw stepsError;

      // Load enrollments
      const { data: enrollmentsData, error: enrollmentsError } = await supabase
        .from('lead_nurturing_enrollments')
        .select(`
          *,
          lead:leads(first_name, last_name, company_name)
        `)
        .eq('campaign_id', campaignId)
        .order('enrolled_at', { ascending: false })
        .limit(50);

      if (enrollmentsError) throw enrollmentsError;

      setCampaignSteps(stepsData || []);
      setEnrollments(enrollmentsData || []);
    } catch (error: any) {
      toast({
        title: "Error loading campaign details",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const createCampaign = async () => {
    try {
      setIsCreating(true);
      const { data, error } = await supabase
        .from('lead_nurturing_campaigns')
        .insert([{
          ...newCampaign,
          company_id: 'your-company-id' // This should come from user context
        }])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Campaign created",
        description: `${newCampaign.campaign_name} has been created successfully`
      });

      setNewCampaign({
        campaign_name: '',
        description: '',
        campaign_type: 'drip',
        auto_enrollment: false,
        score_threshold: 50
      });

      await loadCampaigns();
    } catch (error: any) {
      toast({
        title: "Error creating campaign",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
    }
  };

  const addStep = async (campaignId: string) => {
    try {
      const stepNumber = campaignSteps.length + 1;
      
      const { error } = await supabase
        .from('nurturing_campaign_steps')
        .insert([{
          campaign_id: campaignId,
          step_number: stepNumber,
          ...newStep
        }]);

      if (error) throw error;

      // Update campaign total steps
      await supabase
        .from('lead_nurturing_campaigns')
        .update({ total_steps: stepNumber })
        .eq('id', campaignId);

      toast({
        title: "Step added",
        description: "Campaign step has been added successfully"
      });

      setNewStep({
        step_name: '',
        step_type: 'email',
        subject_line: '',
        content: '',
        delay_value: 1,
        delay_unit: 'days'
      });

      await loadCampaignDetails(campaignId);
      await loadCampaigns();
    } catch (error: any) {
      toast({
        title: "Error adding step",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const toggleCampaignStatus = async (campaignId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('lead_nurturing_campaigns')
        .update({ is_active: !isActive })
        .eq('id', campaignId);

      if (error) throw error;

      toast({
        title: isActive ? "Campaign paused" : "Campaign activated",
        description: isActive ? "Campaign has been paused" : "Campaign is now active"
      });

      await loadCampaigns();
    } catch (error: any) {
      toast({
        title: "Error updating campaign",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const getStepIcon = (stepType: string) => {
    switch (stepType) {
      case 'email': return <Mail className="h-4 w-4" />;
      case 'task': return <CheckCircle className="h-4 w-4" />;
      case 'call': return <AlertCircle className="h-4 w-4" />;
      default: return <Mail className="h-4 w-4" />;
    }
  };

  if (loading) {
    return <div className="p-6">Loading nurturing campaigns...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Lead Nurturing Campaigns</h1>
          <p className="text-muted-foreground">Automated follow-ups and lead engagement</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Campaign
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Nurturing Campaign</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="campaign_name">Campaign Name</Label>
                <Input
                  id="campaign_name"
                  value={newCampaign.campaign_name}
                  onChange={(e) => setNewCampaign(prev => ({ ...prev, campaign_name: e.target.value }))}
                  placeholder="e.g., New Lead Welcome Series"
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newCampaign.description}
                  onChange={(e) => setNewCampaign(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe the purpose of this campaign"
                />
              </div>
              <div>
                <Label htmlFor="campaign_type">Campaign Type</Label>
                <Select 
                  value={newCampaign.campaign_type} 
                  onValueChange={(value) => setNewCampaign(prev => ({ ...prev, campaign_type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="drip">Drip Campaign</SelectItem>
                    <SelectItem value="trigger_based">Trigger-Based</SelectItem>
                    <SelectItem value="dynamic">Dynamic</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="auto_enrollment"
                  checked={newCampaign.auto_enrollment}
                  onCheckedChange={(checked) => setNewCampaign(prev => ({ ...prev, auto_enrollment: checked }))}
                />
                <Label htmlFor="auto_enrollment">Auto-enroll qualifying leads</Label>
              </div>
              <Button onClick={createCampaign} disabled={isCreating} className="w-full">
                {isCreating ? "Creating..." : "Create Campaign"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6">
        {campaigns.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No campaigns yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first nurturing campaign to start automating lead follow-ups
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          campaigns.map((campaign) => (
            <Card key={campaign.id} className="cursor-pointer" onClick={() => {
              setSelectedCampaign(campaign);
              loadCampaignDetails(campaign.id);
            }}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center space-x-2">
                      <span>{campaign.campaign_name}</span>
                      <Badge variant={campaign.is_active ? "default" : "secondary"}>
                        {campaign.is_active ? "Active" : "Paused"}
                      </Badge>
                    </CardTitle>
                    <CardDescription>{campaign.description}</CardDescription>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleCampaignStatus(campaign.id, campaign.is_active);
                      }}
                    >
                      {campaign.is_active ? (
                        <>
                          <Pause className="h-4 w-4 mr-2" />
                          Pause
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4 mr-2" />
                          Activate
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{campaign.total_steps}</div>
                    <div className="text-sm text-muted-foreground">Steps</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{campaign.enrollment_count}</div>
                    <div className="text-sm text-muted-foreground">Enrolled</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{campaign.completion_count}</div>
                    <div className="text-sm text-muted-foreground">Completed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{campaign.conversion_count}</div>
                    <div className="text-sm text-muted-foreground">Converted</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {selectedCampaign && (
        <Dialog open={!!selectedCampaign} onOpenChange={() => setSelectedCampaign(null)}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedCampaign.campaign_name}</DialogTitle>
            </DialogHeader>
            <Tabs defaultValue="steps" className="space-y-4">
              <TabsList>
                <TabsTrigger value="steps">Campaign Steps</TabsTrigger>
                <TabsTrigger value="enrollments">Enrollments</TabsTrigger>
                <TabsTrigger value="performance">Performance</TabsTrigger>
              </TabsList>

              <TabsContent value="steps" className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">Campaign Steps</h3>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Step
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add Campaign Step</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="step_name">Step Name</Label>
                          <Input
                            id="step_name"
                            value={newStep.step_name}
                            onChange={(e) => setNewStep(prev => ({ ...prev, step_name: e.target.value }))}
                            placeholder="e.g., Welcome Email"
                          />
                        </div>
                        <div>
                          <Label htmlFor="step_type">Step Type</Label>
                          <Select 
                            value={newStep.step_type} 
                            onValueChange={(value) => setNewStep(prev => ({ ...prev, step_type: value }))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="email">Email</SelectItem>
                              <SelectItem value="task">Task</SelectItem>
                              <SelectItem value="call">Call</SelectItem>
                              <SelectItem value="sms">SMS</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {newStep.step_type === 'email' && (
                          <>
                            <div>
                              <Label htmlFor="subject_line">Subject Line</Label>
                              <Input
                                id="subject_line"
                                value={newStep.subject_line}
                                onChange={(e) => setNewStep(prev => ({ ...prev, subject_line: e.target.value }))}
                                placeholder="Email subject line"
                              />
                            </div>
                            <div>
                              <Label htmlFor="content">Content</Label>
                              <Textarea
                                id="content"
                                value={newStep.content}
                                onChange={(e) => setNewStep(prev => ({ ...prev, content: e.target.value }))}
                                placeholder="Email content"
                                rows={4}
                              />
                            </div>
                          </>
                        )}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="delay_value">Delay</Label>
                            <Input
                              id="delay_value"
                              type="number"
                              value={newStep.delay_value}
                              onChange={(e) => setNewStep(prev => ({ ...prev, delay_value: parseInt(e.target.value) }))}
                            />
                          </div>
                          <div>
                            <Label htmlFor="delay_unit">Unit</Label>
                            <Select 
                              value={newStep.delay_unit} 
                              onValueChange={(value) => setNewStep(prev => ({ ...prev, delay_unit: value }))}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="hours">Hours</SelectItem>
                                <SelectItem value="days">Days</SelectItem>
                                <SelectItem value="weeks">Weeks</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <Button onClick={() => addStep(selectedCampaign.id)} className="w-full">
                          Add Step
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="space-y-2">
                  {campaignSteps.map((step, index) => (
                    <div key={step.id} className="flex items-center space-x-4 p-4 border rounded-lg">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                        {step.step_number}
                      </div>
                      <div className="flex items-center space-x-2">
                        {getStepIcon(step.step_type)}
                        <span className="font-medium">{step.step_name}</span>
                        <Badge variant="outline" className="capitalize">{step.step_type}</Badge>
                      </div>
                      <div className="flex-1">
                        {step.step_type === 'email' && step.subject_line && (
                          <div className="text-sm text-muted-foreground">
                            Subject: {step.subject_line}
                          </div>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <Clock className="h-3 w-3 inline mr-1" />
                        {step.delay_value} {step.delay_unit}
                        {index > 0 && " after previous step"}
                      </div>
                      <Badge variant={step.is_active ? "default" : "secondary"}>
                        {step.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="enrollments" className="space-y-4">
                <h3 className="text-lg font-medium">Campaign Enrollments</h3>
                <div className="space-y-2">
                  {enrollments.map((enrollment) => (
                    <div key={enrollment.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <div className="font-medium">
                          {enrollment.lead.first_name} {enrollment.lead.last_name}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {enrollment.lead.company_name || 'Individual'}
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-center">
                          <div className="text-sm font-medium">Step {enrollment.current_step}</div>
                          <div className="text-xs text-muted-foreground">
                            {enrollment.steps_completed} completed
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm font-medium">{enrollment.emails_sent}</div>
                          <div className="text-xs text-muted-foreground">emails sent</div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm font-medium">{enrollment.emails_opened}</div>
                          <div className="text-xs text-muted-foreground">opened</div>
                        </div>
                        <Badge variant={enrollment.status === 'active' ? 'default' : 'secondary'}>
                          {enrollment.status}
                        </Badge>
                        {enrollment.converted && (
                          <Badge variant="default" className="bg-green-600">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Converted
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="performance" className="space-y-4">
                <h3 className="text-lg font-medium">Campaign Performance</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <div className="text-2xl font-bold">{selectedCampaign.enrollment_count}</div>
                        <div className="text-sm text-muted-foreground">Total Enrolled</div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <div className="text-2xl font-bold">
                          {selectedCampaign.enrollment_count > 0 
                            ? Math.round((selectedCampaign.completion_count / selectedCampaign.enrollment_count) * 100)
                            : 0}%
                        </div>
                        <div className="text-sm text-muted-foreground">Completion Rate</div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {selectedCampaign.enrollment_count > 0 
                            ? Math.round((selectedCampaign.conversion_count / selectedCampaign.enrollment_count) * 100)
                            : 0}%
                        </div>
                        <div className="text-sm text-muted-foreground">Conversion Rate</div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <div className="text-2xl font-bold">
                          {enrollments.reduce((sum, e) => sum + e.emails_opened, 0)}
                        </div>
                        <div className="text-sm text-muted-foreground">Total Opens</div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};