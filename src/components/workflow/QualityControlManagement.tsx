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
import { Plus, Edit, Eye, CheckCircle, XCircle, ClipboardCheck, AlertTriangle, Camera, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import InspectionConductDialog from './InspectionConductDialog';

interface QualityInspection {
  id: string;
  project_id: string;
  inspection_type: string;
  inspection_number: string;
  inspection_date: string;
  inspector_id: string;
  status: string;
  checklist_items: any;
  deficiencies: any;
  photos: any;
  notes: string;
  created_at: string;
  projects?: { name: string };
}

export const QualityControlManagement: React.FC = () => {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const [inspections, setInspections] = useState<QualityInspection[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingInspection, setEditingInspection] = useState<QualityInspection | null>(null);
  const [activeTab, setActiveTab] = useState('inspections');

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
      // Load inspections
      const { data: inspectionsData, error: inspectionsError } = await supabase
        .from('quality_inspections')
        .select(`
          *,
          projects:project_id(name)
        `)
        .eq('company_id', userProfile.company_id)
        .order('created_at', { ascending: false });

      if (inspectionsError) throw inspectionsError;

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

      setInspections(inspectionsData || []);
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

  const handleSubmit = async () => {
    if (!userProfile?.company_id || !inspectionForm.project_id || !inspectionForm.inspection_date) return;

    try {
      const inspectionData = {
        company_id: userProfile.company_id,
        inspection_number: `QI-${Date.now().toString().slice(-8)}`,
        status: 'scheduled',
        checklist_items: [],
        deficiencies: [],
        photos: [],
        ...inspectionForm
      };

      if (editingInspection) {
        const { error } = await supabase
          .from('quality_inspections')
          .update(inspectionData)
          .eq('id', editingInspection.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Inspection updated successfully"
        });
      } else {
        const { error } = await supabase
          .from('quality_inspections')
          .insert([inspectionData]);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Inspection scheduled successfully"
        });
      }

      setDialogOpen(false);
      setEditingInspection(null);
      resetForm();
      loadData();
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

      const { error } = await supabase
        .from('quality_inspections')
        .update(updateData)
        .eq('id', inspectionId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Inspection ${newStatus} successfully`
      });
      
      loadData();
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

  if (loading) {
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
          <h2 className="text-2xl font-bold">Quality Control & Punch Lists</h2>
          <p className="text-muted-foreground">Manage inspections, quality control, and punch list items</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setEditingInspection(null);
              resetForm();
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Schedule Inspection
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingInspection ? 'Edit Inspection' : 'Schedule New Inspection'}</DialogTitle>
              <DialogDescription>
                Schedule quality inspections and safety checks
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="project">Project *</Label>
                  <Select 
                    value={inspectionForm.project_id} 
                    onValueChange={(value) => setInspectionForm(prev => ({ ...prev, project_id: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select project" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map(project => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="inspection_type">Inspection Type</Label>
                  <Select 
                    value={inspectionForm.inspection_type} 
                    onValueChange={(value) => setInspectionForm(prev => ({ ...prev, inspection_type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pre_construction">Pre-Construction</SelectItem>
                      <SelectItem value="foundation">Foundation</SelectItem>
                      <SelectItem value="framing">Framing</SelectItem>
                      <SelectItem value="electrical">Electrical</SelectItem>
                      <SelectItem value="plumbing">Plumbing</SelectItem>
                      <SelectItem value="insulation">Insulation</SelectItem>
                      <SelectItem value="drywall">Drywall</SelectItem>
                      <SelectItem value="final">Final Inspection</SelectItem>
                      <SelectItem value="safety">Safety Inspection</SelectItem>
                      <SelectItem value="quality">Quality Check</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="inspection_date">Inspection Date *</Label>
                  <Input
                    id="inspection_date"
                    type="datetime-local"
                    value={inspectionForm.inspection_date}
                    onChange={(e) => setInspectionForm(prev => ({ ...prev, inspection_date: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="inspector">Inspector</Label>
                  <Select 
                    value={inspectionForm.inspector_id} 
                    onValueChange={(value) => setInspectionForm(prev => ({ ...prev, inspector_id: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select inspector" />
                    </SelectTrigger>
                    <SelectContent>
                      {teamMembers.map(member => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.first_name} {member.last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={inspectionForm.notes}
                  onChange={(e) => setInspectionForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Additional notes for the inspection"
                  rows={3}
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleSubmit}>
                  {editingInspection ? 'Update' : 'Schedule'} Inspection
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="inspections">Inspections ({inspections.length})</TabsTrigger>
          <TabsTrigger value="punch-lists">Punch Lists</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="inspections" className="space-y-4">
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
                  <p className="text-muted-foreground mb-4">Schedule your first quality inspection</p>
                  <Button onClick={() => setDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Schedule Inspection
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Number</TableHead>
                      <TableHead>Project</TableHead>
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
                        <TableCell>{inspection.projects?.name}</TableCell>
                        <TableCell className="capitalize">{inspection.inspection_type.replace('_', ' ')}</TableCell>
                        <TableCell>{format(new Date(inspection.inspection_date), 'MMM d, yyyy h:mm a')}</TableCell>
                        <TableCell>
                          {teamMembers.find(m => m.id === inspection.inspector_id)?.first_name || 'Unassigned'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusColor(inspection.status)}>
                            {inspection.status.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            {inspection.status === 'scheduled' && (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => updateInspectionStatus(inspection.id, 'passed')}
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => updateInspectionStatus(inspection.id, 'failed')}
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingInspection(inspection);
                                setInspectionForm({
                                  project_id: inspection.project_id,
                                  inspection_type: inspection.inspection_type,
                                  inspection_date: inspection.inspection_date,
                                  inspector_id: inspection.inspector_id,
                                  notes: inspection.notes
                                });
                                setDialogOpen(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Inspections</CardTitle>
                <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{inspections.length}</div>
                <p className="text-xs text-muted-foreground">
                  {inspections.filter(i => i.status === 'scheduled').length} scheduled
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pass Rate</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {inspections.filter(i => ['passed', 'failed'].includes(i.status)).length > 0 ? 
                    Math.round((inspections.filter(i => i.status === 'passed').length / 
                    inspections.filter(i => ['passed', 'failed'].includes(i.status)).length) * 100) : 0}%
                </div>
                <p className="text-xs text-muted-foreground">
                  First-time pass rate
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Failed Inspections</CardTitle>
                <XCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {inspections.filter(i => i.status === 'failed').length}
                </div>
                <p className="text-xs text-muted-foreground">
                  Requiring re-inspection
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">This Week</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {inspections.filter(i => {
                    const inspectionDate = new Date(i.inspection_date);
                    const now = new Date();
                    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
                    return inspectionDate >= now && inspectionDate <= weekFromNow;
                  }).length}
                </div>
                <p className="text-xs text-muted-foreground">
                  Inspections scheduled
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};