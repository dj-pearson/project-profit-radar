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
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Edit, Eye, CheckCircle, XCircle, Clock, Camera, AlertTriangle, ClipboardCheck, MapPin, Calendar } from 'lucide-react';
import { format } from 'date-fns';

interface QualityInspection {
  id: string;
  inspection_number: string;
  inspection_type: string;
  phase?: string;
  location?: string;
  inspector_id?: string;
  inspection_date: string;
  status: string;
  checklist_items: any[];
  deficiencies: any[];
  photos: string[];
  notes?: string;
  passed?: boolean;
  reinspection_required: boolean;
  reinspection_date?: string;
  project_id: string;
  project?: { name: string };
  created_at: string;
}

interface PunchListItem {
  id: string;
  item_number: string;
  description: string;
  location?: string;
  trade?: string;
  priority: string;
  status: string;
  assigned_to?: string;
  due_date?: string;
  completed_date?: string;
  project_id: string;
  project?: { name: string };
  created_at: string;
}

export const QualityControlManagement: React.FC = () => {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const [inspections, setInspections] = useState<QualityInspection[]>([]);
  const [punchListItems, setPunchListItems] = useState<PunchListItem[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [punchListDialogOpen, setPunchListDialogOpen] = useState(false);
  const [editingInspection, setEditingInspection] = useState<QualityInspection | null>(null);
  const [editingPunchItem, setEditingPunchItem] = useState<PunchListItem | null>(null);
  const [activeTab, setActiveTab] = useState('inspections');

  const [inspectionForm, setInspectionForm] = useState({
    project_id: '',
    inspection_type: 'progress',
    phase: '',
    location: '',
    inspector_id: '',
    inspection_date: new Date().toISOString().split('T')[0],
    checklist_items: [
      { item: 'Foundation preparation', checked: false, notes: '' },
      { item: 'Material quality check', checked: false, notes: '' },
      { item: 'Safety compliance', checked: false, notes: '' },
    ],
    notes: ''
  });

  const [punchListForm, setPunchListForm] = useState({
    project_id: '',
    description: '',
    location: '',
    trade: '',
    priority: 'medium',
    assigned_to: '',
    due_date: ''
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

      // Load punch list items
      const { data: punchData, error: punchError } = await supabase
        .from('punch_list_items')
        .select(`
          *,
          projects:project_id(name)
        `)
        .eq('company_id', userProfile.company_id)
        .order('created_at', { ascending: false });

      if (punchError) throw punchError;

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
      setPunchListItems(punchData || []);
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

  const handleInspectionSubmit = async () => {
    if (!userProfile?.company_id || !inspectionForm.project_id || !inspectionForm.inspection_type) return;

    try {
      const inspectionData = {
        ...inspectionForm,
        company_id: userProfile.company_id,
        inspection_number: `QI-${Date.now().toString().slice(-8)}`,
        inspector_id: inspectionForm.inspector_id || userProfile.id,
        status: 'scheduled',
        checklist_items: inspectionForm.checklist_items,
        deficiencies: [],
        photos: []
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
      resetInspectionForm();
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

  const handlePunchListSubmit = async () => {
    if (!userProfile?.company_id || !punchListForm.project_id || !punchListForm.description) return;

    try {
      const punchData = {
        ...punchListForm,
        company_id: userProfile.company_id,
        item_number: `PLI-${Date.now().toString().slice(-8)}`,
        status: 'open',
        created_by: userProfile.id
      };

      if (editingPunchItem) {
        const { error } = await supabase
          .from('punch_list_items')
          .update(punchData)
          .eq('id', editingPunchItem.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Punch list item updated successfully"
        });
      } else {
        const { error } = await supabase
          .from('punch_list_items')
          .insert([punchData]);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Punch list item created successfully"
        });
      }

      setPunchListDialogOpen(false);
      setEditingPunchItem(null);
      resetPunchListForm();
      loadData();
    } catch (error) {
      console.error('Error saving punch list item:', error);
      toast({
        title: "Error",
        description: "Failed to save punch list item",
        variant: "destructive"
      });
    }
  };

  const updateInspectionStatus = async (inspectionId: string, newStatus: string, passed?: boolean) => {
    try {
      const updateData: any = { status: newStatus };
      if (passed !== undefined) updateData.passed = passed;

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

  const updatePunchListStatus = async (itemId: string, newStatus: string) => {
    try {
      const updateData: any = { status: newStatus };
      if (newStatus === 'completed') {
        updateData.completed_date = new Date().toISOString();
      }

      const { error } = await supabase
        .from('punch_list_items')
        .update(updateData)
        .eq('id', itemId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Punch list item ${newStatus} successfully`
      });
      
      loadData();
    } catch (error) {
      console.error('Error updating punch list item:', error);
      toast({
        title: "Error",
        description: "Failed to update punch list item",
        variant: "destructive"
      });
    }
  };

  const resetInspectionForm = () => {
    setInspectionForm({
      project_id: '',
      inspection_type: 'progress',
      phase: '',
      location: '',
      inspector_id: '',
      inspection_date: new Date().toISOString().split('T')[0],
      checklist_items: [
        { item: 'Foundation preparation', checked: false, notes: '' },
        { item: 'Material quality check', checked: false, notes: '' },
        { item: 'Safety compliance', checked: false, notes: '' },
      ],
      notes: ''
    });
  };

  const resetPunchListForm = () => {
    setPunchListForm({
      project_id: '',
      description: '',
      location: '',
      trade: '',
      priority: 'medium',
      assigned_to: '',
      due_date: ''
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'default';
      case 'in_progress': return 'default';
      case 'completed': return 'default';
      case 'failed': return 'destructive';
      case 'open': return 'destructive';
      case 'closed': return 'default';
      default: return 'secondary';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
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
        <div className="flex space-x-2">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => {
                setEditingInspection(null);
                resetInspectionForm();
              }}>
                <ClipboardCheck className="h-4 w-4 mr-2" />
                Schedule Inspection
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingInspection ? 'Edit Inspection' : 'Schedule New Inspection'}</DialogTitle>
                <DialogDescription>
                  Fill out the inspection details and checklist
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
                    <Label htmlFor="inspection_type">Inspection Type *</Label>
                    <Select 
                      value={inspectionForm.inspection_type} 
                      onValueChange={(value) => setInspectionForm(prev => ({ ...prev, inspection_type: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="progress">Progress Inspection</SelectItem>
                        <SelectItem value="final">Final Inspection</SelectItem>
                        <SelectItem value="safety">Safety Inspection</SelectItem>
                        <SelectItem value="material">Material Inspection</SelectItem>
                        <SelectItem value="structural">Structural Inspection</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="phase">Phase</Label>
                    <Input
                      id="phase"
                      value={inspectionForm.phase}
                      onChange={(e) => setInspectionForm(prev => ({ ...prev, phase: e.target.value }))}
                      placeholder="Construction phase"
                    />
                  </div>
                  <div>
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      value={inspectionForm.location}
                      onChange={(e) => setInspectionForm(prev => ({ ...prev, location: e.target.value }))}
                      placeholder="Inspection location"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
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
                  <div>
                    <Label htmlFor="inspection_date">Inspection Date *</Label>
                    <Input
                      id="inspection_date"
                      type="date"
                      value={inspectionForm.inspection_date}
                      onChange={(e) => setInspectionForm(prev => ({ ...prev, inspection_date: e.target.value }))}
                    />
                  </div>
                </div>

                <div>
                  <Label>Checklist Items</Label>
                  <div className="space-y-2 mt-2">
                    {inspectionForm.checklist_items.map((item, index) => (
                      <div key={index} className="flex items-center space-x-2 p-3 border rounded">
                        <Checkbox
                          checked={item.checked}
                          onCheckedChange={(checked) => {
                            const newItems = [...inspectionForm.checklist_items];
                            newItems[index].checked = checked as boolean;
                            setInspectionForm(prev => ({ ...prev, checklist_items: newItems }));
                          }}
                        />
                        <div className="flex-1">
                          <Input
                            value={item.item}
                            onChange={(e) => {
                              const newItems = [...inspectionForm.checklist_items];
                              newItems[index].item = e.target.value;
                              setInspectionForm(prev => ({ ...prev, checklist_items: newItems }));
                            }}
                            placeholder="Checklist item"
                          />
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const newItems = inspectionForm.checklist_items.filter((_, i) => i !== index);
                            setInspectionForm(prev => ({ ...prev, checklist_items: newItems }));
                          }}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setInspectionForm(prev => ({
                          ...prev,
                          checklist_items: [...prev.checklist_items, { item: '', checked: false, notes: '' }]
                        }));
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Checklist Item
                    </Button>
                  </div>
                </div>

                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={inspectionForm.notes}
                    onChange={(e) => setInspectionForm(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Inspection notes"
                    rows={3}
                  />
                </div>

                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleInspectionSubmit}>
                    {editingInspection ? 'Update' : 'Schedule'} Inspection
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={punchListDialogOpen} onOpenChange={setPunchListDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" onClick={() => {
                setEditingPunchItem(null);
                resetPunchListForm();
              }}>
                <Plus className="h-4 w-4 mr-2" />
                Add Punch Item
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl">
              <DialogHeader>
                <DialogTitle>{editingPunchItem ? 'Edit Punch List Item' : 'Add Punch List Item'}</DialogTitle>
                <DialogDescription>
                  Create a new punch list item to track completion issues
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="project">Project *</Label>
                  <Select 
                    value={punchListForm.project_id} 
                    onValueChange={(value) => setPunchListForm(prev => ({ ...prev, project_id: value }))}
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
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    value={punchListForm.description}
                    onChange={(e) => setPunchListForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe the issue that needs to be addressed"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      value={punchListForm.location}
                      onChange={(e) => setPunchListForm(prev => ({ ...prev, location: e.target.value }))}
                      placeholder="Room, area, or location"
                    />
                  </div>
                  <div>
                    <Label htmlFor="trade">Trade</Label>
                    <Select 
                      value={punchListForm.trade} 
                      onValueChange={(value) => setPunchListForm(prev => ({ ...prev, trade: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select trade" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">General</SelectItem>
                        <SelectItem value="electrical">Electrical</SelectItem>
                        <SelectItem value="plumbing">Plumbing</SelectItem>
                        <SelectItem value="hvac">HVAC</SelectItem>
                        <SelectItem value="flooring">Flooring</SelectItem>
                        <SelectItem value="painting">Painting</SelectItem>
                        <SelectItem value="roofing">Roofing</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="priority">Priority</Label>
                    <Select 
                      value={punchListForm.priority} 
                      onValueChange={(value) => setPunchListForm(prev => ({ ...prev, priority: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="assigned_to">Assigned To</Label>
                    <Select 
                      value={punchListForm.assigned_to} 
                      onValueChange={(value) => setPunchListForm(prev => ({ ...prev, assigned_to: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select assignee" />
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
                  <Label htmlFor="due_date">Due Date</Label>
                  <Input
                    id="due_date"
                    type="date"
                    value={punchListForm.due_date}
                    onChange={(e) => setPunchListForm(prev => ({ ...prev, due_date: e.target.value }))}
                  />
                </div>

                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setPunchListDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handlePunchListSubmit}>
                    {editingPunchItem ? 'Update' : 'Create'} Punch Item
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="inspections">Quality Inspections</TabsTrigger>
          <TabsTrigger value="punchlist">Punch List</TabsTrigger>
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
                    <ClipboardCheck className="h-4 w-4 mr-2" />
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
                      <TableHead>Location</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Result</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inspections.map((inspection) => (
                      <TableRow key={inspection.id}>
                        <TableCell className="font-medium">{inspection.inspection_number}</TableCell>
                        <TableCell>{inspection.project?.name}</TableCell>
                        <TableCell>{inspection.inspection_type.replace('_', ' ')}</TableCell>
                        <TableCell>{inspection.location || '-'}</TableCell>
                        <TableCell>{format(new Date(inspection.inspection_date), 'MMM d, yyyy')}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusColor(inspection.status)}>
                            {inspection.status.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {inspection.passed === null ? (
                            <Badge variant="secondary">Pending</Badge>
                          ) : inspection.passed ? (
                            <Badge variant="default">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Passed
                            </Badge>
                          ) : (
                            <Badge variant="destructive">
                              <XCircle className="h-3 w-3 mr-1" />
                              Failed
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            {inspection.status === 'scheduled' && (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => updateInspectionStatus(inspection.id, 'completed', true)}
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => updateInspectionStatus(inspection.id, 'completed', false)}
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
                                  phase: inspection.phase || '',
                                  location: inspection.location || '',
                                  inspector_id: inspection.inspector_id || '',
                                  inspection_date: inspection.inspection_date,
                                  checklist_items: inspection.checklist_items,
                                  notes: inspection.notes || ''
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

        <TabsContent value="punchlist" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Punch List Items</CardTitle>
              <CardDescription>Track completion issues and deficiencies</CardDescription>
            </CardHeader>
            <CardContent>
              {punchListItems.length === 0 ? (
                <div className="text-center py-8">
                  <ClipboardCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Punch List Items</h3>
                  <p className="text-muted-foreground mb-4">Add your first punch list item</p>
                  <Button onClick={() => setPunchListDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Punch Item
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Number</TableHead>
                      <TableHead>Project</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Trade</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {punchListItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.item_number}</TableCell>
                        <TableCell>{item.project?.name}</TableCell>
                        <TableCell className="max-w-xs truncate">{item.description}</TableCell>
                        <TableCell>{item.location || '-'}</TableCell>
                        <TableCell>{item.trade || '-'}</TableCell>
                        <TableCell>
                          <Badge variant={getPriorityColor(item.priority)}>
                            {item.priority}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusColor(item.status)}>
                            {item.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {item.due_date ? format(new Date(item.due_date), 'MMM d, yyyy') : '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            {item.status === 'open' && (
                              <Button
                                size="sm"
                                onClick={() => updatePunchListStatus(item.id, 'completed')}
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingPunchItem(item);
                                setPunchListForm({
                                  project_id: item.project_id,
                                  description: item.description,
                                  location: item.location || '',
                                  trade: item.trade || '',
                                  priority: item.priority,
                                  assigned_to: item.assigned_to || '',
                                  due_date: item.due_date || ''
                                });
                                setPunchListDialogOpen(true);
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

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Inspections</CardTitle>
                <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{inspections.length}</div>
                <p className="text-xs text-muted-foreground">
                  {inspections.filter(i => i.status === 'completed').length} completed
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
                  {inspections.filter(i => i.passed === true).length > 0 ? 
                    Math.round((inspections.filter(i => i.passed === true).length / inspections.filter(i => i.passed !== null).length) * 100) : 0}%
                </div>
                <p className="text-xs text-muted-foreground">
                  Of completed inspections
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Open Punch Items</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {punchListItems.filter(item => item.status === 'open').length}
                </div>
                <p className="text-xs text-muted-foreground">
                  {punchListItems.filter(item => item.priority === 'high' && item.status === 'open').length} high priority
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};