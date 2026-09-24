import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { RoleGuard, ROLE_GROUPS } from '@/components/auth/RoleGuard';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { AccessiblePageWrapper } from '@/components/accessibility/AccessiblePageWrapper';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AccessibleForm, AccessibleFormField } from '@/components/accessibility/AccessibleForm';
import { toast } from '@/hooks/use-toast';
import { useCrewScheduling, type CrewProject } from '@/hooks/useCrewScheduling';
import { ErrorState } from '@/components/common/ErrorState';
import VisualScheduler from '@/components/scheduling/VisualScheduler';
import { CrewScheduleBoard } from '@/components/scheduling/CrewScheduleBoard';
import { Calendar, Users, Plus, MapPin, Clock, Phone, Trash2 } from 'lucide-react';
import { confirmAction } from "@/components/ui/confirm-dialog";
import { Skeleton } from '@/components/ui/skeleton';

const CrewScheduling = () => {
  const { user, userProfile, loading } = useAuth();
  const navigate = useNavigate();
  
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const crew = useCrewScheduling(selectedDate);
  const { projects, crewMembers, assignments } = crew;
  const loadAssignments = () => { void crew.invalidate(); };
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
    
    if (!loading && user && userProfile && !userProfile.company_id && userProfile.role !== 'root_admin') {
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
  }, [user, userProfile, loading, navigate]);

  const handleCreateAssignment = async () => {
    if (!newAssignment.project_id || !newAssignment.crew_member_id) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please select both a project and crew member."
      });
      return;
    }

    // The conflict check reads the day's assignments; before they load, or
    // after that read failed, it would pass everything.
    if (crew.assignmentsLoading || crew.error) {
      toast({
        variant: "destructive",
        title: "Cannot check for conflicts",
        description: "The day's assignments have not loaded, so a double booking cannot be ruled out."
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
      await crew.create(newAssignment);

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

    } catch (error: unknown) {
      console.error('Error creating assignment:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create crew assignment"
      });
    }
  };

  const handleUpdateAssignmentStatus = async (assignmentId: string, newStatus: string) => {
    try {
      await crew.setStatus(assignmentId, newStatus);

      toast({
        title: "Success",
        description: `Assignment status updated to ${newStatus}`
      });
    } catch (error: unknown) {
      console.error('Error updating assignment:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update assignment status"
      });
    }
  };

  const handleDeleteAssignment = async (assignmentId: string) => {
    if (!(await confirmAction({ title: 'Delete this crew assignment?', destructive: true }))) return;
    try {
      await crew.remove(assignmentId);

      toast({
        title: "Success",
        description: "Assignment deleted successfully"
      });
    } catch (error: unknown) {
      console.error('Error deleting assignment:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete assignment"
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

  if (loading || crew.isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-24 rounded-lg" />)}
          </div>
          <Skeleton className="h-[300px] rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <RoleGuard allowedRoles={ROLE_GROUPS.TEAM_MANAGERS}>
      <AccessiblePageWrapper pageTitle="Crew Scheduling & Dispatch">
      <DashboardLayout hasAccessibleWrapper
        title="Crew Scheduling & Dispatch" showTrialBanner={false}
        description="Manage crew assignments and dispatch"
        headerActions={
          <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0" role="search" aria-label="Date filter">
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-32 sm:w-40 text-xs sm:text-sm"
              aria-label="Select date for crew assignments"
            />
            <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="text-xs sm:text-sm px-2 sm:px-3">
                  <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" aria-hidden="true" />
                  <span className="hidden sm:inline">Assign Crew</span>
                  <span className="sm:hidden">Assign</span>
                </Button>
              </DialogTrigger>
                <DialogContent aria-describedby="crew-assignment-description">
                  <DialogHeader>
                    <DialogTitle>Create Crew Assignment</DialogTitle>
                    <DialogDescription id="crew-assignment-description">
                      Assign crew members to projects for specific dates and times.
                    </DialogDescription>
                  </DialogHeader>
                  <AccessibleForm
                    onSubmit={() => { handleCreateAssignment(); }}
                    ariaLabel="Create crew assignment form"
                    className="space-y-4"
                  >
                    <div>
                      <Label htmlFor="project">Project *</Label>
                      <Select value={newAssignment.project_id} onValueChange={(value) => setNewAssignment({...newAssignment, project_id: value})} aria-required="true">
                        <SelectTrigger aria-label="Select project">
                          <SelectValue placeholder="Select project" />
                        </SelectTrigger>
                        <SelectContent>
                          {projects.map((project: CrewProject) => (
                            <SelectItem key={project.id} value={project.id}>
                              {project.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="crew_member">Crew Member *</Label>
                      <Select value={newAssignment.crew_member_id} onValueChange={(value) => setNewAssignment({...newAssignment, crew_member_id: value})} aria-required="true">
                        <SelectTrigger aria-label="Select crew member">
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
                      <AccessibleFormField
                        name="date"
                        label="Date"
                        type="date"
                        value={newAssignment.date}
                        onChange={(e) => setNewAssignment({...newAssignment, date: e.target.value})}
                      />
                      <AccessibleFormField
                        name="start_time"
                        label="Start Time"
                        type="time"
                        value={newAssignment.start_time}
                        onChange={(e) => setNewAssignment({...newAssignment, start_time: e.target.value})}
                      />
                      <AccessibleFormField
                        name="end_time"
                        label="End Time"
                        type="time"
                        value={newAssignment.end_time}
                        onChange={(e) => setNewAssignment({...newAssignment, end_time: e.target.value})}
                      />
                    </div>

                    <AccessibleFormField
                      name="location"
                      label="Location"
                      placeholder="Work site location"
                      value={newAssignment.location}
                      onChange={(e) => setNewAssignment({...newAssignment, location: e.target.value})}
                    />

                    <AccessibleFormField
                      name="notes"
                      label="Notes"
                      placeholder="Special instructions or notes"
                      value={newAssignment.notes}
                      onChange={(e) => setNewAssignment({...newAssignment, notes: e.target.value})}
                    />

                    <div className="flex justify-end space-x-2">
                      <Button type="button" variant="outline" onClick={() => setIsAssignDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit">
                        Create Assignment
                      </Button>
                    </div>
                  </AccessibleForm>
                </DialogContent>
              </Dialog>
            </div>
        }
      >
        <div className="space-y-6">
        {/* Weekly drag-and-drop board (US-106) */}
        <CrewScheduleBoard />

        {crew.error && (
          <ErrorState
            inline
            title="Crew scheduling could not be loaded"
            error={crew.error}
            onRetry={() => { void crew.refetch(); }}
          />
        )}

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Today's Assignments */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5" aria-hidden="true" />
                  <span>Today's Assignments</span>
                </CardTitle>
                <CardDescription>
                  {new Date(selectedDate).toLocaleDateString()} - {todaysAssignments.length} assignments
                </CardDescription>
              </CardHeader>
              <CardContent>
                {crew.error ? (
                  <p className="text-sm text-muted-foreground py-4">Assignments could not be loaded; see the error above.</p>
                ) : todaysAssignments.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" aria-hidden="true" />
                    <h3 className="text-lg font-medium mb-2">No Assignments</h3>
                    <p className="text-muted-foreground mb-4">No crew assignments for this date</p>
                    <Button onClick={() => setIsAssignDialogOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
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
                                <Clock className="h-3 w-3" aria-hidden="true" />
                                <span>{assignment.start_time} - {assignment.end_time}</span>
                              </div>
                              {assignment.location && (
                                <div className="flex items-center space-x-1">
                                  <MapPin className="h-3 w-3" aria-hidden="true" />
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
                              aria-label={`Delete assignment for ${assignment.crew_member_name}`}
                            >
                              <Trash2 className="h-3 w-3" aria-hidden="true" />
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
                  <Users className="h-5 w-5" aria-hidden="true" />
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
                          <Button variant="outline" size="sm" aria-label={`Call ${member.name}`}>
                            <Phone className="h-3 w-3" aria-hidden="true" />
                          </Button>
                        )}
                        <Badge variant="outline">
                          {assignments.some((a) => a.crew_member_id === member.id && a.status !== 'cancelled')
                            ? 'Assigned'
                            : 'Unassigned'}
                        </Badge>
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
    </AccessiblePageWrapper>
    </RoleGuard>
  );
};

export default CrewScheduling;