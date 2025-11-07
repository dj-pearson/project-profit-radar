import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  CheckCircle, Building2, Users, CreditCard, Rocket,
  Sparkles, TrendingUp, Clock, Gift, Star, AlertCircle
} from 'lucide-react';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}

const steps: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to BuildDesk!',
    description: 'Your 14-day free trial starts now',
    icon: <Sparkles className="h-6 w-6 text-construction-orange" />
  },
  {
    id: 'company',
    title: 'Company Information',
    description: 'Tell us about your construction business',
    icon: <Building2 className="h-6 w-6" />
  },
  {
    id: 'team',
    title: 'Team & Usage',
    description: 'Help us recommend the right plan for you',
    icon: <Users className="h-6 w-6" />
  },
  {
    id: 'use-case',
    title: 'What Matters Most?',
    description: 'We\'ll personalize your experience',
    icon: <Star className="h-6 w-6" />
  },
  {
    id: 'subscription',
    title: 'Your Recommended Plan',
    description: 'Based on your needs (can change anytime)',
    icon: <CreditCard className="h-6 w-6" />
  },
  {
    id: 'complete',
    title: 'All Set!',
    description: 'Let\'s start building',
    icon: <Rocket className="h-6 w-6" />
  }
];

export const OnboardingFlow = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    companyName: '',
    companyType: '',
    teamSize: 0,
    expectedProjects: 0,
    primaryServices: [] as string[],
    topPriorities: [] as string[],
    selectedPlan: 'professional',
    recommendedPlan: 'professional'
  });
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Auto-recommend tier based on team size and projects
  useEffect(() => {
    const recommendTier = () => {
      const teamSize = formData.teamSize;
      const projects = formData.expectedProjects;

      // Starter: 1-5 team members, <10 projects
      if (teamSize <= 5 && projects <= 10) {
        return 'starter';
      }
      // Professional: 6-20 team members, 11-50 projects
      else if (teamSize <= 20 && projects <= 50) {
        return 'professional';
      }
      // Enterprise: 20+ team members or 50+ projects
      else {
        return 'enterprise';
      }
    };

    if (formData.teamSize > 0 || formData.expectedProjects > 0) {
      const recommended = recommendTier();
      setFormData(prev => ({
        ...prev,
        recommendedPlan: recommended,
        selectedPlan: recommended
      }));
    }
  }, [formData.teamSize, formData.expectedProjects]);

  const handleNext = async () => {
    if (currentStep === steps.length - 1) {
      navigate('/dashboard');
      return;
    }

    if (currentStep === 4) {
      // Handle subscription setup
      await handleSubscriptionSetup();
    }

    setCurrentStep(prev => prev + 1);
  };

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(0, prev - 1));
  };

  const handleSubscriptionSetup = async () => {
    try {
      setIsLoading(true);

      // Create company record with onboarding data
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .insert({
          name: formData.companyName,
          industry_type: formData.companyType as 'residential' | 'commercial' | 'civil_infrastructure' | 'specialty_trades',
          company_size: formData.teamSize.toString(),
          annual_revenue_range: 'startup', // Default for new companies
          subscription_tier: formData.selectedPlan as 'starter' | 'professional' | 'enterprise',
          subscription_status: 'trial'
        })
        .select()
        .single();

      if (companyError) throw companyError;

      // Update user profile with company and onboarding preferences
      const { error: profileError } = await supabase
        .from('user_profiles')
        .update({
          company_id: company.id,
          // Store onboarding preferences for dashboard personalization
          preferences: {
            onboarding_completed: true,
            primary_services: formData.primaryServices,
            top_priorities: formData.topPriorities,
            expected_projects: formData.expectedProjects,
            completed_at: new Date().toISOString()
          }
        })
        .eq('id', user?.id);

      if (profileError) throw profileError;

      toast({
        title: "Setup Complete",
        description: "Your company has been set up successfully!"
      });
    } catch (error) {
      console.error('Onboarding error:', error);
      toast({
        title: "Setup Error",
        description: "There was an issue setting up your account. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getTierRecommendation = () => {
    const tier = formData.recommendedPlan;
    const messages = {
      starter: "Perfect for small teams just getting started",
      professional: "Great choice! This plan fits most construction businesses",
      enterprise: "Ideal for larger operations with complex needs"
    };
    return messages[tier as keyof typeof messages];
  };

  const renderStepContent = () => {
    const step = steps[currentStep];

    switch (step.id) {
      case 'welcome':
        return (
          <div className="space-y-6 py-4">
            <div className="text-center space-y-4">
              <div className="mx-auto w-20 h-20 bg-gradient-to-br from-construction-orange to-construction-blue rounded-full flex items-center justify-center">
                <Sparkles className="h-10 w-10 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-bold mb-2">Welcome to BuildDesk!</h3>
                <p className="text-muted-foreground text-lg">
                  Let's get you set up in just a few minutes
                </p>
              </div>
            </div>

            <Alert className="border-construction-orange bg-construction-orange/5">
              <Gift className="h-4 w-4 text-construction-orange" />
              <AlertDescription className="ml-2">
                <strong className="text-construction-orange">Your 14-day free trial starts now!</strong>
                <ul className="mt-2 space-y-1 text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Full access to all Professional features
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    No credit card required
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Cancel anytime during trial
                  </li>
                </ul>
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <Card className="border-construction-blue/20">
                <CardContent className="pt-6 text-center">
                  <Clock className="h-8 w-8 mx-auto mb-2 text-construction-blue" />
                  <h4 className="font-semibold mb-1">Quick Setup</h4>
                  <p className="text-sm text-muted-foreground">Only 2-3 minutes to get started</p>
                </CardContent>
              </Card>
              <Card className="border-construction-blue/20">
                <CardContent className="pt-6 text-center">
                  <TrendingUp className="h-8 w-8 mx-auto mb-2 text-construction-blue" />
                  <h4 className="font-semibold mb-1">Smart Recommendations</h4>
                  <p className="text-sm text-muted-foreground">We'll suggest the best plan for you</p>
                </CardContent>
              </Card>
              <Card className="border-construction-blue/20">
                <CardContent className="pt-6 text-center">
                  <Star className="h-8 w-8 mx-auto mb-2 text-construction-blue" />
                  <h4 className="font-semibold mb-1">Personalized Experience</h4>
                  <p className="text-sm text-muted-foreground">Tailored to your workflow</p>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      case 'company':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name *</Label>
              <Input
                id="companyName"
                value={formData.companyName}
                onChange={(e) => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
                placeholder="e.g., ABC Construction"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyType">Company Type *</Label>
              <Select
                value={formData.companyType}
                onValueChange={(value) => setFormData(prev => ({ ...prev, companyType: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select company type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="residential">Residential Construction</SelectItem>
                  <SelectItem value="commercial">Commercial Construction</SelectItem>
                  <SelectItem value="civil_infrastructure">Civil Infrastructure</SelectItem>
                  <SelectItem value="specialty_trades">Specialty Trades</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 'team':
        return (
          <div className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="ml-2">
                This helps us recommend the right plan for your business
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="teamSize">How many team members will use BuildDesk? *</Label>
              <Select
                value={formData.teamSize.toString()}
                onValueChange={(value) => setFormData(prev => ({ ...prev, teamSize: parseInt(value) }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select team size" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Just me</SelectItem>
                  <SelectItem value="3">2-5 people</SelectItem>
                  <SelectItem value="10">6-15 people</SelectItem>
                  <SelectItem value="25">16-30 people</SelectItem>
                  <SelectItem value="50">30+ people</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="expectedProjects">How many active projects do you typically manage? *</Label>
              <Select
                value={formData.expectedProjects.toString()}
                onValueChange={(value) => setFormData(prev => ({ ...prev, expectedProjects: parseInt(value) }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select project count" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">1-5 projects</SelectItem>
                  <SelectItem value="10">6-10 projects</SelectItem>
                  <SelectItem value="25">11-25 projects</SelectItem>
                  <SelectItem value="50">26-50 projects</SelectItem>
                  <SelectItem value="100">50+ projects</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(formData.teamSize > 5 || formData.expectedProjects > 10) && (
              <Alert className="border-blue-500 bg-blue-50">
                <TrendingUp className="h-4 w-4 text-blue-600" />
                <AlertDescription className="ml-2 text-blue-900">
                  <strong>Recommendation:</strong> Based on your team size and project volume,
                  we recommend the <strong>{formData.recommendedPlan.charAt(0).toUpperCase() + formData.recommendedPlan.slice(1)}</strong> plan
                </AlertDescription>
              </Alert>
            )}
          </div>
        );

      case 'use-case':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>What are your top priorities? (Select all that apply)</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  { id: 'job_costing', label: 'Real-time Job Costing', icon: '💰' },
                  { id: 'team_management', label: 'Team Management', icon: '👥' },
                  { id: 'client_communication', label: 'Client Communication', icon: '💬' },
                  { id: 'compliance', label: 'OSHA Compliance', icon: '✅' },
                  { id: 'scheduling', label: 'Project Scheduling', icon: '📅' },
                  { id: 'document_management', label: 'Document Management', icon: '📄' },
                  { id: 'accounting', label: 'QuickBooks Integration', icon: '📊' },
                  { id: 'reporting', label: 'Business Analytics', icon: '📈' }
                ].map((priority) => (
                  <div key={priority.id} className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-accent">
                    <Checkbox
                      id={priority.id}
                      checked={formData.topPriorities.includes(priority.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setFormData(prev => ({
                            ...prev,
                            topPriorities: [...prev.topPriorities, priority.id]
                          }));
                        } else {
                          setFormData(prev => ({
                            ...prev,
                            topPriorities: prev.topPriorities.filter(p => p !== priority.id)
                          }));
                        }
                      }}
                    />
                    <Label htmlFor={priority.id} className="text-sm cursor-pointer">
                      <span className="mr-2">{priority.icon}</span>
                      {priority.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'subscription':
        const plans = [
          {
            id: 'starter',
            name: 'Starter',
            monthlyPrice: 149,
            annualPrice: 119,
            description: 'Perfect for small teams',
            features: [
              'Up to 5 team members',
              'Up to 10 projects',
              'Basic reporting',
              'Mobile app',
              'Email support'
            ],
            limits: '5 members • 10 projects'
          },
          {
            id: 'professional',
            name: 'Professional',
            monthlyPrice: 299,
            annualPrice: 239,
            description: 'Most popular choice',
            features: [
              'Up to 20 team members',
              'Up to 50 projects',
              'Advanced reporting',
              'Time tracking',
              'QuickBooks integration',
              'Priority support'
            ],
            limits: '20 members • 50 projects',
            popular: true
          },
          {
            id: 'enterprise',
            name: 'Enterprise',
            monthlyPrice: 599,
            annualPrice: 479,
            description: 'For large operations',
            features: [
              'Unlimited team members',
              'Unlimited projects',
              'Everything in Professional',
              'Custom integrations',
              'Dedicated support',
              'Advanced analytics'
            ],
            limits: 'Unlimited'
          }
        ];

        return (
          <div className="space-y-4">
            {formData.recommendedPlan && (
              <Alert className="border-construction-blue bg-construction-blue/5">
                <Star className="h-4 w-4 text-construction-blue" />
                <AlertDescription className="ml-2">
                  <strong>Recommended for you:</strong> {getTierRecommendation()}
                </AlertDescription>
              </Alert>
            )}

            <div className="grid gap-4">
              {plans.map((plan) => (
                <Card
                  key={plan.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    formData.selectedPlan === plan.id
                      ? 'ring-2 ring-construction-blue shadow-lg'
                      : ''
                  } ${
                    formData.recommendedPlan === plan.id
                      ? 'border-construction-blue'
                      : ''
                  }`}
                  onClick={() => setFormData(prev => ({ ...prev, selectedPlan: plan.id }))}
                >
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-lg">{plan.name}</CardTitle>
                          {plan.popular && (
                            <Badge className="bg-construction-orange">Most Popular</Badge>
                          )}
                          {formData.recommendedPlan === plan.id && (
                            <Badge variant="outline" className="border-construction-blue text-construction-blue">
                              Recommended
                            </Badge>
                          )}
                        </div>
                        <CardDescription className="mt-1">
                          {plan.description}
                        </CardDescription>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-construction-blue">
                          ${plan.monthlyPrice}
                        </div>
                        <div className="text-sm text-muted-foreground">/month</div>
                        <div className="text-xs text-green-600 mt-1">
                          Save ${(plan.monthlyPrice - plan.annualPrice) * 12}/yr
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="text-sm font-medium text-muted-foreground">
                        {plan.limits}
                      </div>
                      <ul className="space-y-2 text-sm">
                        {plan.features.map((feature, index) => (
                          <li key={index} className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Alert>
              <Clock className="h-4 w-4" />
              <AlertDescription className="ml-2">
                <strong>Remember:</strong> You get full access during your 14-day trial.
                You can upgrade or downgrade anytime.
              </AlertDescription>
            </Alert>
          </div>
        );

      case 'complete':
        return (
          <div className="text-center space-y-6 py-6">
            <div className="mx-auto w-20 h-20 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center">
              <CheckCircle className="h-10 w-10 text-white" />
            </div>
            <div>
              <h3 className="text-2xl font-bold mb-2">You're All Set!</h3>
              <p className="text-muted-foreground text-lg">
                Your {formData.selectedPlan.charAt(0).toUpperCase() + formData.selectedPlan.slice(1)} trial is active
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6 text-center">
                  <div className="text-3xl font-bold text-construction-blue mb-1">14</div>
                  <div className="text-sm text-muted-foreground">Days of full access</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <div className="text-3xl font-bold text-construction-blue mb-1">$0</div>
                  <div className="text-sm text-muted-foreground">No credit card needed</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <div className="text-3xl font-bold text-construction-blue mb-1">∞</div>
                  <div className="text-sm text-muted-foreground">Projects during trial</div>
                </CardContent>
              </Card>
            </div>

            <Alert className="border-construction-orange bg-construction-orange/5">
              <Sparkles className="h-4 w-4 text-construction-orange" />
              <AlertDescription className="ml-2">
                <strong>Pro Tip:</strong> We've personalized your dashboard based on your priorities.
                Start by creating your first project!
              </AlertDescription>
            </Alert>
          </div>
        );

      default:
        return null;
    }
  };

  const isStepValid = () => {
    switch (steps[currentStep].id) {
      case 'welcome':
        return true;
      case 'company':
        return formData.companyName && formData.companyType;
      case 'team':
        return formData.teamSize > 0 && formData.expectedProjects > 0;
      case 'use-case':
        return formData.topPriorities.length > 0;
      case 'subscription':
        return formData.selectedPlan;
      case 'complete':
        return true;
      default:
        return false;
    }
  };

  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-construction-blue/5 via-white to-construction-orange/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-3xl shadow-xl">
        <CardHeader>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-construction-blue/10 rounded-lg">
              {steps[currentStep].icon}
            </div>
            <div className="flex-1">
              <CardTitle className="text-xl">{steps[currentStep].title}</CardTitle>
              <CardDescription>{steps[currentStep].description}</CardDescription>
            </div>
          </div>
          <div className="space-y-2">
            <Progress value={progress} className="w-full h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Step {currentStep + 1} of {steps.length}</span>
              <span>{Math.round(progress)}% complete</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-6 min-h-[400px]">
            {renderStepContent()}
          </div>
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 0 || isLoading}
              className="min-w-[100px]"
            >
              Previous
            </Button>
            <Button
              onClick={handleNext}
              disabled={!isStepValid() || isLoading}
              className="min-w-[100px] bg-construction-blue hover:bg-construction-blue/90"
            >
              {isLoading ? 'Setting up...' : currentStep === steps.length - 1 ? 'Go to Dashboard' : 'Next'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
