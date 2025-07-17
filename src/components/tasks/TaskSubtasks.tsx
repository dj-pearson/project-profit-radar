import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { Trash2, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Subtask {
  id: string;
  title: string;
  completed: boolean;
  order_index: number;
  created_at: string;
}

interface TaskSubtasksProps {
  taskId: string;
  onSubtaskUpdate?: () => void;
}

export const TaskSubtasks: React.FC<TaskSubtasksProps> = ({ taskId, onSubtaskUpdate }) => {
  const { userProfile } = useAuth();
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSubtasks();
  }, [taskId]);

  const loadSubtasks = async () => {
    try {
      const { data } = await supabase
        .from('task_subtasks')
        .select('*')
        .eq('parent_task_id', taskId)
        .order('order_index', { ascending: true });

      setSubtasks(data || []);
    } catch (error) {
      console.error('Error loading subtasks:', error);
    }
  };

  const handleAddSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtaskTitle.trim() || !userProfile) return;

    setLoading(true);
    try {
      const nextOrder = Math.max(...subtasks.map(s => s.order_index), 0) + 1;
      
      const { error } = await supabase
        .from('task_subtasks')
        .insert({
          parent_task_id: taskId,
          title: newSubtaskTitle.trim(),
          completed: false,
          order_index: nextOrder
        });

      if (!error) {
        setNewSubtaskTitle('');
        loadSubtasks();
        onSubtaskUpdate?.();
      }
    } catch (error) {
      console.error('Error creating subtask:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleComplete = async (subtaskId: string, completed: boolean) => {
    try {
      const { error } = await supabase
        .from('task_subtasks')
        .update({ completed: !completed })
        .eq('id', subtaskId);

      if (!error) {
        loadSubtasks();
        onSubtaskUpdate?.();
      }
    } catch (error) {
      console.error('Error updating subtask:', error);
    }
  };

  const handleDelete = async (subtaskId: string) => {
    if (!confirm('Are you sure you want to delete this subtask?')) return;

    try {
      const { error } = await supabase
        .from('task_subtasks')
        .delete()
        .eq('id', subtaskId);

      if (!error) {
        loadSubtasks();
        onSubtaskUpdate?.();
      }
    } catch (error) {
      console.error('Error deleting subtask:', error);
    }
  };

  const completedCount = subtasks.filter(s => s.completed).length;
  const totalCount = subtasks.length;
  const progressPercentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <div className="space-y-4">
      {/* Progress Bar */}
      {totalCount > 0 && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progress</span>
            <span>{completedCount} of {totalCount} completed</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>
      )}

      {/* Add Subtask Form */}
      <form onSubmit={handleAddSubtask} className="flex gap-2">
        <Input
          value={newSubtaskTitle}
          onChange={(e) => setNewSubtaskTitle(e.target.value)}
          placeholder="Add a subtask..."
          className="flex-1"
        />
        <Button type="submit" disabled={loading || !newSubtaskTitle.trim()}>
          <Plus className="h-4 w-4" />
        </Button>
      </form>

      {/* Subtasks List */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {subtasks.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No subtasks yet. Add subtasks to break down this task.
          </p>
        ) : (
          subtasks.map((subtask) => (
            <Card key={subtask.id} className={subtask.completed ? 'opacity-75' : ''}>
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={subtask.completed}
                    onCheckedChange={() => handleToggleComplete(subtask.id, subtask.completed)}
                  />
                  <span 
                    className={`flex-1 text-sm ${
                      subtask.completed ? 'line-through text-muted-foreground' : ''
                    }`}
                  >
                    {subtask.title}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                    onClick={() => handleDelete(subtask.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};