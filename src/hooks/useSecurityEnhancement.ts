import { useEffect, useCallback } from 'react';
import { addSecurityHeaders, generateCSRFToken, setCSRFToken } from '@/utils/security';

interface SecurityConfig {
  enableCSP: boolean;
  enableCSRF: boolean;
  logViolations: boolean;
  rateLimitEnabled: boolean;
}

export const useSecurityEnhancement = (config: SecurityConfig = {
  enableCSP: true,
  enableCSRF: true,
  logViolations: true,
  rateLimitEnabled: true
}) => {
  // Initialize security headers and CSP
  useEffect(() => {
    if (config.enableCSP) {
      addSecurityHeaders();
    }
  }, [config.enableCSP]);

  // Setup CSRF protection
  useEffect(() => {
    if (config.enableCSRF) {
      const token = generateCSRFToken();
      setCSRFToken(token);
    }
  }, [config.enableCSRF]);

  // Setup CSP violation reporting
  useEffect(() => {
    if (config.logViolations) {
      const handleCSPViolation = (event: SecurityPolicyViolationEvent) => {
        console.warn('CSP Violation:', {
          blockedURI: event.blockedURI,
          violatedDirective: event.violatedDirective,
          originalPolicy: event.originalPolicy,
          documentURI: event.documentURI,
          lineNumber: event.lineNumber,
          columnNumber: event.columnNumber,
          sourceFile: event.sourceFile
        });

        // Log to backend for analysis
        fetch('/api/security/csp-violation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            blockedURI: event.blockedURI,
            violatedDirective: event.violatedDirective,
            originalPolicy: event.originalPolicy,
            documentURI: event.documentURI,
            timestamp: new Date().toISOString()
          })
        }).catch(console.error);
      };

      document.addEventListener('securitypolicyviolation', handleCSPViolation);
      
      return () => {
        document.removeEventListener('securitypolicyviolation', handleCSPViolation);
      };
    }
  }, [config.logViolations]);

  // Enhanced input validation for forms
  const validateSecureInput = useCallback((input: string, type: 'text' | 'email' | 'url' | 'phone' = 'text') => {
    // Basic XSS prevention
    const sanitized = input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    
    // Validate based on type
    switch (type) {
      case 'email':
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitized);
      case 'url':
        try {
          new URL(sanitized);
          return true;
        } catch {
          return false;
        }
      case 'phone':
        return /^\+?[\d\s\-\(\)]{10,}$/.test(sanitized);
      default:
        return sanitized.length > 0 && sanitized.length < 1000;
    }
  }, []);

  // Enhanced rate limiting check
  const checkRateLimit = useCallback((identifier: string, maxRequests = 10, windowMs = 60000) => {
    if (!config.rateLimitEnabled) return true;

    const key = `rate_limit_${identifier}`;
    const now = Date.now();
    const stored = localStorage.getItem(key);
    
    if (!stored) {
      localStorage.setItem(key, JSON.stringify({ count: 1, resetTime: now + windowMs }));
      return true;
    }

    const data = JSON.parse(stored);
    
    if (now > data.resetTime) {
      localStorage.setItem(key, JSON.stringify({ count: 1, resetTime: now + windowMs }));
      return true;
    }

    if (data.count >= maxRequests) {
      return false;
    }

    data.count++;
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  }, [config.rateLimitEnabled]);

  // Session security monitoring
  const monitorSessionSecurity = useCallback(() => {
    // Check for session fixation attempts
    const sessionId = sessionStorage.getItem('session_id');
    const expectedSessionId = localStorage.getItem('expected_session_id');
    
    if (sessionId && expectedSessionId && sessionId !== expectedSessionId) {
      console.warn('Potential session fixation detected');
      // Force re-authentication
      sessionStorage.clear();
      window.location.href = '/login';
    }

    // Monitor for suspicious activity patterns
    const lastActivity = parseInt(localStorage.getItem('last_activity') || '0');
    const now = Date.now();
    
    if (lastActivity && (now - lastActivity) > 30 * 60 * 1000) {
      // Session has been idle for 30+ minutes
      sessionStorage.clear();
    }
    
    localStorage.setItem('last_activity', now.toString());
  }, []);

  // File upload security validation
  const validateFileUpload = useCallback((file: File) => {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf', 'text/plain',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    if (file.size > maxSize) {
      return { valid: false, error: 'File size exceeds 10MB limit' };
    }

    if (!allowedTypes.includes(file.type)) {
      return { valid: false, error: 'File type not allowed' };
    }

    // Check for suspicious file names
    if (/[<>:"/\\|?*\x00-\x1f]/.test(file.name)) {
      return { valid: false, error: 'Invalid characters in filename' };
    }

    return { valid: true };
  }, []);

  return {
    validateSecureInput,
    checkRateLimit,
    monitorSessionSecurity,
    validateFileUpload
  };
};