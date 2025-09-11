import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Task {
  id: string;
  company_id: string;
  project_id: string;
  assigned_to: string | null;
  created_by: string | null;
  name: string;
  description?: string | null;
  status: string | null;
  priority: string | null;
  due_date?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  estimated_hours?: number | null;
  actual_hours?: number | null;
  completion_percentage?: number | null;
  tags: string[] | null;
  category: string | null;
  dependencies: string[] | null;
  is_milestone?: boolean | null;
  is_critical_path?: boolean | null;
  duration_days?: number | null;
  created_at: string;
  updated_at: string;
}

export interface TaskWithDetails extends Task {
  project_name?: string;
  assigned_to_profile?: {
    first_name: string;
    last_name: string;
    email: string;
  } | null;
  created_by_profile?: {
    first_name: string;
    last_name: string;
    email: string;
  } | null;
}

export interface CreateTaskData {
  name: string;
  description?: string;
  assigned_to?: string;
  project_id: string;
  priority?: string;
  due_date?: string;
  estimated_hours?: number;
  tags?: string[];
  category?: 'general' | 'permit' | 'estimate' | 'inspection' | 'material_order' | 'labor' | 'safety' | 'quality_control' | 'client_communication' | 'documentation' | 'financial' | 'equipment';
}

export interface UpdateTaskData {
  name?: string;
  description?: string;
  assigned_to?: string;
  project_id?: string;
  status?: string;
  priority?: string;
  due_date?: string;
  estimated_hours?: number;
  actual_hours?: number;
  completion_percentage?: number;
  tags?: string[];
}

class TaskService {
  async getTasks(filters?: {
    status?: string[];
    assigned_to?: string;
    project_id?: string;
    search?: string;
  }): Promise<TaskWithDetails[]> {
    // Basic fetch without embedded relationships to avoid 400 errors from PostgREST
    let query = supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters?.status && filters.status.length > 0) {
      query = query.in('status', filters.status);
    }
    if (filters?.assigned_to) {
      query = query.eq('assigned_to', filters.assigned_to);
    }
    if (filters?.project_id) {
      query = query.eq('project_id', filters.project_id);
    }
    if (filters?.search) {
      query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(`Error fetching tasks: ${error.message}`);
    }

    const tasks = (data || []) as Task[];
    if (tasks.length === 0) return [];

    // Fetch related project names and user profiles in parallel
    const projectIds = Array.from(new Set(tasks.map(t => t.project_id).filter(Boolean))) as string[];
    const userIds = Array.from(
      new Set(
        tasks
          .flatMap(t => [t.assigned_to, t.created_by])
          .filter((v): v is string => !!v)
      )
    );

    const [projectsRes, profilesRes] = await Promise.all([
      projectIds.length
        ? supabase.from('projects').select('id, name').in('id', projectIds)
        : Promise.resolve({ data: [], error: null } as { data: any[]; error: null }),
      userIds.length
        ? supabase.from('user_profiles').select('id, first_name, last_name, email').in('id', userIds)
        : Promise.resolve({ data: [], error: null } as { data: any[]; error: null }),
    ]);

    const projectsMap = new Map<string, { id: string; name: string }>();
    if (!projectsRes.error && projectsRes.data) {
      for (const p of projectsRes.data as any[]) projectsMap.set(p.id, p);
    }

    const profilesMap = new Map<string, { first_name: string; last_name: string; email: string }>();
    if (!profilesRes.error && profilesRes.data) {
      for (const u of profilesRes.data as any[]) profilesMap.set(u.id, u);
    }

    return tasks.map(task => ({
      ...task,
      project_name: task.project_id ? projectsMap.get(task.project_id)?.name || null : null,
      assigned_to_profile: task.assigned_to ? profilesMap.get(task.assigned_to) || null : null,
      created_by_profile: task.created_by ? profilesMap.get(task.created_by) || null : null,
      tags: task.tags || [],
    }));
  }

  async getTask(id: string): Promise<TaskWithDetails | null> {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw new Error(`Error fetching task: ${error.message}`);
    }

    if (!data) return null;

    const task = data as Task;

    const projectPromise = task.project_id
      ? supabase.from('projects').select('id, name').eq('id', task.project_id).maybeSingle()
      : Promise.resolve({ data: null, error: null } as { data: any; error: null });

    const userIds = [task.assigned_to, task.created_by].filter((v): v is string => !!v);
    const profilesPromise = userIds.length
      ? supabase.from('user_profiles').select('id, first_name, last_name, email').in('id', userIds)
      : Promise.resolve({ data: [], error: null } as { data: any[]; error: null });

    const [projectRes, profilesRes] = await Promise.all([projectPromise, profilesPromise]);

    const profilesMap = new Map<string, { first_name: string; last_name: string; email: string }>();
    if (!profilesRes.error && profilesRes.data) {
      for (const u of profilesRes.data as any[]) profilesMap.set(u.id, u);
    }

    return {
      ...task,
      project_name: projectRes.data?.name || null,
      assigned_to_profile: task.assigned_to ? profilesMap.get(task.assigned_to) || null : null,
      created_by_profile: task.created_by ? profilesMap.get(task.created_by) || null : null,
      tags: task.tags || [],
    };
  }

  async createTask(taskData: CreateTaskData): Promise<Task> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('company_id')
      .eq('id', user.id)
      .single();

    if (!userProfile) throw new Error('User profile not found');

    const { data, error } = await supabase
      .from('tasks')
      .insert({
        ...taskData,
        company_id: userProfile.company_id,
        created_by: user.id,
        assigned_to: taskData.assigned_to || user.id,
        tags: taskData.tags || [],
        status: 'open'
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Error creating task: ${error.message}`);
    }

    return data;
  }

  async updateTask(id: string, updates: UpdateTaskData): Promise<Task> {
    const { data, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Error updating task: ${error.message}`);
    }

    return data;
  }

  async deleteTask(id: string): Promise<void> {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Error deleting task: ${error.message}`);
    }
  }

  async getTaskComments(taskId: string) {
    const { data, error } = await supabase
      .from('task_comments')
      .select(`
        *,
        user_profiles!task_comments_user_id_fkey(first_name, last_name, email)
      `)
      .eq('task_id', taskId)
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Error fetching task comments: ${error.message}`);
    }

    return data || [];
  }

  async addTaskComment(taskId: string, comment: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('task_comments')
      .insert({
        task_id: taskId,
        user_id: user.id,
        comment
      })
      .select(`
        *,
        user_profiles!task_comments_user_id_fkey(first_name, last_name, email)
      `)
      .single();

    if (error) {
      throw new Error(`Error adding task comment: ${error.message}`);
    }

    return data;
  }

  async getMyTasks(status?: string[]): Promise<TaskWithDetails[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    return this.getTasks({
      assigned_to: user.id,
      status
    });
  }

  async getTasksCreatedByMe(status?: string[]): Promise<TaskWithDetails[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    let query = supabase
      .from('tasks')
      .select('*')
      .eq('created_by', user.id)
      .order('created_at', { ascending: false });

    if (status && status.length > 0) {
      query = query.in('status', status);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Error fetching created tasks: ${error.message}`);
    }

    const tasks = (data || []) as Task[];
    if (tasks.length === 0) return [];

    const projectIds = Array.from(new Set(tasks.map(t => t.project_id).filter(Boolean))) as string[];
    const userIds = Array.from(
      new Set(
        tasks
          .flatMap(t => [t.assigned_to, t.created_by])
          .filter((v): v is string => !!v)
      )
    );

    const [projectsRes, profilesRes] = await Promise.all([
      projectIds.length
        ? supabase.from('projects').select('id, name').in('id', projectIds)
        : Promise.resolve({ data: [], error: null } as { data: any[]; error: null }),
      userIds.length
        ? supabase.from('user_profiles').select('id, first_name, last_name, email').in('id', userIds)
        : Promise.resolve({ data: [], error: null } as { data: any[]; error: null }),
    ]);

    const projectsMap = new Map<string, { id: string; name: string }>();
    if (!projectsRes.error && projectsRes.data) {
      for (const p of projectsRes.data as any[]) projectsMap.set(p.id, p);
    }

    const profilesMap = new Map<string, { first_name: string; last_name: string; email: string }>();
    if (!profilesRes.error && profilesRes.data) {
      for (const u of profilesRes.data as any[]) profilesMap.set(u.id, u);
    }

    return tasks.map(task => ({
      ...task,
      project_name: task.project_id ? projectsMap.get(task.project_id)?.name || null : null,
      assigned_to_profile: task.assigned_to ? profilesMap.get(task.assigned_to) || null : null,
      created_by_profile: task.created_by ? profilesMap.get(task.created_by) || null : null,
      tags: task.tags || []
    }));
  }
}

export const taskService = new TaskService();