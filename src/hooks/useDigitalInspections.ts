import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface QualityInspection {
  id: string;
  company_id: string;
  project_id: string;
  inspection_number: string;
  inspection_type: string;
  phase?: string;
  location?: string;
  inspector_id?: string;
  inspection_date: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'failed';
  checklist_items: any[];
  deficiencies: any[];
  photos: any[];
  notes?: string;
  passed?: boolean;
  reinspection_required: boolean;
  reinspection_date?: string;
  created_at: string;
  updated_at: string;
}

export const useDigitalInspections = (projectId?: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch inspections
  const { data: inspections, isLoading } = useQuery({
    queryKey: ['quality-inspections', projectId],
    queryFn: async () => {
      let query = supabase
        .from('quality_inspections')
        .select('*')
        .order('created_at', { ascending: false });

      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as QualityInspection[];
    },
  });

  // Create inspection
  const createInspection = useMutation({
    mutationFn: async (inspection: any) => {
      const { data, error } = await supabase
        .from('quality_inspections')
        .insert([inspection])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quality-inspections'] });
      toast({ title: 'Inspection created successfully' });
    },
    onError: (error) => {
      toast({ 
        title: 'Failed to create inspection', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  // Update inspection
  const updateInspection = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const { data, error } = await supabase
        .from('quality_inspections')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quality-inspections'] });
      toast({ title: 'Inspection updated successfully' });
    },
    onError: (error) => {
      toast({ 
        title: 'Failed to update inspection', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  // Delete inspection
  const deleteInspection = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('quality_inspections')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quality-inspections'] });
      toast({ title: 'Inspection deleted successfully' });
    },
    onError: (error) => {
      toast({ 
        title: 'Failed to delete inspection', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  return {
    inspections: inspections || [],
    isLoading,
    createInspection,
    updateInspection,
    deleteInspection,
  };
};

// Generate inspection number helper
export const generateInspectionNumber = (type: string) => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  
  const prefix = type.toUpperCase().substring(0, 3);
  return `${prefix}-${year}${month}${day}-${random}`;
};