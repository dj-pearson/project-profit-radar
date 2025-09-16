import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { CheckCircle, Building2, Users, CreditCard, Rocket } from 'lucide-react';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}

const steps: OnboardingStep[] = [
  {
    id: 'company',
    title: 'Company Information',
    description: 'Tell us about your construction business',
    icon: <Building2 className="h-6 w-6" />
  },
  {
    id: 'team',
    title: 'Team Setup',
    description: 'Set up your team structure',
    icon: <Users className="h-6 w-6" />
  },
  {
    id: 'subscription',
    title: 'Choose Your Plan',
    description: 'Select the plan that fits your needs',
    icon: <CreditCard className="h-6 w-6" />
  },
  {
    id: 'complete',
    title: 'Welcome Aboard!',
    description: 'Your account is ready to use',
    icon: <Rocket className="h-6 w-6" />
  }
];

export const OnboardingFlow = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    companyName: '',
    companyType: '',
    teamSize: '',
    primaryServices: [] as string[],
    selectedPlan: 'professional'
  });
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleNext = async () => {
    if (currentStep === steps.length - 1) {
      navigate('/dashboard');
      return;
    }

    if (currentStep === 2) {
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
      
      // Create company record
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .insert({
          name: formData.companyName,
          industry_type: formData.companyType as 'residential' | 'commercial' | 'civil_infrastructure' | 'specialty_trades',
          company_size: formData.teamSize,
          annual_revenue_range: 'startup', // Default for new companies
          subscription_tier: formData.selectedPlan as 'starter' | 'professional' | 'enterprise',
          subscription_status: 'trial'
        })
        .select()
        .single();

      if (companyError) throw companyError;

      // Update user profile with company
      const { error: profileError } = await supabase
        .from('user_profiles')
        .update({ company_id: company.id })
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

  const renderStepContent = () => {
    const step = steps[currentStep];

    switch (step.id) {
      case 'company':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name *</Label>
              <Input
                id="companyName"
                value={formData.companyName}
                onChange={(e) => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
                placeholder="Enter your company name"
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
                  <SelectItem value="general_contractor">General Contractor</SelectItem>
                  <SelectItem value="residential_builder">Residential Builder</SelectItem>
                  <SelectItem value="commercial_contractor">Commercial Contractor</SelectItem>
                  <SelectItem value="specialty_trade">Specialty Trade</SelectItem>
                  <SelectItem value="subcontractor">Subcontractor</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="teamSize">Team Size *</Label>
              <Select
                value={formData.teamSize}
                onValueChange={(value) => setFormData(prev => ({ ...prev, teamSize: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select team size" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Just me</SelectItem>
                  <SelectItem value="5">2-5 employees</SelectItem>
                  <SelectItem value="15">6-15 employees</SelectItem>
                  <SelectItem value="50">16-50 employees</SelectItem>
                  <SelectItem value="100">50+ employees</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 'team':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Primary Services (Select all that apply)</Label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  'New Construction',
                  'Renovations',
                  'Electrical',
                  'Plumbing',
                  'HVAC',
                  'Roofing',
                  'Concrete',
                  'Landscaping'
                ].map((service) => (
                  <div key={service} className="flex items-center space-x-2">
                    <Checkbox
                      id={service}
                      checked={formData.primaryServices.includes(service)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setFormData(prev => ({
                            ...prev,
                            primaryServices: [...prev.primaryServices, service]
                          }));
                        } else {
                          setFormData(prev => ({
                            ...prev,
                            primaryServices: prev.primaryServices.filter(s => s !== service)
                          }));
                        }
                      }}
                    />
                    <Label htmlFor={service} className="text-sm">{service}</Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'subscription':
        return (
          <div className="space-y-4">
            <div className="grid gap-4">
              {[
                {
                  id: 'starter',
                  name: 'Starter',
                  price: '$149/month',
                  features: ['Up to 5 projects', 'Basic reporting', 'Mobile app', 'Email support']
                },
                {
                  id: 'professional',
                  name: 'Professional',
                  price: '$299/month',
                  features: ['Unlimited projects', 'Advanced reporting', 'Time tracking', 'Priority support', 'QuickBooks integration']
                },
                {
                  id: 'enterprise',
                  name: 'Enterprise',
                  price: '$599/month',
                  features: ['Everything in Professional', 'Custom integrations', 'Dedicated support', 'Advanced analytics', 'API access']
                }
              ].map((plan) => (
                <Card
                  key={plan.id}
                  className={`cursor-pointer transition-colors ${
                    formData.selectedPlan === plan.id ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => setFormData(prev => ({ ...prev, selectedPlan: plan.id }))}
                >
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-lg">{plan.name}</CardTitle>
                      <span className="font-bold text-primary">{plan.price}</span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );

      case 'complete':
        return (
          <div className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Welcome to BuildDesk!</h3>
              <p className="text-muted-foreground">
                Your account is set up and ready to use. Start managing your construction projects today.
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const isStepValid = () => {
    switch (steps[currentStep].id) {
      case 'company':
        return formData.companyName && formData.companyType && formData.teamSize;
      case 'team':
        return formData.primaryServices.length > 0;
      case 'subscription':
        return formData.selectedPlan;
      default:
        return true;
    }
  };

  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center gap-3 mb-4">
            {steps[currentStep].icon}
            <div>
              <CardTitle>{steps[currentStep].title}</CardTitle>
              <CardDescription>{steps[currentStep].description}</CardDescription>
            </div>
          </div>
          <Progress value={progress} className="w-full" />
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Step {currentStep + 1} of {steps.length}</span>
            <span>{Math.round(progress)}% complete</span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            {renderStepContent()}
          </div>
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 0}
            >
              Previous
            </Button>
            <Button
              onClick={handleNext}
              disabled={!isStepValid() || isLoading}
            >
              {isLoading ? 'Setting up...' : currentStep === steps.length - 1 ? 'Get Started' : 'Next'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};