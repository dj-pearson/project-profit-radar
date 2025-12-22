/**
 * Unified Biometric Authentication Hook
 *
 * Provides a unified API for biometric authentication that works across:
 * - Expo (React Native with expo-local-authentication)
 * - Capacitor (Native iOS/Android with @capacitor-community/biometric-auth)
 * - Web (graceful degradation with no biometric support)
 *
 * This hook automatically detects the runtime environment and uses
 * the appropriate biometric implementation.
 */

import { useState, useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import capacitorBiometricService, {
  BiometricCapabilities,
  BiometricType,
  BiometricAuthResult,
  StoredCredentials,
} from '@/services/CapacitorBiometricService';

// Re-export types for consumers
export type { BiometricCapabilities, BiometricType, BiometricAuthResult, StoredCredentials };

export type RuntimeEnvironment = 'expo' | 'capacitor' | 'web';

interface UnifiedBiometricState {
  isLoading: boolean;
  capabilities: BiometricCapabilities | null;
  isEnabled: boolean;
  appLockEnabled: boolean;
  error: string | null;
  environment: RuntimeEnvironment;
}

interface UnifiedBiometricActions {
  // Core authentication
  authenticate: (reason?: string) => Promise<BiometricAuthResult>;

  // Setup and configuration
  enableBiometricLogin: () => Promise<boolean>;
  disableBiometricLogin: () => Promise<boolean>;

  // App lock
  enableAppLock: () => Promise<boolean>;
  disableAppLock: () => Promise<boolean>;
  checkAppLock: () => Promise<boolean>;

  // Biometric login flow
  performBiometricLogin: () => Promise<{ success: boolean; credentials?: StoredCredentials; error?: string }>;

  // Utilities
  refresh: () => Promise<void>;
  getBiometricTypeName: () => string;
  getBiometricIconName: () => string;
}

export type UseUnifiedBiometricReturn = UnifiedBiometricState & UnifiedBiometricActions;

/**
 * Detect the current runtime environment
 */
function detectEnvironment(): RuntimeEnvironment {
  // Check if running in Capacitor native
  if (Capacitor.isNativePlatform()) {
    // Check if Expo is available (hybrid mode)
    // @ts-ignore - Expo global may or may not exist
    if (typeof window !== 'undefined' && window.ExpoModules) {
      return 'expo';
    }
    return 'capacitor';
  }

  // Check if running in Expo web
  // @ts-ignore - Expo global may or may not exist
  if (typeof window !== 'undefined' && window.expo) {
    return 'expo';
  }

  return 'web';
}

/**
 * Unified Biometric Authentication Hook
 */
export function useUnifiedBiometric(): UseUnifiedBiometricReturn {
  const { user } = useAuth();
  const [state, setState] = useState<UnifiedBiometricState>({
    isLoading: true,
    capabilities: null,
    isEnabled: false,
    appLockEnabled: false,
    error: null,
    environment: 'web',
  });

  // Detect environment on mount
  useEffect(() => {
    setState(prev => ({ ...prev, environment: detectEnvironment() }));
  }, []);

  // Initialize biometric capabilities
  const initialize = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const env = detectEnvironment();

      if (env === 'web') {
        // Web doesn't support biometrics (yet - WebAuthn could be added)
        setState(prev => ({
          ...prev,
          isLoading: false,
          capabilities: {
            isSupported: false,
            isAvailable: false,
            isEnrolled: false,
            biometricType: null,
            securityLevel: 'none',
            hasDeviceCredential: false,
          },
          isEnabled: false,
          appLockEnabled: false,
          environment: 'web',
        }));
        return;
      }

      if (env === 'capacitor') {
        // Use Capacitor biometric service
        const capabilities = await capacitorBiometricService.initialize();
        const isEnabled = await capacitorBiometricService.isBiometricLoginEnabled();
        const appLockEnabled = await capacitorBiometricService.isAppLockEnabled();

        setState(prev => ({
          ...prev,
          isLoading: false,
          capabilities,
          isEnabled,
          appLockEnabled,
          environment: 'capacitor',
        }));
        return;
      }

      if (env === 'expo') {
        // Use Expo biometric service (dynamic import to avoid bundling issues)
        try {
          const { biometricAuthService } = await import('@/services/BiometricAuthService');
          const capabilities = await biometricAuthService.initialize();
          const isEnabled = await biometricAuthService.isBiometricLoginEnabled();
          const appLockEnabled = await biometricAuthService.isAppLockEnabled();

          setState(prev => ({
            ...prev,
            isLoading: false,
            capabilities,
            isEnabled,
            appLockEnabled,
            environment: 'expo',
          }));
        } catch (error) {
          console.warn('Expo biometric service not available:', error);
          setState(prev => ({
            ...prev,
            isLoading: false,
            error: 'Biometric service not available',
            environment: 'expo',
          }));
        }
        return;
      }
    } catch (error: any) {
      console.error('Failed to initialize biometrics:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Failed to initialize biometrics',
      }));
    }
  }, []);

  // Initialize on mount
  useEffect(() => {
    initialize();
  }, [initialize]);

  // Authenticate with biometrics
  const authenticate = useCallback(
    async (reason: string = 'Authenticate to continue'): Promise<BiometricAuthResult> => {
      const { environment, capabilities } = state;

      if (!capabilities?.isAvailable && !capabilities?.hasDeviceCredential) {
        return {
          success: false,
          error: 'Biometric authentication is not available',
          errorCode: 'NOT_AVAILABLE',
        };
      }

      try {
        if (environment === 'capacitor') {
          return await capacitorBiometricService.authenticate(reason);
        }

        if (environment === 'expo') {
          const { biometricAuthService } = await import('@/services/BiometricAuthService');
          return await biometricAuthService.authenticate(reason);
        }

        return {
          success: false,
          error: 'Biometric authentication is not supported in this environment',
          errorCode: 'NOT_AVAILABLE',
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message || 'Authentication failed',
          errorCode: 'UNKNOWN',
        };
      }
    },
    [state.environment, state.capabilities]
  );

  // Enable biometric login
  const enableBiometricLogin = useCallback(async (): Promise<boolean> => {
    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to enable biometric login',
        variant: 'destructive',
      });
      return false;
    }

    const credentials: StoredCredentials = {
      email: user.email || '',
      userId: user.id,
      siteId,
      lastAuthenticated: new Date().toISOString(),
    };

    try {
      const { environment } = state;

      if (environment === 'capacitor') {
        const success = await capacitorBiometricService.enableBiometricLogin(credentials);
        if (success) {
          setState(prev => ({ ...prev, isEnabled: true }));
          toast({
            title: 'Biometric Login Enabled',
            description: 'You can now use biometrics to log in',
          });
        }
        return success;
      }

      if (environment === 'expo') {
        const { biometricAuthService } = await import('@/services/BiometricAuthService');
        const result = await biometricAuthService.enableBiometricLogin(credentials);
        if (result.success) {
          setState(prev => ({ ...prev, isEnabled: true }));
          toast({
            title: 'Biometric Login Enabled',
            description: 'You can now use biometrics to log in',
          });
          return true;
        }
        return false;
      }

      return false;
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to enable biometric login',
        variant: 'destructive',
      });
      return false;
    }
  }, [user, siteId, state.environment]);

  // Disable biometric login
  const disableBiometricLogin = useCallback(async (): Promise<boolean> => {
    try {
      const { environment } = state;

      if (environment === 'capacitor') {
        const success = await capacitorBiometricService.disableBiometricLogin();
        if (success) {
          setState(prev => ({ ...prev, isEnabled: false }));
          toast({
            title: 'Biometric Login Disabled',
            description: 'Biometric login has been turned off',
          });
        }
        return success;
      }

      if (environment === 'expo') {
        const { biometricAuthService } = await import('@/services/BiometricAuthService');
        await biometricAuthService.disableBiometricLogin();
        setState(prev => ({ ...prev, isEnabled: false }));
        toast({
          title: 'Biometric Login Disabled',
          description: 'Biometric login has been turned off',
        });
        return true;
      }

      return false;
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to disable biometric login',
        variant: 'destructive',
      });
      return false;
    }
  }, [state.environment]);

  // Enable app lock
  const enableAppLock = useCallback(async (): Promise<boolean> => {
    try {
      const { environment } = state;

      if (environment === 'capacitor') {
        const success = await capacitorBiometricService.enableAppLock();
        if (success) {
          setState(prev => ({ ...prev, appLockEnabled: true }));
        }
        return success;
      }

      if (environment === 'expo') {
        const { biometricAuthService } = await import('@/services/BiometricAuthService');
        await biometricAuthService.enableAppLock();
        setState(prev => ({ ...prev, appLockEnabled: true }));
        return true;
      }

      return false;
    } catch (error) {
      return false;
    }
  }, [state.environment]);

  // Disable app lock
  const disableAppLock = useCallback(async (): Promise<boolean> => {
    try {
      const { environment } = state;

      if (environment === 'capacitor') {
        const success = await capacitorBiometricService.disableAppLock();
        if (success) {
          setState(prev => ({ ...prev, appLockEnabled: false }));
        }
        return success;
      }

      if (environment === 'expo') {
        const { biometricAuthService } = await import('@/services/BiometricAuthService');
        await biometricAuthService.disableAppLock();
        setState(prev => ({ ...prev, appLockEnabled: false }));
        return true;
      }

      return false;
    } catch (error) {
      return false;
    }
  }, [state.environment]);

  // Check if app lock should be triggered
  const checkAppLock = useCallback(async (): Promise<boolean> => {
    try {
      const { environment } = state;

      if (environment === 'capacitor') {
        return await capacitorBiometricService.shouldTriggerAppLock();
      }

      if (environment === 'expo') {
        const { biometricAuthService } = await import('@/services/BiometricAuthService');
        return await biometricAuthService.shouldRequireReauth();
      }

      return false;
    } catch (error) {
      return false;
    }
  }, [state.environment]);

  // Perform biometric login
  const performBiometricLogin = useCallback(async () => {
    try {
      const { environment } = state;

      if (environment === 'capacitor') {
        return await capacitorBiometricService.performBiometricLogin();
      }

      if (environment === 'expo') {
        const { biometricAuthService } = await import('@/services/BiometricAuthService');
        return await biometricAuthService.performBiometricLogin();
      }

      return {
        success: false,
        error: 'Biometric login is not supported in this environment',
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Biometric login failed',
      };
    }
  }, [state.environment]);

  // Refresh state
  const refresh = useCallback(async () => {
    await initialize();
  }, [initialize]);

  // Get biometric type name for display
  const getBiometricTypeName = useCallback((): string => {
    const { capabilities } = state;
    if (!capabilities?.biometricType) return 'Biometric';
    return capacitorBiometricService.getBiometricTypeName(capabilities.biometricType);
  }, [state.capabilities]);

  // Get biometric icon name for UI
  const getBiometricIconName = useCallback((): string => {
    const { capabilities } = state;
    if (!capabilities?.biometricType) return 'shield';
    return capacitorBiometricService.getBiometricIconName(capabilities.biometricType);
  }, [state.capabilities]);

  return {
    // State
    ...state,

    // Actions
    authenticate,
    enableBiometricLogin,
    disableBiometricLogin,
    enableAppLock,
    disableAppLock,
    checkAppLock,
    performBiometricLogin,
    refresh,
    getBiometricTypeName,
    getBiometricIconName,
  };
}

export default useUnifiedBiometric;
