import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AutoBreadcrumb } from '../AutoBreadcrumb';

const renderAt = (path: string, currentLabel?: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <AutoBreadcrumb currentLabel={currentLabel} />
    </MemoryRouter>
  );

describe('AutoBreadcrumb', () => {
  it('renders nothing for top-level pages (< 2 segments)', () => {
    const { container } = renderAt('/projects-hub');
    expect(container.firstChild).toBeNull();
  });

  it('renders a nav landmark with aria-label Breadcrumb on nested pages', () => {
    renderAt('/projects/settings');
    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toBeTruthy();
  });

  it('humanizes route segments into readable links', () => {
    renderAt('/projects/daily-reports');
    expect(screen.getByRole('link', { name: 'Projects' })).toBeTruthy();
    // Last segment is the current page (not a link).
    expect(screen.getByText('Daily Reports')).toBeTruthy();
  });

  it('uses currentLabel as the entity name for id detail pages', () => {
    renderAt(
      '/projects/3f8a1c2b-1111-2222-3333-444455556666',
      'Riverside Apartments'
    );
    expect(screen.getByRole('link', { name: 'Projects' })).toBeTruthy();
    expect(screen.getByText('Riverside Apartments')).toBeTruthy();
    // The raw UUID must not be displayed.
    expect(
      screen.queryByText('3f8a1c2b-1111-2222-3333-444455556666')
    ).toBeNull();
  });

  it('applies product-name overrides from the label map', () => {
    renderAt('/projects/rfis');
    expect(screen.getByText('RFIs')).toBeTruthy();
  });
});
