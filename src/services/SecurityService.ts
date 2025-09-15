import { toast } from 'sonner';

export interface SecurityAlert {
  id: string;
  type: 'login_attempt' | 'data_access' | 'permission_change' | 'suspicious_activity';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  timestamp: string;
  userId?: string;
  ipAddress?: string;
  resolved: boolean;
}

export interface AccessLogEntry {
  id: string;
  userId: string;
  action: string;
  resource: string;
  timestamp: string;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
}

export interface SecuritySettings {
  passwordPolicy: {
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSymbols: boolean;
  };
  sessionTimeout: number; // minutes
  maxLoginAttempts: number;
  lockoutDuration: number; // minutes
  twoFactorRequired: boolean;
  ipWhitelist: string[];
}

class SecurityService {
  async logSecurityEvent(
    type: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    description: string,
    userId?: string,
    metadata?: any
  ): Promise<void> {
    try {
      console.log('Security event logged:', {
        type,
        severity,
        description,
        userId,
        metadata,
        timestamp: new Date().toISOString()
      });
      
      if (severity === 'high' || severity === 'critical') {
        toast.warning(`Security alert: ${description}`);
      }
    } catch (error: any) {
      console.error('Error logging security event:', error);
    }
  }

  async getSecurityAlerts(companyId: string): Promise<SecurityAlert[]> {
    try {
      // Mock security alerts
      const mockAlerts: SecurityAlert[] = [
        {
          id: 'alert-1',
          type: 'login_attempt',
          severity: 'medium',
          title: 'Failed Login Attempt',
          description: 'Multiple failed login attempts from IP 192.168.1.100',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          ipAddress: '192.168.1.100',
          resolved: false
        },
        {
          id: 'alert-2',
          type: 'permission_change',
          severity: 'high',
          title: 'Permission Elevation',
          description: 'User granted admin privileges',
          timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
          userId: 'user-123',
          resolved: true
        }
      ];

      return mockAlerts;
    } catch (error: any) {
      console.error('Error fetching security alerts:', error);
      toast.error('Failed to load security alerts');
      return [];
    }
  }

  async getAccessLogs(companyId: string, limit: number = 100): Promise<AccessLogEntry[]> {
    try {
      // Mock access logs
      const mockLogs: AccessLogEntry[] = [
        {
          id: 'log-1',
          userId: 'user-123',
          action: 'VIEW',
          resource: 'project-456',
          timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
          ipAddress: '192.168.1.50',
          userAgent: 'Mozilla/5.0...',
          success: true
        },
        {
          id: 'log-2',
          userId: 'user-456',
          action: 'EDIT',
          resource: 'invoice-789',
          timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
          ipAddress: '192.168.1.51',
          userAgent: 'Mozilla/5.0...',
          success: true
        }
      ];

      return mockLogs.slice(0, limit);
    } catch (error: any) {
      console.error('Error fetching access logs:', error);
      toast.error('Failed to load access logs');
      return [];
    }
  }

  async updateSecuritySettings(companyId: string, settings: SecuritySettings): Promise<boolean> {
    try {
      console.log('Updating security settings for company:', companyId, settings);
      toast.success('Security settings updated successfully');
      return true;
    } catch (error: any) {
      console.error('Error updating security settings:', error);
      toast.error('Failed to update security settings');
      return false;
    }
  }

  async getSecuritySettings(companyId: string): Promise<SecuritySettings> {
    try {
      // Mock security settings
      const defaultSettings: SecuritySettings = {
        passwordPolicy: {
          minLength: 8,
          requireUppercase: true,
          requireLowercase: true,
          requireNumbers: true,
          requireSymbols: false
        },
        sessionTimeout: 480, // 8 hours
        maxLoginAttempts: 5,
        lockoutDuration: 30,
        twoFactorRequired: false,
        ipWhitelist: []
      };

      return defaultSettings;
    } catch (error: any) {
      console.error('Error fetching security settings:', error);
      throw error;
    }
  }

  async checkRateLimit(identifier: string, action: string): Promise<{ allowed: boolean; remainingAttempts?: number }> {
    try {
      // Mock rate limiting
      const mockResult = {
        allowed: true,
        remainingAttempts: 5
      };

      return mockResult;
    } catch (error: any) {
      console.error('Error checking rate limit:', error);
      return { allowed: true };
    }
  }

  async resolveSecurityAlert(alertId: string): Promise<boolean> {
    try {
      console.log('Resolving security alert:', alertId);
      toast.success('Security alert resolved');
      return true;
    } catch (error: any) {
      console.error('Error resolving security alert:', error);
      toast.error('Failed to resolve security alert');
      return false;
    }
  }

  async performSecurityScan(companyId: string): Promise<{
    score: number;
    issues: Array<{ type: string; severity: string; description: string }>;
  }> {
    try {
      // Mock security scan
      const mockResult = {
        score: 85,
        issues: [
          {
            type: 'weak_password',
            severity: 'medium',
            description: '2 users have weak passwords'
          },
          {
            type: 'inactive_users',
            severity: 'low',
            description: '3 users have been inactive for 90+ days'
          }
        ]
      };

      return mockResult;
    } catch (error: any) {
      console.error('Error performing security scan:', error);
      throw error;
    }
  }
}

export const securityService = new SecurityService();
export default securityService;