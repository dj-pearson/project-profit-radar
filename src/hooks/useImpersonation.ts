/**
 * Admin Impersonation Hook
 * Allows root admins to view the app as another user for debugging
 */

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

interface ImpersonationSession {
  id: string;
  admin_id: string;
  impersonated_user_id: string;
  reason: string;
  started_at: string;
}

interface ImpersonatedUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  company_id: string;
  role: string;
}

export const useImpersonation = () => {
  const { user: currentUser, userProfile } = useAuth();
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [impersonatedUser, setImpersonatedUser] = useState<ImpersonatedUser | null>(null);
  const [session, setSession] = useState<ImpersonationSession | null>(null);
  const [loading, setLoading] = useState(false);

  // Check if there's an active impersonation session on mount
  useEffect(() => {
    checkActiveSession();
  }, [currentUser]);

  const checkActiveSession = async () => {
    if (!currentUser) return;

    try {
      const { data, error } = await supabase
        .from('admin_impersonation_sessions')
        .select('*')
        .eq('admin_id', currentUser.id)
        .is('ended_at', null)
        .single();

      // Silently fail if table doesn't exist (406) or other errors
      if (error) {
        // Only log if it's not a "table doesn't exist" or "no rows" error
        if (error.code !== 'PGRST116' && error.code !== '42P01' && !error.message?.includes('does not exist')) {
          console.error('Error checking session:', error);
        }
        return;
      }

      if (data) {
        // Load impersonated user
        const { data: user, error: userError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', data.impersonated_user_id)
          .single();

        if (!userError && user) {
          setIsImpersonating(true);
          setImpersonatedUser(user as ImpersonatedUser);
          setSession(data as ImpersonationSession);
        }
      }
    } catch (error) {
      // Silently fail - impersonation is an optional feature
    }
  };

  const startImpersonation = useCallback(
    async (userId: string, reason: string) => {
      if (!currentUser || userProfile?.role !== 'root_admin') {
        toast({
          variant: 'destructive',
          title: 'Permission Denied',
          description: 'Only root admins can impersonate users',
        });
        return false;
      }

      if (!reason || reason.trim().length < 10) {
        toast({
          variant: 'destructive',
          title: 'Reason Required',
          description: 'Please provide a detailed reason for impersonation (min 10 characters)',
        });
        return false;
      }

      setLoading(true);

      try {
        // Get user to impersonate
        const { data: targetUser, error: userError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', userId)
          .single();

        if (userError || !targetUser) {
          throw new Error('User not found');
        }

        // Create impersonation session
        const { data: sessionData, error: sessionError } = await supabase
          .from('admin_impersonation_sessions')
          .insert({
            admin_id: currentUser.id,
            impersonated_user_id: userId,
            reason: reason.trim(),
            session_token: crypto.randomUUID(),
          })
          .select()
          .single();

        if (sessionError) throw sessionError;

        setIsImpersonating(true);
        setImpersonatedUser(targetUser as ImpersonatedUser);
        setSession(sessionData as ImpersonationSession);

        // Send notification to user (optional)
        await notifyUser(targetUser.email, currentUser.email);

        toast({
          title: 'Impersonation Started',
          description: `You are now viewing as ${targetUser.first_name} ${targetUser.last_name}`,
        });

        // Reload the page to apply impersonation context
        setTimeout(() => {
          window.location.reload();
        }, 1000);

        return true;
      } catch (error: any) {
        console.error('Error starting impersonation:', error);
        toast({
          variant: 'destructive',
          title: 'Impersonation Failed',
          description: error.message || 'Could not start impersonation session',
        });
        return false;
      } finally {
        setLoading(false);
      }
    },
    [currentUser, userProfile]
  );

  const endImpersonation = useCallback(async () => {
    if (!session) return;

    setLoading(true);

    try {
      // End the session
      const { error } = await supabase
        .from('admin_impersonation_sessions')
        .update({
          ended_at: new Date().toISOString(),
        })
        .eq('id', session.id);

      if (error) throw error;

      setIsImpersonating(false);
      setImpersonatedUser(null);
      setSession(null);

      toast({
        title: 'Impersonation Ended',
        description: 'Returning to your admin account',
      });

      // Reload to restore admin context
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (error: any) {
      console.error('Error ending impersonation:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not end impersonation session',
      });
    } finally {
      setLoading(false);
    }
  }, [session]);

  const logAction = useCallback(
    async (action: string, details: any) => {
      if (!session) return;

      try {
        // Get current actions
        const { data: sessionData } = await supabase
          .from('admin_impersonation_sessions')
          .select('actions_taken')
          .eq('id', session.id)
          .single();

        const currentActions = sessionData?.actions_taken || [];

        // Add new action
        const newAction = {
          timestamp: new Date().toISOString(),
          action,
          details,
        };

        // Update session with new action
        await supabase
          .from('admin_impersonation_sessions')
          .update({
            actions_taken: [...currentActions, newAction],
          })
          .eq('id', session.id);
      } catch (error) {
        console.error('Error logging action:', error);
      }
    },
    [session]
  );

  return {
    isImpersonating,
    impersonatedUser,
    session,
    loading,
    startImpersonation,
    endImpersonation,
    logAction,
  };
};

async function notifyUser(userEmail: string, adminEmail: string) {
  // In production, this would send an email notification
  // For now, we'll just log it
  console.log(`User ${userEmail} notified of impersonation by ${adminEmail}`);

  // TODO: Implement email notification
  // await supabase.functions.invoke('send-email', {
  //   body: {
  //     to: userEmail,
  //     subject: 'BuildDesk Support Access',
  //     message: `BuildDesk support team accessed your account for debugging purposes.`,
  //   },
  // });
}
