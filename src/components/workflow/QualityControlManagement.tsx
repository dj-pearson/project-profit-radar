import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Edit, Eye, CheckCircle, XCircle, ClipboardCheck, AlertTriangle, Camera, Calendar, Settings } from 'lucide-react';
import { format } from 'date-fns';
import InspectionConductDialog from './InspectionConductDialog';
import { useDigitalInspections, generateInspectionNumber } from '@/hooks/useDigitalInspections';

interface QualityInspection {
  id: string;
  project_id: string;
  inspection_type: string;
  inspection_number: string;
  inspection_date: string;
  inspector_id?: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'failed';
  checklist_items: any;
  deficiencies: any;
  photos: any;
  notes?: string;
  created_at: string;
  projects?: { name: string };
}

export const QualityControlManagement: React.FC = () => {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const [projects, setProjects] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [conductDialogOpen, setConductDialogOpen] = useState(false);
  const [selectedInspection, setSelectedInspection] = useState<any | null>(null);
  const [editingInspection, setEditingInspection] = useState<QualityInspection | null>(null);
  const [activeTab, setActiveTab] = useState('inspections');

  // Use digital inspections hook
  const { inspections, isLoading: inspectionsLoading, createInspection, updateInspection } = useDigitalInspections();

  const [inspectionForm, setInspectionForm] = useState({
    project_id: '',
    inspection_type: 'pre_construction',
    inspection_date: '',
    inspector_id: '',
    notes: ''
  });

  useEffect(() => {
    loadData();
  }, [userProfile?.company_id]);

  const loadData = async () => {
    if (!userProfile?.company_id) return;

    try {
      // Load projects
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('id, name')
        .eq('company_id', userProfile.company_id)
        .order('name');

      if (projectsError) throw projectsError;

      // Load team members
      const { data: teamData, error: teamError } = await supabase
        .from('user_profiles')
        .select('id, first_name, last_name')
        .eq('company_id', userProfile.company_id);

      if (teamError) throw teamError;

      setProjects(projectsData || []);
      setTeamMembers(teamData || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Error",
        description: "Failed to load quality control data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle creating new inspection with templates
  const handleCreateInspection = (type: string) => {
    if (!userProfile?.company_id) return;
    
    const newInspection = {
      company_id: userProfile.company_id,
      project_id: projects[0]?.id || '', // Default to first project or require selection
      inspection_number: generateInspectionNumber(type),
      inspection_type: type,
      inspection_date: new Date().toISOString().split('T')[0],
      status: 'scheduled' as const,
      checklist_items: [],
      deficiencies: [],
      photos: [],
      reinspection_required: false
    };
    
    createInspection.mutate(newInspection);
  };

  const handleSubmit = async () => {
    if (!userProfile?.company_id || !inspectionForm.project_id || !inspectionForm.inspection_date) return;

    try {
      const inspectionData = {
        company_id: userProfile.company_id,
        inspection_number: `QI-${Date.now().toString().slice(-8)}`,
        status: 'scheduled' as const,
        checklist_items: [],
        deficiencies: [],
        photos: [],
        reinspection_required: false,
        ...inspectionForm
      };

      if (editingInspection) {
        updateInspection.mutate({ 
          id: editingInspection.id, 
          updates: inspectionData 
        });
      } else {
        createInspection.mutate(inspectionData);
      }

      setDialogOpen(false);
      setEditingInspection(null);
      resetForm();
    } catch (error) {
      console.error('Error saving inspection:', error);
      toast({
        title: "Error",
        description: "Failed to save inspection",
        variant: "destructive"
      });
    }
  };

  const updateInspectionStatus = async (inspectionId: string, newStatus: string) => {
    try {
      const updateData: any = { status: newStatus };
      
      if (newStatus === 'completed') {
        updateData.completed_at = new Date().toISOString();
      }

      updateInspection.mutate({ 
        id: inspectionId, 
        updates: updateData 
      });
    } catch (error) {
      console.error('Error updating inspection:', error);
      toast({
        title: "Error",
        description: "Failed to update inspection",
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setInspectionForm({
      project_id: '',
      inspection_type: 'pre_construction',
      inspection_date: '',
      inspector_id: '',
      notes: ''
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'default';
      case 'in_progress': return 'default';
      case 'completed': return 'default';
      case 'failed': return 'destructive';
      case 'passed': return 'default';
      default: return 'secondary';
    }
  };

  if (loading || inspectionsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Digital Inspections & Quality Control</h2>
          <p className="text-muted-foreground">Conduct digital inspections with mobile workflows and client sign-off</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="inspections">Inspections ({inspections.length})</TabsTrigger>
          <TabsTrigger value="punch-lists">Punch Lists</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="inspections" className="space-y-4">
          {/* Quick Create Templates */}
          <Card>
            <CardHeader>
              <CardTitle>Create Inspection</CardTitle>
              <CardDescription>Choose inspection template to get started</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <Button onClick={() => handleCreateInspection('Pre-Construction')} className="h-20">
                  <div className="flex flex-col items-center">
                    <Plus className="h-6 w-6 mb-2" />
                    <span>Pre-Construction</span>
                  </div>
                </Button>
                <Button onClick={() => handleCreateInspection('Framing')} className="h-20" variant="outline">
                  <div className="flex flex-col items-center">
                    <Plus className="h-6 w-6 mb-2" />
                    <span>Framing</span>
                  </div>
                </Button>
                <Button onClick={() => handleCreateInspection('MEP')} className="h-20" variant="outline">
                  <div className="flex flex-col items-center">
                    <Plus className="h-6 w-6 mb-2" />
                    <span>MEP</span>
                  </div>
                </Button>
                <Button onClick={() => handleCreateInspection('Final')} className="h-20" variant="outline">
                  <div className="flex flex-col items-center">
                    <Plus className="h-6 w-6 mb-2" />
                    <span>Final</span>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quality Inspections</CardTitle>
              <CardDescription>Scheduled and completed quality inspections</CardDescription>
            </CardHeader>
            <CardContent>
              {inspections.length === 0 ? (
                <div className="text-center py-8">
                  <ClipboardCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Inspections</h3>
                  <p className="text-muted-foreground mb-4">Create your first digital inspection using the templates above</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Number</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Scheduled</TableHead>
                      <TableHead>Inspector</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inspections.map((inspection) => (
                      <TableRow key={inspection.id}>
                        <TableCell className="font-medium">{inspection.inspection_number}</TableCell>
                        <TableCell className="capitalize">{inspection.inspection_type.replace('_', ' ')}</TableCell>
                        <TableCell>{format(new Date(inspection.inspection_date), 'MMM d, yyyy')}</TableCell>
                        <TableCell>{inspection.inspector_id ? 'Assigned' : 'Unassigned'}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusColor(inspection.status)}>
                            {inspection.status.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button 
                            size="sm" 
                            onClick={() => {
                              setSelectedInspection(inspection);
                              setConductDialogOpen(true);
                            }}
                          >
                            <Settings className="h-4 w-4 mr-1" /> Conduct
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="punch-lists" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Punch List Items</CardTitle>
              <CardDescription>Track deficiencies and items requiring correction</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Punch List Items</h3>
                <p className="text-muted-foreground mb-4">Items will appear here when inspections identify deficiencies</p>
                <Button variant="outline">
                  <Camera className="h-4 w-4 mr-2" />
                  Document Issue
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Total Inspections</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{inspections.length}</div>
                <p className="text-xs text-muted-foreground">+2 from last month</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Pass Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">94%</div>
                <p className="text-xs text-muted-foreground">+5% from last month</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Avg. Resolution Time</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">2.3 days</div>
                <p className="text-xs text-muted-foreground">-0.5 days from last month</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Conduct Inspection Dialog */}
      <InspectionConductDialog
        open={conductDialogOpen}
        onOpenChange={setConductDialogOpen}
        inspection={selectedInspection}
        teamMembers={teamMembers}
        onSaved={() => {
          setConductDialogOpen(false);
          setSelectedInspection(null);
        }}
      />
    </div>
  );
};