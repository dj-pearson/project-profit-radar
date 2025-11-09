/**
 * Session Fingerprinting
 * SECURITY: Binds sessions to device characteristics to prevent session hijacking
 */

import { SESSION_CONFIG } from '@/config/sessionConfig';

interface DeviceFingerprint {
  userAgent: string;
  language: string;
  platform: string;
  screenResolution: string;
  timezone: string;
  colorDepth: number;
  hardwareConcurrency: number;
  deviceMemory?: number;
  touchSupport: boolean;
  hash: string;
}

/**
 * Generate device fingerprint hash
 */
const generateHash = async (data: string): Promise<string> => {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

/**
 * Collect device characteristics
 */
const collectDeviceCharacteristics = (): Omit<DeviceFingerprint, 'hash'> => {
  const nav = navigator as any;

  return {
    userAgent: navigator.userAgent,
    language: navigator.language,
    platform: navigator.platform,
    screenResolution: `${screen.width}x${screen.height}x${screen.colorDepth}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    colorDepth: screen.colorDepth,
    hardwareConcurrency: navigator.hardwareConcurrency || 0,
    deviceMemory: nav.deviceMemory,
    touchSupport: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
  };
};

/**
 * Generate device fingerprint
 */
export const generateDeviceFingerprint = async (): Promise<DeviceFingerprint> => {
  const characteristics = collectDeviceCharacteristics();

  // Create fingerprint string
  const fingerprintData = [
    characteristics.userAgent,
    characteristics.language,
    characteristics.platform,
    characteristics.screenResolution,
    characteristics.timezone,
    characteristics.colorDepth.toString(),
    characteristics.hardwareConcurrency.toString(),
    characteristics.deviceMemory?.toString() || 'unknown',
    characteristics.touchSupport.toString(),
  ].join('|');

  const hash = await generateHash(fingerprintData);

  return {
    ...characteristics,
    hash,
  };
};

/**
 * Store device fingerprint
 */
export const storeDeviceFingerprint = async (): Promise<string> => {
  try {
    const fingerprint = await generateDeviceFingerprint();
    const fingerprintJson = JSON.stringify(fingerprint);

    sessionStorage.setItem(
      SESSION_CONFIG.STORAGE_KEYS.SESSION_FINGERPRINT,
      fingerprintJson
    );

    return fingerprint.hash;
  } catch (error) {
    console.error('Failed to store device fingerprint:', error);
    return '';
  }
};

/**
 * Get stored device fingerprint
 */
export const getStoredFingerprint = (): DeviceFingerprint | null => {
  try {
    const stored = sessionStorage.getItem(SESSION_CONFIG.STORAGE_KEYS.SESSION_FINGERPRINT);
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.error('Failed to get stored fingerprint:', error);
    return null;
  }
};

/**
 * Verify device fingerprint matches
 */
export const verifyDeviceFingerprint = async (): Promise<{
  isValid: boolean;
  reason?: string;
}> => {
  try {
    const storedFingerprint = getStoredFingerprint();

    if (!storedFingerprint) {
      return { isValid: false, reason: 'No stored fingerprint' };
    }

    const currentFingerprint = await generateDeviceFingerprint();

    // Compare hashes
    if (storedFingerprint.hash !== currentFingerprint.hash) {
      // Check which characteristics changed
      const changes: string[] = [];

      if (storedFingerprint.userAgent !== currentFingerprint.userAgent) {
        changes.push('userAgent');
      }
      if (storedFingerprint.screenResolution !== currentFingerprint.screenResolution) {
        changes.push('screenResolution');
      }
      if (storedFingerprint.timezone !== currentFingerprint.timezone) {
        changes.push('timezone');
      }
      if (storedFingerprint.language !== currentFingerprint.language) {
        changes.push('language');
      }

      // Some changes are acceptable (screen resolution change, window resize)
      const acceptableChanges = ['screenResolution'];
      const criticalChanges = changes.filter(c => !acceptableChanges.includes(c));

      if (criticalChanges.length > 0) {
        return {
          isValid: false,
          reason: `Device characteristics changed: ${criticalChanges.join(', ')}`,
        };
      }
    }

    return { isValid: true };
  } catch (error) {
    console.error('Failed to verify device fingerprint:', error);
    return { isValid: false, reason: 'Verification error' };
  }
};

/**
 * Clear device fingerprint
 */
export const clearDeviceFingerprint = (): void => {
  try {
    sessionStorage.removeItem(SESSION_CONFIG.STORAGE_KEYS.SESSION_FINGERPRINT);
  } catch (error) {
    console.error('Failed to clear device fingerprint:', error);
  }
};

/**
 * Initialize session with fingerprint
 */
export const initializeSessionFingerprint = async (): Promise<string> => {
  // Clear any existing fingerprint
  clearDeviceFingerprint();

  // Generate and store new fingerprint
  return await storeDeviceFingerprint();
};

/**
 * Monitor for device changes (run periodically)
 */
export const monitorDeviceChanges = async (
  onInvalidSession: (reason: string) => void
): Promise<void> => {
  const verification = await verifyDeviceFingerprint();

  if (!verification.isValid && verification.reason) {
    console.warn('Session fingerprint mismatch:', verification.reason);
    onInvalidSession(verification.reason);
  }
};

export default {
  generateDeviceFingerprint,
  storeDeviceFingerprint,
  getStoredFingerprint,
  verifyDeviceFingerprint,
  clearDeviceFingerprint,
  initializeSessionFingerprint,
  monitorDeviceChanges,
};
