/**
 * Enhanced Biometric Login Hook
 *
 * Provides React integration for BiometricAuthService with:
 * - Automatic capability detection
 * - Device trust integration
 * - App lock management
 * - State management
 */

import { useState, useEffect, useCallback } from 'react';
import {
  biometricAuthService,
  BiometricCapabilities,
  BiometricAuthResult,
  BiometricType,
} from '@/services/BiometricAuthService';
import { useAuth } from '@/contexts/AuthContext';
import { useDeviceTrust } from '@/hooks/useDeviceTrust';
import { toast } from '@/hooks/use-toast';
import { Capacitor } from '@capacitor/core';

interface UseBiometricLoginState {
  capabilities: BiometricCapabilities | null;
  isEnabled: boolean;
  isAppLockEnabled: boolean;
  loading: boolean;
  initializing: boolean;
}

interface UseBiometricLoginReturn extends UseBiometricLoginState {
  // Authentication
  authenticate: (promptMessage?: string) => Promise<BiometricAuthResult>;
  performBiometricLogin: () => Promise<{ success: boolean; error?: string }>;

  // Enable/Disable
  enableBiometricLogin: () => Promise<{ success: boolean; error?: string }>;
  disableBiometricLogin: () => Promise<void>;

  // App Lock
  enableAppLock: () => Promise<{ success: boolean; error?: string }>;
  disableAppLock: () => Promise<void>;
  checkAppLock: () => Promise<boolean>;
  unlockApp: () => Promise<BiometricAuthResult>;

  // Utilities
  getBiometricLabel: () => string;
  getBiometricIcon: () => string;
  refresh: () => Promise<void>;
}

export const useBiometricLogin = (): UseBiometricLoginReturn => {
  const [state, setState] = useState<UseBiometricLoginState>({
    capabilities: null,
    isEnabled: false,
    isAppLockEnabled: false,
    loading: false,
    initializing: true,
  });

  const { user, siteId } = useAuth();
  const { trustCurrentDevice, getCurrentDeviceId } = useDeviceTrust();

  // Initialize on mount
  useEffect(() => {
    initialize();
  }, []);

  // Check enabled status when user changes
  useEffect(() => {
    if (user) {
      checkEnabledStatus();
    }
  }, [user]);

  const initialize = async () => {
    setState(prev => ({ ...prev, initializing: true }));

    try {
      const capabilities = await biometricAuthService.initialize();
      const isEnabled = await biometricAuthService.isBiometricLoginEnabled();
      const isAppLockEnabled = await biometricAuthService.isAppLockEnabled();

      setState({
        capabilities,
        isEnabled,
        isAppLockEnabled,
        loading: false,
        initializing: false,
      });
    } catch (error) {
      console.error('Error initializing biometric login:', error);
      setState(prev => ({
        ...prev,
        initializing: false,
        loading: false,
      }));
    }
  };

  const checkEnabledStatus = async () => {
    const isEnabled = await biometricAuthService.isBiometricLoginEnabled();
    const isAppLockEnabled = await biometricAuthService.isAppLockEnabled();
    setState(prev => ({ ...prev, isEnabled, isAppLockEnabled }));
  };

  const authenticate = useCallback(async (promptMessage?: string): Promise<BiometricAuthResult> => {
    setState(prev => ({ ...prev, loading: true }));

    try {
      const result = await biometricAuthService.authenticate({
        promptMessage,
      });

      return result;
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  }, []);

  const enableBiometricLogin = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    if (!siteId) {
      return { success: false, error: 'Site not configured' };
    }

    setState(prev => ({ ...prev, loading: true }));

    try {
      // Get or create device trust
      let deviceTrustId: string | undefined;
      try {
        const trustResult = await trustCurrentDevice(
          `${Capacitor.getPlatform()} - ${biometricAuthService.getBiometricLabel()}`
        );
        if (trustResult.data) {
          deviceTrustId = trustResult.data.id;
        }
      } catch (error) {
        console.warn('Could not create device trust:', error);
      }

      const result = await biometricAuthService.enableBiometricLogin({
        email: user.email || '',
        userId: user.id,
        siteId,
        deviceTrustId,
      });

      if (result.success) {
        setState(prev => ({ ...prev, isEnabled: true }));
        toast({
          title: 'Biometric Login Enabled',
          description: `You can now sign in with ${biometricAuthService.getBiometricLabel()}`,
        });
      }

      return result;
    } catch (error) {
      console.error('Error enabling biometric login:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to enable biometric login',
      };
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [user, siteId, trustCurrentDevice]);

  const disableBiometricLogin = useCallback(async (): Promise<void> => {
    setState(prev => ({ ...prev, loading: true }));

    try {
      await biometricAuthService.disableBiometricLogin();
      setState(prev => ({ ...prev, isEnabled: false }));
      toast({
        title: 'Biometric Login Disabled',
        description: 'You will need to sign in with your password',
      });
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  }, []);

  const performBiometricLogin = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    setState(prev => ({ ...prev, loading: true }));

    try {
      const result = await biometricAuthService.performBiometricLogin();

      if (result.success) {
        toast({
          title: 'Welcome Back!',
          description: `Signed in with ${biometricAuthService.getBiometricLabel()}`,
        });
      } else if (result.sessionValid === false) {
        // Session expired, need password login
        toast({
          variant: 'destructive',
          title: 'Session Expired',
          description: 'Please sign in with your password.',
        });
      }

      return result;
    } catch (error) {
      console.error('Error performing biometric login:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Login failed',
      };
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  }, []);

  // App Lock Functions
  const enableAppLock = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    setState(prev => ({ ...prev, loading: true }));

    try {
      const result = await biometricAuthService.enableAppLock();

      if (result.success) {
        setState(prev => ({ ...prev, isAppLockEnabled: true }));
        toast({
          title: 'App Lock Enabled',
          description: 'App will lock after 5 minutes of inactivity',
        });
      }

      return result;
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  }, []);

  const disableAppLock = useCallback(async (): Promise<void> => {
    setState(prev => ({ ...prev, loading: true }));

    try {
      await biometricAuthService.disableAppLock();
      setState(prev => ({ ...prev, isAppLockEnabled: false }));
      toast({
        title: 'App Lock Disabled',
        description: 'App will no longer lock automatically',
      });
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  }, []);

  const checkAppLock = useCallback(async (): Promise<boolean> => {
    return biometricAuthService.shouldTriggerAppLock();
  }, []);

  const unlockApp = useCallback(async (): Promise<BiometricAuthResult> => {
    setState(prev => ({ ...prev, loading: true }));

    try {
      return await biometricAuthService.unlockApp();
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  }, []);

  const getBiometricLabel = useCallback((): string => {
    return biometricAuthService.getBiometricLabel();
  }, []);

  const getBiometricIcon = useCallback((): string => {
    const type = state.capabilities?.biometricType;
    switch (type) {
      case 'face_id':
        return 'face';
      case 'touch_id':
      case 'fingerprint':
        return 'fingerprint';
      case 'iris':
        return 'eye';
      default:
        return 'shield';
    }
  }, [state.capabilities]);

  const refresh = useCallback(async (): Promise<void> => {
    await initialize();
  }, []);

  return {
    ...state,
    authenticate,
    performBiometricLogin,
    enableBiometricLogin,
    disableBiometricLogin,
    enableAppLock,
    disableAppLock,
    checkAppLock,
    unlockApp,
    getBiometricLabel,
    getBiometricIcon,
    refresh,
  };
};
