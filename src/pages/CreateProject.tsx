import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { projectService } from '@/services/projectService';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import {
  ArrowLeft,
  Calendar,
  DollarSign,
  MapPin,
  User,
  Building2,
  Clock,
  Plus,
  X,
  CheckCircle2
} from 'lucide-react';
import { MobilePageWrapper, MobileStatsGrid, MobileFilters, mobileGridClasses, mobileFilterClasses, mobileButtonClasses } from '@/utils/mobileHelpers';
import { ProjectTemplatesLibrary } from '@/components/projects/ProjectTemplatesLibrary';

const CreateProject = () => {
  const { user, userProfile, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [createLoading, setCreateLoading] = useState(false);
  const [projectManagers, setProjectManagers] = useState<any[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);

  // Project basic info
  const [projectName, setProjectName] = useState('');
  const [description, setDescription] = useState('');
  const [projectType, setProjectType] = useState('');
  const [status, setStatus] = useState('planning');
  const [projectManagerId, setProjectManagerId] = useState('');

  // Client info
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [siteAddress, setSiteAddress] = useState('');

  // Timeline and budget
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [budget, setBudget] = useState('');
  const [estimatedHours, setEstimatedHours] = useState('');

  // Permits
  const [permitNumbers, setPermitNumbers] = useState<string[]>([]);
  const [newPermit, setNewPermit] = useState('');
  const [appliedTemplate, setAppliedTemplate] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
    
    if (!loading && user && userProfile && !userProfile.company_id) {
      navigate('/setup');
    }
  }, [user, userProfile, loading, navigate]);

  // LEAN Navigation: Pre-fill form from URL parameters (from CRM conversion)
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const opportunityId = urlParams.get('opportunity');
    const name = urlParams.get('name');
    const budgetParam = urlParams.get('budget');
    const type = urlParams.get('type');
    
    if (opportunityId && name) {
      setProjectName(name);
      setDescription(`Project created from CRM opportunity (ID: ${opportunityId})`);
      
      if (budgetParam) {
        setBudget(budgetParam);
      }
      
      if (type) {
        setProjectType(type);
      }
      
      setStatus('active'); // Set to active since this is from a won opportunity
    }
  }, [location.search]);

  if (loading) {
    return (
      <DashboardLayout title="Create Project">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-construction-blue mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!user || !userProfile?.company_id) return null;

  const addPermit = () => {
    if (newPermit.trim() && !permitNumbers.includes(newPermit.trim())) {
      setPermitNumbers([...permitNumbers, newPermit.trim()]);
      setNewPermit('');
    }
  };

  const removePermit = (permit: string) => {
    setPermitNumbers(permitNumbers.filter(p => p !== permit));
  };

  const handleTemplateSelect = (template: any) => {
    // Auto-fill form from template
    setProjectType(template.project_type || '');
    setDescription(template.description || '');
    setBudget(template.default_budget?.toString() || '');
    setAppliedTemplate(template.name);

    // Calculate dates from duration
    if (template.default_duration_days) {
      const today = new Date();
      setStartDate(today.toISOString().split('T')[0]);

      const endDateCalc = new Date(today);
      endDateCalc.setDate(endDateCalc.getDate() + template.default_duration_days);
      setEndDate(endDateCalc.toISOString().split('T')[0]);
    }

    // Add permits from template
    if (template.permit_checklist && Array.isArray(template.permit_checklist)) {
      setPermitNumbers(template.permit_checklist);
    }

    toast({
      title: 'Template Applied',
      description: `Form pre-filled with ${template.name} template defaults`,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);

    try {
      const projectData = {
        name: projectName,
        description: description || undefined,
        project_type: projectType || undefined,
        status,
        client_name: clientName || '',
        client_email: clientEmail || undefined,
        site_address: siteAddress || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        budget: budget ? parseFloat(budget) : undefined,
        estimated_hours: estimatedHours ? parseInt(estimatedHours) : undefined,
        permit_numbers: permitNumbers.length > 0 ? permitNumbers : undefined,
        company_id: userProfile.company_id,
        created_by: user.id,
      };

      const project = await projectService.createProject(projectData);

      toast({
        title: "Project Created!",
        description: `${projectName} has been created successfully.`
      });

      navigate('/dashboard');

    } catch (error: any) {
      console.error('Project creation error:', error);
      toast({
        variant: "destructive",
        title: "Failed to Create Project",
        description: error.message || "An error occurred while creating the project"
      });
    } finally {
      setCreateLoading(false);
    }
  };

  return (
    <DashboardLayout title="Create New Project">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Template Selector Button */}
        <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-1 flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  Start with a Template
                </h3>
                <p className="text-sm text-muted-foreground">
                  {appliedTemplate
                    ? `Using template: ${appliedTemplate}`
                    : 'Save time by starting with a pre-configured project template'}
                </p>
              </div>
              <Button
                type="button"
                variant={appliedTemplate ? "outline" : "default"}
                onClick={() => setShowTemplates(true)}
                className="shrink-0"
              >
                <Plus className="h-4 w-4 mr-2" />
                {appliedTemplate ? 'Change Template' : 'Choose Template'}
              </Button>
            </div>
            {appliedTemplate && (
              <div className="mt-3 flex items-center gap-2 text-sm">
                <Badge variant="secondary" className="gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Template Applied
                </Badge>
                <span className="text-muted-foreground">You can still customize all fields below</span>
              </div>
            )}
          </CardContent>
        </Card>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Building2 className="h-5 w-5 mr-2" />
                Project Information
              </CardTitle>
              <CardDescription>
                Basic details about your construction project
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className={mobileFilterClasses.container}>
                <div className="space-y-2">
                  <Label htmlFor="projectName">Project Name *</Label>
                  <Input
                    id="projectName"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="Kitchen Renovation - Smith Residence"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="projectType">Project Type</Label>
                  <Select value={projectType} onValueChange={setProjectType}>
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
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Project Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the scope of work, key objectives, and any special requirements..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Initial Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planning">Planning</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="on_hold">On Hold</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Client Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="h-5 w-5 mr-2" />
                Client & Location
              </CardTitle>
              <CardDescription>
                Client contact information and project location
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className={mobileFilterClasses.container}>
                <div className="space-y-2">
                  <Label htmlFor="clientName">Client Name</Label>
                  <Input
                    id="clientName"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="John & Jane Smith"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="clientEmail">Client Email</Label>
                  <Input
                    id="clientEmail"
                    type="email"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
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
                  value={siteAddress}
                  onChange={(e) => setSiteAddress(e.target.value)}
                  placeholder="123 Main Street, City, State, ZIP"
                />
              </div>
            </CardContent>
          </Card>

          {/* Timeline & Budget */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="h-5 w-5 mr-2" />
                Timeline & Budget
              </CardTitle>
              <CardDescription>
                Project schedule and financial planning
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className={mobileFilterClasses.container}>
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">Target End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>

              <div className={mobileFilterClasses.container}>
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
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
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
                    value={estimatedHours}
                    onChange={(e) => setEstimatedHours(e.target.value)}
                    placeholder="200"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Permits */}
          <Card>
            <CardHeader>
              <CardTitle>Permits & Documentation</CardTitle>
              <CardDescription>
                Track required permits and documentation for this project
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
              
              {permitNumbers.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {permitNumbers.map((permit) => (
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
            </CardContent>
          </Card>

          {/* Submit */}
          <div className={mobileFilterClasses.buttonGroup}>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/dashboard')}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createLoading || !projectName}
            >
              {createLoading ? 'Creating Project...' : 'Create Project'}
            </Button>
          </div>
        </form>

        {/* Project Templates Library Modal */}
        <ProjectTemplatesLibrary
          open={showTemplates}
          onOpenChange={setShowTemplates}
          onSelectTemplate={handleTemplateSelect}
          companyId={userProfile?.company_id}
        />
      </div>
    </DashboardLayout>
  );
};

export default CreateProject;