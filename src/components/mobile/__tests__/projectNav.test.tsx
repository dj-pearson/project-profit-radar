import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import {
  isMobileNavItemActive,
  projectContextNavItems,
  projectIdFromPath,
} from '../projectNav';
import { MobileBottomNav } from '../MobileBottomNav';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ userProfile: { role: 'field_supervisor' } }),
}));

// US-379 / docs/INFORMATION_ARCHITECTURE.md: the mobile contextual nav on
// /projects/* linked to the global /documents, /job-costing,
// /schedule-management and /change-orders pages and dropped the project id.

const PROJECT_ID = '3f2b9c1e-7a44-4d1b-9e0f-2c5d8a6b1f00';

describe('projectIdFromPath', () => {
  it('reads the id from a project path and anything under it', () => {
    expect(projectIdFromPath(`/projects/${PROJECT_ID}`)).toBe(PROJECT_ID);
    expect(projectIdFromPath(`/projects/${PROJECT_ID}/tasks/new`)).toBe(PROJECT_ID);
  });

  it('is null off a project', () => {
    expect(projectIdFromPath('/projects')).toBeNull();
    expect(projectIdFromPath('/projects/')).toBeNull();
    expect(projectIdFromPath('/projects-hub')).toBeNull();
    expect(projectIdFromPath('/dashboard')).toBeNull();
  });
});

describe('projectContextNavItems', () => {
  it('keeps every link inside /projects/:projectId', () => {
    const items = projectContextNavItems(PROJECT_ID);
    expect(items).toHaveLength(5);
    for (const item of items) {
      expect(item.href.startsWith(`/projects/${PROJECT_ID}`)).toBe(true);
    }
    expect(items.map((i) => i.href)).toEqual([
      `/projects/${PROJECT_ID}`,
      `/projects/${PROJECT_ID}#tasks`,
      `/projects/${PROJECT_ID}#jobcosting`,
      `/projects/${PROJECT_ID}#changeorders`,
      `/projects/${PROJECT_ID}#documents`,
    ]);
  });
});

describe('isMobileNavItemActive', () => {
  const base = `/projects/${PROJECT_ID}`;

  it('marks the section link for the current hash', () => {
    expect(isMobileNavItemActive(`${base}#tasks`, base, '#tasks')).toBe(true);
    expect(isMobileNavItemActive(`${base}#tasks`, base, '#documents')).toBe(false);
    expect(isMobileNavItemActive(base, base, '#tasks')).toBe(false);
  });

  it('marks the overview link with no hash or #overview', () => {
    expect(isMobileNavItemActive(base, base, '')).toBe(true);
    expect(isMobileNavItemActive(base, base, '#overview')).toBe(true);
  });

  it('keeps the old rules for global links', () => {
    expect(isMobileNavItemActive('/dashboard', '/dashboard/x')).toBe(false);
    expect(isMobileNavItemActive('/financial-hub', '/financial-hub/ar')).toBe(true);
  });
});

describe('useMobileNavigation on a project page', () => {
  it('returns project-scoped items that keep the id', async () => {
    const { useMobileNavigation } = await import('@/hooks/useMobileNavigation');
    function Probe() {
      const { items, isCustomContext } = useMobileNavigation();
      return (
        <ul data-custom={String(isCustomContext)}>
          {items.map((i) => (
            <li key={i.href}>{i.href}</li>
          ))}
        </ul>
      );
    }
    render(
      <MemoryRouter initialEntries={[`/projects/${PROJECT_ID}/tasks/new`]}>
        <Probe />
      </MemoryRouter>
    );
    const hrefs = screen.getAllByRole('listitem').map((li) => li.textContent);
    expect(hrefs).toHaveLength(5);
    expect(hrefs.every((h) => h?.startsWith(`/projects/${PROJECT_ID}`))).toBe(true);
    expect(hrefs).not.toContain('/documents');
    expect(hrefs).not.toContain('/job-costing');
  });
});

describe('MobileBottomNav with project items', () => {
  it('renders links that keep the project id and marks the open section', () => {
    render(
      <MemoryRouter initialEntries={[`/projects/${PROJECT_ID}#jobcosting`]}>
        <MobileBottomNav items={projectContextNavItems(PROJECT_ID)} />
      </MemoryRouter>
    );
    const costs = screen.getByRole('link', { name: 'Costs' });
    expect(costs).toHaveAttribute('href', `/projects/${PROJECT_ID}#jobcosting`);
    expect(costs).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Overview' })).not.toHaveAttribute('aria-current');
    for (const link of screen.getAllByRole('link')) {
      expect(link.getAttribute('href')).toMatch(new RegExp(`^/projects/${PROJECT_ID}`));
    }
  });
});
