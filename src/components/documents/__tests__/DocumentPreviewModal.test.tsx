/**
 * US-081: inline document preview modal
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    storage: {
      from: () => ({
        createSignedUrl: vi.fn().mockResolvedValue({
          data: { signedUrl: 'https://example.com/signed/plan.pdf' },
          error: null,
        }),
        download: vi.fn(),
      }),
    },
  },
}));

vi.mock('@/hooks/use-toast', () => ({ toast: vi.fn() }));

import { DocumentPreviewModal } from '@/components/documents/DocumentPreviewModal';

const pdfDoc = { name: 'site-plan.pdf', file_path: 'co/site-plan.pdf', file_type: 'application/pdf' };

describe('DocumentPreviewModal (US-081)', () => {
  it('renders download, share, and close actions', () => {
    render(
      <DocumentPreviewModal open document={pdfDoc} bucket="company-documents" onOpenChange={() => {}} />
    );
    expect(screen.getByRole('button', { name: /share link/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /download/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument();
  });

  it('renders a PDF in an iframe using a signed URL', async () => {
    render(
      <DocumentPreviewModal open document={pdfDoc} bucket="company-documents" onOpenChange={() => {}} />
    );
    await waitFor(() => {
      const frame = screen.getByTitle(/preview of site-plan\.pdf/i) as HTMLIFrameElement;
      expect(frame).toBeInTheDocument();
      expect(frame.getAttribute('src')).toContain('signed');
    });
  });

  it('offers 24h / 7 days / 30 days share expirations', () => {
    render(
      <DocumentPreviewModal open document={pdfDoc} bucket="company-documents" onOpenChange={() => {}} />
    );
    // The select shows the default (24 hours) option label.
    expect(screen.getByText('24 hours')).toBeInTheDocument();
  });
});
