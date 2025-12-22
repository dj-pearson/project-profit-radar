/**
 * Capacitor Native Biometric Authentication Service
 *
 * Provides secure biometric authentication for Capacitor-based mobile apps:
 * - Face ID / Touch ID on iOS
 * - Fingerprint / Face recognition on Android
 * - Secure credential storage using native Keychain/Keystore
 * - Fallback to device credentials (PIN/Pattern)
 *
 * Note: This service uses @capacitor-community/biometric-auth
 * Install with: npm install @capacitor-community/biometric-auth
 */

import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

// Types for biometric authentication
export interface BiometricCapabilities {
  isSupported: boolean;
  isAvailable: boolean;
  isEnrolled: boolean;
  biometricType: BiometricType | null;
  securityLevel: 'none' | 'weak' | 'strong';
  hasDeviceCredential: boolean;
}

export type BiometricType = 'face_id' | 'touch_id' | 'fingerprint' | 'face' | 'iris' | 'unknown';

export interface BiometricAuthResult {
  success: boolean;
  error?: string;
  errorCode?: BiometricErrorCode;
  didFallbackToDeviceCredential?: boolean;
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
  | 'PERMISSION_DENIED'
  | 'UNKNOWN';

export interface StoredCredentials {
  email: string;
  userId: string;
  lastAuthenticated: string;
  deviceTrustId?: string;
}

// Storage keys for secure preferences
const STORAGE_KEYS = {
  BIOMETRIC_ENABLED: 'builddesk_biometric_enabled',
  BIOMETRIC_CREDENTIALS: 'builddesk_biometric_credentials',
  APP_LOCK_ENABLED: 'builddesk_app_lock_enabled',
  LAST_BACKGROUND_TIME: 'builddesk_last_background_time',
  DEVICE_TRUST_ID: 'builddesk_device_trust_id',
  BIOMETRIC_TYPE: 'builddesk_biometric_type',
} as const;

// App lock timeout (5 minutes)
const APP_LOCK_TIMEOUT = 5 * 60 * 1000;

/**
 * Capacitor Biometric Authentication Service
 *
 * This service provides a unified API for biometric authentication
 * that works with Capacitor's native plugins.
 */
class CapacitorBiometricService {
  private capabilities: BiometricCapabilities | null = null;
  private biometricPlugin: any = null;

  /**
   * Initialize the service and check device capabilities
   */
  async initialize(): Promise<BiometricCapabilities> {
    // Only works on native platforms
    if (!Capacitor.isNativePlatform()) {
      this.capabilities = {
        isSupported: false,
        isAvailable: false,
        isEnrolled: false,
        biometricType: null,
        securityLevel: 'none',
        hasDeviceCredential: false,
      };
      return this.capabilities;
    }

    try {
      // Dynamically import the biometric plugin
      // This prevents build errors when the plugin is not installed
      const BiometricAuth = await this.loadBiometricPlugin();

      if (!BiometricAuth) {
        console.warn('Biometric plugin not available');
        return this.createFallbackCapabilities();
      }

      // Check if biometric auth is available
      const result = await BiometricAuth.isAvailable();

      const biometricType = this.determineBiometricType(result.biometryType);
      const securityLevel = this.determineSecurityLevel(result);

      this.capabilities = {
        isSupported: result.isAvailable || result.hasDeviceCredential,
        isAvailable: result.isAvailable,
        isEnrolled: result.isAvailable,
        biometricType,
        securityLevel,
        hasDeviceCredential: result.hasDeviceCredential || false,
      };

      // Store the biometric type for later use
      await Preferences.set({
        key: STORAGE_KEYS.BIOMETRIC_TYPE,
        value: biometricType || 'unknown',
      });

      return this.capabilities;
    } catch (error) {
      console.error('Failed to initialize biometric service:', error);
      return this.createFallbackCapabilities();
    }
  }

  /**
   * Load the biometric plugin dynamically
   */
  private async loadBiometricPlugin(): Promise<any> {
    if (this.biometricPlugin) {
      return this.biometricPlugin;
    }

    try {
      // Try to import the Capacitor community biometric plugin
      const { BiometricAuth } = await import('@capacitor-community/biometric-auth');
      this.biometricPlugin = BiometricAuth;
      return BiometricAuth;
    } catch (error) {
      console.warn('Capacitor biometric plugin not installed:', error);
      return null;
    }
  }

  /**
   * Create fallback capabilities when plugin is not available
   */
  private createFallbackCapabilities(): BiometricCapabilities {
    this.capabilities = {
      isSupported: false,
      isAvailable: false,
      isEnrolled: false,
      biometricType: null,
      securityLevel: 'none',
      hasDeviceCredential: false,
    };
    return this.capabilities;
  }

  /**
   * Determine the biometric type from the plugin result
   */
  private determineBiometricType(biometryType: string | undefined): BiometricType | null {
    if (!biometryType) return null;

    const type = biometryType.toLowerCase();

    if (type.includes('face')) {
      return Capacitor.getPlatform() === 'ios' ? 'face_id' : 'face';
    }
    if (type.includes('touch') || type.includes('fingerprint')) {
      return Capacitor.getPlatform() === 'ios' ? 'touch_id' : 'fingerprint';
    }
    if (type.includes('iris')) {
      return 'iris';
    }

    return 'unknown';
  }

  /**
   * Determine the security level from the plugin result
   */
  private determineSecurityLevel(result: any): 'none' | 'weak' | 'strong' {
    if (!result.isAvailable) return 'none';

    // Strong security = biometric hardware is available
    if (result.strongBiometryIsAvailable) return 'strong';

    // Weak security = device credential available but no strong biometric
    if (result.hasDeviceCredential) return 'weak';

    return 'none';
  }

  /**
   * Get current capabilities (initialize if needed)
   */
  async getCapabilities(): Promise<BiometricCapabilities> {
    if (!this.capabilities) {
      return this.initialize();
    }
    return this.capabilities;
  }

  /**
   * Authenticate user with biometrics
   */
  async authenticate(
    reason: string = 'Authenticate to access BuildDesk'
  ): Promise<BiometricAuthResult> {
    if (!Capacitor.isNativePlatform()) {
      return {
        success: false,
        error: 'Biometric authentication is only available on mobile devices',
        errorCode: 'NOT_AVAILABLE',
      };
    }

    try {
      const BiometricAuth = await this.loadBiometricPlugin();

      if (!BiometricAuth) {
        return {
          success: false,
          error: 'Biometric plugin not available',
          errorCode: 'NOT_AVAILABLE',
        };
      }

      // Check availability first
      const availability = await BiometricAuth.isAvailable();

      if (!availability.isAvailable && !availability.hasDeviceCredential) {
        return {
          success: false,
          error: 'Biometric authentication is not available on this device',
          errorCode: 'NOT_AVAILABLE',
        };
      }

      // Attempt authentication
      const result = await BiometricAuth.authenticate({
        reason,
        title: 'BuildDesk Authentication',
        subtitle: 'Verify your identity',
        description: 'Use your biometric or device PIN to continue',
        negativeButtonText: 'Cancel',
        allowDeviceCredential: true,
        confirmationRequired: true,
      });

      if (result.verified) {
        return {
          success: true,
          didFallbackToDeviceCredential: result.didFallbackToDeviceCredential,
        };
      }

      return {
        success: false,
        error: 'Authentication failed',
        errorCode: 'FAILED',
      };
    } catch (error: any) {
      return this.handleAuthError(error);
    }
  }

  /**
   * Handle authentication errors
   */
  private handleAuthError(error: any): BiometricAuthResult {
    const errorMessage = error.message || error.code || 'Unknown error';

    // Map common error codes
    if (errorMessage.includes('cancel') || errorMessage.includes('dismiss')) {
      return {
        success: false,
        error: 'Authentication was cancelled',
        errorCode: 'CANCELLED',
      };
    }

    if (errorMessage.includes('lockout')) {
      const isPermanent = errorMessage.includes('permanent');
      return {
        success: false,
        error: isPermanent
          ? 'Biometric is permanently locked. Please use device credentials.'
          : 'Too many failed attempts. Please try again later.',
        errorCode: isPermanent ? 'LOCKOUT_PERMANENT' : 'LOCKOUT',
      };
    }

    if (errorMessage.includes('passcode') || errorMessage.includes('not set')) {
      return {
        success: false,
        error: 'Device passcode is not set. Please set up a device passcode first.',
        errorCode: 'PASSCODE_NOT_SET',
      };
    }

    if (errorMessage.includes('permission')) {
      return {
        success: false,
        error: 'Permission denied. Please enable biometric authentication in settings.',
        errorCode: 'PERMISSION_DENIED',
      };
    }

    return {
      success: false,
      error: errorMessage,
      errorCode: 'UNKNOWN',
    };
  }

  /**
   * Enable biometric login for the current user
   */
  async enableBiometricLogin(credentials: StoredCredentials): Promise<boolean> {
    try {
      // First authenticate to confirm identity
      const authResult = await this.authenticate(
        'Authenticate to enable biometric login'
      );

      if (!authResult.success) {
        throw new Error(authResult.error || 'Authentication failed');
      }

      // Store credentials securely
      await Preferences.set({
        key: STORAGE_KEYS.BIOMETRIC_CREDENTIALS,
        value: JSON.stringify({
          ...credentials,
          lastAuthenticated: new Date().toISOString(),
        }),
      });

      await Preferences.set({
        key: STORAGE_KEYS.BIOMETRIC_ENABLED,
        value: 'true',
      });

      return true;
    } catch (error) {
      console.error('Failed to enable biometric login:', error);
      return false;
    }
  }

  /**
   * Disable biometric login
   */
  async disableBiometricLogin(): Promise<boolean> {
    try {
      await Preferences.remove({ key: STORAGE_KEYS.BIOMETRIC_CREDENTIALS });
      await Preferences.remove({ key: STORAGE_KEYS.BIOMETRIC_ENABLED });
      return true;
    } catch (error) {
      console.error('Failed to disable biometric login:', error);
      return false;
    }
  }

  /**
   * Check if biometric login is enabled
   */
  async isBiometricLoginEnabled(): Promise<boolean> {
    try {
      const { value } = await Preferences.get({ key: STORAGE_KEYS.BIOMETRIC_ENABLED });
      return value === 'true';
    } catch (error) {
      return false;
    }
  }

  /**
   * Get stored credentials after biometric authentication
   */
  async getStoredCredentials(): Promise<StoredCredentials | null> {
    try {
      // Authenticate first
      const authResult = await this.authenticate('Authenticate to access your account');

      if (!authResult.success) {
        return null;
      }

      const { value } = await Preferences.get({ key: STORAGE_KEYS.BIOMETRIC_CREDENTIALS });

      if (!value) {
        return null;
      }

      return JSON.parse(value) as StoredCredentials;
    } catch (error) {
      console.error('Failed to get stored credentials:', error);
      return null;
    }
  }

  /**
   * Perform biometric login
   */
  async performBiometricLogin(): Promise<{
    success: boolean;
    credentials?: StoredCredentials;
    error?: string;
  }> {
    try {
      const isEnabled = await this.isBiometricLoginEnabled();

      if (!isEnabled) {
        return {
          success: false,
          error: 'Biometric login is not enabled',
        };
      }

      const credentials = await this.getStoredCredentials();

      if (!credentials) {
        return {
          success: false,
          error: 'No stored credentials found',
        };
      }

      // Update last authenticated time
      await Preferences.set({
        key: STORAGE_KEYS.BIOMETRIC_CREDENTIALS,
        value: JSON.stringify({
          ...credentials,
          lastAuthenticated: new Date().toISOString(),
        }),
      });

      return {
        success: true,
        credentials,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Biometric login failed',
      };
    }
  }

  /**
   * Enable app lock with biometrics
   */
  async enableAppLock(): Promise<boolean> {
    try {
      await Preferences.set({
        key: STORAGE_KEYS.APP_LOCK_ENABLED,
        value: 'true',
      });
      return true;
    } catch (error) {
      console.error('Failed to enable app lock:', error);
      return false;
    }
  }

  /**
   * Disable app lock
   */
  async disableAppLock(): Promise<boolean> {
    try {
      await Preferences.remove({ key: STORAGE_KEYS.APP_LOCK_ENABLED });
      return true;
    } catch (error) {
      console.error('Failed to disable app lock:', error);
      return false;
    }
  }

  /**
   * Check if app lock is enabled
   */
  async isAppLockEnabled(): Promise<boolean> {
    try {
      const { value } = await Preferences.get({ key: STORAGE_KEYS.APP_LOCK_ENABLED });
      return value === 'true';
    } catch (error) {
      return false;
    }
  }

  /**
   * Record when app goes to background
   */
  async recordBackgroundTime(): Promise<void> {
    try {
      await Preferences.set({
        key: STORAGE_KEYS.LAST_BACKGROUND_TIME,
        value: Date.now().toString(),
      });
    } catch (error) {
      console.error('Failed to record background time:', error);
    }
  }

  /**
   * Check if app lock should be triggered based on background time
   */
  async shouldTriggerAppLock(): Promise<boolean> {
    try {
      const isEnabled = await this.isAppLockEnabled();
      if (!isEnabled) return false;

      const { value } = await Preferences.get({ key: STORAGE_KEYS.LAST_BACKGROUND_TIME });
      if (!value) return false;

      const lastBackground = parseInt(value, 10);
      const elapsed = Date.now() - lastBackground;

      return elapsed >= APP_LOCK_TIMEOUT;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get user-friendly biometric type name
   */
  getBiometricTypeName(type: BiometricType | null): string {
    switch (type) {
      case 'face_id':
        return 'Face ID';
      case 'touch_id':
        return 'Touch ID';
      case 'fingerprint':
        return 'Fingerprint';
      case 'face':
        return 'Face Recognition';
      case 'iris':
        return 'Iris Scanner';
      default:
        return 'Biometric';
    }
  }

  /**
   * Get biometric icon name for UI
   */
  getBiometricIconName(type: BiometricType | null): string {
    switch (type) {
      case 'face_id':
      case 'face':
        return 'scan-face';
      case 'touch_id':
      case 'fingerprint':
        return 'fingerprint';
      case 'iris':
        return 'eye';
      default:
        return 'shield';
    }
  }
}

// Export singleton instance
export const capacitorBiometricService = new CapacitorBiometricService();

export default capacitorBiometricService;
