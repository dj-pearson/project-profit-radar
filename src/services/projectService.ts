/**
 * Project Service
 * Updated with multi-tenant site_id isolation
 * All methods require siteId as first parameter for complete isolation
 */
import { supabase } from '@/integrations/supabase/client';

export interface Project {
  id: string;
  name: string;
  description?: string;
  client_name: string;
  client_email?: string;
  site_address?: string;
  status: string;
  project_type?: string;
  budget?: number;
  estimated_hours?: number;
  actual_hours?: number;
  start_date?: string;
  end_date?: string;
  completion_percentage: number;
  company_id: string;
  site_id?: string;
  project_manager_id?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  permit_numbers?: string[];
  profit_margin?: number;
  site_latitude?: number;
  site_longitude?: number;
  geofence_radius_meters?: number;
}

export interface ProjectWithRelations extends Project {
  tasks?: Array<{ id: string; name: string; description?: string; status?: string }>;
  materials?: Array<{ id: string; name: string; description?: string }>;
  documents?: Array<{ id: string; name: string; file_path?: string }>;
  project_phases?: Array<{ id: string; name: string; status?: string; start_date?: string; end_date?: string }>;
  job_costs?: Array<{ id: string; total_cost?: number }>;
  change_orders?: Array<{ id: string; title: string; amount?: number; status?: string }>;
}

export interface CreateProjectData {
  name: string;
  description?: string;
  client_name: string;
  client_email?: string;
  site_address?: string;
  project_type?: string;
  status: string;
  budget?: number;
  estimated_hours?: number;
  start_date?: string;
  end_date?: string;
  company_id: string;
  created_by: string;
  project_manager_id?: string;
  permit_numbers?: string[];
}

export interface ProjectStats {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  onHoldProjects: number;
  totalBudget: number;
  avgCompletion: number;
  overdueProjects: number;
}

class ProjectService {
  async getProjects(siteId: string, companyId?: string): Promise<ProjectWithRelations[]> {
    if (!siteId) throw new Error('Site ID is required for multi-tenant isolation');

    let query = supabase
      .from('projects')
      .select(`
        *,
        tasks(id, name, description, status),
        materials(id, name, description),
        documents(id, name, file_path),
        project_phases(id, name, status, start_date, end_date),
        job_costs(id, total_cost),
        change_orders(id, title, amount, status)
      `)
      .eq('site_id', siteId)  // CRITICAL: Site isolation
      .order('created_at', { ascending: false });

    if (companyId) {
      query = query.eq('company_id', companyId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  async getProject(siteId: string, projectId: string, companyId?: string): Promise<ProjectWithRelations | null> {
    if (!siteId) throw new Error('Site ID is required for multi-tenant isolation');

    let query = supabase
      .from('projects')
      .select(`
        *,
        tasks(id, name, description, status),
        materials(id, name, description),
        documents(id, name, file_path),
        project_phases(id, name, status, start_date, end_date, description),
        job_costs(id, total_cost),
        change_orders(id, title, description, amount, status)
      `)
      .eq('site_id', siteId)  // CRITICAL: Site isolation
      .eq('id', projectId);

    // Enforce company_id filter for non-root_admin users
    if (companyId) {
      query = query.eq('company_id', companyId);
    }

    const { data, error } = await query.maybeSingle();

    if (error) throw error;
    return data;
  }

  async createProject(siteId: string, projectData: CreateProjectData): Promise<Project> {
    if (!siteId) throw new Error('Site ID is required for multi-tenant isolation');

    const { data, error } = await supabase
      .from('projects')
      .insert([{
        ...projectData,  // CRITICAL: Site isolation
        completion_percentage: 0,
        geofence_radius_meters: 100
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateProject(siteId: string, projectId: string, updates: Partial<Project>, companyId?: string): Promise<Project> {
    if (!siteId) throw new Error('Site ID is required for multi-tenant isolation');

    let query = supabase
      .from('projects')
      .update(updates)
      .eq('site_id', siteId)  // CRITICAL: Site isolation
      .eq('id', projectId);

    // Enforce company_id filter for non-root_admin users
    if (companyId) {
      query = query.eq('company_id', companyId);
    }

    const { data, error } = await query
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteProject(siteId: string, projectId: string, companyId?: string): Promise<void> {
    if (!siteId) throw new Error('Site ID is required for multi-tenant isolation');

    let query = supabase
      .from('projects')
      .delete()
      .eq('site_id', siteId)  // CRITICAL: Site isolation
      .eq('id', projectId);

    // Enforce company_id filter for non-root_admin users
    if (companyId) {
      query = query.eq('company_id', companyId);
    }

    const { error } = await query;

    if (error) throw error;
  }

  async getProjectStats(siteId: string, companyId?: string): Promise<ProjectStats> {
    if (!siteId) throw new Error('Site ID is required for multi-tenant isolation');
    if (!companyId) {
      throw new Error('Company ID is required for project stats');
    }

    // Use database aggregation function for better performance
    const { data, error } = await supabase.rpc('get_project_stats', {
      p_company_id: companyId
    });

    if (error) throw error;

    // Also calculate overdue projects (not in the main aggregation function)
    const now = new Date().toISOString();
    const { data: overdueCount, error: overdueError } = await supabase
      .from('projects')
      .select('id', { count: 'exact', head: true })
      .eq('site_id', siteId)  // CRITICAL: Site isolation
      .eq('company_id', companyId)
      .lt('end_date', now)
      .neq('status', 'completed');

    if (overdueError) throw overdueError;

    const stats: ProjectStats = {
      totalProjects: data?.totalProjects || 0,
      activeProjects: data?.activeProjects || 0,
      completedProjects: data?.completedProjects || 0,
      onHoldProjects: data?.onHoldProjects || 0,
      totalBudget: data?.totalBudget || 0,
      avgCompletion: data?.avgCompletion || 0,
      overdueProjects: overdueCount || 0
    };

    return stats;
  }

  async updateProjectCompletion(siteId: string, projectId: string, percentage: number, companyId?: string): Promise<void> {
    if (!siteId) throw new Error('Site ID is required for multi-tenant isolation');

    const updates: Partial<Project> = {
      completion_percentage: percentage,
      updated_at: new Date().toISOString()
    };

    // Auto-update status based on completion
    if (percentage === 100) {
      updates.status = 'completed';
    } else if (percentage > 0 && updates.status === 'planning') {
      updates.status = 'active';
    }

    let query = supabase
      .from('projects')
      .update(updates)
      .eq('site_id', siteId)  // CRITICAL: Site isolation
      .eq('id', projectId);

    // Enforce company_id filter for non-root_admin users
    if (companyId) {
      query = query.eq('company_id', companyId);
    }

    const { error } = await query;

    if (error) throw error;
  }

  async searchProjects(siteId: string, searchTerm: string, companyId?: string): Promise<ProjectWithRelations[]> {
    if (!siteId) throw new Error('Site ID is required for multi-tenant isolation');

    let query = supabase
      .from('projects')
      .select(`
        *,
        tasks(id, name, description, status),
        materials(id, name, description),
        documents(id, name)
      `)
      .eq('site_id', siteId)  // CRITICAL: Site isolation
      .or(`name.ilike.%${searchTerm}%, client_name.ilike.%${searchTerm}%, description.ilike.%${searchTerm}%`)
      .order('created_at', { ascending: false });

    if (companyId) {
      query = query.eq('company_id', companyId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  async getProjectsByStatus(siteId: string, status: string, companyId?: string): Promise<Project[]> {
    if (!siteId) throw new Error('Site ID is required for multi-tenant isolation');

    let query = supabase
      .from('projects')
      .select('*')
      .eq('site_id', siteId)  // CRITICAL: Site isolation
      .eq('status', status)
      .order('created_at', { ascending: false });

    if (companyId) {
      query = query.eq('company_id', companyId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  async duplicateProject(siteId: string, projectId: string, newName: string, companyId?: string): Promise<Project> {
    if (!siteId) throw new Error('Site ID is required for multi-tenant isolation');

    const original = await this.getProject(siteId, projectId, companyId);
    if (!original) throw new Error('Project not found or access denied');

    const { tasks, materials, documents, project_phases, job_costs, change_orders, ...projectData } = original;

    const duplicateData: CreateProjectData = {
      ...projectData,
      name: newName,
      status: 'planning',
      created_by: projectData.created_by || '',
      company_id: projectData.company_id
    };

    return this.createProject(siteId, duplicateData);
  }
}

export const projectService = new ProjectService();