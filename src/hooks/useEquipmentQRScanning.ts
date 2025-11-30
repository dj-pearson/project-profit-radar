/**
 * Equipment QR Scanning Hook
 * Handles QR code scanning and equipment scan event logging
 */

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { parseQRCodeData, validateQRCodeData } from '@/services/qrCodeService';

export interface EquipmentWithQR {
  equipment_id: string;
  company_id: string;
  name: string;
  equipment_type: string | null;
  make: string | null;
  model: string | null;
  serial_number: string | null;
  status: string;
  current_condition: string | null;
  current_location: string | null;
  checked_out_by: string | null;
  checked_out_at: string | null;
  due_back_at: string | null;
  qr_code_id: string | null;
  qr_code_value: string | null;
  qr_code_image: string | null;
  has_qr_code: boolean;
  is_overdue: boolean;
  checked_out_by_name: string | null;
}

export interface ScanEvent {
  id: string;
  scan_type: string;
  scanned_at: string;
  equipment_name: string;
  scanned_by_name: string;
  location_description: string | null;
  condition_rating: string | null;
  hours_reading: number | null;
  fuel_level: number | null;
  notes: string | null;
}

export interface ProcessScanParams {
  qrCodeValue: string;
  scanType: 'check_out' | 'check_in' | 'inspection' | 'location_update' | 'maintenance' | 'verification';
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
  const { userProfile, siteId } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [lastScannedEquipment, setLastScannedEquipment] = useState<EquipmentWithQR | null>(null);

  // Query equipment with QR codes with site_id isolation
  const { data: equipmentWithQR, isLoading: loadingEquipment } = useQuery({
    queryKey: ['equipment-with-qr', userProfile?.company_id, siteId],
    queryFn: async () => {
      if (!userProfile?.company_id || !siteId) return [];

      // Note: equipment_with_qr view should be filtered by site_id via RLS
      // Adding explicit filter for extra security
      const { data, error } = await supabase
        .from('equipment_with_qr')
        .select('*')
        .eq('company_id', userProfile.company_id)
        .order('name');

      if (error) throw error;
      return data as EquipmentWithQR[];
    },
    enabled: !!userProfile?.company_id && !!siteId,
  });

  // Query recent scan events with site_id isolation
  const { data: recentScans, isLoading: loadingScans } = useQuery({
    queryKey: ['recent-equipment-scans', userProfile?.company_id, siteId],
    queryFn: async () => {
      if (!userProfile?.company_id || !siteId) return [];

      // Note: recent_equipment_scans view should be filtered by site_id via RLS
      const { data, error } = await supabase
        .from('recent_equipment_scans')
        .select('*')
        .limit(50);

      if (error) throw error;
      return data as ScanEvent[];
    },
    enabled: !!userProfile?.company_id && !!siteId,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Process QR scan mutation
  const processScanMutation = useMutation({
    mutationFn: async (params: ProcessScanParams) => {
      const { data, error } = await supabase.rpc('process_equipment_qr_scan', {
        p_qr_code_value: params.qrCodeValue,
        p_scan_type: params.scanType,
        p_latitude: params.latitude || null,
        p_longitude: params.longitude || null,
        p_accuracy: params.accuracy || null,
        p_location_description: params.locationDescription || null,
        p_project_id: params.projectId || null,
        p_condition_rating: params.conditionRating || null,
        p_hours_reading: params.hoursReading || null,
        p_fuel_level: params.fuelLevel || null,
        p_notes: params.notes || null,
        p_photo_urls: params.photoUrls || null,
        p_due_back_at: params.dueBackAt || null,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (result, params) => {
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
      if (!userProfile?.company_id) {
        return { valid: false, error: 'User company not found' };
      }

      // Parse QR code data
      const qrData = parseQRCodeData(qrValue);
      if (!qrData) {
        return { valid: false, error: 'Invalid QR code format' };
      }

      // Validate QR code data
      const isValid = validateQRCodeData(qrData, userProfile.company_id);
      if (!isValid) {
        return { valid: false, error: 'QR code does not belong to your company' };
      }

      return { valid: true, equipmentId: qrData.equipmentId };
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
