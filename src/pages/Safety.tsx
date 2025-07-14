import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  AlertTriangle, 
  Shield, 
  FileText, 
  Calendar, 
  Users, 
  Plus,
  TrendingUp,
  Clock,
  CheckCircle,
  ArrowLeft
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import SafetyIncidentForm from '@/components/safety/SafetyIncidentForm';
import SafetyChecklistBuilder from '@/components/safety/SafetyChecklistBuilder';
import TrainingCertificationManager from '@/components/safety/TrainingCertificationManager';
import OSHAComplianceManager from '@/components/safety/OSHAComplianceManager';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

interface SafetyStats {
  totalIncidents: number;
  openIncidents: number;
  checklistsCompleted: number;
  expiringCertifications: number;
  upcomingDeadlines: number;
}

interface RecentIncident {
  id: string;
  incident_type: string;
  severity: string;
  incident_date: string;
  status: string;
}

interface SafetyChecklist {
  id: string;
  name: string;
  checklist_type: string;
  is_active: boolean;
}

const Safety = () => {
  const [stats, setStats] = useState<SafetyStats>({
    totalIncidents: 0,
    openIncidents: 0,
    checklistsCompleted: 0,
    expiringCertifications: 0,
    upcomingDeadlines: 0
  });
  const [recentIncidents, setRecentIncidents] = useState<RecentIncident[]>([]);
  const [checklists, setChecklists] = useState<SafetyChecklist[]>([]);
  const [loading, setLoading] = useState(true);
  const [showIncidentDialog, setShowIncidentDialog] = useState(false);
  const [showChecklistDialog, setShowChecklistDialog] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const generateOSHA300Log = async () => {
    try {
      // Get user's company
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('company_id')
        .eq('id', user?.id)
        .single();

      if (!profile?.company_id) {
        toast({
          title: "Error",
          description: "Company information not found",
          variant: "destructive"
        });
        return;
      }

      // Get safety incidents for the current year
      const currentYear = new Date().getFullYear();
      const { data: incidents } = await supabase
        .from('safety_incidents')
        .select('*')
        .eq('company_id', profile.company_id)
        .gte('incident_date', `${currentYear}-01-01`)
        .lte('incident_date', `${currentYear}-12-31`)
        .order('incident_date', { ascending: true });

      if (!incidents || incidents.length === 0) {
        toast({
          title: "No Data",
          description: "No incidents found for the current year to generate OSHA 300 log",
          variant: "destructive"
        });
        return;
      }

      // Generate CSV content for OSHA 300 log
      const headers = [
        'Case No.',
        'Employee Name',
        'Job Title',
        'Date of Injury/Illness',
        'Where Event Occurred',
        'Describe Injury/Illness',
        'Death',
        'Days Away From Work',
        'Days of Restricted Work Activity',
        'Job Transfer/Restriction',
        'Other Recordable Cases',
        'Classification'
      ];

      const csvContent = [
        headers.join(','),
        ...incidents.map((incident, index) => [
          index + 1,
          incident.injured_person_name || 'N/A',
          incident.injured_person_job_title || 'N/A',
          incident.incident_date,
          incident.location || 'N/A',
          `"${incident.description.replace(/"/g, '""')}"`,
          incident.severity === 'fatal' ? 'Yes' : 'No',
          incident.days_away_from_work || 0,
          incident.lost_time ? (incident.days_away_from_work || 0) : 0,
          incident.medical_attention_required ? 'Yes' : 'No',
          incident.osha_recordable ? 'Yes' : 'No',
          incident.incident_type || 'Injury'
        ].join(','))
      ].join('\n');

      // Download the CSV file
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `OSHA_300_Log_${currentYear}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: "OSHA 300 Log downloaded successfully",
      });
    } catch (error) {
      console.error('Error generating OSHA 300 log:', error);
      toast({
        title: "Error",
        description: "Failed to generate OSHA 300 log",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    if (user) {
      fetchSafetyStats();
    }
  }, [user]);

  const fetchSafetyStats = async () => {
    try {
      // Get user's company
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('company_id')
        .eq('id', user?.id)
        .single();

      if (!profile?.company_id) return;

      // Fetch safety statistics in parallel
      const [
        incidentsResult,
        checklistsResult,
        certificationsResult,
        deadlinesResult,
        recentIncidentsResult,
        safetyChecklistsResult
      ] = await Promise.all([
        // Total and open incidents
        supabase
          .from('safety_incidents')
          .select('id, status')
          .eq('company_id', profile.company_id),
        
        // Completed checklists this month
        supabase
          .from('safety_checklist_responses')
          .select('id')
          .eq('company_id', profile.company_id)
          .gte('response_date', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]),
        
        // Expiring certifications (next 30 days)
        supabase
          .from('training_certifications')
          .select('id')
          .eq('company_id', profile.company_id)
          .lte('expiration_date', new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
          .eq('status', 'active'),
        
        // Upcoming compliance deadlines (next 30 days)
        supabase
          .from('osha_compliance_deadlines')
          .select('id')
          .eq('company_id', profile.company_id)
          .lte('due_date', new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
          .eq('status', 'pending'),

        // Recent incidents
        supabase
          .from('safety_incidents')
          .select('id, incident_type, severity, incident_date, status')
          .eq('company_id', profile.company_id)
          .order('incident_date', { ascending: false })
          .limit(5),

        // Safety checklists
        supabase
          .from('safety_checklists')
          .select('id, name, checklist_type, is_active')
          .eq('company_id', profile.company_id)
          .eq('is_active', true)
      ]);

      const incidents = incidentsResult.data || [];
      const openIncidents = incidents.filter(i => i.status === 'open').length;

      setStats({
        totalIncidents: incidents.length,
        openIncidents,
        checklistsCompleted: checklistsResult.data?.length || 0,
        expiringCertifications: certificationsResult.data?.length || 0,
        upcomingDeadlines: deadlinesResult.data?.length || 0
      });

      setRecentIncidents(recentIncidentsResult.data || []);
      setChecklists(safetyChecklistsResult.data || []);
    } catch (error) {
      console.error('Error fetching safety stats:', error);
      toast({
        title: "Error",
        description: "Failed to load safety statistics",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout title="Safety & OSHA Compliance">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-muted-foreground mt-2">
              Manage safety incidents, checklists, training, and compliance deadlines
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button variant="outline" onClick={generateOSHA300Log} className="text-xs md:text-sm">
              <FileText className="mr-1 md:mr-2 h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden sm:inline">Generate OSHA 300 Log</span>
              <span className="sm:hidden">OSHA 300</span>
            </Button>
            <Dialog open={showIncidentDialog} onOpenChange={setShowIncidentDialog}>
              <DialogTrigger asChild>
                <Button className="bg-construction-orange hover:bg-construction-orange/90 text-xs md:text-sm">
                  <Plus className="mr-1 md:mr-2 h-3 w-3 md:h-4 md:w-4" />
                  <span className="hidden sm:inline">Report Incident</span>
                  <span className="sm:hidden">Report</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Report Safety Incident</DialogTitle>
                </DialogHeader>
                <SafetyIncidentForm 
                  onSuccess={() => {
                    setShowIncidentDialog(false);
                    fetchSafetyStats();
                  }}
                  onCancel={() => setShowIncidentDialog(false)}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs md:text-sm font-medium">Total Incidents</CardTitle>
              <AlertTriangle className="h-3 w-3 md:h-4 md:w-4 text-construction-orange" />
            </CardHeader>
            <CardContent>
              <div className="text-lg md:text-2xl font-bold">{stats.totalIncidents}</div>
              <p className="text-xs text-muted-foreground">
                {stats.openIncidents} open incidents
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs md:text-sm font-medium">Safety Checklists</CardTitle>
              <CheckCircle className="h-3 w-3 md:h-4 md:w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-lg md:text-2xl font-bold">{stats.checklistsCompleted}</div>
              <p className="text-xs text-muted-foreground">
                Completed this month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs md:text-sm font-medium">Expiring Certifications</CardTitle>
              <Clock className="h-3 w-3 md:h-4 md:w-4 text-construction-orange" />
            </CardHeader>
            <CardContent>
              <div className="text-lg md:text-2xl font-bold">{stats.expiringCertifications}</div>
              <p className="text-xs text-muted-foreground">
                Next 30 days
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs md:text-sm font-medium">Upcoming Deadlines</CardTitle>
              <Calendar className="h-3 w-3 md:h-4 md:w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-lg md:text-2xl font-bold">{stats.upcomingDeadlines}</div>
              <p className="text-xs text-muted-foreground">
                Compliance deadlines
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="incidents" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 gap-1">
            <TabsTrigger value="incidents" className="text-xs md:text-sm px-2 md:px-4">Incidents</TabsTrigger>
            <TabsTrigger value="checklists" className="text-xs md:text-sm px-2 md:px-4">Checklists</TabsTrigger>
            <TabsTrigger value="training" className="text-xs md:text-sm px-2 md:px-4">Training</TabsTrigger>
            <TabsTrigger value="compliance" className="text-xs md:text-sm px-2 md:px-4">Compliance</TabsTrigger>
          </TabsList>

          <TabsContent value="incidents" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Recent Safety Incidents</CardTitle>
                    <CardDescription>
                      Track and manage workplace safety incidents and near misses
                    </CardDescription>
                  </div>
                  <Dialog open={showIncidentDialog} onOpenChange={setShowIncidentDialog}>
                    <DialogTrigger asChild>
                      <Button className="bg-construction-orange hover:bg-construction-orange/90">
                        <Plus className="mr-2 h-4 w-4" />
                        Report Incident
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Report Safety Incident</DialogTitle>
                      </DialogHeader>
                      <SafetyIncidentForm 
                        onSuccess={() => {
                          setShowIncidentDialog(false);
                          fetchSafetyStats();
                        }}
                        onCancel={() => setShowIncidentDialog(false)}
                      />
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {recentIncidents.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="mx-auto h-12 w-12 mb-4 text-green-600" />
                    <p className="text-lg font-medium mb-2">No Recent Incidents</p>
                    <p>Great job maintaining a safe workplace!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recentIncidents.map(incident => (
                      <div key={incident.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <h3 className="font-medium">{incident.incident_type.replace('_', ' ').toUpperCase()}</h3>
                          <p className="text-sm text-muted-foreground">
                            {new Date(incident.incident_date).toLocaleDateString()} • Severity: {incident.severity}
                          </p>
                        </div>
                        <Badge variant={incident.status === 'closed' ? 'default' : 'destructive'}>
                          {incident.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="checklists" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Safety Checklists</CardTitle>
                    <CardDescription>
                      Daily safety checks and inspection forms
                    </CardDescription>
                  </div>
                  <Dialog open={showChecklistDialog} onOpenChange={setShowChecklistDialog}>
                    <DialogTrigger asChild>
                      <Button className="bg-construction-orange hover:bg-construction-orange/90">
                        <Plus className="mr-2 h-4 w-4" />
                        Create Checklist
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Create Safety Checklist</DialogTitle>
                      </DialogHeader>
                      <SafetyChecklistBuilder 
                        onSuccess={() => {
                          setShowChecklistDialog(false);
                          fetchSafetyStats();
                        }}
                        onCancel={() => setShowChecklistDialog(false)}
                      />
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {checklists.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Shield className="mx-auto h-12 w-12 mb-4" />
                    <p className="text-lg font-medium mb-2">No Safety Checklists</p>
                    <p>Create your first safety checklist to get started</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {checklists.map(checklist => (
                      <div key={checklist.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <h3 className="font-medium">{checklist.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            Type: {checklist.checklist_type.replace('_', ' ').toUpperCase()}
                          </p>
                        </div>
                        <Badge variant="default">Active</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="training" className="space-y-6">
            <TrainingCertificationManager />
          </TabsContent>

          <TabsContent value="compliance" className="space-y-6">
            <OSHAComplianceManager />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Safety;