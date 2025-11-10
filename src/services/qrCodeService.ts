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
  equipment_type?: string;
  make?: string;
  model?: string;
  serial_number?: string;
}

export interface QRCodeData {
  equipmentId: string;
  companyId: string;
  name: string;
  serialNumber?: string;
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
 * Generate QR code data URL (base64) for equipment
 */
export const generateEquipmentQRCode = async (
  equipment: Equipment,
  options: QRCodeGenerationOptions = {}
): Promise<string> => {
  const qrData: QRCodeData = {
    equipmentId: equipment.id,
    companyId: equipment.company_id,
    name: equipment.name,
    serialNumber: equipment.serial_number || '',
    type: 'equipment_checkout',
    version: '1.0',
    generatedAt: new Date().toISOString(),
  };

  const mergedOptions = { ...defaultOptions, ...options };

  try {
    // Generate QR code as data URL (base64)
    const qrCodeDataURL = await QRCode.toDataURL(JSON.stringify(qrData), {
      errorCorrectionLevel: mergedOptions.errorCorrectionLevel,
      width: mergedOptions.width,
      margin: mergedOptions.margin,
      color: mergedOptions.color,
    });

    return qrCodeDataURL;
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw new Error('Failed to generate QR code');
  }
};

/**
 * Generate QR code as SVG string
 */
export const generateEquipmentQRCodeSVG = async (
  equipment: Equipment,
  options: QRCodeGenerationOptions = {}
): Promise<string> => {
  const qrData: QRCodeData = {
    equipmentId: equipment.id,
    companyId: equipment.company_id,
    name: equipment.name,
    serialNumber: equipment.serial_number || '',
    type: 'equipment_checkout',
    version: '1.0',
    generatedAt: new Date().toISOString(),
  };

  const mergedOptions = { ...defaultOptions, ...options };

  try {
    // Generate QR code as SVG
    const qrCodeSVG = await QRCode.toString(JSON.stringify(qrData), {
      type: 'svg',
      errorCorrectionLevel: mergedOptions.errorCorrectionLevel,
      width: mergedOptions.width,
      margin: mergedOptions.margin,
      color: mergedOptions.color,
    });

    return qrCodeSVG;
  } catch (error) {
    console.error('Error generating QR code SVG:', error);
    throw new Error('Failed to generate QR code SVG');
  }
};

/**
 * Save generated QR code to database
 */
export const saveQRCodeToDatabase = async (
  equipmentId: string,
  qrCodeImage: string
): Promise<{ success: boolean; qr_code_id?: string; error?: string }> => {
  try {
    // Call database function to generate QR code record
    const { data: qrData, error: qrError } = await supabase.rpc(
      'generate_equipment_qr_code',
      { p_equipment_id: equipmentId }
    );

    if (qrError) throw qrError;

    if (!qrData.success) {
      return {
        success: false,
        error: qrData.error || 'Failed to generate QR code',
      };
    }

    // Update with QR code image
    const { error: updateError } = await supabase
      .from('equipment_qr_codes')
      .update({ qr_code_image: qrCodeImage })
      .eq('id', qrData.qr_code_id);

    if (updateError) throw updateError;

    return {
      success: true,
      qr_code_id: qrData.qr_code_id,
    };
  } catch (error: any) {
    console.error('Error saving QR code to database:', error);
    return {
      success: false,
      error: error.message || 'Failed to save QR code',
    };
  }
};

/**
 * Generate and save QR code for equipment (complete workflow)
 */
export const generateAndSaveQRCode = async (
  equipment: Equipment
): Promise<{
  success: boolean;
  qr_code_id?: string;
  qr_code_image?: string;
  qr_code_value?: string;
  error?: string;
}> => {
  try {
    // Generate QR code image
    const qrCodeImage = await generateEquipmentQRCode(equipment);

    // Save to database
    const saveResult = await saveQRCodeToDatabase(equipment.id, qrCodeImage);

    if (!saveResult.success) {
      return saveResult;
    }

    // Get QR code value from database
    const { data: qrCodeData, error: fetchError } = await supabase
      .from('equipment_qr_codes')
      .select('qr_code_value')
      .eq('id', saveResult.qr_code_id)
      .single();

    if (fetchError) throw fetchError;

    return {
      success: true,
      qr_code_id: saveResult.qr_code_id,
      qr_code_image: qrCodeImage,
      qr_code_value: qrCodeData.qr_code_value,
    };
  } catch (error: any) {
    console.error('Error in generateAndSaveQRCode:', error);
    return {
      success: false,
      error: error.message || 'Failed to generate and save QR code',
    };
  }
};

/**
 * Get or generate QR code for equipment
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
    // Check if QR code already exists
    const { data: existingQR, error: fetchError } = await supabase
      .from('equipment_qr_codes')
      .select('*')
      .eq('equipment_id', equipment.id)
      .eq('is_active', true)
      .maybeSingle();

    if (fetchError) throw fetchError;

    if (existingQR) {
      // QR code exists, return it (regenerate image if missing)
      let qrCodeImage = existingQR.qr_code_image;

      if (!qrCodeImage) {
        qrCodeImage = await generateEquipmentQRCode(equipment);

        // Update database with image
        await supabase
          .from('equipment_qr_codes')
          .update({ qr_code_image: qrCodeImage })
          .eq('id', existingQR.id);
      }

      return {
        success: true,
        qr_code_id: existingQR.id,
        qr_code_image: qrCodeImage,
        qr_code_value: existingQR.qr_code_value,
        existing: true,
      };
    }

    // No existing QR code, generate new one
    const generateResult = await generateAndSaveQRCode(equipment);
    return {
      ...generateResult,
      existing: false,
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
    if (!data.equipmentId || !data.companyId || !data.type) {
      return null;
    }

    return data as QRCodeData;
  } catch (error) {
    console.error('Error parsing QR code data:', error);
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
