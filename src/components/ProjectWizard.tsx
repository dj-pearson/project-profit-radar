import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  ArrowLeft, 
  ArrowRight,
  Calendar, 
  DollarSign, 
  MapPin, 
  User, 
  Building2,
  Clock,
  Plus,
  X,
  Home,
  Wrench,
  Truck,
  Factory,
  CheckCircle2
} from 'lucide-react';

interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  projectType: string;
  estimatedDuration: string;
  avgBudget: string;
  phases: string[];
  costCodes: string[];
}

const PROJECT_TEMPLATES: ProjectTemplate[] = [
  {
    id: 'residential_kitchen',
    name: 'Kitchen Renovation',
    description: 'Complete kitchen remodel including cabinets, countertops, and appliances',
    icon: Home,
    projectType: 'residential_renovation',
    estimatedDuration: '4-6 weeks',
    avgBudget: '$25,000 - $75,000',
    phases: ['Demolition', 'Electrical & Plumbing', 'Installation', 'Finishing'],
    costCodes: ['02-Demolition', '16-Electrical', '22-Plumbing', '06-Carpentry', '09-Finishes']
  },
  {
    id: 'residential_bathroom',
    name: 'Bathroom Remodel',
    description: 'Full bathroom renovation with modern fixtures and finishes',
    icon: Home,
    projectType: 'residential_renovation',
    estimatedDuration: '2-4 weeks',
    avgBudget: '$15,000 - $40,000',
    phases: ['Demolition', 'Plumbing & Electrical', 'Tiling', 'Fixtures & Finishing'],
    costCodes: ['02-Demolition', '16-Electrical', '22-Plumbing', '09-Finishes']
  },
  {
    id: 'commercial_office',
    name: 'Office Build-Out',
    description: 'Commercial office space construction and fit-out',
    icon: Building2,
    projectType: 'commercial_renovation',
    estimatedDuration: '8-12 weeks',
    avgBudget: '$50,000 - $200,000',
    phases: ['Design & Permits', 'Framing', 'MEP Installation', 'Finishes', 'FF&E'],
    costCodes: ['01-General', '06-Carpentry', '16-Electrical', '22-Plumbing', '09-Finishes']
  },
  {
    id: 'residential_addition',
    name: 'Home Addition',
    description: 'Room addition or second story construction',
    icon: Home,
    projectType: 'residential_new',
    estimatedDuration: '12-20 weeks',
    avgBudget: '$75,000 - $250,000',
    phases: ['Foundation', 'Framing', 'Roofing', 'MEP', 'Insulation & Drywall', 'Finishes'],
    costCodes: ['03-Concrete', '06-Carpentry', '07-Roofing', '16-Electrical', '22-Plumbing', '09-Finishes']
  },
  {
    id: 'specialty_hvac',
    name: 'HVAC Installation',
    description: 'Complete HVAC system installation and commissioning',
    icon: Wrench,
    projectType: 'specialty',
    estimatedDuration: '1-3 weeks',
    avgBudget: '$8,000 - $25,000',
    phases: ['Planning & Permits', 'Installation', 'Testing & Commissioning'],
    costCodes: ['23-HVAC', '16-Electrical']
  },
  {
    id: 'custom_project',
    name: 'Custom Project',
    description: 'Start from scratch with your own specifications',
    icon: Building2,
    projectType: 'custom',
    estimatedDuration: 'Variable',
    avgBudget: 'Variable',
    phases: [],
    costCodes: []
  }
];

interface ProjectWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ProjectWizard: React.FC<ProjectWizardProps> = ({ open, onOpenChange }) => {
  const { user, userProfile } = useAuth();
  const navigate = useNavigate();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedTemplate, setSelectedTemplate] = useState<ProjectTemplate | null>(null);
  const [creating, setCreating] = useState(false);
  
  // Form data
  const [formData, setFormData] = useState({
    // Template Selection
    templateId: '',
    
    // Basic Information
    name: '',
    description: '',
    projectType: '',
    
    // Client & Location
    clientName: '',
    clientEmail: '',
    siteAddress: '',
    
    // Timeline & Budget
    startDate: '',
    endDate: '',
    budget: '',
    estimatedHours: '',
    
    // Additional Details
    permitNumbers: [] as string[],
    specialRequirements: ''
  });

  const [newPermit, setNewPermit] = useState('');

  const totalSteps = 5;

  const updateFormData = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addPermit = () => {
    if (newPermit.trim() && !formData.permitNumbers.includes(newPermit.trim())) {
      updateFormData('permitNumbers', [...formData.permitNumbers, newPermit.trim()]);
      setNewPermit('');
    }
  };

  const removePermit = (permit: string) => {
    updateFormData('permitNumbers', formData.permitNumbers.filter(p => p !== permit));
  };

  const handleTemplateSelect = (template: ProjectTemplate) => {
    setSelectedTemplate(template);
    updateFormData('templateId', template.id);
    updateFormData('projectType', template.projectType);
    
    // Pre-fill name based on template
    if (template.id !== 'custom_project') {
      updateFormData('name', template.name + ' Project');
      updateFormData('description', template.description);
    }
  };

  const nextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return selectedTemplate !== null;
      case 2:
        return formData.name.trim() !== '';
      case 3:
        return true; // Client info is optional
      case 4:
        return true; // Timeline is optional
      case 5:
        return true; // Review step
      default:
        return false;
    }
  };

  const createProject = async () => {
    if (!userProfile?.company_id || !user) return;
    
    setCreating(true);
    try {
      // Create project
      const projectData = {
        name: formData.name,
        description: formData.description || null,
        project_type: formData.projectType || null,
        status: 'planning',
        client_name: formData.clientName || null,
        client_email: formData.clientEmail || null,
        site_address: formData.siteAddress || null,
        start_date: formData.startDate || null,
        end_date: formData.endDate || null,
        budget: formData.budget ? parseFloat(formData.budget) : null,
        estimated_hours: formData.estimatedHours ? parseInt(formData.estimatedHours) : null,
        permit_numbers: formData.permitNumbers.length > 0 ? formData.permitNumbers : null,
        company_id: userProfile.company_id,
        created_by: user.id,
      };

      const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert([projectData])
        .select()
        .single();

      if (projectError) throw projectError;

      // Create project phases if template has phases
      if (selectedTemplate && selectedTemplate.phases.length > 0) {
        const phasesData = selectedTemplate.phases.map((phaseName, index) => ({
          project_id: project.id,
          name: phaseName,
          description: `${phaseName} phase for ${formData.name}`,
          status: 'planning',
          order_index: index + 1,
          estimated_budget: formData.budget ? Math.round(parseFloat(formData.budget) / selectedTemplate.phases.length) : null
        }));

        const { error: phasesError } = await supabase
          .from('project_phases')
          .insert(phasesData);

        if (phasesError) console.warn('Failed to create phases:', phasesError);
      }

      // Create cost codes if template has them
      if (selectedTemplate && selectedTemplate.costCodes.length > 0) {
        const existingCostCodes = await supabase
          .from('cost_codes')
          .select('code')
          .eq('company_id', userProfile.company_id);

        const existingCodes = existingCostCodes.data?.map(cc => cc.code) || [];
        const newCostCodes = selectedTemplate.costCodes
          .filter(code => !existingCodes.includes(code))
          .map(code => ({
            company_id: userProfile.company_id,
            code: code,
            name: code.split('-')[1] || code,
            category: 'construction',
            is_active: true
          }));

        if (newCostCodes.length > 0) {
          const { error: costCodesError } = await supabase
            .from('cost_codes')
            .insert(newCostCodes);

          if (costCodesError) console.warn('Failed to create cost codes:', costCodesError);
        }
      }

      toast({
        title: "Project Created Successfully!",
        description: `${formData.name} has been created with ${selectedTemplate?.phases.length || 0} phases.`
      });

      onOpenChange(false);
      navigate(`/project/${project.id}`);

    } catch (error: any) {
      console.error('Project creation error:', error);
      toast({
        variant: "destructive",
        title: "Failed to Create Project",
        description: error.message || "An error occurred while creating the project"
      });
    } finally {
      setCreating(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2">Choose a Project Template</h2>
              <p className="text-muted-foreground">
                Start with a pre-configured template or create a custom project
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {PROJECT_TEMPLATES.map((template) => {
                const IconComponent = template.icon;
                const isSelected = selectedTemplate?.id === template.id;
                
                return (
                  <Card 
                    key={template.id}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      isSelected ? 'ring-2 ring-primary border-primary' : ''
                    }`}
                    onClick={() => handleTemplateSelect(template)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-primary/10 rounded-lg">
                            <IconComponent className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-lg">{template.name}</CardTitle>
                            <p className="text-sm text-muted-foreground mt-1">
                              {template.description}
                            </p>
                          </div>
                        </div>
                        {isSelected && (
                          <CheckCircle2 className="h-5 w-5 text-primary" />
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="font-medium text-muted-foreground">Duration:</span>
                          <p>{template.estimatedDuration}</p>
                        </div>
                        <div>
                          <span className="font-medium text-muted-foreground">Budget Range:</span>
                          <p>{template.avgBudget}</p>
                        </div>
                      </div>
                      
                      {template.phases.length > 0 && (
                        <div className="mt-3">
                          <span className="font-medium text-muted-foreground text-sm">Phases:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {template.phases.slice(0, 3).map((phase) => (
                              <Badge key={phase} variant="outline" className="text-xs">
                                {phase}
                              </Badge>
                            ))}
                            {template.phases.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{template.phases.length - 3} more
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        );
      
      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2">Project Information</h2>
              <p className="text-muted-foreground">
                Basic details about your construction project
              </p>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="projectName">Project Name *</Label>
                <Input
                  id="projectName"
                  value={formData.name}
                  onChange={(e) => updateFormData('name', e.target.value)}
                  placeholder="Kitchen Renovation - Smith Residence"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="projectType">Project Type</Label>
                <Select 
                  value={formData.projectType} 
                  onValueChange={(value) => updateFormData('projectType', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select project type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="residential_new">Residential - New Construction</SelectItem>
                    <SelectItem value="residential_renovation">Residential - Renovation</SelectItem>
                    <SelectItem value="commercial_new">Commercial - New Construction</SelectItem>
                    <SelectItem value="commercial_renovation">Commercial - Renovation</SelectItem>
                    <SelectItem value="infrastructure">Infrastructure</SelectItem>
                    <SelectItem value="specialty">Specialty Trade</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Project Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => updateFormData('description', e.target.value)}
                  placeholder="Describe the scope of work, key objectives, and any special requirements..."
                  rows={4}
                />
              </div>
            </div>
          </div>
        );
      
      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2">Client & Location</h2>
              <p className="text-muted-foreground">
                Client contact information and project location
              </p>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="clientName">Client Name</Label>
                  <Input
                    id="clientName"
                    value={formData.clientName}
                    onChange={(e) => updateFormData('clientName', e.target.value)}
                    placeholder="John & Jane Smith"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="clientEmail">Client Email</Label>
                  <Input
                    id="clientEmail"
                    type="email"
                    value={formData.clientEmail}
                    onChange={(e) => updateFormData('clientEmail', e.target.value)}
                    placeholder="client@example.com"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="siteAddress">
                  <MapPin className="h-4 w-4 inline mr-1" />
                  Project Site Address
                </Label>
                <Input
                  id="siteAddress"
                  value={formData.siteAddress}
                  onChange={(e) => updateFormData('siteAddress', e.target.value)}
                  placeholder="123 Main Street, City, State, ZIP"
                />
              </div>
            </div>
          </div>
        );
      
      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2">Timeline & Budget</h2>
              <p className="text-muted-foreground">
                Project schedule and financial planning
              </p>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => updateFormData('startDate', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">Target End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => updateFormData('endDate', e.target.value)}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="budget">
                    <DollarSign className="h-4 w-4 inline mr-1" />
                    Total Budget
                  </Label>
                  <Input
                    id="budget"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.budget}
                    onChange={(e) => updateFormData('budget', e.target.value)}
                    placeholder="50000.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="estimatedHours">
                    <Clock className="h-4 w-4 inline mr-1" />
                    Estimated Hours
                  </Label>
                  <Input
                    id="estimatedHours"
                    type="number"
                    min="0"
                    value={formData.estimatedHours}
                    onChange={(e) => updateFormData('estimatedHours', e.target.value)}
                    placeholder="200"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Permits & Documentation</Label>
                <div className="flex space-x-2">
                  <Input
                    value={newPermit}
                    onChange={(e) => setNewPermit(e.target.value)}
                    placeholder="Enter permit number"
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addPermit())}
                  />
                  <Button type="button" onClick={addPermit} variant="outline">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                
                {formData.permitNumbers.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.permitNumbers.map((permit) => (
                      <Badge key={permit} variant="secondary" className="flex items-center gap-1">
                        {permit}
                        <button
                          type="button"
                          onClick={() => removePermit(permit)}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      
      case 5:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2">Review & Create</h2>
              <p className="text-muted-foreground">
                Review your project details before creating
              </p>
            </div>
            
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Building2 className="h-5 w-5 mr-2" />
                    Project Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-muted-foreground">Template:</span>
                      <p>{selectedTemplate?.name}</p>
                    </div>
                    <div>
                      <span className="font-medium text-muted-foreground">Type:</span>
                      <p>{formData.projectType?.replace('_', ' ') || 'Custom'}</p>
                    </div>
                    <div>
                      <span className="font-medium text-muted-foreground">Budget:</span>
                      <p>{formData.budget ? `$${parseFloat(formData.budget).toLocaleString()}` : 'Not set'}</p>
                    </div>
                    <div>
                      <span className="font-medium text-muted-foreground">Duration:</span>
                      <p>
                        {formData.startDate && formData.endDate 
                          ? `${new Date(formData.startDate).toLocaleDateString()} - ${new Date(formData.endDate).toLocaleDateString()}`
                          : 'Not set'
                        }
                      </p>
                    </div>
                  </div>
                  
                  {selectedTemplate && selectedTemplate.phases.length > 0 && (
                    <div>
                      <span className="font-medium text-muted-foreground text-sm">Phases to be created:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {selectedTemplate.phases.map((phase) => (
                          <Badge key={phase} variant="outline" className="text-xs">
                            {phase}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {selectedTemplate && selectedTemplate.costCodes.length > 0 && (
                    <div>
                      <span className="font-medium text-muted-foreground text-sm">Cost codes to be created:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {selectedTemplate.costCodes.map((code) => (
                          <Badge key={code} variant="secondary" className="text-xs">
                            {code}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
          <DialogDescription>
            Step {currentStep} of {totalSteps}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          <Progress value={(currentStep / totalSteps) * 100} className="w-full" />
          
          {renderStep()}
          
          <div className="flex justify-between pt-4">
            <Button
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 1}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>
            
            {currentStep < totalSteps ? (
              <Button
                onClick={nextStep}
                disabled={!canProceed()}
              >
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={createProject}
                disabled={creating || !canProceed()}
              >
                {creating ? 'Creating...' : 'Create Project'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProjectWizard;