import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import {
  CalendarIcon,
  Users,
  Briefcase,
  Zap,
  CheckCircle2,
  Clock,
  TrendingUp,
  MapPin,
  Target,
  Settings
} from 'lucide-react';
import { format } from 'date-fns';

interface AutoSchedule {
  id: string;
  schedule_name: string;
  schedule_date: string;
  optimization_score: number;
  computation_time_ms: number;
  status: 'draft' | 'published' | 'active' | 'completed';
  minimize_travel: boolean;
  balance_workload: boolean;
  respect_skills: boolean;
  iterations_count: number;
  created_at: string;
}

interface Assignment {
  user_id: string;
  project_id: string;
  date: string;
}

interface Project {
  id: string;
  name: string;
  status: string;
}

interface CrewMember {
  id: string;
  first_name: string;
  last_name: string;
  role: string;
}

export function AutoScheduling() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Form state
  const [scheduleName, setScheduleName] = useState('');
  const [scheduleDate, setScheduleDate] = useState<Date>();
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [minimizeTravel, setMinimizeTravel] = useState(true);
  const [balanceWorkload, setBalanceWorkload] = useState(true);
  const [respectSkills, setRespectSkills] = useState(true);
  const [iterations, setIterations] = useState(100);

  // Data state
  const [projects, setProjects] = useState<Project[]>([]);
  const [crewMembers, setCrewMembers] = useState<CrewMember[]>([]);
  const [schedules, setSchedules] = useState<AutoSchedule[]>([]);
  const [currentSchedule, setCurrentSchedule] = useState<AutoSchedule | null>(null);
  const [currentAssignments, setCurrentAssignments] = useState<Assignment[]>([]);

  useEffect(() => {
    loadProjects();
    loadCrewMembers();
    loadSchedules();
  }, [user]);

  const loadProjects = async () => {
    try {
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('tenant_id')
        .eq('id', user?.id)
        .single();

      if (!userProfile?.tenant_id) return;

      const { data, error } = await supabase
        .from('projects')
        .select('id, name, status')
        .eq('tenant_id', userProfile.tenant_id)
        .in('status', ['planning', 'active', 'on_hold'])
        .order('name');

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };

  const loadCrewMembers = async () => {
    try {
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('tenant_id')
        .eq('id', user?.id)
        .single();

      if (!userProfile?.tenant_id) return;

      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, first_name, last_name, role')
        .eq('tenant_id', userProfile.tenant_id)
        .in('role', ['field_supervisor', 'crew_member'])
        .order('first_name');

      if (error) throw error;
      setCrewMembers(data || []);
    } catch (error) {
      console.error('Error loading crew members:', error);
    }
  };

  const loadSchedules = async () => {
    try {
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('tenant_id')
        .eq('id', user?.id)
        .single();

      if (!userProfile?.tenant_id) return;

      const { data, error } = await supabase
        .from('auto_schedules')
        .select('*')
        .eq('tenant_id', userProfile.tenant_id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setSchedules(data || []);
    } catch (error) {
      console.error('Error loading schedules:', error);
    }
  };

  const toggleProject = (projectId: string) => {
    setSelectedProjects(prev =>
      prev.includes(projectId)
        ? prev.filter(id => id !== projectId)
        : [...prev, projectId]
    );
  };

  const generateSchedule = async () => {
    if (!scheduleName || !scheduleDate || selectedProjects.length === 0) {
      alert('Please fill in all required fields');
      return;
    }

    setGenerating(true);
    try {
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('tenant_id')
        .eq('id', user?.id)
        .single();

      if (!userProfile?.tenant_id) return;

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const response = await fetch(
        `${supabase.supabaseUrl}/functions/v1/auto-scheduling`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            tenant_id: userProfile.tenant_id,
            schedule_name: scheduleName,
            schedule_date: format(scheduleDate, 'yyyy-MM-dd'),
            project_ids: selectedProjects,
            user_id: user?.id,
            minimize_travel: minimizeTravel,
            balance_workload: balanceWorkload,
            respect_skills: respectSkills,
            iterations
          })
        }
      );

      if (!response.ok) {
        throw new Error('Failed to generate schedule');
      }

      const result = await response.json();

      setCurrentSchedule(result.schedule);
      setCurrentAssignments(result.assignments);

      // Reload schedules list
      await loadSchedules();

      // Reset form
      setScheduleName('');
      setScheduleDate(undefined);
      setSelectedProjects([]);

    } catch (error) {
      console.error('Error generating schedule:', error);
      alert('Failed to generate schedule. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const publishSchedule = async (scheduleId: string) => {
    try {
      const { error } = await supabase
        .from('auto_schedules')
        .update({
          status: 'published',
          published_at: new Date().toISOString()
        })
        .eq('id', scheduleId);

      if (error) throw error;

      // Reload schedules
      await loadSchedules();

      if (currentSchedule?.id === scheduleId) {
        setCurrentSchedule({ ...currentSchedule, status: 'published' });
      }
    } catch (error) {
      console.error('Error publishing schedule:', error);
      alert('Failed to publish schedule');
    }
  };

  const getProjectName = (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    return project?.name || 'Unknown Project';
  };

  const getCrewName = (userId: string) => {
    const member = crewMembers.find(c => c.id === userId);
    return member ? `${member.first_name} ${member.last_name}` : 'Unknown';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'bg-green-100 text-green-800';
      case 'active': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
            Auto-Scheduling
          </h1>
          <p className="text-muted-foreground mt-1">
            AI-powered crew scheduling with intelligent optimization
          </p>
        </div>
        <Zap className="h-12 w-12 text-blue-600 opacity-50" />
      </div>

      <Tabs defaultValue="generate" className="space-y-4">
        <TabsList>
          <TabsTrigger value="generate">Generate Schedule</TabsTrigger>
          <TabsTrigger value="current">Current Schedule</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        {/* Generate Tab */}
        <TabsContent value="generate" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Schedule Configuration
                </CardTitle>
                <CardDescription>
                  Configure scheduling parameters and optimization goals
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="schedule-name">Schedule Name</Label>
                  <Input
                    id="schedule-name"
                    placeholder="e.g., Week of Jan 15-21"
                    value={scheduleName}
                    onChange={(e) => setScheduleName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Schedule Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {scheduleDate ? format(scheduleDate, 'PPP') : 'Pick a date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={scheduleDate}
                        onSelect={setScheduleDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-3 pt-2 border-t">
                  <p className="text-sm font-medium">Optimization Goals</p>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="minimize-travel" className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Minimize Travel Distance
                    </Label>
                    <Switch
                      id="minimize-travel"
                      checked={minimizeTravel}
                      onCheckedChange={setMinimizeTravel}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="balance-workload" className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Balance Workload
                    </Label>
                    <Switch
                      id="balance-workload"
                      checked={balanceWorkload}
                      onCheckedChange={setBalanceWorkload}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="respect-skills" className="flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      Match Skills to Projects
                    </Label>
                    <Switch
                      id="respect-skills"
                      checked={respectSkills}
                      onCheckedChange={setRespectSkills}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="iterations">
                    Algorithm Iterations: {iterations}
                  </Label>
                  <input
                    type="range"
                    id="iterations"
                    min="50"
                    max="500"
                    step="50"
                    value={iterations}
                    onChange={(e) => setIterations(parseInt(e.target.value))}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    More iterations = better optimization (but slower)
                  </p>
                </div>

                <Button
                  onClick={generateSchedule}
                  disabled={generating || !scheduleName || !scheduleDate || selectedProjects.length === 0}
                  className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
                >
                  {generating ? (
                    <>
                      <Zap className="mr-2 h-4 w-4 animate-pulse" />
                      Generating Schedule...
                    </>
                  ) : (
                    <>
                      <Zap className="mr-2 h-4 w-4" />
                      Generate Optimal Schedule
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Project Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5" />
                  Select Projects
                </CardTitle>
                <CardDescription>
                  {selectedProjects.length} of {projects.length} projects selected
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {projects.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No active projects available
                    </p>
                  ) : (
                    projects.map((project) => (
                      <div
                        key={project.id}
                        className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-accent cursor-pointer"
                        onClick={() => toggleProject(project.id)}
                      >
                        <Checkbox
                          checked={selectedProjects.includes(project.id)}
                          onCheckedChange={() => toggleProject(project.id)}
                        />
                        <div className="flex-1">
                          <p className="font-medium">{project.name}</p>
                          <p className="text-sm text-muted-foreground capitalize">
                            {project.status}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Current Schedule Tab */}
        <TabsContent value="current" className="space-y-4">
          {!currentSchedule ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <div className="text-center space-y-4">
                  <CalendarIcon className="h-12 w-12 text-muted-foreground mx-auto" />
                  <div>
                    <p className="text-lg font-semibold">No Schedule Generated</p>
                    <p className="text-muted-foreground">
                      Generate a new schedule to view assignments
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Schedule Overview */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{currentSchedule.schedule_name}</span>
                    <div className="flex gap-2">
                      <Badge className={getStatusColor(currentSchedule.status)}>
                        {currentSchedule.status}
                      </Badge>
                      {currentSchedule.status === 'draft' && (
                        <Button
                          size="sm"
                          onClick={() => publishSchedule(currentSchedule.id)}
                        >
                          Publish Schedule
                        </Button>
                      )}
                    </div>
                  </CardTitle>
                  <CardDescription>
                    Generated on {new Date(currentSchedule.created_at).toLocaleString()}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Optimization Score</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-2xl font-bold">
                          {currentSchedule.optimization_score.toFixed(0)}%
                        </span>
                        <Progress value={currentSchedule.optimization_score} className="flex-1" />
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Computation Time</p>
                      <p className="text-2xl font-bold">
                        {(currentSchedule.computation_time_ms / 1000).toFixed(2)}s
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Iterations</p>
                      <p className="text-2xl font-bold">{currentSchedule.iterations_count}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Assignments</p>
                      <p className="text-2xl font-bold">{currentAssignments.length}</p>
                    </div>
                  </div>

                  <div className="flex gap-4 text-sm">
                    {currentSchedule.minimize_travel && (
                      <Badge variant="outline" className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        Travel Optimized
                      </Badge>
                    )}
                    {currentSchedule.balance_workload && (
                      <Badge variant="outline" className="flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        Workload Balanced
                      </Badge>
                    )}
                    {currentSchedule.respect_skills && (
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Target className="h-3 w-3" />
                        Skills Matched
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Assignments by Project */}
              <Card>
                <CardHeader>
                  <CardTitle>Crew Assignments</CardTitle>
                  <CardDescription>
                    Optimal crew assignments for selected projects
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {currentAssignments.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No assignments generated
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {selectedProjects.map((projectId) => {
                        const projectAssignments = currentAssignments.filter(
                          a => a.project_id === projectId
                        );

                        return (
                          <div key={projectId} className="border rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                              <h3 className="font-semibold">{getProjectName(projectId)}</h3>
                              <Badge variant="outline">
                                {projectAssignments.length} crew members
                              </Badge>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              {projectAssignments.map((assignment, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-center gap-2 p-2 bg-accent rounded"
                                >
                                  <Users className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-sm">{getCrewName(assignment.user_id)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Schedule History</CardTitle>
              <CardDescription>Previous schedules and their performance</CardDescription>
            </CardHeader>
            <CardContent>
              {schedules.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No schedules generated yet
                </p>
              ) : (
                <div className="space-y-3">
                  {schedules.map((schedule) => (
                    <div
                      key={schedule.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent cursor-pointer"
                      onClick={() => {
                        setCurrentSchedule(schedule);
                        setCurrentAssignments([]);
                      }}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold">{schedule.schedule_name}</p>
                          <Badge className={getStatusColor(schedule.status)}>
                            {schedule.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {new Date(schedule.schedule_date).toLocaleDateString()} •{' '}
                          {schedule.optimization_score.toFixed(0)}% optimized
                        </p>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <div className="text-right">
                          <p className="text-muted-foreground">Computed in</p>
                          <p className="font-semibold">
                            {(schedule.computation_time_ms / 1000).toFixed(2)}s
                          </p>
                        </div>
                        {schedule.status === 'published' && (
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
