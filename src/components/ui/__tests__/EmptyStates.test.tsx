import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  ErrorState,
  NoProjects,
  NoContacts,
  NoEstimates,
  NoDailyReports,
  NoChangeOrders,
} from '../EmptyStates';

// US-375: the secondary links pointed at /help and /help/projects, neither of
// which is a route, so "Contact Support" on every ErrorState landed on a 404.

const realLocation = window.location;
afterEach(() => {
  Object.defineProperty(window, 'location', { configurable: true, value: realLocation });
});

function captureNavigation() {
  const loc = { href: '' };
  Object.defineProperty(window, 'location', { configurable: true, value: loc });
  return loc;
}

describe('EmptyStates', () => {
  it('ErrorState "Contact Support" goes to /support', () => {
    const loc = captureNavigation();
    render(<ErrorState onRetry={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Contact Support' }));
    expect(loc.href).toBe('/support');
  });

  it('NoProjects "Learn More" goes to /knowledge-base', () => {
    const loc = captureNavigation();
    render(<NoProjects onCreate={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Learn More' }));
    expect(loc.href).toBe('/knowledge-base');
  });

  it.each([
    [NoEstimates, 'Create Estimate'],
    [NoDailyReports, 'Create Daily Report'],
    [NoChangeOrders, 'Create Change Order'],
    [NoContacts, 'Add Contact'],
  ])('%o calls onCreate from its CTA and hides the CTA without one', (Component, label) => {
    const onCreate = vi.fn();
    const { unmount } = render(<Component onCreate={onCreate} />);
    fireEvent.click(screen.getByRole('button', { name: label }));
    expect(onCreate).toHaveBeenCalledTimes(1);
    unmount();

    render(<Component />);
    expect(screen.queryByRole('button', { name: label })).not.toBeInTheDocument();
  });
});
