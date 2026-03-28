import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AccessiblePageWrapper } from "@/components/accessibility/AccessiblePageWrapper";
import { AccessibleTable, type TableColumn } from "@/components/accessibility/AccessibleTable";
import { AccessibleModal } from "@/components/accessibility/AccessibleModal";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  ArrowLeft,
  ShieldAlert
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import SafetyIncidentForm from '@/components/safety/SafetyIncidentForm';
import SafetyChecklistBuilder from '@/components/safety/SafetyChecklistBuilder';
import TrainingCertificationManager from '@/components/safety/TrainingCertificationManager';
import OSHAComplianceManager from '@/components/safety/OSHAComplianceManager';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { NoSafetyIncidents } from '@/components/ui/EmptyStates';
import { format, subMonths, differenceInDays } from 'date-fns';

interface SafetyStats {
  totalIncidents: number;
  openIncidents: number;
  checklistsCompleted: number;
  expiringCertifications: number;
  upcomingDeadlines: number;
  minorCount: number;
  majorCount: number;
  criticalCount: number;
  daysSinceLastIncident: number | null;
}

interface FullIncident {
  id: string;
  incident_type: string;
  severity: string;
  incident_date: string;
  incident_time: string | null;
  status: string;
  description: string;
  location: string | null;
  project_id: string | null;
  corrective_actions: string | null;
  root_cause_analysis: string | null;
  injured_person_name: string | null;
  injured_person_job_title: string | null;
  body_part_affected: string | null;
  immediate_actions: string | null;
  medical_attention_required: boolean | null;
  lost_time: boolean | null;
  days_away_from_work: number | null;
  osha_recordable: boolean | null;
  witnesses: string[] | null;
  project?: { id: string; name: string } | null;
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

interface MonthlyTrendData {
  month: string;
  incidents: number;
}

const Safety = () => {
  const [stats, setStats] = useState<SafetyStats>({
    totalIncidents: 0,
    openIncidents: 0,
    checklistsCompleted: 0,
    expiringCertifications: 0,
    upcomingDeadlines: 0,
    minorCount: 0,
    majorCount: 0,
    criticalCount: 0,
    daysSinceLastIncident: null,
  });
  const [recentIncidents, setRecentIncidents] = useState<RecentIncident[]>([]);
  const [allIncidents, setAllIncidents] = useState<FullIncident[]>([]);
  const [checklists, setChecklists] = useState<SafetyChecklist[]>([]);
  const [monthlyTrend, setMonthlyTrend] = useState<MonthlyTrendData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showIncidentDialog, setShowIncidentDialog] = useState(false);
  const [showChecklistDialog, setShowChecklistDialog] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<FullIncident | null>(null);
  const [incidentDetailOpen, setIncidentDetailOpen] = useState(false);
  const [savingIncident, setSavingIncident] = useState(false);

  // Filters for the incidents table
  const [severityFilter, setSeverityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Editable fields in incident detail
  const [editInvestigationNotes, setEditInvestigationNotes] = useState('');
  const [editCorrectiveActions, setEditCorrectiveActions] = useState('');
  const [editStatus, setEditStatus] = useState('');

  const { user, userProfile } = useAuth();
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
      const minorCount = incidents.filter(i => i.severity === 'minor').length;
      const majorCount = incidents.filter(i => i.severity === 'major').length;
      const criticalCount = incidents.filter(i => i.severity === 'critical').length;

      // Calculate days since last incident
      let daysSinceLastIncident: number | null = null;
      if (recentIncidentsResult.data && recentIncidentsResult.data.length > 0) {
        const lastDate = new Date(recentIncidentsResult.data[0].incident_date);
        daysSinceLastIncident = differenceInDays(new Date(), lastDate);
      }

      setStats({
        totalIncidents: incidents.length,
        openIncidents,
        checklistsCompleted: checklistsResult.data?.length || 0,
        expiringCertifications: certificationsResult.data?.length || 0,
        upcomingDeadlines: deadlinesResult.data?.length || 0,
        minorCount,
        majorCount,
        criticalCount,
        daysSinceLastIncident,
      });

      setRecentIncidents(recentIncidentsResult.data || []);
      setChecklists(safetyChecklistsResult.data || []);

      // Fetch all incidents with project info for table
      const { data: fullIncidents } = await supabase
        .from('safety_incidents')
        .select('*, project:projects(id, name)')
        .eq('company_id', profile.company_id)
        .order('incident_date', { ascending: false });

      setAllIncidents((fullIncidents as FullIncident[]) || []);

      // Calculate monthly trend (last 6 months)
      const now = new Date();
      const trendData: MonthlyTrendData[] = [];
      for (let i = 5; i >= 0; i--) {
        const monthStart = subMonths(now, i);
        const monthLabel = format(monthStart, 'MMM yyyy');
        const monthKey = format(monthStart, 'yyyy-MM');
        const count = (fullIncidents || []).filter((inc: FullIncident) =>
          inc.incident_date.startsWith(monthKey)
        ).length;
        trendData.push({ month: monthLabel, incidents: count });
      }
      setMonthlyTrend(trendData);
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

  // Filtered incidents for the table
  const filteredIncidents = useMemo(() => {
    let filtered = allIncidents;
    if (severityFilter !== 'all') {
      filtered = filtered.filter((i) => i.severity === severityFilter);
    }
    if (statusFilter !== 'all') {
      filtered = filtered.filter((i) => i.status === statusFilter);
    }
    if (dateFrom) {
      filtered = filtered.filter((i) => i.incident_date >= dateFrom);
    }
    if (dateTo) {
      filtered = filtered.filter((i) => i.incident_date <= dateTo);
    }
    return filtered;
  }, [allIncidents, severityFilter, statusFilter, dateFrom, dateTo]);

  const openIncidentDetail = (incident: FullIncident) => {
    setSelectedIncident(incident);
    setEditInvestigationNotes(incident.root_cause_analysis || '');
    setEditCorrectiveActions(incident.corrective_actions || '');
    setEditStatus(incident.status || 'open');
    setIncidentDetailOpen(true);
  };

  const handleSaveIncidentDetail = async () => {
    if (!selectedIncident) return;
    setSavingIncident(true);
    try {
      const { error } = await supabase
        .from('safety_incidents')
        .update({
          root_cause_analysis: editInvestigationNotes,
          corrective_actions: editCorrectiveActions,
          status: editStatus,
        })
        .eq('id', selectedIncident.id);

      if (error) throw error;

      toast({
        title: 'Incident Updated',
        description: 'Safety incident has been updated successfully.',
      });

      setIncidentDetailOpen(false);
      setSelectedIncident(null);
      fetchSafetyStats();
    } catch (error) {
      console.error('Error updating incident:', error);
      toast({
        title: 'Error',
        description: 'Failed to update incident',
        variant: 'destructive',
      });
    } finally {
      setSavingIncident(false);
    }
  };

  const getSeverityBadge = (severity: string) => {
    const colorMap: Record<string, string> = {
      minor: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      major: 'bg-orange-100 text-orange-800 border-orange-300',
      critical: 'bg-red-100 text-red-800 border-red-300',
      fatal: 'bg-red-200 text-red-900 border-red-400',
    };
    return (
      <Badge
        className={colorMap[severity] || 'bg-gray-100 text-gray-800'}
        aria-label={`Severity: ${severity}`}
      >
        {severity.charAt(0).toUpperCase() + severity.slice(1)}
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      open: 'destructive',
      investigating: 'outline',
      resolved: 'default',
      closed: 'secondary',
    };
    return (
      <Badge variant={variants[status] || 'secondary'} aria-label={`Status: ${status}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const incidentColumns: TableColumn<FullIncident>[] = [
    {
      key: 'incident_date',
      header: 'Date',
      sortable: true,
      render: (value) => format(new Date(value), 'MMM d, yyyy'),
    },
    {
      key: 'project',
      header: 'Project',
      render: (_value, row) =>
        row.project ? (
          <span className="font-medium">{row.project.name}</span>
        ) : (
          <span className="text-muted-foreground">-</span>
        ),
    },
    {
      key: 'location',
      header: 'Location',
      hideOnMobile: true,
      render: (value) => value || <span className="text-muted-foreground">-</span>,
    },
    {
      key: 'severity',
      header: 'Severity',
      sortable: true,
      render: (value) => getSeverityBadge(value),
    },
    {
      key: 'description',
      header: 'Description',
      render: (value) => (
        <span className="block max-w-[200px] truncate" title={value}>
          {value}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (value) => getStatusBadge(value || 'open'),
    },
    {
      key: 'actions',
      header: 'Actions',
      width: '80px',
      headerRender: () => <span className="sr-only">Actions</span>,
      render: (_value, row) => (
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            openIncidentDetail(row);
          }}
          aria-label={`View details for incident on ${row.incident_date}`}
        >
          View
        </Button>
      ),
    },
  ];

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
                    fetchSafetyStats();
                  }}
                  onCancel={() => setShowIncidentDialog(false)}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs md:text-sm font-medium">Total Incidents</CardTitle>
              <AlertTriangle className="h-3 w-3 md:h-4 md:w-4 text-construction-orange" aria-hidden="true" />
            </CardHeader>
            <CardContent>
              <div className="text-lg md:text-2xl font-bold">{stats.totalIncidents}</div>
              <p className="text-xs text-muted-foreground">
                {stats.openIncidents} open incidents
              </p>
              <div className="flex flex-wrap gap-1 mt-2">
                <Badge className="bg-yellow-100 text-yellow-800 text-[10px]" aria-label={`${stats.minorCount} minor`}>
                  {stats.minorCount} minor
                </Badge>
                <Badge className="bg-orange-100 text-orange-800 text-[10px]" aria-label={`${stats.majorCount} major`}>
                  {stats.majorCount} major
                </Badge>
                <Badge className="bg-red-100 text-red-800 text-[10px]" aria-label={`${stats.criticalCount} critical`}>
                  {stats.criticalCount} critical
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs md:text-sm font-medium">Days Since Last Incident</CardTitle>
              <ShieldAlert className="h-3 w-3 md:h-4 md:w-4 text-green-600" aria-hidden="true" />
            </CardHeader>
            <CardContent>
              <div className="text-lg md:text-2xl font-bold">
                {stats.daysSinceLastIncident !== null ? stats.daysSinceLastIncident : 'N/A'}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.daysSinceLastIncident !== null && stats.daysSinceLastIncident > 30
                  ? 'Great safety record!'
                  : 'Keep up safety awareness'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs md:text-sm font-medium">Safety Checklists</CardTitle>
              <CheckCircle className="h-3 w-3 md:h-4 md:w-4 text-green-600" aria-hidden="true" />
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
              <Clock className="h-3 w-3 md:h-4 md:w-4 text-construction-orange" aria-hidden="true" />
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
              <Calendar className="h-3 w-3 md:h-4 md:w-4 text-red-600" aria-hidden="true" />
            </CardHeader>
            <CardContent>
              <div className="text-lg md:text-2xl font-bold">{stats.upcomingDeadlines}</div>
              <p className="text-xs text-muted-foreground">
                Compliance deadlines
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Monthly Incident Trend Chart */}
        {monthlyTrend.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Incident Trend (Last 6 Months)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyTrend} aria-label="Monthly incident trend bar chart">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="incidents" fill="#f97316" name="Incidents" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

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
                    <CardTitle>Safety Incidents</CardTitle>
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
                          fetchSafetyStats();
                        }}
                        onCancel={() => setShowIncidentDialog(false)}
                      />
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {/* Filters */}
                <div className="flex flex-wrap gap-3 mb-4" role="search" aria-label="Filter incidents">
                  <div className="w-40">
                    <Label htmlFor="severity-filter" className="sr-only">Severity</Label>
                    <Select value={severityFilter} onValueChange={setSeverityFilter}>
                      <SelectTrigger id="severity-filter" aria-label="Filter by severity">
                        <SelectValue placeholder="All Severities" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Severities</SelectItem>
                        <SelectItem value="minor">Minor</SelectItem>
                        <SelectItem value="major">Major</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-40">
                    <Label htmlFor="status-filter" className="sr-only">Status</Label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger id="status-filter" aria-label="Filter by status">
                        <SelectValue placeholder="All Statuses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="investigating">Investigating</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="date-from" className="sr-only">Date from</Label>
                    <Input
                      id="date-from"
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="w-36"
                      aria-label="Date from"
                      placeholder="From"
                    />
                    <span className="text-muted-foreground text-sm">to</span>
                    <Label htmlFor="date-to" className="sr-only">Date to</Label>
                    <Input
                      id="date-to"
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="w-36"
                      aria-label="Date to"
                      placeholder="To"
                    />
                  </div>
                </div>

                {/* Incidents Table */}
                {allIncidents.length === 0 ? (
                  <NoSafetyIncidents onCreate={() => setShowIncidentDialog(true)} />
                ) : (
                  <div className="border rounded-lg">
                    <AccessibleTable<FullIncident>
                      caption="Safety Incidents"
                      hideCaption
                      columns={incidentColumns}
                      data={filteredIncidents}
                      onRowClick={(row) => openIncidentDetail(row)}
                      emptyContent="No incidents match the selected filters."
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Incident Detail Dialog */}
            <AccessibleModal
              isOpen={incidentDetailOpen}
              onClose={() => {
                setIncidentDetailOpen(false);
                setSelectedIncident(null);
              }}
              title="Incident Details"
              description={selectedIncident ? `Incident on ${format(new Date(selectedIncident.incident_date), 'MMMM d, yyyy')}` : ''}
              size="lg"
              footer={
                <>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIncidentDetailOpen(false);
                      setSelectedIncident(null);
                    }}
                    disabled={savingIncident}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleSaveIncidentDetail} disabled={savingIncident}>
                    {savingIncident ? 'Saving...' : 'Save Changes'}
                  </Button>
                </>
              }
            >
              {selectedIncident && (
                <div className="space-y-6">
                  {/* Basic Info */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Date</p>
                      <p className="font-medium">
                        {format(new Date(selectedIncident.incident_date), 'MMMM d, yyyy')}
                        {selectedIncident.incident_time && ` at ${selectedIncident.incident_time}`}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Project</p>
                      <p className="font-medium">{selectedIncident.project?.name || '-'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Location</p>
                      <p className="font-medium">{selectedIncident.location || '-'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Severity</p>
                      {getSeverityBadge(selectedIncident.severity)}
                    </div>
                    <div>
                      <p className="text-muted-foreground">Incident Type</p>
                      <p className="font-medium">
                        {selectedIncident.incident_type.replace(/_/g, ' ').toUpperCase()}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Injured Person</p>
                      <p className="font-medium">{selectedIncident.injured_person_name || '-'}</p>
                    </div>
                    {selectedIncident.body_part_affected && (
                      <div>
                        <p className="text-muted-foreground">Body Part Affected</p>
                        <p className="font-medium">{selectedIncident.body_part_affected}</p>
                      </div>
                    )}
                    {selectedIncident.medical_attention_required !== null && (
                      <div>
                        <p className="text-muted-foreground">Medical Attention</p>
                        <p className="font-medium">{selectedIncident.medical_attention_required ? 'Yes' : 'No'}</p>
                      </div>
                    )}
                  </div>

                  {/* Full Description */}
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Description</p>
                    <p className="text-sm bg-muted/50 p-3 rounded-lg">{selectedIncident.description}</p>
                  </div>

                  {selectedIncident.immediate_actions && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Immediate Actions Taken</p>
                      <p className="text-sm bg-muted/50 p-3 rounded-lg">{selectedIncident.immediate_actions}</p>
                    </div>
                  )}

                  {/* Status */}
                  <div>
                    <Label htmlFor="incident-status">Status</Label>
                    <Select value={editStatus} onValueChange={setEditStatus}>
                      <SelectTrigger id="incident-status" className="w-48 mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="investigating">Investigating</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Investigation Notes */}
                  <div>
                    <Label htmlFor="investigation-notes">Investigation Notes / Root Cause Analysis</Label>
                    <Textarea
                      id="investigation-notes"
                      value={editInvestigationNotes}
                      onChange={(e) => setEditInvestigationNotes(e.target.value)}
                      placeholder="Enter investigation findings and root cause analysis..."
                      rows={4}
                      className="mt-1"
                    />
                  </div>

                  {/* Corrective Actions */}
                  <div>
                    <Label htmlFor="corrective-actions">Corrective Actions</Label>
                    <Textarea
                      id="corrective-actions"
                      value={editCorrectiveActions}
                      onChange={(e) => setEditCorrectiveActions(e.target.value)}
                      placeholder="List corrective actions taken or planned..."
                      rows={4}
                      className="mt-1"
                    />
                  </div>
                </div>
              )}
            </AccessibleModal>
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