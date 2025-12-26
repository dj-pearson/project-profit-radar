/**
 * Environment Variable Validation
 * Validates that required environment variables are present and properly configured
 */

import { logger } from './logger';

interface EnvConfig {
  /** Supabase project URL (main API: Kong, Auth, Database, Storage) */
  VITE_SUPABASE_URL: string;
  /** Supabase anonymous/public key */
  VITE_SUPABASE_PUBLISHABLE_KEY: string;
  /** Edge Functions URL (optional, defaults to SUPABASE_URL/functions/v1) */
  VITE_EDGE_FUNCTIONS_URL?: string;
  /** Supabase project ID (optional) */
  VITE_SUPABASE_PROJECT_ID?: string;
  /** PostHog API key (optional) */
  VITE_POSTHOG_API_KEY?: string;
  /** PostHog host URL (optional) */
  VITE_POSTHOG_HOST?: string;
}

/**
 * Default fallback values for development
 */
const FALLBACK_VALUES: Partial<EnvConfig> = {
  VITE_SUPABASE_URL: 'https://api.build-desk.com',
  VITE_SUPABASE_PUBLISHABLE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0',
};

/**
 * Required environment variables
 * Note: These have fallbacks in development, so missing values are warnings not errors
 */
const REQUIRED_ENV_VARS: (keyof EnvConfig)[] = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_PUBLISHABLE_KEY',
];

/**
 * Optional environment variables
 */
const OPTIONAL_ENV_VARS: (keyof EnvConfig)[] = [
  'VITE_EDGE_FUNCTIONS_URL',
  'VITE_SUPABASE_PROJECT_ID',
  'VITE_POSTHOG_API_KEY',
  'VITE_POSTHOG_HOST',
];

/**
 * Get an environment variable value
 */
const getEnvVar = (key: string): string | undefined => {
  return import.meta.env[key];
};

/**
 * Validate a single environment variable
 */
const validateEnvVar = (key: string, required: boolean): boolean => {
  const value = getEnvVar(key);
  const hasFallback = key in FALLBACK_VALUES;

  if (!value || value.trim() === '') {
    if (required) {
      if (hasFallback && import.meta.env.DEV) {
        // In development with fallback available, just warn
        logger.warn(`Using fallback value for: ${key}`);
        return true;
      } else if (!import.meta.env.PROD) {
        // Only log errors in production without fallbacks
        logger.warn(`Missing environment variable: ${key} (using fallback)`);
        return true;
      } else {
        logger.error(`Missing required environment variable: ${key}`);
        return false;
      }
    } else {
      logger.info(`Optional environment variable not set: ${key}`);
      return true;
    }
  }

  // Additional validation for specific vars
  if (key === 'VITE_SUPABASE_URL') {
    try {
      new URL(value);
    } catch {
      logger.error(`Invalid VITE_SUPABASE_URL: Must be a valid URL`, undefined, { value });
      return false;
    }
  }

  if (key === 'VITE_EDGE_FUNCTIONS_URL' && value) {
    try {
      new URL(value);
    } catch {
      logger.warn(`Invalid VITE_EDGE_FUNCTIONS_URL: Should be a valid URL`, { value });
    }
  }

  if (key === 'VITE_POSTHOG_HOST' && value) {
    try {
      new URL(value);
    } catch {
      logger.warn(`Invalid VITE_POSTHOG_HOST: Should be a valid URL`, { value });
    }
  }

  logger.debug(`Environment variable ${key} is valid`);
  return true;
};

/**
 * Validate all environment variables
 * @returns true if all required variables are present and valid
 */
export const validateEnvironment = (): boolean => {
  logger.info('Validating environment variables...');

  let isValid = true;

  // Check required variables
  for (const key of REQUIRED_ENV_VARS) {
    if (!validateEnvVar(key, true)) {
      isValid = false;
    }
  }

  // Check optional variables (just for logging)
  for (const key of OPTIONAL_ENV_VARS) {
    validateEnvVar(key, false);
  }

  if (isValid) {
    logger.info('Environment validation successful');
  } else {
    logger.error('Environment validation failed - some required variables are missing');
  }

  return isValid;
};

/**
 * Get environment configuration with defaults/fallbacks
 */
export const getEnvConfig = (): EnvConfig => {
  return {
    VITE_SUPABASE_URL: getEnvVar('VITE_SUPABASE_URL') || FALLBACK_VALUES.VITE_SUPABASE_URL || '',
    VITE_SUPABASE_PUBLISHABLE_KEY: getEnvVar('VITE_SUPABASE_PUBLISHABLE_KEY') || FALLBACK_VALUES.VITE_SUPABASE_PUBLISHABLE_KEY || '',
    VITE_EDGE_FUNCTIONS_URL: getEnvVar('VITE_EDGE_FUNCTIONS_URL'),
    VITE_SUPABASE_PROJECT_ID: getEnvVar('VITE_SUPABASE_PROJECT_ID'),
    VITE_POSTHOG_API_KEY: getEnvVar('VITE_POSTHOG_API_KEY'),
    VITE_POSTHOG_HOST: getEnvVar('VITE_POSTHOG_HOST'),
  };
};

/**
 * Check if we're in development mode
 */
export const isDevelopment = (): boolean => {
  return import.meta.env.DEV;
};

/**
 * Check if we're in production mode
 */
export const isProduction = (): boolean => {
  return import.meta.env.PROD;
};

/**
 * Get current environment mode
 */
export const getMode = (): string => {
  return import.meta.env.MODE;
};

/**
 * Display environment information (development only)
 */
export const displayEnvInfo = (): void => {
  if (!isDevelopment()) return;

  const config = getEnvConfig();

  logger.group('Environment Configuration', () => {
    logger.debug('Mode:', getMode());
    logger.debug('Supabase URL:', config.VITE_SUPABASE_URL ? '✓ Set' : '✗ Missing');
    logger.debug('Supabase Key:', config.VITE_SUPABASE_PUBLISHABLE_KEY ? '✓ Set' : '✗ Missing');
    logger.debug('Edge Functions URL:', config.VITE_EDGE_FUNCTIONS_URL ? '✓ Set' : '- Using default');
    logger.debug('Supabase Project ID:', config.VITE_SUPABASE_PROJECT_ID ? '✓ Set' : '- Optional');
    logger.debug('PostHog API Key:', config.VITE_POSTHOG_API_KEY ? '✓ Set' : '- Optional');
    logger.debug('PostHog Host:', config.VITE_POSTHOG_HOST || '- Using default');
  });
};

/**
 * Assert that environment is valid, throw error if not (development only)
 */
export const assertValidEnvironment = (): void => {
  if (!validateEnvironment()) {
    if (isDevelopment()) {
      const message = `
╔═══════════════════════════════════════════════════════════════╗
║                  ENVIRONMENT SETUP REQUIRED                    ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  Missing required environment variables!                      ║
║                                                               ║
║  Please create a .env file in the project root with:         ║
║                                                               ║
║  VITE_SUPABASE_URL=https://api.build-desk.com                ║
║  VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key                 ║
║                                                               ║
║  Optional variables (for self-hosted):                        ║
║  VITE_EDGE_FUNCTIONS_URL=https://functions.build-desk.com    ║
║  VITE_POSTHOG_API_KEY=your-posthog-key                       ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
      `.trim();

      console.error(message);
      throw new Error('Environment validation failed');
    }
  }
};

// Validate on import (development only)
if (typeof window !== 'undefined' && isDevelopment()) {
  displayEnvInfo();
}
