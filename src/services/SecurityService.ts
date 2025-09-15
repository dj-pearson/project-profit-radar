import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import Decimal from 'decimal.js';

export interface SecurityEvent {
  id: string;
  eventType: 'login_attempt' | 'failed_login' | 'suspicious_activity' | 'data_access' | 'permission_change';
  userId?: string;
  ipAddress: string;
  userAgent: string;
  details: Record<string, any>;
  riskScore: number;
  timestamp: string;
}

export interface SecurityPolicy {
  maxLoginAttempts: number;
  lockoutDuration: number; // minutes
  passwordMinLength: number;
  passwordRequireSpecialChars: boolean;
  sessionTimeout: number; // minutes
  requireMFA: boolean;
  allowedDomains: string[];
  ipWhitelist: string[];
}

export interface FinancialCalculation {
  amount: Decimal;
  currency: string;
  precision: number;
  calculation: string;
  timestamp: string;
}

class SecurityService {
  private readonly defaultPolicy: SecurityPolicy = {
    maxLoginAttempts: 5,
    lockoutDuration: 30,
    passwordMinLength: 8,
    passwordRequireSpecialChars: true,
    sessionTimeout: 480, // 8 hours
    requireMFA: false,
    allowedDomains: [],
    ipWhitelist: [],
  };

  /**
   * Secure financial calculations using Decimal.js
   */
  calculateFinancial(
    operation: 'add' | 'subtract' | 'multiply' | 'divide',
    a: number | string,
    b: number | string,
    precision: number = 2
  ): FinancialCalculation {
    try {
      const decimalA = new Decimal(a);
      const decimalB = new Decimal(b);
      let result: Decimal;

      switch (operation) {
        case 'add':
          result = decimalA.add(decimalB);
          break;
        case 'subtract':
          result = decimalA.sub(decimalB);
          break;
        case 'multiply':
          result = decimalA.mul(decimalB);
          break;
        case 'divide':
          if (decimalB.isZero()) {
            throw new Error('Division by zero');
          }
          result = decimalA.div(decimalB);
          break;
        default:
          throw new Error(`Unsupported operation: ${operation}`);
      }

      return {
        amount: result.toDecimalPlaces(precision),
        currency: 'USD', // Default, should be configurable
        precision,
        calculation: `${a} ${operation} ${b} = ${result.toFixed(precision)}`,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      throw new Error(`Financial calculation error: ${error.message}`);
    }
  }

  /**
   * Calculate project budget with precise decimal arithmetic
   */
  calculateProjectBudget(items: Array<{ quantity: number; unitCost: number; markup?: number }>): FinancialCalculation {
    try {
      let total = new Decimal(0);
      
      for (const item of items) {
        const quantity = new Decimal(item.quantity);
        const unitCost = new Decimal(item.unitCost);
        const markup = new Decimal(item.markup || 0);
        
        // Calculate item total: (quantity * unitCost) * (1 + markup)
        const itemSubtotal = quantity.mul(unitCost);
        const markupMultiplier = new Decimal(1).add(markup.div(100));
        const itemTotal = itemSubtotal.mul(markupMultiplier);
        
        total = total.add(itemTotal);
      }

      return {
        amount: total.toDecimalPlaces(2),
        currency: 'USD',
        precision: 2,
        calculation: `Project budget calculation for ${items.length} items`,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      throw new Error(`Budget calculation error: ${error.message}`);
    }
  }

  /**
   * Validate and sanitize user input
   */
  sanitizeInput(input: string, type: 'text' | 'email' | 'phone' | 'currency' = 'text'): string {
    if (typeof input !== 'string') {
      throw new Error('Input must be a string');
    }

    // Remove null bytes and control characters
    let sanitized = input.replace(/[\x00-\x1F\x7F]/g, '');
    
    // Trim whitespace
    sanitized = sanitized.trim();

    switch (type) {
      case 'email':
        // Basic email validation and sanitization
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(sanitized)) {
          throw new Error('Invalid email format');
        }
        return sanitized.toLowerCase();

      case 'phone':
        // Remove all non-numeric characters except +
        sanitized = sanitized.replace(/[^\d+]/g, '');
        if (sanitized.length < 10) {
          throw new Error('Phone number too short');
        }
        return sanitized;

      case 'currency':
        // Remove currency symbols and validate numeric format
        sanitized = sanitized.replace(/[$,]/g, '');
        if (!/^\d+(\.\d{1,2})?$/.test(sanitized)) {
          throw new Error('Invalid currency format');
        }
        return sanitized;

      default:
        // HTML encode special characters
        return sanitized
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#x27;');
    }
  }

  /**
   * Log security events
   */
  async logSecurityEvent(event: Omit<SecurityEvent, 'id' | 'timestamp'>): Promise<void> {
    try {
      const securityEvent: SecurityEvent = {
        ...event,
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
      };

      // Store in security logs
      const { error } = await supabase
        .from('security_logs')
        .insert([{
          event_type: securityEvent.eventType,
          user_id: securityEvent.userId,
          ip_address: securityEvent.ipAddress,
          user_agent: securityEvent.userAgent,
          details: securityEvent.details,
          risk_score: securityEvent.riskScore,
        }]);

      if (error) throw error;

      // Alert on high-risk events
      if (securityEvent.riskScore >= 80) {
        this.handleHighRiskEvent(securityEvent);
      }

    } catch (error: any) {
      console.error('Error logging security event:', error);
    }
  }

  /**
   * Check for suspicious activity patterns
   */
  async detectSuspiciousActivity(userId: string, ipAddress: string): Promise<boolean> {
    try {
      // Check recent failed login attempts
      const { data: recentFailures, error } = await supabase
        .from('security_logs')
        .select('*')
        .eq('event_type', 'failed_login')
        .eq('ip_address', ipAddress)
        .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()) // Last hour
        .order('created_at', { ascending: false });

      if (error) throw error;

      const failureCount = recentFailures?.length || 0;
      
      // Check for multiple failures from same IP
      if (failureCount >= this.defaultPolicy.maxLoginAttempts) {
        await this.logSecurityEvent({
          eventType: 'suspicious_activity',
          userId,
          ipAddress,
          userAgent: navigator.userAgent,
          details: { reason: 'Multiple failed login attempts', count: failureCount },
          riskScore: 90,
        });
        return true;
      }

      // Check for unusual access patterns (placeholder for more complex logic)
      const { data: recentActivity } = await supabase
        .from('security_logs')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
        .order('created_at', { ascending: false });

      // Detect unusual geographic access (would need IP geolocation)
      const uniqueIPs = new Set(recentActivity?.map(log => log.ip_address) || []);
      if (uniqueIPs.size > 5) {
        await this.logSecurityEvent({
          eventType: 'suspicious_activity',
          userId,
          ipAddress,
          userAgent: navigator.userAgent,
          details: { reason: 'Multiple IP addresses', count: uniqueIPs.size },
          riskScore: 70,
        });
        return true;
      }

      return false;

    } catch (error: any) {
      console.error('Error detecting suspicious activity:', error);
      return false;
    }
  }

  /**
   * Validate password strength
   */
  validatePassword(password: string): { isValid: boolean; errors: string[]; score: number } {
    const errors: string[] = [];
    let score = 0;

    // Length check
    if (password.length < this.defaultPolicy.passwordMinLength) {
      errors.push(`Password must be at least ${this.defaultPolicy.passwordMinLength} characters`);
    } else {
      score += 20;
    }

    // Character variety checks
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain lowercase letters');
    } else {
      score += 10;
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain uppercase letters');
    } else {
      score += 10;
    }

    if (!/\d/.test(password)) {
      errors.push('Password must contain numbers');
    } else {
      score += 10;
    }

    if (this.defaultPolicy.passwordRequireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain special characters');
    } else if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      score += 20;
    }

    // Length bonus
    if (password.length >= 12) score += 20;
    if (password.length >= 16) score += 10;

    // Common password check (simplified)
    const commonPasswords = ['password', '123456', 'admin', 'qwerty'];
    if (commonPasswords.some(common => password.toLowerCase().includes(common))) {
      errors.push('Password contains common patterns');
      score -= 30;
    }

    return {
      isValid: errors.length === 0,
      errors,
      score: Math.max(0, Math.min(100, score)),
    };
  }

  /**
   * Generate Content Security Policy
   */
  generateCSP(): string {
    const policy = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://unpkg.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https: blob:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
      "media-src 'self' blob:",
      "object-src 'none'",
      "frame-src 'self'",
      "worker-src 'self' blob:",
      "form-action 'self'",
      "base-uri 'self'",
      "upgrade-insecure-requests"
    ];

    return policy.join('; ');
  }

  /**
   * Rate limiting check
   */
  async checkRateLimit(identifier: string, action: string, limit: number = 100, windowMs: number = 60000): Promise<boolean> {
    const key = `${identifier}:${action}`;
    const now = Date.now();
    const windowStart = now - windowMs;

    try {
      // Get recent requests for this identifier/action
      const { data: recentRequests, error } = await supabase
        .from('rate_limit_logs')
        .select('created_at')
        .eq('identifier', key)
        .gte('created_at', new Date(windowStart).toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      const requestCount = recentRequests?.length || 0;

      if (requestCount >= limit) {
        // Log rate limit violation
        await this.logSecurityEvent({
          eventType: 'suspicious_activity',
          ipAddress: identifier,
          userAgent: navigator.userAgent,
          details: { reason: 'Rate limit exceeded', action, count: requestCount },
          riskScore: 60,
        });
        return false;
      }

      // Log this request
      await supabase
        .from('rate_limit_logs')
        .insert([{
          identifier: key,
          action,
          created_at: new Date().toISOString(),
        }]);

      return true;

    } catch (error: any) {
      console.error('Error checking rate limit:', error);
      return true; // Allow on error to avoid blocking legitimate users
    }
  }

  /**
   * Secure file upload validation
   */
  validateFileUpload(file: File): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // File size check (10MB limit)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      errors.push('File size exceeds 10MB limit');
    }

    // File type validation
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/pdf',
      'text/plain',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];

    if (!allowedTypes.includes(file.type)) {
      errors.push(`File type ${file.type} is not allowed`);
    }

    // File name validation
    if (!/^[a-zA-Z0-9._-]+$/.test(file.name)) {
      errors.push('File name contains invalid characters');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Handle high-risk security events
   */
  private async handleHighRiskEvent(event: SecurityEvent): Promise<void> {
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.warn('High-risk security event:', event);
    }

    // Show user notification for relevant events
    if (event.eventType === 'suspicious_activity') {
      toast({
        title: "Security Alert",
        description: "Suspicious activity detected. Please verify your account security.",
        variant: "destructive",
      });
    }

    // In production, this would trigger additional security measures:
    // - Email notifications to admins
    // - Temporary account lockdowns
    // - Integration with security monitoring systems
  }

  /**
   * Environment validation
   */
  validateEnvironment(): { isSecure: boolean; warnings: string[] } {
    const warnings: string[] = [];

    // Check for HTTPS in production
    if (process.env.NODE_ENV === 'production' && window.location.protocol !== 'https:') {
      warnings.push('Application should use HTTPS in production');
    }

    // Check for development tools in production
    if (process.env.NODE_ENV === 'production' && (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__) {
      warnings.push('React DevTools detected in production build');
    }

    // Check for console access
    if (process.env.NODE_ENV === 'production' && typeof window.console !== 'undefined') {
      // In production, you might want to disable console or redirect to logging service
      warnings.push('Console access available in production');
    }

    return {
      isSecure: warnings.length === 0,
      warnings,
    };
  }
}

// Export singleton instance
export const securityService = new SecurityService();
export default securityService;

// Export Decimal for use in other components
export { Decimal };
