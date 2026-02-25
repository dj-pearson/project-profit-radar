import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SkipLinks } from '../SkipLinks';

describe('SkipLinks a11y', () => {
  it('renders skip link buttons', () => {
    render(<SkipLinks />);
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('has skip to main content button', () => {
    render(<SkipLinks />);
    expect(screen.getByText(/skip to main content/i)).toBeInTheDocument();
  });

  it('has skip to navigation button', () => {
    render(<SkipLinks />);
    expect(screen.getByText(/skip to navigation/i)).toBeInTheDocument();
  });

  it('has skip to search button', () => {
    render(<SkipLinks />);
    expect(screen.getByText(/skip to search/i)).toBeInTheDocument();
  });

  it('skip links are visually hidden by default via sr-only', () => {
    const { container } = render(<SkipLinks />);
    const wrapper = container.firstElementChild;
    expect(wrapper?.className).toContain('sr-only');
  });

  it('skip links become visible on focus via focus-within', () => {
    const { container } = render(<SkipLinks />);
    const wrapper = container.firstElementChild;
    expect(wrapper?.className).toContain('focus-within:not-sr-only');
  });
});
