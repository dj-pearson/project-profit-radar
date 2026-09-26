/**
 * Equipment QR Scanning Hook
 * Handles QR code scanning and equipment scan event logging
 */

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  toEquipmentScanType,
  validateScannedQRValue,
  type EquipmentScanType,
  type LegacyScanType,
} from '@/services/qrCodeService';

/** A row of the equipment_with_qr view (20260926020000). */
export interface EquipmentWithQR {
  equipment_id: string;
  company_id: string;
  name: string;
  equipment_type: string | null;
  model: string | null;
  serial_number: string | null;
  status: string | null;
  location: string | null;
  qr_code_id: string | null;
  qr_code_value: string | null;
  qr_code_image: string | null;
  qr_generated_at: string | null;
  scan_count: number | null;
  last_scanned_at: string | null;
  qr_is_active: boolean | null;
  has_qr_code: boolean;
}

/** A row of the recent_equipment_scans view (20260926020000). */
export interface ScanEvent {
  scan_id: string;
  scan_type: string;
  scanned_at: string;
  location_description: string | null;
  condition_rating: string | null;
  hours_reading: number | null;
  fuel_level: number | null;
  notes: string | null;
  overdue_flag: boolean | null;
  equipment_id: string;
  equipment_name: string;
  equipment_type: string | null;
  serial_number: string | null;
  scanned_by_id: string;
  scanned_by_name: string | null;
  scanned_by_email: string | null;
  project_id: string | null;
  project_name: string | null;
  gps_latitude: number | null;
  gps_longitude: number | null;
  hours_since_scan: number | null;
}

/** What process_equipment_qr_scan returns. A failed scan is success: false, not an error. */
export interface ProcessScanResult {
  success: boolean;
  error?: string;
  scan_event_id?: string;
  equipment_id?: string;
  equipment_name?: string;
  new_status?: string;
  message?: string;
}

export interface ProcessScanParams {
  /** The raw scanned string. The RPC matches it byte for byte against qr_code_value. */
  qrCodeValue: string;
  scanType: EquipmentScanType | LegacyScanType;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  locationDescription?: string;
  projectId?: string;
  conditionRating?: 'excellent' | 'good' | 'fair' | 'poor' | 'needs_repair';
  hoursReading?: number;
  fuelLevel?: number;
  notes?: string;
  photoUrls?: string[];
  dueBackAt?: string;
}

export const useEquipmentQRScanning = () => {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [lastScannedEquipment, setLastScannedEquipment] = useState<EquipmentWithQR | null>(null);

  // Query equipment with QR codes
  const { data: equipmentWithQR, isLoading: loadingEquipment } = useQuery({
    queryKey: ['equipment-with-qr', userProfile?.company_id],
    queryFn: async () => {
      if (!userProfile?.company_id) return [];

      const { data, error } = await supabase
        .from('equipment_with_qr')
        .select('*')
        .eq('company_id', userProfile.company_id)
        .order('name');

      if (error) throw error;
      return (data ?? []) as unknown as EquipmentWithQR[];
    },
    enabled: !!userProfile?.company_id,
  });

  // Query recent scan events
  const { data: recentScans, isLoading: loadingScans } = useQuery({
    queryKey: ['recent-equipment-scans', userProfile?.company_id],
    queryFn: async () => {
      if (!userProfile?.company_id) return [];

      // The view has no company_id column to filter on here; it filters to
      // the caller's company itself (20260926020000).
      const { data, error } = await supabase
        .from('recent_equipment_scans')
        .select('*')
        .order('scanned_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return (data ?? []) as unknown as ScanEvent[];
    },
    enabled: !!userProfile?.company_id,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Process QR scan mutation
  const processScanMutation = useMutation({
    mutationFn: async (params: ProcessScanParams): Promise<ProcessScanResult> => {
      // Optional args are left out rather than sent as null; the RPC defaults
      // them to NULL. `??` keeps a real 0 (empty tank, zero hours).
      const { data, error } = await supabase.rpc('process_equipment_qr_scan', {
        p_qr_code_value: params.qrCodeValue,
        p_scan_type: toEquipmentScanType(params.scanType),
        p_latitude: params.latitude ?? undefined,
        p_longitude: params.longitude ?? undefined,
        p_accuracy: params.accuracy ?? undefined,
        p_location_description: params.locationDescription || undefined,
        p_project_id: params.projectId || undefined,
        p_condition_rating: params.conditionRating || undefined,
        p_hours_reading: params.hoursReading ?? undefined,
        p_fuel_level: params.fuelLevel ?? undefined,
        p_notes: params.notes || undefined,
        p_photo_urls: params.photoUrls?.length ? params.photoUrls : undefined,
        p_due_back_at: params.dueBackAt || undefined,
      });

      if (error) throw error;
      return (data ?? { success: false, error: 'No response from server' }) as unknown as ProcessScanResult;
    },
    onSuccess: (result) => {
      if (result.success) {
        toast({
          title: 'Scan Successful',
          description: result.message,
        });

        // Find and store the scanned equipment
        const equipment = equipmentWithQR?.find(
          (e) => e.equipment_id === result.equipment_id
        );
        if (equipment) {
          setLastScannedEquipment(equipment);
        }
      } else {
        toast({
          title: 'Scan Failed',
          description: result.error || 'Failed to process scan',
          variant: 'destructive',
        });
      }

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['equipment-with-qr'] });
      queryClient.invalidateQueries({ queryKey: ['recent-equipment-scans'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Scan Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Validate scanned QR code
  const validateScannedQRCode = useCallback(
    (qrValue: string): { valid: boolean; error?: string; equipmentId?: string } => {
      const result = validateScannedQRValue(qrValue, userProfile?.company_id);
      if (!result.valid) {
        return { valid: false, error: result.error };
      }
      return { valid: true, equipmentId: result.data.equipmentId };
    },
    [userProfile?.company_id]
  );

  // Helper: Check out equipment
  const checkOutEquipment = useCallback(
    async (
      qrCodeValue: string,
      options: {
        projectId?: string;
        dueBackAt?: string;
        locationDescription?: string;
        latitude?: number;
        longitude?: number;
        accuracy?: number;
        conditionRating?: 'excellent' | 'good' | 'fair' | 'poor' | 'needs_repair';
        notes?: string;
      } = {}
    ) => {
      return processScanMutation.mutateAsync({
        qrCodeValue,
        scanType: 'check_out',
        ...options,
      });
    },
    [processScanMutation]
  );

  // Helper: Check in equipment
  const checkInEquipment = useCallback(
    async (
      qrCodeValue: string,
      options: {
        locationDescription?: string;
        latitude?: number;
        longitude?: number;
        accuracy?: number;
        conditionRating?: 'excellent' | 'good' | 'fair' | 'poor' | 'needs_repair';
        hoursReading?: number;
        fuelLevel?: number;
        notes?: string;
        photoUrls?: string[];
      } = {}
    ) => {
      return processScanMutation.mutateAsync({
        qrCodeValue,
        scanType: 'check_in',
        ...options,
      });
    },
    [processScanMutation]
  );

  // Helper: Inspect equipment
  const inspectEquipment = useCallback(
    async (
      qrCodeValue: string,
      options: {
        locationDescription?: string;
        latitude?: number;
        longitude?: number;
        accuracy?: number;
        conditionRating: 'excellent' | 'good' | 'fair' | 'poor' | 'needs_repair';
        notes?: string;
        photoUrls?: string[];
      }
    ) => {
      return processScanMutation.mutateAsync({
        qrCodeValue,
        scanType: 'inspection',
        ...options,
      });
    },
    [processScanMutation]
  );

  return {
    // Data
    equipmentWithQR: equipmentWithQR || [],
    recentScans: recentScans || [],
    lastScannedEquipment,

    // Loading states
    loadingEquipment,
    loadingScans,
    processingScans: processScanMutation.isPending,

    // Actions
    processScan: processScanMutation.mutate,
    processScanAsync: processScanMutation.mutateAsync,
    validateScannedQRCode,
    checkOutEquipment,
    checkInEquipment,
    inspectEquipment,
    clearLastScanned: () => setLastScannedEquipment(null),

    // Helpers
    getEquipmentByQRCode: (qrCodeValue: string) => {
      return equipmentWithQR?.find((e) => e.qr_code_value === qrCodeValue);
    },
    getEquipmentById: (equipmentId: string) => {
      return equipmentWithQR?.find((e) => e.equipment_id === equipmentId);
    },
  };
};
