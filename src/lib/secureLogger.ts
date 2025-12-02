/**
 * Secure Logger Utility
 * SECURITY: Masks sensitive data in logs to prevent PII exposure
 */

// Patterns to detect and mask sensitive data
const SENSITIVE_PATTERNS = {
  // Email addresses
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,

  // Phone numbers (various formats)
  phone: /(\+?1[-.\s]?)?(\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}/g,

  // Credit card numbers
  creditCard: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,

  // SSN
  ssn: /\b\d{3}-\d{2}-\d{4}\b/g,

  // JWT tokens
  jwt: /eyJ[A-Za-z0-9-_]+\.eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_.+/=]*/g,

  // API keys (common patterns)
  apiKey: /\b[A-Za-z0-9]{32,}\b/g,

  // Passwords in URLs or objects
  password: /(password|passwd|pwd)["']?\s*[:=]\s*["']?([^"'\s&]+)/gi,

  // Auth tokens
  authToken: /(token|auth|bearer)["']?\s*[:=]\s*["']?([^"'\s&]+)/gi,
};

// Keys in objects that should be masked
const SENSITIVE_KEYS = [
  'password',
  'passwd',
  'pwd',
  'secret',
  'token',
  'auth',
  'authorization',
  'apiKey',
  'api_key',
  'accessToken',
  'access_token',
  'refreshToken',
  'refresh_token',
  'ssn',
  'social_security',
  'creditCard',
  'credit_card',
  'cardNumber',
  'card_number',
  'cvv',
  'pin',
];

/**
 * Mask sensitive string data
 */
export const maskSensitiveString = (str: string): string => {
  if (!str || typeof str !== 'string') return str;

  let masked = str;

  // Mask email addresses
  masked = masked.replace(SENSITIVE_PATTERNS.email, (match) => {
    const [localPart, domain] = match.split('@');
    return `${localPart.substring(0, 2)}***@${domain}`;
  });

  // Mask phone numbers
  masked = masked.replace(SENSITIVE_PATTERNS.phone, '***-***-****');

  // Mask credit cards
  masked = masked.replace(SENSITIVE_PATTERNS.creditCard, '**** **** **** ****');

  // Mask SSN
  masked = masked.replace(SENSITIVE_PATTERNS.ssn, '***-**-****');

  // Mask JWT tokens
  masked = masked.replace(SENSITIVE_PATTERNS.jwt, 'eyJ***.[MASKED]');

  // Mask password values
  masked = masked.replace(SENSITIVE_PATTERNS.password, '$1: [MASKED]');

  // Mask auth token values
  masked = masked.replace(SENSITIVE_PATTERNS.authToken, '$1: [MASKED]');

  return masked;
};

/**
 * Mask sensitive data in objects
 */
export const maskSensitiveObject = (obj: any): any => {
  if (!obj || typeof obj !== 'object') {
    return typeof obj === 'string' ? maskSensitiveString(obj) : obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => maskSensitiveObject(item));
  }

  const masked: any = {};

  for (const [key, value] of Object.entries(obj)) {
    // Check if key is sensitive
    const isSensitiveKey = SENSITIVE_KEYS.some(sensitiveKey =>
      key.toLowerCase().includes(sensitiveKey.toLowerCase())
    );

    if (isSensitiveKey) {
      masked[key] = '[MASKED]';
    } else if (typeof value === 'string') {
      masked[key] = maskSensitiveString(value);
    } else if (typeof value === 'object' && value !== null) {
      masked[key] = maskSensitiveObject(value);
    } else {
      masked[key] = value;
    }
  }

  return masked;
};

/**
 * Safe console logger that masks sensitive data
 */
class SecureLogger {
  private isDevelopment = import.meta.env.DEV;
  private isProduction = import.meta.env.PROD;

  /**
   * Format arguments for logging
   */
  private formatArgs(...args: any[]): any[] {
    return args.map(arg => {
      if (typeof arg === 'string') {
        return maskSensitiveString(arg);
      } else if (typeof arg === 'object' && arg !== null) {
        return maskSensitiveObject(arg);
      }
      return arg;
    });
  }

  /**
   * Log info messages (development only)
   */
  info(...args: any[]): void {
    if (this.isDevelopment) {
    }
  }

  /**
   * Log debug messages (development only)
   */
  debug(...args: any[]): void {
    if (this.isDevelopment) {
    }
  }

  /**
   * Log warnings (always)
   */
  warn(...args: any[]): void {
    console.warn(...this.formatArgs(...args));
  }

  /**
   * Log errors (always, but mask sensitive data)
   */
  error(...args: any[]): void {
    console.error(...this.formatArgs(...args));
  }

  /**
   * Log messages (development only)
   */
  log(...args: any[]): void {
    if (this.isDevelopment) {
    }
  }

  /**
   * Group logs (development only)
   */
  group(label: string, callback?: () => void): void {
    if (this.isDevelopment) {
      console.group(maskSensitiveString(label));
      if (callback) {
        callback();
        console.groupEnd();
      }
    }
  }

  /**
   * End log group
   */
  groupEnd(): void {
    if (this.isDevelopment) {
      console.groupEnd();
    }
  }

  /**
   * Log table (development only)
   */
  table(data: any): void {
    if (this.isDevelopment) {
      console.table(maskSensitiveObject(data));
    }
  }

  /**
   * Log trace (development only)
   */
  trace(...args: any[]): void {
    if (this.isDevelopment) {
      console.trace(...this.formatArgs(...args));
    }
  }
}

// Export singleton instance
export const secureLogger = new SecureLogger();

// Export individual functions for convenience
export const { info, debug, warn, error, log, group, groupEnd, table, trace } = secureLogger;

// Default export
export default secureLogger;
