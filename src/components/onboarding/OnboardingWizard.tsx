/**
 * Onboarding Wizard
 * Multi-step guided setup for new users
 * Helps configure company settings, create first project, and invite team
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Rocket,
  Building,
  FolderPlus,
  Users,
  CheckCircle,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Mail,
  Calendar,
  LayoutDashboard,
  DollarSign,
  Clock,
  FileText,
  ArrowRight,
  SkipForward
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface OnboardingWizardProps {
  onComplete?: () => void;
}

const ONBOARDING_PROGRESS_KEY = 'builddesk_onboarding_progress';

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ onComplete }) => {
  const { toast } = useToast();
  const { user, userProfile } = useAuth();
  const [loading, setLoading] = useState(false);

  // Persist onboarding progress
  const getSavedStep = (): number => {
    try {
      const saved = localStorage.getItem(ONBOARDING_PROGRESS_KEY);
      if (saved) return Math.min(JSON.parse(saved), 4);
    } catch { /* ignore */ }
    return 1;
  };
  const [currentStep, setCurrentStep] = useState(getSavedStep);

  // Company details
  const [companyName, setCompanyName] = useState('');
  const [companyType, setCompanyType] = useState('');
  const [companySize, setCompanySize] = useState('');
  const [industry, setIndustry] = useState('construction');

  // First project
  const [createProject, setCreateProject] = useState(true);
  const [projectName, setProjectName] = useState('');
  const [projectBudget, setProjectBudget] = useState('');
  const [projectStartDate, setProjectStartDate] = useState('');
  const [projectClientName, setProjectClientName] = useState('');

  // Team invitations
  const [inviteTeam, setInviteTeam] = useState(false);
  const [teamEmails, setTeamEmails] = useState('');

  const totalSteps = 4;

  const getStepTitle = () => {
    switch (currentStep) {
      case 1:
        return 'Welcome to BuildDesk';
      case 2:
        return 'Company Setup';
      case 3:
        return 'Create Your First Project';
      case 4:
        return 'Quick Tour';
      default:
        return '';
    }
  };

  const getStepDescription = () => {
    switch (currentStep) {
      case 1:
        return "Let's get you set up in just a few minutes";
      case 2:
        return 'Tell us about your construction business';
      case 3:
        return 'Optional: Start with a project to track';
      case 4:
        return 'See what BuildDesk can do for your business';
      default:
        return '';
    }
  };

  const validateCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return true; // Welcome screen, always valid
      case 2:
        if (!companyName) {
          toast({
            title: 'Company Name Required',
            description: 'Please enter your company name',
            variant: 'destructive'
          });
          return false;
        }
        return true;
      case 3:
        if (createProject && !projectName) {
          toast({
            title: 'Project Name Required',
            description: 'Please enter a project name or skip this step',
            variant: 'destructive'
          });
          return false;
        }
        return true;
      case 4:
        return true; // Team invitation is optional
      default:
        return true;
    }
  };

  const goToStep = (step: number) => {
    setCurrentStep(step);
    try { localStorage.setItem(ONBOARDING_PROGRESS_KEY, JSON.stringify(step)); } catch { /* ignore */ }
  };

  const handleNext = () => {
    if (validateCurrentStep()) {
      if (currentStep < totalSteps) {
        goToStep(currentStep + 1);
      } else {
        handleComplete();
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      goToStep(currentStep - 1);
    }
  };

  const handleSkipStep = () => {
    if (currentStep < totalSteps) {
      goToStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = async () => {
    setLoading(true);

    try {
      // Update company profile
      const { error: companyError } = await supabase
        .from('companies')
        .update({
          name: companyName,
          company_type: companyType || null,
          company_size: companySize || null,
          industry: industry,
          onboarding_completed: true,
          onboarding_completed_at: new Date().toISOString()
        })
        .eq('id', userProfile?.company_id);

      if (companyError) throw companyError;

      // Create first project if requested
      if (createProject && projectName) {
        const { error: projectError } = await supabase
          .from('projects')
          .insert({
            company_id: userProfile?.company_id,
            name: projectName,
            total_budget: projectBudget ? parseFloat(projectBudget) : null,
            start_date: projectStartDate || new Date().toISOString().split('T')[0],
            client_name: projectClientName || null,
            status: 'planning',
            created_by: user?.id
          });

        if (projectError) throw projectError;
      }

      // Send team invitations if provided
      if (inviteTeam && teamEmails) {
        const emails = teamEmails.split(',').map(e => e.trim()).filter(e => e);
        // TODO: Implement team invitation logic
      }

      // Mark user profile as onboarded
      const { error: profileError } = await supabase
        .from('user_profiles')
        .update({
          onboarding_completed: true,
          onboarding_completed_at: new Date().toISOString()
        })
        .eq('id', user?.id);

      if (profileError) throw profileError;

      // Clear persisted progress
      try { localStorage.removeItem(ONBOARDING_PROGRESS_KEY); } catch { /* ignore */ }

      toast({
        title: 'Setup Complete!',
        description: 'Your BuildDesk account is ready to use',
      });

      onComplete?.();
    } catch (error: any) {
      console.error('Onboarding error:', error);
      toast({
        title: 'Setup Error',
        description: error.message || 'Failed to complete setup',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="text-center space-y-6 py-8">
            <div className="mx-auto w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center">
              <Rocket className="h-10 w-10 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold mb-3">Welcome to BuildDesk!</h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                The all-in-one construction management platform built for small to medium-sized businesses.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto pt-6">
              <div className="p-4 border rounded-lg">
                <Sparkles className="h-6 w-6 text-blue-600 mb-2 mx-auto" />
                <h3 className="font-semibold mb-1">Real-Time Tracking</h3>
                <p className="text-sm text-muted-foreground">
                  Track jobs, budgets, and team in real-time
                </p>
              </div>
              <div className="p-4 border rounded-lg">
                <Building className="h-6 w-6 text-blue-600 mb-2 mx-auto" />
                <h3 className="font-semibold mb-1">Mobile-First</h3>
                <p className="text-sm text-muted-foreground">
                  Manage your business from the field
                </p>
              </div>
              <div className="p-4 border rounded-lg">
                <Users className="h-6 w-6 text-blue-600 mb-2 mx-auto" />
                <h3 className="font-semibold mb-1">Team Collaboration</h3>
                <p className="text-sm text-muted-foreground">
                  Keep everyone on the same page
                </p>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6 max-w-2xl mx-auto">
            <div className="text-center mb-6">
              <Building className="h-12 w-12 text-blue-600 mx-auto mb-3" />
              <h2 className="text-2xl font-bold">Tell us about your company</h2>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="company-name">Company Name *</Label>
                <Input
                  id="company-name"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="ABC Construction Co."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="company-type">Company Type</Label>
                  <Select value={companyType} onValueChange={setCompanyType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general_contractor">General Contractor</SelectItem>
                      <SelectItem value="subcontractor">Subcontractor</SelectItem>
                      <SelectItem value="specialty">Specialty Contractor</SelectItem>
                      <SelectItem value="developer">Developer</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="company-size">Company Size</Label>
                  <Select value={companySize} onValueChange={setCompanySize}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select size..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1-10">1-10 employees</SelectItem>
                      <SelectItem value="11-50">11-50 employees</SelectItem>
                      <SelectItem value="51-200">51-200 employees</SelectItem>
                      <SelectItem value="200+">200+ employees</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6 max-w-2xl mx-auto">
            <div className="text-center mb-6">
              <FolderPlus className="h-12 w-12 text-blue-600 mx-auto mb-3" />
              <h2 className="text-2xl font-bold">Create your first project</h2>
              <p className="text-muted-foreground mt-2">You can skip this and add projects later</p>
            </div>

            <div className="flex items-center justify-center gap-4 mb-6">
              <Button
                variant={createProject ? "default" : "outline"}
                onClick={() => setCreateProject(true)}
              >
                Create Project
              </Button>
              <Button
                variant={!createProject ? "default" : "outline"}
                onClick={() => setCreateProject(false)}
              >
                Skip for Now
              </Button>
            </div>

            {createProject && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="project-name">Project Name *</Label>
                  <Input
                    id="project-name"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="Downtown Office Renovation"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="project-budget">Budget</Label>
                    <Input
                      id="project-budget"
                      type="number"
                      value={projectBudget}
                      onChange={(e) => setProjectBudget(e.target.value)}
                      placeholder="250000"
                    />
                  </div>

                  <div>
                    <Label htmlFor="project-start">Start Date</Label>
                    <Input
                      id="project-start"
                      type="date"
                      value={projectStartDate}
                      onChange={(e) => setProjectStartDate(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="client-name">Client Name</Label>
                  <Input
                    id="client-name"
                    value={projectClientName}
                    onChange={(e) => setProjectClientName(e.target.value)}
                    placeholder="Smith Properties LLC"
                  />
                </div>
              </div>
            )}
          </div>
        );

      case 4:
        return (
          <div className="space-y-6 max-w-3xl mx-auto">
            <div className="text-center mb-6">
              <Sparkles className="h-12 w-12 text-blue-600 mx-auto mb-3" />
              <h2 className="text-2xl font-bold">Here's what you can do</h2>
              <p className="text-muted-foreground mt-2">Explore the key features of BuildDesk</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { icon: LayoutDashboard, title: 'Dashboard', desc: 'Real-time project overview with health scores, budget tracking, and team activity.', color: 'text-blue-600 bg-blue-50' },
                { icon: Building, title: 'Projects', desc: 'Manage projects from planning to closeout with schedules, documents, and change orders.', color: 'text-green-600 bg-green-50' },
                { icon: DollarSign, title: 'Financials', desc: 'Job costing, invoicing, expenses, and budget vs actual tracking in real time.', color: 'text-orange-600 bg-orange-50' },
                { icon: Clock, title: 'Time Tracking', desc: 'GPS-based clock in/out, timesheet approvals, and crew scheduling.', color: 'text-purple-600 bg-purple-50' },
                { icon: FileText, title: 'Daily Reports', desc: 'Field reports with photos, weather, crew counts, and equipment tracking.', color: 'text-red-600 bg-red-50' },
                { icon: Users, title: 'Team & CRM', desc: 'Manage crew, subcontractors, clients, and leads all in one place.', color: 'text-teal-600 bg-teal-50' },
              ].map((feature) => (
                <div key={feature.title} className="flex items-start gap-3 p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                  <div className={`p-2 rounded-lg ${feature.color.split(' ')[1]}`}>
                    <feature.icon className={`h-5 w-5 ${feature.color.split(' ')[0]}`} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">{feature.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mt-4">
              <div className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-blue-900 dark:text-blue-300">Invite your team anytime</p>
                  <p className="text-blue-700 dark:text-blue-400 mt-1">
                    Go to Settings &gt; Team to invite team members after setup.
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">
              Step {currentStep} of {totalSteps}
            </span>
            <Badge variant="outline">{Math.round((currentStep / totalSteps) * 100)}% Complete</Badge>
          </div>
          <Progress value={(currentStep / totalSteps) * 100} className="h-2" />
        </div>

        {/* Main Card */}
        <Card>
          <CardHeader>
            <CardTitle>{getStepTitle()}</CardTitle>
            <CardDescription>{getStepDescription()}</CardDescription>
          </CardHeader>
          <CardContent>
            {renderStep()}

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-8 pt-6 border-t">
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={currentStep === 1}
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Back
              </Button>

              <div className="flex items-center gap-2">
                {currentStep > 1 && currentStep < totalSteps && (
                  <Button
                    variant="ghost"
                    onClick={handleSkipStep}
                    className="text-muted-foreground"
                  >
                    <SkipForward className="h-4 w-4 mr-1" />
                    Skip
                  </Button>
                )}

                <Button
                  onClick={handleNext}
                  disabled={loading}
                >
                  {currentStep === totalSteps ? (
                    loading ? (
                      'Completing Setup...'
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Complete Setup
                      </>
                    )
                  ) : (
                    <>
                      Next
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default OnboardingWizard;
