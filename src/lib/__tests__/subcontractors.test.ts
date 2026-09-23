/**
 * US-405: the rules behind /subcontractors - which insurance status a vendor
 * shows, what the checklist stores, and what the form lets through.
 */
import { describe, it, expect } from 'vitest';
import {
  certificateStatus,
  certificateStoragePath,
  countPrequalified,
  daysUntil,
  getInsuranceStatus,
  isMissingTableError,
  readPrequalification,
  subcontractorFormSchema,
  certificateFormSchema,
  toSubcontractor,
  toSubcontractorColumns,
  togglePrequalification,
  type CertificateRow,
  type SubcontractorRow,
} from '../subcontractors';

const NOW = new Date(2026, 8, 23, 15, 30); // 2026-09-23, mid-afternoon local

describe('insurance status', () => {
  it('counts days by calendar date, so the expiry day itself is 0 and not expired', () => {
    expect(daysUntil('2026-09-23', NOW)).toBe(0);
    expect(certificateStatus('2026-09-23', NOW)).toBe('expiring');
    expect(daysUntil('2026-09-22', NOW)).toBe(-1);
    expect(certificateStatus('2026-09-22', NOW)).toBe('expired');
  });

  it('treats 30 days out as expiring and 31 as valid', () => {
    expect(certificateStatus('2026-10-23', NOW)).toBe('expiring');
    expect(certificateStatus('2026-10-24', NOW)).toBe('valid');
  });

  it('shows "none" rather than "expired" for a vendor with no certificate on file', () => {
    expect(getInsuranceStatus([], NOW)).toBe('none');
  });

  it('judges each coverage by its latest certificate, so a renewed policy is not expired', () => {
    const certs = [
      { coverageType: 'General Liability', expiresOn: '2025-12-31' },
      { coverageType: 'General Liability', expiresOn: '2027-06-30' },
    ];
    expect(getInsuranceStatus(certs, NOW)).toBe('valid');
  });

  it('shows the worst status across coverage types', () => {
    const certs = [
      { coverageType: 'General Liability', expiresOn: '2027-06-30' },
      { coverageType: 'Workers Compensation', expiresOn: '2026-10-01' },
    ];
    expect(getInsuranceStatus(certs, NOW)).toBe('expiring');
    expect(getInsuranceStatus([...certs, { coverageType: 'Commercial Auto', expiresOn: '2026-01-01' }], NOW)).toBe('expired');
  });
});

describe('prequalification', () => {
  it('reads only known keys set to true, and ignores junk', () => {
    expect(readPrequalification({ business_license: true, references: 'yes', unknown_item: true })).toEqual({
      business_license: true,
    });
    expect(readPrequalification(null)).toEqual({});
    expect(readPrequalification([true])).toEqual({});
  });

  it('toggles one item without touching the others', () => {
    const next = togglePrequalification({ business_license: true }, 'workers_comp');
    expect(next).toEqual({ business_license: true, workers_comp: true });
    expect(countPrequalified(next)).toBe(2);
    expect(togglePrequalification(next, 'business_license').business_license).toBe(false);
  });
});

describe('row mapping', () => {
  const row: SubcontractorRow = {
    id: 's1', company_id: 'c1', name: 'Reyes Electric', trade: 'Electrical',
    contact_name: null, phone: '503-555-0100', email: 'office@reyes.test', license_number: null,
    rating: 4, notes: null, prequalification: { osha_record: true }, is_active: true,
    created_at: '2026-09-01T00:00:00Z', updated_at: '2026-09-01T00:00:00Z',
  };
  const cert = (id: string, subId: string, expires: string): CertificateRow => ({
    id, company_id: 'c1', subcontractor_id: subId, coverage_type: 'General Liability',
    file_path: `c1/${subId}/${id}.pdf`, file_name: `${id}.pdf`, expires_on: expires, created_at: '',
  });

  it('attaches only that vendor\'s certificates, soonest expiry first', () => {
    const sub = toSubcontractor(row, [cert('b', 's1', '2027-05-01'), cert('x', 's2', '2027-01-01'), cert('a', 's1', '2026-12-01')]);
    expect(sub.insuranceCertificates.map((c) => c.id)).toEqual(['a', 'b']);
    expect(sub.contactName).toBe('');
    expect(sub.prequalification).toEqual({ osha_record: true });
  });
});

describe('forms', () => {
  const valid = {
    name: '  Reyes Electric ', trade: 'Electrical', contactName: 'Ana Reyes',
    phone: '503-555-0100', email: 'office@reyes.test', licenseNumber: '', notes: '',
  };

  it('trims and stores empty optional text as NULL', () => {
    expect(toSubcontractorColumns(valid)).toEqual({
      name: 'Reyes Electric', trade: 'Electrical', contact_name: 'Ana Reyes',
      phone: '503-555-0100', email: 'office@reyes.test', license_number: null, notes: null,
    });
  });

  it('rejects a missing name and a bad email', () => {
    const r = subcontractorFormSchema.safeParse({ ...valid, name: '  ', email: 'not-an-email' });
    expect(r.success).toBe(false);
    if (!r.success) {
      const fields = r.error.issues.map((i) => i.path[0]);
      expect(fields).toContain('name');
      expect(fields).toContain('email');
    }
  });

  it('requires a real expiry date on a certificate', () => {
    expect(certificateFormSchema.safeParse({ coverageType: 'General Liability', expiresOn: '' }).success).toBe(false);
    expect(certificateFormSchema.safeParse({ coverageType: 'General Liability', expiresOn: '2027-01-31' }).success).toBe(true);
  });
});

describe('certificateStoragePath', () => {
  it('puts the company first, where the storage policies look, and strips path tricks', () => {
    expect(certificateStoragePath('c1', 's1', '../../etc/COI 2026.pdf', 'u1')).toBe('c1/s1/u1-etcCOI_2026.pdf');
  });
});

describe('isMissingTableError', () => {
  it('recognises the PostgREST and Postgres missing-table errors only', () => {
    expect(isMissingTableError({ code: 'PGRST205', message: "Could not find the table 'public.subcontractors' in the schema cache" })).toBe(true);
    expect(isMissingTableError({ code: '42P01', message: 'relation "subcontractors" does not exist' })).toBe(true);
    expect(isMissingTableError({ code: '42501', message: 'permission denied for table subcontractors' })).toBe(false);
    expect(isMissingTableError(null)).toBe(false);
  });
});
