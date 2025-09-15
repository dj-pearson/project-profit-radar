import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface SyncEvent {
  table: string;
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: any;
  old: any;
  timestamp: string;
}

export interface SyncSubscription {
  id: string;
  tables: string[];
  onSync: (event: SyncEvent) => void;
  filters?: Record<string, any>;
}

export interface UseRealTimeSyncOptions {
  subscriptions: SyncSubscription[];
  enableCrossModuleSync?: boolean;
  enableNotifications?: boolean;
  onError?: (error: any) => void;
}

export const useRealTimeSync = (options: UseRealTimeSyncOptions) => {
  const { userProfile } = useAuth();
  const channelsRef = useRef<Map<string, RealtimeChannel>>(new Map());
  const { subscriptions, enableCrossModuleSync = true, enableNotifications = true, onError } = options;

  const handleSyncEvent = useCallback((event: SyncEvent, onSync: (event: SyncEvent) => void) => {
    try {
      // Call the provided sync handler
      onSync(event);

      // Handle cross-module synchronization
      if (enableCrossModuleSync) {
        handleCrossModuleSync(event);
      }

      // Show notifications for important events
      if (enableNotifications) {
        showSyncNotification(event);
      }

    } catch (error) {
      console.error('Error handling sync event:', error);
      if (onError) onError(error);
    }
  }, [enableCrossModuleSync, enableNotifications, onError]);

  const handleCrossModuleSync = useCallback(async (event: SyncEvent) => {
    try {
      switch (event.table) {
        case 'opportunities':
          await handleOpportunitySync(event);
          break;
        case 'projects':
          await handleProjectSync(event);
          break;
        case 'contacts':
          await handleContactSync(event);
          break;
        case 'materials':
          await handleMaterialSync(event);
          break;
        case 'material_usage':
          await handleMaterialUsageSync(event);
          break;
        case 'tasks':
          await handleTaskSync(event);
          break;
      }
    } catch (error) {
      console.error('Error in cross-module sync:', error);
    }
  }, []);

  const handleOpportunitySync = async (event: SyncEvent) => {
    if (event.eventType === 'UPDATE' && event.new.status === 'won' && event.old.status !== 'won') {
      // Opportunity was just won - suggest creating a project
      toast({
        title: "Opportunity Won! 🎉",
        description: `${event.new.name} - Ready to create a project?`,
        action: {
          altText: "Create Project",
          onClick: () => {
            // This would trigger the integration service
            window.location.href = `/crm/opportunities/${event.new.id}?action=create-project`;
          }
        }
      });
    }
  };

  const handleProjectSync = async (event: SyncEvent) => {
    if (event.eventType === 'UPDATE') {
      // Sync project status back to opportunity if linked
      if (event.new.opportunity_id && event.new.status !== event.old.status) {
        const opportunityStatus = mapProjectStatusToOpportunity(event.new.status);
        if (opportunityStatus) {
          await supabase
            .from('opportunities')
            .update({ status: opportunityStatus })
            .eq('id', event.new.opportunity_id);
        }
      }

      // Notify about project status changes
      if (event.new.status !== event.old.status) {
        toast({
          title: "Project Status Updated",
          description: `${event.new.name} is now ${event.new.status}`,
        });
      }
    }
  };

  const handleContactSync = async (event: SyncEvent) => {
    if (event.eventType === 'UPDATE') {
      // Sync contact changes to project contacts
      const { data: projectContacts } = await supabase
        .from('project_contacts')
        .select('id, project_id')
        .eq('crm_contact_id', event.new.id);

      if (projectContacts && projectContacts.length > 0) {
        for (const projectContact of projectContacts) {
          await supabase
            .from('project_contacts')
            .update({
              contact_name: event.new.name,
              email: event.new.email,
              phone: event.new.phone,
              organization: event.new.company_name,
              updated_at: new Date().toISOString()
            })
            .eq('id', projectContact.id);
        }

        toast({
          title: "Contact Synced",
          description: `Updated contact information across ${projectContacts.length} project(s)`,
        });
      }
    }
  };

  const handleMaterialSync = async (event: SyncEvent) => {
    if (event.eventType === 'UPDATE' && event.new.unit_cost !== event.old.unit_cost) {
      // Material cost changed - update related job costing
      const { data: usageRecords } = await supabase
        .from('material_usage')
        .select('id, project_id, quantity_used')
        .eq('material_id', event.new.id);

      if (usageRecords && usageRecords.length > 0) {
        // Update usage records with new costs
        for (const usage of usageRecords) {
          const newTotalCost = usage.quantity_used * event.new.unit_cost;
          await supabase
            .from('material_usage')
            .update({
              unit_cost: event.new.unit_cost,
              total_cost: newTotalCost
            })
            .eq('id', usage.id);
        }

        toast({
          title: "Material Costs Updated",
          description: `Updated job costing for ${usageRecords.length} usage record(s)`,
        });
      }
    }
  };

  const handleMaterialUsageSync = async (event: SyncEvent) => {
    if (event.eventType === 'INSERT' || event.eventType === 'UPDATE') {
      // Update material inventory when usage is recorded
      if (event.eventType === 'INSERT') {
        await supabase
          .from('materials')
          .update({
            quantity_available: supabase.sql`quantity_available - ${event.new.quantity_used}`
          })
          .eq('id', event.new.material_id);
      }

      // Check for low stock alerts
      const { data: material } = await supabase
        .from('materials')
        .select('name, quantity_available, minimum_stock_level')
        .eq('id', event.new.material_id)
        .single();

      if (material && material.quantity_available <= material.minimum_stock_level) {
        toast({
          title: "Low Stock Alert",
          description: `${material.name} is running low (${material.quantity_available} remaining)`,
          variant: "destructive"
        });
      }
    }
  };

  const handleTaskSync = async (event: SyncEvent) => {
    if (event.eventType === 'UPDATE' && event.new.status === 'completed' && event.old.status !== 'completed') {
      // Task completed - update project progress if applicable
      if (event.new.project_id) {
        // Calculate project completion percentage based on completed tasks
        const { data: allTasks } = await supabase
          .from('tasks')
          .select('status')
          .eq('project_id', event.new.project_id);

        if (allTasks) {
          const completedTasks = allTasks.filter(t => t.status === 'completed').length;
          const completionPercentage = Math.round((completedTasks / allTasks.length) * 100);

          await supabase
            .from('projects')
            .update({ completion_percentage: completionPercentage })
            .eq('id', event.new.project_id);

          toast({
            title: "Task Completed! ✅",
            description: `${event.new.name} - Project is now ${completionPercentage}% complete`,
          });
        }
      }
    }
  };

  const showSyncNotification = (event: SyncEvent) => {
    // Only show notifications for important events
    const importantEvents = ['opportunities', 'projects', 'tasks'];
    const importantActions = ['INSERT', 'UPDATE'];

    if (importantEvents.includes(event.table) && importantActions.includes(event.eventType)) {
      // Notifications are handled in specific sync handlers above
      return;
    }
  };

  const mapProjectStatusToOpportunity = (projectStatus: string): string | null => {
    const statusMap: Record<string, string> = {
      'completed': 'won',
      'cancelled': 'lost',
      'on_hold': 'on_hold'
    };
    return statusMap[projectStatus] || null;
  };

  const subscribe = useCallback(() => {
    if (!userProfile?.company_id) return;

    // Clean up existing channels
    channelsRef.current.forEach((channel) => {
      supabase.removeChannel(channel);
    });
    channelsRef.current.clear();

    // Create new subscriptions
    subscriptions.forEach((subscription) => {
      subscription.tables.forEach((table) => {
        const channelName = `${subscription.id}-${table}`;
        const channel = supabase
          .channel(channelName)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: table,
              filter: `company_id=eq.${userProfile.company_id}`
            },
            (payload) => {
              const syncEvent: SyncEvent = {
                table,
                eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
                new: payload.new,
                old: payload.old,
                timestamp: new Date().toISOString()
              };

              handleSyncEvent(syncEvent, subscription.onSync);
            }
          )
          .subscribe();

        channelsRef.current.set(channelName, channel);
      });
    });
  }, [userProfile?.company_id, subscriptions, handleSyncEvent]);

  const unsubscribe = useCallback(() => {
    channelsRef.current.forEach((channel) => {
      supabase.removeChannel(channel);
    });
    channelsRef.current.clear();
  }, []);

  // Subscribe on mount and when dependencies change
  useEffect(() => {
    subscribe();
    return unsubscribe;
  }, [subscribe, unsubscribe]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      unsubscribe();
    };
  }, [unsubscribe]);

  return {
    subscribe,
    unsubscribe,
    activeChannels: channelsRef.current.size
  };
};

export default useRealTimeSync;
