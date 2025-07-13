import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface CreateTaskDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onTaskCreated: () => void;
  projectId?: string;
}

interface Project {
  id: string;
  name: string;
}

interface User {
  id: string;
  first_name: string;
  last_name: string;
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

export const CreateTaskDialog: React.FC<CreateTaskDialogProps> = ({
  isOpen,
  onClose,
  onTaskCreated,
  projectId
}) => {
  const { userProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'general' as TaskCategory,
    priority: 'medium',
    project_id: '',
    assigned_to: '',
    due_date: '',
    estimated_hours: ''
  });

  useEffect(() => {
    if (isOpen) {
      loadProjects();
      loadUsers();
    }
  }, [isOpen, userProfile]);

  const loadProjects = async () => {
    if (!userProfile?.company_id) return;

    try {
      const { data } = await supabase
        .from('projects')
        .select('id, name')
        .eq('company_id', userProfile.company_id)
        .order('name');

      setProjects(data || []);
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };

  const loadUsers = async () => {
    if (!userProfile?.company_id) return;

    try {
      const { data } = await supabase
        .from('user_profiles')
        .select('id, first_name, last_name')
        .eq('company_id', userProfile.company_id)
        .order('first_name');

      setUsers(data || []);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile?.company_id || !formData.name.trim() || !formData.project_id) return;

    setLoading(true);

    try {
      const taskData = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        category: formData.category,
        priority: formData.priority,
        project_id: projectId || formData.project_id,
        assigned_to: formData.assigned_to || userProfile.id,
        due_date: formData.due_date || null,
        estimated_hours: formData.estimated_hours ? parseFloat(formData.estimated_hours) : null,
        status: 'todo',
        company_id: userProfile.company_id
      };

      const { error } = await supabase
        .from('tasks')
        .insert(taskData);

      if (error) throw error;

      onTaskCreated();
      onClose();
      resetForm();
    } catch (error) {
      console.error('Error creating task:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category: 'general',
      priority: 'medium',
      project_id: '',
      assigned_to: '',
      due_date: '',
      estimated_hours: ''
    });
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <div className="max-h-[calc(90vh-4rem)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Task</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Task Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter task name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Task description (optional)"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
            <Select value={formData.category} onValueChange={(value: TaskCategory) => setFormData(prev => ({ ...prev, category: value }))}>
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

            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select value={formData.priority} onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value }))}>
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
          </div>

          <div className="space-y-2">
            <Label htmlFor="project">Project *</Label>
            <Select value={formData.project_id} onValueChange={(value) => setFormData(prev => ({ ...prev, project_id: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select a project" />
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

          <div className="space-y-2">
            <Label htmlFor="assigned_to">Assigned To</Label>
            <Select value={formData.assigned_to} onValueChange={(value) => setFormData(prev => ({ ...prev, assigned_to: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Assign to..." />
              </SelectTrigger>
              <SelectContent>
                {users.map(user => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.first_name} {user.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="due_date">Due Date</Label>
              <Input
                id="due_date"
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="estimated_hours">Estimated Hours</Label>
              <Input
                id="estimated_hours"
                type="number"
                step="0.5"
                min="0"
                value={formData.estimated_hours}
                onChange={(e) => setFormData(prev => ({ ...prev, estimated_hours: e.target.value }))}
                placeholder="0"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={handleClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Creating...' : 'Create Task'}
            </Button>
          </div>
        </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};