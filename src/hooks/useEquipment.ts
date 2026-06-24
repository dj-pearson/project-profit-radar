import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

type Equipment = Database['public']['Tables']['equipment']['Row'];
type EquipmentInsert = Database['public']['Tables']['equipment']['Insert'];
type EquipmentUpdate = Database['public']['Tables']['equipment']['Update'];
type MaintenanceRecord = Database['public']['Tables']['equipment_maintenance_records']['Row'];

export interface EquipmentWithMaintenance extends Equipment {
  maintenance_records?: MaintenanceRecord[];
}

export function useEquipment() {
  const { userProfile } = useAuth();
  const companyId = userProfile?.company_id;

  return useQuery({
    queryKey: ['equipment', companyId],
    queryFn: async () => {
      if (!companyId) throw new Error('No company ID available');

      const { data, error } = await supabase
        .from('equipment')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Equipment[];
    },
    enabled: !!companyId,
  });
}

export function useEquipmentWithMaintenance() {
  const { userProfile } = useAuth();
  const companyId = userProfile?.company_id;

  return useQuery({
    queryKey: ['equipment-with-maintenance', companyId],
    queryFn: async () => {
      if (!companyId) throw new Error('No company ID available');

      // Fetch equipment
      const { data: equipment, error: equipmentError } = await supabase
        .from('equipment')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (equipmentError) throw equipmentError;

      // Fetch maintenance records for all equipment
      const equipmentIds = equipment?.map(e => e.id) || [];

      if (equipmentIds.length === 0) {
        return [] as EquipmentWithMaintenance[];
      }

      const { data: maintenanceRecords, error: maintenanceError } = await supabase
        .from('equipment_maintenance_records')
        .select('*')
        .in('equipment_id', equipmentIds)
        .order('scheduled_date', { ascending: false });

      if (maintenanceError) throw maintenanceError;

      // Combine equipment with their maintenance records
      const equipmentWithMaintenance = equipment?.map(eq => ({
        ...eq,
        maintenance_records: maintenanceRecords?.filter(mr => mr.equipment_id === eq.id) || []
      })) || [];

      return equipmentWithMaintenance as EquipmentWithMaintenance[];
    },
    enabled: !!companyId,
  });
}

export function useMaintenanceRecords(equipmentId?: string) {
  const { userProfile } = useAuth();
  const companyId = userProfile?.company_id;

  return useQuery({
    queryKey: ['maintenance-records', companyId, equipmentId],
    queryFn: async () => {
      if (!companyId) throw new Error('No company ID available');

      let query = supabase
        .from('equipment_maintenance_records')
        .select('*, equipment:equipment_id(name)')
        .eq('company_id', companyId)
        .order('scheduled_date', { ascending: false });

      if (equipmentId) {
        query = query.eq('equipment_id', equipmentId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });
}

export function useCreateEquipment() {
  const { userProfile, user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (equipment: Omit<EquipmentInsert, 'company_id' | 'created_by'>) => {
      if (!userProfile?.company_id) throw new Error('No company ID available');

      const { data, error } = await supabase
        .from('equipment')
        .insert({
          ...equipment,
          company_id: userProfile.company_id,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      queryClient.invalidateQueries({ queryKey: ['equipment-with-maintenance'] });
      toast({
        title: 'Equipment Added',
        description: 'New equipment has been added to your fleet.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add equipment.',
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateEquipment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: EquipmentUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('equipment')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      queryClient.invalidateQueries({ queryKey: ['equipment-with-maintenance'] });
      toast({
        title: 'Equipment Updated',
        description: 'Equipment details have been updated.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update equipment.',
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteEquipment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('equipment')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      queryClient.invalidateQueries({ queryKey: ['equipment-with-maintenance'] });
      toast({
        title: 'Equipment Deleted',
        description: 'Equipment has been removed from your fleet.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete equipment.',
        variant: 'destructive',
      });
    },
  });
}

export function useEquipmentStats() {
  const { userProfile } = useAuth();
  const companyId = userProfile?.company_id;

  return useQuery({
    queryKey: ['equipment-stats', companyId],
    queryFn: async () => {
      if (!companyId) throw new Error('No company ID available');

      const { data: equipment, error } = await supabase
        .from('equipment')
        .select('status, next_maintenance_date')
        .eq('company_id', companyId);

      if (error) throw error;

      const now = new Date();
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      const stats = {
        total: equipment?.length || 0,
        available: equipment?.filter(e => e.status === 'available' || e.status === null).length || 0,
        inUse: equipment?.filter(e => e.status === 'in_use').length || 0,
        maintenance: equipment?.filter(e => e.status === 'maintenance').length || 0,
        outOfService: equipment?.filter(e => e.status === 'out_of_service').length || 0,
        maintenanceDueSoon: equipment?.filter(e => {
          if (!e.next_maintenance_date) return false;
          const maintenanceDate = new Date(e.next_maintenance_date);
          return maintenanceDate <= thirtyDaysFromNow && maintenanceDate >= now;
        }).length || 0,
      };

      return stats;
    },
    enabled: !!companyId,
  });
}
