import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Shield, AlertTriangle, CheckCircle, FileText, Users, Download, Upload, Clock } from 'lucide-react';

interface SafetyInspection {
  id: string;
  project_id: string;
  inspector_name: string;
  inspection_date: string;
  inspection_type: string;
  status: 'passed' | 'failed' | 'pending';
  findings: string[];
  corrective_actions: string[];
  photos: string[];
}

interface SafetyTraining {
  id: string;
  employee_name: string;
  training_type: string;
  completion_date: string;
  expiry_date: string;
  certificate_url?: string;
  status: 'current' | 'expired' | 'pending';
}

interface IncidentReport {
  id: string;
  project_id: string;
  incident_date: string;
  incident_type: string;
  description: string;
  injured_person?: string;
  severity: 'minor' | 'major' | 'critical';
  status: 'reported' | 'investigating' | 'closed';
  photos: string[];
}

export const OSHACompliance = () => {
  const { userProfile } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [inspections, setInspections] = useState<SafetyInspection[]>([]);
  const [trainings, setTrainings] = useState<SafetyTraining[]>([]);
  const [incidents, setIncidents] = useState<IncidentReport[]>([]);
  const [loadErrors, setLoadErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadComplianceData();
  }, [userProfile?.company_id]);

  const loadComplianceData = async () => {
    if (!userProfile?.company_id) return;
    
    try {
      setLoading(true);

      setLoadErrors([]);

      const { data: inspectionsData, error: inspectionsError } = await supabase
        .from('safety_inspections' as any)
        .select('*')
        .eq('company_id', userProfile.company_id)
        .order('inspection_date', { ascending: false });

      const { data: trainingsData, error: trainingsError } = await supabase
        .from('safety_trainings' as any)
        .select('*')
        .eq('company_id', userProfile.company_id)
        .order('completion_date', { ascending: false });

      const { data: incidentsData, error: incidentsError } = await supabase
        .from('incident_reports' as any)
        .select('*')
        .eq('company_id', userProfile.company_id)
        .order('incident_date', { ascending: false });

      // These errors were dropped, and supabase-js returns them rather than
      // throwing, so the catch below never saw them either. An OSHA screen that
      // shows zero incidents because the query failed reads as a clean safety
      // record. safety_trainings and incident_reports are not created by any
      // migration (US-311), so this is the expected outcome wherever they were
      // never made by hand.
      const failures: string[] = [];
      if (inspectionsError) failures.push(`Inspections: ${inspectionsError.message}`);
      if (trainingsError) failures.push(`Training records: ${trainingsError.message}`);
      if (incidentsError) failures.push(`Incident reports: ${incidentsError.message}`);
      if (failures.length > 0) {
        console.error('Error loading compliance data:', failures.join('; '));
      }
      setLoadErrors(failures);

      setInspections(((inspectionsData as unknown) as SafetyInspection[]) || []);
      setTrainings(((trainingsData as unknown) as SafetyTraining[]) || []);
      setIncidents(((incidentsData as unknown) as IncidentReport[]) || []);
    } catch (error) {
      console.error('Error loading compliance data:', error);
      setLoadErrors([error instanceof Error ? error.message : 'Could not load compliance data.']);
      setInspections([]);
      setTrainings([]);
      setIncidents([]);
    } finally {
      setLoading(false);
    }
  };

  const ComplianceDashboard = () => {
    const upcomingExpirations = trainings.filter(training => {
      const expiryDate = new Date(training.expiry_date);
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      return expiryDate <= thirtyDaysFromNow;
    });

    return (
      <div className="space-y-6">
        {loadErrors.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <p className="font-medium">
                Compliance data is incomplete. The counts below are not a safety record.
              </p>
              <ul className="mt-2 list-disc pl-5 text-sm">
                {loadErrors.map((message) => (
                  <li key={message}>{message}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Shield className="h-8 w-8 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{inspections.filter(i => i.status === 'passed').length}</p>
                  <p className="text-sm text-muted-foreground">Passed Inspections</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Users className="h-8 w-8 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{trainings.filter(t => t.status === 'current').length}</p>
                  <p className="text-sm text-muted-foreground">Current Certifications</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-8 w-8 text-yellow-500" />
                <div>
                  <p className="text-2xl font-bold">{incidents.length}</p>
                  <p className="text-sm text-muted-foreground">Open Incidents</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Clock className="h-8 w-8 text-red-500" />
                <div>
                  <p className="text-2xl font-bold">{upcomingExpirations.length}</p>
                  <p className="text-sm text-muted-foreground">Expiring Soon</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {upcomingExpirations.length > 0 && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              You have {upcomingExpirations.length} training certifications expiring within 30 days.
            </AlertDescription>
          </Alert>
        )}
      </div>
    );
  };

  const SafetyInspections = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Safety Inspections</h3>
        <Button>
          <FileText className="h-4 w-4 mr-2" />
          New Inspection
        </Button>
      </div>

      <div className="space-y-4">
        {inspections.map((inspection) => (
          <Card key={inspection.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">{inspection.inspection_type}</h4>
                  <p className="text-sm text-muted-foreground">
                    Inspector: {inspection.inspector_name} | Date: {new Date(inspection.inspection_date).toLocaleDateString()}
                  </p>
                </div>
                <Badge variant={inspection.status === 'passed' ? 'default' : 'destructive'}>
                  {inspection.status}
                </Badge>
              </div>
              {inspection.findings.length > 0 && (
                <div className="mt-2">
                  <p className="text-sm font-medium">Findings:</p>
                  <ul className="text-sm text-muted-foreground">
                    {inspection.findings.map((finding, index) => (
                      <li key={index}>• {finding}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const TrainingRecords = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Training Records</h3>
        <Button>
          <Upload className="h-4 w-4 mr-2" />
          Add Training
        </Button>
      </div>

      <div className="space-y-4">
        {trainings.map((training) => (
          <Card key={training.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">{training.employee_name}</h4>
                  <p className="text-sm">{training.training_type}</p>
                  <p className="text-sm text-muted-foreground">
                    Completed: {new Date(training.completion_date).toLocaleDateString()} | 
                    Expires: {new Date(training.expiry_date).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant={training.status === 'current' ? 'default' : 'destructive'}>
                    {training.status}
                  </Badge>
                  {training.certificate_url && (
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Certificate
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const IncidentReporting = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Incident Reports</h3>
        <Button>
          <AlertTriangle className="h-4 w-4 mr-2" />
          Report Incident
        </Button>
      </div>

      {incidents.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Incidents Reported</h3>
            <p className="text-muted-foreground">
              Great job maintaining a safe workplace! No incidents have been reported.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {incidents.map((incident) => (
            <Card key={incident.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">{incident.incident_type}</h4>
                    <p className="text-sm text-muted-foreground">
                      Date: {new Date(incident.incident_date).toLocaleDateString()}
                    </p>
                    <p className="text-sm mt-1">{incident.description}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={incident.severity === 'critical' ? 'destructive' : 'secondary'}>
                      {incident.severity}
                    </Badge>
                    <Badge variant="outline">
                      {incident.status}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>OSHA Compliance Center</span>
          </CardTitle>
          <CardDescription>
            Manage safety inspections, training records, and incident reporting
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="inspections">Inspections</TabsTrigger>
          <TabsTrigger value="training">Training</TabsTrigger>
          <TabsTrigger value="incidents">Incidents</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <ComplianceDashboard />
        </TabsContent>

        <TabsContent value="inspections">
          <SafetyInspections />
        </TabsContent>

        <TabsContent value="training">
          <TrainingRecords />
        </TabsContent>

        <TabsContent value="incidents">
          <IncidentReporting />
        </TabsContent>
      </Tabs>
    </div>
  );
};