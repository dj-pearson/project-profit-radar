import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface TriggerEventOptions {
  eventName: string;
  eventData?: Record<string, any>;
  async?: boolean; // If true, don't wait for response
}

/**
 * Hook for triggering behavioral triggers from the frontend
 *
 * Usage:
 * ```tsx
 * const { triggerEvent } = useBehavioralTriggers();
 *
 * // Trigger an event
 * triggerEvent({ eventName: 'project_created', eventData: { projectId: '123' } });
 * ```
 */
export const useBehavioralTriggers = () => {
  const { user } = useAuth();

  /**
   * Trigger a behavioral event
   */
  const triggerEvent = useCallback(async (options: TriggerEventOptions) => {
    if (!user) {
      console.warn('Cannot trigger event: user not authenticated');
      return { success: false, error: 'User not authenticated' };
    }

    const { eventName, eventData = {}, async = true } = options;

    try {
      // Track the event in user_events table first (for analytics)
      await (supabase as any)
        .from('user_events')
        .insert({
          user_id: user.id,
          event_name: eventName,
          event_category: 'engagement',
          event_properties: eventData,
        });

      // Call the behavioral trigger processor
      const triggerPromise = supabase.functions.invoke('process-behavioral-triggers', {
        body: {
          eventName,
          userId: user.id,
          eventData,
        },
      });

      // If async, don't wait for response
      if (async) {
        triggerPromise.catch((error) => {
          console.error('Behavioral trigger processing failed:', error);
        });
        return { success: true, async: true };
      }

      // Wait for response if not async
      const { data, error } = await triggerPromise;

      if (error) {
        console.error('Behavioral trigger processing failed:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error) {
      console.error('Failed to trigger behavioral event:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }, [user]);

  /**
   * Common behavioral trigger events
   */
  const triggers = {
    // User lifecycle events
    exitIntent: () => triggerEvent({ eventName: 'exit_intent' }),
    dashboardViewed: () => triggerEvent({ eventName: 'dashboard_viewed' }),
    featureViewed: (featureName: string) =>
      triggerEvent({ eventName: 'feature_viewed', eventData: { feature: featureName } }),

    // Project events
    projectCreated: (projectId: string) =>
      triggerEvent({ eventName: 'project_created', eventData: { projectId } }),
    projectCompleted: (projectId: string) =>
      triggerEvent({ eventName: 'project_completed', eventData: { projectId } }),

    // Time tracking events
    firstTimeEntry: () => triggerEvent({ eventName: 'first_time_entry' }),
    timeEntryCreated: (hours: number) =>
      triggerEvent({ eventName: 'time_entry_created', eventData: { hours } }),

    // Document events
    firstDocumentUploaded: () => triggerEvent({ eventName: 'first_document_uploaded' }),
    documentUploaded: (documentId: string) =>
      triggerEvent({ eventName: 'document_uploaded', eventData: { documentId } }),

    // Team events
    firstTeamMemberInvited: () => triggerEvent({ eventName: 'first_team_member_invited' }),
    teamMemberInvited: (email: string) =>
      triggerEvent({ eventName: 'team_member_invited', eventData: { email } }),

    // Financial events
    firstInvoiceCreated: () => triggerEvent({ eventName: 'first_invoice_created' }),
    quickbooksConnected: () => triggerEvent({ eventName: 'quickbooks_connected' }),

    // Change orders
    firstChangeOrderCreated: () => triggerEvent({ eventName: 'first_change_order_created' }),

    // Reports
    firstReportGenerated: () => triggerEvent({ eventName: 'first_report_generated' }),
    reportGenerated: (reportType: string) =>
      triggerEvent({ eventName: 'report_generated', eventData: { reportType } }),

    // Engagement events
    profileCompleted: () => triggerEvent({ eventName: 'profile_completed' }),
    onboardingCompleted: () => triggerEvent({ eventName: 'onboarding_completed' }),

    // Conversion events
    upgradePageViewed: () => triggerEvent({ eventName: 'upgrade_page_viewed' }),
    pricingViewed: () => triggerEvent({ eventName: 'pricing_viewed' }),
    checkoutStarted: (plan: string) =>
      triggerEvent({ eventName: 'checkout_started', eventData: { plan } }),
  };

  return {
    triggerEvent,
    triggers,
  };
};

export default useBehavioralTriggers;
