import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { 
  Settings, 
  Plus, 
  Edit,
  Trash2,
  Save,
  GripVertical,
  Target,
  Clock,
  Percent,
  Users,
  ArrowRight,
  RefreshCw,
  Zap
} from 'lucide-react';

interface PipelineStage {
  id: string;
  name: string;
  description?: string;
  stage_order: number;
  color_code: string;
  probability_weight: number;
  is_won_stage: boolean;
  is_lost_stage: boolean;
  expected_duration_days?: number;
  auto_tasks: any[];
  required_fields: string[];
}

interface PipelineTemplate {
  id: string;
  name: string;
  description?: string;
  deal_type: string;
  is_default: boolean;
  is_active: boolean;
}

interface LeadRoutingRule {
  id: string;
  name: string;
  description?: string;
  priority: number;
  is_active: boolean;
  conditions: any;
  assign_to_user_id?: string;
  use_round_robin: boolean;
  round_robin_users: string[];
}

export const PipelineSettings: React.FC = () => {
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [templates, setTemplates] = useState<PipelineTemplate[]>([]);
  const [routingRules, setRoutingRules] = useState<LeadRoutingRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingStage, setEditingStage] = useState<PipelineStage | null>(null);
  const [showNewStageDialog, setShowNewStageDialog] = useState(false);
  const { toast } = useToast();
  const { userProfile } = useAuth();

  const [newStage, setNewStage] = useState<Partial<PipelineStage>>({
    name: '',
    description: '',
    color_code: '#3B82F6',
    probability_weight: 50,
    is_won_stage: false,
    is_lost_stage: false,
    expected_duration_days: 7,
    auto_tasks: [],
    required_fields: []
  });

  useEffect(() => {
    loadPipelineSettings();
  }, []);

  const loadPipelineSettings = async () => {
    try {
      if (!userProfile?.company_id) return;

      // Load stages
      const { data: stagesData, error: stagesError } = await supabase
        .from('pipeline_stages')
        .select('*')
        .eq('company_id', userProfile.company_id)
        .order('stage_order');

      if (stagesError) throw stagesError;
      setStages(stagesData || []);

      // Load templates
      const { data: templatesData, error: templatesError } = await supabase
        .from('pipeline_templates')
        .select('*')
        .eq('company_id', userProfile.company_id)
        .order('created_at');

      if (templatesError) throw templatesError;
      setTemplates(templatesData || []);

      // Load routing rules
      const { data: rulesData, error: rulesError } = await supabase
        .from('lead_routing_rules')
        .select('*')
        .eq('company_id', userProfile.company_id)
        .order('priority', { ascending: false });

      if (rulesError) throw rulesError;
      setRoutingRules(rulesData || []);

    } catch (error: any) {
      toast({
        title: "Error loading pipeline settings",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = async (result: any) => {
    if (!result.destination) return;

    const reorderedStages = Array.from(stages);
    const [movedStage] = reorderedStages.splice(result.source.index, 1);
    reorderedStages.splice(result.destination.index, 0, movedStage);

    // Update stage orders
    const updatedStages = reorderedStages.map((stage, index) => ({
      ...stage,
      stage_order: index + 1
    }));

    setStages(updatedStages);

    try {
      // Update all stage orders in database
      const { error } = await supabase
        .from('pipeline_stages')
        .upsert(updatedStages.map(stage => ({
          id: stage.id,
          stage_order: stage.stage_order
        })));

      if (error) throw error;

      toast({
        title: "Stage order updated",
        description: "Pipeline stages have been reordered successfully"
      });
    } catch (error: any) {
      toast({
        title: "Error updating stage order",
        description: error.message,
        variant: "destructive"
      });
      // Revert on error
      loadPipelineSettings();
    }
  };

  const createStage = async () => {
    try {
      if (!userProfile?.company_id || !newStage.name) return;

      const nextOrder = Math.max(...stages.map(s => s.stage_order), 0) + 1;

      const { data, error } = await supabase
        .from('pipeline_stages')
        .insert([{
          ...newStage,
          company_id: userProfile.company_id,
          stage_order: nextOrder
        }])
        .select()
        .single();

      if (error) throw error;

      setStages([...stages, data]);
      setShowNewStageDialog(false);
      setNewStage({
        name: '',
        description: '',
        color_code: '#3B82F6',
        probability_weight: 50,
        is_won_stage: false,
        is_lost_stage: false,
        expected_duration_days: 7,
        auto_tasks: [],
        required_fields: []
      });

      toast({
        title: "Stage created",
        description: "New pipeline stage has been created successfully"
      });
    } catch (error: any) {
      toast({
        title: "Error creating stage",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const updateStage = async (stage: PipelineStage) => {
    try {
      const { error } = await supabase
        .from('pipeline_stages')
        .update(stage)
        .eq('id', stage.id);

      if (error) throw error;

      setStages(stages.map(s => s.id === stage.id ? stage : s));
      setEditingStage(null);

      toast({
        title: "Stage updated",
        description: "Pipeline stage has been updated successfully"
      });
    } catch (error: any) {
      toast({
        title: "Error updating stage",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const deleteStage = async (stageId: string) => {
    try {
      const { error } = await supabase
        .from('pipeline_stages')
        .delete()
        .eq('id', stageId);

      if (error) throw error;

      setStages(stages.filter(s => s.id !== stageId));

      toast({
        title: "Stage deleted",
        description: "Pipeline stage has been deleted successfully"
      });
    } catch (error: any) {
      toast({
        title: "Error deleting stage",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const colorOptions = [
    { value: '#3B82F6', label: 'Blue' },
    { value: '#10B981', label: 'Green' },
    { value: '#F59E0B', label: 'Yellow' },
    { value: '#EF4444', label: 'Red' },
    { value: '#8B5CF6', label: 'Purple' },
    { value: '#EC4899', label: 'Pink' },
    { value: '#6B7280', label: 'Gray' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Pipeline Settings</h2>
          <p className="text-muted-foreground">Configure your sales pipeline stages and automation</p>
        </div>
        <Button onClick={loadPipelineSettings}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Tabs defaultValue="stages" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="stages">Pipeline Stages</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="routing">Lead Routing</TabsTrigger>
        </TabsList>

        <TabsContent value="stages" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center space-x-2">
                    <Target className="h-5 w-5" />
                    <span>Pipeline Stages</span>
                  </CardTitle>
                  <CardDescription>
                    Configure and reorder your sales pipeline stages
                  </CardDescription>
                </div>
                <Dialog open={showNewStageDialog} onOpenChange={setShowNewStageDialog}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Stage
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create New Stage</DialogTitle>
                      <DialogDescription>
                        Add a new stage to your sales pipeline
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="stage-name">Stage Name</Label>
                        <Input
                          id="stage-name"
                          value={newStage.name}
                          onChange={(e) => setNewStage({ ...newStage, name: e.target.value })}
                          placeholder="e.g., Proposal"
                        />
                      </div>
                      <div>
                        <Label htmlFor="stage-description">Description</Label>
                        <Textarea
                          id="stage-description"
                          value={newStage.description || ''}
                          onChange={(e) => setNewStage({ ...newStage, description: e.target.value })}
                          placeholder="Optional description"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="stage-color">Color</Label>
                          <Select 
                            value={newStage.color_code} 
                            onValueChange={(value) => setNewStage({ ...newStage, color_code: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {colorOptions.map(color => (
                                <SelectItem key={color.value} value={color.value}>
                                  <div className="flex items-center space-x-2">
                                    <div 
                                      className="w-4 h-4 rounded-full border"
                                      style={{ backgroundColor: color.value }}
                                    />
                                    <span>{color.label}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="stage-probability">Probability Weight (%)</Label>
                          <Input
                            id="stage-probability"
                            type="number"
                            min="0"
                            max="100"
                            value={newStage.probability_weight}
                            onChange={(e) => setNewStage({ ...newStage, probability_weight: Number(e.target.value) })}
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="stage-duration">Expected Duration (days)</Label>
                        <Input
                          id="stage-duration"
                          type="number"
                          min="1"
                          value={newStage.expected_duration_days}
                          onChange={(e) => setNewStage({ ...newStage, expected_duration_days: Number(e.target.value) })}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={newStage.is_won_stage}
                            onCheckedChange={(checked) => setNewStage({ ...newStage, is_won_stage: checked })}
                          />
                          <Label>Won Stage</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={newStage.is_lost_stage}
                            onCheckedChange={(checked) => setNewStage({ ...newStage, is_lost_stage: checked })}
                          />
                          <Label>Lost Stage</Label>
                        </div>
                      </div>
                      <div className="flex justify-end space-x-2">
                        <Button variant="outline" onClick={() => setShowNewStageDialog(false)}>
                          Cancel
                        </Button>
                        <Button onClick={createStage}>
                          Create Stage
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="stages">
                  {(provided) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className="space-y-3"
                    >
                      {stages.map((stage, index) => (
                        <Draggable key={stage.id} draggableId={stage.id} index={index}>
                          {(provided, snapshot) => (
                            <Card
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={`transition-all ${
                                snapshot.isDragging ? 'shadow-lg rotate-2' : ''
                              }`}
                            >
                              <CardContent className="p-4">
                                <div className="flex items-center space-x-4">
                                  <div
                                    {...provided.dragHandleProps}
                                    className="cursor-grab active:cursor-grabbing"
                                  >
                                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                                  </div>
                                  
                                  <div
                                    className="w-4 h-4 rounded-full border"
                                    style={{ backgroundColor: stage.color_code }}
                                  />
                                  
                                  <div className="flex-1">
                                    <div className="flex items-center space-x-2">
                                      <h4 className="font-medium">{stage.name}</h4>
                                      {stage.is_won_stage && <Badge variant="default">Won</Badge>}
                                      {stage.is_lost_stage && <Badge variant="destructive">Lost</Badge>}
                                    </div>
                                    {stage.description && (
                                      <p className="text-sm text-muted-foreground">{stage.description}</p>
                                    )}
                                  </div>
                                  
                                  <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                                    <div className="flex items-center space-x-1">
                                      <Percent className="h-4 w-4" />
                                      <span>{stage.probability_weight}%</span>
                                    </div>
                                    {stage.expected_duration_days && (
                                      <div className="flex items-center space-x-1">
                                        <Clock className="h-4 w-4" />
                                        <span>{stage.expected_duration_days}d</span>
                                      </div>
                                    )}
                                  </div>
                                  
                                  <div className="flex items-center space-x-2">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => setEditingStage(stage)}
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => deleteStage(stage.id)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="h-5 w-5" />
                <span>Pipeline Templates</span>
              </CardTitle>
              <CardDescription>
                Create and manage pipeline templates for different deal types
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Settings className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Templates Coming Soon</h3>
                <p className="text-muted-foreground">
                  Pipeline templates will allow you to create different workflows for various deal types.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="routing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Zap className="h-5 w-5" />
                <span>Lead Routing Rules</span>
              </CardTitle>
              <CardDescription>
                Automatically assign leads to sales reps based on criteria
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Zap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Routing Rules Coming Soon</h3>
                <p className="text-muted-foreground">
                  Set up automated lead assignment based on territory, source, value, and other criteria.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Stage Dialog */}
      {editingStage && (
        <Dialog open={!!editingStage} onOpenChange={() => setEditingStage(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Stage: {editingStage.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-stage-name">Stage Name</Label>
                <Input
                  id="edit-stage-name"
                  value={editingStage.name}
                  onChange={(e) => setEditingStage({ ...editingStage, name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-stage-description">Description</Label>
                <Textarea
                  id="edit-stage-description"
                  value={editingStage.description || ''}
                  onChange={(e) => setEditingStage({ ...editingStage, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-stage-color">Color</Label>
                  <Select 
                    value={editingStage.color_code} 
                    onValueChange={(value) => setEditingStage({ ...editingStage, color_code: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {colorOptions.map(color => (
                        <SelectItem key={color.value} value={color.value}>
                          <div className="flex items-center space-x-2">
                            <div 
                              className="w-4 h-4 rounded-full border"
                              style={{ backgroundColor: color.value }}
                            />
                            <span>{color.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="edit-stage-probability">Probability Weight (%)</Label>
                  <Input
                    id="edit-stage-probability"
                    type="number"
                    min="0"
                    max="100"
                    value={editingStage.probability_weight}
                    onChange={(e) => setEditingStage({ ...editingStage, probability_weight: Number(e.target.value) })}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="edit-stage-duration">Expected Duration (days)</Label>
                <Input
                  id="edit-stage-duration"
                  type="number"
                  min="1"
                  value={editingStage.expected_duration_days || 7}
                  onChange={(e) => setEditingStage({ ...editingStage, expected_duration_days: Number(e.target.value) })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={editingStage.is_won_stage}
                    onCheckedChange={(checked) => setEditingStage({ ...editingStage, is_won_stage: checked })}
                  />
                  <Label>Won Stage</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={editingStage.is_lost_stage}
                    onCheckedChange={(checked) => setEditingStage({ ...editingStage, is_lost_stage: checked })}
                  />
                  <Label>Lost Stage</Label>
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setEditingStage(null)}>
                  Cancel
                </Button>
                <Button onClick={() => updateStage(editingStage)}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};