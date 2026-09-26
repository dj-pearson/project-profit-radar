/**
 * The printed label has to encode exactly the qr_code_value the database
 * stores, because process_equipment_qr_scan looks it up by string equality.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import QRCode from 'qrcode';

const rpc = vi.fn();
const updateCalls: Array<{ values: Record<string, unknown>; filters: Array<[string, unknown]> }> = [];

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: (...args: unknown[]) => rpc(...args),
    from: () => ({
      update: (values: Record<string, unknown>) => {
        const call = { values, filters: [] as Array<[string, unknown]> };
        updateCalls.push(call);
        const chain = {
          eq: (column: string, value: unknown) => {
            call.filters.push([column, value]);
            return Object.assign(Promise.resolve({ error: null }), chain);
          },
        };
        return chain;
      },
    }),
  },
}));

import {
  getOrGenerateQRCode,
  renderQRCodeImage,
  toEquipmentScanType,
  validateScannedQRValue,
  EQUIPMENT_SCAN_TYPES,
} from '../qrCodeService';

const COMPANY_ID = '11111111-1111-1111-1111-111111111111';

// Shaped like generate_equipment_qr_code's json_build_object(...)::text.
const STORED_VALUE = JSON.stringify({
  equipmentId: '22222222-2222-2222-2222-222222222222',
  companyId: COMPANY_ID,
  name: 'Excavator 3',
  serialNumber: 'EX-003',
  type: 'equipment_checkout',
  version: '1.0',
  generatedAt: '2026-09-26T10:00:00.123456+00:00',
});

const RENDER_OPTIONS = {
  errorCorrectionLevel: 'H' as const,
  width: 300,
  margin: 2,
  color: { dark: '#000000', light: '#FFFFFF' },
};

describe('renderQRCodeImage', () => {
  it('encodes the stored value unchanged', async () => {
    const image = await renderQRCodeImage(STORED_VALUE);
    expect(image).toBe(await QRCode.toDataURL(STORED_VALUE, RENDER_OPTIONS));
  });

  it('differs from an image of the same fields with a new generatedAt', async () => {
    const reserialized = JSON.stringify({
      ...JSON.parse(STORED_VALUE),
      generatedAt: '2026-09-26T10:00:01.000Z',
    });
    expect(await renderQRCodeImage(STORED_VALUE)).not.toBe(await renderQRCodeImage(reserialized));
  });
});

describe('getOrGenerateQRCode', () => {
  beforeEach(() => {
    rpc.mockReset();
    updateCalls.length = 0;
  });

  it('renders and stores the image of the value the RPC returned', async () => {
    rpc.mockResolvedValue({
      data: { success: true, existing: true, qr_code_id: 'qr-1', qr_code_value: STORED_VALUE },
      error: null,
    });

    const result = await getOrGenerateQRCode({
      id: '22222222-2222-2222-2222-222222222222',
      company_id: COMPANY_ID,
      name: 'Excavator 3',
    });

    const expectedImage = await QRCode.toDataURL(STORED_VALUE, RENDER_OPTIONS);
    expect(rpc).toHaveBeenCalledWith('generate_equipment_qr_code', {
      p_equipment_id: '22222222-2222-2222-2222-222222222222',
    });
    expect(result).toMatchObject({
      success: true,
      existing: true,
      qr_code_id: 'qr-1',
      qr_code_value: STORED_VALUE,
      qr_code_image: expectedImage,
    });
    expect(updateCalls).toHaveLength(1);
    expect(updateCalls[0].values).toEqual({ qr_code_image: expectedImage });
    expect(updateCalls[0].filters).toEqual([
      ['id', 'qr-1'],
      ['company_id', COMPANY_ID],
    ]);
  });

  it('passes the RPC error through when the equipment is not found', async () => {
    rpc.mockResolvedValue({ data: { success: false, error: 'Equipment not found' }, error: null });

    const result = await getOrGenerateQRCode({ id: 'x', company_id: COMPANY_ID, name: 'X' });

    expect(result).toEqual({ success: false, error: 'Equipment not found' });
    expect(updateCalls).toHaveLength(0);
  });
});

describe('validateScannedQRValue', () => {
  it('accepts a label from the caller company', () => {
    const result = validateScannedQRValue(STORED_VALUE, COMPANY_ID);
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.data.equipmentId).toBe('22222222-2222-2222-2222-222222222222');
    }
  });

  it('rejects another company, another type, another version and non-JSON', () => {
    const base = JSON.parse(STORED_VALUE);
    expect(validateScannedQRValue(STORED_VALUE, 'other-company').valid).toBe(false);
    expect(validateScannedQRValue(JSON.stringify({ ...base, type: 'asset' }), COMPANY_ID).valid).toBe(false);
    expect(validateScannedQRValue(JSON.stringify({ ...base, version: '2.0' }), COMPANY_ID).valid).toBe(false);
    expect(validateScannedQRValue('EX-003', COMPANY_ID)).toEqual({
      valid: false,
      error: 'Invalid QR code format',
    });
    expect(validateScannedQRValue(STORED_VALUE, undefined).valid).toBe(false);
  });
});

describe('toEquipmentScanType', () => {
  it('maps the scanner short names to the values the table accepts', () => {
    expect(toEquipmentScanType('inspect')).toBe('inspection');
    expect(toEquipmentScanType('maintain')).toBe('maintenance');
  });

  it('passes every accepted value through unchanged', () => {
    for (const scanType of EQUIPMENT_SCAN_TYPES) {
      expect(toEquipmentScanType(scanType)).toBe(scanType);
    }
  });
});
