import { useState, useEffect } from 'react';
import { ContactPicker } from '@/components/customers/ContactPicker';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FormFieldHelp } from '@/components/help/HelpTooltip';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { projectService } from '@/services/projectService';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { AccessiblePageWrapper } from '@/components/accessibility/AccessiblePageWrapper';
import { Calendar, DollarSign, MapPin, User, Building2, Clock, Plus, X, Zap } from 'lucide-react';
import { mobileFilterClasses } from '@/utils/mobileHelpers';
import { ProjectTemplatesLibrary } from '@/components/projects/ProjectTemplatesLibrary';
import { Skeleton } from '@/components/ui/skeleton';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import {
  CREATE_PROJECT_DEFAULTS,
  createProjectFormSchema,
  type CreateProjectFormValues,
} from '@/lib/validations/projects';





const CreateProject = () => {
  const { user, userProfile, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [createLoading, setCreateLoading] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);

  // Quick Mode
  const [quickMode, setQuickMode] = useState(true);
  const [recentProjectTypes, setRecentProjectTypes] = useState<string[]>([]);

  // Typed fields (name, type, status, description, site, dates, budget,
  // hours) live in the form and are checked by createProjectFormSchema.
  const form = useForm<CreateProjectFormValues>({
    resolver: zodResolver(createProjectFormSchema),
    defaultValues: CREATE_PROJECT_DEFAULTS,
  });
  const projectName = form.watch('projectName');
  const [opportunityId, setOpportunityId] = useState<string | null>(null);

  // Client info
  const [clientId, setClientId] = useState<string | null>(null);
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');

  // Permits
  const [permitNumbers, setPermitNumbers] = useState<string[]>([]);
  const [newPermit, setNewPermit] = useState('');
  const [appliedTemplate, setAppliedTemplate] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }

    if (!loading && user && userProfile && !userProfile.company_id && userProfile.role !== 'root_admin') {
      navigate('/setup');
    }
  }, [user, userProfile, loading, navigate]);

  // Load recent clients and project types for quick suggestions
  useEffect(() => {
    if (userProfile?.company_id) {
      loadRecentData();
    }
  }, [userProfile?.company_id]);

  // Auto-populate dates in quick mode
  useEffect(() => {
    if (quickMode && !form.getValues('startDate') && !form.getValues('endDate')) {
      const today = new Date();
      form.setValue('startDate', today.toISOString().split('T')[0]);

      const defaultEndDate = new Date(today);
      defaultEndDate.setDate(defaultEndDate.getDate() + 30); // Default 30 days
      form.setValue('endDate', defaultEndDate.toISOString().split('T')[0]);
    }
  }, [quickMode, form]);

  const loadRecentData = async () => {
    try {
      // Get recent unique clients (last 10 projects)
      const { data: recentProjects } = await supabase
        .from('projects')
        .select('project_type')
        .eq('company_id', userProfile?.company_id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (recentProjects) {
        // US-326: the recent-client list is gone. It de-duplicated NAMES from
        // past projects, so picking one copied a string instead of linking a
        // record - which is how one homeowner became four unlinked rows. The
        // ContactPicker offers real contacts instead.

        // Extract unique project types
        const uniqueTypes = Array.from(
          new Set(recentProjects.filter(p => p.project_type).map(p => p.project_type))
        ).slice(0, 5);
        setRecentProjectTypes(uniqueTypes);
      }
    } catch (error) {
      console.error('Error loading recent data:', error);
    }
  };

  // LEAN Navigation: Pre-fill form from URL parameters (from CRM conversion)
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const opportunityIdParam = urlParams.get('opportunity');
    const name = urlParams.get('name');
    const budgetParam = urlParams.get('budget');
    const type = urlParams.get('type');
    
    if (opportunityIdParam && name) {
      form.setValue('projectName', name);
      // The id goes in projects.opportunity_id below, not into prose. It used
      // to be written only into the description, so the FK stayed null and no
      // report could join a won opportunity to the job it became (US-318).
      setOpportunityId(opportunityIdParam);
      form.setValue('description', '');
      
      if (budgetParam) {
        form.setValue('budget', budgetParam);
      }
      
      if (type) {
        form.setValue('projectType', type);
      }
      
      form.setValue('status', 'active'); // Set to active since this is from a won opportunity
    }
  }, [location.search, form]);

  if (loading) {
    return (
      <AccessiblePageWrapper pageTitle="Create Project">
      <DashboardLayout hasAccessibleWrapper title="Create Project">
        <div className="space-y-6" role="status" aria-live="polite" aria-label="Loading content">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {[1,2,3,4].map(i => <Skeleton key={i} className="h-24 rounded-lg" />)}
            </div>
            <Skeleton className="h-[300px] rounded-lg" />
          </div>
      </DashboardLayout>
      </AccessiblePageWrapper>
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
    form.setValue('projectType', template.project_type || '');
    form.setValue('description', template.description || '');
    form.setValue('budget', template.default_budget?.toString() || '');
    setAppliedTemplate(template.name);

    // Calculate dates from duration
    if (template.default_duration_days) {
      const today = new Date();
      form.setValue('startDate', today.toISOString().split('T')[0]);

      const endDateCalc = new Date(today);
      endDateCalc.setDate(endDateCalc.getDate() + template.default_duration_days);
      form.setValue('endDate', endDateCalc.toISOString().split('T')[0]);
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

  const handleSubmit = async ({
    projectName, description, projectType, status, siteAddress,
    startDate, endDate, budget, estimatedHours,
  }: CreateProjectFormValues) => {
    setCreateLoading(true);

    try {
      const projectData = {
        name: projectName,
        description: description || undefined,
        project_type: projectType || undefined,
        status,
        client_id: clientId || undefined,
        // Dual-written for one release: iOS at MIN_SUPPORTED_IOS_VERSION reads
        // these two and would show blank customers the day they were dropped.
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
        opportunity_id: opportunityId || undefined,
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
    <AccessiblePageWrapper pageTitle="Create New Project">
    <DashboardLayout hasAccessibleWrapper title="Create New Project">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Quick Mode Toggle & Template Selector */}
        <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="p-4 sm:p-6 space-y-4">
            {/* Quick Mode Toggle */}
            <div className="flex items-center justify-between pb-3 border-b border-primary/20">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${quickMode ? 'bg-primary text-primary-foreground' : 'bg-muted'}`} aria-hidden="true">
                  <Zap className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-semibold" id="quick-mode-label">Quick Entry Mode</h3>
                  <p className="text-xs text-muted-foreground" id="quick-mode-description">
                    {quickMode
                      ? 'Essential fields only - Create projects faster'
                      : 'All fields visible - Full customization'}
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant={quickMode ? "default" : "outline"}
                size="sm"
                onClick={() => setQuickMode(!quickMode)}
                aria-pressed={quickMode}
                aria-labelledby="quick-mode-label"
                aria-describedby="quick-mode-description"
              >
                {quickMode ? 'Switch to Detailed' : 'Switch to Quick'}
              </Button>
            </div>

            {/* Template Selector */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex-1">
                <h3 className="font-semibold flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary" aria-hidden="true" />
                  Start with a Template
                </h3>
                <p className="text-sm text-muted-foreground mt-1" role="status" aria-live="polite">
                  {appliedTemplate
                    ? `Using template: ${appliedTemplate}`
                    : 'Pre-fill form with a project template'}
                </p>
              </div>
              <Button
                type="button"
                variant={appliedTemplate ? "outline" : "secondary"}
                size="sm"
                onClick={() => setShowTemplates(true)}
                className="shrink-0"
                aria-label={appliedTemplate ? 'Change template' : 'Choose a project template'}
              >
                <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
                {appliedTemplate ? 'Change' : 'Choose Template'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} noValidate className="space-y-8" aria-label="Create new project form">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Building2 className="h-5 w-5 mr-2" aria-hidden="true" />
                Project Information
              </CardTitle>
              <CardDescription>
                Basic details about your construction project
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className={quickMode ? "space-y-2" : mobileFilterClasses.container}>
                <FormField
                  control={form.control}
                  name="projectName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project Name * <FormFieldHelp content="The name clients and your team will see. Use something recognizable like the address or client + job type." /></FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Kitchen Renovation - Smith Residence"
                          required
                          aria-required="true"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {!quickMode && (
                  <FormField
                    control={form.control}
                    name="projectType"
                    render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Type <FormFieldHelp content="Categorizes the job (e.g. Residential, Commercial) for reporting and templates." /></FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select project type" />
                        </SelectTrigger>
                      </FormControl>
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
                    <FormMessage />
                  </FormItem>
                    )}
                  />
                )}
              </div>

              {!quickMode && (
                <>
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Project Description <FormFieldHelp content="Optional scope summary of what the project covers. Visible to the team and on reports." /></FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="Describe the scope of work, key objectives, and any special requirements..."
                            rows={3}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                  <FormItem>
                    <FormLabel>Initial Status <FormFieldHelp content="Where the project starts in its lifecycle. You can change this any time as work progresses." /></FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="planning">Planning</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="on_hold">On Hold</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                    )}
                  />
                </>
              )}
            </CardContent>
          </Card>

          {/* Client Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="h-5 w-5 mr-2" aria-hidden="true" />
                Client & Location
              </CardTitle>
              <CardDescription>
                Client contact information and project location
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* US-326: the customer is a record, not four copies of a
                  string. The "Recent" popover this replaces offered names
                  selected from past projects, so choosing one COPIED the text
                  again rather than linking anyone - which is how the same
                  homeowner ended up as four unlinked rows. The name and email
                  below are still written for one release, because iOS at
                  MIN_SUPPORTED_IOS_VERSION reads them. */}
              <div className="space-y-4">
                <ContactPicker
                  value={clientId}
                  onChange={(contact) => {
                    setClientId(contact?.id ?? null);
                    setClientName(contact?.name ?? '');
                    setClientEmail(contact?.email ?? '');
                  }}
                  label="Customer"
                  hint="Everything for this customer links to one record. Add a new one if they are not listed."
                />

                {clientId && (
                  <div className={mobileFilterClasses.container}>
                    <div className="space-y-2">
                      <Label htmlFor="clientName">Client Name</Label>
                      <Input id="clientName" value={clientName} readOnly disabled />
                    </div>
                    {!quickMode && (
                      <div className="space-y-2">
                        <Label htmlFor="clientEmail">Client Email</Label>
                        <Input id="clientEmail" type="email" value={clientEmail} readOnly disabled />
                      </div>
                    )}
                  </div>
                )}
              </div>

              {!quickMode && (
                <FormField
                  control={form.control}
                  name="siteAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        <MapPin className="h-4 w-4 inline mr-1" aria-hidden="true" />
                        Project Site Address
                      </FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="123 Main Street, City, State, ZIP" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </CardContent>
          </Card>

          {/* Timeline & Budget */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="h-5 w-5 mr-2" aria-hidden="true" />
                Timeline & Budget
              </CardTitle>
              <CardDescription>
                Project schedule and financial planning
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className={mobileFilterClasses.container}>
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Date</FormLabel>
                      <FormControl>
                        <Input {...field} type="date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Target End Date</FormLabel>
                      <FormControl>
                        <Input {...field} type="date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className={quickMode ? "space-y-2" : mobileFilterClasses.container}>
                <FormField
                  control={form.control}
                  name="budget"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        <DollarSign className="h-4 w-4 inline mr-1" aria-hidden="true" />
                        Total Budget
                      </FormLabel>
                      <FormControl>
                        <Input {...field} type="number" step="0.01" min="0" placeholder="50000.00" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {!quickMode && (
                  <FormField
                    control={form.control}
                    name="estimatedHours"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          <Clock className="h-4 w-4 inline mr-1" aria-hidden="true" />
                          Estimated Hours
                        </FormLabel>
                        <FormControl>
                          <Input {...field} type="number" min="0" placeholder="200" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>
            </CardContent>
          </Card>

          {/* Permits */}
          {!quickMode && (
          <Card>
            <CardHeader>
              <CardTitle>Permits & Documentation</CardTitle>
              <CardDescription>
                Track required permits and documentation for this project
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex space-x-2">
                <label htmlFor="newPermit" className="sr-only">Add permit number</label>
                <Input
                  id="newPermit"
                  value={newPermit}
                  onChange={(e) => setNewPermit(e.target.value)}
                  placeholder="Enter permit number"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addPermit())}
                />
                <Button type="button" onClick={addPermit} variant="outline" aria-label="Add permit">
                  <Plus className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>

              {permitNumbers.length > 0 && (
                <div className="flex flex-wrap gap-2" role="list" aria-label="Added permits">
                  {permitNumbers.map((permit) => (
                    <Badge key={permit} variant="secondary" className="flex items-center gap-1" role="listitem">
                      {permit}
                      <button
                        type="button"
                        onClick={() => removePermit(permit)}
                        className="ml-1 hover:text-destructive"
                        aria-label={`Remove permit ${permit}`}
                      >
                        <X className="h-3 w-3" aria-hidden="true" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          )}

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
              aria-busy={createLoading}
            >
              {createLoading ? 'Creating Project...' : 'Create Project'}
            </Button>
          </div>
        </form>
        </Form>

        {/* Project Templates Library Modal */}
        <ProjectTemplatesLibrary
          open={showTemplates}
          onOpenChange={setShowTemplates}
          onSelectTemplate={handleTemplateSelect}
          companyId={userProfile?.company_id}
        />
      </div>
    </DashboardLayout>
    </AccessiblePageWrapper>
  );
};

export default CreateProject;