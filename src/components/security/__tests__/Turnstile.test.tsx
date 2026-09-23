import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, renderHook, waitFor } from '@testing-library/react';
import { Turnstile, useTurnstileToken } from '../Turnstile';

describe('Turnstile (US-351)', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    document.head.querySelectorAll('script[src*="challenges.cloudflare.com"]').forEach((s) => s.remove());
    delete window.turnstile;
  });

  it('renders nothing and does not block the form without a site key', () => {
    vi.stubEnv('VITE_TURNSTILE_SITE_KEY', '');
    const { container } = render(<Turnstile onToken={vi.fn()} />);
    expect(container.innerHTML).toBe('');
    const { result } = renderHook(() => useTurnstileToken());
    expect(result.current.ready).toBe(true);
    expect(document.head.querySelector('script[src*="challenges.cloudflare.com"]')).toBeNull();
  });

  it('holds the form until a token arrives when a site key is set', async () => {
    vi.stubEnv('VITE_TURNSTILE_SITE_KEY', '0x4AAAAAAAtest');
    const renderWidget = vi.fn((_el: HTMLElement, opts: Record<string, unknown>) => {
      (opts.callback as (t: string) => void)('token-123');
      return 'w1';
    });
    window.turnstile = { render: renderWidget, remove: vi.fn(), reset: vi.fn() };

    const { result } = renderHook(() => useTurnstileToken());
    expect(result.current.ready).toBe(false);

    const onToken = vi.fn();
    render(<Turnstile onToken={onToken} />);
    await waitFor(() => expect(onToken).toHaveBeenCalledWith('token-123'));
    expect(renderWidget.mock.calls[0][1]).toMatchObject({ sitekey: '0x4AAAAAAAtest' });
  });
});
