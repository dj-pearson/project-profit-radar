import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { integrationService } from '@/services/IntegrationService';
import useRealTimeSync from '@/hooks/useRealTimeSync';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface CrossModuleRelationship {
  id: string;
  source_module: string;
  source_id: string;
  target_module: string;
  target_id: string;
  relationship_type: string;
  created_at: string;
  metadata?: any;
}

export interface NavigationContext {
  currentModule: string;
  currentEntity?: {
    type: string;
    id: string;
    data?: any;
  };
  breadcrumb: Array<{
    label: string;
    path: string;
    module: string;
  }>;
  relatedEntities: CrossModuleRelationship[];
}

export interface PlatformContextType {
  // Navigation context
  navigationContext: NavigationContext;
  setNavigationContext: (context: Partial<NavigationContext>) => void;
  
  // Cross-module relationships
  relationships: CrossModuleRelationship[];
  loadRelationships: (entityType: string, entityId: string) => Promise<void>;
  createRelationship: (relationship: Omit<CrossModuleRelationship, 'id' | 'created_at'>) => Promise<void>;
  
  // Quick actions and workflows
  availableActions: any[];
  triggerWorkflow: (workflowType: string, data: any) => Promise<void>;
  
  // Data synchronization
  syncStatus: 'idle' | 'syncing' | 'error';
  lastSyncTime?: Date;
  
  // Platform metrics
  metrics: {
    totalProjects: number;
    activeOpportunities: number;
    pendingTasks: number;
    recentActivity: any[];
  };
  
  // Utility functions
  navigateWithContext: (path: string, context?: any) => void;
  getRelatedEntities: (entityType: string, entityId: string) => CrossModuleRelationship[];
  refreshPlatformData: () => Promise<void>;
}

const PlatformContext = createContext<PlatformContextType | undefined>(undefined);

export const usePlatform = () => {
  const context = useContext(PlatformContext);
  if (context === undefined) {
    throw new Error('usePlatform must be used within a PlatformProvider');
  }
  return context;
};

interface PlatformProviderProps {
  children: ReactNode;
}

export const PlatformProvider: React.FC<PlatformProviderProps> = ({ children }) => {
  const { userProfile } = useAuth();
  const [navigationContext, setNavigationContextState] = useState<NavigationContext>({
    currentModule: 'dashboard',
    breadcrumb: [],
    relatedEntities: []
  });
  
  const [relationships, setRelationships] = useState<CrossModuleRelationship[]>([]);
  const [availableActions, setAvailableActions] = useState<any[]>([]);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'error'>('idle');
  const [lastSyncTime, setLastSyncTime] = useState<Date>();
  const [metrics, setMetrics] = useState({
    totalProjects: 0,
    activeOpportunities: 0,
    pendingTasks: 0,
    recentActivity: []
  });

  // Real-time sync setup
  const { activeChannels } = useRealTimeSync({
    subscriptions: [
      {
        id: 'platform-sync',
        tables: ['projects', 'opportunities', 'tasks', 'contacts', 'materials', 'material_usage'],
        onSync: (event) => {
          handleRealTimeUpdate(event);
        }
      }
    ],
    enableCrossModuleSync: true,
    enableNotifications: true,
    onError: (error) => {
      console.error('Real-time sync error:', error);
      setSyncStatus('error');
    }
  });

  const handleRealTimeUpdate = (event: any) => {
    setSyncStatus('syncing');
    setLastSyncTime(new Date());
    
    // Refresh related data based on the event
    if (navigationContext.currentEntity && 
        event.table === getTableFromEntityType(navigationContext.currentEntity.type)) {
      loadRelationships(navigationContext.currentEntity.type, navigationContext.currentEntity.id);
    }
    
    // Update platform metrics
    loadPlatformMetrics();
    
    setTimeout(() => setSyncStatus('idle'), 1000);
  };

  const setNavigationContext = (context: Partial<NavigationContext>) => {
    setNavigationContextState(prev => ({
      ...prev,
      ...context
    }));

    // Load related entities when context changes
    if (context.currentEntity) {
      loadRelationships(context.currentEntity.type, context.currentEntity.id);
      generateAvailableActions(context.currentEntity);
    }
  };

  const loadRelationships = async (entityType: string, entityId: string) => {
    try {
      const relatedData: CrossModuleRelationship[] = [];

      // Load different types of relationships based on entity type
      switch (entityType) {
        case 'opportunity':
          // Find related projects
          const { data: projects } = await supabase
            .from('projects')
            .select('id, name, status')
            .eq('opportunity_id', entityId);

          projects?.forEach(project => {
            relatedData.push({
              id: `opp-proj-${project.id}`,
              source_module: 'crm',
              source_id: entityId,
              target_module: 'projects',
              target_id: project.id,
              relationship_type: 'created_from',
              created_at: new Date().toISOString(),
              metadata: { name: project.name, status: project.status }
            });
          });
          break;

        case 'project':
          // Find related opportunity
          const { data: project } = await supabase
            .from('projects')
            .select('opportunity_id')
            .eq('id', entityId)
            .single();

          if (project?.opportunity_id) {
            const { data: opportunity } = await supabase
              .from('opportunities')
              .select('id, name, status')
              .eq('id', project.opportunity_id)
              .single();

            if (opportunity) {
              relatedData.push({
                id: `proj-opp-${opportunity.id}`,
                source_module: 'projects',
                source_id: entityId,
                target_module: 'crm',
                target_id: opportunity.id,
                relationship_type: 'originated_from',
                created_at: new Date().toISOString(),
                metadata: { name: opportunity.name, status: opportunity.status }
              });
            }
          }

          // Find related invoices
          const { data: invoices } = await supabase
            .from('invoices')
            .select('id, amount, status')
            .eq('project_id', entityId);

          invoices?.forEach(invoice => {
            relatedData.push({
              id: `proj-inv-${invoice.id}`,
              source_module: 'projects',
              source_id: entityId,
              target_module: 'financial',
              target_id: invoice.id,
              relationship_type: 'generated',
              created_at: new Date().toISOString(),
              metadata: { amount: invoice.amount, status: invoice.status }
            });
          });
          break;

        case 'contact':
          // Find related opportunities and projects
          const { data: contactOpportunities } = await supabase
            .from('opportunities')
            .select('id, name, status')
            .eq('contact_id', entityId);

          contactOpportunities?.forEach(opp => {
            relatedData.push({
              id: `contact-opp-${opp.id}`,
              source_module: 'crm',
              source_id: entityId,
              target_module: 'crm',
              target_id: opp.id,
              relationship_type: 'associated_with',
              created_at: new Date().toISOString(),
              metadata: { name: opp.name, status: opp.status, type: 'opportunity' }
            });
          });
          break;
      }

      setRelationships(relatedData);
      
      // Update navigation context with related entities
      setNavigationContextState(prev => ({
        ...prev,
        relatedEntities: relatedData
      }));

    } catch (error) {
      console.error('Error loading relationships:', error);
    }
  };

  const createRelationship = async (relationship: Omit<CrossModuleRelationship, 'id' | 'created_at'>) => {
    try {
      const newRelationship: CrossModuleRelationship = {
        ...relationship,
        id: `${relationship.source_module}-${relationship.target_module}-${Date.now()}`,
        created_at: new Date().toISOString()
      };

      setRelationships(prev => [...prev, newRelationship]);

      // Optionally store in database for persistence
      await supabase
        .from('cross_module_relationships')
        .insert([newRelationship]);

    } catch (error) {
      console.error('Error creating relationship:', error);
    }
  };

  const generateAvailableActions = (entity: { type: string; id: string; data?: any }) => {
    const actions: any[] = [];

    switch (entity.type) {
      case 'opportunity':
        if (entity.data?.status === 'won') {
          actions.push({
            id: 'create-project',
            title: 'Create Project',
            description: 'Convert this opportunity to a project',
            action: () => integrationService.createProjectFromOpportunity({ opportunityId: entity.id }),
            priority: 'high'
          });
        }
        break;

      case 'project':
        if (entity.data?.status === 'active' || entity.data?.status === 'in_progress') {
          actions.push({
            id: 'create-invoice',
            title: 'Create Invoice',
            description: 'Generate invoice from project costs',
            action: () => integrationService.createInvoiceFromProject(entity.id),
            priority: 'medium'
          });
        }
        break;
    }

    setAvailableActions(actions);
  };

  const triggerWorkflow = async (workflowType: string, data: any) => {
    try {
      setSyncStatus('syncing');
      
      switch (workflowType) {
        case 'opportunity_to_project':
          await integrationService.createProjectFromOpportunity(data);
          break;
        case 'project_to_invoice':
          await integrationService.createInvoiceFromProject(data.projectId);
          break;
        case 'sync_contact':
          await integrationService.syncContactAcrossModules(data);
          break;
        default:
          throw new Error(`Unknown workflow type: ${workflowType}`);
      }
      
      toast({
        title: "Workflow Completed",
        description: `${workflowType.replace('_', ' ')} completed successfully`,
      });
      
    } catch (error: any) {
      console.error('Error triggering workflow:', error);
      setSyncStatus('error');
      toast({
        title: "Workflow Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setTimeout(() => setSyncStatus('idle'), 1000);
    }
  };

  const loadPlatformMetrics = async () => {
    if (!userProfile?.company_id) return;

    try {
      const [projectsRes, opportunitiesRes, tasksRes, activityRes] = await Promise.all([
        supabase
          .from('projects')
          .select('id, status')
          .eq('company_id', userProfile.company_id),
        supabase
          .from('opportunities')
          .select('id, status')
          .eq('company_id', userProfile.company_id)
          .in('status', ['qualified', 'proposal_sent', 'negotiating']),
        supabase
          .from('tasks')
          .select('id, status')
          .eq('company_id', userProfile.company_id)
          .neq('status', 'completed'),
        supabase
          .from('activity_feed')
          .select('*')
          .eq('company_id', userProfile.company_id)
          .order('created_at', { ascending: false })
          .limit(10)
      ]);

      setMetrics({
        totalProjects: projectsRes.data?.length || 0,
        activeOpportunities: opportunitiesRes.data?.length || 0,
        pendingTasks: tasksRes.data?.length || 0,
        recentActivity: activityRes.data || []
      });

    } catch (error) {
      console.error('Error loading platform metrics:', error);
    }
  };

  const navigateWithContext = (path: string, context?: any) => {
    // This would integrate with React Router to navigate while preserving context
    if (context) {
      setNavigationContext(context);
    }
    window.location.href = path; // Simplified - would use proper navigation
  };

  const getRelatedEntities = (entityType: string, entityId: string) => {
    return relationships.filter(rel => 
      (rel.source_id === entityId && getEntityTypeFromTable(rel.source_module) === entityType) ||
      (rel.target_id === entityId && getEntityTypeFromTable(rel.target_module) === entityType)
    );
  };

  const refreshPlatformData = async () => {
    setSyncStatus('syncing');
    try {
      await loadPlatformMetrics();
      if (navigationContext.currentEntity) {
        await loadRelationships(navigationContext.currentEntity.type, navigationContext.currentEntity.id);
      }
    } finally {
      setSyncStatus('idle');
      setLastSyncTime(new Date());
    }
  };

  // Utility functions
  const getTableFromEntityType = (entityType: string): string => {
    const mapping: Record<string, string> = {
      'opportunity': 'opportunities',
      'project': 'projects',
      'contact': 'contacts',
      'task': 'tasks',
      'material': 'materials',
      'invoice': 'invoices'
    };
    return mapping[entityType] || entityType;
  };

  const getEntityTypeFromTable = (tableName: string): string => {
    const mapping: Record<string, string> = {
      'opportunities': 'opportunity',
      'projects': 'project',
      'contacts': 'contact',
      'tasks': 'task',
      'materials': 'material',
      'invoices': 'invoice'
    };
    return mapping[tableName] || tableName;
  };

  // Load initial data
  useEffect(() => {
    if (userProfile?.company_id) {
      loadPlatformMetrics();
    }
  }, [userProfile?.company_id]);

  const value: PlatformContextType = {
    navigationContext,
    setNavigationContext,
    relationships,
    loadRelationships,
    createRelationship,
    availableActions,
    triggerWorkflow,
    syncStatus,
    lastSyncTime,
    metrics,
    navigateWithContext,
    getRelatedEntities,
    refreshPlatformData
  };

  return (
    <PlatformContext.Provider value={value}>
      {children}
    </PlatformContext.Provider>
  );
};

export default PlatformProvider;
