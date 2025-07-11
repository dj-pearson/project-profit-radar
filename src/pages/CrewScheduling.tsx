import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ResponsiveContainer } from '@/components/layout/ResponsiveContainer';
import { mobileGridClasses, mobileFilterClasses, mobileButtonClasses, mobileTextClasses, mobileCardClasses } from '@/utils/mobileHelpers';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import VisualScheduler from '@/components/scheduling/VisualScheduler';
import { 
  ArrowLeft, 
  Calendar,
  Users,
  Plus,
  MapPin,
  Clock,
  Phone,
  Edit,
  Trash2,
  AlertTriangle
} from 'lucide-react';

interface CrewMember {
  id: string;
  name: string;
  role: string;
  phone?: string;
  skills: string[];
  availability: string[];
}

interface CrewAssignment {
  id: string;
  project_id: string;
  project_name: string;
  crew_member_id: string;
  crew_member_name: string;
  date: string;
  start_time: string;
  end_time: string;
  location: string;
  status: 'scheduled' | 'dispatched' | 'in_progress' | 'completed' | 'cancelled';
  notes?: string;
}

const CrewScheduling = () => {
  const { user, userProfile, loading } = useAuth();
  const navigate = useNavigate();
  
  const [projects, setProjects] = useState([]);
  const [crewMembers, setCrewMembers] = useState<CrewMember[]>([]);
  const [assignments, setAssignments] = useState<CrewAssignment[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loadingData, setLoadingData] = useState(true);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  
  const [newAssignment, setNewAssignment] = useState({
    project_id: '',
    crew_member_id: '',
    date: selectedDate,
    start_time: '08:00',
    end_time: '17:00',
    location: '',
    notes: ''
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
    
    if (!loading && user && userProfile && !userProfile.company_id) {
      navigate('/setup');
    }
    
    // Check role permissions
    if (!loading && userProfile && !['admin', 'project_manager', 'field_supervisor', 'root_admin'].includes(userProfile.role)) {
      navigate('/dashboard');
      toast({
        variant: "destructive",
        title: "Access Denied",
        description: "You don't have permission to access crew scheduling."
      });
      return;
    }
    
    if (userProfile?.company_id) {
      loadData();
    }
  }, [user, userProfile, loading, navigate]);

  const loadData = async () => {
    try {
      setLoadingData(true);
      
      // Load projects
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('id, name, description, site_address')
        .eq('company_id', userProfile?.company_id)
        .eq('status', 'active')
        .order('name');

      if (projectsError) throw projectsError;
      setProjects(projectsData || []);

      // Load crew members (from user_profiles table)
      const { data: crewData, error: crewError } = await supabase
        .from('user_profiles')
        .select('id, first_name, last_name, role, phone')
        .eq('company_id', userProfile?.company_id)
        .in('role', ['field_supervisor', 'admin', 'project_manager'])
        .order('first_name');

      if (crewError) throw crewError;
      
      const formattedCrew = (crewData || []).map(member => ({
        id: member.id,
        name: `${member.first_name} ${member.last_name}`,
        role: member.role,
        phone: member.phone,
        skills: [], // Could be enhanced to store skills
        availability: ['mon', 'tue', 'wed', 'thu', 'fri'] // Default availability
      }));
      
      setCrewMembers(formattedCrew);

      // Load crew assignments for selected date
      await loadAssignments();

    } catch (error: any) {
      console.error('Error loading data:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load crew scheduling data"
      });
    } finally {
      setLoadingData(false);
    }
  };

  const loadAssignments = async () => {
    try {
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('crew_assignments')
        .select(`
          *,
          projects(name, site_address),
          crew_member:user_profiles!crew_member_id(first_name, last_name)
        `)
        .eq('company_id', userProfile?.company_id)
        .eq('assigned_date', selectedDate)
        .order('start_time');

      if (assignmentsError) throw assignmentsError;

      const formattedAssignments = (assignmentsData || []).map(assignment => ({
        id: assignment.id,
        project_id: assignment.project_id,
        project_name: assignment.projects?.name || '',
        crew_member_id: assignment.crew_member_id,
        crew_member_name: `${assignment.crew_member?.first_name} ${assignment.crew_member?.last_name}`,
        date: assignment.assigned_date,
        start_time: assignment.start_time,
        end_time: assignment.end_time,
        location: assignment.location || assignment.projects?.site_address || '',
        status: assignment.status as 'scheduled' | 'dispatched' | 'in_progress' | 'completed' | 'cancelled',
        notes: assignment.notes
      }));

      setAssignments(formattedAssignments);
    } catch (error: any) {
      console.error('Error loading assignments:', error);
    }
  };

  // Effect to reload assignments when date changes
  useEffect(() => {
    if (userProfile?.company_id) {
      loadAssignments();
    }
  }, [selectedDate, userProfile?.company_id]);

  const handleCreateAssignment = async () => {
    if (!newAssignment.project_id || !newAssignment.crew_member_id) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please select both a project and crew member."
      });
      return;
    }

    // Check for conflicts
    const existingAssignment = assignments.find(a => 
      a.crew_member_id === newAssignment.crew_member_id &&
      a.date === newAssignment.date &&
      ((newAssignment.start_time >= a.start_time && newAssignment.start_time < a.end_time) ||
       (newAssignment.end_time > a.start_time && newAssignment.end_time <= a.end_time) ||
       (newAssignment.start_time <= a.start_time && newAssignment.end_time >= a.end_time))
    );

    if (existingAssignment) {
      toast({
        variant: "destructive",
        title: "Scheduling Conflict",
        description: `${crewMembers.find(c => c.id === newAssignment.crew_member_id)?.name} is already assigned during this time period.`
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('crew_assignments')
        .insert([{
          company_id: userProfile?.company_id,
          project_id: newAssignment.project_id,
          crew_member_id: newAssignment.crew_member_id,
          assigned_date: newAssignment.date,
          start_time: newAssignment.start_time,
          end_time: newAssignment.end_time,
          location: newAssignment.location,
          notes: newAssignment.notes,
          created_by: user?.id
        }])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Success",
        description: "Crew assignment created successfully"
      });

      setIsAssignDialogOpen(false);
      setNewAssignment({
        project_id: '',
        crew_member_id: '',
        date: selectedDate,
        start_time: '08:00',
        end_time: '17:00',
        location: '',
        notes: ''
      });

      // Reload assignments
      await loadAssignments();
      
    } catch (error: any) {
      console.error('Error creating assignment:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create crew assignment"
      });
    }
  };

  const handleUpdateAssignmentStatus = async (assignmentId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('crew_assignments')
        .update({ status: newStatus })
        .eq('id', assignmentId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Assignment status updated to ${newStatus}`
      });

      await loadAssignments();
    } catch (error: any) {
      console.error('Error updating assignment:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update assignment status"
      });
    }
  };

  const handleDeleteAssignment = async (assignmentId: string) => {
    try {
      const { error } = await supabase
        .from('crew_assignments')
        .delete()
        .eq('id', assignmentId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Assignment deleted successfully"
      });

      await loadAssignments();
    } catch (error: any) {
      console.error('Error deleting assignment:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete assignment"
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-500';
      case 'dispatched': return 'bg-orange-500';
      case 'completed': return 'bg-green-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const todaysAssignments = assignments.filter(a => a.date === selectedDate);

  if (loading || loadingData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-construction-blue mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading crew scheduling...</p>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout title="Crew Scheduling & Dispatch" showTrialBanner={false}>
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className={mobileTextClasses.title}>Crew Scheduling & Dispatch</h1>
            <p className={mobileTextClasses.muted}>Manage crew assignments and dispatch</p>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0">
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-32 sm:w-40 text-xs sm:text-sm"
            />
            <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="text-xs sm:text-sm px-2 sm:px-3">
                  <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Assign Crew</span>
                  <span className="sm:hidden">Assign</span>
                </Button>
              </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Crew Assignment</DialogTitle>
                    <DialogDescription>
                      Assign crew members to projects for specific dates and times.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="project">Project *</Label>
                      <Select value={newAssignment.project_id} onValueChange={(value) => setNewAssignment({...newAssignment, project_id: value})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select project" />
                        </SelectTrigger>
                        <SelectContent>
                          {projects.map((project: any) => (
                            <SelectItem key={project.id} value={project.id}>
                              {project.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="crew_member">Crew Member *</Label>
                      <Select value={newAssignment.crew_member_id} onValueChange={(value) => setNewAssignment({...newAssignment, crew_member_id: value})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select crew member" />
                        </SelectTrigger>
                        <SelectContent>
                          {crewMembers.map((member) => (
                            <SelectItem key={member.id} value={member.id}>
                              {member.name} - {member.role}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="date">Date</Label>
                        <Input
                          id="date"
                          type="date"
                          value={newAssignment.date}
                          onChange={(e) => setNewAssignment({...newAssignment, date: e.target.value})}
                        />
                      </div>
                      <div>
                        <Label htmlFor="start_time">Start Time</Label>
                        <Input
                          id="start_time"
                          type="time"
                          value={newAssignment.start_time}
                          onChange={(e) => setNewAssignment({...newAssignment, start_time: e.target.value})}
                        />
                      </div>
                      <div>
                        <Label htmlFor="end_time">End Time</Label>
                        <Input
                          id="end_time"
                          type="time"
                          value={newAssignment.end_time}
                          onChange={(e) => setNewAssignment({...newAssignment, end_time: e.target.value})}
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="location">Location</Label>
                      <Input
                        id="location"
                        placeholder="Work site location"
                        value={newAssignment.location}
                        onChange={(e) => setNewAssignment({...newAssignment, location: e.target.value})}
                      />
                    </div>

                    <div>
                      <Label htmlFor="notes">Notes</Label>
                      <Input
                        id="notes"
                        placeholder="Special instructions or notes"
                        value={newAssignment.notes}
                        onChange={(e) => setNewAssignment({...newAssignment, notes: e.target.value})}
                      />
                    </div>

                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleCreateAssignment}>
                        Create Assignment
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Today's Assignments */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5" />
                  <span>Today's Assignments</span>
                </CardTitle>
                <CardDescription>
                  {new Date(selectedDate).toLocaleDateString()} - {todaysAssignments.length} assignments
                </CardDescription>
              </CardHeader>
              <CardContent>
                {todaysAssignments.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Assignments</h3>
                    <p className="text-muted-foreground mb-4">No crew assignments for this date</p>
                    <Button onClick={() => setIsAssignDialogOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Assignment
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {todaysAssignments.map((assignment) => (
                      <div key={assignment.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium">{assignment.crew_member_name}</h4>
                            <p className="text-sm text-muted-foreground">{assignment.project_name}</p>
                            <div className="flex items-center space-x-4 mt-2 text-xs text-muted-foreground">
                              <div className="flex items-center space-x-1">
                                <Clock className="h-3 w-3" />
                                <span>{assignment.start_time} - {assignment.end_time}</span>
                              </div>
                              {assignment.location && (
                                <div className="flex items-center space-x-1">
                                  <MapPin className="h-3 w-3" />
                                  <span>{assignment.location}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge className={`${getStatusColor(assignment.status)} text-white`}>
                              {assignment.status}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteAssignment(assignment.id)}
                              className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        {assignment.notes && (
                          <p className="text-sm text-muted-foreground mt-2 border-t pt-2">
                            {assignment.notes}
                          </p>
                        )}
                        <div className="flex space-x-2 mt-3">
                          {assignment.status === 'scheduled' && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleUpdateAssignmentStatus(assignment.id, 'dispatched')}
                            >
                              Dispatch
                            </Button>
                          )}
                          {assignment.status === 'dispatched' && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleUpdateAssignmentStatus(assignment.id, 'in_progress')}
                            >
                              Start Work
                            </Button>
                          )}
                          {assignment.status === 'in_progress' && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleUpdateAssignmentStatus(assignment.id, 'completed')}
                            >
                              Complete
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Crew Members */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="h-5 w-5" />
                  <span>Available Crew</span>
                </CardTitle>
                <CardDescription>{crewMembers.length} crew members</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {crewMembers.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <h4 className="font-medium">{member.name}</h4>
                        <p className="text-sm text-muted-foreground">{member.role}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        {member.phone && (
                          <Button variant="outline" size="sm">
                            <Phone className="h-3 w-3" />
                          </Button>
                        )}
                        <Badge variant="outline">Available</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Enhanced Visual Scheduler */}
          <div className="lg:col-span-2">
            <VisualScheduler 
              selectedDate={selectedDate} 
              onAssignmentChange={loadAssignments}
              companyId={userProfile?.company_id || ''}
            />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default CrewScheduling;