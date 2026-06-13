import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { DeferUntilVisible } from '../DeferUntilVisible';

// Capture the IntersectionObserver callback so tests can drive visibility.
let ioCallback: IntersectionObserverCallback | null = null;
const observe = vi.fn();
const disconnect = vi.fn();

beforeEach(() => {
  ioCallback = null;
  observe.mockClear();
  disconnect.mockClear();
  // @ts-expect-error minimal IO mock (must be a real constructor for `new`)
  global.IntersectionObserver = class {
    constructor(cb: IntersectionObserverCallback) {
      ioCallback = cb;
    }
    observe = observe;
    disconnect = disconnect;
    unobserve = vi.fn();
    takeRecords = vi.fn();
    root = null;
    rootMargin = '';
    thresholds = [];
  };
});
afterEach(() => {
  // @ts-expect-error cleanup
  delete global.IntersectionObserver;
});

describe('DeferUntilVisible', () => {
  it('renders the placeholder until the block is visible, then the children', () => {
    render(
      <DeferUntilVisible placeholder={<div>LOADING</div>}>
        <div>CHART</div>
      </DeferUntilVisible>
    );

    // Before intersecting: placeholder only.
    expect(screen.getByText('LOADING')).toBeInTheDocument();
    expect(screen.queryByText('CHART')).not.toBeInTheDocument();
    expect(observe).toHaveBeenCalledTimes(1);

    // Simulate scrolling into view.
    act(() => {
      ioCallback?.([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver);
    });

    expect(screen.getByText('CHART')).toBeInTheDocument();
    expect(screen.queryByText('LOADING')).not.toBeInTheDocument();
    // Observer is disconnected once shown (renders once, stays).
    expect(disconnect).toHaveBeenCalled();
  });

  it('renders immediately when IntersectionObserver is unavailable', () => {
    // @ts-expect-error force the fallback path
    delete global.IntersectionObserver;
    render(
      <DeferUntilVisible placeholder={<div>LOADING</div>}>
        <div>CHART</div>
      </DeferUntilVisible>
    );
    expect(screen.getByText('CHART')).toBeInTheDocument();
  });
});
