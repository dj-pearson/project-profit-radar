/**
 * US-083: client portal photo gallery
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ClientPortalGallery } from '@/components/client/ClientPortalGallery';

describe('ClientPortalGallery (US-083)', () => {
  it('shows an empty state when there are no photos', () => {
    render(<ClientPortalGallery reports={[{ id: 'r1', date: '2026-06-20', photos: [] }]} />);
    expect(screen.getByText(/no photos available/i)).toBeInTheDocument();
  });

  it('renders a thumbnail grid grouped by report date', () => {
    render(
      <ClientPortalGallery
        reports={[
          { id: 'r1', date: '2026-06-20', photos: ['https://x/1.jpg', 'https://x/2.jpg'] },
          { id: 'r2', date: '2026-06-21', photos: ['https://x/3.jpg'] },
        ]}
      />
    );
    // 3 photos => 3 thumbnail buttons (each opens the lightbox).
    const thumbs = screen.getAllByRole('button', { name: /view photo/i });
    expect(thumbs).toHaveLength(3);
    expect(screen.getAllByRole('img')).toHaveLength(3);
  });
});
