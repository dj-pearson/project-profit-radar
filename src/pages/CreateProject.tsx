import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { 
  ArrowLeft, 
  Calendar, 
  DollarSign, 
  MapPin, 
  User, 
  Building2,
  Clock,
  Plus,
  X
} from 'lucide-react';

const CreateProject = () => {
  const { user, userProfile, loading } = useAuth();
  const navigate = useNavigate();
  const [createLoading, setCreateLoading] = useState(false);
  
  // Project basic info
  const [projectName, setProjectName] = useState('');
  const [description, setDescription] = useState('');
  const [projectType, setProjectType] = useState('');
  const [status, setStatus] = useState('planning');
  
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

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
    
    if (!loading && user && userProfile && !userProfile.company_id) {
      navigate('/setup');
    }
  }, [user, userProfile, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-construction-blue mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);

    try {
      const projectData = {
        name: projectName,
        description: description || null,
        project_type: projectType || null,
        status,
        client_name: clientName || null,
        client_email: clientEmail || null,
        site_address: siteAddress || null,
        start_date: startDate || null,
        end_date: endDate || null,
        budget: budget ? parseFloat(budget) : null,
        estimated_hours: estimatedHours ? parseInt(estimatedHours) : null,
        permit_numbers: permitNumbers.length > 0 ? permitNumbers : null,
        company_id: userProfile.company_id,
        created_by: user.id,
      };

      const { data: project, error } = await supabase
        .from('projects')
        .insert([projectData])
        .select()
        .single();

      if (error) throw error;

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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/dashboard')}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
              <Separator orientation="vertical" className="h-6" />
              <h1 className="text-xl font-semibold">Create New Project</h1>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
          <div className="flex justify-end space-x-4">
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
      </div>
    </div>
  );
};

export default CreateProject;