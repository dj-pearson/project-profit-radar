import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Company {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  created_at: string;
}

export const useCompanyData = () => {
  const { userProfile } = useAuth();
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCompany = useCallback(async () => {
    if (!userProfile?.company_id || !siteId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('id', userProfile.company_id)
         // ← Add site filter
        .single();

      if (error) {
        throw error;
      }

      setCompany(data);
    } catch (error) {
      console.error('Error fetching company:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch company data');
    } finally {
      setLoading(false);
    }
  }, [userProfile?.company_id]);

  useEffect(() => {
    fetchCompany();
  }, [fetchCompany]);

  return {
    company,
    loading,
    error,
    refetch: fetchCompany
  };
};