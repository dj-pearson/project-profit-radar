/**
 * Audit Log Hook
 * Updated with multi-tenant site_id isolation
 */
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

interface AuditLogParams {
  actionType: string;
  resourceType: string;
  resourceId?: string;
  resourceName?: string;
  oldValues?: any;
  newValues?: any;
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
  complianceCategory?: string;
  description?: string;
  metadata?: any;
}

interface DataAccessParams {
  dataType: string;
  dataClassification: 'public' | 'internal' | 'confidential' | 'restricted';
  resourceId: string;
  resourceName?: string;
  accessMethod?: 'view' | 'download' | 'export' | 'print' | 'copy';
  accessPurpose?: string;
  lawfulBasis?: string;
}

export const useAuditLog = () => {
  const { user, userProfile } = useAuth();
  const [loading, setLoading] = useState(false);

  const getClientIP = async (): Promise<string | null> => {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch (error) {
      console.error('Error getting client IP:', error);
      return null;
    }
  };

  const logAuditEvent = async (params: AuditLogParams) => {
    if (!user || !siteId) return null;

    try {
      setLoading(true);
      const ip = await getClientIP();

      // Use userProfile from context if available, otherwise fetch with site isolation
      let companyId = userProfile?.company_id;
      if (!companyId) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('company_id')
            // CRITICAL: Site isolation
          .eq('id', user.id)
          .single();
        companyId = profile?.company_id;
      }

      if (!companyId) {
        console.error('User company not found for audit logging');
        return null;
      }

      const { data, error } = await supabase.rpc('log_audit_event', {
        p_company_id: companyId,
        p_user_id: user.id,
        p_action_type: params.actionType,
        p_resource_type: params.resourceType,
        p_resource_id: params.resourceId || null,
        p_resource_name: params.resourceName || null,
        p_old_values: params.oldValues ? JSON.stringify(params.oldValues) : null,
        p_new_values: params.newValues ? JSON.stringify(params.newValues) : null,
        p_ip_address: ip,
        p_user_agent: navigator.userAgent,
        p_session_id: null, // Could be implemented with session tracking
        p_risk_level: params.riskLevel || 'low',
        p_compliance_category: params.complianceCategory || 'general',
        p_description: params.description || null,
        p_metadata: params.metadata ? JSON.stringify(params.metadata) : '{}'
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error logging audit event:', error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const logDataAccess = async (params: DataAccessParams) => {
    if (!user || !siteId) return null;

    try {
      setLoading(true);
      const ip = await getClientIP();

      // Use userProfile from context if available, otherwise fetch with site isolation
      let companyId = userProfile?.company_id;
      if (!companyId) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('company_id')
            // CRITICAL: Site isolation
          .eq('id', user.id)
          .single();
        companyId = profile?.company_id;
      }

      if (!companyId) {
        console.error('User company not found for data access logging');
        return null;
      }

      const { data, error } = await supabase.rpc('log_data_access', {
        p_company_id: companyId,
        p_user_id: user.id,
        p_data_type: params.dataType,
        p_data_classification: params.dataClassification,
        p_resource_id: params.resourceId,
        p_resource_name: params.resourceName || null,
        p_access_method: params.accessMethod || 'view',
        p_access_purpose: params.accessPurpose || null,
        p_ip_address: ip,
        p_user_agent: navigator.userAgent,
        p_session_id: null,
        p_lawful_basis: params.lawfulBasis || null
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error logging data access:', error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Convenience methods for common audit events
  const logProjectAccess = (projectId: string, projectName: string, accessType: 'view' | 'edit' = 'view') => {
    return logAuditEvent({
      actionType: accessType === 'view' ? 'read' : 'update',
      resourceType: 'project',
      resourceId: projectId,
      resourceName: projectName,
      complianceCategory: 'data_access',
      description: `${accessType === 'view' ? 'Viewed' : 'Modified'} project details`
    });
  };

  const logFinancialDataAccess = (resourceId: string, resourceName: string, accessMethod: string = 'view') => {
    return logDataAccess({
      dataType: 'financial',
      dataClassification: 'confidential',
      resourceId,
      resourceName,
      accessMethod: accessMethod as any,
      accessPurpose: 'Business operations and reporting',
      lawfulBasis: 'Legitimate interests'
    });
  };

  const logDocumentAccess = (documentId: string, documentName: string, accessMethod: string = 'view') => {
    return logDataAccess({
      dataType: 'document',
      dataClassification: 'internal',
      resourceId: documentId,
      resourceName: documentName,
      accessMethod: accessMethod as any,
      accessPurpose: 'Document management and collaboration'
    });
  };

  const logUserManagement = (actionType: string, targetUserId: string, targetUserName: string, changes?: any) => {
    return logAuditEvent({
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

  const logSecurityEvent = (eventType: string, details: any, riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'medium') => {
    return logAuditEvent({
      actionType: eventType,
      resourceType: 'security',
      riskLevel,
      complianceCategory: 'security',
      description: `Security event: ${eventType}`,
      metadata: details
    });
  };

  return {
    logAuditEvent,
    logDataAccess,
    logProjectAccess,
    logFinancialDataAccess,
    logDocumentAccess,
    logUserManagement,
    logSecurityEvent,
    loading
  };
};