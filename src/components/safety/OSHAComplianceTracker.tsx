import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  CalendarIcon,
  Shield, 
  Clock,
  AlertTriangle,
  CheckCircle,
  Users,
  FileText,
  Bell
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format, addDays, addWeeks, addMonths, isAfter, isBefore } from 'date-fns';

interface OSHARequirement {
  id: string;
  title: string;
  description: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually';
  category: 'training' | 'inspection' | 'documentation' | 'reporting';
  next_due_date: string;
  last_completed_date?: string;
  status: 'pending' | 'overdue' | 'completed' | 'upcoming';
  assigned_to?: string;
  company_id: string;
}

interface OSHAComplianceTrackerProps {
  projectId?: string;
}

const OSHAComplianceTracker: React.FC<OSHAComplianceTrackerProps> = ({
  projectId
}) => {
  const [requirements, setRequirements] = useState<OSHARequirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const { toast } = useToast();
  const { user, userProfile } = useAuth();

  useEffect(() => {
    loadOSHARequirements();
  }, [userProfile?.company_id]);

  const loadOSHARequirements = async () => {
    try {
      if (!userProfile?.company_id) return;

      const { data, error } = await supabase
        .from('osha_requirements')
        .select('*')
        .eq('company_id', userProfile.company_id)
        .order('next_due_date', { ascending: true });

      if (error) throw error;
      
      // Calculate status for each requirement
      const requirementsWithStatus = data?.map(req => ({
        ...req,
        frequency: req.frequency as 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually',
        category: req.category as 'training' | 'inspection' | 'documentation' | 'reporting',
        status: calculateStatus(req.next_due_date, req.last_completed_date)
      })) || [];

      setRequirements(requirementsWithStatus);
    } catch (error) {
      console.error('Error loading OSHA requirements:', error);
      toast({
        title: "Error",
        description: "Failed to load OSHA requirements",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateStatus = (nextDueDate: string, lastCompletedDate?: string): 'pending' | 'overdue' | 'completed' | 'upcoming' => {
    const dueDate = new Date(nextDueDate);
    const now = new Date();
    const threeDaysFromNow = addDays(now, 3);

    if (isBefore(dueDate, now)) {
      return 'overdue';
    } else if (isBefore(dueDate, threeDaysFromNow)) {
      return 'upcoming';
    } else if (lastCompletedDate && isAfter(new Date(lastCompletedDate), addDays(dueDate, -30))) {
      return 'completed';
    } else {
      return 'pending';
    }
  };

  const getNextDueDate = (frequency: string, lastCompleted?: string): Date => {
    const baseDate = lastCompleted ? new Date(lastCompleted) : new Date();
    
    switch (frequency) {
      case 'daily': return addDays(baseDate, 1);
      case 'weekly': return addWeeks(baseDate, 1);
      case 'monthly': return addMonths(baseDate, 1);
      case 'quarterly': return addMonths(baseDate, 3);
      case 'annually': return addMonths(baseDate, 12);
      default: return addWeeks(baseDate, 1);
    }
  };

  const completeRequirement = async (requirementId: string) => {
    try {
      const requirement = requirements.find(r => r.id === requirementId);
      if (!requirement) return;

      const completedDate = new Date().toISOString();
      const nextDueDate = getNextDueDate(requirement.frequency, completedDate);

      const { error } = await supabase
        .from('osha_requirements')
        .update({
          last_completed_date: completedDate,
          next_due_date: nextDueDate.toISOString(),
          status: 'completed'
        })
        .eq('id', requirementId);

      if (error) throw error;

      // Log completion
      await supabase
        .from('osha_compliance_log')
        .insert({
          requirement_id: requirementId,
          completed_by: user?.id,
          completed_at: completedDate,
          company_id: userProfile?.company_id,
          project_id: projectId,
          notes: `Completed ${requirement.title}`
        });

      toast({
        title: "Requirement Completed",
        description: `${requirement.title} marked as completed`,
      });

      loadOSHARequirements();
    } catch (error) {
      console.error('Error completing requirement:', error);
      toast({
        title: "Error",
        description: "Failed to complete requirement",
        variant: "destructive"
      });
    }
  };

  const createCustomRequirement = async () => {
    try {
      const { data, error } = await supabase
        .from('osha_requirements')
        .insert({
          title: 'Custom Safety Requirement',
          description: 'Custom safety requirement created by user',
          frequency: 'weekly',
          category: 'inspection',
          next_due_date: addWeeks(new Date(), 1).toISOString(),
          company_id: userProfile?.company_id,
          status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Requirement Created",
        description: "New custom requirement added",
      });

      loadOSHARequirements();
    } catch (error) {
      console.error('Error creating requirement:', error);
      toast({
        title: "Error",
        description: "Failed to create requirement",
        variant: "destructive"
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'overdue': return 'destructive';
      case 'upcoming': return 'default';
      case 'completed': return 'secondary';
      case 'pending': return 'outline';
      default: return 'outline';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'overdue': return <AlertTriangle className="h-4 w-4" />;
      case 'upcoming': return <Clock className="h-4 w-4" />;
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'pending': return <Bell className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'training': return <Users className="h-4 w-4" />;
      case 'inspection': return <Shield className="h-4 w-4" />;
      case 'documentation': return <FileText className="h-4 w-4" />;
      case 'reporting': return <Bell className="h-4 w-4" />;
      default: return <Shield className="h-4 w-4" />;
    }
  };

  const filteredRequirements = requirements.filter(req => {
    const categoryMatch = filterCategory === 'all' || req.category === filterCategory;
    const statusMatch = filterStatus === 'all' || req.status === filterStatus;
    return categoryMatch && statusMatch;
  });

  const overdueCount = requirements.filter(r => r.status === 'overdue').length;
  const upcomingCount = requirements.filter(r => r.status === 'upcoming').length;
  const completedCount = requirements.filter(r => r.status === 'completed').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading OSHA requirements...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-6 w-6" />
            OSHA Compliance Tracker
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Track and manage OSHA safety requirements and deadlines
          </p>
        </CardHeader>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-600">Overdue</p>
                <p className="text-2xl font-bold text-red-700">{overdueCount}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-yellow-600">Due Soon</p>
                <p className="text-2xl font-bold text-yellow-700">{upcomingCount}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">Completed</p>
                <p className="text-2xl font-bold text-green-700">{completedCount}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Total</p>
                <p className="text-2xl font-bold text-blue-700">{requirements.length}</p>
              </div>
              <Shield className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div className="flex flex-wrap gap-4">
              <div>
                <Label htmlFor="category-filter">Category</Label>
                <select
                  id="category-filter"
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="ml-2 p-2 border rounded"
                >
                  <option value="all">All Categories</option>
                  <option value="training">Training</option>
                  <option value="inspection">Inspection</option>
                  <option value="documentation">Documentation</option>
                  <option value="reporting">Reporting</option>
                </select>
              </div>

              <div>
                <Label htmlFor="status-filter">Status</Label>
                <select
                  id="status-filter"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="ml-2 p-2 border rounded"
                >
                  <option value="all">All Status</option>
                  <option value="overdue">Overdue</option>
                  <option value="upcoming">Due Soon</option>
                  <option value="pending">Pending</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            </div>

            <Button onClick={createCustomRequirement} variant="outline">
              <Shield className="mr-2 h-4 w-4" />
              Add Custom Requirement
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Requirements List */}
      <div className="space-y-4">
        {filteredRequirements.map((requirement) => (
          <Card key={requirement.id} className={`${
            requirement.status === 'overdue' ? 'border-red-200 bg-red-50' : 
            requirement.status === 'upcoming' ? 'border-yellow-200 bg-yellow-50' : 
            requirement.status === 'completed' ? 'border-green-200 bg-green-50' : ''
          }`}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {getCategoryIcon(requirement.category)}
                    <h3 className="font-semibold">{requirement.title}</h3>
                    <Badge variant={getStatusColor(requirement.status)} className="flex items-center gap-1">
                      {getStatusIcon(requirement.status)}
                      {requirement.status.charAt(0).toUpperCase() + requirement.status.slice(1)}
                    </Badge>
                  </div>
                  
                  <p className="text-sm text-muted-foreground mb-3">
                    {requirement.description}
                  </p>
                  
                  <div className="flex flex-wrap gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <CalendarIcon className="h-4 w-4" />
                      <span>Due: {format(new Date(requirement.next_due_date), 'MMM dd, yyyy')}</span>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>Frequency: {requirement.frequency}</span>
                    </div>
                    
                    {requirement.last_completed_date && (
                      <div className="flex items-center gap-1">
                        <CheckCircle className="h-4 w-4" />
                        <span>Last: {format(new Date(requirement.last_completed_date), 'MMM dd, yyyy')}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex gap-2 ml-4">
                  {requirement.status !== 'completed' && (
                    <Button
                      onClick={() => completeRequirement(requirement.id)}
                      size="sm"
                      variant={requirement.status === 'overdue' ? 'destructive' : 'default'}
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Mark Complete
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredRequirements.length === 0 && (
        <Card>
          <CardContent className="pt-12 pb-12">
            <div className="text-center">
              <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Requirements Found</h3>
              <p className="text-muted-foreground mb-4">
                {filterCategory !== 'all' || filterStatus !== 'all' 
                  ? "No requirements match your current filters" 
                  : "No OSHA requirements have been set up yet"}
              </p>
              <Button onClick={createCustomRequirement}>
                <Shield className="mr-2 h-4 w-4" />
                Add First Requirement
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default OSHAComplianceTracker;