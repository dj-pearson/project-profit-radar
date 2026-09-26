/**
 * QR Code Generation Service
 * Generates and manages QR codes for equipment tracking
 */

import QRCode from 'qrcode';
import { supabase } from '@/integrations/supabase/client';

export interface Equipment {
  id: string;
  company_id: string;
  name: string;
  equipment_type?: string | null;
  model?: string | null;
  serial_number?: string | null;
}

export interface QRCodeData {
  equipmentId: string;
  companyId: string;
  name: string | null;
  serialNumber?: string | null;
  type: string;
  version: string;
  generatedAt: string;
}

export interface QRCodeGenerationOptions {
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
  width?: number;
  margin?: number;
  color?: {
    dark?: string;
    light?: string;
  };
}

const defaultOptions: QRCodeGenerationOptions = {
  errorCorrectionLevel: 'H', // High error correction (30% recovery)
  width: 300,
  margin: 2,
  color: {
    dark: '#000000',
    light: '#FFFFFF',
  },
};

/**
 * Render a QR image (PNG data URL) that encodes `qrCodeValue` exactly.
 *
 * Pass the qr_code_value stored in equipment_qr_codes (what
 * generate_equipment_qr_code returns) and nothing else.
 * process_equipment_qr_scan looks labels up by exact string match, so an image
 * of any other string, even the same fields re-serialized with a new
 * generatedAt, scans as "Invalid or inactive QR code".
 */
export const renderQRCodeImage = async (
  qrCodeValue: string,
  options: QRCodeGenerationOptions = {}
): Promise<string> => {
  const mergedOptions = { ...defaultOptions, ...options };

  try {
    return await QRCode.toDataURL(qrCodeValue, {
      errorCorrectionLevel: mergedOptions.errorCorrectionLevel,
      width: mergedOptions.width,
      margin: mergedOptions.margin,
      color: mergedOptions.color,
    });
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw new Error('Failed to generate QR code');
  }
};

/**
 * Render a QR image as an SVG string. Same rule as renderQRCodeImage: pass the
 * stored qr_code_value.
 */
export const renderQRCodeSVG = async (
  qrCodeValue: string,
  options: QRCodeGenerationOptions = {}
): Promise<string> => {
  const mergedOptions = { ...defaultOptions, ...options };

  try {
    return await QRCode.toString(qrCodeValue, {
      type: 'svg',
      errorCorrectionLevel: mergedOptions.errorCorrectionLevel,
      width: mergedOptions.width,
      margin: mergedOptions.margin,
      color: mergedOptions.color,
    });
  } catch (error) {
    console.error('Error generating QR code SVG:', error);
    throw new Error('Failed to generate QR code SVG');
  }
};

interface GenerateQRCodeRpcResult {
  success: boolean;
  existing?: boolean;
  qr_code_id?: string;
  qr_code_value?: string;
  error?: string;
}

/**
 * Get the equipment's active QR code, creating one if it has none, and render
 * its image.
 *
 * generate_equipment_qr_code hands back the existing active code when there is
 * one, so the RPC is the only source of the value. The image is rendered from
 * that value and written to qr_code_image. Rows saved before this fix hold an
 * image of a different string, so calling this also repairs them.
 */
export const getOrGenerateQRCode = async (
  equipment: Equipment
): Promise<{
  success: boolean;
  qr_code_id?: string;
  qr_code_image?: string;
  qr_code_value?: string;
  existing?: boolean;
  error?: string;
}> => {
  try {
    const { data, error: rpcError } = await supabase.rpc('generate_equipment_qr_code', {
      p_equipment_id: equipment.id,
    });

    if (rpcError) throw rpcError;

    const result = data as unknown as GenerateQRCodeRpcResult | null;

    if (!result || !result.success || !result.qr_code_id || !result.qr_code_value) {
      return {
        success: false,
        error: result?.error || 'Failed to generate QR code',
      };
    }

    const qrCodeImage = await renderQRCodeImage(result.qr_code_value);

    // Not fatal: screens render from qr_code_value, so a failed write only
    // leaves a stale cached image in the row.
    const { error: imageError } = await supabase
      .from('equipment_qr_codes')
      .update({ qr_code_image: qrCodeImage })
      .eq('id', result.qr_code_id)
      .eq('company_id', equipment.company_id);

    if (imageError) {
      console.error('QR image was generated but not stored:', imageError.message);
    }

    return {
      success: true,
      qr_code_id: result.qr_code_id,
      qr_code_image: qrCodeImage,
      qr_code_value: result.qr_code_value,
      existing: !!result.existing,
    };
  } catch (error: any) {
    console.error('Error in getOrGenerateQRCode:', error);
    return {
      success: false,
      error: error.message || 'Failed to get or generate QR code',
    };
  }
};

/**
 * Parse QR code data
 */
export const parseQRCodeData = (qrValue: string): QRCodeData | null => {
  try {
    const data = JSON.parse(qrValue);

    // Validate required fields
    if (!data || !data.equipmentId || !data.companyId || !data.type) {
      return null;
    }

    return data as QRCodeData;
  } catch {
    return null;
  }
};

/**
 * Validate QR code data
 */
export const validateQRCodeData = (data: QRCodeData, companyId: string): boolean => {
  // Check company ID matches
  if (data.companyId !== companyId) {
    return false;
  }

  // Check type
  if (data.type !== 'equipment_checkout') {
    return false;
  }

  // Check version (future-proofing)
  if (data.version !== '1.0') {
    return false;
  }

  return true;
};

/**
 * Parse and check a raw scanned string before it goes to
 * process_equipment_qr_scan. The RPC checks the company itself; this only
 * gives a readable error without the round trip. Send the RPC the raw string,
 * never a re-serialized `data`.
 */
export const validateScannedQRValue = (
  qrValue: string,
  companyId: string | null | undefined
): { valid: true; data: QRCodeData } | { valid: false; error: string } => {
  if (!companyId) {
    return { valid: false, error: 'User company not found' };
  }

  const data = parseQRCodeData(qrValue);
  if (!data) {
    return { valid: false, error: 'Invalid QR code format' };
  }

  if (!validateQRCodeData(data, companyId)) {
    return { valid: false, error: 'QR code does not belong to your company or is invalid' };
  }

  return { valid: true, data };
};

/** The values equipment_scan_events.scan_type accepts. */
export const EQUIPMENT_SCAN_TYPES = [
  'check_out',
  'check_in',
  'inspection',
  'location_update',
  'maintenance',
  'verification',
] as const;

export type EquipmentScanType = (typeof EQUIPMENT_SCAN_TYPES)[number];

/** Short names the scanner used to send; the table's CHECK rejects them. */
export type LegacyScanType = 'inspect' | 'maintain';

const LEGACY_SCAN_TYPES: Record<LegacyScanType, EquipmentScanType> = {
  inspect: 'inspection',
  maintain: 'maintenance',
};

export const toEquipmentScanType = (
  scanType: EquipmentScanType | LegacyScanType
): EquipmentScanType => {
  if (Object.prototype.hasOwnProperty.call(LEGACY_SCAN_TYPES, scanType)) {
    return LEGACY_SCAN_TYPES[scanType as LegacyScanType];
  }
  return scanType as EquipmentScanType;
};

/**
 * Download QR code image
 */
export const downloadQRCode = (qrCodeDataURL: string, filename: string) => {
  const link = document.createElement('a');
  link.href = qrCodeDataURL;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Batch generate QR codes for multiple equipment
 */
export const batchGenerateQRCodes = async (
  equipmentList: Equipment[],
  onProgress?: (current: number, total: number) => void
): Promise<{
  success: number;
  failed: number;
  results: Array<{
    equipmentId: string;
    success: boolean;
    qr_code_id?: string;
    error?: string;
  }>;
}> => {
  const results: Array<{
    equipmentId: string;
    success: boolean;
    qr_code_id?: string;
    error?: string;
  }> = [];

  let successCount = 0;
  let failedCount = 0;

  for (let i = 0; i < equipmentList.length; i++) {
    const equipment = equipmentList[i];

    try {
      const result = await getOrGenerateQRCode(equipment);

      if (result.success) {
        successCount++;
        results.push({
          equipmentId: equipment.id,
          success: true,
          qr_code_id: result.qr_code_id,
        });
      } else {
        failedCount++;
        results.push({
          equipmentId: equipment.id,
          success: false,
          error: result.error,
        });
      }
    } catch (error: any) {
      failedCount++;
      results.push({
        equipmentId: equipment.id,
        success: false,
        error: error.message || 'Unknown error',
      });
    }

    // Report progress
    if (onProgress) {
      onProgress(i + 1, equipmentList.length);
    }
  }

  return {
    success: successCount,
    failed: failedCount,
    results,
  };
};
