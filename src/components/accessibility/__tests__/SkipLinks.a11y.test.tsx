import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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

describe('SkipLinks focus and motion (US-221)', () => {
  const originalMatchMedia = window.matchMedia;
  const originalScrollIntoView = Element.prototype.scrollIntoView;
  const setReducedMotion = (reduce: boolean) => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: reduce && query.includes('prefers-reduced-motion'),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      onchange: null,
      dispatchEvent: vi.fn(),
    }));
  };

  afterEach(() => {
    document.body.innerHTML = '';
    document.documentElement.classList.remove('reduce-motion');
    window.matchMedia = originalMatchMedia;
    Element.prototype.scrollIntoView = originalScrollIntoView;
  });

  it('moves keyboard focus to #main-content', () => {
    setReducedMotion(false);
    const scroll = vi.fn();
    Element.prototype.scrollIntoView = scroll;
    render(
      <>
        <SkipLinks />
        <main id="main-content">content</main>
      </>,
    );
    fireEvent.click(screen.getByText(/skip to main content/i));
    const main = document.getElementById('main-content');
    expect(document.activeElement).toBe(main);
    expect(main?.getAttribute('tabindex')).toBe('-1');
    expect(scroll).toHaveBeenCalledWith({ behavior: 'smooth' });
  });

  it('does not smooth-scroll when the OS asks for reduced motion', () => {
    setReducedMotion(true);
    const scroll = vi.fn();
    Element.prototype.scrollIntoView = scroll;
    render(
      <>
        <SkipLinks />
        <main id="main-content">content</main>
      </>,
    );
    fireEvent.click(screen.getByText(/skip to main content/i));
    expect(scroll).toHaveBeenCalledWith({ behavior: 'auto' });
  });

  it('does not smooth-scroll when the in-app reduced-motion setting is on', () => {
    setReducedMotion(false);
    document.documentElement.classList.add('reduce-motion');
    const scroll = vi.fn();
    Element.prototype.scrollIntoView = scroll;
    render(
      <>
        <SkipLinks />
        <main id="main-content">content</main>
      </>,
    );
    fireEvent.click(screen.getByText(/skip to main content/i));
    expect(scroll).toHaveBeenCalledWith({ behavior: 'auto' });
  });
});
