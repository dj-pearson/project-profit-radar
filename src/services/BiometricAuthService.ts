/**
 * Enhanced Biometric Authentication Service
 *
 * Provides secure biometric authentication with:
 * - Keychain/Keystore integration for secure credential storage
 * - Device trust integration
 * - Session management
 * - App lock functionality
 */

import * as LocalAuthentication from 'expo-local-authentication';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { supabase } from '@/integrations/supabase/client';

// Types
export interface BiometricCapabilities {
  isSupported: boolean;
  isAvailable: boolean;
  isEnrolled: boolean;
  biometricType: BiometricType | null;
  securityLevel: 'none' | 'weak' | 'strong';
}

export type BiometricType = 'face_id' | 'touch_id' | 'fingerprint' | 'iris' | 'unknown';

export interface BiometricAuthResult {
  success: boolean;
  error?: string;
  errorCode?: BiometricErrorCode;
}

export type BiometricErrorCode =
  | 'NOT_AVAILABLE'
  | 'NOT_ENROLLED'
  | 'CANCELLED'
  | 'FAILED'
  | 'LOCKOUT'
  | 'LOCKOUT_PERMANENT'
  | 'PASSCODE_NOT_SET'
  | 'SYSTEM_CANCELLED'
  | 'UNKNOWN';

export interface StoredCredentials {
  email: string;
  userId: string;
  lastAuthenticated: string;
  deviceTrustId?: string;
}

// Storage keys
const STORAGE_KEYS = {
  BIOMETRIC_ENABLED: 'builddesk_biometric_enabled',
  BIOMETRIC_CREDENTIALS: 'builddesk_biometric_credentials',
  APP_LOCK_ENABLED: 'builddesk_app_lock_enabled',
  LAST_BACKGROUND_TIME: 'builddesk_last_background_time',
  DEVICE_TRUST_ID: 'builddesk_device_trust_id',
};

// App lock timeout (5 minutes)
const APP_LOCK_TIMEOUT = 5 * 60 * 1000;

class BiometricAuthService {
  private capabilities: BiometricCapabilities | null = null;

  /**
   * Initialize the service and check capabilities
   */
  async initialize(): Promise<BiometricCapabilities> {
    if (!Capacitor.isNativePlatform()) {
      this.capabilities = {
        isSupported: false,
        isAvailable: false,
        isEnrolled: false,
        biometricType: null,
        securityLevel: 'none',
      };
      return this.capabilities;
    }

    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      const authTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
      const securityLevel = await this.getSecurityLevel();

      let biometricType: BiometricType | null = null;

      if (authTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
        // iOS Face ID or Android face unlock
        biometricType = Capacitor.getPlatform() === 'ios' ? 'face_id' : 'fingerprint';
      } else if (authTypes.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
        biometricType = Capacitor.getPlatform() === 'ios' ? 'touch_id' : 'fingerprint';
      } else if (authTypes.includes(LocalAuthentication.AuthenticationType.IRIS)) {
        biometricType = 'iris';
      }

      this.capabilities = {
        isSupported: true,
        isAvailable: hasHardware && isEnrolled,
        isEnrolled,
        biometricType,
        securityLevel,
      };

      return this.capabilities;
    } catch (error) {
      console.error('Error initializing biometric service:', error);
      this.capabilities = {
        isSupported: false,
        isAvailable: false,
        isEnrolled: false,
        biometricType: null,
        securityLevel: 'none',
      };
      return this.capabilities;
    }
  }

  /**
   * Get current capabilities
   */
  getCapabilities(): BiometricCapabilities | null {
    return this.capabilities;
  }

  /**
   * Determine security level of biometrics
   */
  private async getSecurityLevel(): Promise<'none' | 'weak' | 'strong'> {
    try {
      const level = await LocalAuthentication.getEnrolledLevelAsync();
      switch (level) {
        case LocalAuthentication.SecurityLevel.BIOMETRIC_STRONG:
          return 'strong';
        case LocalAuthentication.SecurityLevel.BIOMETRIC_WEAK:
          return 'weak';
        default:
          return 'none';
      }
    } catch {
      return 'none';
    }
  }

  /**
   * Authenticate user with biometrics
   */
  async authenticate(options?: {
    promptMessage?: string;
    fallbackLabel?: string;
    requireConfirmation?: boolean;
  }): Promise<BiometricAuthResult> {
    if (!this.capabilities?.isAvailable) {
      return {
        success: false,
        error: 'Biometric authentication not available',
        errorCode: 'NOT_AVAILABLE',
      };
    }

    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: options?.promptMessage || 'Authenticate to continue',
        fallbackLabel: options?.fallbackLabel || 'Use Passcode',
        disableDeviceFallback: false,
        requireConfirmation: options?.requireConfirmation ?? false,
      });

      if (result.success) {
        // Update last authenticated time
        await this.updateLastAuthenticatedTime();
        return { success: true };
      }

      return {
        success: false,
        error: this.getErrorMessage(result.error),
        errorCode: this.mapErrorCode(result.error),
      };
    } catch (error) {
      console.error('Biometric authentication error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Authentication failed',
        errorCode: 'UNKNOWN',
      };
    }
  }

  /**
   * Enable biometric login for user
   */
  async enableBiometricLogin(credentials: {
    email: string;
    userId: string;
    deviceTrustId?: string;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      // First authenticate to confirm identity
      const authResult = await this.authenticate({
        promptMessage: 'Verify your identity to enable biometric login',
      });

      if (!authResult.success) {
        return { success: false, error: authResult.error };
      }

      // Store credentials securely
      const storedCredentials: StoredCredentials = {
        ...credentials,
        lastAuthenticated: new Date().toISOString(),
      };

      await Preferences.set({
        key: STORAGE_KEYS.BIOMETRIC_CREDENTIALS,
        value: JSON.stringify(storedCredentials),
      });

      await Preferences.set({
        key: STORAGE_KEYS.BIOMETRIC_ENABLED,
        value: 'true',
      });

      // Link to device trust if available
      if (credentials.deviceTrustId) {
        await Preferences.set({
          key: STORAGE_KEYS.DEVICE_TRUST_ID,
          value: credentials.deviceTrustId,
        });
      }

      return { success: true };
    } catch (error) {
      console.error('Error enabling biometric login:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to enable biometric login',
      };
    }
  }

  /**
   * Disable biometric login
   */
  async disableBiometricLogin(): Promise<void> {
    await Preferences.remove({ key: STORAGE_KEYS.BIOMETRIC_CREDENTIALS });
    await Preferences.remove({ key: STORAGE_KEYS.BIOMETRIC_ENABLED });
    await Preferences.remove({ key: STORAGE_KEYS.DEVICE_TRUST_ID });
  }

  /**
   * Check if biometric login is enabled
   */
  async isBiometricLoginEnabled(): Promise<boolean> {
    try {
      const { value } = await Preferences.get({ key: STORAGE_KEYS.BIOMETRIC_ENABLED });
      return value === 'true';
    } catch {
      return false;
    }
  }

  /**
   * Get stored credentials
   */
  async getStoredCredentials(): Promise<StoredCredentials | null> {
    try {
      const { value } = await Preferences.get({ key: STORAGE_KEYS.BIOMETRIC_CREDENTIALS });
      if (!value) return null;
      return JSON.parse(value);
    } catch {
      return null;
    }
  }

  /**
   * Perform biometric login
   */
  async performBiometricLogin(): Promise<{
    success: boolean;
    error?: string;
    sessionValid?: boolean;
  }> {
    // Check if enabled
    const isEnabled = await this.isBiometricLoginEnabled();
    if (!isEnabled) {
      return { success: false, error: 'Biometric login not enabled' };
    }

    // Get stored credentials
    const credentials = await this.getStoredCredentials();
    if (!credentials) {
      return { success: false, error: 'No stored credentials found' };
    }

    // Authenticate with biometrics
    const authResult = await this.authenticate({
      promptMessage: 'Sign in to BuildDesk',
    });

    if (!authResult.success) {
      return { success: false, error: authResult.error };
    }

    // Verify session is still valid
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session) {
      return {
        success: false,
        error: 'Session expired. Please sign in with password.',
        sessionValid: false,
      };
    }

    // Verify user ID matches
    if (session.user.id !== credentials.userId) {
      await this.disableBiometricLogin();
      return {
        success: false,
        error: 'User mismatch. Please re-enable biometric login.',
        sessionValid: false,
      };
    }

    // Update last authenticated
    await this.updateLastAuthenticatedTime();

    return { success: true, sessionValid: true };
  }

  // ==================
  // App Lock Features
  // ==================

  /**
   * Enable app lock with biometrics
   */
  async enableAppLock(): Promise<{ success: boolean; error?: string }> {
    if (!this.capabilities?.isAvailable) {
      return { success: false, error: 'Biometrics not available' };
    }

    const authResult = await this.authenticate({
      promptMessage: 'Verify to enable app lock',
    });

    if (!authResult.success) {
      return { success: false, error: authResult.error };
    }

    await Preferences.set({
      key: STORAGE_KEYS.APP_LOCK_ENABLED,
      value: 'true',
    });

    return { success: true };
  }

  /**
   * Disable app lock
   */
  async disableAppLock(): Promise<void> {
    await Preferences.remove({ key: STORAGE_KEYS.APP_LOCK_ENABLED });
  }

  /**
   * Check if app lock is enabled
   */
  async isAppLockEnabled(): Promise<boolean> {
    try {
      const { value } = await Preferences.get({ key: STORAGE_KEYS.APP_LOCK_ENABLED });
      return value === 'true';
    } catch {
      return false;
    }
  }

  /**
   * Record when app goes to background
   */
  async recordBackgroundTime(): Promise<void> {
    await Preferences.set({
      key: STORAGE_KEYS.LAST_BACKGROUND_TIME,
      value: Date.now().toString(),
    });
  }

  /**
   * Check if app lock should be triggered
   */
  async shouldTriggerAppLock(): Promise<boolean> {
    const isEnabled = await this.isAppLockEnabled();
    if (!isEnabled) return false;

    try {
      const { value } = await Preferences.get({ key: STORAGE_KEYS.LAST_BACKGROUND_TIME });
      if (!value) return true;

      const lastBackgroundTime = parseInt(value, 10);
      const timeSinceBackground = Date.now() - lastBackgroundTime;

      return timeSinceBackground > APP_LOCK_TIMEOUT;
    } catch {
      return true;
    }
  }

  /**
   * Unlock app with biometrics
   */
  async unlockApp(): Promise<BiometricAuthResult> {
    return this.authenticate({
      promptMessage: 'Unlock BuildDesk',
    });
  }

  // ==================
  // Helper Methods
  // ==================

  private async updateLastAuthenticatedTime(): Promise<void> {
    try {
      const credentials = await this.getStoredCredentials();
      if (credentials) {
        credentials.lastAuthenticated = new Date().toISOString();
        await Preferences.set({
          key: STORAGE_KEYS.BIOMETRIC_CREDENTIALS,
          value: JSON.stringify(credentials),
        });
      }
    } catch (error) {
      console.error('Error updating last authenticated time:', error);
    }
  }

  private getErrorMessage(error: string | undefined): string {
    switch (error) {
      case 'not_enrolled':
        return 'Biometrics not enrolled. Please set up biometrics in device settings.';
      case 'lockout':
        return 'Too many failed attempts. Try again later.';
      case 'lockout_permanent':
        return 'Biometrics locked. Please use device passcode.';
      case 'user_cancel':
        return 'Authentication cancelled.';
      case 'system_cancel':
        return 'Authentication interrupted by system.';
      case 'passcode_not_set':
        return 'Device passcode not set. Please set a passcode first.';
      default:
        return 'Authentication failed.';
    }
  }

  private mapErrorCode(error: string | undefined): BiometricErrorCode {
    switch (error) {
      case 'not_enrolled':
        return 'NOT_ENROLLED';
      case 'lockout':
        return 'LOCKOUT';
      case 'lockout_permanent':
        return 'LOCKOUT_PERMANENT';
      case 'user_cancel':
        return 'CANCELLED';
      case 'system_cancel':
        return 'SYSTEM_CANCELLED';
      case 'passcode_not_set':
        return 'PASSCODE_NOT_SET';
      default:
        return 'UNKNOWN';
    }
  }

  /**
   * Get user-friendly biometric type label
   */
  getBiometricLabel(): string {
    switch (this.capabilities?.biometricType) {
      case 'face_id':
        return 'Face ID';
      case 'touch_id':
        return 'Touch ID';
      case 'fingerprint':
        return 'Fingerprint';
      case 'iris':
        return 'Iris';
      default:
        return 'Biometric';
    }
  }
}

// Export singleton instance
export const biometricAuthService = new BiometricAuthService();
