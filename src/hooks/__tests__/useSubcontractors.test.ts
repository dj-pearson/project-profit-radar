/**
 * US-405: /subcontractors reads and writes the real tables, reports a database
 * without them as unavailable rather than empty, and never claims a write that
 * RLS silently filtered out.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

type Res = { data: unknown; error: unknown };

const h = vi.hoisted(() => ({
  results: {} as Record<string, Res>,
  calls: [] as { table: string; op: string; arg?: unknown }[],
  uploads: [] as { bucket: string; path: string }[],
  removed: [] as { bucket: string; paths: string[] }[],
  uploadError: null as unknown,
}));

vi.mock('@/integrations/supabase/client', () => {
  const from = (table: string) => {
    const res = () => h.results[table] ?? { data: null, error: null };
    const q: Record<string, unknown> = {};
    const chain = (op: string) => (...args: unknown[]) => {
      h.calls.push({ table, op, arg: args.length > 1 ? args : args[0] });
      return q;
    };
    for (const op of ['select', 'insert', 'update', 'delete', 'eq', 'order']) q[op] = chain(op);
    q.single = () => Promise.resolve(res());
    q.then = (resolve: (r: Res) => unknown, reject: (e: unknown) => unknown) =>
      Promise.resolve(res()).then(resolve, reject);
    return q;
  };
  return {
    supabase: {
      from,
      storage: {
        from: (bucket: string) => ({
          upload: (path: string) => {
            h.uploads.push({ bucket, path });
            return Promise.resolve({ data: { path }, error: h.uploadError });
          },
          remove: (paths: string[]) => {
            h.removed.push({ bucket, paths });
            return Promise.resolve({ data: [], error: null });
          },
        }),
      },
    },
  };
});
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ userProfile: null, user: null }) }));

import {
  createSubcontractor,
  deleteCertificate,
  deleteSubcontractor,
  fetchSubcontractors,
  patchColumns,
  updateSubcontractor,
  uploadCertificate,
} from '../useSubcontractors';

const FORM = {
  name: 'Reyes Electric', trade: 'Electrical', contactName: 'Ana Reyes',
  phone: '503-555-0100', email: 'office@reyes.test', licenseNumber: 'EL-1', notes: '',
};

beforeEach(() => {
  h.results = {};
  h.calls = [];
  h.uploads = [];
  h.removed = [];
  h.uploadError = null;
});

describe('fetchSubcontractors', () => {
  it('reads both tables for the company and joins certificates to vendors', async () => {
    h.results.subcontractors = {
      data: [{
        id: 's1', company_id: 'c1', name: 'Reyes Electric', trade: 'Electrical', contact_name: 'Ana',
        phone: null, email: null, license_number: null, rating: 3, notes: null,
        prequalification: { business_license: true }, is_active: true, created_at: '', updated_at: '',
      }],
      error: null,
    };
    h.results.subcontractor_insurance_certificates = {
      data: [{ id: 'k1', company_id: 'c1', subcontractor_id: 's1', coverage_type: 'General Liability', file_path: 'c1/s1/k1.pdf', file_name: 'gl.pdf', expires_on: '2027-01-01', created_at: '' }],
      error: null,
    };
    const list = await fetchSubcontractors('c1');
    expect(list.available).toBe(true);
    expect(list.subcontractors).toHaveLength(1);
    expect(list.subcontractors[0].insuranceCertificates[0].filePath).toBe('c1/s1/k1.pdf');
    expect(h.calls).toContainEqual({ table: 'subcontractors', op: 'eq', arg: ['company_id', 'c1'] });
    expect(h.calls).toContainEqual({ table: 'subcontractor_insurance_certificates', op: 'eq', arg: ['company_id', 'c1'] });
  });

  it('says unavailable, not empty, when the migration has not been applied', async () => {
    h.results.subcontractors = { data: null, error: { code: 'PGRST205', message: 'Could not find the table in the schema cache' } };
    await expect(fetchSubcontractors('c1')).resolves.toEqual({ available: false, subcontractors: [] });
  });

  it('throws any other read error instead of rendering an empty list', async () => {
    h.results.subcontractors = { data: null, error: { code: '42501', message: 'permission denied' } };
    await expect(fetchSubcontractors('c1')).rejects.toMatchObject({ code: '42501' });
  });

  it('throws when certificates cannot be read, rather than showing every vendor uninsured', async () => {
    h.results.subcontractors = { data: [], error: null };
    h.results.subcontractor_insurance_certificates = { data: null, error: { code: '500', message: 'boom' } };
    await expect(fetchSubcontractors('c1')).rejects.toMatchObject({ message: 'boom' });
  });
});

describe('writes', () => {
  it('inserts a new subcontractor scoped to the company with the creator', async () => {
    h.results.subcontractors = { data: { id: 's1' }, error: null };
    await createSubcontractor('c1', 'u1', FORM);
    const insert = h.calls.find((c) => c.op === 'insert');
    expect(insert?.table).toBe('subcontractors');
    expect(insert?.arg).toMatchObject({ company_id: 'c1', created_by: 'u1', name: 'Reyes Electric', license_number: 'EL-1', notes: null });
  });

  it('surfaces an insert error', async () => {
    h.results.subcontractors = { data: null, error: { message: 'new row violates row-level security policy' } };
    await expect(createSubcontractor('c1', 'u1', FORM)).rejects.toMatchObject({ message: expect.stringContaining('row-level security') });
  });

  it('writes only the column a rating or checklist change touches', () => {
    expect(patchColumns({ kind: 'rating', rating: 4 })).toEqual({ rating: 4 });
    expect(patchColumns({ kind: 'prequalification', prequalification: { references: true } })).toEqual({
      prequalification: { references: true },
    });
    expect(() => patchColumns({ kind: 'rating', rating: 6 })).toThrow();
  });

  it('treats an update RLS filtered to zero rows as a failure, not a save', async () => {
    h.results.subcontractors = { data: [], error: null };
    await expect(updateSubcontractor('s1', { kind: 'rating', rating: 2 })).rejects.toThrow(/not saved/);
    h.results.subcontractors = { data: [{ id: 's1' }], error: null };
    await expect(updateSubcontractor('s1', { kind: 'rating', rating: 2 })).resolves.toBeUndefined();
  });

  it('deletes the vendor and then its certificate files', async () => {
    h.results.subcontractors = { data: [{ id: 's1' }], error: null };
    await deleteSubcontractor({ id: 's1', insuranceCertificates: [{ id: 'k1', coverageType: 'GL', filePath: 'c1/s1/k1.pdf', fileName: '', expiresOn: '2027-01-01' }] });
    expect(h.removed).toEqual([{ bucket: 'subcontractor-documents', paths: ['c1/s1/k1.pdf'] }]);
  });

  it('does not touch files when the delete did not happen', async () => {
    h.results.subcontractors = { data: [], error: null };
    await expect(
      deleteSubcontractor({ id: 's1', insuranceCertificates: [{ id: 'k1', coverageType: 'GL', filePath: 'c1/s1/k1.pdf', fileName: '', expiresOn: '2027-01-01' }] }),
    ).rejects.toThrow(/not deleted/);
    expect(h.removed).toEqual([]);
  });
});

describe('certificates', () => {
  const pdf = () => new File(['%PDF-1.4'], 'COI 2026.pdf', { type: 'application/pdf' });

  it('uploads to the private bucket under the company folder, then records the expiry', async () => {
    h.results.subcontractor_insurance_certificates = { data: null, error: null };
    await uploadCertificate({
      companyId: 'c1', userId: 'u1', subcontractorId: 's1', file: pdf(),
      values: { coverageType: 'General Liability', expiresOn: '2027-03-31' },
    });
    expect(h.uploads).toHaveLength(1);
    expect(h.uploads[0].bucket).toBe('subcontractor-documents');
    expect(h.uploads[0].path).toMatch(/^c1\/s1\/.+-COI_2026\.pdf$/);
    const insert = h.calls.find((c) => c.op === 'insert');
    expect(insert?.arg).toMatchObject({
      company_id: 'c1', subcontractor_id: 's1', coverage_type: 'General Liability',
      expires_on: '2027-03-31', file_path: h.uploads[0].path, file_name: 'COI 2026.pdf',
    });
  });

  it('removes the uploaded file when the row cannot be written', async () => {
    h.results.subcontractor_insurance_certificates = { data: null, error: { message: 'insert denied' } };
    await expect(
      uploadCertificate({
        companyId: 'c1', userId: 'u1', subcontractorId: 's1', file: pdf(),
        values: { coverageType: 'General Liability', expiresOn: '2027-03-31' },
      }),
    ).rejects.toMatchObject({ message: 'insert denied' });
    expect(h.removed).toEqual([{ bucket: 'subcontractor-documents', paths: [h.uploads[0].path] }]);
  });

  it('writes no row when the upload fails', async () => {
    h.uploadError = { message: 'Bucket not found' };
    await expect(
      uploadCertificate({
        companyId: 'c1', userId: 'u1', subcontractorId: 's1', file: pdf(),
        values: { coverageType: 'General Liability', expiresOn: '2027-03-31' },
      }),
    ).rejects.toMatchObject({ message: 'Bucket not found' });
    expect(h.calls.find((c) => c.op === 'insert')).toBeUndefined();
  });

  it('refuses a file type a certificate is not', async () => {
    const exe = new File(['MZ'], 'coi.exe', { type: 'application/x-msdownload' });
    await expect(
      uploadCertificate({
        companyId: 'c1', userId: 'u1', subcontractorId: 's1', file: exe,
        values: { coverageType: 'General Liability', expiresOn: '2027-03-31' },
      }),
    ).rejects.toThrow(/not allowed/);
    expect(h.uploads).toEqual([]);
  });

  it('deletes the certificate row, then its file', async () => {
    h.results.subcontractor_insurance_certificates = { data: [{ id: 'k1' }], error: null };
    await deleteCertificate({ id: 'k1', filePath: 'c1/s1/k1.pdf' });
    expect(h.removed).toEqual([{ bucket: 'subcontractor-documents', paths: ['c1/s1/k1.pdf'] }]);
  });
});
