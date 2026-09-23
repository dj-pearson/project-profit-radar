import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { ErrorState } from '@/components/common/ErrorState';
import { useSafetyAutomation, type NewIncident } from '@/hooks/useSafetyAutomation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, Shield, CheckCircle2, FileText, Users, TrendingDown, Award, HardHat } from 'lucide-react';

const BLANK_INCIDENT: NewIncident = {
  employee_name: '',
  job_title: '',
  incident_date: '',
  incident_description: '',
  severity: 'first_aid'
};

export function SafetyAutomation() {
  const [selectedProject, setSelectedProject] = useState<string>('');
  const safety = useSafetyAutomation(selectedProject);
  const projects = safety.overview?.projects ?? [];
  const trainingRecords = safety.overview?.trainingRecords ?? [];
  const expiringTraining = safety.overview?.expiringTraining ?? [];
  const oshaLogs = safety.projectData?.oshaLogs ?? [];
  const inspections = safety.projectData?.inspections ?? [];
  const toolboxTalks = safety.projectData?.toolboxTalks ?? [];
  const stats = safety.overview?.stats ?? {
    total_incidents: 0,
    days_since_incident: null,
    inspections_this_month: 0,
    expiring_certifications: 0
  };

  // OSHA 300 Log
  const [showAddIncident, setShowAddIncident] = useState(false);
  const [newIncident, setNewIncident] = useState<NewIncident>(BLANK_INCIDENT);

  useEffect(() => {
    if (!selectedProject && projects.length > 0) setSelectedProject(projects[0].id);
  }, [projects, selectedProject]);

  const addIncident = async () => {
    try {
      await safety.addIncident(newIncident);
      setNewIncident(BLANK_INCIDENT);
      setShowAddIncident(false);
      toast.success('Incident recorded in the OSHA 300 log');
    } catch (error) {
      toast.error(`Failed to add incident: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'fatality': return 'bg-red-600 text-white';
      case 'lost_time': return 'bg-red-100 text-red-800';
      case 'restricted_work': return 'bg-orange-100 text-orange-800';
      case 'medical_treatment': return 'bg-yellow-100 text-yellow-800';
      case 'first_aid': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pass': return 'text-green-600 bg-green-50';
      case 'fail': return 'text-red-600 bg-red-50';
      case 'conditional': return 'text-yellow-600 bg-yellow-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  if (safety.error) {
    return (
      <div className="container mx-auto p-6">
        <ErrorState
          title="Safety records could not be loaded"
          error={safety.error}
          onRetry={() => { void safety.refetch(); }}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Safety Automation
          </h1>
          <p className="text-muted-foreground mt-1">
            OSHA compliance tracking and automated safety management
          </p>
        </div>
        <Shield className="h-12 w-12 text-orange-600 opacity-50" />
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingDown className="h-4 w-4" />
              Days Since Incident
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {stats.days_since_incident ?? '--'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.total_incidents} total incidents
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Inspections
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {stats.inspections_this_month}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              This month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Compliance Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* This was a hardcoded 95%. Nothing computes a rate from violations yet. */}
            <div className="text-3xl font-bold">--</div>
            <p className="text-xs text-muted-foreground mt-1">
              Not calculated yet
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Award className="h-4 w-4" />
              Training Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${stats.expiring_certifications > 0 ? 'text-orange-600' : 'text-green-600'}`}>
              {stats.expiring_certifications}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Expiring soon
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Documentation
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* This was a hardcoded 100%. Nothing checks documentation yet. */}
            <div className="text-3xl font-bold">--</div>
            <p className="text-xs text-muted-foreground mt-1">
              Not tracked yet
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="osha300" className="space-y-4">
        <TabsList>
          <TabsTrigger value="osha300">OSHA 300 Log</TabsTrigger>
          <TabsTrigger value="inspections">Inspections</TabsTrigger>
          <TabsTrigger value="toolbox">Toolbox Talks</TabsTrigger>
          <TabsTrigger value="training">Training</TabsTrigger>
        </TabsList>

        {/* OSHA 300 Log Tab */}
        <TabsContent value="osha300" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>OSHA 300 Injury & Illness Log</CardTitle>
                  <CardDescription>
                    Track and report workplace injuries and illnesses
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Select value={selectedProject} onValueChange={setSelectedProject}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Select project" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={() => setShowAddIncident(true)}>
                    <AlertTriangle className="mr-2 h-4 w-4" />
                    Report Incident
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {showAddIncident && (
                <div className="mb-6 p-4 border rounded-lg bg-accent space-y-4">
                  <h3 className="font-semibold">Report New Incident</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Employee Name</Label>
                      <Input
                        value={newIncident.employee_name}
                        onChange={(e) => setNewIncident({...newIncident, employee_name: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Job Title</Label>
                      <Input
                        value={newIncident.job_title}
                        onChange={(e) => setNewIncident({...newIncident, job_title: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Incident Date</Label>
                      <Input
                        type="date"
                        value={newIncident.incident_date}
                        onChange={(e) => setNewIncident({...newIncident, incident_date: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Severity</Label>
                      <Select
                        value={newIncident.severity}
                        onValueChange={(value) => setNewIncident({...newIncident, severity: value})}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="first_aid">First Aid</SelectItem>
                          <SelectItem value="medical_treatment">Medical Treatment</SelectItem>
                          <SelectItem value="restricted_work">Restricted Work</SelectItem>
                          <SelectItem value="lost_time">Lost Time</SelectItem>
                          <SelectItem value="fatality">Fatality</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      value={newIncident.incident_description}
                      onChange={(e) => setNewIncident({...newIncident, incident_description: e.target.value})}
                      rows={3}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={addIncident}>Save Incident</Button>
                    <Button variant="outline" onClick={() => setShowAddIncident(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {oshaLogs.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No incidents reported for this project
                  </p>
                ) : (
                  oshaLogs.map((log) => (
                    <div key={log.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold">{log.employee_name}</p>
                          <Badge className={getSeverityColor(log.severity)}>
                            {log.severity.replace('_', ' ')}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{log.incident_description}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(log.incident_date).toLocaleDateString()} • {log.job_title}
                        </p>
                      </div>
                      {log.days_away_from_work > 0 && (
                        <div className="text-right">
                          <p className="text-sm font-semibold">{log.days_away_from_work} days</p>
                          <p className="text-xs text-muted-foreground">Away from work</p>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Inspections Tab */}
        <TabsContent value="inspections" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Safety Inspections</CardTitle>
              <CardDescription>Daily and weekly safety inspection results</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {inspections.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No inspections recorded for this project
                  </p>
                ) : (
                  inspections.map((inspection) => (
                    <div key={inspection.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold capitalize">{inspection.inspection_type} Inspection</p>
                          <Badge className={getStatusColor(inspection.pass_fail_status)}>
                            {inspection.pass_fail_status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {new Date(inspection.inspection_date).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-6 text-sm">
                        <div className="text-right">
                          <p className="font-semibold">{inspection.overall_score}%</p>
                          <p className="text-xs text-muted-foreground">Score</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-orange-600">{inspection.hazards_identified}</p>
                          <p className="text-xs text-muted-foreground">Hazards</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-red-600">{inspection.violations_found}</p>
                          <p className="text-xs text-muted-foreground">Violations</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Toolbox Talks Tab */}
        <TabsContent value="toolbox" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Toolbox Talks</CardTitle>
              <CardDescription>Weekly safety meetings and topics covered</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {toolboxTalks.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No toolbox talks recorded
                  </p>
                ) : (
                  toolboxTalks.map((talk) => (
                    <div key={talk.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <p className="font-semibold">{talk.topic}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(talk.talk_date).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="font-semibold">{talk.attendee_count}</span>
                        <span className="text-sm text-muted-foreground">attendees</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Training Tab */}
        <TabsContent value="training" className="space-y-4">
          {expiringTraining.length > 0 && (
            <Card className="border-orange-200 bg-orange-50">
              <CardHeader>
                <CardTitle className="text-orange-900 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Expiring Certifications
                </CardTitle>
                <CardDescription className="text-orange-700">
                  {expiringTraining.length} certification(s) expiring in the next 30 days
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {expiringTraining.map((training) => (
                    <div key={training.id} className="flex items-center justify-between p-3 bg-white rounded-lg">
                      <div>
                        <p className="font-semibold">{training.training_name}</p>
                        <p className="text-sm text-muted-foreground">
                          Expires: {new Date(training.expiry_date).toLocaleDateString()}
                        </p>
                      </div>
                      <Button size="sm" variant="outline">
                        Schedule Renewal
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Training Records</CardTitle>
              <CardDescription>Employee safety training and certifications</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {trainingRecords.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No training records found
                  </p>
                ) : (
                  trainingRecords.map((training) => (
                    <div key={training.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <HardHat className="h-4 w-4 text-muted-foreground" />
                          <p className="font-semibold">{training.training_name}</p>
                          <Badge variant="outline" className="capitalize">
                            {training.training_type.replace('_', ' ')}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Completed: {new Date(training.training_date).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge className={training.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                          {training.status}
                        </Badge>
                        {training.expiry_date && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Expires: {new Date(training.expiry_date).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default SafetyAutomation;
