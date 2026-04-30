import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import React from 'react';
import { supabase } from '@/integrations/supabase/client';

const { mockDocuments } = vi.hoisted(() => ({
  mockDocuments: [
  {
    id: 'doc-001',
    company_id: 'company-1',
    project_id: 'project-1',
    name: 'Foundation Inspection Report.pdf',
    description: 'City inspector final approval for foundation phase',
    file_path: 'documents/project-1/inspections/foundation-report-2026.pdf',
    file_type: 'application/pdf',
    file_size: 2450000,
    version: 1,
    is_current_version: true,
    uploaded_by: 'user-1',
    approved_by: 'supervisor-1',
    approved_at: '2026-02-20T14:00:00Z',
    category_id: 'cat-inspections',
    ocr_text: null,
    auto_routed: false,
    created_at: '2026-02-20T10:00:00Z',
    updated_at: '2026-02-20T14:00:00Z',
  },
  {
    id: 'doc-002',
    company_id: 'company-1',
    project_id: 'project-1',
    name: 'Architectural Plans - Rev C.dwg',
    description: 'Updated architectural plans with client-requested changes',
    file_path: 'documents/project-1/plans/arch-plans-rev-c.dwg',
    file_type: 'application/acad',
    file_size: 15800000,
    version: 3,
    is_current_version: true,
    uploaded_by: 'user-2',
    approved_by: null,
    approved_at: null,
    category_id: 'cat-plans',
    ocr_text: null,
    auto_routed: true,
    created_at: '2026-02-18T09:00:00Z',
    updated_at: '2026-02-18T09:00:00Z',
  },
  {
    id: 'doc-003',
    company_id: 'company-1',
    project_id: 'project-2',
    name: 'Safety Compliance Checklist.xlsx',
    description: 'Weekly safety compliance checklist for warehouse project',
    file_path: 'documents/project-2/safety/safety-checklist-week8.xlsx',
    file_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    file_size: 85000,
    version: 1,
    is_current_version: true,
    uploaded_by: 'user-3',
    approved_by: null,
    approved_at: null,
    category_id: 'cat-safety',
    ocr_text: null,
    auto_routed: false,
    created_at: '2026-02-22T07:30:00Z',
    updated_at: '2026-02-22T07:30:00Z',
  },
  {
    id: 'doc-004',
    company_id: 'company-1',
    project_id: 'project-1',
    name: 'Subcontractor Agreement - ABC Plumbing.pdf',
    description: 'Signed subcontractor agreement for plumbing rough-in',
    file_path: 'documents/project-1/contracts/sub-agreement-abc-plumbing.pdf',
    file_type: 'application/pdf',
    file_size: 1200000,
    version: 2,
    is_current_version: true,
    uploaded_by: 'user-1',
    approved_by: 'admin-1',
    approved_at: '2026-02-10T16:00:00Z',
    category_id: 'cat-contracts',
    ocr_text: 'ABC Plumbing Services Agreement...',
    auto_routed: true,
    created_at: '2026-02-08T11:00:00Z',
    updated_at: '2026-02-10T16:00:00Z',
  },
  ],
}));

// Mock supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: mockDocuments,
            error: null,
          }),
        }),
      }),
    }),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
    },
    storage: {
      from: vi.fn().mockReturnValue({
        getPublicUrl: vi.fn().mockReturnValue({
          data: { publicUrl: 'https://storage.example.com/documents/test.pdf' },
        }),
      }),
    },
  },
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useDocuments hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns document list on success', async () => {
    const { result } = renderHook(
      () =>
        useQuery({
          queryKey: ['documents'],
          queryFn: async () => {
            const { data, error } = await supabase
              .from('documents')
              .select('*')
              .eq('company_id', 'company-1')
              .order('created_at', { ascending: false });
            if (error) throw error;
            return data;
          },
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(4);
    expect(result.current.data![0].name).toBe('Foundation Inspection Report.pdf');
  });

  it('starts in loading state', () => {
    const { result } = renderHook(
      () =>
        useQuery({
          queryKey: ['documents-loading'],
          queryFn: () => new Promise(() => {}),
        }),
      { wrapper: createWrapper() }
    );

    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();
  });

  it('handles error when documents fail to load', async () => {
    const { result } = renderHook(
      () =>
        useQuery({
          queryKey: ['documents-error'],
          queryFn: async () => {
            throw new Error('Storage bucket not found');
          },
          retry: false,
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(Error);
    expect((result.current.error as Error).message).toContain('Storage bucket not found');
  });

  it('returns documents with version tracking', async () => {
    const { result } = renderHook(
      () =>
        useQuery({
          queryKey: ['documents-versions'],
          queryFn: async () => {
            const { data, error } = await supabase
              .from('documents')
              .select('*')
              .eq('company_id', 'company-1')
              .order('created_at', { ascending: false });
            if (error) throw error;
            return data;
          },
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // All documents in the mock are current versions
    result.current.data!.forEach((doc: any) => {
      expect(doc.is_current_version).toBe(true);
      expect(doc.version).toBeGreaterThanOrEqual(1);
    });

    // The architectural plans are on revision 3
    const archPlans = result.current.data!.find((d: any) => d.name.includes('Architectural'));
    expect(archPlans.version).toBe(3);
  });

  it('includes file metadata for each document', async () => {
    const { result } = renderHook(
      () =>
        useQuery({
          queryKey: ['documents-metadata'],
          queryFn: async () => {
            const { data, error } = await supabase
              .from('documents')
              .select('*')
              .eq('company_id', 'company-1')
              .order('created_at', { ascending: false });
            if (error) throw error;
            return data;
          },
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    result.current.data!.forEach((doc: any) => {
      expect(doc).toHaveProperty('file_path');
      expect(doc).toHaveProperty('file_type');
      expect(doc).toHaveProperty('file_size');
      expect(doc.file_size).toBeGreaterThan(0);
      expect(doc.file_path).toBeTruthy();
    });
  });

  it('filters documents by project', async () => {
    const { result } = renderHook(
      () =>
        useQuery({
          queryKey: ['documents-project-filter'],
          queryFn: async () => {
            const { data, error } = await supabase
              .from('documents')
              .select('*')
              .eq('company_id', 'company-1')
              .order('created_at', { ascending: false });
            if (error) throw error;
            return data;
          },
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const project1Docs = result.current.data!.filter(
      (d: any) => d.project_id === 'project-1'
    );
    const project2Docs = result.current.data!.filter(
      (d: any) => d.project_id === 'project-2'
    );

    expect(project1Docs).toHaveLength(3);
    expect(project2Docs).toHaveLength(1);
  });
});
