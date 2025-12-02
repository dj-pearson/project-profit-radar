import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Edit, Trash2, Copy } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface TaskTemplatesDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ProjectTemplate {
  id: string;
  name: string;
  description?: string;
  industry_type?: string;
  project_type?: string;
  created_at: string;
}

interface TaskTemplate {
  id: string;
  project_template_id: string;
  name: string;
  description?: string;
  category: string;
  priority: string;
  estimated_hours?: number;
  due_days_from_start: number;
  phase_order: number;
}

type TaskCategory = 'general' | 'permit' | 'estimate' | 'inspection' | 'material_order' | 'labor' | 'safety' | 'quality_control' | 'client_communication' | 'documentation' | 'financial' | 'equipment';

const TASK_CATEGORIES: TaskCategory[] = [
  'general',
  'permit',
  'estimate', 
  'inspection',
  'material_order',
  'labor',
  'safety',
  'quality_control',
  'client_communication',
  'documentation',
  'financial',
  'equipment'
];

export const TaskTemplatesDialog: React.FC<TaskTemplatesDialogProps> = ({
  isOpen,
  onClose
}) => {
  const { userProfile } = useAuth();
  const [activeTab, setActiveTab] = useState('templates');
  const [projectTemplates, setProjectTemplates] = useState<ProjectTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [taskTemplates, setTaskTemplates] = useState<TaskTemplate[]>([]);
  const [loading, setLoading] = useState(false);

  // Project template form
  const [projectForm, setProjectForm] = useState({
    name: '',
    description: '',
    industry_type: '',
    project_type: ''
  });

  // Task template form
  const [taskForm, setTaskForm] = useState({
    name: '',
    description: '',
    category: 'general' as TaskCategory,
    priority: 'medium',
    estimated_hours: '',
    due_days_from_start: '0',
    phase_order: '0'
  });

  useEffect(() => {
    if (isOpen) {
      loadProjectTemplates();
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedTemplate) {
      loadTaskTemplates(selectedTemplate);
    }
  }, [selectedTemplate]);

  const loadProjectTemplates = async () => {
    if (!userProfile?.company_id) return;

    try {
      const { data } = await supabase
        .from('project_templates')
        .select('*')
        .eq('company_id', userProfile.company_id)
        .order('created_at', { ascending: false });

      setProjectTemplates(data || []);
    } catch (error) {
      console.error('Error loading project templates:', error);
    }
  };

  const loadTaskTemplates = async (templateId: string) => {
    try {
      const { data } = await supabase
        .from('task_templates')
        .select('*')
        .eq('project_template_id', templateId)
        .order('phase_order', { ascending: true });

      setTaskTemplates(data || []);
    } catch (error) {
      console.error('Error loading task templates:', error);
    }
  };

  const createProjectTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile?.company_id || !projectForm.name.trim()) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('project_templates')
        .insert({
          ...projectForm,
          company_id: userProfile.company_id,
          created_by: userProfile.id
        })
        .select()
        .single();

      if (error) throw error;

      setProjectTemplates(prev => [data, ...prev]);
      setProjectForm({ name: '', description: '', industry_type: '', project_type: '' });
      setActiveTab('tasks');
      setSelectedTemplate(data.id);
    } catch (error) {
      console.error('Error creating project template:', error);
    } finally {
      setLoading(false);
    }
  };

  const createTaskTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTemplate || !taskForm.name.trim()) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('task_templates')
        .insert({
          ...taskForm,
          project_template_id: selectedTemplate,
          estimated_hours: taskForm.estimated_hours ? parseFloat(taskForm.estimated_hours) : null,
          due_days_from_start: parseInt(taskForm.due_days_from_start),
          phase_order: parseInt(taskForm.phase_order)
        })
        .select()
        .single();

      if (error) throw error;

      setTaskTemplates(prev => [...prev, data]);
      setTaskForm({
        name: '',
        description: '',
        category: 'general' as TaskCategory,
        priority: 'medium',
        estimated_hours: '',
        due_days_from_start: '0',
        phase_order: '0'
      });
    } catch (error) {
      console.error('Error creating task template:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteProjectTemplate = async (id: string) => {
    if (!confirm('Are you sure? This will delete all associated task templates.')) return;

    try {
      await supabase
        .from('project_templates')
        .delete()
        .eq('id', id);

      setProjectTemplates(prev => prev.filter(t => t.id !== id));
      if (selectedTemplate === id) {
        setSelectedTemplate('');
        setTaskTemplates([]);
      }
    } catch (error) {
      console.error('Error deleting template:', error);
    }
  };

  const deleteTaskTemplate = async (id: string) => {
    if (!confirm('Are you sure you want to delete this task template?')) return;

    try {
      await supabase
        .from('task_templates')
        .delete()
        .eq('id', id);

      setTaskTemplates(prev => prev.filter(t => t.id !== id));
    } catch (error) {
      console.error('Error deleting task template:', error);
    }
  };

  const deployTemplate = async (templateId: string) => {
    // This would typically open a dialog to select a project and deploy the template
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Project & Task Templates</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="templates">Project Templates</TabsTrigger>
            <TabsTrigger value="tasks">Task Templates</TabsTrigger>
          </TabsList>

          <TabsContent value="templates" className="space-y-4">
            {/* Create Project Template Form */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Create Project Template</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={createProjectTemplate} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="template-name">Template Name *</Label>
                      <Input
                        id="template-name"
                        value={projectForm.name}
                        onChange={(e) => setProjectForm(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="e.g., Residential Construction"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="industry-type">Industry Type</Label>
                      <Input
                        id="industry-type"
                        value={projectForm.industry_type}
                        onChange={(e) => setProjectForm(prev => ({ ...prev, industry_type: e.target.value }))}
                        placeholder="e.g., Residential, Commercial"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="template-description">Description</Label>
                    <Textarea
                      id="template-description"
                      value={projectForm.description}
                      onChange={(e) => setProjectForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Template description..."
                      rows={3}
                    />
                  </div>

                  <Button type="submit" disabled={loading}>
                    <Plus className="h-4 w-4 mr-2" />
                    {loading ? 'Creating...' : 'Create Template'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Project Templates List */}
            <div className="space-y-3">
              {projectTemplates.map(template => (
                <Card key={template.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium">{template.name}</h3>
                        {template.description && (
                          <p className="text-sm text-muted-foreground mt-1">{template.description}</p>
                        )}
                        <div className="flex gap-2 mt-2">
                          {template.industry_type && (
                            <Badge variant="outline">{template.industry_type}</Badge>
                          )}
                          {template.project_type && (
                            <Badge variant="outline">{template.project_type}</Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedTemplate(template.id);
                            setActiveTab('tasks');
                          }}
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Edit Tasks
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => deployTemplate(template.id)}
                        >
                          <Copy className="h-3 w-3 mr-1" />
                          Deploy
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => deleteProjectTemplate(template.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="tasks" className="space-y-4">
            {/* Template Selector */}
            <div className="space-y-2">
              <Label htmlFor="template-select">Select Project Template</Label>
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a project template to edit tasks" />
                </SelectTrigger>
                <SelectContent>
                  {projectTemplates.map(template => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedTemplate && (
              <>
                {/* Add Task Template Form */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Add Task Template</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={createTaskTemplate} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="task-name">Task Name *</Label>
                          <Input
                            id="task-name"
                            value={taskForm.name}
                            onChange={(e) => setTaskForm(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="e.g., Site Survey"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="task-category">Category</Label>
                          <Select value={taskForm.category} onValueChange={(value: TaskCategory) => setTaskForm(prev => ({ ...prev, category: value }))}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {TASK_CATEGORIES.map(category => (
                                <SelectItem key={category} value={category}>
                                  {category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="task-priority">Priority</Label>
                          <Select value={taskForm.priority} onValueChange={(value) => setTaskForm(prev => ({ ...prev, priority: value }))}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="low">Low</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="high">High</SelectItem>
                              <SelectItem value="urgent">Urgent</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="due-days">Due Days From Start</Label>
                          <Input
                            id="due-days"
                            type="number"
                            min="0"
                            value={taskForm.due_days_from_start}
                            onChange={(e) => setTaskForm(prev => ({ ...prev, due_days_from_start: e.target.value }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="estimated-hours">Estimated Hours</Label>
                          <Input
                            id="estimated-hours"
                            type="number"
                            step="0.5"
                            min="0"
                            value={taskForm.estimated_hours}
                            onChange={(e) => setTaskForm(prev => ({ ...prev, estimated_hours: e.target.value }))}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="task-description">Description</Label>
                        <Textarea
                          id="task-description"
                          value={taskForm.description}
                          onChange={(e) => setTaskForm(prev => ({ ...prev, description: e.target.value }))}
                          placeholder="Task description..."
                          rows={2}
                        />
                      </div>

                      <Button type="submit" disabled={loading}>
                        <Plus className="h-4 w-4 mr-2" />
                        {loading ? 'Adding...' : 'Add Task'}
                      </Button>
                    </form>
                  </CardContent>
                </Card>

                {/* Task Templates List */}
                <div className="space-y-2">
                  <h3 className="font-medium">Task Templates ({taskTemplates.length})</h3>
                  {taskTemplates.map(task => (
                    <Card key={task.id}>
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-sm">{task.name}</h4>
                            {task.description && (
                              <p className="text-xs text-muted-foreground mt-1">{task.description}</p>
                            )}
                            <div className="flex gap-2 mt-2">
                              <Badge variant="outline" className="text-xs">
                                {task.category.replace('_', ' ')}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {task.priority}
                              </Badge>
                              {task.estimated_hours && (
                                <Badge variant="outline" className="text-xs">
                                  {task.estimated_hours}h
                                </Badge>
                              )}
                              <Badge variant="outline" className="text-xs">
                                Due: Day {task.due_days_from_start}
                              </Badge>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => deleteTaskTemplate(task.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};