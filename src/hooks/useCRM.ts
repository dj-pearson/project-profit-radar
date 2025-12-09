/**
 * CRM Hooks - Data fetching hooks for CRM features with multi-tenant isolation
 *
 * These hooks ensure proper site_id and company_id filtering for all CRM operations.
 */

import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

// Type aliases for database tables
type Lead = Database['public']['Tables']['leads']['Row'];
type LeadInsert = Database['public']['Tables']['leads']['Insert'];
type LeadUpdate = Database['public']['Tables']['leads']['Update'];

type Contact = Database['public']['Tables']['contacts']['Row'];
type ContactInsert = Database['public']['Tables']['contacts']['Insert'];
type ContactUpdate = Database['public']['Tables']['contacts']['Update'];

type Opportunity = Database['public']['Tables']['opportunities']['Row'];
type OpportunityInsert = Database['public']['Tables']['opportunities']['Insert'];
type OpportunityUpdate = Database['public']['Tables']['opportunities']['Update'];

type Deal = Database['public']['Tables']['deals']['Row'];
type DealInsert = Database['public']['Tables']['deals']['Insert'];
type DealUpdate = Database['public']['Tables']['deals']['Update'];

type EmailCampaign = Database['public']['Tables']['email_campaigns']['Row'];
type EmailCampaignInsert = Database['public']['Tables']['email_campaigns']['Insert'];
type EmailCampaignUpdate = Database['public']['Tables']['email_campaigns']['Update'];

type EmailTemplate = Database['public']['Tables']['email_templates']['Row'];
type EmailTemplateInsert = Database['public']['Tables']['email_templates']['Insert'];
type EmailTemplateUpdate = Database['public']['Tables']['email_templates']['Update'];

type WorkflowDefinition = Database['public']['Tables']['workflow_definitions']['Row'];
type WorkflowDefinitionInsert = Database['public']['Tables']['workflow_definitions']['Insert'];
type WorkflowDefinitionUpdate = Database['public']['Tables']['workflow_definitions']['Update'];

type CRMActivity = Database['public']['Tables']['crm_activities']['Row'];
type CRMActivityInsert = Database['public']['Tables']['crm_activities']['Insert'];
type CRMActivityUpdate = Database['public']['Tables']['crm_activities']['Update'];

// ============================================================================
// LEADS HOOKS
// ============================================================================

export interface LeadFilters {
  status?: string;
  priority?: string;
  lead_source?: string;
  assigned_to?: string;
  search?: string;
  lead_temperature?: string;
  tags?: string[];
}

export function useLeads(filters?: LeadFilters, options?: Omit<UseQueryOptions<Lead[], Error>, 'queryKey' | 'queryFn'>) {
  const { siteId } = useAuth();

  return useQuery({
    queryKey: ['leads', siteId, filters],
    queryFn: async () => {
      if (!siteId) throw new Error('No site_id available');

      let query = supabase
        .from('leads')
        .select('*')
        .eq('site_id', siteId)
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.priority) {
        query = query.eq('priority', filters.priority);
      }
      if (filters?.lead_source) {
        query = query.eq('lead_source', filters.lead_source);
      }
      if (filters?.assigned_to) {
        query = query.eq('assigned_to', filters.assigned_to);
      }
      if (filters?.lead_temperature) {
        query = query.eq('lead_temperature', filters.lead_temperature);
      }
      if (filters?.search) {
        query = query.or(`first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,company_name.ilike.%${filters.search}%`);
      }
      if (filters?.tags && filters.tags.length > 0) {
        query = query.overlaps('tags', filters.tags);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!siteId && (options?.enabled !== false),
    ...options,
  });
}

export function useLead(leadId: string | undefined, options?: Omit<UseQueryOptions<Lead | null, Error>, 'queryKey' | 'queryFn'>) {
  const { siteId } = useAuth();

  return useQuery({
    queryKey: ['lead', leadId, siteId],
    queryFn: async () => {
      if (!siteId || !leadId) throw new Error('Missing site_id or lead_id');

      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('id', leadId)
        .eq('site_id', siteId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!siteId && !!leadId && (options?.enabled !== false),
    ...options,
  });
}

export function useCreateLead() {
  const { siteId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (lead: Omit<LeadInsert, 'site_id'>) => {
      if (!siteId) throw new Error('No site_id available');

      const { data, error } = await supabase
        .from('leads')
        .insert({ ...lead, site_id: siteId })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success('Lead created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create lead: ${error.message}`);
    },
  });
}

export function useUpdateLead() {
  const { siteId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: LeadUpdate & { id: string }) => {
      if (!siteId) throw new Error('No site_id available');

      const { data, error } = await supabase
        .from('leads')
        .update(updates)
        .eq('id', id)
        .eq('site_id', siteId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['lead', data.id] });
      toast.success('Lead updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update lead: ${error.message}`);
    },
  });
}

export function useDeleteLead() {
  const { siteId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (leadId: string) => {
      if (!siteId) throw new Error('No site_id available');

      const { error } = await supabase
        .from('leads')
        .delete()
        .eq('id', leadId)
        .eq('site_id', siteId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success('Lead deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete lead: ${error.message}`);
    },
  });
}

// ============================================================================
// CONTACTS HOOKS
// ============================================================================

export interface ContactFilters {
  contact_type?: string;
  relationship_status?: string;
  assigned_to?: string;
  search?: string;
  tags?: string[];
}

export function useContacts(filters?: ContactFilters, options?: Omit<UseQueryOptions<Contact[], Error>, 'queryKey' | 'queryFn'>) {
  const { siteId, userProfile } = useAuth();
  const companyId = userProfile?.company_id;

  return useQuery({
    queryKey: ['contacts', siteId, companyId, filters],
    queryFn: async () => {
      if (!siteId || !companyId) throw new Error('No site_id or company_id available');

      let query = supabase
        .from('contacts')
        .select('*')
        .eq('site_id', siteId)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (filters?.contact_type) {
        query = query.eq('contact_type', filters.contact_type);
      }
      if (filters?.relationship_status) {
        query = query.eq('relationship_status', filters.relationship_status);
      }
      if (filters?.assigned_to) {
        query = query.eq('assigned_to', filters.assigned_to);
      }
      if (filters?.search) {
        query = query.or(`first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,company_name.ilike.%${filters.search}%`);
      }
      if (filters?.tags && filters.tags.length > 0) {
        query = query.overlaps('tags', filters.tags);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!siteId && !!companyId && (options?.enabled !== false),
    ...options,
  });
}

export function useContact(contactId: string | undefined, options?: Omit<UseQueryOptions<Contact | null, Error>, 'queryKey' | 'queryFn'>) {
  const { siteId, userProfile } = useAuth();
  const companyId = userProfile?.company_id;

  return useQuery({
    queryKey: ['contact', contactId, siteId, companyId],
    queryFn: async () => {
      if (!siteId || !companyId || !contactId) throw new Error('Missing required IDs');

      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('id', contactId)
        .eq('site_id', siteId)
        .eq('company_id', companyId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!siteId && !!companyId && !!contactId && (options?.enabled !== false),
    ...options,
  });
}

export function useCreateContact() {
  const { siteId, userProfile } = useAuth();
  const companyId = userProfile?.company_id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contact: Omit<ContactInsert, 'site_id' | 'company_id'>) => {
      if (!siteId || !companyId) throw new Error('No site_id or company_id available');

      const { data, error } = await supabase
        .from('contacts')
        .insert({ ...contact, site_id: siteId, company_id: companyId })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      toast.success('Contact created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create contact: ${error.message}`);
    },
  });
}

export function useUpdateContact() {
  const { siteId, userProfile } = useAuth();
  const companyId = userProfile?.company_id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: ContactUpdate & { id: string }) => {
      if (!siteId || !companyId) throw new Error('No site_id or company_id available');

      const { data, error } = await supabase
        .from('contacts')
        .update(updates)
        .eq('id', id)
        .eq('site_id', siteId)
        .eq('company_id', companyId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['contact', data.id] });
      toast.success('Contact updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update contact: ${error.message}`);
    },
  });
}

export function useDeleteContact() {
  const { siteId, userProfile } = useAuth();
  const companyId = userProfile?.company_id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contactId: string) => {
      if (!siteId || !companyId) throw new Error('No site_id or company_id available');

      const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('id', contactId)
        .eq('site_id', siteId)
        .eq('company_id', companyId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      toast.success('Contact deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete contact: ${error.message}`);
    },
  });
}

// ============================================================================
// OPPORTUNITIES HOOKS
// ============================================================================

export interface OpportunityFilters {
  stage?: string;
  risk_level?: string;
  account_manager?: string;
  search?: string;
  min_value?: number;
  max_value?: number;
}

export function useOpportunities(filters?: OpportunityFilters, options?: Omit<UseQueryOptions<Opportunity[], Error>, 'queryKey' | 'queryFn'>) {
  const { siteId, userProfile } = useAuth();
  const companyId = userProfile?.company_id;

  return useQuery({
    queryKey: ['opportunities', siteId, companyId, filters],
    queryFn: async () => {
      if (!siteId || !companyId) throw new Error('No site_id or company_id available');

      let query = supabase
        .from('opportunities')
        .select('*, contact:contacts(*)')
        .eq('site_id', siteId)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (filters?.stage) {
        query = query.eq('stage', filters.stage);
      }
      if (filters?.risk_level) {
        query = query.eq('risk_level', filters.risk_level);
      }
      if (filters?.account_manager) {
        query = query.eq('account_manager', filters.account_manager);
      }
      if (filters?.search) {
        query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }
      if (filters?.min_value !== undefined) {
        query = query.gte('estimated_value', filters.min_value);
      }
      if (filters?.max_value !== undefined) {
        query = query.lte('estimated_value', filters.max_value);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!siteId && !!companyId && (options?.enabled !== false),
    ...options,
  });
}

export function useOpportunity(opportunityId: string | undefined, options?: Omit<UseQueryOptions<Opportunity | null, Error>, 'queryKey' | 'queryFn'>) {
  const { siteId, userProfile } = useAuth();
  const companyId = userProfile?.company_id;

  return useQuery({
    queryKey: ['opportunity', opportunityId, siteId, companyId],
    queryFn: async () => {
      if (!siteId || !companyId || !opportunityId) throw new Error('Missing required IDs');

      const { data, error } = await supabase
        .from('opportunities')
        .select('*, contact:contacts(*)')
        .eq('id', opportunityId)
        .eq('site_id', siteId)
        .eq('company_id', companyId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!siteId && !!companyId && !!opportunityId && (options?.enabled !== false),
    ...options,
  });
}

export function useCreateOpportunity() {
  const { siteId, userProfile } = useAuth();
  const companyId = userProfile?.company_id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (opportunity: Omit<OpportunityInsert, 'site_id' | 'company_id'>) => {
      if (!siteId || !companyId) throw new Error('No site_id or company_id available');

      const { data, error } = await supabase
        .from('opportunities')
        .insert({ ...opportunity, site_id: siteId, company_id: companyId })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      toast.success('Opportunity created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create opportunity: ${error.message}`);
    },
  });
}

export function useUpdateOpportunity() {
  const { siteId, userProfile } = useAuth();
  const companyId = userProfile?.company_id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: OpportunityUpdate & { id: string }) => {
      if (!siteId || !companyId) throw new Error('No site_id or company_id available');

      const { data, error } = await supabase
        .from('opportunities')
        .update(updates)
        .eq('id', id)
        .eq('site_id', siteId)
        .eq('company_id', companyId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      queryClient.invalidateQueries({ queryKey: ['opportunity', data.id] });
      toast.success('Opportunity updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update opportunity: ${error.message}`);
    },
  });
}

export function useDeleteOpportunity() {
  const { siteId, userProfile } = useAuth();
  const companyId = userProfile?.company_id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (opportunityId: string) => {
      if (!siteId || !companyId) throw new Error('No site_id or company_id available');

      const { error } = await supabase
        .from('opportunities')
        .delete()
        .eq('id', opportunityId)
        .eq('site_id', siteId)
        .eq('company_id', companyId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      toast.success('Opportunity deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete opportunity: ${error.message}`);
    },
  });
}

// ============================================================================
// DEALS HOOKS
// ============================================================================

export interface DealFilters {
  status?: string;
  priority?: string;
  deal_type?: string;
  sales_rep_id?: string;
  search?: string;
}

export function useDeals(filters?: DealFilters, options?: Omit<UseQueryOptions<Deal[], Error>, 'queryKey' | 'queryFn'>) {
  const { siteId, userProfile } = useAuth();
  const companyId = userProfile?.company_id;

  return useQuery({
    queryKey: ['deals', siteId, companyId, filters],
    queryFn: async () => {
      if (!siteId || !companyId) throw new Error('No site_id or company_id available');

      let query = supabase
        .from('deals')
        .select('*, contact:contacts(*), primary_contact:contacts!deals_primary_contact_id_fkey(*)')
        .eq('site_id', siteId)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.priority) {
        query = query.eq('priority', filters.priority);
      }
      if (filters?.deal_type) {
        query = query.eq('deal_type', filters.deal_type);
      }
      if (filters?.sales_rep_id) {
        query = query.eq('sales_rep_id', filters.sales_rep_id);
      }
      if (filters?.search) {
        query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!siteId && !!companyId && (options?.enabled !== false),
    ...options,
  });
}

export function useDeal(dealId: string | undefined, options?: Omit<UseQueryOptions<Deal | null, Error>, 'queryKey' | 'queryFn'>) {
  const { siteId, userProfile } = useAuth();
  const companyId = userProfile?.company_id;

  return useQuery({
    queryKey: ['deal', dealId, siteId, companyId],
    queryFn: async () => {
      if (!siteId || !companyId || !dealId) throw new Error('Missing required IDs');

      const { data, error } = await supabase
        .from('deals')
        .select('*, contact:contacts(*)')
        .eq('id', dealId)
        .eq('site_id', siteId)
        .eq('company_id', companyId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!siteId && !!companyId && !!dealId && (options?.enabled !== false),
    ...options,
  });
}

export function useCreateDeal() {
  const { siteId, userProfile } = useAuth();
  const companyId = userProfile?.company_id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (deal: Omit<DealInsert, 'site_id' | 'company_id'>) => {
      if (!siteId || !companyId) throw new Error('No site_id or company_id available');

      const { data, error } = await supabase
        .from('deals')
        .insert({ ...deal, site_id: siteId, company_id: companyId })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      toast.success('Deal created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create deal: ${error.message}`);
    },
  });
}

export function useUpdateDeal() {
  const { siteId, userProfile } = useAuth();
  const companyId = userProfile?.company_id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: DealUpdate & { id: string }) => {
      if (!siteId || !companyId) throw new Error('No site_id or company_id available');

      const { data, error } = await supabase
        .from('deals')
        .update(updates)
        .eq('id', id)
        .eq('site_id', siteId)
        .eq('company_id', companyId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      queryClient.invalidateQueries({ queryKey: ['deal', data.id] });
      toast.success('Deal updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update deal: ${error.message}`);
    },
  });
}

export function useDeleteDeal() {
  const { siteId, userProfile } = useAuth();
  const companyId = userProfile?.company_id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dealId: string) => {
      if (!siteId || !companyId) throw new Error('No site_id or company_id available');

      const { error } = await supabase
        .from('deals')
        .delete()
        .eq('id', dealId)
        .eq('site_id', siteId)
        .eq('company_id', companyId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      toast.success('Deal deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete deal: ${error.message}`);
    },
  });
}

// ============================================================================
// EMAIL CAMPAIGNS HOOKS
// ============================================================================

export interface CampaignFilters {
  campaign_type?: string;
  is_active?: boolean;
  trigger_type?: string;
  search?: string;
}

export function useEmailCampaigns(filters?: CampaignFilters, options?: Omit<UseQueryOptions<EmailCampaign[], Error>, 'queryKey' | 'queryFn'>) {
  const { siteId } = useAuth();

  return useQuery({
    queryKey: ['email_campaigns', siteId, filters],
    queryFn: async () => {
      if (!siteId) throw new Error('No site_id available');

      let query = supabase
        .from('email_campaigns')
        .select('*')
        .eq('site_id', siteId)
        .order('created_at', { ascending: false });

      if (filters?.campaign_type) {
        query = query.eq('campaign_type', filters.campaign_type);
      }
      if (filters?.is_active !== undefined) {
        query = query.eq('is_active', filters.is_active);
      }
      if (filters?.trigger_type) {
        query = query.eq('trigger_type', filters.trigger_type);
      }
      if (filters?.search) {
        query = query.or(`campaign_name.ilike.%${filters.search}%,subject_line.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!siteId && (options?.enabled !== false),
    ...options,
  });
}

export function useEmailCampaign(campaignId: string | undefined, options?: Omit<UseQueryOptions<EmailCampaign | null, Error>, 'queryKey' | 'queryFn'>) {
  const { siteId } = useAuth();

  return useQuery({
    queryKey: ['email_campaign', campaignId, siteId],
    queryFn: async () => {
      if (!siteId || !campaignId) throw new Error('Missing required IDs');

      const { data, error } = await supabase
        .from('email_campaigns')
        .select('*')
        .eq('id', campaignId)
        .eq('site_id', siteId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!siteId && !!campaignId && (options?.enabled !== false),
    ...options,
  });
}

export function useCreateEmailCampaign() {
  const { siteId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (campaign: Omit<EmailCampaignInsert, 'site_id'>) => {
      if (!siteId) throw new Error('No site_id available');

      const { data, error } = await supabase
        .from('email_campaigns')
        .insert({ ...campaign, site_id: siteId })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email_campaigns'] });
      toast.success('Email campaign created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create email campaign: ${error.message}`);
    },
  });
}

export function useUpdateEmailCampaign() {
  const { siteId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: EmailCampaignUpdate & { id: string }) => {
      if (!siteId) throw new Error('No site_id available');

      const { data, error } = await supabase
        .from('email_campaigns')
        .update(updates)
        .eq('id', id)
        .eq('site_id', siteId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['email_campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['email_campaign', data.id] });
      toast.success('Email campaign updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update email campaign: ${error.message}`);
    },
  });
}

export function useDeleteEmailCampaign() {
  const { siteId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (campaignId: string) => {
      if (!siteId) throw new Error('No site_id available');

      const { error } = await supabase
        .from('email_campaigns')
        .delete()
        .eq('id', campaignId)
        .eq('site_id', siteId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email_campaigns'] });
      toast.success('Email campaign deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete email campaign: ${error.message}`);
    },
  });
}

// ============================================================================
// EMAIL TEMPLATES HOOKS
// ============================================================================

export interface TemplateFilters {
  template_type?: string;
  category?: string;
  is_system_template?: boolean;
  search?: string;
}

export function useEmailTemplates(filters?: TemplateFilters, options?: Omit<UseQueryOptions<EmailTemplate[], Error>, 'queryKey' | 'queryFn'>) {
  const { siteId, userProfile } = useAuth();
  const companyId = userProfile?.company_id;

  return useQuery({
    queryKey: ['email_templates', siteId, companyId, filters],
    queryFn: async () => {
      if (!siteId || !companyId) throw new Error('No site_id or company_id available');

      let query = supabase
        .from('email_templates')
        .select('*')
        .eq('site_id', siteId)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (filters?.template_type) {
        query = query.eq('template_type', filters.template_type);
      }
      if (filters?.category) {
        query = query.eq('category', filters.category);
      }
      if (filters?.is_system_template !== undefined) {
        query = query.eq('is_system_template', filters.is_system_template);
      }
      if (filters?.search) {
        query = query.or(`name.ilike.%${filters.search}%,subject.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!siteId && !!companyId && (options?.enabled !== false),
    ...options,
  });
}

export function useCreateEmailTemplate() {
  const { siteId, userProfile } = useAuth();
  const companyId = userProfile?.company_id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (template: Omit<EmailTemplateInsert, 'site_id' | 'company_id'>) => {
      if (!siteId || !companyId) throw new Error('No site_id or company_id available');

      const { data, error } = await supabase
        .from('email_templates')
        .insert({ ...template, site_id: siteId, company_id: companyId })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email_templates'] });
      toast.success('Email template created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create email template: ${error.message}`);
    },
  });
}

export function useUpdateEmailTemplate() {
  const { siteId, userProfile } = useAuth();
  const companyId = userProfile?.company_id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: EmailTemplateUpdate & { id: string }) => {
      if (!siteId || !companyId) throw new Error('No site_id or company_id available');

      const { data, error } = await supabase
        .from('email_templates')
        .update(updates)
        .eq('id', id)
        .eq('site_id', siteId)
        .eq('company_id', companyId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email_templates'] });
      toast.success('Email template updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update email template: ${error.message}`);
    },
  });
}

export function useDeleteEmailTemplate() {
  const { siteId, userProfile } = useAuth();
  const companyId = userProfile?.company_id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (templateId: string) => {
      if (!siteId || !companyId) throw new Error('No site_id or company_id available');

      const { error } = await supabase
        .from('email_templates')
        .delete()
        .eq('id', templateId)
        .eq('site_id', siteId)
        .eq('company_id', companyId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email_templates'] });
      toast.success('Email template deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete email template: ${error.message}`);
    },
  });
}

// ============================================================================
// WORKFLOW DEFINITIONS HOOKS
// ============================================================================

export interface WorkflowFilters {
  trigger_type?: string;
  is_active?: boolean;
  search?: string;
}

export function useWorkflowDefinitions(filters?: WorkflowFilters, options?: Omit<UseQueryOptions<WorkflowDefinition[], Error>, 'queryKey' | 'queryFn'>) {
  const { siteId, userProfile } = useAuth();
  const companyId = userProfile?.company_id;

  return useQuery({
    queryKey: ['workflow_definitions', siteId, companyId, filters],
    queryFn: async () => {
      if (!siteId || !companyId) throw new Error('No site_id or company_id available');

      let query = supabase
        .from('workflow_definitions')
        .select('*')
        .eq('site_id', siteId)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (filters?.trigger_type) {
        query = query.eq('trigger_type', filters.trigger_type);
      }
      if (filters?.is_active !== undefined) {
        query = query.eq('is_active', filters.is_active);
      }
      if (filters?.search) {
        query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!siteId && !!companyId && (options?.enabled !== false),
    ...options,
  });
}

export function useWorkflowDefinition(workflowId: string | undefined, options?: Omit<UseQueryOptions<WorkflowDefinition | null, Error>, 'queryKey' | 'queryFn'>) {
  const { siteId, userProfile } = useAuth();
  const companyId = userProfile?.company_id;

  return useQuery({
    queryKey: ['workflow_definition', workflowId, siteId, companyId],
    queryFn: async () => {
      if (!siteId || !companyId || !workflowId) throw new Error('Missing required IDs');

      const { data, error } = await supabase
        .from('workflow_definitions')
        .select('*')
        .eq('id', workflowId)
        .eq('site_id', siteId)
        .eq('company_id', companyId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!siteId && !!companyId && !!workflowId && (options?.enabled !== false),
    ...options,
  });
}

export function useCreateWorkflowDefinition() {
  const { siteId, userProfile } = useAuth();
  const companyId = userProfile?.company_id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (workflow: Omit<WorkflowDefinitionInsert, 'site_id' | 'company_id'>) => {
      if (!siteId || !companyId) throw new Error('No site_id or company_id available');

      const { data, error } = await supabase
        .from('workflow_definitions')
        .insert({ ...workflow, site_id: siteId, company_id: companyId })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow_definitions'] });
      toast.success('Workflow created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create workflow: ${error.message}`);
    },
  });
}

export function useUpdateWorkflowDefinition() {
  const { siteId, userProfile } = useAuth();
  const companyId = userProfile?.company_id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: WorkflowDefinitionUpdate & { id: string }) => {
      if (!siteId || !companyId) throw new Error('No site_id or company_id available');

      const { data, error } = await supabase
        .from('workflow_definitions')
        .update(updates)
        .eq('id', id)
        .eq('site_id', siteId)
        .eq('company_id', companyId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['workflow_definitions'] });
      queryClient.invalidateQueries({ queryKey: ['workflow_definition', data.id] });
      toast.success('Workflow updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update workflow: ${error.message}`);
    },
  });
}

export function useDeleteWorkflowDefinition() {
  const { siteId, userProfile } = useAuth();
  const companyId = userProfile?.company_id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (workflowId: string) => {
      if (!siteId || !companyId) throw new Error('No site_id or company_id available');

      const { error } = await supabase
        .from('workflow_definitions')
        .delete()
        .eq('id', workflowId)
        .eq('site_id', siteId)
        .eq('company_id', companyId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow_definitions'] });
      toast.success('Workflow deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete workflow: ${error.message}`);
    },
  });
}

// ============================================================================
// CRM ACTIVITIES HOOKS
// ============================================================================

export interface ActivityFilters {
  activity_type?: string;
  lead_id?: string;
  opportunity_id?: string;
  start_date?: string;
  end_date?: string;
}

export function useCRMActivities(filters?: ActivityFilters, options?: Omit<UseQueryOptions<CRMActivity[], Error>, 'queryKey' | 'queryFn'>) {
  const { siteId, userProfile } = useAuth();
  const companyId = userProfile?.company_id;

  return useQuery({
    queryKey: ['crm_activities', siteId, companyId, filters],
    queryFn: async () => {
      if (!siteId || !companyId) throw new Error('No site_id or company_id available');

      let query = supabase
        .from('crm_activities')
        .select('*, lead:leads(*)')
        .eq('site_id', siteId)
        .eq('company_id', companyId)
        .order('activity_date', { ascending: false });

      if (filters?.activity_type) {
        query = query.eq('activity_type', filters.activity_type);
      }
      if (filters?.lead_id) {
        query = query.eq('lead_id', filters.lead_id);
      }
      if (filters?.opportunity_id) {
        query = query.eq('opportunity_id', filters.opportunity_id);
      }
      if (filters?.start_date) {
        query = query.gte('activity_date', filters.start_date);
      }
      if (filters?.end_date) {
        query = query.lte('activity_date', filters.end_date);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!siteId && !!companyId && (options?.enabled !== false),
    ...options,
  });
}

export function useCreateCRMActivity() {
  const { siteId, userProfile } = useAuth();
  const companyId = userProfile?.company_id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (activity: Omit<CRMActivityInsert, 'site_id' | 'company_id'>) => {
      if (!siteId || !companyId) throw new Error('No site_id or company_id available');

      const { data, error } = await supabase
        .from('crm_activities')
        .insert({ ...activity, site_id: siteId, company_id: companyId })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm_activities'] });
      toast.success('Activity logged successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to log activity: ${error.message}`);
    },
  });
}

export function useUpdateCRMActivity() {
  const { siteId, userProfile } = useAuth();
  const companyId = userProfile?.company_id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: CRMActivityUpdate & { id: string }) => {
      if (!siteId || !companyId) throw new Error('No site_id or company_id available');

      const { data, error } = await supabase
        .from('crm_activities')
        .update(updates)
        .eq('id', id)
        .eq('site_id', siteId)
        .eq('company_id', companyId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm_activities'] });
      toast.success('Activity updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update activity: ${error.message}`);
    },
  });
}

export function useDeleteCRMActivity() {
  const { siteId, userProfile } = useAuth();
  const companyId = userProfile?.company_id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (activityId: string) => {
      if (!siteId || !companyId) throw new Error('No site_id or company_id available');

      const { error } = await supabase
        .from('crm_activities')
        .delete()
        .eq('id', activityId)
        .eq('site_id', siteId)
        .eq('company_id', companyId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm_activities'] });
      toast.success('Activity deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete activity: ${error.message}`);
    },
  });
}

// ============================================================================
// PIPELINE STATS AND ANALYTICS HOOKS
// ============================================================================

export interface PipelineStats {
  totalLeads: number;
  qualifiedLeads: number;
  convertedLeads: number;
  totalOpportunities: number;
  totalValue: number;
  avgDealSize: number;
  conversionRate: number;
  byStage: Record<string, { count: number; value: number }>;
  bySource: Record<string, { count: number; converted: number }>;
}

export function usePipelineStats(options?: Omit<UseQueryOptions<PipelineStats, Error>, 'queryKey' | 'queryFn'>) {
  const { siteId, userProfile } = useAuth();
  const companyId = userProfile?.company_id;

  return useQuery({
    queryKey: ['pipeline_stats', siteId, companyId],
    queryFn: async (): Promise<PipelineStats> => {
      if (!siteId || !companyId) throw new Error('No site_id or company_id available');

      // Fetch leads
      const { data: leads, error: leadsError } = await supabase
        .from('leads')
        .select('id, status, lead_source, converted_at')
        .eq('site_id', siteId);

      if (leadsError) throw leadsError;

      // Fetch opportunities
      const { data: opportunities, error: oppsError } = await supabase
        .from('opportunities')
        .select('id, stage, estimated_value')
        .eq('site_id', siteId)
        .eq('company_id', companyId);

      if (oppsError) throw oppsError;

      // Calculate stats
      const totalLeads = leads?.length || 0;
      const qualifiedLeads = leads?.filter(l => l.status === 'qualified').length || 0;
      const convertedLeads = leads?.filter(l => l.converted_at).length || 0;
      const totalOpportunities = opportunities?.length || 0;
      const totalValue = opportunities?.reduce((sum, o) => sum + (o.estimated_value || 0), 0) || 0;
      const avgDealSize = totalOpportunities > 0 ? totalValue / totalOpportunities : 0;
      const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;

      // Group by stage
      const byStage: Record<string, { count: number; value: number }> = {};
      opportunities?.forEach(opp => {
        if (!byStage[opp.stage]) {
          byStage[opp.stage] = { count: 0, value: 0 };
        }
        byStage[opp.stage].count++;
        byStage[opp.stage].value += opp.estimated_value || 0;
      });

      // Group by source
      const bySource: Record<string, { count: number; converted: number }> = {};
      leads?.forEach(lead => {
        const source = lead.lead_source || 'Unknown';
        if (!bySource[source]) {
          bySource[source] = { count: 0, converted: 0 };
        }
        bySource[source].count++;
        if (lead.converted_at) {
          bySource[source].converted++;
        }
      });

      return {
        totalLeads,
        qualifiedLeads,
        convertedLeads,
        totalOpportunities,
        totalValue,
        avgDealSize,
        conversionRate,
        byStage,
        bySource,
      };
    },
    enabled: !!siteId && !!companyId && (options?.enabled !== false),
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
}

// ============================================================================
// LEAD SCORING HOOK (AI-powered)
// ============================================================================

export interface LeadScore {
  overall_score: number;
  demographic_score: number;
  behavioral_score: number;
  engagement_score: number;
  fit_score: number;
  intent_score: number;
  timing_score: number;
  confidence: number;
  conversion_probability: number;
  estimated_deal_size: number;
  estimated_close_time_days: number;
  insights: string[];
  risk_factors: string[];
  next_best_actions: string[];
}

export function useLeadScore(leadId: string | undefined, options?: Omit<UseQueryOptions<LeadScore | null, Error>, 'queryKey' | 'queryFn'>) {
  const { siteId, session } = useAuth();

  return useQuery({
    queryKey: ['lead_score', leadId, siteId],
    queryFn: async (): Promise<LeadScore | null> => {
      if (!siteId || !leadId || !session?.access_token) {
        throw new Error('Missing required data');
      }

      // Call the AI lead scoring edge function
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/calculate-lead-score`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ lead_id: leadId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to calculate lead score');
      }

      return response.json();
    },
    enabled: !!siteId && !!leadId && !!session?.access_token && (options?.enabled !== false),
    staleTime: 10 * 60 * 1000, // 10 minutes
    ...options,
  });
}

// ============================================================================
// CONVERT LEAD TO OPPORTUNITY
// ============================================================================

export function useConvertLeadToOpportunity() {
  const { siteId, userProfile } = useAuth();
  const companyId = userProfile?.company_id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      leadId,
      opportunityData
    }: {
      leadId: string;
      opportunityData: Partial<OpportunityInsert>;
    }) => {
      if (!siteId || !companyId) throw new Error('No site_id or company_id available');

      // Get the lead data
      const { data: lead, error: leadError } = await supabase
        .from('leads')
        .select('*')
        .eq('id', leadId)
        .eq('site_id', siteId)
        .single();

      if (leadError) throw leadError;

      // Create the opportunity
      const { data: opportunity, error: oppError } = await supabase
        .from('opportunities')
        .insert({
          name: opportunityData.name || `${lead.company_name || lead.first_name} - Opportunity`,
          description: opportunityData.description || lead.notes,
          estimated_value: opportunityData.estimated_value || lead.estimated_budget || 0,
          probability_percent: opportunityData.probability_percent || 20,
          stage: opportunityData.stage || 'qualification',
          risk_level: opportunityData.risk_level || 'medium',
          lead_id: leadId,
          site_id: siteId,
          company_id: companyId,
          ...opportunityData,
        })
        .select()
        .single();

      if (oppError) throw oppError;

      // Update the lead status
      const { error: updateError } = await supabase
        .from('leads')
        .update({
          status: 'converted',
          converted_at: new Date().toISOString(),
        })
        .eq('id', leadId)
        .eq('site_id', siteId);

      if (updateError) throw updateError;

      return opportunity;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      queryClient.invalidateQueries({ queryKey: ['pipeline_stats'] });
      toast.success('Lead converted to opportunity successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to convert lead: ${error.message}`);
    },
  });
}

// ============================================================================
// BULK OPERATIONS
// ============================================================================

export function useBulkUpdateLeads() {
  const { siteId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      leadIds,
      updates
    }: {
      leadIds: string[];
      updates: Partial<LeadUpdate>;
    }) => {
      if (!siteId) throw new Error('No site_id available');

      const { data, error } = await supabase
        .from('leads')
        .update(updates)
        .in('id', leadIds)
        .eq('site_id', siteId)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success(`${data.length} leads updated successfully`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to update leads: ${error.message}`);
    },
  });
}

export function useBulkDeleteLeads() {
  const { siteId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (leadIds: string[]) => {
      if (!siteId) throw new Error('No site_id available');

      const { error } = await supabase
        .from('leads')
        .delete()
        .in('id', leadIds)
        .eq('site_id', siteId);

      if (error) throw error;
      return leadIds.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success(`${count} leads deleted successfully`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete leads: ${error.message}`);
    },
  });
}
