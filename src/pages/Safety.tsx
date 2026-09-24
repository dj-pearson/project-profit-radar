import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AccessiblePageWrapper } from "@/components/accessibility/AccessiblePageWrapper";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertTriangle, Shield, FileText, Calendar, Plus, Clock, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useSafetyOverview, fetchOsha300Incidents } from '@/hooks/useSafetyPage';
import { ErrorState } from '@/components/common/ErrorState';
import SafetyIncidentForm from '@/components/safety/SafetyIncidentForm';
import { SafetyIncidentsPanel } from '@/components/safety/SafetyIncidentsPanel';
import SafetyChecklistBuilder from '@/components/safety/SafetyChecklistBuilder';
import TrainingCertificationManager from '@/components/safety/TrainingCertificationManager';
import OSHAComplianceManager from '@/components/safety/OSHAComplianceManager';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

const Safety = () => {
  const overview = useSafetyOverview();
  const { stats, checklists } = overview;
  const [showIncidentDialog, setShowIncidentDialog] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  // A quick action that navigates has to land on the thing it promised. The
  // mobile quick-actions sheet and the dashboard cards link here with ?new=incident
  // rather than dropping the user on a list to hunt for the button. The param
  // is consumed on arrival so a reload or a back-navigation does not reopen it.
  useEffect(() => {
    if (searchParams.get('new') !== 'incident') return;
    setShowIncidentDialog(true);
    const next = new URLSearchParams(searchParams);
    next.delete('new');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);
  const [showChecklistDialog, setShowChecklistDialog] = useState(false);
  const { toast } = useToast();

  const generateOSHA300Log = async () => {
    try {
      if (!overview.companyId) {
        toast({
          title: "Error",
          description: "Your account is not linked to a company",
          variant: "destructive"
        });
        return;
      }

      // Get safety incidents for the current year
      const currentYear = new Date().getFullYear();
      const incidents = await fetchOsha300Incidents(overview.companyId, currentYear);

      if (incidents.length === 0) {
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
        description: error instanceof Error ? error.message : "Failed to generate OSHA 300 log",
        variant: "destructive"
      });
    }
  };

  if (overview.isLoading) {
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
    <AccessiblePageWrapper pageTitle="Safety">
    <DashboardLayout title="Safety & OSHA Compliance" hasAccessibleWrapper>
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
              <FileText className="mr-1 md:mr-2 h-3 w-3 md:h-4 md:w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Generate OSHA 300 Log</span>
              <span className="sm:hidden">OSHA 300</span>
            </Button>
            <Dialog open={showIncidentDialog} onOpenChange={setShowIncidentDialog}>
              <DialogTrigger asChild>
                <Button className="bg-construction-orange hover:bg-construction-orange/90 text-xs md:text-sm">
                  <Plus className="mr-1 md:mr-2 h-3 w-3 md:h-4 md:w-4" aria-hidden="true" />
                  <span className="hidden sm:inline">Report Incident</span>
                  <span className="sm:hidden">Report</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" aria-describedby="incident-dialog-description">
                <DialogHeader>
                  <DialogTitle>Report Safety Incident</DialogTitle>
                  <p id="incident-dialog-description" className="sr-only">Report a workplace safety incident for documentation and investigation</p>
                </DialogHeader>
                <SafetyIncidentForm 
                  onSuccess={() => {
                    setShowIncidentDialog(false);
                    void overview.invalidate();
                  }}
                  onCancel={() => setShowIncidentDialog(false)}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {overview.error && (
          <ErrorState
            inline
            title="Safety figures could not be loaded"
            error={overview.error}
            onRetry={() => { void overview.refetch(); }}
          />
        )}

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs md:text-sm font-medium">Total Incidents</CardTitle>
              <AlertTriangle className="h-3 w-3 md:h-4 md:w-4 text-construction-orange" aria-hidden="true" />
            </CardHeader>
            <CardContent>
              <div className="text-lg md:text-2xl font-bold">{stats ? stats.totalIncidents : '--'}</div>
              <p className="text-xs text-muted-foreground">
                {stats ? stats.openIncidents : '--'} open incidents
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs md:text-sm font-medium">Safety Checklists</CardTitle>
              <CheckCircle className="h-3 w-3 md:h-4 md:w-4 text-green-600" aria-hidden="true" />
            </CardHeader>
            <CardContent>
              <div className="text-lg md:text-2xl font-bold">{stats ? stats.checklistsCompleted : '--'}</div>
              <p className="text-xs text-muted-foreground">
                Completed this month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs md:text-sm font-medium">Expiring Certifications</CardTitle>
              <Clock className="h-3 w-3 md:h-4 md:w-4 text-construction-orange" aria-hidden="true" />
            </CardHeader>
            <CardContent>
              <div className="text-lg md:text-2xl font-bold">{stats ? stats.expiringCertifications : '--'}</div>
              <p className="text-xs text-muted-foreground">
                Next 30 days
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs md:text-sm font-medium">Upcoming Deadlines</CardTitle>
              <Calendar className="h-3 w-3 md:h-4 md:w-4 text-red-600" aria-hidden="true" />
            </CardHeader>
            <CardContent>
              <div className="text-lg md:text-2xl font-bold">{stats ? stats.upcomingDeadlines : '--'}</div>
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
                        <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
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
                          void overview.invalidate();
                        }}
                        onCancel={() => setShowIncidentDialog(false)}
                      />
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <SafetyIncidentsPanel />
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
                        <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
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
                          void overview.invalidate();
                        }}
                        onCancel={() => setShowChecklistDialog(false)}
                      />
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {overview.error ? (
                  <p className="text-sm text-muted-foreground py-4">Checklists could not be loaded; see the error above.</p>
                ) : checklists.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Shield className="mx-auto h-12 w-12 mb-4" aria-hidden="true" />
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
    </AccessiblePageWrapper>
  );
};

export default Safety;