import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

interface SafetyStats {
  totalIncidents: number;
  openIncidents: number;
  checklistsCompleted: number;
  expiringCertifications: number;
  upcomingDeadlines: number;
}

const Safety = () => {
  const [stats, setStats] = useState<SafetyStats>({
    totalIncidents: 0,
    openIncidents: 0,
    checklistsCompleted: 0,
    expiringCertifications: 0,
    upcomingDeadlines: 0
  });
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

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
        deadlinesResult
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
          .eq('status', 'pending')
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/dashboard')}
              className="mr-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            <h1 className="text-xl font-semibold">Safety & OSHA Compliance</h1>
          </div>
        </div>
      </div>
      
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-muted-foreground mt-2">
              Manage safety incidents, checklists, training, and compliance deadlines
            </p>
          </div>
          <div className="flex gap-3">
          <Button variant="outline">
            <FileText className="mr-2 h-4 w-4" />
            Generate OSHA 300 Log
          </Button>
          <Button variant="construction">
            <Plus className="mr-2 h-4 w-4" />
            Report Incident
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Incidents</CardTitle>
            <AlertTriangle className="h-4 w-4 text-construction-orange" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalIncidents}</div>
            <p className="text-xs text-muted-foreground">
              {stats.openIncidents} open incidents
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Safety Checklists</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.checklistsCompleted}</div>
            <p className="text-xs text-muted-foreground">
              Completed this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expiring Certifications</CardTitle>
            <Clock className="h-4 w-4 text-construction-orange" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.expiringCertifications}</div>
            <p className="text-xs text-muted-foreground">
              Next 30 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Deadlines</CardTitle>
            <Calendar className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.upcomingDeadlines}</div>
            <p className="text-xs text-muted-foreground">
              Compliance deadlines
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="incidents" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="incidents">Incidents</TabsTrigger>
          <TabsTrigger value="checklists">Safety Checklists</TabsTrigger>
          <TabsTrigger value="training">Training & Certifications</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
        </TabsList>

        <TabsContent value="incidents" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Safety Incidents</CardTitle>
              <CardDescription>
                Track and manage workplace safety incidents and near misses
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <AlertTriangle className="mx-auto h-12 w-12 mb-4" />
                <p>No incidents reported yet</p>
                <Button className="mt-4" variant="construction">
                  <Plus className="mr-2 h-4 w-4" />
                  Report First Incident
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="checklists" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Safety Checklists</CardTitle>
              <CardDescription>
                Daily safety checks and inspection forms
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Shield className="mx-auto h-12 w-12 mb-4" />
                <p>No safety checklists configured</p>
                <Button className="mt-4" variant="construction">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Safety Checklist
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="training" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Training & Certifications</CardTitle>
              <CardDescription>
                Track OSHA training, certifications, and renewal dates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Users className="mx-auto h-12 w-12 mb-4" />
                <p>No training records found</p>
                <Button className="mt-4" variant="construction">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Certification
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compliance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>OSHA Compliance Deadlines</CardTitle>
              <CardDescription>
                Track important compliance deadlines and requirements
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="mx-auto h-12 w-12 mb-4" />
                <p>No compliance deadlines set</p>
                <Button className="mt-4" variant="construction">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Compliance Deadline
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>
    </div>
  );
};

export default Safety;