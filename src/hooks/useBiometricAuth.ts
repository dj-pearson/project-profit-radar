import { useState, useEffect } from 'react';
import * as LocalAuthentication from 'expo-local-authentication';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

interface BiometricAuthState {
  isAvailable: boolean;
  isEnrolled: boolean;
  biometricType: string | null;
  isSupported: boolean;
}

interface BiometricAuthResult {
  success: boolean;
  error?: string;
}

/**
 * Custom hook for biometric authentication
 * Supports Face ID, Touch ID (iOS) and Fingerprint (Android)
 */
export const useBiometricAuth = () => {
  const [state, setState] = useState<BiometricAuthState>({
    isAvailable: false,
    isEnrolled: false,
    biometricType: null,
    isSupported: Capacitor.isNativePlatform(),
  });

  useEffect(() => {
    checkBiometricAvailability();
  }, []);

  /**
   * Check if biometric authentication is available on the device
   */
  const checkBiometricAvailability = async () => {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    try {
      // Check if hardware is available
      const compatible = await LocalAuthentication.hasHardwareAsync();

      // Check if biometrics are enrolled
      const enrolled = await LocalAuthentication.isEnrolledAsync();

      // Get supported authentication types
      const types = await LocalAuthentication.supportedAuthenticationTypesAsync();

      let biometricType = null;
      if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
        biometricType = 'Face ID';
      } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
        biometricType = 'Fingerprint';
      } else if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
        biometricType = 'Iris';
      }

      setState({
        isAvailable: compatible && enrolled,
        isEnrolled: enrolled,
        biometricType,
        isSupported: true,
      });
    } catch (error) {
      console.error('Error checking biometric availability:', error);
    }
  };

  /**
   * Authenticate using biometrics
   * @param reason - The reason to display to the user
   * @returns Promise with authentication result
   */
  const authenticate = async (
    reason: string = 'Authenticate to access your account'
  ): Promise<BiometricAuthResult> => {
    if (!state.isAvailable) {
      return {
        success: false,
        error: 'Biometric authentication is not available',
      };
    }

    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: reason,
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
        requireConfirmation: false,
      });

      if (result.success) {
        return { success: true };
      } else {
        return {
          success: false,
          error: result.error || 'Authentication failed',
        };
      }
    } catch (error) {
      console.error('Biometric authentication error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Authentication failed',
      };
    }
  };

  /**
   * Check if biometric login is enabled for the current user
   */
  const isBiometricLoginEnabled = async (): Promise<boolean> => {
    try {
      const { value } = await Preferences.get({ key: 'biometric_login_enabled' });
      return value === 'true';
    } catch (error) {
      console.error('Error checking biometric login preference:', error);
      return false;
    }
  };

  /**
   * Enable or disable biometric login
   */
  const setBiometricLoginEnabled = async (enabled: boolean): Promise<void> => {
    try {
      await Preferences.set({
        key: 'biometric_login_enabled',
        value: enabled ? 'true' : 'false',
      });
    } catch (error) {
      console.error('Error setting biometric login preference:', error);
    }
  };

  /**
   * Store user credentials securely for biometric login
   * Note: In production, use a more secure storage method like Keychain/Keystore
   */
  const storeBiometricCredentials = async (
    email: string,
    userId: string
  ): Promise<void> => {
    try {
      await Preferences.set({ key: 'biometric_email', value: email });
      await Preferences.set({ key: 'biometric_user_id', value: userId });
    } catch (error) {
      console.error('Error storing biometric credentials:', error);
      throw error;
    }
  };

  /**
   * Get stored biometric credentials
   */
  const getBiometricCredentials = async (): Promise<{
    email: string | null;
    userId: string | null;
  }> => {
    try {
      const emailResult = await Preferences.get({ key: 'biometric_email' });
      const userIdResult = await Preferences.get({ key: 'biometric_user_id' });

      return {
        email: emailResult.value,
        userId: userIdResult.value,
      };
    } catch (error) {
      console.error('Error getting biometric credentials:', error);
      return { email: null, userId: null };
    }
  };

  /**
   * Clear stored biometric credentials
   */
  const clearBiometricCredentials = async (): Promise<void> => {
    try {
      await Preferences.remove({ key: 'biometric_email' });
      await Preferences.remove({ key: 'biometric_user_id' });
      await Preferences.remove({ key: 'biometric_login_enabled' });
    } catch (error) {
      console.error('Error clearing biometric credentials:', error);
    }
  };

  return {
    ...state,
    authenticate,
    isBiometricLoginEnabled,
    setBiometricLoginEnabled,
    storeBiometricCredentials,
    getBiometricCredentials,
    clearBiometricCredentials,
    checkBiometricAvailability,
  };
};
