/**
 * Audit Logging Service
 *
 * Standalone audit logging service that can be called directly without React hooks.
 * Used in contexts like AuthContext where useAuditLog hook would create circular dependencies.
 *
 * SECURITY: All critical operations should be logged for compliance and security monitoring.
 */

import { supabase } from '@/integrations/supabase/client';

interface AuditLogParams {
  siteId: string;
  userId: string;
  companyId: string;
  actionType: string;
  resourceType: string;
  resourceId?: string;
  resourceName?: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
  complianceCategory?: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

interface DataAccessLogParams {
  siteId: string;
  userId: string;
  companyId: string;
  dataType: string;
  dataClassification: 'public' | 'internal' | 'confidential' | 'restricted';
  resourceId: string;
  resourceName?: string;
  accessMethod?: 'view' | 'download' | 'export' | 'print' | 'copy';
  accessPurpose?: string;
  lawfulBasis?: string;
}

/**
 * Get client IP address for audit logging
 */
const getClientIP = async (): Promise<string | null> => {
  try {
    const response = await fetch('https://api.ipify.org?format=json', {
      signal: AbortSignal.timeout(5000) // 5 second timeout
    });
    const data = await response.json();
    return data.ip;
  } catch (error) {
    console.error('Error getting client IP:', error);
    return null;
  }
};

/**
 * Log an audit event directly to the database
 * Can be used in contexts where hooks are not available
 */
export const logAuditEvent = async (params: AuditLogParams): Promise<string | null> => {
  if (!params.siteId || !params.userId || !params.companyId) {
    console.error('Missing required params for audit logging');
    return null;
  }

  try {
    const ip = await getClientIP();

    const { data, error } = await supabase.rpc('log_audit_event', {
      p_site_id: params.siteId,
      p_company_id: params.companyId,
      p_user_id: params.userId,
      p_action_type: params.actionType,
      p_resource_type: params.resourceType,
      p_resource_id: params.resourceId || null,
      p_resource_name: params.resourceName || null,
      p_old_values: params.oldValues ? JSON.stringify(params.oldValues) : null,
      p_new_values: params.newValues ? JSON.stringify(params.newValues) : null,
      p_ip_address: ip,
      p_user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : 'server',
      p_session_id: null,
      p_risk_level: params.riskLevel || 'low',
      p_compliance_category: params.complianceCategory || 'general',
      p_description: params.description || null,
      p_metadata: params.metadata ? JSON.stringify(params.metadata) : '{}'
    });

    if (error) {
      console.error('Error logging audit event:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Exception in logAuditEvent:', error);
    return null;
  }
};

/**
 * Log a data access event directly to the database
 */
export const logDataAccess = async (params: DataAccessLogParams): Promise<string | null> => {
  if (!params.siteId || !params.userId || !params.companyId) {
    console.error('Missing required params for data access logging');
    return null;
  }

  try {
    const ip = await getClientIP();

    const { data, error } = await supabase.rpc('log_data_access', {
      p_site_id: params.siteId,
      p_company_id: params.companyId,
      p_user_id: params.userId,
      p_data_type: params.dataType,
      p_data_classification: params.dataClassification,
      p_resource_id: params.resourceId,
      p_resource_name: params.resourceName || null,
      p_access_method: params.accessMethod || 'view',
      p_access_purpose: params.accessPurpose || null,
      p_ip_address: ip,
      p_user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : 'server',
      p_session_id: null,
      p_lawful_basis: params.lawfulBasis || null
    });

    if (error) {
      console.error('Error logging data access:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Exception in logDataAccess:', error);
    return null;
  }
};

/**
 * Convenience function for logging security events
 */
export const logSecurityEvent = async (
  siteId: string,
  userId: string,
  companyId: string,
  eventType: string,
  details: Record<string, unknown>,
  riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'medium'
): Promise<string | null> => {
  return logAuditEvent({
    siteId,
    userId,
    companyId,
    actionType: eventType,
    resourceType: 'security',
    riskLevel,
    complianceCategory: 'security',
    description: `Security event: ${eventType}`,
    metadata: details
  });
};

/**
 * Convenience function for logging authentication events
 */
export const logAuthEvent = async (
  siteId: string,
  userId: string,
  companyId: string,
  action: 'login' | 'logout' | 'login_failed' | 'password_reset' | 'signup',
  metadata?: Record<string, unknown>
): Promise<string | null> => {
  const descriptions: Record<string, string> = {
    login: 'User logged in',
    logout: 'User logged out',
    login_failed: 'Failed login attempt',
    password_reset: 'Password reset requested',
    signup: 'New user registration'
  };

  const riskLevels: Record<string, 'low' | 'medium' | 'high' | 'critical'> = {
    login: 'low',
    logout: 'low',
    login_failed: 'medium',
    password_reset: 'medium',
    signup: 'low'
  };

  return logAuditEvent({
    siteId,
    userId,
    companyId,
    actionType: action,
    resourceType: 'authentication',
    riskLevel: riskLevels[action],
    complianceCategory: 'security',
    description: descriptions[action],
    metadata: {
      ...metadata,
      timestamp: new Date().toISOString()
    }
  });
};

/**
 * Convenience function for logging user management events
 */
export const logUserManagementEvent = async (
  siteId: string,
  userId: string,
  companyId: string,
  actionType: string,
  targetUserId: string,
  targetUserName: string,
  changes?: Record<string, unknown>
): Promise<string | null> => {
  return logAuditEvent({
    siteId,
    userId,
    companyId,
    actionType,
    resourceType: 'user',
    resourceId: targetUserId,
    resourceName: targetUserName,
    newValues: changes,
    riskLevel: 'high',
    complianceCategory: 'user_management',
    description: `User management action: ${actionType}`
  });
};
