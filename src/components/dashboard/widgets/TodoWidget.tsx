import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';

interface Todo {
  id: string;
  title: string;
  completed: boolean;
  due_date?: string;
  project_name?: string;
}

export const TodoWidget = () => {
  const { userProfile } = useAuth();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTodo, setNewTodo] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTodos();
  }, [userProfile]);

  const loadTodos = async () => {
    if (!userProfile?.company_id) return;

    try {
      // Load incomplete tasks from projects
      const { data: tasks } = await supabase
        .from('tasks')
        .select(`
          id,
          name,
          status,
          due_date,
          project:projects(name)
        `)
        .eq('assigned_to', userProfile.id)
        .neq('status', 'completed')
        .order('due_date', { ascending: true, nullsFirst: false })
        .limit(5);

      const mappedTodos: Todo[] = (tasks || []).map(task => ({
        id: task.id,
        title: task.name,
        completed: task.status === 'completed',
        due_date: task.due_date,
        project_name: task.project?.name
      }));

      setTodos(mappedTodos);
    } catch (error) {
      console.error('Error loading todos:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleTodo = async (id: string, completed: boolean) => {
    try {
      await supabase
        .from('tasks')
        .update({ status: completed ? 'completed' : 'in_progress' })
        .eq('id', id);

      setTodos(prev => 
        prev.map(todo => 
          todo.id === id ? { ...todo, completed } : todo
        )
      );
    } catch (error) {
      console.error('Error updating todo:', error);
    }
  };

  const addTodo = async () => {
    if (!newTodo.trim() || !userProfile?.company_id) return;

    try {
      // Get a project to associate the task with (required field)
      const { data: projects } = await supabase
        .from('projects')
        .select('id')
        .eq('company_id', userProfile.company_id)
        .limit(1);

      if (!projects || projects.length === 0) {
        console.warn('No projects found to associate task with');
        return;
      }

      const { data } = await supabase
        .from('tasks')
        .insert({
          name: newTodo,
          status: 'todo',
          assigned_to: userProfile.id,
          company_id: userProfile.company_id,
          project_id: projects[0].id
        })
        .select()
        .single();

      if (data) {
        setTodos(prev => [...prev, {
          id: data.id,
          title: data.name,
          completed: false
        }]);
        setNewTodo('');
      }
    } catch (error) {
      console.error('Error adding todo:', error);
    }
  };

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading tasks...</div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          value={newTodo}
          onChange={(e) => setNewTodo(e.target.value)}
          placeholder="Add a task..."
          className="text-xs"
          onKeyPress={(e) => e.key === 'Enter' && addTodo()}
        />
        <Button size="sm" onClick={addTodo} className="shrink-0">
          <Plus className="h-3 w-3" />
        </Button>
      </div>
      
      <div className="space-y-2">
        {todos.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground py-4">
            No pending tasks
          </div>
        ) : (
          todos.map((todo) => (
            <div key={todo.id} className="flex items-start gap-2">
              <Checkbox
                checked={todo.completed}
                onCheckedChange={(checked) => toggleTodo(todo.id, !!checked)}
                className="mt-0.5"
              />
              <div className="flex-1 min-w-0">
                <p className={`text-xs ${todo.completed ? 'line-through text-muted-foreground' : ''}`}>
                  {todo.title}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  {todo.project_name && (
                    <Badge variant="outline" className="text-xs">
                      {todo.project_name}
                    </Badge>
                  )}
                  {todo.due_date && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(todo.due_date), 'MMM d')}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};