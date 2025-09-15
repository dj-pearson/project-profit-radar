import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';

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
  navigationContext: NavigationContext;
  setNavigationContext: (context: Partial<NavigationContext>) => void;
  relationships: CrossModuleRelationship[];
  loadRelationships: (entityType: string, entityId: string) => Promise<void>;
  createRelationship: (relationship: Omit<CrossModuleRelationship, 'id' | 'created_at'>) => Promise<void>;
  availableActions: any[];
  triggerWorkflow: (workflowType: string, data: any) => Promise<void>;
  syncStatus: 'idle' | 'syncing' | 'error';
  lastSyncTime?: Date;
  metrics: {
    totalProjects: number;
    activeOpportunities: number;
    pendingTasks: number;
    recentActivity: any[];
  };
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

  const setNavigationContext = (context: Partial<NavigationContext>) => {
    setNavigationContextState(prev => ({
      ...prev,
      ...context
    }));
  };

  const loadRelationships = async (entityType: string, entityId: string) => {
    // Simplified - just set empty relationships to avoid type issues
    setRelationships([]);
  };

  const createRelationship = async (relationship: Omit<CrossModuleRelationship, 'id' | 'created_at'>) => {
    const newRelationship: CrossModuleRelationship = {
      ...relationship,
      id: `${relationship.source_module}-${relationship.target_module}-${Date.now()}`,
      created_at: new Date().toISOString()
    };
    setRelationships(prev => [...prev, newRelationship]);
  };

  const triggerWorkflow = async (workflowType: string, data: any) => {
    setSyncStatus('syncing');
    // Mock workflow execution
    setTimeout(() => setSyncStatus('idle'), 1000);
  };

  const loadPlatformMetrics = async () => {
    // Mock metrics
    setMetrics({
      totalProjects: 5,
      activeOpportunities: 3,
      pendingTasks: 12,
      recentActivity: []
    });
  };

  const navigateWithContext = (path: string, context?: any) => {
    if (context) {
      setNavigationContext(context);
    }
    window.location.href = path;
  };

  const getRelatedEntities = (entityType: string, entityId: string) => {
    return relationships.filter(rel => 
      (rel.source_id === entityId) || (rel.target_id === entityId)
    );
  };

  const refreshPlatformData = async () => {
    setSyncStatus('syncing');
    await loadPlatformMetrics();
    setSyncStatus('idle');
    setLastSyncTime(new Date());
  };

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